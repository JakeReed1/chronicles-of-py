import { COLORS, TEXT, createPanel, createBar } from '../theme.js';

// UI Scene - Overlay UI elements
export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // This scene runs in parallel with other scenes
        // Used for persistent UI elements like menus, notifications, etc.
        this.setupUI();
        this.createHUD();
    }

    setupUI() {
        // Escape menu hint
        this.add.text(10, this.cameras.main.height - 34, 'Press ESC for menu', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: TEXT.secondary,
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 4 }
        });
    }

    createHUD() {
        const barWidth = 200;
        const panelX = 130;
        const panelY = 58;

        createPanel(this, panelX, panelY, 240, 100, { radius: 12 });

        this.hudLevelText = this.add.text(20, 20, '', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: TEXT.gold
        });

        this.hudHpText = this.add.text(20, 46, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: TEXT.primary
        });

        this.hpBar = createBar(this, 20, 66, barWidth, 10, COLORS.hp);
        this.xpBar = createBar(this, 20, 82, barWidth, 6, COLORS.xp);

        this.updateHUD();
        this.time.addEvent({ delay: 250, loop: true, callback: () => this.updateHUD() });
    }

    updateHUD() {
        const stats = window.gameState.getPlayerStats();
        const progress = window.gameState.getXpProgress();

        this.hudLevelText.setText(`Lv. ${stats.level}  Python Hero`);
        this.hudHpText.setText(`HP ${stats.hp}/${stats.maxHp}`);

        const hpPercent = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
        this.hpBar.setPercent(hpPercent);
        this.xpBar.setPercent(progress.percent);
    }
}
