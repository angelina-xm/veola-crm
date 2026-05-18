"""
Subscription / plan helpers — Stripe-ready extension point.

Production: gate PRO APIs on `company.plan` (+ Stripe webhook updates plan).
Development: set PRO_FEATURES_ENABLED=true to unlock without billing.
"""

from __future__ import annotations

import os

from django.conf import settings

PRO_PLANS = frozenset({"pro", "business"})


def pro_features_dev_unlock() -> bool:
    """Temporary dev override — not a substitute for subscription checks in production."""
    return bool(getattr(settings, "PRO_FEATURES_ENABLED", False))


def company_has_pro_access(company) -> bool:
    if company is None:
        return False
    if pro_features_dev_unlock():
        return True
    plan = getattr(company, "plan", None) or "free"
    return plan in PRO_PLANS


def read_pro_features_env() -> bool:
    raw = os.environ.get("PRO_FEATURES_ENABLED", "").strip().lower()
    return raw in ("1", "true", "yes", "on")
