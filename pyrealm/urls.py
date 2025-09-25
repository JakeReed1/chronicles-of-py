"""
URL configuration for pyrealm project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.core.views import HomeView

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include('apps.api.urls')),
    
    # App-specific URLs
    path('battles/', include('apps.battles.urls')),
    path('characters/', include('apps.characters.urls')),
    path('world/', include('apps.world.urls')),
    path('lessons/', include('apps.lessons.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
