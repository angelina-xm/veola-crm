from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Client
from .serializers import ClientSerializer
from .permissions import HasCompany, IsOwner, IsManagerOrOwner


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
            return [IsAuthenticated(), HasCompany(), IsManagerOrOwner()]

        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasCompany(), IsManagerOrOwner()]

        elif self.action == 'destroy':
            return [IsAuthenticated(), HasCompany(), IsOwner()]

        return [IsAuthenticated()]

    #  CREATE (привязка к компании)
    def perform_create(self, serializer):
        serializer.save(company=self.request.company)