/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Victory UI Overlay
 * ============================================================
 * Screen shown upon completing a level or defeating the Shadow King.
 * Confetti bursts, star ratings, credits scrolls, and progress indicators.
 */

'use strict';

window.Victory = class Victory {
    constructor(engine) {
        this.engine = engine;
        this.selectedItem = 0;
        this.isFullVictory = false;

        this.items = []; // dynamically set
        this.animTime = 0;

        // Confetti particles local buffer
        this.confetti = [];
        
        this.starsAwarded = 3;
        this.bonusScore = 0;
        this.timeUsed = 0;
        
        // Final ending scroll state
        this.scrollOffset = 720;

        // Mouse bindings
        this.canvas = this.engine.renderer.canvas;
        this.onMouseMove = this._onMouseMove.bind(this);
        this.onMouseClick = this._onMouseClick.bind(this);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('click', this.onMouseClick);
    }

    setData(player, level) {
        this.isFullVictory = (level.id === 15);
        this.timeUsed = Math.floor(level.timer);

        // Calculate performance stars (1 to 3 stars)
        // 3 stars: finished under 3 min (180s) without dying
        // 2 stars: finished under 5 min
        // 1 star: basic completion
        if (this.timeUsed < 120 && player.health > 2) {
            this.starsAwarded = 3;
            this.bonusScore = 500;
        } else if (this.timeUsed < 240) {
            this.starsAwarded = 2;
            this.bonusScore = 200;
        } else {
            this.starsAwarded = 1;
            this.bonusScore = 50;
        }

        player.addScore(this.bonusScore);

        // Setup options
        if (this.isFullVictory) {
            this.items = ['Credits', 'Main Menu'];
            this.scrollOffset = 720;
        } else {
            this.items = ['Next Level', 'Replay Level', 'Main Menu'];
        }
        this.selectedItem = 0;
        this.animTime = 0;

        // Generate confetti burst particles
        this.confetti = [];
        const colors = ['#FFD700', '#FF3D00', '#29B6F6', '#81C784', '#BA68C8', '#FF4081'];
        for (let i = 0; i < 60; i++) {
            this.confetti.push({
                x: rnd(100, CANVAS_WIDTH - 100),
                y: rnd(-100, -20),
                vx: rnd(-100, 100),
                vy: rnd(200, 400),
                size: rnd(6, 12),
                color: colors[rndInt(0, colors.length - 1)],
                rot: rnd(0, 360),
                rotSpeed: rnd(-10, 10)
            });
        }
    }

    update(dt, input) {
        this.animTime += dt;

        // Update local confetti
        for (const c of this.confetti) {
            c.y += c.vy * dt;
            c.x += c.vx * dt;
            c.rot += c.rotSpeed * dt * 20;
            // Loop back to top if off-screen
            if (c.y > CANVAS_HEIGHT) {
                c.y = -20;
                c.x = rnd(100, CANVAS_WIDTH - 100);
            }
        }

        // Handle credit roll scroll speed
        if (this.isFullVictory && this.selectedItem === 0) {
            this.scrollOffset -= 35 * dt;
            // Clamp scroll offset
            if (this.scrollOffset < -500) {
                this.scrollOffset = -500;
            }
        }

        // Navigate menu selections
        if (input.isJustPressed('up') || input.isJustPressed('left')) {
            this.selectedItem = (this.selectedItem - 1 + this.items.length) % this.items.length;
            if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
        } else if (input.isJustPressed('down') || input.isJustPressed('right')) {
            this.selectedItem = (this.selectedItem + 1) % this.items.length;
            if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
        }

        if (input.isJustPressed('jump') || input.isJustPressed('special')) {
            if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
            this.confirmSelection();
        }
    }

    confirmSelection() {
        if (this.isFullVictory) {
            if (this.selectedItem === 0) {
                // reset scroll to see credits again
                this.scrollOffset = 720;
            } else {
                this.engine.exitToMenu();
            }
        } else {
            if (this.selectedItem === 0) {
                this.engine.nextLevel();
            } else if (this.selectedItem === 1) {
                this.engine.restartLevel();
            } else {
                this.engine.exitToMenu();
            }
        }
    }

    render(ctx) {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // Bright victory gradient background (Indigo to Purple)
        const vigGrad = ctx.createRadialGradient(cx, cy, 200, cx, cy, 600);
        vigGrad.addColorStop(0, 'rgba(40, 20, 80, 0.9)');
        vigGrad.addColorStop(1, 'rgba(10, 5, 30, 0.98)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw local flying confetti particles
        ctx.save();
        for (const c of this.confetti) {
            ctx.fillStyle = c.color;
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(degToRad(c.rot));
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size / 2);
            ctx.restore();
        }
        ctx.restore();

        if (this.isFullVictory) {
            this._drawEndingStoryScroll(ctx, cx, cy);
            return;
        }

        // --- LEVEL COMPLETE BANNER ---
        const bounce = Math.sin(this.animTime * 4) * 8;
        this.engine.renderer.drawText(ctx, "LEVEL COMPLETE!", cx, 110 + bounce, {
            size: 56,
            font: 'Fredoka One',
            color: '#FFD700',
            align: 'center',
            shadow: true,
            outline: true,
            outlineColor: '#000000',
            outlineWidth: 4
        });

        // --- Star Ratings ---
        ctx.save();
        for (let i = 0; i < 3; i++) {
            const starX = cx - 80 + i * 80;
            const starY = 210;
            const isActive = i < this.starsAwarded;
            
            // Draw star shape
            ctx.fillStyle = isActive ? '#FFD700' : 'rgba(255,255,255,0.15)';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                ctx.lineTo(starX + Math.cos((18 + j * 72) * Math.PI / 180) * 25,
                           starY - Math.sin((18 + j * 72) * Math.PI / 180) * 25);
                ctx.lineTo(starX + Math.cos((54 + j * 72) * Math.PI / 180) * 10,
                           starY - Math.sin((54 + j * 72) * Math.PI / 180) * 10);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();

        // --- Display Stats panel ---
        this.engine.renderer.drawRoundRect(ctx, cx - 180, 280, 360, 160, 10, 'rgba(0,0,0,0.5)', '#FFD700', 2);
        
        this.engine.renderer.drawText(ctx, `TIME: ${this.timeUsed}s`, cx - 140, 320, { size: 22, color: '#FFF' });
        this.engine.renderer.drawText(ctx, `BONUS SCORE: +${this.bonusScore}`, cx - 140, 360, { size: 22, color: '#66BB6A' });
        this.engine.renderer.drawText(ctx, `TOTAL SCORE: ${this.engine.totalScore}`, cx - 140, 400, { size: 24, color: COLORS.COIN_GOLD });

        // --- Options ---
        for (let i = 0; i < this.items.length; i++) {
            const itemY = 480 + i * 55;
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

    _drawEndingStoryScroll(ctx, cx, cy) {
        // Full credits scroll page (for Level 15 boss defeat)
        
        ctx.save();
        // Constrain text to a clipping region in middle of screen
        ctx.beginPath();
        ctx.rect(0, 80, CANVAS_WIDTH, 380);
        ctx.clip();

        // Render credit text lines moving upwards
        const startY = this.scrollOffset;
        const lines = [
            "THE QUEST IS COMPLETE!",
            "",
            "With the heroic defeat of the Shadow King,",
            "Ziko and Bolt recovered all fifteen magical crystals.",
            "Peace, warm colors, and laughter returned",
            "to the beautiful Green Hills and floating kingdoms.",
            "",
            "Ziko has proven himself to be the bravest,",
            "most curious boy in the adventure lands.",
            "And Bolt has found a true friend.",
            "",
            "==================================",
            "CREDITS",
            "==================================",
            "Game Design & Coding: Antigravity AI",
            "Art Director: HTML5 Canvas Primitives",
            "Procedural Audio: Web Audio Synths",
            "Player Character: Ziko",
            "Loyal Ally: Robotic Companion Bolt",
            "",
            "THANK YOU FOR PLAYING!"
        ];

        for (let i = 0; i < lines.length; i++) {
            const lineY = startY + i * 36;
            const isTitle = i === 0 || lines[i].includes("===") || lines[i] === "CREDITS";

            this.engine.renderer.drawText(ctx, lines[i], cx, lineY, {
                size: isTitle ? 28 : 20,
                font: isTitle ? 'Fredoka One' : 'Nunito',
                color: isTitle ? COLORS.COIN_GOLD : '#FFFFFF',
                align: 'center',
                shadow: true
            });
        }
        ctx.restore();

        // Render stationary banners above and below clipping region
        this.engine.renderer.drawText(ctx, "🏆 VICTORY COMPLETE! 🏆", cx, 50, {
            size: 42, font: 'Fredoka One', color: '#FFD700', align: 'center', shadow: true, outline: true, outlineColor: '#000'
        });

        // Stats Box
        this.engine.renderer.drawRoundRect(ctx, cx - 200, 480, 400, 80, 8, 'rgba(0,0,0,0.6)', '#FFD700', 1.5);
        this.engine.renderer.drawText(ctx, `GRAND TOTAL SCORE: ${this.engine.totalScore}`, cx, 510, {
            size: 24, font: 'Fredoka One', color: COLORS.COIN_GOLD, align: 'center'
        });

        // Credit Menu Option
        const optY = 600;
        const isSelectedMenu = this.selectedItem === 1;
        const optTxt = isSelectedMenu ? "▶  Return to Main Menu  ◀" : "Return to Main Menu";
        this.engine.renderer.drawText(ctx, optTxt, cx, optY, {
            size: isSelectedMenu ? 28 : 22,
            font: isSelectedMenu ? 'Fredoka One' : 'Nunito',
            color: isSelectedMenu ? COLORS.COIN_GOLD : '#B0BEC5',
            align: 'center',
            shadow: true
        });
    }

    _onMouseMove(e) {
        if (this.engine.state !== STATE.VICTORY) return;

        const pos = this._getCanvasMousePos(e);

        if (this.isFullVictory) {
            // Full ending scroll has a single option at y=600
            const optY = 600;
            if (pos.x >= CANVAS_WIDTH / 2 - 180 && pos.x <= CANVAS_WIDTH / 2 + 180 &&
                pos.y >= optY - 20 && pos.y <= optY + 20) {
                if (this.selectedItem !== 1) {
                    this.selectedItem = 1;
                    if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                }
            }
            return;
        }
        
        // Normal level complete screen options
        for (let i = 0; i < this.items.length; i++) {
            const itemY = 480 + i * 55;
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
        if (this.engine.state !== STATE.VICTORY) return;

        const pos = this._getCanvasMousePos(e);

        if (this.isFullVictory) {
            const optY = 600;
            if (pos.x >= CANVAS_WIDTH / 2 - 180 && pos.x <= CANVAS_WIDTH / 2 + 180 &&
                pos.y >= optY - 20 && pos.y <= optY + 20) {
                this.selectedItem = 1;
                if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                // Exit to Main Menu
                this.engine.exitToMenu();
            }
            return;
        }
        
        for (let i = 0; i < this.items.length; i++) {
            const itemY = 480 + i * 55;
            if (pos.x >= CANVAS_WIDTH / 2 - 120 && pos.x <= CANVAS_WIDTH / 2 + 120 &&
                pos.y >= itemY - 20 && pos.y <= itemY + 20) {
                this.selectedItem = i;
                if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                this.confirmSelection();
                break;
            }
        }
    }

    confirmSelection() {
        if (this.isFullVictory) {
            this.engine.exitToMenu();
            return;
        }

        if (this.selectedItem === 0) {
            // Next Level
            this.engine.nextLevel();
        } else if (this.selectedItem === 1) {
            // Replay Level
            this.engine.restartLevel();
        } else {
            // Exit to Menu
            this.engine.exitToMenu();
        }
    }

    _getCanvasMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
        return { x, y };
    }
};
