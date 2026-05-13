from django.db.models import F, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from clients.permissions import HasCompany
from companies.permissions import can_create_deals

from .models import Activity
from .serializers_tasks import TaskSerializer, TaskWriteSerializer
from .task_permissions import user_can_complete_task, user_can_edit_task
from .task_query import visible_tasks_queryset
from .task_state import local_today_window


class CanCreateTasks(BasePermission):
    def has_permission(self, request, view):
        return can_create_deals(request.membership)


class TaskViewSet(viewsets.ModelViewSet):
    """
    CRM tasks (Activity rows with type=task).

    List filters: ?bucket=today|upcoming|overdue|completed
    My work queue: GET /tasks/my/ (same filters).
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

    def get_queryset(self):
        qs = visible_tasks_queryset(
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

        if getattr(self, "_my_tasks_scope", False):
            user = self.request.user
            qs = qs.filter(Q(assigned_to=user) | Q(assigned_to__isnull=True, author=user))

        bucket = (self.request.query_params.get("bucket") or "").lower()
        now = timezone.now()
        day_start, day_end = local_today_window(now=now)

        if bucket == "completed":
            return qs.filter(is_completed=True).order_by("-created_at", "-id")

        qs = qs.filter(is_completed=False)

        if bucket == "overdue":
            return qs.filter(due_date__isnull=False, due_date__lt=now).order_by("due_date", "id")
        if bucket == "today":
            # Calendar "today" in tenant TZ, and still actionable (not past due).
            return (
                qs.filter(due_date__gte=day_start, due_date__lt=day_end)
                .filter(due_date__gte=now)
                .order_by("due_date", "id")
            )
        if bucket == "upcoming":
            return qs.filter(Q(due_date__gte=day_end) | Q(due_date__isnull=True)).order_by(
                F("due_date").asc(nulls_last=True),
                "id",
            )
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

    @action(detail=True, methods=["post"], url_path="complete")
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
        task.save(update_fields=["is_completed", "completed_at", "completed_by"])
        ser = TaskSerializer(task, context={"request": request})
        return Response(ser.data)
