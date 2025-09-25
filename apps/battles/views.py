from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import TemplateView, View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

from apps.battles.models import Battle, Skill
from apps.characters.models import Enemy, Player
from apps.battles.battle_manager import BattleManager


class BattleView(TemplateView):  # Removed LoginRequiredMixin for testing
    template_name = 'battles/battle.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # For testing: Create a test player if no user is logged in
        if self.request.user.is_authenticated:
            try:
                player = self.request.user.player
            except Player.DoesNotExist:
                # Create a default player for the user
                player = Player.objects.create(
                    user=self.request.user,
                    name=self.request.user.username,
                    level=1,
                    max_hp=100,
                    current_hp=100,
                    max_mp=50,
                    current_mp=50
                )
        else:
            # For testing without login - get or create a test player
            player, created = Player.objects.get_or_create(
                user=None,
                defaults={
                    'name': 'Test Hero',
                    'level': 1,
                    'max_hp': 100,
                    'current_hp': 100,
                    'max_mp': 50,
                    'current_mp': 50
                }
            )
        
        # Get or create active battle
        active_battle = Battle.objects.filter(
            player=player,
            is_active=True
        ).first()
        
        if not active_battle:
            # Start a new battle with a test enemy
            enemy = Enemy.objects.first()  # Get first enemy for testing
            if enemy:
                active_battle = Battle.objects.create(
                    player=player,
                    battle_type='tutorial'
                )
                battle_manager = BattleManager(active_battle)
                battle_manager.initialize_battle(player, [enemy])
        
        context['battle'] = active_battle
        context['player'] = player
        
        if active_battle:
            battle_manager = BattleManager(active_battle)
            context['battle_state'] = battle_manager.get_battle_state()
        
        return context


@method_decorator(csrf_exempt, name='dispatch')
class BattleActionView(View):  # Removed LoginRequiredMixin for testing
    """Handle battle actions via AJAX"""
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            action_type = data.get('action_type')
            
            # Get player and active battle
            if request.user.is_authenticated:
                player = request.user.player
            else:
                # For testing without login
                player = Player.objects.filter(user=None).first()
                if not player:
                    return JsonResponse({'error': 'No test player found'}, status=400)
                
            battle = Battle.objects.filter(player=player, is_active=True).first()
            
            if not battle:
                return JsonResponse({'error': 'No active battle'}, status=400)
            
            battle_manager = BattleManager(battle)
            
            # Process the action
            if action_type == 'code':
                code = data.get('code', '')
                result = battle_manager.process_player_action('code', code=code)
            elif action_type == 'attack':
                target_id = data.get('target_id')
                result = battle_manager.process_player_action('attack', target_id=target_id)
            else:
                return JsonResponse({'error': 'Invalid action type'}, status=400)
            
            # Get updated battle state
            battle_state = battle_manager.get_battle_state()
            
            response_data = {
                'success': True,
                'battle_state': battle_state,
                'battle_ended': result.get('battle_ended', False),
                'victory': result.get('victory', False)
            }
            
            return JsonResponse(response_data)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
