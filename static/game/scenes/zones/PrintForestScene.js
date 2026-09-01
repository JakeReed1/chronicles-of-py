import { COLORS, TEXT, createPanel, createGlowTitle } from '../../theme.js';
import { directionFromInput, heroWalkAnimKey, heroIdleFrame } from '../../heroAnim.js';

// World Scene - First Level: The Print() Forest
export default class PrintForestScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PrintForestScene' });
    }

    create() {
        // Track which zone the player is in (used by save/load and battle returns)
        window.gameState.currentZone = 'PrintForestScene';

        // Disable gravity for top-down view
        this.physics.world.gravity.y = 0;

        // Set world bounds for first level - expanded for larger top-down world
        this.cameras.main.setBounds(0, 0, 2560, 1440);
        this.physics.world.setBounds(0, 0, 2560, 1440);
        
        // Create the first level - Python Forest (top-down)
        this.createFirstLevel();
        
        // Create player
        this.createPlayer();
        
        // Create tutorial enemies
        this.createTutorialEnemies();

        // If the boss is already down but its key hasn't been picked up yet,
        // the key is still waiting in the world
        this.createBossKey();

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(600, 300);
        this.cameras.main.setZoom(1.0); // Normal zoom for widescreen view
        
        // Create UI overlay
        this.scene.launch('UIScene');
        
        // Set up collisions and interactions
        this.setupCollisions();
        
        // Show tutorial message
        this.showTutorialMessage();
        
        // Set up controls
        this.setupControls();
    }
    
    createFirstLevel() {
        // Single cohesive level background (PixelLab pro) with the ruined
        // brick buildings, garden walls, and trees painted directly into
        // the scene, instead of compositing separate sprites on top of a
        // plain background - avoids any alignment/lighting mismatch.
        this.add.image(1280, 720, 'forest-background-ruins').setDisplaySize(2560, 1440).setDepth(-1);

        // Create walls/obstacles group for collision
        this.walls = this.physics.add.staticGroup();

        // Border walls - invisible now that the background art itself shows
        // a dense tree line around the edge of the play area; these still
        // block movement, the art explains why
        for (let x = 0; x < 80; x++) {
            this.walls.create(x * 32 + 16, 16, 'ground-tile').setVisible(false);
            this.walls.create(x * 32 + 16, 1424, 'ground-tile').setVisible(false);
        }

        // Left and right walls
        for (let y = 0; y < 45; y++) {
            this.walls.create(16, y * 32 + 16, 'ground-tile').setVisible(false);
            this.walls.create(2544, y * 32 + 16, 'ground-tile').setVisible(false);
        }

        // Interior obstacles - invisible collision boxes matching the ruin
        // buildings, garden walls, and free-standing trees actually painted
        // into the background (mapped by inspecting the source art), rather
        // than a separate grid-based maze. A single rectangle per solid
        // shape; each is an invisible physics body sized/positioned to the
        // painted silhouette.
        const placeSolid = (x, y, width, height) => {
            const block = this.add.rectangle(x, y, width, height, 0x000000, 0);
            this.physics.add.existing(block, true);
            this.walls.add(block);
        };

        // Ruined cottage (main building + its attached low wall stub)
        placeSolid(600, 438, 520, 415);
        placeSolid(975, 355, 250, 150);

        // Tall broken wall remnant (upper-middle ruin)
        placeSolid(1630, 395, 220, 350);

        // L-shaped garden wall (upper-right enclosure)
        placeSolid(2080, 335, 440, 90);
        placeSolid(2265, 688, 70, 625);

        // Separate lower wall segment (right side)
        placeSolid(2000, 883, 480, 125);

        // Two wavy low garden walls (lower-left) - each approximated as a
        // short chain of small blocks following the painted curve
        const wavyWall1 = [[819, 713], [968, 769], [1116, 844], [1284, 956]];
        const wavyWall2 = [[428, 975], [670, 1125], [930, 1163], [1154, 1125]];
        wavyWall1.concat(wavyWall2).forEach(([x, y]) => placeSolid(x, y, 70, 50));

        // Free-standing trees not part of the dense tree-lined border
        const interiorTrees = [[1380, 360], [1390, 790], [2280, 840], [1670, 1240]];
        interiorTrees.forEach(([x, y]) => placeSolid(x, y, 70, 70));


        // Add level title
        createGlowTitle(this, 1280, 100, 'Level 1: The Print() Forest', {
            fontSize: 48,
            color: '#ffffff'
        });
        
        // Add tutorial sign
        this.sign = this.physics.add.staticSprite(250, 600, 'ground-tile');
        this.sign.setTint(0xFFD700);
        this.sign.setScale(2.0);  // Increased sign size
        this.add.text(250, 570, '!', {
            fontSize: '36px',  // Increased from 24px to 36px
            color: '#FFD700',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 4  // Increased from 2 to 4
        }).setOrigin(0.5);
        
        // Exit portal to the next zone - sealed until the boss's key is collected
        const hasKey = window.gameState.hasKey('boss1_key');

        this.loopPortal = this.physics.add.staticSprite(2480, 720, 'ground-tile');
        this.loopPortal.setTint(hasKey ? 0x00FFFF : 0x666666);
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

        this.portalLabel = this.add.text(2480, 660,
            hasKey ? 'Loop Forest ->' : '\u{1F512} Needs the Boss Key',
            {
                fontSize: '22px',
                fontFamily: 'monospace',
                color: hasKey ? '#00FFFF' : '#aaaaaa',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    // Spawns the boss's key in the world once the boss is defeated, until
    // the player walks over and picks it up
    createBossKey() {
        const bossDefeated = window.gameState.isEnemyDefeated('boss1');
        const keyCollected = window.gameState.hasKey('boss1_key');

        if (!bossDefeated || keyCollected) {
            this.bossKey = null;
            return;
        }

        this.bossKey = this.physics.add.staticSprite(2200, 1200, 'key-item');
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

        this.add.text(2200, 1150, 'Boss Key', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
    }

    collectBossKey() {
        if (!this.bossKey) return;

        window.gameState.collectKey('boss1_key');
        this.bossKey.destroy();
        this.bossKey = null;

        // Unlock the portal immediately, no need to re-enter the zone
        this.loopPortal.setTint(0x00FFFF);
        if (this.portalLabel) this.portalLabel.setText('Loop Forest ->').setColor('#00FFFF');

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
        // Get saved player position or use default
        const position = window.gameState.getPlayerPosition();
        
        // Create player sprite for top-down view - PixelLab 8-direction hero,
        // sized smaller than the old placeholder to read better on the map
        this.player = this.physics.add.sprite(position.x, position.y, 'hero', heroIdleFrame('south'));
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.64);
        this.player.facing = 'south';

        // Set up physics properties for top-down
        this.player.setBounce(0);
        this.player.setDrag(300); // Add drag for smooth movement
        this.player.body.setSize(22, 22); // Circular hitbox for top-down

        // Add player shadow for depth
        this.playerShadow = this.add.ellipse(150, 520, 40, 18, 0x000000, 0.3);
        
        // Add player name
        this.playerNameText = this.add.text(0, -40, 'Python Hero', {
            fontSize: '18px',  // Increased from 12px to 18px
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3  // Increased from 2 to 3
        }).setOrigin(0.5);
        
        // Make name follow player
        this.player.nameText = this.playerNameText;

        // Movement speed
        this.player.moveSpeed = 200;
    }
    
    createTutorialEnemies() {
        this.enemies = this.physics.add.group();
        
        // Create slimes positioned for top-down view
        const slimeData = [
            { x: 500, y: 700, name: 'Print Slime', difficulty: 'easy', id: 'slime1', texture: 'enemy-slime', stats: { maxHp: 30, damage: 5, xp: 10 } },
            { x: 1000, y: 500, name: 'Variable Slime', difficulty: 'easy', id: 'slime2', texture: 'enemy-slime', stats: { maxHp: 40, damage: 8, xp: 15 } },
            { x: 1600, y: 900, name: 'Loop Slime', difficulty: 'easy', id: 'slime3', texture: 'enemy-slime', stats: { maxHp: 45, damage: 9, xp: 18 } },
            { x: 2200, y: 1200, name: 'Boss: Syntax Error', difficulty: 'medium', id: 'boss1', texture: 'enemy-boss-slime-king', stats: { maxHp: 60, damage: 12, xp: 30 } }
        ];
        
        slimeData.forEach(data => {
            // Skip if enemy has been defeated
            if (window.gameState.isEnemyDefeated(data.id)) {
                return;
            }
            
            // Shadow drawn before the sprite so it renders underneath, not over it
            const shadow = this.add.ellipse(data.x, data.y + 15, 45, 23, 0x000000, 0.3);  // Increased shadow size

            const enemy = this.enemies.create(data.x, data.y, data.texture, 0);
            const targetWidth = data.id === 'boss1' ? 130 : 74;
            const textureWidth = this.textures.get(data.texture).get(0).width;
            enemy.setScale(targetWidth / textureWidth);
            enemy.name = data.name;
            enemy.difficulty = data.difficulty;
            enemy.id = data.id;
            enemy.stats = data.stats;
            enemy.body.setSize(24, 24); // Circular hitbox for top-down
            enemy.shadow = shadow;
            
            // Different patrol patterns for variety
            if (data.id === 'slime1') {
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
            } else if (data.id === 'slime2') {
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
            } else if (data.id === 'slime3') {
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
                        shadow.y = enemy.y + 10;
                    }
                });
            } else if (data.id === 'boss1') {
                // Figure-8 patrol for boss
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
        // Player collides with walls
        this.physics.add.collider(this.player, this.walls);
        
        // Enemies collide with walls
        this.physics.add.collider(this.enemies, this.walls);

        // Enemies collide with each other
        this.physics.add.collider(this.enemies, this.enemies);
        
        // Player overlaps with enemies (triggers battle)
        this.physics.add.overlap(this.player, this.enemies, this.startBattle, null, this);
        
        // Player overlaps with sign
        this.physics.add.overlap(this.player, this.sign, this.showSignMessage, null, this);

        // Player overlaps with the portal to Loop Forest
        this.physics.add.overlap(this.player, this.loopPortal, this.enterLoopForest, null, this);

        // Player overlaps with the boss's dropped key, if it's out there
        if (this.bossKey) {
            this.physics.add.overlap(this.player, this.bossKey, this.collectBossKey, null, this);
        }
    }
    
    setupControls() {
        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Add interaction key
        this.interactKey = this.input.keyboard.addKey('E');
        
        // Add run/sprint key
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // Add ESC key for pause menu
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('ESC pressed - opening pause menu');
            this.scene.pause();
            this.scene.launch('PauseMenuScene', {
                returnScene: 'PrintForestScene'
            });
            console.log('returnscene:', 'PrintForestScene');
        });
    }
    
    showTutorialMessage() {
        const tutorialText = this.add.text(1280, 360,
            'Welcome to Chronicles of Py!\n\n' +
            'Use ARROW KEYS or WASD to move in any direction\n' +
            'Hold SHIFT to run faster\n' +
            'Walk into enemies to battle\n' +
            'Defeat enemies by writing Python code!\n\n' +
            'Start with the Print Slime to learn the basics!',
            {
                fontSize: '28px',
                fontFamily: 'monospace',
                color: TEXT.primary,
                align: 'center',
                padding: { x: 30, y: 30 }
            }
        ).setOrigin(0.5);

        const panel = createPanel(this, 1280, 360, tutorialText.width + 60, tutorialText.height + 60, { radius: 18 });
        tutorialText.setDepth(1);

        // Fade out after 5 seconds
        this.time.delayedCall(5000, () => {
            this.tweens.add({
                targets: [tutorialText, panel],
                alpha: 0,
                duration: 1000,
                onComplete: () => { tutorialText.destroy(); panel.destroy(); }
            });
        });
    }

    showSignMessage() {
        if (!this.signShown) {
            this.signShown = true;
            const message = this.add.text(150, 350,
                'Tutorial Tip:\n' +
                'Use print("Hello") to attack!\n' +
                'The more you print, the more damage!',
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
        // Disable enemy to prevent multiple triggers
        enemy.disableBody(true, false);

        // Save player position before battle
        window.gameState.savePlayerPosition(this.player.x, this.player.y);

        // Store enemy data for battle
        window.gameState.currentEnemy = {
            name: enemy.name,
            difficulty: enemy.difficulty,
            sprite: enemy.texture.key,
            id: enemy.id,
            stats: enemy.stats
        };

        // Remember which zone to return to after the battle
        window.gameState.battleReturnScene = 'PrintForestScene';

        // Fade out and start battle. The transition runs off a timer rather
        // than the 'camerafadeoutcomplete' event - that event can fail to
        // fire (observed under software/headless rendering), which would
        // otherwise strand the player on a faded-out screen forever.
        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            enemy.destroy();

            // Switch to battle scene
            this.scene.stop('UIScene');
            this.scene.switch('BattleScene');
        });
    }

    enterLoopForest() {
        if (this.zoneTransitioning) return;

        if (!window.gameState.hasKey('boss1_key')) {
            this.showSealedPortalMessage();
            return;
        }

        this.zoneTransitioning = true;

        // Spawn the player near the Loop Forest's entrance, away from its portal
        window.gameState.savePlayerPosition(150, 720);

        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('LoopForestScene');
        });
    }

    showSealedPortalMessage() {
        if (this.sealedMessageActive) return;
        this.sealedMessageActive = true;

        this.cameras.main.shake(150, 0.003);

        const bossDefeated = window.gameState.isEnemyDefeated('boss1');
        const sealedText = bossDefeated
            ? '\u{1F512} Sealed!\nGo pick up the Boss Key it dropped.'
            : '\u{1F512} Sealed!\nDefeat Boss: Syntax Error for its key.';

        const message = this.add.text(this.loopPortal.x, this.loopPortal.y - 90, sealedText, {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#ff6b6b',
            align: 'center',
            padding: { x: 15, y: 15 }
        }).setOrigin(0.5).setDepth(1);

        const panel = createPanel(this, this.loopPortal.x, this.loopPortal.y - 90,
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
        
        // Player movement for top-down view
        const baseSpeed = this.player.moveSpeed;
        const speed = this.shiftKey.isDown ? baseSpeed * 1.5 : baseSpeed; // Sprint when holding shift
        
        // 8-directional movement
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

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707; // 1/sqrt(2)
            velocityY *= 0.707;
        }

        // Apply velocity
        this.player.setVelocity(velocityX, velocityY);

        // Play the matching directional walk animation, or hold the idle
        // pose facing whichever way the hero last moved
        const dir = directionFromInput(up, down, left, right);
        if (dir) {
            this.player.facing = dir;
            this.player.anims.play(heroWalkAnimKey(dir), true);
        } else {
            this.player.anims.stop();
            this.player.setFrame(heroIdleFrame(this.player.facing));
        }
        
        // Update player name and shadow positions
        if (this.player.nameText) {
            this.player.nameText.x = this.player.x;
            this.player.nameText.y = this.player.y - 30;
        }
        
        if (this.playerShadow) {
            this.playerShadow.x = this.player.x;
            this.playerShadow.y = this.player.y + 10;
        }
        
        // Add sprint particles effect
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
        
        // Save player position periodically (every 60 frames, roughly once per second at 60fps)
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