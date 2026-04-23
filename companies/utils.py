from rest_framework.exceptions import PermissionDenied


def check_user_limit(company):
    if company.memberships.count() >= company.max_users:
        raise PermissionDenied("User limit reached. Upgrade your plan.")
    
