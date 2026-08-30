// Phaser 3 Game Configuration for Chronicles of Py

export const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1920,
    height: 1080,
    pixelArt: true, // For that retro JRPG feel
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Top-down view, no gravity
            debug: false
        }
    },
    scene: [], // Populated by the page that imports this config
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    }
};

export const API_BASE_URL = '/api';

// Note: window.gameState is created by GameState.js, which must be imported
// before any scene runs. window.CSRF_TOKEN is set by the page itself.
