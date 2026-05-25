from django.contrib import admin
from django.utils.html import mark_safe
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_verified', 'display_avatar')
    readonly_fields = ['display_avatar']

    def display_avatar(self, user):
        if user.avatar:
            return mark_safe(f'<img src="{user.avatar.url}" width="50" height="50" style="border-radius: 50%;" />')
        return "Chưa có ảnh"