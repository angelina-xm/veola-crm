"""
Phase A automation: one next action per deal, reopen-not-recreate, cooldowns.

All automation task writes should go through AutomationOrchestrator.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from deals.operational import is_operational_deal
from deals.signal_engine import SignalEngine

from .automation_intents import (
    HEURISTIC_AUTO_TYPES,
    INTENT_COOLDOWNS,
    INTENT_OFFER_DISCOUNT,
    INTENT_REACH_OUT,
    INTENT_SEND_PROPOSAL,
    INTENT_SUGGEST_REORDER,
    AutomationCandidate,
    task_priority,
)
from .models import Activity

logger = logging.getLogger(__name__)


@dataclass
class EnsureResult:
    task: Activity | None
    created: bool = False
    reopened: bool = False
    skipped_cooldown: bool = False
    skipped_signal_only: bool = False


class AutomationOrchestrator:
    @classmethod
    def ensure_deal_action(
        cls,
        *,
        deal,
        author,
        candidate: AutomationCandidate,
    ) -> EnsureResult:
        """
        Apply one automation action: supersede lower-priority open tasks, reopen or create.
        """
        if not is_operational_deal(deal):
            return EnsureResult(task=None, skipped_signal_only=True)

        if not candidate.create_task:
            SignalEngine.refresh_for_deal(deal)
            return EnsureResult(task=None, skipped_signal_only=True)

        now = timezone.now()
        if cls._is_in_cooldown(deal, candidate.intent, now):
            SignalEngine.refresh_for_deal(deal)
            return EnsureResult(task=None, skipped_cooldown=True)

        with transaction.atomic():
            cls._supersede_lower_priority(
                deal,
                winner_priority=candidate.priority,
                exclude_automation_key=candidate.automation_key,
            )
            task, created, reopened = cls._reopen_or_create(
                deal=deal,
                author=author,
                automation_key=candidate.automation_key,
                content=candidate.content,
                auto_type=candidate.auto_type,
                due_date=candidate.due_date,
            )
        return EnsureResult(
            task=task,
            created=created,
            reopened=reopened,
        )

    @classmethod
    def reconcile_deal_heuristics(
        cls,
        *,
        deal,
        author,
        candidates: list[AutomationCandidate],
    ) -> EnsureResult:
        """
        Pick at most one heuristic winner; refresh signals; clear stale heuristic tasks.
        """
        if not is_operational_deal(deal):
            return EnsureResult(task=None)

        SignalEngine.refresh_for_deal(deal)

        if any(not c.create_task for c in candidates):
            cls._cancel_legacy_follow_up_open(deal)

        actionable = [c for c in candidates if c.create_task]
        winner: AutomationCandidate | None = None
        if actionable:
            winner = max(actionable, key=lambda c: c.priority)

        if winner is None:
            cls._cancel_heuristic_open(deal)
            return EnsureResult(
                task=None,
                skipped_signal_only=any(not c.create_task for c in candidates),
            )

        open_stage = cls._highest_open_automation(deal)
        if open_stage and task_priority(open_stage) >= winner.priority:
            cls._cancel_heuristic_open(deal)
            return EnsureResult(task=open_stage)

        return cls.ensure_deal_action(deal=deal, author=author, candidate=winner)

    @classmethod
    def _cancel_legacy_follow_up_open(cls, deal) -> int:
        """Stale deals use signals — retire open follow-up tasks from older logic."""
        now = timezone.now()
        return Activity.objects.filter(
            deal=deal,
            type=Activity.Type.TASK,
            is_completed=False,
            archived_at__isnull=True,
            auto_type="follow_up",
            is_manually_modified=False,
        ).update(
            category="cancelled",
            cancellation_reason="signal_instead_of_task",
            updated_at=now,
        )

    @classmethod
    def _is_in_cooldown(cls, deal, intent: str, now) -> bool:
        cooldown = INTENT_COOLDOWNS.get(intent)
        if not cooldown:
            return False

        auto_types = cls._auto_types_for_intent(intent)
        last = (
            Activity.objects.filter(
                deal=deal,
                type=Activity.Type.TASK,
                is_completed=True,
                completed_at__isnull=False,
                auto_type__in=auto_types,
            )
            .order_by("-completed_at")
            .first()
        )
        if last is None:
            return False
        return now < last.completed_at + cooldown

    @staticmethod
    def _auto_types_for_intent(intent: str) -> list[str]:
        if intent == INTENT_REACH_OUT:
            return ["follow_up", "stage_rule"]
        if intent == INTENT_SEND_PROPOSAL:
            return ["stage_rule"]
        if intent == INTENT_OFFER_DISCOUNT:
            return ["offer_discount"]
        if intent == INTENT_SUGGEST_REORDER:
            return ["reorder"]
        return []

    @classmethod
    def _supersede_lower_priority(
        cls,
        deal,
        *,
        winner_priority: int,
        exclude_automation_key: str,
    ) -> int:
        count = 0
        qs = Activity.objects.filter(
            deal=deal,
            type=Activity.Type.TASK,
            is_completed=False,
            archived_at__isnull=True,
            automation_key__isnull=False,
            is_manually_modified=False,
        ).exclude(automation_key=exclude_automation_key)

        for task in qs:
            if task_priority(task) < winner_priority:
                task.cancel(reason="superseded_by_higher_priority")
                count += 1
        return count

    @classmethod
    def _cancel_heuristic_open(cls, deal) -> int:
        now = timezone.now()
        return Activity.objects.filter(
            deal=deal,
            type=Activity.Type.TASK,
            is_completed=False,
            archived_at__isnull=True,
            auto_type__in=HEURISTIC_AUTO_TYPES,
            is_manually_modified=False,
        ).update(
            category="cancelled",
            cancellation_reason="condition_cleared",
            updated_at=now,
        )

    @classmethod
    def _highest_open_automation(cls, deal) -> Activity | None:
        tasks = list(
            Activity.objects.filter(
                deal=deal,
                type=Activity.Type.TASK,
                is_completed=False,
                archived_at__isnull=True,
                automation_key__isnull=False,
            )
        )
        if not tasks:
            return None
        return max(tasks, key=task_priority)

    @classmethod
    def _reopen_or_create(
        cls,
        *,
        deal,
        author,
        automation_key: str,
        content: str,
        auto_type: str,
        due_date,
    ) -> tuple[Activity, bool, bool]:
        open_row = (
            Activity.objects.filter(
                automation_key=automation_key,
                type=Activity.Type.TASK,
                is_completed=False,
                archived_at__isnull=True,
            )
            .first()
        )
        if open_row is not None:
            changed = False
            if open_row.due_date != due_date:
                open_row.due_date = due_date
                changed = True
            if open_row.content != content:
                open_row.content = content
                changed = True
            if changed:
                open_row.save(update_fields=["due_date", "content", "updated_at"])
            return open_row, False, False

        past = (
            Activity.objects.filter(
                automation_key=automation_key,
                type=Activity.Type.TASK,
            )
            .order_by("-id")
            .first()
        )
        if past is not None:
            past.is_completed = False
            past.completed_at = None
            past.completed_by = None
            past.archived_at = None
            past.archive_event = None
            past.category = "automation"
            past.cancellation_reason = ""
            past.snoozed_until = None
            past.content = content
            past.due_date = due_date
            past.auto_type = auto_type
            past.assigned_to = past.assigned_to or author
            past.save(
                update_fields=[
                    "is_completed",
                    "completed_at",
                    "completed_by",
                    "archived_at",
                    "archive_event",
                    "category",
                    "cancellation_reason",
                    "snoozed_until",
                    "content",
                    "due_date",
                    "auto_type",
                    "assigned_to",
                    "updated_at",
                ]
            )
            logger.info(
                "AutomationOrchestrator: reopened task id=%s key=%s",
                past.id,
                automation_key,
            )
            return past, False, True

        try:
            with transaction.atomic():
                row = Activity.objects.create(
                    deal=deal,
                    client=deal.client,
                    author=author,
                    assigned_to=author,
                    type=Activity.Type.TASK,
                    category="automation",
                    auto_type=auto_type,
                    content=content,
                    due_date=due_date,
                    automation_key=automation_key,
                )
                return row, True, False
        except IntegrityError:
            row = Activity.objects.filter(
                automation_key=automation_key,
                type=Activity.Type.TASK,
                is_completed=False,
            ).first()
            if row is None:
                raise
            return row, False, False


def last_meaningful_activity_at(deal, *, now=None):
    """Last touch on deal: any activity or last completed reach-out task."""
    now = now or timezone.now()
    last_activity = Activity.objects.filter(deal=deal).aggregate(m=Max("created_at"))["m"]
    last_reach_out_done = (
        Activity.objects.filter(
            deal=deal,
            type=Activity.Type.TASK,
            is_completed=True,
            auto_type__in=["follow_up", "stage_rule"],
            completed_at__isnull=False,
        )
        .aggregate(m=Max("completed_at"))
        .get("m")
    )
    reference = deal.created_at
    for ts in (last_activity, last_reach_out_done, deal.created_at):
        if ts and (reference is None or ts > reference):
            reference = ts
    return reference or now
