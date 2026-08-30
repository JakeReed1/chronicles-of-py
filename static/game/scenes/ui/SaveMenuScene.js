import { COLORS, TEXT, createPanel, createButton, createGlowTitle } from '../../theme.js';

// SaveMenuScene.js - in-game save/load with per-slot text input
export default class SaveMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SaveMenuScene' });
        this.activeInput = null; // Track which slot is being edited
        this.inputText = {}; // Store input text for each slot
        this.cursorVisible = true;
        this.slotContainers = {}; // Store references to slot containers
    }

    init(data) {
        this.mode = data.mode || 'save';
        this.returnScene = data.returnScene || 'MainMenuScene';
    }

    create() {
        const { width, height } = this.cameras.main;

        // Dark overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.88);

        // Title
        createGlowTitle(this, width / 2, 100, this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', {
            fontSize: 48,
            color: this.mode === 'save' ? '#00ff88' : '#00aaff'
        });

        // Get all save slots
        const saveSlots = window.gameState.getAllSaveSlots();

        // Create 5 save slots
        for (let i = 0; i < 5; i++) {
            this.createSaveSlot(i + 1, 200 + (i * 120), saveSlots[i]);
        }

        // Back button
        this.createBackButton();

        // Set up keyboard input for naming saves
        if (this.mode === 'save') {
            this.setupKeyboardInput();

            this.time.addEvent({
                delay: 500,
                loop: true,
                callback: () => {
                    this.cursorVisible = !this.cursorVisible;
                    if (this.activeInput !== null) {
                        this.updateSlotText(this.activeInput);
                    }
                }
            });
        }
    }

    createSaveSlot(slotNumber, y, saveData) {
        const { width } = this.cameras.main;
        const x = width / 2;
        const slotWidth = 700;
        const slotHeight = 100;

        const container = this.add.container(x, y);

        const baseColor = saveData ? 0x1c3d24 : 0x24243a;
        const hoverColor = saveData ? 0x255030 : 0x33334d;
        const activeColor = 0x2f6b3f;
        const borderColor = saveData ? COLORS.panelBorderLit : COLORS.panelBorder;

        // Rounded visual panel (purely decorative)
        const panelGraphic = this.add.graphics();
        const drawPanel = (fillColor) => {
            panelGraphic.clear();
            panelGraphic.fillStyle(fillColor, 0.92);
            panelGraphic.fillRoundedRect(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight, 14);
            panelGraphic.lineStyle(2, borderColor, 0.8);
            panelGraphic.strokeRoundedRect(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight, 14);
        };
        drawPanel(baseColor);

        // Invisible rectangle used only for hit-testing/click - the graphic
        // above is what's actually visible.
        const bg = this.add.rectangle(0, 0, slotWidth, slotHeight, 0x000000, 0);
        bg.setInteractive({ useHandCursor: true });

        container.add([panelGraphic, bg]);

        // Initialize input text for this slot
        if (!this.inputText[slotNumber]) {
            if (saveData) {
                this.inputText[slotNumber] = saveData.slotName ||
                    `Save ${slotNumber} - Level ${saveData.playerStats?.level || 1}`;
            } else {
                this.inputText[slotNumber] = `Save ${slotNumber} - Level ${window.gameState.playerStats.level}`;
            }
        }

        if (saveData) {
            const date = new Date(saveData.timestamp);
            const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

            const nameText = this.add.text(-330, -30, this.inputText[slotNumber], {
                fontSize: '24px',
                fontFamily: 'monospace',
                color: TEXT.gold
            });
            container.nameText = nameText;

            const levelText = this.add.text(-330, 0, `Level: ${saveData.playerStats?.level || 1}`, {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: '#90EE90'
            });

            const dateText = this.add.text(-330, 25, dateStr, {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: TEXT.secondary
            });

            container.add([nameText, levelText, dateText]);

            // Delete button (only in save mode)
            if (this.mode === 'save') {
                const deleteBtn = this.add.text(300, 0, '✕', {
                    fontSize: '22px',
                    fontFamily: 'monospace',
                    color: '#ff6b6b',
                    backgroundColor: '#3a1414',
                    padding: { x: 12, y: 6 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });

                deleteBtn.on('pointerover', () => deleteBtn.setStyle({ backgroundColor: '#5a1a1a' }));
                deleteBtn.on('pointerout', () => deleteBtn.setStyle({ backgroundColor: '#3a1414' }));
                deleteBtn.on('pointerdown', (pointer) => {
                    pointer.event.stopPropagation();
                    this.confirmDelete(slotNumber);
                });

                container.add(deleteBtn);
            }
        } else {
            const emptyText = this.add.text(0, 0,
                this.mode === 'save' ?
                `Click to save here (Slot ${slotNumber})` :
                `Empty Slot ${slotNumber}`,
                {
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    color: TEXT.muted
                }
            ).setOrigin(0.5);

            container.nameText = emptyText;
            container.add(emptyText);
        }

        // Store references needed by activateSlotInput()/updateSlotText()
        container.slotNumber = slotNumber;
        container.drawPanel = drawPanel;
        container.baseColor = baseColor;
        this.slotContainers[slotNumber] = container;

        bg.on('pointerdown', () => {
            if (this.mode === 'save') {
                this.activateSlotInput(slotNumber, container);
            } else {
                this.loadFromSlot(slotNumber, saveData);
            }
        });

        bg.on('pointerover', () => {
            if (this.activeInput !== slotNumber) drawPanel(hoverColor);
        });

        bg.on('pointerout', () => {
            if (this.activeInput !== slotNumber) drawPanel(baseColor);
        });

        container.activeColor = activeColor;
    }

    activateSlotInput(slotNumber, container) {
        // Deactivate previous input
        if (this.activeInput && this.activeInput !== slotNumber) {
            const prevSlot = this.slotContainers[this.activeInput];
            if (prevSlot && prevSlot.drawPanel) {
                prevSlot.drawPanel(prevSlot.baseColor);
            }
            this.updateSlotText(this.activeInput, false);
        }

        this.activeInput = slotNumber;
        container.drawPanel(container.activeColor); // Highlight active slot

        // Clear current text for new input if it's an empty slot
        const saveSlots = window.gameState.getAllSaveSlots();
        if (!saveSlots[slotNumber - 1]) {
            this.inputText[slotNumber] = '';
        }

        this.updateSlotText(slotNumber);
        this.showInstructions();
    }

    setupKeyboardInput() {
        this.input.keyboard.on('keydown', (event) => {
            if (!this.activeInput) return;

            const key = event.key;

            if (key === 'Enter') {
                if (this.inputText[this.activeInput].trim().length > 0) {
                    this.performSave(this.activeInput);
                } else {
                    this.showMessage('Please enter a name!', '#ffee58');
                }
            } else if (key === 'Escape') {
                const saveSlots = window.gameState.getAllSaveSlots();
                const saveData = saveSlots[this.activeInput - 1];
                if (saveData) {
                    this.inputText[this.activeInput] = saveData.slotName ||
                        `Save ${this.activeInput} - Level ${saveData.playerStats?.level || 1}`;
                } else {
                    this.inputText[this.activeInput] = `Save ${this.activeInput} - Level ${window.gameState.playerStats.level}`;
                }
                const slot = this.slotContainers[this.activeInput];
                if (slot && slot.drawPanel) slot.drawPanel(slot.baseColor);
                this.updateSlotText(this.activeInput, false);
                this.activeInput = null;
                this.hideInstructions();
            } else if (key === 'Backspace') {
                this.inputText[this.activeInput] =
                    this.inputText[this.activeInput].slice(0, -1);
                this.updateSlotText(this.activeInput);
            } else if (key.length === 1 && this.inputText[this.activeInput].length < 50) {
                this.inputText[this.activeInput] += key;
                this.updateSlotText(this.activeInput);
            }
        });
    }

    updateSlotText(slotNumber, showCursor = true) {
        const container = this.slotContainers[slotNumber];

        if (container && container.nameText) {
            let displayText = this.inputText[slotNumber];
            if (showCursor && this.activeInput === slotNumber && this.cursorVisible) {
                displayText += '|';
            }
            container.nameText.setText(displayText);
        }
    }

    performSave(slotNumber) {
        window.gameState.saveToSlot(slotNumber, this.inputText[slotNumber]);
        this.activeInput = null;
        this.hideInstructions();
        this.showMessage('Game Saved!', '#00ff88');

        this.time.delayedCall(1000, () => {
            this.scene.restart({ mode: this.mode, returnScene: this.returnScene });
        });
    }

    showInstructions() {
        if (this.instructionText) {
            this.instructionText.destroy();
        }

        const { width } = this.cameras.main;
        this.instructionText = this.add.text(width / 2, 850,
            'Type to name save | Enter to save | Esc to cancel', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: TEXT.gold,
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
    }

    hideInstructions() {
        if (this.instructionText) {
            this.instructionText.destroy();
            this.instructionText = null;
        }
    }

    loadFromSlot(slotNumber, saveData) {
        if (!saveData) {
            this.showMessage('No save data in this slot!', '#ff6b6b');
            return;
        }

        window.gameState.loadFromSlot(slotNumber);
        this.scene.stop(this.returnScene);
        this.scene.start(saveData.currentZone || 'PrintForestScene');
    }

    confirmDelete(slotNumber) {
        const { width, height } = this.cameras.main;

        const dialog = createPanel(this, width / 2, height / 2, 420, 190, {
            radius: 16,
            borderColor: COLORS.danger
        });

        const text = this.add.text(width / 2, height / 2 - 40, 'Delete this save?', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ff6b6b'
        }).setOrigin(0.5);

        const yesBtn = createButton(this, width / 2 - 80, height / 2 + 35, 130, 50, 'Yes', {
            fillColor: COLORS.danger,
            hoverColor: COLORS.dangerHover,
            onClick: () => {
                window.gameState.deleteSlot(slotNumber);
                this.scene.restart({ mode: this.mode, returnScene: this.returnScene });
            }
        });

        const noBtn = createButton(this, width / 2 + 80, height / 2 + 35, 130, 50, 'No', {
            fillColor: COLORS.neutral,
            hoverColor: COLORS.neutralHover,
            onClick: () => {
                dialog.destroy();
                text.destroy();
                yesBtn.destroy();
                noBtn.destroy();
            }
        });
    }

    createBackButton() {
        const { width, height } = this.cameras.main;
        createButton(this, width / 2, height - 100, 200, 56, 'Back', {
            fillColor: COLORS.neutral,
            hoverColor: COLORS.neutralHover,
            onClick: () => {
                this.scene.resume(this.returnScene);
                this.scene.stop();
            }
        });
    }

    showMessage(text, color = '#ff6b6b') {
        const { width, height } = this.cameras.main;

        const msgText = this.add.text(0, 0, text, {
            fontSize: '28px',
            fontFamily: 'monospace',
            color
        });

        const panel = createPanel(this, width / 2, height / 2, msgText.width + 60, msgText.height + 40, {
            radius: 14
        });

        msgText.setPosition(width / 2, height / 2).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            panel.destroy();
            msgText.destroy();
        });
    }
}
