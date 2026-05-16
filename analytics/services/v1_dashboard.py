"""
FREE-tier analytics v1 — single overview payload.

PRO / ENTERPRISE extension points (not implemented):
- `tier` query param + feature flags for forecasting, SLA, AI summaries
- Replace `won_this_month` heuristic with `closed_won_at` when migrated
- Replace revenue trend bucketing with immutable revenue events / snapshots
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import (
    BigIntegerField,
    BooleanField,
    Case,
    Count,
    DateTimeField,
    Exists,
    F,
    OuterRef,
    Q,
    Subquery,
    Sum,
    Value,
    When,
)
from django.db.models.functions import TruncMonth, TruncWeek
from django.utils import timezone

from activities.models import Activity
from deals.models import PipelineStage

from .scoping import visible_deals, visible_activities_base

User = get_user_model()

STALE_HOURS = 48
NEW_DEAL_GRACE_HOURS = 24
WON_STAGE_Q = Q(stage__name__iexact="won")

# Scalar subquery avoids MAX() on joined activities + GROUP BY member_uid (SQLite:
# "misuse of aggregate function MAX()"; PostgreSQL can also reject nested aggregates).
_LAST_ACTIVITY_TS = (
    Activity.objects.filter(deal_id=OuterRef("pk"))
    .order_by("-created_at")
    .values("created_at")[:1]
)


def _money(x: Decimal | None) -> str:
    if x is None:
        return "0.00"
    return str(Decimal(x).quantize(Decimal("0.01")))


def _pct(n: float) -> float:
    return round(n, 2)


def _feed_kind(row: Activity) -> str:
    if row.auto_type == "deal_won":
        return "deal_won"
    if row.auto_type == "stage_move":
        return "deal_moved"
    if row.type == Activity.Type.NOTE and row.auto_type not in ("deal_won", "stage_move"):
        return "note_added"
    if row.type == Activity.Type.TASK and row.is_completed:
        return "task_completed"
    if row.type == Activity.Type.TASK:
        return "task_open"
    return "activity_logged"


def build_analytics_v1_free(
    *,
    user,
    company,
    membership,
    granularity: str = "week",
) -> dict[str, Any]:
    """
    Aggregated dashboard for visible deals + activities.
    """
    now = timezone.now()
    grace_start = now - timedelta(hours=NEW_DEAL_GRACE_HOURS)
    stale_start = now - timedelta(hours=STALE_HOURS)

    overdue_sq = Activity.objects.filter(
        deal_id=OuterRef("pk"),
        type=Activity.Type.TASK,
        is_completed=False,
        due_date__isnull=False,
        due_date__lt=now,
    )

    base = (
        visible_deals(user, company, membership)
        .select_related("stage")
        .annotate(
            last_activity=Subquery(
                _LAST_ACTIVITY_TS,
                output_field=DateTimeField(null=True),
            )
        )
        .annotate(overdue=Exists(overdue_sq))
        .annotate(
            is_stale=Case(
                When(created_at__gte=grace_start, then=Value(False)),
                When(
                    Q(last_activity__isnull=True) & Q(created_at__lt=grace_start),
                    then=Value(True),
                ),
                When(last_activity__lt=stale_start, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        .annotate(
            is_at_risk=Case(
                When(is_stale=True, then=Value(False)),
                When(overdue=True, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
    )

    operational = base.operational()
    total = base.count()
    won_qs = base.filter(WON_STAGE_Q)
    won_count = won_qs.count()
    active_qs = operational
    active_count = active_qs.count()
    pipeline_value = (
        active_qs.aggregate(s=Sum("amount", default=Decimal("0")))["s"] or Decimal("0")
    )

    stale_count = operational.filter(is_stale=True).count()
    at_risk_count = operational.filter(is_at_risk=True).count()
    healthy_count = operational.filter(is_stale=False, is_at_risk=False).count()

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    won_this_month = base.filter(WON_STAGE_Q, created_at__gte=month_start).count()
    won_this_month_revenue = (
        base.filter(WON_STAGE_Q, created_at__gte=month_start).aggregate(
            s=Sum("amount", default=Decimal("0"))
        )["s"]
        or Decimal("0")
    )

    total_amount = base.aggregate(s=Sum("amount", default=Decimal("0")))["s"] or Decimal("0")
    avg_deal_size = (total_amount / total) if total else Decimal("0")

    conversion_rate = (won_count / total * 100.0) if total else 0.0

    stages = list(
        PipelineStage.objects.filter(company=company).order_by("order", "id").values(
            "id", "name", "order"
        )
    )
    stage_ids = [s["id"] for s in stages]
    counts_by_stage: dict[int, int] = {sid: 0 for sid in stage_ids}
    if stage_ids:
        tallies = (
            base.filter(stage_id__in=stage_ids)
            .values("stage_id")
            .annotate(c=Count("id"))
        )
        for row in tallies:
            sid = row["stage_id"]
            if sid in counts_by_stage:
                counts_by_stage[sid] = row["c"]

    funnel: list[dict[str, Any]] = []
    prev_count: int | None = None
    for st in stages:
        sid = st["id"]
        c = counts_by_stage.get(sid, 0)
        drop_pct: float | None = None
        if prev_count is not None and prev_count > 0:
            drop_pct = _pct((prev_count - c) / prev_count * 100.0)
        funnel.append(
            {
                "stage_id": sid,
                "name": st["name"],
                "order": st["order"],
                "deal_count": c,
                "dropoff_from_previous_pct": drop_pct,
            }
        )
        prev_count = c

    trunc_kind = TruncMonth if granularity == "month" else TruncWeek
    trend_start = now - timedelta(days=180 if granularity == "month" else 84)
    trend_rows = (
        base.filter(WON_STAGE_Q, created_at__gte=trend_start)
        .annotate(bucket=trunc_kind("created_at"))
        .values("bucket")
        .annotate(revenue=Sum("amount", default=Decimal("0")))
        .order_by("bucket")
    )
    revenue_trend = [
        {
            "period_start": row["bucket"].isoformat() if row["bucket"] else None,
            "revenue": _money(row["revenue"]),
        }
        for row in trend_rows
        if row["bucket"] is not None
    ]

    member_uid_expr = Case(
        When(assigned_to_id__isnull=False, then=F("assigned_to_id")),
        default=F("created_by_id"),
        output_field=BigIntegerField(null=True),
    )

    team_rows = (
        base.annotate(member_uid=member_uid_expr)
        .exclude(member_uid__isnull=True)
        .values("member_uid")
        .annotate(
            deals_won=Count("id", filter=WON_STAGE_Q),
            deals_active=Count("id", filter=~WON_STAGE_Q & Q(stage__isnull=False)),
            revenue_won=Sum("amount", filter=WON_STAGE_Q, default=Decimal("0")),
            stale_deals=Count("id", filter=Q(is_stale=True)),
        )
        .order_by("-revenue_won", "member_uid")
    )

    uids = [r["member_uid"] for r in team_rows]
    users_by_id = {u.id: u for u in User.objects.filter(id__in=uids)} if uids else {}

    team_performance = []
    for r in team_rows:
        uid = r["member_uid"]
        u = users_by_id.get(uid)
        team_performance.append(
            {
                "user_id": uid,
                "email": getattr(u, "email", None) or str(uid),
                "deals_won": r["deals_won"],
                "deals_active": r["deals_active"],
                "revenue_won": _money(r["revenue_won"]),
                "stale_deals": r["stale_deals"],
            }
        )

    feed_qs = visible_activities_base(user, company, membership)[:30]
    recent_activity = []
    for act in feed_qs:
        deal_title = None
        if act.deal_id:
            deal_title = act.deal.title if act.deal else None
        recent_activity.append(
            {
                "id": act.id,
                "kind": _feed_kind(act),
                "type": act.type,
                "auto_type": act.auto_type or None,
                "content": (act.content or "")[:500],
                "deal_id": act.deal_id,
                "deal_title": deal_title,
                "author_id": act.author_id,
                "author_email": getattr(act.author, "email", None),
                "is_completed": act.is_completed,
                "created_at": act.created_at.isoformat(),
            }
        )

    return {
        "tier": "free",
        "granularity": granularity if granularity in ("week", "month") else "week",
        "meta": {
            "won_this_month_basis": "deal_created_in_month_and_currently_won",
            "revenue_trend_basis": "won_deals_bucketed_by_deal_created_at",
        },
        "kpis": {
            "pipeline_value": _money(pipeline_value),
            "active_deals": active_count,
            "conversion_rate_pct": _pct(conversion_rate),
            "stale_health": {
                "healthy": healthy_count,
                "at_risk": at_risk_count,
                "stale": stale_count,
            },
            "won_this_month": won_this_month,
            "won_this_month_revenue": _money(won_this_month_revenue),
            "average_deal_size": _money(avg_deal_size),
            "visible_deals_total": total,
            "won_deals_total": won_count,
        },
        "funnel": funnel,
        "revenue_trend": revenue_trend,
        "team_performance": team_performance,
        "recent_activity": recent_activity,
    }
