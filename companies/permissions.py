"""Проверки прав по CompanyMember: RBAC-флаги; OWNER = полный доступ (супер-админ компании)."""

from .models import CompanyRole


def is_super_admin(membership) -> bool:
    """Owner в компании — обход всех boolean-ограничений."""
    return bool(
        membership
        and getattr(membership, "is_active", True)
        and membership.role == CompanyRole.OWNER
    )


def _member_ok(membership) -> bool:
    return bool(membership and getattr(membership, "is_active", True))


def member_has(membership, attr: str) -> bool:
    """True если у членства выставлен permission-флаг owner или флаг True."""
    if not _member_ok(membership):
        return False
    if is_super_admin(membership):
        return True
    return bool(getattr(membership, attr, False))


def can_view_all_deals(membership) -> bool:
    return member_has(membership, "can_view_all_deals")


def can_create_deals(membership) -> bool:
    return member_has(membership, "can_create_deals")


def can_edit_all_deals(membership) -> bool:
    return member_has(membership, "can_edit_all_deals")


def can_delete_deals(membership) -> bool:
    return member_has(membership, "can_delete_deals")


def can_manage_team(membership) -> bool:
    return member_has(membership, "can_manage_team")


def can_manage_automations(membership) -> bool:
    return member_has(membership, "can_manage_automations")


def can_view_analytics(membership) -> bool:
    return member_has(membership, "can_view_analytics")


def is_owner(membership) -> bool:
    return _member_ok(membership) and membership.role == CompanyRole.OWNER


def is_manager(membership) -> bool:
    return _member_ok(membership) and membership.role == CompanyRole.MANAGER


def is_employee(membership) -> bool:
    return _member_ok(membership) and membership.role == CompanyRole.EMPLOYEE


def can_invite(membership) -> bool:
    return can_manage_team(membership)


def can_delete_user(membership, target_membership):
    if not target_membership or target_membership.role == CompanyRole.OWNER:
        return False
    return can_manage_team(membership)
