from django.contrib import admin
from .models import Company, CompanyMember, Invitation


admin.site.register(Invitation)
admin.site.register(CompanyMember)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    readonly_fields = ("max_users",)