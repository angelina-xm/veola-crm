from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from companies.models import Company, Membership

User = get_user_model()


class UsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Тело запроса: { "username", "password" }.
    Значение username подставляется в USERNAME_FIELD модели (у нас — email).
    Ответ: { "access", "refresh" } (как у стандартного SimpleJWT).
    """

    username = serializers.CharField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(User.USERNAME_FIELD, None)

    def validate(self, attrs):
        attrs[User.USERNAME_FIELD] = attrs.pop("username")
        return super().validate(attrs)


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

        Membership.objects.create(
            user=user,
            company=company,
            role='owner'
        )

        return user