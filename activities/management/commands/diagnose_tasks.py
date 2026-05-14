"""Debug: task row counts and obvious duplicate patterns (run against prod DB copy)."""

from django.core.management.base import BaseCommand
from django.db.models import Count

from activities.models import Activity


class Command(BaseCommand):
    help = "Summarize Activity rows by type and open-task duplicates by (deal, content)."

    def handle(self, *args, **options):
        total = Activity.objects.count()
        by_type = (
            Activity.objects.values("type")
            .annotate(n=Count("id"))
            .order_by("-n")
        )
        open_tasks = Activity.objects.filter(
            type=Activity.Type.TASK, is_completed=False
        )
        open_n = open_tasks.count()

        self.stdout.write(f"Activity rows (all types): {total}")
        self.stdout.write("By type:")
        for row in by_type:
            self.stdout.write(f"  {row['type']!r}: {row['n']}")
        self.stdout.write(f"Open tasks (type=task, is_completed=False): {open_n}")

        dupes = (
            open_tasks.exclude(deal_id__isnull=True)
            .values("deal_id", "content")
            .annotate(c=Count("id"))
            .filter(c__gt=1)
            .order_by("-c")[:50]
        )
        self.stdout.write("Top duplicate open tasks (same deal + same content, max 50):")
        for row in dupes:
            self.stdout.write(
                f"  deal_id={row['deal_id']} content={row['content']!r} count={row['c']}"
            )

        auto_rows = open_tasks.exclude(auto_type__isnull=True).exclude(
            auto_type__exact=""
        )
        self.stdout.write(f"Open tasks with non-empty auto_type: {auto_rows.count()}")
