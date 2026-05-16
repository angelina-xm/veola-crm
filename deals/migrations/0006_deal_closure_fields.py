from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0005_dealsignal"),
    ]

    operations = [
        migrations.AddField(
            model_name="deal",
            name="close_competitor",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="deal",
            name="close_notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="deal",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="deal",
            name="loss_reason",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="deal",
            name="win_reason",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
