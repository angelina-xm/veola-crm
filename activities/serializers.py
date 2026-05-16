from django.utils import timezone
from rest_framework import serializers

from companies.models import CompanyMember
from deals.visibility import get_visible_deals, user_can_edit_deal

from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = Activity
        fields = [
            "id",
            "deal",
            "client",
            "author",
            "author_email",
            "assigned_to",
            "type",
            "category",
            "auto_type",
            "automation_key",
            "content",
            "due_date",
            "priority",
            "is_completed",
            "completed_at",
            "completed_by",
            "created_at",
        ]
        read_only_fields = ["author", "created_at", "completed_at", "completed_by", "automation_key"]

    def validate_deal(self, value):
        request = self.context.get("request")
        if request is None or not hasattr(request, "company") or request.company is None:
            return value
        if value.company_id != request.company.id:
            raise serializers.ValidationError("Deal does not belong to your company.")
        membership = getattr(request, "membership", None)
        vis = get_visible_deals(request.user, request.company, membership).filter(
            pk=value.pk
        ).exists()
        if not vis:
            raise serializers.ValidationError("Deal is not accessible for your membership.")
        return value

    def validate_client(self, value):
        request = self.context.get("request")
        if request is None or not hasattr(request, "company") or request.company is None:
            return value
        if value.company_id != request.company.id:
            raise serializers.ValidationError("Client does not belong to your company.")
        return value

    def validate_assigned_to(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        company = getattr(request, "company", None)
        if company is None:
            return value
        if not CompanyMember.objects.filter(
            company=company, user=value, is_active=True
        ).exists():
            raise serializers.ValidationError("User is not an active member of this company.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        request = self.context.get("request")

        if instance is None:
            deal = attrs.get("deal")
            client = attrs.get("client")
            if deal is None and client is None:
                raise serializers.ValidationError(
                    "Provide at least one target: deal or client."
                )
            if deal is not None and client is not None:
                if deal.client_id != client.id:
                    raise serializers.ValidationError(
                        {"client": "Client does not match selected deal."}
                    )
            elif deal is not None and client is None:
                attrs["client"] = deal.client
            if attrs.get("type") != Activity.Type.TASK:
                attrs["is_completed"] = False
            return attrs

        merged_type = attrs.get("type", instance.type)
        if "is_completed" in attrs and merged_type != Activity.Type.TASK:
            raise serializers.ValidationError(
                {"is_completed": "is_completed applies only to tasks."}
            )

        deal = instance.deal
        if deal is not None and user_can_edit_deal(
            request.user, getattr(request, "membership", None), deal
        ):
            return attrs

        if set(attrs.keys()) != {"is_completed"}:
            raise serializers.ValidationError(
                "Only the task completion flag can be updated."
            )
        if instance.type != Activity.Type.TASK:
            raise serializers.ValidationError(
                {"is_completed": "is_completed applies only to tasks."}
            )

        return attrs

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if instance.type == Activity.Type.TASK and "is_completed" in validated_data:
            if validated_data["is_completed"] and not instance.is_completed:
                validated_data["completed_at"] = timezone.now()
                validated_data["completed_by"] = user
            elif validated_data["is_completed"] is False:
                validated_data["completed_at"] = None
                validated_data["completed_by"] = None
        return super().update(instance, validated_data)
