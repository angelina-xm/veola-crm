from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.commercial_analytics import build_client_commercial_analytics
from clients.permissions import CanViewAnalytics, HasCompany

from .serializers import (
    AnalyticsV1OverviewQuerySerializer,
    ClientCommercialAnalyticsQuerySerializer,
)
from .services.v1_dashboard import build_analytics_v1_free


class AnalyticsV1OverviewView(APIView):
    """
    FREE analytics v1 — single payload for dashboard.
    PRO: add query params / alternate builders behind `tier` without changing URL.
    """

    permission_classes = [IsAuthenticated, HasCompany, CanViewAnalytics]

    def get(self, request, *args, **kwargs):
        q = AnalyticsV1OverviewQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        granularity = q.validated_data.get("granularity") or "week"
        payload = build_analytics_v1_free(
            user=request.user,
            company=request.company,
            membership=getattr(request, "membership", None),
            granularity=granularity,
        )
        return Response(payload)


class ClientCommercialAnalyticsView(APIView):
    """Commercial intelligence across clients — catalog-aware CRM analytics."""

    permission_classes = [IsAuthenticated, HasCompany, CanViewAnalytics]

    def get(self, request, *args, **kwargs):
        q = ClientCommercialAnalyticsQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        payload = build_client_commercial_analytics(
            user=request.user,
            company=request.company,
            membership=getattr(request, "membership", None),
            product_id=q.validated_data.get("product_id"),
            category=(q.validated_data.get("category") or "").strip() or None,
        )
        return Response(payload)
