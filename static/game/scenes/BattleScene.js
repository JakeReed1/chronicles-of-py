import { COLORS, TEXT, createPanel, createButton, createBar, createGlowTitle } from '../theme.js';
import { HERO_ATTACK_ANIM_KEY } from '../heroAnim.js';
import { enemyAttackAnimKey } from '../enemyAnim.js';

// Battle Scene - Python-powered combat!
export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
    }

    create() {
        // The overworld's HUD (level/HP/XP bar) would otherwise keep running
        // in parallel and show a second, redundant player indicator on top
        // of this scene's own player panel
        this.scene.stop('UIScene');

        // Get game dimensions
        const { width, height } = this.cameras.main;
        this.gameWidth = width;
        this.gameHeight = height;

        // Battle background matches the zone the fight is taking place in -
        // proper illustrated JRPG battle backdrops (PixelLab), picked at
        // random from each zone's 2-3 variants so the same fight doesn't
        // always show an identical backdrop. Dimmed with a plain dark
        // overlay (rather than a color-shifting gradient) so the art still
        // reads through while staying dark enough for the battle UI text.
        const returnScene = window.gameState.battleReturnScene || 'PrintForestScene';
        const zoneBackgrounds = {
            PrintForestScene: { textures: ['battle-forest-clearing', 'battle-forest-outcrop'], tint: null },
            LoopForestScene: { textures: ['battle-forest-clearing', 'battle-forest-outcrop'], tint: 0x88ccff },
            ConditionalCavernsScene: { textures: ['battle-cavern-tunnel', 'battle-cavern-crystals'], tint: null }
        };
        const zoneBg = zoneBackgrounds[returnScene] || zoneBackgrounds.PrintForestScene;

        const bgImage = this.add.image(width / 2, height / 2, Phaser.Math.RND.pick(zoneBg.textures)).setDisplaySize(width, height);
        if (zoneBg.tint) bgImage.setTint(zoneBg.tint);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35);

        // Title
        createGlowTitle(this, width / 2, height * 0.05, 'PYTHON BATTLE!', {
            fontSize: Math.floor(width / 40),
            color: TEXT.accent
        });

        // Initialize battle state FIRST (before creating UI)
        this.initializeBattle();

        // Create battle UI
        this.createBattleUI();

        // Create combatants
        this.createCombatants();

        // Create code editor
        this.createCodeEditor();

        // Update UI with initial values
        this.updatePlayerHP();
        this.updatePlayerMP();
        this.updateEnemyHP();

        // Show battle intro
        this.showBattleIntro();
    }

    createBattleUI() {
        const { width, height } = this.cameras.main;
        const fontSize = Math.max(14, Math.floor(width / 100));
        const smallFontSize = Math.max(12, Math.floor(width / 120));

        // Player status panel - up and to the left of the sprite so its
        // tall hair doesn't overlap the panel
        const panelWidth = width * 0.2;
        const panelHeight = height * 0.12;
        const playerPanelX = width * 0.1;
        const playerPanelY = height * 0.08;

        createPanel(this, playerPanelX, playerPanelY, panelWidth, panelHeight, {
            borderColor: COLORS.hp,
            radius: 12
        });

        this.playerNameText = this.add.text(playerPanelX - panelWidth * 0.4, playerPanelY - panelHeight * 0.4, 'Python Hero', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.primary
        });

        this.playerHPText = this.add.text(playerPanelX - panelWidth * 0.4, playerPanelY - panelHeight * 0.2, 'HP: 100/100', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#00ff88'
        });

        this.playerMPText = this.add.text(playerPanelX - panelWidth * 0.4, playerPanelY, 'MP: 50/50', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#00aaff'
        });

        // Player HP bar
        const barWidth = panelWidth * 0.8;
        const barHeight = height * 0.025;
        this.playerHPBarCtrl = createBar(
            this,
            playerPanelX - barWidth / 2,
            playerPanelY + panelHeight * 0.3 - barHeight / 2,
            barWidth, barHeight, COLORS.hp
        );

        // Enemy status panel - right side, aligned with player panel
        const enemyPanelX = width * 0.85;
        const enemyPanelY = height * 0.15;

        createPanel(this, enemyPanelX, enemyPanelY, panelWidth, panelHeight, {
            borderColor: COLORS.danger,
            radius: 12
        });

        this.enemyNameText = this.add.text(enemyPanelX - panelWidth * 0.4, enemyPanelY - panelHeight * 0.4, 'Enemy', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.primary
        });

        this.enemyHPText = this.add.text(enemyPanelX - panelWidth * 0.4, enemyPanelY - panelHeight * 0.2, 'HP: 50/50', {
            fontSize: smallFontSize + 'px',
            fontFamily: 'monospace',
            color: '#ff6b6b'
        });

        this.enemyHPBarCtrl = createBar(
            this,
            enemyPanelX - barWidth / 2,
            enemyPanelY + panelHeight * 0.3 - barHeight / 2,
            barWidth, barHeight, COLORS.danger
        );

        // Battle log - center of screen, between sprites and output
        this.battleLog = this.add.text(width / 2, height * 0.48, '', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.primary,
            align: 'center',
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);

        // Python output display - positioned right above the code editor.
        // Slightly shorter than before to leave room for the larger editor.
        const outputY = height * 0.63;
        const outputWidth = width * 0.6;
        const outputHeight = height * 0.13;

        createPanel(this, width / 2, outputY, outputWidth, outputHeight, {
            fillColor: 0x1a1a2e,
            borderColor: 0x444466,
            radius: 12
        });

        // Output label
        this.add.text(width / 2 - outputWidth / 2 + 10, outputY - outputHeight / 2 - 15, '>>> Python Output:', {
            fontSize: Math.floor(fontSize * 0.8) + 'px',
            fontFamily: 'monospace',
            color: TEXT.accent
        });

        // Output text area
        this.pythonOutput = this.add.text(width / 2, outputY, '', {
            fontSize: Math.floor(fontSize * 0.9) + 'px',
            fontFamily: 'monospace',
            color: TEXT.primary,
            align: 'left',
            wordWrap: { width: outputWidth - 20 }
        }).setOrigin(0.5);
    }

    createCombatants() {
        // Use the level-scaled stats already loaded in initializeBattle()
        this.playerHP = this.playerStats.hp;
        this.playerMaxHP = this.playerStats.maxHp;
        this.playerMP = this.playerStats.mp;
        this.playerMaxMP = this.playerStats.maxMp;

        // Get current enemy
        this.currentEnemy = window.gameState.currentEnemy || {
            name: 'Print Slime',
            stats: { maxHp: 30, damage: 5, xp: 10 }
        };

        this.enemyHP = this.enemyMaxHP = this.currentEnemy.stats?.maxHp || 30;
        this.enemyStats = {
            hp: this.enemyHP,
            maxHp: this.enemyMaxHP,
            damage: this.currentEnemy.stats?.damage || 5,
            xp: this.currentEnemy.stats?.xp || 10
        };

        // Player sprite - using the actual hero sprite
        const { width, height } = this.cameras.main;
        const spriteY = height * 0.3; // Both sprites at the same height

        // Frame 0 is the hero's idle south-facing pose (see heroAnim.js).
        // 4 would match the old single 1024px portrait's on-screen size;
        // scaled down 20% from that per request.
        const playerScale = 3.2;
        this.playerSprite = this.add.sprite(width * 0.25, spriteY, 'hero', 0);
        this.playerSprite.setScale(playerScale);

        // Add idle animation to player (subtle breathing effect)
        this.tweens.add({
            targets: this.playerSprite,
            scaleY: playerScale * 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        // Enemy sprite - use whichever texture the overworld enemy actually had.
        // Each is a 9-frame spritesheet (frame 0 = idle, 1-8 = attack), so
        // the scale is computed from a single frame's width, not the sheet.
        const enemyTextureKey = this.currentEnemy.sprite || 'enemy-slime';
        const enemyTextureWidth = this.textures.get(enemyTextureKey).get(0).width;
        const enemyScale = 320 / enemyTextureWidth;

        this.enemySprite = this.add.sprite(width * 0.75, spriteY, enemyTextureKey, 0);
        this.enemySprite.setScale(enemyScale);

        // Add idle animation to enemy (bouncing effect)
        this.tweens.add({
            targets: this.enemySprite,
            y: spriteY + 10,
            scaleX: enemyScale * 1.05,
            scaleY: enemyScale * 0.95,
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
        const fontSize = Math.max(13, Math.floor(width / 115));

        // Code editor background - scale to screen size. Stored on the
        // instance (rather than recomputed) so updateCodeDisplay() and
        // showCodeHint() can't drift out of sync with these values.
        const editorWidth = width * 0.78;
        const editorHeight = height * 0.22;
        const editorX = width / 2;
        const editorY = height * 0.84;
        this.editorWidth = editorWidth;
        this.editorHeight = editorHeight;
        this.editorX = editorX;
        this.editorY = editorY;
        this.editorFontSize = fontSize;
        this.editorLeftEdge = editorX - editorWidth / 2;

        const editorPanel = createPanel(this, editorX, editorY, editorWidth, editorHeight, {
            fillColor: 0x1e1e1e,
            borderColor: COLORS.accent,
            radius: 14
        });

        // A separate pulsing glow ring to signal it's the player's turn
        const editorGlow = this.add.graphics();
        editorGlow.lineStyle(3, COLORS.accent, 1);
        editorGlow.strokeRoundedRect(editorX - editorWidth / 2, editorY - editorHeight / 2, editorWidth, editorHeight, 14);
        this.editorBorderTween = this.tweens.add({
            targets: editorGlow,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Editor title
        const editorTitle = this.add.text(editorX - editorWidth / 2 + 10, editorY - editorHeight / 2 - 20, '>>> Python Code Editor', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.accent
        });

        // Code display area
        this.codeText = this.add.text(editorX - editorWidth / 2 + 20, editorY - editorHeight / 2 + 10, '', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.primary,
            wordWrap: { width: editorWidth - 40 }
        });

        // Initialize code input
        this.userCode = '';
        this.cursorPos = 0;
        this.cursorVisible = true;

        // Create blinking cursor - adjusted position
        this.cursor = this.add.text(editorX - editorWidth / 2 + 20, editorY - editorHeight / 2 + 10, '|', {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.accent
        });

        // Blink cursor
        this.cursorBlinkEvent = this.time.addEvent({
            delay: 500,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                this.cursor.setVisible(this.cursorVisible);
            },
            loop: true
        });

        // Track every editor element so it can be hidden together later
        this.codeEditorElements = [editorPanel, editorGlow, editorTitle, this.codeText, this.cursor];

        // Set up keyboard input
        this.setupKeyboardInput();

        // Create buttons
        this.createActionButtons();

        // Show initial hint
        this.showCodeHint();
    }

    createActionButtons() {
        const { width, height } = this.cameras.main;
        const smallFontSize = Math.max(12, Math.floor(width / 120));
        const buttonWidth = width * 0.12;
        const buttonHeight = height * 0.045;
        const buttonY = height * 0.97;

        const runButton = createButton(this, width * 0.35, buttonY, buttonWidth, buttonHeight, 'Run Code', {
            fillColor: COLORS.success,
            hoverColor: COLORS.successHover,
            fontSize: Math.max(14, Math.floor(width / 100)),
            onClick: () => this.executeCode()
        });

        const helpButton = createButton(this, width * 0.52, buttonY, buttonWidth, buttonHeight, 'Help', {
            fillColor: COLORS.info,
            hoverColor: COLORS.infoHover,
            fontSize: Math.max(14, Math.floor(width / 100)),
            onClick: () => this.showHelp()
        });

        const clearButton = createButton(this, width * 0.69, buttonY, buttonWidth, buttonHeight, 'Clear', {
            fillColor: COLORS.warning,
            hoverColor: COLORS.warningHover,
            fontSize: Math.max(14, Math.floor(width / 100)),
            onClick: () => {
                this.userCode = '';
                this.cursorPos = 0;
                this.updateCodeDisplay();
            }
        });

        this.codeEditorElements.push(runButton, helpButton, clearButton);
    }

    initializeBattle() {
        // Player stats from game state (already scaled by level)
        const player = window.gameState.getPlayer();
        this.playerStats = {
            hp: player?.hp || 100,
            maxHp: player?.maxHp || 100,
            mp: player?.mp || 50,
            maxMp: player?.maxMp || 50,
            level: player?.level || 1,
            attack: player?.attack || 10,
            defense: player?.defense || 5
        };

        // Code examples based on enemy
        this.codeExamples = this.getCodeExamples();

        // Battle state
        this.isPlayerTurn = true;
        this.battleEnded = false;
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
            ],
            'For Loop Treant': [
                'for i in range(3):\n    print(f"Strike {i+1}!")',
                'for spell in ["Fire", "Ice", "Thunder"]:\n    print(f"Cast {spell}!")'
            ],
            'While Loop Treant': [
                'count = 0\nwhile count < 3:\n    print("Attack!")\n    count += 1',
                'hp = 3\nwhile hp > 0:\n    print("Strike!")\n    hp -= 1'
            ],
            'Range Sapling': [
                'for i in range(5):\n    print(f"Hit {i}!")',
                'total = 0\nfor i in range(4):\n    total += i\n    print(f"Combo x{total}")'
            ],
            'Boss: Infinite Loop Tree': [
                'for i in range(3):\n    for j in range(2):\n        print(f"Strike {i}.{j}!")',
                'moves = ["Fire", "Ice"]\nfor m in moves:\n    for i in range(2):\n        print(f"{m} attack {i+1}!")'
            ],
            'If Golem': [
                'damage = 15\nif damage > 10:\n    print("Critical hit!")',
                'hp = 5\nif hp < 10:\n    print("Finishing blow!")'
            ],
            'Elif Checker': [
                'roll = 8\nif roll > 9:\n    print("Fire!")\nelif roll > 5:\n    print("Ice!")\nelse:\n    print("Strike!")',
                'combo = 2\nif combo == 1:\n    print("Jab!")\nelif combo == 2:\n    print("Thunder!")\nelse:\n    print("Miss!")'
            ],
            'Else Wraith': [
                'guard = False\nif guard:\n    print("Blocked!")\nelse:\n    print("Direct hit!")',
                'mp = 0\nif mp > 0:\n    print("Spell!")\nelse:\n    print("Fire!")'
            ],
            'Boss: Unhandled Exception': [
                'try:\n    print("Thunder strike!")\nexcept:\n    print("Error!")',
                'power = 20\nif power > 15:\n    print(f"Overload! {power} damage!")\nelse:\n    print("Fizzle!")'
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
        // Command history, like a terminal - filled in by executeCode()
        this.codeHistory = [];
        this.historyIndex = null;
        this.draftCode = '';

        // Listen for any key press
        this.input.keyboard.on('keydown', (event) => {
            if (!this.isPlayerTurn || this.battleEnded) return;

            const key = event.key;

            // Handle special keys
            if (key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                // Ctrl/Cmd+Enter runs the code instead of inserting a newline.
                // Phaser has no 'keydown-CTRL-ENTER' combo event - modifier
                // keys only show up as flags on the plain keydown event.
                event.preventDefault();
                this.executeCode();
                return;
            } else if (key === 'Enter') {
                this.insertAtCursor('\n');
            } else if (key === 'Backspace') {
                // Remove the character before the cursor, not just the last
                // character in the string - lets recalled/older code be
                // edited anywhere, not only trimmed from the end
                if (this.cursorPos > 0) {
                    this.userCode = this.userCode.slice(0, this.cursorPos - 1) + this.userCode.slice(this.cursorPos);
                    this.cursorPos--;
                }
            } else if (key === 'Delete') {
                this.userCode = this.userCode.slice(0, this.cursorPos) + this.userCode.slice(this.cursorPos + 1);
            } else if (key === 'Tab') {
                // Add 4 spaces for indentation
                event.preventDefault();
                this.insertAtCursor('    ');
            } else if (key === 'ArrowUp') {
                event.preventDefault();
                this.recallHistory(-1);
                return;
            } else if (key === 'ArrowDown') {
                event.preventDefault();
                this.recallHistory(1);
                return;
            } else if (key === 'ArrowLeft') {
                this.cursorPos = Math.max(0, this.cursorPos - 1);
            } else if (key === 'ArrowRight') {
                this.cursorPos = Math.min(this.userCode.length, this.cursorPos + 1);
            } else if (key === 'Home') {
                const lineStart = this.userCode.slice(0, this.cursorPos).lastIndexOf('\n') + 1;
                this.cursorPos = lineStart;
            } else if (key === 'End') {
                const nextNewline = this.userCode.indexOf('\n', this.cursorPos);
                this.cursorPos = nextNewline === -1 ? this.userCode.length : nextNewline;
            } else if (key.length === 1) {
                // Add regular character at the cursor, not just at the end
                this.insertAtCursor(key);
            } else {
                // Unrecognized key (Shift, Control, CapsLock, ...) - ignore
                // entirely so it doesn't cancel in-progress history recall
                return;
            }

            // Typing or moving the cursor ends history navigation
            this.historyIndex = null;

            // Update displayed code
            this.updateCodeDisplay();
        });
    }

    // Inserts text at the current cursor position and advances the cursor
    // past it, instead of always appending to the end of the code
    insertAtCursor(text) {
        this.userCode = this.userCode.slice(0, this.cursorPos) + text + this.userCode.slice(this.cursorPos);
        this.cursorPos += text.length;
    }

    // Step through previously run code, terminal-style. direction: -1 = older, 1 = newer
    recallHistory(direction) {
        if (this.codeHistory.length === 0) return;

        if (this.historyIndex === null) {
            if (direction > 0) return; // already at the newest (unsaved) draft
            this.draftCode = this.userCode;
            this.historyIndex = this.codeHistory.length - 1;
        } else {
            const nextIndex = this.historyIndex + direction;
            if (nextIndex < 0) return;
            if (nextIndex >= this.codeHistory.length) {
                // Past the newest entry - restore what the player was typing
                this.historyIndex = null;
                this.userCode = this.draftCode;
                this.cursorPos = this.userCode.length;
                this.updateCodeDisplay();
                return;
            }
            this.historyIndex = nextIndex;
        }

        this.userCode = this.codeHistory[this.historyIndex];
        this.cursorPos = this.userCode.length;
        this.updateCodeDisplay();
    }

    updateCodeDisplay() {
        // The code text itself never includes the cursor character - the
        // separate blinking this.cursor object is positioned over it below,
        // so it can sit anywhere in the text, not just at the end
        this.codeText.setText(this.userCode);

        const charWidth = this.editorFontSize * 0.6; // Approximate character width
        const lineHeight = this.editorFontSize * 1.3; // Line height
        const baseX = this.editorX - this.editorWidth / 2 + 20;
        const baseY = this.editorY - this.editorHeight / 2 + 10;

        // Figure out which visual line/column the cursor sits on by counting
        // newlines up to it, so it can be placed anywhere in the text
        const textBeforeCursor = this.userCode.slice(0, this.cursorPos);
        const linesBeforeCursor = textBeforeCursor.split('\n');
        const cursorRow = linesBeforeCursor.length - 1;
        const cursorCol = linesBeforeCursor[linesBeforeCursor.length - 1].length;

        this.cursor.setPosition(baseX + cursorCol * charWidth, baseY + cursorRow * lineHeight);
    }

    showCodeHint() {
        if (!this.codeExamples || this.codeExamples.length === 0) {
            // Default hint if no examples are available
            this.codeExamples = ['print("Attack!")', 'print("Hello, World!")'];
        }

        const hint = Phaser.Math.RND.pick(this.codeExamples);
        const { height } = this.cameras.main;
        const fontSize = Math.max(15, Math.floor(this.gameWidth / 110));
        const badgeFontSize = Math.max(13, Math.floor(this.gameWidth / 130));
        const pad = 16;
        const chipPad = 12;
        const badgeGap = 8;

        // Docked to the bottom-left corner, entirely inside the margin left
        // of the code editor and above the console output box. Reading the
        // editor's actual left edge (rather than a hardcoded fraction of the
        // game width) means this can never drift out of sync if the editor
        // is resized. Staying narrower than that margin - rather than trying
        // to size the panel to clear both boxes - means it can grow as tall
        // as a hint needs without ever touching either, no matter how long
        // the hint text is.
        const panelWidth = Math.min(280, this.editorLeftEdge - 20);
        const panelLeft = 8;
        const panelBottom = height - 16; // hugs the very bottom-left corner
        const wrapWidth = panelWidth - pad * 2 - chipPad * 2;

        // Replace the previous turn's hint text rather than stacking a new one
        if (this.hintLabelText) this.hintLabelText.destroy();
        if (this.hintCodeText) this.hintCodeText.destroy();

        this.hintLabelText = this.add.text(0, 0, '\u{1F4A1} HINT', {
            fontSize: badgeFontSize + 'px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: TEXT.gold
        }).setOrigin(0, 0).setDepth(1);

        this.hintCodeText = this.add.text(0, 0, hint, {
            fontSize: fontSize + 'px',
            fontFamily: 'monospace',
            color: TEXT.accent,
            align: 'left',
            wordWrap: { width: wrapWidth }
        }).setOrigin(0, 0).setDepth(1);

        const chipWidth = panelWidth - pad * 2;
        const chipHeight = this.hintCodeText.height + chipPad * 2;
        const panelHeight = pad + this.hintLabelText.height + badgeGap + chipHeight + pad;
        const panelTop = panelBottom - panelHeight;
        const centerX = panelLeft + panelWidth / 2;
        const centerY = panelTop + panelHeight / 2;
        const chipTop = panelTop + pad + this.hintLabelText.height + badgeGap;

        this.hintLabelText.setPosition(panelLeft + pad, panelTop + pad);
        this.hintCodeText.setPosition(panelLeft + pad + chipPad, chipTop + chipPad);

        if (!this.hintPanel) {
            this.hintPanel = createPanel(this, centerX, centerY, panelWidth, panelHeight, {
                fillColor: 0x1a1a2e,
                borderColor: COLORS.gold,
                radius: 14
            });
            this.hintCodeBg = this.add.graphics();
            this.codeEditorElements.push(this.hintPanel, this.hintCodeBg);
        } else {
            this.hintPanel.clear();
            this.hintPanel.fillStyle(0x1a1a2e, 0.94);
            this.hintPanel.fillRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, 14);
            this.hintPanel.lineStyle(2, COLORS.gold, 1);
            this.hintPanel.strokeRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, 14);
        }

        this.hintCodeBg.clear();
        this.hintCodeBg.fillStyle(0x0d0d1a, 1);
        this.hintCodeBg.fillRoundedRect(panelLeft + pad, chipTop, chipWidth, chipHeight, 8);

        // Small pop-in so a fresh hint draws the eye without being jarring
        [this.hintPanel, this.hintCodeBg, this.hintLabelText, this.hintCodeText].forEach(obj => {
            obj.setScale(0.97);
            this.tweens.add({ targets: obj, scale: 1, duration: 150, ease: 'Back.Out' });
        });
    }

    hideCodeEditor() {
        // Hide every element created by createCodeEditor()/createActionButtons()
        if (this.editorBorderTween) this.editorBorderTween.stop();
        if (this.cursorBlinkEvent) this.cursorBlinkEvent.remove();

        (this.codeEditorElements || []).forEach(element => element.setVisible(false));

        // The hint text is replaced (not re-pushed) each turn, so hide it separately
        if (this.hintLabelText) this.hintLabelText.setVisible(false);
        if (this.hintCodeText) this.hintCodeText.setVisible(false);
    }

    executeCode() {
        if (!this.isPlayerTurn || this.battleEnded) return;

        // Use the typed code
        const code = this.userCode.trim();

        if (!code) {
            this.battleLog.setText('No code to execute! Type some Python first!');
            return;
        }

        // Remember this run so Up/Down can recall it later, like a terminal
        if (this.codeHistory[this.codeHistory.length - 1] !== code) {
            this.codeHistory.push(code);
        }
        this.historyIndex = null;

        // Show executing message
        this.battleLog.setText('Executing code...');

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
                this.cursorPos = 0;
                this.updateCodeDisplay();

                // Player attacks after showing message
                const spellText = `${code} ${result.output || ''}`;
                this.time.delayedCall(1500, () => {
                    this.playerAttack(damage, spellText);
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

    // Which elemental spell (if any) this code/output invokes - matches the
    // keywords the server's damage bonus already looks for
    detectSpellElement(text) {
        const lower = (text || '').toLowerCase();
        if (lower.includes('thunder')) return 'thunder';
        if (lower.includes('fire')) return 'fire';
        if (lower.includes('ice')) return 'ice';
        return null;
    }

    playerAttack(damage, spellText = '') {
        this.isPlayerTurn = false;

        // Attack stat gives a small, level-driven boost on top of code-based damage
        const attackBonus = 1 + ((this.playerStats.attack || 10) - 10) * 0.03;
        damage = Math.max(1, Math.round(damage * attackBonus));

        // Only casting an actual elemental spell (fire/ice/thunder) costs MP -
        // a plain print/attack is a basic attack and stays free
        const element = this.detectSpellElement(spellText);
        const mpCost = element ? 8 : 0;
        if (mpCost > 0) {
            this.playerMP = Math.max(0, this.playerMP - mpCost);
            this.playerStats.mp = this.playerMP;
            this.updatePlayerMP();
            window.gameState.updatePlayerStats({ mp: this.playerMP });
        }

        // Show attack animation with damage details
        const mpNote = mpCost > 0 ? ` (-${mpCost} MP)` : '';
        this.battleLog.setText(`Python power unleashed! You deal ${damage} damage!${mpNote}`);

        // Player lunges toward the enemy; impact lands at the peak of the lunge
        this.tweens.add({
            targets: this.playerSprite,
            x: this.playerSprite.x + 60,
            duration: 320,
            yoyo: true,
            ease: 'Power1'
        });

        // Attack animation plays over its own 164px 'hero-attack' texture,
        // then hands back to the idle 'hero' frame it started from
        this.playerSprite.play(HERO_ATTACK_ANIM_KEY);
        this.playerSprite.once('animationcomplete', () => {
            this.playerSprite.setTexture('hero', 0);
        });

        this.time.delayedCall(270, () => {
            // Applied the moment the visual effect actually connects - not
            // before - so the HP bar/damage number never land ahead of the
            // fireball arriving or the lightning striking.
            const onImpact = () => {
                this.enemyHP = Math.max(0, this.enemyHP - damage);
                this.enemyStats.hp = this.enemyHP;
                this.updateEnemyHP();
                this.showDamageNumber(this.enemySprite.x, this.enemySprite.y, damage, '#ffdd55');

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
            };

            // Animate the impact - thunder and fire get their own dedicated
            // effects and call onImpact() when they actually land
            if (element === 'thunder') {
                this.showThunderStrike(this.enemySprite.x, this.enemySprite.y, onImpact);
            } else if (element === 'fire') {
                this.showFireball(this.playerSprite.x, this.playerSprite.y, this.enemySprite.x, this.enemySprite.y, onImpact);
            } else {
                this.cameras.main.flash(100, 255, 255, 0);

                const tint = element === 'ice' ? 0x88ddff : 0xffffff;
                const spell = this.add.sprite(this.enemySprite.x, this.enemySprite.y, 'spell-effect');
                spell.setScale(2);
                spell.setTint(tint);

                this.tweens.add({
                    targets: spell,
                    scale: 4,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => spell.destroy()
                });

                // This effect appears directly on the enemy with no travel
                // time, so the impact is already in sync
                onImpact();
            }
        });
    }

    // A cloud gathers over the target, then a lightning bolt strikes down
    showThunderStrike(x, y, onStrike = () => {}) {
        const cloudY = y - 130;

        // A fuller, fluffier cloud built from several overlapping blobs
        // instead of one plain ellipse
        const cloudParts = [
            this.add.ellipse(x, cloudY, 170, 75, 0x2a2a3a, 1),
            this.add.ellipse(x - 60, cloudY + 12, 100, 55, 0x333344, 1),
            this.add.ellipse(x + 60, cloudY + 12, 100, 55, 0x333344, 1),
            this.add.ellipse(x - 22, cloudY - 22, 85, 48, 0x3d3d52, 1),
            this.add.ellipse(x + 28, cloudY - 18, 75, 42, 0x3d3d52, 1)
        ];
        cloudParts.forEach(part => part.setScale(0.3).setAlpha(0));

        this.tweens.add({
            targets: cloudParts,
            scale: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.Out'
        });

        // A little rumble while the cloud gathers before the strike lands
        this.tweens.add({
            targets: cloudParts,
            x: '-=6',
            duration: 180,
            delay: 500,
            yoyo: true,
            repeat: 1
        });

        this.time.delayedCall(900, () => {
            // Bolt sprite stretched to span from the cloud down to the target,
            // instead of a hand-drawn jagged polyline
            const topY = cloudY + 35;
            const bottomY = y + 5;
            const boltHeight = bottomY - topY;
            const boltScale = boltHeight / 161;
            const midY = (topY + bottomY) / 2;

            // Soft glow layer behind the crisp bolt for extra punch
            const boltGlow = this.add.sprite(x, midY, 'fx-lightning')
                .setScale(boltScale * 1.7)
                .setAlpha(0.4)
                .setTint(0xaaddff);

            const bolt = this.add.sprite(x, midY, 'fx-lightning').setScale(boltScale);

            this.cameras.main.flash(220, 255, 255, 220);
            onStrike();

            // A quick flicker gives the bolt a bit more electric life
            this.time.delayedCall(150, () => {
                if (bolt.active) { bolt.setAlpha(0.25); boltGlow.setAlpha(0.1); }
            });
            this.time.delayedCall(230, () => {
                if (bolt.active) { bolt.setAlpha(1); boltGlow.setAlpha(0.4); }
            });

            [bolt, boltGlow].forEach(g => {
                this.tweens.add({
                    targets: g,
                    alpha: 0,
                    duration: 400,
                    delay: 350,
                    onComplete: () => g.destroy()
                });
            });

            this.tweens.add({
                targets: cloudParts,
                alpha: 0,
                duration: 700,
                delay: 400,
                onComplete: () => cloudParts.forEach(part => part.destroy())
            });
        });
    }

    // A fireball flies from caster to target, then bursts into radiating embers
    showFireball(fromX, fromY, toX, toY, onImpact = () => {}) {
        const scale = 0.45;
        const glow = this.add.sprite(fromX, fromY, 'fx-fireball')
            .setScale(scale * 1.6)
            .setAlpha(0.5)
            .setTint(0xffaa00);
        const fireball = this.add.sprite(fromX, fromY, 'fx-fireball').setScale(scale);

        // Lobbed along an arc (quadratic bezier through a raised midpoint)
        // rather than flying straight at the target
        const arcHeight = 90;
        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(fromX, fromY),
            new Phaser.Math.Vector2((fromX + toX) / 2, Math.min(fromY, toY) - arcHeight),
            new Phaser.Math.Vector2(toX, toY)
        );

        const progress = { t: 0 };
        this.tweens.add({
            targets: progress,
            t: 1,
            duration: 700,
            ease: 'Sine.easeIn',
            onUpdate: () => {
                const point = curve.getPoint(progress.t);
                fireball.setPosition(point.x, point.y);
                glow.setPosition(point.x, point.y);
                fireball.rotation = progress.t * 0.6;
            },
            onComplete: () => {
                this.cameras.main.flash(120, 255, 130, 0);
                onImpact();

                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const spark = this.add.circle(toX, toY, 6, 0xffaa00, 1);
                    this.tweens.add({
                        targets: spark,
                        x: toX + Math.cos(angle) * 45,
                        y: toY + Math.sin(angle) * 45,
                        alpha: 0,
                        duration: 350,
                        onComplete: () => spark.destroy()
                    });
                }

                fireball.destroy();
                glow.destroy();
            }
        });
    }

    enemyTurn() {
        if (this.battleEnded) return;

        // Clear Python output
        if (this.pythonOutput) {
            this.pythonOutput.setText('');
        }

        // Defense stat reduces incoming damage, floor of 1
        const defenseReduction = Math.floor((this.playerStats.defense || 5) / 3);
        const damage = Math.max(1, (this.enemyStats.damage || 5) - defenseReduction);
        this.battleLog.setText(`Enemy attacks! You take ${damage} damage!`);

        // Enemy lunges toward the player; impact lands at the peak of the lunge
        this.tweens.add({
            targets: this.enemySprite,
            x: this.enemySprite.x - 60,
            duration: 320,
            yoyo: true,
            ease: 'Power1'
        });

        // Attack animation plays on the enemy's own spritesheet (frame 0 is
        // its idle pose, frames 1-8 are the attack), then hands back to idle
        this.enemySprite.play(enemyAttackAnimKey(this.currentEnemy.sprite));
        this.enemySprite.once('animationcomplete', () => {
            this.enemySprite.setFrame(0);
        });

        this.time.delayedCall(270, () => {
            // Flash red
            this.cameras.main.flash(100, 255, 0, 0);

            // Damage player
            this.playerHP = Math.max(0, this.playerHP - damage);
            this.playerStats.hp = this.playerHP;
            this.updatePlayerHP();
            window.gameState.updatePlayerStats({ hp: this.playerHP });
            this.showDamageNumber(this.playerSprite.x, this.playerSprite.y, damage, '#ff4444');

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
                    this.cursorPos = 0;
                    this.updateCodeDisplay();
                    this.showCodeHint();
                });
            }
        });
    }

    victory() {
        this.battleEnded = true;

        // Return to whichever zone this battle was started from
        this.returnScene = window.gameState.battleReturnScene || 'PrintForestScene';

        const xpGained = this.enemyStats.xp || 10;
        this.battleLog.setText(`Victory! You gained ${xpGained} XP!\nYou learned about Python!`);

        // Persist remaining HP/MP so battle damage carries meaning between fights
        window.gameState.updatePlayerStats({ hp: this.playerHP, mp: this.playerMP });

        // Update player stats and check for a level up
        const levelResult = window.gameState.addExperience(xpGained);

        // Mark enemy as defeated if it has an ID
        if (this.currentEnemy.id) {
            window.gameState.markEnemyDefeated(this.currentEnemy.id);
        }

        if (levelResult.leveledUp) {
            this.time.delayedCall(800, () => this.showLevelUpBanner(levelResult));
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
            const goToNextScene = () => {
                this.cameras.main.fade(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.scene.stop('UIScene');
                    this.scene.start(this.returnScene);
                });
            };

            createButton(this, this.gameWidth / 2, this.gameHeight * 0.6, 220, 56, 'Continue', {
                fillColor: COLORS.success,
                hoverColor: COLORS.successHover,
                onClick: goToNextScene
            });

            // Also allow pressing Enter or Space to continue
            this.input.keyboard.once('keydown-ENTER', goToNextScene);
            this.input.keyboard.once('keydown-SPACE', goToNextScene);
        });
    }

    defeat() {
        this.battleEnded = true;

        this.battleLog.setText('You were defeated! Keep practicing Python!');

        // Send the player back out at full HP/MP rather than leaving them at 0
        window.gameState.updatePlayerStats({
            hp: this.playerStats.maxHp,
            mp: this.playerStats.maxMp
        });

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
            const centerY = this.gameHeight * 0.6;

            createButton(this, this.gameWidth / 2 - 120, centerY, 200, 56, 'Retry', {
                fillColor: COLORS.danger,
                hoverColor: COLORS.dangerHover,
                onClick: () => {
                    this.cameras.main.fade(500, 0, 0, 0);
                    this.time.delayedCall(500, () => {
                        this.scene.restart();
                    });
                }
            });

            createButton(this, this.gameWidth / 2 + 120, centerY, 200, 56, 'Main Menu', {
                fillColor: COLORS.info,
                hoverColor: COLORS.infoHover,
                onClick: () => {
                    this.cameras.main.fade(500, 0, 0, 0);
                    this.time.delayedCall(500, () => {
                        this.scene.stop('UIScene');
                        this.scene.start('MainMenuScene');
                    });
                }
            });
        });
    }

    // Floating "-N" number that pops up over whoever just got hit
    showDamageNumber(x, y, amount, color = '#ff4444') {
        const text = this.add.text(x + Phaser.Math.Between(-10, 10), y - 30, `-${amount}`, {
            fontSize: '40px',
            fontFamily: 'monospace',
            color,
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(20).setScale(0.5);

        this.tweens.add({
            targets: text,
            scale: 1,
            duration: 120,
            ease: 'Back.Out'
        });

        this.tweens.add({
            targets: text,
            y: y - 100,
            alpha: 0,
            duration: 800,
            delay: 200,
            ease: 'Cubic.Out',
            onComplete: () => text.destroy()
        });
    }

    showLevelUpBanner(levelResult) {
        const { width, height } = this.cameras.main;
        const stats = window.gameState.getPlayerStats();

        const banner = this.add.container(width / 2, height / 2);
        const bg = createPanel(this, 0, 0, 480, 180, { radius: 20, borderColor: COLORS.gold, borderWidth: 3 });

        const title = this.add.text(0, -55, 'LEVEL UP!', {
            fontSize: '36px',
            fontFamily: 'monospace',
            color: TEXT.gold,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const levelText = this.add.text(0, -5, `Now Level ${stats.level}`, {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: TEXT.primary
        }).setOrigin(0.5);

        const statsText = this.add.text(0, 40,
            `HP ${stats.maxHp}  MP ${stats.maxMp}  ATK ${stats.attack}  DEF ${stats.defense}`, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#90EE90'
        }).setOrigin(0.5);

        banner.add([bg, title, levelText, statsText]);
        banner.setScale(0);

        this.tweens.add({
            targets: banner,
            scale: 1,
            duration: 400,
            ease: 'Back.Out'
        });

        this.time.delayedCall(2500, () => {
            this.tweens.add({
                targets: banner,
                alpha: 0,
                duration: 500,
                onComplete: () => banner.destroy()
            });
        });
    }

    showHelp() {
        const { width, height } = this.cameras.main;
        const helpText = 'PYTHON BATTLE HELP:\n\n' +
            '• The numbers you print ARE your damage!\n' +
            '  print("Deal 15 damage!") hits for ~15\n' +
            '• No numbers? You still land a small hit\n' +
            '  per line printed\n' +
            '• Loops, if/def, f-strings & variables\n' +
            '  each add a bit of bonus damage\n' +
            '• Print "Fire", "Ice" or "Thunder" to cast\n' +
            '  a spell - costs 8 MP, hits much harder\n' +
            '• Errors deal 0 damage - fix and retry!\n\n' +
            'Click anywhere to close';

        const helpBg = createPanel(this, width / 2, height / 2, 620, 420, { radius: 18, borderColor: COLORS.accent });
        const help = this.add.text(width / 2, height / 2, helpText, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: TEXT.accent,
            align: 'center',
            wordWrap: { width: 550 }
        }).setOrigin(0.5);

        const closeZone = this.add.rectangle(width / 2, height / 2, 620, 420, 0x000000, 0);
        closeZone.setInteractive().on('pointerdown', () => {
            helpBg.destroy();
            help.destroy();
            closeZone.destroy();
        });
    }

    fleeBattle() {
        if (this.battleEnded) return;

        this.battleLog.setText("Can't escape! This is a tutorial battle!");

        // Simple shake effect on the whole scene
        this.cameras.main.shake(200, 0.005);
    }

    updatePlayerHP() {
        if (this.playerHPBarCtrl) {
            const hpPercentage = this.playerMaxHP > 0 ? this.playerHP / this.playerMaxHP : 0;
            this.playerHPBarCtrl.setPercent(hpPercentage);
        }

        if (this.playerHPText) {
            this.playerHPText.setText(`HP: ${this.playerHP}/${this.playerMaxHP}`);
        }
    }

    updatePlayerMP() {
        if (this.playerMPText) {
            this.playerMPText.setText(`MP: ${this.playerMP}/${this.playerMaxMP}`);
        }
    }

    updateEnemyHP() {
        if (this.enemyHPBarCtrl) {
            const hpPercentage = this.enemyMaxHP > 0 ? this.enemyHP / this.enemyMaxHP : 0;
            this.enemyHPBarCtrl.setPercent(hpPercentage);
        }

        if (this.enemyHPText) {
            this.enemyHPText.setText(`${this.currentEnemy.name}: ${this.enemyHP}/${this.enemyMaxHP}`);
        }
    }
}
