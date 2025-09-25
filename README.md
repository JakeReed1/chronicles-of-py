# Chronicles of Py

A JRPG that teaches Python programming through turn-based battles and adventures. Players write Python code to cast spells, defeat enemies, and progress through the game world.

## Features

- **Turn-based battles** where attacks are Python functions
- **Progressive learning** from basic syntax to advanced concepts
- **Code-based magic system** using loops, conditionals, and more
- **Django-powered** web application
- **Safe code execution** with RestrictedPython

## Setup

1. Clone the repository
2. Create the mamba environment:
   ```bash
   mamba env create -f environment.yml
   mamba activate chronicles_of_py
   ```

3. Note: All dependencies are installed automatically with the environment creation

4. Copy `.env.example` to `.env` and configure your settings

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Load initial game data:
   ```bash
   python manage.py loaddata fixtures/initial_data.json
   ```

7. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

8. Run the development server:
   ```bash
   python manage.py runserver
   ```

## Game Concepts

### Battle System
- **Basic Attacks**: Use `print()` and variable assignment
- **Loop Magic**: `for` loops create multi-hit attacks
- **Conditional Shields**: `if/else` statements for defense
- **Class Transformations**: Define classes to unlock new abilities

### Learning Progression
1. **Tutorial Island**: Variables and print statements
2. **Loop Lagoon**: For and while loops
3. **Conditional Caverns**: If/elif/else logic
4. **Function Fortress**: Defining and calling functions
5. **Class Citadel**: Object-oriented programming
6. **Lambda Library**: Advanced Python concepts

## Development

Run tests:
```bash
pytest
```

## License

MIT License