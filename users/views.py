from rest_framework import generics
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer, UsernameTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsernameTokenObtainPairSerializer


class LoginView(CustomTokenObtainPairView):
    pass

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]