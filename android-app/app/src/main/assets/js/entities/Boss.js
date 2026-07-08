'use strict';

/**
 * Boss.js
 * -------
 * Base class for all boss enemies in Ziko's Crystal Quest.
 *
 * Hierarchy:  Entity  →  Enemy  →  Boss
 *
 * Responsibilities:
 *  - Multi-phase state machine (up to maxPhase phases)
 *  - Cinematic entrance / intro animation (drops in from above)
 *  - Phase-transition effects (swirl particles, screen shake)
 *  - Vulnerability window management
 *  - Weak-point hit detection
 *  - Dramatic multi-second death sequence
 *  - Full-screen boss health-bar HUD with phase indicators
 *
 * Subclasses should:
 *  - Override update() and call super.update() FIRST
 *  - Override render() and call super.render() for the health bar
 *  - Populate weakPoints in their constructor config
 *  - Queue attacks via attackQueue / currentAttack as needed
 */
window.Boss = class Boss extends Enemy {

    /**
     * @param {number} x          World-space X spawn position
     * @param {number} y          World-space Y spawn position (final resting Y)
     * @param {number} width      Collision / render width
     * @param {number} height     Collision / render height
     * @param {Object} config     Optional configuration overrides (see below)
     *
     * config keys:
     *   maxPhase         {number}   How many phases this boss has          (default 3)
     *   phaseThresholds  {number[]} HP% at which each next phase triggers  (default [0.66, 0.33])
     *   bossName         {string}   Display name shown in the HUD          (default 'Boss')
     *   weakPoints       {Array}    [{x,y,w,h}] offsets relative to boss   (default [])
     *   introTimer       {number}   Seconds for entrance animation         (default 2.5)
     */
    constructor(x, y, width, height, config = {}) {
        super(x, y, width, height, config);

        // ── Identity ────────────────────────────────────────────────────────────
        this.isBoss = true;
        this.bossName = config.bossName || 'Boss';

        // ── Phase system ────────────────────────────────────────────────────────
        this.phase = 1;
        this.maxPhase = config.maxPhase || 3;
        /**
         * phaseThresholds[i] = HP fraction at which boss transitions to phase i+2.
         * e.g. [0.66, 0.33] → phase 2 at 66% HP, phase 3 at 33% HP
         */
        this.phaseThresholds = config.phaseThresholds || [0.66, 0.33];
        this.isEnraged = false; // Set true when final phase is reached

        // ── Weak points ─────────────────────────────────────────────────────────
        /**
         * Array of {x, y, w, h} objects in BOSS-LOCAL space.
         * A hit is only registered (vulnerable) when it lands on one of these.
         */
        this.weakPoints = config.weakPoints || [];

        // ── Intro / entrance ────────────────────────────────────────────────────
        this.intro = true;
        this.introTimer = config.introTimer || 2.5;

        // The boss starts 300 px ABOVE its intended resting position and glides down.
        this._entranceY = y - 300;
        this.y         = this._entranceY;  // Override the y that super() set
        this._targetY  = y;                // Where the boss will settle

        // ── Attack queue ─────────────────────────────────────────────────────────
        this.attackQueue   = [];   // Array of attack descriptors to execute in order
        this.currentAttack = null; // Currently running attack descriptor
        this.attackTimer   = 0;    // General-purpose cooldown timer (seconds)

        // ── Vulnerability ────────────────────────────────────────────────────────
        this.vulnerableTimer = 0;
        this.isVulnerable    = false;

        // ── Phase transition internal state ──────────────────────────────────────
        this._phaseTransitionTimer  = 0;
        this._phaseTransitionActive = false;

        // ── Screen-shake after taking damage ────────────────────────────────────
        this._shakeTimer = 0;

        // ── Death sequence ───────────────────────────────────────────────────────
        // deathTimer counts DOWN from 3.0; alive is set false when it hits 0.
        this.deathTimer = 0;

        // ── Internal flash on damage ─────────────────────────────────────────────
        this._damagedFlash = 0;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * Main update.  Call this from subclass via super.update(...) BEFORE
     * subclass-specific logic so phase transitions / intro blocking are respected.
     *
     * @param {number}   dt          Delta time in seconds
     * @param {Object}   player      Player entity reference
     * @param {Object}   tileMap     Tile-map reference
     * @param {Array}    entities    All active entities
     * @param {Object}   audio       Audio manager (may be null)
     * @param {Array}    particles   Particle array (push new particles here)
     * @param {Object}   companion   Companion entity reference (may be null)
     */
    update(dt, player, tileMap, entities, audio, particles, companion) {

        // ── 1. Entrance animation (blocks all combat logic) ──────────────────────
        if (this.intro) {
            this._doIntro(dt);
            return;
        }

        // ── 2. Death sequence ────────────────────────────────────────────────────
        if (this.state === 'dead') {
            this.deathTimer -= dt;

            // Rapid-fire explosion particles during death sequence
            if (particles && this.deathTimer > 0) {
                // Spawn several burst particles every frame for a dramatic effect
                const burstCount = 3;
                for (let i = 0; i < burstCount; i++) {
                    // Random offset within the boss body
                    const px = this.x + rnd() * this.width;
                    const py = this.y + rnd() * this.height;

                    // Velocity fans outward in all directions
                    const angle = rnd() * Math.PI * 2;
                    const speed = 80 + rnd() * 180;

                    particles.push({
                        x:       px,
                        y:       py,
                        vx:      Math.cos(angle) * speed,
                        vy:      Math.sin(angle) * speed - 60,
                        life:    0.4 + rnd() * 0.6,
                        maxLife: 1.0,
                        // Alternate between orange and white for explosion look
                        color:   (rnd() < 0.5)
                                    ? `hsl(${20 + rndInt(40)}, 100%, 60%)`
                                    : `hsl(0, 0%, ${80 + rndInt(20)}%)`,
                        size:    4 + rnd() * 8,
                        gravity: 200
                    });
                }
            }

            // When the death timer expires the boss is truly gone
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            return; // No further logic while dying
        }

        // ── 3. Phase-transition holding state ───────────────────────────────────
        if (this._phaseTransitionActive) {
            this._phaseTransitionTimer -= dt;

            // Swirl particles around the boss centre during the flash window
            if (particles) {
                const cx = this.x + this.width  * 0.5;
                const cy = this.y + this.height * 0.5;
                const angle = (Date.now() * 0.005) % (Math.PI * 2);

                for (let i = 0; i < 2; i++) {
                    const a = angle + i * Math.PI;
                    const r = 30 + rnd() * 50;
                    particles.push({
                        x:       cx + Math.cos(a) * r,
                        y:       cy + Math.sin(a) * r,
                        vx:     -Math.sin(a) * 60,
                        vy:      Math.cos(a) * 60,
                        life:    0.5,
                        maxLife: 0.5,
                        color:   `hsl(${280 + rndInt(60)}, 100%, 70%)`,
                        size:    5 + rnd() * 6,
                        gravity: 0
                    });
                }
            }

            // End transition
            if (this._phaseTransitionTimer <= 0) {
                this._phaseTransitionActive = false;
            }
            // NOTE: We still allow the rest of the update to proceed so the
            // boss doesn't freeze, but subclasses may check _phaseTransitionActive.
        }

        // ── 4. Check whether the boss should move to the next phase ─────────────
        this._checkPhaseTransition();

        // ── 5. Vulnerability timer ───────────────────────────────────────────────
        this.vulnerableTimer -= dt;
        this.isVulnerable = (this.vulnerableTimer > 0);

        // ── 6. General attack cooldown ───────────────────────────────────────────
        this.attackTimer -= dt;

        // ── 7. Screen-shake timer (decrements; used by camera to apply offset) ──
        if (this._shakeTimer > 0) {
            this._shakeTimer -= dt;
        }

        // ── 8. Damaged flash timer ───────────────────────────────────────────────
        if (this._damagedFlash > 0) {
            this._damagedFlash -= dt;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Entrance animation: lerps the boss downward from its spawn point to
     * _targetY, then unlocks normal behaviour.
     *
     * @param {number} dt  Delta time in seconds
     */
    _doIntro(dt) {
        this.introTimer -= dt;

        // Smoothly glide the boss to its resting position
        this.y = lerp(this.y, this._targetY, dt * 3);

        // Transition out of intro once the timer has elapsed AND the boss is
        // close enough to its target (avoids popping).
        const closeEnough = Math.abs(this.y - this._targetY) < 4;
        if (this.introTimer <= 0 && closeEnough) {
            this.y    = this._targetY; // Snap exactly into place
            this.intro = false;
            this.state = 'idle';
        }
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Trigger a phase change.  Safe to call more than once for the same phase;
     * the _checkPhaseTransition guard prevents re-triggering.
     *
     * @param {number} newPhase   Target phase number (2, 3, …)
     * @param {Object} audio      Audio manager reference (may be null)
     * @param {Array}  particles  Particle array (may be null)
     */
    changePhase(newPhase, audio, particles) {
        this.phase = newPhase;

        // Kick off the visual transition window
        this._phaseTransitionActive = true;
        this._phaseTransitionTimer  = 1.5;

        // Audio cue
        audio?.playSound?.(SFX.BOSS_HIT);

        // Big radial particle burst centred on the boss
        if (particles) {
            const cx = this.x + this.width  * 0.5;
            const cy = this.y + this.height * 0.5;

            for (let i = 0; i < 40; i++) {
                const angle = (i / 40) * Math.PI * 2 + rnd() * 0.3;
                const speed = 120 + rnd() * 200;

                particles.push({
                    x:       cx,
                    y:       cy,
                    vx:      Math.cos(angle) * speed,
                    vy:      Math.sin(angle) * speed,
                    life:    0.8 + rnd() * 0.6,
                    maxLife: 1.4,
                    color:   `hsl(${300 + rndInt(60)}, 100%, 65%)`,
                    size:    6 + rnd() * 10,
                    gravity: 80
                });
            }
        }

        // Final phase: boss enters enraged state (faster, more aggressive)
        if (this.phase === this.maxPhase) {
            this.isEnraged = true;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Internal: evaluate HP thresholds and trigger phase changes as needed.
     * Called every frame from update().  Audio / particles are passed as null
     * because those references are not stored on the instance to keep memory
     * clean; subclasses that store them may override changePhase accordingly.
     */
    _checkPhaseTransition() {
        // Guard: only advance, never regress
        if (!this.maxHealth || this.maxHealth <= 0) return;

        const healthPct = this.health / this.maxHealth;

        // Phase 1 → 2
        if (this.phase < 2 && healthPct < this.phaseThresholds[0]) {
            this.changePhase(2, null, null);
        }

        // Phase 2 → 3  (also covers the case where phase skips straight from 1→3)
        if (this.phase < 3 && this.phaseThresholds[1] !== undefined &&
                healthPct < this.phaseThresholds[1]) {
            this.changePhase(3, null, null);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Check whether a hit lands on any of the boss's defined weak points.
     *
     * @param {number} hitX  World-space X of the hit
     * @param {number} hitY  World-space Y of the hit
     * @returns {boolean}    True if the hit overlaps at least one weak point
     */
    isHitOnWeakPoint(hitX, hitY) {
        for (const wp of this.weakPoints) {
            const wpWorldX = this.x + wp.x;
            const wpWorldY = this.y + wp.y;

            if (hitX >= wpWorldX          &&
                hitX <= wpWorldX + wp.w   &&
                hitY >= wpWorldY          &&
                hitY <= wpWorldY + wp.h) {
                return true;
            }
        }
        return false;
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Attempt to deal damage to the boss.
     * Damage is rejected unless the boss is currently vulnerable, past its
     * intro, and not already dead.
     *
     * @param {number} amount      Damage amount
     * @param {number} knockbackX  Horizontal knockback impulse
     * @param {number} knockbackY  Vertical knockback impulse
     * @param {Object} audio       Audio manager (may be null)
     * @param {Array}  particles   Particle array (may be null)
     * @returns {boolean}          True if damage was applied
     */
    takeDamage(amount, knockbackX, knockbackY, audio, particles) {
        // Reject damage when protected
        if (!this.isVulnerable || this.intro || this.state === 'dead') {
            return false;
        }

        // Delegate to Enemy's damage logic (handles health subtraction, death
        // check, knockback velocity, etc.) but override the sound effect.
        Enemy.prototype.takeDamage.call(
            this, amount, knockbackX, knockbackY, audio, particles
        );

        // Boss-specific hit sound (overrides whatever Enemy played)
        audio?.playSound?.(SFX.BOSS_HIT);

        // Short screen-shake so the player can feel the hit
        this._shakeTimer = 0.2;

        // Visual flash on the HUD health bar
        this._damagedFlash = 0.25;

        return true;
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Kill the boss and start the dramatic death sequence.
     *
     * @param {Object} audio       Audio manager (may be null)
     * @param {Array}  particles   Particle array (may be null)
     */
    die(audio, particles) {
        this.state        = 'dead';
        this.deathTimer   = 3.0;   // Seconds of explosion effect before removal
        this.isVulnerable = false; // Can't be hit during death sequence
        this.velocityX    = 0;
        this.velocityY    = 0;

        audio?.playSound?.(SFX.EXPLOSION);
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Draw the boss health-bar HUD at the top-centre of the screen.
     * This is drawn in SCREEN space (not world space), so no camera offset.
     *
     * Layout:
     *   bossName label   (centred above the bar)
     *   [=====----]      (red fill on dark background, gold border)
     *   ● ● ○            (phase indicator dots below the bar)
     *
     * @param {CanvasRenderingContext2D} ctx  The 2D rendering context
     */
    _drawBossHealthBar(ctx) {
        if (!this.maxHealth || this.maxHealth <= 0) return;
        if (!this.alive && this.state !== 'dead')   return;

        // ── Layout constants ──────────────────────────────────────────────────────
        const BAR_W  = 400;
        const BAR_H  = 20;
        const BAR_X  = CANVAS_WIDTH  * 0.5 - BAR_W * 0.5; // Centred horizontally
        const BAR_Y  = 16;                                   // Near top of screen
        const RADIUS = 4; // Rounded corners

        const healthFraction = clamp(this.health / this.maxHealth, 0, 1);

        ctx.save();

        // ── Boss name label ───────────────────────────────────────────────────────
        ctx.font        = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle   = '#ffffff';
        ctx.shadowColor  = '#000000';
        ctx.shadowBlur   = 4;
        ctx.fillText(this.bossName, CANVAS_WIDTH * 0.5, BAR_Y - 3);

        // ── Bar background (dark translucent) ────────────────────────────────────
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(10, 0, 0, 0.8)';
        _roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, RADIUS);
        ctx.fill();

        // ── Health fill ──────────────────────────────────────────────────────────
        const fillW = BAR_W * healthFraction;
        if (fillW > 0) {
            // Flash white when damaged, otherwise use a red gradient
            if (this._damagedFlash > 0) {
                // Alternate between red and white for a flicker effect
                const flashT = Math.floor(this._damagedFlash * 20) % 2;
                ctx.fillStyle = flashT === 0 ? '#ff4444' : '#ffffff';
            } else {
                // Red gradient: bright at left, darker toward right
                const grad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
                grad.addColorStop(0,   '#ff6666');
                grad.addColorStop(0.5, '#cc1111');
                grad.addColorStop(1,   '#880000');
                ctx.fillStyle = grad;
            }

            ctx.save();
            // Clip fill to the same rounded rectangle so it doesn't overflow
            ctx.beginPath();
            _roundRectPath(ctx, BAR_X + 2, BAR_Y + 2, BAR_W - 4, BAR_H - 4, RADIUS - 1);
            ctx.clip();
            ctx.fillRect(BAR_X + 2, BAR_Y + 2, fillW - 4, BAR_H - 4);
            ctx.restore();
        }

        // ── Gold border ───────────────────────────────────────────────────────────
        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth   = 2;
        _roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, RADIUS);
        ctx.stroke();

        // ── Phase indicator dots ──────────────────────────────────────────────────
        const DOT_R   = 5;
        const DOT_GAP = 14;
        const totalDotW = (this.maxPhase - 1) * (DOT_R * 2 + DOT_GAP) - DOT_GAP;
        let dotX = CANVAS_WIDTH * 0.5 - totalDotW * 0.5 + DOT_R;
        const dotY = BAR_Y + BAR_H + 8;

        for (let p = 1; p <= this.maxPhase - 1; p++) {
            // A dot is "filled" (reached) when the boss has passed that threshold
            const reached = this.phase > p;

            ctx.beginPath();
            ctx.arc(dotX, dotY, DOT_R, 0, Math.PI * 2);
            ctx.fillStyle   = reached ? '#d4a017' : 'rgba(100, 60, 0, 0.5)';
            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth   = 1.5;
            ctx.fill();
            ctx.stroke();

            dotX += DOT_R * 2 + DOT_GAP;
        }

        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Render the boss.
     * Base implementation only draws the HUD health bar; subclasses must call
     * super.render(ctx, camera) and then draw the boss body themselves.
     *
     * @param {CanvasRenderingContext2D} ctx     2D rendering context
     * @param {Object}                  camera  Camera object with x, y offsets
     */
    render(ctx, camera) {
        // The health bar is always drawn in screen space (no camera transform needed)
        this._drawBossHealthBar(ctx);

        // Subclasses: draw the boss body here using (this.x - camera.x) etc.
    }

}; // end window.Boss


// ══════════════════════════════════════════════════════════════════════════════
//  LOCAL HELPERS  (not exported — only used by Boss internals)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Helper: stroke/fill a rounded rectangle.
 * Sets up a path and calls fill() or stroke() depending on caller.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r  Corner radius
 */
function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    _roundRectPath(ctx, x, y, w, h, r);
}

/**
 * Helper: define a rounded-rectangle path WITHOUT calling beginPath().
 * Useful when you need to clip or extend an existing path.
 */
function _roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w * 0.5, h * 0.5);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
}
