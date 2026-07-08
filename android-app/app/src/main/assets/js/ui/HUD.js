/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — HUD.js
 * ============================================================
 * In-game Heads-Up Display rendered entirely on the canvas.
 * All elements are drawn in screen space (no camera transform).
 *
 * Features:
 *  - Heart-icon health bar with pulse animation
 *  - Lives counter with Ziko face icons
 *  - Level name / timer banner (top-center)
 *  - Score, coin count, gem count (top-right)
 *  - Minimap (bottom-right)
 *  - Message queue (center fade)
 *  - Active power-up indicator (bottom-left)
 *  - Combo display (right-center)
 *  - FPS counter (top-right corner)
 */

'use strict';

window.HUD = class HUD {
    constructor() {
        /** @type {Array<{text:string, timer:number, maxTime:number, color:string, size:number}>} */
        this.messageQueue = [];

        /** Timer driving the crystal-collect flash animation */
        this.crystalFlash = 0;

        /** Current combo notification state */
        this.comboDisplay = { count: 0, timer: 0, maxTime: 2.5 };

        /** Active power-up indicator */
        this.powerUpDisplay = { type: null, timer: 0, maxTimer: 1 };

        /** Whether to draw the minimap in the bottom-right corner */
        this.minimapVisible = true;

        /** Global animation time accumulator (seconds) */
        this.animTime = 0;

        // Internal: previous lives/health for flash detection
        this._prevLives  = -1;
        this._livesFlash = 0;
        this._prevHealth = -1;
        this._healthFlash = 0;
    }

    // ──────────────────────────────────────────────────────────
    // PUBLIC API
    // ──────────────────────────────────────────────────────────

    /**
     * Queue a centered screen message.
     * @param {string} text
     * @param {number} duration  seconds
     * @param {string} color     CSS color string
     * @param {number} size      font size in px
     */
    showMessage(text, duration = 2, color = '#FFD700', size = 48) {
        this.messageQueue.push({
            text,
            timer   : duration,
            maxTime : duration,
            color,
            size,
        });
    }

    /**
     * Trigger a combo notification.
     * @param {number} count  combo multiplier
     */
    showCombo(count) {
        this.comboDisplay.count   = count;
        this.comboDisplay.timer   = this.comboDisplay.maxTime;
    }

    /**
     * Update the active power-up indicator.
     * @param {string} type      POWERUP_TYPE value
     * @param {number} timer     remaining seconds
     * @param {number} maxTimer  max duration seconds
     */
    showPowerUp(type, timer, maxTimer) {
        this.powerUpDisplay.type     = type;
        this.powerUpDisplay.timer    = timer;
        this.powerUpDisplay.maxTimer = maxTimer;
    }

    /**
     * Update all HUD timers / animations.
     * @param {number} dt  delta-time in seconds
     */
    update(dt) {
        this.animTime += dt;

        // Message queue — advance front message
        if (this.messageQueue.length > 0) {
            this.messageQueue[0].timer -= dt;
            if (this.messageQueue[0].timer <= 0) {
                this.messageQueue.shift();
            }
        }

        // Combo display fade
        if (this.comboDisplay.timer > 0) {
            this.comboDisplay.timer = Math.max(0, this.comboDisplay.timer - dt);
        }

        // Crystal flash
        if (this.crystalFlash > 0) {
            this.crystalFlash = Math.max(0, this.crystalFlash - dt);
        }

        // Lives flash
        if (this._livesFlash > 0) this._livesFlash -= dt;

        // Health flash
        if (this._healthFlash > 0) this._healthFlash -= dt;
    }

    /**
     * Master render call — draw everything in screen space.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} player  Player instance
     * @param {object} level   Level instance
     * @param {number} fps     current frames per second
     */
    render(ctx, player, level, fps) {
        const W = CANVAS_WIDTH;
        const H = CANVAS_HEIGHT;

        // Detect lives / health changes for flash animations
        if (player) {
            if (this._prevLives !== -1 && player.lives !== this._prevLives) {
                this._livesFlash = 0.6;
            }
            if (this._prevHealth !== -1 && player.health !== this._prevHealth) {
                this._healthFlash = 0.4;
            }
            this._prevLives  = player.lives;
            this._prevHealth = player.health;
        }

        ctx.save();

        // ── Health Bar (top-left) ───────────────────────────
        if (player) {
            this._drawHealthBar(ctx, player, 16, 16);
            this._drawLives(ctx, player, 16, 90);
        }

        // ── Level name / timer banner (top-center) ──────────
        if (level) {
            this._drawLevelBanner(ctx, level, W / 2, 12);
        }

        // ── Score / coins / gems (top-right) ────────────────
        if (player) {
            this._drawScorePanel(ctx, player, W - 16, 16);
        }

        // ── Active power-up (bottom-left) ───────────────────
        if (this.powerUpDisplay.type && this.powerUpDisplay.timer > 0) {
            this._drawPowerUpIndicator(ctx, 16, H - 100);
        }

        // ── Minimap (bottom-right) ───────────────────────────
        if (this.minimapVisible && player && level) {
            this._drawMinimap(ctx, player, level, W - 176, H - 106, 160, 90);
        }

        // ── Center messages ──────────────────────────────────
        this._drawMessages(ctx, W, H);

        // ── Combo display (right-center) ─────────────────────
        if (this.comboDisplay.timer > 0) {
            this._drawCombo(ctx, W - 120, H / 2 - 60);
        }

        // ── Crystal flash overlay ────────────────────────────
        if (this.crystalFlash > 0) {
            const alpha = (this.crystalFlash / 0.4) * 0.18;
            ctx.fillStyle = `rgba(178,235,242,${alpha})`;
            ctx.fillRect(0, 0, W, H);
        }

        // ── FPS (tiny, top-right corner) ─────────────────────
        ctx.font      = '12px monospace';
        ctx.fillStyle = 'rgba(200,200,200,0.7)';
        ctx.textAlign = 'right';
        ctx.fillText(`FPS: ${Math.round(fps)}`, W - 6, H - 6);

        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE DRAWING HELPERS
    // ──────────────────────────────────────────────────────────

    /** Draw heart-icon health bar at (x, y). */
    _drawHealthBar(ctx, player, x, y) {
        const MAX_HEALTH = PLAYER.MAX_HEALTH; // 6 → 3 hearts
        const health     = clamp(player.health, 0, MAX_HEALTH);
        const maxHearts  = MAX_HEALTH / 2;    // 3 hearts
        const heartSize  = 24;
        const spacing    = heartSize + 6;
        const isLow      = health <= 2;

        // Pulse scale when health is low
        const pulse = isLow
            ? 1 + 0.12 * Math.abs(Math.sin(this.animTime * 6))
            : 1;

        // Background panel
        const panelW = maxHearts * spacing + 14;
        const panelH = 38;
        this._drawGlassPanel(ctx, x - 6, y - 6, panelW, panelH, 'rgba(0,0,0,0.55)', '#880000');

        // Label
        ctx.font      = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FF8A80';
        ctx.textAlign = 'left';
        ctx.fillText('HP', x, y + panelH - 4);

        // Hearts
        for (let i = 0; i < maxHearts; i++) {
            const hx   = x + i * spacing + 22;
            const hy   = y + heartSize / 2 + 2;
            const fill = health >= (i + 1) * 2 ? 1
                       : health >= i * 2 + 1   ? 0.5
                       :                          0;

            ctx.save();
            if (isLow && fill > 0) {
                ctx.translate(hx, hy);
                ctx.scale(pulse, pulse);
                ctx.translate(-hx, -hy);
            }
            this._drawHeart(ctx, hx, hy, heartSize, fill);
            ctx.restore();
        }

        // Thin health bar below hearts
        const barX = x + 22;
        const barY = y + heartSize + 6;
        const barW = maxHearts * spacing - 4;
        const barH = 5;
        const ratio = health / MAX_HEALTH;

        ctx.fillStyle = COLORS.HEALTH_BG;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 3);
        ctx.fill();

        if (ratio > 0) {
            const barGrad = ctx.createLinearGradient(barX, 0, barX + barW * ratio, 0);
            barGrad.addColorStop(0, '#FF5252');
            barGrad.addColorStop(1, '#FF1744');
            ctx.fillStyle = barGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * ratio, barH, 3);
            ctx.fill();
        }
    }

    /**
     * Draw a single heart shape.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx    center-x
     * @param {number} cy    center-y
     * @param {number} size  diameter in px
     * @param {number} fill  0=empty, 0.5=half, 1=full
     */
    _drawHeart(ctx, cx, cy, size, fill) {
        const s  = size * 0.5;
        const ox = cx - s * 0.5;
        const oy = cy - s * 0.4;

        // Heart path (cubic bezier)
        ctx.beginPath();
        ctx.moveTo(ox + s * 0.5, oy + s * 0.25);
        ctx.bezierCurveTo(ox + s * 0.5, oy,         ox,           oy,         ox,           oy + s * 0.35);
        ctx.bezierCurveTo(ox,           oy + s * 0.7, ox + s * 0.5, oy + s * 0.9, ox + s * 0.5, oy + s);
        ctx.bezierCurveTo(ox + s * 0.5, oy + s * 0.9, ox + s,       oy + s * 0.7, ox + s,       oy + s * 0.35);
        ctx.bezierCurveTo(ox + s,       oy,           ox + s * 0.5, oy,         ox + s * 0.5, oy + s * 0.25);
        ctx.closePath();

        if (fill === 1) {
            // Full — red gradient
            const g = ctx.createRadialGradient(cx, cy - 2, 1, cx, cy, s);
            g.addColorStop(0, '#FF6B6B');
            g.addColorStop(1, '#C62828');
            ctx.fillStyle = g;
            ctx.fill();
        } else if (fill === 0.5) {
            // Half — left red, right grey
            ctx.save();
            ctx.clip();
            ctx.fillStyle = '#555';
            ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
            ctx.fillStyle = '#C62828';
            ctx.fillRect(cx - s, cy - s, s, s * 2);
            ctx.restore();
        } else {
            // Empty — dark outline
            ctx.fillStyle = '#333';
            ctx.fill();
        }

        ctx.strokeStyle = fill > 0 ? '#fff' : '#555';
        ctx.lineWidth   = 1.2;
        ctx.stroke();
    }

    /** Draw lives counter (Ziko-face icons × count). */
    _drawLives(ctx, player, x, y) {
        const lives     = Math.max(0, player.lives);
        const maxShow   = Math.min(lives, 5);
        const flash     = this._livesFlash > 0 && Math.sin(this._livesFlash * 20) > 0;
        const iconSize  = 18;
        const spacing   = iconSize + 4;
        const panelW    = maxShow * spacing + 54;

        this._drawGlassPanel(ctx, x - 6, y - 4, panelW, 28, 'rgba(0,0,0,0.50)', '#1565C0');

        ctx.font      = 'bold 13px "Segoe UI", sans-serif';
        ctx.fillStyle = flash ? '#FF6B6B' : '#90CAF9';
        ctx.textAlign = 'left';
        ctx.fillText('×', x + 2, y + 16);
        ctx.fillText(`${lives}`, x + 14, y + 16);

        // Draw mini Ziko faces
        for (let i = 0; i < maxShow; i++) {
            const fx = x + 36 + i * spacing;
            const fy = y + iconSize / 2 + 2;
            this._drawMiniZikoFace(ctx, fx, fy, iconSize / 2);
        }
        if (lives > 5) {
            ctx.font      = '11px sans-serif';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'left';
            ctx.fillText(`+${lives - 5}`, x + 36 + maxShow * spacing + 2, y + 16);
        }
    }

    /** Draw a tiny Ziko face icon. */
    _drawMiniZikoFace(ctx, cx, cy, r) {
        // Head
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.fill();
        ctx.strokeStyle = '#8D4800';
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        // Eyes
        for (const ex of [cx - r * 0.35, cx + r * 0.35]) {
            ctx.beginPath();
            ctx.arc(ex, cy - r * 0.1, r * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.ZIKO_PUPIL;
            ctx.fill();
        }

        // Hair (dark top)
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.3, r * 0.75, Math.PI, 0);
        ctx.fillStyle = COLORS.ZIKO_HAIR;
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(cx, cy + r * 0.2, r * 0.35, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#8D4800';
        ctx.lineWidth   = 0.8;
        ctx.stroke();
    }

    /** Draw the level name / timer banner at top-center. */
    _drawLevelBanner(ctx, level, cx, y) {
        const name  = (level.name || 'Level 1').toUpperCase();
        const timer = level.timer || 0;
        const mins  = Math.floor(timer / 60);
        const secs  = Math.floor(timer % 60).toString().padStart(2, '0');
        const timeStr = `${mins}:${secs}`;

        const panelW = 280;
        const panelH = 52;
        const px     = cx - panelW / 2;

        // Panel with golden border
        this._drawGlassPanel(ctx, px, y, panelW, panelH, 'rgba(0,0,0,0.60)', '#FFD700');

        // Decorative banner top ornament
        ctx.beginPath();
        ctx.moveTo(px + 10, y);
        ctx.lineTo(px + 40, y - 8);
        ctx.lineTo(cx,      y - 12);
        ctx.lineTo(px + panelW - 40, y - 8);
        ctx.lineTo(px + panelW - 10, y);
        ctx.closePath();
        const bannerG = ctx.createLinearGradient(px, y - 12, px + panelW, y);
        bannerG.addColorStop(0, '#B8860B');
        bannerG.addColorStop(0.5, '#FFD700');
        bannerG.addColorStop(1, '#B8860B');
        ctx.fillStyle = bannerG;
        ctx.fill();

        // Level name
        this._drawStrokeText(ctx, name, cx, y + 20, 15, '#FFE082', '#4A3000');

        // Timer
        const isUrgent = timer < 30 && timer > 0;
        const timePulse = isUrgent ? 1 + 0.1 * Math.abs(Math.sin(this.animTime * 8)) : 1;
        ctx.save();
        ctx.translate(cx, y + 40);
        ctx.scale(timePulse, timePulse);
        this._drawStrokeText(ctx, `⏱ ${timeStr}`, 0, 0, 14,
            isUrgent ? '#FF5252' : '#FFFFFF', '#000000');
        ctx.restore();
    }

    /** Draw score panel (top-right). */
    _drawScorePanel(ctx, player, rx, y) {
        const panelW = 200;
        const panelH = 80;
        const px     = rx - panelW;

        this._drawGlassPanel(ctx, px, y, panelW, panelH, 'rgba(0,0,0,0.60)', '#FFD700');

        // Score
        const score = (player.score || 0).toLocaleString();
        this._drawStrokeText(ctx, score, rx - 12, y + 22, 20, '#FFD700', '#6B4400', 'right');

        // Coin row
        this._drawCoinIcon(ctx, px + 12, y + 40, 10);
        this._drawStrokeText(ctx, `× ${(player.coins || 0).toLocaleString()}`,
            px + 28, y + 48, 14, '#FFF176', '#333', 'left');

        // Gem row
        this._drawGemIcon(ctx, px + 12, y + 60, 10);
        this._drawStrokeText(ctx, `× ${(player.gems || 0).toLocaleString()}`,
            px + 28, y + 68, 14, '#80D8FF', '#333', 'left');
    }

    /** Draw a small coin icon. */
    _drawCoinIcon(ctx, cx, cy, r) {
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
        g.addColorStop(0, '#FFEE58');
        g.addColorStop(1, '#F57F17');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.font        = `bold ${r * 1.1}px sans-serif`;
        ctx.fillStyle   = '#B8860B';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy + 0.5);
        ctx.textBaseline = 'alphabetic';
    }

    /** Draw a small gem icon. */
    _drawGemIcon(ctx, cx, cy, r) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.7, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.7, 0);
        ctx.closePath();
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, '#80D8FF');
        g.addColorStop(1, '#0288D1');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#01579B';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();
    }

    /** Draw minimap in bottom-right corner. */
    _drawMinimap(ctx, player, level, x, y, w, h) {
        const mx = x, my = y, mw = w, mh = h;

        // Panel background
        this._drawGlassPanel(ctx, mx - 4, my - 4, mw + 8, mh + 8, 'rgba(0,0,20,0.75)', '#5C6BC0');

        // Map background
        ctx.fillStyle = 'rgba(20, 30, 60, 0.9)';
        ctx.fillRect(mx, my, mw, mh);

        // Determine map bounds
        const mapW = (level.width  || 100) * TILE_SIZE;
        const mapH = (level.height || 30)  * TILE_SIZE;
        const scaleX = mw / mapW;
        const scaleY = mh / mapH;

        // Draw solid tiles as mini blocks
        if (level.tiles) {
            ctx.fillStyle = 'rgba(100, 160, 80, 0.75)';
            const tileData = level.tiles;
            const cols     = level.width  || 100;
            const rows     = level.height || 30;
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const tid = tileData[row * cols + col] || 0;
                    if (tid === TILE.SOLID || tid === TILE.SEMI_SOLID) {
                        const tx = mx + col * TILE_SIZE * scaleX;
                        const ty = my + row * TILE_SIZE * scaleY;
                        ctx.fillRect(tx, ty, Math.max(1, TILE_SIZE * scaleX - 0.5),
                                             Math.max(1, TILE_SIZE * scaleY - 0.5));
                    }
                }
            }
        }

        // Draw enemies as red dots
        if (level.enemies) {
            ctx.fillStyle = '#EF5350';
            for (const e of level.enemies) {
                if (!e.alive && e.alive !== undefined) continue;
                const ex = mx + e.x * scaleX;
                const ey = my + e.y * scaleY;
                ctx.beginPath();
                ctx.arc(clamp(ex, mx, mx + mw), clamp(ey, my, my + mh), 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw collectibles as yellow dots
        if (level.collectibles) {
            ctx.fillStyle = '#FFD700';
            for (const c of level.collectibles) {
                if (c.collected) continue;
                const cx2 = mx + c.x * scaleX;
                const cy2 = my + c.y * scaleY;
                ctx.beginPath();
                ctx.arc(clamp(cx2, mx, mx + mw), clamp(cy2, my, my + mh), 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Player dot — pulsing cyan
        const px2 = mx + (player.x + player.w / 2) * scaleX;
        const py2 = my + (player.y + player.h / 2) * scaleY;
        const pulse = 2 + 1.2 * Math.abs(Math.sin(this.animTime * 4));
        ctx.beginPath();
        ctx.arc(clamp(px2, mx, mx + mw), clamp(py2, my, my + mh), pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#00E5FF';
        ctx.fill();
        // Glow
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur  = 6;
        ctx.fill();
        ctx.shadowBlur  = 0;

        // Border
        ctx.strokeStyle = '#7986CB';
        ctx.lineWidth   = 1;
        ctx.strokeRect(mx, my, mw, mh);

        // Label
        ctx.font      = '9px monospace';
        ctx.fillStyle = '#90A4AE';
        ctx.textAlign = 'left';
        ctx.fillText('MAP', mx + 2, my + mh - 2);
    }

    /** Draw centered message from queue. */
    _drawMessages(ctx, W, H) {
        if (this.messageQueue.length === 0) return;
        const msg   = this.messageQueue[0];
        const ratio = msg.timer / msg.maxTime;

        // Fade in (first 10%) and fade out (last 25%)
        let alpha = 1;
        if (ratio > 0.9) alpha = (1 - ratio) / 0.1;
        else if (ratio < 0.25) alpha = ratio / 0.25;
        alpha = clamp(alpha, 0, 1);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Shadow / glow behind text
        const cx = W / 2;
        const cy = H * 0.38;
        const size = msg.size || 48;

        // Soft glow background ellipse
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2.5);
        glowGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(cx - size * 3, cy - size, size * 6, size * 2);

        // Scale pop-in
        const scale = ratio > 0.9 ? lerp(0.5, 1, (1 - ratio) / 0.1) : 1;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        this._drawStrokeText(ctx, msg.text, 0, 0, size, msg.color, '#000', 'center');
        ctx.restore();
    }

    /** Draw power-up indicator (bottom-left). */
    _drawPowerUpIndicator(ctx, x, y) {
        const pu      = this.powerUpDisplay;
        const ratio   = pu.timer / pu.maxTimer;
        const panelW  = 130;
        const panelH  = 44;
        const isLow   = ratio < 0.25;

        // Panel
        this._drawGlassPanel(ctx, x, y, panelW, panelH, 'rgba(0,0,0,0.65)', isLow ? '#FF5252' : '#7C4DFF');

        // Power-up type name
        const name = this._powerUpName(pu.type);
        ctx.font      = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = isLow ? '#FF8A80' : '#CE93D8';
        ctx.textAlign = 'left';
        ctx.fillText(name, x + 8, y + 14);

        // Progress bar
        const barX = x + 6;
        const barY = y + 20;
        const barW = panelW - 12;
        const barH = 8;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();

        if (ratio > 0) {
            const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            if (isLow) {
                barGrad.addColorStop(0, '#FF5252');
                barGrad.addColorStop(1, '#FF1744');
            } else {
                barGrad.addColorStop(0, '#B388FF');
                barGrad.addColorStop(1, '#7C4DFF');
            }
            ctx.fillStyle = barGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * ratio, barH, 4);
            ctx.fill();
        }

        // Remaining time
        ctx.font      = '10px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'right';
        ctx.fillText(`${pu.timer.toFixed(1)}s`, x + panelW - 6, y + 40);
    }

    /** Draw combo notification (right side). */
    _drawCombo(ctx, x, y) {
        const cd    = this.comboDisplay;
        const ratio = cd.timer / cd.maxTime;

        let alpha = 1;
        if (ratio < 0.3) alpha = ratio / 0.3;
        alpha = clamp(alpha, 0, 1);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Bounce scale
        const scale = 1 + 0.15 * Math.abs(Math.sin(this.animTime * 8));
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Glow backdrop
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur  = 18;

        this._drawStrokeText(ctx, `COMBO`, 0, 0, 22, '#FFF', '#333', 'center');
        this._drawStrokeText(ctx, `×${cd.count}!`, 0, 28, 36, '#FFD700', '#6B3A00', 'center');

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    /**
     * Outlined text helper — draws text with a stroke outline.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {number} size      font size in px
     * @param {string} color     fill color
     * @param {string} outlineColor  stroke color
     * @param {string} align     textAlign
     */
    _drawStrokeText(ctx, text, x, y, size, color, outlineColor = '#000', align = 'center') {
        ctx.font      = `bold ${size}px "Segoe UI", "Arial Rounded MT Bold", sans-serif`;
        ctx.textAlign = align;
        ctx.lineJoin  = 'round';

        const lineW  = Math.max(2, size * 0.15);
        ctx.lineWidth    = lineW;
        ctx.strokeStyle  = outlineColor;
        ctx.strokeText(text, x, y);

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    /**
     * Draw a glassmorphism-style rounded panel.
     */
    _drawGlassPanel(ctx, x, y, w, h, bg, borderColor, radius = 8) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Inner highlight line
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, w - 2, h - 2, radius - 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();
    }

    /** Return a display name for a power-up type. */
    _powerUpName(type) {
        const names = {
            [POWERUP_TYPE.SPEED]      : '⚡ SPEED BOOST',
            [POWERUP_TYPE.FIRE]       : '🔥 FIRE POWER',
            [POWERUP_TYPE.ICE]        : '❄ ICE POWER',
            [POWERUP_TYPE.SHIELD]     : '🛡 SHIELD',
            [POWERUP_TYPE.MAGNET]     : '🧲 MAGNET',
            [POWERUP_TYPE.DOUBLE_COIN]: '💰 DOUBLE COINS',
            [POWERUP_TYPE.INVINCIBLE] : '⭐ INVINCIBLE',
            [POWERUP_TYPE.EXTRA_LIFE] : '❤ EXTRA LIFE',
            [POWERUP_TYPE.HEAL]       : '💊 HEAL',
        };
        return names[type] || '? POWER UP';
    }
};
