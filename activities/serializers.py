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
            "client",
            "author",
            "author_email",
            "type",
            "category",
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

    def validate_client(self, value):
        request = self.context.get("request")
        if request is None or not hasattr(request, "company") or request.company is None:
            return value
        if value.company_id != request.company.id:
            raise serializers.ValidationError("Client does not belong to your company.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        request = self.context.get("request")

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
