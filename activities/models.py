from django.conf import settings
from django.db import models

from clients.models import Client
from deals.models import Deal


class Activity(models.Model):
    class Type(models.TextChoices):
        CALL = "call", "Call"
        MEETING = "meeting", "Meeting"
        NOTE = "note", "Note"
        TASK = "task", "Task"

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
    type = models.CharField(max_length=20, choices=Type.choices)
    category = models.CharField(max_length=100, null=True, blank=True)
    content = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_type_display()} @ deal={self.deal_id} client={self.client_id}"
