/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Achievements Screen UI
 * ============================================================
 * Displays unlocked achievements in a grid, showing customized icons
 * and descriptions drawn on the Canvas.
 */

'use strict';

window.AchievementsScreen = class AchievementsScreen {
    constructor(engine) {
        this.engine = engine;
        this.animTime = 0;
        this.selectedItem = 0;

        // Mouse bindings
        this.canvas = this.engine.renderer.canvas;
        this.onMouseClick = this._onMouseClick.bind(this);
        this.canvas.addEventListener('click', this.onMouseClick);

        // Custom list matching global configuration settings
        this.list = [
            { id: 'firstVictory', name: 'First Victory', desc: 'Finish level 1 Green Hills', icon: 'trophy' },
            { id: 'coinCollector', name: 'Coin Collector', desc: 'Amass 100 coins total', icon: 'coin' },
            { id: 'treasureHunter', name: 'Treasure Hunter', desc: 'Amass 500 points total', icon: 'gem' },
            { id: 'bossSlayer', name: 'Boss Slayer', desc: 'Vanquish the Shadow King', icon: 'shield' },
            { id: 'explorer', name: 'Explorer', desc: 'Collect any power-up item', icon: 'wings' },
            { id: 'speedRunner', name: 'Speed Runner', desc: 'Complete under 2 minutes', icon: 'lightning' },
            { id: 'secretFinder', name: 'Secret Finder', desc: 'Locate a hidden crystal', icon: 'crystal' },
            { id: 'masterAdventurer', name: 'Master Adventurer', desc: 'Unlock all worlds', icon: 'crown' }
        ];
    }

    update(dt, input) {
        this.animTime += dt;

        // Return button triggers on Jump or Special action
        if (input.isJustPressed('jump') || input.isJustPressed('special') || input.isJustPressed('pause')) {
            if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
            this.engine.setState(STATE.MENU);
        }
    }

    render(ctx) {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // Dark clean gradient background
        const vigGrad = ctx.createRadialGradient(cx, cy, 200, cx, cy, 600);
        vigGrad.addColorStop(0, 'rgba(26, 13, 62, 0.95)');
        vigGrad.addColorStop(1, 'rgba(13, 5, 26, 0.98)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Header Title
        this.engine.renderer.drawText(ctx, "ACHIEVEMENTS", cx, 65, {
            size: 44,
            font: 'Fredoka One',
            color: COLORS.COIN_GOLD,
            align: 'center',
            shadow: true,
            outline: true,
            outlineColor: '#000000',
            outlineWidth: 3
        });

        // Draw 4x2 grid of cards
        const cardW = 240;
        const cardH = 140;
        const startX = cx - 520;
        const startY = 140;
        const gapX = 40;
        const gapY = 30;

        let unlockedCount = 0;

        for (let i = 0; i < this.list.length; i++) {
            const ach = this.list[i];
            const isUnlocked = this.engine.achievements[ach.id] || false;
            
            if (isUnlocked) unlockedCount++;

            const colIdx = i % 4;
            const rowIdx = Math.floor(i / 4);

            const cardX = startX + colIdx * (cardW + gapX);
            const cardY = startY + rowIdx * (cardH + gapY);

            this._drawCard(ctx, cardX, cardY, cardW, cardH, ach, isUnlocked);
        }

        // Completion status footer
        const pct = Math.floor((unlockedCount / this.list.length) * 100);
        this.engine.renderer.drawText(ctx, `COMPLETION: ${unlockedCount}/${this.list.length} (${pct}%)`, cx, 520, {
            size: 22, font: 'Fredoka One', color: COLORS.COIN_GOLD, align: 'center', shadow: true
        });

        // Return guide
        const blink = Math.floor(this.animTime * 2) % 2 === 0;
        this.engine.renderer.drawText(ctx, "PRESS SPACE OR JUMP BUTTON TO RETURN", cx, 600, {
            size: 18,
            font: 'Nunito',
            color: blink ? '#FFFFFF' : '#B0BEC5',
            align: 'center',
            shadow: true
        });
    }

    _drawCard(ctx, x, y, w, h, ach, unlocked) {
        ctx.save();

        // Glow boundary if unlocked
        if (unlocked) {
            ctx.shadowColor = COLORS.COIN_GOLD;
            ctx.shadowBlur = 8;
        }

        // Card Base Round Rect
        const cardBg = unlocked ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.7)';
        const cardStroke = unlocked ? COLORS.COIN_GOLD : '#546E7A';
        this.engine.renderer.drawRoundRect(ctx, x, y, w, h, 8, cardBg, cardStroke, 2);

        // Remove glow shadow for details
        ctx.shadowBlur = 0;

        // Draw Icon relative center (left-aligned inside card)
        const iconX = x + 40;
        const iconY = y + 50;
        this._drawIcon(ctx, iconX, iconY, ach.icon, unlocked);

        // Text details (right-aligned in card)
        const textX = x + 90;
        const textY = y + 36;

        this.engine.renderer.drawText(ctx, ach.name, textX, textY, {
            size: 18,
            font: 'Fredoka One',
            color: unlocked ? '#FFFFFF' : '#78909C',
            align: 'left'
        });

        // Description text wrapped manually
        this.engine.renderer.drawText(ctx, ach.desc, textX, textY + 40, {
            size: 14,
            color: unlocked ? '#B0BEC5' : '#546E7A',
            align: 'left'
        });

        // Draw status stamp tag (Unlocked/Locked)
        if (unlocked) {
            ctx.fillStyle = '#66BB6A';
            ctx.beginPath();
            ctx.arc(x + w - 18, y + 18, 8, 0, Math.PI*2);
            ctx.fill();
            
            // Checkmark vector lines
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + w - 21, y + 18);
            ctx.lineTo(x + w - 19, y + 21);
            ctx.lineTo(x + w - 15, y + 15);
            ctx.stroke();
        } else {
            // Locked Padlock circle
            ctx.fillStyle = '#D84315';
            ctx.beginPath();
            ctx.arc(x + w - 18, y + 18, 8, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawIcon(ctx, x, y, type, unlocked) {
        ctx.save();
        ctx.fillStyle = unlocked ? COLORS.COIN_GOLD : '#546E7A';
        ctx.strokeStyle = unlocked ? '#FFFFFF' : '#455A64';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        switch (type) {
            case 'trophy':
                ctx.beginPath();
                ctx.fillRect(x - 6, y + 10, 12, 3); // base
                ctx.fillRect(x - 2, y + 4, 4, 6);   // stand stem
                // cup bowl
                ctx.arc(x, y - 4, 8, 0, Math.PI, false);
                ctx.lineTo(x - 8, y - 12);
                ctx.lineTo(x + 8, y - 12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'coin':
                ctx.beginPath();
                ctx.ellipse(x, y, 12, 12, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
                break;

            case 'gem':
                ctx.beginPath();
                ctx.moveTo(x, y - 12);
                ctx.lineTo(x + 10, y - 3);
                ctx.lineTo(x + 6, y + 10);
                ctx.lineTo(x - 6, y + 10);
                ctx.lineTo(x - 10, y - 3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'shield':
                ctx.beginPath();
                ctx.moveTo(x - 8, y - 10);
                ctx.lineTo(x + 8, y - 10);
                ctx.lineTo(x + 8, y - 2);
                ctx.quadraticCurveTo(x + 8, y + 8, x, y + 12);
                ctx.quadraticCurveTo(x - 8, y + 8, x - 8, y - 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'wings':
                ctx.beginPath();
                ctx.arc(x - 4, y, 6, 0, Math.PI*2);
                ctx.arc(x + 4, y, 6, 0, Math.PI*2);
                ctx.fill();
                break;

            case 'lightning':
                ctx.beginPath();
                ctx.moveTo(x + 2, y - 12);
                ctx.lineTo(x - 6, y + 2);
                ctx.lineTo(x, y + 2);
                ctx.lineTo(x - 2, y + 12);
                ctx.lineTo(x + 6, y - 2);
                ctx.lineTo(x, y - 2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'crystal':
                ctx.beginPath();
                ctx.moveTo(x, y - 12);
                ctx.lineTo(x + 8, y);
                ctx.lineTo(x, y + 12);
                ctx.lineTo(x - 8, y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'crown':
                ctx.beginPath();
                ctx.moveTo(x - 12, y + 8);
                ctx.lineTo(-14 + x, y - 4);
                ctx.lineTo(-6 + x, y + 2);
                ctx.lineTo(x, y - 10);
                ctx.lineTo(6 + x, y + 2);
                ctx.lineTo(14 + x, y - 4);
                ctx.lineTo(12 + x, y + 8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    _onMouseClick(e) {
        if (this.engine.state !== STATE.ACHIEVEMENTS) return;
        if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
        this.engine.setState(STATE.MENU);
    }
};
