// Battle Scene - Turn-based JRPG combat
export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.selectedAction = null;
        this.playerTurn = true;
        this.battleEnded = false;
    }

    init(data) {
        // Receive battle data
        this.enemyData = data.enemy || { id: 1, name: 'Code Goblin', hp: 50, level: 1 };
        this.isTutorial = data.isTutorial || false;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Battle background
        this.add.rectangle(0, 0, width, height, 0x2a2a3e).setOrigin(0);
        
        // Add grid effect for code theme
        this.createGrid();
        
        // Create battle UI
        this.createBattleUI();
        
        // Add characters
        this.createCharacters();
        
        // Start UI scene for overlay
        this.scene.launch('UIScene');
        
        // Initialize battle
        this.startBattle();
    }
    
    createGrid() {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x3a3a4e, 0.3);
        
        // Draw grid
        for (let i = 0; i < 800; i += 50) {
            graphics.moveTo(i, 0);
            graphics.lineTo(i, 600);
        }
        for (let j = 0; j < 600; j += 50) {
            graphics.moveTo(0, j);
            graphics.lineTo(800, j);
        }
        graphics.strokePath();
    }
    
    createCharacters() {
        // Player character
        this.player = this.add.sprite(200, 300, 'hero');
        this.player.setScale(3);
        this.player.play('hero-idle');
        
        // Enemy
        this.enemy = this.add.sprite(600, 300, 'goblin');
        this.enemy.setScale(3);
        this.enemy.play('goblin-idle');
        
        // Character info panels
        this.createCharacterPanel(50, 50, 'Player', gameState.player || { level: 1, hp: 100, maxHp: 100, mp: 50, maxMp: 50 });
        this.createCharacterPanel(500, 50, this.enemyData.name, { 
            level: this.enemyData.level, 
            hp: this.enemyData.hp, 
            maxHp: this.enemyData.hp,
            mp: 20,
            maxMp: 20
        });
    }
    
    createCharacterPanel(x, y, name, stats) {
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a2e, 0.8);
        panel.fillRoundedRect(x, y, 250, 100, 10);
        
        // Name and level
        this.add.text(x + 10, y + 10, `${name} Lv.${stats.level}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        
        // HP Bar
        this.add.text(x + 10, y + 35, 'HP', { fontSize: '14px', color: '#ff6b6b' });
        this.createBar(x + 40, y + 35, 180, 14, stats.hp / stats.maxHp, 0xff0000, 0x660000);
        this.add.text(x + 225, y + 35, `${stats.hp}/${stats.maxHp}`, { fontSize: '12px', color: '#ffffff' });
        
        // MP Bar
        this.add.text(x + 10, y + 55, 'MP', { fontSize: '14px', color: '#4ecdc4' });
        this.createBar(x + 40, y + 55, 180, 14, stats.mp / stats.maxMp, 0x0066ff, 0x003366);
        this.add.text(x + 225, y + 55, `${stats.mp}/${stats.maxMp}`, { fontSize: '12px', color: '#ffffff' });
        
        // Store references
        if (name === 'Player') {
            this.playerStats = stats;
            this.playerHPBar = { x: x + 40, y: y + 35, width: 180, height: 14 };
            this.playerMPBar = { x: x + 40, y: y + 55, width: 180, height: 14 };
        } else {
            this.enemyStats = stats;
            this.enemyHPBar = { x: x + 40, y: y + 35, width: 180, height: 14 };
        }
    }
    
    createBar(x, y, width, height, percentage, fillColor, bgColor) {
        const bar = this.add.graphics();
        
        // Background
        bar.fillStyle(bgColor);
        bar.fillRect(x, y, width, height);
        
        // Fill
        bar.fillStyle(fillColor);
        bar.fillRect(x, y, width * percentage, height);
        
        // Border
        bar.lineStyle(1, 0xffffff);
        bar.strokeRect(x, y, width, height);
        
        return bar;
    }
    
    createBattleUI() {
        const { width, height } = this.cameras.main;
        const menuY = height - 150;
        
        // Action menu background
        const menuBg = this.add.graphics();
        menuBg.fillStyle(0x1a1a2e, 0.9);
        menuBg.fillRoundedRect(10, menuY, width - 20, 140, 10);
        menuBg.lineStyle(2, 0x4a4a6e);
        menuBg.strokeRoundedRect(10, menuY, width - 20, 140, 10);
        
        // Battle options
        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonSpacing = 10;
        const startX = 30;
        const startY = menuY + 20;
        
        // Attack button
        this.createActionButton(startX, startY, buttonWidth, buttonHeight, 
            'Attack', '⚔️', () => this.selectAction('attack'));
        
        // Code button
        this.createActionButton(startX + buttonWidth + buttonSpacing, startY, buttonWidth, buttonHeight,
            'Code', '💻', () => this.selectAction('code'));
        
        // Skills button
        this.createActionButton(startX, startY + buttonHeight + buttonSpacing, buttonWidth, buttonHeight,
            'Skills', '✨', () => this.selectAction('skills'));
        
        // Items button
        this.createActionButton(startX + buttonWidth + buttonSpacing, startY + buttonHeight + buttonSpacing, buttonWidth, buttonHeight,
            'Items', '🧪', () => this.selectAction('items'));
        
        // Battle log
        this.battleLog = this.add.text(width / 2 + 100, menuY + 20, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ffffff',
            wordWrap: { width: 300 }
        });
    }
    
    createActionButton(x, y, width, height, text, icon, callback) {
        const button = this.add.group();
        
        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(0x4a4a6e, 1);
        bg.fillRoundedRect(x, y, width, height, 5);
        bg.lineStyle(2, 0x6a6aae);
        bg.strokeRoundedRect(x, y, width, height, 5);
        
        // Make interactive
        const hitArea = new Phaser.Geom.Rectangle(x, y, width, height);
        bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        // Icon and text
        const buttonText = this.add.text(x + width/2, y + height/2, `${icon} ${text}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Hover effects
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x6a6aae, 1);
            bg.fillRoundedRect(x, y, width, height, 5);
            bg.lineStyle(2, 0x8a8ace);
            bg.strokeRoundedRect(x, y, width, height, 5);
        });
        
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x4a4a6e, 1);
            bg.fillRoundedRect(x, y, width, height, 5);
            bg.lineStyle(2, 0x6a6aae);
            bg.strokeRoundedRect(x, y, width, height, 5);
        });
        
        bg.on('pointerdown', callback);
        
        button.add([bg, buttonText]);
        return button;
    }
    
    startBattle() {
        this.addBattleMessage('A wild ' + this.enemyData.name + ' appears!');
        
        if (this.isTutorial) {
            this.time.delayedCall(1500, () => {
                this.addBattleMessage('Tutorial: Choose Attack to damage the enemy!');
            });
        }
    }
    
    selectAction(action) {
        if (!this.playerTurn || this.battleEnded) return;
        
        this.selectedAction = action;
        
        switch(action) {
            case 'attack':
                this.performAttack();
                break;
            case 'code':
                this.openCodeEditor();
                break;
            case 'skills':
                this.addBattleMessage('Skills not yet implemented!');
                break;
            case 'items':
                this.addBattleMessage('Items not yet implemented!');
                break;
        }
    }
    
    performAttack() {
        this.playerTurn = false;
        
        // Player attack animation
        this.tweens.add({
            targets: this.player,
            x: this.player.x + 50,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                // Calculate damage
                const damage = Phaser.Math.Between(10, 20);
                this.enemyStats.hp = Math.max(0, this.enemyStats.hp - damage);
                
                // Update enemy HP bar
                this.updateHealthBar('enemy', this.enemyStats.hp / this.enemyStats.maxHp);
                
                // Damage effect
                this.enemy.setTint(0xff0000);
                this.time.delayedCall(200, () => this.enemy.clearTint());
                
                // Battle message
                this.addBattleMessage(`Player attacks! ${damage} damage!`);
                
                // Check victory
                if (this.enemyStats.hp <= 0) {
                    this.victory();
                } else {
                    // Enemy turn
                    this.time.delayedCall(1000, () => this.enemyTurn());
                }
            }
        });
    }
    
    enemyTurn() {
        // Simple enemy AI
        const damage = Phaser.Math.Between(5, 15);
        
        this.tweens.add({
            targets: this.enemy,
            x: this.enemy.x - 50,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
                
                // Update player HP bar
                this.updateHealthBar('player', this.playerStats.hp / this.playerStats.maxHp);
                
                // Damage effect
                this.player.setTint(0xff0000);
                this.time.delayedCall(200, () => this.player.clearTint());
                
                // Battle message
                this.addBattleMessage(`${this.enemyData.name} attacks! ${damage} damage!`);
                
                // Check defeat
                if (this.playerStats.hp <= 0) {
                    this.defeat();
                } else {
                    this.playerTurn = true;
                    this.addBattleMessage('Your turn!');
                }
            }
        });
    }
    
    updateHealthBar(target, percentage) {
        const bar = target === 'player' ? this.playerHPBar : this.enemyHPBar;
        
        // Clear and redraw the bar
        const graphics = this.add.graphics();
        graphics.fillStyle(0x660000);
        graphics.fillRect(bar.x, bar.y, bar.width, bar.height);
        graphics.fillStyle(0xff0000);
        graphics.fillRect(bar.x, bar.y, bar.width * percentage, bar.height);
        graphics.lineStyle(1, 0xffffff);
        graphics.strokeRect(bar.x, bar.y, bar.width, bar.height);
    }
    
    openCodeEditor() {
        // This would open a modal or overlay for writing Python code
        // For now, just simulate it
        this.addBattleMessage('Code editor not yet implemented!');
        this.addBattleMessage('This will let you write Python to attack!');
    }
    
    victory() {
        this.battleEnded = true;
        this.addBattleMessage('Victory! You defeated ' + this.enemyData.name + '!');
        this.addBattleMessage('Gained 50 EXP and 25 Gold!');
        
        // Victory animation
        this.enemy.setAlpha(0.5);
        this.tweens.add({
            targets: this.enemy,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.scene.stop('UIScene');
                    this.scene.start('WorldScene');
                });
            }
        });
        
        // Send victory to backend
        this.reportBattleResult('victory');
    }
    
    defeat() {
        this.battleEnded = true;
        this.addBattleMessage('Defeated... Try again!');
        
        this.player.setAlpha(0.5);
        
        this.time.delayedCall(2000, () => {
            this.scene.stop('UIScene');
            this.scene.start('MainMenuScene');
        });
        
        this.reportBattleResult('defeat');
    }
    
    async reportBattleResult(result) {
        try {
            await fetch(`${API_BASE_URL}/battles/complete/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify({
                    enemy_id: this.enemyData.id,
                    result: result,
                    exp_gained: result === 'victory' ? 50 : 0,
                    gold_gained: result === 'victory' ? 25 : 0
                })
            });
        } catch (error) {
            console.error('Failed to report battle result:', error);
        }
    }
    
    addBattleMessage(message) {
        const currentText = this.battleLog.text;
        const messages = currentText.split('\n').filter(m => m);
        messages.push(`> ${message}`);
        
        // Keep last 5 messages
        if (messages.length > 5) {
            messages.shift();
        }
        
        this.battleLog.setText(messages.join('\n'));
    }
}