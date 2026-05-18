from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Product
from .permissions import CanCreateDeals, CanEditClientObject, HasCompany
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.none()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, HasCompany]

    def get_queryset(self):
        return Product.objects.filter(
            company=self.request.company,
            is_active=True,
        )

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasCompany()]
        if self.action == "create":
            return [IsAuthenticated(), HasCompany(), CanCreateDeals()]
        return [IsAuthenticated(), HasCompany(), CanEditClientObject()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)
