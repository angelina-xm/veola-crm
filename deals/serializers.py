from rest_framework import serializers

from companies.models import CompanyMember
from .models import Deal, PipelineStage


class StaleDealSerializer(serializers.ModelSerializer):
    """Сделки без активности ≥48h; поле last_activity из annotate."""

    last_activity = serializers.DateTimeField(read_only=True, allow_null=True)
    client_name = serializers.CharField(source="client.name", read_only=True)

    class Meta:
        model = Deal
        fields = (
            "id",
            "title",
            "amount",
            "client",
            "client_name",
            "stage",
            "created_at",
            "last_activity",
        )


class DealSerializer(serializers.ModelSerializer):
    def validate_assigned_to(self, user):
        if user is None:
            return None
        request = self.context.get("request")
        company = getattr(request, "company", None) if request else None
        if company is None:
            return user
        is_member = CompanyMember.objects.filter(
            user=user,
            company=company,
            is_active=True,
        ).exists()
        if not is_member:
            raise serializers.ValidationError("Assigned user is not in this company.")
        return user

    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ["company", "created_by"]


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = "__all__"
        read_only_fields = ["company"]


class NotificationItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    message = serializers.CharField()
    count = serializers.IntegerField()