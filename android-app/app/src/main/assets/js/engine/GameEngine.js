/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Core Game Engine
 * ============================================================
 * Coordinates the master RAF loop, transitions game states (MENU, 
 * PLAYING, SETTINGS, etc.), handles autosaves, unlocks achievements,
 * and handles resizing callbacks.
 */

'use strict';

window.GameEngine = class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.state = STATE.LOADING;
        this.previousState = STATE.LOADING;
        this.stateTime = 0;

        // Engine Systems
        this.renderer = null;
        this.input = null;
        this.audio = null;
        this.save = null;
        this.particles = null;
        this.camera = null;

        // Gameplay state
        this.level = null;
        this.currentLevelId = 1;
        this.totalCoins = 0;
        this.totalGems = 0;
        this.totalScore = 0;
        this.achievements = {};
        this.settings = {};
        this.difficultySettings = DIFFICULTY.MEDIUM;

        // UI Modules
        this.menu = null;
        this.hud = null;
        this.pauseMenu = null;
        this.gameOverScreen = null;
        this.victoryScreen = null;
        this.settingsMenu = null;
        this.achievementsScreen = null;

        // FPS meter
        this.fps = 0;
        this.fpsTimer = 0;
        this.fpsCounter = 0;

        // Transitions fade
        this.transitionAlpha = 0;
        this.transitionTargetState = null;
        this.transitionDirection = 0; // 0 = none, 1 = fade in, -1 = fade out

        this.debugMode = false;
    }

    init() {
        // 1. Initialize core systems
        this.renderer = new window.Renderer(this.canvas);
        this.input = new window.InputManager();
        this.audio = new window.AudioManager();
        this.save = new window.SaveManager();
        this.particles = new window.ParticleSystem();
        this.camera = new window.Camera(CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Load Settings & Achievements
        this.settings = this.save.loadSettings();
        this.achievements = this.save.loadAchievements();
        this.audio.setMusicVolume(this.settings.musicVolume);
        this.audio.setSfxVolume(this.settings.sfxVolume);
        this.setDifficulty(this.settings.difficulty || 'MEDIUM');

        // 3. Initialize UI screens
        this.menu = new window.Menu(this);
        this.hud = new window.HUD();
        this.pauseMenu = new window.PauseMenu(this);
        this.gameOverScreen = new window.GameOver(this);
        this.victoryScreen = new window.Victory(this);
        this.settingsMenu = new window.Settings(this);
        this.achievementsScreen = new window.AchievementsScreen(this);

        // Hide HTML loading screen loader spinner overlay
        const loader = document.getElementById('loading-screen');
        if (loader) loader.classList.add('hidden');

        // 4. Enter Main Menu State
        this.setState(STATE.MENU);
    }

    start() {
        // Begin the RequestAnimationFrame game loop
        let lastTime = performance.now();
        let accumulator = 0;

        const loop = (time) => {
            let dt = (time - lastTime) / 1000; // seconds
            lastTime = time;

            // Cap delta time to prevent spiraling on slow framerates
            dt = Math.min(dt, 0.1);

            // FPS calculations
            this.fpsTimer += dt;
            this.fpsCounter++;
            if (this.fpsTimer >= 1.0) {
                this.fps = this.fpsCounter;
                this.fpsCounter = 0;
                this.fpsTimer = 0;
            }

            // Fixed step physics updates
            accumulator += dt;
            while (accumulator >= FIXED_DT) {
                this.update(FIXED_DT);
                accumulator -= FIXED_DT;
            }

            // Render current frame
            this.render();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update(dt) {
        this.stateTime += dt;

        // Transition fading
        if (this.transitionDirection !== 0) {
            this._updateTransition(dt);
            return; // Lock standard game inputs during transitions
        }

        // Global Escape pause toggle
        if (this.input.isJustPressed('pause')) {
            if (this.state === STATE.PLAYING) {
                this.pauseGame();
            } else if (this.state === STATE.PAUSED) {
                this.resumeGame();
            }
        }

        // Dispatch state updates
        switch (this.state) {
            case STATE.MENU:
                this.menu.update(dt, this.input);
                break;
            case STATE.PLAYING:
                if (this.level) this.level.update(dt);
                this.hud.update(dt);
                break;
            case STATE.PAUSED:
                this.pauseMenu.update(dt, this.input);
                break;
            case STATE.GAME_OVER:
                this.gameOverScreen.update(dt, this.input);
                break;
            case STATE.VICTORY:
                this.victoryScreen.update(dt, this.input);
                break;
            case STATE.SETTINGS:
                this.settingsMenu.update(dt, this.input);
                break;
            case STATE.ACHIEVEMENTS:
                this.achievementsScreen.update(dt, this.input);
                break;
        }

        // Update global inputs
        this.input.update();
    }

    render() {
        const ctx = this.renderer.ctx;

        // Clear canvas base background
        this.renderer.clear('#0d0d1a');

        // Dispatch render states
        switch (this.state) {
            case STATE.MENU:
                this.menu.render(ctx);
                break;
            case STATE.PLAYING:
                if (this.level) this.level.render(ctx);
                break;
            case STATE.PAUSED:
                // Draw game level frozen in background, overlay translucent glass panel
                if (this.level) this.level.render(ctx);
                this.pauseMenu.render(ctx, this.level ? this.level.player : null, this.level);
                break;
            case STATE.GAME_OVER:
                this.gameOverScreen.render(ctx, this.level ? this.level.player : null);
                break;
            case STATE.VICTORY:
                this.victoryScreen.render(ctx, this.level ? this.level.player : null, this.level, this.victoryScreen.isFullVictory);
                break;
            case STATE.SETTINGS:
                this.settingsMenu.render(ctx);
                break;
            case STATE.ACHIEVEMENTS:
                this.achievementsScreen.render(ctx);
                break;
        }

        // Render screen transition overlay if active
        if (this.transitionDirection !== 0 || this.transitionAlpha > 0) {
            ctx.fillStyle = `rgba(13, 13, 26, ${this.transitionAlpha})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }

    setState(newState, data = {}) {
        this.previousState = this.state;
        this.state = newState;
        this.stateTime = 0;

        // Start transitions
        switch (newState) {
            case STATE.MENU:
                this.audio.playMusic(MUSIC.MENU);
                break;
            case STATE.PLAYING:
                // Music is loaded by level script
                break;
            case STATE.SETTINGS:
                // Settings retains current music
                break;
            case STATE.ACHIEVEMENTS:
                break;
        }
    }

    /**
     * Start a smooth fade-to-black state transition
     */
    transitionToState(targetState, onMidFade = null) {
        this.transitionDirection = 1; // Fade in (blackout)
        this.transitionTargetState = targetState;
        this.onMidFadeCallback = onMidFade;
    }

    _updateTransition(dt) {
        const fadeSpeed = 2.0; // 0.5 seconds full fade
        if (this.transitionDirection === 1) {
            this.transitionAlpha += fadeSpeed * dt;
            if (this.transitionAlpha >= 1.0) {
                this.transitionAlpha = 1.0;
                this.transitionDirection = -1; // Fade back out
                
                // Perform state switch
                this.setState(this.transitionTargetState);
                if (this.onMidFadeCallback) {
                    this.onMidFadeCallback();
                    this.onMidFadeCallback = null;
                }
            }
        } else if (this.transitionDirection === -1) {
            this.transitionAlpha -= fadeSpeed * dt;
            if (this.transitionAlpha <= 0.0) {
                this.transitionAlpha = 0.0;
                this.transitionDirection = 0; // stop
            }
        }
    }

    loadLevel(levelId) {
        this.currentLevelId = levelId;
        this.transitionToState(STATE.PLAYING, () => {
            this.level = new window.Level(this);
            this.level.load(levelId);
        });
    }

    startGame() {
        this.totalCoins = 0;
        this.totalGems = 0;
        this.totalScore = 0;
        this.loadLevel(1);
    }

    loadGame(slotIndex) {
        const slot = slotIndex + 1;
        const data = this.save.load(slot);
        if (data) {
            this.totalScore = data.totalScore || 0;
            this.totalCoins = data.totalCoins || 0;
            this.totalGems = data.totalGems || 0;
            this.currentLevelId = data.currentLevelId || 1;
            if (data.difficulty) {
                this.setDifficulty(data.difficulty);
            }
            this.loadLevel(this.currentLevelId);
        } else {
            this.startGame();
        }
    }

    nextLevel() {
        if (this.currentLevelId < 15) {
            this.loadLevel(this.currentLevelId + 1);
        } else {
            // Defeated whole game! Should not reach nextLevel, handled by ShadowKing death Victory screen
            this.exitToMenu();
        }
    }

    restartLevel() {
        this.loadLevel(this.currentLevelId);
    }

    handlePlayerDeath() {
        if (this.level && this.level.player) {
            this.level.player.lives--;
            if (this.level.player.lives <= 0) {
                // Game Over Screen trigger
                this.audio.stopMusic();
                this.audio.playMusic(MUSIC.GAME_OVER);
                this.setState(STATE.GAME_OVER);
            } else {
                // Respawn at checkpoint/start
                this.transitionToState(STATE.PLAYING, () => {
                    // Retain current score & collect stats, just reset player coords
                    this.level.player.reset(this.level.spawnPoint.x, this.level.spawnPoint.y);
                    this.level.player.health = Math.floor(PLAYER.MAX_HEALTH * this.difficultySettings.healthMult);
                    this.level.player.lives = this.level.player.lives; // retain decreased lives count
                    this.level.enemies.forEach(e => e.respawn ? e.respawn() : null);
                    this.audio.playMusic(window['LEVEL_DATA_' + this.currentLevelId].music || MUSIC.WORLD1);
                });
            }
        }
    }

    pauseGame() {
        this.setState(STATE.PAUSED);
        this.audio.stopMusic();
    }

    resumeGame() {
        this.setState(STATE.PLAYING);
        if (this.level) {
            const data = window['LEVEL_DATA_' + this.currentLevelId];
            this.audio.playMusic(data.music || MUSIC.WORLD1);
        }
    }

    victory() {
        // Unlock appropriate achievements
        this.unlockAchievement(ACHIEVEMENTS.FIRST_VICTORY);
        
        if (this.currentLevelId === 15) {
            this.unlockAchievement(ACHIEVEMENTS.BOSS_SLAYER);
            this.unlockAchievement(ACHIEVEMENTS.CRYSTAL_COMPLETE);
        }

        // Sum stats
        if (this.level && this.level.player) {
            this.totalScore = this.level.player.score;
            this.totalCoins = this.level.player.coins;
            this.totalGems = this.level.player.gems;
        }

        this.victoryScreen.setData(this.level.player, this.level);
        this.setState(STATE.VICTORY);
    }

    exitToMenu() {
        this.audio.stopMusic();
        this.transitionToState(STATE.MENU, () => {
            this.level = null;
        });
    }

    setDifficulty(mode) {
        this.settings.difficulty = mode;
        this.difficultySettings = DIFFICULTY[mode] || DIFFICULTY.MEDIUM;
    }

    unlockAchievement(id) {
        if (!this.achievements[id]) {
            this.achievements[id] = true;
            this.save.saveAchievements(this.achievements);
            
            // Show alert overlay toast
            this.hud.showMessage(`ACHIEVEMENT UNLOCKED!`, 2.5, COLORS.COIN_GOLD, 24);
        }
    }

    /**
     * Autosave checkpoint state helper
     */
    saveCurrentProgress() {
        if (this.level && this.level.player) {
            const state = {
                currentLevelId: this.currentLevelId,
                levelName: this.level.name,
                totalScore: this.level.player.score,
                totalCoins: this.level.player.coins,
                totalGems: this.level.player.gems,
                lives: this.level.player.lives,
                difficulty: this.settings.difficulty
            };
            // Save to Slot 1 by default for autosave
            this.save.save(1, state);
        }
    }
};
