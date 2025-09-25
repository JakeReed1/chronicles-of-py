from django.db import models
from django.contrib.auth.models import User
from apps.core.models import TimestampedModel, PythonConcept
import json


class ElementType(models.Model):
    """Elemental types for attacks (Fire, Ice, Lightning, etc.)"""
    name = models.CharField(max_length=50, unique=True)
    color_hex = models.CharField(max_length=7, default='#FFFFFF')
    icon_name = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name


class Skill(TimestampedModel):
    """Skills/Spells that can be used in battle"""
    SKILL_TYPES = [
        ('attack', 'Attack'),
        ('magic', 'Magic'),
        ('support', 'Support'),
        ('healing', 'Healing'),
        ('status', 'Status Effect'),
    ]
    
    TARGET_TYPES = [
        ('single_enemy', 'Single Enemy'),
        ('all_enemies', 'All Enemies'),
        ('single_ally', 'Single Ally'),
        ('all_allies', 'All Allies'),
        ('self', 'Self'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    skill_type = models.CharField(max_length=20, choices=SKILL_TYPES)
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES)
    
    # Resource cost
    mp_cost = models.IntegerField(default=0)
    hp_cost = models.IntegerField(default=0)
    
    # Power and effects
    power = models.FloatField(default=1.0)
    element = models.ForeignKey(ElementType, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Animation
    animation_name = models.CharField(max_length=100, blank=True)
    cast_message = models.CharField(
        max_length=200, 
        default="{caster} uses {skill}!",
        help_text="Use {caster} and {skill} as placeholders"
    )
    
    # Python requirement
    required_concept = models.ForeignKey(
        PythonConcept,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Python concept needed to learn this skill"
    )
    
    # Code template for player to fill
    code_template = models.TextField(
        blank=True,
        help_text="Python code template for this skill"
    )
    
    # Validation for the code
    required_keywords = models.JSONField(
        default=list,
        help_text="Python keywords that must appear in the code"
    )
    
    def __str__(self):
        return f"{self.name} ({self.get_skill_type_display()})"


class Battle(TimestampedModel):
    """Represents a battle instance"""
    BATTLE_TYPES = [
        ('story', 'Story Battle'),
        ('random', 'Random Encounter'),
        ('boss', 'Boss Battle'),
        ('tutorial', 'Tutorial Battle'),
        ('pvp', 'Player vs Player'),
    ]
    
    # Participants
    player = models.ForeignKey('characters.Player', on_delete=models.CASCADE)
    battle_type = models.CharField(max_length=20, choices=BATTLE_TYPES)
    
    # Battle state
    is_active = models.BooleanField(default=True)
    current_turn = models.IntegerField(default=1)
    turn_order = models.JSONField(default=list)
    
    # Location context
    location = models.ForeignKey(
        'world.Location', 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='battles'
    )
    
    # Results
    victory = models.BooleanField(null=True)
    experience_gained = models.IntegerField(default=0)
    gold_gained = models.IntegerField(default=0)
    items_gained = models.JSONField(default=list)
    
    # Educational tracking
    concepts_used = models.ManyToManyField(PythonConcept, blank=True)
    code_attempts = models.IntegerField(default=0)
    successful_code_executions = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'battles'
    
    def __str__(self):
        return f"{self.player.name}'s {self.get_battle_type_display()} - Turn {self.current_turn}"


class BattleParticipant(models.Model):
    """Track all participants in a battle"""
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name='participants')
    
    # Polymorphic reference to character
    character_type = models.CharField(max_length=20)  # 'player', 'party_member', 'enemy'
    character_id = models.IntegerField()
    
    # Battle state
    position = models.IntegerField(default=0)  # Position in battle formation
    is_active = models.BooleanField(default=True)  # False if defeated
    
    # Temporary battle stats
    temp_attack_modifier = models.FloatField(default=1.0)
    temp_defense_modifier = models.FloatField(default=1.0)
    status_effects = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'battle_participants'


class BattleTurn(TimestampedModel):
    """Record of each turn in battle"""
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name='turns')
    turn_number = models.IntegerField()
    actor = models.ForeignKey(BattleParticipant, on_delete=models.CASCADE, related_name='turns')
    
    # Action taken
    action_type = models.CharField(max_length=50)
    action_data = models.JSONField(default=dict)
    
    # Code execution (if applicable)
    code_submitted = models.TextField(blank=True)
    code_output = models.TextField(blank=True)
    code_errors = models.JSONField(default=list)
    execution_successful = models.BooleanField(default=False)
    
    # Results
    damage_dealt = models.IntegerField(default=0)
    healing_done = models.IntegerField(default=0)
    targets = models.ManyToManyField(BattleParticipant, related_name='targeted_in_turns')
    
    class Meta:
        db_table = 'battle_turns'
        ordering = ['battle', 'turn_number']


class StatusEffect(models.Model):
    """Status effects that can be applied in battle"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    icon_name = models.CharField(max_length=100)
    
    # Effect parameters
    duration_type = models.CharField(
        max_length=20,
        choices=[
            ('turns', 'Turns'),
            ('time', 'Time-based'),
            ('permanent', 'Until cured'),
        ]
    )
    default_duration = models.IntegerField(default=3)
    
    # Stat modifications
    stat_modifiers = models.JSONField(
        default=dict,
        help_text="JSON dict of stat: modifier pairs"
    )
    
    # Special effects
    prevents_action = models.BooleanField(default=False)  # Like sleep/paralysis
    damage_per_turn = models.IntegerField(default=0)  # Like poison
    
    def __str__(self):
        return self.name
