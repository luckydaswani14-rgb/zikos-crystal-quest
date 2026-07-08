/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Settings Menu UI
 * ============================================================
 * Handles adjusting volume parameters, quality levels, screen toggle binds,
 * and difficulty presets drawn procedurally on Canvas.
 */

'use strict';

window.Settings = class Settings {
    constructor(engine) {
        this.engine = engine;
        this.selectedItem = 0;

        this.items = [
            { id: 'music', label: 'Music Volume', type: 'slider', max: 100 },
            { id: 'sfx', label: 'SFX Volume', type: 'slider', max: 100 },
            { id: 'difficulty', label: 'Difficulty', type: 'toggle', options: ['EASY', 'MEDIUM', 'HARD'] },
            { id: 'quality', label: 'Graphics Quality', type: 'toggle', options: ['low', 'medium', 'high'] },
            { id: 'vibration', label: 'Haptic Feedback', type: 'toggle', options: [true, false], labels: ['ON', 'OFF'] },
            { id: 'fps', label: 'Show FPS Meter', type: 'toggle', options: [true, false], labels: ['ON', 'OFF'] },
            { id: 'back', label: 'Save & Return', type: 'button' }
        ];

        this.animTime = 0;

        // Mouse bindings
        this.canvas = this.engine.renderer.canvas;
        this.onMouseMove = this._onMouseMove.bind(this);
        this.onMouseClick = this._onMouseClick.bind(this);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('click', this.onMouseClick);
    }

    update(dt, input) {
        this.animTime += dt;

        // Navigate options vertically
        if (input.isJustPressed('up')) {
            this.selectedItem = (this.selectedItem - 1 + this.items.length) % this.items.length;
            if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
        } else if (input.isJustPressed('down')) {
            this.selectedItem = (this.selectedItem + 1) % this.items.length;
            if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
        }

        const item = this.items[this.selectedItem];
        if (item.type === 'slider') {
            // Adjust slider values with Left/Right
            let val = item.id === 'music' ? this.engine.settings.musicVolume * 100 : this.engine.settings.sfxVolume * 100;
            const change = 5; // step sizes
            
            if (input.isDown('left')) {
                val = clamp(val - change * dt * 10, 0, 100);
                this._applyValue(item.id, val / 100);
            } else if (input.isDown('right')) {
                val = clamp(val + change * dt * 10, 0, 100);
                this._applyValue(item.id, val / 100);
            }
        } else if (item.type === 'toggle') {
            // Toggle options with Left/Right or Action confirm
            if (input.isJustPressed('left') || input.isJustPressed('right') || input.isJustPressed('jump') || input.isJustPressed('special')) {
                this._cycleToggle(item);
                if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
            }
        } else if (item.type === 'button') {
            // Click Save on Jump
            if (input.isJustPressed('jump') || input.isJustPressed('special')) {
                if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                this.saveAndExit();
            }
        }
    }

    _applyValue(id, value) {
        if (id === 'music') {
            this.engine.settings.musicVolume = value;
            this.engine.audio.setMusicVolume(value);
        } else if (id === 'sfx') {
            this.engine.settings.sfxVolume = value;
            this.engine.audio.setSfxVolume(value);
        }
    }

    _cycleToggle(item) {
        const cur = this.engine.settings[item.id];
        const idx = item.options.indexOf(cur);
        const nextIdx = (idx + 1) % item.options.length;
        
        this.engine.settings[item.id] = item.options[nextIdx];

        // If difficulty changed, propagate difficulty values immediately
        if (item.id === 'difficulty') {
            this.engine.setDifficulty(item.options[nextIdx]);
        }
    }

    saveAndExit() {
        // Persist settings using LocalStorage SaveManager
        this.engine.save.saveSettings(this.engine.settings);
        
        // Go back to previous state
        this.engine.setState(this.engine.previousState || STATE.MENU);
    }

    render(ctx) {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // Dark clean gradient background
        const vigGrad = ctx.createRadialGradient(cx, cy, 200, cx, cy, 600);
        vigGrad.addColorStop(0, 'rgba(26, 26, 62, 0.95)');
        vigGrad.addColorStop(1, 'rgba(13, 13, 26, 0.98)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Header Title
        this.engine.renderer.drawText(ctx, "SETTINGS", cx, 80, {
            size: 48,
            font: 'Fredoka One',
            color: COLORS.COIN_GOLD,
            align: 'center',
            shadow: true,
            outline: true,
            outlineColor: '#000000',
            outlineWidth: 3
        });

        // Layout rows
        const startY = 170;
        const rowHeight = 65;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemY = startY + i * rowHeight;
            const isSelected = this.selectedItem === i;

            // Row background highlight on selection
            if (isSelected) {
                this.engine.renderer.drawRoundRect(ctx, cx - 350, itemY - 20, 700, 44, 6, 'rgba(255, 215, 0, 0.15)');
            }

            // Draw Item Label
            this.engine.renderer.drawText(ctx, item.label, cx - 320, itemY, {
                size: isSelected ? 22 : 18,
                font: isSelected ? 'Fredoka One' : 'Nunito',
                color: isSelected ? COLORS.COIN_GOLD : '#FFFFFF',
                align: 'left'
            });

            // Draw Item controls on right side
            if (item.type === 'slider') {
                const val = item.id === 'music' ? this.engine.settings.musicVolume : this.engine.settings.sfxVolume;
                this._drawSlider(ctx, cx + 120, itemY, 180, val, isSelected);
            } else if (item.type === 'toggle') {
                const val = this.engine.settings[item.id];
                const optionIdx = item.options.indexOf(val);
                
                let valLabel = val;
                if (item.labels) {
                    valLabel = item.labels[optionIdx];
                }
                
                this._drawToggle(ctx, cx + 120, itemY, 180, valLabel, isSelected);
            } else if (item.type === 'button') {
                // Back button text centered
                this.engine.renderer.drawText(ctx, isSelected ? "▶ SAVE & RETURN ◀" : "SAVE & RETURN", cx, itemY, {
                    size: 24,
                    font: 'Fredoka One',
                    color: isSelected ? COLORS.COIN_GOLD : '#66BB6A',
                    align: 'center'
                });
            }
        }
    }

    _drawSlider(ctx, x, y, w, pct, isSelected) {
        // Draw track
        this.engine.renderer.drawRoundRect(ctx, x, y - 4, w, 8, 4, 'rgba(255,255,255,0.2)', '#000000', 1);

        // Filled track
        const fillW = w * pct;
        if (fillW > 0) {
            this.engine.renderer.drawRoundRect(ctx, x, y - 4, fillW, 8, 4, isSelected ? COLORS.COIN_GOLD : '#42A5F5');
        }

        // Draggable Knob handle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + fillW, y, isSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();

        // Print percentage text
        this.engine.renderer.drawText(ctx, `${Math.floor(pct * 100)}%`, x + w + 15, y, {
            size: 16, color: '#B0BEC5', align: 'left'
        });
    }

    _drawToggle(ctx, x, y, w, valText, isSelected) {
        // Toggle pill box shape
        this.engine.renderer.drawRoundRect(ctx, x, y - 14, w, 28, 14, 'rgba(0,0,0,0.4)', isSelected ? COLORS.COIN_GOLD : '#B0BEC5', 1.5);

        // Center Option text
        this.engine.renderer.drawText(ctx, valText.toString().toUpperCase(), x + w / 2, y, {
            size: 16,
            font: 'Fredoka One',
            color: isSelected ? COLORS.COIN_GOLD : '#FFFFFF',
            align: 'center'
        });
    }

    _onMouseMove(e) {
        if (this.engine.state !== STATE.SETTINGS) return;

        const pos = this._getCanvasMousePos(e);
        const startY = 170;
        const rowHeight = 65;

        for (let i = 0; i < this.items.length; i++) {
            const itemY = startY + i * rowHeight;
            // row bounds check
            if (pos.x >= CANVAS_WIDTH / 2 - 350 && pos.x <= CANVAS_WIDTH / 2 + 350 &&
                pos.y >= itemY - 20 && pos.y <= itemY + 24) {
                if (this.selectedItem !== i) {
                    this.selectedItem = i;
                    if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                }
                break;
            }
        }
    }

    _onMouseClick(e) {
        if (this.engine.state !== STATE.SETTINGS) return;

        const pos = this._getCanvasMousePos(e);
        const startY = 170;
        const rowHeight = 65;
        const cx = CANVAS_WIDTH / 2;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemY = startY + i * rowHeight;
            
            if (pos.x >= cx - 350 && pos.x <= cx + 350 &&
                pos.y >= itemY - 20 && pos.y <= itemY + 24) {
                
                this.selectedItem = i;
                
                if (item.type === 'slider') {
                    const sliderX = cx + 120;
                    const sliderW = 180;
                    if (pos.x >= sliderX && pos.x <= sliderX + sliderW) {
                        const val = (pos.x - sliderX) / sliderW;
                        this._applyValue(item.id, clamp(val, 0, 1));
                        if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                    }
                } else if (item.type === 'toggle') {
                    const toggleX = cx + 120;
                    const toggleW = 180;
                    if (pos.x >= toggleX && pos.x <= toggleX + toggleW) {
                        this._cycleToggle(item);
                        if (this.engine.audio) this.engine.audio.playSound(SFX.COIN);
                    }
                } else if (item.type === 'button') {
                    if (this.engine.audio) this.engine.audio.playSound(SFX.CHECKPOINT);
                    this.saveAndExit();
                }
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
