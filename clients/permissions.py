from rest_framework.permissions import BasePermission, SAFE_METHODS
from companies.permissions import is_manager, is_owner


class HasCompany(BasePermission):
    def has_permission(self, request, view):
        return request.company is not None and request.membership is not None


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return is_owner(request.membership)


class IsManagerOrOwner(BasePermission):
    def has_permission(self, request, view):
        return is_owner(request.membership) or is_manager(request.membership)


class IsOwnerOrManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        membership = request.membership

        if not membership:
            return False

        if request.method in SAFE_METHODS:
            return True

        return is_owner(membership) or is_manager(membership)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)