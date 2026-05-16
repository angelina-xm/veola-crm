"""Operational intents for automation (Phase A — no extra DB tables)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

# Intent groups used for cooldown (shared clock across similar actions).
INTENT_REACH_OUT = "reach_out"
INTENT_SEND_PROPOSAL = "send_proposal"
INTENT_OFFER_DISCOUNT = "offer_discount"
INTENT_SUGGEST_REORDER = "suggest_reorder"

COOLDOWN_REACH_OUT = timedelta(hours=72)
COOLDOWN_SEND_PROPOSAL = timedelta(hours=24)
COOLDOWN_OFFER_DISCOUNT = timedelta(days=7)
COOLDOWN_SUGGEST_REORDER = timedelta(days=14)

INTENT_COOLDOWNS = {
    INTENT_REACH_OUT: COOLDOWN_REACH_OUT,
    INTENT_SEND_PROPOSAL: COOLDOWN_SEND_PROPOSAL,
    INTENT_OFFER_DISCOUNT: COOLDOWN_OFFER_DISCOUNT,
    INTENT_SUGGEST_REORDER: COOLDOWN_SUGGEST_REORDER,
}

# Higher wins when choosing one next action per deal.
INTENT_PRIORITY = {
    INTENT_SEND_PROPOSAL: 100,
    INTENT_REACH_OUT: 90,
    INTENT_OFFER_DISCOUNT: 50,
    INTENT_SUGGEST_REORDER: 30,
}

HEURISTIC_AUTO_TYPES = frozenset({"follow_up", "offer_discount", "reorder"})


@dataclass(frozen=True)
class AutomationCandidate:
    intent: str
    automation_key: str
    content: str
    auto_type: str
    due_date: object  # datetime
    create_task: bool = True

    @property
    def priority(self) -> int:
        return INTENT_PRIORITY.get(self.intent, 0)


def intent_for_task(*, auto_type: str | None, automation_key: str | None) -> str | None:
    at = (auto_type or "").strip().lower()
    key = (automation_key or "").lower()
    if at == "stage_rule":
        if "send_proposal" in key or "negotiation" in key:
            return INTENT_SEND_PROPOSAL
        if "call_client" in key or ":stage:new:" in key:
            return INTENT_REACH_OUT
        return INTENT_REACH_OUT
    if at == "follow_up":
        return INTENT_REACH_OUT
    if at == "offer_discount":
        return INTENT_OFFER_DISCOUNT
    if at == "reorder":
        return INTENT_SUGGEST_REORDER
    return None


def task_priority(task) -> int:
    intent = intent_for_task(
        auto_type=getattr(task, "auto_type", None),
        automation_key=getattr(task, "automation_key", None),
    )
    if intent is None:
        return 0
    return INTENT_PRIORITY.get(intent, 0)
