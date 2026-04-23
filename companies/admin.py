from django.contrib import admin
from .models import Company, Membership, Invitation


admin.site.register(Invitation)
admin.site.register(Membership)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    readonly_fields = ("max_users",)