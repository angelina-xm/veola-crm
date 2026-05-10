from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from deals.models import Deal

from .models import Client
from .serializers import ClientSerializer
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
        if self.action in ['list', 'retrieve']:
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

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        if Deal.objects.filter(client=client).exists():
            return Response(
                {"detail": "Cannot delete client with deals"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
