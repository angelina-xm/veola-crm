from django.contrib import admin

from .models import Activity


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "deal", "author", "is_completed", "created_at")
    list_filter = ("type",)
