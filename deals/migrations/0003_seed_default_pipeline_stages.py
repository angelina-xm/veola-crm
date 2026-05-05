from django.db import migrations


DEFAULT_STAGES = ("New", "Negotiation", "Won")


def seed_default_pipeline_stages(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    PipelineStage = apps.get_model("deals", "PipelineStage")

    for company in Company.objects.all().iterator():
        has_stages = PipelineStage.objects.filter(company=company).exists()
        if has_stages:
            continue
        for order, name in enumerate(DEFAULT_STAGES, start=1):
            PipelineStage.objects.create(company=company, name=name, order=order)


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0005_company_plan"),
        ("deals", "0002_remove_deal_status_pipelinestage_deal_stage"),
    ]

    operations = [
        migrations.RunPython(
            seed_default_pipeline_stages, migrations.RunPython.noop
        ),
    ]
