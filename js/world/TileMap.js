/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — TileMap Renderer & Data
 * ============================================================
 * Manages the tile layout of the world, handles tile properties, 
 * renders tiles using theme-specific graphics, and handles moving platforms.
 */

'use strict';

window.TileMap = class TileMap {
    constructor(width, height, tiles, theme = 'greenHills') {
        this.width = width;
        this.height = height;
        this.tiles = tiles; // Flat array of tile IDs (width * height)
        this.theme = theme;
        this.animTime = 0;
        this.movingPlatforms = [];
    }

    getTile(tx, ty) {
        if (tx < 0 || tx >= this.width) {
            return TILE.SOLID; // Side walls are solid to block walking off map
        }
        if (ty < 0) {
            return TILE.EMPTY; // Top is open
        }
        if (ty >= this.height) {
            return TILE.EMPTY; // Bottom is open (bottomless pits/wells cause death)
        }
        return this.tiles[ty * this.width + tx];
    }

    setTile(tx, ty, id) {
        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            this.tiles[ty * this.width + tx] = id;
        }
    }

    isSolid(tx, ty) {
        const tile = this.getTile(tx, ty);
        return tile === TILE.SOLID || tile === TILE.COIN_BLOCK || tile === TILE.SECRET;
    }

    isSemiSolid(tx, ty) {
        const tile = this.getTile(tx, ty);
        return tile === TILE.SEMI_SOLID || tile === TILE.CLOUD;
    }

    isHazard(tx, ty) {
        const tile = this.getTile(tx, ty);
        return tile === TILE.SPIKE || tile === TILE.LAVA;
    }

    getWorldWidth() {
        return this.width * TILE_SIZE;
    }

    getWorldHeight() {
        return this.height * TILE_SIZE;
    }

    update(dt) {
        this.animTime += dt;
        
        // Update moving platforms
        for (const p of this.movingPlatforms) {
            p.update(dt);
        }
    }

    addMovingPlatform(platform) {
        this.movingPlatforms.push(platform);
    }

    getMovingPlatform(x, y) {
        // Return a moving platform if it overlaps with position
        for (const p of this.movingPlatforms) {
            const bounds = p.getBounds();
            if (x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h) {
                return p;
            }
        }
        return null;
    }

    /**
     * Render the visible tiles in the camera's viewport
     */
    render(ctx, camera) {
        // Find visible tile ranges
        const startTx = Math.max(0, Math.floor(camera.x / TILE_SIZE));
        const endTx = Math.min(this.width - 1, Math.ceil((camera.x + camera.viewportWidth / camera.currentZoom) / TILE_SIZE));
        const startTy = Math.max(0, Math.floor(camera.y / TILE_SIZE));
        const endTy = Math.min(this.height - 1, Math.ceil((camera.y + camera.viewportHeight / camera.currentZoom) / TILE_SIZE));

        // Get theme palette colors
        const themePalette = this._getThemePalette();

        // Render moving platforms first
        for (const p of this.movingPlatforms) {
            if (camera.isVisible(p.x, p.y, p.width, p.height)) {
                p.render(ctx, camera);
            }
        }

        ctx.save();
        for (let ty = startTy; ty <= endTy; ty++) {
            for (let tx = startTx; tx <= endTx; tx++) {
                const tile = this.getTile(tx, ty);
                if (tile === TILE.EMPTY) continue;

                const x = tx * TILE_SIZE;
                const y = ty * TILE_SIZE;

                this._drawTile(ctx, tile, x, y, themePalette, tx, ty);
            }
        }
        ctx.restore();
    }

    _drawTile(ctx, type, x, y, pal, tx, ty) {
        switch (type) {
            case TILE.SOLID:
                ctx.fillStyle = pal.dirt;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                
                // Draw a grass/snow top layer if the tile above is empty or semi-solid
                const tileAbove = this.getTile(tx, ty - 1);
                if (tileAbove === TILE.EMPTY || tileAbove === TILE.CLOUD || tileAbove === TILE.SEMI_SOLID || tileAbove === TILE.WATER) {
                    ctx.fillStyle = pal.top;
                    ctx.fillRect(x, y, TILE_SIZE, 6);
                    
                    // Draw little hanging grass blades/jagged edge
                    ctx.beginPath();
                    ctx.fillStyle = pal.top;
                    for (let i = 0; i < TILE_SIZE; i += 8) {
                        ctx.moveTo(x + i, y + 6);
                        ctx.lineTo(x + i + 4, y + 10);
                        ctx.lineTo(x + i + 8, y + 6);
                    }
                    ctx.fill();
                }
                
                // Add minor dirt crack details for texture
                ctx.strokeStyle = pal.detail;
                ctx.lineWidth = 1;
                ctx.beginPath();
                if ((tx + ty) % 2 === 0) {
                    ctx.moveTo(x + 8, y + 12);
                    ctx.lineTo(x + 14, y + 16);
                    ctx.lineTo(x + 10, y + 24);
                } else {
                    ctx.moveTo(x + 24, y + 8);
                    ctx.lineTo(x + 18, y + 16);
                }
                ctx.stroke();
                break;

            case TILE.SLOPE_LEFT:
                ctx.fillStyle = pal.dirt;
                ctx.beginPath();
                ctx.moveTo(x, y + TILE_SIZE);
                ctx.lineTo(x + TILE_SIZE, y);
                ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
                ctx.closePath();
                ctx.fill();

                // Grass top on slope
                ctx.strokeStyle = pal.top;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x, y + TILE_SIZE);
                ctx.lineTo(x + TILE_SIZE, y);
                ctx.stroke();
                break;

            case TILE.SLOPE_RIGHT:
                ctx.fillStyle = pal.dirt;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + TILE_SIZE);
                ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
                ctx.closePath();
                ctx.fill();

                // Grass top
                ctx.strokeStyle = pal.top;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
                ctx.stroke();
                break;

            case TILE.WATER:
                ctx.fillStyle = 'rgba(33, 150, 243, 0.45)';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                
                // Wavy top surface
                const surfaceAbove = this.getTile(tx, ty - 1);
                if (surfaceAbove !== TILE.WATER) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    const waveOffset = Math.sin((this.animTime * 4) + (tx * 1.5)) * 3;
                    ctx.fillRect(x, y + waveOffset, TILE_SIZE, 3);
                }
                break;

            case TILE.LAVA:
                // Pulsing orange red lava
                const pulse = Math.abs(Math.sin((this.animTime * 3) + (tx * 0.8)));
                ctx.fillStyle = `rgba(${230 + Math.floor(25 * pulse)}, ${50 + Math.floor(60 * pulse)}, 16, 0.85)`;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                
                const surfaceLavaAbove = this.getTile(tx, ty - 1);
                if (surfaceLavaAbove !== TILE.LAVA) {
                    ctx.fillStyle = '#FFEB3B'; // Glowing yellow crest
                    const waveOffset = Math.cos((this.animTime * 5) + (tx * 1.2)) * 2;
                    ctx.fillRect(x, y + waveOffset, TILE_SIZE, 4);
                }
                break;

            case TILE.ICE:
                ctx.fillStyle = '#E0F7FA';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                
                // Glassy diagonal glares
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 4, y + 4);
                ctx.lineTo(x + TILE_SIZE - 4, y + TILE_SIZE - 4);
                ctx.stroke();
                break;

            case TILE.SPIKE:
                ctx.fillStyle = '#78909C';
                // Draw 3 metal cones pointing upward
                for (let i = 0; i < 3; i++) {
                    const sx = x + (i * 10) + 1;
                    ctx.beginPath();
                    ctx.moveTo(sx, y + TILE_SIZE);
                    ctx.lineTo(sx + 5, y + 4);
                    ctx.lineTo(sx + 10, y + TILE_SIZE);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Tip shine
                    ctx.fillStyle = '#ECEFF1';
                    ctx.fillRect(sx + 4, y + 6, 2, 4);
                    ctx.fillStyle = '#78909C';
                }
                break;

            case TILE.LADDER:
                ctx.fillStyle = '#A1887F'; // Rails
                ctx.fillRect(x + 4, y, 4, TILE_SIZE);
                ctx.fillRect(x + TILE_SIZE - 8, y, 4, TILE_SIZE);
                
                // Rungs
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(x + 4, y + 6, TILE_SIZE - 8, 4);
                ctx.fillRect(x + 4, y + 16, TILE_SIZE - 8, 4);
                ctx.fillRect(x + 4, y + 26, TILE_SIZE - 8, 4);
                break;

            case TILE.VINE:
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x + TILE_SIZE / 2, y);
                ctx.quadraticCurveTo(
                    x + TILE_SIZE / 2 + Math.sin(this.animTime * 2 + ty) * 4, 
                    y + TILE_SIZE / 2, 
                    x + TILE_SIZE / 2, 
                    y + TILE_SIZE
                );
                ctx.stroke();

                // Draw tiny leaves
                ctx.fillStyle = '#81C784';
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2 - 4, y + 10, 3, 0, Math.PI * 2);
                ctx.arc(x + TILE_SIZE / 2 + 4, y + 20, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case TILE.CLOUD:
                // Soft white semi-translucent cloud platform
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(x + 8, y + 18, 12, 0, Math.PI * 2);
                ctx.arc(x + 20, y + 12, 14, 0, Math.PI * 2);
                ctx.arc(x + 28, y + 18, 10, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                break;

            case TILE.COIN_BLOCK:
                // Question block style
                ctx.fillStyle = '#FFA726';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#E65100';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                
                // Golden bolts in corners
                ctx.fillStyle = '#FFE082';
                ctx.fillRect(x + 4, y + 4, 2, 2);
                ctx.fillRect(x + TILE_SIZE - 6, y + 4, 2, 2);
                ctx.fillRect(x + 4, y + TILE_SIZE - 6, 2, 2);
                ctx.fillRect(x + TILE_SIZE - 6, y + TILE_SIZE - 6, 2, 2);

                // Question mark text centered
                ctx.fillStyle = '#E65100';
                ctx.font = 'bold 20px Nunito';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1);
                break;

            case TILE.SEMI_SOLID:
                // Wooden platform slats
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(x, y, TILE_SIZE, 8);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(x, y + 8, TILE_SIZE, 3);
                
                // Supports
                ctx.fillRect(x + 2, y + 11, 4, 8);
                ctx.fillRect(x + TILE_SIZE - 6, y + 11, 4, 8);
                break;

            case TILE.SECRET:
                // Invisible in normal play but we draw a very faint dotted border 
                // for testing, or if the player is in debug/invincible mode.
                // Otherwise it looks completely empty like sky.
                if (window.game && window.game.debugMode) {
                    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.setLineDash([]);
                }
                break;
        }
    }

    _getThemePalette() {
        switch (this.theme) {
            case 'greenHills':
                return { dirt: '#8D6E63', top: '#4CAF50', detail: '#795548' };
            case 'forest':
                return { dirt: '#5D4037', top: '#2E7D32', detail: '#4E342E' };
            case 'river':
                return { dirt: '#6D4C41', top: '#388E3C', detail: '#5D4037' };
            case 'mountain':
                return { dirt: '#78909C', top: '#ECEFF1', detail: '#546E7A' }; // Snow tops
            case 'cave':
                return { dirt: '#424242', top: '#303030', detail: '#212121' };
            case 'desert':
                return { dirt: '#D7CCC8', top: '#FFA726', detail: '#BCAAA4' };
            case 'snow':
                return { dirt: '#90A4AE', top: '#FFFFFF', detail: '#78909C' };
            case 'jungle':
                return { dirt: '#4E342E', top: '#1B5E20', detail: '#3E2723' };
            case 'volcano':
                return { dirt: '#212121', top: '#E65100', detail: '#1a1a1a' };
            case 'haunted':
                return { dirt: '#3E2723', top: '#4A148C', detail: '#21004C' };
            case 'sky':
                return { dirt: '#80DEEA', top: '#FFFFFF', detail: '#4DD0E1' };
            case 'castle':
                return { dirt: '#616161', top: '#424242', detail: '#212121' };
            case 'fortress':
                return { dirt: '#303030', top: '#311B92', detail: '#12005e' };
            default:
                return { dirt: '#8D6E63', top: '#4CAF50', detail: '#795548' };
        }
    }
};
