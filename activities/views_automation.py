from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.permissions import HasCompany
from companies.models import CompanySettings

from .automation_sync import reconcile_automation_tasks

SYNC_THROTTLE_SECONDS = 3600  # reconcile at most once per company per hour


class SyncAutomationTasksView(APIView):
    """
    POST /api/activities/sync-automation/

    Reconciles automation state (one next action, reopen, cooldown).
    Throttled to once per company per hour unless ``?force=1``.
    """

    permission_classes = [IsAuthenticated, HasCompany]

    def post(self, request):
        company = request.company
        force = str(
            request.query_params.get("force") or request.data.get("force") or ""
        ).lower() in ("1", "true", "yes")

        cache_key = f"automation_reconcile:{company.id}"
        if not force and cache.get(cache_key):
            return Response(
                {
                    "skipped": True,
                    "reason": "throttled",
                    "retry_after_seconds": SYNC_THROTTLE_SECONDS,
                }
            )

        membership = getattr(request, "membership", None)
        settings = CompanySettings.objects.filter(company=company).first()
        stats = reconcile_automation_tasks(
            user=request.user,
            company=company,
            membership=membership,
            settings=settings,
        )

        cache.set(cache_key, True, SYNC_THROTTLE_SECONDS)

        return Response(
            {
                "skipped": False,
                **stats,
                "created": stats["tasks_created"],
            }
        )
