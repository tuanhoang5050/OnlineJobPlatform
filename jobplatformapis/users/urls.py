from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='users')
router.register('notifications', views.NotificationViewSet, basename='notifications')
router.register('transactions', views.TransactionViewSet, basename='transactions')
urlpatterns = [
    path('users/create-paypal/', views.create_paypal_payment, name='create_paypal'),
    path('users/execute-paypal/', views.execute_paypal_payment, name='execute_paypal'),

    path('users/create-momo/', views.create_momo_payment, name='create_momo'),
    path('users/execute-momo/', views.execute_momo_payment, name='execute_momo'),
    path('', include(router.urls)),

    # 🔴 ĐĂNG KÝ 2 API PAYPAL MỚI

]