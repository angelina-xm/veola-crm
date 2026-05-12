from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CompanyMember, CompanyRole

User = get_user_model()


class TeamMemberReadSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CompanyMember
        fields = [
            "id",
            "user_id",
            "email",
            "username",
            "role",
            "is_active",
            "can_view_all_deals",
            "can_create_deals",
            "can_edit_all_deals",
            "can_delete_deals",
            "can_manage_team",
            "can_manage_automations",
            "can_view_analytics",
            "created_at",
        ]
        read_only_fields = fields


class TeamMemberUpdateSerializer(serializers.ModelSerializer):
    """Частичное обновление роли и прав; защита last owner — в validate()."""

    class Meta:
        model = CompanyMember
        fields = [
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

    def validate(self, attrs):
        instance: CompanyMember = self.instance
        company = instance.company
        new_role = attrs.get("role", instance.role)

        if instance.role == CompanyRole.OWNER and new_role != CompanyRole.OWNER:
            other_owners = (
                CompanyMember.objects.filter(
                    company=company,
                    role=CompanyRole.OWNER,
                    is_active=True,
                )
                .exclude(pk=instance.pk)
                .count()
            )
            if other_owners < 1:
                raise serializers.ValidationError(
                    "Cannot demote or change role: this is the only owner of the company."
                )

        if new_role == CompanyRole.OWNER:
            attrs["can_view_all_deals"] = True
            attrs["can_create_deals"] = True
            attrs["can_edit_all_deals"] = True
            attrs["can_delete_deals"] = True
            attrs["can_manage_team"] = True
            attrs["can_manage_automations"] = True
            attrs["can_view_analytics"] = True

        if attrs.get("is_active") is False and instance.role == CompanyRole.OWNER:
            active_owners = CompanyMember.objects.filter(
                company=company,
                role=CompanyRole.OWNER,
                is_active=True,
            ).count()
            if active_owners <= 1:
                raise serializers.ValidationError(
                    "Cannot deactivate the only active owner."
                )

        return attrs


class TeamInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=CompanyRole.choices)

    def validate_role(self, value):
        if value == CompanyRole.OWNER:
            raise serializers.ValidationError(
                "Cannot invite as owner through this flow; transfer ownership separately."
            )
        return value
