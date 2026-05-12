"""DRF serializers for analytics (query params + future typed responses for PRO)."""

from rest_framework import serializers


class AnalyticsV1OverviewQuerySerializer(serializers.Serializer):
    granularity = serializers.ChoiceField(
        choices=("week", "month"),
        default="week",
        required=False,
    )
