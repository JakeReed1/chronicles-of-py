// Boot Scene - Initial setup and configuration
export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
        console.log('BootScene constructor called');
    }

    preload() {
        console.log('BootScene preload called');
        // No external assets to load - we'll create everything programmatically
    }

    create() {
        console.log('BootScene create called');
        // Set up game settings
        this.game.config.backgroundColor = '#1a1a2e';
        
        // Enable multi-touch if on mobile
        this.input.addPointer(2);
        
        // Start the preload scene
        this.scene.start('PreloadScene');
    }
}