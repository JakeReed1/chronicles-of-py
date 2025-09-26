# Chronicles of Py

A web-based JRPG that teaches Python programming through turn-based battles and adventures. Built with Phaser 3 for the game engine and Django for the backend.

## Architecture

- **Frontend**: Phaser 3 game engine for rich, interactive gameplay
- **Backend**: Django REST API for authentication, progress tracking, and educational content
- **Educational**: Integrated Python lessons and coding challenges
- **Safe Execution**: RestrictedPython for secure code evaluation

## Features

- **Interactive Game World**: Explore a fantasy world powered by Phaser 3
- **Code-Based Combat**: Write Python code to cast spells and defeat enemies
- **Progressive Learning**: Start with `print()` and advance to complex algorithms
- **Persistent Progress**: Save your game state and continue anytime
- **Educational Content**: Built-in Python lessons and challenges

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