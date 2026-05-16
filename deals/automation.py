"""Stage-based automation — one next action via AutomationOrchestrator."""

from datetime import timedelta

from django.utils import timezone

from activities.automation_intents import (
    INTENT_REACH_OUT,
    INTENT_SEND_PROPOSAL,
    AutomationCandidate,
)
from activities.automation_orchestrator import AutomationOrchestrator
from activities.models import Activity


def _stage_name_key(stage) -> str | None:
    if stage is None:
        return None
    return stage.name.strip().lower()


def _cancel_other_stage_rules(deal, *, keep_automation_key: str) -> None:
    Activity.objects.filter(
        deal=deal,
        type=Activity.Type.TASK,
        is_completed=False,
        archived_at__isnull=True,
        auto_type="stage_rule",
        is_manually_modified=False,
    ).exclude(automation_key=keep_automation_key).update(
        category="cancelled",
        cancellation_reason="stage_changed",
        updated_at=timezone.now(),
    )


def create_automation_tasks(deal, author) -> None:
    """
    Ensure the single stage-appropriate automation task after stage change.
    """
    key = _stage_name_key(deal.stage)
    if key is None:
        return

    now = timezone.now()
    cid = deal.company_id

    if key == "new":
        automation_key = f"c{cid}:d{deal.id}:stage:new:call_client"
        candidate = AutomationCandidate(
            intent=INTENT_REACH_OUT,
            automation_key=automation_key,
            content="Call client",
            auto_type="stage_rule",
            due_date=now + timedelta(days=1),
            create_task=True,
        )
    elif key == "negotiation":
        automation_key = f"c{cid}:d{deal.id}:stage:negotiation:send_proposal"
        candidate = AutomationCandidate(
            intent=INTENT_SEND_PROPOSAL,
            automation_key=automation_key,
            content="Send proposal",
            auto_type="stage_rule",
            due_date=now + timedelta(days=2),
            create_task=True,
        )
    else:
        return

    _cancel_other_stage_rules(deal, keep_automation_key=automation_key)
    AutomationOrchestrator.ensure_deal_action(
        deal=deal,
        author=author,
        candidate=candidate,
    )
