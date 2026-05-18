"""
Client relationship workspace — operational snapshot + metrics (not analytics wall).
"""

from __future__ import annotations

from typing import Any

from django.db.models import Avg

from activities.models import Activity
from activities.task_query import visible_tasks_queryset
from clients.models import Client, ClientContact, ClientProductLink
from deals.models import Deal
from deals.operational import closed_stage_kind, is_operational_deal
from deals.visibility import get_operational_visible_deals, get_visible_deals


class ClientProfileBuilder:
    def __init__(self, *, client: Client, user, company, membership):
        self.client = client
        self.user = user
        self.company = company
        self.membership = membership

    def build(self) -> dict[str, Any]:
        deals_qs = get_visible_deals(self.user, self.company, self.membership).filter(
            client=self.client
        )
        operational_qs = get_operational_visible_deals(
            self.user, self.company, self.membership
        ).filter(client=self.client)

        deals = list(deals_qs.select_related("stage"))
        active_deals = [
            d
            for d in deals
            if is_operational_deal(d)
        ]

        tasks_qs = (
            visible_tasks_queryset(self.user, self.company, self.membership)
            .filter(client=self.client)
            .operational()
            .filter(is_completed=False)
            .select_related("deal", "assigned_to")
            .order_by("due_date", "id")[:8]
        )

        last_activity = (
            Activity.objects.filter(client=self.client)
            .order_by("-created_at")
            .values_list("created_at", flat=True)
            .first()
        )

        won = [d for d in deals if closed_stage_kind(d.stage) == "won"]
        revenue = sum(float(d.amount or 0) for d in won)
        avg_size = (
            deals_qs.filter(stage__name__iexact="won").aggregate(a=Avg("amount"))["a"]
            or 0
        )

        contacts = list(self.client.contacts.all())
        primary = next((c for c in contacts if c.is_primary), None)
        product_links = list(
            self.client.product_links.select_related("product").all()
        )

        return {
            "client": self._client_payload(),
            "business_context": self._business_context_payload(),
            "contacts": [self._contact_payload(c) for c in contacts],
            "products": [self._product_link_payload(link) for link in product_links],
            "has_primary_contact": primary is not None,
            "primary_contact": self._contact_payload(primary) if primary else None,
            "relationship_memory": self._memory_payload(),
            "metrics": {
                "customer_since": deals_qs.order_by("created_at")
                .values_list("created_at", flat=True)
                .first(),
                "total_revenue": float(revenue),
                "won_deals": len(won),
                "active_deals": len(active_deals),
                "total_deals": deals_qs.count(),
                "last_activity_at": last_activity,
                "average_deal_size": float(avg_size or 0),
            },
            "operational": {
                "active_deals": [self._deal_brief(d) for d in active_deals[:6]],
                "open_tasks": [self._task_brief(t) for t in tasks_qs],
            },
        }

    def _client_payload(self) -> dict[str, Any]:
        c = self.client
        return {
            "id": c.id,
            "name": c.name,
            "client_type": c.client_type,
            "relationship_status": c.relationship_status,
            "email": c.email,
            "phone": c.phone,
            "industry": c.industry,
            "market_sector": c.market_sector,
            "description": c.description,
            "products_services": c.products_services,
            "internal_context": c.internal_context,
            "website": c.website,
            "company_size": c.company_size,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        }

    def _business_context_payload(self) -> dict[str, Any]:
        c = self.client
        return {
            "industry": c.industry,
            "market_sector": c.market_sector,
            "description": c.description,
            "products_services": c.products_services,
            "internal_context": c.internal_context,
            "website": c.website,
            "company_size": c.company_size,
        }

    def _product_link_payload(self, link: ClientProductLink) -> dict[str, Any]:
        p = link.product
        return {
            "id": link.id,
            "relationship": link.relationship,
            "note": link.note,
            "product": {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "default_price": (
                    str(p.default_price) if p.default_price is not None else None
                ),
                "sku": p.sku,
            },
        }

    def _memory_payload(self) -> dict[str, Any]:
        c = self.client
        return {
            "last_conversation_topic": c.last_conversation_topic,
            "last_conversation_mood": c.last_conversation_mood,
            "last_conversation_outcome": c.last_conversation_outcome,
            "next_step": c.next_step,
            "last_conversation_at": c.last_conversation_at,
        }

    def _contact_payload(self, contact: ClientContact | None) -> dict[str, Any] | None:
        if contact is None:
            return None
        return {
            "id": contact.id,
            "full_name": contact.full_name,
            "role_title": contact.role_title,
            "email": contact.email,
            "phone": contact.phone,
            "preferred_contact_method": contact.preferred_contact_method,
            "notes": contact.notes,
            "is_primary": contact.is_primary,
        }

    def _deal_brief(self, deal: Deal) -> dict[str, Any]:
        return {
            "id": deal.id,
            "title": deal.title,
            "amount": str(deal.amount),
            "stage_name": deal.stage.name if deal.stage else "",
            "created_at": deal.created_at,
        }

    def _task_brief(self, task: Activity) -> dict[str, Any]:
        return {
            "id": task.id,
            "content": task.content,
            "due_date": task.due_date,
            "priority": task.priority,
            "deal_id": task.deal_id,
            "deal_title": task.deal.title if task.deal else None,
            "assigned_to_email": (
                task.assigned_to.email if task.assigned_to else None
            ),
        }
