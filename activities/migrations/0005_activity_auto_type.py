from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0004_activity_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="auto_type",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
