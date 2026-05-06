from django.db import migrations, models


def create_settings_for_existing_companies(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    CompanySettings = apps.get_model("companies", "CompanySettings")
    for company in Company.objects.all().iterator():
        CompanySettings.objects.get_or_create(company=company)


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0005_company_plan"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanySettings",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("auto_follow_up", models.BooleanField(default=True)),
                ("auto_discount", models.BooleanField(default=True)),
                ("auto_reorder", models.BooleanField(default=True)),
                (
                    "company",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="settings",
                        to="companies.company",
                    ),
                ),
            ],
        ),
        migrations.RunPython(
            create_settings_for_existing_companies,
            migrations.RunPython.noop,
        ),
    ]
