from rest_framework import serializers

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
    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ["company"]


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = "__all__"
        read_only_fields = ["company"]


class NotificationItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    message = serializers.CharField()
    count = serializers.IntegerField()