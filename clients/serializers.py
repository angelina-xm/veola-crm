from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"
        read_only_fields = ["company"]


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


class ClientTimelineSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    client_name = serializers.CharField()
    summary = ClientTimelineSummarySerializer()
    events = TimelineEventSerializer(many=True)
