from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Deal, PipelineStage
from .serializers import DealSerializer, PipelineStageSerializer
from clients.permissions import HasCompany, IsOwner, IsManagerOrOwner


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer

    def get_queryset(self):
        return Deal.objects.filter(company=self.request.company)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
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