// Shared enemy animation helper. Every enemy texture is a 9-frame
// spritesheet (frame 0 = idle/overworld pose, frames 1-8 = attack motion),
// built from a PixelLab animate_image call on that enemy's base art.
export const ENEMY_TEXTURE_KEYS = [
    'enemy-if-golem', 'enemy-elif-checker', 'enemy-else-wraith', 'enemy-boss-dragon',
    'enemy-slime', 'enemy-boss-glitch', 'enemy-treant', 'enemy-boss-treant'
];

export function enemyAttackAnimKey(textureKey) {
    return 'attack-' + textureKey;
}

// Registers one attack animation per enemy texture on the scene's
// (game-global) animation manager. Safe to call repeatedly - guarded so
// re-entering PreloadScene doesn't try to recreate existing anims.
export function createEnemyAnimations(scene) {
    ENEMY_TEXTURE_KEYS.forEach(key => {
        const animKey = enemyAttackAnimKey(key);
        if (scene.anims.exists(animKey)) return;

        const frames = [];
        for (let f = 1; f <= 8; f++) {
            frames.push({ key, frame: f });
        }
        scene.anims.create({
            key: animKey,
            frames,
            frameRate: 12,
            repeat: 0
        });
    });
}
