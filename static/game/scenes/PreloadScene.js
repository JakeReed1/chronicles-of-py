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
        
        // Don't load any external files - we'll create everything programmatically
        // Just trigger the load complete event
        this.load.start();
    }

    create() {
        // Create colored rectangles for game sprites
        this.createGameTextures();
    }
    
    createGameTextures() {
        // Create a cool pixel art hero sprite inspired by Chrono Trigger
        const heroGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Create a 32x48 character sprite (taller for better proportions)
        const width = 32;
        const height = 48;
        
        // Hair (spiky red/orange hair like Crono)
        heroGraphics.fillStyle(0xFF4500);
        // Main hair
        heroGraphics.fillRect(8, 0, 16, 8);
        heroGraphics.fillRect(6, 2, 20, 6);
        // Spiky parts
        heroGraphics.fillRect(4, 0, 4, 4);
        heroGraphics.fillRect(24, 0, 4, 4);
        heroGraphics.fillRect(10, 0, 2, 2);
        heroGraphics.fillRect(20, 0, 2, 2);
        
        // Face
        heroGraphics.fillStyle(0xFFDBB4); // Skin tone
        heroGraphics.fillRect(8, 8, 16, 12);
        heroGraphics.fillRect(6, 10, 20, 8);
        
        // Eyes
        heroGraphics.fillStyle(0x000000);
        heroGraphics.fillRect(10, 12, 3, 3);
        heroGraphics.fillRect(19, 12, 3, 3);
        // Eye shine
        heroGraphics.fillStyle(0xFFFFFF);
        heroGraphics.fillRect(11, 12, 1, 1);
        heroGraphics.fillRect(20, 12, 1, 1);
        
        // Nose (small line)
        heroGraphics.fillStyle(0xE5A88A);
        heroGraphics.fillRect(15, 15, 2, 1);
        
        // Mouth
        heroGraphics.fillStyle(0x000000);
        heroGraphics.fillRect(14, 17, 4, 1);
        
        // Scarf/Bandana (blue like many JRPG heroes)
        heroGraphics.fillStyle(0x0066CC);
        heroGraphics.fillRect(6, 20, 20, 3);
        heroGraphics.fillRect(4, 21, 24, 2);
        
        // Body - Blue tunic/jacket
        heroGraphics.fillStyle(0x0066CC);
        heroGraphics.fillRect(8, 23, 16, 12);
        heroGraphics.fillRect(6, 24, 20, 10);
        
        // Belt
        heroGraphics.fillStyle(0x8B4513);
        heroGraphics.fillRect(6, 30, 20, 2);
        // Belt buckle
        heroGraphics.fillStyle(0xFFD700);
        heroGraphics.fillRect(14, 30, 4, 2);
        
        // Arms
        heroGraphics.fillStyle(0xFFDBB4); // Skin
        heroGraphics.fillRect(4, 24, 4, 8);
        heroGraphics.fillRect(24, 24, 4, 8);
        
        // Gloves
        heroGraphics.fillStyle(0xFFFFFF);
        heroGraphics.fillRect(3, 30, 5, 4);
        heroGraphics.fillRect(24, 30, 5, 4);
        
        // Pants (dark blue)
        heroGraphics.fillStyle(0x000080);
        heroGraphics.fillRect(8, 34, 16, 8);
        heroGraphics.fillRect(10, 34, 12, 10);
        
        // Boots (brown)
        heroGraphics.fillStyle(0x654321);
        heroGraphics.fillRect(8, 42, 7, 6);
        heroGraphics.fillRect(17, 42, 7, 6);
        // Boot details
        heroGraphics.fillStyle(0x4B3621);
        heroGraphics.fillRect(8, 44, 7, 2);
        heroGraphics.fillRect(17, 44, 7, 2);
        
        // Add some shading/details to the tunic
        heroGraphics.fillStyle(0x004499);
        heroGraphics.fillRect(8, 26, 2, 4);
        heroGraphics.fillRect(22, 26, 2, 4);
        heroGraphics.fillRect(12, 28, 8, 1);
        
        // Generate the texture
        heroGraphics.generateTexture('hero', width, height);
        
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