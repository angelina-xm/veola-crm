from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="is_completed",
            field=models.BooleanField(default=False),
        ),
    ]
