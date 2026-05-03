from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from clients.permissions import HasCompany, IsOwner
from .models import Activity
from .serializers import ActivitySerializer


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()  # ← ДОБАВЬ ЭТО
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Activity.objects.filter(deal__company=self.request.company)
            .select_related("author", "deal")
            .order_by("-created_at")
        )
        deal_id = self.request.query_params.get("deal_id")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)

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

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "update", "partial_update"]:
            return [IsAuthenticated(), HasCompany()]
        if self.action == "destroy":
            return [IsAuthenticated(), HasCompany(), IsOwner()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
