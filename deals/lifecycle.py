"""Cleanup when a deal leaves the operational pipeline (Won/Lost/Closed)."""

from __future__ import annotations

import logging

from django.db.models import Q
from django.utils import timezone

from activities.models import Activity
from activities.task_status import is_automation_task

from .models import Deal, DealSignal
from .operational import closed_stage_kind, is_operational_deal

logger = logging.getLogger(__name__)


def _automation_task_q() -> Q:
    return (
        Q(automation_key__isnull=False)
        | Q(category__iexact="automation")
        | (Q(auto_type__isnull=False) & ~Q(auto_type=""))
    )


def apply_deal_closed_cleanup(deal: Deal) -> dict:
    """
    Retire automation from a closed deal. Manual open tasks are left as-is.

    Returns counts for logging/API.
    """
    if is_operational_deal(deal):
        return {"skipped": True}

    now = timezone.now()
    if deal.closed_at is None:
        deal.closed_at = now
        deal.save(update_fields=["closed_at"])

    automation_qs = Activity.objects.filter(
        deal=deal,
        type=Activity.Type.TASK,
        is_completed=False,
        archived_at__isnull=True,
    ).filter(_automation_task_q())

    automation_retired = automation_qs.update(
        category="cancelled",
        cancellation_reason="deal_closed",
        archived_at=now,
        updated_at=now,
    )

    signals_off = DealSignal.objects.filter(deal=deal, is_active=True).update(
        is_active=False
    )

    logger.info(
        "deal_closed_cleanup deal=%s automation_retired=%s signals_off=%s",
        deal.id,
        automation_retired,
        signals_off,
    )
    return {
        "automation_tasks_retired": automation_retired,
        "signals_deactivated": signals_off,
    }


def build_close_transition_payload(deal: Deal) -> dict | None:
    """Backend payload for calm Won/Lost confirmation UI."""
    kind = closed_stage_kind(deal.stage)
    if kind is None:
        return None

    cycle_days = 0
    if deal.created_at and deal.closed_at:
        cycle_days = max(0, (deal.closed_at - deal.created_at).days)
    elif deal.created_at:
        cycle_days = max(0, (timezone.now() - deal.created_at).days)

    return {
        "outcome": kind,
        "deal_id": deal.id,
        "title": deal.title,
        "amount": str(deal.amount),
        "cycle_days": cycle_days,
        "client_id": deal.client_id,
        "closed_at": deal.closed_at.isoformat() if deal.closed_at else None,
        "win_reason": deal.win_reason or None,
        "loss_reason": deal.loss_reason or None,
        "links": {
            "view_customer": f"/clients/{deal.client_id}",
            "back_to_pipeline": "/deals",
        },
    }


def is_manual_open_task(task: Activity) -> bool:
    if task.type != Activity.Type.TASK or task.is_completed:
        return False
    if is_automation_task(task):
        return False
    return True
