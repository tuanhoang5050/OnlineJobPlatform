from django.contrib import admin
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from .models import Category, JobPost

class JobPostForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget)

    class Meta:
        model = JobPost
        fields = '__all__'

@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    form = JobPostForm
    list_display = ('title', 'employer', 'category', 'salary', 'active')
    search_fields = ('title',)
    list_filter = ('category', 'employer')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_date', 'active')
    search_fields = ('name',)