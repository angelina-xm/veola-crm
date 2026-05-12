from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.permissions import CanViewAnalytics, HasCompany

from .serializers import AnalyticsV1OverviewQuerySerializer
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
