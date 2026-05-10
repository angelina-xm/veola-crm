from datetime import timedelta

from django.db.models import Max, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .automation import create_automation_tasks
from .models import Deal, PipelineStage
from .serializers import DealSerializer, PipelineStageSerializer, StaleDealSerializer
from .visibility import get_visible_deals
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
        if self.action in ['list', 'retrieve', 'stale']:
            return [IsAuthenticated(), HasCompany()]

        elif self.action == 'create':
            return [IsAuthenticated(), HasCompany(), CanCreateDeals()]

        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasCompany(), CanEditDealObject()]

        elif self.action == 'destroy':
            return [IsAuthenticated(), HasCompany(), CanDeleteDealObject()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.company,
            created_by=self.request.user,
        )

    def perform_update(self, serializer):
        old_stage_id = serializer.instance.stage_id
        deal = serializer.save()
        if deal.stage_id != old_stage_id:
            create_automation_tasks(deal, self.request.user)

    @action(detail=False, methods=["get"], url_path="stale")
    def stale(self, request):
        """Сделки без активности: нет activities или последняя старше 48 ч."""
        stale_time = timezone.now() - timedelta(hours=48)
        qs = (
            get_visible_deals(
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