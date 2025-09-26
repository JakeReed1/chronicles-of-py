"""
URL configuration for pyrealm project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.views import LogoutView
from django.shortcuts import render
from apps.core.views import HomeView, SignUpView, CustomLoginView, game_view
from apps.battles.api_views import execute_python_code

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('admin/', admin.site.urls),
    
    # Direct API endpoint for code execution
    path('api/execute-code/', execute_python_code, name='execute_code'),
    
    # Game URLs
    path('game/', game_view, name='game'),
    path('game/test/', lambda request: render(request, 'game_test.html'), name='game_test'),
    path('game/fullscreen/', lambda request: render(request, 'game_fullscreen.html'), name='game_fullscreen'),
    path('game/big/', lambda request: render(request, 'game_big.html'), name='game_big'),
    
    # Authentication URLs
    path('signup/', SignUpView.as_view(), name='signup'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(next_page='home'), name='logout'),
    
    # API endpoints
    path('api/', include('apps.api.urls')),
    path('api/battles/', include('apps.battles.urls')),
    
    # App-specific URLs
    path('characters/', include('apps.characters.urls')),
    path('world/', include('apps.world.urls')),
    path('lessons/', include('apps.lessons.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
