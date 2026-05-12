from rest_framework.permissions import BasePermission, SAFE_METHODS

from companies.permissions import (
    can_create_deals,
    can_delete_deals,
    can_manage_automations,
    can_manage_team,
    member_has,
)
from deals.visibility import user_can_delete_deal, user_can_edit_deal


class HasCompany(BasePermission):
    def has_permission(self, request, view):
        return request.company is not None and request.membership is not None


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        from companies.permissions import is_owner

        return is_owner(request.membership)


class CanCreateDeals(BasePermission):
    def has_permission(self, request, view):
        return can_create_deals(request.membership)


class CanManageTeam(BasePermission):
    def has_permission(self, request, view):
        return can_manage_team(request.membership)


class CanManageAutomations(BasePermission):
    def has_permission(self, request, view):
        return can_manage_automations(request.membership)


class CanEditDealObject(BasePermission):
    def has_object_permission(self, request, view, obj):
        return user_can_edit_deal(request.user, request.membership, obj)


class CanDeleteDealObject(BasePermission):
    def has_object_permission(self, request, view, obj):
        return user_can_delete_deal(request.user, request.membership, obj)


class CanEditClientObject(BasePermission):
    """Клиенты компании: редактирование при праве создавать CRM-сущности."""

    def has_object_permission(self, request, view, obj):
        return can_create_deals(request.membership)


class CanDeleteClientObject(BasePermission):
    def has_object_permission(self, request, view, obj):
        return can_delete_deals(request.membership)


class CompanySettingsRead(BasePermission):
    """Чтение настроек компании (автоматизация) — любой участник с компанией."""

    def has_permission(self, request, view):
        return HasCompany().has_permission(request, view)


class CompanySettingsWrite(BasePermission):
    def has_permission(self, request, view):
        return can_manage_automations(request.membership)


class CanViewAnalytics(BasePermission):
    def has_permission(self, request, view):
        from companies.permissions import can_view_analytics

        return can_view_analytics(request.membership)


class IsOwnerOrManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        membership = request.membership

        if not membership:
            return False

        if request.method in SAFE_METHODS:
            return True

        return member_has(membership, "can_create_deals")

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
