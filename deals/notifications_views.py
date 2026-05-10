"""Агрегированные уведомления (без модели и WebSocket)."""

from datetime import timedelta

from django.db.models import Max, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from activities.models import Activity
from clients.permissions import HasCompany

from .serializers import NotificationItemSerializer
from .visibility import get_visible_deals


def _stale_deals_count(user, company, membership) -> int:
    stale_time = timezone.now() - timedelta(hours=48)
    return (
        get_visible_deals(user=user, company=company, membership=membership)
        .annotate(last_activity=Max("activities__created_at"))
        .filter(Q(last_activity__lt=stale_time) | Q(last_activity__isnull=True))
        .count()
    )


class NotificationsView(APIView):
    """GET /api/notifications/ — просроченные задачи, сегодня, stale-сделки (только видимые сделки)."""

    permission_classes = [IsAuthenticated, HasCompany]

    def get(self, request):
        company = request.company
        now = timezone.now()
        today = timezone.localdate()
        membership = getattr(request, "membership", None)

        visible_ids = list(
            get_visible_deals(request.user, company, membership).values_list(
                "pk", flat=True
            )
        )

        overdue = Activity.objects.filter(
            deal_id__in=visible_ids,
            type=Activity.Type.TASK,
            is_completed=False,
            due_date__isnull=False,
            due_date__lt=now,
        ).count()

        due_today = Activity.objects.filter(
            deal_id__in=visible_ids,
            type=Activity.Type.TASK,
            is_completed=False,
            due_date__isnull=False,
            due_date__date=today,
            due_date__gte=now,
        ).count()

        stale_count = _stale_deals_count(
            user=request.user,
            company=company,
            membership=membership,
        )

        items = []
        if overdue > 0:
            msg = "1 task overdue" if overdue == 1 else f"{overdue} tasks overdue"
            items.append({"type": "overdue_task", "message": msg, "count": overdue})
        if due_today > 0:
            msg = "1 task due today" if due_today == 1 else f"{due_today} tasks due today"
            items.append({"type": "due_today", "message": msg, "count": due_today})
        if stale_count > 0:
            msg = (
                "1 deal needs attention"
                if stale_count == 1
                else f"{stale_count} deals need attention"
            )
            items.append({"type": "stale_deals", "message": msg, "count": stale_count})

        return Response(
            [NotificationItemSerializer(instance=row).data for row in items]
        )
