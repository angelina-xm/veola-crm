"""User actions on inactivity signals — micro-workflows, no task spam."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from activities.models import Activity
from activities.task_service import TaskService
from .models import Deal
from .signal_engine import SignalEngine


def apply_inactivity_action(
    *,
    deal: Deal,
    user,
    action: str,
    payload: dict | None = None,
) -> dict:
    payload = payload or {}
    now = timezone.now()

    if action == "add_follow_up":
        due_raw = payload.get("due_date")
        due = parse_datetime(due_raw) if due_raw else now + timedelta(days=1)
        if due is None:
            due = now + timedelta(days=1)
        task = Activity.objects.create(
            deal=deal,
            client=deal.client,
            author=user,
            type=Activity.Type.TASK,
            content=payload.get("content") or "Follow up with client",
            due_date=due,
            is_manually_modified=True,
        )
        TaskService.ensure_single_automation_for_deal(deal)
        SignalEngine.refresh_for_deal(deal)
        return {"ok": True, "task_id": str(task.id)}

    if action == "log_call":
        Activity.objects.create(
            deal=deal,
            client=deal.client,
            author=user,
            type=Activity.Type.NOTE,
            category="call",
            content=payload.get("content") or "Call logged",
        )
        SignalEngine.refresh_for_deal(deal)
        return {"ok": True}

    if action == "waiting_on_client":
        reason = (payload.get("waiting_reason") or "").strip()[:100]
        follow_raw = payload.get("follow_up_on")
        follow_up = parse_datetime(follow_raw) if follow_raw else None
        deal.waiting_on_client = True
        deal.waiting_reason = reason
        deal.follow_up_on = follow_up
        deal.save(
            update_fields=["waiting_on_client", "waiting_reason", "follow_up_on"]
        )
        SignalEngine.refresh_for_deal(deal)
        return {"ok": True, "waiting_on_client": True}

    if action == "clear_waiting":
        deal.waiting_on_client = False
        deal.waiting_reason = ""
        deal.follow_up_on = None
        deal.save(
            update_fields=["waiting_on_client", "waiting_reason", "follow_up_on"]
        )
        SignalEngine.refresh_for_deal(deal)
        return {"ok": True, "waiting_on_client": False}

    if action == "snooze":
        days = int(payload.get("days") or 3)
        days = max(1, min(days, 30))
        deal.inactivity_snoozed_until = now + timedelta(days=days)
        deal.save(update_fields=["inactivity_snoozed_until"])
        SignalEngine.refresh_for_deal(deal)
        return {"ok": True, "snoozed_until": deal.inactivity_snoozed_until.isoformat()}

    if action == "dismiss":
        deal.inactivity_snoozed_until = now + timedelta(days=7)
        deal.save(update_fields=["inactivity_snoozed_until"])
        SignalEngine.refresh_for_deal(deal)
        return {"ok": True}

    raise ValueError(f"Unknown inactivity action: {action}")
