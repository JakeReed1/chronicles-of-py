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

Each turn, the player types real Python code into an in-battle editor. It's
run server-side in a sandbox (`apps/battles/api_views.py: execute_python_code`),
and the resulting damage is calculated by `calculate_damage_from_execution`
in that same file - that function's docstring is the authoritative
reference for the formula, but the short version:

- **Numbers you print are your damage.** `print("Deal 15 damage!")` hits
  for ~15. All numbers found in the output are summed, capped at 60 so a
  bare `print(99999)` can't trivialize a fight.
- **No numbers printed?** Falls back to 5 damage per line printed, so
  early lessons like `print("Hello, World!")` still land a basic hit.
- **Python technique earns smaller bonuses on top** - loops, `if`,
  `def`, f-strings, arithmetic, list comprehensions, and variable
  assignments each add a bit more, individually capped.
- **Elemental spells hit hard.** Printing "Fire", "Ice", or "Thunder"
  floors damage at 62 (+8 more for skilled code) - roughly 70% of the
  cap - because casting one costs the player 8 MP client-side
  (`BattleScene.playerAttack`/`detectSpellElement`), so it needs to
  clearly beat a free basic attack.
- **Errors deal 0 damage.** A syntax/runtime error means no hit that turn.
- **Overall cap: 100.** No combination of bonuses can exceed it; every
  successful run deals at least 1.

`BattleScene.js` then applies the player's Attack stat (from leveling up)
as a further multiplier on the server's number before it's subtracted
from the enemy's HP.

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