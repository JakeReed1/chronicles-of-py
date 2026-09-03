from django.core.management.base import BaseCommand

from apps.core.models import GameItem


STARTER_ITEMS = [
    dict(
        name='Bronze Key',
        description='A small tarnished key. Probably opens something nearby.',
        item_type='key',
        icon_name='key_bronze',
        is_stackable=False,
        max_stack=1,
    ),
    dict(
        name='Health Potion',
        description='Restores 30 HP when used.',
        item_type='consumable',
        icon_name='potion_red',
        buy_price=15,
        sell_price=5,
        is_usable_in_battle=True,
        is_usable_in_field=True,
        hp_bonus=30,
    ),
    dict(
        name='Mana Potion',
        description='Restores 20 MP when used.',
        item_type='consumable',
        icon_name='potion_blue',
        buy_price=15,
        sell_price=5,
        is_usable_in_battle=True,
        is_usable_in_field=True,
        mp_bonus=20,
    ),
    dict(
        name='Iron Sword',
        description='A sturdy blade. +5 attack while equipped.',
        item_type='weapon',
        icon_name='sword_iron',
        buy_price=50,
        sell_price=20,
        is_stackable=False,
        max_stack=1,
        attack_bonus=5,
    ),
    dict(
        name='Leather Armor',
        description='Basic protection. +3 defense while equipped.',
        item_type='armor',
        icon_name='armor_leather',
        buy_price=40,
        sell_price=15,
        is_stackable=False,
        max_stack=1,
        defense_bonus=3,
    ),
]


class Command(BaseCommand):
    help = 'Seed the starter GameItem catalog (idempotent - safe to re-run).'

    def handle(self, *args, **options):
        created_count = 0
        for item_data in STARTER_ITEMS:
            item, created = GameItem.objects.get_or_create(
                name=item_data['name'],
                defaults=item_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created item: {item.name}'))
            else:
                self.stdout.write(f'Already exists: {item.name}')

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} new item(s) created, '
            f'{len(STARTER_ITEMS) - created_count} already existed.'
        ))
