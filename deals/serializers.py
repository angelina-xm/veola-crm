from rest_framework import serializers

from companies.models import CompanyMember

from .lifecycle import build_close_transition_payload
from .models import Deal, PipelineStage
from .operational import closed_stage_kind, is_closed_stage


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
    is_operational = serializers.SerializerMethodField()
    close_transition = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id",
            "company",
            "client",
            "title",
            "amount",
            "stage",
            "created_by",
            "assigned_to",
            "created_at",
            "closed_at",
            "win_reason",
            "loss_reason",
            "close_competitor",
            "close_notes",
            "is_operational",
            "close_transition",
        ]
        read_only_fields = ["company", "created_by", "closed_at", "is_operational", "close_transition"]

    def get_is_operational(self, obj: Deal) -> bool:
        return obj.is_operational

    def get_close_transition(self, obj: Deal) -> dict | None:
        if not self.context.get("include_close_transition"):
            return None
        return build_close_transition_payload(obj)

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

    def validate(self, attrs):
        instance: Deal | None = getattr(self, "instance", None)
        new_stage = attrs.get("stage")
        if new_stage is None and instance is not None:
            new_stage = instance.stage

        if new_stage is not None and is_closed_stage(new_stage):
            kind = closed_stage_kind(new_stage)
            win_reason = (attrs.get("win_reason") or (instance.win_reason if instance else "") or "").strip()
            loss_reason = (attrs.get("loss_reason") or (instance.loss_reason if instance else "") or "").strip()

            if kind == "won" and not win_reason:
                raise serializers.ValidationError(
                    {"win_reason": "Required when closing a deal as Won."}
                )
            if kind == "lost" and not loss_reason:
                raise serializers.ValidationError(
                    {"loss_reason": "Required when closing a deal as Lost."}
                )

        return attrs


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = "__all__"
        read_only_fields = ["company"]


class NotificationItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    message = serializers.CharField()
    count = serializers.IntegerField()


class ClosedDealSummaryItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    client_id = serializers.IntegerField()
    client_name = serializers.CharField()
    stage_name = serializers.CharField(allow_null=True)
    closed_at = serializers.DateTimeField(allow_null=True)
    win_reason = serializers.CharField(allow_blank=True)
    loss_reason = serializers.CharField(allow_blank=True)


class ClosedDealsSummarySerializer(serializers.Serializer):
    closed_today_count = serializers.IntegerField()
    won_today_count = serializers.IntegerField()
    revenue_closed_today = serializers.DecimalField(max_digits=14, decimal_places=2)
    revenue_closed_this_week = serializers.DecimalField(max_digits=14, decimal_places=2)
    recent_wins = ClosedDealSummaryItemSerializer(many=True)
    closed_today = ClosedDealSummaryItemSerializer(many=True)
