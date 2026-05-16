import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vexora.settings")

app = Celery("vexora")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
