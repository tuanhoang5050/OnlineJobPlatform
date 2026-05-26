from django.db import models
from django.contrib.auth.models import AbstractUser
from cloudinary.models import CloudinaryField
from django.db.models.signals import pre_save
from django.dispatch import receiver

class BaseModel(models.Model):
    active = models.BooleanField(default=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class User(AbstractUser):
    avatar = CloudinaryField('avatar', null=True, blank=True)

    ROLE_CHOICES = [
        ('ADMIN', 'Quản trị viên'),
        ('EMPLOYER', 'Nhà tuyển dụng'),
        ('CANDIDATE', 'Ứng viên'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CANDIDATE')
    company_name = models.CharField(max_length=255, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_vip = models.BooleanField(default=False)

    SEX_CHOICES = [
        ('NAM', 'Nam'),
        ('NU', 'Nữ'),
        ('KHAC', 'Khác'),
    ]
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, null=True, blank=True)
    phone_number = models.CharField(max_length=15, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Notification(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    type = models.CharField(max_length=50)

    def __str__(self):
        return self.title

class Transaction(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    payment_id = models.CharField(max_length=100, unique=True) # Mã từ PayPal
    amount = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='CREATED') # CREATED, COMPLETED, FAILED

    def __str__(self):
        return f"{self.user.username} - {self.amount} - {self.status}"

@receiver(pre_save, sender=User)
def notify_admin_approval(sender, instance, **kwargs):
    if instance.id:
        try:
            old_user = User.objects.get(id=instance.id)

            if old_user.is_verified != instance.is_verified:
                if instance.is_verified:
                    Notification.objects.create(
                        user=instance,
                        title="Tài khoản đã được phê duyệt! 🎉",
                        body="Chúc mừng! Bạn đã được Quản trị viên phê duyệt. Bây giờ bạn có thể bắt đầu đăng tin tuyển dụng.",
                        type="SYSTEM_APPROVAL"
                    )
                else:
                    Notification.objects.create(
                        user=instance,
                        title="Tài khoản bị tạm ngưng phê duyệt",
                        body="Quyền đăng tin của bạn đã bị gỡ. Vui lòng liên hệ bộ phận CSKH để biết thêm chi tiết.",
                        type="SYSTEM_REVOKE"
                    )
        except User.DoesNotExist:
            pass