from django.core.management.base import BaseCommand

from activities.archival_service import TaskArchivalService


class Command(BaseCommand):
    help = "Archive completed tasks and stale manual tasks (hourly cron fallback)."

    def handle(self, *args, **options):
        TaskArchivalService.run()
        self.stdout.write(self.style.SUCCESS("Task archival completed."))
