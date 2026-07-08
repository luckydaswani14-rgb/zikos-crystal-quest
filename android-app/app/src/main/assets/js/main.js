/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Core Mounting Entry Point
 * ============================================================
 * Loaded after all systems, UI, and level files. Initializes 
 * the game engine and binds touch overlay buttons for mobile compatibility.
 */

'use strict';

window.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas element #gameCanvas was not found in index.html!");
        return;
    }

    // 1. Create global Game Engine instance
    window.game = new window.GameEngine(canvas);
    
    // 2. Initialize systems
    window.game.init();

    // 3. Start RAF loop
    window.game.start();

    // 4. Bind mobile Touch buttons to InputManager action triggers
    const touchButtons = [
        { id: 'btn-left',    action: 'left' },
        { id: 'btn-right',   action: 'right' },
        { id: 'btn-down',    action: 'down' },
        { id: 'btn-jump',    action: 'jump' },
        { id: 'btn-attack',  action: 'attack' },
        { id: 'btn-sprint',  action: 'sprint' },
        { id: 'btn-special', action: 'special' },
        { id: 'btn-pause',   action: 'pause' }
    ];

    touchButtons.forEach(({ id, action }) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Touch triggers
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // User gesture triggers audio engine initialization
            if (window.game && window.game.audio) {
                window.game.audio.init();
            }
            window.game.input.setTouchButton(action, true);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            window.game.input.setTouchButton(action, false);
        }, { passive: false });

        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            window.game.input.setTouchButton(action, false);
        }, { passive: false });

        // Backup mouse clicks for testing mobile UI on desktops
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (window.game && window.game.audio) {
                window.game.audio.init();
            }
            window.game.input.setTouchButton(action, true);
        });

        btn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            window.game.input.setTouchButton(action, false);
        });

        btn.addEventListener('mouseleave', (e) => {
            window.game.input.setTouchButton(action, false);
        });
    });

    // Fullscreen Toggle button listener
    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                    if (window.game && window.game.renderer) window.game.renderer.resize();
                }).catch(err => {
                    console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen().then(() => {
                    if (window.game && window.game.renderer) window.game.renderer.resize();
                });
            }
        });
    }

    // Audio resume on body click/touch gestures
    const resumeAudioContext = () => {
        if (window.game && window.game.audio) {
            window.game.audio.init();
            window.game.audio.resume();
        }
        // Remove listeners once activated
        document.body.removeEventListener('click', resumeAudioContext);
        document.body.removeEventListener('keydown', resumeAudioContext);
        document.body.removeEventListener('touchstart', resumeAudioContext);
    };

    document.body.addEventListener('click', resumeAudioContext);
    document.body.addEventListener('keydown', resumeAudioContext);
    document.body.addEventListener('touchstart', resumeAudioContext);
});
