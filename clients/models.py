from django.conf import settings
from django.db import models
from django.utils import timezone

from companies.models import Company


class Client(models.Model):
    class ClientType(models.TextChoices):
        BUSINESS = "business", "Business"
        INDIVIDUAL = "individual", "Individual"

    class RelationshipStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        VIP = "vip", "VIP"
        GROWING = "growing", "Growing"
        RETURNING = "returning", "Returning"
        DORMANT = "dormant", "Dormant"
        AT_RISK = "at_risk", "At risk"
        LOST_MOMENTUM = "lost_momentum", "Lost momentum"
        SEASONAL = "seasonal", "Seasonal"
        HIGH_POTENTIAL = "high_potential", "High potential"

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
        max_length=24,
        choices=RelationshipStatus.choices,
        default=RelationshipStatus.ACTIVE,
    )
    relationship_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_clients",
        help_text="Primary owner for this business relationship.",
    )

    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)

    industry = models.CharField(max_length=120, blank=True, default="")
    market_sector = models.CharField(max_length=120, blank=True, default="")
    description = models.TextField(blank=True, default="")
    products_services = models.TextField(blank=True, default="")
    internal_context = models.TextField(
        blank=True,
        default="",
        help_text="Internal operational notes for the team (not public-facing).",
    )
    website = models.URLField(blank=True, default="")
    company_size = models.CharField(max_length=80, blank=True, default="")

    last_conversation_topic = models.TextField(blank=True, default="")
    last_conversation_mood = models.CharField(max_length=40, blank=True, default="")
    last_conversation_outcome = models.TextField(blank=True, default="")
    next_step = models.TextField(blank=True, default="")
    relationship_concerns = models.TextField(blank=True, default="")
    relationship_context = models.TextField(
        blank=True,
        default="",
        help_text="Short relationship context — priorities, sensitivities.",
    )
    follow_up_on = models.DateField(null=True, blank=True)
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


class Product(models.Model):
    """Lightweight company sales catalog — CRM product intelligence, not inventory."""

    class ProductType(models.TextChoices):
        PHYSICAL = "physical", "Physical product"
        SERVICE = "service", "Service"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    product_type = models.CharField(
        max_length=20,
        choices=ProductType.choices,
        default=ProductType.PHYSICAL,
    )
    category = models.CharField(max_length=120, blank=True, default="")
    default_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Reference price only — deals may override.",
    )
    description = models.TextField(blank=True, default="")
    sku = models.CharField(max_length=80, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("company", "name")]

    def __str__(self):
        return self.name


class ClientProductLink(models.Model):
    class Relationship(models.TextChoices):
        PREFERRED = "preferred", "Preferred"
        FREQUENT = "frequent", "Frequently purchased"
        RECENT = "recent", "Recent purchase"
        INTERESTED = "interested", "Interested in"
        STOPPED = "stopped", "Stopped ordering"
        SEASONAL = "seasonal", "Seasonal buyer"
        HIGH_VALUE = "high_value", "High-value buyer"

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="product_links",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="client_links",
    )
    relationship = models.CharField(
        max_length=20,
        choices=Relationship.choices,
        default=Relationship.PREFERRED,
    )
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["relationship", "product__name"]
        unique_together = [("client", "product", "relationship")]
