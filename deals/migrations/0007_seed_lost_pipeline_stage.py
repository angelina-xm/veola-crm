from django.db import migrations
from django.db.models import Max


def seed_lost_stage(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    PipelineStage = apps.get_model("deals", "PipelineStage")

    for company in Company.objects.all().iterator():
        if PipelineStage.objects.filter(company=company, name__iexact="lost").exists():
            continue
        max_order = (
            PipelineStage.objects.filter(company=company).aggregate(m=Max("order"))["m"]
            or 0
        )
        PipelineStage.objects.create(company=company, name="Lost", order=max_order + 1)


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0006_deal_closure_fields"),
    ]

    operations = [
        migrations.RunPython(seed_lost_stage, migrations.RunPython.noop),
    ]
