/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Physics Engine
 * ============================================================
 * Handles AABB collision detection, tilemap intersections, slope walking,
 * coyote time, drag, platform physics, and hazardous material effects.
 */

'use strict';

window.Physics = {
    /**
     * Helper to get Entity bounds in AABB format {x, y, w, h}
     */
    getAABB(entity) {
        return {
            x: entity.x,
            y: entity.y,
            w: entity.width,
            h: entity.height
        };
    },

    /**
     * Check if two AABB boxes overlap
     */
    overlap(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.w > b.x &&
               a.y < b.y + b.h &&
               a.y + a.h > b.y;
    },

    /**
     * Returns overlapping distance dx and dy
     */
    overlapAmount(a, b) {
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        return {
            dx: overlapX > 0 ? overlapX : 0,
            dy: overlapY > 0 ? overlapY : 0
        };
    },

    /**
     * Check if entity overlaps with another entity
     */
    resolveEntityVsEntity(a, b) {
        return this.overlap(this.getAABB(a), this.getAABB(b));
    },

    /**
     * Resolve physics movement and tile collisions for an entity.
     * Returns a state object indicating collision sides, media, and hazards.
     */
    resolveEntityVsTilemap(entity, tileMap, dt) {
        const state = {
            onGround: false,
            onWall: false,
            onCeiling: false,
            onIce: false,
            inWater: false,
            inLava: false,
            onSlope: false,
            onLadder: false,
            onVine: false,
            wallDirection: 0
        };

        // Determine if entity is climbing
        const isClimbing = entity.isClimbing || false;

        // Apply environment modifiers
        let currentGravity = WORLD_GRAVITY;
        let frictionFactor = NORMAL_FRICTION;

        // Check overlapping media first
        const entityBox = this.getAABB(entity);
        const startTx = Math.floor(entityBox.x / TILE_SIZE);
        const endTx = Math.floor((entityBox.x + entityBox.w) / TILE_SIZE);
        const startTy = Math.floor(entityBox.y / TILE_SIZE);
        const endTy = Math.floor((entityBox.y + entityBox.h) / TILE_SIZE);

        for (let tx = startTx; tx <= endTx; tx++) {
            for (let ty = startTy; ty <= endTy; ty++) {
                const tile = tileMap.getTile(tx, ty);
                if (tile === TILE.WATER) {
                    state.inWater = true;
                } else if (tile === TILE.LAVA) {
                    state.inLava = true;
                } else if (tile === TILE.LADDER) {
                    state.onLadder = true;
                } else if (tile === TILE.VINE) {
                    state.onVine = true;
                } else if (tile === TILE.WIND_LEFT) {
                    entity.vx -= 400 * dt; // Apply wind force
                } else if (tile === TILE.WIND_RIGHT) {
                    entity.vx += 400 * dt; // Apply wind force
                }
            }
        }

        // Apply media physics alterations
        if (state.inWater) {
            currentGravity = WORLD_GRAVITY * 0.4; // 60% buoyancy
            frictionFactor = 0.88;               // Extra drag
            entity.vy = clamp(entity.vy, -MAX_FALL_SPEED * 0.5, MAX_FALL_SPEED * 0.5);
        } else if (state.inLava) {
            currentGravity = WORLD_GRAVITY * 0.35;
            frictionFactor = 0.85;
            entity.vy = clamp(entity.vy, -MAX_FALL_SPEED * 0.4, MAX_FALL_SPEED * 0.4);
        } else if (entity.onIce) {
            frictionFactor = ICE_FRICTION;
        } else if (!entity.onGround) {
            frictionFactor = AIR_FRICTION;
        }

        // Apply friction
        if (!isClimbing) {
            entity.vx *= frictionFactor;
        }

        // Apply gravity if not climbing
        if (!isClimbing && !state.onLadder && !state.onVine) {
            entity.vy += currentGravity * dt;
            entity.vy = clamp(entity.vy, -MAX_FALL_SPEED, MAX_FALL_SPEED);
        }

        // --- Move X and Resolve Collisions ---
        entity.x += entity.vx * dt;
        this._resolveHorizontalCollisions(entity, tileMap, state);

        // --- Move Y and Resolve Collisions ---
        if (isClimbing) {
            entity.y += entity.vy * dt;
            // Bound climbing to ladder vertical extents
            this._resolveVerticalClimbingCollisions(entity, tileMap, state);
        } else {
            entity.y += entity.vy * dt;
            this._resolveVerticalCollisions(entity, tileMap, state, dt);
        }

        // --- Handle Slope Adjustments ---
        this._resolveSlopeCollisions(entity, tileMap, state);

        // Update ground reference back to entity
        entity.onGround = state.onGround;
        entity.onIce = state.onIce;

        return state;
    },

    _resolveHorizontalCollisions(entity, tileMap, state) {
        const box = this.getAABB(entity);
        const startTx = Math.floor(box.x / TILE_SIZE);
        const endTx = Math.floor((box.x + box.w) / TILE_SIZE);
        const startTy = Math.floor(box.y / TILE_SIZE);
        const endTy = Math.floor((box.y + box.h) / TILE_SIZE);

        for (let tx = startTx; tx <= endTx; tx++) {
            for (let ty = startTy; ty <= endTy; ty++) {
                const tile = tileMap.getTile(tx, ty);
                
                // Solid tiles, coin blocks, secret solid blocks, and lock doors
                if (tile === TILE.SOLID || tile === TILE.COIN_BLOCK || tile === TILE.SECRET) {
                    const tileBox = { x: tx * TILE_SIZE, y: ty * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
                    
                    if (this.overlap(box, tileBox)) {
                        const overlap = this.overlapAmount(box, tileBox);
                        if (overlap.dx > 0) {
                            if (entity.vx > 0) {
                                entity.x -= overlap.dx;
                                entity.vx = 0;
                                state.onWall = true;
                                state.wallDirection = 1;
                            } else if (entity.vx < 0) {
                                entity.x += overlap.dx;
                                entity.vx = 0;
                                state.onWall = true;
                                state.wallDirection = -1;
                            }
                            // Re-get bounds to update for next tiles in loops
                            box.x = entity.x;
                        }
                    }
                }
            }
        }
    },

    _resolveVerticalCollisions(entity, tileMap, state, dt) {
        const box = this.getAABB(entity);
        const startTx = Math.floor(box.x / TILE_SIZE);
        const endTx = Math.floor((box.x + box.w) / TILE_SIZE);
        const startTy = Math.floor(box.y / TILE_SIZE);
        const endTy = Math.floor((box.y + box.h) / TILE_SIZE);

        for (let tx = startTx; tx <= endTx; tx++) {
            for (let ty = startTy; ty <= endTy; ty++) {
                const tile = tileMap.getTile(tx, ty);
                const tileBox = { x: tx * TILE_SIZE, y: ty * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };

                const isSolid = (tile === TILE.SOLID || tile === TILE.COIN_BLOCK || tile === TILE.SECRET);
                const isPlatform = (tile === TILE.CLOUD || tile === TILE.SEMI_SOLID);

                if (isSolid || isPlatform) {
                    if (this.overlap(box, tileBox)) {
                        const overlap = this.overlapAmount(box, tileBox);

                        // If it's a pass-through platform, only collide if falling through the top
                        if (isPlatform) {
                            const wasAbove = (entity.y + entity.height - entity.vy * dt) <= tileBox.y + 4;
                            if (entity.vy >= 0 && wasAbove && overlap.dy > 0) {
                                entity.y -= overlap.dy;
                                entity.vy = 0;
                                state.onGround = true;
                                if (tile === TILE.ICE) state.onIce = true;
                                box.y = entity.y;
                            }
                        } else {
                            // Standard Solid Collisions
                            if (overlap.dy > 0) {
                                if (entity.vy > 0) {
                                    // Landing on ground
                                    entity.y -= overlap.dy;
                                    entity.vy = 0;
                                    state.onGround = true;
                                    if (tile === TILE.ICE) state.onIce = true;
                                } else if (entity.vy < 0) {
                                    // Hitting ceiling
                                    entity.y += overlap.dy;
                                    entity.vy = 0;
                                    state.onCeiling = true;
                                }
                                box.y = entity.y;
                            }
                        }
                    }
                }
            }
        }
    },

    _resolveVerticalClimbingCollisions(entity, tileMap, state) {
        // Just make sure player stays bounds locked if they climb out of ladder top/bottom
        const centerTx = Math.floor(entity.getCenterX() / TILE_SIZE);
        const topTy = Math.floor(entity.y / TILE_SIZE);
        const botTy = Math.floor((entity.y + entity.height) / TILE_SIZE);

        const topTile = tileMap.getTile(centerTx, topTy);
        const botTile = tileMap.getTile(centerTx, botTy);

        if (topTile !== TILE.LADDER && topTile !== TILE.VINE && botTile !== TILE.LADDER && botTile !== TILE.VINE) {
            entity.isClimbing = false;
        }
    },

    _resolveSlopeCollisions(entity, tileMap, state) {
        // We evaluate slope intersection directly below the player
        const playerCenterX = entity.getCenterX();
        const playerFeetY = entity.y + entity.height;
        const tx = Math.floor(playerCenterX / TILE_SIZE);
        const ty = Math.floor(playerFeetY / TILE_SIZE);

        const tile = tileMap.getTile(tx, ty);

        if (tile === TILE.SLOPE_LEFT || tile === TILE.SLOPE_RIGHT) {
            // Relative position inside the tile: 0.0 to 1.0
            const relX = (playerCenterX - (tx * TILE_SIZE)) / TILE_SIZE;
            let targetYInTile = 0;

            if (tile === TILE.SLOPE_LEFT) {
                // Rises left to right: y goes from 1.0 (bottom) to 0.0 (top)
                targetYInTile = 1.0 - relX;
            } else if (tile === TILE.SLOPE_RIGHT) {
                // Falls left to right: y goes from 0.0 (top) to 1.0 (bottom)
                targetYInTile = relX;
            }

            const worldTargetY = (ty * TILE_SIZE) + (targetYInTile * TILE_SIZE);

            // If player feet are close to or below the slope surface, lock them to it
            if (entity.vy >= 0 && playerFeetY >= worldTargetY - 12) {
                entity.y = worldTargetY - entity.height;
                entity.vy = 0;
                state.onGround = true;
                state.onSlope = true;
            }
        }
    },

    /**
     * Check if an entity is on ground by casting a 1px box downwards
     */
    checkEntityOnGround(entity, tileMap) {
        const box = this.getAABB(entity);
        box.y += 1; // Project 1px down
        
        const startTx = Math.floor(box.x / TILE_SIZE);
        const endTx = Math.floor((box.x + box.w) / TILE_SIZE);
        const testTy = Math.floor((box.y + box.h) / TILE_SIZE);

        for (let tx = startTx; tx <= endTx; tx++) {
            const tile = tileMap.getTile(tx, testTy);
            if (tile === TILE.SOLID || tile === TILE.COIN_BLOCK || tile === TILE.CLOUD || tile === TILE.SEMI_SOLID || tile === TILE.SECRET) {
                return true;
            }
            if (tile === TILE.SLOPE_LEFT || tile === TILE.SLOPE_RIGHT) {
                return true;
            }
        }
        return false;
    },

    /**
     * Apply moving platform forces
     */
    applyPlatformPhysics(entity, platform, dt) {
        const pVel = platform.getVelocity();
        entity.x += pVel.vx * dt;
        entity.y += pVel.vy * dt;
    }
};
