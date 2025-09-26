from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlayerViewSet, BattleViewSet, LocationViewSet,
    QuestViewSet, LessonViewSet
)

router = DefaultRouter()
router.register(r'players', PlayerViewSet, basename='player')
router.register(r'battles', BattleViewSet, basename='battle')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'quests', QuestViewSet, basename='quest')
router.register(r'lessons', LessonViewSet, basename='lesson')

app_name = 'api'

urlpatterns = [
    path('', include(router.urls)),
]