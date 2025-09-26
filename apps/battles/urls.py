from django.urls import path
from . import views
from . import api_views

app_name = 'battles'

urlpatterns = [
    path('execute-code/', api_views.execute_python_code, name='execute_code'),
    path('', views.BattleView.as_view(), name='battle'),
]