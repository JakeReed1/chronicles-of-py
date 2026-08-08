from rest_framework import serializers
from apps.characters.models import Player, Enemy
from apps.battles.models import Battle
from apps.world.models import Location, Quest
from apps.lessons.models import Lesson, Challenge
from apps.battles.models import Battle, BattleParticipant

class BattleParticipantSerializer(serializers.ModelSerializer):
    """Serializer for BattleParticipant model"""
    class Meta:
        model = BattleParticipant
        fields = [
            'id', 'character_type', 'character_id', 'position',
            'is_active', 'temp_attack_modifier', 'temp_defense_modifier',
            'status_effects'
        ]


class PlayerSerializer(serializers.ModelSerializer):
    """Serializer for Player model"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Player
        fields = [
            'id', 'username', 'name', 'level', 'experience',
            'max_hp', 'current_hp', 'max_mp', 'current_mp',
            'attack', 'defense', 'gold', 'created_at'
        ]
        read_only_fields = ['created_at']


class EnemySerializer(serializers.ModelSerializer):
    """Serializer for Enemy model"""
    class Meta:
        model = Enemy
        fields = [
            'id', 'name', 'enemy_type', 'level', 
            'max_hp', 'attack', 'defense', 
            'xp_reward', 'gold_reward', 'description'
        ]


class BattleSerializer(serializers.ModelSerializer):
    """Serializer for Battle model"""
    player = PlayerSerializer(read_only=True)
    participants = serializers.SerializerMethodField()
    
    class Meta:
        model = Battle
        fields = [
            'id', 'player', 'battle_type', 'is_active', 
            'current_turn', 'turn_order', 'location',
            'victory', 'experience_gained', 'gold_gained', 
            'items_gained', 'code_attempts', 'successful_code_executions',
            'participants', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_participants(self, obj):
        """Return battle participants"""
        return BattleParticipantSerializer(
            obj.participants.all(), 
            many=True
        ).data

class LocationSerializer(serializers.ModelSerializer):
    """Serializer for Location model"""
    class Meta:
        model = Location
        fields = [
            'id', 'name', 'location_type', 'description',
            'x_coordinate', 'y_coordinate'
        ]


class QuestSerializer(serializers.ModelSerializer):
    """Serializer for Quest model"""
    location = LocationSerializer(read_only=True)
    
    class Meta:
        model = Quest
        fields = [
            'id', 'title', 'description', 'quest_type',
            'location', 'xp_reward', 'gold_reward',
            'required_level', 'is_main_quest'
        ]


class ChallengeSerializer(serializers.ModelSerializer):
    """Serializer for Challenge model"""
    class Meta:
        model = Challenge
        fields = [
            'id', 'problem_description', 'starter_code',
            'test_cases', 'hint', 'xp_reward'
        ]


class LessonSerializer(serializers.ModelSerializer):
    """Serializer for Lesson model"""
    challenges = ChallengeSerializer(many=True, read_only=True)
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'content',
            'difficulty_level', 'order', 'xp_reward',
            'challenges'
        ]