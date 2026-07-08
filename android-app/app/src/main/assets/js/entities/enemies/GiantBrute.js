/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Giant Brute Enemy
 * ============================================================
 * Large powerful ground mini-boss. Slam attacks, charges, and shockwaves.
 */

'use strict';

window.GiantBrute = class GiantBrute extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 64, 80, config);
        this.maxHealth = 12;
        this.health = this.maxHealth;
        this.damage = 2;

        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 120;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 120;
        this.speed = ENEMY.PATROL_SPEED * 0.7;

        this.slamCooldown = 4.0;
        this.isSlamming = false;
        this.slamTimer = 0;

        this.shockwaves = [];

        this.dropCoins = 10;
        this.dropScore = 400;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        // Update shockwaves
        this._updateShockwaves(dt, player, audio, particles);

        if (this.state === 'dead') {
            super.update(dt, player, tileMap, entities, audio, particles);
            return;
        }

        if (this.isSlamming) {
            this.vx = 0;
            this.slamTimer += dt;
            if (this.slamTimer >= 0.8) {
                this.isSlamming = false;
                this.slamTimer = 0;
                this._performSlam(audio, particles);
            }
            this.y += this.vy * dt;
            Physics.resolveEntityVsTilemap(this, tileMap, dt);
            return;
        }

        // Standard patrol/chase update
        super.update(dt, player, tileMap, entities, audio, particles);

        // Ground charge acceleration
        if (this.state === 'chase') {
            this.speed = ENEMY.FAST_SPEED * 0.9; // Charge!
            
            this.slamCooldown -= dt;
            if (this.slamCooldown <= 0 && this.onGround) {
                this.isSlamming = true;
                this.slamTimer = 0;
                this.slamCooldown = 4.0;
            }
        } else {
            this.speed = ENEMY.PATROL_SPEED * 0.7;
        }
    }

    _performSlam(audio, particles) {
        audio.playSound(SFX.LAND);
        if (window.game && window.game.camera) {
            window.game.camera.shake(10, 0.3);
        }

        // Spawn left and right shockwaves
        this.shockwaves.push({
            x: this.x - 30,
            y: this.y + this.height - 16,
            w: 32,
            h: 16,
            vx: -240,
            life: 0.8
        });

        this.shockwaves.push({
            x: this.x + this.width,
            y: this.y + this.height - 16,
            w: 32,
            h: 16,
            vx: 240,
            life: 0.8
        });

        // Dust slam clouds
        particles.emitBurst('smoke', this.getCenterX(), this.y + this.height - 10, 8);
    }

    _updateShockwaves(dt, player, audio, particles) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.x += s.vx * dt;
            s.life -= dt;

            // Box overlap check
            const sBox = { x: s.x, y: s.y, w: s.w, h: s.h };
            if (Physics.overlap(sBox, player.getBounds()) && player.alive) {
                player.takeDamage(this.damage, audio, particles);
                s.life = 0;
            }

            if (s.life <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    render(ctx, camera) {
        // Draw shockwaves
        ctx.save();
        ctx.fillStyle = '#FFA726';
        ctx.strokeStyle = '#D84315';
        ctx.lineWidth = 2;
        for (const s of this.shockwaves) {
            ctx.beginPath();
            ctx.ellipse(s.x + s.w/2, s.y + s.h/2, s.w/2, s.h/2, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();

        if (!this.visible || this.state === 'dead') return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();

        let shakeX = 0;
        if (this.hurtTimer > 0) {
            shakeX = Math.sin(this.stateTimer * 40) * 3;
        }

        ctx.translate(cx + shakeX, cy);
        ctx.scale(this.facing, 1);

        // Draw big cartoon brute (Orange/Brown body, huge arms)
        ctx.fillStyle = '#D84315'; // Dark orange body
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 3;

        // Legs (chubby logs)
        ctx.fillRect(-18, 20, 10, 20);
        ctx.strokeRect(-18, 20, 10, 20);
        ctx.fillRect(8, 20, 10, 20);
        ctx.strokeRect(8, 20, 10, 20);

        // Huge torso
        ctx.beginPath();
        ctx.roundRect(-26, -20, 52, 42, 10);
        ctx.fill();
        ctx.stroke();

        // Head (positioned low/sunken in shoulders)
        ctx.fillStyle = '#FF8A65';
        ctx.beginPath();
        ctx.arc(0, -18, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tiny angry eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-4, -20, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -20, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(-3, -20, 1, 0, Math.PI * 2);
        ctx.arc(5, -20, 1, 0, Math.PI * 2);
        ctx.fill();

        // Huge mouth
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-5, -12);
        ctx.lineTo(5, -12);
        ctx.stroke();

        // Arms (Huge! Slam stance raises them up)
        ctx.fillStyle = '#D84315';
        let armYOffset = 0;
        if (this.isSlamming) {
            armYOffset = -25;
        }

        // Left fist
        ctx.beginPath();
        ctx.roundRect(-36, -10 + armYOffset, 12, 28, 6);
        ctx.fill();
        ctx.stroke();

        // Right fist
        ctx.beginPath();
        ctx.roundRect(24, -10 + armYOffset, 12, 28, 6);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Health bar
        this._drawHealthBar(ctx, camera);
    }
};
