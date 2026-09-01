// Shared hero animation helpers - the hero_walk.png spritesheet (built from
// a PixelLab 8-direction character + walk-8-frames animation) is a 92x92
// grid, 8 columns (directions, left to right) x 9 rows (row 0 = idle
// stance, rows 1-8 = walk frames 0-7).
export const HERO_DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

// Maps the held movement keys to one of the 8 sprite directions. Returns
// null when nothing is held, so callers can fall back to the idle pose.
export function directionFromInput(up, down, left, right) {
    if (up && left) return 'north-west';
    if (up && right) return 'north-east';
    if (down && left) return 'south-west';
    if (down && right) return 'south-east';
    if (up) return 'north';
    if (down) return 'south';
    if (left) return 'west';
    if (right) return 'east';
    return null;
}

export function heroIdleFrame(direction) {
    return HERO_DIRECTIONS.indexOf(direction);
}

export function heroWalkAnimKey(direction) {
    return 'walk-' + direction;
}

// Registers the 8 walk animations on the scene's (game-global) animation
// manager. Safe to call from every scene that uses the hero sprite - guarded
// so re-entering PreloadScene doesn't try to recreate existing anims.
export function createHeroAnimations(scene) {
    if (scene.anims.exists(heroWalkAnimKey('south'))) return;

    HERO_DIRECTIONS.forEach((dir, col) => {
        const frames = [];
        for (let f = 0; f < 8; f++) {
            frames.push({ key: 'hero', frame: (f + 1) * 8 + col });
        }
        scene.anims.create({
            key: heroWalkAnimKey(dir),
            frames,
            frameRate: 10,
            repeat: -1
        });
    });
}

export const HERO_ATTACK_ANIM_KEY = 'attack-hero';

// The battle-only attack animation lives on its own 'hero-attack' texture
// (a separate 164px spritesheet) since v3 custom animations render on their
// own canvas size, distinct from the 128px walk/idle grid on 'hero'. Frame 0
// of that sheet is the unanimated reference frame, so playback starts at 1.
export function createHeroAttackAnimation(scene) {
    if (scene.anims.exists(HERO_ATTACK_ANIM_KEY)) return;

    const frames = [];
    for (let f = 1; f <= 8; f++) {
        frames.push({ key: 'hero-attack', frame: f });
    }
    scene.anims.create({
        key: HERO_ATTACK_ANIM_KEY,
        frames,
        frameRate: 14,
        repeat: 0
    });
}
