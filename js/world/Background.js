/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Background.js
 * ============================================================
 * Multi-layer parallax background system.
 * Supports 13 unique world themes with animated weather,
 * sky gradients, silhouettes, and environmental effects.
 */

'use strict';

window.Background = class Background {

    constructor() {
        /** @type {string} Active theme name */
        this.theme = 'greenHills';
        /** @type {Array<Object>} Parallax layer descriptors */
        this.layers = [];
        /** Accumulated animation time for wave/cloud animation */
        this.animTime = 0;
        /** Weather particle-like objects (rain, snow, ash) */
        this.weatherParticles = [];
        /** Alpha 0→1 for cross-fade when switching themes */
        this.transitionAlpha = 1;
        /** How many weather particles to spawn */
        this._weatherCapacity = 120;
        this._prevTheme = null;
    }

    // ─────────────────────────────────────────────────────────
    // Theme loader
    // ─────────────────────────────────────────────────────────

    /**
     * Switch to a new background theme.
     * @param {string} themeName
     */
    setTheme(themeName) {
        if (this.theme === themeName) return;
        this._prevTheme  = this.theme;
        this.theme       = themeName;
        this.transitionAlpha = 0;
        this.weatherParticles.length = 0;
        this._buildLayers(themeName);
    }

    /**
     * Build layer data for a theme.
     * Each layer: { parallaxFactor, elements[] }
     * Elements are drawing instructions consumed by render().
     * @param {string} theme
     */
    _buildLayers(theme) {
        this.layers = [
            { parallaxFactor: 0.00, type: 'sky'  },
            { parallaxFactor: 0.10, type: 'far'  },
            { parallaxFactor: 0.20, type: 'mid'  },
            { parallaxFactor: 0.40, type: 'near' },
            { parallaxFactor: 0.60, type: 'deco' },
        ];

        // Seed weather particles based on theme
        switch (theme) {
            case 'snow':
            case 'mountain':
                this._seedWeather('snow');
                break;
            case 'volcano':
                this._seedWeather('ash');
                break;
            case 'haunted':
                this._seedWeather('fog');
                break;
            case 'river':
            case 'jungle':
                if (rnd(0,1) > 0.5) this._seedWeather('rain');
                break;
            default:
                break;
        }
    }

    /** Seed initial weather particles so the screen isn't empty on load. */
    _seedWeather(type) {
        for (let i = 0; i < this._weatherCapacity; i++) {
            this.weatherParticles.push(this._newWeatherParticle(type,
                rnd(0, CANVAS_WIDTH),
                rnd(0, CANVAS_HEIGHT)
            ));
        }
    }

    /** Create a single weather particle. */
    _newWeatherParticle(type, x, y) {
        switch (type) {
            case 'snow': return { type, x, y, vx: rnd(-20,20), vy: rnd(50,120), size: rnd(2,5), alpha: rnd(0.5,1.0), life: rnd(2,4), maxLife: rnd(2,4) };
            case 'rain': return { type, x, y, vx: 30, vy: rnd(500,700), len: rnd(10,20), alpha: rnd(0.4,0.8), life: rnd(0.6,1.1), maxLife: rnd(0.6,1.1) };
            case 'ash':  return { type, x, y, vx: rnd(-15,15), vy: rnd(30,70), size: rnd(1,4), alpha: rnd(0.3,0.7), life: rnd(3,6), maxLife: rnd(3,6) };
            case 'fog':  return { type, x, y, vx: rnd(5,20), vy: 0, size: rnd(60,140), alpha: rnd(0.03,0.10), life: rnd(4,8), maxLife: rnd(4,8) };
            default:     return { type: 'snow', x, y, vx: 0, vy: 60, size: 3, alpha: 1, life: 3, maxLife: 3 };
        }
    }

    // ─────────────────────────────────────────────────────────
    // Update
    // ─────────────────────────────────────────────────────────

    /**
     * Animate background elements.
     * @param {number} dt - Delta time seconds
     */
    update(dt) {
        this.animTime += dt;
        if (this.transitionAlpha < 1) this.transitionAlpha = Math.min(1, this.transitionAlpha + dt * 2);

        // Update weather particles
        const type = this._getWeatherType();
        if (!type) { this.weatherParticles.length = 0; return; }

        for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
            const p = this.weatherParticles[i];
            p.life -= dt;
            p.x   += p.vx * dt;
            p.y   += p.vy * dt;
            if (p.life <= 0 || p.y > CANVAS_HEIGHT + 50 || p.x < -50 || p.x > CANVAS_WIDTH + 50) {
                // Respawn at top
                const np = this._newWeatherParticle(type, rnd(0, CANVAS_WIDTH), -20);
                this.weatherParticles[i] = np;
            }
        }

        // Ensure capacity
        while (this.weatherParticles.length < this._weatherCapacity) {
            this.weatherParticles.push(this._newWeatherParticle(type, rnd(0, CANVAS_WIDTH), rnd(-50, CANVAS_HEIGHT)));
        }
    }

    _getWeatherType() {
        switch (this.theme) {
            case 'snow': case 'mountain': return 'snow';
            case 'volcano':               return 'ash';
            case 'haunted':               return 'fog';
            default:                      return null;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────

    /**
     * Draw background from back to front with parallax offsets.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x:number, y:number}} camera
     * @param {number} worldWidth
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    render(ctx, camera, worldWidth, canvasWidth, canvasHeight) {
        const cw = canvasWidth  || CANVAS_WIDTH;
        const ch = canvasHeight || CANVAS_HEIGHT;
        const t  = this.theme;

        ctx.save();

        // ── Layer 0: Sky (full screen, no parallax) ──────────
        this._drawSky(ctx, t, cw, ch);

        // ── Layer 1: Far horizon elements ─────────────────────
        const off1 = -(camera.x * 0.10) % cw;
        ctx.save();
        ctx.translate(off1, 0);
        this._drawFarLayer(ctx, t, cw, ch, worldWidth);
        ctx.restore();

        // ── Layer 2: Mid silhouettes ──────────────────────────
        const off2 = -(camera.x * 0.20) % (cw * 1.5);
        ctx.save();
        ctx.translate(off2, 0);
        this._drawMidLayer(ctx, t, cw, ch);
        ctx.restore();

        // ── Layer 3: Near background ──────────────────────────
        const off3 = -(camera.x * 0.40) % (cw * 2);
        ctx.save();
        ctx.translate(off3, 0);
        this._drawNearLayer(ctx, t, cw, ch);
        ctx.restore();

        // ── Layer 4: Decorations ──────────────────────────────
        // (rendered per-tile in world space — skip here, handled by theme)

        // ── Weather overlay ──────────────────────────────────
        this._drawWeather(ctx, t, cw, ch);

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ─────────────────────────────────────────────────────────
    // Sky gradient
    // ─────────────────────────────────────────────────────────

    /**
     * Draw the full-screen sky gradient for the given theme.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} theme
     * @param {number} cw Canvas width
     * @param {number} ch Canvas height
     */
    _drawSky(ctx, theme, cw, ch) {
        const grad = ctx.createLinearGradient(0, 0, 0, ch);

        switch (theme) {
            case 'greenHills':
                grad.addColorStop(0.0, '#87CEEB');
                grad.addColorStop(0.6, '#B0E0FF');
                grad.addColorStop(1.0, '#D4F5C5');
                break;
            case 'forest':
                grad.addColorStop(0.0, '#4A7C59');
                grad.addColorStop(0.5, '#6BA368');
                grad.addColorStop(1.0, '#2D5E3A');
                break;
            case 'river':
                grad.addColorStop(0.0, '#FFD580');
                grad.addColorStop(0.4, '#FFA040');
                grad.addColorStop(0.8, '#FF8C42');
                grad.addColorStop(1.0, '#D4A850');
                break;
            case 'mountain':
                grad.addColorStop(0.0, '#4B6CB7');
                grad.addColorStop(0.5, '#8EA8CC');
                grad.addColorStop(1.0, '#BFCFE8');
                break;
            case 'cave':
                grad.addColorStop(0.0, '#0A0A12');
                grad.addColorStop(0.5, '#14142A');
                grad.addColorStop(1.0, '#0D1520');
                break;
            case 'desert':
                grad.addColorStop(0.0, '#FF6B35');
                grad.addColorStop(0.4, '#FFAD60');
                grad.addColorStop(0.8, '#FFD580');
                grad.addColorStop(1.0, '#E8C870');
                break;
            case 'snow':
                grad.addColorStop(0.0, '#A8C8E0');
                grad.addColorStop(0.5, '#C8DFF0');
                grad.addColorStop(1.0, '#E8F4FF');
                break;
            case 'jungle':
                grad.addColorStop(0.0, '#1B4332');
                grad.addColorStop(0.5, '#2D6A4F');
                grad.addColorStop(1.0, '#40916C');
                break;
            case 'volcano':
                grad.addColorStop(0.0, '#1A0000');
                grad.addColorStop(0.3, '#4A0E00');
                grad.addColorStop(0.7, '#8B1A00');
                grad.addColorStop(1.0, '#C93F00');
                break;
            case 'haunted':
                grad.addColorStop(0.0, '#0A0014');
                grad.addColorStop(0.4, '#1E0035');
                grad.addColorStop(0.8, '#2D0050');
                grad.addColorStop(1.0, '#1A0028');
                break;
            case 'sky':
                grad.addColorStop(0.0, '#0D47A1');
                grad.addColorStop(0.4, '#1565C0');
                grad.addColorStop(0.8, '#42A5F5');
                grad.addColorStop(1.0, '#90CAF9');
                break;
            case 'castle':
                grad.addColorStop(0.0, '#37474F');
                grad.addColorStop(0.5, '#546E7A');
                grad.addColorStop(1.0, '#78909C');
                break;
            case 'fortress':
                grad.addColorStop(0.0, '#0D0020');
                grad.addColorStop(0.4, '#1A0040');
                grad.addColorStop(0.8, '#2D006B');
                grad.addColorStop(1.0, '#1A0035');
                break;
            default:
                grad.addColorStop(0.0, '#87CEEB');
                grad.addColorStop(1.0, '#D4F5C5');
                break;
        }

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);

        // Extra ambiance on certain themes
        switch (theme) {
            case 'greenHills':
                this._drawSun(ctx, cw * 0.8, ch * 0.15, 45, '#FFF176', '#FFD54F');
                break;
            case 'river':
                this._drawSun(ctx, cw * 0.75, ch * 0.2, 55, '#FFE57F', '#FFB300');
                break;
            case 'desert':
                this._drawSun(ctx, cw * 0.7, ch * 0.12, 65, '#FFEE58', '#FFAB00');
                break;
            case 'haunted':
                this._drawMoon(ctx, cw * 0.8, ch * 0.12, 40);
                this._drawStarField(ctx, cw, ch * 0.5);
                break;
            case 'sky':
                this._drawSun(ctx, cw * 0.85, ch * 0.08, 60, '#FFF9C4', '#FFF176');
                break;
            case 'cave':
                this._drawGlowingCrystals(ctx, cw, ch);
                break;
            case 'fortress':
                this._drawLightningFlash(ctx, cw, ch);
                this._drawStarField(ctx, cw, ch * 0.45);
                break;
            case 'volcano':
                this._drawLavaGlow(ctx, cw, ch);
                break;
            case 'snow':
                this._drawNorthernLights(ctx, cw, ch);
                break;
            default:
                break;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Ambient sky decorations
    // ─────────────────────────────────────────────────────────

    _drawSun(ctx, x, y, r, innerCol, outerCol) {
        // Glow
        const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.5);
        glow.addColorStop(0.0, outerCol + 'AA');
        glow.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Sun disc
        const disc = ctx.createRadialGradient(x, y, 0, x, y, r);
        disc.addColorStop(0.0, '#FFFFFF');
        disc.addColorStop(0.4, innerCol);
        disc.addColorStop(1.0, outerCol);
        ctx.fillStyle = disc;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawMoon(ctx, x, y, r) {
        // Moon halo
        ctx.fillStyle = 'rgba(255,255,220,0.08)';
        ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ECEFF1';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // Crescent shadow
        ctx.fillStyle = '#1A0035';
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.85, 0, Math.PI * 2); ctx.fill();
        // Craters
        ctx.fillStyle = '#B0BEC5';
        [[r*0.3, -r*0.4, 3],[r*0.55, r*0.2, 2],[-r*0.1, r*0.3, 1.5]].forEach(([ox,oy,cr])=>{
            ctx.beginPath(); ctx.arc(x+ox, y+oy, cr, 0, Math.PI*2); ctx.fill();
        });
    }

    _drawStarField(ctx, cw, height) {
        ctx.fillStyle = '#FFFFFF';
        const seed = 42;
        for (let i = 0; i < 80; i++) {
            const sx = ((i * 137 + seed * 7) % 1000) / 1000 * cw;
            const sy = ((i * 211 + seed * 3) % 1000) / 1000 * height;
            const sr = ((i * 53  + seed)     % 100)  / 100 * 1.5 + 0.5;
            const blink = 0.5 + 0.5 * Math.sin(this.animTime * 2 + i);
            ctx.globalAlpha = blink * 0.8 + 0.2;
            ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _drawGlowingCrystals(ctx, cw, ch) {
        const crystals = [
            { x: cw * 0.1, y: ch * 0.7, color: '#4DD0E1', h: 60 },
            { x: cw * 0.25, y: ch * 0.8, color: '#AB47BC', h: 45 },
            { x: cw * 0.6, y: ch * 0.75, color: '#42A5F5', h: 55 },
            { x: cw * 0.85, y: ch * 0.72, color: '#66BB6A', h: 50 },
        ];
        crystals.forEach(c => {
            const pulse = 0.4 + 0.3 * Math.sin(this.animTime * 1.5 + c.x);
            const glow  = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 60);
            glow.addColorStop(0, c.color + Math.round(pulse * 255).toString(16).padStart(2,'0'));
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(c.x, c.y, 60, 0, Math.PI*2); ctx.fill();

            // Crystal shape
            ctx.fillStyle = c.color + '88';
            ctx.beginPath();
            ctx.moveTo(c.x, c.y - c.h);
            ctx.lineTo(c.x + 10, c.y - c.h * 0.4);
            ctx.lineTo(c.x + 8,  c.y);
            ctx.lineTo(c.x - 8,  c.y);
            ctx.lineTo(c.x - 10, c.y - c.h * 0.4);
            ctx.closePath();
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    _drawLightningFlash(ctx, cw, ch) {
        if (Math.sin(this.animTime * 7) > 0.94) {
            ctx.fillStyle = 'rgba(200,200,255,0.12)';
            ctx.fillRect(0, 0, cw, ch);
        }
    }

    _drawLavaGlow(ctx, cw, ch) {
        const pulse = 0.3 + 0.2 * Math.sin(this.animTime * 2);
        const g = ctx.createLinearGradient(0, ch * 0.7, 0, ch);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(255,80,0,${pulse})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
    }

    _drawNorthernLights(ctx, cw, ch) {
        const t = this.animTime * 0.3;
        ['rgba(0,255,180,0.06)','rgba(100,100,255,0.05)','rgba(0,255,120,0.04)'].forEach((col, i) => {
            ctx.beginPath();
            ctx.moveTo(0, ch * 0.25);
            for (let x = 0; x <= cw; x += 20) {
                const y = ch * 0.25 + Math.sin(x * 0.008 + t + i) * 60 + Math.sin(x * 0.003 + t * 0.7) * 40;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(cw, 0); ctx.lineTo(0, 0); ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
        });
    }

    // ─────────────────────────────────────────────────────────
    // Far layer (parallax 0.10)
    // ─────────────────────────────────────────────────────────

    _drawFarLayer(ctx, theme, cw, ch) {
        switch (theme) {
            case 'greenHills':
                this._drawClouds(ctx, cw, ch, 3, '#FFFFFF', 0.95);
                // Rolling far hills
                ctx.fillStyle = '#A5D6A7';
                this._drawRollingHills(ctx, cw, ch, ch * 0.55, 0.003);
                break;
            case 'forest':
                this._drawClouds(ctx, cw, ch, 2, '#7CB9A0', 0.4);
                ctx.fillStyle = '#1B5E20';
                this._drawRollingHills(ctx, cw, ch, ch * 0.5, 0.004);
                break;
            case 'river':
                this._drawClouds(ctx, cw, ch, 4, '#FFE0B2', 0.7);
                // Warm horizon hills
                ctx.fillStyle = '#8D6E63';
                this._drawRollingHills(ctx, cw, ch, ch * 0.6, 0.0025);
                break;
            case 'mountain':
                this._drawMountainRange(ctx, cw, ch, '#5C6BC0', ch * 0.1, 250, true);
                this._drawMountainRange(ctx, cw, ch, '#7986CB', ch * 0.2, 200, false);
                this._drawClouds(ctx, cw, ch, 5, 'rgba(255,255,255,0.9)', 0.9);
                break;
            case 'cave':
                // Stalactite silhouettes
                ctx.fillStyle = '#050510';
                this._drawStalactites(ctx, cw, 0, 80, 10);
                break;
            case 'desert':
                // Far dunes
                ctx.fillStyle = '#D2691E';
                this._drawRollingHills(ctx, cw, ch, ch * 0.65, 0.002, 160);
                this._drawClouds(ctx, cw, ch, 1, 'rgba(255,200,100,0.5)', 0.5);
                break;
            case 'snow':
                this._drawClouds(ctx, cw, ch, 4, '#ECEFF1', 0.9);
                ctx.fillStyle = '#B0BEC5';
                this._drawRollingHills(ctx, cw, ch, ch * 0.55, 0.003, 80);
                break;
            case 'jungle':
                ctx.fillStyle = '#1B5E20';
                this._drawRollingHills(ctx, cw, ch, ch * 0.4, 0.005);
                this._drawClouds(ctx, cw, ch, 2, 'rgba(200,255,200,0.4)', 0.4);
                break;
            case 'volcano':
                this._drawMountainRange(ctx, cw, ch, '#2D0000', ch * 0.1, 300, false);
                this._drawVolcanoBackground(ctx, cw, ch);
                break;
            case 'haunted':
                this._drawMountainRange(ctx, cw, ch, '#1A0035', ch * 0.15, 180, false);
                this._drawFloatingSpirits(ctx, cw, ch);
                break;
            case 'sky':
                this._drawClouds(ctx, cw, ch, 8, '#FFFFFF', 1.0);
                break;
            case 'castle':
                ctx.fillStyle = '#37474F';
                this._drawRollingHills(ctx, cw, ch, ch * 0.6, 0.002);
                this._drawCastleBackground(ctx, cw, ch);
                break;
            case 'fortress':
                this._drawFortressBackground(ctx, cw, ch);
                break;
            default:
                break;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Mid layer (parallax 0.20)
    // ─────────────────────────────────────────────────────────

    _drawMidLayer(ctx, theme, cw, ch) {
        switch (theme) {
            case 'greenHills':
                ctx.fillStyle = '#81C784';
                this._drawRollingHills(ctx, cw, ch, ch * 0.65, 0.004, 100);
                // Mid trees
                for (let x = 80; x < cw * 2; x += 180) {
                    this._drawTree(ctx, x, ch * 0.65, 0.9 + rnd(-0.1,0.1), 'oak');
                }
                break;
            case 'forest':
                for (let x = 60; x < cw * 2; x += 120) {
                    this._drawTree(ctx, x, ch * 0.65, 0.8 + rnd(-0.15,0.15), 'pine');
                }
                break;
            case 'river':
                this._drawAnimatedWater(ctx, 0, ch * 0.72, cw * 2, this.animTime, '#64B5F6', 0.6);
                // Weeping willows
                for (let x = 100; x < cw * 2; x += 250) {
                    this._drawTree(ctx, x, ch * 0.72, 1.1, 'willow');
                }
                break;
            case 'mountain':
                ctx.fillStyle = '#455A64';
                this._drawRollingHills(ctx, cw, ch, ch * 0.65, 0.0035, 60);
                this._drawClouds(ctx, cw, ch, 3, 'rgba(255,255,255,0.7)', 0.7);
                break;
            case 'cave':
                ctx.fillStyle = '#070715';
                this._drawStalactites(ctx, cw, 0, 110, 15);
                // Stalagmites from floor
                ctx.fillStyle = '#0A0A20';
                this._drawStalagmites(ctx, cw, ch, 90, 12);
                break;
            case 'desert':
                // Cacti
                for (let x = 120; x < cw * 2; x += 220) {
                    this._drawCactus(ctx, x, ch * 0.72);
                }
                ctx.fillStyle = '#B8860B';
                this._drawRollingHills(ctx, cw, ch, ch * 0.72, 0.0028, 120);
                break;
            case 'snow':
                ctx.fillStyle = '#ECEFF1';
                this._drawRollingHills(ctx, cw, ch, ch * 0.65, 0.003, 80);
                for (let x = 100; x < cw * 2; x += 160) {
                    this._drawTree(ctx, x, ch * 0.65, 0.8, 'pine_snow');
                }
                break;
            case 'jungle':
                for (let x = 40; x < cw * 2; x += 90) {
                    this._drawTree(ctx, x, ch * 0.55, 1.2 + rnd(-0.2,0.2), 'palm');
                }
                break;
            case 'volcano':
                ctx.fillStyle = '#1A0800';
                this._drawRollingHills(ctx, cw, ch, ch * 0.7, 0.003, 80);
                // Lava streams
                this._drawLavaStreams(ctx, cw, ch);
                break;
            case 'haunted':
                ctx.fillStyle = '#1A0028';
                this._drawRollingHills(ctx, cw, ch, ch * 0.65, 0.003, 60);
                for (let x = 100; x < cw * 2; x += 180) {
                    this._drawTree(ctx, x, ch * 0.65, 0.9, 'dead');
                }
                break;
            case 'sky':
                this._drawClouds(ctx, cw, ch * 1.2, 5, '#E3F2FD', 0.9);
                break;
            case 'castle':
                ctx.fillStyle = '#263238';
                this._drawRollingHills(ctx, cw, ch, ch * 0.7, 0.0025, 50);
                this._drawClouds(ctx, cw, ch, 2, 'rgba(180,180,200,0.5)', 0.5);
                break;
            case 'fortress':
                ctx.fillStyle = '#0D001A';
                this._drawRollingHills(ctx, cw, ch, ch * 0.65, 0.003, 70);
                break;
            default:
                break;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Near layer (parallax 0.40)
    // ─────────────────────────────────────────────────────────

    _drawNearLayer(ctx, theme, cw, ch) {
        switch (theme) {
            case 'greenHills':
                ctx.fillStyle = '#4CAF50';
                this._drawRollingHills(ctx, cw, ch, ch * 0.78, 0.005, 120);
                // Flowers
                this._drawFlowers(ctx, cw, ch * 0.78);
                break;
            case 'forest':
                ctx.fillStyle = '#2E7D32';
                this._drawRollingHills(ctx, cw, ch, ch * 0.78, 0.005, 80);
                this._drawMistEffect(ctx, cw, ch);
                break;
            case 'river':
                this._drawAnimatedWater(ctx, 0, ch * 0.82, cw * 2, this.animTime, '#1E88E5', 0.85);
                break;
            case 'mountain':
                ctx.fillStyle = '#37474F';
                this._drawRollingHills(ctx, cw, ch, ch * 0.78, 0.004, 50);
                break;
            case 'cave':
                // Phosphorescent crystal clusters
                this._drawCrystalClusters(ctx, cw, ch);
                break;
            case 'desert':
                ctx.fillStyle = '#C19A6B';
                this._drawRollingHills(ctx, cw, ch, ch * 0.8, 0.003, 140);
                this._drawHeatHaze(ctx, cw, ch);
                break;
            case 'snow':
                ctx.fillStyle = '#FFFFFF';
                this._drawRollingHills(ctx, cw, ch, ch * 0.8, 0.003, 90);
                break;
            case 'jungle':
                ctx.fillStyle = '#1A7A3A';
                this._drawRollingHills(ctx, cw, ch, ch * 0.78, 0.006, 100);
                this._drawJungleVines(ctx, cw, ch);
                break;
            case 'volcano':
                // Lava pool at base
                this._drawLavaPool(ctx, cw, ch);
                break;
            case 'haunted':
                ctx.fillStyle = '#0D0020';
                this._drawRollingHills(ctx, cw, ch, ch * 0.8, 0.003, 50);
                this._drawGravestones(ctx, cw, ch * 0.8);
                break;
            case 'sky':
                // Distant land view far below
                this._drawSkyFloor(ctx, cw, ch);
                break;
            case 'castle':
                ctx.fillStyle = '#1C313A';
                this._drawRollingHills(ctx, cw, ch, ch * 0.78, 0.003, 60);
                this._drawTorches(ctx, cw, ch);
                break;
            case 'fortress':
                ctx.fillStyle = '#050010';
                this._drawRollingHills(ctx, cw, ch, ch * 0.78, 0.003, 60);
                this._drawShadowEnergy(ctx, cw, ch);
                break;
            default:
                break;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Reusable drawing helpers
    // ─────────────────────────────────────────────────────────

    /**
     * Draw rolling hills as a filled polygon.
     */
    _drawRollingHills(ctx, cw, ch, baseY, freq = 0.003, amp = 100) {
        ctx.beginPath();
        ctx.moveTo(-20, baseY);
        for (let x = -20; x <= cw * 2 + 20; x += 8) {
            const y = baseY + Math.sin(x * freq + this.animTime * 0.05) * amp
                            + Math.sin(x * freq * 2.3 + 1.2) * (amp * 0.4);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(cw * 2 + 20, ch);
        ctx.lineTo(-20, ch);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Draw animated clouds.
     */
    _drawClouds(ctx, cw, ch, count, color = '#FFFFFF', alpha = 0.9) {
        const savedAlpha = ctx.globalAlpha;
        // Use deterministic seed positions that scroll
        for (let i = 0; i < count; i++) {
            const cx  = ((i * 317 + 80) % 1100) + Math.sin(this.animTime * 0.04 + i) * 20;
            const cy  = 40 + (i * 83 % 220);
            const rx  = 70 + (i * 47 % 60);
            const ry  = 28 + (i * 31 % 20);
            const a   = alpha * (0.7 + 0.3 * Math.sin(this.animTime * 0.2 + i));
            ctx.globalAlpha = a;
            this._drawCloud(ctx, cx, cy, rx, ry, color);
        }
        ctx.globalAlpha = savedAlpha;
    }

    _drawCloud(ctx, x, y, rx, ry, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - rx * 0.45, y + ry * 0.2, rx * 0.6, ry * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + rx * 0.45, y + ry * 0.2, rx * 0.65, ry * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }

    /**
     * Draw a mountain silhouette.
     */
    _drawMountain(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.5, y);
        ctx.lineTo(x, y - h);
        ctx.lineTo(x + w * 0.5, y);
        ctx.closePath();
        ctx.fill();
    }

    _drawMountainRange(ctx, cw, ch, color, startY, maxH, snowCaps) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-20, ch);
        ctx.lineTo(-20, ch * 0.5);
        const peaks = 8;
        for (let i = 0; i <= peaks; i++) {
            const mx = (i / peaks) * (cw * 2 + 40) - 20;
            const peakH = startY + ((i * 137 + 17) % 100) / 100 * maxH;
            if (i === 0 || i === peaks) { ctx.lineTo(mx, ch * 0.5); continue; }
            ctx.lineTo(mx - 60, ch * 0.45 + peakH);
            ctx.lineTo(mx, startY);
            ctx.lineTo(mx + 60, ch * 0.45 + peakH);
        }
        ctx.lineTo(cw * 2 + 20, ch);
        ctx.closePath();
        ctx.fill();

        if (snowCaps) {
            ctx.fillStyle = '#ECEFF1';
            // Just draw snow caps on top quarter of range
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(-20, ch * 0.5);
            for (let i = 0; i <= peaks; i++) {
                const mx = (i / peaks) * (cw * 2 + 40) - 20;
                if (i === 0 || i === peaks) { ctx.lineTo(mx, ch * 0.5); continue; }
                ctx.lineTo(mx - 30, startY + ((i*137+17)%100)/100 * maxH * 0.25 + startY);
                ctx.lineTo(mx, startY);
                ctx.lineTo(mx + 30, startY + ((i*137+17)%100)/100 * maxH * 0.25 + startY);
            }
            ctx.lineTo(cw * 2 + 20, ch * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Draw a tree at world position.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y - Base (ground level)
     * @param {number} scale
     * @param {string} type - 'pine'|'oak'|'palm'|'dead'|'willow'|'pine_snow'
     */
    _drawTree(ctx, x, y, scale = 1, type = 'oak') {
        const s = scale;
        ctx.save();
        ctx.translate(x, y);

        switch (type) {
            case 'pine': {
                // Trunk
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(-4*s, -20*s, 8*s, 20*s);
                // Tiers
                const tiers = [[0, -70*s, 40*s, 30*s], [0, -100*s, 32*s, 28*s], [0, -125*s, 24*s, 26*s]];
                ctx.fillStyle = '#2E7D32';
                tiers.forEach(([tx, ty, tw, th]) => {
                    ctx.beginPath();
                    ctx.moveTo(tx, ty + th);
                    ctx.lineTo(tx - tw * 0.5, ty + th);
                    ctx.lineTo(tx, ty);
                    ctx.lineTo(tx + tw * 0.5, ty + th);
                    ctx.closePath();
                    ctx.fill();
                });
                break;
            }
            case 'pine_snow': {
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(-4*s, -20*s, 8*s, 20*s);
                const tiers2 = [[0, -70*s, 40*s, 30*s],[0, -100*s, 32*s, 28*s],[0,-125*s,24*s,26*s]];
                ctx.fillStyle = '#2E7D32';
                tiers2.forEach(([tx,ty,tw,th])=>{ ctx.beginPath(); ctx.moveTo(tx,ty+th); ctx.lineTo(tx-tw*0.5,ty+th); ctx.lineTo(tx,ty); ctx.lineTo(tx+tw*0.5,ty+th); ctx.closePath(); ctx.fill(); });
                // Snow on top
                ctx.fillStyle = '#ECEFF1';
                ctx.globalAlpha = 0.85;
                tiers2.forEach(([tx,ty,tw,th])=>{ ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx-tw*0.25,ty+th*0.5); ctx.lineTo(tx+tw*0.25,ty+th*0.5); ctx.closePath(); ctx.fill(); });
                ctx.globalAlpha = 1;
                break;
            }
            case 'oak': {
                ctx.fillStyle = '#6D4C41';
                ctx.fillRect(-5*s, -20*s, 10*s, 20*s);
                ctx.fillStyle = '#388E3C';
                ctx.beginPath();
                ctx.arc(0, -75*s, 40*s, 0, Math.PI*2); ctx.fill();
                ctx.beginPath();
                ctx.arc(-22*s, -60*s, 28*s, 0, Math.PI*2); ctx.fill();
                ctx.beginPath();
                ctx.arc(22*s, -58*s, 30*s, 0, Math.PI*2); ctx.fill();
                break;
            }
            case 'palm': {
                // Curved trunk
                ctx.strokeStyle = '#8D6E63';
                ctx.lineWidth = 8 * s;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(20*s, -40*s, 10*s, -80*s, -10*s, -110*s);
                ctx.stroke();
                // Fronds
                ctx.strokeStyle = '#43A047';
                ctx.lineWidth = 3 * s;
                const fronds = 6;
                for (let i = 0; i < fronds; i++) {
                    const ang = (i / fronds) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(-10*s, -110*s);
                    ctx.quadraticCurveTo(
                        -10*s + Math.cos(ang)*50*s, -110*s + Math.sin(ang)*50*s,
                        -10*s + Math.cos(ang)*90*s, -110*s + Math.sin(ang)*30*s
                    );
                    ctx.stroke();
                }
                break;
            }
            case 'dead': {
                ctx.strokeStyle = '#37474F';
                ctx.lineWidth = 7 * s;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5*s, -90*s); ctx.stroke();
                ctx.lineWidth = 3 * s;
                [[0, -60*s, -35*s, -80*s], [0, -70*s, 30*s, -90*s], [-5*s, -40*s, -25*s, -55*s]].forEach(([sx,sy,ex,ey])=>{
                    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
                });
                break;
            }
            case 'willow': {
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(-5*s, -20*s, 10*s, 20*s);
                ctx.fillStyle = '#558B2F';
                ctx.beginPath(); ctx.arc(0, -80*s, 50*s, 0, Math.PI*2); ctx.fill();
                // Drooping strands
                ctx.strokeStyle = '#33691E';
                ctx.lineWidth = 2 * s;
                for (let i = -3; i <= 3; i++) {
                    const hangX = i * 15 * s;
                    ctx.beginPath();
                    ctx.moveTo(hangX, -80*s + 20*s);
                    ctx.quadraticCurveTo(hangX + rnd(-10,10)*s, -40*s, hangX + 5*s, 0);
                    ctx.stroke();
                }
                break;
            }
            default: break;
        }

        ctx.restore();
    }

    /** Draw an animated water strip. */
    _drawAnimatedWater(ctx, x, y, w, animTime, color = '#1E88E5', alpha = 0.7) {
        const h = CANVAS_HEIGHT - y + 20;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Fill base
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        // Wave surface
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 0; i <= w; i += 10) {
            const wy = y + Math.sin((i + animTime * 80) * 0.05) * 5
                         + Math.sin((i + animTime * 60) * 0.09 + 2) * 3;
            ctx.lineTo(x + i, wy);
        }
        ctx.lineTo(x + w, y);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _drawVolcanoBackground(ctx, cw, ch) {
        // Active volcano silhouette
        const vx = cw * 0.65, vy = ch;
        ctx.fillStyle = '#1A0000';
        ctx.beginPath();
        ctx.moveTo(vx - 180, vy);
        ctx.lineTo(vx - 80, ch * 0.3);
        ctx.lineTo(vx, ch * 0.15);
        ctx.lineTo(vx + 80, ch * 0.3);
        ctx.lineTo(vx + 180, vy);
        ctx.closePath();
        ctx.fill();

        // Lava glow at crater
        const glow = ctx.createRadialGradient(vx, ch * 0.18, 0, vx, ch * 0.18, 80);
        const pulse = 0.5 + 0.3 * Math.sin(this.animTime * 3);
        glow.addColorStop(0, `rgba(255,100,0,${pulse})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(vx, ch * 0.18, 80, 0, Math.PI * 2); ctx.fill();
    }

    _drawCastleBackground(ctx, cw, ch) {
        const towers = [cw * 0.15, cw * 0.5, cw * 0.85, cw * 1.2];
        towers.forEach(tx => {
            ctx.fillStyle = '#37474F';
            ctx.fillRect(tx - 30, ch * 0.35, 60, ch * 0.5);
            // Battlements
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(tx - 28 + i * 16, ch * 0.32, 10, 12);
            }
        });
        // Flags
        towers.forEach(tx => {
            ctx.strokeStyle = '#B71C1C';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx, ch * 0.25);
            ctx.lineTo(tx, ch * 0.32);
            ctx.stroke();
            ctx.fillStyle = '#F44336';
            const wave = Math.sin(this.animTime * 3 + tx) * 5;
            ctx.beginPath();
            ctx.moveTo(tx, ch * 0.25);
            ctx.lineTo(tx + 20 + wave, ch * 0.27);
            ctx.lineTo(tx + 18 + wave, ch * 0.30);
            ctx.lineTo(tx, ch * 0.30);
            ctx.closePath();
            ctx.fill();
        });
    }

    _drawFortressBackground(ctx, cw, ch) {
        // Imposing dark fortress
        ctx.fillStyle = '#050010';
        ctx.fillRect(0, ch * 0.2, cw * 2, ch * 0.8);
        // Fortress wall
        ctx.fillStyle = '#1A0035';
        for (let tx = 0; tx < cw * 2; tx += 80) {
            ctx.fillRect(tx, ch * 0.2, 60, ch * 0.5);
            ctx.fillRect(tx + 10, ch * 0.16, 14, 14);
            ctx.fillRect(tx + 36, ch * 0.16, 14, 14);
        }
        // Purple energy glow
        const pulse = 0.3 + 0.2 * Math.sin(this.animTime * 4);
        ctx.fillStyle = `rgba(100,0,200,${pulse})`;
        ctx.fillRect(0, ch * 0.2, cw * 2, 4);
    }

    _drawFloatingSpirits(ctx, cw, ch) {
        ctx.save();
        for (let i = 0; i < 5; i++) {
            const sx = ((i * 220 + this.animTime * 20) % (cw * 2));
            const sy = ch * 0.3 + Math.sin(this.animTime * 0.8 + i * 1.3) * 40;
            const alpha = 0.15 + 0.1 * Math.sin(this.animTime * 2 + i);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#CE93D8';
            ctx.beginPath();
            ctx.arc(sx, sy, 18, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawStalactites(ctx, cw, baseY, maxLen, spacing) {
        for (let x = spacing * 0.5; x < cw * 2; x += spacing) {
            const len = maxLen * (0.5 + ((x * 37) % 100) / 100 * 0.5);
            ctx.beginPath();
            ctx.moveTo(x - 5, baseY);
            ctx.lineTo(x + 5, baseY);
            ctx.lineTo(x, baseY + len);
            ctx.closePath();
            ctx.fill();
        }
    }

    _drawStalagmites(ctx, cw, ch, maxLen, spacing) {
        for (let x = spacing; x < cw * 2; x += spacing * 1.5) {
            const len = maxLen * (0.4 + ((x * 53) % 100) / 100 * 0.6);
            ctx.beginPath();
            ctx.moveTo(x - 4, ch);
            ctx.lineTo(x + 4, ch);
            ctx.lineTo(x, ch - len);
            ctx.closePath();
            ctx.fill();
        }
    }

    _drawCactus(ctx, x, y) {
        ctx.fillStyle = '#4CAF50';
        // Main trunk
        ctx.fillRect(x - 6, y - 60, 12, 60);
        // Arms
        ctx.fillRect(x - 22, y - 50, 16, 8);
        ctx.fillRect(x - 22, y - 70, 8, 22);
        ctx.fillRect(x + 6, y - 40, 16, 8);
        ctx.fillRect(x + 14, y - 58, 8, 20);
        // Thorns
        ctx.fillStyle = '#81C784';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(x + 6, y - 20 - i * 10, 4, 2);
            ctx.fillRect(x - 10, y - 20 - i * 10, 4, 2);
        }
    }

    _drawFlowers(ctx, cw, baseY) {
        const colors = ['#F48FB1','#FFEE58','#FF8A65','#CE93D8','#80DEEA'];
        for (let x = 40; x < cw * 2; x += 60) {
            const fy = baseY - 5 - ((x * 17) % 20);
            const col = colors[(x * 7 + 3) % colors.length];
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x - 1, fy, 2, 18);
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(x, fy - 4, 5, 0, Math.PI*2); ctx.fill();
        }
    }

    _drawMistEffect(ctx, cw, ch) {
        ctx.save();
        for (let i = 0; i < 4; i++) {
            const mx = ((i * 280 + this.animTime * 15) % (cw * 2)) - cw * 0.2;
            const alpha = 0.06 + 0.04 * Math.sin(this.animTime * 0.5 + i);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#A5D6A7';
            ctx.beginPath();
            ctx.ellipse(mx, ch * 0.72, 200, 50, 0, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawCrystalClusters(ctx, cw, ch) {
        const clusters = [
            { x: cw*0.05, y: ch*0.85, col: '#4DD0E1', count: 4 },
            { x: cw*0.4,  y: ch*0.9,  col: '#AB47BC', count: 3 },
            { x: cw*0.75, y: ch*0.83, col: '#66BB6A', count: 5 },
            { x: cw*1.1,  y: ch*0.88, col: '#42A5F5', count: 4 },
            { x: cw*1.6,  y: ch*0.85, col: '#FFCA28', count: 3 },
        ];
        clusters.forEach(cl => {
            const pulse = 0.5 + 0.3 * Math.sin(this.animTime * 2 + cl.x);
            ctx.save();
            ctx.globalAlpha = 0.8;
            for (let i = 0; i < cl.count; i++) {
                const cx = cl.x + i * 14 - cl.count * 7;
                const ch2 = 20 + ((i * 37) % 30);
                const glow = ctx.createRadialGradient(cx, cl.y - ch2, 0, cx, cl.y, 25);
                glow.addColorStop(0, cl.col + Math.round(pulse * 200).toString(16).padStart(2,'0'));
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.beginPath(); ctx.arc(cx, cl.y - ch2 * 0.5, 25, 0, Math.PI*2); ctx.fill();

                ctx.fillStyle = cl.col + '99';
                ctx.beginPath();
                ctx.moveTo(cx, cl.y - ch2);
                ctx.lineTo(cx + 5, cl.y - ch2 * 0.4);
                ctx.lineTo(cx + 4, cl.y);
                ctx.lineTo(cx - 4, cl.y);
                ctx.lineTo(cx - 5, cl.y - ch2 * 0.4);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        });
    }

    _drawHeatHaze(ctx, cw, ch) {
        ctx.save();
        ctx.globalAlpha = 0.04 + 0.02 * Math.sin(this.animTime * 3);
        ctx.fillStyle = '#FF8F00';
        ctx.fillRect(0, ch * 0.65, cw * 2, ch * 0.35);
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawJungleVines(ctx, cw, ch) {
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.globalAlpha = 0.7;
        for (let x = 80; x < cw * 2; x += 140) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.bezierCurveTo(x + 20, ch*0.3, x - 15, ch*0.55, x + 10, ch*0.8);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawLavaPool(ctx, cw, ch) {
        const lavaY = ch * 0.85;
        const g = ctx.createLinearGradient(0, lavaY, 0, ch);
        const pulse = 0.7 + 0.15 * Math.sin(this.animTime * 2.5);
        g.addColorStop(0, `rgba(255,100,0,${pulse})`);
        g.addColorStop(0.5, '#CC3300');
        g.addColorStop(1, '#880000');
        ctx.fillStyle = g;
        // Wavy surface
        ctx.beginPath();
        ctx.moveTo(-10, lavaY);
        for (let x = -10; x <= cw * 2 + 10; x += 12) {
            const wy = lavaY + Math.sin((x + this.animTime * 50) * 0.04) * 8;
            ctx.lineTo(x, wy);
        }
        ctx.lineTo(cw*2+10, ch);
        ctx.lineTo(-10, ch);
        ctx.closePath();
        ctx.fill();
    }

    _drawLavaStreams(ctx, cw, ch) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            const sx = cw * (0.2 + i * 0.3);
            const g  = ctx.createLinearGradient(sx, 0, sx, ch);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.6, '#FF6600');
            g.addColorStop(1, '#FF3300');
            ctx.fillStyle = g;
            ctx.fillRect(sx - 4, 0, 8, ch);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawGravestones(ctx, cw, baseY) {
        const positions = [80, 200, 360, 540, 700, 880, 1050, 1200, 1400, 1550];
        positions.forEach(x => {
            ctx.fillStyle = '#37474F';
            ctx.fillRect(x - 12, baseY - 36, 24, 30);
            // Arch
            ctx.beginPath();
            ctx.arc(x, baseY - 36, 12, Math.PI, 0);
            ctx.fill();
            // RIP
            ctx.fillStyle = '#546E7A';
            ctx.fillRect(x - 6, baseY - 30, 12, 2);
            ctx.fillRect(x - 6, baseY - 24, 12, 2);
        });
    }

    _drawSkyFloor(ctx, cw, ch) {
        // Distant world far below, birds
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#1565C0';
        this._drawRollingHills(ctx, cw, ch, ch * 0.88, 0.002, 40);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#A5D6A7';
        this._drawRollingHills(ctx, cw, ch, ch * 0.9, 0.003, 30);
        ctx.globalAlpha = 0.7;
        // Birds (V shapes)
        ctx.strokeStyle = '#1A237E';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const bx = ((i * 160 + this.animTime * 30) % (cw * 2));
            const by = ch * 0.15 + ((i * 43) % 100);
            ctx.beginPath();
            ctx.moveTo(bx - 8, by);
            ctx.lineTo(bx, by - 5);
            ctx.lineTo(bx + 8, by);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawTorches(ctx, cw, ch) {
        const torchX = [100, 300, 550, 750, 950, 1100, 1300, 1500];
        const baseY  = ch * 0.6;
        torchX.forEach(tx => {
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(tx - 3, baseY - 30, 6, 22);
            // Flame
            const fp = 0.6 + 0.4 * Math.sin(this.animTime * 8 + tx);
            ctx.fillStyle = `rgba(255,${Math.round(80 + fp * 100)},0,${fp})`;
            ctx.beginPath();
            ctx.ellipse(tx, baseY - 36, 5, 9, 0, 0, Math.PI*2);
            ctx.fill();
            // Glow
            const glow = ctx.createRadialGradient(tx, baseY - 36, 0, tx, baseY - 36, 25);
            glow.addColorStop(0, `rgba(255,160,0,${0.2 * fp})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(tx, baseY - 36, 25, 0, Math.PI*2); ctx.fill();
        });
    }

    _drawShadowEnergy(ctx, cw, ch) {
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const ex  = ((i * 200 + this.animTime * 40) % (cw * 2)) - 100;
            const ey  = ch * (0.5 + 0.3 * Math.sin(this.animTime * 0.7 + i));
            const pulse = 0.15 + 0.1 * Math.sin(this.animTime * 3 + i * 1.5);
            const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 80);
            g.addColorStop(0, `rgba(100,0,200,${pulse})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(ex, ey, 80, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }

    // ─────────────────────────────────────────────────────────
    // Weather overlay
    // ─────────────────────────────────────────────────────────

    /**
     * Draw weather effects (rain/snow/ash/fog) in screen space.
     */
    _drawWeather(ctx, theme, cw, ch) {
        if (this.weatherParticles.length === 0) return;
        ctx.save();

        for (let i = 0; i < this.weatherParticles.length; i++) {
            const p = this.weatherParticles[i];
            const t = p.life / p.maxLife;
            ctx.globalAlpha = p.alpha * clamp(t, 0, 1);

            switch (p.type) {
                case 'snow':
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                    break;
                case 'rain':
                    ctx.strokeStyle = 'rgba(174,214,241,0.8)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.vx * 0.03, p.y + p.len);
                    ctx.stroke();
                    break;
                case 'ash':
                    ctx.fillStyle = '#9E9E9E';
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                    break;
                case 'fog':
                    ctx.fillStyle = '#9E9E9E';
                    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.3, 0, 0, Math.PI*2); ctx.fill();
                    break;
                default: break;
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
};
