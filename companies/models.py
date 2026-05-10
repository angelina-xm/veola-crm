import uuid
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class CompanyRole(models.TextChoices):
    OWNER = "owner", "Owner"
    MANAGER = "manager", "Manager"
    EMPLOYEE = "employee", "Employee"
# приглашения 
class Invitation(models.Model):
    email = models.EmailField()
    company = models.ForeignKey("Company", on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=CompanyRole.choices)

    token = models.UUIDField(default=uuid.uuid4, unique=True)

    is_accepted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        unique_together = ('email', 'company', 'is_accepted')

    def __str__(self):
        return f"{self.email} ({self.company.name})"
# конец

PLAN_CHOICES = (
    ("free", "Free"),
    ("pro", "Pro"),
    ("business", "Business"),
)


class Company(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    max_users = models.IntegerField(default=5)


    def save(self, *args, **kwargs):
        creating = self._state.adding
        if self.plan == "free":
            self.max_users = 5
        elif self.plan == "pro":
            self.max_users = 20
        elif self.plan == "business":
            self.max_users = 999999

        super().save(*args, **kwargs)
        if creating:
            CompanySettings.objects.get_or_create(company=self)

    def __str__(self):
        return self.name


class CompanyMember(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=CompanyRole.choices)
    is_active = models.BooleanField(default=True)

    # RBAC: флаги доступа (роль = пресет при создании; дальше можно расширять UI)
    can_view_all_deals = models.BooleanField(default=False)
    can_create_deals = models.BooleanField(default=False)
    can_edit_all_deals = models.BooleanField(default=False)
    can_delete_deals = models.BooleanField(default=False)
    can_manage_team = models.BooleanField(default=False)
    can_manage_automations = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)

    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invited_company_memberships",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'company')

    def __str__(self):
        return f"{self.user} - {self.company} ({self.role})"

    def save(self, *args, **kwargs):
        if self._state.adding:
            apply_role_permission_defaults(self)
        super().save(*args, **kwargs)


def apply_role_permission_defaults(member: "CompanyMember") -> None:
    """Пресеты по роли при создании записи (OWNER = всё True)."""
    role = member.role
    if role == CompanyRole.OWNER:
        member.can_view_all_deals = True
        member.can_create_deals = True
        member.can_edit_all_deals = True
        member.can_delete_deals = True
        member.can_manage_team = True
        member.can_manage_automations = True
        member.can_view_analytics = True
    elif role == CompanyRole.MANAGER:
        member.can_view_all_deals = False
        member.can_create_deals = True
        member.can_edit_all_deals = False
        member.can_delete_deals = False
        member.can_manage_team = False
        member.can_manage_automations = False
        member.can_view_analytics = True
    elif role == CompanyRole.EMPLOYEE:
        member.can_view_all_deals = False
        member.can_create_deals = True
        member.can_edit_all_deals = False
        member.can_delete_deals = False
        member.can_manage_team = False
        member.can_manage_automations = False
        member.can_view_analytics = False


class CompanySettings(models.Model):
    company = models.OneToOneField(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="settings",
    )
    auto_follow_up = models.BooleanField(default=True)
    auto_discount = models.BooleanField(default=True)
    auto_reorder = models.BooleanField(default=True)

    def __str__(self):
        return f"Settings for {self.company.name}"