from django.db import migrations
from django.db.models import Q
from django.utils import timezone


def backfill_closed_deals(apps, schema_editor):
    Deal = apps.get_model("deals", "Deal")
    Activity = apps.get_model("activities", "Activity")
    DealSignal = apps.get_model("deals", "DealSignal")

    now = timezone.now()
    qs = Deal.objects.filter(stage__name__iregex=r"^(won|lost|closed)$")
    automation_q = (
        Q(automation_key__isnull=False)
        | Q(category__iexact="automation")
        | (Q(auto_type__isnull=False) & ~Q(auto_type=""))
    )
    for deal in qs.iterator():
        if deal.closed_at is None:
            deal.closed_at = deal.created_at or now
            deal.save(update_fields=["closed_at"])
        Activity.objects.filter(
            deal_id=deal.pk,
            type="task",
            is_completed=False,
            archived_at__isnull=True,
        ).filter(automation_q).update(
            category="cancelled",
            cancellation_reason="deal_closed",
            archived_at=now,
        )
        DealSignal.objects.filter(deal_id=deal.pk, is_active=True).update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0007_seed_lost_pipeline_stage"),
        ("activities", "0008_activity_archive_event_activity_archived_at_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_closed_deals, migrations.RunPython.noop),
    ]
