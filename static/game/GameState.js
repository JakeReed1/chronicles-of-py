// GameState.js - Create this as a separate file or at the top of your main game file
class GameState {
    constructor() {
        this.playerPosition = { x: 150, y: 500 }; // Default spawn position
        this.defeatedEnemies = new Set();
        this.playerStats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            knowledge: 0,
            experience: 0
        };
        this.currentEnemy = null;
        
        // Load from localStorage if available
        this.loadGameState();
    }

    // Add these methods to your existing GameState class:

    getPlayer() {
        return { ...this.playerStats };
    }

    setPlayer(playerData) {
        // Merge Django player data with local state
        this.playerStats = { ...this.playerStats, ...playerData };
        this.saveToStorage();
    }

    addExperience(xp) {
        this.playerStats.experience = (this.playerStats.experience || 0) + xp;
        
        // Simple level up system
        const xpNeeded = this.playerStats.level * 100;
        if (this.playerStats.experience >= xpNeeded) {
            this.playerStats.level++;
            this.playerStats.experience -= xpNeeded;
            this.playerStats.maxHp += 10;
            this.playerStats.maxMp += 5;
            this.playerStats.hp = this.playerStats.maxHp;
            this.playerStats.mp = this.playerStats.maxMp;
            
            console.log('LEVEL UP! Now level', this.playerStats.level);
        }
        
        this.saveToStorage();
    }
    
    savePlayerPosition(x, y) {
        this.playerPosition = { x, y };
        this.saveToStorage();
    }
    
    getPlayerPosition() {
        return { ...this.playerPosition }; // Return a copy to prevent direct modification
    }
    
    markEnemyDefeated(enemyId) {
        this.defeatedEnemies.add(enemyId);
        this.saveToStorage();
    }
    
    isEnemyDefeated(enemyId) {
        return this.defeatedEnemies.has(enemyId);
    }
    
    updatePlayerStats(stats) {
        this.playerStats = { ...this.playerStats, ...stats };
        this.saveToStorage();
    }
    
    getPlayerStats() {
        return { ...this.playerStats };
    }
    
    saveToStorage() {
        const saveData = {
            playerPosition: this.playerPosition,
            defeatedEnemies: Array.from(this.defeatedEnemies),
            playerStats: this.playerStats,
            timestamp: Date.now()
        };
        localStorage.setItem('chroniclesOfPySave', JSON.stringify(saveData));
    }
    
    loadGameState() {
        const savedData = localStorage.getItem('chroniclesOfPySave');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.playerPosition = parsed.playerPosition || this.playerPosition;
                this.defeatedEnemies = new Set(parsed.defeatedEnemies || []);
                this.playerStats = { ...this.playerStats, ...parsed.playerStats };
            } catch (e) {
                console.error('Failed to load save data:', e);
            }
        }
    }
    
    resetGame() {
        localStorage.removeItem('chroniclesOfPySave');
        this.playerPosition = { x: 150, y: 500 };
        this.defeatedEnemies.clear();
        this.playerStats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            knowledge: 0,
            experience: 0
        };
    }
}

// Initialize globally before starting Phaser
window.gameState = new GameState();