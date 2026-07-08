/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Ziko Player Controller
 * ============================================================
 * Manages player states, animations, input bindings, custom physics,
 * power-ups, combat stance, and procedural canvas rendering.
 */

'use strict';

window.Player = class Player extends window.Entity {
    constructor(x, y) {
        super(x, y, PLAYER.WIDTH, PLAYER.HEIGHT);

        // Core stats
        this.maxHealth = PLAYER.MAX_HEALTH;
        this.health = this.maxHealth;
        this.lives = 5; // Default overridden by engine difficulty
        this.coins = 0;
        this.gems = 0;
        this.score = 0;
        this.stars = 0;

        // State Machine
        this.state = 'idle'; // idle, walk, run, sprint, jump, fall, doubleJump, wallJump, slide, climb, attack, hurt, dead, celebrate
        this.prevState = 'idle';
        this.stateTime = 0;
        this.animTime = 0;

        // Physics State flags
        this.onGround = false;
        this.onWall = false;
        this.wallDirection = 0;
        this.inWater = false;
        this.inLava = false;
        this.onIce = false;
        this.onLadder = false;
        this.onVine = false;

        // Special jump parameters
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        this.canDoubleJump = true;
        this.isWallSliding = false;

        // Climbing state
        this.isClimbing = false;

        // Active Powerups
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.powerUpMaxDuration = 0;
        this.hasShield = false;
        this.magnetActive = false;
        this.doubleCoinsActive = false;
        this.fireAttack = false;
        this.iceAttack = false;
        this.invincible = false;
        this.invincibleTimer = 0;

        // Combat details
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.stomping = false;

        // Audio and Particle references passed in updates
        this.damageFlash = 0;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.health = this.maxHealth;
        this.state = 'idle';
        this.stateTime = 0;
        this.animTime = 0;
        this.isClimbing = false;
        this.alive = true;
        
        // Remove powerups on reset
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.hasShield = false;
        this.magnetActive = false;
        this.doubleCoinsActive = false;
        this.fireAttack = false;
        this.iceAttack = false;
        this.invincible = false;
        this.invincibleTimer = 0;
    }

    update(dt, input, tileMap, entities, audio, particles) {
        this.stateTime += dt;
        this.animTime += dt;

        // Handle invincible flashing
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
        if (this.damageFlash > 0) {
            this.damageFlash -= dt;
        }

        // Update power-up timers
        this._updatePowerups(dt);

        // Update combat timers
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        // Handle Dead State
        if (this.state === 'dead') {
            this.vx = 0;
            this.vy += WORLD_GRAVITY * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            // Settle on floor
            const collisionState = Physics.resolveEntityVsTilemap(this, tileMap, dt);
            if (collisionState.onGround) this.vy = 0;
            return;
        }

        // --- Handle Input / Movement ---
        
        // Climbing toggle check
        if ((this.onLadder || this.onVine) && !this.isClimbing) {
            if (input.isDown('up') || input.isDown('down')) {
                this.isClimbing = true;
                this.vx = 0;
                this.vy = 0;
                this.state = 'climb';
            }
        }

        let moveSpeed = PLAYER.WALK_SPEED;
        if (input.isDown('sprint')) {
            moveSpeed = PLAYER.RUN_SPEED;
        }
        if (this.activePowerUp === POWERUP_TYPE.SPEED) {
            moveSpeed = PLAYER.SPRINT_SPEED;
        }

        if (this.isClimbing) {
            this.vx = 0;
            if (input.isDown('up')) {
                this.vy = -150;
            } else if (input.isDown('down')) {
                this.vy = 150;
            } else {
                this.vy = 0;
            }

            // Move coordinates on ladder manually
            this.y += this.vy * dt;
            
            // Check if climbed off ladder
            const onLadderNow = Physics.resolveEntityVsTilemap(this, tileMap, dt);
            if (!onLadderNow.onLadder && !onLadderNow.onVine) {
                this.isClimbing = false;
            }

            if (input.isJustPressed('jump')) {
                this.isClimbing = false;
                this.vy = -PLAYER.JUMP_FORCE * 0.8;
                this.state = 'jump';
                audio.playSound(SFX.JUMP);
            }
        } else {
            // Normal Ground / Air movement
            let moveDirection = 0;
            if (input.isDown('left')) {
                moveDirection = -1;
                this.facing = -1;
            } else if (input.isDown('right')) {
                moveDirection = 1;
                this.facing = 1;
            }

            // Apply horizontal acceleration
            if (moveDirection !== 0) {
                const accel = this.onGround ? 1500 : 900;
                this.vx += moveDirection * accel * dt;
                this.vx = clamp(this.vx, -moveSpeed, moveSpeed);
            } else {
                // Decay velocity on no input (Friction handles this in Physics module, but we can nudge it)
                if (this.onGround) {
                    this.vx *= this.onIce ? ICE_FRICTION : NORMAL_FRICTION;
                } else {
                    this.vx *= AIR_FRICTION;
                }
                if (Math.abs(this.vx) < 5) this.vx = 0;
            }

            // Apply coyote time countdown
            if (this.onGround) {
                this.coyoteTime = PLAYER.COYOTE_TIME;
                this.canDoubleJump = true;
            } else {
                this.coyoteTime -= dt;
            }

            // Apply jump buffering countdown
            if (input.isJustPressed('jump')) {
                this.jumpBufferTime = PLAYER.JUMP_BUFFER;
            } else {
                this.jumpBufferTime -= dt;
            }

            // Jump Action
            if (this.jumpBufferTime > 0) {
                if (this.onGround || this.coyoteTime > 0) {
                    this.vy = -PLAYER.JUMP_FORCE;
                    this.onGround = false;
                    this.coyoteTime = 0;
                    this.jumpBufferTime = 0;
                    this.state = 'jump';
                    audio.playSound(SFX.JUMP);
                    particles.emitBurst('jumpDust', this.getCenterX(), this.y + this.height, 6);
                } else if (this.isWallSliding) {
                    // Wall Jump
                    this.vx = -this.wallDirection * PLAYER.WALL_JUMP_VX;
                    this.vy = -PLAYER.WALL_JUMP_VY;
                    this.facing = -this.wallDirection;
                    this.jumpBufferTime = 0;
                    this.state = 'wallJump';
                    audio.playSound(SFX.WALL_JUMP);
                    particles.emitBurst('dust', this.x + (this.wallDirection > 0 ? this.width : 0), this.y + this.height / 2, 4);
                } else if (this.canDoubleJump) {
                    // Double Jump
                    this.vy = -PLAYER.DOUBLE_JUMP;
                    this.canDoubleJump = false;
                    this.jumpBufferTime = 0;
                    this.state = 'doubleJump';
                    audio.playSound(SFX.DOUBLE_JUMP);
                    particles.emitBurst('portal', this.getCenterX(), this.y + this.height, 8, { color: '#AB47BC' });
                }
            }

            // Sliding Check
            if (input.isDown('down') && this.onGround && Math.abs(this.vx) > 100) {
                if (this.state !== 'slide') {
                    this.state = 'slide';
                    audio.playSound(SFX.SLIDE);
                }
                // Reduce height bounds while sliding
                this.height = PLAYER.HEIGHT * 0.6; // Squished
            } else {
                // Return to normal bounds if we were sliding
                if (this.height !== PLAYER.HEIGHT) {
                    this.height = PLAYER.HEIGHT;
                }
            }

            // Resolve movements using physics module
            const collisionState = Physics.resolveEntityVsTilemap(this, tileMap, dt);
            this.onGround = collisionState.onGround;
            this.onWall = collisionState.onWall;
            this.wallDirection = collisionState.wallDirection;
            this.inWater = collisionState.inWater;
            this.inLava = collisionState.inLava;
            this.onIce = collisionState.onIce;
            this.onLadder = collisionState.onLadder;
            this.onVine = collisionState.onVine;

            // Handle Wall Slide
            if (this.onWall && !this.onGround && this.vy > 0 && (input.isDown('left') || input.isDown('right'))) {
                this.isWallSliding = true;
                this.vy = WALL_SLIDE_SPEED; // Caps fall speed
                particles.emit('dust', this.x + (this.wallDirection > 0 ? this.width : 0), this.y + this.height - 4);
            } else {
                this.isWallSliding = false;
            }

            // Determine appropriate state for animator
            this._determineState();
        }

        // --- Handle Attack ---
        if (input.isJustPressed('attack') && this.attackCooldown <= 0) {
            this._executeAttack(audio, particles, entities);
        }

        // --- Handle Special Companion helper ---
        if (input.isJustPressed('special')) {
            // E.g. trigger companion shield or blast if available
            if (window.game && window.game.level && window.game.level.companion) {
                window.game.level.companion.triggerSpecialAbility(this, audio, particles);
            }
        }

        // --- Lava/Hazard damage ---
        if (this.inLava) {
            this.takeDamage(2, audio, particles);
        }
    }

    _determineState() {
        if (this.isAttacking) {
            this.state = 'attack';
            return;
        }

        if (this.onGround) {
            if (this.height === PLAYER.HEIGHT * 0.6) {
                this.state = 'slide';
            } else if (Math.abs(this.vx) > 300) {
                this.state = 'sprint';
            } else if (Math.abs(this.vx) > 100) {
                this.state = 'run';
            } else if (Math.abs(this.vx) > 10) {
                this.state = 'walk';
            } else {
                this.state = 'idle';
            }
        } else {
            if (this.vy < 0) {
                if (!this.canDoubleJump) {
                    this.state = 'doubleJump';
                } else {
                    this.state = 'jump';
                }
            } else {
                this.state = 'fall';
            }
        }
    }

    _executeAttack(audio, particles, entities) {
        this.isAttacking = true;
        this.attackTimer = 0.25; // Duration of strike
        this.attackCooldown = 0.4;
        
        audio.playSound(SFX.ATTACK);

        // Perform attack reach check against enemies
        const attackBox = {
            x: this.facing === 1 ? this.x + this.width : this.x - PLAYER.ATTACK_RANGE,
            y: this.y + 4,
            w: PLAYER.ATTACK_RANGE,
            h: this.height - 8
        };

        // Emit swipe slash sparks
        const sparkX = this.facing === 1 ? this.x + this.width + 10 : this.x - 10;
        particles.emitBurst('spark', sparkX, this.getCenterY(), 4);

        for (const e of entities) {
            if (e.alive && e instanceof window.Enemy) {
                const enemyBox = e.getBounds();
                if (Physics.overlap(attackBox, enemyBox)) {
                    // Hit Enemy!
                    const kbDirection = this.facing;
                    e.takeDamage(PLAYER.ATTACK_DAMAGE, kbDirection * 200, -150, audio, particles);
                    this.score += 20;

                    // Increment Combo
                    this.comboCount++;
                    this.comboTimer = 2.0; // 2 seconds to chain next hit
                    if (this.comboCount >= 3) {
                        window.game.hud.showCombo(this.comboCount);
                    }
                }
            }
        }
    }

    _updatePowerups(dt) {
        if (this.activePowerUp) {
            this.powerUpTimer -= dt;
            if (this.powerUpTimer <= 0) {
                // Deactivate powerup
                this.activePowerUp = null;
                this.hasShield = false;
                this.magnetActive = false;
                this.doubleCoinsActive = false;
                this.fireAttack = false;
                this.iceAttack = false;
            }
        }
    }

    activatePowerUp(type, duration) {
        this.activePowerUp = type;
        this.powerUpTimer = duration;
        this.powerUpMaxDuration = duration;

        // Reset states
        this.hasShield = (type === POWERUP_TYPE.SHIELD);
        this.magnetActive = (type === POWERUP_TYPE.MAGNET);
        this.doubleCoinsActive = (type === POWERUP_TYPE.DOUBLE_COIN);
        this.fireAttack = (type === POWERUP_TYPE.FIRE);
        this.iceAttack = (type === POWERUP_TYPE.ICE);

        if (type === POWERUP_TYPE.INVINCIBLE) {
            this.invincible = true;
            this.invincibleTimer = duration;
        } else if (type === POWERUP_TYPE.EXTRA_LIFE) {
            this.lives++;
            this.activePowerUp = null; // Instant
        } else if (type === POWERUP_TYPE.HEAL) {
            this.heal(4); // Heals 2 full hearts
            this.activePowerUp = null; // Instant
        }
    }

    takeDamage(amount, audio, particles) {
        if (this.invincible || this.state === 'dead' || this.state === 'victory') return;

        if (this.hasShield) {
            // Shield blocks one full hit and expires
            this.hasShield = false;
            this.activePowerUp = null;
            this.invincible = true;
            this.invincibleTimer = 1.0; // 1s invin after shield pop
            audio.playSound(SFX.BOLT_SHIELD);
            particles.emitBurst('portal', this.getCenterX(), this.getCenterY(), 8, { color: '#00B0FF' });
            return;
        }

        this.health -= amount;
        this.invincible = true;
        this.invincibleTimer = PLAYER.INVINCIBLE_TIME;
        this.damageFlash = 0.25;

        // Screen Shake
        if (window.game && window.game.camera) {
            window.game.camera.shake(12, 0.3);
        }

        if (this.health <= 0) {
            this.die(audio, particles);
        } else {
            this.state = 'hurt';
            this.stateTime = 0;
            this.vy = -250; // Jump up slightly
            this.vx = -this.facing * 180; // Fly back
            audio.playSound(SFX.HURT);
            particles.emitBurst('damage', this.getCenterX(), this.y - 12, 1, { text: `-${amount}` });
        }
    }

    heal(amount) {
        this.health = clamp(this.health + amount, 0, this.maxHealth);
        if (window.game && window.game.particles) {
            window.game.particles.emitBurst('heart', this.getCenterX(), this.y, 6);
        }
    }

    die(audio, particles) {
        this.state = 'dead';
        this.stateTime = 0;
        this.health = 0;
        this.vy = -350; // Pop up sad death jump
        
        audio.playSound(SFX.DIE);
        particles.emitBurst('smoke', this.getCenterX(), this.getCenterY(), 10);

        setTimeout(() => {
            if (window.game) {
                window.game.handlePlayerDeath();
            }
        }, 1500);
    }

    addCoins(n, multiplier = 1) {
        this.coins += n * multiplier;
        this.score += n * 10 * multiplier;
        if (this.coins >= 100) {
            this.coins = 0;
            this.lives++;
        }
    }

    addGems(n) {
        this.gems += n;
    }

    addScore(n) {
        this.score += n;
    }

    /**
     * Complete procedural canvas draw. Draws adorable Ziko
     */
    render(ctx, camera) {
        if (!this.visible) return;

        // Flashing invincibility frames
        if (this.invincible && Math.floor(this.animTime * 12) % 2 === 0) {
            return;
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();

        // 1. Draw Ground Shadow beneath player (only when not super high in air)
        if (this.onGround) {
            ctx.fillStyle = COLORS.SHADOW;
            ctx.beginPath();
            ctx.ellipse(cx, this.y + this.height - 1, 14, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw active aura for special power-ups
        if (this.activePowerUp) {
            this._drawPowerUpAura(ctx, cx, cy);
        }

        // Face scaling direction
        ctx.translate(cx, cy);
        ctx.scale(this.facing, 1);

        // Squish adjustments based on actions
        let scaleY = 1.0;
        let scaleX = 1.0;
        let bodyOffset = 0;

        if (this.state === 'jump' || this.state === 'doubleJump') {
            // Stretch tall
            scaleY = 1.15;
            scaleX = 0.85;
        } else if (this.state === 'fall') {
            scaleY = 0.9;
            scaleX = 1.1;
        } else if (this.state === 'slide') {
            // Squashed wide
            scaleY = 0.6;
            scaleX = 1.4;
            bodyOffset = 8;
        }

        ctx.scale(scaleX, scaleY);
        ctx.translate(0, bodyOffset);

        // --- DRAW ZIKO'S RAGDOLL COMPONENTS ---

        // Local draw coords (Ziko is centered around 0,0 locally)
        // Dimensions: width=36, height=52

        // A. Shoes (Blue ovals)
        ctx.fillStyle = COLORS.ZIKO_SHOES;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        let leftLegSwing = 0;
        let rightLegSwing = 0;

        if (this.state === 'walk' || this.state === 'run' || this.state === 'sprint') {
            const swingSpeed = this.state === 'sprint' ? 16 : (this.state === 'run' ? 12 : 8);
            leftLegSwing = Math.sin(this.animTime * swingSpeed) * 8;
            rightLegSwing = -Math.sin(this.animTime * swingSpeed) * 8;
        }

        // Left shoe
        ctx.beginPath();
        ctx.ellipse(-8 + leftLegSwing, 22, 6, 4, degToRad(15), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right shoe
        ctx.beginPath();
        ctx.ellipse(6 + rightLegSwing, 22, 6, 4, degToRad(-15), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // B. Legs (Skin chubby rectangles)
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.fillRect(-10 + leftLegSwing, 12, 4, 8);
        ctx.strokeRect(-10 + leftLegSwing, 12, 4, 8);
        ctx.fillRect(4 + rightLegSwing, 12, 4, 8);
        ctx.strokeRect(4 + rightLegSwing, 12, 4, 8);

        // C. Shorts (Yellow rounded rect)
        ctx.fillStyle = COLORS.ZIKO_SHORTS;
        ctx.beginPath();
        ctx.roundRect(-12, 4, 24, 10, 3);
        ctx.fill();
        ctx.stroke();

        // D. Body T-Shirt (Red rounded rect)
        ctx.fillStyle = COLORS.ZIKO_SHIRT;
        ctx.beginPath();
        ctx.roundRect(-10, -8, 20, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Arms swing
        let leftArmSwing = 0;
        let rightArmSwing = 0;
        if (this.state === 'walk' || this.state === 'run' || this.state === 'sprint') {
            const swingSpeed = this.state === 'sprint' ? 16 : (this.state === 'run' ? 12 : 8);
            leftArmSwing = -Math.sin(this.animTime * swingSpeed) * 12;
            rightArmSwing = Math.sin(this.animTime * swingSpeed) * 12;
        }

        // Draw hands/arms
        ctx.fillStyle = COLORS.ZIKO_SHIRT;
        // Left arm
        ctx.save();
        ctx.translate(-10, -4);
        ctx.rotate(degToRad(-30 + leftArmSwing));
        ctx.fillRect(-3, 0, 4, 10);
        ctx.strokeRect(-3, 0, 4, 10);
        ctx.fillStyle = COLORS.ZIKO_SKIN; // skin hands
        ctx.beginPath(); ctx.arc(-1, 10, 3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();

        // Right arm
        ctx.fillStyle = COLORS.ZIKO_SHIRT;
        ctx.save();
        ctx.translate(10, -4);
        ctx.rotate(degToRad(30 + rightArmSwing));
        ctx.fillRect(-1, 0, 4, 10);
        ctx.strokeRect(-1, 0, 4, 10);
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.beginPath(); ctx.arc(1, 10, 3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();

        // E. Head (Large oval/circle above body)
        const headY = -18;
        ctx.fillStyle = COLORS.ZIKO_SKIN;
        ctx.beginPath();
        ctx.arc(0, headY, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rosy cheeks
        ctx.fillStyle = 'rgba(244, 143, 177, 0.6)';
        ctx.beginPath();
        ctx.arc(-6, headY + 3, 2.5, 0, Math.PI*2);
        ctx.arc(6, headY + 3, 2.5, 0, Math.PI*2);
        ctx.fill();

        // F. Hair (Black spiky cute style)
        ctx.fillStyle = COLORS.ZIKO_HAIR;
        ctx.beginPath();
        ctx.arc(0, headY - 3, 11, Math.PI, 0); // Top skull hair dome
        // Front cute spike bangs
        ctx.lineTo(11, headY);
        ctx.lineTo(8, headY - 4);
        ctx.lineTo(4, headY - 1);
        ctx.lineTo(0, headY - 5);
        ctx.lineTo(-4, headY - 1);
        ctx.lineTo(-8, headY - 4);
        ctx.lineTo(-11, headY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Spikes sticking out top
        ctx.beginPath();
        ctx.moveTo(-5, headY - 12);
        ctx.lineTo(-2, headY - 18);
        ctx.lineTo(2, headY - 12);
        ctx.lineTo(6, headY - 17);
        ctx.lineTo(8, headY - 10);
        ctx.fill();
        ctx.stroke();

        // G. Eyes (Large white circles with black pupils)
        ctx.fillStyle = COLORS.ZIKO_EYE;
        ctx.beginPath();
        ctx.arc(-4, headY - 1, 3, 0, Math.PI * 2);
        ctx.arc(4, headY - 1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils looking forward
        ctx.fillStyle = COLORS.ZIKO_PUPIL;
        ctx.beginPath();
        ctx.arc(-3, headY - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(5, headY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights (white dots)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-3.5, headY - 1.5, 0.6, 0, Math.PI * 2);
        ctx.arc(4.5, headY - 1.5, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (this.state === 'hurt' || this.state === 'dead') {
            // Sad/Hurt brows
            ctx.moveTo(-7, headY - 5); ctx.lineTo(-3, headY - 3);
            ctx.moveTo(3, headY - 3); ctx.lineTo(7, headY - 5);
        } else if (this.state === 'attack' || this.state === 'sprint') {
            // Determined brows angled down
            ctx.moveTo(-7, headY - 3); ctx.lineTo(-3, headY - 5);
            ctx.moveTo(3, headY - 5); ctx.lineTo(7, headY - 3);
        } else {
            // Happy arched brows
            ctx.moveTo(-7, headY - 4); ctx.quadraticCurveTo(-5, headY - 6, -2, headY - 4);
            ctx.moveTo(2, headY - 4); ctx.quadraticCurveTo(5, headY - 6, 7, headY - 4);
        }
        ctx.stroke();

        // H. Mouth
        ctx.beginPath();
        if (this.state === 'dead') {
            // Dead X mouth
            ctx.strokeStyle = '#000000';
            ctx.moveTo(-2, headY + 5); ctx.lineTo(2, headY + 5);
            ctx.stroke();
        } else if (this.state === 'hurt') {
            // Squiggly mouth
            ctx.strokeStyle = '#000000';
            ctx.moveTo(-3, headY + 5);
            ctx.lineTo(-1, headY + 4);
            ctx.lineTo(1, headY + 6);
            ctx.lineTo(3, headY + 5);
            ctx.stroke();
        } else {
            // Big cute smile
            ctx.fillStyle = '#FF8A80';
            ctx.arc(0, headY + 3, 3.5, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawPowerUpAura(ctx, cx, cy) {
        ctx.save();
        // Pulsing glow rings
        const ringPulse = Math.sin(this.animTime * 6) * 4;
        ctx.strokeStyle = this.activePowerUp === POWERUP_TYPE.INVINCIBLE ? 
            `hsl(${Math.floor(this.animTime * 180) % 360}, 100%, 70%)` : 
            (this.activePowerUp === POWERUP_TYPE.SHIELD ? '#00B0FF' : '#FFD54F');
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, this.width / 2 + 6 + ringPulse, this.height / 2 + 6 + ringPulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Tiny floating particles from player body
        if (Math.random() < 0.15 && window.game && window.game.particles) {
            window.game.particles.emit('portal', cx + (Math.random()*30-15), cy + (Math.random()*40-20), {
                color: ctx.strokeStyle
            });
        }
        ctx.restore();
    }
};
