from django.db import models
from django.contrib.auth.models import User
from apps.core.models import BaseCharacter, GameItem, PythonConcept
import json


class Player(BaseCharacter):
    """Player character model"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    
    # Experience and progression
    experience = models.IntegerField(default=0)
    skill_points = models.IntegerField(default=0)
    
    # Story progression
    current_location = models.ForeignKey(
        'world.Location', 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='players_here'
    )
    story_flags = models.JSONField(default=dict, blank=True)
    
    # Currency
    gold = models.IntegerField(default=0)
    
    # Python mastery
    learned_concepts = models.ManyToManyField(
        PythonConcept,
        through='ConceptMastery',
        related_name='players_who_learned'
    )
    
    class Meta:
        db_table = 'players'
    
    def add_experience(self, amount):
        """Add experience and check for level up"""
        self.experience += amount
        
        # Simple level up formula
        while self.experience >= self.exp_for_next_level():
            self.level_up()
            
        self.save()
    
    def exp_for_next_level(self):
        """Calculate experience needed for next level"""
        return 100 * (self.level ** 2)
    
    def level_up(self):
        """Level up the player"""
        self.level += 1
        self.skill_points += 3
        
        # Increase stats
        self.max_hp += 20
        self.current_hp = self.max_hp
        self.max_mp += 10
        self.current_mp = self.max_mp
        self.attack += 3
        self.defense += 2
        self.magic_attack += 3
        self.magic_defense += 2
        self.speed += 1
        
        self.save()


class PartyMember(BaseCharacter):
    """Non-player party members that join the player"""
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='party')
    
    # Character personality/dialogue
    personality = models.TextField(blank=True)
    backstory = models.TextField(blank=True)
    
    # Relationship with player
    affinity = models.IntegerField(default=0)  # How much they like the player
    
    # Special abilities
    special_skills = models.ManyToManyField('battles.Skill', blank=True)
    
    # Whether they're currently in the active party
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'party_members'


class Enemy(BaseCharacter):
    """Enemy character model"""
    # Enemy-specific attributes
    experience_reward = models.IntegerField(default=10)
    gold_reward = models.IntegerField(default=5)
    
    # AI behavior
    ai_type = models.CharField(max_length=50, default='aggressive')
    skill_weights = models.JSONField(default=dict)  # Probability of using each skill
    
    # Loot drops
    guaranteed_drops = models.ManyToManyField(
        GameItem,
        related_name='guaranteed_by_enemies',
        blank=True
    )
    
    # Weaknesses and resistances
    weak_to = models.ManyToManyField(
        'battles.ElementType',
        related_name='enemies_weak_to',
        blank=True
    )
    resistant_to = models.ManyToManyField(
        'battles.ElementType',
        related_name='enemies_resistant_to',
        blank=True
    )
    
    # Python concept this enemy teaches
    teaches_concept = models.ForeignKey(
        PythonConcept,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Python concept players learn by defeating this enemy"
    )
    
    class Meta:
        db_table = 'enemies'
        verbose_name_plural = 'enemies'
    
    def get_ai_action(self, battle_context):
        """Determine what action the enemy should take"""
        # Simple AI logic - can be expanded
        if self.current_hp < self.max_hp * 0.3:
            # Low health - defensive or healing
            return {'action': 'defend'}
        else:
            # Normal attack
            return {'action': 'attack', 'target': 'player'}


class ConceptMastery(models.Model):
    """Track player's mastery of Python concepts"""
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    concept = models.ForeignKey(PythonConcept, on_delete=models.CASCADE)
    
    mastery_level = models.IntegerField(default=0)  # 0-100
    times_used = models.IntegerField(default=0)
    first_learned = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'concept_mastery'
        unique_together = ['player', 'concept']
    
    def __str__(self):
        return f"{self.player.name}'s {self.concept.name} mastery: {self.mastery_level}%"


class PlayerInventory(models.Model):
    """Track items in player's inventory"""
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='inventory')
    item = models.ForeignKey(GameItem, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    
    # Equipment slots
    is_equipped = models.BooleanField(default=False)
    equipment_slot = models.CharField(
        max_length=20, 
        blank=True,
        choices=[
            ('weapon', 'Weapon'),
            ('armor', 'Armor'),
            ('accessory', 'Accessory'),
        ]
    )
    
    class Meta:
        db_table = 'player_inventory'
        unique_together = ['player', 'item']
    
    def __str__(self):
        return f"{self.player.name}'s {self.item.name} x{self.quantity}"
