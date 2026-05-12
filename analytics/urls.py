from django.urls import path

from .views import AnalyticsV1OverviewView

urlpatterns = [
    path(
        "analytics/v1/overview/",
        AnalyticsV1OverviewView.as_view(),
        name="analytics-v1-overview",
    ),
]
