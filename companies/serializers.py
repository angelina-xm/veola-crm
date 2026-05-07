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


class CompanyMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)