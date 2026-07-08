/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Shield Knight Enemy
 * ============================================================
 * Armored ground patrol enemy carrying a defensive shield that blocks 
 * frontal attacks. Shield breaks after 3 damage hits.
 */

'use strict';

window.ShieldKnight = class ShieldKnight extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 36, 48, config);
        this.maxHealth = 4;
        this.health = this.maxHealth;
        this.damage = 1;

        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 100;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 100;

        // Shield status
        this.shieldActive = true;
        this.shieldHealth = 3;

        this.dropCoins = 5;
        this.dropScore = 200;
    }

    takeDamage(amount, knockbackX, knockbackY, audio, particles) {
        if (this.state === 'dead' || this.hurtTimer > 0) return;

        // Determine if hit came from the front (facing direction)
        // If player is facing right, and knight is facing left (facing=-1), and player is to the left:
        // Hit is from the front!
        const player = window.game?.level?.player;
        let isFrontalHit = false;
        
        if (player) {
            const playerToRight = player.getCenterX() > this.getCenterX();
            if ((this.facing === 1 && playerToRight) || (this.facing === -1 && !playerToRight)) {
                isFrontalHit = true;
            }
        }

        if (this.shieldActive && isFrontalHit) {
            // Block hit! Reduce shield health instead
            this.shieldHealth--;
            audio.playSound(SFX.LAND); // clonk sound
            
            // Spark sparks at shield position
            const shieldX = this.facing === 1 ? this.x + this.width : this.x;
            particles.emitBurst('spark', shieldX, this.getCenterY(), 4, { color: '#B0BEC5' });

            if (this.shieldHealth <= 0) {
                this.shieldActive = false;
                // Knight gets angry/faster
                this.speed = ENEMY.CHASE_SPEED;
                audio.playSound(SFX.EXPLOSION); // break pop
                particles.emitBurst('spark', this.getCenterX(), this.getCenterY(), 8);
                if (window.game) {
                    window.game.hud.showMessage("SHIELD BROKEN!", 1.0, '#FF3D00');
                }
            }

            // Standard brief damage flash indicator but NO damage to health
            this.hurtTimer = 0.15;
            return false;
        }

        // Standard damage from rear or if shield is broken
        super.takeDamage(amount, knockbackX, knockbackY, audio, particles);
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

        // Draw Armored Body (Iron metal gray)
        ctx.fillStyle = '#78909C';
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 2.5;

        // Helmet
        ctx.beginPath();
        ctx.roundRect(-10, -20, 20, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Visor slit
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -14, 12, 3);
        // Visor glow
        ctx.fillStyle = '#FF1744';
        ctx.fillRect(-2, -14, 4, 3);

        // Armor Plate Chest
        ctx.fillStyle = '#546E7A';
        ctx.beginPath();
        ctx.roundRect(-12, -6, 24, 20, 4);
        ctx.fill();
        ctx.stroke();

        // Iron Shoulder Pauldrons
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.arc(-13, -5, 5, 0, Math.PI * 2);
        ctx.arc(13, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Chubby Iron boots
        ctx.fillStyle = '#37474F';
        ctx.fillRect(-12, 14, 8, 10);
        ctx.strokeRect(-12, 14, 8, 10);
        ctx.fillRect(4, 14, 8, 10);
        ctx.strokeRect(4, 14, 8, 10);

        // DRAW DEFENSIVE SHIELD (carried on frontal arm: x > 0 locally)
        if (this.shieldActive) {
            ctx.fillStyle = '#8D6E63'; // Wood core
            ctx.strokeStyle = '#37474F'; // Iron trim border
            ctx.lineWidth = 3;

            // Shield plate
            ctx.beginPath();
            ctx.moveTo(8, -10);
            ctx.lineTo(20, -10);
            ctx.lineTo(16, 12);
            ctx.lineTo(6, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Shield iron cross decoration
            ctx.strokeStyle = '#B0BEC5';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(13, -8); ctx.lineTo(11, 10);
            ctx.moveTo(7, 1); ctx.lineTo(18, 1);
            ctx.stroke();
        } else {
            // Shield broken, draw broken wooden splinter outline
            ctx.strokeStyle = 'rgba(141, 110, 99, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(6, -2);
            ctx.lineTo(12, 6);
            ctx.stroke();
        }

        ctx.restore();

        // Health bar
        this._drawHealthBar(ctx, camera);
    }
};
