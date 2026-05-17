"""Deal activity timestamps — shared by inactivity and automation (no circular imports)."""

from django.db.models import Max
from django.utils import timezone

from activities.models import Activity


def last_meaningful_activity_at(deal, *, now=None):
    """Last touch on deal: any activity or last completed reach-out task."""
    now = now or timezone.now()
    last_activity = Activity.objects.filter(deal=deal).aggregate(m=Max("created_at"))["m"]
    last_reach_out_done = (
        Activity.objects.filter(
            deal=deal,
            type=Activity.Type.TASK,
            is_completed=True,
            auto_type__in=["follow_up", "stage_rule"],
            completed_at__isnull=False,
        )
        .aggregate(m=Max("completed_at"))
        .get("m")
    )
    reference = deal.created_at
    for ts in (last_activity, last_reach_out_done, deal.created_at):
        if ts and (reference is None or ts > reference):
            reference = ts
    return reference or now
