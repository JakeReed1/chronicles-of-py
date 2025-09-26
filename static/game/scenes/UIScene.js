// UI Scene - Overlay UI elements
export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // This scene runs in parallel with other scenes
        // Used for persistent UI elements like menus, notifications, etc.
        
        // Add any persistent UI elements here
        this.setupUI();
    }
    
    setupUI() {
        // Escape menu hint
        const escText = this.add.text(10, 570, 'Press ESC for menu', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 5, y: 2 }
        });
        
        // Listen for escape key
        this.input.keyboard.on('keydown-ESC', () => {
            this.togglePauseMenu();
        });
    }
    
    togglePauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.destroy();
            this.pauseMenu = null;
            
            // Resume other scenes
            this.scene.resume('BattleScene');
            this.scene.resume('WorldScene');
        } else {
            // Pause other scenes
            this.scene.pause('BattleScene');
            this.scene.pause('WorldScene');
            
            // Create pause menu
            this.createPauseMenu();
        }
    }
    
    createPauseMenu() {
        const { width, height } = this.cameras.main;
        
        this.pauseMenu = this.add.group();
        
        // Darken background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
        this.pauseMenu.add(bg);
        
        // Menu panel
        const panel = this.add.graphics();
        panel.fillStyle(0x2a2a3e, 0.95);
        panel.fillRoundedRect(width/2 - 150, height/2 - 100, 300, 200, 20);
        this.pauseMenu.add(panel);
        
        // Title
        const title = this.add.text(width/2, height/2 - 70, 'PAUSED', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseMenu.add(title);
        
        // Resume button
        const resumeBtn = this.add.text(width/2, height/2, 'Resume', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#4a4a6e',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();
        
        resumeBtn.on('pointerdown', () => this.togglePauseMenu());
        this.pauseMenu.add(resumeBtn);
        
        // Main Menu button
        const menuBtn = this.add.text(width/2, height/2 + 50, 'Main Menu', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#4a4a6e',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();
        
        menuBtn.on('pointerdown', () => {
            this.scene.stop('BattleScene');
            this.scene.stop('WorldScene');
            this.scene.stop('UIScene');
            this.scene.start('MainMenuScene');
        });
        
        this.pauseMenu.add(menuBtn);
    }
}