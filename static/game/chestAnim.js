// chestAnim.js - one-shot chest-opening animation, same pattern as the
// hero/enemy attack animations (heroAnim.js / enemyAnim.js): a spritesheet
// played once (repeat: 0) with an animationcomplete listener to settle on
// the final open frame.
//
// Different zones use differently-styled chest art (matched to each zone's
// own color palette via a style reference at generation time), so both the
// animation key and its source spritesheet are parameterized rather than
// hardcoded to one texture.
export const CHEST_OPEN_ANIM_KEY = 'chest-open-anim';
export const FOREST_CHEST_OPEN_ANIM_KEY = 'chest-forest-open-anim';

export function createChestOpenAnimation(scene, opts = {}) {
    const { animKey = CHEST_OPEN_ANIM_KEY, textureKey = 'chest-open', frameEnd = 6 } = opts;
    if (scene.anims.exists(animKey)) return;

    scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: frameEnd }),
        frameRate: 8,
        repeat: 0
    });
}

// Three different "notice me" treatments to compare in-game - each stops
// once the chest's item is actually taken (nothing left to draw attention
// to). Small vertical/scale tweens directly on the chest sprite follow the
// same pattern already used elsewhere for static-body decorations (e.g.
// the boss key's bob tween) - a few px of visual drift from the physics
// body is an accepted look in this codebase, not a bug.
function applyStandoutEffect(scene, chest, x, y, style, chestId) {
    if (style === 'glow') {
        // Chest itself stays put on the ground - only the light beneath it
        // breathes. An earlier version also bobbed the chest up and down,
        // which read as floating/levitating rather than glowing.
        const glow = scene.add.circle(x, y + 14, 36, 0xffe066, 0.28).setDepth(-0.5);
        scene.tweens.add({
            targets: glow, alpha: 0.08, scale: 1.35,
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        const stopEvent = scene.time.addEvent({
            delay: 500, loop: true,
            callback: () => {
                if (!window.gameState.isChestItemTaken(chestId)) return;
                glow.destroy();
                stopEvent.remove();
            }
        });
    } else if (style === 'sparkle') {
        const sparkleEvent = scene.time.addEvent({
            delay: 550, loop: true,
            callback: () => {
                if (window.gameState.isChestItemTaken(chestId)) { sparkleEvent.remove(); return; }
                const sx = x + Phaser.Math.Between(-22, 22);
                const sy = y + Phaser.Math.Between(-14, 6);
                const sparkle = scene.add.circle(sx, sy, 3, 0xfff2a8, 0.95).setDepth(1);
                scene.tweens.add({
                    targets: sparkle, y: sy - 34, alpha: 0,
                    duration: 900, ease: 'Sine.easeOut',
                    onComplete: () => sparkle.destroy()
                });
            }
        });
    } else if (style === 'pulse') {
        let pulseOn = false;
        const baseScaleX = chest.scaleX;
        const baseScaleY = chest.scaleY;
        const pulseEvent = scene.time.addEvent({
            delay: 700, loop: true,
            callback: () => {
                if (window.gameState.isChestItemTaken(chestId)) {
                    pulseEvent.remove();
                    chest.clearTint();
                    return;
                }
                pulseOn = !pulseOn;
                chest.setTint(pulseOn ? 0xfff2a8 : 0xffffff);
            }
        });
        scene.tweens.add({
            targets: chest, scaleX: baseScaleX * 1.07, scaleY: baseScaleY * 0.94,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }
}

// A re-openable treasure chest: standing next to it and pressing E opens
// the lid and (if the item hasn't been taken yet) launches the inventory
// console pre-filled with a pickup line. Closing the console closes the
// lid again - taking the item or not is entirely up to whether the player
// actually runs the code, same as any other inventory edit. Once the item
// really is in the inventory (checked against the real result, not just
// "was this code run"), the chest permanently shows empty.
//
// Deliberately requires a keypress rather than opening on overlap - every
// zone already declares an 'E' interact key (this.interactKey) that
// nothing ever wired up; this uses its own key binding instead of reaching
// into the zone scene's, so it doesn't depend on setupControls() having
// run yet by the time this is called.
//
// opts: { chestId, itemName, itemType = 'key', scale = 1.125, goldAmount = 0, // scale +25% (was 0.9)
//         closedTexture = 'chest-forest', openTexture = 'chest-forest-open',
//         animKey = FOREST_CHEST_OPEN_ANIM_KEY, standout = 'glow' | 'sparkle' | 'pulse' | 'none' }
export function createChestController(scene, x, y, opts) {
    const {
        // Print Forest's warm-toned chest art is the shared design every
        // zone's chest uses by default now, not a per-zone palette.
        chestId, itemName, itemType = 'key', scale = 1.125, goldAmount = 0, // scale +25% (was 0.9)
        closedTexture = 'chest-forest', openTexture = 'chest-forest-open', animKey = FOREST_CHEST_OPEN_ANIM_KEY,
        standout = 'none'
    } = opts;

    const taken = window.gameState.isChestItemTaken(chestId);
    const chest = scene.physics.add.staticSprite(x, y, taken ? openTexture : closedTexture, taken ? 6 : 0);
    chest.setScale(scale);
    chest.refreshBody();
    // Chests are created after the player in every zone, so by default
    // (insertion-order) depth they'd always draw on top of the player
    // sprite, even when the player is standing in front of the chest.
    // A fixed depth below the player's default (0) but above the
    // background (-1) fixes that without needing full per-frame y-sorting.
    chest.setDepth(-0.1);

    // Chests are solid - like every other level prop, the player can't
    // just walk through one.
    scene.physics.add.collider(scene.player, chest);

    // A few different "notice me" treatments, applied per-zone right now
    // so they can be compared side by side in-game - not meant to all
    // ship at once. Stops once the item's actually been taken (nothing
    // left to draw attention to).
    if (!taken) applyStandoutEffect(scene, chest, x, y, standout, chestId);

    const interactKey = scene.input.keyboard.addKey('E');
    const prompt = scene.add.text(x, y - 60, 'Press E', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffe066',
        stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false);

    let isOpen = taken;
    let isAnimating = false;
    let cooldownUntil = 0;
    let playerNearby = false;

    function closeChest() {
        if (!isOpen || isAnimating) return;
        isAnimating = true;
        chest.playReverse(animKey);
        chest.once('animationcomplete', () => {
            isOpen = false;
            isAnimating = false;
            cooldownUntil = scene.time.now + 400;
        });
    }

    function openChest() {
        if (isOpen || isAnimating || scene.time.now < cooldownUntil) return;
        isAnimating = true;
        prompt.setVisible(false);
        chest.play(animKey);
        chest.once('animationcomplete', () => {
            isOpen = true;
            isAnimating = false;

            if (window.gameState.isChestItemTaken(chestId)) {
                // Already looted - just a quick peek, then it closes itself
                // since there's no console to close it for us.
                scene.time.delayedCall(1000, closeChest);
                return;
            }

            const goldLine = goldAmount > 0 ? `\nplayer["gold"] += ${goldAmount}` : '';
            scene.scene.pause();
            scene.scene.launch('InventoryScene', {
                returnScene: scene.scene.key,
                initialCode: `inventory.append({"name": "${itemName}", "type": "${itemType}", "quantity": 1})${goldLine}`,
                chestId,
                watchItemName: itemName,
                onChestClose: closeChest
            });
        });
    }

    // Proximity for the "Press E" prompt/interaction is a plain distance
    // check, not scene.physics.overlap() - now that the chest is a solid
    // collider, Arcade Physics separates the two bodies to just touching
    // every frame, so an AABB overlap test would never actually go true.
    // Must clear the resting distance the collider itself leaves between
    // the two bodies once blocked, or the prompt could never actually
    // appear - measured close to the previous 60*scale value with barely
    // any margin, so this is deliberately more generous.
    const interactRadius = 85 * scale;

    // No per-zone update() to hook into reliably, so this listens on the
    // scene's own update event directly - fires every tick regardless of
    // whether the zone file defines its own update().
    scene.events.on('update', () => {
        if (!scene.player || !scene.player.body) return;
        const overlapping = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, x, y) < interactRadius;

        if (overlapping !== playerNearby) {
            playerNearby = overlapping;
            prompt.setVisible(overlapping && !isOpen && !isAnimating);
        }

        if (overlapping && !isOpen && !isAnimating && Phaser.Input.Keyboard.JustDown(interactKey)) {
            openChest();
        }
    });

    return chest;
}
