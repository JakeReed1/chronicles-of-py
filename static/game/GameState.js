// GameState.js - Enhanced with multiple save slots
class GameState {
    constructor() {
        this.playerPosition = { x: 150, y: 500 };
        this.defeatedEnemies = new Set();
        this.collectedKeys = new Set();
        this.chestItemsTaken = new Set();
        this.inventory = []; // list of {name, type, quantity} - server is the source of truth once logged in
        this.playerStats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            attack: 10,
            defense: 5,
            magicAttack: 8,
            magicDefense: 4,
            speed: 10,
            skillPoints: 0,
            gold: 0,
            knowledge: 0,
            experience: 0
        };
        this.currentEnemy = null;
        this.currentSlot = 'autosave'; // Track which slot we're using

        // Load from localStorage if available
        this.loadGameState();
    }

    // How much XP is required to go from `level` to `level + 1`.
    // Matches Player.exp_for_next_level() on the backend (apps/characters/
    // models.py) - the two used to disagree (this used to be a flat
    // `level * 100`) since nothing ever synced them; now that stats are
    // synced to the real Player row (see addExperience() below), the
    // curves have to match or a player's level would jump around
    // depending on which side last touched it.
    xpForLevel(level) {
        return 100 * (level ** 2);
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
            chestItemsTaken: Array.from(this.chestItemsTaken),
            inventory: this.inventory,
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
                this.chestItemsTaken = new Set(parsed.chestItemsTaken || []);
                this.inventory = parsed.inventory || [];
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
                chestItemsTaken: Array.from(this.chestItemsTaken),
                inventory: this.inventory,
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
    //
    // Stat growth per level matches Player.level_up() on the backend
    // exactly (apps/characters/models.py) - see the note on xpForLevel().
    // Leveling still happens here, client-side, rather than waiting on a
    // request, since battles have no other network dependency mid-fight;
    // syncStatsToServer() below is what makes the backend Player row
    // agree afterward instead of staying decorative.
    addExperience(xp) {
        this.playerStats.experience = (this.playerStats.experience || 0) + xp;

        const startingLevel = this.playerStats.level;

        while (this.playerStats.experience >= this.xpForLevel(this.playerStats.level)) {
            this.playerStats.experience -= this.xpForLevel(this.playerStats.level);
            this.playerStats.level++;
            this.playerStats.skillPoints = (this.playerStats.skillPoints || 0) + 3;
            this.playerStats.maxHp += 20;
            this.playerStats.maxMp += 10;
            this.playerStats.attack = (this.playerStats.attack || 10) + 3;
            this.playerStats.defense = (this.playerStats.defense || 5) + 2;
            this.playerStats.magicAttack = (this.playerStats.magicAttack || 8) + 3;
            this.playerStats.magicDefense = (this.playerStats.magicDefense || 4) + 2;
            this.playerStats.speed = (this.playerStats.speed || 10) + 1;

            // Full heal on level up
            this.playerStats.hp = this.playerStats.maxHp;
            this.playerStats.mp = this.playerStats.maxMp;

            console.log('LEVEL UP! Now level', this.playerStats.level);
        }

        this.saveToStorage();

        const leveledUp = this.playerStats.level > startingLevel;
        if (leveledUp) {
            this.syncStatsToServer();
        }

        return {
            leveledUp,
            levelsGained: this.playerStats.level - startingLevel,
            level: this.playerStats.level
        };
    }

    // Fire-and-forget push of the fields a level-up actually changes onto
    // the real backend Player row (PlayerViewSet.sync_stats). Silently a
    // no-op if the player isn't logged in / the request fails - local
    // progress (playerStats/localStorage) is never blocked on this.
    syncStatsToServer() {
        const playerId = this.playerStats.id;
        if (!playerId) return;

        fetch(`/api/players/${playerId}/sync_stats/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN || ''
            },
            body: JSON.stringify({
                level: this.playerStats.level,
                experience: this.playerStats.experience,
                max_hp: this.playerStats.maxHp,
                current_hp: this.playerStats.hp,
                max_mp: this.playerStats.maxMp,
                current_mp: this.playerStats.mp,
                attack: this.playerStats.attack,
                defense: this.playerStats.defense,
                magic_attack: this.playerStats.magicAttack,
                magic_defense: this.playerStats.magicDefense,
                speed: this.playerStats.speed,
                skill_points: this.playerStats.skillPoints
            })
        }).catch(err => console.warn('syncStatsToServer failed (offline/not logged in?):', err));
    }

    // Inventory - the server (PlayerInventory, via /api/execute-inventory-code/)
    // is the source of truth once logged in; this is just the last-synced
    // local mirror for display and for offline/localStorage save.
    getInventory() {
        return [...this.inventory];
    }

    // Called with the response body of a successful /api/execute-inventory-code/
    // or /api/execute-shop-code/ call - replaces inventory wholesale and
    // merges whatever whitelisted stat fields the response includes.
    // Deliberately only touches fields actually present in playerPatch
    // (undefined -> keep current value) since the shop endpoint returns a
    // much narrower patch (just gold) than the general inventory console
    // does (the full PLAYER_EDITABLE_FIELDS set) - a naive spread would
    // clobber attack/defense/etc. with undefined after every shop trade.
    setInventoryAndStats(inventory, playerPatch) {
        this.inventory = inventory || [];
        if (playerPatch) {
            const fieldMap = {
                attack: 'attack', defense: 'defense',
                magic_attack: 'magicAttack', magic_defense: 'magicDefense',
                speed: 'speed', max_hp: 'maxHp', max_mp: 'maxMp',
                skill_points: 'skillPoints', current_hp: 'hp', current_mp: 'mp',
                gold: 'gold'
            };
            for (const [backendKey, localKey] of Object.entries(fieldMap)) {
                if (playerPatch[backendKey] !== undefined) {
                    this.playerStats[localKey] = playerPatch[backendKey];
                }
            }
        }
        this.saveToStorage();
    }

    // Marks a chest's item as actually collected (permanent - the chest
    // itself can still be opened/closed for a look afterward, but stays
    // empty). Distinct from the chest's current open/closed animation
    // state, which is per-session and lives on the chest controller
    // itself (chestAnim.js), not here.
    takeChestItem(chestId) {
        this.chestItemsTaken.add(chestId);
        this.saveToStorage();
    }

    isChestItemTaken(chestId) {
        return this.chestItemsTaken.has(chestId);
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
                this.chestItemsTaken = new Set(parsed.chestItemsTaken || []);
                this.inventory = parsed.inventory || [];
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
        this.chestItemsTaken.clear();
        this.inventory = [];
        this.playerStats = {
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            attack: 10,
            defense: 5,
            magicAttack: 8,
            magicDefense: 4,
            speed: 10,
            skillPoints: 0,
            gold: 0,
            knowledge: 0,
            experience: 0
        };
        this.currentSlot = 'autosave'; // Reset to autosave
    }
}

// Initialize globally before starting Phaser
window.gameState = new GameState();