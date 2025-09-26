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
    """Calculate damage based on actual code execution"""
    damage = 0
    
    # No damage if there were errors
    if stderr:
        return 0
    
    # Base damage for successful execution
    damage += 10
    
    # Damage based on output
    if stdout:
        lines = stdout.strip().split('\n')
        damage += len(lines) * 5  # 5 damage per output line
        
        # Bonus for specific patterns
        for line in lines:
            if 'attack' in line.lower():
                damage += 3
            if 'fire' in line.lower() or 'ice' in line.lower() or 'thunder' in line.lower():
                damage += 5
    
    # Analyze code structure
    lines_of_code = [l for l in code.split('\n') if l.strip() and not l.strip().startswith('#')]
    
    # Bonus for code complexity
    if 'for ' in code:
        damage += 10
        # Extra bonus for nested loops
        if code.count('for ') > 1:
            damage += 10
    
    if 'while ' in code:
        damage += 8
    
    if 'if ' in code:
        damage += 5
    
    if 'def ' in code:
        damage += 15
    
    # Bonus for using Python features
    if 'range(' in code:
        damage += 5
    
    if any(op in code for op in ['+', '-', '*', '/', '//', '%', '**']):
        damage += 3
    
    # List comprehension bonus
    if '[' in code and 'for' in code and ']' in code:
        damage += 20
    
    # F-string bonus
    if 'f"' in code or "f'" in code:
        damage += 8
    
    # Variable usage
    assignment_count = len(re.findall(r'\w+\s*=\s*[^=]', code))
    damage += assignment_count * 3
    
    # Add some randomness (10% variation)
    import random
    damage = int(damage * (0.9 + random.random() * 0.2))
    
    # Cap maximum damage
    return min(damage, 100)