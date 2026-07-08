/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Moving Platforms
 * ============================================================
 * Defines different types of moving, circular, falling, and crumbling
 * platforms that the player can ride.
 */

'use strict';

window.Platform = class Platform {
    constructor(x, y, width, height, config = {}) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.width = width;
        this.height = height;

        // Path settings
        this.endX = config.endX !== undefined ? config.endX : x;
        this.endY = config.endY !== undefined ? config.endY : y;
        this.speed = config.speed !== undefined ? config.speed : 100; // px/s
        this.type = config.type || 'horizontal'; // horizontal, vertical, circular, falling, crumbling

        // Physics State
        this.vx = 0;
        this.vy = 0;
        this.phase = 0; // Cycle progress (0 to 1)
        this.direction = 1;

        // Special settings
        this.falling = false;
        this.fallTimer = 0;
        this.fallDelay = config.fallDelay || 0.6; // Time player must stand before platform falls
        this.respawnTimer = 0;
        this.respawnDelay = config.respawnDelay || 3.0; // Time to respawn after falling
        this.alive = true;
        this.crumbleProgress = 0;

        // Color and theme
        this.theme = config.theme || 'greenHills';
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }

    getVelocity() {
        return { vx: this.vx, vy: this.vy };
    }

    update(dt) {
        if (!this.alive) {
            this.vx = 0;
            this.vy = 0;
            this.respawnTimer += dt;
            if (this.respawnTimer >= this.respawnDelay) {
                this.respawn();
            }
            return;
        }

        // Handle falling platform physics
        if (this.type === 'falling' && this.falling) {
            this.fallTimer += dt;
            if (this.fallTimer >= this.fallDelay) {
                // Apply fall gravity
                this.vy += 800 * dt;
                this.vx = 0;
                this.y += this.vy * dt;

                // Deactivate if far off screen
                if (this.y > this.startY + 600) {
                    this.alive = false;
                }
            } else {
                // Shake slightly to indicate it's about to fall
                this.x = this.startX + (Math.random() * 4 - 2);
                this.y = this.startY;
            }
            return;
        }

        // Handle crumbling platform
        if (this.type === 'crumbling' && this.falling) {
            this.fallTimer += dt;
            this.crumbleProgress = clamp(this.fallTimer / this.fallDelay, 0, 1);
            if (this.fallTimer >= this.fallDelay) {
                this.alive = false; // Just disappears
            }
            return;
        }

        // Standard movement cycles
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            const cycleDuration = distance / this.speed;
            
            if (this.type === 'circular') {
                // Circular path around midpoint of start and end
                const centerX = (this.startX + this.endX) / 2;
                const centerY = (this.startY + this.endY) / 2;
                const radius = distance / 2;
                
                this.phase += (this.speed / radius) * dt * this.direction * 0.15;
                
                const prevX = this.x;
                const prevY = this.y;
                
                this.x = centerX + Math.cos(this.phase) * radius;
                this.y = centerY + Math.sin(this.phase) * radius;
                
                this.vx = (this.x - prevX) / dt;
                this.vy = (this.y - prevY) / dt;
            } else {
                // Horizontal / Vertical patrol ping-pong
                this.phase += (dt / cycleDuration) * this.direction;
                if (this.phase >= 1.0) {
                    this.phase = 1.0;
                    this.direction = -1;
                } else if (this.phase <= 0.0) {
                    this.phase = 0.0;
                    this.direction = 1;
                }

                const targetX = this.startX + dx * this.phase;
                const targetY = this.startY + dy * this.phase;

                this.vx = (targetX - this.x) / dt;
                this.vy = (targetY - this.y) / dt;

                this.x = targetX;
                this.y = targetY;
            }
        }
    }

    triggerFall() {
        if (!this.falling && (this.type === 'falling' || this.type === 'crumbling')) {
            this.falling = true;
            this.fallTimer = 0;
            this.vy = 0;
        }
    }

    respawn() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.phase = 0;
        this.direction = 1;
        this.falling = false;
        this.fallTimer = 0;
        this.respawnTimer = 0;
        this.crumbleProgress = 0;
        this.alive = true;
    }

    render(ctx, camera) {
        if (!this.alive) return;

        ctx.save();
        
        // Handle crumbling fade
        if (this.type === 'crumbling' && this.falling) {
            ctx.globalAlpha = 1.0 - this.crumbleProgress;
        }

        // Draw styled platform block
        const fillColor = this._getThemeColor();
        const strokeColor = '#212121';

        // Base rounded rect
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 6);
        ctx.fill();
        ctx.stroke();

        // Draw structural details (glares / slats)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 4);

        if (this.type === 'crumbling') {
            // Draw cracks on crumbling platform
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y + 2);
            ctx.lineTo(this.x + 15, this.y + 12);
            ctx.moveTo(this.x + this.width - 20, this.y + 4);
            ctx.lineTo(this.x + this.width - 15, this.y + 10);
            ctx.stroke();
        }

        // Draw visual bolts on sides
        ctx.fillStyle = '#CFD8DC';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y + this.height / 2, 3, 0, Math.PI * 2);
        ctx.arc(this.x + this.width - 8, this.y + this.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _getThemeColor() {
        switch (this.theme) {
            case 'greenHills': return '#8D6E63'; // Brown log look
            case 'forest':     return '#4E342E';
            case 'river':      return '#5D4037';
            case 'mountain':   return '#78909C';
            case 'cave':       return '#37474F';
            case 'desert':     return '#FFB74D'; // Sandy orange
            case 'snow':       return '#B0BEC5'; // Frozen block
            case 'jungle':     return '#3E2723';
            case 'volcano':    return '#424242'; // Dark volcanic rock
            case 'haunted':    return '#4A148C';
            case 'sky':        return '#81D4FA'; // Clouds / light blue
            case 'castle':     return '#616161';
            case 'fortress':   return '#212121';
            default:           return '#8D6E63';
        }
    }
};
