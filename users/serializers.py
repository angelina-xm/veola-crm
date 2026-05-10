from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from companies.models import Company, CompanyMember, CompanyRole

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Тело запроса: { "email", "password" }.
    У модели User USERNAME_FIELD = email — вход только по email, не по Django username.
    Ответ: { "access", "refresh", "company_id" } — company_id первая компания пользователя (для X-Company-ID).
    """

    email = serializers.EmailField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(User.USERNAME_FIELD, None)

    def validate(self, attrs):
        attrs[User.USERNAME_FIELD] = attrs.pop("email")
        data = super().validate(attrs)
        cid = (
            CompanyMember.objects.filter(user=self.user, is_active=True)
            .order_by("id")
            .values_list("company_id", flat=True)
            .first()
        )
        if cid is not None:
            data["company_id"] = cid
        return data


class RegisterSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'company_name']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        company_name = validated_data.pop('company_name')

        user = User.objects.create_user(**validated_data)

        company = Company.objects.create(name=company_name)

        CompanyMember.objects.create(
            user=user,
            company=company,
            role=CompanyRole.OWNER,
            invited_by=None,
        )

        return user