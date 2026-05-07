from .models import CompanyRole


def is_owner(membership):
    return membership and membership.role == CompanyRole.OWNER


def is_manager(membership):
    return membership and membership.role == CompanyRole.MANAGER


def is_employee(membership):
    return membership and membership.role == CompanyRole.EMPLOYEE


def can_invite(membership):
    return is_owner(membership)


def can_manage_team(membership):
    return is_owner(membership)


def can_view_all_deals(membership):
    return is_owner(membership)


def can_delete_user(membership, target_membership):
    # нельзя удалить owner
    if target_membership.role == CompanyRole.OWNER:
        return False

    return is_owner(membership)