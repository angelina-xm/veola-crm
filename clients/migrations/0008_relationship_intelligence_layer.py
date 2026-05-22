from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0007_client_relationship_ecosystem"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="relationship_owner",
            field=models.ForeignKey(
                blank=True,
                help_text="Primary owner for this business relationship.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owned_clients",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="client",
            name="relationship_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("vip", "VIP"),
                    ("growing", "Growing"),
                    ("returning", "Returning"),
                    ("dormant", "Dormant"),
                    ("at_risk", "At risk"),
                    ("lost_momentum", "Lost momentum"),
                    ("seasonal", "Seasonal"),
                    ("high_potential", "High potential"),
                ],
                default="active",
                max_length=24,
            ),
        ),
        migrations.AlterField(
            model_name="clientproductlink",
            name="relationship",
            field=models.CharField(
                choices=[
                    ("preferred", "Preferred"),
                    ("frequent", "Frequently purchased"),
                    ("recent", "Recent purchase"),
                    ("interested", "Interested in"),
                    ("stopped", "Stopped ordering"),
                    ("seasonal", "Seasonal buyer"),
                    ("high_value", "High-value buyer"),
                ],
                default="preferred",
                max_length=20,
            ),
        ),
    ]
