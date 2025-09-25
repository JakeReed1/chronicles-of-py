from django.contrib import admin
from .models import GameItem, PythonConcept

@admin.register(GameItem)
class GameItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'buy_price', 'sell_price', 'is_stackable')
    list_filter = ('item_type', 'is_stackable', 'is_usable_in_battle', 'is_usable_in_field')
    search_fields = ('name', 'description')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'item_type', 'icon_name')
        }),
        ('Economy', {
            'fields': ('buy_price', 'sell_price')
        }),
        ('Game Mechanics', {
            'fields': ('is_stackable', 'max_stack', 'is_usable_in_battle', 'is_usable_in_field')
        }),
        ('Stats Modification', {
            'fields': ('hp_bonus', 'mp_bonus', 'attack_bonus', 'defense_bonus', 
                      'magic_attack_bonus', 'magic_defense_bonus', 'speed_bonus'),
            'classes': ('collapse',)
        }),
        ('Requirements', {
            'fields': ('required_lesson',)
        })
    )


@admin.register(PythonConcept)
class PythonConceptAdmin(admin.ModelAdmin):
    list_display = ('name', 'difficulty', 'documentation_link')
    list_filter = ('difficulty',)
    search_fields = ('name', 'description')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'difficulty')
        }),
        ('Documentation', {
            'fields': ('syntax_example', 'documentation_link')
        })
    )
