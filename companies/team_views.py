"""Team management API: members CRUD + invite (can_manage_team)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.permissions import CanManageTeam, HasCompany

from .models import CompanyMember, CompanyRole, Invitation
from .team_serializers import (
    TeamInviteSerializer,
    TeamMemberReadSerializer,
    TeamMemberUpdateSerializer,
)
from .utils import check_user_limit

User = get_user_model()


def _pending_invitations(company):
    rows = Invitation.objects.filter(
        company=company, is_accepted=False, expires_at__gte=timezone.now()
    ).order_by("-created_at")
    out = []
    for inv in rows:
        out.append(
            {
                "email": inv.email,
                "role": inv.role,
                "expires_at": inv.expires_at.isoformat(),
                "token": str(inv.token),
                "created_at": inv.created_at.isoformat(),
            }
        )
    return out


class TeamMembersListView(APIView):
    permission_classes = [IsAuthenticated, HasCompany, CanManageTeam]

    def get(self, request):
        company = request.company
        qs = (
            CompanyMember.objects.filter(company=company)
            .select_related("user")
            .order_by("created_at", "id")
        )
        return Response(
            {
                "members": TeamMemberReadSerializer(qs, many=True).data,
                "pending_invites": _pending_invitations(company),
            }
        )


class TeamMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, HasCompany, CanManageTeam]

    def get_object(self, request, pk: int) -> CompanyMember:
        try:
            return CompanyMember.objects.select_related("user").get(
                pk=pk, company=request.company
            )
        except CompanyMember.DoesNotExist as e:
            raise NotFound("Team member not found.") from e

    def patch(self, request, pk: int):
        member = self.get_object(request, pk)
        ser = TeamMemberUpdateSerializer(member, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(TeamMemberReadSerializer(member).data)

    def delete(self, request, pk: int):
        member = self.get_object(request, pk)
        if member.role == CompanyRole.OWNER:
            raise PermissionDenied("Cannot remove an owner from the team.")
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamInviteView(APIView):
    """
    POST /api/team/invite/
    — пользователь с email уже есть: сразу добавить в компанию;
    — нет: создать Invitation (как раньше), без отправки email.
    """

    permission_classes = [IsAuthenticated, HasCompany, CanManageTeam]

    def post(self, request):
        ser = TeamInviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"].strip().lower()
        role = ser.validated_data["role"]
        company = request.company

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            if user:
                if CompanyMember.objects.filter(user=user, company=company).exists():
                    raise ValidationError(
                        {"email": "This user is already a member of the company."}
                    )
                check_user_limit(company)
                CompanyMember.objects.create(
                    user=user,
                    company=company,
                    role=role,
                    invited_by=request.user,
                )
                m = CompanyMember.objects.get(user=user, company=company)
                return Response(
                    {
                        "status": "attached",
                        "member": TeamMemberReadSerializer(m).data,
                    },
                    status=status.HTTP_201_CREATED,
                )

            dup_pending = Invitation.objects.filter(
                email__iexact=email,
                company=company,
                is_accepted=False,
                expires_at__gte=timezone.now(),
            ).exists()
            if dup_pending:
                raise ValidationError(
                    {"email": "An active invitation already exists for this email."}
                )

            check_user_limit(company)
            invitation = Invitation.objects.create(
                email=email,
                company=company,
                role=role,
                expires_at=timezone.now() + timedelta(days=7),
            )

        return Response(
            {
                "status": "invited",
                "message": "Invitation created. Share the token with the invitee.",
                "token": str(invitation.token),
                "expires_at": invitation.expires_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )
