// Preload Scene - Load all game assets
export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
        console.log('PreloadScene constructor called');
    }

    preload() {
        console.log('PreloadScene preload method called');
        // Show loading progress
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Loading text
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading Chronicles of Py...',
            style: {
                font: '24px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);
        
        // Progress bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);
        
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            // Scene will be started in create() method after assets are generated
        });

        // LOAD ACTUAL IMAGE FILES HERE
        this.load.image('hero', '/static/game/assets/sprites/hero.png');
        this.load.image('grass-tile', '/static/game/assets/level_background/grass.png');

        // Kenney "Roguelike/RPG Pack" tiles (CC0) - see assets/kenney/LICENSE.txt
        this.load.image('k-tree-round', '/static/game/assets/kenney/tree_round.png');
        this.load.image('k-tree-round2', '/static/game/assets/kenney/tree_round2.png');
        this.load.image('k-tree-pine', '/static/game/assets/kenney/tree_pine_dark.png');
        this.load.image('k-tree-pine2', '/static/game/assets/kenney/tree_pine_dark2.png');
        this.load.image('k-tree-apple', '/static/game/assets/kenney/tree_apple.png');
        this.load.image('k-bush-round', '/static/game/assets/kenney/bush_round.png');
        this.load.image('k-flower-blue', '/static/game/assets/kenney/flower_blue.png');
        this.load.image('k-flower-orange', '/static/game/assets/kenney/flower_orange.png');
        this.load.image('k-ground-green', '/static/game/assets/kenney/ground_green.png');
        this.load.image('k-ground-gray', '/static/game/assets/kenney/ground_gray.png');
        this.load.image('k-ground-tan', '/static/game/assets/kenney/ground_tan.png');
        this.load.image('k-ground-brown', '/static/game/assets/kenney/ground_brown.png');

        // Kenney "Monster Builder Pack" (CC0) - hand-composited creatures
        this.load.image('k-enemy-if-golem', '/static/game/assets/kenney/if_golem.png');
        this.load.image('k-enemy-else-wraith', '/static/game/assets/kenney/else_wraith.png');
        this.load.image('k-enemy-boss-exception', '/static/game/assets/kenney/boss_exception.png');
        
        // Don't load any external files - we'll create everything programmatically
        // Just trigger the load complete event
        this.load.start();
    }

    create() {
        // Create colored rectangles for game sprites
        this.createGameTextures();
    }
    
    createGameTextures() {
        console.log('Creating game textures...');
        
        // Create goblin sprite (green square)
        const goblinGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        goblinGraphics.fillStyle(0x228B22);
        goblinGraphics.fillRect(0, 0, 32, 32);
        goblinGraphics.generateTexture('goblin', 32, 32);
        
                // Create a detailed slime sprite
        const slimeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Create a 32x32 slime sprite
        const slimeWidth = 32;
        const slimeHeight = 32;
        
        // Main body (bright green goo)
        slimeGraphics.fillStyle(0x00FF00);
        slimeGraphics.fillRect(8, 12, 16, 16);
        slimeGraphics.fillRect(6, 14, 20, 14);
        slimeGraphics.fillRect(4, 16, 24, 10);
        slimeGraphics.fillRect(5, 26, 22, 4);
        slimeGraphics.fillRect(7, 30, 18, 2);
        
        // Top blob
        slimeGraphics.fillRect(10, 8, 12, 4);
        slimeGraphics.fillRect(12, 6, 8, 2);
        slimeGraphics.fillRect(14, 4, 4, 2);
        
        // Shiny highlights
        slimeGraphics.fillStyle(0x80FF80);
        slimeGraphics.fillRect(10, 10, 6, 3);
        slimeGraphics.fillRect(8, 12, 4, 2);
        slimeGraphics.fillRect(20, 14, 3, 3);
        
        // Darker green shadows
        slimeGraphics.fillStyle(0x008800);
        slimeGraphics.fillRect(6, 24, 20, 2);
        slimeGraphics.fillRect(8, 26, 16, 2);
        slimeGraphics.fillRect(10, 28, 12, 2);
        slimeGraphics.fillRect(16, 20, 8, 4);
        
        // Eyes (big and cute but menacing)
        slimeGraphics.fillStyle(0x000000);
        slimeGraphics.fillRect(8, 14, 4, 4);
        slimeGraphics.fillRect(20, 14, 4, 4);
        
        // Eye whites
        slimeGraphics.fillStyle(0xFFFFFF);
        slimeGraphics.fillRect(9, 15, 2, 2);
        slimeGraphics.fillRect(21, 15, 2, 2);
        
        // Mouth (small frown)
        slimeGraphics.fillStyle(0x000000);
        slimeGraphics.fillRect(13, 20, 6, 1);
        slimeGraphics.fillRect(12, 19, 1, 1);
        slimeGraphics.fillRect(19, 19, 1, 1);
        
        // Generate the slime texture
        slimeGraphics.generateTexture('slime', slimeWidth, slimeHeight);

        // Create the Loop Forest's tree enemy - a walking treant.
        // Leaves for hair, branch arms with sticks poking out, no legs
        // (trunk flares into roots), and a happy face below the leaves.
        const treeEnemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Leaves ("hair") on top of the head
        treeEnemyGraphics.fillStyle(0x228B22);
        treeEnemyGraphics.fillCircle(16, 8, 8);
        treeEnemyGraphics.fillCircle(9, 11, 5);
        treeEnemyGraphics.fillCircle(23, 11, 5);
        treeEnemyGraphics.fillStyle(0x3CB371);
        treeEnemyGraphics.fillCircle(13, 6, 4);
        treeEnemyGraphics.fillCircle(19, 9, 3);

        // Trunk body, flaring into roots at the base - no legs
        treeEnemyGraphics.fillStyle(0x654321);
        treeEnemyGraphics.fillRect(12, 15, 8, 13);
        treeEnemyGraphics.fillRect(9, 26, 14, 4);
        treeEnemyGraphics.fillRect(7, 29, 18, 2);

        // Bark texture
        treeEnemyGraphics.fillStyle(0x4a3018);
        treeEnemyGraphics.fillRect(14, 17, 1, 9);
        treeEnemyGraphics.fillRect(18, 19, 1, 7);

        // Arms - branches reaching out to the sides
        treeEnemyGraphics.fillStyle(0x654321);
        treeEnemyGraphics.fillRect(3, 17, 9, 3);
        treeEnemyGraphics.fillRect(20, 17, 9, 3);

        // Sticks poking out of the branch tips
        treeEnemyGraphics.fillRect(2, 13, 2, 5);
        treeEnemyGraphics.fillRect(2, 20, 2, 5);
        treeEnemyGraphics.fillRect(28, 13, 2, 5);
        treeEnemyGraphics.fillRect(28, 20, 2, 5);

        // Happy face on the trunk, below the leaves
        treeEnemyGraphics.fillStyle(0x000000);
        treeEnemyGraphics.fillRect(13, 19, 2, 2);
        treeEnemyGraphics.fillRect(17, 19, 2, 2);
        treeEnemyGraphics.fillRect(13, 23, 1, 1);
        treeEnemyGraphics.fillRect(14, 24, 4, 1);
        treeEnemyGraphics.fillRect(18, 23, 1, 1);

        treeEnemyGraphics.generateTexture('tree-enemy', 32, 32);

        // Create the boss key - dropped after a boss fight, needed to unlock
        // the portal to the next zone
        const keyGraphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Bow (the round part you hold) - a bright ring over a darker center
        keyGraphics.fillStyle(0xFFD700);
        keyGraphics.fillCircle(11, 9, 8);
        keyGraphics.fillStyle(0xB8860B);
        keyGraphics.fillCircle(11, 9, 4);

        // Shaft and teeth
        keyGraphics.fillStyle(0xFFD700);
        keyGraphics.fillRect(9, 14, 4, 14);
        keyGraphics.fillRect(13, 22, 6, 3);
        keyGraphics.fillRect(13, 27, 4, 3);

        // Shine highlights
        keyGraphics.fillStyle(0xFFF6C0);
        keyGraphics.fillRect(9, 15, 2, 9);
        keyGraphics.fillCircle(8, 6, 2);

        keyGraphics.generateTexture('key-item', 32, 32);

        // Create spell effect (yellow star)
        const spellGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        spellGraphics.fillStyle(0xFFD700);
        spellGraphics.beginPath();
        spellGraphics.moveTo(16, 0);
        spellGraphics.lineTo(20, 12);
        spellGraphics.lineTo(32, 12);
        spellGraphics.lineTo(22, 20);
        spellGraphics.lineTo(26, 32);
        spellGraphics.lineTo(16, 24);
        spellGraphics.lineTo(6, 32);
        spellGraphics.lineTo(10, 20);
        spellGraphics.lineTo(0, 12);
        spellGraphics.lineTo(12, 12);
        spellGraphics.closePath();
        spellGraphics.fillPath();
        spellGraphics.generateTexture('spell-effect', 32, 32);
        
        // Create ground tile
        const tileGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        tileGraphics.fillStyle(0x8B7355);
        tileGraphics.fillRect(0, 0, 32, 32);
        tileGraphics.lineStyle(1, 0x654321);
        tileGraphics.strokeRect(0, 0, 32, 32);
        tileGraphics.generateTexture('ground-tile', 32, 32);
        
        // Create tree
        const treeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        treeGraphics.fillStyle(0x654321);
        treeGraphics.fillRect(12, 20, 8, 12);
        treeGraphics.fillStyle(0x228B22);
        treeGraphics.fillCircle(16, 16, 12);
        treeGraphics.generateTexture('tree', 32, 32);
        
        // Start the main menu scene
        this.scene.start('MainMenuScene');
    }
}