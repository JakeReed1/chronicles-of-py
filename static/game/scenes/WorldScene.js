// World Scene - First Level: The Print() Forest
export default class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }

    create() {
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
        // Create grass background for top-down view
        this.add.rectangle(1280, 720, 2560, 1440, 0x228B22); // Forest green background
        
        // Create ground pattern using tiles
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 45; y++) {
                // Create checkered grass pattern
                const tint = (x + y) % 2 === 0 ? 0x228B22 : 0x1F7A1F;
                this.add.rectangle(x * 32 + 16, y * 32 + 16, 32, 32, tint);
            }
        }
        
        // Create walls/obstacles group for collision
        this.walls = this.physics.add.staticGroup();
        
        // Create border walls
        // Top and bottom walls
        for (let x = 0; x < 80; x++) {
            this.walls.create(x * 32 + 16, 16, 'ground-tile').setTint(0x8B4513);
            this.walls.create(x * 32 + 16, 1424, 'ground-tile').setTint(0x8B4513);
        }
        
        // Left and right walls
        for (let y = 0; y < 45; y++) {
            this.walls.create(16, y * 32 + 16, 'ground-tile').setTint(0x8B4513);
            this.walls.create(2544, y * 32 + 16, 'ground-tile').setTint(0x8B4513);
        }
        
        // Create some interior walls/obstacles
        // Create a simple maze-like structure
        for (let i = 0; i < 15; i++) {
            this.walls.create(400 + i * 32, 400, 'ground-tile').setTint(0x8B4513);
            this.walls.create(400, 400 + i * 32, 'ground-tile').setTint(0x8B4513);
        }
        
        for (let i = 0; i < 20; i++) {
            this.walls.create(1200 + i * 32, 800, 'ground-tile').setTint(0x8B4513);
            this.walls.create(1800, 600 + i * 32, 'ground-tile').setTint(0x8B4513);
        }
        
        // Add more walls for complexity
        for (let i = 0; i < 12; i++) {
            this.walls.create(800, 200 + i * 32, 'ground-tile').setTint(0x8B4513);
            this.walls.create(2000 + i * 32, 1000, 'ground-tile').setTint(0x8B4513);
        }
        
        // Add trees as obstacles scattered around
        this.trees = this.physics.add.staticGroup();
        const treePositions = [
            [200, 200], [400, 150], [600, 300], [800, 200], [1000, 150],
            [1200, 250], [1400, 350], [1600, 200], [1800, 300], [2000, 250],
            [2200, 400], [2400, 350], [100, 600], [300, 800], [500, 900],
            [700, 1000], [900, 850], [1100, 900], [1300, 1000], [1500, 1100],
            [1700, 950], [1900, 1100], [2100, 1000], [2300, 1200], [150, 1200],
            [350, 1300], [550, 1200], [750, 1100], [950, 1300], [1150, 1200],
            [1350, 1100], [1550, 1300], [1750, 1200], [1950, 1300], [2150, 1100],
            [2350, 1300], [250, 500], [450, 600], [650, 500], [850, 600]
        ];
        
        treePositions.forEach(pos => {
            const tree = this.trees.create(pos[0], pos[1], 'tree');
            tree.setScale(2.5);  // Increased from 1.5 to 2.5
            tree.refreshBody();
            // Add shadow for depth
            this.add.ellipse(pos[0], pos[1] + 30, 65, 33, 0x000000, 0.3);  // Increased shadow size
        });
        
        // Add level title
        this.add.text(1280, 100, 'Level 1: The Print() Forest', {
            fontSize: '48px',  // Increased from 36px to 48px
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6  // Increased from 4 to 6
        }).setOrigin(0.5);
        
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
        
        // Add some decorative elements
        // Flowers - more spread across the larger world
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(100, 2400);
            const y = Phaser.Math.Between(100, 1300);
            this.add.circle(x, y, 6, Phaser.Math.RND.pick([0xFF0000, 0xFFFF00, 0xFF00FF]));  // Increased from 3 to 6
        }
    }
    
    createPlayer() {
        // Get saved player position or use default
        const position = window.gameState.getPlayerPosition();
        
        // Create player sprite for top-down view
        this.player = this.physics.add.sprite(position.x, position.y, 'hero');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(2.0);  // Increased from 1.2 to 2.0
        
        // Set up physics properties for top-down
        this.player.setBounce(0);
        this.player.setDrag(300); // Add drag for smooth movement
        this.player.body.setSize(20, 20); // Circular hitbox for top-down
        
        // Add player shadow for depth
        this.playerShadow = this.add.ellipse(150, 520, 40, 20, 0x000000, 0.3);  // Increased shadow size
        
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
        
        // Player stats
        this.player.stats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            knowledge: 0  // Python knowledge points
        };
        
        // Movement speed
        this.player.moveSpeed = 200;
    }
    
    createTutorialEnemies() {
        this.enemies = this.physics.add.group();
        
        // Create slimes positioned for top-down view
        const slimeData = [
            { x: 500, y: 700, name: 'Print Slime', difficulty: 'easy', id: 'slime1' },
            { x: 1000, y: 500, name: 'Variable Slime', difficulty: 'easy', id: 'slime2' },
            { x: 1600, y: 900, name: 'Loop Slime', difficulty: 'easy', id: 'slime3' },
            { x: 2200, y: 1200, name: 'Boss: Syntax Error', difficulty: 'medium', id: 'boss1' }
        ];
        
        slimeData.forEach(data => {
            // Skip if enemy has been defeated
            if (window.gameState.isEnemyDefeated(data.id)) {
                return;
            }
            
            const enemy = this.enemies.create(data.x, data.y, 'slime');
            enemy.setScale(2.0);  // Increased from 1.2 to 2.0
            enemy.name = data.name;
            enemy.difficulty = data.difficulty;
            enemy.id = data.id;
            enemy.body.setSize(24, 24); // Circular hitbox for top-down
            
            // Add enemy shadow
            const shadow = this.add.ellipse(data.x, data.y + 15, 45, 23, 0x000000, 0.3);  // Increased shadow size
            enemy.shadow = shadow;
            
            // Add enemy name
            const nameText = this.add.text(data.x, data.y - 35, data.name, {
                fontSize: '16px',  // Increased from 10px to 16px
                fontFamily: 'monospace',
                color: data.difficulty === 'medium' ? '#ff0000' : '#ffff00',
                stroke: '#000000',
                strokeThickness: 3  // Increased from 2 to 3
            }).setOrigin(0.5);
            
            enemy.nameText = nameText;
            
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
                        nameText.x = enemy.x;
                        nameText.y = enemy.y - 25;
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
                        nameText.x = enemy.x;
                        nameText.y = enemy.y - 25;
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
                        nameText.x = enemy.x;
                        nameText.y = enemy.y - 25;
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
                        nameText.x = enemy.x;
                        nameText.y = enemy.y - 25;
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
        
        // Player collides with trees
        this.physics.add.collider(this.player, this.trees);
        
        // Enemies collide with trees
        this.physics.add.collider(this.enemies, this.trees);
        
        // Enemies collide with each other
        this.physics.add.collider(this.enemies, this.enemies);
        
        // Player overlaps with enemies (triggers battle)
        this.physics.add.overlap(this.player, this.enemies, this.startBattle, null, this);
        
        // Player overlaps with sign
        this.physics.add.overlap(this.player, this.sign, this.showSignMessage, null, this);
    }
    
    setupControls() {
        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Add interaction key
        this.interactKey = this.input.keyboard.addKey('E');
        
        // Add run/sprint key
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
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
                fontSize: '28px',  // Increased from 20px to 28px
                fontFamily: 'monospace',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 30, y: 30 },  // Increased padding
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Fade out after 5 seconds
        this.time.delayedCall(5000, () => {
            this.tweens.add({
                targets: tutorialText,
                alpha: 0,
                duration: 1000,
                onComplete: () => tutorialText.destroy()
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
                    fontSize: '22px',  // Increased from 14px to 22px
                    fontFamily: 'monospace',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 15, y: 15 },  // Increased padding
                    align: 'center'
                }
            ).setOrigin(0.5);
            
            this.time.delayedCall(3000, () => {
                this.tweens.add({
                    targets: message,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => message.destroy()
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
            id: enemy.id
        };
        
        // Fade out and start battle
        this.cameras.main.fade(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Clean up name texts
            enemy.nameText.destroy();
            enemy.destroy();
            
            // Switch to battle scene
            this.scene.stop('UIScene');
            this.scene.switch('BattleScene');
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
        
        // Horizontal movement
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            velocityX = -speed;
            this.player.setFlipX(true); // Face left
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            velocityX = speed;
            this.player.setFlipX(false); // Face right
        }
        
        // Vertical movement
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            velocityY = -speed;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            velocityY = speed;
        }
        
        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707; // 1/sqrt(2)
            velocityY *= 0.707;
        }
        
        // Apply velocity
        this.player.setVelocity(velocityX, velocityY);
        
        // Add walking animation effect (subtle scale bounce)
        if (velocityX !== 0 || velocityY !== 0) {
            if (!this.walkingTween || !this.walkingTween.isPlaying()) {
                this.walkingTween = this.tweens.add({
                    targets: this.player,
                    scaleX: this.player.flipX ? -1.3 : 1.3,
                    scaleY: 1.1,
                    duration: 200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        } else {
            // Stop walking animation
            if (this.walkingTween) {
                this.walkingTween.stop();
                this.player.setScale(this.player.flipX ? -1.2 : 1.2, 1.2);
            }
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