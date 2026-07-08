/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — PauseMenu.js
 * ============================================================
 * Pause overlay with glassmorphism panel.
 *
 * Visual highlights:
 *  - Blurred dark overlay over the frozen game scene
 *  - Central frosted-glass panel with golden rounded border
 *  - 'PAUSED' title with golden glow
 *  - Vertical menu list with selection pulse
 *  - Player stats and level info displayed elegantly
 *  - Fade-in animation on open
 */

'use strict';

window.PauseMenu = class PauseMenu {
    /**
     * @param {object} engine  GameEngine instance
     */
    constructor(engine) {
        this.engine = engine;

        /** Current highlighted menu index */
        this.selectedItem = 0;

        /** Pause menu options */
        this.items = ['▶  Resume', '↺  Restart Level', '⚙  Settings', '🏠 Main Menu'];

        /** Global anim accumulator */
        this.animTime = 0;

        /** Fade-in alpha (0→1) */
        this.alpha = 0;

        /** Input debounce */
        this._inputCooldown = 0;

        // Mouse bindings
        this.canvas = this.engine.renderer.canvas;
        this.onMouseMove = this._onMouseMove.bind(this);
        this.onMouseClick = this._onMouseClick.bind(this);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('click', this.onMouseClick);
    }

    // ──────────────────────────────────────────────────────────
    // PUBLIC
    // ──────────────────────────────────────────────────────────

    /**
     * Reset state when pause menu is opened.
     */
    open() {
        this.alpha        = 0;
        this.selectedItem = 0;
        this._inputCooldown = 0.15;
    }

    /**
     * Update timers and handle input.
     * @param {number} dt     delta-time seconds
     * @param {object} input  InputManager instance
     */
    update(dt, input) {
        this.animTime += dt;
        this.alpha     = Math.min(1, this.alpha + dt * 5);   // ~0.2 s fade-in

        if (this._inputCooldown > 0) {
            this._inputCooldown -= dt;
            return;
        }

        const up = input.isActionJustPressed
            ? input.isActionJustPressed('up')
            : (input.keys && input.keys['ArrowUp']);
        const down = input.isActionJustPressed
            ? input.isActionJustPressed('down')
            : (input.keys && input.keys['ArrowDown']);
        const confirm = input.isActionJustPressed
            ? (input.isActionJustPressed('jump') || input.isActionJustPressed('action'))
            : (input.keys && (input.keys['Enter'] || input.keys[' ']));
        const esc = input.isActionJustPressed
            ? input.isActionJustPressed('back')
            : (input.keys && input.keys['Escape']);

        if (up) {
            this.selectedItem = (this.selectedItem - 1 + this.items.length) % this.items.length;
            this._inputCooldown = 0.15;
        }
        if (down) {
            this.selectedItem = (this.selectedItem + 1) % this.items.length;
            this._inputCooldown = 0.15;
        }
        if (esc) {
            // ESC always resumes
            if (this.engine && this.engine.resumeGame) this.engine.resumeGame();
            this._inputCooldown = 0.2;
        }
        if (confirm) {
            this._activate();
            this._inputCooldown = 0.25;
        }
    }

    /**
     * Render the pause overlay.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} player  Player instance
     * @param {object} level   Level instance
     */
    render(ctx, player, level) {
        const W = CANVAS_WIDTH;
        const H = CANVAS_HEIGHT;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // ── Dark overlay ─────────────────────────────────────
        ctx.fillStyle = `rgba(0, 0, 0, 0.68)`;
        ctx.fillRect(0, 0, W, H);

        // ── Subtle vignette ──────────────────────────────────
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,30,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // ── Central glass panel ───────────────────────────────
        const panelW = 560;
        const panelH = 490;
        const panelX = W / 2 - panelW / 2;
        const panelY = H / 2 - panelH / 2;
        this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH);

        // ── PAUSED title ──────────────────────────────────────
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur  = 24 * (0.7 + 0.3 * Math.abs(Math.sin(this.animTime * 1.5)));
        this._drawStrokeText(ctx, 'PAUSED', W / 2, panelY + 52, 44, '#FFD700', '#4A3000');
        ctx.shadowBlur = 0;
        ctx.restore();

        // Decorative divider
        this._drawDivider(ctx, panelX + 30, panelY + 64, panelW - 60);

        // ── Menu items ────────────────────────────────────────
        const menuStartY = panelY + 95;
        for (let i = 0; i < this.items.length; i++) {
            const iy  = menuStartY + i * 52;
            const sel = i === this.selectedItem;
            this._drawMenuItem(ctx, this.items[i], W / 2, iy, sel);
        }

        // Divider
        this._drawDivider(ctx, panelX + 30, menuStartY + this.items.length * 52 + 6, panelW - 60);

        // ── Stats panel ───────────────────────────────────────
        const statsY = menuStartY + this.items.length * 52 + 28;
        if (player && level) {
            this._drawStats(ctx, player, level, panelX + 24, statsY, panelW - 48);
        }

        // ── Controls hint ─────────────────────────────────────
        ctx.font      = '12px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(180,180,180,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('↑↓ Navigate   ↵ Confirm   Esc Resume', W / 2, panelY + panelH - 12);

        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE — DRAWING
    // ──────────────────────────────────────────────────────────

    /** Frosted-glass panel with rounded corners. */
    _drawGlassPanel(ctx, x, y, w, h) {
        ctx.save();

        // Drop shadow
        ctx.shadowColor  = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur   = 40;
        ctx.shadowOffsetY = 8;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 20);

        // Multi-stop gradient fill (deep indigo/navy frosted glass)
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0,   'rgba(20, 14, 70, 0.88)');
        grad.addColorStop(0.5, 'rgba(12, 8,  50, 0.92)');
        grad.addColorStop(1,   'rgba(8,  4,  35, 0.96)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 0;

        // Golden border
        ctx.strokeStyle = 'rgba(255,215,0,0.60)';
        ctx.lineWidth   = 2.2;
        ctx.stroke();

        // Inner highlight top edge
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 18);
        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        ctx.restore();
    }

    /** Horizontal golden divider line. */
    _drawDivider(ctx, x, y, w) {
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0,   'rgba(255,215,0,0)');
        grad.addColorStop(0.15, 'rgba(255,215,0,0.5)');
        grad.addColorStop(0.85, 'rgba(255,215,0,0.5)');
        grad.addColorStop(1,   'rgba(255,215,0,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
    }

    /** Draw a single menu item row. */
    _drawMenuItem(ctx, text, cx, y, selected) {
        const size   = selected ? 28 : 22;
        const color  = selected ? '#FFD700' : '#DDEEFF';
        const outline = selected ? '#5A2D00' : '#111133';
        const scale  = selected
            ? 1 + 0.04 * Math.abs(Math.sin(this.animTime * 5))
            : 1;

        ctx.save();
        ctx.translate(cx, y);
        ctx.scale(scale, scale);

        if (selected) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur  = 14;
        }

        // Selection highlight pill
        if (selected) {
            ctx.beginPath();
            ctx.roundRect(-200, -size * 0.9, 400, size * 1.5, 8);
            ctx.fillStyle = 'rgba(255,215,0,0.10)';
            ctx.fill();
        }

        ctx.font        = `bold ${size}px "Segoe UI", sans-serif`;
        ctx.textAlign   = 'center';
        ctx.lineJoin    = 'round';
        ctx.lineWidth   = size * 0.14;
        ctx.strokeStyle = outline;
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle   = color;
        ctx.fillText(text, 0, 0);
        ctx.shadowBlur  = 0;

        // Selection arrows
        if (selected) {
            const ax = 170 + 4 * Math.abs(Math.sin(this.animTime * 7));
            ctx.font      = 'bold 20px sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('◄', -ax, 2);
            ctx.fillText('►',  ax, 2);
        }

        ctx.restore();
    }

    /** Draw player stats and level info. */
    _drawStats(ctx, player, level, x, y, w) {
        const col1 = x;
        const col2 = x + w / 2;

        // Title label
        ctx.font      = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,215,0,0.6)';
        ctx.textAlign = 'left';
        ctx.fillText('PLAYER', col1, y);
        ctx.fillText('LEVEL', col2, y);
        y += 18;

        const rows1 = [
            ['❤  Health',  `${player.health || 0} / ${PLAYER.MAX_HEALTH}`],
            ['♥  Lives',   `${player.lives  || 0}`],
            ['🏅 Score',   `${(player.score || 0).toLocaleString()}`],
            ['💰 Coins',   `${(player.coins || 0).toLocaleString()}`],
            ['💎 Gems',    `${(player.gems  || 0).toLocaleString()}`],
        ];

        const mins = Math.floor((level.timer || 0) / 60);
        const secs = Math.floor((level.timer || 0) % 60).toString().padStart(2, '0');
        const rows2 = [
            ['📋 Name',    level.name  || 'Level 1'],
            ['⏱ Time',    `${mins}:${secs}`],
            ['🔑 Secrets', `${level.secretsFound || 0} / ${level.totalSecrets || 0}`],
            ['👾 Enemies', `${level.enemiesDefeated || 0}`],
        ];

        const lineH = 22;
        ctx.font = '13px "Segoe UI", sans-serif';

        for (let i = 0; i < Math.max(rows1.length, rows2.length); i++) {
            const ry = y + i * lineH;
            if (rows1[i]) {
                ctx.fillStyle = 'rgba(200,220,255,0.75)';
                ctx.textAlign = 'left';
                ctx.fillText(rows1[i][0], col1, ry);
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'right';
                ctx.fillText(rows1[i][1], col2 - 16, ry);
            }
            if (rows2[i]) {
                ctx.fillStyle = 'rgba(200,220,255,0.75)';
                ctx.textAlign = 'left';
                ctx.fillText(rows2[i][0], col2, ry);
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'right';
                ctx.fillText(rows2[i][1], col2 + w / 2, ry);
            }
        }
    }

    _drawStrokeText(ctx, text, x, y, size, color, outline = '#000', align = 'center') {
        ctx.font        = `bold ${size}px "Segoe UI", "Arial Rounded MT Bold", sans-serif`;
        ctx.textAlign   = align;
        ctx.lineJoin    = 'round';
        ctx.lineWidth   = Math.max(2, size * 0.14);
        ctx.strokeStyle = outline;
        ctx.strokeText(text, x, y);
        ctx.fillStyle   = color;
        ctx.fillText(text, x, y);
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE — INPUT
    // ──────────────────────────────────────────────────────────

    _activate() {
        switch (this.selectedItem) {
            case 0: // Resume
                if (this.engine && this.engine.resumeGame) this.engine.resumeGame();
                break;
            case 1: // Restart Level
                if (this.engine && this.engine.restartLevel) this.engine.restartLevel();
                break;
            case 2: // Settings
                if (this.engine) this.engine.setState(STATE.SETTINGS);
                break;
            case 3: // Main Menu
                if (this.engine && this.engine.exitToMenu) this.engine.exitToMenu();
                break;
        }
    }

    _onMouseMove(e) {
        if (this.engine.state !== STATE.PAUSED) return;

        const pos = this._getCanvasMousePos(e);
        const panelY = CANVAS_HEIGHT / 2 - 245;
        const menuStartY = panelY + 95;
        
        for (let i = 0; i < this.items.length; i++) {
            const iy = menuStartY + i * 52;
            if (pos.x >= CANVAS_WIDTH / 2 - 140 && pos.x <= CANVAS_WIDTH / 2 + 140 &&
                pos.y >= iy - 20 && pos.y <= iy + 20) {
                if (this.selectedItem !== i) {
                    this.selectedItem = i;
                    if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                }
                break;
            }
        }
    }

    _onMouseClick(e) {
        if (this.engine.state !== STATE.PAUSED) return;

        const pos = this._getCanvasMousePos(e);
        const panelY = CANVAS_HEIGHT / 2 - 245;
        const menuStartY = panelY + 95;
        
        for (let i = 0; i < this.items.length; i++) {
            const iy = menuStartY + i * 52;
            if (pos.x >= CANVAS_WIDTH / 2 - 140 && pos.x <= CANVAS_WIDTH / 2 + 140 &&
                pos.y >= iy - 20 && pos.y <= iy + 20) {
                this.selectedItem = i;
                if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                this._activate();
                break;
            }
        }
    }

    _getCanvasMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
        return { x, y };
    }
};
