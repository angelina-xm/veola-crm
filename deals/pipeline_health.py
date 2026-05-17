"""Operational pipeline health — calm counts for board visibility."""

from __future__ import annotations

from .inactivity import InactivityEngine, TIER1_HOURS, TIER2_DAYS, TIER3_DAYS
from .models import DealSignal
from companies.models import CompanySettings


def compute_pipeline_health(*, deals_qs, company) -> dict:
    """
    Classify visible operational deals:
    - healthy: no active inactivity concern
    - attention_needed: tier 1–2 inactive signal (or 24h+ idle without signal yet)
    - at_risk: tier 3 inactive signal (14d+)
    """
    cfg = CompanySettings.objects.filter(company=company).first()
    auto_follow_up = bool(cfg.auto_follow_up) if cfg else False

    deal_ids = list(deals_qs.values_list("pk", flat=True))
    inactive_by_deal = {
        s.deal_id: s
        for s in DealSignal.objects.filter(
            deal_id__in=deal_ids,
            signal_type=DealSignal.SignalType.INACTIVE,
            is_active=True,
        )
    }

    healthy = 0
    attention = 0
    at_risk = 0
    waiting = 0

    for deal in deals_qs.select_related("client"):
        if deal.waiting_on_client:
            waiting += 1
        sig = inactive_by_deal.get(deal.id)
        if sig:
            tier = int((sig.metadata or {}).get("tier") or 0)
            if tier >= 3:
                at_risk += 1
            elif tier >= 1:
                attention += 1
            else:
                healthy += 1
            continue

        ev = InactivityEngine.evaluate(deal, auto_follow_up=auto_follow_up)
        if ev.tier >= 3:
            at_risk += 1
        elif ev.tier >= 1:
            attention += 1
        else:
            healthy += 1

    total = healthy + attention + at_risk
    return {
        "total_operational": total,
        "healthy": healthy,
        "attention_needed": attention,
        "at_risk": at_risk,
        "waiting_on_client": waiting,
        "tiers": {
            "tier1_hours": TIER1_HOURS,
            "tier2_days": TIER2_DAYS,
            "tier3_days": TIER3_DAYS,
        },
        "summary_message": _summary_message(healthy, attention, at_risk),
    }


def _summary_message(healthy: int, attention: int, at_risk: int) -> str:
    if attention == 0 and at_risk == 0:
        return "Pipeline looks calm — no deals need a nudge right now"
    parts = []
    if attention:
        parts.append(
            f"{attention} deal{'s' if attention != 1 else ''} could use some attention"
        )
    if at_risk:
        parts.append(
            f"{at_risk} deal{'s' if at_risk != 1 else ''} have been quiet for a while"
        )
    return " · ".join(parts)
