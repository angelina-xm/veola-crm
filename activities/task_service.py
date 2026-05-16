"""Single entry for idempotent automation-backed Activity rows (type=task)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from .models import Activity
from .task_status import is_automation_task

if TYPE_CHECKING:
    from deals.models import Deal

logger = logging.getLogger(__name__)


def ensure_open_automation_task(
    *,
    deal: "Deal",
    author,
    automation_key: str,
    content: str,
    auto_type: str,
    due_date,
    category: str = "automation",
) -> tuple[Activity, bool]:
    """
    Delegates to AutomationOrchestrator (reopen, one-per-deal, cooldown).

    Returns (instance, created).
    """
    from .automation_intents import (
        INTENT_OFFER_DISCOUNT,
        INTENT_REACH_OUT,
        INTENT_SUGGEST_REORDER,
        AutomationCandidate,
        intent_for_task,
    )
    from .automation_orchestrator import AutomationOrchestrator

    if not automation_key:
        raise ValueError("automation_key is required")

    intent = intent_for_task(auto_type=auto_type, automation_key=automation_key)
    if intent is None:
        at = (auto_type or "").strip().lower()
        if at == "offer_discount":
            intent = INTENT_OFFER_DISCOUNT
        elif at == "reorder":
            intent = INTENT_SUGGEST_REORDER
        else:
            intent = INTENT_REACH_OUT

    candidate = AutomationCandidate(
        intent=intent,
        automation_key=automation_key,
        content=content,
        auto_type=auto_type,
        due_date=due_date,
        create_task=True,
    )
    result = AutomationOrchestrator.ensure_deal_action(
        deal=deal,
        author=author,
        candidate=candidate,
    )
    if result.task is None:
        open_row = Activity.objects.filter(
            automation_key=automation_key,
            type=Activity.Type.TASK,
            is_completed=False,
            archived_at__isnull=True,
        ).first()
        return open_row, False
    return result.task, result.created


class TaskService:
    """Higher-level task operations (snooze, single automation per deal)."""

    @staticmethod
    def mark_manually_modified(task: Activity) -> None:
        if not task.is_manually_modified:
            task.is_manually_modified = True
            task.save(update_fields=["is_manually_modified", "updated_at"])

    @classmethod
    def ensure_automation(
        cls,
        *,
        deal: "Deal",
        author,
        automation_key: str,
        content: str,
        auto_type: str,
        due_date,
        category: str = "automation",
    ) -> tuple[Activity, bool]:
        return ensure_open_automation_task(
            deal=deal,
            author=author,
            automation_key=automation_key,
            content=content,
            auto_type=auto_type,
            due_date=due_date,
            category=category,
        )

    @classmethod
    def ensure_single_automation_for_deal(
        cls,
        *,
        deal: "Deal",
        author,
        automation_key: str,
        content: str,
        auto_type: str,
        due_date,
        category: str = "automation",
    ) -> tuple[Activity, bool]:
        """
        One open automation task per deal: cancel other open automation tasks, then ensure key.
        """
        with transaction.atomic():
            open_automation = Activity.objects.filter(
                deal=deal,
                type=Activity.Type.TASK,
                is_completed=False,
                archived_at__isnull=True,
                automation_key__isnull=False,
                is_manually_modified=False,
            ).exclude(automation_key=automation_key)

            cancelled = open_automation.update(
                category="cancelled",
                cancellation_reason="replaced_by_new_automation",
                updated_at=timezone.now(),
            )
            if cancelled:
                logger.info(
                    "TaskService: replaced %s automation tasks for deal=%s",
                    cancelled,
                    deal.id,
                )

            return cls.ensure_automation(
                deal=deal,
                author=author,
                automation_key=automation_key,
                content=content,
                auto_type=auto_type,
                due_date=due_date,
                category=category,
            )

    @classmethod
    def snooze(cls, *, task: Activity, until) -> Activity:
        if is_automation_task(task):
            task.is_manually_modified = True
        task.snoozed_until = until
        task.save(update_fields=["snoozed_until", "is_manually_modified", "updated_at"])
        return task
