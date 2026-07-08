/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — PowerUp Collectible
 * ============================================================
 * Implements the power-up items (speed, fire, ice, shield, magnet, etc.)
 * with visual icon drawings on Canvas and activation timers.
 */

'use strict';

window.PowerUp = class PowerUp extends window.Collectible {
    constructor(x, y, powerType) {
        super(x, y, 32, 32, 'powerup');
        this.powerType = powerType;

        // Custom styling setup
        this._setupProperties();
        this.glowTimer = 0;
    }

    _setupProperties() {
        switch (this.powerType) {
            case POWERUP_TYPE.SPEED:
                this.color = '#FFD54F'; // Gold Yellow
                this.glowColor = 'rgba(255, 213, 79, 0.4)';
                this.duration = 8.0;
                break;
            case POWERUP_TYPE.FIRE:
                this.color = '#FF7043'; // Flame Orange
                this.glowColor = 'rgba(255, 112, 67, 0.4)';
                this.duration = 12.0;
                break;
            case POWERUP_TYPE.ICE:
                this.color = '#4DD0E1'; // Ice Blue
                this.glowColor = 'rgba(77, 208, 225, 0.4)';
                this.duration = 12.0;
                break;
            case POWERUP_TYPE.SHIELD:
                this.color = '#29B6F6'; // Shield Blue
                this.glowColor = 'rgba(41, 182, 246, 0.4)';
                this.duration = 10.0;
                break;
            case POWERUP_TYPE.MAGNET:
                this.color = '#EC407A'; // Magnet Pink
                this.glowColor = 'rgba(236, 64, 122, 0.4)';
                this.duration = 15.0;
                break;
            case POWERUP_TYPE.DOUBLE_COIN:
                this.color = '#FFA726'; // Orange Gold
                this.glowColor = 'rgba(255, 167, 38, 0.4)';
                this.duration = 20.0;
                break;
            case POWERUP_TYPE.INVINCIBLE:
                this.color = '#AB47BC'; // Magenta
                this.glowColor = 'rgba(171, 71, 188, 0.4)';
                this.duration = 8.0;
                break;
            case POWERUP_TYPE.EXTRA_LIFE:
                this.color = '#EF5350'; // Heart Red
                this.glowColor = 'rgba(239, 83, 80, 0.4)';
                this.duration = 0; // Instant
                break;
            case POWERUP_TYPE.HEAL:
                this.color = '#66BB6A'; // Plus Green
                this.glowColor = 'rgba(102, 187, 106, 0.4)';
                this.duration = 0; // Instant
                break;
            default:
                this.color = '#FFFFFF';
                this.glowColor = 'rgba(255, 255, 255, 0.3)';
                this.duration = 5.0;
        }
    }

    update(dt, player) {
        super.update(dt, player);
        if (!this.collected) {
            this.glowTimer += dt;
        }
    }

    render(ctx, camera) {
        if (this.collected) return;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2 + this.bobOffset;

        ctx.save();

        // Draw shadow
        ctx.fillStyle = COLORS.SHADOW;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 20, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer pulsing glow
        const pulse = 4 + Math.sin(this.glowTimer * 4) * 3;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = pulse * 2;

        // Draw container box
        ctx.fillStyle = 'rgba(20, 20, 30, 0.85)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.roundRect(centerX - this.width / 2, centerY - this.height / 2, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();

        // Remove glow shadow for drawing interior icon details
        ctx.shadowBlur = 0;

        // Draw specific icon inside box
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        this._drawIcon(ctx, centerX, centerY);

        ctx.restore();
    }

    _drawIcon(ctx, cx, cy) {
        switch (this.powerType) {
            case POWERUP_TYPE.SPEED:
                // Lightning Bolt
                ctx.beginPath();
                ctx.moveTo(cx + 2, cy - 10);
                ctx.lineTo(cx - 6, cy + 2);
                ctx.lineTo(cx, cy + 2);
                ctx.lineTo(cx - 2, cy + 10);
                ctx.lineTo(cx + 6, cy - 2);
                ctx.lineTo(cx, cy - 2);
                ctx.closePath();
                ctx.fill();
                break;

            case POWERUP_TYPE.FIRE:
                // Flame
                ctx.beginPath();
                ctx.moveTo(cx, cy - 10);
                ctx.quadraticCurveTo(cx + 6, cy - 4, cx + 6, cy + 4);
                ctx.quadraticCurveTo(cx, cy + 10, cx - 6, cy + 4);
                ctx.quadraticCurveTo(cx - 6, cy - 2, cx - 2, cy - 4);
                ctx.quadraticCurveTo(cx + 2, cy, cx, cy - 10);
                ctx.fill();
                break;

            case POWERUP_TYPE.ICE:
                // Snowflake
                ctx.beginPath();
                // vertical stem
                ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
                // diagonal stems
                ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6);
                ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6);
                ctx.stroke();
                // Draw little dots at tips
                ctx.beginPath();
                ctx.arc(cx, cy - 8, 1.5, 0, Math.PI * 2);
                ctx.arc(cx, cy + 8, 1.5, 0, Math.PI * 2);
                ctx.arc(cx - 6, cy - 6, 1.5, 0, Math.PI * 2);
                ctx.arc(cx + 6, cy + 6, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case POWERUP_TYPE.SHIELD:
                // Crest Shield
                ctx.beginPath();
                ctx.moveTo(cx - 6, cy - 8);
                ctx.lineTo(cx + 6, cy - 8);
                ctx.lineTo(cx + 6, cy - 2);
                ctx.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 10);
                ctx.quadraticCurveTo(cx - 6, cy + 6, cx - 6, cy - 2);
                ctx.closePath();
                ctx.fill();
                break;

            case POWERUP_TYPE.MAGNET:
                // Horseshoe Magnet
                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.arc(cx, cy + 2, 5, Math.PI, 0, true);
                ctx.lineTo(cx + 5, cy - 6);
                ctx.lineTo(cx - 5, cy - 6);
                ctx.stroke();
                // Draw magnetic tips
                ctx.fillStyle = '#EF5350'; // Red tips
                ctx.fillRect(cx - 6.5, cy - 8, 3, 3);
                ctx.fillRect(cx + 3.5, cy - 8, 3, 3);
                break;

            case POWERUP_TYPE.DOUBLE_COIN:
                // Stack of two circles representing double coins
                ctx.beginPath();
                ctx.arc(cx - 3, cy + 2, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#FFF59D';
                ctx.beginPath();
                ctx.arc(cx + 3, cy - 3, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            case POWERUP_TYPE.INVINCIBLE:
                // 5-point Star
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(cx + Math.cos((18 + i * 72) * Math.PI / 180) * 8,
                               cy - Math.sin((18 + i * 72) * Math.PI / 180) * 8);
                    ctx.lineTo(cx + Math.cos((54 + i * 72) * Math.PI / 180) * 4,
                               cy - Math.sin((54 + i * 72) * Math.PI / 180) * 4);
                }
                ctx.closePath();
                ctx.fill();
                break;

            case POWERUP_TYPE.EXTRA_LIFE:
                // Heart Icon
                ctx.beginPath();
                ctx.moveTo(cx, cy - 3);
                ctx.bezierCurveTo(cx - 4, cy - 8, cx - 8, cy - 4, cx - 8, cy);
                ctx.bezierCurveTo(cx - 8, cy + 4, cx - 4, cy + 7, cx, cy + 10);
                ctx.bezierCurveTo(cx + 4, cy + 7, cx + 8, cy + 4, cx + 8, cy);
                ctx.bezierCurveTo(cx + 8, cy - 4, cx + 4, cy - 8, cx, cy - 3);
                ctx.closePath();
                ctx.fill();
                break;

            case POWERUP_TYPE.HEAL:
                // Green Cross
                ctx.beginPath();
                ctx.fillRect(cx - 2, cy - 7, 4, 14);
                ctx.fillRect(cx - 7, cy - 2, 14, 4);
                break;
        }
    }

    onCollect(player) {
        player.activatePowerUp(this.powerType, this.duration);

        // Sound
        if (window.game && window.game.audio) {
            window.game.audio.playSound(SFX.POWERUP);
        }

        // Emit spark burst
        if (window.game && window.game.particles) {
            window.game.particles.emitBurst('portal', this.getCenterX(), this.getCenterY(), 10, {
                color: this.color
            });
        }
    }
};
