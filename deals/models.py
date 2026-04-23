from django.db import models
from companies.models import Company
from clients.models import Client


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

    def __str__(self):
        return self.title