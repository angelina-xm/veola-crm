from django.urls import path
from .views import InviteUserView, AcceptInviteView, AcceptInviteRegisterView

urlpatterns = [
    path("invite/", InviteUserView.as_view()),
    path("invite/accept/", AcceptInviteView.as_view()),
    path("invite/register/", AcceptInviteRegisterView.as_view()),
]