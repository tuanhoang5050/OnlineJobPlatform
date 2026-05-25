from rest_framework import serializers
from .models import User, Notification # 🔴 Nhớ import Notification

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'username', 'password', 'email', 'role', 'avatar','sex', 'phone_number', 'location', 'company_name', 'is_verified']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.avatar:
            data['avatar'] = instance.avatar.url
        return data

    def get_avatar(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

# 🔴 THÊM SERIALIZER CHO THÔNG BÁO
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'type', 'created_date']