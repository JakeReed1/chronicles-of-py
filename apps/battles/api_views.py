import json
import sys
import io
import random
import traceback
import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import get_object_or_404
from contextlib import redirect_stdout, redirect_stderr
import ast

from apps.characters.models import Player, PlayerInventory
from apps.core.models import GameItem

# Restricted built-ins for safety
SAFE_BUILTINS = {
    'print': print,
    'range': range,
    'len': len,
    'str': str,
    'int': int,
    'float': float,
    'bool': bool,
    'list': list,
    'dict': dict,
    'tuple': tuple,
    'set': set,
    'abs': abs,
    'min': min,
    'max': max,
    'sum': sum,
    'round': round,
    'sorted': sorted,
    'enumerate': enumerate,
    'zip': zip,
    'map': map,
    'filter': filter,
    'any': any,
    'all': all,
    'True': True,
    'False': False,
    'None': None,
}


class CodeValidator:
    """Validates Python code for safety before execution"""
    
    FORBIDDEN_IMPORTS = [
        'os', 'sys', 'subprocess', 'eval', 'exec', '__import__',
        'compile', 'open', 'file', 'input', 'raw_input', 'execfile',
        'reload', 'import', 'importlib', 'globals', 'locals', 'vars',
        'dir', 'getattr', 'setattr', 'delattr', 'hasattr'
    ]
    
    @staticmethod
    def is_safe(code):
        """Check if code is safe to execute"""
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                # Check for imports
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    return False, "Import statements are not allowed"
                
                # Check for function calls to dangerous functions
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        if node.func.id in CodeValidator.FORBIDDEN_IMPORTS:
                            return False, f"Function '{node.func.id}' is not allowed"
                
                # Check for exec/eval
                if isinstance(node, ast.Expr):
                    if isinstance(node.value, ast.Call):
                        if isinstance(node.value.func, ast.Name):
                            if node.value.func.id in ['exec', 'eval']:
                                return False, "exec/eval is not allowed"
                
                # Check for file operations
                if isinstance(node, ast.With):
                    return False, "File operations are not allowed"

                # A `while True` (or other constant-truthy while) with no
                # break anywhere inside it would genuinely run forever once
                # exec()'d - there is no execution timeout in this sandbox,
                # so this has to be rejected before it ever runs, not
                # analyzed after (a break anywhere in the body, even a
                # nested loop's, counts - not perfectly scoped, but precise
                # nesting analysis isn't the point here). The distinctive
                # message text is matched by execute_python_code() to give
                # Boss: Infinite Loop Tree its own flavor for this case.
                if isinstance(node, ast.While):
                    is_const_truthy = isinstance(node.test, ast.Constant) and bool(node.test.value)
                    if is_const_truthy and not any(isinstance(n, ast.Break) for n in ast.walk(node)):
                        return False, "This loop never ends (while True with no break) - Python would run it forever!"

            return True, "Code is safe"
            
        except SyntaxError as e:
            return False, f"SyntaxError: {str(e)}"
        except Exception as e:
            return False, f"Error validating code: {str(e)}"


@csrf_exempt
@require_http_methods(["POST"])
def execute_python_code(request):
    """Execute Python code safely and return the output"""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        boss_id = data.get('boss_id')
        # Read-only snapshot of the current enemy - lets the player's code
        # actually branch on {"status": "burning"/"frozen"/"shocked"/None}
        # (inflicted by elemental spells, see BattleScene.playerAttack())
        # instead of status effects being purely a client-side animation.
        enemy_snapshot = data.get('enemy') or {}
        enemy_locals = dict(enemy_snapshot)

        # Validate code first
        is_safe, message = CodeValidator.is_safe(code)
        if not is_safe:
            # Boss: Infinite Loop Tree's gimmick - this specific rejection
            # (an unbounded while loop the sandbox refused to even run) is
            # its concept-gated mechanic: the attack is trapped rather than
            # simply invalid. Every other enemy/rejection reason still
            # gets the plain validator error.
            if boss_id == 'boss2' and 'never ends' in message:
                return JsonResponse({
                    'success': True,
                    'action': 'attack',
                    'output': '',
                    'error': '',
                    'damage': 0,
                    'boss_note': 'Your loop never ends - it traps your attack before it can land!',
                })
            return JsonResponse({
                'success': False,
                'output': message,
                'error': message,
                'damage': 0
            })

        # Set up string buffers to capture output
        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()

        # Create a restricted environment
        restricted_globals = {
            '__builtins__': SAFE_BUILTINS,
            '__name__': '__main__',
            '__doc__': None,
            '__package__': None,
        }

        # A battle turn can also be spent checking or using inventory, not
        # just attacking - `inventory` is bound the same way the overworld
        # console binds it (real data if logged in, otherwise an empty list
        # so the code still runs rather than NameError-ing), and use_item()
        # is the same helper, wrapped here to log successful calls so we
        # can tell afterward whether this run actually consumed an item.
        player = None
        inventory_snapshot = []
        if request.user.is_authenticated:
            player = Player.objects.filter(user=request.user).first()
            if player:
                inventory_snapshot = _inventory_snapshot(player)
        inventory_locals = [dict(item) for item in inventory_snapshot]

        used_items_log = []

        def _battle_use_item(items, name, amount=1):
            found = _use_item_helper(items, name, amount)
            if found:
                used_items_log.append((name, amount))
            return found

        # flee() is another turn-spending action alongside attacking and
        # use_item() - calling it doesn't guarantee escape (a speed-based
        # roll decides that), but it always uses up the turn either way,
        # same as a real JRPG "run" command.
        flee_attempted = [False]

        def _battle_flee():
            flee_attempted[0] = True
            return True

        exec_locals = {
            'inventory': inventory_locals,
            'use_item': _battle_use_item,
            'flee': _battle_flee,
            'enemy': enemy_locals,
        }

        # Execute the code with output redirection
        try:
            with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                exec(code, restricted_globals, exec_locals)

            stdout_output = stdout_buffer.getvalue()
            stderr_output = stderr_buffer.getvalue()

            if flee_attempted[0]:
                # ~65% chance to escape, same for every fight right now -
                # no speed-vs-speed comparison yet since enemies don't carry
                # a speed stat. Failing still costs the turn (the enemy gets
                # a free hit), so it's a real risk, not a free out.
                flee_success = random.random() < 0.65
                return JsonResponse({
                    'success': True,
                    'action': 'flee',
                    'output': stdout_output,
                    'error': stderr_output,
                    'damage': 0,
                    'flee_success': flee_success,
                })

            if used_items_log and player:
                # A successful use_item() call means this turn was spent
                # healing, not attacking - no damage dealt, no spell cast,
                # and the real effect (HP/MP + inventory) is persisted here
                # rather than computed from printed numbers like an attack is.
                heal_result = _apply_item_uses(player, inventory_locals, used_items_log)
                return JsonResponse({
                    'success': True,
                    'action': 'item',
                    'output': stdout_output + heal_result['heal_text'],
                    'error': stderr_output,
                    'damage': 0,
                    'inventory': heal_result['inventory'],
                    'player': heal_result['player'],
                })

            if 'inventory' in code and not used_items_log:
                # Referenced inventory (e.g. print(inventory) to see what
                # you're carrying) without actually using anything - free
                # information, doesn't cost the turn or deal damage.
                return JsonResponse({
                    'success': True,
                    'action': 'inspect',
                    'output': stdout_output,
                    'error': stderr_output,
                    'damage': 0,
                })

            # Calculate damage based on actual execution
            damage = calculate_damage_from_execution(code, stdout_output, stderr_output)

            # Boss: Unhandled Exception's gimmick - Boss: Infinite Loop
            # Tree's is handled above, at the validator-rejection stage,
            # since that code never actually runs.
            boss_note = None
            used_try_except = None
            if boss_id == 'boss3':
                used_try_except = _has_try_except(code)

            # A small reward for actually reading the `enemy` state and
            # reacting to it (e.g. `if enemy["status"] == "frozen": ...`),
            # rather than a bonus for merely referencing the variable name.
            synergy_bonus = False
            if enemy_locals.get('status') and damage > 0 and re.search(r'enemy\s*\[\s*[\'"]status[\'"]\s*\]', code):
                damage = min(100, round(damage * 1.15))
                synergy_bonus = True

            return JsonResponse({
                'success': True,
                'action': 'attack',
                'output': stdout_output,
                'error': stderr_output,
                'damage': damage,
                'boss_note': boss_note,
                'used_try_except': used_try_except,
                'synergy_bonus': synergy_bonus,
            })

        except SyntaxError as e:
            return JsonResponse({
                'success': False,
                'output': '',
                'error': f"SyntaxError: {str(e)} on line {e.lineno}",
                'damage': 0
            })
        except NameError as e:
            return JsonResponse({
                'success': False,
                'output': '',
                'error': f"NameError: {str(e)}",
                'damage': 0
            })
        except TypeError as e:
            return JsonResponse({
                'success': False,
                'output': '',
                'error': f"TypeError: {str(e)}",
                'damage': 0
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'output': '',
                'error': f"{type(e).__name__}: {str(e)}",
                'damage': 0
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'output': '',
            'error': 'Invalid request format',
            'damage': 0
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'output': '',
            'error': f'Server error: {str(e)}',
            'damage': 0
        }, status=500)


def calculate_damage_from_execution(code, stdout, stderr):
    """Calculate battle damage from a player's executed Python code.

    Design: the numbers a player's code actually prints are the damage -
    if your output says "Deal 15 damage!", that 15 is what happens to the
    enemy, not a disconnected flavor number. This is what makes the battle
    system "real": you're not picking a canned attack, you're computing the
    hit yourself.

    Breakdown of how a final damage value is built, in order:

    1. Any error (stderr non-empty) -> 0 damage. Fix your code and retry.
    2. Base damage from stdout:
       - If the output contains numbers, they're summed and used directly,
         capped at 60. The cap exists so a lazy `print(99999)` can't
         trivialize every fight - it rewards printing *a* meaningful
         number, not the single biggest one you can type.
       - If the output has no numbers at all (e.g. `print("Hello!")`),
         damage falls back to 5 per line printed, so early, numberless
         lessons still land a basic hit.
       - A small +2 flat bonus per line that mentions "attack".
    3. Small bonuses for Python technique, layered on top of the base:
       for/while loops, if-statements, def, range(), arithmetic operators,
       list comprehensions, f-strings, and variable assignments (each
       individually capped so no single trick dominates). These exist so
       there's still a reason to write idiomatic code, but they no longer
       outweigh what you actually printed.
    4. Elemental spells: if the output mentions "fire", "ice", or
       "thunder", damage is floored at 62 and given +8 on top (skilled
       code can push it higher) - roughly 70% of the overall cap. This
       matters because casting a spell costs the player 8 MP client-side
       (see BattleScene.playerAttack/detectSpellElement), so a spell needs
       to clearly outperform a free basic attack to be worth casting.
    5. A final +/-10% random variance is applied.
    6. The result is clamped to [1, 100] - every successful run does at
       least 1 damage, and 100 is the hard ceiling no combination of
       bonuses can exceed.
    """
    if stderr:
        return 0

    damage = 0

    if stdout:
        numbers = [abs(int(n)) for n in re.findall(r'-?\d+', stdout)]
        if numbers:
            # Capped so a bare print(99999) can't trivialize the fight -
            # the cap rewards printing *a* meaningful number, not the
            # biggest one you can type.
            damage += min(sum(numbers), 60)
        else:
            # No numbers printed (e.g. print("Hello, World!")) - fall back
            # to a modest per-line amount so early lessons still do something
            damage += len(stdout.strip().split('\n')) * 5

        for line in stdout.split('\n'):
            if 'attack' in line.lower():
                damage += 2

    # Smaller bonuses for good Python technique, layered on top
    if 'for ' in code:
        damage += 5
        if code.count('for ') > 1:
            damage += 5

    if 'while ' in code:
        damage += 4

    if 'if ' in code:
        damage += 3

    if 'def ' in code:
        damage += 8

    if 'range(' in code:
        damage += 3

    if any(op in code for op in ['+', '-', '*', '/', '//', '%', '**']):
        damage += 2

    if '[' in code and 'for' in code and ']' in code:
        damage += 10

    if 'f"' in code or "f'" in code:
        damage += 4

    assignment_count = len(re.findall(r'\w+\s*=\s*[^=]', code))
    damage += min(assignment_count * 2, 10)

    # Elemental spells (fire/ice/thunder) cost MP client-side, so they need
    # to hit hard enough to be worth it - guarantee a strong hit around 70%
    # of the damage cap, with skilled code still pushing it higher.
    if stdout and any(k in stdout.lower() for k in ('fire', 'ice', 'thunder')):
        damage = max(damage, 62) + 8

    # Add some randomness (10% variation)
    import random
    damage = int(damage * (0.9 + random.random() * 0.2))

    # Every successful run still lands *something*, capped as before
    return min(max(damage, 1), 100)


def _has_try_except(code):
    """Whether the submitted code contains a try/except block anywhere.

    Used by Boss: Unhandled Exception - its retaliation hits harder unless
    you actually used try/except that turn (see BattleScene.enemyTurn()),
    so the boss's gimmick is the concept its name references, not flavor.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False
    return any(isinstance(node, ast.Try) for node in ast.walk(tree))


def _apply_item_uses(player, inventory_locals, used_items_log):
    """Persist the effect of use_item() calls made mid-battle: heal by the
    item's is_usable_in_battle bonus (battle context, deliberately not the
    is_usable_in_field flag the overworld console checks - same fields
    happen to be True on both potions today, but the two checks are
    intentionally separate), and sync just the touched items' quantities
    back to real PlayerInventory rows - nothing else in `inventory` this
    turn's code may have looked at (but not used) gets written."""
    hp_healed = 0
    mp_healed = 0
    touched_names = {name for name, _ in used_items_log}

    for name, amount in used_items_log:
        item = GameItem.objects.filter(name=name).first()
        if item and item.is_usable_in_battle:
            hp_healed += item.hp_bonus * amount
            mp_healed += item.mp_bonus * amount

    with transaction.atomic():
        if hp_healed or mp_healed:
            player.current_hp = min(player.max_hp, player.current_hp + hp_healed)
            player.current_mp = min(player.max_mp, player.current_mp + mp_healed)
            player.save()

        final_quantities = {}
        for entry in inventory_locals:
            name = entry.get('name')
            if name in touched_names:
                final_quantities[name] = final_quantities.get(name, 0) + entry.get('quantity', 0)

        existing = {
            pi.item.name: pi for pi in
            PlayerInventory.objects.filter(player=player, item__name__in=touched_names).select_related('item')
        }
        for name in touched_names:
            quantity = final_quantities.get(name, 0)
            if name not in existing:
                continue
            if quantity <= 0:
                existing[name].delete()
            else:
                existing[name].quantity = quantity
                existing[name].save()

    heal_text = ''
    if used_items_log:
        summary = ', '.join(f'{amt}x {name}' for name, amt in used_items_log)
        heal_bits = []
        if hp_healed:
            heal_bits.append(f'+{hp_healed} HP')
        if mp_healed:
            heal_bits.append(f'+{mp_healed} MP')
        heal_text = f'\nUsed {summary}' + (f' ({", ".join(heal_bits)})' if heal_bits else '')

    return {
        'heal_text': heal_text,
        'inventory': _inventory_snapshot(player),
        'player': {'current_hp': player.current_hp, 'current_mp': player.current_mp},
    }


# Player-stat fields the inventory/progression console is allowed to touch.
# Deliberately excludes hp/mp (battle-only, not something you edit from a
# menu) and level/experience (only addExperience()/level_up() should move
# those) - just the numbers skill points buy.
PLAYER_EDITABLE_FIELDS = [
    'attack', 'defense', 'magic_attack', 'magic_defense', 'speed',
    'max_hp', 'max_mp', 'skill_points',
]


def _player_snapshot(player):
    snapshot = {field: getattr(player, field) for field in PLAYER_EDITABLE_FIELDS}
    # current_hp/current_mp are reported but never player-editable here (see
    # the item-consumption healing block below) - HP/MP only move via real
    # game effects (battle damage, or "using" a consumable), never by a
    # player just setting the number.
    snapshot['current_hp'] = player.current_hp
    snapshot['current_mp'] = player.current_mp
    # gold can be freely increased from this console (finding coins in a
    # chest is harmless) but never decreased here - spending only happens
    # at the shop (execute_shop_code), which computes the real total from
    # actual purchases rather than trusting a number the code sets.
    snapshot['gold'] = player.gold
    return snapshot


EQUIPMENT_SLOTS = {'weapon', 'armor', 'accessory'}
EQUIP_BONUS_FIELDS = {
    'attack_bonus': 'attack', 'defense_bonus': 'defense',
    'magic_attack_bonus': 'magic_attack', 'magic_defense_bonus': 'magic_defense',
    'speed_bonus': 'speed', 'hp_bonus': 'max_hp', 'mp_bonus': 'max_mp',
}


def _inventory_snapshot(player):
    return [
        {'name': pi.item.name, 'type': pi.item.item_type, 'quantity': pi.quantity, 'equipped': pi.is_equipped}
        for pi in PlayerInventory.objects.filter(player=player).select_related('item')
    ]


def _use_item_helper(items, name, amount=1):
    """Exposed to the inventory console as use_item() - a shortcut for the
    for-loop players would otherwise have to write to decrease an item's
    quantity by hand. Mutates the same list the console diffs afterward, so
    "using" an item this way is indistinguishable from doing it manually -
    it's sugar, not a separate code path. Equip toggling has no equivalent
    helper (yet); this is scoped to consumption only, per the user's ask."""
    for entry in items:
        if isinstance(entry, dict) and entry.get('name') == name:
            entry['quantity'] = entry.get('quantity', 1) - amount
            return True
    return False


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def execute_inventory_code(request):
    """Run player-authored Python against their real inventory/stats.

    Same safety model as execute_python_code (AST whitelist + restricted
    exec, see CodeValidator/SAFE_BUILTINS above), but instead of parsing
    printed output for a damage number, the code's actual effect on two
    plain-dict locals - `inventory` (list of {name, type, quantity}) and
    `player` (a handful of whitelisted stat fields) - is read back after
    execution and diffed against the starting snapshot. Only plain dicts
    are ever exposed to exec(), never live model instances, so player code
    has no path to .save()/.delete() or any other model machinery - the
    view is the only thing that touches the database.
    """
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'output': '', 'error': 'Invalid request format'}, status=400)

    is_safe, message = CodeValidator.is_safe(code)
    if not is_safe:
        return JsonResponse({'success': False, 'output': '', 'error': message})

    player = get_object_or_404(Player, user=request.user)
    starting_inventory = _inventory_snapshot(player)
    starting_player = _player_snapshot(player)

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    restricted_globals = {
        '__builtins__': SAFE_BUILTINS,
        '__name__': '__main__',
        '__doc__': None,
        '__package__': None,
    }
    # Deep-ish copies so the player's code can freely mutate these without
    # touching the "starting" snapshot we diff against below.
    local_vars = {
        'inventory': [dict(item) for item in starting_inventory],
        'player': dict(starting_player),
        'use_item': _use_item_helper,
    }

    try:
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            exec(code, restricted_globals, local_vars)
    except SyntaxError as e:
        return JsonResponse({'success': False, 'output': '', 'error': f"SyntaxError: {str(e)} on line {e.lineno}"})
    except Exception as e:
        return JsonResponse({'success': False, 'output': stdout_buffer.getvalue(), 'error': f"{type(e).__name__}: {str(e)}"})

    stderr_output = stderr_buffer.getvalue()
    if stderr_output:
        return JsonResponse({'success': False, 'output': stdout_buffer.getvalue(), 'error': stderr_output})

    new_inventory = local_vars.get('inventory')
    new_player = local_vars.get('player')

    if not isinstance(new_inventory, list) or not all(isinstance(i, dict) and 'name' in i for i in new_inventory):
        return JsonResponse({
            'success': False, 'output': stdout_buffer.getvalue(),
            'error': "`inventory` must stay a list of item dicts with at least a \"name\" key"
        })
    if not isinstance(new_player, dict):
        return JsonResponse({
            'success': False, 'output': stdout_buffer.getvalue(),
            'error': "`player` must stay a dict"
        })

    # Collapse to name -> total quantity (a player could append the same
    # item twice, or set quantity directly - both are valid list-of-dicts
    # code, so we sum rather than pick one).
    desired_quantities = {}
    for entry in new_inventory:
        name = str(entry.get('name', '')).strip()
        if not name:
            continue
        qty = entry.get('quantity', 1)
        if not isinstance(qty, int):
            return JsonResponse({
                'success': False, 'output': stdout_buffer.getvalue(),
                'error': f'Item "{name}" has a non-integer quantity'
            })
        desired_quantities[name] = desired_quantities.get(name, 0) + qty

    # Resolve every referenced item to a real GameItem BEFORE writing
    # anything, so a bad/unknown name aborts cleanly instead of leaving a
    # half-applied inventory.
    resolved_items = {}
    for name in desired_quantities:
        item = GameItem.objects.filter(name=name).first()
        if item is None:
            return JsonResponse({
                'success': False, 'output': stdout_buffer.getvalue(),
                'error': f'Unknown item: "{name}"'
            })
        resolved_items[name] = item

    # Whitelisted player-stat deltas only. Validated BEFORE any clamping -
    # an earlier version silently clamped a negative skill_points to 0,
    # which defeated the spend check whenever a player started at exactly
    # 0 points (the most common case). Reject instead of clamping.
    new_player_values = dict(starting_player)
    for field in PLAYER_EDITABLE_FIELDS:
        if field in new_player:
            value = new_player[field]
            if not isinstance(value, int):
                return JsonResponse({
                    'success': False, 'output': stdout_buffer.getvalue(),
                    'error': f'`player["{field}"]` must be an integer'
                })
            if value < 0:
                return JsonResponse({
                    'success': False, 'output': stdout_buffer.getvalue(),
                    'error': f'`player["{field}"]` can\'t go negative'
                })
            new_player_values[field] = value

    # skill_points is the currency: every point of increase to any other
    # stat must be paid for 1-for-1 by a matching decrease in skill_points.
    # This also catches skill_points being raised directly (not a real
    # spend path - those only come from leveling, via sync_stats).
    skill_points_spent = starting_player['skill_points'] - new_player_values['skill_points']
    stat_points_gained = sum(
        max(0, new_player_values[f] - starting_player[f])
        for f in PLAYER_EDITABLE_FIELDS if f != 'skill_points'
    )
    if stat_points_gained > 0 and skill_points_spent < stat_points_gained:
        return JsonResponse({
            'success': False, 'output': stdout_buffer.getvalue(),
            'error': f'Not enough skill points: that costs {stat_points_gained}, '
                     f'you spent {max(0, skill_points_spent)}'
        })
    if skill_points_spent < 0:
        return JsonResponse({
            'success': False, 'output': stdout_buffer.getvalue(),
            'error': 'skill_points can only go up by leveling, not from this console'
        })

    # gold: free to increase (finding coins), never to decrease here -
    # spending only happens at the shop.
    new_gold = starting_player['gold']
    if 'gold' in new_player:
        value = new_player['gold']
        if not isinstance(value, int):
            return JsonResponse({
                'success': False, 'output': stdout_buffer.getvalue(),
                'error': '`player["gold"]` must be an integer'
            })
        if value < starting_player['gold']:
            return JsonResponse({
                'success': False, 'output': stdout_buffer.getvalue(),
                'error': 'gold can only decrease at the shop, not from this console'
            })
        new_gold = value

    # Using a consumable is expressed the same way any other inventory edit
    # is: decrease its quantity. Whatever amount of a usable-in-field item
    # actually went down between the starting and final inventory is "used"
    # - this heals the player by that item's hp_bonus/mp_bonus (already on
    # GameItem, just unused until now), applied server-side and clamped to
    # max_hp/max_mp, never something the player's code sets directly.
    starting_quantities = {item['name']: item['quantity'] for item in starting_inventory}
    hp_healed = 0
    mp_healed = 0
    used_items = []
    for name, start_qty in starting_quantities.items():
        consumed = max(0, start_qty - desired_quantities.get(name, 0))
        if consumed <= 0:
            continue
        item = resolved_items.get(name) or GameItem.objects.filter(name=name).first()
        if item and item.is_usable_in_field and (item.hp_bonus or item.mp_bonus):
            hp_healed += item.hp_bonus * consumed
            mp_healed += item.mp_bonus * consumed
            used_items.append((name, consumed))

    # Equipping is expressed by setting an item dict's "equipped" key, same
    # spirit as using an item - a state change the diff detects, not a
    # separate verb. Only one item per slot (weapon/armor/accessory, taken
    # straight from GameItem.item_type) can be equipped; if the code marks
    # more than one in the same slot, the last one in the list wins.
    starting_equipped = {item['name']: item.get('equipped', False) for item in starting_inventory}
    equipped_by_slot = {}
    for entry in new_inventory:
        name = str(entry.get('name', '')).strip()
        if not name or not entry.get('equipped'):
            continue
        item = resolved_items.get(name) or GameItem.objects.filter(name=name).first()
        if item and item.item_type in EQUIPMENT_SLOTS:
            equipped_by_slot[item.item_type] = name
    desired_equipped = set(equipped_by_slot.values())

    equip_bonus_deltas = {field: 0 for field in EQUIP_BONUS_FIELDS.values()}
    equip_changes = []
    for name in set(starting_equipped) | set(desired_quantities):
        was_equipped = starting_equipped.get(name, False)
        now_equipped = name in desired_equipped and desired_quantities.get(name, 0) > 0
        if was_equipped == now_equipped:
            continue
        item = resolved_items.get(name) or GameItem.objects.filter(name=name).first()
        if not item or item.item_type not in EQUIPMENT_SLOTS:
            continue
        sign = 1 if now_equipped else -1
        for bonus_field, player_field in EQUIP_BONUS_FIELDS.items():
            equip_bonus_deltas[player_field] += sign * getattr(item, bonus_field)
        equip_changes.append((name, now_equipped))

    final_player_values = {
        field: new_player_values[field] + equip_bonus_deltas.get(field, 0)
        for field in PLAYER_EDITABLE_FIELDS
    }

    with transaction.atomic():
        for field in PLAYER_EDITABLE_FIELDS:
            setattr(player, field, final_player_values[field])
        if hp_healed or mp_healed:
            player.current_hp = min(final_player_values['max_hp'], player.current_hp + hp_healed)
            player.current_mp = min(final_player_values['max_mp'], player.current_mp + mp_healed)
        player.gold = new_gold
        player.save()

        existing = {pi.item.name: pi for pi in PlayerInventory.objects.filter(player=player).select_related('item')}
        for name, quantity in desired_quantities.items():
            if quantity <= 0:
                if name in existing:
                    existing[name].delete()
                continue
            item = resolved_items[name]
            is_equip_target = name in desired_equipped and item.item_type in EQUIPMENT_SLOTS
            PlayerInventory.objects.update_or_create(
                player=player, item=item,
                defaults={
                    'quantity': quantity,
                    'is_equipped': is_equip_target,
                    'equipment_slot': item.item_type if is_equip_target else '',
                },
            )
        # Anything that existed before but was dropped from the list
        # entirely (not just zeroed) is removed too.
        for name, pi in existing.items():
            if name not in desired_quantities:
                pi.delete()

    output = stdout_buffer.getvalue()
    if used_items:
        summary = ', '.join(f'{qty}x {name}' for name, qty in used_items)
        heal_parts = []
        if hp_healed:
            heal_parts.append(f'+{hp_healed} HP')
        if mp_healed:
            heal_parts.append(f'+{mp_healed} MP')
        output += f'\nUsed {summary} ({", ".join(heal_parts)})'
    for name, now_equipped in equip_changes:
        output += f'\n{"Equipped" if now_equipped else "Unequipped"} {name}'

    return JsonResponse({
        'success': True,
        'output': output,
        'error': '',
        'inventory': _inventory_snapshot(player),
        'player': _player_snapshot(player),
    })


def _shop_catalog():
    """Everything sellable-to-the-player: any non-key item with a real
    buy_price. Bronze Key (buy_price=0, a quest item) is naturally excluded."""
    return [
        {'name': item.name, 'type': item.item_type, 'buy_price': item.buy_price, 'sell_price': item.sell_price}
        for item in GameItem.objects.exclude(item_type='key').filter(buy_price__gt=0)
    ]


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def execute_shop_code(request):
    """Buy/sell at a shop, same safety model as execute_inventory_code, but
    scope is narrower and gold is never player-set: the code edits
    `inventory` same as anywhere else, and the resulting quantity deltas
    ARE the transaction - more of an item than you had is bought (at
    `shop` catalog buy_price), less is sold (at sell_price). `player["gold"]`
    is informational only; the real new balance is always computed from
    the actual deltas, never trusted from the code, so there's no path to
    just setting a number. Equip state and stat editing are out of scope
    here (see execute_inventory_code for those) - a shop only trades items
    for gold.
    """
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'output': '', 'error': 'Invalid request format'}, status=400)

    is_safe, message = CodeValidator.is_safe(code)
    if not is_safe:
        return JsonResponse({'success': False, 'output': '', 'error': message})

    player = get_object_or_404(Player, user=request.user)
    starting_inventory = _inventory_snapshot(player)
    catalog = _shop_catalog()
    catalog_by_name = {item['name']: item for item in catalog}

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    restricted_globals = {
        '__builtins__': SAFE_BUILTINS,
        '__name__': '__main__',
        '__doc__': None,
        '__package__': None,
    }
    local_vars = {
        'inventory': [dict(item) for item in starting_inventory],
        'player': {'gold': player.gold},
        'shop': [dict(item) for item in catalog],
    }

    try:
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            exec(code, restricted_globals, local_vars)
    except SyntaxError as e:
        return JsonResponse({'success': False, 'output': '', 'error': f"SyntaxError: {str(e)} on line {e.lineno}"})
    except Exception as e:
        return JsonResponse({'success': False, 'output': stdout_buffer.getvalue(), 'error': f"{type(e).__name__}: {str(e)}"})

    stderr_output = stderr_buffer.getvalue()
    if stderr_output:
        return JsonResponse({'success': False, 'output': stdout_buffer.getvalue(), 'error': stderr_output})

    new_inventory = local_vars.get('inventory')
    if not isinstance(new_inventory, list) or not all(isinstance(i, dict) and 'name' in i for i in new_inventory):
        return JsonResponse({
            'success': False, 'output': stdout_buffer.getvalue(),
            'error': "`inventory` must stay a list of item dicts with at least a \"name\" key"
        })

    desired_quantities = {}
    for entry in new_inventory:
        name = str(entry.get('name', '')).strip()
        if not name:
            continue
        qty = entry.get('quantity', 1)
        if not isinstance(qty, int):
            return JsonResponse({
                'success': False, 'output': stdout_buffer.getvalue(),
                'error': f'Item "{name}" has a non-integer quantity'
            })
        desired_quantities[name] = desired_quantities.get(name, 0) + qty

    starting_quantities = {item['name']: item['quantity'] for item in starting_inventory}
    all_names = set(starting_quantities) | set(desired_quantities)

    total_cost = 0
    total_revenue = 0
    bought = []
    sold = []
    resolved_items = {}
    for name in all_names:
        delta = desired_quantities.get(name, 0) - starting_quantities.get(name, 0)
        if delta == 0:
            continue
        catalog_item = catalog_by_name.get(name)
        if delta > 0:
            if not catalog_item:
                return JsonResponse({
                    'success': False, 'output': stdout_buffer.getvalue(),
                    'error': f'"{name}" isn\'t for sale here'
                })
            total_cost += catalog_item['buy_price'] * delta
            bought.append((name, delta))
        else:
            sold_qty = -delta
            # Selling something not in the catalog (e.g. a quest key) isn't
            # meaningful - GameItem always has a sell_price, so just look
            # the item up directly rather than requiring it be buyable.
            item = GameItem.objects.filter(name=name).first()
            if not item:
                return JsonResponse({
                    'success': False, 'output': stdout_buffer.getvalue(),
                    'error': f'Unknown item: "{name}"'
                })
            resolved_items[name] = item
            total_revenue += item.sell_price * sold_qty
            sold.append((name, sold_qty))
        if catalog_item and name not in resolved_items:
            item = GameItem.objects.filter(name=name).first()
            if item:
                resolved_items[name] = item

    new_gold = player.gold - total_cost + total_revenue
    if new_gold < 0:
        return JsonResponse({
            'success': False, 'output': stdout_buffer.getvalue(),
            'error': f'Not enough gold: that costs {total_cost}, you have {player.gold}'
        })

    with transaction.atomic():
        player.gold = new_gold
        player.save()

        existing = {pi.item.name: pi for pi in PlayerInventory.objects.filter(player=player).select_related('item')}
        for name, quantity in desired_quantities.items():
            if quantity <= 0:
                if name in existing:
                    existing[name].delete()
                continue
            item = resolved_items.get(name) or GameItem.objects.filter(name=name).first()
            defaults = {'quantity': quantity}
            # Preserve existing equip state untouched - the shop only
            # trades items, it doesn't know or care about equipment.
            if name in existing:
                defaults['is_equipped'] = existing[name].is_equipped
                defaults['equipment_slot'] = existing[name].equipment_slot
            PlayerInventory.objects.update_or_create(player=player, item=item, defaults=defaults)
        for name, pi in existing.items():
            if name not in desired_quantities:
                pi.delete()

    output = stdout_buffer.getvalue()
    if bought:
        output += '\nBought ' + ', '.join(f'{qty}x {name}' for name, qty in bought) + f' (-{total_cost} gold)'
    if sold:
        output += '\nSold ' + ', '.join(f'{qty}x {name}' for name, qty in sold) + f' (+{total_revenue} gold)'

    return JsonResponse({
        'success': True,
        'output': output,
        'error': '',
        'inventory': _inventory_snapshot(player),
        'player': {'gold': player.gold},
        'shop': catalog,
    })