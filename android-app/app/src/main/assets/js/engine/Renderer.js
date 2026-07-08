/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Renderer Utility
 * ============================================================
 * Handles letterboxed resizing for 16:9 aspect ratio, high-DPI
 * scaling, and drawing utilities like text with stroke/shadow 
 * and custom bars.
 */

'use strict';

window.Renderer = class Renderer {
    constructor(canvas) {
        this.el = canvas;
        this.context = canvas.getContext('2d');

        // Target size coordinates
        this.baseWidth = CANVAS_WIDTH;
        this.baseHeight = CANVAS_HEIGHT;

        // Scaling factors
        this.sX = 1;
        this.sY = 1;
        this.offX = 0;
        this.offY = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const targetAspect = this.baseWidth / this.baseHeight;
        const windowAspect = windowWidth / windowHeight;

        let canvasWidth, canvasHeight;

        // Letterboxing calculations
        if (windowAspect > targetAspect) {
            // Screen is wider than 16:9 aspect ratio
            canvasHeight = windowHeight;
            canvasWidth = canvasHeight * targetAspect;
            this.offX = (windowWidth - canvasWidth) / 2;
            this.offY = 0;
        } else {
            // Screen is taller than 16:9 aspect ratio
            canvasWidth = windowWidth;
            canvasHeight = canvasWidth / targetAspect;
            this.offX = 0;
            this.offY = (windowHeight - canvasHeight) / 2;
        }

        // Set screen CSS bounds
        this.el.style.position = 'absolute';
        this.el.style.left = `${this.offX}px`;
        this.el.style.top = `${this.offY}px`;
        this.el.style.width = `${canvasWidth}px`;
        this.el.style.height = `${canvasHeight}px`;

        // Handle Retina/High-DPI backing store scaling
        const dpr = window.devicePixelRatio || 1;
        this.el.width = canvasWidth * dpr;
        this.el.height = canvasHeight * dpr;

        // Scale the canvas drawing context to support high DPI + base coordinates
        this.context.restore();
        this.context.save();
        
        // Scale to handle DPI
        this.context.scale(dpr, dpr);
        // Scale to translate 1280x720 base units to CSS width/height
        this.sX = canvasWidth / this.baseWidth;
        this.sY = canvasHeight / this.baseHeight;
        this.context.scale(this.sX, this.sY);
    }

    clear(color = '#000000') {
        const ctx = this.context;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
    }

    /**
     * Draw styled text on Canvas
     */
    drawText(ctx, text, x, y, options = {}) {
        const opt = {
            size: 24,
            font: 'Nunito',
            color: '#FFFFFF',
            align: 'left',
            shadow: false,
            shadowColor: '#000000',
            shadowBlur: 4,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            opacity: 1,
            ...options
        };

        ctx.save();
        ctx.globalAlpha = opt.opacity;
        ctx.font = `${opt.size}px ${opt.font === 'Fredoka One' ? 'Fredoka One' : 'Nunito, sans-serif'}`;
        ctx.textAlign = opt.align;
        ctx.textBaseline = 'middle';

        // Apply drop shadow
        if (opt.shadow) {
            ctx.shadowColor = opt.shadowColor;
            ctx.shadowBlur = opt.shadowBlur;
            ctx.shadowOffsetX = opt.shadowOffsetX;
            ctx.shadowOffsetY = opt.shadowOffsetY;
        }

        // Stroke Outline
        if (opt.outline) {
            ctx.strokeStyle = opt.outlineColor;
            ctx.lineWidth = opt.outlineWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(text, x, y);
        }

        // Remove shadow before fill to prevent double shadows on outlines
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = opt.color;
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    /**
     * Draw a rounded rectangle helper
     */
    drawRoundRect(ctx, x, y, w, h, radius, fillColor = null, strokeColor = null, strokeWidth = 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }

        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Draw a custom health/shield bar
     */
    drawHealthBar(ctx, x, y, w, h, current, max, color = '#E53935', bgColor = '#880000') {
        const pct = clamp(current / max, 0, 1);
        
        // Background
        this.drawRoundRect(ctx, x, y, w, h, h / 2, bgColor, '#000000', 2);
        
        // Filled segment
        if (pct > 0) {
            const fillWidth = (w - 4) * pct;
            this.drawRoundRect(ctx, x + 2, y + 2, fillWidth, h - 4, (h - 4) / 2, color);
        }
    }

    /**
     * Draw a progress bar with an optional text label
     */
    drawProgressBar(ctx, x, y, w, h, progress, fillColor = '#42A5F5', bgColor = '#1A1A3E', label = '') {
        const pct = clamp(progress, 0, 1);
        
        // Background
        this.drawRoundRect(ctx, x, y, w, h, 4, bgColor, '#000000', 1);

        // Filled segment
        if (pct > 0) {
            const fillWidth = (w - 2) * pct;
            this.drawRoundRect(ctx, x + 1, y + 1, fillWidth, h - 2, 3, fillColor);
        }

        if (label) {
            this.drawText(ctx, label, x + w / 2, y + h / 2, {
                size: h - 4,
                font: 'Nunito',
                color: '#FFFFFF',
                align: 'center',
                outline: true,
                outlineColor: '#000000',
                outlineWidth: 2
            });
        }
    }

    get canvas() { return this.el; }
    get ctx()    { return this.context; }
    get scaleX() { return this.sX; }
    get scaleY() { return this.sY; }
    get offsetX() { return this.offX; }
    get offsetY() { return this.offY; }
};
