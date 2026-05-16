"""Compute and refresh ephemeral DealSignal rows (no tasks created)."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from activities.models import Activity
from activities.task_state import is_task_overdue

from .models import Deal, DealSignal
from .operational import is_operational_deal

logger = logging.getLogger(__name__)

class SignalEngine:
    STALE_DAYS = 7
    CLOSING_SOON_DAYS = 3
    @classmethod
    def _high_value_threshold(cls) -> float:
        from django.conf import settings

        return float(getattr(settings, "SIGNAL_HIGH_VALUE_THRESHOLD", 50_000))
    LONG_IN_STAGE_MULTIPLIER = 1.5

    @classmethod
    def _active_deals_qs(cls, *, company=None):
        qs = Deal.objects.operational().select_related("client", "stage", "company")
        if company is not None:
            qs = qs.filter(company=company)
        return qs

    @classmethod
    def refresh_for_deal(cls, deal: Deal) -> None:
        if not is_operational_deal(deal):
            DealSignal.objects.filter(deal=deal, is_active=True).update(is_active=False)
            return
        with transaction.atomic():
            cls._check_stale(deal)
            cls._check_closing_soon(deal)
            cls._check_no_contact(deal)
            cls._check_high_value_idle(deal)
            cls._check_overdue_task(deal)
            cls._check_long_in_stage(deal)

    @classmethod
    def refresh_all(cls, *, company=None) -> None:
        for deal in cls._active_deals_qs(company=company).iterator(chunk_size=200):
            try:
                cls.refresh_for_deal(deal)
            except Exception:
                logger.error("SignalEngine error for deal %s", deal.id, exc_info=True)

    @classmethod
    def _upsert_signal(cls, deal, signal_type, severity, metadata, is_active):
        if is_active:
            DealSignal.objects.update_or_create(
                deal=deal,
                signal_type=signal_type,
                defaults={
                    "company": deal.company,
                    "severity": severity,
                    "is_active": True,
                    "metadata": metadata,
                },
            )
        else:
            DealSignal.objects.filter(deal=deal, signal_type=signal_type).update(
                is_active=False
            )

    @classmethod
    def _last_activity_at(cls, deal: Deal):
        agg = Activity.objects.filter(deal=deal).aggregate(m=Max("created_at"))
        return agg["m"] or deal.created_at

    @classmethod
    def _check_stale(cls, deal: Deal) -> None:
        last_activity = cls._last_activity_at(deal)
        days_idle = (timezone.now() - last_activity).days
        is_stale = days_idle >= cls.STALE_DAYS
        cls._upsert_signal(
            deal=deal,
            signal_type=DealSignal.SignalType.STALE,
            severity=(
                DealSignal.Severity.CRITICAL
                if days_idle >= 14
                else DealSignal.Severity.WARNING
            ),
            metadata={"days_idle": days_idle},
            is_active=is_stale,
        )

    @classmethod
    def _check_closing_soon(cls, deal: Deal) -> None:
        close_date = getattr(deal, "expected_close_date", None)
        if close_date is None:
            cls._upsert_signal(
                deal=deal,
                signal_type=DealSignal.SignalType.CLOSING_SOON,
                severity=DealSignal.Severity.INFO,
                metadata={},
                is_active=False,
            )
            return
        days_until = (close_date.date() - timezone.now().date()).days
        is_soon = 0 <= days_until <= cls.CLOSING_SOON_DAYS
        cls._upsert_signal(
            deal=deal,
            signal_type=DealSignal.SignalType.CLOSING_SOON,
            severity=(
                DealSignal.Severity.CRITICAL
                if days_until <= 1
                else DealSignal.Severity.WARNING
            ),
            metadata={
                "days_until_close": days_until,
                "close_date": str(close_date.date()),
            },
            is_active=is_soon,
        )

    @classmethod
    def _check_no_contact(cls, deal: Deal) -> None:
        client = deal.client
        has_contact = bool(
            (client.email or "").strip() or (client.phone or "").strip()
        )
        cls._upsert_signal(
            deal=deal,
            signal_type=DealSignal.SignalType.NO_CONTACT,
            severity=DealSignal.Severity.INFO,
            metadata={},
            is_active=not has_contact,
        )

    @classmethod
    def _check_high_value_idle(cls, deal: Deal) -> None:
        amount = float(deal.amount or 0)
        last_activity = cls._last_activity_at(deal)
        days_idle = (timezone.now() - last_activity).days
        is_high_value_idle = amount >= cls._high_value_threshold() and days_idle >= 3
        cls._upsert_signal(
            deal=deal,
            signal_type=DealSignal.SignalType.HIGH_VALUE_IDLE,
            severity=DealSignal.Severity.CRITICAL,
            metadata={"amount": amount, "days_idle": days_idle},
            is_active=is_high_value_idle,
        )

    @classmethod
    def _check_overdue_task(cls, deal: Deal) -> None:
        open_tasks = Activity.objects.filter(
            deal=deal,
            type=Activity.Type.TASK,
            is_completed=False,
            archived_at__isnull=True,
        )
        overdue = [t for t in open_tasks if is_task_overdue(t)]
        cls._upsert_signal(
            deal=deal,
            signal_type=DealSignal.SignalType.OVERDUE_TASK,
            severity=DealSignal.Severity.WARNING,
            metadata={"overdue_count": len(overdue)},
            is_active=bool(overdue),
        )

    @classmethod
    def _check_long_in_stage(cls, deal: Deal) -> None:
        if deal.stage_id is None:
            cls._upsert_signal(
                deal=deal,
                signal_type=DealSignal.SignalType.LONG_IN_STAGE,
                severity=DealSignal.Severity.INFO,
                metadata={},
                is_active=False,
            )
            return
        stage_entered = deal.created_at
        days_in_stage = (timezone.now() - stage_entered).days
        try:
            peer_days = []
            for peer in Deal.objects.filter(stage=deal.stage, company=deal.company).only(
                "created_at"
            ):
                peer_days.append((timezone.now() - peer.created_at).days)
            avg_days = sum(peer_days) / len(peer_days) if peer_days else 0
            is_long = avg_days > 0 and days_in_stage > avg_days * cls.LONG_IN_STAGE_MULTIPLIER
            cls._upsert_signal(
                deal=deal,
                signal_type=DealSignal.SignalType.LONG_IN_STAGE,
                severity=DealSignal.Severity.INFO,
                metadata={
                    "days_in_stage": days_in_stage,
                    "avg_days": round(avg_days, 1),
                },
                is_active=is_long,
            )
        except Exception:
            logger.debug("long_in_stage check skipped for deal %s", deal.id, exc_info=True)
