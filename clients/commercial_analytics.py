"""
Commercial client intelligence — CRM analytics layer (not BI / ERP).

Aggregates deals, activities, and catalog links into readable commercial insights.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from activities.models import Activity
from analytics.services.scoping import visible_activities_base, visible_deals
from clients.models import Client, ClientProductLink, Product
from clients.relationship_intelligence import relationship_health_for_analytics
from deals.models import Deal, DealLineItem
from deals.operational import closed_stage_kind

WON_Q = Q(stage__name__iexact="won")


def _money(x: float | Decimal | None) -> str:
    if x is None:
        return "0.00"
    return str(Decimal(x).quantize(Decimal("0.01")))


def _pct(won: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(100.0 * won / total, 1)


def build_client_commercial_analytics(
    *,
    user,
    company,
    membership,
    product_id: int | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    now = timezone.now()
    deals_qs = visible_deals(user, company, membership).filter(
        company=company
    ).select_related("client", "stage")
    activities_qs = visible_activities_base(user, company, membership)

    clients = list(
        Client.objects.filter(company=company).order_by("name")
    )
    client_by_id = {c.id: c for c in clients}

    deals = list(deals_qs)
    won_deals = [d for d in deals if closed_stage_kind(d.stage) == "won"]
    lost_deals = [d for d in deals if closed_stage_kind(d.stage) == "lost"]

    product_filter_ids: set[int] | None = None
    if product_id:
        product_filter_ids = {product_id}
    elif category:
        product_filter_ids = set(
            Product.objects.filter(company=company, category__iexact=category).values_list(
                "id", flat=True
            )
        )

    def client_matches_product_filter(client_id: int) -> bool:
        if not product_filter_ids:
            return True
        if DealLineItem.objects.filter(
            deal__client_id=client_id,
            deal__in=deals_qs,
            product_id__in=product_filter_ids,
        ).exists():
            return True
        return ClientProductLink.objects.filter(
            client_id=client_id,
            product_id__in=product_filter_ids,
        ).exists()

    # Per-client rollups
    per_client: dict[int, dict[str, Any]] = {}
    for c in clients:
        per_client[c.id] = {
            "client_id": c.id,
            "client_name": c.name,
            "relationship_status": c.relationship_status,
            "total_revenue": 0.0,
            "won_deals": 0,
            "lost_deals": 0,
            "total_deals": 0,
            "active_deals": 0,
            "last_activity_at": None,
            "product_links": 0,
            "categories": set(),
        }

    for d in deals:
        if d.client_id is None or d.client_id not in per_client:
            continue
        row = per_client[d.client_id]
        row["total_deals"] += 1
        kind = closed_stage_kind(d.stage)
        if kind == "won":
            row["won_deals"] += 1
            row["total_revenue"] += float(d.amount or 0)
        elif kind == "lost":
            row["lost_deals"] += 1
        else:
            row["active_deals"] += 1

    activity_agg = (
        activities_qs.filter(client_id__isnull=False)
        .values("client_id")
        .annotate(
            last_at=Max("created_at"),
            touch_count=Count("id"),
        )
    )
    for row in activity_agg:
        cid = row["client_id"]
        if cid in per_client:
            per_client[cid]["last_activity_at"] = row["last_at"]
            per_client[cid]["activity_count"] = row["touch_count"]

    link_rows = (
        ClientProductLink.objects.filter(client__company=company)
        .select_related("product")
        .values("client_id", "product__category")
    )
    for row in link_rows:
        cid = row["client_id"]
        if cid in per_client:
            per_client[cid]["product_links"] += 1
            cat = (row.get("product__category") or "").strip()
            if cat:
                per_client[cid]["categories"].add(cat)

    # Growth: won revenue last 90d vs prior 90d
    d90 = now - timedelta(days=90)
    d180 = now - timedelta(days=180)

    def won_revenue_in_window(client_id: int, start, end) -> float:
        total = 0.0
        for d in won_deals:
            if d.client_id != client_id:
                continue
            ts = d.closed_at or d.created_at
            if ts and start <= ts < end:
                total += float(d.amount or 0)
        return total

    comparison: list[dict[str, Any]] = []
    for cid, row in per_client.items():
        if product_filter_ids and not client_matches_product_filter(cid):
            continue
        won = row["won_deals"]
        total = row["total_deals"]
        rev = row["total_revenue"]
        avg = rev / won if won > 0 else 0.0
        recent_rev = won_revenue_in_window(cid, d90, now)
        prior_rev = won_revenue_in_window(cid, d180, d90)
        growth_pct = (
            round(100.0 * (recent_rev - prior_rev) / prior_rev, 1)
            if prior_rev > 0
            else (100.0 if recent_rev > 0 else 0.0)
        )
        last_at = row.get("last_activity_at")
        health = relationship_health_for_analytics(
            last_activity_at=last_at,
            relationship_status=row.get("relationship_status") or "",
        )

        comparison.append(
            {
                "client_id": cid,
                "client_name": row["client_name"],
                "relationship_status": row["relationship_status"],
                "total_revenue": _money(rev),
                "average_deal_size": _money(avg),
                "won_deals": won,
                "lost_deals": row["lost_deals"],
                "active_deals": row["active_deals"],
                "total_deals": total,
                "win_rate_pct": _pct(won, won + row["lost_deals"]),
                "product_links": row["product_links"],
                "categories": sorted(row["categories"]),
                "last_activity_at": last_at,
                "relationship_health": health,
                "revenue_growth_pct": growth_pct,
                "activity_count": row.get("activity_count", 0),
            }
        )

    comparison.sort(
        key=lambda x: float(x["total_revenue"]),
        reverse=True,
    )

    total_revenue = sum(float(x["total_revenue"]) for x in comparison)
    clients_with_revenue = sum(1 for x in comparison if float(x["total_revenue"]) > 0)

    # Revenue trend (6 months, won deals)
    trend_qs = (
        deals_qs.filter(WON_Q)
        .annotate(month=TruncMonth("closed_at"))
        .values("month")
        .annotate(revenue=Sum("amount"))
        .order_by("month")
    )
    revenue_trend = [
        {
            "period_start": (row["month"].isoformat() if row["month"] else ""),
            "revenue": _money(row["revenue"]),
        }
        for row in trend_qs
        if row["month"]
    ][-6:]

    # Top products (line items on visible deals)
    product_stats: dict[int, dict[str, Any]] = defaultdict(
        lambda: {
            "deal_count": 0,
            "line_revenue": 0.0,
            "client_ids": set(),
        }
    )
    line_qs = DealLineItem.objects.filter(deal__in=deals_qs).select_related(
        "product", "deal"
    )
    for line in line_qs:
        if line.product_id is None:
            continue
        if product_filter_ids and line.product_id not in product_filter_ids:
            continue
        st = product_stats[line.product_id]
        st["deal_count"] += 1
        if line.unit_price is not None:
            st["line_revenue"] += float(line.unit_price) * int(line.quantity or 1)
        if line.deal.client_id:
            st["client_ids"].add(line.deal.client_id)

    product_ids = list(product_stats.keys())
    products_by_id = {
        p.id: p
        for p in Product.objects.filter(pk__in=product_ids, company=company)
    }
    top_products = []
    for pid, st in product_stats.items():
        p = products_by_id.get(pid)
        if not p:
            continue
        top_products.append(
            {
                "product_id": pid,
                "product_name": p.name,
                "category": p.category,
                "deal_count": st["deal_count"],
                "revenue": _money(st["line_revenue"]),
                "unique_clients": len(st["client_ids"]),
            }
        )
    top_products.sort(key=lambda x: float(x["revenue"]), reverse=True)

    # Top categories
    cat_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"revenue": 0.0, "clients": set(), "deals": 0}
    )
    for item in top_products:
        cat = (item["category"] or "Uncategorized").strip() or "Uncategorized"
        cat_stats[cat]["revenue"] += float(item["revenue"])
        cat_stats[cat]["deals"] += item["deal_count"]

    for row in link_rows:
        cat = (row.get("product__category") or "Uncategorized").strip() or "Uncategorized"
        if product_filter_ids:
            continue
        cat_stats[cat]["clients"].add(row["client_id"])

    top_categories = [
        {
            "category": cat,
            "revenue": _money(st["revenue"]),
            "unique_clients": len(st["clients"]),
            "deal_lines": st["deals"],
        }
        for cat, st in cat_stats.items()
    ]
    top_categories.sort(key=lambda x: float(x["revenue"]), reverse=True)

    def leaderboard_rows(
        sort_key,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        rows = sorted(comparison, key=sort_key, reverse=True)[:limit]
        return [
            {
                "client_id": r["client_id"],
                "client_name": r["client_name"],
                "total_revenue": r["total_revenue"],
                "won_deals": r["won_deals"],
                "win_rate_pct": r["win_rate_pct"],
                "activity_count": r.get("activity_count", 0),
                "revenue_growth_pct": r["revenue_growth_pct"],
                "relationship_health": r["relationship_health"],
            }
            for r in rows
        ]

    leaderboards = {
        "most_profitable": leaderboard_rows(
            lambda r: float(r["total_revenue"])
        ),
        "most_active": leaderboard_rows(
            lambda r: r.get("activity_count", 0)
        ),
        "fastest_growing": leaderboard_rows(
            lambda r: r["revenue_growth_pct"]
        ),
    }

    # Product-focused buyers (when filter active)
    product_buyers: list[dict[str, Any]] = []
    at_risk_buyers: list[dict[str, Any]] = []
    if product_filter_ids:
        for row in comparison:
            cid = row["client_id"]
            if not client_matches_product_filter(cid):
                continue
            product_buyers.append(
                {
                    "client_id": cid,
                    "client_name": row["client_name"],
                    "total_revenue": row["total_revenue"],
                    "won_deals": row["won_deals"],
                    "last_activity_at": row["last_activity_at"],
                    "relationship_health": row["relationship_health"],
                }
            )
        product_buyers.sort(
            key=lambda x: float(x["total_revenue"]),
            reverse=True,
        )
        for row in product_buyers:
            if row["relationship_health"] in ("attention", "dormant"):
                at_risk_buyers.append(row)

    catalog_products = list(
        Product.objects.filter(company=company, is_active=True).order_by("name")[
            :200
        ]
    )

    return {
        "generated_at": now.isoformat(),
        "filters": {
            "product_id": product_id,
            "category": category or "",
        },
        "summary": {
            "total_clients": len(clients),
            "clients_with_revenue": clients_with_revenue,
            "total_revenue": _money(total_revenue),
            "avg_revenue_per_client": _money(
                total_revenue / clients_with_revenue
                if clients_with_revenue
                else 0
            ),
            "total_won_deals": len(won_deals),
            "total_lost_deals": len(lost_deals),
            "active_product_links": ClientProductLink.objects.filter(
                client__company=company
            ).count(),
        },
        "revenue_trend": revenue_trend,
        "leaderboards": leaderboards,
        "top_products": top_products[:12],
        "top_categories": top_categories[:10],
        "client_comparison": comparison[:50],
        "product_buyers": product_buyers[:20],
        "at_risk_buyers": at_risk_buyers[:12],
        "catalog_filter_options": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
            }
            for p in catalog_products
        ],
    }
