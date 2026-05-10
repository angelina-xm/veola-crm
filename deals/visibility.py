from django.db.models import Q, QuerySet

from companies.permissions import can_view_all_deals

from .models import Deal


def get_visible_deals(user, company, membership) -> QuerySet[Deal]:
    base_qs = Deal.objects.filter(company=company)

    if membership is None or not getattr(membership, "is_active", True):
        return base_qs.none()

    if can_view_all_deals(membership):
        return base_qs

    return base_qs.filter(Q(assigned_to=user) | Q(created_by=user))


def user_owns_deal(user, deal: Deal) -> bool:
    return deal.created_by_id == user.id or deal.assigned_to_id == user.id


def user_can_edit_deal(user, membership, deal: Deal) -> bool:
    """Редактирование: все видимые при can_edit_all_deals; иначе только свои сделки."""
    from companies.models import CompanyRole

    if membership is None or not getattr(membership, "is_active", True):
        return False
    if deal.company_id != membership.company_id:
        return False
    if membership.role == CompanyRole.OWNER:
        return True
    vis = get_visible_deals(user, deal.company, membership).filter(pk=deal.pk).exists()
    if not vis:
        return False
    if getattr(membership, "can_edit_all_deals", False):
        return True
    return user_owns_deal(user, deal)


def user_can_delete_deal(user, membership, deal: Deal) -> bool:
    from companies.models import CompanyRole

    if membership is None or not getattr(membership, "is_active", True):
        return False
    if deal.company_id != membership.company_id:
        return False
    if membership.role == CompanyRole.OWNER:
        return True
    if not getattr(membership, "can_delete_deals", False):
        return False
    vis = get_visible_deals(user, deal.company, membership).filter(pk=deal.pk).exists()
    return vis
