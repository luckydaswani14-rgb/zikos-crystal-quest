/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Level Manager
 * ============================================================
 * Coordinates the active sandbox world: loads level map matrices, 
 * handles physics loop updates, coordinates companion helper AI,
 * checks hazards, manages stomp collisions, and handles level victory bounds.
 */

'use strict';

window.Level = class Level {
    constructor(engine) {
        this.engine = engine;

        this.id = 1;
        this.name = "";
        this.theme = "greenHills";
        
        // World boundaries
        this.width = 0; // tile width
        this.height = 0; // tile height
        
        // Entities collections
        this.tileMap = null;
        this.background = null;
        this.player = null;
        this.enemies = [];
        this.collectibles = [];
        this.platforms = [];
        this.boss = null;
        this.companion = null;

        this.spawnPoint = { x: 64, y: 300 };
        this.levelCompleted = false;

        this.timer = 0;
        this.secretsFound = 0;
        this.totalSecrets = 0;
        this.crystalCollected = false;
        
        this.activeBossArena = false;
        this.bossArenaX = 99999; // trigger coord
    }

    /**
     * Parse the level configuration from global window memory
     */
    load(levelId) {
        this.id = levelId;
        
        const data = window['LEVEL_DATA_' + levelId];
        if (!data) {
            console.error(`Level data for LEVEL_DATA_${levelId} not found!`);
            // Fallback to menu on invalid level load
            this.engine.setState(STATE.MENU);
            return;
        }

        this.name = data.name;
        this.theme = data.theme;
        this.width = data.tileWidth;
        this.height = data.tileHeight;
        this.timer = 0;
        this.secretsFound = 0;
        this.totalSecrets = data.secrets ? data.secrets.length : 0;
        this.crystalCollected = false;
        this.levelCompleted = false;
        this.activeBossArena = false;

        this.engine.hud.showMessage(`WORLD ${levelId}: ${this.name}`, 3.0, '#FFD700', 36);

        // 1. Setup Background theme
        this.background = new window.Background();
        this.background.setTheme(this.theme);

        // 2. Setup TileMap
        this.tileMap = new window.TileMap(data.tileWidth, data.tileHeight, [...data.tiles], this.theme);

        // 3. Spawns moving platforms
        this.platforms = [];
        if (data.platforms) {
            for (const p of data.platforms) {
                const plat = new window.Platform(p.x, p.y, p.w, p.h, {
                    endX: p.endX,
                    endY: p.endY,
                    speed: p.speed,
                    type: p.type,
                    theme: this.theme
                });
                this.tileMap.addMovingPlatform(plat);
                this.platforms.push(plat);
            }
        }

        // 4. Setup player at spawn coords
        this.spawnPoint = { ...data.spawnPoint };
        this.player = new window.Player(this.spawnPoint.x, this.spawnPoint.y);
        
        // Inherit lives/difficulty configuration from engine state
        this.player.lives = this.engine.difficultySettings.lives;
        this.player.health = Math.floor(PLAYER.MAX_HEALTH * this.engine.difficultySettings.healthMult);

        // 5. Spawns collectibles
        this.collectibles = [];
        if (data.collectibles) {
            for (const c of data.collectibles) {
                let col = null;
                if (c.type === 'coin') {
                    col = new window.Coin(c.x, c.y, c.value || 1, c.subtype || 'gold');
                } else if (c.type === 'gem') {
                    col = new window.Gem(c.x, c.y, c.subtype || 'blue');
                } else if (c.type === 'powerup') {
                    col = new window.PowerUp(c.x, c.y, c.subtype || POWERUP_TYPE.SHIELD);
                } else if (c.type === 'checkpoint') {
                    col = new window.Checkpoint(c.x, c.y);
                } else if (c.type === 'crystal') {
                    col = new window.Collectible(c.x, c.y, 32, 32, 'crystal');
                    // Draw custom crystal item callback
                    col.render = function(ctx, camera) {
                        if (this.collected) return;
                        ctx.save();
                        const cx = this.x + 16;
                        const cy = this.y + 16 + this.bobOffset;
                        // Draw glowing crystal octahedron
                        const pulse = Math.abs(Math.sin(this.bobTime * 2)) * 4;
                        ctx.shadowColor = '#00E5FF';
                        ctx.shadowBlur = 10 + pulse;
                        ctx.fillStyle = COLORS.CRYSTAL;
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(cx, cy - 16);
                        ctx.lineTo(cx + 12, cy);
                        ctx.lineTo(cx, cy + 16);
                        ctx.lineTo(cx - 12, cy);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    };
                    col.onCollect = (player) => {
                        this.crystalCollected = true;
                        this.levelCompleted = true; // crystal completes level
                        player.addScore(1000);
                        this.complete();
                    };
                }
                if (col) this.collectibles.push(col);
            }
        }

        // 6. Spawn Boss / Companion (Level 15 Throne Room triggers)
        this.boss = null;
        this.companion = null;
        if (data.boss) {
            if (data.boss.type === 'ShadowKing') {
                this.boss = new window.ShadowKing(data.boss.x, data.boss.y);
                this.bossArenaX = data.boss.x - 400; // Trigger arena lines
                
                // Add Bolt companion to level 15
                this.companion = new window.Companion(data.spawnPoint.x - 40, data.spawnPoint.y - 20);
            }
        }

        // 7. Spawns standard patrol enemies
        this.enemies = [];
        if (data.enemies) {
            for (const e of data.enemies) {
                let enemy = null;
                const spdMult = this.engine.difficultySettings.enemySpeed;
                
                if (e.type === 'Slime') {
                    enemy = new window.Slime(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'Bat') {
                    enemy = new window.Bat(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'FireSprite') {
                    enemy = new window.FireSprite(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'IceGolem') {
                    enemy = new window.IceGolem(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'ShieldKnight') {
                    enemy = new window.ShieldKnight(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'GiantBrute') {
                    enemy = new window.GiantBrute(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'JumpingFrog') {
                    enemy = new window.JumpingFrog(e.x, e.y, e.patrolLeft, e.patrolRight);
                } else if (e.type === 'FlyingDragon') {
                    enemy = new window.FlyingDragon(e.x, e.y, e.patrolLeft, e.patrolRight);
                }

                if (enemy) {
                    // scale speed by difficulty multiplier
                    enemy.speed *= spdMult;
                    this.enemies.push(enemy);
                }
            }
        }

        // Play level theme music
        this.engine.audio.playMusic(data.music || MUSIC.WORLD1);
    }

    update(dt) {
        if (this.levelCompleted) return;

        this.timer += dt;

        // Update particle physics
        this.engine.particles.update(dt);

        // Update Background theme decorations
        this.background.update(dt);

        // Update moving platform coordinates
        this.tileMap.update(dt);

        // Update Player controllers
        this.player.update(dt, this.engine.input, this.tileMap, this.enemies, this.engine.audio, this.engine.particles);

        // Lock camera boundaries to boss room if active
        if (this.player.x >= this.bossArenaX && !this.activeBossArena && this.boss) {
            this.activeBossArena = true;
            // Activate Companion Bolt
            if (this.companion) {
                this.companion.activate(this.player, this.boss, this.engine.audio);
            }
            this.engine.hud.showMessage("SHADOW KING APPEARS!", 2.0, '#E53935');
        }

        let worldLimWidth = this.tileMap.getWorldWidth();
        if (this.activeBossArena) {
            // Lock camera horizontally to boss battle space boundaries
            worldLimWidth = this.bossArenaX + 800;
        }

        // Camera track player center
        this.engine.camera.update(
            dt, 
            this.player.x, 
            this.player.y, 
            worldLimWidth, 
            this.tileMap.getWorldHeight(),
            this.player.vx
        );

        // Update Companion Bolt
        if (this.companion && this.companion.active) {
            this.companion.update(dt, this.player, this.boss, this.engine.audio, this.engine.particles);
        }

        // Update Active Boss
        if (this.boss && this.activeBossArena) {
            this.boss.update(dt, this.player, this.tileMap, this.enemies, this.engine.audio, this.engine.particles, this.companion);
        }

        // Update active enemies list
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (!e.alive) {
                this.enemies.splice(i, 1);
                continue;
            }

            e.update(dt, this.player, this.tileMap, this.enemies, this.engine.audio, this.engine.particles);

            // Handle Stomp collisions: Check if player lands on top of enemy
            if (e.alive && !e.isBoss && this.player.overlaps(e)) {
                // If player is falling and their feet are above enemy mid-line
                const isAbove = (this.player.y + this.player.height - this.player.vy * dt) <= e.y + 12;
                if (this.player.vy > 0 && isAbove) {
                    // Stomp!
                    this.player.vy = -PLAYER.DOUBLE_JUMP * 0.7; // bounce jump
                    this.player.onGround = false;
                    
                    e.takeDamage(PLAYER.STOMP_DAMAGE, 0, 0, this.engine.audio, this.engine.particles);
                    this.engine.audio.playSound(SFX.STOMP);
                    this.player.addScore(100);
                }
            }
        }

        // Update active collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            c.update(dt, this.player);
            if (!c.alive && c.type !== 'checkpoint') {
                this.collectibles.splice(i, 1);
            }
        }

        // Fall into instant kill pit bounds check
        if (this.player.y > this.tileMap.getWorldHeight() + 64) {
            this.player.die(this.engine.audio, this.engine.particles);
        }
    }

    render(ctx) {
        // 1. Draw static parallax layers (Sky, hills)
        this.background.render(ctx, this.engine.camera, this.tileMap.getWorldWidth(), CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Apply camera transformations to translate canvas coordinate grid
        this.engine.camera.apply(ctx);

        // Draw tile matrix blocks
        this.tileMap.render(ctx, this.engine.camera);

        // Draw active collectibles
        for (const c of this.collectibles) {
            if (this.engine.camera.isVisible(c.x, c.y, c.width, c.height)) {
                c.render(ctx, this.engine.camera);
            }
        }

        // Draw active enemies
        for (const e of this.enemies) {
            if (this.engine.camera.isVisible(e.x, e.y, e.width, e.height)) {
                e.render(ctx, this.engine.camera);
            }
        }

        // Draw active boss
        if (this.boss && this.activeBossArena) {
            this.boss.render(ctx, this.engine.camera);
        }

        // Draw player Ziko
        this.player.render(ctx, this.engine.camera);

        // Draw Companion Bolt
        if (this.companion && this.companion.active) {
            this.companion.render(ctx, this.engine.camera);
        }

        // Render particles sandbox
        this.engine.particles.render(ctx, this.engine.camera);

        // 3. Restore canvas transformations (Reset to screen HUD space)
        this.engine.camera.reset(ctx);

        // 4. Render HUD in screen space overlay
        this.engine.hud.render(ctx, this.player, this, this.engine.fps);
    }

    complete() {
        this.levelCompleted = true;
        this.engine.audio.stopMusic();
        this.engine.audio.playSound(SFX.LEVEL_WIN);
        
        // Wait 2 seconds before showing victory screen overlays
        setTimeout(() => {
            this.engine.victory();
        }, 2000);
    }
};
