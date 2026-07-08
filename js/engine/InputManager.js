/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Input Manager
 * ============================================================
 * Handles keyboard events and touch input button overlays, 
 * maintaining state for currently held keys and new presses/releases.
 */

'use strict';

window.InputManager = class InputManager {
    constructor() {
        this.keys = {};       // Current frame held keys
        this.prevKeys = {};   // Previous frame held keys

        this.touchButtons = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false,
            attack: false,
            sprint: false,
            special: false,
            pause: false
        };

        this.keyMap = {
            'ArrowLeft': 'left',  'KeyA': 'left',
            'ArrowRight': 'right', 'KeyD': 'right',
            'ArrowUp': 'up',     'KeyW': 'up',
            'ArrowDown': 'down',   'KeyS': 'down',
            'Space': 'jump',
            'Enter': 'jump',
            'NumpadEnter': 'jump',
            'KeyX': 'attack',     'KeyJ': 'attack',
            'ShiftLeft': 'sprint', 'ShiftRight': 'sprint', 'KeyK': 'sprint',
            'KeyC': 'special',    'KeyL': 'special',
            'Escape': 'pause',    'KeyP': 'pause'
        };

        // Swipe gesture state
        this.touchStartX = 0;
        this.touchStartY = 0;

        this.bindEvents();
    }

    bindEvents() {
        this.onKeyDown = this._onKeyDown.bind(this);
        this.onKeyUp = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);

        // Add touch gestures directly on the document (for swipes if needed)
        this.onTouchStart = this._onTouchStart.bind(this);
        this.onTouchEnd = this._onTouchEnd.bind(this);

        window.addEventListener('touchstart', this.onTouchStart, { passive: true });
        window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    }

    destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('touchstart', this.onTouchStart);
        window.removeEventListener('touchend', this.onTouchEnd);
    }

    update() {
        // Copy current keys state to previous keys state
        this.prevKeys = { ...this.keys };
    }

    /**
     * Is an action currently held down?
     * @param {string} action 
     * @returns {boolean}
     */
    isDown(action) {
        // Return true if keyboard key is down or touch button is active
        if (this.touchButtons[action]) return true;

        for (const [key, act] of Object.entries(this.keyMap)) {
            if (act === action && this.keys[key]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Was an action pressed in the current frame?
     * @param {string} action 
     * @returns {boolean}
     */
    isJustPressed(action) {
        // Check keyboard
        let keyJustPressed = false;
        for (const [key, act] of Object.entries(this.keyMap)) {
            if (act === action && this.keys[key] && !this.prevKeys[key]) {
                keyJustPressed = true;
                break;
            }
        }
        return keyJustPressed;
    }

    /**
     * Was an action released in the current frame?
     * @param {string} action 
     * @returns {boolean}
     */
    isJustReleased(action) {
        let keyJustReleased = false;
        for (const [key, act] of Object.entries(this.keyMap)) {
            if (act === action && !this.keys[key] && this.prevKeys[key]) {
                keyJustReleased = true;
                break;
            }
        }
        return keyJustReleased;
    }

    /**
     * Compatibility helpers for Menu / PauseMenu interfaces
     */
    isActionJustPressed(action) {
        let mappedAction = action;
        if (action === 'action') mappedAction = 'jump';
        if (action === 'back') mappedAction = 'pause';
        return this.isJustPressed(mappedAction);
    }

    isActionDown(action) {
        let mappedAction = action;
        if (action === 'action') mappedAction = 'jump';
        if (action === 'back') mappedAction = 'pause';
        return this.isDown(mappedAction);
    }

    /**
     * Explicitly set the status of a touch button. Called by index.html touch elements.
     * @param {string} action 
     * @param {boolean} isPressed 
     */
    setTouchButton(action, isPressed) {
        if (action in this.touchButtons) {
            this.touchButtons[action] = isPressed;
        }
    }

    _onKeyDown(e) {
        this.keys[e.code] = true;
        // Prevent default for space and arrow keys to avoid scrolling page
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.code)) {
            e.preventDefault();
        }
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
    }

    _onTouchStart(e) {
        if (e.touches && e.touches.length > 0) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }
    }

    _onTouchEnd(e) {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;

        // Swipe detection (e.g. swipe up to jump)
        if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
            if (deltaY < 0) {
                // Swipe Up
                this.touchButtons['jump'] = true;
                setTimeout(() => this.touchButtons['jump'] = false, 100);
            }
        }
    }
};
