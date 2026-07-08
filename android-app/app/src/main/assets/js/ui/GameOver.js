/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — GameOver UI Overlay
 * ============================================================
 * Screen shown when the player runs out of lives. Shaking text alerts,
 * sad Ziko drawing, score highlights, and retry inputs.
 */

'use strict';

window.GameOver = class GameOver {
    constructor(engine) {
        this.engine = engine;
        this.selectedItem = 0;
        this.items = ['Try Again', 'Main Menu'];
        this.animTime = 0;
        this.shakeTimer = 0;

        // Mouse bindings
        this.canvas = this.engine.renderer.canvas;
        this.onMouseMove = this._onMouseMove.bind(this);
        this.onMouseClick = this._onMouseClick.bind(this);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('click', this.onMouseClick);
    }

    update(dt, input) {
        this.animTime += dt;
        
        // Menu item navigation
        if (input.isJustPressed('up') || input.isJustPressed('left')) {
            this.selectedItem = (this.selectedItem - 1 + this.items.length) % this.items.length;
            if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
        } else if (input.isJustPressed('down') || input.isJustPressed('right')) {
            this.selectedItem = (this.selectedItem + 1) % this.items.length;
            if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
        }

        // Selection confirmation
        if (input.isJustPressed('jump') || input.isJustPressed('special')) {
            if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
            this.confirmSelection();
        }
    }

    confirmSelection() {
        if (this.selectedItem === 0) {
            // Try Again (Restart current level)
            this.engine.restartLevel();
        } else {
            // Exit to main menu
            this.engine.exitToMenu();
        }
    }

    render(ctx) {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // Dark red vignette background overlay
        const vigGrad = ctx.createRadialGradient(cx, cy, 200, cx, cy, 600);
        vigGrad.addColorStop(0, 'rgba(33, 10, 10, 0.85)');
        vigGrad.addColorStop(1, 'rgba(5, 0, 0, 0.95)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- Shaking menancing GAME OVER header ---
        const shakeX = Math.sin(this.animTime * 30) * 3;
        this.engine.renderer.drawText(ctx, "GAME OVER", cx + shakeX, 130, {
            size: 64,
            font: 'Fredoka One',
            color: '#E53935',
            align: 'center',
            shadow: true,
            shadowColor: '#000000',
            outline: true,
            outlineColor: '#000000',
            outlineWidth: 4
        });

        // --- Draw Sad/Fallen Ziko illustration ---
        ctx.save();
        ctx.translate(cx, 260);
        // Face drawing
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        
        // Hair
        ctx.fillStyle = COLORS.ZIKO_HAIR;
        ctx.beginPath();
        ctx.arc(0, -6, 32, Math.PI, 0);
        ctx.lineTo(32, 0); ctx.lineTo(24, -10); ctx.lineTo(12, -2); ctx.lineTo(-12, -2); ctx.lineTo(-24, -10); ctx.lineTo(-32, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Sad cross eyes
        ctx.strokeStyle = '#2C2C2C';
        ctx.lineWidth = 3;
        // left X
        ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-8, 2); ctx.moveTo(-8, -6); ctx.lineTo(-16, 2); ctx.stroke();
        // right X
        ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(16, 2); ctx.moveTo(16, -6); ctx.lineTo(8, 2); ctx.stroke();

        // Frown mouth
        ctx.beginPath(); ctx.arc(0, 18, 8, Math.PI, 0, true); ctx.stroke();
        ctx.restore();

        // --- Display score stats box ---
        this.engine.renderer.drawRoundRect(ctx, cx - 180, 340, 360, 120, 10, 'rgba(0,0,0,0.5)', '#E53935', 2);
        
        this.engine.renderer.drawText(ctx, `SCORE: ${this.engine.totalScore}`, cx, 375, {
            size: 26, color: '#FFFFFF', align: 'center', shadow: true
        });
        
        this.engine.renderer.drawText(ctx, `COINS: ${this.engine.totalCoins}`, cx - 70, 420, {
            size: 20, color: COLORS.COIN_GOLD, align: 'left', shadow: true
        });

        this.engine.renderer.drawText(ctx, `GEMS: ${this.engine.totalGems}`, cx + 70, 420, {
            size: 20, color: COLORS.GEM_BLUE, align: 'right', shadow: true
        });

        // --- Render Option Menu Selection ---
        for (let i = 0; i < this.items.length; i++) {
            const itemY = 500 + i * 55;
            const isSelected = this.selectedItem === i;
            
            const txt = isSelected ? `▶  ${this.items[i]}  ◀` : this.items[i];
            const col = isSelected ? COLORS.COIN_GOLD : '#B0BEC5';
            const sz = isSelected ? 30 : 24;

            this.engine.renderer.drawText(ctx, txt, cx, itemY, {
                size: sz,
                font: isSelected ? 'Fredoka One' : 'Nunito',
                color: col,
                align: 'center',
                shadow: true,
                outline: isSelected,
                outlineColor: '#000000',
                outlineWidth: 2
            });
        }
    }

    _onMouseMove(e) {
        if (this.engine.state !== STATE.GAME_OVER) return;

        const pos = this._getCanvasMousePos(e);
        
        for (let i = 0; i < this.items.length; i++) {
            const itemY = 500 + i * 55;
            if (pos.x >= CANVAS_WIDTH / 2 - 120 && pos.x <= CANVAS_WIDTH / 2 + 120 &&
                pos.y >= itemY - 20 && pos.y <= itemY + 20) {
                if (this.selectedItem !== i) {
                    this.selectedItem = i;
                    if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                }
                break;
            }
        }
    }

    _onMouseClick(e) {
        if (this.engine.state !== STATE.GAME_OVER) return;

        const pos = this._getCanvasMousePos(e);
        
        for (let i = 0; i < this.items.length; i++) {
            const itemY = 500 + i * 55;
            if (pos.x >= CANVAS_WIDTH / 2 - 120 && pos.x <= CANVAS_WIDTH / 2 + 120 &&
                pos.y >= itemY - 20 && pos.y <= itemY + 20) {
                this.selectedItem = i;
                if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                this.confirmSelection();
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
