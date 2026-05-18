"""
Customer relationship timeline — historical memory layer (not operational workspace).

Aggregates deals, meaningful activities, and task lifecycle into a single sorted feed.
Filters automation/system noise while preserving relationship milestones.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Literal

from django.conf import settings
from django.db.models import Q

from activities.automation_intents import HEURISTIC_AUTO_TYPES
from activities.models import Activity
from clients.models import Client
from deals.models import Deal
from deals.operational import closed_stage_kind, is_closed_stage
from deals.visibility import get_visible_deals

TimelineKind = Literal["deal", "activity", "task"]
TimelineImportance = Literal["normal", "highlight", "milestone"]
TimelineFilter = Literal["all", "deals", "activities", "tasks", "calls", "notes"]

MILESTONE_AUTO_TYPES = frozenset({"deal_won", "deal_closed", "stage_move"})
NOISE_TASK_CATEGORIES = frozenset({"cancelled", "archived_stale", "system"})


@dataclass(frozen=True)
class TimelineEvent:
    id: str
    kind: TimelineKind
    event_type: str
    title: str
    subtitle: str
    body: str
    occurred_at: Any
    importance: TimelineImportance
    filter_group: Literal["deals", "activities", "tasks"]
    deal_id: int | None
    deal_title: str | None
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "event_type": self.event_type,
            "title": self.title,
            "subtitle": self.subtitle,
            "body": self.body,
            "occurred_at": self.occurred_at,
            "importance": self.importance,
            "filter_group": self.filter_group,
            "deal_id": self.deal_id,
            "deal_title": self.deal_title,
            "metadata": self.metadata,
        }


def _high_value_threshold() -> float:
    return float(getattr(settings, "TIMELINE_HIGH_VALUE_THRESHOLD", 50_000))


def _format_amount(amount) -> str:
    try:
        return f"${float(amount):,.0f}"
    except (TypeError, ValueError):
        return ""


def _deal_duration_days(deal: Deal) -> int | None:
    end = deal.closed_at or None
    if not end or not deal.created_at:
        return None
    return max(0, (end - deal.created_at).days)


def is_timeline_task(activity: Activity) -> bool:
    if activity.type != Activity.Type.TASK:
        return False
    cat = (activity.category or "").strip().lower()
    if cat in NOISE_TASK_CATEGORIES:
        return False
    auto = (activity.auto_type or "").strip().lower()
    if auto in HEURISTIC_AUTO_TYPES or auto == "stage_rule":
        if activity.archived_at and not activity.is_completed:
            return False
        if cat == "cancelled":
            return False
        if not activity.is_completed and not activity.is_manually_modified:
            return False
    return True


def is_timeline_activity_row(activity: Activity) -> bool:
    if activity.type == Activity.Type.TASK:
        return is_timeline_task(activity)
    cat = (activity.category or "").strip().lower()
    if cat == "system":
        return (activity.auto_type or "") in MILESTONE_AUTO_TYPES
    return activity.type in (
        Activity.Type.NOTE,
        Activity.Type.CALL,
        Activity.Type.MEETING,
    )


class CustomerTimelineBuilder:
    def __init__(self, *, client: Client, user, company, membership):
        self.client = client
        self.user = user
        self.company = company
        self.membership = membership

    def build(self, *, filter_group: TimelineFilter = "all") -> dict[str, Any]:
        deals = list(
            get_visible_deals(self.user, self.company, self.membership)
            .filter(client=self.client)
            .select_related("stage")
            .order_by("-created_at")
        )
        deal_ids = [d.id for d in deals]
        activities = (
            Activity.objects.filter(
                Q(client=self.client) | Q(deal_id__in=deal_ids)
            )
            .select_related("deal", "author", "assigned_to", "completed_by")
            .order_by("-created_at")
        )

        events: list[TimelineEvent] = []
        seen_system_keys: set[str] = set()

        for deal in deals:
            events.extend(self._events_from_deal(deal))

        closed_deal_ids = {
            d.id for d in deals if d.closed_at and closed_stage_kind(d.stage)
        }

        for activity in activities:
            if not is_timeline_activity_row(activity):
                continue
            ev = self._event_from_activity(
                activity, seen_system_keys, closed_deal_ids=closed_deal_ids
            )
            if ev:
                events.append(ev)
                if activity.type == Activity.Type.TASK and activity.is_completed:
                    completed = self._task_completed_event(activity)
                    if completed:
                        events.append(completed)
                if activity.archived_at:
                    archived = self._task_archived_event(activity)
                    if archived:
                        events.append(archived)

        events.sort(key=lambda e: e.occurred_at, reverse=True)

        events = self._apply_timeline_filter(events, filter_group)

        return {
            "client_id": self.client.id,
            "client_name": self.client.name,
            "summary": self._summary(deals, events),
            "events": [e.to_dict() for e in events],
        }

    def _apply_timeline_filter(
        self, events: list[TimelineEvent], filter_group: TimelineFilter
    ) -> list[TimelineEvent]:
        if filter_group == "all":
            return events
        if filter_group == "deals":
            return [e for e in events if e.filter_group == "deals"]
        if filter_group == "tasks":
            return [e for e in events if e.filter_group == "tasks"]
        if filter_group == "activities":
            return [e for e in events if e.filter_group == "activities"]
        if filter_group == "calls":
            return [
                e
                for e in events
                if e.event_type in ("call", "meeting")
                or (e.kind == "activity" and e.event_type in ("call", "meeting"))
            ]
        if filter_group == "notes":
            return [
                e
                for e in events
                if e.event_type == "note"
                or (e.kind == "activity" and e.event_type == "note")
            ]
        return events

    def _summary(self, deals: list[Deal], events: list[TimelineEvent]) -> dict:
        won = [d for d in deals if closed_stage_kind(d.stage) == "won"]
        lost = [d for d in deals if closed_stage_kind(d.stage) == "lost"]
        open_deals = [d for d in deals if not is_closed_stage(d.stage)]
        revenue = sum(float(d.amount or 0) for d in won)
        first_touch = None
        if deals:
            first_touch = min(d.created_at for d in deals if d.created_at)
        avg_size = revenue / len(won) if won else 0.0
        last_activity = events[0].occurred_at if events else first_touch
        return {
            "total_deals": len(deals),
            "open_deals": len(open_deals),
            "won_deals": len(won),
            "lost_deals": len(lost),
            "total_won_revenue": revenue,
            "relationship_since": first_touch,
            "timeline_events": len(events),
            "last_activity_at": last_activity,
            "average_deal_size": avg_size,
        }

    def _events_from_deal(self, deal: Deal) -> list[TimelineEvent]:
        amount_label = _format_amount(deal.amount)
        stage_name = deal.stage.name if deal.stage else "—"
        out: list[TimelineEvent] = []

        out.append(
            TimelineEvent(
                id=f"deal-{deal.id}-created",
                kind="deal",
                event_type="deal_created",
                title=f"Deal opened — {deal.title}",
                subtitle=amount_label or "New opportunity",
                body=f"Started in {stage_name}",
                occurred_at=deal.created_at,
                importance="normal",
                filter_group="deals",
                deal_id=deal.id,
                deal_title=deal.title,
                metadata={
                    "amount": str(deal.amount),
                    "stage_name": stage_name,
                },
            )
        )

        kind = closed_stage_kind(deal.stage)
        if kind and deal.closed_at:
            duration = _deal_duration_days(deal)
            duration_note = f" · {duration} day cycle" if duration is not None else ""
            high_value = float(deal.amount or 0) >= _high_value_threshold()

            if kind == "won":
                out.append(
                    TimelineEvent(
                        id=f"deal-{deal.id}-won",
                        kind="deal",
                        event_type="deal_won",
                        title=f"Won — {deal.title}",
                        subtitle=amount_label or "Deal closed successfully",
                        body=(deal.win_reason or "Deal marked as won") + duration_note,
                        occurred_at=deal.closed_at,
                        importance="milestone" if high_value else "milestone",
                        filter_group="deals",
                        deal_id=deal.id,
                        deal_title=deal.title,
                        metadata={
                            "amount": str(deal.amount),
                            "win_reason": deal.win_reason,
                            "cycle_days": duration,
                        },
                    )
                )
            else:
                out.append(
                    TimelineEvent(
                        id=f"deal-{deal.id}-closed",
                        kind="deal",
                        event_type="deal_lost" if kind == "lost" else "deal_closed",
                        title=f"{'Lost' if kind == 'lost' else 'Closed'} — {deal.title}",
                        subtitle=amount_label or stage_name,
                        body=(deal.loss_reason or deal.close_notes or "Deal closed")
                        + duration_note,
                        occurred_at=deal.closed_at,
                        importance="highlight",
                        filter_group="deals",
                        deal_id=deal.id,
                        deal_title=deal.title,
                        metadata={
                            "loss_reason": deal.loss_reason,
                            "cycle_days": duration,
                        },
                    )
                )

        return out

    def _event_from_activity(
        self,
        activity: Activity,
        seen_system_keys: set[str],
        *,
        closed_deal_ids: set[int],
    ) -> TimelineEvent | None:
        deal = activity.deal
        deal_id = deal.id if deal else None
        deal_title = deal.title if deal else None

        if activity.type == Activity.Type.TASK:
            return self._task_created_event(activity)

        auto = (activity.auto_type or "").strip().lower()
        if (activity.category or "").lower() == "system":
            if auto in ("deal_won", "deal_closed") and deal_id in closed_deal_ids:
                return None
            key = f"{deal_id}:{auto}"
            if auto == "stage_move" and key in seen_system_keys:
                return None
            seen_system_keys.add(key)
            if auto == "deal_won":
                return TimelineEvent(
                    id=f"activity-{activity.id}-won",
                    kind="activity",
                    event_type="deal_won_note",
                    title="Deal won",
                    subtitle=deal_title or "",
                    body=activity.content or "",
                    occurred_at=activity.created_at,
                    importance="milestone",
                    filter_group="deals",
                    deal_id=deal_id,
                    deal_title=deal_title,
                    metadata={},
                )
            if auto in ("deal_closed", "stage_move"):
                importance = "highlight" if auto == "deal_closed" else "normal"
                return TimelineEvent(
                    id=f"activity-{activity.id}",
                    kind="activity",
                    event_type=auto,
                    title=activity.content or "Stage updated",
                    subtitle=deal_title or "",
                    body="",
                    occurred_at=activity.created_at,
                    importance=importance,
                    filter_group="deals" if auto != "stage_move" else "activities",
                    deal_id=deal_id,
                    deal_title=deal_title,
                    metadata={"auto_type": auto},
                )

        type_labels = {
            Activity.Type.CALL: "Call",
            Activity.Type.NOTE: "Note",
            Activity.Type.MEETING: "Meeting",
        }
        label = type_labels.get(activity.type, "Activity")
        category = (activity.category or "").strip()
        subtitle = category if category else (deal_title or "")
        return TimelineEvent(
            id=f"activity-{activity.id}",
            kind="activity",
            event_type=activity.type,
            title=f"{label}" + (f" · {category}" if category else ""),
            subtitle=subtitle,
            body=(activity.content or "").strip(),
            occurred_at=activity.created_at,
            importance="normal",
            filter_group="activities",
            deal_id=deal_id,
            deal_title=deal_title,
            metadata={"category": category},
        )

    def _task_created_event(self, activity: Activity) -> TimelineEvent:
        deal = activity.deal
        return TimelineEvent(
            id=f"task-{activity.id}-created",
            kind="task",
            event_type="task_created",
            title="Follow-up scheduled" if activity.auto_type == "follow_up" else "Task created",
            subtitle=deal.title if deal else "",
            body=(activity.content or "").strip(),
            occurred_at=activity.created_at,
            importance="normal",
            filter_group="tasks",
            deal_id=deal.id if deal else None,
            deal_title=deal.title if deal else None,
            metadata={
                "auto_type": activity.auto_type,
                "due_date": activity.due_date.isoformat() if activity.due_date else None,
            },
        )

    def _task_completed_event(self, activity: Activity) -> TimelineEvent | None:
        if not activity.completed_at:
            return None
        deal = activity.deal
        return TimelineEvent(
            id=f"task-{activity.id}-completed",
            kind="task",
            event_type="task_completed",
            title="Task completed",
            subtitle=deal.title if deal else "",
            body=(activity.content or "").strip(),
            occurred_at=activity.completed_at,
            importance="highlight" if activity.auto_type == "follow_up" else "normal",
            filter_group="tasks",
            deal_id=deal.id if deal else None,
            deal_title=deal.title if deal else None,
            metadata={"auto_type": activity.auto_type},
        )

    def _task_archived_event(self, activity: Activity) -> TimelineEvent | None:
        if not activity.archived_at:
            return None
        deal = activity.deal
        return TimelineEvent(
            id=f"task-{activity.id}-archived",
            kind="task",
            event_type="task_archived",
            title="Task archived",
            subtitle=deal.title if deal else "",
            body=activity.cancellation_reason or "Archived",
            occurred_at=activity.archived_at,
            importance="normal",
            filter_group="tasks",
            deal_id=deal.id if deal else None,
            deal_title=deal.title if deal else None,
            metadata={},
        )
