from django.urls import path
from .views import (
    AcceptInviteRegisterView,
    AcceptInviteView,
    CompanySettingsView,
    InviteUserView,
)

urlpatterns = [
    path("invite/", InviteUserView.as_view()),
    path("invite/accept/", AcceptInviteView.as_view()),
    path("invite/register/", AcceptInviteRegisterView.as_view()),
    path("settings/", CompanySettingsView.as_view()),
]