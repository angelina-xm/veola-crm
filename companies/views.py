from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from django.utils import timezone
from datetime import timedelta



from .models import Invitation, Membership
from .serializers import InvitationCreateSerializer, AcceptInviteRegisterSerializer
from .utils import check_user_limit
from .permissions import can_invite
class InviteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("USER:", request.user)
        print("COMPANY:", request.company)
        print("MEMBERSHIP:", request.membership)

        membership = request.membership

        if not can_invite(membership):
         raise PermissionDenied("Only owner can invite users")
            

        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation = serializer.save(
            company=request.company,
            expires_at=timezone.now() + timedelta(days=2)
        )

        return Response({
            "message": "Invitation created",
            "token": str(invitation.token)
        })

class AcceptInviteView(APIView):  #  ВНЕ первого класса
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")

        if not token:
            raise PermissionDenied("Token is required")

        try:
            invitation = Invitation.objects.get(token=token)
        except Invitation.DoesNotExist:
            raise NotFound("Invitation not found")

        if invitation.is_accepted:
            raise PermissionDenied("Invitation already used")

        if invitation.expires_at < timezone.now():
            raise PermissionDenied("Invitation expired")

        if invitation.email != request.user.email:
            raise PermissionDenied("This invite is not for your email")
        check_user_limit(invitation.company)
        Membership.objects.create(
            user=request.user,
            company=invitation.company,
            role=invitation.role
        )

        invitation.is_accepted = True
        invitation.save()

        return Response({
            "message": "You joined the company"
        })
    
class AcceptInviteRegisterView(APIView):
    def post(self, request):
        serializer = AcceptInviteRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save()

        return Response({
            "message": "Account created and joined company"
        })
