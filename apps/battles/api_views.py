import json
import sys
import io
import traceback
import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from contextlib import redirect_stdout, redirect_stderr
import ast

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
        
        # Validate code first
        is_safe, message = CodeValidator.is_safe(code)
        if not is_safe:
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
        
        # Execute the code with output redirection
        try:
            with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                exec(code, restricted_globals, {})
            
            stdout_output = stdout_buffer.getvalue()
            stderr_output = stderr_buffer.getvalue()
            
            # Calculate damage based on actual execution
            damage = calculate_damage_from_execution(code, stdout_output, stderr_output)
            
            return JsonResponse({
                'success': True,
                'output': stdout_output,
                'error': stderr_output,
                'damage': damage
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