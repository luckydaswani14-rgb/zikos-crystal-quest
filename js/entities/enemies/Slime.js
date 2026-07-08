/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Slime Enemy
 * ============================================================
 * Bouncy green slime ground enemy that morphs shape during 
 * patrols and chasing hop cycles.
 */

'use strict';

window.Slime = class Slime extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 32, 24, config);
        this.maxHealth = 2;
        this.health = this.maxHealth;
        this.damage = 1;
        
        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 100;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 100;

        // Custom bounce pacing
        this.hopTimer = 0;
        this.hopInterval = 0.8; // Seconds between hops

        this.color = '#4CAF50'; // Green slime
        this.glowColor = '#81C784';
        
        this.dropCoins = rndInt(1, 3);
        this.dropScore = 50;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        super.update(dt, player, tileMap, entities, audio, particles);

        if (this.state === 'dead') return;

        // Bouncy hops when chasing
        if (this.state === 'chase' && this.onGround) {
            this.hopTimer += dt;
            if (this.hopTimer >= this.hopInterval) {
                this.hopTimer = 0;
                this.vy = -300; // Bounce hop
                this.vx = this.facing * ENEMY.CHASE_SPEED;
            }
        }
    }

    render(ctx, camera) {
        if (!this.visible || this.state === 'dead') return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();

        // Ground shadow
        if (this.onGround) {
            ctx.fillStyle = COLORS.SHADOW;
            ctx.beginPath();
            ctx.ellipse(cx, this.y + this.height, 12, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Apply knockback damage shake
        let shakeX = 0;
        if (this.hurtTimer > 0) {
            shakeX = Math.sin(this.stateTimer * 40) * 3;
        }

        ctx.translate(cx + shakeX, cy);
        ctx.scale(this.facing, 1);

        // Squash/Stretch morphing based on bounce velocities
        let scaleX = 1.0;
        let scaleY = 1.0;
        let yOffset = 0;

        if (!this.onGround) {
            if (this.vy < 0) {
                // Stretching up
                scaleX = 0.85;
                scaleY = 1.15;
            } else {
                // Falling
                scaleX = 1.1;
                scaleY = 0.9;
            }
        } else {
            // Squashed brief wind-up or recovery
            if (this.state === 'chase' && this.hopTimer > this.hopInterval - 0.15) {
                scaleX = 1.3;
                scaleY = 0.7;
                yOffset = 4;
            }
        }

        ctx.scale(scaleX, scaleY);
        ctx.translate(0, yOffset);

        // Draw Slime Body (Gradient Circle)
        const radGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, 16);
        radGrad.addColorStop(0, '#A5D6A7');
        radGrad.addColorStop(0.7, '#4CAF50');
        radGrad.addColorStop(1, '#2E7D32');

        ctx.fillStyle = radGrad;
        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Slime dome shape (flat bottom, arched top)
        ctx.moveTo(-16, 12);
        ctx.quadraticCurveTo(-16, -16, 0, -16);
        ctx.quadraticCurveTo(16, -16, 16, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rosy check-dots inside slime
        ctx.fillStyle = '#81C784';
        ctx.beginPath();
        ctx.arc(-8, -6, 2, 0, Math.PI * 2);
        ctx.arc(8, -6, 2, 0, Math.PI * 2);
        ctx.fill();

        // Cute Googly Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-5, -2, 3, 0, Math.PI * 2);
        ctx.arc(5, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils look toward target player when chasing, otherwise forward
        ctx.fillStyle = '#000000';
        const lookDir = (this.state === 'chase') ? 1.2 : 0;
        ctx.beginPath();
        ctx.arc(-4 + lookDir, -2, 1.2, 0, Math.PI * 2);
        ctx.arc(6 + lookDir, -2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Cute happy smile or scared line
        ctx.beginPath();
        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 1.5;
        if (this.state === 'chase') {
            // Scared flat mouth
            ctx.moveTo(-3, 4);
            ctx.lineTo(3, 4);
        } else {
            // Smile
            ctx.arc(0, 2, 2.5, 0, Math.PI);
        }
        ctx.stroke();

        ctx.restore();

        // Render healthbar if damaged
        this._drawHealthBar(ctx, camera);
    }
};
