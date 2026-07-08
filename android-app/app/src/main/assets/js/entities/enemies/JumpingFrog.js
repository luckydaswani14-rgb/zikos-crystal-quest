/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Jumping Frog Enemy
 * ============================================================
 * Ground hopping frog enemy that extends its tongue as a horizontal
 * attack range hitbox.
 */

'use strict';

window.JumpingFrog = class JumpingFrog extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 32, 28, config);
        this.maxHealth = 2;
        this.health = this.maxHealth;
        this.damage = 1;

        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 100;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 100;

        // Hopping cycles
        this.hopTimer = 0;
        this.hopCooldown = 1.4;

        // Tongue status
        this.tongueActive = false;
        this.tongueProgress = 0; // 0 to 1 back to 0
        this.tongueDirection = 1;
        this.tongueLength = 60; // px reach

        this.dropCoins = 2;
        this.dropScore = 75;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        if (this.state === 'dead') {
            super.update(dt, player, tileMap, entities, audio, particles);
            return;
        }

        this.stateTimer += dt;

        // Tongue attack check when player close on floor
        const distToPlayer = this.distanceTo(player);
        if (distToPlayer < 90 && !this.tongueActive && this.onGround && player.alive) {
            this.tongueActive = true;
            this.tongueProgress = 0;
            this.tongueDirection = 1;
            // Face player
            this.facing = player.x > this.x ? 1 : -1;
        }

        // Handle Tongue logic
        if (this.tongueActive) {
            this.vx = 0;
            
            // Extend/Retract tongue
            this.tongueProgress += dt * 4 * this.tongueDirection;
            if (this.tongueProgress >= 1.0) {
                this.tongueProgress = 1.0;
                this.tongueDirection = -1;
            } else if (this.tongueProgress <= 0.0) {
                this.tongueProgress = 0;
                this.tongueActive = false;
            }

            // Check tongue contact collision box
            const tongueWidth = this.tongueLength * this.tongueProgress;
            const tongueBox = {
                x: this.facing === 1 ? this.x + this.width : this.x - tongueWidth,
                y: this.y + 8,
                w: tongueWidth,
                h: 8
            };

            if (Physics.overlap(tongueBox, player.getBounds()) && player.alive) {
                player.takeDamage(this.damage, audio, particles);
                // Retract tongue immediately on contact
                this.tongueDirection = -1;
            }

            // Apply standard gravity during tongue slam
            this.y += this.vy * dt;
            Physics.resolveEntityVsTilemap(this, tileMap, dt);
            return;
        }

        // Standard hopping movement
        if (this.onGround) {
            this.vx = 0;
            this.hopTimer += dt;
            if (this.hopTimer >= this.hopCooldown) {
                this.hopTimer = 0;
                this.vy = -280; // Hop up
                this.vx = this.facing * 120; // Hop forward
                audio.playSound(SFX.JUMP);
            }
        }

        // Fall and collide
        this.y += this.vy * dt;
        this.x += this.vx * dt;

        // Resolve boundaries
        if (this.x <= this.patrolLeft && this.vx < 0) {
            this.facing = 1;
            this.vx = 0;
        } else if (this.x + this.width >= this.patrolRight && this.vx > 0) {
            this.facing = -1;
            this.vx = 0;
        }

        const collisionState = Physics.resolveEntityVsTilemap(this, tileMap, dt);
        this.onGround = collisionState.onGround;

        // Touch damage
        if (this.overlaps(player) && player.alive) {
            player.takeDamage(this.damage, audio, particles);
        }
    }

    render(ctx, camera) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Draw extended pink tongue vector
        if (this.tongueActive && !this.collected) {
            ctx.save();
            ctx.strokeStyle = '#FF4081'; // Pink tongue
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx + (this.facing * 10), cy - 2);
            ctx.lineTo(cx + (this.facing * (10 + this.tongueLength * this.tongueProgress)), cy - 2);
            ctx.stroke();

            // Tongue tip loop
            ctx.fillStyle = '#E91E63';
            ctx.beginPath();
            ctx.arc(cx + (this.facing * (10 + this.tongueLength * this.tongueProgress)), cy - 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (!this.visible || this.state === 'dead') return;

        ctx.save();

        let shakeX = 0;
        if (this.hurtTimer > 0) {
            shakeX = Math.sin(this.stateTimer * 40) * 3;
        }

        ctx.translate(cx + shakeX, cy);
        ctx.scale(this.facing, 1);

        // Frog squat visuals
        let scaleX = 1.0;
        let scaleY = 1.0;
        if (this.onGround && this.hopTimer > this.hopCooldown - 0.25) {
            // Squat down preparing to jump
            scaleX = 1.25;
            scaleY = 0.75;
        } else if (!this.onGround) {
            scaleX = 0.85;
            scaleY = 1.15;
        }

        ctx.scale(scaleX, scaleY);

        // Draw green cartoon frog
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 2.5;

        // Legs
        ctx.fillRect(-14, 8, 6, 6);
        ctx.strokeRect(-14, 8, 6, 6);
        ctx.fillRect(8, 8, 6, 6);
        ctx.strokeRect(8, 8, 6, 6);

        // Body sphere
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Big yellow eyes on top of head
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(-6, -11, 4, 0, Math.PI * 2);
        ctx.arc(6, -11, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-5.5, -11, 1.5, 0, Math.PI * 2);
        ctx.arc(6.5, -11, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -2, 5, 0, Math.PI);
        ctx.stroke();

        ctx.restore();

        // Health bar
        this._drawHealthBar(ctx, camera);
    }
};
