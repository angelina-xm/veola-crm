"""Хардкод-правила: задачи при смене стадии сделки (без отдельных таблиц настроек)."""

from datetime import timedelta

from django.utils import timezone

from activities.models import Activity


def _stage_name_key(stage) -> str | None:
    if stage is None:
        return None
    return stage.name.strip().lower()


def _create_task_if_missing(deal, author, *, content: str, due_date):
    if Activity.objects.filter(
        deal=deal,
        type=Activity.Type.TASK,
        content=content,
        is_completed=False,
    ).exists():
        return
    Activity.objects.create(
        deal=deal,
        author=author,
        type=Activity.Type.TASK,
        content=content,
        due_date=due_date,
    )


def create_automation_tasks(deal, author) -> None:
    """
    Создаёт задачи по текущей стадии сделки (после сохранения с новым stage).
    Дубликаты по (deal, type=task, content, is_completed=False) не создаются.
    """
    key = _stage_name_key(deal.stage)
    if key is None:
        return

    now = timezone.now()
    if key == "new":
        _create_task_if_missing(
            deal,
            author,
            content="Contact client",
            due_date=now + timedelta(days=1),
        )
    elif key == "negotiation":
        _create_task_if_missing(
            deal,
            author,
            content="Send proposal",
            due_date=now + timedelta(days=2),
        )
