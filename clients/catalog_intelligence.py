"""
Product catalog intelligence — relationship context, not ERP analytics.
"""

from __future__ import annotations

from typing import Any

from clients.models import Product
from deals.models import Deal
from deals.operational import closed_stage_kind
from deals.visibility import get_visible_deals


class ProductProfileBuilder:
    def __init__(self, *, product: Product, user, company, membership):
        self.product = product
        self.user = user
        self.company = company
        self.membership = membership

    def build(self) -> dict[str, Any]:
        links = list(
            self.product.client_links.select_related("client").order_by(
                "relationship", "client__name"
            )
        )
        deals_qs = (
            get_visible_deals(self.user, self.company, self.membership)
            .filter(line_items__product=self.product)
            .distinct()
            .select_related("client", "stage")
            .order_by("-created_at")
        )
        recent_deals = list(deals_qs[:8])
        won = [d for d in recent_deals if closed_stage_kind(d.stage) == "won"]
        revenue = sum(float(d.amount or 0) for d in won)

        by_relationship: dict[str, list[dict]] = {}
        for link in links:
            bucket = by_relationship.setdefault(link.relationship, [])
            bucket.append(
                {
                    "client_id": link.client_id,
                    "client_name": link.client.name,
                    "note": link.note,
                    "link_id": link.id,
                }
            )

        return {
            "product": self._product_payload(),
            "stats": {
                "linked_clients": len(links),
                "deals_with_product": deals_qs.count(),
                "recent_won_revenue": float(revenue),
            },
            "clients_by_relationship": by_relationship,
            "recent_deals": [self._deal_brief(d) for d in recent_deals],
        }

    def _product_payload(self) -> dict[str, Any]:
        p = self.product
        return {
            "id": p.id,
            "name": p.name,
            "product_type": p.product_type,
            "category": p.category,
            "default_price": str(p.default_price) if p.default_price is not None else None,
            "description": p.description,
            "sku": p.sku,
            "tags": p.tags if isinstance(p.tags, list) else [],
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }

    def _deal_brief(self, deal: Deal) -> dict[str, Any]:
        return {
            "id": deal.id,
            "title": deal.title,
            "amount": str(deal.amount),
            "client_id": deal.client_id,
            "client_name": deal.client.name if deal.client else "",
            "stage_name": deal.stage.name if deal.stage else "",
            "created_at": deal.created_at,
            "is_won": closed_stage_kind(deal.stage) == "won",
        }
