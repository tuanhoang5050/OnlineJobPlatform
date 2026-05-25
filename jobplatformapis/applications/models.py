from django.db import models
from users.models import BaseModel, User
from jobs.models import JobPost


class Application(BaseModel):
    job = models.ForeignKey(JobPost, on_delete=models.CASCADE, related_name='applications')
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    cv_file = models.FileField(upload_to='cvs/%Y/%m/')
    content = models.TextField(blank=True)

    STATUS_CHOICES = [
        (0, 'Đang chờ'),
        (1, 'Đã xem'),
        (2, 'Đã nhận'),
        (3, 'Từ chối')
    ]
    status = models.IntegerField(choices=STATUS_CHOICES, default=0)

    def __str__(self):
        return f"{self.candidate.username} - {self.job.title}"