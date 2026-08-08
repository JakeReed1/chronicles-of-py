// PauseMenuScene.js
export default class PauseMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseMenuScene' });
    }
    
    init(data) {
        this.returnScene = data.returnScene || 'PrintForestScene';
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Semi-transparent overlay
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7);
        
        // Menu container
        const menuY = height/2;
        
        // Title
        this.add.text(width/2, menuY - 150, 'PAUSED', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Menu options
        const buttonStyle = {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 30, y: 15 }
        };
        
        // Resume button
        const resumeButton = this.add.text(width/2, menuY - 50, 'Resume', buttonStyle)
            .setOrigin(0.5)
            .setInteractive();
            
        resumeButton.on('pointerdown', () => {
            this.scene.resume(this.returnScene);
            this.scene.stop();
        });
        
        // Save Game button - NEW
        const saveButton = this.add.text(width/2, menuY + 20, 'Save Game', buttonStyle)
            .setOrigin(0.5)
            .setInteractive();
            
        saveButton.on('pointerdown', () => {
            this.scene.stop();
            this.scene.launch('SaveMenuScene', {
                mode: 'save',
                returnScene: this.returnScene
            });
        });
        
        // Load Game button - NEW
        const loadButton = this.add.text(width/2, menuY + 90, 'Load Game', buttonStyle)
            .setOrigin(0.5)
            .setInteractive();
            
        loadButton.on('pointerdown', () => {
            this.scene.stop();
            this.scene.launch('SaveMenuScene', {
                mode: 'load',
                returnScene: this.returnScene
            });
        });
        
        // Main Menu button
        const mainMenuButton = this.add.text(width/2, menuY + 160, 'Main Menu', buttonStyle)
            .setOrigin(0.5)
            .setInteractive();
            
        mainMenuButton.on('pointerdown', () => {
            this.scene.stop(this.returnScene);
            this.scene.stop();
            this.scene.start('MainMenuScene');
        });
        
        // Add hover effects
        [resumeButton, saveButton, loadButton, mainMenuButton].forEach(button => {
            button.on('pointerover', () => {
                button.setStyle({ backgroundColor: '#555555' });
            });
            button.on('pointerout', () => {
                button.setStyle({ backgroundColor: '#333333' });
            });
        });
    }
}