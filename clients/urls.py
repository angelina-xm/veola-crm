from rest_framework.routers import DefaultRouter

from .product_views import ProductViewSet
from .views import ClientViewSet

router = DefaultRouter()
router.register("clients", ClientViewSet)
router.register("products", ProductViewSet, basename="product")

urlpatterns = router.urls