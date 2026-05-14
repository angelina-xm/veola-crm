"""
Remove duplicate OPEN automation tasks (same deal + same auto_type), keeping the oldest row.

Use after fixing the Board auto-task effect. Default is dry-run.
"""

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from activities.models import Activity

AUTO_TYPES = ("follow_up", "offer_discount", "reorder")


class Command(BaseCommand):
    help = "Delete duplicate open tasks per (deal, auto_type) for automation auto_types; keep lowest id."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete rows (default: print plan only).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        qs = Activity.objects.filter(
            type=Activity.Type.TASK,
            is_completed=False,
            deal_id__isnull=False,
            auto_type__in=AUTO_TYPES,
        ).order_by("deal_id", "auto_type", "id")

        buckets: dict[tuple[int, str], list[int]] = defaultdict(list)
        for row in qs.iterator():
            key = (row.deal_id, str(row.auto_type).strip().lower())
            buckets[key].append(row.id)

        victims: list[int] = []
        for (_deal, _at), ids in buckets.items():
            ids_sorted = sorted(ids)
            if len(ids_sorted) <= 1:
                continue
            victims.extend(ids_sorted[1:])

        self.stdout.write(
            f"Duplicate open automation tasks to remove: {len(victims)} "
            "(keep oldest id per deal+auto_type)"
        )
        if not victims:
            return
        if not apply:
            self.stdout.write("Dry-run only. Re-run with --apply to delete.")
            return
        with transaction.atomic():
            deleted, _ = Activity.objects.filter(pk__in=victims).delete()
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {deleted} database row(s) (model cascade totals).")
        )
