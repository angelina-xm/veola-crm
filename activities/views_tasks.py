from django.db.models import F, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from clients.permissions import HasCompany
from companies.permissions import can_create_deals
from deals.models import DealSignal
from deals.visibility import get_operational_visible_deals

from .models import Activity
from .serializers_tasks import (
    DealSignalSerializer,
    TaskSerializer,
    TaskWriteSerializer,
    WorkspaceHealthSerializer,
)
from .task_permissions import user_can_complete_task, user_can_edit_task
from .task_query import operational_tasks_queryset, visible_tasks_queryset
from .task_service import TaskService
from .task_state import local_today_window


class CanCreateTasks(BasePermission):
    def has_permission(self, request, view):
        return can_create_deals(request.membership)


class TaskViewSet(viewsets.ModelViewSet):
    """
    CRM tasks (Activity rows with type=task).

    List filters: ?bucket=today|upcoming|overdue|completed
    My work queue: GET /tasks/my/ (same filters).
    Workspace: GET /tasks/workspace/
    Complete: POST /tasks/:id/complete/
    """

    permission_classes = [IsAuthenticated, HasCompany]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), HasCompany(), CanCreateTasks()]
        return [IsAuthenticated(), HasCompany()]

    def get_serializer_class(self):
        if self.action == "create":
            return TaskWriteSerializer
        return TaskSerializer

    def _base_queryset(self):
        return visible_tasks_queryset(
            self.request.user,
            self.request.company,
            getattr(self.request, "membership", None),
        ).select_related(
            "author",
            "assigned_to",
            "completed_by",
            "deal",
            "deal__stage",
            "client",
        )

    def get_queryset(self):
        qs = self._base_queryset()

        if getattr(self, "_my_tasks_scope", False):
            user = self.request.user
            qs = qs.filter(Q(assigned_to=user) | Q(assigned_to__isnull=True, author=user))

        if self.action in ("archived",):
            return qs.filter(archived_at__isnull=False).order_by("-archived_at")

        if self.action in ("snoozed",):
            return qs.snoozed().order_by("snoozed_until", "id")

        bucket = (self.request.query_params.get("bucket") or "").lower()
        now = timezone.now()
        day_start, day_end = local_today_window(now=now)

        if bucket == "completed":
            return qs.filter(is_completed=True).order_by("-completed_at", "-id")

        qs = qs.operational()

        if bucket == "overdue":
            return qs.overdue().order_by("due_date", "id")
        if bucket == "today":
            return qs.today(now=now).order_by("due_date", "id")
        if bucket == "upcoming":
            return qs.upcoming(now=now).order_by(F("due_date").asc(nulls_last=True), "id")
        if bucket:
            return qs.none()

        return qs.order_by(F("due_date").asc(nulls_last=True), "id")

    def get_object(self):
        obj = super().get_object()
        if obj.type != Activity.Type.TASK:
            raise NotFound()
        return obj

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if not user_can_edit_task(request.user, request.membership, instance):
            return Response({"detail": "You cannot edit this task."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="my")
    def my(self, request, *args, **kwargs):
        self._my_tasks_scope = True
        try:
            return self.list(request, *args, **kwargs)
        finally:
            del self._my_tasks_scope

    @action(detail=False, methods=["get"])
    def workspace(self, request):
        """Single payload for the operational day view."""
        user = request.user
        company = request.company
        membership = getattr(request, "membership", None)

        task_qs = operational_tasks_queryset(user, company, membership)
        if not getattr(membership, "can_view_all_deals", False):
            task_qs = task_qs.filter(
                Q(assigned_to=user) | Q(assigned_to__isnull=True, author=user)
            )

        operational_deal_ids = get_operational_visible_deals(
            user, company, membership
        ).values("pk")
        signals = (
            DealSignal.objects.filter(
                company=company,
                is_active=True,
                deal_id__in=operational_deal_ids,
            )
            .select_related("deal")
            .order_by("-severity", "-first_seen_at")
        )

        now = timezone.now()
        day_start, _ = local_today_window(now=now)
        health = {
            "overdue_count": task_qs.overdue().count(),
            "open_count": task_qs.open_tasks().count(),
            "completed_today": self._base_queryset()
            .filter(
                assigned_to=user,
                is_completed=True,
                completed_at__gte=day_start,
            )
            .count(),
            "snoozed_count": task_qs.snoozed().count(),
        }

        ctx = {"request": request}
        return Response(
            {
                "tasks": {
                    "overdue": TaskSerializer(task_qs.overdue(), many=True, context=ctx).data,
                    "today": TaskSerializer(task_qs.today(now=now), many=True, context=ctx).data,
                    "upcoming": TaskSerializer(
                        task_qs.upcoming(now=now), many=True, context=ctx
                    ).data,
                },
                "signals": DealSignalSerializer(signals, many=True).data,
                "health": WorkspaceHealthSerializer(health).data,
            }
        )

    @action(detail=True, methods=["post"])
    def snooze(self, request, pk=None):
        task = self.get_object()
        if not user_can_edit_task(request.user, request.membership, task):
            return Response({"detail": "You cannot edit this task."}, status=status.HTTP_403_FORBIDDEN)

        until_str = request.data.get("until")
        if not until_str:
            return Response(
                {"error": '"until" datetime is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        until = parse_datetime(until_str)
        if until is None:
            return Response(
                {"error": "Invalid datetime format. Use ISO 8601."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.is_naive(until):
            until = timezone.make_aware(until, timezone.get_current_timezone())
        if until <= timezone.now():
            return Response(
                {"error": '"until" must be in the future'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        TaskService.snooze(task=task, until=until)
        return Response(
            {
                "status": "snoozed",
                "until": until.isoformat(),
                "task": TaskSerializer(task, context={"request": request}).data,
            }
        )

    @action(detail=True, methods=["post"])
    def unsnooze(self, request, pk=None):
        task = self.get_object()
        if not user_can_edit_task(request.user, request.membership, task):
            return Response({"detail": "You cannot edit this task."}, status=status.HTTP_403_FORBIDDEN)
        task.snoozed_until = None
        task.save(update_fields=["snoozed_until", "updated_at"])
        return Response(TaskSerializer(task, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def archived(self, request):
        qs = self.get_queryset()[:50]
        return Response(TaskSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def snoozed(self, request):
        qs = self.get_queryset()
        return Response(TaskSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        if not user_can_complete_task(request.user, request.membership, task):
            return Response({"detail": "You cannot complete this task."}, status=status.HTTP_403_FORBIDDEN)
        if task.is_completed:
            ser = TaskSerializer(task, context={"request": request})
            return Response(ser.data)
        task.is_completed = True
        task.completed_at = timezone.now()
        task.completed_by = request.user
        task.save(update_fields=["is_completed", "completed_at", "completed_by", "updated_at"])
        ser = TaskSerializer(task, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        task = self.get_object()
        if not user_can_edit_task(request.user, request.membership, task):
            return Response({"detail": "You cannot edit this task."}, status=status.HTTP_403_FORBIDDEN)
        if task.is_completed:
            return Response(
                {"detail": "Completed tasks cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.cancel(reason=request.data.get("reason") or "user_cancelled")
        return Response(TaskSerializer(task, context={"request": request}).data)
