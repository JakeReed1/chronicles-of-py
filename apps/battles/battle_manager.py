"""
Battle Manager - Handles the flow and logic of battles
"""
from typing import List, Dict, Any, Optional
from django.db import transaction
from apps.core.game_engine import GameEngine, BattleAction
from apps.battles.models import Battle, BattleTurn, BattleParticipant
from apps.characters.models import Enemy, Player, PartyMember
import random
import json


class BattleManager:
    """Manages battle flow, turn order, and victory conditions"""
    
    def __init__(self, battle: Battle):
        self.battle = battle
        self.engine = GameEngine()
        self.participants = []
        self.turn_order = []
        self.current_turn_index = 0
        
    def initialize_battle(self, player: Player, enemies: List[Enemy], party_members: List[PartyMember] = None):
        """Set up a new battle"""
        with transaction.atomic():
            # Create player participant
            player_participant = BattleParticipant.objects.create(
                battle=self.battle,
                character_type='player',
                character_id=player.id,
                position=0
            )
            self.participants.append(player_participant)
            
            # Add party members
            if party_members:
                for idx, member in enumerate(party_members):
                    participant = BattleParticipant.objects.create(
                        battle=self.battle,
                        character_type='party_member',
                        character_id=member.id,
                        position=idx + 1
                    )
                    self.participants.append(participant)
            
            # Add enemies
            for idx, enemy in enumerate(enemies):
                participant = BattleParticipant.objects.create(
                    battle=self.battle,
                    character_type='enemy',
                    character_id=enemy.id,
                    position=100 + idx  # Enemies on the other side
                )
                self.participants.append(participant)
            
            # Calculate initial turn order
            self._calculate_turn_order()
            self.battle.turn_order = [p.id for p in self.turn_order]
            self.battle.save()
    
    def _calculate_turn_order(self):
        """Determine turn order based on speed stats"""
        # Get actual character objects for speed comparison
        char_participants = []
        
        for participant in self.participants:
            if not participant.is_active:
                continue
                
            char = self._get_character(participant)
            if char:
                char_participants.append((participant, char.speed))
        
        # Sort by speed (highest first)
        char_participants.sort(key=lambda x: x[1], reverse=True)
        self.turn_order = [cp[0] for cp in char_participants]
    
    def _get_character(self, participant: BattleParticipant):
        """Get the actual character object from a participant"""
        if participant.character_type == 'player':
            return Player.objects.get(id=participant.character_id)
        elif participant.character_type == 'party_member':
            return PartyMember.objects.get(id=participant.character_id)
        elif participant.character_type == 'enemy':
            return Enemy.objects.get(id=participant.character_id)
        return None
    
    def get_current_turn_character(self):
        """Get the character whose turn it is"""
        if not self.turn_order:
            return None
        
        current_participant = self.turn_order[self.current_turn_index]
        return self._get_character(current_participant)
    
    def process_player_action(self, action_type: str, code: str = None, target_id: int = None, skill_id: int = None):
        """Process a player's battle action"""
        current_participant = self.turn_order[self.current_turn_index]
        actor = self._get_character(current_participant)
        
        # Create battle context
        battle_context = self._create_battle_context()
        
        # Create and execute action
        if action_type == 'code':
            action = BattleAction(actor, 'code', code=code)
            result = self.engine.execute_player_code(code, battle_context)
            
            # Record the turn
            turn = BattleTurn.objects.create(
                battle=self.battle,
                turn_number=self.battle.current_turn,
                actor=current_participant,
                action_type='code',
                code_submitted=code,
                code_output='\n'.join(result.get('output', [])),
                code_errors=result.get('errors', []),
                execution_successful=result.get('success', False)
            )
            
            # Apply damage if successful
            if result.get('success') and result.get('result'):
                damage = int(result.get('result', 0))
                # For now, damage first enemy
                enemy_participants = [p for p in self.participants if p.character_type == 'enemy' and p.is_active]
                if enemy_participants:
                    target = self._get_character(enemy_participants[0])
                    defeated = target.take_damage(damage)
                    turn.damage_dealt = damage
                    turn.targets.add(enemy_participants[0])
                    
                    if defeated:
                        enemy_participants[0].is_active = False
                        enemy_participants[0].save()
                
                turn.save()
        
        elif action_type == 'attack':
            # Basic attack
            target_participant = BattleParticipant.objects.get(id=target_id)
            target = self._get_character(target_participant)
            
            damage = self.engine.calculate_damage(actor, target)
            defeated = target.take_damage(damage)
            
            # Record turn
            turn = BattleTurn.objects.create(
                battle=self.battle,
                turn_number=self.battle.current_turn,
                actor=current_participant,
                action_type='attack',
                damage_dealt=damage
            )
            turn.targets.add(target_participant)
            turn.save()
            
            if defeated:
                target_participant.is_active = False
                target_participant.save()
        
        # Check for battle end
        victory_status = self._check_battle_end()
        if victory_status:
            self._end_battle(victory_status)
            return {'battle_ended': True, 'victory': victory_status == 'victory'}
        
        # Move to next turn
        self._advance_turn()
        
        # Process enemy turns if needed
        while self._is_enemy_turn():
            self._process_enemy_turn()
            if self._check_battle_end():
                self._end_battle(self._check_battle_end())
                return {'battle_ended': True, 'victory': self._check_battle_end() == 'victory'}
            self._advance_turn()
        
        return {'battle_ended': False, 'next_character': self.get_current_turn_character()}
    
    def _create_battle_context(self) -> Dict[str, Any]:
        """Create context dictionary for code execution"""
        player = None
        enemies = []
        party = []
        
        for participant in self.participants:
            char = self._get_character(participant)
            if participant.character_type == 'player':
                player = char
            elif participant.character_type == 'enemy' and participant.is_active:
                enemies.append(char)
            elif participant.character_type == 'party_member' and participant.is_active:
                party.append(char)
        
        return {
            'player': player,
            'enemy': enemies[0] if enemies else None,  # Primary target
            'enemies': enemies,
            'party': party,
            'turn': self.battle.current_turn,
            'battle_log': []  # Could load previous turn summaries
        }
    
    def _is_enemy_turn(self) -> bool:
        """Check if current turn belongs to an enemy"""
        if not self.turn_order:
            return False
        
        current = self.turn_order[self.current_turn_index]
        return current.character_type == 'enemy'
    
    def _process_enemy_turn(self):
        """Process an enemy's AI turn"""
        current_participant = self.turn_order[self.current_turn_index]
        enemy = self._get_character(current_participant)
        
        # Get enemy AI action
        battle_context = self._create_battle_context()
        ai_action = enemy.get_ai_action(battle_context)
        
        if ai_action['action'] == 'attack':
            # Attack the player
            player_participant = next(p for p in self.participants if p.character_type == 'player')
            player = self._get_character(player_participant)
            
            damage = self.engine.calculate_damage(enemy, player)
            defeated = player.take_damage(damage)
            
            # Record turn
            turn = BattleTurn.objects.create(
                battle=self.battle,
                turn_number=self.battle.current_turn,
                actor=current_participant,
                action_type='attack',
                damage_dealt=damage
            )
            turn.targets.add(player_participant)
            turn.save()
            
            if defeated:
                player_participant.is_active = False
                player_participant.save()
    
    def _advance_turn(self):
        """Move to the next turn"""
        # Skip defeated characters
        attempts = 0
        while attempts < len(self.turn_order):
            self.current_turn_index = (self.current_turn_index + 1) % len(self.turn_order)
            
            # If we've gone through everyone, increment turn counter
            if self.current_turn_index == 0:
                self.battle.current_turn += 1
                self.battle.save()
                # Recalculate turn order (in case of speed changes)
                self._calculate_turn_order()
            
            # Check if current character is still active
            current = self.turn_order[self.current_turn_index]
            if current.is_active:
                break
            
            attempts += 1
    
    def _check_battle_end(self) -> Optional[str]:
        """Check if battle should end"""
        active_players = [p for p in self.participants if p.character_type in ['player', 'party_member'] and p.is_active]
        active_enemies = [p for p in self.participants if p.character_type == 'enemy' and p.is_active]
        
        if not active_enemies:
            return 'victory'
        elif not active_players:
            return 'defeat'
        
        return None
    
    def _end_battle(self, result: str):
        """End the battle and calculate rewards"""
        self.battle.is_active = False
        self.battle.victory = (result == 'victory')
        
        if self.battle.victory:
            # Calculate rewards
            total_exp = 0
            total_gold = 0
            items = []
            
            for participant in self.participants:
                if participant.character_type == 'enemy':
                    enemy = Enemy.objects.get(id=participant.character_id)
                    total_exp += enemy.experience_reward
                    total_gold += enemy.gold_reward
                    
                    # Check for item drops
                    for item in enemy.guaranteed_drops.all():
                        items.append({'id': item.id, 'name': item.name, 'quantity': 1})
            
            self.battle.experience_gained = total_exp
            self.battle.gold_gained = total_gold
            self.battle.items_gained = items
            
            # Award to player
            player_participant = next(p for p in self.participants if p.character_type == 'player')
            player = Player.objects.get(id=player_participant.character_id)
            player.add_experience(total_exp)
            player.gold += total_gold
            player.save()
        
        self.battle.save()
    
    def get_battle_state(self) -> Dict[str, Any]:
        """Get current battle state for display"""
        state = {
            'turn': self.battle.current_turn,
            'is_active': self.battle.is_active,
            'participants': []
        }
        
        for participant in self.participants:
            char = self._get_character(participant)
            state['participants'].append({
                'id': participant.id,
                'type': participant.character_type,
                'name': char.name,
                'level': char.level,
                'current_hp': char.current_hp,
                'max_hp': char.max_hp,
                'current_mp': char.current_mp,
                'max_mp': char.max_mp,
                'is_active': participant.is_active,
                'position': participant.position,
                'sprite': char.sprite_name
            })
        
        # Current turn info
        if self.turn_order and self.battle.is_active:
            current = self.get_current_turn_character()
            state['current_turn'] = {
                'character_name': current.name,
                'character_type': self.turn_order[self.current_turn_index].character_type
            }
        
        return state