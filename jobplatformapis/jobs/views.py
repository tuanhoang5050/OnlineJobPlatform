from rest_framework.response import Response
from rest_framework import viewsets, filters, permissions, status
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied  # 🔴 Thêm import này
from applications.serializers import ApplicationSerializer
from .models import Category, JobPost
from .serializers import CategorySerializer, JobPostSerializer
from applications.models import Application


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.employer == request.user


class JobPostFilter(django_filters.FilterSet):
    ids = django_filters.BaseInFilter(field_name='id', lookup_expr='in')

    class Meta:
        model = JobPost
        fields = ['category']


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(active=True)
    serializer_class = CategorySerializer


class JobPostViewSet(viewsets.ModelViewSet):
    queryset = JobPost.objects.filter(active=True).order_by('-created_date')
    serializer_class = JobPostSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobPostFilter
    search_fields = ['title', 'description']
    ordering_fields = ['salary', 'created_date']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        # 🔴 LỚP KHIÊN BẢO MẬT: Chặn đăng tin nếu chưa được Admin phê duyệt
        if not self.request.user.is_verified:
            raise PermissionDenied("Tài khoản của bạn chưa được Quản trị viên phê duyệt. Không thể đăng tin.")

        serializer.save(employer=self.request.user)

    @action(methods=['post'], detail=True, url_path='like', permission_classes=[permissions.IsAuthenticated])
    def like_job(self, request, pk=None):
        job = self.get_object()
        user = request.user
        if user in job.likes.all():
            job.likes.remove(user)
            return Response({'detail': 'Bỏ yêu thích', 'liked': False}, status=status.HTTP_200_OK)
        else:
            job.likes.add(user)
            return Response({'detail': 'Đã yêu thích công việc', 'liked': True}, status=status.HTTP_200_OK)

    @action(methods=['post'], detail=True, url_path='apply', permission_classes=[permissions.IsAuthenticated])
    def apply_job(self, request, pk=None):
        user_role = str(request.user.role).strip().upper()
        if user_role != 'CANDIDATE':
            return Response({'detail': 'Chỉ ứng viên mới được nộp cv'}, status=status.HTTP_403_FORBIDDEN)

        job = self.get_object()
        if Application.objects.filter(job=job, candidate=request.user).exclude(status=3).exists():
            return Response({'detail': 'Bạn đã nộp cv vào công việc này và đơn đang được xử lý.'},
                            status=status.HTTP_400_BAD_REQUEST)

        file_nhan_duoc = request.data.get('cv')
        noidung_thu = request.data.get('content', '')

        application = Application.objects.create(
            job=job,
            candidate=request.user,
            cv_file=file_nhan_duoc,
            content=noidung_thu,
        )
        return Response({'detail': 'Nộp cv thành công'}, status=status.HTTP_201_CREATED)

    @action(methods=['get'], detail=True, url_path='applications')
    def get_applications(self, request, pk=None):
        job = self.get_object()
        if request.user != job.employer:
            return Response(
                {'detail': 'Bạn không phải là chủ của bài đăng, không được xem cv'},
                status=status.HTTP_403_FORBIDDEN
            )
        hoso_list = job.applications.all()
        serializer = ApplicationSerializer(hoso_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)