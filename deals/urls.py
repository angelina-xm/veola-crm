from rest_framework.routers import DefaultRouter
from .views import DealViewSet, PipelineStageViewSet

router = DefaultRouter()
router.register("deals", DealViewSet)
router.register("pipeline-stages", PipelineStageViewSet)

urlpatterns = router.urls