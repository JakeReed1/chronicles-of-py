import { TEXT, createPanel, createGlowTitle } from '../../theme.js';
import { triggerBattleEncounter } from '../../battleEncounter.js';

// chestAnim.js and heroAnim.js are relative imports, invisible to
// game.html's top-level cache-busting (window.ASSET_VERSION) - a browser
// that already cached an older copy of either would keep serving those
// stale bytes here even after a normal reload, the same issue theme.js
// hit earlier. Versioned dynamic import dodges it for every consumer.
const localModuleVersion = window.ASSET_VERSION || Date.now();
const { createChestController } = await import(`../../chestAnim.js?v=${localModuleVersion}`);
const { directionFromInput, heroWalkAnimKey, heroRunAnimKey, heroIdleFrame } =
    await import(`../../heroAnim.js?v=${localModuleVersion}`);

const CAVERNS_CHEST_ID = 'caverns-chest-1';

// World Scene - Third Level: The Conditional Caverns
export default class ConditionalCavernsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ConditionalCavernsScene' });
    }

    create() {
        // Phaser reuses one scene instance for the lifetime of the game
        // rather than creating a fresh one per scene.start() - so a flag
        // set true on the way OUT of this zone would otherwise still read
        // true the next time the player enters it, permanently blocking
        // every future exit (this was the real cause behind "can leave
        // going backward but can never leave going forward again").
        this.zoneTransitioning = false;

        // Track which zone the player is in (used by save/load and battle returns)
        window.gameState.currentZone = 'ConditionalCavernsScene';

        // Disable gravity for top-down view
        this.physics.world.gravity.y = 0;

        // Set world bounds - same size as the other zones for consistency
        this.cameras.main.setBounds(0, 0, 2560, 1440);
        this.physics.world.setBounds(0, 0, 2560, 1440);

        // Create the third level - Conditional Caverns (top-down)
        this.createLevel();

        // Create player
        this.createPlayer();

        // Treasure chest - needs the player to already exist (its overlap
        // trigger references this.player). On open floor, clear of the
        // ruin/boulders/pit.
        this.chest = createChestController(this, 600, 950, {
            chestId: CAVERNS_CHEST_ID,
            itemName: 'Bronze Key',
            itemType: 'key',
            goldAmount: 25,
            standout: 'glow' // settled on this style (rune-emblem art + soft pulsing light) for all zones
        });

        // Create enemies
        this.createEnemies();

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(600, 300);
        this.cameras.main.setZoom(1.0);

        // Create UI overlay
        this.scene.launch('UIScene');

        // Set up collisions and interactions
        this.setupCollisions();

        // Show tutorial message
        this.showZoneMessage();

        // Set up controls
        this.setupControls();
    }

    createLevel() {
        // Single cohesive level background (PixelLab pro) - the watchtower
        // ruin is now painted directly into the scene (rather than a
        // separately composited sprite), so collision below is placed to
        // match what's actually drawn, the same technique used for Print
        // Forest's background.
        this.add.image(1280, 720, 'cave-background-v2').setDisplaySize(2560, 1440).setDepth(-1);

        // Create walls/obstacles group for collision
        this.walls = this.physics.add.staticGroup();

        // Border walls - invisible now that the background art itself shows
        // a rock-wall border around the edges of the cavern
        for (let x = 0; x < 80; x++) {
            this.walls.create(x * 32 + 16, 16, 'ground-tile').setVisible(false);
            this.walls.create(x * 32 + 16, 1424, 'ground-tile').setVisible(false);
        }
        for (let y = 0; y < 45; y++) {
            this.walls.create(16, y * 32 + 16, 'ground-tile').setVisible(false);
            this.walls.create(2544, y * 32 + 16, 'ground-tile').setVisible(false);
        }

        // Invisible collision boxes matching what's actually painted into
        // the background (mapped by inspecting the source art), instead of
        // composited sprites placed at guessed positions.
        const placeSolid = (x, y, width, height) => {
            const block = this.add.rectangle(x, y, width, height, 0x000000, 0);
            this.physics.add.existing(block, true);
            this.walls.add(block);
        };

        // Watchtower ruin (upper-middle) - a single solid footprint, clear
        // of the dark pit (roughly world x:1544-2140, y:713-1219)
        placeSolid(772, 338, 300, 400);

        // Scattered boulders sitting on open floor, avoiding the pit and
        // the ambiguous area right around its rim
        const boulderWorldPositions = [
            [149, 450], [930, 413], [1265, 405], [1302, 743],
            [279, 1013], [1005, 1181], [2289, 769], [2289, 1219], [354, 1294]
        ];
        boulderWorldPositions.forEach(([x, y]) => placeSolid(x, y, 70, 70));

        // The dark pit painted into the background is a hazard, not a
        // wall - walking into it (see setupCollisions()/fallInHole())
        // drops the player back into Loop Forest, down 20 HP, instead of
        // just being solid ground.
        // Deliberately smaller than the full painted pit (596x506) - only
        // its darker inner core is the actual hazard, so walking near the
        // rim/edge is safe and only stepping well into it triggers a fall.
        this.pitZone = this.add.zone(1842, 966, 320, 260);
        this.physics.add.existing(this.pitZone, true);

        // Level title
        createGlowTitle(this, 1280, 100, 'Level 3: The Conditional Caverns', {
            fontSize: 44,
            color: '#ffffff'
        });

        // Tip sign
        this.sign = this.physics.add.staticSprite(250, 600, 'ground-tile');
        this.sign.setTint(0xAA66FF);
        this.sign.setScale(2.0);
        this.add.text(250, 570, '!', {
            fontSize: '36px',
            color: '#AA66FF',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Return portal to Loop Forest
        this.loopPortal = this.physics.add.staticSprite(80, 720, 'ground-tile');
        this.loopPortal.setTint(0x00FFFF);
        this.loopPortal.setScale(2.5);
        this.loopPortal.refreshBody();

        this.tweens.add({
            targets: this.loopPortal,
            alpha: 0.5,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(80, 660, '<- Loop Forest', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#00FFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    createPlayer() {
        const position = window.gameState.getPlayerPosition();

        this.player = this.physics.add.sprite(position.x, position.y, 'hero', heroIdleFrame('south'));
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.96); // +20% (was 0.8)
        this.player.facing = 'south';

        this.player.setBounce(0);
        this.player.setDrag(300);
        this.player.body.setSize(22, 22);

        this.playerShadow = this.add.ellipse(position.x, position.y + 20, 40, 18, 0x000000, 0.3);

        this.player.moveSpeed = 200;
    }

    createEnemies() {
        this.enemies = this.physics.add.group();

        const enemyData = [
            { x: 750, y: 700, name: 'If Golem', difficulty: 'easy', id: 'cond1', texture: 'enemy-if-golem', tint: null, stats: { maxHp: 55, damage: 11, xp: 22 } },
            { x: 1300, y: 950, name: 'Elif Checker', difficulty: 'easy', id: 'cond2', texture: 'enemy-elif-checker', tint: null, stats: { maxHp: 60, damage: 12, xp: 24 } },
            { x: 1900, y: 500, name: 'Else Wraith', difficulty: 'easy', id: 'cond3', texture: 'enemy-else-wraith', tint: null, stats: { maxHp: 50, damage: 10, xp: 20 } },
            { x: 2200, y: 1150, name: 'Boss: Unhandled Exception', difficulty: 'medium', id: 'boss3', texture: 'enemy-boss-dragon', tint: null, stats: { maxHp: 100, damage: 18, xp: 50 } }
        ];

        enemyData.forEach(data => {
            if (window.gameState.isEnemyDefeated(data.id)) {
                return;
            }

            // Shadow drawn before the sprite so it renders underneath, not over the face
            const shadow = this.add.ellipse(data.x, data.y + 26, 45, 16, 0x000000, 0.3);

            const enemy = this.enemies.create(data.x, data.y, data.texture, 0);
            // Normalize on-screen size across textures of different native
            // resolutions, giving the boss a bit more presence than regular
            // enemies. Textures are 9-frame spritesheets (idle + attack), so
            // the per-frame width comes from the frame data, not the sheet.
            const targetWidth = data.id === 'boss3' ? 163 : 93; // +25% (was 130/74)
            const textureWidth = this.textures.get(data.texture).get(0).width;
            const enemyScale = targetWidth / textureWidth;
            enemy.setScale(enemyScale);
            if (data.tint) enemy.setTint(data.tint);
            enemy.name = data.name;
            enemy.difficulty = data.difficulty;
            enemy.id = data.id;
            enemy.stats = data.stats;
            enemy.body.setSize(textureWidth * 0.545, textureWidth * 0.545);
            enemy.shadow = shadow;

            if (data.id === 'cond1') {
                // Horizontal patrol
                this.tweens.add({
                    targets: enemy,
                    x: enemy.x + 80,
                    duration: 3000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        shadow.x = enemy.x;
                        shadow.y = enemy.y + 15;
                    }
                });
            } else if (data.id === 'cond2') {
                // Vertical patrol
                this.tweens.add({
                    targets: enemy,
                    y: enemy.y + 80,
                    duration: 2500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        shadow.x = enemy.x;
                        shadow.y = enemy.y + 15;
                    }
                });
            } else if (data.id === 'cond3') {
                // Circular patrol
                let angle = 0;
                const centerX = enemy.x;
                const centerY = enemy.y;
                const radius = 60;

                this.time.addEvent({
                    delay: 50,
                    loop: true,
                    callback: () => {
                        angle += 0.05;
                        enemy.x = centerX + Math.cos(angle) * radius;
                        enemy.y = centerY + Math.sin(angle) * radius;
                        shadow.x = enemy.x;
                        shadow.y = enemy.y + 15;
                    }
                });
            } else if (data.id === 'boss3') {
                // Figure-8 patrol for the boss
                let t = 0;
                const centerX = enemy.x;
                const centerY = enemy.y;

                this.time.addEvent({
                    delay: 50,
                    loop: true,
                    callback: () => {
                        t += 0.05;
                        enemy.x = centerX + Math.sin(t) * 100;
                        enemy.y = centerY + Math.sin(t * 2) * 50;
                        shadow.x = enemy.x;
                        shadow.y = enemy.y + 15;
                    }
                });
            }
        });
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.enemies, this.enemies);

        this.physics.add.overlap(this.player, this.enemies, this.startBattle, null, this);
        this.physics.add.overlap(this.player, this.sign, this.showSignMessage, null, this);
        this.physics.add.overlap(this.player, this.loopPortal, this.enterLoopForest, null, this);
        this.physics.add.overlap(this.player, this.pitZone, this.fallInHole, null, this);
        // The chest's own overlap trigger is wired inside createChestController().
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.interactKey = this.input.keyboard.addKey('E');
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.input.keyboard.on('keydown-ESC', () => {
            // These handlers stay registered while this scene is paused
            // (Phaser doesn't gate keyboard listeners on scene.pause()),
            // so a Shop/Inventory console open on top would otherwise
            // still catch ESC/I/Enter typed into its code editor.
            if (!this.scene.isActive()) return;
            this.scene.pause();
            this.scene.launch('PauseMenuScene', {
                returnScene: 'ConditionalCavernsScene'
            });
        });

        // Enter is a second binding for the exact same action as I, not a
        // different one
        const openInventoryConsole = () => {
            if (!this.scene.isActive()) return;
            this.scene.pause();
            this.scene.launch('InventoryScene', {
                returnScene: 'ConditionalCavernsScene'
            });
        };
        this.input.keyboard.on('keydown-I', openInventoryConsole);
        this.input.keyboard.on('keydown-ENTER', openInventoryConsole);
    }


    showZoneMessage() {
        const introText = this.add.text(1280, 360,
            'Welcome to the Conditional Caverns!\n\n' +
            'These creatures only fall for the right branch.\n' +
            'Use if/else statements to outsmart them!\n\n' +
            'Defeat If Golem to get started!',
            {
                fontSize: '28px',
                fontFamily: 'monospace',
                color: TEXT.primary,
                align: 'center',
                padding: { x: 30, y: 30 }
            }
        ).setOrigin(0.5);

        const panel = createPanel(this, 1280, 360, introText.width + 60, introText.height + 60, { radius: 18 });
        introText.setDepth(1);

        this.time.delayedCall(5000, () => {
            this.tweens.add({
                targets: [introText, panel],
                alpha: 0,
                duration: 1000,
                onComplete: () => { introText.destroy(); panel.destroy(); }
            });
        });
    }

    showSignMessage() {
        if (!this.signShown) {
            this.signShown = true;
            const message = this.add.text(150, 350,
                'Conditional Tip:\n' +
                'if damage > 10:\n    print("Critical hit!")\nelse:\n    print("Hit!")',
                {
                    fontSize: '22px',
                    fontFamily: 'monospace',
                    color: TEXT.primary,
                    align: 'center',
                    padding: { x: 15, y: 15 }
                }
            ).setOrigin(0.5);

            const panel = createPanel(this, 150, 350, message.width + 40, message.height + 30, { radius: 14 });
            message.setDepth(1);

            this.time.delayedCall(3000, () => {
                this.tweens.add({
                    targets: [message, panel],
                    alpha: 0,
                    duration: 500,
                    onComplete: () => { message.destroy(); panel.destroy(); }
                });
            });
        }
    }

    startBattle(player, enemy) {
        triggerBattleEncounter(this, { player, enemy, returnScene: 'ConditionalCavernsScene' });
    }

    enterLoopForest() {
        if (this.zoneTransitioning) return;
        this.zoneTransitioning = true;

        // Spawn the player back near Loop Forest's own cavernPortal (the
        // portal that connects here), matching how every other backward
        // transition (e.g. LoopForestScene.enterPrintForest()) re-enters
        // a zone near the connecting portal rather than its far west spawn.
        window.gameState.savePlayerPosition(2350, 720);

        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('LoopForestScene');
        });
    }

    // Falling into the dark pit is a hazard, not a dead end - it drops the
    // player back into Loop Forest (the previous zone) down 20 HP, same
    // destination/spawn as walking back out through the portal.
    fallInHole() {
        if (this.zoneTransitioning) return;
        this.zoneTransitioning = true;

        const stats = window.gameState.getPlayerStats();
        window.gameState.updatePlayerStats({ hp: Math.max(1, stats.hp - 20) });
        window.gameState.savePlayerPosition(2350, 720);

        this.cameras.main.shake(200, 0.01);
        const fallText = this.add.text(this.player.x, this.player.y - 60, 'You fell into the pit! -20 HP', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ff6666',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);

        this.time.delayedCall(400, () => {
            fallText.destroy();
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.stop('UIScene');
                this.scene.start('LoopForestScene');
            });
        });
    }

    update() {
        if (!this.player) return;

        // Running is the default (per request); holding Shift walks slower
        const baseSpeed = this.player.moveSpeed;
        const isWalking = this.shiftKey.isDown;
        const speed = isWalking ? baseSpeed : baseSpeed * 1.5;

        let velocityX = 0;
        let velocityY = 0;

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        if (left) velocityX = -speed;
        else if (right) velocityX = speed;

        if (up) velocityY = -speed;
        else if (down) velocityY = speed;

        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        this.player.setVelocity(velocityX, velocityY);

        const dir = directionFromInput(up, down, left, right);
        if (dir) {
            this.player.facing = dir;
            this.player.anims.play(isWalking ? heroWalkAnimKey(dir) : heroRunAnimKey(dir), true);
        } else {
            this.player.anims.stop();
            this.player.setFrame(heroIdleFrame(this.player.facing));
        }

        if (this.playerShadow) {
            this.playerShadow.x = this.player.x;
            this.playerShadow.y = this.player.y + 10;
        }


        // Skipped once a zone transition has already picked the spawn point
        // for the NEXT zone, otherwise this generic tracker can fire during
        // the fade-out delay and clobber it with the player's old position.
        if (!this.saveTimer) {
            this.saveTimer = 0;
        }
        this.saveTimer++;
        if (this.saveTimer >= 60) {
            if (!this.zoneTransitioning) window.gameState.savePlayerPosition(this.player.x, this.player.y);
            this.saveTimer = 0;
        }
    }
}
