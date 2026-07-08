/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Ice Golem Enemy
 * ============================================================
 * Slow crystal golem of the frozen waste. Ground stomp shockwaves,
 * freezing contact debuffs, and jagged vector graphics.
 */

'use strict';

window.IceGolem = class IceGolem extends window.Enemy {
    constructor(x, y, patrolLeft = null, patrolRight = null, config = {}) {
        super(x, y, 40, 56, config);
        this.maxHealth = 6;
        this.health = this.maxHealth;
        this.damage = 2;

        this.patrolLeft = patrolLeft !== null ? patrolLeft : x - 80;
        this.patrolRight = patrolRight !== null ? patrolRight : x + 80;
        this.speed = ENEMY.PATROL_SPEED * 0.7; // Slow (56px/s)

        // Custom combat pacing
        this.stompTimer = 0;
        this.stompInterval = 3.5; // Stomp every 3.5s when chasing
        this.isStomping = false;
        this.stompWarmup = 0;

        // Ice wave active list
        this.waves = [];

        this.dropCoins = 5;
        this.dropScore = 150;
    }

    update(dt, player, tileMap, entities, audio, particles) {
        // Update ice stomp wave projectiles
        this._updateWaves(dt, player, audio, particles);

        if (this.state === 'dead') {
            super.update(dt, player, tileMap, entities, audio, particles);
            return;
        }

        // Freeze player briefly on touch
        if (this.overlaps(player) && player.alive && player.invincibleTimer <= 0) {
            player.takeDamage(this.damage, audio, particles);
            // Apply freeze (reduce player speed)
            player.activePowerUp = POWERUP_TYPE.ICE; // abuse ICE type to freeze player
            player.powerUpTimer = 1.5; // 1.5s freeze
        }

        if (this.isStomping) {
            this.vx = 0;
            this.stompWarmup += dt;
            if (this.stompWarmup >= 0.6) {
                // Slam!
                this.isStomping = false;
                this.stompWarmup = 0;
                this._releaseIceStomp(audio, particles);
            }
            // Skip normal patrol movement during stomp
            this.y += this.vy * dt;
            Physics.resolveEntityVsTilemap(this, tileMap, dt);
            return;
        }

        super.update(dt, player, tileMap, entities, audio, particles);

        // Stomp countdown when chasing
        if (this.state === 'chase' && this.onGround) {
            this.stompTimer += dt;
            if (this.stompTimer >= this.stompInterval) {
                this.stompTimer = 0;
                this.isStomping = true;
                this.stompWarmup = 0;
            }
        }
    }

    _releaseIceStomp(audio, particles) {
        audio.playSound(SFX.LAND);
        if (window.game && window.game.camera) {
            window.game.camera.shake(6, 0.2);
        }

        // Spawn two ground ice wave spikes moving left and right
        this.waves.push({
            x: this.x - 20,
            y: this.y + this.height - 24,
            width: 24,
            height: 24,
            vx: -200,
            life: 1.2
        });

        this.waves.push({
            x: this.x + this.width,
            y: this.y + this.height - 24,
            width: 24,
            height: 24,
            vx: 200,
            life: 1.2
        });

        // Stomp particles
        particles.emitBurst('snow', this.getCenterX(), this.y + this.height, 8);
    }

    _updateWaves(dt, player, audio, particles) {
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const w = this.waves[i];
            w.x += w.vx * dt;
            w.life -= dt;

            // Collision checks
            const wBox = { x: w.x, y: w.y, w: w.width, h: w.height };
            if (Physics.overlap(wBox, player.getBounds()) && player.alive) {
                player.takeDamage(this.damage, audio, particles);
                w.life = 0; // kill wave
            }

            if (w.life <= 0) {
                this.waves.splice(i, 1);
            }
        }
    }

    render(ctx, camera) {
        // Draw ice waves first
        ctx.save();
        ctx.fillStyle = '#80DEEA';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        for (const w of this.waves) {
            ctx.beginPath();
            ctx.moveTo(w.x, w.y + w.height);
            ctx.lineTo(w.x + w.width / 2, w.y);
            ctx.lineTo(w.x + w.width, w.y + w.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
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

        // Stomp arm raise animation
        let leftArmAngle = 15;
        let rightArmAngle = -15;

        if (this.isStomping) {
            // Raise both arms during warmup
            leftArmAngle = -130;
            rightArmAngle = 130;
        }

        // Draw Jagged Ice Golem Body
        ctx.fillStyle = '#B2EBF2'; // Pale Blue Ice
        ctx.strokeStyle = '#00ACC1';
        ctx.lineWidth = 2.5;

        // Head
        ctx.beginPath();
        ctx.moveTo(-10, -22); ctx.lineTo(10, -22); ctx.lineTo(12, -10); ctx.lineTo(-12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Golem Body Core
        ctx.fillStyle = '#80DEEA';
        ctx.beginPath();
        ctx.moveTo(-18, -10);
        ctx.lineTo(18, -10);
        ctx.lineTo(14, 20);
        ctx.lineTo(-14, 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Blue Eyes
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.arc(-4, -16, 2, 0, Math.PI * 2);
        ctx.arc(4, -16, 2, 0, Math.PI * 2);
        ctx.fill();

        // Arms (Jointed jagged segments)
        ctx.fillStyle = '#B2EBF2';
        // Left Arm
        ctx.save();
        ctx.translate(-16, -6);
        ctx.rotate(degToRad(leftArmAngle));
        ctx.fillRect(-6, 0, 8, 18);
        ctx.strokeRect(-6, 0, 8, 18);
        ctx.restore();

        // Right Arm
        ctx.save();
        ctx.translate(16, -6);
        ctx.rotate(degToRad(rightArmAngle));
        ctx.fillRect(-2, 0, 8, 18);
        ctx.strokeRect(-2, 0, 8, 18);
        ctx.restore();

        ctx.restore();

        // Health bar
        this._drawHealthBar(ctx, camera);
    }
};
