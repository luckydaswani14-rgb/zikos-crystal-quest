/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Menu.js
 * ============================================================
 * Main menu screen — drawn entirely on canvas.
 *
 * Visual highlights:
 *  - Animated parallax sky gradient (deep blue → indigo/purple)
 *  - Layered rolling hills with stars twinkling above
 *  - Floating clouds drifting left-to-right
 *  - Decorative coin/gem/crystal particles orbiting the title
 *  - Giant golden "ZIKO'S CRYSTAL QUEST" title with glow + bounce
 *  - Waving Ziko character beside the title
 *  - Glassmorphism menu panel
 *  - Animated selection arrows + scale pulse on selected item
 *  - Save-slot selector overlay
 */

'use strict';

window.Menu = class Menu {
    /**
     * @param {object} engine  GameEngine instance
     */
    constructor(engine) {
        this.engine = engine;

        /** Currently highlighted menu index */
        this.selectedItem = 0;

        /** Menu option labels */
        this.menuItems = ['▶  Play', '↺  Continue', '⚙  Settings', '🏆 Achievements', 'ℹ  About'];

        /** Global anim accumulator */
        this.animTime = 0;

        /** Title vertical bounce phase */
        this.titleBounce = 0;

        /** Decorative background particles (coins, stars, gems) */
        this.bgParticles = this._createParticles(48);

        /** Title glow intensity (0–1 pulsing) */
        this.logoGlow = 0;

        /** Cloud positions — each: {x, y, speed, scale} */
        this.cloudPositions = this._createClouds(7);

        /** Show the save-slot selector? */
        this.showSaveSlots = false;

        /** 3 save slot infos */
        this.saveSlots = [
            { id: 0, label: 'Slot 1', world: 0, level: 0, score: 0, empty: true },
            { id: 1, label: 'Slot 2', world: 0, level: 0, score: 0, empty: true },
            { id: 2, label: 'Slot 3', world: 0, level: 0, score: 0, empty: true },
        ];

        /** Save slot selection index */
        this._slotIndex      = 0;
        /** Input debounce timer */
        this._inputCooldown  = 0;

        /** Orbiting crystals around the title */
        this._orbitAngle     = 0;

        /** Ziko wave animation phase */
        this._wavePhase      = 0;

        /** Stars array for twinkling */
        this._stars          = this._createStars(80);

        // Load save slots from engine if available
        this._loadSaveSlots();

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
     * Update animations and handle input.
     * @param {number} dt     delta-time seconds
     * @param {object} input  InputManager instance
     */
    update(dt, input) {
        this.animTime    += dt;
        this.titleBounce  = Math.sin(this.animTime * 1.8) * 8;
        this.logoGlow     = 0.6 + 0.4 * Math.abs(Math.sin(this.animTime * 1.2));
        this._orbitAngle += dt * 0.7;
        this._wavePhase  += dt * 3.5;

        // Clouds
        for (const c of this.cloudPositions) {
            c.x += c.speed * dt;
            if (c.x > CANVAS_WIDTH + 200) c.x = -220;
        }

        // Bg particles
        for (const p of this.bgParticles) {
            p.y -= p.vy * dt;
            p.x += p.vx * dt;
            p.rot += p.rotSpeed * dt;
            p.alpha = 0.5 + 0.5 * Math.sin(this.animTime * p.pulse + p.phase);
            if (p.y < -20) {
                p.y = CANVAS_HEIGHT + 10;
                p.x = rnd(0, CANVAS_WIDTH);
            }
        }

        // Stars twinkle
        for (const s of this._stars) {
            s.twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this.animTime * s.speed + s.phase));
        }

        // Input debounce
        if (this._inputCooldown > 0) {
            this._inputCooldown -= dt;
            return;
        }

        if (this.showSaveSlots) {
            this._handleSlotInput(input);
            return;
        }

        this._handleMenuInput(input);
    }

    /**
     * Render the main menu.
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const W = CANVAS_WIDTH;
        const H = CANVAS_HEIGHT;

        // ── Sky gradient background ──────────────────────────
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0.00, '#0A0A2E');
        skyGrad.addColorStop(0.30, '#1A1A6E');
        skyGrad.addColorStop(0.60, '#2D1B69');
        skyGrad.addColorStop(0.85, '#3D2C8A');
        skyGrad.addColorStop(1.00, '#1B5E20');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // ── Stars ────────────────────────────────────────────
        this._drawStars(ctx);

        // ── Clouds ───────────────────────────────────────────
        this._drawClouds(ctx);

        // ── Parallax hills ───────────────────────────────────
        this._drawHills(ctx);

        // ── Decorative background particles ──────────────────
        this._drawDecoParticles(ctx);

        // ── Title logo area ──────────────────────────────────
        const titleY = 155 + this.titleBounce;
        this._drawTitle(ctx, W / 2, titleY);

        // ── Waving Ziko character ────────────────────────────
        this._drawZikoCharacter(ctx, W / 2 + 320, titleY - 20);

        // ── Orbiting crystals ────────────────────────────────
        this._drawOrbitingCrystals(ctx, W / 2, titleY - 10);

        // ── Menu panel ───────────────────────────────────────
        const panelX = W / 2 - 220;
        const panelY = 290;
        const panelW = 440;
        const panelH = this.menuItems.length * 64 + 36;
        this._drawMenuPanel(ctx, panelX, panelY, panelW, panelH);

        // ── Menu items ───────────────────────────────────────
        for (let i = 0; i < this.menuItems.length; i++) {
            const iy = panelY + 38 + i * 64;
            this._drawOption(ctx, this.menuItems[i], W / 2, iy, i === this.selectedItem);
        }

        // ── Save slot overlay ────────────────────────────────
        if (this.showSaveSlots) {
            this._drawSaveSlotSelector(ctx);
        }

        // ── Bottom bar ───────────────────────────────────────
        this._drawBottomBar(ctx, W, H);
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE — DRAWING
    // ──────────────────────────────────────────────────────────

    /** Draw twinkling stars in the upper portion of the screen. */
    _drawStars(ctx) {
        for (const s of this._stars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * s.twinkle, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.twinkle * 0.9})`;
            ctx.fill();
        }
    }

    /** Draw slowly drifting clouds. */
    _drawClouds(ctx) {
        for (const c of this.cloudPositions) {
            ctx.save();
            ctx.globalAlpha = 0.18 * c.alpha;
            ctx.translate(c.x, c.y);
            ctx.scale(c.scale, c.scale * 0.65);
            ctx.fillStyle = '#FFFFFF';
            // Puff cloud shape
            for (const [dx, dy, r] of [[0, 0, 38], [-30, 8, 28], [30, 8, 28], [-15, -10, 22], [15, -10, 24]]) {
                ctx.beginPath();
                ctx.arc(dx, dy, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    /** Draw layered parallax hills at the bottom. */
    _drawHills(ctx) {
        const W = CANVAS_WIDTH;
        const H = CANVAS_HEIGHT;
        const t = this.animTime;

        // Far hills (darker, slow scroll)
        this._drawHillLayer(ctx, W, H,
            H * 0.72, 180, 0.015, t * 6,
            'rgba(20,60,20,0.7)', 'rgba(10,40,10,0.8)');
        // Mid hills
        this._drawHillLayer(ctx, W, H,
            H * 0.78, 130, 0.020, t * 12,
            'rgba(34,85,34,0.85)', 'rgba(15,55,15,0.9)');
        // Near hills (lighter green)
        this._drawHillLayer(ctx, W, H,
            H * 0.83, 90, 0.028, t * 18,
            '#2E7D32', '#1B5E20');
    }

    /** Generic hill layer renderer. */
    _drawHillLayer(ctx, W, H, baseY, amplitude, freq, offset, fillTop, fillBot) {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
            const y = baseY - amplitude * Math.sin((x * freq) + offset)
                             - amplitude * 0.4 * Math.sin((x * freq * 1.7) + offset * 0.6);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, baseY - amplitude, 0, H);
        g.addColorStop(0, fillTop);
        g.addColorStop(1, fillBot);
        ctx.fillStyle = g;
        ctx.fill();
    }

    /** Draw the giant game title. */
    _drawTitle(ctx, cx, cy) {
        const glow = this.logoGlow;

        // Outer glow layers
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur  = 60 * glow;

        // Gradient text fill
        const grad = ctx.createLinearGradient(cx - 360, cy - 60, cx + 360, cy + 10);
        grad.addColorStop(0.00, '#FFF176');
        grad.addColorStop(0.30, '#FFD700');
        grad.addColorStop(0.55, '#FF8F00');
        grad.addColorStop(0.80, '#FFD700');
        grad.addColorStop(1.00, '#FFF176');

        // Line 1: ZIKO'S
        ctx.font         = 'bold 68px "Segoe UI", "Arial Rounded MT Bold", Impact, sans-serif';
        ctx.textAlign    = 'center';
        ctx.lineJoin     = 'round';
        ctx.lineWidth    = 10;
        ctx.strokeStyle  = '#3A1700';
        ctx.strokeText("ZIKO'S", cx, cy - 38);
        ctx.fillStyle    = grad;
        ctx.fillText("ZIKO'S", cx, cy - 38);

        // Line 2: CRYSTAL QUEST (bigger)
        ctx.font         = 'bold 86px "Segoe UI", "Arial Rounded MT Bold", Impact, sans-serif';
        ctx.lineWidth    = 12;
        ctx.strokeText('CRYSTAL QUEST', cx, cy + 52);
        ctx.fillStyle    = grad;
        ctx.fillText('CRYSTAL QUEST', cx, cy + 52);

        ctx.shadowBlur = 0;
        ctx.restore();

        // Decorative underline
        const lineGrad = ctx.createLinearGradient(cx - 260, 0, cx + 260, 0);
        lineGrad.addColorStop(0,   'rgba(255,215,0,0)');
        lineGrad.addColorStop(0.2, '#FFD700');
        lineGrad.addColorStop(0.8, '#FF8F00');
        lineGrad.addColorStop(1,   'rgba(255,215,0,0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 260, cy + 68);
        ctx.lineTo(cx + 260, cy + 68);
        ctx.stroke();
    }

    /** Draw the Ziko character waving animation near the title. */
    _drawZikoCharacter(ctx, x, y) {
        const wave = Math.sin(this._wavePhase) * 0.35;
        const scale = 2.2;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Body
        ctx.beginPath();
        ctx.roundRect(-8, -10, 16, 22, 3);
        ctx.fillStyle = COLORS.ZIKO_SHIRT;
        ctx.fill();

        // Shorts
        ctx.beginPath();
        ctx.rect(-8, 8, 16, 10);
        ctx.fillStyle = COLORS.ZIKO_SHORTS;
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, -18, 12, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.fill();
        ctx.strokeStyle = '#8D4800';
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        // Hair
        ctx.beginPath();
        ctx.arc(0, -22, 10, Math.PI, 0);
        ctx.fillStyle = COLORS.ZIKO_HAIR;
        ctx.fill();

        // Eyes
        for (const ex of [-4, 4]) {
            ctx.beginPath();
            ctx.arc(ex, -18, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.ZIKO_EYE;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex + 0.5, -18, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.ZIKO_PUPIL;
            ctx.fill();
        }

        // Smile
        ctx.beginPath();
        ctx.arc(0, -15, 4, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = '#8D4800';
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Left arm (resting)
        ctx.beginPath();
        ctx.moveTo(-8, -6);
        ctx.lineTo(-16, 4);
        ctx.strokeStyle = COLORS.ZIKO_SKIN;
        ctx.lineWidth   = 3.5;
        ctx.lineCap     = 'round';
        ctx.stroke();

        // Right arm (waving)
        ctx.save();
        ctx.translate(8, -6);
        ctx.rotate(wave - 0.8);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, -10);
        ctx.strokeStyle = COLORS.ZIKO_SKIN;
        ctx.lineWidth   = 3.5;
        ctx.stroke();
        // Hand
        ctx.beginPath();
        ctx.arc(10, -10, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.fill();
        ctx.restore();

        // Shoes
        for (const sx of [-5, 3]) {
            ctx.beginPath();
            ctx.roundRect(sx, 18, 8, 5, 2);
            ctx.fillStyle = COLORS.ZIKO_SHOES;
            ctx.fill();
        }

        ctx.restore();
    }

    /** Draw small crystals orbiting the title. */
    _drawOrbitingCrystals(ctx, cx, cy) {
        const count  = 6;
        const radius = 250;
        for (let i = 0; i < count; i++) {
            const angle = this._orbitAngle + (i / count) * Math.PI * 2;
            const ox    = cx + Math.cos(angle) * radius;
            const oy    = cy + Math.sin(angle) * (radius * 0.22);
            const size  = 10 + 4 * Math.sin(angle * 2 + this.animTime);

            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(angle + this.animTime * 1.5);

            // Crystal diamond shape
            const gemColors = ['#B2EBF2', '#FFD700', '#CE93D8', '#80CBC4', '#FF8A65', '#A5D6A7'];
            const col       = gemColors[i % gemColors.length];
            ctx.shadowColor = col;
            ctx.shadowBlur  = 10;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.5, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.5, 0);
            ctx.closePath();
            const g = ctx.createLinearGradient(0, -size, 0, size);
            g.addColorStop(0, '#fff');
            g.addColorStop(0.5, col);
            g.addColorStop(1, '#333');
            ctx.fillStyle   = g;
            ctx.fill();
            ctx.shadowBlur  = 0;
            ctx.restore();
        }
    }

    /** Draw the glassmorphism menu panel background. */
    _drawMenuPanel(ctx, x, y, w, h) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 18);

        // Frosted glass fill
        const panelGrad = ctx.createLinearGradient(x, y, x, y + h);
        panelGrad.addColorStop(0, 'rgba(20, 10, 60, 0.72)');
        panelGrad.addColorStop(1, 'rgba(10, 5, 40, 0.80)');
        ctx.fillStyle = panelGrad;
        ctx.fill();

        // Golden border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Inner highlight
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 16);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw a single menu option.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string}  text
     * @param {number}  x        center x
     * @param {number}  y        center y
     * @param {boolean} selected
     */
    _drawOption(ctx, text, x, y, selected) {
        const scale  = selected ? 1 + 0.04 * Math.abs(Math.sin(this.animTime * 4)) : 1;
        const size   = selected ? 30 : 24;
        const color  = selected ? '#FFD700' : '#DDEEFF';
        const outline = selected ? '#6B3A00' : '#1A237E';

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        if (selected) {
            // Selection glow
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur  = 16;
        }

        // Draw text
        ctx.font         = `bold ${size}px "Segoe UI", "Arial Rounded MT Bold", sans-serif`;
        ctx.textAlign    = 'center';
        ctx.lineJoin     = 'round';
        ctx.lineWidth    = size * 0.15;
        ctx.strokeStyle  = outline;
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle    = color;
        ctx.fillText(text, 0, 0);
        ctx.shadowBlur   = 0;

        // Arrow indicators for selected item
        if (selected) {
            const arrowX  = 185;
            const arrowPulse = 6 + 4 * Math.abs(Math.sin(this.animTime * 6));
            ctx.font         = `bold 26px sans-serif`;
            ctx.fillStyle    = '#FFD700';
            ctx.textAlign    = 'center';
            ctx.shadowColor  = '#FFD700';
            ctx.shadowBlur   = 10;
            ctx.fillText('◄', -arrowX - arrowPulse, 2);
            ctx.fillText('►', arrowX + arrowPulse, 2);
            ctx.shadowBlur   = 0;
        }

        // Separator line below (except last)
        if (!selected) {
            const lineAlpha = 0.12;
            ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(-160, 16);
            ctx.lineTo(160,  16);
            ctx.stroke();
        }

        ctx.restore();
    }

    /** Draw decorative floating background particles. */
    _drawDecoParticles(ctx) {
        for (const p of this.bgParticles) {
            ctx.save();
            ctx.globalAlpha = p.alpha * 0.75;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(p.scale, p.scale);

            if (p.type === 'coin') {
                // Mini coin
                const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
                g.addColorStop(0, '#FFEE58');
                g.addColorStop(1, '#F57F17');
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();
            } else if (p.type === 'gem') {
                // Mini gem
                const cols = ['#80D8FF', '#CE93D8', '#A5D6A7', '#FFAB91'];
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.lineTo(6, 0);
                ctx.lineTo(0, 8);
                ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.fillStyle = cols[p.colorIdx % cols.length];
                ctx.fill();
            } else {
                // Star sparkle
                this._drawSparkle(ctx, 0, 0, 6);
            }
            ctx.restore();
        }
    }

    /** Draw a 4-point sparkle star. */
    _drawSparkle(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist  = i % 2 === 0 ? r : r * 0.4;
            const px    = x + Math.cos(angle) * dist;
            const py    = y + Math.sin(angle) * dist;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#FFF8DC';
        ctx.fill();
    }

    /** Draw the save slot selection overlay. */
    _drawSaveSlotSelector(ctx) {
        const W = CANVAS_WIDTH;
        const H = CANVAS_HEIGHT;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, W, H);

        const panelW = 680;
        const panelH = 320;
        const panelX = W / 2 - panelW / 2;
        const panelY = H / 2 - panelH / 2;

        // Panel
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 18);
        const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
        grad.addColorStop(0, 'rgba(10,20,60,0.95)');
        grad.addColorStop(1, 'rgba(5,10,40,0.98)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.restore();

        // Title
        this._drawStrokeText(ctx, 'SELECT SAVE SLOT', W / 2, panelY + 44, 26, '#FFD700', '#4A3000');

        // Slots
        const slotW  = 180;
        const slotH  = 160;
        const startX = W / 2 - (slotW * 1.5 + 20);

        for (let i = 0; i < 3; i++) {
            const slot    = this.saveSlots[i];
            const sx      = startX + i * (slotW + 20);
            const sy      = panelY + 72;
            const isSel   = i === this._slotIndex;

            // Slot card
            ctx.save();
            if (isSel) {
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur  = 18;
            }
            ctx.beginPath();
            ctx.roundRect(sx, sy, slotW, slotH, 12);
            ctx.fillStyle = isSel
                ? 'rgba(255,215,0,0.20)'
                : 'rgba(255,255,255,0.06)';
            ctx.fill();
            ctx.strokeStyle = isSel ? '#FFD700' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth   = isSel ? 2.5 : 1;
            ctx.stroke();
            ctx.shadowBlur  = 0;
            ctx.restore();

            // Slot number
            this._drawStrokeText(ctx, slot.label, sx + slotW / 2, sy + 30, 17, '#FFF', '#333');

            if (slot.empty) {
                this._drawStrokeText(ctx, '— Empty —', sx + slotW / 2, sy + 80, 13, '#888', '#222');
                this._drawStrokeText(ctx, 'New Game', sx + slotW / 2, sy + 110, 13, '#66BB6A', '#1B5E20');
            } else {
                this._drawStrokeText(ctx, `World ${slot.world}`, sx + slotW / 2, sy + 60, 12, '#90CAF9', '#0D47A1');
                this._drawStrokeText(ctx, `Level ${slot.level}`, sx + slotW / 2, sy + 78, 12, '#A5D6A7', '#1B5E20');
                this._drawStrokeText(ctx, `Score: ${slot.score.toLocaleString()}`, sx + slotW / 2, sy + 96, 11, '#FFD700', '#6B3A00');
            }

            if (isSel) {
                this._drawStrokeText(ctx, '▼ Select', sx + slotW / 2, sy + slotH - 14, 12, '#FFD700', '#6B3A00');
            }
        }

        // Hint
        this._drawStrokeText(ctx, '← → Navigate   ↵ Select   Esc Cancel', W / 2, panelY + panelH - 16, 13, '#9E9E9E', '#333');
    }

    /** Draw bottom version and controls hint bar. */
    _drawBottomBar(ctx, W, H) {
        // Translucent strip
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, H - 36, W, 36);

        ctx.font      = '13px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(200,200,200,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText("v1.0.0  |  Ziko's Crystal Quest", 16, H - 12);

        ctx.textAlign = 'right';
        ctx.fillText('↑↓ Navigate   Enter/Space Confirm   Esc Back', W - 16, H - 12);
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE — INPUT HANDLING
    // ──────────────────────────────────────────────────────────

    _handleMenuInput(input) {
        const up    = input.isActionJustPressed ? input.isActionJustPressed('up')    : (input.keys && input.keys['ArrowUp']);
        const down  = input.isActionJustPressed ? input.isActionJustPressed('down')  : (input.keys && input.keys['ArrowDown']);
        const confirm = input.isActionJustPressed
            ? (input.isActionJustPressed('jump') || input.isActionJustPressed('action'))
            : (input.keys && (input.keys['Enter'] || input.keys[' ']));

        if (up) {
            this.selectedItem = (this.selectedItem - 1 + this.menuItems.length) % this.menuItems.length;
            this._inputCooldown = 0.18;
        }
        if (down) {
            this.selectedItem = (this.selectedItem + 1) % this.menuItems.length;
            this._inputCooldown = 0.18;
        }
        if (confirm) {
            this._activateSelected();
            this._inputCooldown = 0.25;
        }
    }

    _handleSlotInput(input) {
        const left  = input.isActionJustPressed ? input.isActionJustPressed('left')  : (input.keys && input.keys['ArrowLeft']);
        const right = input.isActionJustPressed ? input.isActionJustPressed('right') : (input.keys && input.keys['ArrowRight']);
        const esc   = input.isActionJustPressed ? input.isActionJustPressed('back')  : (input.keys && input.keys['Escape']);
        const confirm = input.isActionJustPressed
            ? (input.isActionJustPressed('jump') || input.isActionJustPressed('action'))
            : (input.keys && (input.keys['Enter'] || input.keys[' ']));

        if (left) {
            this._slotIndex = (this._slotIndex - 1 + 3) % 3;
            this._inputCooldown = 0.18;
        }
        if (right) {
            this._slotIndex = (this._slotIndex + 1) % 3;
            this._inputCooldown = 0.18;
        }
        if (esc) {
            this.showSaveSlots   = false;
            this._inputCooldown  = 0.2;
        }
        if (confirm) {
            // Load from selected slot
            if (this.engine && this.engine.loadGame) {
                this.engine.loadGame(this._slotIndex);
            } else if (this.engine && this.engine.startGame) {
                this.engine.startGame();
            }
            this._inputCooldown = 0.3;
        }
    }

    _activateSelected() {
        switch (this.selectedItem) {
            case 0: // Play
                if (this.engine && this.engine.startGame) {
                    this.engine.startGame();
                } else if (this.engine) {
                    this.engine.setState(STATE.MODE_SELECT);
                }
                break;
            case 1: // Continue
                this._loadSaveSlots();
                this.showSaveSlots  = true;
                this._slotIndex     = 0;
                break;
            case 2: // Settings
                if (this.engine) this.engine.setState(STATE.SETTINGS);
                break;
            case 3: // Achievements
                if (this.engine) this.engine.setState(STATE.ACHIEVEMENTS);
                break;
            case 4: // About
                // Show about dialog — handled by engine or show message
                if (this.engine && this.engine.showAbout) this.engine.showAbout();
                break;
        }
    }

    _loadSaveSlots() {
        if (!this.engine || !this.engine.save) return;
        for (let i = 0; i < 3; i++) {
            const data = this.engine.save.loadSlot ? this.engine.save.loadSlot(i) : null;
            if (data) {
                this.saveSlots[i] = {
                    id   : i,
                    label: `Slot ${i + 1}`,
                    world: data.world  || 1,
                    level: data.level  || 1,
                    score: data.score  || 0,
                    empty: false,
                };
            } else {
                this.saveSlots[i] = { id: i, label: `Slot ${i + 1}`, world: 0, level: 0, score: 0, empty: true };
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE — FACTORIES
    // ──────────────────────────────────────────────────────────

    _createParticles(count) {
        const types = ['coin', 'gem', 'star'];
        return Array.from({ length: count }, (_, i) => ({
            x        : rnd(0, CANVAS_WIDTH),
            y        : rnd(0, CANVAS_HEIGHT),
            vy       : rnd(18, 55),
            vx       : rnd(-12, 12),
            rot      : rnd(0, Math.PI * 2),
            rotSpeed : rnd(-1.5, 1.5),
            scale    : rnd(0.5, 1.4),
            alpha    : rnd(0.2, 0.8),
            pulse    : rnd(0.8, 2.5),
            phase    : rnd(0, Math.PI * 2),
            type     : types[i % types.length],
            colorIdx : i,
        }));
    }

    _createClouds(count) {
        return Array.from({ length: count }, () => ({
            x    : rnd(-200, CANVAS_WIDTH + 100),
            y    : rnd(40, CANVAS_HEIGHT * 0.45),
            speed: rnd(12, 35),
            scale: rnd(0.6, 1.8),
            alpha: rnd(0.5, 1.0),
        }));
    }

    _createStars(count) {
        return Array.from({ length: count }, () => ({
            x      : rnd(0, CANVAS_WIDTH),
            y      : rnd(0, CANVAS_HEIGHT * 0.60),
            r      : rnd(0.5, 2.5),
            speed  : rnd(0.8, 3.0),
            phase  : rnd(0, Math.PI * 2),
            twinkle: 1,
        }));
    }

    /** Outlined text helper (same as HUD). */
    _drawStrokeText(ctx, text, x, y, size, color, outlineColor = '#000', align = 'center') {
        ctx.font      = `bold ${size}px "Segoe UI", "Arial Rounded MT Bold", sans-serif`;
        ctx.textAlign = align;
        ctx.lineJoin  = 'round';
        ctx.lineWidth = Math.max(2, size * 0.15);
        ctx.strokeStyle = outlineColor;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    _onMouseMove(e) {
        if (this.engine.state !== STATE.MENU || this.showSaveSlots) return;

        const pos = this._getCanvasMousePos(e);
        const panelY = 290;
        
        for (let i = 0; i < this.menuItems.length; i++) {
            const iy = panelY + 38 + i * 64;
            if (pos.x >= CANVAS_WIDTH / 2 - 160 && pos.x <= CANVAS_WIDTH / 2 + 160 &&
                pos.y >= iy - 24 && pos.y <= iy + 24) {
                if (this.selectedItem !== i) {
                    this.selectedItem = i;
                    if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                }
                break;
            }
        }
    }

    _onMouseClick(e) {
        if (this.engine.state !== STATE.MENU) return;

        const pos = this._getCanvasMousePos(e);

        if (this.showSaveSlots) {
            const panelY = (CANVAS_HEIGHT / 2) - 160;
            const slotW = 180;
            const slotH = 160;
            const startX = CANVAS_WIDTH / 2 - (slotW * 1.5 + 20);
            
            for (let i = 0; i < 3; i++) {
                const sx = startX + i * (slotW + 20);
                const sy = panelY + 72;
                if (pos.x >= sx && pos.x <= sx + slotW && pos.y >= sy && pos.y <= sy + slotH) {
                    this._slotIndex = i;
                    if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                    if (this.engine.loadGame) {
                        this.engine.loadGame(i);
                    }
                    return;
                }
            }

            // Click outside to cancel
            const panelW = 680;
            const panelH = 320;
            const panelX = CANVAS_WIDTH / 2 - panelW / 2;
            if (pos.x < panelX || pos.x > panelX + panelW || pos.y < panelY || pos.y > panelY + panelH) {
                this.showSaveSlots = false;
                if (this.engine.audio) this.engine.audio.playSound(SFX.LAND);
            }
            return;
        }

        const panelY = 290;
        for (let i = 0; i < this.menuItems.length; i++) {
            const iy = panelY + 38 + i * 64;
            if (pos.x >= CANVAS_WIDTH / 2 - 160 && pos.x <= CANVAS_WIDTH / 2 + 160 &&
                pos.y >= iy - 24 && pos.y <= iy + 24) {
                this.selectedItem = i;
                if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                this._activateSelected();
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
