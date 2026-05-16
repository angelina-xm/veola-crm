"""Visible task (Activity) querysets — same deal visibility as ActivityViewSet."""

from __future__ import annotations

from django.db.models import Q, QuerySet

from deals.visibility import get_operational_visible_deals

from .models import Activity


def visible_tasks_queryset(user, company, membership) -> QuerySet[Activity]:
    """
    Tasks for the operational layer: operational deals + client-only tasks.
    Tasks on closed (Won/Lost) deals are excluded from workspace queues.
    """
    qs = Activity.objects.tasks().filter(
        Q(client__company=company) | Q(deal__company=company),
    ).exclude(category__iexact="system")

    operational_deals = get_operational_visible_deals(user, company, membership)
    return qs.filter(Q(deal_id__in=operational_deals.values("pk")) | Q(deal__isnull=True))


def visible_tasks_queryset_including_closed(user, company, membership) -> QuerySet[Activity]:
    """All visible tasks (e.g. deal detail) including manual tasks on closed deals."""
    from deals.visibility import get_visible_deals

    qs = Activity.objects.tasks().filter(
        Q(client__company=company) | Q(deal__company=company),
    ).exclude(category__iexact="system")
    visible = get_visible_deals(user, company, membership)
    return qs.filter(Q(deal_id__in=visible.values("pk")) | Q(deal__isnull=True))


def operational_tasks_queryset(user, company, membership) -> QuerySet[Activity]:
    """Visible tasks that appear in the operational workspace."""
    return visible_tasks_queryset(user, company, membership).operational()
