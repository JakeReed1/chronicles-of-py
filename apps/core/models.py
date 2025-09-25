from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid


class TimestampedModel(models.Model):
    """Abstract base model with timestamps"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Abstract base model with UUID primary key"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    class Meta:
        abstract = True


class BaseCharacter(TimestampedModel):
    """Abstract base model for all character types (players, enemies, NPCs)"""
    name = models.CharField(max_length=100)
    level = models.IntegerField(default=1)
    
    # Base stats
    max_hp = models.IntegerField(default=100)
    current_hp = models.IntegerField(default=100)
    max_mp = models.IntegerField(default=50)
    current_mp = models.IntegerField(default=50)
    
    # Combat stats
    attack = models.IntegerField(default=10)
    defense = models.IntegerField(default=5)
    magic_attack = models.IntegerField(default=8)
    magic_defense = models.IntegerField(default=4)
    speed = models.IntegerField(default=10)
    
    # Visual representation
    sprite_name = models.CharField(max_length=100, blank=True)
    portrait_name = models.CharField(max_length=100, blank=True)
    
    class Meta:
        abstract = True
    
    def __str__(self):
        return f"{self.name} (Lv. {self.level})"
    
    def take_damage(self, amount):
        """Apply damage to the character"""
        self.current_hp = max(0, self.current_hp - amount)
        self.save()
        return self.current_hp <= 0  # Returns True if character is defeated
    
    def heal(self, amount):
        """Heal the character"""
        self.current_hp = min(self.max_hp, self.current_hp + amount)
        self.save()
    
    def use_mp(self, amount):
        """Use MP for skills/magic"""
        if self.current_mp >= amount:
            self.current_mp -= amount
            self.save()
            return True
        return False
    
    def restore_mp(self, amount):
        """Restore MP"""
        self.current_mp = min(self.max_mp, self.current_mp + amount)
        self.save()


class GameItem(TimestampedModel):
    """Base model for all items in the game"""
    ITEM_TYPES = [
        ('weapon', 'Weapon'),
        ('armor', 'Armor'),
        ('accessory', 'Accessory'),
        ('consumable', 'Consumable'),
        ('key', 'Key Item'),
        ('material', 'Material'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES)
    
    # Visual
    icon_name = models.CharField(max_length=100)
    
    # Economy
    buy_price = models.IntegerField(default=0)
    sell_price = models.IntegerField(default=0)
    
    # Game mechanics
    is_stackable = models.BooleanField(default=True)
    max_stack = models.IntegerField(default=99)
    is_usable_in_battle = models.BooleanField(default=False)
    is_usable_in_field = models.BooleanField(default=False)
    
    # Stats modification (for equipment)
    hp_bonus = models.IntegerField(default=0)
    mp_bonus = models.IntegerField(default=0)
    attack_bonus = models.IntegerField(default=0)
    defense_bonus = models.IntegerField(default=0)
    magic_attack_bonus = models.IntegerField(default=0)
    magic_defense_bonus = models.IntegerField(default=0)
    speed_bonus = models.IntegerField(default=0)
    
    # Learning requirement (ties to Python concepts)
    required_lesson = models.ForeignKey(
        'lessons.Lesson', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Lesson that must be completed to use this item"
    )
    
    def __str__(self):
        return self.name


class PythonConcept(models.Model):
    """Represents Python concepts that can be learned and used in battle"""
    DIFFICULTY_LEVELS = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_LEVELS)
    
    # Python syntax example
    syntax_example = models.TextField()
    documentation_link = models.URLField(blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_difficulty_display()})"
