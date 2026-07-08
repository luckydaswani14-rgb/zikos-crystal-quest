/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Fire Sprite Enemy
 * ============================================================
 * Flame sprite elemental hovering in horizontal sine paths,
 * shooting blazing vector fireballs.
 */

'use strict';

window.FireSprite = class FireSprite extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 28, 28, config);
        this.maxHealth = 3;
        this.health = this.maxHealth;
        this.damage = 1;

        // Custom properties
        this.originY = y;
        this.hoverTimer = Math.random() * 10;
        this.shootCooldown = 2.0;

        // Fireballs container
        this.projectiles = [];

        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 100;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 100;
        this.speed = ENEMY.PATROL_SPEED * 0.8;

        this.dropCoins = 3;
        this.dropScore = 100;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        // Update custom projectiles first
        this._updateProjectiles(dt, player, tileMap, audio, particles);

        if (this.state === 'dead') {
            this.vy += WORLD_GRAVITY * dt;
            this.y += this.vy * dt;
            if (this.y > tileMap.getWorldHeight() + 100) this.alive = false;
            return;
        }

        this.stateTimer += dt;
        this.hoverTimer += dt * 3;

        // Move horizontally (sine wave Y)
        this.y = this.originY + Math.sin(this.hoverTimer) * 8;

        // Simple horizontal patrol logic
        if (this.facing === 1) {
            this.vx = this.speed;
            if (this.x + this.width >= this.patrolRight) {
                this.facing = -1;
            }
        } else {
            this.vx = -this.speed;
            if (this.x <= this.patrolLeft) {
                this.facing = 1;
            }
        }

        // Apply movement
        this.x += this.vx * dt;

        // Shoot fireballs toward player if detected
        const distance = this.distanceTo(player);
        if (distance < ENEMY.DETECT_RANGE && player.alive) {
            // Face player
            this.facing = player.x > this.x ? 1 : -1;
            
            this.shootCooldown -= dt;
            if (this.shootCooldown <= 0) {
                this._shoot(player, audio, particles);
            }
        } else {
            this.shootCooldown = Math.max(0, this.shootCooldown - dt);
        }

        // Damage on body touch
        if (this.overlaps(player) && player.alive) {
            player.takeDamage(this.damage, audio, particles);
        }
    }

    _shoot(player, audio, particles) {
        this.shootCooldown = 2.0; // 2 seconds delay

        // Sound (pew tone)
        audio.playSound(SFX.ATTACK);

        // Vector to player
        const dx = player.getCenterX() - this.getCenterX();
        const dy = player.getCenterY() - this.getCenterY();
        const distance = Math.hypot(dx, dy);

        const speed = 250;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        this.projectiles.push({
            x: this.getCenterX() - 6,
            y: this.getCenterY() - 6,
            width: 12,
            height: 12,
            vx: vx,
            vy: vy,
            life: 2.0
        });

        // Flash spark particles
        particles.emitBurst('fire', this.getCenterX(), this.getCenterY(), 4);
    }

    _updateProjectiles(dt, player, tileMap, audio, particles) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            let collides = false;
            
            // Check tilemap solid collision
            const tx = Math.floor(p.x / TILE_SIZE);
            const ty = Math.floor(p.y / TILE_SIZE);
            if (tileMap.isSolid(tx, ty)) {
                collides = true;
            }

            // Check player collision
            const pBox = { x: p.x, y: p.y, w: p.width, h: p.height };
            if (Physics.overlap(pBox, player.getBounds()) && player.alive) {
                player.takeDamage(this.damage, audio, particles);
                collides = true;
            }

            // Clean up
            if (collides || p.life <= 0) {
                // Emit small fire sparks
                particles.emitBurst('fire', p.x + 6, p.y + 6, 3);
                this.projectiles.splice(i, 1);
            }
        }
    }

    render(ctx, camera) {
        // Draw fireballs first
        ctx.save();
        ctx.fillStyle = '#FF7043';
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

        // Pulsing scale
        const pulse = 1.0 + Math.sin(this.hoverTimer * 2) * 0.08;
        ctx.scale(pulse, pulse);

        // Blazing Fire Aura
        ctx.shadowColor = '#FF3D00';
        ctx.shadowBlur = 12;

        // Blazing Gradient Flame Body
        const fireGrad = ctx.createRadialGradient(0, -2, 2, 0, 0, 14);
        fireGrad.addColorStop(0, '#FFEB3B'); // Yellow core
        fireGrad.addColorStop(0.5, '#FF9800'); // Orange body
        fireGrad.addColorStop(1, '#FF3D00'); // Deep Red tips

        ctx.fillStyle = fireGrad;
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 1.5;

        // Draw teardrop flame shape
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(12, -4, 12, 6);
        ctx.quadraticCurveTo(12, 14, 0, 14);
        ctx.quadraticCurveTo(-12, 14, -12, 6);
        ctx.quadraticCurveTo(-12, -4, 0, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw angry face
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;

        // Angled eyes (angry look)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-7, -4); ctx.lineTo(-2, -2); ctx.lineTo(-6, 2); ctx.closePath();
        ctx.moveTo(7, -4); ctx.lineTo(2, -2); ctx.lineTo(6, 2); ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing red pupils
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(-4, -1, 1, 0, Math.PI * 2);
        ctx.arc(4, -1, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Health bar
        this._drawHealthBar(ctx, camera);
    }
};
