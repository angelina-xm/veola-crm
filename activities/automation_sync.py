"""
Server-side pipeline automation (replaces Board useEffect auto-task creation).

Uses ``automation_key`` + :func:`activities.task_service.ensure_open_automation_task`
so duplicates cannot persist even under races.
"""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Max, Q
from django.utils import timezone

from activities.models import Activity
from activities.task_service import ensure_open_automation_task
from companies.models import CompanySettings
from deals.models import Deal
from deals.visibility import get_visible_deals

STALE_HOURS = 48
DORMANT_HOURS = 96
NEW_DEAL_GRACE = timedelta(days=1)


def _pricing_count(deal: Deal) -> int:
    return Activity.objects.filter(
        deal=deal,
        type=Activity.Type.NOTE,
    ).filter(Q(category__iexact="pricing")).count()


def _deal_is_stale_for_followup(deal: Deal, now) -> bool:
    last_open_task = Activity.objects.filter(
        deal=deal,
        type=Activity.Type.TASK,
        is_completed=False,
    ).aggregate(m=Max("created_at"))["m"]
    reference = last_open_task or deal.created_at
    if reference is None:
        return False
    if deal.created_at and now - deal.created_at < NEW_DEAL_GRACE:
        return False
    return now - reference > timedelta(hours=STALE_HOURS)


def _deal_is_dormant(deal: Deal, now) -> bool:
    if deal.created_at is None:
        return False
    return now - deal.created_at > timedelta(hours=DORMANT_HOURS)


def _has_open_automation(
    open_tasks: list[Activity], *, automation_key: str, auto_type: str
) -> bool:
    at = auto_type.strip().lower()
    for t in open_tasks:
        if (t.automation_key or "") == automation_key:
            return True
        if (t.auto_type or "").strip().lower() == at and not (t.automation_key or ""):
            return True
    return False


def sync_automation_tasks(*, user, company, membership, settings: CompanySettings | None) -> int:
    """
    Evaluate heuristics for all *visible* deals and ensure automation tasks.

    Returns number of newly created rows.
    """
    cfg = settings
    if cfg is None:
        cfg = CompanySettings.objects.filter(company=company).first()
    follow_up = True if cfg is None else cfg.auto_follow_up
    discount = True if cfg is None else cfg.auto_discount
    reorder = True if cfg is None else cfg.auto_reorder

    now = timezone.now()
    created = 0
    deals = get_visible_deals(user, company, membership).select_related("client", "stage")

    for deal in deals:
        cid = deal.company_id
        open_tasks = list(
            Activity.objects.filter(
                deal=deal,
                type=Activity.Type.TASK,
                is_completed=False,
            )
        )
        pricing_n = _pricing_count(deal)

        if follow_up and _deal_is_stale_for_followup(deal, now):
            key = f"c{cid}:d{deal.id}:auto:follow_up"
            if not _has_open_automation(open_tasks, automation_key=key, auto_type="follow_up"):
                _, was_created = ensure_open_automation_task(
                    deal=deal,
                    author=user,
                    automation_key=key,
                    content="Follow up with client",
                    auto_type="follow_up",
                    due_date=now + timedelta(days=1),
                )
                if was_created:
                    created += 1

        if discount and pricing_n >= 3:
            key = f"c{cid}:d{deal.id}:auto:offer_discount"
            if not _has_open_automation(
                open_tasks, automation_key=key, auto_type="offer_discount"
            ):
                _, was_created = ensure_open_automation_task(
                    deal=deal,
                    author=user,
                    automation_key=key,
                    content="Offer discount",
                    auto_type="offer_discount",
                    due_date=now + timedelta(days=2),
                )
                if was_created:
                    created += 1

        if reorder and _deal_is_dormant(deal, now):
            key = f"c{cid}:d{deal.id}:auto:reorder"
            if not _has_open_automation(open_tasks, automation_key=key, auto_type="reorder"):
                _, was_created = ensure_open_automation_task(
                    deal=deal,
                    author=user,
                    automation_key=key,
                    content="Suggest reorder",
                    auto_type="reorder",
                    due_date=now + timedelta(days=1),
                )
                if was_created:
                    created += 1

    return created
