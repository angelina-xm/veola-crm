from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasCompany(BasePermission):
    def has_permission(self, request, view):
        return request.company is not None and request.membership is not None


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return request.membership and request.membership.role == 'owner'


class IsManagerOrOwner(BasePermission):
    def has_permission(self, request, view):
        return request.membership and request.membership.role in ['owner', 'manager']


class IsOwnerOrManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        membership = request.membership

        if not membership:
            return False

        if request.method in SAFE_METHODS:
            return True

        return membership.role in ["owner", "manager"]

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)