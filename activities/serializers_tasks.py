from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from companies.models import CompanyMember
from deals.operational import is_operational_deal
from deals.visibility import get_visible_deals

from deals.models import DealSignal

from .models import Activity
from .task_service import TaskService
from .task_state import task_ui_bucket
from .task_status import is_automation_task

User = get_user_model()


class TaskSerializer(serializers.ModelSerializer):
    """Read/update representation for CRM tasks (Activity.type == task)."""

    author_email = serializers.EmailField(source="author.email", read_only=True)
    assigned_to_email = serializers.EmailField(
        source="assigned_to.email", read_only=True, allow_null=True
    )
    completed_by_email = serializers.EmailField(
        source="completed_by.email", read_only=True, allow_null=True
    )
    deal_title = serializers.CharField(source="deal.title", read_only=True, allow_null=True)
    client_name = serializers.CharField(source="client.name", read_only=True, allow_null=True)
    state = serializers.SerializerMethodField()
    is_snoozed = serializers.SerializerMethodField()
    is_visible = serializers.SerializerMethodField()
    deal_closed_warning = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            "id",
            "deal",
            "client",
            "author",
            "author_email",
            "assigned_to",
            "assigned_to_email",
            "completed_by",
            "completed_by_email",
            "type",
            "category",
            "auto_type",
            "automation_key",
            "content",
            "due_date",
            "priority",
            "is_completed",
            "is_manually_modified",
            "snoozed_until",
            "is_snoozed",
            "archived_at",
            "is_visible",
            "completed_at",
            "created_at",
            "updated_at",
            "deal_title",
            "client_name",
            "state",
            "deal_closed_warning",
        ]
        read_only_fields = [
            "author",
            "author_email",
            "type",
            "created_at",
            "updated_at",
            "completed_by",
            "completed_by_email",
            "completed_at",
            "archived_at",
            "deal_title",
            "client_name",
            "state",
            "automation_key",
            "is_snoozed",
            "is_visible",
            "deal_closed_warning",
        ]

    def get_deal_closed_warning(self, obj: Activity) -> str | None:
        if obj.deal_id and obj.deal and not is_operational_deal(obj.deal):
            return "Deal closed"
        return None

    def get_state(self, obj: Activity) -> str:
        return task_ui_bucket(obj)

    def get_is_snoozed(self, obj: Activity) -> bool:
        return bool(obj.snoozed_until and timezone.now() < obj.snoozed_until)

    def get_is_visible(self, obj: Activity) -> bool:
        return obj.is_visible_in_operational_ui

    def validate_deal(self, value):
        request = self.context.get("request")
        if request is None or not hasattr(request, "company") or request.company is None:
            return value
        if value.company_id != request.company.id:
            raise serializers.ValidationError("Deal does not belong to your company.")
        membership = getattr(request, "membership", None)
        vis = get_visible_deals(request.user, request.company, membership).filter(
            pk=value.pk
        ).exists()
        if not vis:
            raise serializers.ValidationError("Deal is not accessible for your membership.")
        return value

    def validate_client(self, value):
        request = self.context.get("request")
        if request is None or not hasattr(request, "company") or request.company is None:
            return value
        if value.company_id != request.company.id:
            raise serializers.ValidationError("Client does not belong to your company.")
        return value

    def validate_assigned_to(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        company = getattr(request, "company", None)
        if company is None:
            return value
        if not CompanyMember.objects.filter(
            company=company, user=value, is_active=True
        ).exists():
            raise serializers.ValidationError("User is not an active member of this company.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        instance = getattr(self, "instance", None)
        if instance is None:
            deal = attrs.get("deal")
            client = attrs.get("client")
            if deal is None and client is None:
                raise serializers.ValidationError(
                    "Provide at least one target: deal or client."
                )
            if deal is not None and client is not None:
                if deal.client_id != client.id:
                    raise serializers.ValidationError(
                        {"client": "Client does not match selected deal."}
                    )
            elif deal is not None and client is None:
                attrs["client"] = deal.client
            attrs["type"] = Activity.Type.TASK
            return attrs

        if instance.type != Activity.Type.TASK:
            raise serializers.ValidationError({"type": "Only tasks can be updated here."})
        return attrs

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if is_automation_task(instance):
            TaskService.mark_manually_modified(instance)
        if "is_completed" in validated_data:
            if validated_data["is_completed"] and not instance.is_completed:
                validated_data["completed_at"] = timezone.now()
                validated_data["completed_by"] = user
            elif not validated_data["is_completed"]:
                validated_data["completed_at"] = None
                validated_data["completed_by"] = None
        return super().update(instance, validated_data)


class DealSignalSerializer(serializers.ModelSerializer):
    deal_title = serializers.CharField(source="deal.title", read_only=True)
    message = serializers.SerializerMethodField()
    tier = serializers.SerializerMethodField()
    suggested_actions = serializers.SerializerMethodField()

    class Meta:
        model = DealSignal
        fields = [
            "id",
            "signal_type",
            "severity",
            "is_active",
            "deal",
            "deal_title",
            "metadata",
            "message",
            "tier",
            "suggested_actions",
            "first_seen_at",
            "last_checked_at",
        ]
        read_only_fields = fields

    def _meta(self, obj: DealSignal) -> dict:
        return obj.metadata if isinstance(obj.metadata, dict) else {}

    def get_message(self, obj: DealSignal) -> str:
        meta = self._meta(obj)
        return str(meta.get("message") or "")

    def get_tier(self, obj: DealSignal) -> int | None:
        meta = self._meta(obj)
        if obj.signal_type == DealSignal.SignalType.INACTIVE:
            return int(meta.get("tier") or 0) or None
        return None

    def get_suggested_actions(self, obj: DealSignal) -> list:
        meta = self._meta(obj)
        actions = meta.get("suggested_actions")
        if isinstance(actions, list):
            return actions
        if obj.signal_type == DealSignal.SignalType.INACTIVE:
            from deals.inactivity import SUGGESTED_ACTIONS

            return list(SUGGESTED_ACTIONS)
        return []


class WorkspaceHealthSerializer(serializers.Serializer):
    overdue_count = serializers.IntegerField()
    open_count = serializers.IntegerField()
    completed_today = serializers.IntegerField()
    snoozed_count = serializers.IntegerField()


class TaskWriteSerializer(TaskSerializer):
    """POST /tasks/ — minimal writable fields."""

    class Meta(TaskSerializer.Meta):
        fields = ["deal", "client", "content", "due_date", "priority", "assigned_to"]
        read_only_fields = []

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["author"] = user
        validated_data["type"] = Activity.Type.TASK
        validated_data.setdefault("category", "manual")
        if validated_data.get("assigned_to") is None:
            validated_data["assigned_to"] = user
        return Activity.objects.create(**validated_data)
