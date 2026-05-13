"""Visible task (Activity) querysets — same deal visibility as ActivityViewSet."""

from __future__ import annotations

from django.db.models import Q, QuerySet

from deals.visibility import get_visible_deals

from .models import Activity


def visible_tasks_queryset(user, company, membership) -> QuerySet[Activity]:
    """
    Tasks linked to visible deals, or client-only rows for the company tenant.
    """
    qs = Activity.objects.filter(
        Q(client__company=company) | Q(deal__company=company),
        type=Activity.Type.TASK,
    )
    visible = get_visible_deals(user, company, membership)
    return qs.filter(Q(deal_id__in=visible.values("pk")) | Q(deal__isnull=True))
