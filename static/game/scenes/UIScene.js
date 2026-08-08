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
        
    }
}