from datetime import timedelta

from django.db.models import Max, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Deal, PipelineStage
from .serializers import DealSerializer, PipelineStageSerializer, StaleDealSerializer
from clients.permissions import HasCompany, IsOwner, IsManagerOrOwner


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer

    def get_queryset(self):
        return Deal.objects.filter(company=self.request.company)

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'stale']:
            return [IsAuthenticated(), HasCompany()]

        elif self.action == 'create':
            return [IsAuthenticated(), HasCompany(), IsManagerOrOwner()]

        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasCompany(), IsManagerOrOwner()]

        elif self.action == 'destroy':
            return [IsAuthenticated(), HasCompany(), IsOwner()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

    @action(detail=False, methods=["get"], url_path="stale")
    def stale(self, request):
        """Сделки без активности: нет activities или последняя старше 48 ч."""
        stale_time = timezone.now() - timedelta(hours=48)
        qs = (
            Deal.objects.filter(company=request.company)
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
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated(), HasCompany()]
        if self.action in ["create", "update", "partial_update"]:
            return [IsAuthenticated(), HasCompany(), IsManagerOrOwner()]
        if self.action == "destroy":
            return [IsAuthenticated(), HasCompany(), IsOwner()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)