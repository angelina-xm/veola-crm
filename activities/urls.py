from rest_framework.routers import DefaultRouter

from .views import ActivityViewSet
from .views_tasks import TaskViewSet

router = DefaultRouter()
router.register("activities", ActivityViewSet)
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = router.urls
