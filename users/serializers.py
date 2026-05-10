from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from companies.models import Company, CompanyMember, CompanyRole

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Тело запроса: { "email", "password" }.
    У модели User USERNAME_FIELD = email — вход только по email, не по Django username.
    Ответ: access, refresh; при наличии членства — company_id для X-Company-ID.

    Важно: родительский TokenObtainSerializer добавляет USERNAME_FIELD как CharField.
    Нельзя делать fields.pop(USERNAME_FIELD) — поле исчезает, validate() падает с KeyError → 500.
    Заменяем на EmailField для корректной валидации адреса.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[User.USERNAME_FIELD] = serializers.EmailField(write_only=True)

    def validate(self, attrs):
        data = super().validate(attrs)
        cid = None
        try:
            cid = (
                CompanyMember.objects.filter(user=self.user, is_active=True)
                .order_by("id")
                .values_list("company_id", flat=True)
                .first()
            )
        except Exception:
            cid = None
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