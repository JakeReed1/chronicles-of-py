from django.db import models
from apps.core.models import TimestampedModel, GameItem


class World(TimestampedModel):
    """The game world container"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name


class Region(TimestampedModel):
    """Major regions within the world"""
    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='regions')
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Visual theming
    theme = models.CharField(max_length=50, default='grassland')
    background_music = models.CharField(max_length=100, blank=True)
    
    # Progression
    recommended_level = models.IntegerField(default=1)
    is_unlocked = models.BooleanField(default=True)
    unlock_requirements = models.JSONField(default=dict)
    
    def __str__(self):
        return f"{self.name} ({self.world.name})"


class Location(TimestampedModel):
    """Specific locations within a region"""
    LOCATION_TYPES = [
        ('town', 'Town'),
        ('dungeon', 'Dungeon'),
        ('field', 'Field'),
        ('boss_room', 'Boss Room'),
        ('shop', 'Shop'),
        ('inn', 'Inn'),
        ('school', 'School/Tutorial'),
    ]
    
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=100)
    description = models.TextField()
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPES)
    
    # Map positioning
    x_coordinate = models.IntegerField(default=0)
    y_coordinate = models.IntegerField(default=0)
    map_icon = models.CharField(max_length=100, blank=True)
    
    # Visual assets
    background_image = models.CharField(max_length=200, blank=True)
    background_music = models.CharField(max_length=200, blank=True)
    
    # Connections
    connected_locations = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=True,
        related_name='connections'
    )
    
    # NPCs and enemies
    npc_spawns = models.ManyToManyField(
        'NPC',
        through='NPCSpawn',
        blank=True
    )
    enemy_spawns = models.ManyToManyField(
        'characters.Enemy',
        through='EnemySpawn',
        blank=True
    )
    
    # Items
    item_spawns = models.ManyToManyField(
        GameItem,
        through='ItemSpawn',
        blank=True
    )
    
    # Events
    has_events = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'locations'
        unique_together = ['region', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.get_location_type_display()}"


class NPC(TimestampedModel):
    """Non-player characters for interaction"""
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=100, blank=True)
    
    # Visual
    sprite_name = models.CharField(max_length=100)
    portrait_name = models.CharField(max_length=100, blank=True)
    
    # Dialogue
    default_dialogue = models.TextField()
    dialogue_tree = models.JSONField(default=dict)
    
    # Functionality
    is_merchant = models.BooleanField(default=False)
    is_quest_giver = models.BooleanField(default=False)
    is_teacher = models.BooleanField(default=False)
    
    # Teaching functionality
    teaches_concepts = models.ManyToManyField(
        'core.PythonConcept',
        blank=True,
        related_name='taught_by_npcs'
    )
    
    def __str__(self):
        return f"{self.name}" + (f" ({self.title})" if self.title else "")


class Quest(TimestampedModel):
    """Quests/missions for story progression"""
    QUEST_TYPES = [
        ('main', 'Main Story'),
        ('side', 'Side Quest'),
        ('tutorial', 'Tutorial'),
        ('daily', 'Daily Quest'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    quest_type = models.CharField(max_length=20, choices=QUEST_TYPES)
    
    # Quest giver
    giver_npc = models.ForeignKey(NPC, on_delete=models.SET_NULL, null=True, related_name='quests_given')
    
    # Requirements
    required_level = models.IntegerField(default=1)
    prerequisite_quests = models.ManyToManyField('self', blank=True, symmetrical=False)
    
    # Objectives
    objectives = models.JSONField(default=list)
    
    # Rewards
    experience_reward = models.IntegerField(default=100)
    gold_reward = models.IntegerField(default=50)
    item_rewards = models.ManyToManyField(GameItem, blank=True)
    
    # Educational rewards
    unlocks_concepts = models.ManyToManyField(
        'core.PythonConcept',
        blank=True,
        related_name='unlocked_by_quests'
    )
    
    class Meta:
        db_table = 'quests'
    
    def __str__(self):
        return f"{self.name} ({self.get_quest_type_display()})"


class EnemySpawn(models.Model):
    """Control enemy spawning in locations"""
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    enemy = models.ForeignKey('characters.Enemy', on_delete=models.CASCADE)
    
    spawn_rate = models.FloatField(default=1.0)  # Probability weight
    max_count = models.IntegerField(default=1)
    respawn_time = models.IntegerField(default=300)  # Seconds
    
    # Conditions
    min_player_level = models.IntegerField(default=1)
    max_player_level = models.IntegerField(default=100)
    story_flag_required = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'enemy_spawns'
        unique_together = ['location', 'enemy']


class NPCSpawn(models.Model):
    """Control NPC placement in locations"""
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    npc = models.ForeignKey(NPC, on_delete=models.CASCADE)
    
    # Position
    x_position = models.IntegerField(default=0)
    y_position = models.IntegerField(default=0)
    
    # Behavior
    is_moving = models.BooleanField(default=False)
    movement_pattern = models.CharField(max_length=50, default='static')
    
    # Visibility conditions
    story_flag_required = models.CharField(max_length=100, blank=True)
    time_of_day = models.CharField(max_length=20, blank=True)
    
    class Meta:
        db_table = 'npc_spawns'
        unique_together = ['location', 'npc']


class ItemSpawn(models.Model):
    """Control item placement in locations"""
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    item = models.ForeignKey(GameItem, on_delete=models.CASCADE)
    
    # Spawn details
    quantity = models.IntegerField(default=1)
    is_hidden = models.BooleanField(default=False)
    respawns = models.BooleanField(default=False)
    respawn_time = models.IntegerField(default=3600)  # Seconds
    
    # Collection requirements
    requires_skill = models.ForeignKey(
        'battles.Skill',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'item_spawns'
