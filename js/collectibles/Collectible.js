/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Base Collectible
 * ============================================================
 * Base class for all level objects that can be collected by the player.
 * Supports floating bob animations, magnet attractions, and block spawning.
 */

'use strict';

window.Collectible = class Collectible extends window.Entity {
    constructor(x, y, width, height, type) {
        super(x, y, width, height);
        this.type = type; // coin, gem, powerup, checkpoint, crystal
        this.collected = false;

        // Bob animation properties
        this.bobOffset = 0;
        this.bobSpeed = 3.5;
        this.bobTime = Math.random() * 10; // offset so they don't sync

        // Magnet attraction properties
        this.magnetRange = COLLECTIBLE.MAGNET_RANGE;
        this.magnetSpeed = 450; // px/s velocity toward player

        // Spawning out of coin-block physics
        this.spawning = false;
        this.spawnVy = 0;
        this.groundY = y;
    }

    /**
     * Start the block pop-up spawn sequence
     */
    spawnFromBlock(startVy = -350) {
        this.spawning = true;
        this.spawnVy = startVy;
        this.groundY = this.y;
    }

    update(dt, player) {
        if (this.collected) return;

        // Bob up and down
        this.bobTime += dt;
        this.bobOffset = Math.sin(this.bobTime * this.bobSpeed) * 4;

        // Check spawn animation physics
        if (this.spawning) {
            this.spawnVy += WORLD_GRAVITY * dt;
            this.y += this.spawnVy * dt;

            // Settle back to ground level
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.spawning = false;
                this.spawnVy = 0;
            }
            return; // Skip magnetism while spawning
        }

        // Magnet attraction logic
        if (player.magnetActive && this.type !== 'checkpoint' && this.type !== 'crystal') {
            const dx = player.getCenterX() - this.getCenterX();
            const dy = player.getCenterY() - this.getCenterY();
            const distance = Math.hypot(dx, dy);

            if (distance < this.magnetRange) {
                // Attracted to player
                this.x += (dx / distance) * this.magnetSpeed * dt;
                this.y += (dy / distance) * this.magnetSpeed * dt;
            }
        }

        // Standard overlap collection check
        if (this.overlaps(player)) {
            this.collect(player);
        }
    }

    collect(player) {
        this.collected = true;
        this.alive = false;
        this.onCollect(player);
    }

    /**
     * Virtual method to be overridden by subclasses
     */
    onCollect(player) {
        // Subclasses define collection actions (giving points/SFX)
    }
};
