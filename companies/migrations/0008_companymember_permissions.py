from django.db import migrations, models


def forwards_preset_permissions(apps, schema_editor):
    CompanyMember = apps.get_model("companies", "CompanyMember")
    for m in CompanyMember.objects.all():
        role = m.role
        if role == "owner":
            m.can_view_all_deals = True
            m.can_create_deals = True
            m.can_edit_all_deals = True
            m.can_delete_deals = True
            m.can_manage_team = True
            m.can_manage_automations = True
            m.can_view_analytics = True
        elif role == "manager":
            m.can_view_all_deals = False
            m.can_create_deals = True
            m.can_edit_all_deals = False
            m.can_delete_deals = False
            m.can_manage_team = False
            m.can_manage_automations = False
            m.can_view_analytics = True
        else:
            m.can_view_all_deals = False
            m.can_create_deals = True
            m.can_edit_all_deals = False
            m.can_delete_deals = False
            m.can_manage_team = False
            m.can_manage_automations = False
            m.can_view_analytics = False
        m.save(
            update_fields=[
                "can_view_all_deals",
                "can_create_deals",
                "can_edit_all_deals",
                "can_delete_deals",
                "can_manage_team",
                "can_manage_automations",
                "can_view_analytics",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0007_companymember_foundation"),
    ]

    operations = [
        migrations.AddField(
            model_name="companymember",
            name="can_view_all_deals",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companymember",
            name="can_create_deals",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companymember",
            name="can_edit_all_deals",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companymember",
            name="can_delete_deals",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companymember",
            name="can_manage_team",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companymember",
            name="can_manage_automations",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companymember",
            name="can_view_analytics",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(forwards_preset_permissions, migrations.RunPython.noop),
    ]
