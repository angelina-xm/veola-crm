from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0003_client_phone"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="client_type",
            field=models.CharField(
                choices=[("business", "Business"), ("individual", "Individual")],
                default="business",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="client",
            name="relationship_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("prospect", "Prospect"),
                    ("dormant", "Dormant"),
                    ("churned", "Churned"),
                ],
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="client",
            name="industry",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="client",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="products_services",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="website",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="company_size",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="client",
            name="last_conversation_topic",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="last_conversation_mood",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="client",
            name="last_conversation_outcome",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="next_step",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="last_conversation_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="client",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.CreateModel(
            name="ClientContact",
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
                ("full_name", models.CharField(max_length=255)),
                ("role_title", models.CharField(blank=True, default="", max_length=120)),
                ("email", models.EmailField(blank=True, default="", max_length=254)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                (
                    "preferred_contact_method",
                    models.CharField(
                        choices=[
                            ("email", "Email"),
                            ("phone", "Phone"),
                            ("any", "Any"),
                        ],
                        default="email",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True, default="")),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="contacts",
                        to="clients.client",
                    ),
                ),
            ],
            options={
                "ordering": ["-is_primary", "full_name"],
            },
        ),
    ]
