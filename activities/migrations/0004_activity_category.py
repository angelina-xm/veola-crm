from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0003_activity_client_and_optional_deal"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="category",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
