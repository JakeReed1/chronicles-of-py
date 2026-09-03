import { COLORS, TEXT, createPanel, createGlowTitle } from '../../theme.js';
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

const PRINT_FOREST_CHEST_ID = 'print-forest-chest-1';

// World Scene - First Level: The Print() Forest
export default class PrintForestScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PrintForestScene' });
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

        // Treasure chest - needs the player to already exist (its overlap
        // trigger references this.player). Open floor, clear of the ruin
        // walls and the nearest patrolling slimes.
        this.chest = createChestController(this, 1700, 700, {
            chestId: PRINT_FOREST_CHEST_ID,
            itemName: 'Health Potion',
            itemType: 'consumable',
            goldAmount: 15,
            standout: 'glow' // settled on this style (rune-emblem art + soft pulsing light) for all zones
        });

        // Shopkeeper NPC - buy/sell via the shop console, same "stand
        // nearby and press E" interaction as a chest, but simpler: no
        // open/close animation, just a static idle sprite.
        this.createShopkeeper();

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
    createShopkeeper() {
        // Open floor between the cottage ruin and the lower wavy wall, near
        // the tutorial sign so new players spot it early.
        this.shopkeeper = this.physics.add.staticSprite(450, 850, 'shopkeeper');
        this.shopkeeper.setScale(1.06); // +25% (was 0.85)
        this.shopkeeper.refreshBody();
        // Solid like every other level prop - can't walk through the NPC.
        this.physics.add.collider(this.player, this.shopkeeper);

        this.shopInteractKey = this.input.keyboard.addKey('E');
        this.shopPrompt = this.add.text(450, 850 - 55, 'Press E to shop', {
            fontSize: '16px', fontFamily: 'monospace', color: '#ffe066',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setVisible(false);

        // Distance check, not physics.overlap() - now that the shopkeeper
        // is a solid collider, the two bodies never truly overlap (Arcade
        // Physics keeps them separated to just touching).
        // Must clear the resting distance the collider itself leaves
        // between the two bodies once blocked (~77px measured) with real
        // margin, or the prompt could never actually appear.
        const shopInteractRadius = 100;
        let nearShop = false;
        this.events.on('update', () => {
            if (!this.player || !this.player.body) return;
            const overlapping = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shopkeeper.x, this.shopkeeper.y) < shopInteractRadius;
            if (overlapping !== nearShop) {
                nearShop = overlapping;
                this.shopPrompt.setVisible(overlapping);
            }
            if (overlapping && Phaser.Input.Keyboard.JustDown(this.shopInteractKey)) {
                this.scene.pause();
                this.scene.launch('ShopScene', { returnScene: 'PrintForestScene' });
            }
        });
    }

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
        this.player.setScale(0.96); // +20% (was 0.8)
        this.player.facing = 'south';

        // Set up physics properties for top-down
        this.player.setBounce(0);
        this.player.setDrag(300); // Add drag for smooth movement
        this.player.body.setSize(22, 22); // Circular hitbox for top-down

        // Add player shadow for depth
        this.playerShadow = this.add.ellipse(150, 520, 40, 18, 0x000000, 0.3);

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
            const targetWidth = data.id === 'boss1' ? 163 : 93; // +25% (was 130/74)
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
            // These handlers stay registered while this scene is paused
            // (Phaser doesn't gate keyboard listeners on scene.pause()),
            // so a Shop/Inventory console open on top would otherwise
            // still catch ESC/I/Enter typed into its code editor.
            if (!this.scene.isActive()) return;
            console.log('ESC pressed - opening pause menu');
            this.scene.pause();
            this.scene.launch('PauseMenuScene', {
                returnScene: 'PrintForestScene'
            });
            console.log('returnscene:', 'PrintForestScene');
        });

        // Open the inventory/progression console - Enter is a second
        // binding for the exact same action as I, not a different one
        const openInventoryConsole = () => {
            if (!this.scene.isActive()) return;
            this.scene.pause();
            this.scene.launch('InventoryScene', {
                returnScene: 'PrintForestScene'
            });
        };
        this.input.keyboard.on('keydown-I', openInventoryConsole);
        this.input.keyboard.on('keydown-ENTER', openInventoryConsole);
    }

    showTutorialMessage() {
        const tutorialText = this.add.text(1280, 360,
            'Welcome to Chronicles of Py!\n\n' +
            'Use ARROW KEYS or WASD to move in any direction\n' +
            'You run by default - hold SHIFT to walk instead\n' +
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
        triggerBattleEncounter(this, { player, enemy, returnScene: 'PrintForestScene' });
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
        
        // Player movement for top-down view - running is the default (per
        // request), holding Shift is now the "walk slower" button instead
        // of a sprint boost.
        const baseSpeed = this.player.moveSpeed;
        const isWalking = this.shiftKey.isDown;
        const speed = isWalking ? baseSpeed : baseSpeed * 1.5;
        
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

        // Play the matching directional walk/run animation, or hold the
        // idle pose facing whichever way the hero last moved
        const dir = directionFromInput(up, down, left, right);
        if (dir) {
            this.player.facing = dir;
            this.player.anims.play(isWalking ? heroWalkAnimKey(dir) : heroRunAnimKey(dir), true);
        } else {
            this.player.anims.stop();
            this.player.setFrame(heroIdleFrame(this.player.facing));
        }
        
        // Update player shadow position
        if (this.playerShadow) {
            this.playerShadow.x = this.player.x;
            this.playerShadow.y = this.player.y + 10;
        }
        
        
        // Save player position periodically (every 60 frames, roughly once per second at 60fps) -
        // skipped once a zone transition has already picked the spawn point
        // for the NEXT zone (e.g. enterLoopForest()'s savePlayerPosition(150, 720)),
        // otherwise this generic tracker can fire during the fade-out delay
        // and clobber it with the player's old on-screen position.
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