import { COLORS, TEXT, createPanel, createButton, createGlowTitle } from '../../theme.js';

// PauseMenuScene.js
export default class PauseMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseMenuScene' });
    }

    init(data) {
        this.returnScene = data.returnScene || 'PrintForestScene';
    }

    create() {
        const { width, height } = this.cameras.main;
        const menuY = height / 2;

        // Dim the paused game behind the menu
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        createPanel(this, width / 2, menuY, 420, 420, { radius: 20 });

        createGlowTitle(this, width / 2, menuY - 150, 'PAUSED', { fontSize: 40 });

        const buttonWidth = 260;
        const buttonHeight = 56;
        const spacing = 70;
        let y = menuY - 50;

        createButton(this, width / 2, y, buttonWidth, buttonHeight, 'Resume', {
            fillColor: COLORS.success,
            hoverColor: COLORS.successHover,
            onClick: () => {
                this.scene.resume(this.returnScene);
                this.scene.stop();
            }
        });
        y += spacing;

        createButton(this, width / 2, y, buttonWidth, buttonHeight, 'Save Game', {
            fillColor: COLORS.info,
            hoverColor: COLORS.infoHover,
            onClick: () => {
                this.scene.stop();
                this.scene.launch('SaveMenuScene', { mode: 'save', returnScene: this.returnScene });
            }
        });
        y += spacing;

        createButton(this, width / 2, y, buttonWidth, buttonHeight, 'Load Game', {
            fillColor: COLORS.info,
            hoverColor: COLORS.infoHover,
            onClick: () => {
                this.scene.stop();
                this.scene.launch('SaveMenuScene', { mode: 'load', returnScene: this.returnScene });
            }
        });
        y += spacing;

        createButton(this, width / 2, y, buttonWidth, buttonHeight, 'Main Menu', {
            fillColor: COLORS.danger,
            hoverColor: COLORS.dangerHover,
            onClick: () => {
                this.scene.stop(this.returnScene);
                this.scene.stop();
                this.scene.start('MainMenuScene');
            }
        });
    }
}
