// theme.js needs the versioned fetch here too (see InventoryScene.js's
// note) since this file needs createCodeConsole, added after theme.js was
// last known-good in every browser that had it cached.
const themeVersion = window.ASSET_VERSION || Date.now();
const { COLORS, TEXT, createPanel, createButton, createGlowTitle, createCodeConsole } =
    await import(`../../theme.js?v=${themeVersion}`);

const HINT_EXAMPLES = [
    { label: 'Buy a potion', code: 'inventory.append({"name": "Health Potion", "type": "consumable", "quantity": 1})' },
    { label: 'Sell an item', code: 'inventory = [i for i in inventory if i["name"] != "Bronze Key"]' },
    { label: 'Check prices', code: 'for item in shop:\n    print(item["name"], "buy:", item["buy_price"], "sell:", item["sell_price"])' },
];

// ShopScene.js - buy/sell via the same code-console pattern as the
// inventory console (InventoryScene.js), wired to
// /api/execute-shop-code/ instead. Gold and item trades are computed
// entirely server-side from the inventory quantity deltas your code
// produces - see execute_shop_code in apps/battles/api_views.py.
export default class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    init(data) {
        this.returnScene = data.returnScene || 'PrintForestScene';
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0.7);

        createGlowTitle(this, centerX, 50, 'SHOP', { fontSize: 32, color: TEXT.gold });

        this.add.text(centerX, 84, 'Buy/sell by editing `inventory` - added items are bought, removed items are sold', {
            fontSize: '14px', fontFamily: 'monospace', color: TEXT.secondary, align: 'center'
        }).setOrigin(0.5);

        const listPanelX = width * 0.22;
        const listPanelY = height * 0.48;
        const listPanelHeight = height * 0.55;
        createPanel(this, listPanelX, listPanelY, width * 0.36, listPanelHeight, { radius: 14, borderColor: COLORS.gold || COLORS.accent });

        this.listText = this.add.text(listPanelX - width * 0.17, listPanelY - listPanelHeight / 2 + 15, '', {
            fontSize: '14px', fontFamily: 'monospace', color: TEXT.primary,
            wordWrap: { width: width * 0.32 }, lineSpacing: 5
        });
        this.shopCatalog = [];
        this.refreshList();

        this.console = createCodeConsole(this, {
            x: width * 0.68,
            y: height * 0.5,
            width: width * 0.54,
            editorHeight: height * 0.32,
            outputHeight: height * 0.18,
            title: '>>> Shop Console',
            initialOutput: 'Welcome! Browse the shop list on the left, then buy or sell below.',
            onRun: (code) => this.runShopCode(code)
        });

        const closeButton = createButton(this, width - 90, 40, 120, 44, 'Close', {
            fillColor: COLORS.danger, hoverColor: COLORS.dangerHover,
            onClick: () => this.close()
        });

        this.input.keyboard.on('keydown-ESC', () => this.close());

        this.showHint(listPanelX, listPanelY + listPanelHeight / 2 + 25);

        // Load the shop catalog up front with a harmless read-only run, so
        // the list on the left shows real prices immediately rather than
        // waiting for the player's first purchase attempt.
        this.runShopCode('pass').then(() => this.refreshList());
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

    refreshList() {
        const stats = window.gameState.getPlayerStats();
        const items = window.gameState.getInventory();

        const lines = [
            `Gold: ${stats.gold || 0}`,
            '',
            '--- your inventory ---'
        ];
        if (items.length === 0) {
            lines.push('(empty)');
        } else {
            items.forEach(item => lines.push(`${item.name} x${item.quantity}`));
        }

        lines.push('', '--- shop (buy / sell) ---');
        if (this.shopCatalog.length === 0) {
            lines.push('(loading...)');
        } else {
            this.shopCatalog.forEach(item => lines.push(`${item.name}  ${item.buy_price}g / ${item.sell_price}g`));
        }

        this.listText.setText(lines.join('\n'));
    }

    runShopCode(code) {
        return fetch('/api/execute-shop-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN || ''
            },
            body: JSON.stringify({ code })
        })
            .then(response => {
                if (response.redirected && response.url.includes('/login')) {
                    return { success: false, error: 'Please log in (or sign up) to shop - it saves to your real account.' };
                }
                return response.json();
            })
            .then(result => {
                if (result.success) {
                    this.shopCatalog = result.shop || this.shopCatalog;
                    // Shop responses only ever carry {gold} - setInventoryAndStats
                    // only touches fields actually present in the patch, so this
                    // can't clobber attack/defense/etc.
                    window.gameState.setInventoryAndStats(result.inventory, result.player);
                    this.refreshList();
                }
                return result;
            })
            .catch(error => {
                console.error('Error executing shop code:', error);
                return { success: false, error: 'Network error: could not reach the server' };
            });
    }

    close() {
        this.console.destroy();
        this.scene.resume(this.returnScene);
        this.scene.stop();
    }
}
