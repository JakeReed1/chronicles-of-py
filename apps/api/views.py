from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.characters.models import Player, Enemy
from apps.battles.models import Battle
from apps.world.models import Location, Quest
from apps.lessons.models import Lesson, Challenge

from .serializers import (
    PlayerSerializer, EnemySerializer, BattleSerializer,
    LocationSerializer, QuestSerializer, LessonSerializer
)


class PlayerViewSet(viewsets.ModelViewSet):
    """API endpoints for player data"""
    serializer_class = PlayerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Player.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def heal(self, request, pk=None):
        """Heal the player to full HP/MP"""
        player = self.get_object()
        player.current_hp = player.max_hp
        player.current_mp = player.max_mp
        player.save()
        return Response(PlayerSerializer(player).data)


class BattleViewSet(viewsets.ModelViewSet):
    """API endpoints for battle system"""
    serializer_class = BattleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Battle.objects.filter(player__user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def start_battle(self, request):
        """Start a new battle with a random enemy"""
        player = get_object_or_404(Player, user=request.user)
        enemy = Enemy.objects.filter(is_active=True).order_by('?').first()
        
        if not enemy:
            return Response({'error': 'No enemies available'}, status=status.HTTP_400_BAD_REQUEST)
        
        battle = Battle.objects.create(
            player=player,
            enemy=enemy,
            player_hp=player.current_hp,
            player_mp=player.current_mp,
            enemy_hp=enemy.max_hp
        )
        
        return Response(BattleSerializer(battle).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def player_action(self, request, pk=None):
        """Execute a player action in battle"""
        battle = self.get_object()
        action = request.data.get('action', 'attack')
        
        if battle.is_complete:
            return Response({'error': 'Battle is already complete'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Simple battle logic
        result = {'player_damage': 0, 'enemy_damage': 0, 'message': ''}
        
        if action == 'attack':
            # Player attacks
            damage = 10 + (battle.player.level * 2)
            battle.enemy_hp -= damage
            result['player_damage'] = damage
            result['message'] = f"You dealt {damage} damage!"
            
            # Enemy counterattacks if alive
            if battle.enemy_hp > 0:
                enemy_damage = 5 + (battle.enemy.level * 2)
                battle.player_hp -= enemy_damage
                result['enemy_damage'] = enemy_damage
                result['message'] += f" Enemy dealt {enemy_damage} damage!"
        
        elif action == 'defend':
            # Player defends, reduced damage
            enemy_damage = max(1, (5 + battle.enemy.level) // 2)
            battle.player_hp -= enemy_damage
            result['enemy_damage'] = enemy_damage
            result['message'] = f"You defended! Enemy dealt {enemy_damage} damage."
        
        # Check battle end conditions
        if battle.enemy_hp <= 0:
            battle.is_complete = True
            battle.player_won = True
            battle.xp_reward = battle.enemy.xp_reward
            battle.gold_reward = battle.enemy.gold_reward
            
            # Update player
            battle.player.experience += battle.xp_reward
            battle.player.gold += battle.gold_reward
            battle.player.save()
            
            result['message'] = f"Victory! You gained {battle.xp_reward} XP and {battle.gold_reward} gold!"
        
        elif battle.player_hp <= 0:
            battle.is_complete = True
            battle.player_won = False
            result['message'] = "You were defeated!"
        
        battle.save()
        
        return Response({
            'battle': BattleSerializer(battle).data,
            'result': result
        })


class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for world locations"""
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Location.objects.all()


class QuestViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for quests"""
    serializer_class = QuestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Quest.objects.all()


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for Python lessons"""
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Lesson.objects.all().order_by('difficulty_level', 'order')
