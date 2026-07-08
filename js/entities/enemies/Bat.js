/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Bat Enemy
 * ============================================================
 * Flying bat enemy that hangs from ceiling and dive-bombs the player,
 * flapping vector wings.
 */

'use strict';

window.Bat = class Bat extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 36, 24, config);
        this.maxHealth = 2;
        this.health = this.maxHealth;
        this.damage = 1;

        // Custom properties (Bat does not use normal ground physics)
        this.originY = y;
        this.wingTimer = 0;
        
        // State
        this.state = 'idle'; // idle (hanging), chase (flying/diving), retreat
        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 120;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 120;
        
        this.dropCoins = 2;
        this.dropScore = 75;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        this.stateTimer += dt;

        if (this.state === 'dead') {
            // Apply falling gravity on death
            this.vy += WORLD_GRAVITY * dt;
            this.y += this.vy * dt;
            this.x += this.vx * dt;

            const bounds = this.getBounds();
            const tx = Math.floor(this.getCenterX() / TILE_SIZE);
            const ty = Math.floor((this.y + this.height) / TILE_SIZE);
            if (tileMap.isSolid(tx, ty) || this.y > tileMap.getWorldHeight()) {
                this.alive = false;
            }
            return;
        }

        // Custom flight logic overriding base Enemy ground physics
        const distToPlayer = this.distanceTo(player);

        if (this.state === 'idle') {
            this.vx = 0;
            this.vy = 0;
            if (distToPlayer < ENEMY.DETECT_RANGE) {
                this.state = 'chase';
                this.stateTime = 0;
            }
        } else if (this.state === 'chase') {
            this.wingTimer += dt * 15; // Fast flapping

            // Calculate direct vector toward player
            const dx = player.getCenterX() - this.getCenterX();
            const dy = player.getCenterY() - this.getCenterY();
            const distance = Math.hypot(dx, dy);

            if (distance > 10) {
                this.facing = dx > 0 ? 1 : -1;
                this.vx = (dx / distance) * ENEMY.CHASE_SPEED;
                // Dive faster Y
                this.vy = (dy / distance) * ENEMY.CHASE_SPEED;
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Stop chasing if player gets far away
            if (distance > ENEMY.DETECT_RANGE * 1.5) {
                this.state = 'retreat';
                this.stateTime = 0;
            }
        } else if (this.state === 'retreat') {
            this.wingTimer += dt * 8; // Slower flap

            // Fly back to original y coordinate and horizontal patrol center
            const targetX = (this.patrolLeft + this.patrolRight) / 2;
            const targetY = this.originY;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 15) {
                this.facing = dx > 0 ? 1 : -1;
                this.vx = (dx / distance) * ENEMY.PATROL_SPEED;
                this.vy = (dy / distance) * ENEMY.PATROL_SPEED;
            } else {
                this.state = 'idle';
                this.stateTime = 0;
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Damage player on overlap
        if (this.overlaps(player) && player.alive) {
            player.takeDamage(this.damage, audio, particles);
        }
    }

    render(ctx, camera) {
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

        if (this.state === 'idle') {
            // Draw sleeping upside down bat wrapped in wings
            ctx.fillStyle = '#673AB7'; // Purple bat
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;

            // wrapped wings body shape
            ctx.beginPath();
            ctx.moveTo(-8, -12);
            ctx.lineTo(8, -12);
            ctx.lineTo(10, 8);
            ctx.quadraticCurveTo(0, 16, -10, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Tiny upside down ears
            ctx.beginPath();
            ctx.moveTo(-6, -12); ctx.lineTo(-8, -18); ctx.lineTo(-2, -12);
            ctx.moveTo(6, -12); ctx.lineTo(8, -18); ctx.lineTo(2, -12);
            ctx.fill();
            ctx.stroke();

            // Sleeping closed eyes
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(-3, -2, 1.5, Math.PI, 0);
            ctx.arc(3, -2, 1.5, Math.PI, 0);
            ctx.stroke();
        } else {
            // Flying Bat with flapping wings
            ctx.fillStyle = '#512DA8'; // Deep Purple
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;

            const wingFlap = Math.sin(this.wingTimer) * 12;

            // Wing Left (flapping Y angle)
            ctx.beginPath();
            ctx.moveTo(-6, -2);
            ctx.lineTo(-24, -8 + wingFlap);
            ctx.lineTo(-14, 6 + wingFlap);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Wing Right
            ctx.beginPath();
            ctx.moveTo(6, -2);
            ctx.lineTo(24, -8 + wingFlap);
            ctx.lineTo(14, 6 + wingFlap);
            ctx.lineTo(4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Center Body (Oval)
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(0, -8, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Angry Ears
            ctx.beginPath();
            ctx.moveTo(-5, -14); ctx.lineTo(-8, -22); ctx.lineTo(-1, -14);
            ctx.moveTo(5, -14); ctx.lineTo(8, -22); ctx.lineTo(1, -14);
            ctx.fill();
            ctx.stroke();

            // Angry glowing red eyes
            ctx.fillStyle = '#FF5252';
            ctx.beginPath();
            ctx.arc(-3, -8, 2, 0, Math.PI * 2);
            ctx.arc(3, -8, 2, 0, Math.PI * 2);
            ctx.fill();

            // Fangs (White triangles)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(-4, -4); ctx.lineTo(-3, 0); ctx.lineTo(-2, -4);
            ctx.moveTo(2, -4); ctx.lineTo(3, 0); ctx.lineTo(4, -4);
            ctx.fill();
        }

        ctx.restore();

        // Render healthbar if damaged
        this._drawHealthBar(ctx, camera);
    }
};
