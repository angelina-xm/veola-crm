"""Формы админки для users.User (USERNAME_FIELD = email)."""

from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import User


class CustomAdminUserCreationForm(AdminUserCreationForm):
    """
    Как AdminUserCreationForm, но поля модели включают email (USERNAME_FIELD).
    Стандартный UserCreationForm.Meta.fields = ("username",) — без email нельзя
    создать нашу модель корректно; пароль задаётся через set_password в save().
    """

    class Meta(AdminUserCreationForm.Meta):
        model = User
        fields = ("email", "username")

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if email and User.objects.filter(email__iexact=email).exists():
            raise ValidationError(
                _("A user with that email already exists."),
                code="duplicate_email",
            )
        return email


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
