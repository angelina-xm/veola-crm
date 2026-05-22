from rest_framework import serializers

from .models import Client, ClientContact, ClientProductLink, Product


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
            "relationship_owner",
            "email",
            "phone",
            "industry",
            "market_sector",
            "description",
            "products_services",
            "internal_context",
            "website",
            "company_size",
            "last_conversation_topic",
            "last_conversation_mood",
            "last_conversation_outcome",
            "next_step",
            "relationship_concerns",
            "relationship_context",
            "follow_up_on",
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
            "relationship_owner",
            "email",
            "phone",
            "industry",
            "market_sector",
            "description",
            "products_services",
            "internal_context",
            "website",
            "company_size",
            "last_conversation_topic",
            "last_conversation_mood",
            "last_conversation_outcome",
            "next_step",
            "relationship_concerns",
            "relationship_context",
            "follow_up_on",
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


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "product_type",
            "category",
            "default_price",
            "description",
            "sku",
            "tags",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_tags(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list of strings.")
        return [str(t).strip() for t in value if str(t).strip()][:20]


class ProductProfileSerializer(serializers.Serializer):
    product = serializers.DictField()
    stats = serializers.DictField()
    clients_by_relationship = serializers.DictField()
    recent_deals = serializers.ListField()


class ClientProductLinkSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ClientProductLink
        fields = [
            "id",
            "product",
            "product_id",
            "relationship",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "product"]


class ClientInteractionSerializer(serializers.Serializer):
    interaction_type = serializers.ChoiceField(
        choices=["note", "call", "meeting", "follow_up"]
    )
    content = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.CharField(required=False, allow_blank=True, default="")
    topic = serializers.CharField(required=False, allow_blank=True, default="")
    mood = serializers.CharField(required=False, allow_blank=True, default="")
    outcome = serializers.CharField(required=False, allow_blank=True, default="")
    next_step = serializers.CharField(required=False, allow_blank=True, default="")
    schedule_follow_up = serializers.BooleanField(required=False, default=False)
    follow_up_content = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    follow_up_due = serializers.DateTimeField(required=False, allow_null=True)
    concerns = serializers.CharField(required=False, allow_blank=True, default="")
    relationship_context = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    follow_up_on = serializers.DateField(required=False, allow_null=True)


class ClientProfileSerializer(serializers.Serializer):
    client = serializers.DictField()
    business_context = serializers.DictField()
    contacts = serializers.ListField()
    has_primary_contact = serializers.BooleanField()
    primary_contact = serializers.DictField(allow_null=True)
    relationship_memory = serializers.DictField()
    products = serializers.ListField()
    metrics = serializers.DictField()
    operational = serializers.DictField()
    relationship_intelligence = serializers.DictField()
