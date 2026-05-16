"""Archive completed tasks after grace period; preserve history as Activity notes."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Activity
from django.db.models import Q

from .task_status import CATEGORY_ARCHIVED_STALE

logger = logging.getLogger(__name__)


class TaskArchivalService:
    GRACE_PERIOD_HOURS = 24
    STALE_TASK_DAYS = 30

    @classmethod
    def run(cls) -> None:
        cls._archive_completed()
        cls._archive_stale_no_due_date()

    @classmethod
    def _archive_completed(cls) -> None:
        cutoff = timezone.now() - timedelta(hours=cls.GRACE_PERIOD_HOURS)
        tasks = Activity.objects.tasks().filter(
            is_completed=True,
            completed_at__lt=cutoff,
            archived_at__isnull=True,
        ).select_related("deal", "client", "assigned_to", "author")

        count = 0
        for task in tasks:
            try:
                with transaction.atomic():
                    cls._archive_single(task)
                    count += 1
            except Exception:
                logger.error("Failed to archive task %s", task.id, exc_info=True)

        if count:
            logger.info("TaskArchivalService: archived %s completed tasks", count)

    @classmethod
    def _archive_stale_no_due_date(cls) -> None:
        cutoff = timezone.now() - timedelta(days=cls.STALE_TASK_DAYS)
        count = (
            Activity.objects.tasks()
            .filter(
                Q(category__iexact="manual") | Q(category="") | Q(category__isnull=True),
                automation_key__isnull=True,
                auto_type__isnull=True,
                is_completed=False,
                due_date__isnull=True,
                created_at__lt=cutoff,
                archived_at__isnull=True,
            )
            .update(
                category=CATEGORY_ARCHIVED_STALE,
                archived_at=timezone.now(),
            )
        )
        if count:
            logger.info(
                "TaskArchivalService: archived %s stale manual tasks without due date",
                count,
            )

    @classmethod
    def _archive_single(cls, task: Activity) -> None:
        archive_event = None
        if task.is_completed:
            try:
                archive_event = cls._create_archive_event(task)
            except Exception:
                logger.warning(
                    "Could not create archive event for task %s", task.id, exc_info=True
                )

        task.archived_at = timezone.now()
        if archive_event:
            task.archive_event = archive_event
        task.save(update_fields=["archived_at", "archive_event_id", "updated_at"])

    @classmethod
    def _create_archive_event(cls, task: Activity) -> Activity:
        was_overdue = bool(
            task.due_date
            and task.completed_at
            and task.completed_at > task.due_date
        )
        author = task.completed_by or task.assigned_to or task.author
        summary = (task.content or "Task")[:200]
        note_body = (
            f"Completed task: {summary}\n"
            f"Priority: {task.priority}\n"
            f"Due: {task.due_date.isoformat() if task.due_date else '—'}\n"
            f"Completed: {task.completed_at.isoformat() if task.completed_at else '—'}\n"
            f"Overdue: {'yes' if was_overdue else 'no'}"
        )
        return Activity.objects.create(
            deal=task.deal,
            client=task.client,
            author=author,
            type=Activity.Type.NOTE,
            category="task_completed",
            auto_type="task_completed",
            content=note_body,
        )
