from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .notifications_views import NotificationsView
from .views import DealViewSet, PipelineStageViewSet

router = DefaultRouter()
router.register("deals", DealViewSet)
router.register("pipeline-stages", PipelineStageViewSet)

urlpatterns = [
    path("notifications/", NotificationsView.as_view()),
    path("", include(router.urls)),
]
