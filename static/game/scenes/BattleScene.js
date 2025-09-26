// Battle Scene - Python-powered combat!
export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.experience = 0;
        this.level = 1;
    }

    getPlayer() {
        return {
            hp: this.playerStats.hp,
            maxHp: this.playerStats.maxHp,
            mp: this.playerStats.mp,
            maxMp: this.playerStats.maxMp,
            level: this.playerStats.level || 1
        };
    }
    
    addExperience(xp) {
        this.experience += xp;
        
        // Simple level up system
        const xpNeeded = this.level * 100;
        if (this.experience >= xpNeeded) {
            this.level++;
            this.experience -= xpNeeded;
            
            // Increase stats on level up
            this.playerStats.maxHp += 10;
            this.playerStats.maxMp += 5;
            this.playerStats.hp = this.playerStats.maxHp; // Full heal on level up
            this.playerStats.mp = this.playerStats.maxMp;
            this.playerStats.level = this.level;
        }
        
        this.saveToStorage();
    }
    
    markEnemyDefeated(enemyId) {
        this.defeatedEnemies.add(enemyId);
        this.saveToStorage();
    }

    create() {
        console.log('BattleScene.create() called');
        
        // Get game dimensions
        const { width, height } = this.cameras.main;
        this.gameWidth = width;
        this.gameHeight = height;
        console.log('Game dimensions:', width, 'x', height);
        
        // Battle background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // Add grid pattern for code feel
        const gridSize = Math.floor(width / 40);
        for (let i = 0; i < gridSize; i++) {
            this.add.line(width / 2, height / 2, 0, i * (height / 20), width, i * (height / 20), 0x16213e, 0.3);
            this.add.line(width / 2, height / 2, i * (width / gridSize), 0, i * (width / gridSize), height, 0x16213e, 0.3);
        }
        
        // Title
        this.add.text(width / 2, height * 0.05, 'PYTHON BATTLE!', {
            fontSize: Math.floor(width / 40) + 'px',
            fontFamily: 'monospace',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Initialize battle state FIRST (before creating UI)
        this.initializeBattle();
        
        // Create battle UI
        this.createBattleUI();
        
        // Create combatants
        this.createCombatants();
        
        // Create UI elements
        this.createBattleUI();
        
        // Create code editor
        this.createCodeEditor();
        
        // Update UI with initial values
        this.updatePlayerHP();
        this.updateEnemyHP();
        
        // Show battle intro
        this.showBattleIntro();
    }
    
    createBattleUI() {
        const { width, height } = this.cameras.main;
        const fontSize = Math.max(14, Math.floor(width / 100));
        const smallFontSize = Math.max(12, Math.floor(width / 120));
        
        // Player status panel - left side, aligned with sprite
        const panelWidth = width * 0.2;
        const panelHeight = height * 0.12;
        const playerPanelX = width * 0.15;
        const playerPanelY = height * 0.15;
        
        const playerPanel = this.add.rectangle(playerPanelX, playerPanelY, panelWidth, panelHeight, 0x0f3460);
        this.add.rectangle(playerPanelX, playerPanelY, panelWidth, panelHeight, 0x16213e, 0).setStrokeStyle(2, 0x00ff00);
        
        this.playerNameText = this.add.text(playerPanelX - panelWidth * 0.4, playerPanelY - panelHeight * 0.4, 'Python Hero', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff'
        });
        
        this.playerHPText = this.add.text(playerPanelX - panelWidth * 0.4, playerPanelY - panelHeight * 0.2, 'HP: 100/100', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#00ff00'
        });
        
        this.playerMPText = this.add.text(playerPanelX - panelWidth * 0.4, playerPanelY, 'MP: 50/50', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#00aaff'
        });
        
        // Player HP bar background
        const barWidth = panelWidth * 0.8;
        const barHeight = height * 0.025;
        this.add.rectangle(playerPanelX, playerPanelY + panelHeight * 0.3, barWidth, barHeight, 0x333333);
        this.playerHPBar = this.add.graphics();
        this.playerHPBar.x = playerPanelX - barWidth / 2;
        this.playerHPBar.y = playerPanelY + panelHeight * 0.3 - barHeight / 2;
        
        // Enemy status panel - right side, aligned with player panel
        const enemyPanelX = width * 0.85;
        const enemyPanelY = height * 0.15;
        
        const enemyPanel = this.add.rectangle(enemyPanelX, enemyPanelY, panelWidth, panelHeight, 0x460f0f);
        this.add.rectangle(enemyPanelX, enemyPanelY, panelWidth, panelHeight, 0x16213e, 0).setStrokeStyle(2, 0xff0000);
        
        this.enemyNameText = this.add.text(enemyPanelX - panelWidth * 0.4, enemyPanelY - panelHeight * 0.4, 'Enemy', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff'
        });
        
        this.enemyHPText = this.add.text(enemyPanelX - panelWidth * 0.4, enemyPanelY - panelHeight * 0.2, 'HP: 50/50', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#ff0000'
        });
        
        // Enemy HP bar background
        this.add.rectangle(enemyPanelX, enemyPanelY + panelHeight * 0.3, barWidth, barHeight, 0x333333);
        this.enemyHPBar = this.add.graphics();
        this.enemyHPBar.x = enemyPanelX - barWidth / 2;
        this.enemyHPBar.y = enemyPanelY + panelHeight * 0.3 - barHeight / 2;
        
        // Battle log - center of screen, between sprites and output
        this.battleLog = this.add.text(width / 2, height * 0.48, '', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);
        
        // Python output display - positioned right above the code editor
        const outputY = height * 0.65;
        const outputWidth = width * 0.6;
        const outputHeight = height * 0.15;
        
        // Output background
        this.add.rectangle(width / 2, outputY, outputWidth, outputHeight, 0x2d2d2d, 0.9)
            .setStrokeStyle(2, 0x444444);
        
        // Output label
        this.add.text(width / 2 - outputWidth / 2 + 10, outputY - outputHeight / 2 - 15, '>>> Python Output:', {
            fontSize: Math.floor(fontSize * 0.8) + 'px',
            fontFamily: 'monospace',
            color: '#00ff00'
        });
        
        // Output text area
        this.pythonOutput = this.add.text(width / 2, outputY, '', {
            fontSize: Math.floor(fontSize * 0.9) + 'px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'left',
            wordWrap: { width: outputWidth - 20 }
        }).setOrigin(0.5);
    }
    
        createCombatants() {
        // Initialize stats
        this.playerHP = this.playerMaxHP = 100;
        this.playerMP = this.playerMaxMP = 50;
        this.playerStats = {
            hp: this.playerHP,
            maxHp: this.playerMaxHP,
            mp: this.playerMP,
            maxMp: this.playerMaxMP,
            attack: 10,
            defense: 5
        };
        
        // Get current enemy
        this.currentEnemy = window.gameState.currentEnemy || { 
            name: 'Print Slime',
            stats: { hp: 30, maxHp: 30, attack: 5, defense: 2 }
        };
        
        this.enemyHP = this.enemyMaxHP = this.currentEnemy.stats?.maxHp || 30;
        this.enemyStats = {
            hp: this.enemyHP,
            maxHp: this.enemyMaxHP,
            attack: this.currentEnemy.stats?.attack || 5,
            defense: this.currentEnemy.stats?.defense || 2
        };
        
        // Player sprite - using the actual hero sprite
        const { width, height } = this.cameras.main;
        const spriteScale = Math.max(2, width / 600);
        const spriteY = height * 0.3; // Both sprites at the same height
        
        this.playerSprite = this.add.sprite(width * 0.25, spriteY, 'hero');
        this.playerSprite.setScale(spriteScale); // Scale based on screen size
        
        // Add idle animation to player (subtle breathing effect)
        this.tweens.add({
            targets: this.playerSprite,
            scaleY: spriteScale * 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
        
        // Enemy sprite - using actual enemy sprite
        this.enemySprite = this.add.sprite(width * 0.75, spriteY, 'slime');
        this.enemySprite.setScale(spriteScale); // Same scale as player
        
        // Add idle animation to enemy (bouncing effect)
        this.tweens.add({
            targets: this.enemySprite,
            y: spriteY + 10,
            scaleX: spriteScale * 1.05,
            scaleY: spriteScale * 0.95,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
        
        // Update enemy name text
        if (this.enemyNameText) {
            this.enemyNameText.setText(this.currentEnemy.name);
        }
    }
    
    createCodeEditor() {
        const { width, height } = this.cameras.main;
        const fontSize = Math.max(14, Math.floor(width / 100));
        
        // Code editor background - scale to screen size
        const editorWidth = width * 0.7;
        const editorHeight = height * 0.15;  // Reduced height
        const editorX = width / 2;
        const editorY = height * 0.88;  // Moved to bottom
        
        const editorBg = this.add.rectangle(editorX, editorY, editorWidth, editorHeight, 0x1e1e1e);
        const editorBorder = this.add.rectangle(editorX, editorY, editorWidth, editorHeight, 0x333333, 0).setStrokeStyle(2, 0x00ff00);
        
        // Make border pulse when it's player's turn
        this.editorBorderTween = this.tweens.add({
            targets: editorBorder,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Editor title
        this.add.text(editorX - editorWidth / 2 + 10, editorY - editorHeight / 2 - 20, '>>> Python Code Editor (Start typing!)', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#00ff00'
        });
        
        // Code display area
        this.codeText = this.add.text(editorX - editorWidth / 2 + 20, editorY - editorHeight / 2 + 10, '', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff',
            wordWrap: { width: editorWidth - 40 }
        });
        
        // Initialize code input
        this.userCode = '';
        this.cursorVisible = true;
        
        // Create blinking cursor - adjusted position
        this.cursor = this.add.text(editorX - editorWidth / 2 + 20, editorY - editorHeight / 2 + 10, '|', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#00ff00'
        });
        
        // Blink cursor
        this.time.addEvent({
            delay: 500,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                this.cursor.setVisible(this.cursorVisible);
            },
            loop: true
        });
        
        // Set up keyboard input
        this.setupKeyboardInput();
        
        // Create buttons
        this.createActionButtons();
        
        // Show initial hint
        this.showCodeHint();
    }
    
    createActionButtons() {
        const { width, height } = this.cameras.main;
        const fontSize = Math.max(14, Math.floor(width / 100));
        const smallFontSize = Math.max(12, Math.floor(width / 120));
        const buttonWidth = width * 0.1;
        const buttonHeight = height * 0.04;
        const buttonY = height * 0.97;
        
        // Add instructions
        this.add.text(width / 2, height * 0.78, 'Type Python code above, then click Run Code or press Ctrl+Enter', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        
        // Run Code button
        const runButton = this.add.rectangle(width * 0.35, buttonY, buttonWidth, buttonHeight, 0x4CAF50);
        const runText = this.add.text(width * 0.35, buttonY, 'Run Code', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        runButton.setInteractive()
            .on('pointerover', () => runButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => runButton.setFillStyle(0x4CAF50))
            .on('pointerdown', () => this.executeCode());
        
        // Add keyboard shortcut for Run Code
        this.input.keyboard.on('keydown-CTRL-ENTER', () => {
            this.executeCode();
        });
        
        // Help button
        const helpButton = this.add.rectangle(width * 0.5, buttonY, buttonWidth, buttonHeight, 0x2196F3);
        this.add.text(width * 0.5, buttonY, 'Help', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        helpButton.setInteractive()
            .on('pointerover', () => helpButton.setFillStyle(0x42A5F5))
            .on('pointerout', () => helpButton.setFillStyle(0x2196F3))
            .on('pointerdown', () => this.showHelp());
        
        // Clear button
        const clearButton = this.add.rectangle(width * 0.65, buttonY, buttonWidth, buttonHeight, 0xFF9800);
        this.add.text(width * 0.65, buttonY, 'Clear', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        clearButton.setInteractive()
            .on('pointerover', () => clearButton.setFillStyle(0xFFB74D))
            .on('pointerout', () => clearButton.setFillStyle(0xFF9800))
            .on('pointerdown', () => {
                this.userCode = '';
                this.updateCodeDisplay();
            });
    }
    
    initializeBattle() {
        // Player stats from game state
        const player = window.gameState.getPlayer();
        this.playerStats = {
            hp: player?.hp || 100,
            maxHp: player?.maxHp || 100,
            mp: player?.mp || 50,
            maxMp: player?.maxMp || 50,
            level: player?.level || 1
        };
        
        // Code examples based on enemy
        this.codeExamples = this.getCodeExamples();
        
        // Battle state
        this.isPlayerTurn = true;
        this.battleEnded = false;
    }
    
    getEnemyStats(enemyName) {
        const stats = {
            'Print Slime': { hp: 30, maxHp: 30, damage: 5, xp: 10 },
            'Variable Slime': { hp: 40, maxHp: 40, damage: 8, xp: 15 },
            'Boss: Syntax Error': { hp: 60, maxHp: 60, damage: 12, xp: 30 }
        };
        
        return stats[enemyName] || stats['Print Slime'];
    }
    
    getCodeExamples() {
        const enemy = window.gameState.currentEnemy?.name || 'Print Slime';
        
        const examples = {
            'Print Slime': [
                'print("Hello, World!")',
                'print("Attack!")',
                'print("Fireball!" * 3)'
            ],
            'Variable Slime': [
                'damage = 10\nprint(f"Deal {damage} damage!")',
                'x = 5\ny = 3\nprint(f"Combo attack: {x + y}")'
            ],
            'Boss: Syntax Error': [
                'for i in range(3):\n    print(f"Strike {i+1}!")',
                'attacks = ["Fire", "Ice", "Thunder"]\nfor spell in attacks:\n    print(f"Cast {spell}!")'
            ]
        };
        
        return examples[enemy] || examples['Print Slime'];
    }
    
    showBattleIntro() {
        this.battleLog.setText(`A wild ${window.gameState.currentEnemy?.name || 'enemy'} appeared!\nUse Python code to fight!`);
        
        // Initialize Python output
        if (this.pythonOutput) {
            this.pythonOutput.setText('Ready for Python code execution...');
        }
        
        this.time.delayedCall(2000, () => {
            if (this.isPlayerTurn) {
                this.battleLog.setText('Your turn! Write some Python code to attack!');
                this.showCodeHint();
            }
        });
    }
    
    setupKeyboardInput() {
        // Listen for any key press
        this.input.keyboard.on('keydown', (event) => {
            console.log('Key pressed:', event.key);
            console.log('Is player turn?', this.isPlayerTurn);
            console.log('Battle ended?', this.battleEnded);
            
            if (!this.isPlayerTurn || this.battleEnded) return;
            
            const key = event.key;
            
            // Handle special keys
            if (key === 'Enter') {
                // Add new line
                this.userCode += '\n';
                console.log('Added newline, code is now:', this.userCode);
            } else if (key === 'Backspace') {
                // Remove last character
                this.userCode = this.userCode.slice(0, -1);
                console.log('Removed character, code is now:', this.userCode);
            } else if (key === 'Tab') {
                // Add 4 spaces for indentation
                event.preventDefault();
                this.userCode += '    ';
                console.log('Added tab, code is now:', this.userCode);
            } else if (key.length === 1) {
                // Add regular character
                this.userCode += key;
                console.log('Added character:', key, 'code is now:', this.userCode);
            }
            
            // Update displayed code
            this.updateCodeDisplay();
        });
    }
    
    updateCodeDisplay() {
        // Display the code with cursor
        const displayText = this.userCode + (this.cursorVisible ? '|' : '');
        this.codeText.setText(displayText);
        
        // Update cursor position based on screen size
        const { width, height } = this.cameras.main;
        const fontSize = Math.max(14, Math.floor(width / 100));
        const editorWidth = width * 0.7;
        const editorHeight = height * 0.15;  // Updated to match new editor size
        const editorX = width / 2;
        const editorY = height * 0.88;  // Updated to match new editor position
        
        const lines = this.userCode.split('\n');
        const lastLine = lines[lines.length - 1];
        const charWidth = fontSize * 0.6; // Approximate character width
        const lineHeight = fontSize * 1.3; // Line height
        
        const cursorX = (editorX - editorWidth / 2 + 20) + (lastLine.length * charWidth);
        const cursorY = (editorY - editorHeight / 2 + 10) + ((lines.length - 1) * lineHeight);
        
        this.cursor.setPosition(cursorX, cursorY);
    }
    
    showCodeHint() {
        if (!this.codeExamples || this.codeExamples.length === 0) {
            // Default hint if no examples are available
            this.codeExamples = ['print("Attack!")', 'print("Hello, World!")'];
        }
        
        const hint = Phaser.Math.RND.pick(this.codeExamples);
        
        // Display hint above the editor - adjusted position
        const { width, height } = this.cameras.main;
        const fontSize = Math.max(12, Math.floor(width / 120));
        
        const hintText = this.add.text(width / 2, height * 0.83, `Hint: Try typing: ${hint}`, {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        
        // Fade out hint after 20 seconds
        this.time.delayedCall(20000, () => {
            this.tweens.add({
                targets: hintText,
                alpha: 0,
                duration: 1000,
                onComplete: () => hintText.destroy()
            });
        });
    }
    
    hideCodeEditor() {
        // Hide all code editor elements
        if (this.codeText) this.codeText.setVisible(false);
        if (this.cursor) this.cursor.setVisible(false);
        if (this.editorBorderTween) this.editorBorderTween.stop();
        
        // Hide all UI elements related to code editor
        this.children.list.forEach(child => {
            // Hide editor background, border, and buttons
            if (child.y >= 400 && child.y <= 600) {
                child.setVisible(false);
            }
        });
    }
    
    executeCode() {
        console.log('executeCode called');
        console.log('Is player turn?', this.isPlayerTurn);
        console.log('Battle ended?', this.battleEnded);
        
        if (!this.isPlayerTurn || this.battleEnded) return;
        
        // Use the typed code
        const code = this.userCode.trim();
        console.log('Code to execute:', code);
        
        if (!code) {
            this.battleLog.setText('No code to execute! Type some Python first!');
            console.log('No code provided');
            return;
        }
        
        // Show executing message
        this.battleLog.setText('Executing code...');
        console.log('Starting code execution...');
        
        // Execute Python code on the server
        fetch('/api/execute-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN || ''
            },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // Show the output
                this.pythonOutput.setText(result.output || 'Code executed (no output)');
                this.battleLog.setText('Code executed successfully!');
                
                // Use the damage calculated by the server
                let damage = result.damage;
                
                // Clear the editor for next turn
                this.userCode = '';
                this.updateCodeDisplay();
                
                // Player attacks after showing message
                this.time.delayedCall(1500, () => {
                    this.playerAttack(damage);
                });
            } else {
                // Show the error
                this.pythonOutput.setText(result.error || 'Unknown error');
                this.battleLog.setText('Error! No damage dealt!');
                this.time.delayedCall(1500, () => this.enemyTurn());
            }
        })
        .catch(error => {
            console.error('Error executing code:', error);
            this.pythonOutput.setText('Network error: Could not execute code');
            this.battleLog.setText('Connection error! Try again!');
            this.isPlayerTurn = true;
        });
    }
    
    calculateDamage(code) {
        let damage = 0;
        
        // Count print statements
        const printCount = (code.match(/print\(/g) || []).length;
        damage += printCount * 10;
        
        // Bonus for loops
        if (code.includes('for ') && code.includes('range')) {
            damage += 15;
        }
        
        // Bonus for variables
        if (code.includes('=') && !code.includes('==')) {
            damage += 5;
        }
        
        // Bonus for f-strings
        if (code.includes('f"') || code.includes("f'")) {
            damage += 10;
        }
        
        // Add some randomness
        damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
        
        return damage;
    }
    
    simulatePythonExecution(code) {
        let output = '';
        let success = true;
        
        try {
            // Basic syntax checks
            if (!code.trim()) {
                return { success: false, output: 'SyntaxError: No code provided' };
            }
            
            // Check for unclosed strings
            const singleQuotes = (code.match(/'/g) || []).length;
            const doubleQuotes = (code.match(/"/g) || []).length;
            if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
                return { success: false, output: 'SyntaxError: unterminated string literal' };
            }
            
            // Check for unclosed parentheses
            const openParens = (code.match(/\(/g) || []).length;
            const closeParens = (code.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                return { success: false, output: 'SyntaxError: unmatched parentheses' };
            }
            
            // Simulate print statements
            const printMatches = code.matchAll(/print\s*\((.*?)\)/g);
            for (const match of printMatches) {
                let printContent = match[1].trim();
                
                // Handle string literals
                if ((printContent.startsWith('"') && printContent.endsWith('"')) ||
                    (printContent.startsWith("'") && printContent.endsWith("'"))) {
                    printContent = printContent.slice(1, -1);
                }
                
                // Handle f-strings (basic simulation)
                if (printContent.startsWith('f"') || printContent.startsWith("f'")) {
                    printContent = printContent.slice(2, -1);
                    // Simple variable substitution for demonstration
                    printContent = printContent.replace(/\{.*?\}/g, '[value]');
                }
                
                output += printContent + '\n';
            }
            
            // Simulate for loops with range
            if (code.includes('for') && code.includes('range')) {
                const rangeMatch = code.match(/range\s*\((\d+)\)/);
                if (rangeMatch) {
                    const count = parseInt(rangeMatch[1]);
                    output += `Loop executed ${count} times\n`;
                }
            }
            
            // Simulate variable assignments
            const assignmentMatches = code.matchAll(/(\w+)\s*=\s*(.+)/g);
            for (const match of assignmentMatches) {
                if (!match[0].includes('==')) {
                    output += `Variable '${match[1]}' assigned\n`;
                }
            }
            
            if (!output) {
                output = 'Code executed (no output)';
            }
            
        } catch (error) {
            success = false;
            output = `Error: ${error.message}`;
        }
        
        return { success, output: output.trim() };
    }
    
    calculateDamageWithOutput(code, output) {
        let damage = 0;
        
        // Base damage for successful execution
        damage += 10;
        
        // Count print statements in output
        const outputLines = output.split('\n').length;
        damage += outputLines * 5;
        
        // Bonus for loops
        if (output.includes('Loop executed')) {
            const loopMatch = output.match(/Loop executed (\d+) times/);
            if (loopMatch) {
                damage += Math.min(parseInt(loopMatch[1]) * 2, 20);
            }
        }
        
        // Bonus for variables
        const varCount = (output.match(/Variable .* assigned/g) || []).length;
        damage += varCount * 5;
        
        // Bonus for using challenge-specific code
        if (this.currentChallenge) {
            const hint = this.currentChallenge.hint.toLowerCase();
            if (hint.includes('print') && code.includes('print')) damage += 10;
            if (hint.includes('loop') && code.includes('for')) damage += 15;
            if (hint.includes('variable') && code.includes('=')) damage += 10;
        }
        
        // Add some randomness
        damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
        
        return Math.max(damage, 5); // Minimum damage of 5
    }
    
    playerAttack(damage) {
        this.isPlayerTurn = false;
        
        // Show attack animation with damage details
        this.battleLog.setText(`Python power unleashed! You deal ${damage} damage!`);
        
        // Flash effect
        this.cameras.main.flash(100, 255, 255, 0);
        
        // Damage enemy
        this.enemyHP = Math.max(0, this.enemyHP - damage);
        this.enemyStats.hp = this.enemyHP;
        this.updateEnemyHP();
        
        // Animate spell effect
        const spell = this.add.sprite(this.enemySprite.x, this.enemySprite.y, 'spell-effect');
        spell.setScale(2);
        
        this.tweens.add({
            targets: spell,
            scale: 4,
            alpha: 0,
            duration: 500,
            onComplete: () => spell.destroy()
        });
        
        // Shake enemy
        this.tweens.add({
            targets: this.enemySprite,
            x: this.enemySprite.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 3
        });
        
        // Check if enemy defeated
        if (this.enemyHP <= 0) {
            this.victory();
        } else {
            this.time.delayedCall(2000, () => this.enemyTurn());
        }
    }
    
    enemyTurn() {
        if (this.battleEnded) return;
        
        // Clear Python output
        if (this.pythonOutput) {
            this.pythonOutput.setText('');
        }
        
        const damage = this.enemyStats.damage || 5;
        this.battleLog.setText(`Enemy attacks! You take ${damage} damage!`);
        
        // Flash red
        this.cameras.main.flash(100, 255, 0, 0);
        
        // Damage player
        this.playerHP = Math.max(0, this.playerHP - damage);
        this.playerStats.hp = this.playerHP;
        this.updatePlayerHP();
        
        // Shake player
        this.tweens.add({
            targets: this.playerSprite,
            x: this.playerSprite.x - 10,
            duration: 50,
            yoyo: true,
            repeat: 3
        });
        
        // Check if player defeated
        if (this.playerHP <= 0) {
            this.defeat();
        } else {
            this.time.delayedCall(1500, () => {
                this.isPlayerTurn = true;
                this.battleLog.setText('Your turn! Write more Python code!');
                this.userCode = '';
                this.updateCodeDisplay();
                this.showCodeHint();
            });
        }
    }
    
    victory() {
        this.battleEnded = true;
        
        const xpGained = this.enemyStats.xp || 10;
        this.battleLog.setText(`Victory! You gained ${xpGained} XP!\nYou learned about Python!`);
        
        // Update player stats
        window.gameState.addExperience(xpGained);
        
        // Mark enemy as defeated if it has an ID
        if (this.currentEnemy.id) {
            window.gameState.markEnemyDefeated(this.currentEnemy.id);
        }
        
        // Victory animation
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0,
            scale: 0,
            duration: 1000
        });
        
        // Hide code editor
        this.hideCodeEditor();
        
        // Create continue button after a short delay
        this.time.delayedCall(1500, () => {
            const continueButton = this.add.rectangle(400, 350, 200, 50, 0x4CAF50);
            const continueText = this.add.text(400, 350, 'Continue', {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            continueButton.setInteractive()
                .on('pointerover', () => continueButton.setFillStyle(0x66BB6A))
                .on('pointerout', () => continueButton.setFillStyle(0x4CAF50))
                .on('pointerdown', () => {
                    this.cameras.main.fade(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.stop('UIScene');
                        this.scene.start('WorldScene');
                    });
                });
            
            // Also allow pressing Enter or Space to continue
            this.input.keyboard.once('keydown-ENTER', () => {
                this.cameras.main.fade(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.stop('UIScene');
                    this.scene.start('WorldScene');
                });
            });
            
            this.input.keyboard.once('keydown-SPACE', () => {
                this.cameras.main.fade(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.stop('UIScene');
                    this.scene.start('WorldScene');
                });
            });
        });
    }
    
    defeat() {
        this.battleEnded = true;
        
        this.battleLog.setText('You were defeated! Keep practicing Python!');
        
        // Defeat animation
        this.tweens.add({
            targets: this.playerSprite,
            angle: 90,
            y: this.playerSprite.y + 50,
            alpha: 0.7,
            duration: 1000,
            ease: 'Power2'
        });
        
        // Hide code editor
        this.hideCodeEditor();
        
        // Create retry button after a short delay
        this.time.delayedCall(1500, () => {
            const retryButton = this.add.rectangle(300, 350, 150, 50, 0xF44336);
            const retryText = this.add.text(300, 350, 'Retry', {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            const menuButton = this.add.rectangle(500, 350, 150, 50, 0x2196F3);
            const menuText = this.add.text(500, 350, 'Main Menu', {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            retryButton.setInteractive()
                .on('pointerover', () => retryButton.setFillStyle(0xEF5350))
                .on('pointerout', () => retryButton.setFillStyle(0xF44336))
                .on('pointerdown', () => {
                    this.cameras.main.fade(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.restart();
                    });
                });
                
            menuButton.setInteractive()
                .on('pointerover', () => menuButton.setFillStyle(0x42A5F5))
                .on('pointerout', () => menuButton.setFillStyle(0x2196F3))
                .on('pointerdown', () => {
                    this.cameras.main.fade(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.stop('UIScene');
                        this.scene.start('MainMenuScene');
                    });
                });
        });
    }
    
    showHelp() {
        const helpText = 'PYTHON BATTLE HELP:\n\n' +
            '• Use print() to attack!\n' +
            '• More prints = more damage\n' +
            '• Use loops for combo attacks\n' +
            '• Variables add extra damage\n' +
            '• Try the example code!\n\n' +
            'Click anywhere to close';
            
        const helpBg = this.add.rectangle(400, 300, 600, 400, 0x000000, 0.9);
        const help = this.add.text(400, 300, helpText, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#00ff00',
            align: 'center',
            wordWrap: { width: 550 }
        }).setOrigin(0.5);
        
        helpBg.setInteractive().on('pointerdown', () => {
            helpBg.destroy();
            help.destroy();
        });
    }
    
    fleeBattle() {
        if (this.battleEnded) return;
        
        this.battleLog.setText("Can't escape! This is a tutorial battle!");
        
        // Simple shake effect on the whole scene
        this.cameras.main.shake(200, 0.005);
    }
    
    updatePlayerHP() {
        // Update player HP bar
        if (this.playerHPBar) {
            const hpPercentage = this.playerHP / this.playerMaxHP;
            this.playerHPBar.clear();
            this.playerHPBar.fillStyle(0x333333);
            this.playerHPBar.fillRect(0, 0, 200, 20);
            this.playerHPBar.fillStyle(0x00ff00);
            this.playerHPBar.fillRect(0, 0, 200 * hpPercentage, 20);
        }
        
        // Update player HP text
        if (this.playerHPText) {
            this.playerHPText.setText(`HP: ${this.playerHP}/${this.playerMaxHP}`);
        }
    }
    
    updateEnemyHP() {
        // Update enemy HP bar
        if (this.enemyHPBar) {
            const hpPercentage = this.enemyHP / this.enemyMaxHP;
            this.enemyHPBar.clear();
            this.enemyHPBar.fillStyle(0x333333);
            this.enemyHPBar.fillRect(0, 0, 150, 15);
            this.enemyHPBar.fillStyle(0xff0000);
            this.enemyHPBar.fillRect(0, 0, 150 * hpPercentage, 15);
        }
        
        // Update enemy HP text
        if (this.enemyHPText) {
            this.enemyHPText.setText(`${this.currentEnemy.name}: ${this.enemyHP}/${this.enemyMaxHP}`);
        }
    }
}