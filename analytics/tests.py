from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from clients.models import Client
from companies.models import Company, CompanyMember, CompanyRole
from deals.models import Deal, PipelineStage

from .services.v1_dashboard import build_analytics_v1_free

User = get_user_model()


class AnalyticsV1OverviewQueryTest(TestCase):
    """Regression: team aggregation must not nest MAX(activities) inside GROUP BY."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="owner-analytics@test.com",
            username="owner-analytics",
            password="test-pass-123",
        )
        self.company = Company.objects.create(name="Analytics Co")
        self.member = CompanyMember.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.OWNER,
        )
        self.stage = PipelineStage.objects.create(
            company=self.company, name="Lead", order=1
        )
        self.client = Client.objects.create(
            company=self.company, name="Client A", email="client@test.com"
        )
        Deal.objects.create(
            company=self.company,
            client=self.client,
            title="Deal one",
            amount=Decimal("100.00"),
            stage=self.stage,
            created_by=self.user,
        )

    def test_build_overview_completes_with_team_aggregation(self):
        payload = build_analytics_v1_free(
            user=self.user,
            company=self.company,
            membership=self.member,
            granularity="week",
        )
        self.assertEqual(payload["kpis"]["visible_deals_total"], 1)
        self.assertIn("team_performance", payload)
        self.assertIsInstance(payload["team_performance"], list)
