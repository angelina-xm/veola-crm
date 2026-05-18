from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .catalog_intelligence import ProductProfileBuilder
from .models import Product
from .permissions import CanCreateDeals, CanEditClientObject, HasCompany
from .serializers import ProductProfileSerializer, ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.none()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, HasCompany]

    def get_queryset(self):
        qs = Product.objects.filter(company=self.request.company)
        include_inactive = (
            self.request.query_params.get("include_inactive", "").lower()
            in ("1", "true", "yes")
        )
        if not include_inactive and self.action == "list":
            qs = qs.filter(is_active=True)
        return qs.order_by("name")

    def get_permissions(self):
        if self.action in ("list", "retrieve", "profile"):
            return [IsAuthenticated(), HasCompany()]
        if self.action == "create":
            return [IsAuthenticated(), HasCompany(), CanCreateDeals()]
        return [IsAuthenticated(), HasCompany(), CanEditClientObject()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="profile")
    def profile(self, request, pk=None):
        product = self.get_object()
        if product.company_id != request.company.id:
            return Response(status=status.HTTP_404_NOT_FOUND)
        payload = ProductProfileBuilder(
            product=product,
            user=request.user,
            company=request.company,
            membership=getattr(request, "membership", None),
        ).build()
        return Response(ProductProfileSerializer(payload).data)
