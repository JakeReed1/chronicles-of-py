from django.urls import path
from . import views

app_name = 'battles'

urlpatterns = [
    path('', views.BattleView.as_view(), name='battle'),
    path('action/', views.BattleActionView.as_view(), name='battle_action'),
]