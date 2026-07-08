/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — ParticleSystem.js
 * ============================================================
 * High-performance particle system with object pooling.
 * Supports 22 particle types with unique behaviours.
 * Uses frustum culling and pool recycling to stay within
 * the MAX_PARTICLES budget defined in constants.js.
 */

'use strict';

window.ParticleSystem = class ParticleSystem {

    constructor() {
        /** @type {Array<Object>} Active particles being updated/rendered */
        this.particles = [];
        /** @type {Array<Object>} Inactive particles available for reuse */
        this.pool = [];
        /** Total created (for stats) */
        this._totalCreated = 0;
    }

    // ─────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────

    /** Retrieve a particle from pool or allocate a new one. */
    _acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        if (this.particles.length + this.pool.length >= MAX_PARTICLES) {
            // Steal the oldest active particle
            return this.particles.shift();
        }
        this._totalCreated++;
        return {};
    }

    /** Return a dead particle to the pool. */
    _release(p) {
        this.pool.push(p);
    }

    /** Reset a particle object to a clean default state. */
    _reset(p) {
        p.x = 0;        p.y = 0;
        p.vx = 0;       p.vy = 0;
        p.life = 1;     p.maxLife = 1;
        p.size = 4;     p.maxSize = 4;
        p.color = '#ffffff';
        p.alpha = 1;
        p.rotation = 0; p.rotationSpeed = 0;
        p.type = 'dust';
        p.text = null;
        p.gravity = WORLD_GRAVITY; // per-particle gravity override
        p.shape = 'circle'; // 'circle', 'rect', 'star', 'heart', 'line', 'triangle'
        p.secondColor = null;
        p.angle = 0;    // angle for line particles
        p.lineLen = 8;
        p.scaleX = 1;   // for coin spin, etc.
        return p;
    }

    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    /**
     * Emit a single particle.
     * @param {string} type - Particle type key
     * @param {number} x    - World X position
     * @param {number} y    - World Y position
     * @param {Object} [options={}] - Overrides
     */
    emit(type, x, y, options = {}) {
        if (this.particles.length >= MAX_PARTICLES) return;

        const p = this._reset(this._acquire());
        p.type = type;
        p.x = x;
        p.y = y;

        // ── Per-type default configuration ───────────────────
        switch (type) {

            // Small beige/grey squares, scatter sideways on walk/land
            case 'dust':
                p.shape     = 'rect';
                p.color     = rnd(0,1) > 0.5 ? '#c8b89a' : '#a09080';
                p.size      = rnd(2, 5);
                p.maxSize   = p.size;
                p.vx        = rnd(-60, 60);
                p.vy        = rnd(-40, -10);
                p.life      = p.maxLife = rnd(0.2, 0.35);
                p.gravity   = 400;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-3, 3);
                break;

            // Bigger dust burst on jump
            case 'jumpDust':
                p.shape     = 'rect';
                p.color     = rnd(0,1) > 0.5 ? '#ddd0b8' : '#b8a888';
                p.size      = rnd(4, 9);
                p.maxSize   = p.size;
                p.vx        = rnd(-90, 90);
                p.vy        = rnd(-80, -20);
                p.life      = p.maxLife = rnd(0.35, 0.55);
                p.gravity   = 300;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-4, 4);
                break;

            // Golden floating star
            case 'coinSparkle':
                p.shape     = 'star';
                p.color     = rnd(0,1) > 0.5 ? '#FFD700' : '#FFF176';
                p.size      = rnd(4, 8);
                p.maxSize   = p.size;
                p.vx        = rnd(-40, 40);
                p.vy        = rnd(-100, -50);
                p.life      = p.maxLife = rnd(0.5, 0.7);
                p.gravity   = -20; // float upward
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-5, 5);
                break;

            // Colored gem sparkles — color passed in options.color
            case 'gemSparkle':
                p.shape     = 'star';
                p.color     = options.color || '#42A5F5';
                p.size      = rnd(3, 7);
                p.maxSize   = p.size;
                p.vx        = rnd(-70, 70);
                p.vy        = rnd(-120, -60);
                p.life      = p.maxLife = rnd(0.5, 0.8);
                p.gravity   = -30;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-6, 6);
                break;

            // Bright spark on hit/attack
            case 'spark':
                p.shape     = 'rect';
                p.color     = rnd(0,1) > 0.5 ? '#FFE082' : '#FFFFFF';
                p.size      = rnd(2, 4);
                p.maxSize   = p.size;
                p.vx        = rnd(-200, 200);
                p.vy        = rnd(-200, 200);
                p.life      = p.maxLife = rnd(0.25, 0.45);
                p.gravity   = 600;
                p.rotation  = rnd(0, Math.PI * 2);
                break;

            // Fire particles — float up and fade
            case 'fire':
                p.shape     = 'circle';
                p.color     = ['#FF6B00','#FF3D00','#FF8F00','#FFAB00'][rndInt(0,3)];
                p.size      = rnd(5, 12);
                p.maxSize   = p.size;
                p.vx        = rnd(-30, 30);
                p.vy        = rnd(-120, -60);
                p.life      = p.maxLife = rnd(0.6, 0.9);
                p.gravity   = -80; // float up
                break;

            // Grey smoke — expand and fade
            case 'smoke':
                p.shape     = 'circle';
                p.color     = `rgba(${rndInt(100,160)},${rndInt(100,160)},${rndInt(100,160)},0.7)`;
                p.size      = rnd(6, 14);
                p.maxSize   = p.size * 2.5; // expands over time
                p.vx        = rnd(-20, 20);
                p.vy        = rnd(-60, -20);
                p.life      = p.maxLife = rnd(0.7, 1.1);
                p.gravity   = -30;
                break;

            // Blue water droplets arc and fall
            case 'water':
                p.shape     = 'circle';
                p.color     = rnd(0,1) > 0.5 ? '#29B6F6' : '#4DD0E1';
                p.size      = rnd(3, 6);
                p.maxSize   = p.size;
                p.vx        = rnd(-100, 100);
                p.vy        = rnd(-140, -60);
                p.life      = p.maxLife = rnd(0.4, 0.6);
                p.gravity   = WORLD_GRAVITY * 0.7;
                break;

            // Snow — slow environmental fall
            case 'snow':
                p.shape     = 'circle';
                p.color     = '#FFFFFF';
                p.size      = rnd(2, 5);
                p.maxSize   = p.size;
                p.vx        = rnd(-20, 20);
                p.vy        = rnd(30, 80);
                p.life      = p.maxLife = rnd(2.5, 3.5);
                p.gravity   = 0; // self-managed
                break;

            // Rain — thin fast lines
            case 'rain':
                p.shape     = 'line';
                p.color     = 'rgba(174,214,241,0.8)';
                p.size      = 1;
                p.lineLen   = rnd(10, 20);
                p.angle     = Math.PI * 0.08; // slight slant
                p.vx        = 30;
                p.vy        = rnd(500, 700);
                p.life      = p.maxLife = rnd(0.7, 1.1);
                p.gravity   = 0;
                break;

            // Leaf drift
            case 'leaf':
                p.shape     = 'rect';
                p.color     = ['#558B2F','#33691E','#827717','#6D4C41'][rndInt(0,3)];
                p.size      = rnd(4, 8);
                p.maxSize   = p.size;
                p.vx        = rnd(-40, 40);
                p.vy        = rnd(30, 80);
                p.life      = p.maxLife = rnd(1.5, 2.5);
                p.gravity   = 20;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-4, 4);
                break;

            // Yellow star collectible burst
            case 'star':
                p.shape     = 'star';
                p.color     = '#FFD700';
                p.size      = rnd(5, 10);
                p.maxSize   = p.size;
                p.vx        = rnd(-80, 80);
                p.vy        = rnd(-120, -40);
                p.life      = p.maxLife = rnd(0.8, 1.2);
                p.gravity   = 150;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-6, 6);
                break;

            // Pink heart from healing
            case 'heart':
                p.shape     = 'heart';
                p.color     = rnd(0,1) > 0.5 ? '#F48FB1' : '#F06292';
                p.size      = rnd(8, 14);
                p.maxSize   = p.size;
                p.vx        = rnd(-30, 30);
                p.vy        = rnd(-100, -60);
                p.life      = p.maxLife = rnd(0.6, 0.9);
                p.gravity   = -60;
                break;

            // Large explosion burst
            case 'explosion':
                p.shape     = 'circle';
                p.color     = ['#FF6B00','#FF3D00','#FFAB00','#FFEE58','#FF5252'][rndInt(0,4)];
                p.size      = rnd(6, 18);
                p.maxSize   = p.size;
                p.vx        = rnd(-280, 280);
                p.vy        = rnd(-280, 280);
                p.life      = p.maxLife = rnd(0.4, 0.7);
                p.gravity   = 200;
                break;

            // Shadow King death — dark purple dissolve
            case 'shadowDissolve':
                p.shape     = 'circle';
                p.color     = ['#4A148C','#1A237E','#311B92','#000000','#6A1B9A'][rndInt(0,4)];
                p.size      = rnd(4, 12);
                p.maxSize   = p.size;
                p.vx        = rnd(-100, 100);
                p.vy        = rnd(-150, -30);
                p.life      = p.maxLife = rnd(1.5, 2.2);
                p.gravity   = -40;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-3, 3);
                break;

            // Cyan/teal crystal shimmer — rotate
            case 'crystalShimmer':
                p.shape     = 'star';
                p.color     = rnd(0,1) > 0.5 ? '#80DEEA' : '#4DD0E1';
                p.size      = rnd(3, 8);
                p.maxSize   = p.size;
                p.vx        = rnd(-60, 60);
                p.vy        = rnd(-90, -30);
                p.life      = p.maxLife = rnd(0.8, 1.2);
                p.gravity   = -20;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-8, 8);
                break;

            // Translucent bubbles in water — float up
            case 'bubbles':
                p.shape     = 'circle';
                p.color     = 'rgba(130,200,255,0.5)';
                p.size      = rnd(3, 9);
                p.maxSize   = p.size;
                p.vx        = rnd(-15, 15);
                p.vy        = rnd(-60, -30);
                p.life      = p.maxLife = rnd(1.5, 2.2);
                p.gravity   = -50; // float up
                break;

            // Lightning flash — zig-zag line brief
            case 'lightning':
                p.shape     = 'line';
                p.color     = rnd(0,1) > 0.5 ? '#FFFFFF' : '#FFF176';
                p.size      = 2;
                p.lineLen   = rnd(20, 40);
                p.angle     = rnd(-Math.PI, Math.PI);
                p.vx        = 0;
                p.vy        = 0;
                p.life      = p.maxLife = rnd(0.1, 0.22);
                p.gravity   = 0;
                break;

            // Confetti — gravity-affected colored rectangles
            case 'confetti':
                p.shape     = 'rect';
                p.color     = `hsl(${rndInt(0,360)},90%,60%)`;
                p.size      = rnd(4, 9);
                p.maxSize   = p.size;
                p.vx        = rnd(-180, 180);
                p.vy        = rnd(-300, -100);
                p.life      = p.maxLife = rnd(1.5, 2.2);
                p.gravity   = WORLD_GRAVITY * 0.5;
                p.rotation  = rnd(0, Math.PI * 2);
                p.rotationSpeed = rnd(-8, 8);
                break;

            // Portal — swirling colorful dots
            case 'portal': {
                const ang   = rnd(0, Math.PI * 2);
                const spd   = rnd(40, 120);
                p.shape     = 'circle';
                p.color     = `hsl(${rndInt(180,300)},90%,65%)`;
                p.size      = rnd(3, 6);
                p.maxSize   = p.size;
                p.vx        = Math.cos(ang) * spd;
                p.vy        = Math.sin(ang) * spd;
                p.life      = p.maxLife = rnd(0.7, 1.1);
                p.gravity   = 0;
                p.rotation  = ang;
                p.rotationSpeed = rnd(4, 8) * (rnd(0,1)>0.5?1:-1);
                break;
            }

            // Damage number — red text floating up
            case 'damage':
                p.shape     = 'text';
                p.text      = options.text || '-1';
                p.color     = '#FF5252';
                p.secondColor = '#B71C1C';
                p.size      = options.fontSize || 18;
                p.maxSize   = p.size;
                p.vx        = rnd(-20, 20);
                p.vy        = rnd(-120, -80);
                p.life      = p.maxLife = 0.85;
                p.gravity   = -30;
                break;

            // Score popup — white/gold text floating up
            case 'scorePopup':
                p.shape     = 'text';
                p.text      = options.text || '+10';
                p.color     = '#FFD700';
                p.secondColor = '#FFFFFF';
                p.size      = options.fontSize || 16;
                p.maxSize   = p.size;
                p.vx        = rnd(-15, 15);
                p.vy        = rnd(-100, -70);
                p.life      = p.maxLife = 0.9;
                p.gravity   = -20;
                break;

            default:
                p.color = options.color || '#ffffff';
                break;
        }

        // Apply any caller overrides on top of defaults
        if (options.vx !== undefined) p.vx = options.vx;
        if (options.vy !== undefined) p.vy = options.vy;
        if (options.color !== undefined && type !== 'gemSparkle') p.color = options.color;
        if (options.size !== undefined) { p.size = options.size; p.maxSize = options.size; }
        if (options.life !== undefined) { p.life = options.life; p.maxLife = options.life; }
        if (options.gravity !== undefined) p.gravity = options.gravity;

        this.particles.push(p);
    }

    /**
     * Emit a burst of particles of the same type.
     * @param {string} type
     * @param {number} x
     * @param {number} y
     * @param {number} count
     * @param {Object} [options={}]
     */
    emitBurst(type, x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            this.emit(type, x, y, options);
        }
    }

    /**
     * Update all active particles.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const alive = [];
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Decrease lifetime
            p.life -= dt;
            if (p.life <= 0) {
                this._release(p);
                continue;
            }

            // Apply velocity
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Apply per-particle gravity
            p.vy += p.gravity * dt;

            // Rotate
            p.rotation += p.rotationSpeed * dt;

            // Interpolate size for smoke expansion
            if (p.type === 'smoke') {
                const t = 1 - (p.life / p.maxLife);
                p.size = lerp(p.maxSize * 0.4, p.maxSize, t);
            }

            alive.push(p);
        }
        this.particles = alive;
    }

    /**
     * Render all particles visible within the camera view.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x:number, y:number}} camera - Camera offset
     */
    render(ctx, camera) {
        if (this.particles.length === 0) return;

        const camL = camera.x;
        const camR = camera.x + CANVAS_WIDTH;
        const camT = camera.y;
        const camB = camera.y + CANVAS_HEIGHT;

        ctx.save();

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Frustum cull — skip particles outside camera view (+margin)
            const margin = p.size + 20;
            if (p.x + margin < camL || p.x - margin > camR ||
                p.y + margin < camT || p.y - margin > camB) continue;

            const t   = p.life / p.maxLife;          // 1 → 0 as particle dies
            const age = 1 - t;                        // 0 → 1
            const sx  = p.x - camera.x;
            const sy  = p.y - camera.y;

            // Alpha: fade out as life decreases
            ctx.globalAlpha = clamp(t, 0, 1);
            ctx.fillStyle   = p.color;
            ctx.strokeStyle = p.color;

            switch (p.shape) {

                case 'circle':
                    ctx.beginPath();
                    ctx.arc(sx, sy, Math.max(0.5, p.size * t + p.size * 0.2), 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'rect': {
                    const hw = p.size * 0.5;
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate(p.rotation);
                    ctx.fillRect(-hw, -hw, p.size, p.size);
                    ctx.restore();
                    break;
                }

                case 'star':
                    this._drawStar(ctx, sx, sy, p.size, p.rotation);
                    break;

                case 'heart':
                    this._drawHeart(ctx, sx, sy, p.size);
                    break;

                case 'line':
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate(p.angle);
                    ctx.lineWidth = p.size;
                    ctx.globalAlpha = clamp(t, 0, 1);
                    ctx.strokeStyle = p.color;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, p.lineLen);
                    ctx.stroke();
                    ctx.restore();
                    break;

                case 'text': {
                    const alpha = clamp(t, 0, 1);
                    const yOff  = -age * 20; // float upward slightly extra
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.font = `bold ${Math.round(p.size)}px "Segoe UI", sans-serif`;
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    // Outline
                    if (p.secondColor) {
                        ctx.fillStyle = p.secondColor;
                        ctx.fillText(p.text, sx + 1, sy + yOff + 1);
                    }
                    ctx.fillStyle = p.color;
                    ctx.fillText(p.text, sx, sy + yOff);
                    ctx.restore();
                    break;
                }

                case 'triangle': {
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate(p.rotation);
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.lineTo(p.size * 0.866, p.size * 0.5);
                    ctx.lineTo(-p.size * 0.866, p.size * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                    break;
                }

                default:
                    ctx.beginPath();
                    ctx.arc(sx, sy, Math.max(0.5, p.size), 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Draw a 5-point star shape.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x  Screen X
     * @param {number} y  Screen Y
     * @param {number} r  Outer radius
     * @param {number} rot Rotation angle in radians
     */
    _drawStar(ctx, x, y, r, rot = 0) {
        const inner = r * 0.42;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? r : inner;
            const angle  = (Math.PI / 5) * i - Math.PI / 2;
            if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else         ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Draw a heart shape.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     */
    _drawHeart(ctx, x, y, size) {
        const s = size * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.5);
        ctx.bezierCurveTo(-s * 2, -s, -s * 2, -s * 2, 0, -s * 0.8);
        ctx.bezierCurveTo(s * 2, -s * 2, s * 2, -s, 0, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Remove all active particles and return them to the pool.
     */
    clear() {
        for (let i = 0; i < this.particles.length; i++) {
            this._release(this.particles[i]);
        }
        this.particles.length = 0;
    }

    /** @returns {number} Active particle count */
    get count() { return this.particles.length; }
};
