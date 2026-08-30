// theme.js - Shared visual language for Chronicles of Py.
// Centralizing colors + common widgets (panels, buttons, bars) keeps every
// scene consistent and avoids re-implementing the same rectangle/text
// boilerplate in each one.

export const COLORS = {
    bgDark: 0x0f0f23,
    bgDarkAlt: 0x1a1a2e,
    panel: 0x1c1c3a,
    panelBorder: 0x3d3d6b,
    panelBorderLit: 0x00e5ff,

    accent: 0x00e5ff,
    gold: 0xFFD700,

    hp: 0x00e676,
    hpLow: 0xff5252,
    mp: 0x2196f3,
    xp: 0xFFD700,
    barTrack: 0x222233,

    success: 0x4CAF50,
    successHover: 0x66BB6A,
    danger: 0xF44336,
    dangerHover: 0xEF5350,
    info: 0x2196F3,
    infoHover: 0x42A5F5,
    warning: 0xFF9800,
    warningHover: 0xFFB74D,
    neutral: 0x3a3a5a,
    neutralHover: 0x4d4d75,
};

export const TEXT = {
    primary: '#ffffff',
    secondary: '#aab0c6',
    muted: '#7a7fa0',
    accent: '#00e5ff',
    gold: '#FFD700',
};

export const FONT_FAMILY = 'monospace';

// A rounded, bordered background panel. Returns the Graphics object in case
// the caller wants to redraw/hide it later.
export function createPanel(scene, x, y, width, height, opts = {}) {
    const {
        fillColor = COLORS.panel,
        fillAlpha = 0.88,
        borderColor = COLORS.panelBorder,
        borderWidth = 2,
        radius = 14
    } = opts;

    const g = scene.add.graphics();
    g.fillStyle(fillColor, fillAlpha);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
    if (borderWidth > 0) {
        g.lineStyle(borderWidth, borderColor, 1);
        g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius);
    }
    return g;
}

// A rounded, clickable button (container of a graphics background + label).
// Returns the container; call .disableInteractive() to lock it if needed.
export function createButton(scene, x, y, width, height, label, opts = {}) {
    const {
        fillColor = COLORS.info,
        hoverColor = COLORS.infoHover,
        textColor = TEXT.primary,
        fontSize = 24,
        radius = 10,
        onClick = () => {}
    } = opts;

    const container = scene.add.container(x, y);
    const bg = scene.add.graphics();

    // Feedback is color-only, never a scale/position change on anything
    // connected to the interactive hit area. Scaling the clickable object
    // itself (even a child of it) shifts its effective bounds slightly on
    // every hover/press, which made hover flicker near edges and made
    // clicks unreliable - pure color swaps can never affect hit-testing.
    const draw = (color) => {
        bg.clear();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
        bg.lineStyle(2, 0xffffff, 0.15);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
    };
    draw(fillColor);

    const text = scene.add.text(0, 0, label, {
        fontSize: fontSize + 'px',
        fontFamily: FONT_FAMILY,
        color: textColor
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(width, height);

    // The hit area is padded well beyond the visible button on every side
    // ("hit slop") - trackpad clicks physically shift the touch point by a
    // few px right as the click mechanism engages, which is enough to miss
    // a tightly-fitted hit area even though the hover looked fine.
    const hitSlop = 20;
    container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2 - hitSlop, -height / 2 - hitSlop, width + hitSlop * 2, height + hitSlop * 2),
        Phaser.Geom.Rectangle.Contains
    );
    container.input.cursor = 'pointer';

    container.on('pointerover', () => draw(hoverColor));
    container.on('pointerout', () => draw(fillColor));
    // Fire on pointerdown, not pointerup - a trackpad's physical click can
    // shift the touch point between down and up, so requiring BOTH to land
    // inside the hit area is stricter than it needs to be for a menu button.
    container.on('pointerdown', () => { draw(fillColor); onClick(); });
    container.on('pointerup', () => draw(hoverColor));

    container.bgGraphic = bg;
    container.labelText = text;
    return container;
}

// A rounded progress bar (track + fill). Returns { setPercent(p) } to update it.
export function createBar(scene, x, y, width, height, color, opts = {}) {
    const { trackColor = COLORS.barTrack, radius = height / 2 } = opts;

    const track = scene.add.graphics();
    track.fillStyle(trackColor, 1);
    track.fillRoundedRect(x, y, width, height, radius);

    const fill = scene.add.graphics();

    const setPercent = (pct) => {
        const clamped = Math.max(0, Math.min(1, pct));
        fill.clear();
        const w = width * clamped;
        if (w <= 1) return;
        fill.fillStyle(color, 1);
        fill.fillRoundedRect(x, y, w, height, Math.min(radius, w / 2));
    };
    setPercent(1);

    return { track, fill, setPercent };
}

// Title text with a soft glow, used on menu/banner headers.
export function createGlowTitle(scene, x, y, label, opts = {}) {
    const { fontSize = 48, color = TEXT.gold, strokeColor = '#000000' } = opts;
    return scene.add.text(x, y, label, {
        fontSize: fontSize + 'px',
        fontFamily: FONT_FAMILY,
        color,
        stroke: strokeColor,
        strokeThickness: 5,
        shadow: { offsetX: 0, offsetY: 0, color, blur: 16, fill: true }
    }).setOrigin(0.5);
}
