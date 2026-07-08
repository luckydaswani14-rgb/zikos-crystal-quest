/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Final Boss Shadow King
 * ============================================================
 * The ultimate villain. Implements three battle phases, 
 * multiple attack styles, vulnerable chest crystal weakpoint, 
 * rage mode scaling, and a dramatic visual death explosion sequence.
 */

'use strict';

window.ShadowKing = class ShadowKing extends window.Boss {
    constructor(x, y) {
        super(x, y, 120, 160);
        this.maxHealth = 60; // 3 phases, 20 health each
        this.health = this.maxHealth;
        this.damage = 2;
        this.bossName = 'Shadow King';

        // Attack lists
        this.attacks = {
            1: ['laserBeam', 'shadowSlam', 'summonMinions'],
            2: ['fireWave', 'dashAttack', 'laserSweep', 'summonMinions'],
            3: ['multiLaser', 'meteorRain', 'shadowExplosion', 'dashAttack']
        };

        // Weakpoint: crystal in chest (coordinates relative to top-left of boss)
        this.weakPoints = [{ x: 45, y: 55, w: 30, h: 30 }];

        // Combat timers
        this.attackCooldown = 3.0;
        this.attackDuration = 0;
        this.attackState = 'none'; // none, windup, active, recovery

        // Projectiles container (fire waves, meteors, etc.)
        this.projectiles = [];
        this.lasers = []; // Sweeping lines
        
        // Spawn positions for minions
        this.minionSpawners = [
            { x: x - 250, y: y + 80 },
            { x: x + 250, y: y + 80 }
        ];

        // Draw setup
        this.glowTimer = 0;
        this.deathTimer = 0;
    }

    update(dt, player, tileMap, entities, audio, particles, companion) {
        // Update boss custom projectiles
        this._updateProjectiles(dt, player, tileMap, audio, particles);

        if (this.state === 'dead') {
            this.vx = 0;
            this.vy = 0;
            this.deathTimer += dt;
            
            // Continuous explosion sound & sparkles
            if (Math.floor(this.deathTimer * 8) % 2 === 0) {
                audio.playSound(SFX.ENEMY_DIE);
                particles.emitBurst('explosion', this.x + Math.random() * this.width, this.y + Math.random() * this.height, 4);
            }

            if (this.deathTimer >= 3.0) {
                this.alive = false;
                // Burst end crystal sparkles
                particles.emitBurst('shadowDissolve', this.getCenterX(), this.getCenterY(), 40);
                particles.emitBurst('star', this.getCenterX(), this.getCenterY(), 30);
                // Complete game victory trigger!
                if (window.game) {
                    window.game.victory();
                }
            }
            return;
        }

        // Standard Boss intro/phase handler
        super.update(dt, player, tileMap, entities, audio, particles, companion);
        
        this.glowTimer += dt * 4;

        if (this.intro) return; // Freeze during entrance cutscene

        // Tick attack state logic
        this._handleAttacks(dt, player, audio, particles);

        // Movement bounds check (keep boss centered in boss arena room)
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        Physics.resolveEntityVsTilemap(this, tileMap, dt);
    }

    _handleAttacks(dt, player, audio, particles) {
        if (this.currentAttack) {
            this.attackDuration -= dt;
            if (this.attackDuration <= 0) {
                // End attack
                this._endAttack(particles);
            } else {
                // Tick current attack behavior
                this._tickAttack(dt, player, audio, particles);
            }
            return;
        }

        // Select next attack from current phase pool
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) {
            this.attackCooldown = this.phase === 3 ? 1.5 : 2.5; // faster attacks in phase 3
            
            const pool = this.attacks[this.phase] || this.attacks[1];
            const next = pool[rndInt(0, pool.length - 1)];
            this._startAttack(next, player, audio, particles);
        }
    }

    _startAttack(attackName, player, audio, particles) {
        this.currentAttack = attackName;
        this.attackState = 'windup';
        this.isVulnerable = false; // Invincible while charging attack

        // Setup custom timing based on attack style
        switch (attackName) {
            case 'laserBeam':
                this.attackDuration = 2.5; // 0.8s charge, 1.2s active, 0.5s recovery
                break;
            case 'multiLaser':
                this.attackDuration = 3.0;
                break;
            case 'shadowSlam':
                this.attackDuration = 2.0;
                this.vy = -550; // Jump up high!
                this.vx = (player.getCenterX() - this.getCenterX()) > 0 ? 120 : -120;
                audio.playSound(SFX.JUMP);
                break;
            case 'summonMinions':
                this.attackDuration = 1.8;
                break;
            case 'fireWave':
                this.attackDuration = 1.5;
                break;
            case 'dashAttack':
                this.attackDuration = 1.4;
                this.vx = player.getCenterX() > this.getCenterX() ? 500 : -500;
                this.facing = this.vx > 0 ? 1 : -1;
                audio.playSound(SFX.ATTACK);
                break;
            case 'meteorRain':
                this.attackDuration = 3.0;
                break;
            case 'shadowExplosion':
                this.attackDuration = 2.8;
                break;
            default:
                this.attackDuration = 2.0;
        }
    }

    _tickAttack(dt, player, audio, particles) {
        const timePassed = this.attackDuration;
        
        // Split behavior based on windup vs active
        if (this.currentAttack === 'laserBeam') {
            if (timePassed < 1.7 && timePassed > 0.5) {
                this.attackState = 'active';
                // Fire sweeping laser
                if (this.lasers.length === 0) {
                    audio.playSound(SFX.BOLT_CANNON);
                    this.lasers.push({
                        y: this.y + 60,
                        vx: this.facing * 180,
                        life: 1.2
                    });
                }
            } else if (timePassed <= 0.5) {
                this.attackState = 'recovery';
            }
        }

        else if (this.currentAttack === 'multiLaser') {
            if (timePassed < 2.0 && timePassed > 0.5) {
                this.attackState = 'active';
                if (this.lasers.length === 0) {
                    audio.playSound(SFX.BOLT_CANNON);
                    // Spawn 3 horizontal laser heights
                    this.lasers.push({ y: this.y + 40, vx: 0, life: 1.5, fullWidth: true });
                    this.lasers.push({ y: this.y + 90, vx: 0, life: 1.5, fullWidth: true });
                    this.lasers.push({ y: this.y + 140, vx: 0, life: 1.5, fullWidth: true });
                }
            }
        }

        else if (this.currentAttack === 'shadowSlam') {
            if (this.vy >= 0 && this.onGround && this.attackState === 'windup') {
                this.attackState = 'active';
                this.vx = 0;
                audio.playSound(SFX.LAND);
                if (window.game && window.game.camera) {
                    window.game.camera.shake(14, 0.35);
                }
                
                // Release ground waves
                this.projectiles.push({ x: this.x - 30, y: this.y + this.height - 16, w: 24, h: 16, vx: -300, type: 'wave', life: 1.0 });
                this.projectiles.push({ x: this.x + this.width, y: this.y + this.height - 16, w: 24, h: 16, vx: 300, type: 'wave', life: 1.0 });
                particles.emitBurst('smoke', this.getCenterX(), this.y + this.height - 8, 12);
            }
        }

        else if (this.currentAttack === 'fireWave') {
            if (this.attackState === 'windup' && timePassed < 1.0) {
                this.attackState = 'active';
                audio.playSound(SFX.ATTACK);
                // Rolling fire waves along floor
                this.projectiles.push({ x: this.x - 20, y: this.y + this.height - 24, w: 24, h: 24, vx: -200, type: 'fire', life: 2.0 });
                this.projectiles.push({ x: this.x + this.width, y: this.y + this.height - 24, w: 24, h: 24, vx: 200, type: 'fire', life: 2.0 });
            }
        }

        else if (this.currentAttack === 'summonMinions') {
            if (this.attackState === 'windup' && timePassed < 1.0) {
                this.attackState = 'active';
                audio.playSound(SFX.POWERUP);
                // Spawn Slime ground minions
                for (const spawner of this.minionSpawners) {
                    const slime = new window.Slime(spawner.x, spawner.y);
                    if (window.game && window.game.level) {
                        window.game.level.enemies.push(slime);
                    }
                    particles.emitBurst('portal', spawner.x, spawner.y, 6, { color: '#AB47BC' });
                }
            }
        }

        else if (this.currentAttack === 'meteorRain') {
            if (timePassed < 2.5 && Math.random() < 0.08) {
                // Spawn falling fireballs from top of camera viewport
                const spawnX = player.x + (Math.random() * 400 - 200);
                this.projectiles.push({
                    x: spawnX,
                    y: player.y - 400,
                    w: 16,
                    h: 16,
                    vx: Math.random() * 80 - 40,
                    vy: 320,
                    type: 'fire',
                    life: 2.0
                });
                particles.emitBurst('fire', spawnX, player.y - 400, 2);
            }
        }

        else if (this.currentAttack === 'shadowExplosion') {
            this.attackState = 'active';
            if (timePassed < 1.8 && Math.floor(timePassed * 12) % 2 === 0) {
                // Expanding dark storm particles around room
                particles.emit('shadowDissolve', this.getCenterX() + (Math.random()*400-200), this.getCenterY() + (Math.random()*300-150));
            }
            if (timePassed <= 0.6 && timePassed > 0.5) {
                // Trigger screen flash boom damage
                audio.playSound(SFX.EXPLOSION);
                if (window.game && window.game.camera) {
                    window.game.camera.shake(20, 0.4);
                }
                // Damage player if they are standing on the floor (safe spot is jumping or hanging)
                if (player.onGround && player.alive) {
                    player.takeDamage(2, audio, particles);
                }
            }
        }
    }

    _endAttack(particles) {
        this.currentAttack = null;
        this.attackState = 'none';
        this.isVulnerable = true; // Exposed weak point chest crystal!
        
        // Emit shimmer sparkles around chest crystal to show it's exposed
        particles.emitBurst('crystalShimmer', this.x + 60, this.y + 70, 8);
    }

    _updateProjectiles(dt, player, tileMap, audio, particles) {
        // Update visual sweep lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.life -= dt;
            
            if (l.fullWidth) {
                // Horizontal full beam damage box
                const beamBox = { x: 0, y: l.y - 4, w: tileMap.getWorldWidth(), h: 8 };
                if (Physics.overlap(beamBox, player.getBounds()) && player.alive) {
                    player.takeDamage(1, audio, particles);
                }
            } else {
                // Moving sweeping laser bullet
                l.x = (l.x === undefined) ? this.getCenterX() : l.x + l.vx * dt;
                const laserBox = { x: l.x - 20, y: l.y - 4, w: 40, h: 8 };
                if (Physics.overlap(laserBox, player.getBounds()) && player.alive) {
                    player.takeDamage(1, audio, particles);
                }
            }

            if (l.life <= 0) {
                this.lasers.splice(i, 1);
            }
        }

        // Update ground fire waves / meteors
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            let collides = false;

            const pBox = { x: p.x, y: p.y, w: p.w, h: p.h };
            if (Physics.overlap(pBox, player.getBounds()) && player.alive) {
                player.takeDamage(this.damage, audio, particles);
                collides = true;
            }

            // check floor
            if (p.type === 'fire') {
                const tx = Math.floor(p.x / TILE_SIZE);
                const ty = Math.floor((p.y + p.h) / TILE_SIZE);
                if (tileMap.isSolid(tx, ty) && p.vy > 0) {
                    p.vy = 0; // stop falling
                }
            }

            if (collides || p.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    takeDamage(amount, knockbackX, knockbackY, audio, particles) {
        if (!this.isVulnerable || this.state === 'dead' || this.intro) {
            // Clonk immune sound
            audio.playSound(SFX.LAND);
            return false;
        }

        // Weakpoint crystal took damage!
        const success = super.takeDamage(amount, knockbackX, knockbackY, audio, particles);
        if (success && this.health > 0) {
            // Retaliate immediately
            this.attackCooldown = 0.4; // fast counter strike
        }
        return success;
    }

    render(ctx, camera) {
        // Draw lasers
        ctx.save();
        ctx.strokeStyle = '#FF1744'; // Bright laser red
        for (const l of this.lasers) {
            ctx.shadowColor = '#FF1744';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 6 + Math.sin(this.glowTimer * 2) * 2;
            
            ctx.beginPath();
            if (l.fullWidth) {
                ctx.moveTo(0, l.y);
                ctx.lineTo(camera.viewportWidth + camera.x, l.y);
            } else {
                ctx.moveTo(l.x - 20, l.y);
                ctx.lineTo(l.x + 20, l.y);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Draw projectiles
        ctx.save();
        for (const p of this.projectiles) {
            ctx.fillStyle = p.type === 'fire' ? '#FF5722' : '#8E24AA'; // Red fire vs purple shadow bolting
            ctx.beginPath();
            ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (!this.visible) return;

        // Render boss health bar overlays
        super.render(ctx, camera);

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();

        // Apply damage shakiness
        let shakeX = 0;
        if (this.hurtTimer > 0) {
            shakeX = Math.sin(this.stateTimer * 40) * 4;
        }

        ctx.translate(cx + shakeX, cy);
        ctx.scale(this.facing, 1);

        // Enraged phase 3 visual modifications (red aura glows)
        if (this.phase === 3) {
            ctx.shadowColor = '#FF1744';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = '#AB47BC';
            ctx.shadowBlur = 10;
        }

        // --- DRAW Menacing Shadow King Robed Body ---
        ctx.fillStyle = '#1A002C'; // Dark purple robe
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;

        // Hovering tendrils float below body (oscillating waves)
        const wave = Math.sin(this.glowTimer) * 4;
        ctx.beginPath();
        ctx.moveTo(-45, 60);
        ctx.quadraticCurveTo(-20, 80 + wave, 0, 70);
        ctx.quadraticCurveTo(20, 80 + wave, 45, 60);
        ctx.lineTo(40, -10);
        ctx.lineTo(-40, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shoulder Pads / Cape collar
        ctx.fillStyle = '#0D001A';
        ctx.beginPath();
        ctx.moveTo(-54, -14);
        ctx.lineTo(0, -32);
        ctx.lineTo(54, -14);
        ctx.lineTo(45, 10);
        ctx.lineTo(-45, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Menacing Dark Crown
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.moveTo(-24, -48);
        ctx.lineTo(-30, -68); // Left peak
        ctx.lineTo(-12, -56);
        ctx.lineTo(0, -78);  // Center high peak
        ctx.lineTo(12, -56);
        ctx.lineTo(30, -68);  // Right peak
        ctx.lineTo(24, -48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Crown red jewel
        ctx.fillStyle = '#FF1744';
        ctx.beginPath(); ctx.arc(0, -66, 3, 0, Math.PI*2); ctx.fill();

        // Menacing Hood / Face (Pale Gray skull shape)
        ctx.fillStyle = '#ECEFF1';
        ctx.beginPath();
        ctx.arc(0, -36, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing red eyes
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.ellipse(-6, -38, 4, 2, degToRad(-15), 0, Math.PI * 2);
        ctx.ellipse(6, -38, 4, 2, degToRad(15), 0, Math.PI * 2);
        ctx.fill();

        // --- CHEST CRYSTAL WEAKPOINT ---
        // Crystal is vulnerable if boss is vulnerable (showing glow)
        const crystalPulse = 1.0 + Math.sin(this.glowTimer * 2) * 0.15;
        
        if (this.isVulnerable) {
            ctx.fillStyle = '#00E5FF'; // Glowing Cyan vulnerable crystal
            ctx.shadowColor = '#00E5FF';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#311B92'; // Dark inactive purple crystal
            ctx.shadowBlur = 0;
        }

        // Draw diamond faceted weak point shape in chest center
        ctx.save();
        ctx.translate(0, 15);
        ctx.scale(crystalPulse, crystalPulse);
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 18);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }
};
