from django.utils.deprecation import MiddlewareMixin
from companies.models import Membership
from django.core.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class CompanyMiddleware(MiddlewareMixin):

    def __init__(self, get_response):
        super().__init__(get_response)
        self.jwt_auth = JWTAuthentication()

    def process_view(self, request, view_func, view_args, view_kwargs):

        # ❗ пропускаем login/register
        if request.path.startswith("/api/token") or request.path.startswith("/api/invite/register"):
            return None

        request.company = None
        request.membership = None

        # 🔥 ВОТ КЛЮЧ
        try:
            user_auth = self.jwt_auth.authenticate(request)
            if user_auth:
                request.user = user_auth[0]
        except Exception:
            return None

        user = request.user

        if not user or not user.is_authenticated:
            return None

        company_id = request.headers.get("X-Company-ID")

        if not company_id:
            return None

        try:
            company_id = int(company_id)
        except:
            return None

        try:
            membership = Membership.objects.select_related("company").get(
                user=user,
                company_id=company_id
            )

            request.company = membership.company
            request.membership = membership

        except Membership.DoesNotExist:
            raise PermissionDenied("You don't have access to this company")