from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='users')
router.register('notifications', views.NotificationViewSet, basename='notifications') # 🔴 Đã đăng ký API mới

urlpatterns = [
    path('', include(router.urls)),
]