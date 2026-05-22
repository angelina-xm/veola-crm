"""
Customer Relationship Intelligence Layer — readable operational signals, not AI scores.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q
from django.utils import timezone

from activities.models import Activity
from activities.task_query import visible_tasks_queryset
from analytics.services.scoping import visible_activities_base, visible_deals
from clients.models import Client, ClientProductLink
from deals.models import Deal
from deals.operational import closed_stage_kind, is_operational_deal

User = get_user_model()

HEALTH_HEALTHY = "healthy"
HEALTH_COOLING = "cooling_down"
HEALTH_ATTENTION = "needs_attention"
HEALTH_REENGAGE = "re_engagement"

HEALTH_LABELS = {
    HEALTH_HEALTHY: "Healthy",
    HEALTH_COOLING: "Cooling down",
    HEALTH_ATTENTION: "Needs attention",
    HEALTH_REENGAGE: "Re-engagement opportunity",
}

PRODUCT_RELATIONSHIP_LABELS = {
    ClientProductLink.Relationship.PREFERRED: "Preferred products",
    ClientProductLink.Relationship.FREQUENT: "Frequently buys",
    ClientProductLink.Relationship.RECENT: "Recent purchase",
    ClientProductLink.Relationship.INTERESTED: "Interested in",
    ClientProductLink.Relationship.STOPPED: "Stopped buying",
    ClientProductLink.Relationship.SEASONAL: "Seasonal buyer",
    ClientProductLink.Relationship.HIGH_VALUE: "High-value buyer",
}


def _coerce_aware_datetime(value: date | datetime | None) -> datetime | None:
    """Normalize date/datetime (naive or aware) for safe comparisons."""
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        value = datetime.combine(value, datetime.min.time())
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    return value


def _latest_timestamp(*values: date | datetime | None) -> datetime | None:
    normalized = [_coerce_aware_datetime(v) for v in values if v is not None]
    return max(normalized) if normalized else None


def _days_since(dt: date | datetime | None) -> int | None:
    coerced = _coerce_aware_datetime(dt)
    if not coerced:
        return None
    return (timezone.now() - coerced).days


def _is_past_due(due: date | datetime | None, *, now: datetime | None = None) -> bool:
    coerced = _coerce_aware_datetime(due)
    if not coerced:
        return False
    now = now or timezone.now()
    return coerced < now


def _infer_relationship_owner(client: Client, deals: list[Deal]) -> dict[str, Any]:
    if client.relationship_owner_id:
        u = client.relationship_owner
        return {
            "user_id": client.relationship_owner_id,
            "email": getattr(u, "email", None),
            "display_name": (u.get_full_name() or u.email) if u else None,
            "source": "assigned",
        }
    owners: dict[int, int] = {}
    for d in deals:
        if d.assigned_to_id:
            owners[d.assigned_to_id] = owners.get(d.assigned_to_id, 0) + 1
    if not owners:
        return {"user_id": None, "email": None, "display_name": None, "source": "unassigned"}
    best_id = max(owners, key=owners.get)
    try:
        u = User.objects.get(pk=best_id)
        return {
            "user_id": best_id,
            "email": u.email,
            "display_name": u.get_full_name() or u.email,
            "source": "inferred_from_deals",
        }
    except User.DoesNotExist:
        return {"user_id": best_id, "email": None, "display_name": None, "source": "inferred_from_deals"}


def build_relationship_intelligence(
    *,
    client: Client,
    user,
    company,
    membership,
) -> dict[str, Any]:
    now = timezone.now()
    deals_qs = visible_deals(user, company, membership).filter(client=client)
    deals = list(deals_qs.select_related("stage", "assigned_to"))
    activities_qs = visible_activities_base(user, company, membership).filter(
        client=client
    )
    tasks_qs = (
        visible_tasks_queryset(user, company, membership)
        .filter(client=client, is_completed=False)
        .select_related("assigned_to", "deal")
    )
    open_tasks = list(tasks_qs)
    product_links = list(
        client.product_links.select_related("product").all()
    )

    last_activity = activities_qs.aggregate(m=Max("created_at"))["m"]
    last_conversation = client.last_conversation_at
    last_touch = _latest_timestamp(last_activity, last_conversation)
    days_idle = _days_since(last_touch)

    won = [d for d in deals if closed_stage_kind(d.stage) == "won"]
    active = [d for d in deals if is_operational_deal(d)]
    overdue_tasks = [t for t in open_tasks if _is_past_due(t.due_date, now=now)]

    status = client.relationship_status or Client.RelationshipStatus.ACTIVE

    # --- Health (priority order) ---
    health = HEALTH_HEALTHY
    health_reason = "Recent relationship activity looks on track."

    if overdue_tasks or status in (
        Client.RelationshipStatus.AT_RISK,
        Client.RelationshipStatus.LOST_MOMENTUM,
    ):
        health = HEALTH_ATTENTION
        health_reason = "Follow-ups or relationship state need a deliberate check-in."
    elif client.follow_up_on and client.follow_up_on <= now.date():
        health = HEALTH_ATTENTION
        health_reason = "A planned follow-up date has arrived."
    elif status == Client.RelationshipStatus.DORMANT or (
        days_idle is not None and days_idle > 90 and len(won) > 0
    ):
        health = HEALTH_REENGAGE
        health_reason = "Relationship has gone quiet — good moment to re-open the conversation."
    elif days_idle is not None and days_idle > 45:
        health = HEALTH_COOLING
        health_reason = "Activity has slowed — relationship may be cooling."
    elif any(
        link.relationship == ClientProductLink.Relationship.STOPPED
        for link in product_links
    ):
        health = HEALTH_COOLING
        health_reason = "Product buying pattern shows items they stopped ordering."

    signals = _build_signals(
        client=client,
        status=status,
        days_idle=days_idle,
        overdue_tasks=overdue_tasks,
        open_tasks=open_tasks,
        active_deals=active,
        won_deals=won,
        product_links=product_links,
        last_touch=last_touch,
    )

    product_behavior = _product_behavior(product_links, won)
    buying_patterns = _buying_patterns(won, active, last_touch)
    team = _team_visibility(client, deals, open_tasks)

    return {
        "relationship_status": status,
        "relationship_health": health,
        "relationship_health_label": HEALTH_LABELS[health],
        "health_reason": health_reason,
        "days_since_last_touch": days_idle,
        "signals": signals,
        "product_behavior": product_behavior,
        "buying_patterns": buying_patterns,
        "team": team,
    }


def _build_signals(
    *,
    client: Client,
    status: str,
    days_idle: int | None,
    overdue_tasks: list,
    open_tasks: list,
    active_deals: list,
    won_deals: list,
    product_links: list,
    last_touch,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    now = timezone.now()

    def add(code: str, severity: str, title: str, detail: str):
        out.append(
            {
                "code": code,
                "severity": severity,
                "title": title,
                "detail": detail,
            }
        )

    if status == Client.RelationshipStatus.VIP and days_idle is not None and days_idle > 30:
        add(
            "vip_inactive",
            "attention",
            "VIP client inactive",
            f"No touch in {days_idle} days — prioritize a personal check-in.",
        )

    if overdue_tasks:
        add(
            "tasks_overdue",
            "attention",
            "Unresolved tasks",
            f"{len(overdue_tasks)} overdue follow-up{'s' if len(overdue_tasks) != 1 else ''} on this client.",
        )

    if client.follow_up_on and client.follow_up_on <= now.date():
        add(
            "follow_up_due",
            "attention",
            "Follow-up scheduled",
            "Relationship memory has a follow-up date due now.",
        )

    if days_idle is not None and days_idle >= 45:
        add(
            "no_recent_interaction",
            "info",
            "No recent interaction",
            f"Last touch was {days_idle} days ago.",
        )

    if status == Client.RelationshipStatus.LOST_MOMENTUM:
        add(
            "momentum_lost",
            "attention",
            "Momentum lost",
            "Marked as lost momentum — confirm next step or re-qualify.",
        )

    if status == Client.RelationshipStatus.HIGH_POTENTIAL and not active_deals:
        add(
            "high_potential_idle",
            "info",
            "High potential — no open deals",
            "Strong potential flagged; no active deal on the board yet.",
        )

    stopped = [
        link for link in product_links
        if link.relationship == ClientProductLink.Relationship.STOPPED
    ]
    if stopped:
        names = ", ".join(link.product.name for link in stopped[:2])
        add(
            "stopped_buying",
            "info",
            "Stopped buying",
            f"Stopped ordering: {names}{'…' if len(stopped) > 2 else ''}.",
        )

    frequent = [
        link for link in product_links
        if link.relationship
        in (
            ClientProductLink.Relationship.FREQUENT,
            ClientProductLink.Relationship.HIGH_VALUE,
        )
    ]
    if frequent and won_deals:
        last_won = _latest_timestamp(
            *(d.closed_at or d.created_at for d in won_deals if d.closed_at or d.created_at)
        )
        if last_won and (now - last_won).days > 60:
            add(
                "reorder_window",
                "info",
                "Reorder may be due",
                "Frequent buyer — last win was over 60 days ago.",
            )

    stale_negotiation = [
        d
        for d in active_deals
        if d.stage
        and "negotiat" in (d.stage.name or "").lower()
        and days_idle is not None
        and days_idle > 14
    ]
    if stale_negotiation:
        add(
            "stalled_negotiation",
            "attention",
            "Stalled negotiation",
            f"{len(stale_negotiation)} deal(s) in negotiation without recent activity.",
        )

    if len(won_deals) >= 2 and status == Client.RelationshipStatus.GROWING:
        add(
            "repeat_pattern",
            "positive",
            "Repeat buying pattern",
            f"{len(won_deals)} won deals — relationship is growing.",
        )

    if not out and days_idle is not None and days_idle <= 14:
        add(
            "relationship_healthy",
            "positive",
            "Relationship active",
            "Recent interactions and deal activity look healthy.",
        )

    severity_order = {"attention": 0, "info": 1, "positive": 2}
    out.sort(key=lambda s: severity_order.get(s["severity"], 9))
    return out[:8]


def _product_behavior(links: list, won_deals: list) -> dict[str, Any]:
    if not links:
        return {
            "primary_pattern": "No product context yet",
            "highlights": [],
            "link_count": 0,
        }
    by_rel: dict[str, list[str]] = {}
    for link in links:
        rel = link.relationship
        by_rel.setdefault(rel, []).append(link.product.name)

    dominant = max(by_rel.keys(), key=lambda k: len(by_rel[k]))
    pattern = PRODUCT_RELATIONSHIP_LABELS.get(dominant, dominant.replace("_", " ").title())

    highlights = []
    for rel, names in by_rel.items():
        label = PRODUCT_RELATIONSHIP_LABELS.get(rel, rel)
        highlights.append(f"{label}: {', '.join(names[:3])}")

    return {
        "primary_pattern": pattern,
        "highlights": highlights[:5],
        "link_count": len(links),
        "has_won_deals": len(won_deals) > 0,
    }


def _buying_patterns(won: list, active: list, last_touch) -> dict[str, Any]:
    revenue = sum(float(d.amount or 0) for d in won)
    return {
        "won_deals": len(won),
        "active_deals": len(active),
        "lifetime_revenue": round(revenue, 2),
        "last_activity_at": last_touch.isoformat() if last_touch else None,
        "repeat_buyer": len(won) >= 2,
    }


def _team_visibility(client: Client, deals: list, open_tasks: list) -> dict[str, Any]:
    owner = _infer_relationship_owner(client, deals)
    task_owners = sorted(
        {
            t.assigned_to.email
            for t in open_tasks
            if t.assigned_to and t.assigned_to.email
        }
    )
    deal_owners = sorted(
        {
            d.assigned_to.email
            for d in deals
            if d.assigned_to and d.assigned_to.email
        }
    )
    return {
        "relationship_owner": owner,
        "open_task_assignees": task_owners[:5],
        "deal_assignees": deal_owners[:5],
    }


def build_relationship_workspace(
    *,
    user,
    company,
    membership,
    limit: int = 24,
) -> dict[str, Any]:
    """Company-wide calm signals for future command center."""
    clients = list(Client.objects.filter(company=company).order_by("name"))
    all_signals: list[dict[str, Any]] = []
    health_counts = {
        HEALTH_HEALTHY: 0,
        HEALTH_COOLING: 0,
        HEALTH_ATTENTION: 0,
        HEALTH_REENGAGE: 0,
    }
    status_counts: dict[str, int] = {}

    for client in clients:
        intel = build_relationship_intelligence(
            client=client,
            user=user,
            company=company,
            membership=membership,
        )
        health_counts[intel["relationship_health"]] = (
            health_counts.get(intel["relationship_health"], 0) + 1
        )
        st = intel["relationship_status"]
        status_counts[st] = status_counts.get(st, 0) + 1
        for sig in intel["signals"]:
            if sig["severity"] != "positive":
                all_signals.append(
                    {
                        **sig,
                        "client_id": client.id,
                        "client_name": client.name,
                    }
                )

    severity_order = {"attention": 0, "info": 1}
    all_signals.sort(key=lambda s: severity_order.get(s["severity"], 9))
    return {
        "health_summary": health_counts,
        "status_summary": status_counts,
        "signals": all_signals[:limit],
        "client_count": len(clients),
    }


def relationship_health_for_analytics(
    *,
    last_activity_at,
    relationship_status: str,
    has_overdue_task: bool = False,
) -> str:
    """Map to legacy analytics keys: healthy | attention | dormant."""
    if has_overdue_task or relationship_status in (
        Client.RelationshipStatus.AT_RISK,
        Client.RelationshipStatus.LOST_MOMENTUM,
    ):
        return "attention"
    if not last_activity_at:
        return "dormant"
    days = _days_since(last_activity_at)
    if days is None:
        return "unknown"
    if days <= 30:
        return "healthy"
    if days <= 90:
        return "attention"
    return "dormant"
