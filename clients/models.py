from django.db import models
from django.utils import timezone

from companies.models import Company


class Client(models.Model):
    class ClientType(models.TextChoices):
        BUSINESS = "business", "Business"
        INDIVIDUAL = "individual", "Individual"

    class RelationshipStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        PROSPECT = "prospect", "Prospect"
        DORMANT = "dormant", "Dormant"
        CHURNED = "churned", "Churned"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="clients",
    )

    name = models.CharField(max_length=255)
    client_type = models.CharField(
        max_length=20,
        choices=ClientType.choices,
        default=ClientType.BUSINESS,
    )
    relationship_status = models.CharField(
        max_length=20,
        choices=RelationshipStatus.choices,
        default=RelationshipStatus.ACTIVE,
    )

    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)

    industry = models.CharField(max_length=120, blank=True, default="")
    description = models.TextField(blank=True, default="")
    products_services = models.TextField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    company_size = models.CharField(max_length=80, blank=True, default="")

    last_conversation_topic = models.TextField(blank=True, default="")
    last_conversation_mood = models.CharField(max_length=40, blank=True, default="")
    last_conversation_outcome = models.TextField(blank=True, default="")
    next_step = models.TextField(blank=True, default="")
    last_conversation_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ClientContact(models.Model):
    class PreferredContact(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        ANY = "any", "Any"

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    full_name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=PreferredContact.choices,
        default=PreferredContact.EMAIL,
    )
    notes = models.TextField(blank=True, default="")
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_primary", "full_name"]

    def __str__(self):
        return self.full_name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_primary:
            ClientContact.objects.filter(client_id=self.client_id).exclude(
                pk=self.pk
            ).update(is_primary=False)
