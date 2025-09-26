// Main Menu Scene
export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
        console.log('MainMenuScene constructor called');
    }

    create() {
        console.log('MainMenuScene create called');
        const { width, height } = this.cameras.main;
        
        // Background
        this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);
        
        // Title
        const title = this.add.text(width / 2, height / 3, 'Chronicles of Py', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(width / 2, height / 3 + 60, 'Learn Python through Adventure!', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        
        // Menu buttons
        const buttonStyle = {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#4a4a4a',
            padding: { x: 20, y: 10 }
        };
        
        // Check if there's a saved game
        const hasSaveGame = localStorage.getItem('chroniclesOfPySave') !== null;
        let buttonY = height / 2 + 20;
        
        // Continue button (shows first if save exists)
        if (hasSaveGame) {
            const continueButton = this.add.text(width / 2, buttonY, 'Continue', buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => continueButton.setStyle({ backgroundColor: '#6a6a6a' }))
                .on('pointerout', () => continueButton.setStyle({ backgroundColor: '#4a4a4a' }))
                .on('pointerdown', () => this.continueGame());
            
            buttonY += 60;
        }
        
        // New Adventure button (always shows)
        const startButton = this.add.text(width / 2, buttonY, 'New Adventure', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => startButton.setStyle({ backgroundColor: '#6a6a6a' }))
            .on('pointerout', () => startButton.setStyle({ backgroundColor: '#4a4a4a' }))
            .on('pointerdown', () => this.startNewGame());
        
        buttonY += 60;
        
        // Tutorial button
        const tutorialButton = this.add.text(width / 2, buttonY, 'Tutorial', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => tutorialButton.setStyle({ backgroundColor: '#6a6a6a' }))
            .on('pointerout', () => tutorialButton.setStyle({ backgroundColor: '#4a4a4a' }))
            .on('pointerdown', () => this.startTutorial());
        
        // Show player info if there's a save
        if (hasSaveGame) {
            const playerStats = window.gameState.getPlayerStats();
            this.add.text(10, 10, `Python Hero - Level ${playerStats.level}`, {
                fontSize: '16px',
                color: '#ffffff'
            });
            
            this.add.text(10, 30, `Experience: ${playerStats.experience || 0}`, {
                fontSize: '14px',
                color: '#aaaaaa'
            });
            
            // Show last saved position
            const pos = window.gameState.getPlayerPosition();
            this.add.text(10, 50, `Last Position: (${Math.floor(pos.x)}, ${Math.floor(pos.y)})`, {
                fontSize: '12px',
                color: '#888888'
            });
        }
    }
    
    startNewGame() {
        // Confirm if there's an existing save
        const hasSave = localStorage.getItem('chroniclesOfPySave') !== null;
        
        if (hasSave) {
            // Create confirmation dialog
            const { width, height } = this.cameras.main;
            
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
            const dialog = this.add.rectangle(width / 2, height / 2, 400, 200, 0x2a2a2a);
            
            const message = this.add.text(width / 2, height / 2 - 30, 
                'Start new game?\nThis will delete your saved progress!', {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);
            
            const yesButton = this.add.text(width / 2 - 80, height / 2 + 40, 'Yes', {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff',
                backgroundColor: '#aa0000',
                padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setInteractive();
            
            const noButton = this.add.text(width / 2 + 80, height / 2 + 40, 'Cancel', {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff',
                backgroundColor: '#4a4a4a',
                padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setInteractive();
            
            yesButton.on('pointerdown', () => {
                // Reset and start new game
                window.gameState.resetGame();
                this.scene.start('WorldScene');
            });
            
            noButton.on('pointerdown', () => {
                // Remove dialog
                overlay.destroy();
                dialog.destroy();
                message.destroy();
                yesButton.destroy();
                noButton.destroy();
            });
        } else {
            // No save exists, just start new game
            window.gameState.resetGame();
            this.scene.start('WorldScene');
        }
    }
    
    continueGame() {
        // Continue from saved state (already loaded by GameState constructor)
        this.scene.start('WorldScene');
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