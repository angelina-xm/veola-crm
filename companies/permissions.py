def is_owner(membership):
    return membership and membership.role == "owner"


def is_manager(membership):
    return membership and membership.role == "manager"


def can_invite(membership):
    return membership and membership.role == "owner"


def can_delete_user(membership, target_membership):
    # нельзя удалить owner
    if target_membership.role == "owner":
        return False

    return membership and membership.role == "owner"