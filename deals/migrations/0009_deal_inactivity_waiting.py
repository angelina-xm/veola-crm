from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0008_backfill_closed_deals"),
    ]

    operations = [
        migrations.AddField(
            model_name="deal",
            name="follow_up_on",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="deal",
            name="inactivity_snoozed_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="deal",
            name="waiting_on_client",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="deal",
            name="waiting_reason",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
