// battleEncounter.js - shared "walk into an enemy -> fight" transition,
// used identically by all three zone scenes (was previously copy-pasted
// three times as each scene's own startBattle()).
//
// Adds a brief collision beat (shake, flash, impact burst, a small
// knockback apart) before the existing fade-to-BattleScene, so bumping
// into an enemy reads as an actual collision instead of an instant cut.
export function triggerBattleEncounter(scene, { player, enemy, returnScene }) {
    // Disable enemy to prevent multiple triggers
    enemy.disableBody(true, false);
    if (player.body) player.body.setVelocity(0, 0);

    // Save player position before battle
    window.gameState.savePlayerPosition(player.x, player.y);

    // Store enemy data for battle
    window.gameState.currentEnemy = {
        name: enemy.name,
        difficulty: enemy.difficulty,
        sprite: enemy.texture.key,
        id: enemy.id,
        stats: enemy.stats
    };

    // Remember which zone to return to after the battle
    window.gameState.battleReturnScene = returnScene;

    // Collision beat: a quick shake/flash and a burst of sparks at the
    // point of impact, plus a small knockback apart, before the existing
    // fade into battle - gives the encounter actual weight instead of
    // switching scenes the instant the two sprites touch.
    const midX = (player.x + enemy.x) / 2;
    const midY = (player.y + enemy.y) / 2;

    scene.cameras.main.shake(180, 0.006);
    scene.cameras.main.flash(150, 255, 255, 255);

    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spark = scene.add.circle(midX, midY, 5, 0xffffff, 0.9).setDepth(15);
        scene.tweens.add({
            targets: spark,
            x: midX + Math.cos(angle) * 40,
            y: midY + Math.sin(angle) * 40,
            alpha: 0,
            duration: 300,
            onComplete: () => spark.destroy()
        });
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const pushX = (dx / dist) * 14;
    const pushY = (dy / dist) * 14;
    scene.tweens.add({ targets: player, x: player.x + pushX, y: player.y + pushY, duration: 120, yoyo: true, ease: 'Power1' });
    scene.tweens.add({ targets: enemy, x: enemy.x - pushX, y: enemy.y - pushY, duration: 120, yoyo: true, ease: 'Power1' });

    // The transition runs off a timer rather than the
    // 'camerafadeoutcomplete' event - that event can fail to fire
    // (observed under software/headless rendering), which would
    // otherwise strand the player on a faded-out screen forever.
    scene.time.delayedCall(350, () => {
        scene.cameras.main.fade(500, 0, 0, 0);
        scene.time.delayedCall(500, () => {
            enemy.destroy();
            scene.scene.stop('UIScene');
            scene.scene.switch('BattleScene');
        });
    });
}
