"""
Operational vs historical deal contract.

Closed deals (Won/Lost/Closed) leave the operational attention layer.
All automation, signals, stale logic, and operational task views must use
``get_operational_visible_deals`` or ``DealQuerySet.operational()``.
"""

from __future__ import annotations

import re

from django.db import models
from django.db.models import QuerySet

CLOSED_STAGE_NAMES = frozenset({"won", "lost", "closed"})
_CLOSED_STAGE_RE = re.compile(r"^(won|lost|closed)$", re.IGNORECASE)


def stage_name_key(stage) -> str:
    if stage is None:
        return ""
    return (getattr(stage, "name", None) or "").strip().lower()


def is_closed_stage(stage) -> bool:
    return stage_name_key(stage) in CLOSED_STAGE_NAMES


def is_operational_deal(deal) -> bool:
    """True when deal participates in pipeline / automation / operational tasks."""
    return not is_closed_stage(getattr(deal, "stage", None))


def closed_stage_kind(stage) -> str | None:
    """Return ``won`` | ``lost`` | ``closed`` or None if operational."""
    key = stage_name_key(stage)
    if key in CLOSED_STAGE_NAMES:
        return key
    return None


class DealQuerySet(models.QuerySet):
    def operational(self) -> QuerySet:
        """Deals in active pipeline (excludes Won/Lost/Closed)."""
        return self.exclude(stage__name__iregex=r"^(won|lost|closed)$")

    def closed(self) -> QuerySet:
        """Historical closed deals."""
        return self.filter(stage__name__iregex=r"^(won|lost|closed)$")


def operational_deals_filter() -> models.Q:
    """Q object for embedding in Activity/deal joins."""
    return ~models.Q(deal__stage__name__iregex=r"^(won|lost|closed)$")
