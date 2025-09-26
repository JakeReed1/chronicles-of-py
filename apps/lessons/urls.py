from django.urls import path
from . import views

app_name = 'lessons'

urlpatterns = [
    path('', views.LessonListView.as_view(), name='list'),
    path('<int:pk>/', views.LessonDetailView.as_view(), name='detail'),
    path('challenge/<int:pk>/', views.ChallengeView.as_view(), name='challenge'),
    path('challenge/<int:challenge_id>/submit/', views.SubmitSolutionView.as_view(), name='submit'),
]