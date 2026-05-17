from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from deals.models import Deal

from .models import Client
from .serializers import ClientSerializer, ClientTimelineSerializer
from .timeline import CustomerTimelineBuilder
from .permissions import (
    HasCompany,
    CanCreateDeals,
    CanEditClientObject,
    CanDeleteClientObject,
)


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer

    #  ФИЛЬТР ПО КОМПАНИИ
    def get_queryset(self):
        return Client.objects.filter(company=self.request.company)

    #  ПРАВА
    def get_permissions(self):
        if self.action in ["list", "retrieve", "timeline"]:
            return [IsAuthenticated(), HasCompany()]

        elif self.action == 'create':
            return [IsAuthenticated(), HasCompany(), CanCreateDeals()]

        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasCompany(), CanEditClientObject()]

        elif self.action == 'destroy':
            return [IsAuthenticated(), HasCompany(), CanDeleteClientObject()]

        return [IsAuthenticated()]

    #  CREATE (привязка к компании)
    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        client = self.get_object()
        raw_filter = (request.query_params.get("filter") or "all").lower()
        if raw_filter not in ("all", "deals", "activities", "tasks"):
            raw_filter = "all"
        payload = CustomerTimelineBuilder(
            client=client,
            user=request.user,
            company=request.company,
            membership=getattr(request, "membership", None),
        ).build(filter_group=raw_filter)
        return Response(ClientTimelineSerializer(payload).data)

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        if Deal.objects.filter(client=client).exists():
            return Response(
                {"detail": "Cannot delete client with deals"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
