// World Scene - Overworld exploration
export default class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }

    create() {
        // Set world bounds for first level
        this.cameras.main.setBounds(0, 0, 800, 600);
        this.physics.world.setBounds(0, 0, 800, 600);
        
        // Create the first level - Python Forest
        this.createFirstLevel();
        
        // Create player
        this.createPlayer();
        
        // Create tutorial enemies
        this.createTutorialEnemies();
        
        // Set up camera
        this.cameras.main.startFollow(this.player);
        
        // Create UI overlay
        this.scene.launch('UIScene');
        
        // Set up collisions and interactions
        this.setupCollisions();
        
        // Show tutorial message
        this.showTutorialMessage();
    }