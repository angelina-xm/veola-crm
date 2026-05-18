from django.contrib import admin

from .models import Client, ClientContact


class ClientContactInline(admin.TabularInline):
    model = ClientContact
    extra = 0


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "client_type", "relationship_status", "company")
    inlines = [ClientContactInline]


@admin.register(ClientContact)
class ClientContactAdmin(admin.ModelAdmin):
    list_display = ("full_name", "client", "role_title", "is_primary")
