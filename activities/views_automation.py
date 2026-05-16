from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.permissions import HasCompany
from companies.models import CompanySettings

from .automation_sync import sync_automation_tasks


class SyncAutomationTasksView(APIView):
    """
    POST /api/activities/sync-automation/

    Ensures board-style automation tasks server-side (idempotent ``automation_key``).
    """

    permission_classes = [IsAuthenticated, HasCompany]

    def post(self, request):
        company = request.company
        membership = getattr(request, "membership", None)
        settings = CompanySettings.objects.filter(company=company).first()
        created = sync_automation_tasks(
            user=request.user,
            company=company,
            membership=membership,
            settings=settings,
        )
        return Response({"created": created})
