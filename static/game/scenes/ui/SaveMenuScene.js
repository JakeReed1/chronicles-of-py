// SaveMenuScene.js - Fixed version with in-game text input
export default class SaveMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SaveMenuScene' });
        this.activeInput = null; // Track which slot is being edited
        this.inputText = {}; // Store input text for each slot
        this.cursorVisible = true; // FIX: Corrected typo, moved to class level
        this.slotContainers = {}; // Store references to slot containers
    }
    
    init(data) {
        this.mode = data.mode || 'save';
        this.returnScene = data.returnScene || 'MainMenuScene';
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Dark overlay
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.9);
        
        // Title
        this.add.text(width/2, 100, this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: this.mode === 'save' ? '#00ff00' : '#00aaff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
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
            
            // ADDITION: Set up global cursor blinking
            this.time.addEvent({
                delay: 500,
                loop: true,
                callback: () => {
                    this.cursorVisible = !this.cursorVisible;
                    // Update the active input slot's display
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
        
        // Slot container
        const container = this.add.container(x, y);
        
        // Background
        const bg = this.add.rectangle(0, 0, 700, 100, saveData ? 0x1a4a1a : 0x333333);
        bg.setInteractive();
        
        // Initialize input text for this slot
        if (!this.inputText[slotNumber]) {
            if (saveData) {
                // Use existing save name or create default
                this.inputText[slotNumber] = saveData.slotName || 
                    `Save ${slotNumber} - Level ${saveData.playerStats?.level || 1}`;
            } else {
                // For empty slots, prepare default name
                this.inputText[slotNumber] = `Save ${slotNumber} - Level ${window.gameState.playerStats.level}`;
            }
        }
        
        // Slot content
        if (saveData) {
            // Saved game info
            const date = new Date(saveData.timestamp);
            const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Create the name text (displays the save name)
            const nameText = this.add.text(-330, -30, this.inputText[slotNumber], {
                fontSize: '24px',
                fontFamily: 'monospace',
                color: '#FFD700'
            });
            
            // Store reference to name text for updating
            container.nameText = nameText;
            
            // ADDITION: Create level text if you want to show it separately
            const levelText = this.add.text(-330, 0, `Level: ${saveData.playerStats?.level || 1}`, {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: '#90EE90'
            });
            
            const dateText = this.add.text(-330, 25, dateStr, {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#aaaaaa'
            });
            
            container.add([bg, nameText, levelText, dateText]);
            
            // Delete button (only in save mode)
            if (this.mode === 'save') {
                const deleteBtn = this.add.text(300, 0, 'X', {
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    color: '#ff0000',
                    backgroundColor: '#330000',
                    padding: { x: 10, y: 5 }
                }).setOrigin(0.5).setInteractive();
                
                deleteBtn.on('pointerdown', (pointer) => {
                    pointer.event.stopPropagation();
                    this.confirmDelete(slotNumber);
                });
                
                container.add(deleteBtn);
            }
        } else {
            // Empty slot
            const emptyText = this.add.text(0, 0, 
                this.mode === 'save' ? 
                `Click to save here (Slot ${slotNumber})` : 
                `Empty Slot ${slotNumber}`, 
                {
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    color: '#e0f805ff'
                }
            ).setOrigin(0.5);
            
            // ADDITION: Store reference for empty slots too
            container.nameText = emptyText;
            container.add([bg, emptyText]);
        }
        
        // Store container reference
        container.slotNumber = slotNumber;
        container.bg = bg;
        this.slotContainers[slotNumber] = container; // Store for easy access
        
        // Click handler
        bg.on('pointerdown', () => {
            if (this.mode === 'save') {
                // Activate text input for this slot
                this.activateSlotInput(slotNumber, container);
            } else {
                this.loadFromSlot(slotNumber, saveData);
            }
        });
        
        bg.on('pointerover', () => {
            bg.setFillStyle(saveData ? 0x2a5a2a : 0x555555);
        });
        
        bg.on('pointerout', () => {
            if (this.activeInput !== slotNumber) {
                bg.setFillStyle(saveData ? 0x1a4a1a : 0x333333);
            }
        });
    }
    
    activateSlotInput(slotNumber, container) {
        // Deactivate previous input
        if (this.activeInput && this.activeInput !== slotNumber) {
            // Reset previous slot's background
            const prevSlot = this.slotContainers[this.activeInput];
            if (prevSlot && prevSlot.bg) {
                prevSlot.bg.setFillStyle(0x1a4a1a);
            }
            // Reset text (remove cursor)
            this.updateSlotText(this.activeInput, false);
        }
        
        this.activeInput = slotNumber;
        container.bg.setFillStyle(0x3a5a3a); // Highlight active slot
        
        // Clear current text for new input if it's an empty slot
        const saveSlots = window.gameState.getAllSaveSlots();
        if (!saveSlots[slotNumber - 1]) {
            this.inputText[slotNumber] = ''; // Start fresh for empty slots
        }
        
        // Update display with cursor
        this.updateSlotText(slotNumber);
        
        // Show input instructions
        this.showInstructions();
    }
    
    setupKeyboardInput() {
        this.input.keyboard.on('keydown', (event) => {
            if (!this.activeInput) return;
            
            const key = event.key;
            
            if (key === 'Enter') {
                // Save the game with current name
                if (this.inputText[this.activeInput].trim().length > 0) {
                    this.performSave(this.activeInput);
                } else {
                    this.showMessage('Please enter a name!', '#f1f506ff');
                }
            } else if (key === 'Escape') {
                // Cancel input and restore original text
                const saveSlots = window.gameState.getAllSaveSlots();
                const saveData = saveSlots[this.activeInput - 1];
                if (saveData) {
                    this.inputText[this.activeInput] = saveData.slotName || 
                        `Save ${this.activeInput} - Level ${saveData.playerStats?.level || 1}`;
                } else {
                    this.inputText[this.activeInput] = `Save ${this.activeInput} - Level ${window.gameState.playerStats.level}`;
                }
                this.updateSlotText(this.activeInput, false);
                this.activeInput = null;
                this.hideInstructions();
            } else if (key === 'Backspace') {
                // Remove last character
                this.inputText[this.activeInput] = 
                    this.inputText[this.activeInput].slice(0, -1);
                this.updateSlotText(this.activeInput);
            } else if (key.length === 1 && this.inputText[this.activeInput].length < 50) {
                // Add character (max 50 chars)
                this.inputText[this.activeInput] += key;
                this.updateSlotText(this.activeInput);
            }
        });
    }
    
    updateSlotText(slotNumber, showCursor = true) {
        // Find the container for this slot
        const container = this.slotContainers[slotNumber];
        
        if (container && container.nameText) {
            let displayText = this.inputText[slotNumber];
            // Only show cursor if this slot is active and cursor should be visible
            if (showCursor && this.activeInput === slotNumber && this.cursorVisible) {
                displayText += '|';
            }
            container.nameText.setText(displayText);
        }
    }
    
    performSave(slotNumber) {
        window.gameState.saveToSlot(slotNumber, this.inputText[slotNumber]);
        this.activeInput = null; // Deactivate input
        this.hideInstructions();
        this.showMessage('Game Saved!', '#00ff00');
        
        // Refresh the scene after a short delay
        this.time.delayedCall(1000, () => {
            this.scene.restart({ mode: this.mode, returnScene: this.returnScene });
        });
    }
    
    // ... rest of the methods remain the same ...
    
    showInstructions() {
        if (this.instructionText) {
            this.instructionText.destroy();
        }
        
        const { width } = this.cameras.main;
        this.instructionText = this.add.text(width/2, 850, 
            'Type to name save | Enter to save | Esc to cancel', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#ffff00',
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
            this.showMessage('No save data in this slot!', '#ff0000');
            return;
        }
        
        window.gameState.loadFromSlot(slotNumber);
        this.scene.stop(this.returnScene);
        this.scene.start(saveData.currentZone || 'PrintForestScene');
    }
    
    confirmDelete(slotNumber) {
        const { width, height } = this.cameras.main;
        
        const dialog = this.add.container(width/2, height/2);
        
        const bg = this.add.rectangle(0, 0, 400, 150, 0x000000);
        const border = this.add.rectangle(0, 0, 400, 150, 0xff0000, 0)
            .setStrokeStyle(2, 0xff0000);
        
        const text = this.add.text(0, -30, 'Delete this save?', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ff0000'
        }).setOrigin(0.5);
        
        const yesBtn = this.add.text(-70, 30, 'Yes', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#aa0000',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive();
        
        const noBtn = this.add.text(70, 30, 'No', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive();
        
        dialog.add([bg, border, text, yesBtn, noBtn]);
        
        yesBtn.on('pointerdown', () => {
            window.gameState.deleteSlot(slotNumber);
            this.scene.restart({ mode: this.mode, returnScene: this.returnScene });
        });
        
        noBtn.on('pointerdown', () => {
            dialog.destroy();
        });
    }
    
    createBackButton() {
        const { width, height } = this.cameras.main;
        
        const backBtn = this.add.text(width/2, height - 100, 'Back', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive();
        
        backBtn.on('pointerdown', () => {
            this.scene.resume(this.returnScene);
            this.scene.stop();
        });
    }
    
    showMessage(text, color = '#ff0000') {
        const { width, height } = this.cameras.main;
        
        const msg = this.add.text(width/2, height/2, text, {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: color,
            backgroundColor: '#000000',
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => msg.destroy());
    }
}