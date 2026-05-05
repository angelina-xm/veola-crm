from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0003_client_phone"),
        ("activities", "0002_activity_is_completed"),
    ]

    operations = [
        migrations.AlterField(
            model_name="activity",
            name="deal",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="activities",
                to="deals.deal",
            ),
        ),
        migrations.AddField(
            model_name="activity",
            name="client",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="activities",
                to="clients.client",
            ),
        ),
    ]
