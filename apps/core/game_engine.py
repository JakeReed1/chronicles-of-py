"""
Core game engine for battle mechanics and game logic
"""
import random
from typing import Dict, List, Optional, Tuple, Any
from RestrictedPython import compile_restricted_exec, safe_globals


class GameEngine:
    """Main game engine handling battle mechanics and code execution"""
    
    def __init__(self):
        self.safe_globals = safe_globals.copy()
        self.safe_globals.update({
            'print': self._safe_print,
            'range': range,
            'len': len,
            'sum': sum,
            'min': min,
            'max': max,
            'abs': abs,
            'round': round,
            'sorted': sorted,
            'list': list,
            'dict': dict,
            'set': set,
            'tuple': tuple,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
        })
        self.output_buffer = []
    
    def _safe_print(self, *args, **kwargs):
        """Safe print function that captures output"""
        output = ' '.join(str(arg) for arg in args)
        self.output_buffer.append(output)
        return output
    
    def execute_player_code(self, code: str, battle_context: Dict) -> Dict[str, Any]:
        """
        Execute player's Python code in a restricted environment
        
        Args:
            code: The Python code written by the player
            battle_context: Current battle state including player, enemy, etc.
            
        Returns:
            Dict containing execution results, output, and any errors
        """
        self.output_buffer = []
        
        # Prepare the execution environment
        local_vars = {
            'player': battle_context.get('player'),
            'enemy': battle_context.get('enemy'),
            'party': battle_context.get('party', []),
            'turn': battle_context.get('turn', 1),
            'battle_log': battle_context.get('battle_log', []),
        }
        
        try:
            # Compile the code with restrictions
            compiled = compile_restricted_exec(code)
            
            if compiled.errors:
                return {
                    'success': False,
                    'errors': compiled.errors,
                    'output': [],
                    'result': None
                }
            
            # Execute the compiled code
            exec(compiled.code, self.safe_globals, local_vars)
            
            # Extract results
            result = local_vars.get('result', local_vars.get('damage', 0))
            
            return {
                'success': True,
                'errors': [],
                'output': self.output_buffer,
                'result': result,
                'locals': local_vars
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [str(e)],
                'output': self.output_buffer,
                'result': None
            }
    
    def calculate_damage(self, attacker, defender, skill_power=1.0, is_magical=False) -> int:
        """Calculate damage based on character stats and skill power"""
        if is_magical:
            base_damage = attacker.magic_attack * skill_power
            defense = defender.magic_defense
        else:
            base_damage = attacker.attack * skill_power
            defense = defender.defense
        
        # Basic damage formula
        damage = max(1, int(base_damage - defense / 2))
        
        # Add some randomness (±10%)
        variance = random.uniform(0.9, 1.1)
        damage = int(damage * variance)
        
        # Critical hit chance (10% base)
        if random.random() < 0.1:
            damage *= 2
            
        return damage
    
    def check_battle_end(self, player_party: List, enemy_party: List) -> Optional[str]:
        """
        Check if battle should end
        
        Returns:
            'victory' if player wins
            'defeat' if player loses
            None if battle continues
        """
        # Check if all enemies are defeated
        if all(enemy.current_hp <= 0 for enemy in enemy_party):
            return 'victory'
        
        # Check if all party members are defeated
        if all(member.current_hp <= 0 for member in player_party):
            return 'defeat'
        
        return None
    
    def get_turn_order(self, participants: List) -> List:
        """Determine turn order based on speed stat"""
        return sorted(participants, key=lambda x: x.speed, reverse=True)
    
    def apply_status_effect(self, target, effect_name: str, duration: int):
        """Apply a status effect to a target"""
        # This would integrate with a StatusEffect model
        pass
    
    def validate_spell_syntax(self, code: str, required_concepts: List[str]) -> Tuple[bool, List[str]]:
        """
        Validate that the player's code uses required Python concepts
        
        Args:
            code: The player's spell code
            required_concepts: List of concepts like 'for_loop', 'if_statement', etc.
            
        Returns:
            (is_valid, error_messages)
        """
        errors = []
        
        # Simple validation - in production, use AST parsing
        concept_checks = {
            'for_loop': 'for ',
            'while_loop': 'while ',
            'if_statement': 'if ',
            'function_def': 'def ',
            'class_def': 'class ',
            'list_comp': '[',
            'lambda': 'lambda ',
            'try_except': 'try:',
        }
        
        for concept in required_concepts:
            if concept in concept_checks:
                if concept_checks[concept] not in code:
                    errors.append(f"Spell requires using a {concept.replace('_', ' ')}")
        
        return len(errors) == 0, errors


class BattleAction:
    """Represents an action taken in battle"""
    
    def __init__(self, actor, action_type: str, target=None, skill=None, code=None):
        self.actor = actor
        self.action_type = action_type  # 'attack', 'skill', 'item', 'defend', 'code'
        self.target = target
        self.skill = skill
        self.code = code
        self.priority = 0  # Higher priority acts first
        
    def execute(self, engine: GameEngine, battle_context: Dict) -> Dict[str, Any]:
        """Execute the battle action"""
        if self.action_type == 'code':
            return engine.execute_player_code(self.code, battle_context)
        elif self.action_type == 'attack':
            damage = engine.calculate_damage(self.actor, self.target)
            self.target.take_damage(damage)
            return {
                'success': True,
                'damage': damage,
                'defeated': self.target.current_hp <= 0
            }
        # Add more action types as needed
        
        return {'success': False, 'error': 'Unknown action type'}