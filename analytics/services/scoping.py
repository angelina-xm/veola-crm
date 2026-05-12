"""Tenant-safe querysets for analytics; mirrors deal/activity visibility rules."""

from __future__ import annotations

from django.db.models import Q, QuerySet

from activities.models import Activity
from deals.models import Deal
from deals.visibility import get_visible_deals


def visible_deals(user, company, membership) -> QuerySet[Deal]:
    return get_visible_deals(user, company, membership)


def visible_activities_base(user, company, membership) -> QuerySet[Activity]:
    """
    Same rules as ActivityViewSet.get_queryset (company scope + visible deals + client-only rows).
    """
    qs = (
        Activity.objects.filter(Q(client__company=company) | Q(deal__company=company))
        .select_related("author", "deal", "deal__stage", "client")
        .order_by("-created_at")
    )
    visible_ids = list(
        get_visible_deals(user, company, membership).values_list("pk", flat=True)
    )
    return qs.filter(Q(deal_id__in=visible_ids) | Q(deal__isnull=True))
