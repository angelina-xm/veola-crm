from rest_framework import serializers

from .models import Activity


def _is_manager_or_owner(request):
    m = getattr(request, "membership", None) if request else None
    return m and m.role in ("owner", "manager")


class ActivitySerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = Activity
        fields = [
            "id",
            "deal",
            "author",
            "author_email",
            "type",
            "content",
            "due_date",
            "is_completed",
            "created_at",
        ]
        read_only_fields = ["author", "created_at"]

    def validate_deal(self, value):
        request = self.context.get("request")
        if request is None or not hasattr(request, "company") or request.company is None:
            return value
        if value.company_id != request.company.id:
            raise serializers.ValidationError("Deal does not belong to your company.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        request = self.context.get("request")

        if instance is None:
            if attrs.get("type") != Activity.Type.TASK:
                attrs["is_completed"] = False
            return attrs

        merged_type = attrs.get("type", instance.type)
        if "is_completed" in attrs and merged_type != Activity.Type.TASK:
            raise serializers.ValidationError(
                {"is_completed": "is_completed applies only to tasks."}
            )

        if not _is_manager_or_owner(request):
            if set(attrs.keys()) != {"is_completed"}:
                raise serializers.ValidationError(
                    "Only the task completion flag can be updated."
                )
            if instance.type != Activity.Type.TASK:
                raise serializers.ValidationError(
                    {"is_completed": "is_completed applies only to tasks."}
                )

        return attrs
