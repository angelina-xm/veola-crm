from rest_framework import serializers

from companies.models import CompanyMember

from .lifecycle import build_close_transition_payload
from .models import Deal, DealLineItem, PipelineStage
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


class DealLineItemWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    label = serializers.CharField(required=False, allow_blank=True)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    quantity = serializers.IntegerField(required=False, default=1, min_value=1)


class DealLineItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product_id", read_only=True, allow_null=True)

    class Meta:
        model = DealLineItem
        fields = ["id", "product_id", "label", "unit_price", "quantity"]


class DealSerializer(serializers.ModelSerializer):
    is_operational = serializers.SerializerMethodField()
    stage_name = serializers.CharField(source="stage.name", read_only=True, allow_null=True)
    close_transition = serializers.SerializerMethodField()
    line_items = DealLineItemSerializer(many=True, read_only=True)
    line_items_write = DealLineItemWriteSerializer(
        many=True, write_only=True, required=False
    )

    class Meta:
        model = Deal
        fields = [
            "id",
            "company",
            "client",
            "title",
            "amount",
            "line_items",
            "line_items_write",
            "stage",
            "stage_name",
            "created_by",
            "assigned_to",
            "created_at",
            "closed_at",
            "win_reason",
            "loss_reason",
            "close_competitor",
            "close_notes",
            "waiting_on_client",
            "waiting_reason",
            "follow_up_on",
            "inactivity_snoozed_until",
            "is_operational",
            "close_transition",
        ]
        read_only_fields = [
            "company",
            "created_by",
            "closed_at",
            "is_operational",
            "close_transition",
            "inactivity_snoozed_until",
        ]

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

            if kind == "lost" and not loss_reason:
                raise serializers.ValidationError(
                    {"loss_reason": "Required when closing a deal as Lost."}
                )

        return attrs

    def create(self, validated_data):
        line_items_data = validated_data.pop("line_items_write", None) or []
        deal = super().create(validated_data)
        self._save_line_items(deal, line_items_data)
        return deal

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop("line_items_write", None)
        deal = super().update(instance, validated_data)
        if line_items_data is not None:
            deal.line_items.all().delete()
            self._save_line_items(deal, line_items_data)
        return deal

    def _save_line_items(self, deal: Deal, items_data: list) -> None:
        from clients.models import Product
        from decimal import Decimal

        if not items_data:
            return
        total = Decimal("0")
        for row in items_data:
            product = None
            label = (row.get("label") or "").strip()
            product_id = row.get("product_id")
            if product_id:
                product = Product.objects.filter(
                    pk=product_id, company_id=deal.company_id
                ).first()
                if product and not label:
                    label = product.name
            if not label:
                continue
            unit_price = row.get("unit_price")
            if unit_price is None and product and product.default_price is not None:
                unit_price = product.default_price
            qty = int(row.get("quantity") or 1)
            DealLineItem.objects.create(
                deal=deal,
                product=product,
                label=label,
                unit_price=unit_price,
                quantity=qty,
            )
            if unit_price is not None:
                total += Decimal(str(unit_price)) * qty
        if total > 0 and (deal.amount is None or deal.amount == 0):
            deal.amount = total
            deal.save(update_fields=["amount"])


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
