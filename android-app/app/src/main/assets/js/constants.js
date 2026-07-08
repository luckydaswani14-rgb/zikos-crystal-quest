/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Global Constants
 * ============================================================
 * Shared configuration values used across all game modules.
 * Modify here to tweak game feel globally.
 */

'use strict';

// ── Canvas / Display ──────────────────────────────────────────
const CANVAS_WIDTH  = 1280;
const CANVAS_HEIGHT = 720;
const TARGET_FPS    = 60;
const FIXED_DT      = 1 / TARGET_FPS;   // seconds per frame

// ── World / Tile ──────────────────────────────────────────────
const TILE_SIZE     = 32;   // px
const WORLD_GRAVITY = 1600; // px/s²  (applied per-frame as vy += GRAVITY * dt)

// Tile type IDs
const TILE = Object.freeze({
    EMPTY       : 0,
    SOLID       : 1,
    SLOPE_LEFT  : 2,   // /  (rises left→right)
    SLOPE_RIGHT : 3,   // \  (falls left→right)
    WATER       : 4,
    LAVA        : 5,
    ICE         : 6,
    SPIKE       : 7,
    CHECKPOINT  : 8,
    LADDER      : 9,
    VINE        : 10,
    CLOUD       : 11,  // pass-through platform from below
    WIND_LEFT   : 12,
    WIND_RIGHT  : 13,
    SEMI_SOLID  : 14,  // stand on top, pass through from below
    COIN_BLOCK  : 15,  // hit from below to reveal coin
    SECRET      : 16,  // invisible solid block
});

// ── Physics ───────────────────────────────────────────────────
const MAX_FALL_SPEED    = 900;   // px/s  (terminal velocity)
const WALL_SLIDE_SPEED  = 80;    // px/s  (slow fall while on wall)
const ICE_FRICTION      = 0.98;  // velocity multiplier per frame on ice
const NORMAL_FRICTION   = 0.82;  // ground deceleration factor
const AIR_FRICTION      = 0.92;  // air deceleration factor

// ── Player ────────────────────────────────────────────────────
const PLAYER = Object.freeze({
    WIDTH          : 36,
    HEIGHT         : 52,
    WALK_SPEED     : 200,   // px/s
    RUN_SPEED      : 320,   // px/s
    SPRINT_SPEED   : 460,   // px/s
    JUMP_FORCE     : 580,   // px/s  (applied as negative vy)
    DOUBLE_JUMP    : 520,
    WALL_JUMP_VX   : 300,
    WALL_JUMP_VY   : 520,
    COYOTE_TIME    : 0.12,  // seconds after leaving ground you can still jump
    JUMP_BUFFER    : 0.10,  // seconds before landing a jump press still works
    MAX_HEALTH     : 6,
    INVINCIBLE_TIME: 1.5,   // seconds of invincibility after damage
    ATTACK_RANGE   : 60,    // px reach of basic attack
    ATTACK_DAMAGE  : 2,
    STOMP_DAMAGE   : 3,
});

// ── Enemies ───────────────────────────────────────────────────
const ENEMY = Object.freeze({
    DETECT_RANGE   : 300,   // px — player detection radius
    ATTACK_RANGE   : 48,    // px
    PATROL_SPEED   : 80,
    CHASE_SPEED    : 160,
    FAST_SPEED     : 220,
});

// ── Collectibles ──────────────────────────────────────────────
const COLLECTIBLE = Object.freeze({
    COIN_VALUE  : 10,
    GEM_VALUE   : 100,
    STAR_VALUE  : 250,
    MAGNET_RANGE: 180,  // px  (magnet power-up attracts coins)
});

// ── Camera ────────────────────────────────────────────────────
const CAMERA = Object.freeze({
    LERP_X      : 6,    // horizontal follow speed (higher = snappier)
    LERP_Y      : 5,
    LOOK_AHEAD  : 120,  // px  (camera leads player when running)
    SHAKE_DECAY : 8,    // shake amplitude decay per second
});

// ── Particle ──────────────────────────────────────────────────
const MAX_PARTICLES = 500;

// ── Game States ───────────────────────────────────────────────
const STATE = Object.freeze({
    LOADING    : 'loading',
    MENU       : 'menu',
    MODE_SELECT: 'modeSelect',
    PLAYING    : 'playing',
    PAUSED     : 'paused',
    GAME_OVER  : 'gameover',
    VICTORY    : 'victory',
    TRANSITION : 'transition',
    CUTSCENE   : 'cutscene',
    SETTINGS   : 'settings',
    ACHIEVEMENTS: 'achievements',
});

// ── Difficulty Modes ─────────────────────────────────────────
const DIFFICULTY = Object.freeze({
    EASY  : { lives: 10, enemySpeed: 0.7, checkpointMult: 2,   healthMult: 1.5, coinMult: 1.5 },
    MEDIUM: { lives: 5,  enemySpeed: 1.0, checkpointMult: 1,   healthMult: 1.0, coinMult: 1.0 },
    HARD  : { lives: 3,  enemySpeed: 1.4, checkpointMult: 0.5, healthMult: 0.8, coinMult: 0.8 },
});

// ── World Themes ──────────────────────────────────────────────
const WORLDS = Object.freeze([
    { id: 1,  name: 'Green Hills',      theme: 'greenHills', music: 'world1'   },
    { id: 2,  name: 'Mystic Forest',    theme: 'forest',     music: 'world2'   },
    { id: 3,  name: 'River Valley',     theme: 'river',      music: 'world3'   },
    { id: 4,  name: 'Mountain Peaks',   theme: 'mountain',   music: 'world4'   },
    { id: 5,  name: 'Underground Cave', theme: 'cave',       music: 'world5'   },
    { id: 6,  name: 'Scorched Desert',  theme: 'desert',     music: 'world6'   },
    { id: 7,  name: 'Frozen Tundra',    theme: 'snow',       music: 'world7'   },
    { id: 8,  name: 'Wild Jungle',      theme: 'jungle',     music: 'world8'   },
    { id: 9,  name: 'Volcano Peak',     theme: 'volcano',    music: 'world9'   },
    { id: 10, name: 'Haunted Forest',   theme: 'haunted',    music: 'world10'  },
    { id: 11, name: 'Sky Kingdom',      theme: 'sky',        music: 'world11'  },
    { id: 12, name: 'Ancient Castle',   theme: 'castle',     music: 'world12'  },
    { id: 13, name: 'Final Fortress',   theme: 'fortress',   music: 'boss'     },
]);

// ── Colors palette ────────────────────────────────────────────
const COLORS = Object.freeze({
    ZIKO_SKIN  : '#FDBCB4',
    ZIKO_HAIR  : '#1A1A2E',
    ZIKO_SHIRT : '#E53935',
    ZIKO_SHORTS: '#FDD835',
    ZIKO_SHOES : '#1E88E5',
    ZIKO_EYE   : '#FFFFFF',
    ZIKO_PUPIL : '#2C2C2C',
    COIN_GOLD  : '#FFD700',
    GEM_BLUE   : '#42A5F5',
    GEM_RED    : '#EF5350',
    GEM_GREEN  : '#66BB6A',
    GEM_PURPLE : '#AB47BC',
    CRYSTAL    : '#B2EBF2',
    SHADOW     : 'rgba(0,0,0,0.35)',
    UI_BG      : 'rgba(0,0,0,0.65)',
    UI_BORDER  : '#FFD700',
    HEALTH_RED : '#E53935',
    HEALTH_BG  : '#880000',
    HUD_TEXT   : '#FFFFFF',
    HUD_OUTLINE: '#000000',
});

// ── Audio track names ─────────────────────────────────────────
const MUSIC = Object.freeze({
    MENU      : 'menu',
    WORLD1    : 'world1',
    WORLD2    : 'world2',
    WORLD3    : 'world3',
    WORLD4    : 'world4',
    WORLD5    : 'world5',
    WORLD6    : 'world6',
    WORLD7    : 'world7',
    WORLD8    : 'world8',
    WORLD9    : 'world9',
    WORLD10   : 'world10',
    WORLD11   : 'world11',
    WORLD12   : 'world12',
    BOSS      : 'boss',
    VICTORY   : 'victory',
    GAME_OVER : 'gameover',
});

const SFX = Object.freeze({
    JUMP        : 'jump',
    DOUBLE_JUMP : 'doublejump',
    LAND        : 'land',
    COIN        : 'coin',
    GEM         : 'gem',
    HURT        : 'hurt',
    DIE         : 'die',
    ATTACK      : 'attack',
    ENEMY_DIE   : 'enemydie',
    CHECKPOINT  : 'checkpoint',
    POWERUP     : 'powerup',
    LEVEL_WIN   : 'levelwin',
    BOSS_HIT    : 'bosshit',
    EXPLOSION   : 'explosion',
    SPLASH      : 'splash',
    STOMP       : 'stomp',
    WALL_JUMP   : 'walljump',
    SLIDE       : 'slide',
    CRYSTAL     : 'crystal',
    BOLT_SHIELD : 'boltshield',
    BOLT_HEAL   : 'boltheal',
    BOLT_CANNON : 'boltcannon',
});

// ── Achievement IDs ───────────────────────────────────────────
const ACHIEVEMENTS = Object.freeze({
    FIRST_VICTORY   : 'firstVictory',
    COIN_COLLECTOR  : 'coinCollector',
    TREASURE_HUNTER : 'treasureHunter',
    BOSS_SLAYER     : 'bossSlayer',
    EXPLORER        : 'explorer',
    SPEED_RUNNER    : 'speedRunner',
    SECRET_FINDER   : 'secretFinder',
    MASTER_ADVENTURER: 'masterAdventurer',
    NO_DAMAGE_BOSS  : 'noDamageBoss',
    DOUBLE_JUMP_ACE : 'doubleJumpAce',
    COMBO_KING      : 'comboKing',
    CRYSTAL_COMPLETE: 'crystalComplete',
});

// ── Power-up types ────────────────────────────────────────────
const POWERUP_TYPE = Object.freeze({
    SPEED       : 'speed',
    FIRE        : 'fire',
    ICE         : 'ice',
    SHIELD      : 'shield',
    MAGNET      : 'magnet',
    DOUBLE_COIN : 'doublecoin',
    INVINCIBLE  : 'invincible',
    EXTRA_LIFE  : 'extralife',
    HEAL        : 'heal',
});

// ── Utility: clamp ────────────────────────────────────────────
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function lerp(a, b, t)        { return a + (b - a) * t; }
function rnd(min, max)        { return Math.random() * (max - min) + min; }
function rndInt(min, max)     { return Math.floor(rnd(min, max + 1)); }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function degToRad(d)          { return d * Math.PI / 180; }
function sign(x)              { return x < 0 ? -1 : x > 0 ? 1 : 0; }

/**
 * Procedural Map Parser Utility
 * Converts compact visual ASCII templates into Level JSON structures
 */
window.parseVisualMap = function(config) {
    const map = config.map;
    const tileHeight = map.length;
    const tileWidth = map[0].length;
    const tiles = new Array(tileWidth * tileHeight).fill(0);
    
    const enemies = [];
    const collectibles = [];
    let spawnPoint = { x: 64, y: 300 };
    let boss = null;

    // Powerup rotation list to cycle through if not explicitly specified
    const powerupsList = ['shield', 'speed', 'magnet', 'invincible', 'heal', 'doublecoin'];
    let powerupCounter = 0;

    for (let ty = 0; ty < tileHeight; ty++) {
        const row = map[ty];
        for (let tx = 0; tx < tileWidth; tx++) {
            const char = row[tx];
            const idx = ty * tileWidth + tx;
            const px = tx * TILE_SIZE;
            const py = ty * TILE_SIZE;

            switch (char) {
                // Solids
                case '#': tiles[idx] = TILE.SOLID; break;
                case '/': tiles[idx] = TILE.SLOPE_LEFT; break;
                case '\\': tiles[idx] = TILE.SLOPE_RIGHT; break;
                case '~': tiles[idx] = TILE.WATER; break;
                case '*': tiles[idx] = TILE.LAVA; break;
                case 'i': tiles[idx] = TILE.ICE; break;
                case '^': tiles[idx] = TILE.SPIKE; break;
                case 'l': tiles[idx] = TILE.LADDER; break;
                case 'v': tiles[idx] = TILE.VINE; break;
                case 'C': tiles[idx] = TILE.CLOUD; break;
                case '<': tiles[idx] = TILE.WIND_LEFT; break;
                case '>': tiles[idx] = TILE.WIND_RIGHT; break;
                case 'S': tiles[idx] = TILE.SEMI_SOLID; break;
                case '?': tiles[idx] = TILE.COIN_BLOCK; break;
                case 'X': tiles[idx] = TILE.SECRET; break;

                // Spawners
                case 'P': 
                    spawnPoint = { x: px, y: py }; 
                    break;
                case 'k': 
                    tiles[idx] = TILE.CHECKPOINT;
                    collectibles.push({ type: 'checkpoint', x: px, y: py }); 
                    break;
                case 'c': 
                    collectibles.push({ type: 'coin', x: px + 6, y: py + 6, value: 1, subtype: 'gold' }); 
                    break;
                case 'g': 
                    collectibles.push({ type: 'gem', x: px + 4, y: py + 4, subtype: 'blue' }); 
                    break;
                case 'd': 
                    collectibles.push({ type: 'gem', x: px + 4, y: py + 4, subtype: 'diamond' }); 
                    break;
                case 'p': 
                    const pType = powerupsList[powerupCounter % powerupsList.length];
                    powerupCounter++;
                    collectibles.push({ type: 'powerup', x: px, y: py, subtype: pType }); 
                    break;
                case 'x': 
                    collectibles.push({ type: 'crystal', x: px, y: py }); 
                    break;

                // Boss
                case 'B':
                    boss = { type: 'ShadowKing', x: px, y: py };
                    break;

                // Enemies
                case '1': // Slime
                    enemies.push({ type: 'Slime', x: px, y: py, patrolLeft: px - 96, patrolRight: px + 96 });
                    break;
                case '2': // Bat
                    enemies.push({ type: 'Bat', x: px, y: py, patrolLeft: px - 128, patrolRight: px + 128 });
                    break;
                case '3': // FireSprite
                    enemies.push({ type: 'FireSprite', x: px, y: py, patrolLeft: px - 96, patrolRight: px + 96 });
                    break;
                case '4': // IceGolem
                    enemies.push({ type: 'IceGolem', x: px, y: py, patrolLeft: px - 64, patrolRight: px + 64 });
                    break;
                case '5': // ShieldKnight
                    enemies.push({ type: 'ShieldKnight', x: px, y: py, patrolLeft: px - 96, patrolRight: px + 96 });
                    break;
                case '6': // GiantBrute
                    enemies.push({ type: 'GiantBrute', x: px, y: py, patrolLeft: px - 120, patrolRight: px + 120 });
                    break;
                case '7': // JumpingFrog
                    enemies.push({ type: 'JumpingFrog', x: px, y: py, patrolLeft: px - 96, patrolRight: px + 96 });
                    break;
                case '8': // FlyingDragon
                    enemies.push({ type: 'FlyingDragon', x: px, y: py, patrolLeft: px - 160, patrolRight: px + 160 });
                    break;
            }
        }
    }

    return {
        id: config.id,
        name: config.name,
        theme: config.theme,
        music: config.music,
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        tiles: tiles,
        spawnPoint: spawnPoint,
        enemies: enemies,
        collectibles: collectibles,
        platforms: config.platforms || [],
        boss: boss,
        secrets: config.secrets || []
    };
};

