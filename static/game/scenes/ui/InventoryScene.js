// theme.js is fetched with the same version stamp game.html already
// attaches to top-level scene imports (window.ASSET_VERSION). A plain
// `import ... from '../../theme.js'` has no such cache-busting - it's a
// relative import, invisible to that mechanism - so a browser that already
// had an older theme.js cached (from before createCodeConsole existed)
// would keep serving those stale bytes here even after a normal reload.
// Scoped to just this file rather than every theme.js importer, since
// nothing else needs the newly-added export yet.
const themeVersion = window.ASSET_VERSION || Date.now();
const { COLORS, TEXT, createPanel, createButton, createGlowTitle, createCodeConsole } =
    await import(`../../theme.js?v=${themeVersion}`);

// Shown when the console opens with nothing pre-filled (i.e. not from a
// chest) - without this, a player pressing I for the first time sees a
// totally blank editor with no clue what commands exist, unlike battles
// which always show a rotating example (BattleScene.js's showCodeHint()).
const HINT_EXAMPLES = [
    { label: 'Use a potion', code: 'use_item(inventory, "Health Potion")' },
    { label: 'Equip a weapon', code: 'for item in inventory:\n    if item["name"] == "Iron Sword":\n        item["equipped"] = True' },
    { label: 'Spend a skill point', code: 'player["attack"] += 1\nplayer["skill_points"] -= 1' },
    { label: 'Check what you have', code: 'for item in inventory:\n    print(item["name"], item["quantity"])' },
];

// InventoryScene.js - the code-driven inventory/progression console.
// Modeled on PauseMenuScene.js (dim overlay + panel, init(data) takes
// returnScene, resume+stop to return) but with a live item list and a
// createCodeConsole (theme.js) wired to /api/execute-inventory-code/ so
// picking up loot, using items, and spending skill points all happen by
// writing real Python against your actual inventory/stats - the same idea
// BattleScene.js already uses for combat, just a separate console (see the
// plan's coordination note: BattleScene.js itself is untouched).
export default class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InventoryScene' });
    }

    init(data) {
        this.returnScene = data.returnScene || 'PrintForestScene';
        // Optional: pre-fill the console with a hint, e.g. when opened from
        // a treasure chest ("inventory.append({...})").
        this.initialCode = data.initialCode || '';
        // Optional: set together by a chest (chestAnim.js) so a successful
        // run that actually results in the watched item being in the
        // inventory marks the chest permanently looted, and so the chest's
        // lid closes again once this scene does (whether or not the item
        // was actually taken - closing the menu always closes the chest).
        this.chestId = data.chestId || null;
        this.watchItemName = data.watchItemName || null;
        this.onChestClose = data.onChestClose || null;
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0.7);

        createGlowTitle(this, centerX, 50, 'INVENTORY & PROGRESSION', { fontSize: 32 });

        this.add.text(centerX, 84, 'Write Python against `inventory` and `player` to manage your items and stats', {
            fontSize: '14px', fontFamily: 'monospace', color: TEXT.secondary, align: 'center'
        }).setOrigin(0.5);

        // Left column: read-only item/stat summary. Shorter than the full
        // available height so there's room below it for the hint panel.
        const listPanelX = width * 0.22;
        const listPanelY = height * 0.48;
        const listPanelHeight = height * 0.55;
        createPanel(this, listPanelX, listPanelY, width * 0.36, listPanelHeight, { radius: 14 });

        this.itemListText = this.add.text(listPanelX - width * 0.17, listPanelY - listPanelHeight / 2 + 15, '', {
            fontSize: '16px', fontFamily: 'monospace', color: TEXT.primary,
            wordWrap: { width: width * 0.32 }, lineSpacing: 6
        });
        this.refreshItemList();

        // Right side: the code console itself
        this.console = createCodeConsole(this, {
            x: width * 0.68,
            y: height * 0.5,
            width: width * 0.54,
            editorHeight: height * 0.32,
            outputHeight: height * 0.18,
            title: '>>> Inventory Console',
            initialCode: this.initialCode,
            initialOutput: 'Ready for Python code execution...',
            onRun: (code) => this.runInventoryCode(code)
        });

        const closeButton = createButton(this, width - 90, 40, 120, 44, 'Close', {
            fillColor: COLORS.danger, hoverColor: COLORS.dangerHover,
            onClick: () => this.close()
        });

        this.input.keyboard.on('keydown-ESC', () => this.close());

        // Only show a hint when there's nothing pre-filled (a chest pickup
        // line already tells you what to do).
        if (!this.initialCode) {
            this.showHint(listPanelX, listPanelY + listPanelHeight / 2 + 25);
        }
    }

    showHint(x, y) {
        const example = Phaser.Math.RND.pick(HINT_EXAMPLES);
        const panelWidth = 280;

        const label = this.add.text(x, y, `\u{1F4A1} ${example.label}:`, {
            fontSize: '13px', fontFamily: 'monospace', color: TEXT.gold
        }).setOrigin(0.5, 0);

        const code = this.add.text(x, y + 20, example.code, {
            fontSize: '12px', fontFamily: 'monospace', color: COLORS.accent,
            align: 'left', wordWrap: { width: panelWidth - 20 }
        }).setOrigin(0.5, 0);

        const panel = createPanel(this, x, y + (code.height + 30) / 2,
            panelWidth, code.height + 40, { radius: 12 });
        panel.setDepth(-1);
        label.setDepth(0);
        code.setDepth(0);
    }

    refreshItemList() {
        const stats = window.gameState.getPlayerStats();
        const items = window.gameState.getInventory();

        const lines = [
            `Level ${stats.level}  |  Skill Points: ${stats.skillPoints || 0}  |  Gold: ${stats.gold || 0}`,
            `HP ${stats.hp}/${stats.maxHp}   MP ${stats.mp}/${stats.maxMp}`,
            `ATK ${stats.attack}  DEF ${stats.defense}  SPD ${stats.speed}`,
            '',
            '--- inventory ---'
        ];
        if (items.length === 0) {
            lines.push('(empty)');
        } else {
            items.forEach(item => lines.push(
                `${item.name} x${item.quantity}  [${item.type}]${item.equipped ? '  (equipped)' : ''}`
            ));
        }
        this.itemListText.setText(lines.join('\n'));
    }

    runInventoryCode(code) {
        return fetch('/api/execute-inventory-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN || ''
            },
            body: JSON.stringify({ code })
        })
            .then(response => {
                // /game/ itself doesn't require login (the rest of the game
                // runs fine anonymously via localStorage), but this endpoint
                // does - a logged-out player gets redirected to the login
                // page, which fetch() follows and hands back HTML, not JSON.
                // Give a clear message instead of a raw JSON-parse crash.
                if (response.redirected && response.url.includes('/login')) {
                    return { success: false, error: 'Please log in (or sign up) to use the inventory console - it saves to your real account.' };
                }
                return response.json();
            })
            .then(result => {
                if (result.success) {
                    window.gameState.setInventoryAndStats(result.inventory, result.player);
                    this.refreshItemList();

                    if (this.chestId && this.watchItemName && !window.gameState.isChestItemTaken(this.chestId)) {
                        const gotIt = (result.inventory || []).some(
                            item => item.name === this.watchItemName && item.quantity > 0
                        );
                        if (gotIt) {
                            window.gameState.takeChestItem(this.chestId);
                        }
                    }
                }
                return result;
            })
            .catch(error => {
                console.error('Error executing inventory code:', error);
                return { success: false, error: 'Network error: could not reach the server' };
            });
    }

    close() {
        this.console.destroy();
        this.scene.resume(this.returnScene);
        this.scene.stop();
        // Must run after resume() - a paused scene's animations don't
        // advance, so the chest-closing animation needs the underlying
        // scene ticking again first.
        if (this.onChestClose) {
            this.onChestClose();
        }
    }
}
