from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from deals.models import Deal

from .models import Client, ClientContact
from .profile import ClientProfileBuilder
from .serializers import (
    ClientContactSerializer,
    ClientProfileSerializer,
    ClientSerializer,
    ClientTimelineSerializer,
    ClientWriteSerializer,
)
from .timeline import CustomerTimelineBuilder
from .permissions import (
    HasCompany,
    CanCreateDeals,
    CanEditClientObject,
    CanDeleteClientObject,
)


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()

    def get_queryset(self):
        return Client.objects.filter(company=self.request.company).prefetch_related(
            "contacts"
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ClientWriteSerializer
        return ClientSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "timeline", "profile"):
            return [IsAuthenticated(), HasCompany()]

        elif self.action == "create":
            return [IsAuthenticated(), HasCompany(), CanCreateDeals()]

        elif self.action in ("update", "partial_update", "contacts", "contact_detail"):
            return [IsAuthenticated(), HasCompany(), CanEditClientObject()]

        elif self.action == "destroy":
            return [IsAuthenticated(), HasCompany(), CanDeleteClientObject()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

    @action(detail=True, methods=["get"], url_path="profile")
    def profile(self, request, pk=None):
        client = self.get_object()
        payload = ClientProfileBuilder(
            client=client,
            user=request.user,
            company=request.company,
            membership=getattr(request, "membership", None),
        ).build()
        return Response(ClientProfileSerializer(payload).data)

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        client = self.get_object()
        raw_filter = (request.query_params.get("filter") or "all").lower()
        allowed = ("all", "deals", "activities", "tasks", "calls", "notes")
        if raw_filter not in allowed:
            raw_filter = "all"
        payload = CustomerTimelineBuilder(
            client=client,
            user=request.user,
            company=request.company,
            membership=getattr(request, "membership", None),
        ).build(filter_group=raw_filter)
        return Response(ClientTimelineSerializer(payload).data)

    @action(detail=True, methods=["get", "post"], url_path="contacts")
    def contacts(self, request, pk=None):
        client = self.get_object()
        if request.method == "GET":
            qs = client.contacts.all()
            return Response(ClientContactSerializer(qs, many=True).data)
        ser = ClientContactSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        contact = ser.save(client=client)
        if contact.is_primary or not client.contacts.filter(is_primary=True).exists():
            contact.is_primary = True
            contact.save(update_fields=["is_primary"])
        return Response(
            ClientContactSerializer(contact).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"contacts/(?P<contact_id>[^/.]+)",
    )
    def contact_detail(self, request, pk=None, contact_id=None):
        client = self.get_object()
        try:
            contact = client.contacts.get(pk=contact_id)
        except ClientContact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if request.method == "DELETE":
            contact.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        ser = ClientContactSerializer(contact, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        if Deal.objects.filter(client=client).exists():
            return Response(
                {"detail": "Cannot delete client with deals"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
