/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Coin Collectible
 * ============================================================
 * Defines the gold/silver/bronze coins with 3D spinning canvas drawing,
 * sparkles, and score adjustments.
 */

'use strict';

window.Coin = class Coin extends window.Collectible {
    constructor(x, y, value = 1, coinType = 'gold') {
        super(x, y, 20, 20, 'coin');
        this.coinType = coinType;
        this.value = value;

        // Custom points based on metal
        if (coinType === 'gold') {
            this.points = COLLECTIBLE.COIN_VALUE; // 10 points
            this.color = COLORS.COIN_GOLD;
        } else if (coinType === 'silver') {
            this.points = 5;
            this.color = '#B0BEC5';
        } else {
            this.points = 1;
            this.color = '#CD7F32'; // Bronze
        }

        this.spinProgress = Math.random() * Math.PI;
    }

    update(dt, player) {
        super.update(dt, player);
        if (!this.collected) {
            // Spin animation
            this.spinProgress += 6 * dt;
        }
    }

    render(ctx, camera) {
        if (this.collected) return;

        ctx.save();
        
        // Ellipse width oscillates to simulate a spinning coin
        const spinWidth = Math.abs(Math.sin(this.spinProgress)) * this.width;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2 + this.bobOffset;

        // Draw shadow
        ctx.fillStyle = COLORS.SHADOW;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 14, spinWidth / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw outer coin face
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, spinWidth / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner coin details (small star or line in center)
        if (spinWidth > 8) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${this.height * 0.5}px Nunito`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Draw a subtle gold coin logo (e.g. C or $)
            ctx.fillText('$', centerX, centerY + 0.5);
        }

        ctx.restore();
    }

    onCollect(player) {
        // Double Coins powerup check
        const mult = player.doubleCoinsActive ? 2 : 1;
        player.addCoins(this.value, mult);
        player.addScore(this.points * mult);

        // Procedural Audio
        if (window.game && window.game.audio) {
            window.game.audio.playSound(SFX.COIN);
        }

        // Emit sparkles
        if (window.game && window.game.particles) {
            window.game.particles.emitBurst('coinSparkle', this.getCenterX(), this.getCenterY(), 4, {
                color: this.color
            });
        }
    }
};
