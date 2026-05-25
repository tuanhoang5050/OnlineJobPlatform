"""
URL configuration for jobplatformapis project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="Sàn Việc Làm API",
      default_version='v1',
      description="Sàn Việc Làm (Job Platform)",
      contact=openapi.Contact(email="admin@sanvieclam.com"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('ckeditor/', include('ckeditor_uploader.urls')),

    # Dòng cấu hình API mới:
    path('api/', include('jobs.urls')),
    path('api/', include('users.urls')),
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('api/', include('applications.urls')),
path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

CLIENT_ID = 'JZWc5J5NnMtaPWAiJfpY6Ac78w75whDHXXCeHw56'
CLIENT_SECRET = 'hU09yyT1uSP5RotZAHjD3YIAscPKuOuagkiUphDTdC3xsqMJUdIb1BcZ0AiebzGHBRB0PfeZg0lQ7HbF0Hjy5CqLLhgVkGK2rKYoiL5BMHdXXEuOg2znxQ75zdDjkl7R'
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

