from django.db import models
from django.conf import settings
from companies.models import Company
from clients.models import Client

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