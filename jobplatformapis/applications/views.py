from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Application
from .serializers import ApplicationSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'CANDIDATE':
            return Application.objects.filter(candidate=user).order_by('-id')
        elif user.role == 'EMPLOYER':
            return Application.objects.filter(job__employer=user).order_by('-id')
        return Application.objects.none()

    @action(methods=['patch'], detail=True, url_path='change-status')
    def change_status(self, request, pk=None):
        if request.user.role != 'EMPLOYER':
            return Response({'detail': 'Chỉ nhà tuyển dụng mới được duyệt cv'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()

        new_status = request.data.get('status')

        if new_status is None:
            return Response({'detail': 'Vui lòng cung cấp trạng thái '}, status=status.HTTP_400_BAD_REQUEST)

        application.status = new_status
        application.save()

        return Response({'detail': f'Đã cập nhật trạng thái cv thành {new_status}'}, status=status.HTTP_200_OK)