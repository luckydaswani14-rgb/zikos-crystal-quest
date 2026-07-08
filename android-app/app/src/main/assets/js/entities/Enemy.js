'use strict';

window.Enemy = class Enemy extends Entity {
    constructor(x, y, width, height, config = {}) {
        super(x, y, width, height);

        // Health & Combat
        this.maxHealth    = config.health    || 3;
        this.health       = this.maxHealth;
        this.damage       = config.damage    || 1;

        // Movement
        this.speed        = 0;
        this.patrolSpeed  = config.patrolSpeed  || ENEMY.PATROL_SPEED;
        this.chaseSpeed   = config.chaseSpeed   || ENEMY.CHASE_SPEED;

        // State Machine
        this.state        = 'patrol';
        this.facing       = 1;
        this.stateTimer   = 0;
        this.hurtTimer    = 0;
        this.deathTimer   = 0;

        // Patrol Bounds
        const patrolRange  = config.patrolRange || 128;
        this.patrolLeft    = x - patrolRange;
        this.patrolRight   = x + patrolRange;

        // Detection
        this.detectRange  = config.detectRange  || ENEMY.DETECT_RANGE;
        this.attackRange  = config.attackRange  || ENEMY.ATTACK_RANGE;

        // Drops
        this.dropCoins    = config.dropCoins    || 1;
        this.dropScore    = config.dropScore    || 50;

        // Knockback
        this.knockbackVx  = 0;
        this.knockbackVy  = 0;

        // Boss flag (subclasses may override)
        this.isBoss       = false;

        // Internal animation helpers
        this._damagedFlash = 0;
        this._animTime     = 0;
    }

    // ─────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────
    update(dt, player, tileMap, entities, audio, particles) {
        this._animTime   += dt;
        this.stateTimer  += dt;
        this._damagedFlash = Math.max(0, this._damagedFlash - dt);

        // ── DEAD ──────────────────────────────────
        if (this.state === 'dead') {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            // Still fall during death animation
            this.vy += WORLD_GRAVITY * dt;
            this.vy  = clamp(this.vy, -MAX_FALL_SPEED, MAX_FALL_SPEED);
            this._applyTileCollision(dt, tileMap);
            return;
        }

        // ── HURT ──────────────────────────────────
        if (this.state === 'hurt') {
            this.vx      *= Math.pow(0.75, dt * 60); // frame-rate independent friction
            this.hurtTimer -= dt;
            if (this.hurtTimer <= 0) {
                const playerDist = player
                    ? dist(this.x + this.width * 0.5, this.y + this.height * 0.5,
                            player.x + player.width * 0.5, player.y + player.height * 0.5)
                    : Infinity;
                this.state      = (playerDist < this.detectRange) ? 'chase' : 'patrol';
                this.stateTimer = 0;
            }
            // Apply gravity during hurt
            this.vy += WORLD_GRAVITY * dt;
            this.vy  = clamp(this.vy, -MAX_FALL_SPEED, MAX_FALL_SPEED);
            this._applyTileCollision(dt, tileMap);
            return;
        }

        // ── GRAVITY (all active states) ───────────
        this.vy += WORLD_GRAVITY * dt;
        this.vy  = clamp(this.vy, -MAX_FALL_SPEED, MAX_FALL_SPEED);

        // ── PATROL ────────────────────────────────
        if (this.state === 'patrol') {
            this.speed = this.patrolSpeed;
            this.vx    = this.patrolSpeed * this.facing;

            // Reverse at patrol bounds
            if (this.x <= this.patrolLeft) {
                this.facing = 1;
                this.x      = this.patrolLeft;
            } else if (this.x + this.width >= this.patrolRight) {
                this.facing = -1;
                this.x      = this.patrolRight - this.width;
            }

            // Reverse at cliffs or walls
            if (this.onGround) {
                if (this._checkCliff(tileMap) || this._checkWallAhead(tileMap)) {
                    this.facing *= -1;
                    this.vx      = this.patrolSpeed * this.facing;
                }
            }

            // Detect player → chase
            if (player && player.alive) {
                const cx = this.x + this.width  * 0.5;
                const cy = this.y + this.height * 0.5;
                const px = player.x + player.width  * 0.5;
                const py = player.y + player.height * 0.5;
                if (dist(cx, cy, px, py) < this.detectRange) {
                    this.state      = 'chase';
                    this.stateTimer = 0;
                }
            }
        }

        // ── CHASE ─────────────────────────────────
        else if (this.state === 'chase') {
            if (player && player.alive) {
                const cx = this.x + this.width  * 0.5;
                const cy = this.y + this.height * 0.5;
                const px = player.x + player.width  * 0.5;
                const py = player.y + player.height * 0.5;
                const d  = dist(cx, cy, px, py);

                this.facing = sign(px - cx) || this.facing;
                this.speed  = this.chaseSpeed;
                this.vx     = this.chaseSpeed * this.facing;

                if (d < this.attackRange) {
                    this.state      = 'attack';
                    this.stateTimer = 0;
                } else if (d > this.detectRange * 1.5) {
                    this.state      = 'patrol';
                    this.stateTimer = 0;
                    this.vx         = 0;
                }
            } else {
                // Lost player
                this.state      = 'patrol';
                this.stateTimer = 0;
                this.vx         = 0;
            }
        }

        // ── ATTACK ────────────────────────────────
        else if (this.state === 'attack') {
            this.vx = 0; // Stand still while attacking

            // Deal damage check against player
            if (player && player.alive && this.stateTimer < 0.5) {
                const cx = this.x + this.width  * 0.5;
                const cy = this.y + this.height * 0.5;
                const px = player.x + player.width  * 0.5;
                const py = player.y + player.height * 0.5;
                if (dist(cx, cy, px, py) < this.attackRange) {
                    // Subclasses / game loop handle actual damage application;
                    // base class just flags: attackHit is read externally if needed
                    this.attackHitThisFrame = true;
                }
            } else {
                this.attackHitThisFrame = false;
            }

            if (this.stateTimer > 0.5) {
                this.state      = 'chase';
                this.stateTimer = 0;
            }
        }

        this._applyTileCollision(dt, tileMap);
    }

    // ─────────────────────────────────────────────
    //  TILE COLLISION
    // ─────────────────────────────────────────────
    _applyTileCollision(dt, tileMap) {
        if (!tileMap || typeof tileMap.getTileAt !== 'function') return;

        const hw = this.width;
        const hh = this.height;

        // ── X Axis ───────────────────────────────
        this.x += this.vx * dt;

        const leftTile   = Math.floor(this.x / TILE_SIZE);
        const rightTile  = Math.floor((this.x + hw - 1) / TILE_SIZE);
        const topTile    = Math.floor(this.y / TILE_SIZE);
        const bottomTile = Math.floor((this.y + hh - 1) / TILE_SIZE);

        for (let ty = topTile; ty <= bottomTile; ty++) {
            // Check left side
            const tileL = tileMap.getTileAt(leftTile, ty);
            if (tileL && tileL.type === TILE.SOLID) {
                this.x  = (leftTile + 1) * TILE_SIZE;
                this.vx = 0;
                this.facing *= -1;
                break;
            }
            // Check right side
            const tileR = tileMap.getTileAt(rightTile, ty);
            if (tileR && tileR.type === TILE.SOLID) {
                this.x  = rightTile * TILE_SIZE - hw;
                this.vx = 0;
                this.facing *= -1;
                break;
            }
        }

        // ── Y Axis ───────────────────────────────
        this.vy         = this.vy;  // already clamped above
        this.onGround   = false;
        this.y         += this.vy * dt;

        const leftTile2   = Math.floor(this.x / TILE_SIZE);
        const rightTile2  = Math.floor((this.x + hw - 1) / TILE_SIZE);
        const topTile2    = Math.floor(this.y / TILE_SIZE);
        const bottomTile2 = Math.floor((this.y + hh - 1) / TILE_SIZE);

        for (let tx = leftTile2; tx <= rightTile2; tx++) {
            // Check ceiling
            const tileTop = tileMap.getTileAt(tx, topTile2);
            if (tileTop && tileTop.type === TILE.SOLID && this.vy < 0) {
                this.y  = (topTile2 + 1) * TILE_SIZE;
                this.vy = 0;
                break;
            }
        }

        for (let tx = leftTile2; tx <= rightTile2; tx++) {
            // Check floor (SOLID and SEMI_SOLID)
            const tileBot = tileMap.getTileAt(tx, bottomTile2);
            if (tileBot && (tileBot.type === TILE.SOLID || tileBot.type === TILE.SEMI_SOLID) && this.vy >= 0) {
                this.y        = bottomTile2 * TILE_SIZE - hh;
                this.vy       = 0;
                this.onGround = true;
                break;
            }
        }
    }

    // ─────────────────────────────────────────────
    //  CLIFF CHECK — no solid tile one step ahead+below
    // ─────────────────────────────────────────────
    _checkCliff(tileMap) {
        if (!tileMap || typeof tileMap.getTileAt !== 'function') return false;

        const stepX   = this.facing * TILE_SIZE;
        const checkX  = (this.facing > 0)
            ? this.x + this.width + 2
            : this.x - 2;
        const checkY  = this.y + this.height + 2;

        const tx = Math.floor((checkX + stepX * 0.5) / TILE_SIZE);
        const ty = Math.floor(checkY / TILE_SIZE);

        const tile = tileMap.getTileAt(tx, ty);
        return !(tile && (tile.type === TILE.SOLID || tile.type === TILE.SEMI_SOLID));
    }

    // ─────────────────────────────────────────────
    //  WALL CHECK — solid tile directly ahead
    // ─────────────────────────────────────────────
    _checkWallAhead(tileMap) {
        if (!tileMap || typeof tileMap.getTileAt !== 'function') return false;

        const checkX = (this.facing > 0)
            ? this.x + this.width + 2
            : this.x - 2;
        const midY   = this.y + this.height * 0.5;

        const tx     = Math.floor(checkX / TILE_SIZE);
        const ty     = Math.floor(midY   / TILE_SIZE);

        const tile = tileMap.getTileAt(tx, ty);
        return !!(tile && tile.type === TILE.SOLID);
    }

    // ─────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────
    render(ctx, camera) {
        if (!this.alive && this.state !== 'dead') return;

        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        this._drawShadow(ctx, camera);

        // Flash red on damage
        if (this._damagedFlash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.fillStyle   = '#ff3333';
            ctx.fillRect(sx, sy, this.width, this.height);
            ctx.restore();
        } else {
            // Base grey body (subclasses override for custom art)
            ctx.save();
            const alpha = (this.state === 'dead')
                ? clamp(this.deathTimer / 0.6, 0, 1)
                : 1;
            ctx.globalAlpha = alpha;

            // Body
            ctx.fillStyle = '#8899aa';
            ctx.fillRect(sx, sy, this.width, this.height);

            // Simple eye(s) to indicate facing
            ctx.fillStyle = '#ffffff';
            const eyeY   = sy + this.height * 0.25;
            const eyeSize = Math.max(4, this.width * 0.14);
            if (this.facing > 0) {
                ctx.fillRect(sx + this.width * 0.55, eyeY, eyeSize, eyeSize);
            } else {
                ctx.fillRect(sx + this.width * 0.25, eyeY, eyeSize, eyeSize);
            }

            ctx.restore();
        }

        this._drawHealthBar(ctx, camera);
    }

    // ─────────────────────────────────────────────
    //  HEALTH BAR
    // ─────────────────────────────────────────────
    _drawHealthBar(ctx, camera) {
        if (this.health >= this.maxHealth) return;
        if (this.state === 'dead') return;

        const sx    = this.x - camera.x;
        const sy    = this.y - camera.y;
        const bw    = this.width;
        const bh    = 4;
        const bx    = sx;
        const by    = sy - bh - 4;
        const fillW = Math.max(0, (this.health / this.maxHealth) * bw);

        ctx.save();
        // Background
        ctx.fillStyle = '#330000';
        ctx.fillRect(bx, by, bw, bh);
        // Fill
        const ratio  = this.health / this.maxHealth;
        ctx.fillStyle = ratio > 0.5 ? '#33dd33' : ratio > 0.25 ? '#ddcc00' : '#dd2222';
        ctx.fillRect(bx, by, fillW, bh);
        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();
    }

    // ─────────────────────────────────────────────
    //  SHADOW
    // ─────────────────────────────────────────────
    _drawShadow(ctx, camera) {
        const sx      = this.x - camera.x;
        const sy      = this.y - camera.y;
        const cx      = sx + this.width  * 0.5;
        const cy      = sy + this.height + 2;
        const radiusX = this.width  * 0.4;
        const radiusY = this.width  * 0.12;

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle   = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ─────────────────────────────────────────────
    //  TAKE DAMAGE
    // ─────────────────────────────────────────────
    takeDamage(amount, knockbackX, knockbackY, audio, particles) {
        if (this.hurtTimer > 0) return;
        if (this.state === 'dead') return;

        this.health        -= amount;
        this.hurtTimer      = 0.4;
        this._damagedFlash  = 0.15;
        this.vx             = knockbackX || 0;
        this.vy             = knockbackY  !== undefined ? knockbackY : -200;
        this.state          = 'hurt';
        this.stateTimer     = 0;

        audio?.playSound?.(SFX.HURT);

        // Spawn red hurt sparks
        if (particles) {
            const cx = this.x + this.width  * 0.5;
            const cy = this.y + this.height * 0.5;
            const count = 8;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + rnd(-0.3, 0.3);
                const speed = rnd(60, 160);
                particles.spawn({
                    x      : cx,
                    y      : cy,
                    vx     : Math.cos(angle) * speed,
                    vy     : Math.sin(angle) * speed - 50,
                    life   : rnd(0.25, 0.5),
                    size   : rnd(3, 6),
                    color  : '#ff2222',
                    gravity: true,
                    fade   : true,
                });
            }
        }

        if (this.health <= 0) {
            this.die(audio, particles);
        }
    }

    // ─────────────────────────────────────────────
    //  DIE
    // ─────────────────────────────────────────────
    die(audio, particles) {
        this.state       = 'dead';
        this.deathTimer  = 0.6;
        this.health      = 0;

        audio?.playSound?.(SFX.ENEMY_DIE);

        // Spawn orange/yellow death puffs
        if (particles) {
            const cx    = this.x + this.width  * 0.5;
            const cy    = this.y + this.height * 0.5;
            const count = 14;
            const colors = ['#ff9900', '#ffcc00', '#ff6600', '#ffee44', '#ffffff'];
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + rnd(-0.4, 0.4);
                const speed = rnd(80, 220);
                particles.spawn({
                    x      : cx + rnd(-8, 8),
                    y      : cy + rnd(-8, 8),
                    vx     : Math.cos(angle) * speed,
                    vy     : Math.sin(angle) * speed - 80,
                    life   : rnd(0.4, 0.9),
                    size   : rnd(5, 12),
                    color  : colors[rndInt(0, colors.length - 1)],
                    gravity: true,
                    fade   : true,
                    shrink : true,
                });
            }
        }
    }

    // ─────────────────────────────────────────────
    //  BOUNDS
    // ─────────────────────────────────────────────
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height,
        };
    }
};
