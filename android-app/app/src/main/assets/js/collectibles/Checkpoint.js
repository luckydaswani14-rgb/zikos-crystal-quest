/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Checkpoint Flag
 * ============================================================
 * Defines saving flagpoles that capture player coordinates on touch,
 * waving flag vectors, and triggers game autosave.
 */

'use strict';

window.Checkpoint = class Checkpoint extends window.Collectible {
    constructor(x, y) {
        super(x, y - 16, 24, 48, 'checkpoint');
        this.state = 'inactive'; // inactive, active (activated)
        this.waveTimer = 0;
        this.glowTimer = 0;
    }

    update(dt, player) {
        // We override standard collectible update because checkpoints do NOT set alive=false
        this.waveTimer += dt * 5;
        
        if (this.state === 'active') {
            this.glowTimer += dt;
        }

        // Check if player overlaps to activate
        if (this.state === 'inactive' && this.overlaps(player)) {
            this.activate(player);
        }
    }

    activate(player) {
        this.state = 'active';

        // Update player spawn coordinates to this checkpoint location
        // Spawn slightly above the floor
        if (window.game && window.game.level) {
            window.game.level.spawnPoint = { x: this.x, y: this.y + 16 };
            
            // Trigger Autosave
            window.game.saveCurrentProgress();
            
            // Show alert message in HUD
            window.game.hud.showMessage("CHECKPOINT!", 2.0, '#4CAF50');
        }

        // Sound
        if (window.game && window.game.audio) {
            window.game.audio.playSound(SFX.CHECKPOINT);
        }

        // Particle Burst
        if (window.game && window.game.particles) {
            window.game.particles.emitBurst('star', this.x + 4, this.y, 8, {
                color: '#FFD700'
            });
            window.game.particles.emitBurst('confetti', this.x + 4, this.y, 12);
        }
    }

    render(ctx, camera) {
        const flagX = this.x + 4;
        const flagY = this.y;

        ctx.save();

        // 1. Draw flag pole
        ctx.fillStyle = '#90A4AE';
        ctx.fillRect(flagX, flagY, 4, this.height);
        
        // Pole top golden ball
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(flagX + 2, flagY, 3, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw waving flag banner
        const wave = Math.sin(this.waveTimer) * 3;
        const flagWidth = 24;
        const flagHeight = 16;
        const flagColor = (this.state === 'active') ? '#4CAF50' : '#E53935'; // Green active, Red inactive

        ctx.fillStyle = flagColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(flagX + 4, flagY + 2);
        // Top edge with wave shape
        ctx.quadraticCurveTo(flagX + 4 + flagWidth / 2, flagY + 2 + wave, flagX + 4 + flagWidth, flagY + 4);
        ctx.lineTo(flagX + 4 + flagWidth, flagY + 4 + flagHeight);
        // Bottom edge with wave shape
        ctx.quadraticCurveTo(flagX + 4 + flagWidth / 2, flagY + 2 + flagHeight + wave, flagX + 4, flagY + 2 + flagHeight);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        // If active, draw glowing sparkles orbiting or overlaying
        if (this.state === 'active') {
            const pulse = Math.abs(Math.sin(this.glowTimer * 4));
            ctx.shadowColor = '#4CAF50';
            ctx.shadowBlur = 10 * pulse;
            ctx.strokeStyle = '#81C784';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(flagX + 2, flagY + 8, 8 + pulse * 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
};
