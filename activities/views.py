from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated

from clients.permissions import HasCompany
from companies.permissions import can_delete_deals
from deals.visibility import get_visible_deals

from .models import Activity
from .serializers import ActivitySerializer


class CanDeleteActivity(BasePermission):
    def has_permission(self, request, view):
        return can_delete_deals(request.membership)


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticated(), HasCompany(), CanDeleteActivity()]
        return [IsAuthenticated(), HasCompany()]

    def get_queryset(self):
        company = self.request.company
        membership = getattr(self.request, "membership", None)
        qs = (
            Activity.objects.filter(
                Q(client__company=company)
                | Q(deal__company=company)
            )
            .select_related("author", "deal", "client", "assigned_to", "completed_by")
            .order_by("-created_at")
        )

        visible_ids = list(
            get_visible_deals(self.request.user, company, membership).values_list(
                "pk", flat=True
            )
        )
        qs = qs.filter(Q(deal_id__in=visible_ids) | Q(deal__isnull=True))

        deal_id = self.request.query_params.get("deal_id")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        client_id = self.request.query_params.get("client_id")
        if client_id:
            qs = qs.filter(client_id=client_id)

        type_param = self.request.query_params.get("type")
        if type_param:
            qs = qs.filter(type=type_param)

        is_completed_param = self.request.query_params.get("is_completed")
        if is_completed_param:
            low = is_completed_param.lower()
            if low in ("true", "1", "yes"):
                qs = qs.filter(is_completed=True)
            elif low in ("false", "0", "no"):
                qs = qs.filter(is_completed=False)

        return qs

    def perform_create(self, serializer):
        inst = serializer.save(author=self.request.user)
        if inst.type == Activity.Type.TASK and inst.assigned_to_id is None:
            inst.assigned_to = self.request.user
            inst.save(update_fields=["assigned_to"])
