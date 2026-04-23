from rest_framework import serializers
from django.contrib.auth import get_user_model
from companies.models import Company, Membership

User = get_user_model()


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