"""Регрессия: создание сделок зависит только от can_create_deals, не от имени роли."""

from django.test import TestCase

from companies.models import Company, CompanyMember, CompanyRole
from companies.permissions import can_create_deals
from users.models import User


class DealCreatePermissionTest(TestCase):
    def test_employee_can_create_when_flag_true(self):
        company = Company.objects.create(name="Co")
        user = User.objects.create_user(
            username="emp1", email="emp1@example.com", password="pass12345"
        )
        CompanyMember.objects.create(
            user=user,
            company=company,
            role=CompanyRole.EMPLOYEE,
        )
        m = CompanyMember.objects.get(user=user, company=company)
        self.assertTrue(m.can_create_deals)
        self.assertTrue(can_create_deals(m))

    def test_employee_cannot_create_when_flag_false(self):
        company = Company.objects.create(name="Co2")
        user = User.objects.create_user(
            username="emp2", email="emp2@example.com", password="pass12345"
        )
        CompanyMember.objects.create(
            user=user,
            company=company,
            role=CompanyRole.EMPLOYEE,
        )
        CompanyMember.objects.filter(user=user, company=company).update(
            can_create_deals=False
        )
        m = CompanyMember.objects.get(user=user, company=company)
        self.assertFalse(m.can_create_deals)
        self.assertFalse(can_create_deals(m))
