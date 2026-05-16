"""Хардкод-правила: задачи при смене стадии сделки (без отдельных таблиц настроек)."""

from datetime import timedelta

from django.utils import timezone

from activities.task_service import ensure_open_automation_task


def _stage_name_key(stage) -> str | None:
    if stage is None:
        return None
    return stage.name.strip().lower()


def _create_task_if_missing(deal, author, *, content: str, due_date, automation_key: str):
    ensure_open_automation_task(
        deal=deal,
        author=author,
        automation_key=automation_key,
        content=content,
        auto_type="stage_rule",
        due_date=due_date,
        category="automation",
    )


def create_automation_tasks(deal, author) -> None:
    """
    Создаёт задачи по текущей стадии сделки (после сохранения с новым stage).
    Idempotent по ``automation_key`` (см. ``activities.task_service``).
    """
    key = _stage_name_key(deal.stage)
    if key is None:
        return

    now = timezone.now()
    cid = deal.company_id
    if key == "new":
        _create_task_if_missing(
            deal,
            author,
            content="Call client",
            due_date=now + timedelta(days=1),
            automation_key=f"c{cid}:d{deal.id}:stage:new:call_client",
        )
    elif key == "negotiation":
        _create_task_if_missing(
            deal,
            author,
            content="Send proposal",
            due_date=now + timedelta(days=2),
            automation_key=f"c{cid}:d{deal.id}:stage:negotiation:send_proposal",
        )
