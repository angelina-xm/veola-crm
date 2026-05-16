import uuid

from django.conf import settings
from django.db import models

from clients.models import Client
from companies.models import Company

User = settings.AUTH_USER_MODEL

class PipelineStage(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="stages"
    )

    name = models.CharField(max_length=255)
    order = models.IntegerField()

    def __str__(self):
        return self.name


class Deal(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="deals"
    )

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="deals"
    )

    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    stage = models.ForeignKey(
        "PipelineStage",  # 🔥 строка — решает твою ошибку
        on_delete=models.SET_NULL,
        null=True,
        related_name="deals"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_deals",
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_deals",
    )

    def __str__(self):
        return self.title


class DealSignal(models.Model):
    """
    Ephemeral attention signal for a deal — not an actionable task.
    Deactivated automatically when the underlying condition is no longer true.
    """

    class SignalType(models.TextChoices):
        STALE = "stale", "No recent activity"
        CLOSING_SOON = "closing_soon", "Close date approaching"
        NO_CONTACT = "no_contact", "Client missing contact details"
        HIGH_VALUE_IDLE = "high_value_idle", "High-value deal needs attention"
        OVERDUE_TASK = "overdue_task", "Has overdue tasks"
        LONG_IN_STAGE = "long_in_stage", "Longer than usual in stage"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="deal_signals",
    )
    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="signals",
    )
    signal_type = models.CharField(max_length=50, choices=SignalType.choices)
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.INFO,
    )
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_checked_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["deal", "signal_type"],
                name="deal_signal_unique_type_per_deal",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "is_active", "severity"]),
            models.Index(fields=["deal", "is_active"]),
        ]

    def __str__(self):
        state = "active" if self.is_active else "inactive"
        return f"{self.signal_type} on deal={self.deal_id} ({state})"