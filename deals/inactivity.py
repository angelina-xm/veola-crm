"""
Centralized inactivity evaluation — signal-first, tiered escalation.

Tier 1 (24h): info signal only
Tier 2 (5d): warning signal; optional ONE follow-up task if auto_follow_up enabled
Tier 3 (14d): critical signal; suggest nurture/lost decision (no auto task)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from activities.activity_timing import last_meaningful_activity_at

from .models import Deal, DealSignal

TIER1_HOURS = 24
TIER2_DAYS = 5
TIER3_DAYS = 14
NEW_DEAL_GRACE = timedelta(hours=24)

SUGGESTED_ACTIONS = [
    "add_follow_up",
    "log_call",
    "move_stage",
    "waiting_on_client",
    "move_to_lost",
    "snooze",
]


@dataclass(frozen=True)
class InactivityEvaluation:
    tier: int  # 0 = healthy, 1..3
    severity: str
    is_active: bool
    message: str
    metadata: dict
    create_follow_up_task: bool


class InactivityEngine:
    @classmethod
    def is_suppressed(cls, deal: Deal, *, now=None) -> bool:
        """Waiting on client pauses escalation until follow_up_on."""
        now = now or timezone.now()
        if deal.inactivity_snoozed_until and now < deal.inactivity_snoozed_until:
            return True
        if deal.waiting_on_client:
            if deal.follow_up_on is None:
                return True
            if now < deal.follow_up_on:
                return True
        return False

    @classmethod
    def evaluate(cls, deal: Deal, *, auto_follow_up: bool, now=None) -> InactivityEvaluation:
        now = now or timezone.now()

        if deal.created_at and now - deal.created_at < NEW_DEAL_GRACE:
            return cls._healthy()

        if cls.is_suppressed(deal, now=now):
            if deal.waiting_on_client and deal.follow_up_on and now >= deal.follow_up_on:
                return cls._waiting_reminder(deal, now=now)
            return cls._healthy()

        last_at = last_meaningful_activity_at(deal, now=now)
        idle = now - last_at
        hours_idle = idle.total_seconds() / 3600
        days_idle = idle.days

        if hours_idle < TIER1_HOURS:
            return cls._healthy()

        client = getattr(deal, "client", None)
        client_name = client.name if client else "This deal"

        if days_idle >= TIER3_DAYS:
            return InactivityEvaluation(
                tier=3,
                severity=DealSignal.Severity.CRITICAL,
                is_active=True,
                message=f"{client_name} hasn't had activity in {days_idle} days — consider nurture or closing",
                metadata=cls._meta(
                    tier=3,
                    hours_idle=hours_idle,
                    days_idle=days_idle,
                    client_name=client_name,
                ),
                create_follow_up_task=False,
            )

        if days_idle >= TIER2_DAYS:
            return InactivityEvaluation(
                tier=2,
                severity=DealSignal.Severity.WARNING,
                is_active=True,
                message=f"{client_name} could use a check-in ({days_idle} days quiet)",
                metadata=cls._meta(
                    tier=2,
                    hours_idle=hours_idle,
                    days_idle=days_idle,
                    client_name=client_name,
                ),
                create_follow_up_task=bool(auto_follow_up),
            )

        return InactivityEvaluation(
            tier=1,
            severity=DealSignal.Severity.INFO,
            is_active=True,
            message=f"{client_name} hasn't had activity in a day or so",
            metadata=cls._meta(
                tier=1,
                hours_idle=hours_idle,
                days_idle=days_idle,
                client_name=client_name,
            ),
            create_follow_up_task=False,
        )

    @classmethod
    def _healthy(cls) -> InactivityEvaluation:
        return InactivityEvaluation(
            tier=0,
            severity=DealSignal.Severity.INFO,
            is_active=False,
            message="",
            metadata={},
            create_follow_up_task=False,
        )

    @classmethod
    def _waiting_reminder(cls, deal: Deal, *, now) -> InactivityEvaluation:
        client_name = deal.client.name if deal.client_id else "Client"
        days = 0
        if deal.follow_up_on:
            days = max(0, (now - deal.follow_up_on).days)
        return InactivityEvaluation(
            tier=1,
            severity=DealSignal.Severity.INFO,
            is_active=True,
            message=f"Still waiting on {client_name} — follow-up date reached",
            metadata={
                **cls._meta(
                    tier=1,
                    hours_idle=days * 24,
                    days_idle=days,
                    client_name=client_name,
                ),
                "waiting_reminder": True,
                "waiting_reason": deal.waiting_reason or "",
            },
            create_follow_up_task=False,
        )

    @classmethod
    def _meta(cls, *, tier, hours_idle, days_idle, client_name) -> dict:
        return {
            "tier": tier,
            "hours_idle": round(hours_idle, 1),
            "days_idle": days_idle,
            "client_name": client_name,
            "suggested_actions": list(SUGGESTED_ACTIONS),
        }

    @classmethod
    def refresh_signal(cls, deal: Deal, *, auto_follow_up: bool) -> InactivityEvaluation:
        """Upsert single INACTIVE signal (replaces legacy STALE)."""
        eval_result = cls.evaluate(deal, auto_follow_up=auto_follow_up)

        DealSignal.objects.filter(deal=deal, signal_type=DealSignal.SignalType.STALE).update(
            is_active=False
        )

        if eval_result.is_active:
            DealSignal.objects.update_or_create(
                deal=deal,
                signal_type=DealSignal.SignalType.INACTIVE,
                defaults={
                    "company": deal.company,
                    "severity": eval_result.severity,
                    "is_active": True,
                    "metadata": {
                        **eval_result.metadata,
                        "message": eval_result.message,
                    },
                },
            )
        else:
            DealSignal.objects.filter(
                deal=deal, signal_type=DealSignal.SignalType.INACTIVE
            ).update(is_active=False)

        return eval_result
