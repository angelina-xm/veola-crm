"""Task lifecycle helpers for Activity rows with type=task."""

from __future__ import annotations

CATEGORY_CANCELLED = "cancelled"
CATEGORY_ARCHIVED_STALE = "archived_stale"
CATEGORY_MANUAL = "manual"
CATEGORY_AUTOMATION = "automation"

AUTOMATION_CATEGORIES = frozenset({CATEGORY_AUTOMATION, "automation"})


def is_task_cancelled(task) -> bool:
    return (task.category or "").lower() == CATEGORY_CANCELLED and not task.is_completed


def is_task_archived_stale(task) -> bool:
    return (task.category or "").lower() == CATEGORY_ARCHIVED_STALE or bool(task.archived_at and not task.is_completed)


def is_automation_task(task) -> bool:
    if task.automation_key:
        return True
    cat = (task.category or "").lower()
    return cat in AUTOMATION_CATEGORIES or bool(task.auto_type)
