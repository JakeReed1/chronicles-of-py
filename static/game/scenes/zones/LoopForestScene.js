import { COLORS, TEXT, createPanel, createGlowTitle } from '../../theme.js';
import { directionFromInput, heroWalkAnimKey, heroIdleFrame } from '../../heroAnim.js';

// World Scene - Second Level: The Loop Forest
export default class LoopForestScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoopForestScene' });
    }

    create() {
        // Track which zone the player is in (used by save/load and battle returns)
        window.gameState.currentZone = 'LoopForestScene';

        // Disable gravity for top-down view
        this.physics.world.gravity.y = 0;

        // Set world bounds - same size as Print Forest for consistency
        this.cameras.main.setBounds(0, 0, 2560, 1440);
        this.physics.world.setBounds(0, 0, 2560, 1440);

        // Create the second level - Loop Forest (top-down)
        this.createLevel();

        // Create player
        this.createPlayer();

        // Create enemies
        this.createEnemies();

        // If the boss is already down but its key hasn't been picked up yet,
        // the key is still waiting in the world
        this.createBossKey();

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
        // Single cohesive level background (PixelLab pro) - a cool moonlit
        // clearing with tree rings and a standing-stone circle painted
        // directly into the scene (echoing the "loop" theme), instead of
        // tinting Print Forest's art and compositing separate tree sprites.
        this.add.image(1280, 720, 'loop-forest-background').setDisplaySize(2560, 1440).setDepth(-1);

        // Create walls/obstacles group for collision
        this.walls = this.physics.add.staticGroup();

        // Border walls - invisible now that the background art itself shows
        // a dense tree line around the edge of the play area
        for (let x = 0; x < 80; x++) {
            this.walls.create(x * 32 + 16, 16, 'ground-tile').setVisible(false);
            this.walls.create(x * 32 + 16, 1424, 'ground-tile').setVisible(false);
        }
        for (let y = 0; y < 45; y++) {
            this.walls.create(16, y * 32 + 16, 'ground-tile').setVisible(false);
            this.walls.create(2544, y * 32 + 16, 'ground-tile').setVisible(false);
        }

        // Invisible collision boxes matching the tree rings and standing
        // stones actually painted into the background (mapped by
        // inspecting the source art), instead of code-generated rings of
        // composited tree sprites.
        const placeSolid = (x, y, width, height) => {
            const block = this.add.rectangle(x, y, width, height, 0x000000, 0);
            this.physics.add.existing(block, true);
            this.walls.add(block);
        };

        // Outer tree ring
        [[1451, 581], [1276, 158], [856, 56], [435, 158], [223, 713], [435, 1005], [856, 1181], [1276, 1005]]
            .forEach(([x, y]) => placeSolid(x, y, 80, 80));

        // Inner tree ring (around the small central clearing)
        [[1116, 581], [856, 319], [550, 650], [856, 844]]
            .forEach(([x, y]) => placeSolid(x, y, 80, 80));

        // Standalone tree near the bottom loop
        placeSolid(1265, 1219, 90, 90);

        // The two standing-stone pillars (right-side landmark)
        placeSolid(1693, 544, 90, 300);
        placeSolid(2103, 544, 90, 300);

        // Level title
        createGlowTitle(this, 1280, 100, 'Level 2: The Loop Forest', {
            fontSize: 48,
            color: '#ffffff'
        });

        // Tip sign
        this.sign = this.physics.add.staticSprite(250, 600, 'ground-tile');
        this.sign.setTint(0x00FFFF);
        this.sign.setScale(2.0);
        this.add.text(250, 570, '!', {
            fontSize: '36px',
            color: '#00FFFF',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Return portal to Print Forest
        this.printPortal = this.physics.add.staticSprite(80, 720, 'ground-tile');
        this.printPortal.setTint(0xFFD700);
        this.printPortal.setScale(2.5);
        this.printPortal.refreshBody();

        this.tweens.add({
            targets: this.printPortal,
            alpha: 0.5,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(80, 660, '<- Print Forest', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Exit portal to the next zone - sealed until the boss's key is collected
        const hasKey = window.gameState.hasKey('boss2_key');

        this.cavernPortal = this.physics.add.staticSprite(2480, 720, 'ground-tile');
        this.cavernPortal.setTint(hasKey ? 0xAA66FF : 0x666666);
        this.cavernPortal.setScale(2.5);
        this.cavernPortal.refreshBody();

        this.tweens.add({
            targets: this.cavernPortal,
            alpha: 0.5,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.cavernPortalLabel = this.add.text(2480, 660,
            hasKey ? 'Conditional Caverns ->' : '\u{1F512} Needs the Boss Key',
            {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: hasKey ? '#AA66FF' : '#aaaaaa',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    // Spawns the boss's key in the world once the boss is defeated, until
    // the player walks over and picks it up
    createBossKey() {
        const bossDefeated = window.gameState.isEnemyDefeated('boss2');
        const keyCollected = window.gameState.hasKey('boss2_key');

        if (!bossDefeated || keyCollected) {
            this.bossKey = null;
            return;
        }

        this.bossKey = this.physics.add.staticSprite(2200, 1150, 'key-item');
        this.bossKey.setScale(2.5);
        this.bossKey.refreshBody();

        this.tweens.add({
            targets: this.bossKey,
            y: this.bossKey.y - 12,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(2200, 1100, 'Boss Key', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
    }

    collectBossKey() {
        if (!this.bossKey) return;

        window.gameState.collectKey('boss2_key');
        this.bossKey.destroy();
        this.bossKey = null;

        // Unlock the portal immediately, no need to re-enter the zone
        this.cavernPortal.setTint(0xAA66FF);
        if (this.cavernPortalLabel) this.cavernPortalLabel.setText('Conditional Caverns ->').setColor('#AA66FF');

        const message = this.add.text(this.player.x, this.player.y - 60,
            '\u{1F511} Got the Boss Key!', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1);

        this.tweens.add({
            targets: message,
            y: message.y - 40,
            alpha: 0,
            duration: 1500,
            delay: 500,
            onComplete: () => message.destroy()
        });
    }

    createPlayer() {
        const position = window.gameState.getPlayerPosition();

        this.player = this.physics.add.sprite(position.x, position.y, 'hero', heroIdleFrame('south'));
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.64);
        this.player.facing = 'south';

        this.player.setBounce(0);
        this.player.setDrag(300);
        this.player.body.setSize(22, 22);

        this.playerShadow = this.add.ellipse(position.x, position.y + 20, 40, 18, 0x000000, 0.3);

        this.playerNameText = this.add.text(0, -40, 'Python Hero', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.player.nameText = this.playerNameText;

        this.player.moveSpeed = 200;
    }

    createEnemies() {
        this.enemies = this.physics.add.group();

        const slimeData = [
            { x: 600, y: 500, name: 'For Loop Treant', difficulty: 'easy', id: 'loop1', texture: 'enemy-treant', stats: { maxHp: 45, damage: 9, xp: 18 } },
            { x: 1100, y: 950, name: 'While Loop Treant', difficulty: 'easy', id: 'loop2', texture: 'enemy-treant', stats: { maxHp: 50, damage: 10, xp: 20 } },
            { x: 1900, y: 500, name: 'Range Sapling', difficulty: 'easy', id: 'loop3', texture: 'enemy-treant', stats: { maxHp: 40, damage: 8, xp: 16 } },
            { x: 2200, y: 1150, name: 'Boss: Infinite Loop Tree', difficulty: 'medium', id: 'boss2', texture: 'enemy-boss-treant', stats: { maxHp: 80, damage: 15, xp: 40 } }
        ];

        slimeData.forEach(data => {
            if (window.gameState.isEnemyDefeated(data.id)) {
                return;
            }

            // Shadow drawn before the sprite so it renders underneath, not over the face
            const shadow = this.add.ellipse(data.x, data.y + 22, 45, 16, 0x000000, 0.3);

            const enemy = this.enemies.create(data.x, data.y, data.texture, 0);
            const targetWidth = data.id === 'boss2' ? 130 : 74;
            const textureWidth = this.textures.get(data.texture).get(0).width;
            enemy.setScale(targetWidth / textureWidth);
            enemy.name = data.name;
            enemy.difficulty = data.difficulty;
            enemy.id = data.id;
            enemy.stats = data.stats;
            enemy.body.setSize(24, 24);
            enemy.shadow = shadow;

            if (data.id === 'loop1') {
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
                        shadow.y = enemy.y + 10;
                    }
                });
            } else if (data.id === 'loop2') {
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
                        shadow.y = enemy.y + 10;
                    }
                });
            } else if (data.id === 'loop3') {
                // Circular patrol - fitting for a "Range" enemy
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
                        shadow.y = enemy.y + 10;
                    }
                });
            } else if (data.id === 'boss2') {
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
                        shadow.y = enemy.y + 10;
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
        this.physics.add.overlap(this.player, this.printPortal, this.enterPrintForest, null, this);
        this.physics.add.overlap(this.player, this.cavernPortal, this.enterConditionalCaverns, null, this);

        // Player overlaps with the boss's dropped key, if it's out there
        if (this.bossKey) {
            this.physics.add.overlap(this.player, this.bossKey, this.collectBossKey, null, this);
        }
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.interactKey = this.input.keyboard.addKey('E');
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', {
                returnScene: 'LoopForestScene'
            });
        });
    }

    showZoneMessage() {
        const introText = this.add.text(1280, 360,
            'Welcome to the Loop Forest!\n\n' +
            'These enemies take more than one hit.\n' +
            'Use for and while loops to attack repeatedly!\n\n' +
            'Defeat For Loop Treant to get started!',
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
                'Loop Tip:\n' +
                'for i in range(3):\n    print("Strike!")\n' +
                'The more iterations, the more damage!',
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
        enemy.disableBody(true, false);

        window.gameState.savePlayerPosition(this.player.x, this.player.y);

        window.gameState.currentEnemy = {
            name: enemy.name,
            difficulty: enemy.difficulty,
            sprite: enemy.texture.key,
            id: enemy.id,
            stats: enemy.stats
        };

        window.gameState.battleReturnScene = 'LoopForestScene';

        // The transition runs off a timer rather than the
        // 'camerafadeoutcomplete' event - that event can fail to fire
        // (observed under software/headless rendering), which would
        // otherwise strand the player on a faded-out screen forever.
        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            enemy.destroy();

            this.scene.stop('UIScene');
            this.scene.switch('BattleScene');
        });
    }

    enterPrintForest() {
        if (this.zoneTransitioning) return;
        this.zoneTransitioning = true;

        // Spawn the player near the Print Forest's portal, away from its trigger zone
        window.gameState.savePlayerPosition(2350, 720);

        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('PrintForestScene');
        });
    }

    enterConditionalCaverns() {
        if (this.zoneTransitioning) return;

        if (!window.gameState.hasKey('boss2_key')) {
            this.showSealedPortalMessage();
            return;
        }

        this.zoneTransitioning = true;

        // Spawn the player near the Caverns' entrance, away from its portal
        window.gameState.savePlayerPosition(150, 720);

        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('ConditionalCavernsScene');
        });
    }

    showSealedPortalMessage() {
        if (this.sealedMessageActive) return;
        this.sealedMessageActive = true;

        this.cameras.main.shake(150, 0.003);

        const bossDefeated = window.gameState.isEnemyDefeated('boss2');
        const sealedText = bossDefeated
            ? '\u{1F512} Sealed!\nGo pick up the Boss Key it dropped.'
            : '\u{1F512} Sealed!\nDefeat Boss: Infinite Loop Tree for its key.';

        const message = this.add.text(this.cavernPortal.x, this.cavernPortal.y - 90, sealedText, {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#ff6b6b',
            align: 'center',
            padding: { x: 15, y: 15 }
        }).setOrigin(0.5).setDepth(1);

        const panel = createPanel(this, this.cavernPortal.x, this.cavernPortal.y - 90,
            message.width + 40, message.height + 30, { radius: 14, borderColor: COLORS.danger });

        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: [message, panel],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    message.destroy();
                    panel.destroy();
                    this.sealedMessageActive = false;
                }
            });
        });
    }

    update() {
        if (!this.player) return;

        const baseSpeed = this.player.moveSpeed;
        const speed = this.shiftKey.isDown ? baseSpeed * 1.5 : baseSpeed;

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
            this.player.anims.play(heroWalkAnimKey(dir), true);
        } else {
            this.player.anims.stop();
            this.player.setFrame(heroIdleFrame(this.player.facing));
        }

        if (this.player.nameText) {
            this.player.nameText.x = this.player.x;
            this.player.nameText.y = this.player.y - 30;
        }

        if (this.playerShadow) {
            this.playerShadow.x = this.player.x;
            this.playerShadow.y = this.player.y + 10;
        }

        if (this.shiftKey.isDown && (velocityX !== 0 || velocityY !== 0)) {
            if (Math.random() < 0.3) {
                const particle = this.add.circle(
                    this.player.x + Phaser.Math.Between(-10, 10),
                    this.player.y + 15,
                    2,
                    0xFFFFFF,
                    0.5
                );

                this.tweens.add({
                    targets: particle,
                    alpha: 0,
                    scale: 0,
                    duration: 300,
                    onComplete: () => particle.destroy()
                });
            }
        }

        if (!this.saveTimer) {
            this.saveTimer = 0;
        }
        this.saveTimer++;
        if (this.saveTimer >= 60) {
            window.gameState.savePlayerPosition(this.player.x, this.player.y);
            this.saveTimer = 0;
        }
    }
}
