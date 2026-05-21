# Client relationship ecosystem — memory fields + customer states

from django.db import migrations, models


def map_legacy_statuses(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    Client.objects.filter(relationship_status="prospect").update(
        relationship_status="active"
    )
    Client.objects.filter(relationship_status="churned").update(
        relationship_status="dormant"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0006_product_catalog_intelligence"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="relationship_concerns",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="client",
            name="relationship_context",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Short relationship context — priorities, sensitivities.",
            ),
        ),
        migrations.AddField(
            model_name="client",
            name="follow_up_on",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="client",
            name="relationship_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("vip", "VIP"),
                    ("at_risk", "At risk"),
                    ("dormant", "Dormant"),
                    ("returning", "Returning"),
                ],
                default="active",
                max_length=20,
            ),
        ),
        migrations.RunPython(map_legacy_statuses, migrations.RunPython.noop),
    ]
