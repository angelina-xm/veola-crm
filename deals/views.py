from datetime import timedelta
from decimal import Decimal

from django.db.models import Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from activities.models import Activity

from .automation import create_automation_tasks
from .lifecycle import apply_deal_closed_cleanup
from .models import Deal, PipelineStage
from .operational import closed_stage_kind, is_closed_stage, is_operational_deal
from .serializers import (
    ClosedDealsSummarySerializer,
    DealSerializer,
    PipelineStageSerializer,
    StaleDealSerializer,
)
from .visibility import get_operational_visible_deals, get_visible_deals
from clients.permissions import (
    HasCompany,
    CanCreateDeals,
    CanEditDealObject,
    CanDeleteDealObject,
)


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer

    def get_queryset(self):
        return get_visible_deals(
            user=self.request.user,
            company=self.request.company,
            membership=getattr(self.request, "membership", None),
        )

    def get_permissions(self):
        if self.action in ["list", "retrieve", "stale", "closed_summary"]:
            return [IsAuthenticated(), HasCompany()]

        elif self.action == "create":
            return [IsAuthenticated(), HasCompany(), CanCreateDeals()]

        elif self.action in ["update", "partial_update"]:
            return [IsAuthenticated(), HasCompany(), CanEditDealObject()]

        elif self.action == "destroy":
            return [IsAuthenticated(), HasCompany(), CanDeleteDealObject()]

        return [IsAuthenticated()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if getattr(self.request, "_include_close_transition", False):
            ctx["include_close_transition"] = True
        return ctx

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.company,
            created_by=self.request.user,
        )

    def perform_update(self, serializer):
        inst = serializer.instance
        old_stage = inst.stage
        old_stage_id = inst.stage_id
        deal = serializer.save()

        was_operational = not is_closed_stage(old_stage)
        now_closed = not is_operational_deal(deal)

        if now_closed:
            if deal.closed_at is None:
                deal.closed_at = timezone.now()
                deal.save(update_fields=["closed_at"])
            apply_deal_closed_cleanup(deal)
            kind = closed_stage_kind(deal.stage)
            if kind == "won" and not (
                old_stage and closed_stage_kind(old_stage) == "won"
            ):
                Activity.objects.create(
                    deal=deal,
                    author=self.request.user,
                    client=deal.client,
                    type=Activity.Type.NOTE,
                    category="system",
                    auto_type="deal_won",
                    content="Deal won",
                )
                self.request._include_close_transition = True
            elif deal.stage_id != old_stage_id:
                stage_label = deal.stage.name if deal.stage else "—"
                Activity.objects.create(
                    deal=deal,
                    author=self.request.user,
                    client=deal.client,
                    type=Activity.Type.NOTE,
                    category="system",
                    auto_type="deal_closed",
                    content=f"Deal closed — {stage_label}",
                )
        elif was_operational and deal.stage_id != old_stage_id and is_operational_deal(deal):
            create_automation_tasks(deal, self.request.user)
            stage_label = deal.stage.name if deal.stage else "—"
            Activity.objects.create(
                deal=deal,
                author=self.request.user,
                client=deal.client,
                type=Activity.Type.NOTE,
                category="system",
                auto_type="stage_move",
                content=f"Deal moved to {stage_label}",
            )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(request, "_include_close_transition", False):
            instance.refresh_from_db()
            data = DealSerializer(
                instance,
                context=self.get_serializer_context(),
            ).data
            return Response(data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="stale")
    def stale(self, request):
        """Operational deals without recent activity (excludes Won/Lost)."""
        stale_time = timezone.now() - timedelta(hours=48)
        qs = (
            get_operational_visible_deals(
                user=request.user,
                company=request.company,
                membership=getattr(request, "membership", None),
            )
            .select_related("client", "stage")
            .annotate(last_activity=Max("activities__created_at"))
            .filter(
                Q(last_activity__lt=stale_time) | Q(last_activity__isnull=True)
            )
            .annotate(sort_key=Coalesce("last_activity", "created_at"))
            .order_by("sort_key")
        )
        ser = StaleDealSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=False, methods=["get"], url_path="closed-summary")
    def closed_summary(self, request):
        """
        Historical closes — for analytics widgets, not operational workspace.
        """
        qs = (
            get_visible_deals(
                user=request.user,
                company=request.company,
                membership=getattr(request, "membership", None),
            )
            .closed()
            .select_related("client", "stage")
        )
        now = timezone.now()
        local = timezone.localtime(now)
        today_start = local.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        closed_today_qs = qs.filter(closed_at__gte=today_start).order_by("-closed_at")
        won_today_qs = closed_today_qs.filter(stage__name__iexact="won")
        revenue_today = won_today_qs.aggregate(
            total=Sum("amount", default=Decimal("0"))
        )["total"]
        revenue_week = qs.filter(
            stage__name__iexact="won",
            closed_at__gte=week_start,
        ).aggregate(total=Sum("amount", default=Decimal("0")))["total"]

        recent_wins = qs.filter(stage__name__iexact="won").order_by("-closed_at")[:10]

        def row(deal: Deal) -> dict:
            return {
                "id": deal.id,
                "title": deal.title,
                "amount": deal.amount,
                "client_id": deal.client_id,
                "client_name": deal.client.name,
                "stage_name": deal.stage.name if deal.stage else None,
                "closed_at": deal.closed_at,
                "win_reason": deal.win_reason,
                "loss_reason": deal.loss_reason,
            }

        payload = {
            "closed_today_count": closed_today_qs.count(),
            "won_today_count": won_today_qs.count(),
            "revenue_closed_today": revenue_today or Decimal("0"),
            "revenue_closed_this_week": revenue_week or Decimal("0"),
            "recent_wins": [row(d) for d in recent_wins],
            "closed_today": [row(d) for d in closed_today_qs[:20]],
        }
        return Response(ClosedDealsSummarySerializer(payload).data)


class PipelineStageViewSet(viewsets.ModelViewSet):
    queryset = PipelineStage.objects.all()
    serializer_class = PipelineStageSerializer

    def get_queryset(self):
        return PipelineStage.objects.filter(company=self.request.company).order_by("order", "id")

    def get_permissions(self):
        from clients.permissions import CanManageTeam

        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated(), HasCompany()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), HasCompany(), CanManageTeam()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)
