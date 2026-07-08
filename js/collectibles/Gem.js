/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Gem Collectible
 * ============================================================
 * Implements facetted gems (blue, red, green, purple, diamond)
 * with facet lines, rotating sparkles, and score awards.
 */

'use strict';

window.Gem = class Gem extends window.Collectible {
    constructor(x, y, gemType = 'blue') {
        super(x, y, 24, 24, 'gem');
        this.gemType = gemType;

        // Colors and points based on gem type
        this.points = COLLECTIBLE.GEM_VALUE; // default 100
        
        switch (gemType) {
            case 'blue':
                this.color = COLORS.GEM_BLUE;
                break;
            case 'red':
                this.color = COLORS.GEM_RED;
                this.points = 150;
                break;
            case 'green':
                this.color = COLORS.GEM_GREEN;
                this.points = 200;
                break;
            case 'purple':
                this.color = COLORS.GEM_PURPLE;
                this.points = 250;
                break;
            case 'diamond':
                this.color = '#E0F7FA'; // Diamond sheen
                this.points = 1000;
                break;
            default:
                this.color = COLORS.GEM_BLUE;
        }

        this.sparkleTimer = 0;
    }

    update(dt, player) {
        super.update(dt, player);
        if (!this.collected) {
            this.sparkleTimer += dt;
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
        ctx.ellipse(centerX, centerY + 16, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw classic gem facets
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;

        const w = this.width;
        const h = this.height;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY - h / 2); // Top tip
        ctx.lineTo(centerX + w / 2, centerY - h / 6); // Top-right corner
        ctx.lineTo(centerX + w / 3, centerY + h / 2); // Bottom-right corner
        ctx.lineTo(centerX - w / 3, centerY + h / 2); // Bottom-left corner
        ctx.lineTo(centerX - w / 2, centerY - h / 6); // Top-left corner
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw facet reflection lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Top facet lines
        ctx.moveTo(centerX, centerY - h / 2);
        ctx.lineTo(centerX, centerY + h / 2);
        ctx.moveTo(centerX - w / 2, centerY - h / 6);
        ctx.lineTo(centerX + w / 2, centerY - h / 6);
        // Connect diagonals to bottom facets
        ctx.moveTo(centerX - w / 2, centerY - h / 6);
        ctx.lineTo(centerX - w / 3, centerY + h / 2);
        ctx.moveTo(centerX + w / 2, centerY - h / 6);
        ctx.lineTo(centerX + w / 3, centerY + h / 2);
        ctx.stroke();

        // Facet glaze sheen overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - h / 2);
        ctx.lineTo(centerX + w / 2, centerY - h / 6);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        ctx.fill();

        // Rotating sparkle star overlay
        const angle = this.sparkleTimer * 2;
        const sparkleSize = 6 + Math.sin(this.sparkleTimer * 5) * 2;
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Sparkle cross
        ctx.moveTo(centerX + Math.cos(angle) * sparkleSize, centerY + Math.sin(angle) * sparkleSize);
        ctx.lineTo(centerX - Math.cos(angle) * sparkleSize, centerY - Math.sin(angle) * sparkleSize);
        ctx.moveTo(centerX + Math.cos(angle + Math.PI/2) * sparkleSize, centerY + Math.sin(angle + Math.PI/2) * sparkleSize);
        ctx.lineTo(centerX - Math.cos(angle + Math.PI/2) * sparkleSize, centerY - Math.sin(angle + Math.PI/2) * sparkleSize);
        ctx.stroke();

        ctx.restore();
    }

    onCollect(player) {
        player.addGems(1);
        player.addScore(this.points);

        // Sound
        if (window.game && window.game.audio) {
            window.game.audio.playSound(SFX.GEM);
        }

        // Particle Burst
        if (window.game && window.game.particles) {
            window.game.particles.emitBurst('gemSparkle', this.getCenterX(), this.getCenterY(), 6, {
                color: this.color
            });
        }
    }
};
