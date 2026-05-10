from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from .forms import CustomAdminUserCreationForm, CustomUserChangeForm
from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """Обязателен для AbstractUser: иначе ModelAdmin сохраняет password без хеширования."""

    form = CustomUserChangeForm
    add_form = CustomAdminUserCreationForm

    ordering = ("email",)
    list_display = ("email", "username", "first_name", "last_name", "is_staff", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "username", "first_name", "last_name")
    readonly_fields = ("last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("username", "first_name", "last_name")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "usable_password",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
