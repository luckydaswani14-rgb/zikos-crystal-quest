/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Base Entity Class
 * ============================================================
 * Defines the core structure, physics properties, and bounds
 * for all active game objects.
 */

'use strict';

window.Entity = class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = width;
        this.height = height;
        this.alive = true;
        this.visible = true;
        this.facing = 1; // 1 = right, -1 = left
        this.isGrounded = false;
    }

    /**
     * Update function to be overridden by subclasses.
     * @param {number} dt - Delta time
     */
    update(dt) {
        // Base entity doesn't do anything by default
    }

    /**
     * Render function to be overridden by subclasses.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Camera} camera 
     */
    render(ctx, camera) {
        // Base entity doesn't render anything by default
    }

    /**
     * Get axis-aligned bounding box bounds.
     * @returns {Object} {x, y, w, h}
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }

    /**
     * Get center X position.
     * @returns {number}
     */
    getCenterX() {
        return this.x + this.width / 2;
    }

    /**
     * Get center Y position.
     * @returns {number}
     */
    getCenterY() {
        return this.y + this.height / 2;
    }

    /**
     * Calculate Euclidean distance to another entity.
     * @param {Entity} other 
     * @returns {number}
     */
    distanceTo(other) {
        return dist(this.getCenterX(), this.getCenterY(), other.getCenterX(), other.getCenterY());
    }

    /**
     * Check if this entity's AABB overlaps with another entity's AABB.
     * @param {Entity} other 
     * @returns {boolean}
     */
    overlaps(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.x < b.x + b.w &&
               a.x + a.w > b.x &&
               a.y < b.y + b.h &&
               a.y + a.h > b.y;
    }

    /**
     * Mark entity as dead so it can be cleaned up.
     */
    destroy() {
        this.alive = false;
    }
};
