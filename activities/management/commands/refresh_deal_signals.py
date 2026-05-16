from django.core.management.base import BaseCommand

from deals.signal_engine import SignalEngine


class Command(BaseCommand):
    help = "Refresh DealSignal rows for all active deals (hourly cron fallback)."

    def handle(self, *args, **options):
        SignalEngine.refresh_all()
        self.stdout.write(self.style.SUCCESS("Deal signals refreshed."))
