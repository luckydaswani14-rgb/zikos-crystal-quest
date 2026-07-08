/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Camera System
 * ============================================================
 * Implements smooth follow mechanics, look-ahead based on movement direction,
 * screen shake effects, boss-battle zooms, and frustum culling.
 */

'use strict';

window.Camera = class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.viewportWidth = canvasWidth;
        this.viewportHeight = canvasHeight;

        this.camX = 0;
        this.camY = 0;
        this.targetZoom = 1.0;
        this.currentZoom = 1.0;
        this.zoomSpeed = 2.0; // Lerp factor for zoom

        // Offsets
        this.lookAheadX = 0;
        
        // Camera Shake State
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    /**
     * Update camera position with smooth follow, look-ahead, and screenshake decay
     */
    update(dt, targetX, targetY, worldWidth, worldHeight, targetVx = 0) {
        // Zoom adjustment
        if (Math.abs(this.currentZoom - this.targetZoom) > 0.001) {
            this.currentZoom = lerp(this.currentZoom, this.targetZoom, this.zoomSpeed * dt);
        } else {
            this.currentZoom = this.targetZoom;
        }

        // Look-ahead logic based on target horizontal speed/direction
        let desiredLookAhead = 0;
        if (targetVx > 50) {
            desiredLookAhead = CAMERA.LOOK_AHEAD;
        } else if (targetVx < -50) {
            desiredLookAhead = -CAMERA.LOOK_AHEAD;
        }
        this.lookAheadX = lerp(this.lookAheadX, desiredLookAhead, CAMERA.LERP_X * dt);

        // Find ideal camera center in world coordinates
        const idealCenterX = targetX + this.lookAheadX;
        const idealCenterY = targetY - 40; // Look slightly above the player

        // Desired top-left corner coords of camera (zoomed centered)
        const halfWidth = (this.viewportWidth / 2) / this.currentZoom;
        const halfHeight = (this.viewportHeight / 2) / this.currentZoom;

        const desiredCamX = idealCenterX - halfWidth;
        const desiredCamY = idealCenterY - halfHeight;

        // Smooth Lerp
        this.camX = lerp(this.camX, desiredCamX, CAMERA.LERP_X * dt);
        this.camY = lerp(this.camY, desiredCamY, CAMERA.LERP_Y * dt);

        // Bound camera in world space
        const maxCamX = Math.max(0, worldWidth - (this.viewportWidth / this.currentZoom));
        const maxCamY = Math.max(0, worldHeight - (this.viewportHeight / this.currentZoom));

        this.camX = clamp(this.camX, 0, maxCamX);
        this.camY = clamp(this.camY, 0, maxCamY);

        // Update Screen Shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            this.shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
            // Decay intensity
            this.shakeIntensity = lerp(this.shakeIntensity, 0, CAMERA.SHAKE_DECAY * dt);
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }
    }

    /**
     * Start a screen shake
     * @param {number} intensity - Initial amplitude in pixels
     * @param {number} duration - Time in seconds
     */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    /**
     * Smoothly zoom camera to target scale
     * @param {number} targetZoom 
     * @param {number} speed 
     */
    zoom(targetZoom, speed = 2.0) {
        this.targetZoom = targetZoom;
        this.zoomSpeed = speed;
    }

    /**
     * Apply camera transformation to Canvas Context
     * @param {CanvasRenderingContext2D} ctx 
     */
    apply(ctx) {
        ctx.save();
        
        // Translate to shake position and zoom about top-left (with proper adjustments)
        if (this.currentZoom !== 1.0) {
            // Scale first, then translate so translation takes zoom level into account
            ctx.scale(this.currentZoom, this.currentZoom);
        }
        
        ctx.translate(
            -this.camX + this.shakeX / this.currentZoom,
            -this.camY + this.shakeY / this.currentZoom
        );
    }

    /**
     * Restore Canvas Context to pre-transformed state
     * @param {CanvasRenderingContext2D} ctx 
     */
    reset(ctx) {
        ctx.restore();
    }

    /**
     * Convert World coordinates to Screen space
     */
    toScreen(worldX, worldY) {
        return {
            x: (worldX - this.camX) * this.currentZoom,
            y: (worldY - this.camY) * this.currentZoom
        };
    }

    /**
     * Convert Screen coordinates to World space
     */
    toWorld(screenX, screenY) {
        return {
            x: (screenX / this.currentZoom) + this.camX,
            y: (screenY / this.currentZoom) + this.camY
        };
    }

    get x() {
        return this.camX;
    }

    get y() {
        return this.camY;
    }

    /**
     * Check if a rectangular bounding box is within viewport for rendering optimization.
     * @returns {boolean}
     */
    isVisible(x, y, w, h) {
        const viewW = this.viewportWidth / this.currentZoom;
        const viewH = this.viewportHeight / this.currentZoom;
        return (
            x + w > this.camX &&
            x < this.camX + viewW &&
            y + h > this.camY &&
            y < this.camY + viewH
        );
    }
};
