import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0006_companysettings"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Membership",
            new_name="CompanyMember",
        ),
        migrations.AddField(
            model_name="companymember",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="companymember",
            name="invited_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="invited_company_memberships",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="companymember",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]
