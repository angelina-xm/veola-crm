from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import CompanyMember, CompanySettings, Invitation
from .utils import check_user_limit
User = get_user_model()


#  создание приглашения
class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["email", "role"]


#  регистрация через invite
class AcceptInviteRegisterSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            invitation = Invitation.objects.get(token=data["token"])
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid token")

        if invitation.is_accepted:
            raise serializers.ValidationError("Invite already used")

        if invitation.expires_at < timezone.now():
            raise serializers.ValidationError("Invite expired")

        data["invitation"] = invitation
        return data

    def create(self, validated_data):
        invitation = validated_data["invitation"]

        #  проверка: пользователь уже существует
        if User.objects.filter(email=invitation.email).exists():
            raise serializers.ValidationError("User already exists")
        check_user_limit(invitation.company)
        user = User.objects.create_user(
            username=invitation.email,
            email=invitation.email,
            password=validated_data["password"]
        )

        CompanyMember.objects.create(
            user=user,
            company=invitation.company,
            role=invitation.role,
            invited_by=None,
        )

        invitation.is_accepted = True
        invitation.save()

        return user


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = [
            "auto_follow_up",
            "auto_discount",
            "auto_reorder",
        ]


_COMPANY_MEMBER_READ_FIELDS = [
    "user_id",
    "company_id",
    "role",
    "is_active",
    "can_view_all_deals",
    "can_create_deals",
    "can_edit_all_deals",
    "can_delete_deals",
    "can_manage_team",
    "can_manage_automations",
    "can_view_analytics",
]


class CompanyMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_plan = serializers.CharField(source="company.plan", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = CompanyMember
        fields = _COMPANY_MEMBER_READ_FIELDS + [
            "company_name",
            "company_plan",
            "user_email",
            "user_display_name",
        ]
        read_only_fields = fields

    def get_user_display_name(self, obj):
        user = obj.user
        full = user.get_full_name()
        if full and full.strip():
            return full.strip()
        return user.email.split("@")[0] if user.email else user.username
