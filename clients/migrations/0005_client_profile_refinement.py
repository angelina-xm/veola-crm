# Generated manually for client profile refinement

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0009_alter_companysettings_auto_follow_up"),
        ("clients", "0004_client_profile_system"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="internal_context",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="market_sector",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("category", models.CharField(blank=True, default="", max_length=120)),
                (
                    "default_price",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                ("description", models.TextField(blank=True, default="")),
                ("sku", models.CharField(blank=True, default="", max_length=80)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="products",
                        to="companies.company",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("company", "name")},
            },
        ),
        migrations.CreateModel(
            name="ClientProductLink",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "relationship",
                    models.CharField(
                        choices=[
                            ("preferred", "Preferred"),
                            ("frequent", "Frequently purchased"),
                            ("recent", "Recent purchase"),
                            ("interested", "Interested in"),
                        ],
                        default="preferred",
                        max_length=20,
                    ),
                ),
                ("note", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_links",
                        to="clients.client",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_links",
                        to="clients.product",
                    ),
                ),
            ],
            options={
                "ordering": ["relationship", "product__name"],
                "unique_together": {("client", "product", "relationship")},
            },
        ),
    ]
