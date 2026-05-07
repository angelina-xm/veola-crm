from django.db.models import Q, QuerySet

from companies.models import CompanyRole

from .models import Deal


def get_visible_deals(user, company, membership) -> QuerySet[Deal]:
    base_qs = Deal.objects.filter(company=company)

    if membership is None or not getattr(membership, "is_active", True):
        return base_qs.none()

    if membership.role == CompanyRole.OWNER:
        return base_qs

    if membership.role == CompanyRole.MANAGER:
        return base_qs.filter(Q(assigned_to=user) | Q(created_by=user))

    if membership.role == CompanyRole.EMPLOYEE:
        return base_qs.filter(Q(assigned_to=user) | Q(created_by=user))

    return base_qs.none()
