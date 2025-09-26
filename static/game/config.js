// Phaser 3 Game Configuration for Chronicles of Py

const config = {
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
    scene: [], // Will be populated with our scenes
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    }
};

// API configuration
const API_BASE_URL = '/api';
const CSRF_TOKEN = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

// Game state manager
class GameStateManager {
    constructor() {
        this.player = null;
        this.currentScene = null;
        this.inventory = [];
        this.quests = [];
        this.currentEnemy = null;
        this.defeatedEnemies = [];
        this.playerPosition = { x: 150, y: 500 }; // Default starting position
    }
    
    setPlayer(playerData) {
        this.player = playerData;
    }
    
    getPlayer() {
        return this.player;
    }
    
    addExperience(xp) {
        if (this.player) {
            this.player.experience = (this.player.experience || 0) + xp;
            // Simple level up check
            const newLevel = Math.floor(this.player.experience / 100) + 1;
            if (newLevel > this.player.level) {
                this.player.level = newLevel;
                this.player.maxHp += 20;
                this.player.maxMp += 10;
                this.player.hp = this.player.maxHp;
                this.player.mp = this.player.maxMp;
                console.log('Level up! Now level', this.player.level);
            }
        }
    }
    
    markEnemyDefeated(enemyId) {
        if (enemyId && !this.defeatedEnemies.includes(enemyId)) {
            this.defeatedEnemies.push(enemyId);
        }
    }
    
    isEnemyDefeated(enemyId) {
        return this.defeatedEnemies.includes(enemyId);
    }
    
    savePlayerPosition(x, y) {
        this.playerPosition = { x: x, y: y };
    }
    
    getPlayerPosition() {
        return this.playerPosition;
    }
    
    saveGame() {
        // Save to local storage
        localStorage.setItem('chroniclesOfPy_save', JSON.stringify({
            player: this.player,
            inventory: this.inventory,
            quests: this.quests,
            playerPosition: this.playerPosition,
            defeatedEnemies: this.defeatedEnemies
        }));
    }
    
    loadGame() {
        const save = localStorage.getItem('chroniclesOfPy_save');
        if (save) {
            const data = JSON.parse(save);
            this.player = data.player;
            this.inventory = data.inventory || [];
            this.quests = data.quests || [];
            this.playerPosition = data.playerPosition || { x: 150, y: 500 };
            this.defeatedEnemies = data.defeatedEnemies || [];
            return true;
        }
        return false;
    }
}

// Create global game state
window.gameState = new GameStateManager();

// Export config to window for non-module scripts
window.config = config;