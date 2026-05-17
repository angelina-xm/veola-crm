from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0008_companymember_permissions"),
    ]

    operations = [
        migrations.AlterField(
            model_name="companysettings",
            name="auto_follow_up",
            field=models.BooleanField(default=False),
        ),
    ]
