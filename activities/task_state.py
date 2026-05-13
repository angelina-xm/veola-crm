"""
Centralized task due / overdue rules for CRM tasks (Activity.type == task).

Use these helpers from serializers, views, and future notification jobs
so overdue semantics stay consistent.
"""

from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from .models import Activity


def is_task_overdue(task: "Activity", *, now=None) -> bool:
    """Open task with a due date strictly before *now*."""
    from .models import Activity

    now = now or timezone.now()
    if task.type != Activity.Type.TASK or task.is_completed:
        return False
    if task.due_date is None:
        return False
    return task.due_date < now


def local_today_window(*, now=None):
    """
    Return [start, end) for the current calendar day in the active Django timezone,
    as aware datetimes suitable for DB comparison with stored due_date values.
    """
    now = now or timezone.now()
    local = timezone.localtime(now)
    start = local.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def task_ui_bucket(task: "Activity", *, now=None) -> str:
    """
    Coarse UI grouping: completed | overdue | today | upcoming | backlog
    (backlog = open task with no due date).
    """
    from .models import Activity

    now = now or timezone.now()
    if task.type != Activity.Type.TASK:
        return "other"
    if task.is_completed:
        return "completed"
    if task.due_date is None:
        return "backlog"
    if task.due_date < now:
        return "overdue"
    day_start, day_end = local_today_window(now=now)
    if day_start <= task.due_date < day_end:
        return "today"
    return "upcoming"
