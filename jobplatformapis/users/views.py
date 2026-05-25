from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User, Notification # 🔴 Đã import thêm Notification
from .serializers import UserSerializer, NotificationSerializer # 🔴 Đã import thêm NotificationSerializer
from rest_framework.parsers import MultiPartParser, JSONParser

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, JSONParser]

    @action(methods=['get', 'patch'], detail=False, url_path='current-user', permission_classes=[permissions.IsAuthenticated])
    def current_user(self, request):
        user = request.user

        if request.method == 'PATCH':
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

# 🔴 THÊM CLASS XỬ LÝ API THÔNG BÁO HỆ THỐNG (ĐỂ APP LẤY DỮ LIỆU)
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Lọc ra các thông báo hệ thống của user đang đăng nhập, xếp mới nhất lên đầu
        return Notification.objects.filter(user=self.request.user).order_by('-created_date')