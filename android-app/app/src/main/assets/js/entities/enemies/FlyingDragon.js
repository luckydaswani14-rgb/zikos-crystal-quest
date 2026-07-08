/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Flying Dragon Enemy
 * ============================================================
 * Red flying dragon. Figure-8 hovering flight path, 
 * triple fan fire breath attacks, and majestic wings.
 */

'use strict';

window.FlyingDragon = class FlyingDragon extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 64, 48, config);
        this.maxHealth = 8;
        this.health = this.maxHealth;
        this.damage = 1;

        // Custom dragon flight properties
        this.startX = x;
        this.startY = y;
        this.flightTimer = Math.random() * 10;
        this.fireCooldown = 3.0;

        // Projectiles container
        this.projectiles = [];

        this.dropCoins = 8;
        this.dropScore = 300;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        // Update dragon breath fireballs
        this._updateProjectiles(dt, player, tileMap, audio, particles);

        if (this.state === 'dead') {
            this.vy += WORLD_GRAVITY * dt;
            this.y += this.vy * dt;
            if (this.y > tileMap.getWorldHeight() + 100) this.alive = false;
            return;
        }

        this.stateTimer += dt;
        this.flightTimer += dt;

        // Figure-8 flight path coordinates
        // Width of figure-8 path: 160px; height: 40px
        const scaleX = 140;
        const scaleY = 32;
        this.x = this.startX + Math.sin(this.flightTimer) * scaleX;
        this.y = this.startY + Math.sin(this.flightTimer * 2) * scaleY;

        // Facing direction is derived from movement sign
        const dx = Math.cos(this.flightTimer);
        this.facing = dx > 0 ? 1 : -1;

        // Shoot triple fireballs if player is close
        const distance = this.distanceTo(player);
        if (distance < ENEMY.DETECT_RANGE * 1.2 && player.alive) {
            this.fireCooldown -= dt;
            if (this.fireCooldown <= 0) {
                this._breathFire(player, audio, particles);
            }
        } else {
            this.fireCooldown = Math.max(0, this.fireCooldown - dt);
        }

        // Damage on contact
        if (this.overlaps(player) && player.alive) {
            player.takeDamage(this.damage, audio, particles);
        }
    }

    _breathFire(player, audio, particles) {
        this.fireCooldown = 3.5; // 3.5s cooldown

        audio.playSound(SFX.ATTACK);

        // Vector to player
        const dx = player.getCenterX() - this.getCenterX();
        const dy = player.getCenterY() - this.getCenterY();
        const baseAngle = Math.atan2(dy, dx);

        const speed = 260;
        
        // Spawn 3 fireballs in a fan pattern (baseAngle, baseAngle - 15deg, baseAngle + 15deg)
        const spread = degToRad(15);
        const angles = [baseAngle, baseAngle - spread, baseAngle + spread];

        for (const angle of angles) {
            this.projectiles.push({
                x: this.getCenterX() - 6,
                y: this.getCenterY() - 6,
                width: 12,
                height: 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 2.0
            });
        }

        // Fire particles
        particles.emitBurst('fire', this.getCenterX(), this.getCenterY(), 6);
    }

    _updateProjectiles(dt, player, tileMap, audio, particles) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            let collides = false;

            // Check tilemap
            const tx = Math.floor(p.x / TILE_SIZE);
            const ty = Math.floor(p.y / TILE_SIZE);
            if (tileMap.isSolid(tx, ty)) {
                collides = true;
            }

            // Check player
            const pBox = { x: p.x, y: p.y, w: p.width, h: p.height };
            if (Physics.overlap(pBox, player.getBounds()) && player.alive) {
                player.takeDamage(this.damage, audio, particles);
                collides = true;
            }

            if (collides || p.life <= 0) {
                particles.emitBurst('fire', p.x + 6, p.y + 6, 2);
                this.projectiles.splice(i, 1);
            }
        }
    }

    render(ctx, camera) {
        // Draw fire breath fan projectiles
        ctx.save();
        ctx.fillStyle = '#FF5722';
        for (const p of this.projectiles) {
            ctx.shadowColor = '#FF3D00';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x + 6, p.y + 6, 6, 0, Math.PI * 2);
            ctx.fill();
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

        // Draw Majestic Red Dragon
        ctx.fillStyle = '#D84315'; // Dragon Orange-Red
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2.5;

        // Wing flap angle
        const wingFlap = Math.sin(this.flightTimer * 8) * 12;

        // Back Wing
        ctx.fillStyle = '#BF360C'; // Darker back wing
        ctx.beginPath();
        ctx.moveTo(-4, -14);
        ctx.lineTo(-24, -28 + wingFlap);
        ctx.lineTo(-20, -4 + wingFlap);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tail
        ctx.fillStyle = '#D84315';
        ctx.beginPath();
        ctx.moveTo(-16, 2);
        ctx.quadraticCurveTo(-26, 12, -32, 6);
        ctx.lineTo(-30, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Tail spike
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.moveTo(-32, 6); ctx.lineTo(-38, 8); ctx.lineTo(-30, 2);
        ctx.fill();

        // Main Body Oval
        ctx.fillStyle = '#D84315';
        ctx.beginPath();
        ctx.ellipse(-6, 0, 16, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Long neck
        ctx.beginPath();
        ctx.moveTo(4, -6);
        ctx.lineTo(14, -20);
        ctx.lineTo(22, -18);
        ctx.lineTo(8, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.roundRect(10, -26, 18, 12, 4);
        ctx.fill();
        ctx.stroke();

        // Snout spike / Horns
        ctx.fillStyle = '#FFEB3B'; // Gold horns
        ctx.beginPath();
        ctx.moveTo(11, -26); ctx.lineTo(6, -34); ctx.lineTo(16, -26);
        ctx.fill();

        // Yellow evil eyes
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(18, -22, 2, 0, Math.PI * 2);
        ctx.fill();

        // Front Wing
        ctx.fillStyle = '#D84315';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-22, -30 + wingFlap);
        ctx.lineTo(-14, 4 + wingFlap);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Health bar
        this._drawHealthBar(ctx, camera);
    }
};
