from django.db import models
from users.models import BaseModel, User
from ckeditor.fields import RichTextField
from django.conf import settings

class Category(BaseModel):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class JobPost(BaseModel):
    title = models.CharField(max_length=255)
    description = RichTextField()
    salary = models.CharField( max_length=100, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    location = models.CharField(max_length=255)
    deadline = models.DateField(null=True, blank=True)
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_jobs', blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='job_posts')
    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_posts')
    is_featured = models.BooleanField(default=False)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Job Post'
        verbose_name_plural = 'Job Posts'

