"""
Reconcile heuristic automation per deal (Phase A).

- Stale → DealSignal only (no follow-up task)
- One heuristic winner per deal (discount vs reorder)
- Does not override higher-priority stage tasks
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from activities.automation_intents import (
    INTENT_OFFER_DISCOUNT,
    INTENT_REACH_OUT,
    INTENT_SUGGEST_REORDER,
    AutomationCandidate,
)
from activities.automation_orchestrator import AutomationOrchestrator, last_meaningful_activity_at
from activities.models import Activity
from companies.models import CompanySettings
from deals.models import Deal
from deals.visibility import get_operational_visible_deals

STALE_HOURS = 48
DORMANT_HOURS = 96
NEW_DEAL_GRACE = timedelta(days=1)


def _pricing_count(deal: Deal) -> int:
    from django.db.models import Q

    return Activity.objects.filter(
        deal=deal,
        type=Activity.Type.NOTE,
    ).filter(Q(category__iexact="pricing")).count()


def _deal_is_stale_for_followup(deal: Deal, now) -> bool:
    reference = last_meaningful_activity_at(deal, now=now)
    if deal.created_at and now - deal.created_at < NEW_DEAL_GRACE:
        return False
    return now - reference > timedelta(hours=STALE_HOURS)


def _deal_is_dormant(deal: Deal, now) -> bool:
    if deal.created_at is None:
        return False
    return now - deal.created_at > timedelta(hours=DORMANT_HOURS)


def reconcile_automation_tasks(
    *, user, company, membership, settings: CompanySettings | None
) -> dict:
    """
    Reconcile automation state for visible deals (no task spam).

    Returns stats dict for API/monitoring.
    """
    cfg = settings
    if cfg is None:
        cfg = CompanySettings.objects.filter(company=company).first()
    discount_on = True if cfg is None else cfg.auto_discount
    reorder_on = True if cfg is None else cfg.auto_reorder

    now = timezone.now()
    stats = {
        "deals_processed": 0,
        "tasks_created": 0,
        "tasks_reopened": 0,
        "skipped_cooldown": 0,
        "signals_only": 0,
    }

    deals = get_operational_visible_deals(user, company, membership).select_related(
        "client", "stage"
    )

    for deal in deals:
        stats["deals_processed"] += 1
        cid = deal.company_id
        candidates: list[AutomationCandidate] = []

        if _deal_is_stale_for_followup(deal, now):
            candidates.append(
                AutomationCandidate(
                    intent=INTENT_REACH_OUT,
                    automation_key=f"c{cid}:d{deal.id}:auto:follow_up",
                    content="Follow up with client",
                    auto_type="follow_up",
                    due_date=now + timedelta(days=1),
                    create_task=False,
                )
            )

        pricing_n = _pricing_count(deal)
        if discount_on and pricing_n >= 3:
            candidates.append(
                AutomationCandidate(
                    intent=INTENT_OFFER_DISCOUNT,
                    automation_key=f"c{cid}:d{deal.id}:auto:offer_discount",
                    content="Offer discount",
                    auto_type="offer_discount",
                    due_date=now + timedelta(days=2),
                    create_task=True,
                )
            )

        if reorder_on and _deal_is_dormant(deal, now):
            candidates.append(
                AutomationCandidate(
                    intent=INTENT_SUGGEST_REORDER,
                    automation_key=f"c{cid}:d{deal.id}:auto:reorder",
                    content="Suggest reorder",
                    auto_type="reorder",
                    due_date=now + timedelta(days=1),
                    create_task=True,
                )
            )

        if not candidates:
            AutomationOrchestrator.reconcile_deal_heuristics(
                deal=deal, author=user, candidates=[]
            )
            continue

        if any(not c.create_task for c in candidates):
            stats["signals_only"] += 1

        result = AutomationOrchestrator.reconcile_deal_heuristics(
            deal=deal,
            author=user,
            candidates=candidates,
        )

        if result.skipped_cooldown:
            stats["skipped_cooldown"] += 1
        if result.created:
            stats["tasks_created"] += 1
        if result.reopened:
            stats["tasks_reopened"] += 1

    return stats


def sync_automation_tasks(*, user, company, membership, settings=None) -> int:
    """Backward-compatible: returns count of newly created tasks."""
    stats = reconcile_automation_tasks(
        user=user,
        company=company,
        membership=membership,
        settings=settings,
    )
    return stats["tasks_created"]
