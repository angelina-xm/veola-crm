from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivityViewSet
from .views_automation import SyncAutomationTasksView
from .views_tasks import TaskViewSet

router = DefaultRouter()
router.register("activities", ActivityViewSet)
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("activities/sync-automation/", SyncAutomationTasksView.as_view()),
] + router.urls
