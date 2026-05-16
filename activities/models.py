from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from clients.models import Client
from deals.models import Deal


class ActivityQuerySet(models.QuerySet):
    def tasks(self):
        return self.filter(type=Activity.Type.TASK)

    def operational(self):
        """Tasks visible in the operational workspace UI."""
        now = timezone.now()
        grace_cutoff = now - timedelta(hours=24)
        return (
            self.tasks()
            .filter(archived_at__isnull=True)
            .exclude(category__iexact="cancelled")
            .exclude(category__iexact="archived_stale")
            .exclude(snoozed_until__gt=now)
            .exclude(
                is_completed=True,
                completed_at__lt=grace_cutoff,
            )
        )

    def snoozed(self):
        now = timezone.now()
        return self.tasks().filter(
            snoozed_until__gt=now,
            is_completed=False,
            archived_at__isnull=True,
        )

    def waking_up_soon(self):
        now = timezone.now()
        return self.snoozed().filter(snoozed_until__lt=now + timedelta(hours=1))

    def overdue(self):
        now = timezone.now()
        return self.operational().filter(
            due_date__isnull=False,
            due_date__lt=now,
            is_completed=False,
        )

    def open_tasks(self):
        return self.operational().filter(is_completed=False)

    def today(self, *, now=None):
        now = now or timezone.now()
        from .task_state import local_today_window

        day_start, day_end = local_today_window(now=now)
        return self.open_tasks().filter(
            due_date__gte=max(day_start, now),
            due_date__lt=day_end,
        )

    def upcoming(self, *, now=None):
        now = now or timezone.now()
        from .task_state import local_today_window

        _, day_end = local_today_window(now=now)
        return self.open_tasks().filter(Q(due_date__gte=day_end) | Q(due_date__isnull=True))


class Activity(models.Model):
    class Type(models.TextChoices):
        CALL = "call", "Call"
        MEETING = "meeting", "Meeting"
        NOTE = "note", "Note"
        TASK = "task", "Task"

    class TaskPriority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_task_activities",
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_task_activities",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    category = models.CharField(max_length=100, null=True, blank=True)
    auto_type = models.CharField(max_length=50, null=True, blank=True)
    content = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    automation_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    priority = models.CharField(
        max_length=10,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    is_completed = models.BooleanField(default=False)
    snoozed_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Task hidden from operational UI until this datetime.",
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    archive_event = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="archived_tasks",
    )
    is_manually_modified = models.BooleanField(default=False)
    cancellation_reason = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ActivityQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["automation_key"],
                condition=Q(automation_key__isnull=False) & Q(is_completed=False),
                name="activity_open_task_unique_automation_key",
            ),
        ]

    @property
    def is_visible_in_operational_ui(self) -> bool:
        if self.type != self.Type.TASK or self.archived_at:
            return False
        from .task_status import is_task_cancelled, is_task_archived_stale

        if is_task_cancelled(self) or is_task_archived_stale(self):
            return False
        if self.snoozed_until and timezone.now() < self.snoozed_until:
            return False
        if self.is_completed:
            if self.completed_at:
                return timezone.now() < self.completed_at + timedelta(hours=24)
            return False
        return True

    def cancel(self, *, reason: str = "user_cancelled") -> None:
        if self.type != self.Type.TASK:
            return
        self.category = "cancelled"
        self.cancellation_reason = reason
        self.save(update_fields=["category", "cancellation_reason", "updated_at"])

    def __str__(self):
        return f"{self.get_type_display()} @ deal={self.deal_id} client={self.client_id}"
