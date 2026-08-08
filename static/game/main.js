// Import GameState FIRST, before anything else
import './GameState.js';  // This will create window.gameState
import './config.js';

// Main game initialization
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import PrintForestScene from './scenes/zones/PrintForestScene.js';
import BattleScene from './scenes/BattleScene.js';
import UIScene from './scenes/UIScene.js';
import SaveMenuScene from './scenes/ui/SaveMenuScene.js';
import PauseMenuScene from './scenes/ui/PauseMenuScene.js';

// Wait for everything to load
console.log('All imports complete');
console.log('PrintForestScene is:', PrintForestScene);

// Add scenes to config
config.scene = [
    BootScene,
    PreloadScene,
    MainMenuScene,
    PrintForestScene,
    BattleScene,
    UIScene,
    SaveMenuScene, 
    PauseMenuScene
];

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the game
    window.game = new Phaser.Game(config);
    
    // Fetch player data from Django if available
    if (typeof API_BASE_URL !== 'undefined') {
        fetchPlayerData();
    }
});

// API Helper functions
async function fetchPlayerData() {
    try {
        const response = await fetch(`${API_BASE_URL}/player/`, {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            }
        });
        
        if (response.ok) {
            const playerData = await response.json();
            window.gameState.setPlayer(playerData);
        }
    } catch (error) {
        console.error('Failed to fetch player data:', error);
    }
}

// Export for use in scenes
window.fetchPlayerData = fetchPlayerData;