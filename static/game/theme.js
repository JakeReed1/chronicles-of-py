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
        fontSize = 24,
        radius = 10,
        // Callers packing buttons closer together than height/width + 40px
        // (e.g. a compact stacked list) MUST pass a smaller hitSlop, or
        // neighboring buttons' padded hit zones overlap and clicks
        // intermittently resolve to the wrong one - see the spacing
        // comments in MainMenuScene.js/PauseMenuScene.js for the math.
        hitSlop = 20,
        // 'solid' (default) is the flat filled menu-button look used
        // everywhere (main menu, pause, save slots, etc). 'fantasy' is a
        // carved wood-and-bronze RPG menu-box look (dark wood fill, bronze
        // outer frame, a thin gold inner accent line) - used for
        // BattleScene's Run/Help/Clear/History controls so they read as
        // fantasy-RPG UI rather than generic (or neon/cyberpunk) chrome.
        variant = 'solid',
        onClick = () => {}
    } = opts;
    const textColor = opts.textColor || (variant === 'fantasy' ? '#f0d9a8' : TEXT.primary);

    const container = scene.add.container(x, y);

    // The background shape is rexUI's RoundRectangle - a real GameObject
    // with .setFillStyle()/.setStrokeStyle(), instead of a hand-rolled
    // Graphics object manually cleared and redrawn on every hover/click.
    // Positioned/sized as a plain child of `container`, so the outer
    // container (and everything below - hitSlop, click semantics) is
    // completely unchanged from before this migration.
    const bg = scene.rexUI.add.roundRectangle(0, 0, width, height, radius, variant === 'fantasy' ? 0x2b1d12 : fillColor);

    // Feedback is color-only, never a scale/position change on anything
    // connected to the interactive hit area. Scaling the clickable object
    // itself (even a child of it) shifts its effective bounds slightly on
    // every hover/press, which made hover flicker near edges and made
    // clicks unreliable - pure color swaps can never affect hit-testing.
    let drawIdle, drawHover;
    let accents = null;

    if (variant === 'fantasy') {
        const woodIdle = 0x2b1d12;
        const woodHover = 0x3d2a1a;
        const frameOuter = 0x1a0f08;
        const frameInner = 0xd4af37;
        const frameInnerHover = 0xf0c95f;

        // A supplementary Graphics layer for the parts a single
        // fill+stroke RoundRectangle can't express - the inner gold
        // accent line and the small JRPG-menu-box corner dots.
        accents = scene.add.graphics();
        const paintAccents = (innerColor) => {
            accents.clear();
            accents.lineStyle(1.5, innerColor, 1);
            accents.strokeRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, Math.max(2, radius - 4));
            const inset = 6;
            const corners = [
                [-width / 2 + inset, -height / 2 + inset], [width / 2 - inset, -height / 2 + inset],
                [-width / 2 + inset, height / 2 - inset], [width / 2 - inset, height / 2 - inset]
            ];
            accents.fillStyle(innerColor, 1);
            corners.forEach(([cx, cy]) => accents.fillCircle(cx, cy, 1.5));
        };
        drawIdle = () => {
            bg.setFillStyle(woodIdle, 1);
            bg.setStrokeStyle(3, frameOuter, 1);
            paintAccents(frameInner);
        };
        drawHover = () => {
            bg.setFillStyle(woodHover, 1);
            bg.setStrokeStyle(3, frameOuter, 1);
            paintAccents(frameInnerHover);
        };
    } else {
        drawIdle = () => { bg.setFillStyle(fillColor, 1); bg.setStrokeStyle(2, 0xffffff, 0.15); };
        drawHover = () => { bg.setFillStyle(hoverColor, 1); bg.setStrokeStyle(2, 0xffffff, 0.3); };
    }
    drawIdle();

    const text = scene.add.text(0, 0, label, {
        fontSize: fontSize + 'px',
        fontFamily: FONT_FAMILY,
        color: textColor
    }).setOrigin(0.5);

    container.add(accents ? [bg, accents, text] : [bg, text]);
    container.setSize(width, height);

    // The hit area is padded well beyond the visible button on every side
    // ("hit slop") - trackpad clicks physically shift the touch point by a
    // few px right as the click mechanism engages, which is enough to miss
    // a tightly-fitted hit area even though the hover looked fine.
    container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2 - hitSlop, -height / 2 - hitSlop, width + hitSlop * 2, height + hitSlop * 2),
        Phaser.Geom.Rectangle.Contains
    );
    container.input.cursor = 'pointer';

    container.on('pointerover', drawHover);
    container.on('pointerout', drawIdle);
    // Fire on pointerdown, not pointerup - a trackpad's physical click can
    // shift the touch point between down and up, so requiring BOTH to land
    // inside the hit area is stricter than it needs to be for a menu button.
    container.on('pointerdown', () => { drawIdle(); onClick(); });
    container.on('pointerup', drawHover);

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

// A terminal-style code console: an editor (input, top) above a green
// "stdout" output panel (bottom) - the same visual language BattleScene.js
// uses for its Python editor, factored out here so other scenes (the
// inventory console) can get one without duplicating the layout. This is a
// self-contained component with its own typing/cursor/run handling; it
// does not touch or depend on BattleScene.js in any way.
//
// opts: { x, y, width, editorHeight, outputHeight, title, fontSize,
//         initialCode, initialOutput, onRun, canType }
// onRun(code) is called on Ctrl+Enter or the Run button; it should return
// a Promise resolving { success, output, error }.
// Returns { elements, setCode, setOutput, setEnabled, destroy }.
export function createCodeConsole(scene, opts = {}) {
    const {
        x, y, width,
        editorHeight = 220,
        outputHeight = 130,
        title = '>>> Code Editor',
        outputLabel = '>>> Output:',
        fontSize = 20,
        initialCode = '',
        initialOutput = 'Ready...',
        onRun = () => Promise.resolve({ success: true, output: '', error: '' }),
        canType = () => true,
    } = opts;

    const editorY = y;
    const editorTop = editorY - editorHeight / 2;
    const editorPanel = createPanel(scene, x, editorY, width, editorHeight, {
        fillColor: 0x14141f, borderColor: COLORS.accent, borderWidth: 3, radius: 14
    });

    const titleBarHeight = 26;
    const titleBar = scene.add.graphics();
    titleBar.fillStyle(0x0a0a12, 1);
    titleBar.fillRoundedRect(x - width / 2, editorTop, width, titleBarHeight, { tl: 14, tr: 14, bl: 0, br: 0 });
    [0xff5f56, 0xffbd2e, 0x27c93f].forEach((c, i) => {
        titleBar.fillStyle(c, 1);
        titleBar.fillCircle(x - width / 2 + 16 + i * 16, editorTop + titleBarHeight / 2, 5);
    });

    const editorTitle = scene.add.text(x - width / 2 + 60, editorTop + titleBarHeight / 2, title, {
        fontSize: Math.floor(fontSize * 0.7) + 'px', fontFamily: FONT_FAMILY, color: TEXT.accent
    }).setOrigin(0, 0.5);

    const codeTopOffset = titleBarHeight + 14;
    const codeTop = editorTop + codeTopOffset;
    const codeText = scene.add.text(x - width / 2 + 20, codeTop, '', {
        fontSize: fontSize + 'px', fontFamily: FONT_FAMILY, color: TEXT.primary,
        wordWrap: { width: width - 40 }
    });
    const cursor = scene.add.text(x - width / 2 + 20, codeTop, '|', {
        fontSize: fontSize + 'px', fontFamily: FONT_FAMILY, color: TEXT.accent
    });

    const outputY = editorY + editorHeight / 2 + 20 + outputHeight / 2;
    const outputColor = '#33ff99';
    const outputPanel = createPanel(scene, x, outputY, width, outputHeight, {
        fillColor: 0x0f1f18, borderColor: 0x1fae6e, borderWidth: 3, radius: 12
    });
    const outputLabelText = scene.add.text(x - width / 2 + 10, outputY - outputHeight / 2 - 18, outputLabel, {
        fontSize: Math.floor(fontSize * 0.8 * 0.7) + 'px', fontFamily: FONT_FAMILY, color: outputColor
    });
    const pythonOutput = scene.add.text(x, outputY, initialOutput, {
        fontSize: Math.floor(fontSize * 0.8) + 'px', fontFamily: FONT_FAMILY, color: outputColor,
        align: 'left', wordWrap: { width: width - 20 }
    }).setOrigin(0.5);

    const runButton = createButton(scene, x, outputY + outputHeight / 2 + 40, width * 0.3, 44, 'Run Code', {
        fillColor: COLORS.success, hoverColor: COLORS.successHover, fontSize: Math.floor(fontSize * 0.7),
        onClick: () => runCode()
    });

    const state = { userCode: initialCode, cursorPos: initialCode.length, enabled: true };

    function refreshDisplay() {
        codeText.setText(state.userCode);
        const charWidth = fontSize * 0.6;
        const lineHeight = fontSize * 1.3;
        const before = state.userCode.slice(0, state.cursorPos).split('\n');
        const row = before.length - 1;
        const col = before[before.length - 1].length;
        cursor.setPosition(codeText.x + col * charWidth, codeText.y + row * lineHeight);
    }
    refreshDisplay();

    function runCode() {
        if (!state.enabled) return;
        const code = state.userCode.trim();
        if (!code) {
            pythonOutput.setText('No code to run yet!');
            return;
        }
        pythonOutput.setText('Running...');
        Promise.resolve(onRun(code)).then(result => {
            pythonOutput.setText((result && (result.output || result.error)) || 'Done (no output)');
            if (result && result.success) {
                state.userCode = '';
                state.cursorPos = 0;
                refreshDisplay();
            }
        });
    }

    const cursorBlink = scene.time.addEvent({
        delay: 500, loop: true,
        callback: () => cursor.setVisible(!cursor.visible)
    });

    const keydownHandler = (event) => {
        if (!state.enabled || !canType()) return;
        const key = event.key;

        if (key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            runCode();
            return;
        } else if (key === 'Enter') {
            state.userCode = state.userCode.slice(0, state.cursorPos) + '\n' + state.userCode.slice(state.cursorPos);
            state.cursorPos++;
        } else if (key === 'Backspace') {
            if (state.cursorPos > 0) {
                state.userCode = state.userCode.slice(0, state.cursorPos - 1) + state.userCode.slice(state.cursorPos);
                state.cursorPos--;
            }
        } else if (key === 'Delete') {
            state.userCode = state.userCode.slice(0, state.cursorPos) + state.userCode.slice(state.cursorPos + 1);
        } else if (key === 'ArrowLeft') {
            state.cursorPos = Math.max(0, state.cursorPos - 1);
        } else if (key === 'ArrowRight') {
            state.cursorPos = Math.min(state.userCode.length, state.cursorPos + 1);
        } else if (key.length === 1) {
            state.userCode = state.userCode.slice(0, state.cursorPos) + key + state.userCode.slice(state.cursorPos);
            state.cursorPos++;
        } else {
            return;
        }
        refreshDisplay();
    };
    scene.input.keyboard.on('keydown', keydownHandler);

    const elements = [editorPanel, titleBar, editorTitle, codeText, cursor, outputPanel, outputLabelText, pythonOutput, runButton];

    return {
        elements,
        setCode(code) {
            state.userCode = code;
            state.cursorPos = code.length;
            refreshDisplay();
        },
        setOutput(text) {
            pythonOutput.setText(text);
        },
        setEnabled(enabled) {
            state.enabled = enabled;
        },
        destroy() {
            scene.input.keyboard.off('keydown', keydownHandler);
            cursorBlink.remove();
            elements.forEach(el => el.destroy());
        }
    };
}
