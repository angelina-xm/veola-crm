from rest_framework import serializers

from .models import Client, ClientContact


class ClientContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientContact
        fields = [
            "id",
            "full_name",
            "role_title",
            "email",
            "phone",
            "preferred_contact_method",
            "notes",
            "is_primary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ClientSerializer(serializers.ModelSerializer):
    contacts = ClientContactSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            "id",
            "company",
            "name",
            "client_type",
            "relationship_status",
            "email",
            "phone",
            "industry",
            "description",
            "products_services",
            "website",
            "company_size",
            "last_conversation_topic",
            "last_conversation_mood",
            "last_conversation_outcome",
            "next_step",
            "last_conversation_at",
            "created_at",
            "updated_at",
            "contacts",
        ]
        read_only_fields = ["company", "created_at", "updated_at"]


class ClientWriteSerializer(serializers.ModelSerializer):
    """Create / patch — progressive enrichment; only name required."""

    class Meta:
        model = Client
        fields = [
            "name",
            "client_type",
            "relationship_status",
            "email",
            "phone",
            "industry",
            "description",
            "products_services",
            "website",
            "company_size",
            "last_conversation_topic",
            "last_conversation_mood",
            "last_conversation_outcome",
            "next_step",
            "last_conversation_at",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "client_type": {"required": False},
            "relationship_status": {"required": False},
        }


class TimelineEventSerializer(serializers.Serializer):
    id = serializers.CharField()
    kind = serializers.CharField()
    event_type = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField()
    body = serializers.CharField()
    occurred_at = serializers.DateTimeField()
    importance = serializers.CharField()
    filter_group = serializers.CharField()
    deal_id = serializers.IntegerField(allow_null=True)
    deal_title = serializers.CharField(allow_null=True, allow_blank=True)
    metadata = serializers.DictField()


class ClientTimelineSummarySerializer(serializers.Serializer):
    total_deals = serializers.IntegerField()
    open_deals = serializers.IntegerField()
    won_deals = serializers.IntegerField()
    lost_deals = serializers.IntegerField()
    total_won_revenue = serializers.FloatField()
    relationship_since = serializers.DateTimeField(allow_null=True)
    timeline_events = serializers.IntegerField()
    last_activity_at = serializers.DateTimeField(allow_null=True, required=False)
    average_deal_size = serializers.FloatField(required=False)


class ClientTimelineSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    client_name = serializers.CharField()
    summary = ClientTimelineSummarySerializer()
    events = TimelineEventSerializer(many=True)


class ClientProfileSerializer(serializers.Serializer):
    client = serializers.DictField()
    contacts = serializers.ListField()
    has_primary_contact = serializers.BooleanField()
    primary_contact = serializers.DictField(allow_null=True)
    relationship_memory = serializers.DictField()
    metrics = serializers.DictField()
    operational = serializers.DictField()
