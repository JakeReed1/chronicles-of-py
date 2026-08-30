import { COLORS, TEXT, createPanel, createButton, createGlowTitle } from '../theme.js';

// Main Menu Scene
export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        this.createBackground(width, height);
        this.createFloatingSymbols(width, height);

        // Title
        createGlowTitle(this, width / 2, height * 0.22, 'Chronicles of Py', { fontSize: 56 });

        this.add.text(width / 2, height * 0.22 + 50, 'Learn Python through Adventure!', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: TEXT.secondary
        }).setOrigin(0.5);

        const hasSaveGame = localStorage.getItem('chroniclesOfPySave') !== null;
        let buttonY = height * 0.48;
        const buttonWidth = 300;
        const buttonHeight = 56;
        const buttonSpacing = 72;

        if (hasSaveGame) {
            createButton(this, width / 2, buttonY, buttonWidth, buttonHeight, 'Continue', {
                fillColor: COLORS.success,
                hoverColor: COLORS.successHover,
                onClick: () => this.continueGame()
            });
            buttonY += buttonSpacing;
        }

        createButton(this, width / 2, buttonY, buttonWidth, buttonHeight, 'New Adventure', {
            fillColor: COLORS.info,
            hoverColor: COLORS.infoHover,
            onClick: () => this.startNewGame()
        });
        buttonY += buttonSpacing;

        createButton(this, width / 2, buttonY, buttonWidth, buttonHeight, 'Tutorial', {
            fillColor: COLORS.neutral,
            hoverColor: COLORS.neutralHover,
            onClick: () => this.startTutorial()
        });

        if (hasSaveGame) {
            this.createPlayerInfoPanel();
        }
    }

    createBackground(width, height) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(COLORS.bgDark, COLORS.bgDark, COLORS.bgDarkAlt, COLORS.bgDarkAlt, 1);
        bg.fillRect(0, 0, width, height);
    }

    // A handful of drifting Python-flavored symbols for atmosphere
    createFloatingSymbols(width, height) {
        const symbols = ['{ }', 'print()', 'for', 'while', '0 1', 'def', '[ ]', '=='];
        for (let i = 0; i < 14; i++) {
            const symbol = Phaser.Math.RND.pick(symbols);
            const x = Phaser.Math.Between(0, width);
            const startY = Phaser.Math.Between(0, height);
            const text = this.add.text(x, startY, symbol, {
                fontSize: Phaser.Math.Between(14, 26) + 'px',
                fontFamily: 'monospace',
                color: '#2a3a5a'
            }).setAlpha(Phaser.Math.FloatBetween(0.25, 0.5));

            this.tweens.add({
                targets: text,
                y: startY - height - 100,
                duration: Phaser.Math.Between(18000, 32000),
                repeat: -1,
                onRepeat: () => { text.y = height + 50; text.x = Phaser.Math.Between(0, width); }
            });
        }
    }

    createPlayerInfoPanel() {
        const playerStats = window.gameState.getPlayerStats();
        const xpProgress = window.gameState.getXpProgress();
        const pos = window.gameState.getPlayerPosition();

        createPanel(this, 120, 55, 220, 90, { radius: 10 });

        this.add.text(20, 20, `Lv. ${playerStats.level}  Python Hero`, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: TEXT.gold
        });

        this.add.text(20, 44, `XP: ${xpProgress.xp}/${xpProgress.xpNeeded}`, {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: TEXT.secondary
        });

        this.add.text(20, 64, `Last seen: (${Math.floor(pos.x)}, ${Math.floor(pos.y)})`, {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: TEXT.muted
        });
    }

    startNewGame() {
        const hasSave = localStorage.getItem('chroniclesOfPySave') !== null;

        if (hasSave) {
            this.showConfirmDialog();
        } else {
            window.gameState.resetGame();
            this.scene.start('PrintForestScene');
        }
    }

    showConfirmDialog() {
        const { width, height } = this.cameras.main;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        const dialog = createPanel(this, width / 2, height / 2, 460, 220, { radius: 16 });

        const message = this.add.text(width / 2, height / 2 - 40,
            'Start new game?\nThis will delete your saved progress!', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: TEXT.primary,
            align: 'center'
        }).setOrigin(0.5);

        const yesButton = createButton(this, width / 2 - 90, height / 2 + 40, 140, 50, 'Yes', {
            fillColor: COLORS.danger,
            hoverColor: COLORS.dangerHover,
            onClick: () => {
                window.gameState.resetGame();
                this.scene.start('PrintForestScene');
            }
        });

        const noButton = createButton(this, width / 2 + 90, height / 2 + 40, 140, 50, 'Cancel', {
            fillColor: COLORS.neutral,
            hoverColor: COLORS.neutralHover,
            onClick: () => {
                overlay.destroy();
                dialog.destroy();
                message.destroy();
                yesButton.destroy();
                noButton.destroy();
            }
        });
    }

    continueGame() {
        // Continue from saved state (already loaded by GameState constructor)
        this.scene.start(window.gameState.currentZone || 'PrintForestScene');
    }

    startTutorial() {
        // Set up tutorial enemy
        window.gameState.currentEnemy = {
            id: 'tutorial',
            name: 'Training Dummy',
            difficulty: 'easy',
            stats: {
                maxHp: 30,
                damage: 5,
                xp: 10
            }
        };
        this.scene.start('BattleScene');
    }
}
