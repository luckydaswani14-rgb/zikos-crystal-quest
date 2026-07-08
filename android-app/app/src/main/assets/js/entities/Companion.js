/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Robotic Companion Bolt
 * ============================================================
 * Implements Ziko's robotic companion Bolt. Hovering mechanics, 
 * automated heals, shield protection, laser projectiles, and 
 * animations during the final boss fight.
 */

'use strict';

window.Companion = class Companion extends window.Entity {
    constructor(x, y) {
        super(x, y, 32, 32);
        this.active = false;
        
        // Target bindings
        this.player = null;
        this.boss = null;

        // Hover offset state (floating movement)
        this.hoverTimer = 0;
        this.hoverOffset = 0;

        // Abilities Cooldowns (in seconds)
        this.shieldCooldown = 8.0;
        this.shieldTimer = 0;
        this.shieldActive = false;

        this.healCooldown = 15.0;
        this.cannonCooldown = 3.0;

        // State Machine
        this.state = 'idle'; // idle, shield, heal, attack, celebrate
        this.stateTimer = 0;
    }

    activate(player, boss, audio) {
        this.active = true;
        this.player = player;
        this.boss = boss;
        this.x = player.x - 60;
        this.y = player.y - 40;
        this.state = 'idle';
        this.stateTimer = 0;

        // Play intro pop sound
        audio.playSound(SFX.CHECKPOINT);
    }

    update(dt, player, boss, audio, particles) {
        if (!this.active) return;
        
        this.stateTimer += dt;
        this.hoverTimer += dt * 4;
        this.hoverOffset = Math.sin(this.hoverTimer) * 5;

        // Keep local references updated
        this.player = player;
        this.boss = boss;

        // Follow player smoothly (lerp to hover position behind player)
        const targetX = player.x - (player.facing * 48);
        const targetY = player.y - 32 + this.hoverOffset;

        this.x = lerp(this.x, targetX, 5 * dt);
        this.y = lerp(this.y, targetY, 5 * dt);

        // Face the same direction as player
        this.facing = player.facing;

        // --- Ability Cooldown Ticks ---
        if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
        if (this.healCooldown > 0) this.healCooldown -= dt;
        if (this.cannonCooldown > 0) this.cannonCooldown -= dt;

        // Handle Active Shield Duration
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            // Shield makes player invincible
            player.invincible = true;
            player.invincibleTimer = 0.1; // Keep topping it off
            
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.state = 'idle';
            }
        }

        // --- Automated AI Helper Mechanics ---

        // 1. Healing Pulse: trigger if player health is critically low (< 3 points)
        if (player.health < 3 && this.healCooldown <= 0 && player.alive) {
            this._performHeal(player, audio, particles);
        }

        // 2. Energy Shield: trigger if boss is performing a dangerous laser/meteor attack
        if (boss && boss.alive && boss.currentAttack && !this.shieldActive && this.shieldCooldown <= 0 && player.alive) {
            if (['laserBeam', 'multiLaser', 'meteorRain', 'shadowExplosion'].includes(boss.currentAttack)) {
                this._performShield(player, audio, particles);
            }
        }

        // 3. Laser Cannon: attack boss weakpoint automatically every 3 seconds
        if (boss && boss.alive && this.cannonCooldown <= 0 && !this.shieldActive && player.alive) {
            this._performAttack(boss, audio, particles);
        }

        // Celebrate if boss is dead
        if (boss && !boss.alive && player.alive && this.state !== 'celebrate') {
            this.state = 'celebrate';
        }
    }

    _performHeal(player, audio, particles) {
        this.state = 'heal';
        this.stateTimer = 0;
        this.healCooldown = 15.0; // 15s cooldown

        player.heal(2); // Heal 1 heart

        audio.playSound(SFX.BOLT_HEAL);
        
        // Spawn green cross particles floating up from player
        particles.emitBurst('heart', player.getCenterX(), player.getCenterY(), 6, {
            color: '#66BB6A'
        });
        
        // Display notification
        if (window.game) {
            window.game.hud.showMessage("BOLT: HEAL ACTIVE!", 1.5, '#66BB6A');
        }

        setTimeout(() => { if (this.state === 'heal') this.state = 'idle'; }, 1000);
    }

    _performShield(player, audio, particles) {
        this.state = 'shield';
        this.stateTimer = 0;
        this.shieldActive = true;
        this.shieldTimer = 3.0; // 3 seconds duration
        this.shieldCooldown = 10.0; // 10s cooldown

        audio.playSound(SFX.BOLT_SHIELD);

        // Shield flash particle burst
        particles.emitBurst('portal', player.getCenterX(), player.getCenterY(), 10, {
            color: 'rgba(0, 176, 255, 0.6)'
        });

        if (window.game) {
            window.game.hud.showMessage("BOLT: SHIELD ONLINE!", 1.5, '#00B0FF');
        }
    }

    _performAttack(boss, audio, particles) {
        this.state = 'attack';
        this.stateTimer = 0;
        this.cannonCooldown = 4.0; // 4 seconds between laser shots

        audio.playSound(SFX.BOLT_CANNON);

        // Projectile targeting boss weakpoint (crystal in chest)
        // Draw laser flash particle
        particles.emitBurst('spark', this.getCenterX(), this.getCenterY(), 4, { color: '#00E5FF' });

        // Let's create a custom flying laser particle that flies to the boss weak point
        const targetX = boss.getCenterX();
        const targetY = boss.y + 60; // Approximate crystal height

        // We can emit a high velocity spark projectile that damages the boss when it lands
        if (window.game && window.game.particles) {
            // Spawn a visual projectile (spark with gravity=0 and custom speed)
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const speed = 600;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            window.game.particles.emit('spark', this.getCenterX(), this.getCenterY(), {
                vx: vx,
                vy: vy,
                life: 0.8,
                maxLife: 0.8,
                color: '#00E5FF',
                size: 8,
                gravity: 0
            });

            // Apply damage after short travel time delay
            setTimeout(() => {
                if (boss.alive) {
                    boss.takeDamage(3, vx * 0.1, -50, audio, particles);
                }
            }, 350);
        }

        setTimeout(() => { if (this.state === 'attack') this.state = 'idle'; }, 600);
    }

    triggerSpecialAbility(player, audio, particles) {
        // Explicit user key trigger if they want a manual shield blast
        if (this.shieldCooldown <= 0) {
            this._performShield(player, audio, particles);
        } else {
            if (window.game) {
                window.game.hud.showMessage("BOLT SHIELD COOLDOWN!", 1.0, '#EF5350');
            }
        }
    }

    render(ctx, camera) {
        if (!this.active) return;

        const bx = this.x + this.width / 2;
        const by = this.y + this.height / 2;

        ctx.save();

        // 1. Draw glowing aura ring
        const pulse = Math.abs(Math.sin(this.hoverTimer)) * 3;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, 22 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Draw thruster flame particle at bottom
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.moveTo(bx - 4, by + 12);
        ctx.lineTo(bx, by + 20 + pulse * 2);
        ctx.lineTo(bx + 4, by + 12);
        ctx.closePath();
        ctx.fill();

        // 3. Draw Bolt Main Body (Gradient Blue Sphere)
        const robotGrad = ctx.createRadialGradient(bx - 3, by - 3, 2, bx, by, 12);
        robotGrad.addColorStop(0, '#80DEEA');
        robotGrad.addColorStop(0.7, '#00ACC1');
        robotGrad.addColorStop(1, '#006064');

        ctx.fillStyle = robotGrad;
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Draw Glowing Eyes (Yellow Ovals)
        ctx.fillStyle = '#FFEE58';
        ctx.beginPath();
        if (this.state === 'celebrate') {
            // Happy squinting lines
            ctx.strokeStyle = '#FFEE58';
            ctx.lineWidth = 2;
            ctx.moveTo(bx - 6, by - 2); ctx.lineTo(bx - 2, by - 4); ctx.lineTo(bx - 6, by - 6);
            ctx.moveTo(bx + 2, by - 4); ctx.lineTo(bx + 6, by - 2); ctx.lineTo(bx + 2, by - 6);
            ctx.stroke();
        } else {
            // Normal ovals
            ctx.ellipse(bx - 4, by - 2, 2.5, 4, 0, 0, Math.PI * 2);
            ctx.ellipse(bx + 4, by - 2, 2.5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Antenna with blinking orb
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by - 12);
        ctx.lineTo(bx, by - 20);
        ctx.stroke();

        // Orb (blinks between cyan and white)
        const orbBlink = Math.floor(this.hoverTimer * 2) % 2 === 0;
        ctx.fillStyle = orbBlink ? '#E0F7FA' : '#00E5FF';
        ctx.beginPath();
        ctx.arc(bx, by - 20, 3, 0, Math.PI * 2);
        ctx.fill();

        // 6. Draw energy cores / decals
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.arc(bx, by + 5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 7. Draw Shield Dome around player (if active)
        if (this.shieldActive && this.player) {
            const pCenterX = this.player.getCenterX();
            const pCenterY = this.player.getCenterY();

            ctx.restore(); // Exit camera coordinates context
            camera.apply(ctx); // Re-enter camera space for clean layer overlay

            ctx.strokeStyle = 'rgba(0, 176, 255, 0.5)';
            ctx.fillStyle = 'rgba(0, 176, 255, 0.08)';
            ctx.lineWidth = 3 + Math.sin(this.hoverTimer * 3) * 1.5;

            ctx.beginPath();
            ctx.arc(pCenterX, pCenterY, Math.max(this.player.width, this.player.height) + 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }
};
