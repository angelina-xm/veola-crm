"""Who may edit or complete tasks on visible deals / clients."""

from __future__ import annotations

from companies.permissions import is_super_admin

from deals.visibility import user_can_edit_deal

from .models import Activity


def _task_company_id(task: Activity) -> int | None:
    if task.deal_id:
        return task.deal.company_id
    if task.client_id:
        return task.client.company_id
    return None


def user_can_edit_task(user, membership, task: Activity) -> bool:
    if task.type != Activity.Type.TASK:
        return False
    if membership is None or not getattr(membership, "is_active", True):
        return False
    if _task_company_id(task) != membership.company_id:
        return False
    if is_super_admin(membership):
        return True
    if task.assigned_to_id == user.id or task.author_id == user.id:
        return True
    if task.deal_id and user_can_edit_deal(user, membership, task.deal):
        return True
    if task.deal_id is None and getattr(membership, "can_create_deals", False):
        return True
    return False


def user_can_complete_task(user, membership, task: Activity) -> bool:
    """Same as edit for v1 — assignee, author, or deal editors."""
    return user_can_edit_task(user, membership, task)
