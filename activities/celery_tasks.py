"""Background jobs for task archival and deal signals (requires Celery worker + beat)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

try:
    from celery import shared_task
except ImportError:  # pragma: no cover - dev without celery installed

    def shared_task(*args, **kwargs):
        def decorator(func):
            return func

        return decorator


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    name="activities.archive_completed_tasks",
)
def archive_completed_tasks(self):
    try:
        from .archival_service import TaskArchivalService

        TaskArchivalService.run()
    except Exception as exc:
        logger.error("archive_completed_tasks failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    name="activities.refresh_deal_signals",
)
def refresh_deal_signals(self):
    try:
        from deals.signal_engine import SignalEngine

        SignalEngine.refresh_all()
    except Exception as exc:
        logger.error("refresh_deal_signals failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
