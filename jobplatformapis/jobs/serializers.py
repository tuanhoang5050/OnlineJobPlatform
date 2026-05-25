from rest_framework import serializers
from .models import Category, JobPost

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class JobPostSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    # 🎯 THÊM TRƯỜNG NÀY ĐỂ LẤY AVATAR CỦA NHÀ TUYỂN DỤNG TỪ CLOUDINARY
    employer_avatar = serializers.SerializerMethodField()

    class Meta:
        model = JobPost
        fields = [
            'id', 'title', 'description', 'salary', 'category',
            'employer', 'created_date', 'location', 'employer_name',
            'employer_avatar', 'deadline'
        ]
        extra_kwargs = {
            'employer': {'read_only': True}
        }

    # Hàm tự động lấy link ảnh tuyệt đối từ Cloudinary
    def get_employer_avatar(self, obj):
        if obj.employer and obj.employer.avatar:
            return obj.employer.avatar.url
        return None