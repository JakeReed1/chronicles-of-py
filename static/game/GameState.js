// GameState.js - Enhanced with multiple save slots
class GameState {
    constructor() {
        this.playerPosition = { x: 150, y: 500 };
        this.defeatedEnemies = new Set();
        this.collectedKeys = new Set();
        this.playerStats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            attack: 10,
            defense: 5,
            knowledge: 0,
            experience: 0
        };
        this.currentEnemy = null;
        this.currentSlot = 'autosave'; // Track which slot we're using

        // Load from localStorage if available
        this.loadGameState();
    }

    // How much XP is required to go from `level` to `level + 1`
    xpForLevel(level) {
        return level * 100;
    }

    // Level progress info for HUD display (0-1 percent toward next level)
    getXpProgress() {
        const level = this.playerStats.level;
        const xp = this.playerStats.experience || 0;
        const xpNeeded = this.xpForLevel(level);
        return {
            level,
            xp,
            xpNeeded,
            percent: xpNeeded > 0 ? Math.min(1, Math.max(0, xp / xpNeeded)) : 0
        };
    }
    
    // NEW: Save to a specific slot with a name
    saveToSlot(slotNumber, slotName = null) {
        const saveData = {
            slotName: slotName || `Save ${slotNumber}`,
            slotNumber: slotNumber,
            playerPosition: this.playerPosition,
            defeatedEnemies: Array.from(this.defeatedEnemies),
            collectedKeys: Array.from(this.collectedKeys),
            playerStats: this.playerStats,
            currentZone: this.currentZone || 'PrintForestScene',
            timestamp: Date.now(),
            playTime: this.playTime || 0
        };
        
        localStorage.setItem(`chroniclesOfPy_slot${slotNumber}`, JSON.stringify(saveData));
        this.currentSlot = `slot${slotNumber}`;
        
        // Update saves directory
        this.updateSavesDirectory(slotNumber, slotName);
    }
    
    // NEW: Load from a specific slot
    loadFromSlot(slotNumber) {
        const savedData = localStorage.getItem(`chroniclesOfPy_slot${slotNumber}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.playerPosition = parsed.playerPosition || this.playerPosition;
                this.defeatedEnemies = new Set(parsed.defeatedEnemies || []);
                this.collectedKeys = new Set(parsed.collectedKeys || []);
                this.playerStats = { ...this.playerStats, ...parsed.playerStats };
                this.currentZone = parsed.currentZone;
                this.currentSlot = `slot${slotNumber}`;
                return parsed;
            } catch (e) {
                console.error('Failed to load save slot:', e);
                return null;
            }
        }
        return null;
    }
    
    // NEW: Get all save slots info
    getAllSaveSlots() {
        const slots = [];
        for (let i = 1; i <= 5; i++) { // 5 save slots
            const data = localStorage.getItem(`chroniclesOfPy_slot${i}`);
            if (data) {
                try {
                    slots.push(JSON.parse(data));
                } catch (e) {
                    slots.push(null);
                }
            } else {
                slots.push(null);
            }
        }
        return slots;
    }
    
    // NEW: Delete a save slot
    deleteSlot(slotNumber) {
        localStorage.removeItem(`chroniclesOfPy_slot${slotNumber}`);
    }
    
    // NEW: Update saves directory
    updateSavesDirectory(slotNumber, slotName) {
        let directory = localStorage.getItem('chroniclesOfPy_directory');
        let saves = directory ? JSON.parse(directory) : {};
        saves[`slot${slotNumber}`] = {
            name: slotName || `Save ${slotNumber}`,
            timestamp: Date.now()
        };
        localStorage.setItem('chroniclesOfPy_directory', JSON.stringify(saves));
    }
    
    // Modified: Now saves to current slot (KEEP THIS ONE)
    saveToStorage() {
        if (this.currentSlot === 'autosave') {
            // Autosave uses the original system
            const saveData = {
                playerPosition: this.playerPosition,
                defeatedEnemies: Array.from(this.defeatedEnemies),
                collectedKeys: Array.from(this.collectedKeys),
                playerStats: this.playerStats,
                timestamp: Date.now()
            };
            localStorage.setItem('chroniclesOfPySave', JSON.stringify(saveData));
        } else {
            // Save to the current numbered slot
            const slotNumber = parseInt(this.currentSlot.replace('slot', ''));
            this.saveToSlot(slotNumber);
        }
    }

    getPlayer() {
        return { ...this.playerStats };
    }

    setPlayer(playerData) {
        // Merge Django player data with local state
        this.playerStats = { ...this.playerStats, ...playerData };
        this.saveToStorage();
    }

    // Adds XP, applying every level-up earned (a big reward can trigger several
    // at once). Returns level-up info so callers (e.g. BattleScene) can show feedback.
    addExperience(xp) {
        this.playerStats.experience = (this.playerStats.experience || 0) + xp;

        const startingLevel = this.playerStats.level;

        while (this.playerStats.experience >= this.xpForLevel(this.playerStats.level)) {
            this.playerStats.experience -= this.xpForLevel(this.playerStats.level);
            this.playerStats.level++;
            this.playerStats.maxHp += 10;
            this.playerStats.maxMp += 5;
            this.playerStats.attack = (this.playerStats.attack || 10) + 2;
            this.playerStats.defense = (this.playerStats.defense || 5) + 1;

            // Full heal on level up
            this.playerStats.hp = this.playerStats.maxHp;
            this.playerStats.mp = this.playerStats.maxMp;

            console.log('LEVEL UP! Now level', this.playerStats.level);
        }

        this.saveToStorage();

        return {
            leveledUp: this.playerStats.level > startingLevel,
            levelsGained: this.playerStats.level - startingLevel,
            level: this.playerStats.level
        };
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

    collectKey(keyId) {
        this.collectedKeys.add(keyId);
        this.saveToStorage();
    }

    hasKey(keyId) {
        return this.collectedKeys.has(keyId);
    }


    updatePlayerStats(stats) {
        this.playerStats = { ...this.playerStats, ...stats };
        this.saveToStorage();
    }
    
    getPlayerStats() {
        return { ...this.playerStats };
    }

    loadGameState() {
        const savedData = localStorage.getItem('chroniclesOfPySave');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.playerPosition = parsed.playerPosition || this.playerPosition;
                this.defeatedEnemies = new Set(parsed.defeatedEnemies || []);
                this.collectedKeys = new Set(parsed.collectedKeys || []);
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
        this.collectedKeys.clear();
        this.playerStats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            attack: 10,
            defense: 5,
            knowledge: 0,
            experience: 0
        };
        this.currentSlot = 'autosave'; // Reset to autosave
    }
}

// Initialize globally before starting Phaser
window.gameState = new GameState();