/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Procedural Audio Engine
 * ============================================================
 * Generates all sound effects and music tracks on-the-fly using 
 * the Web Audio API oscillators, gain nodes, and biquad filters.
 * No external .mp3/.wav files required.
 */

'use strict';

window.AudioManager = class AudioManager {
    constructor() {
        this.ctx = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.6;
        
        // Active musical notes/scheduler loops
        this.currentMusicTrack = null;
        this.schedulerIntervalId = null;
        this.tempo = 120; // BPM
        this.stepIndex = 0;
        this.musicGainNode = null;
        
        // Define procedural music tracks
        // Each entry is an array of note frequencies (0 = rest)
        this.musicNotes = {
            menu: [261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 440.00, 349.23], // C4, E4, G4, C5, B4, G4, A4, F4
            world1: [261.63, 392.00, 440.00, 349.23, 261.63, 392.00, 349.23, 392.00], // Green Hills
            world2: [329.63, 392.00, 523.25, 493.88, 440.00, 392.00, 349.23, 329.63], // Forest
            world3: [293.66, 349.23, 440.00, 392.00, 329.63, 261.63, 293.66, 392.00], // River
            world4: [392.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00, 392.00], // Mountain
            world5: [220.00, 261.63, 329.63, 293.66, 220.00, 261.63, 196.00, 220.00], // Cave (Minor key A)
            world6: [293.66, 311.13, 392.00, 349.23, 311.13, 293.66, 277.18, 293.66], // Desert (Phrygian)
            world7: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.00], // Snow
            world8: [349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00, 349.23], // Jungle
            world9: [196.00, 220.00, 233.08, 293.66, 277.18, 220.00, 196.00, 146.83], // Volcano
            world10: [220.00, 233.08, 277.18, 329.63, 293.66, 233.08, 220.00, 196.00], // Haunted (Diminished)
            world11: [392.00, 440.00, 493.88, 587.33, 523.25, 440.00, 392.00, 523.25], // Sky
            world12: [220.00, 261.63, 293.66, 329.63, 349.23, 293.66, 329.63, 220.00], // Castle
            boss: [146.83, 164.81, 174.61, 196.00, 174.61, 164.81, 146.83, 110.00], // Boss (D minor, fast tempo)
            victory: [261.63, 329.63, 392.00, 523.25, 392.00, 523.25, 659.25, 1046.50], // Triumphant upward C chord
            gameover: [392.00, 349.23, 311.13, 293.66, 261.63, 246.94, 220.00, 196.00]  // Sad downward scale
        };
    }

    /**
     * Lazy initialiser for AudioContext, must be triggered on user action (click/touchstart/keydown)
     */
    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.musicGainNode = this.ctx.createGain();
            this.musicGainNode.connect(this.ctx.destination);
            this.musicGainNode.gain.value = this.musicVolume;
        } catch (e) {
            console.error("Web Audio API is not supported in this browser:", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMusicVolume(v) {
        this.musicVolume = clamp(v, 0, 1);
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = this.musicVolume;
        }
    }

    setSfxVolume(v) {
        this.sfxVolume = clamp(v, 0, 1);
    }

    playMusic(trackName) {
        this.init();
        this.resume();
        
        if (this.currentMusicTrack === trackName) return;

        this.stopMusic(0.2);
        this.currentMusicTrack = trackName;
        this.stepIndex = 0;

        // Set tempo modifiers (boss music is fast)
        this.tempo = (trackName === 'boss') ? 160 : 120;
        const stepDuration = 60 / this.tempo / 2; // Eighth notes

        this.schedulerIntervalId = setInterval(() => {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            
            const notes = this.musicNotes[trackName] || this.musicNotes.menu;
            const noteFreq = notes[this.stepIndex % notes.length];
            
            if (noteFreq > 0) {
                this._playSequencedNote(noteFreq, stepDuration * 0.85);
            }
            this.stepIndex++;
        }, stepDuration * 1000);
    }

    stopMusic(fadeTime = 0.5) {
        if (this.schedulerIntervalId) {
            clearInterval(this.schedulerIntervalId);
            this.schedulerIntervalId = null;
        }
        this.currentMusicTrack = null;
    }

    _playSequencedNote(frequency, duration) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.musicGainNode);

        // Fun retro square wave or triangle wave
        osc.type = (this.currentMusicTrack === 'boss') ? 'sawtooth' : 'triangle';
        osc.frequency.value = frequency;

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.musicVolume * 0.4, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * Play a synthesized sound effect based on name
     */
    playSound(soundName) {
        this.init();
        this.resume();
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const now = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.connect(this.ctx.destination);
        mainGain.gain.value = this.sfxVolume;

        switch (soundName) {
            case SFX.JUMP:
                this._sweep(200, 600, 0.12, 'sine', mainGain);
                break;
            case SFX.DOUBLE_JUMP:
                this._sweep(300, 850, 0.18, 'triangle', mainGain);
                this._sweep(400, 950, 0.18, 'sine', mainGain, 0.04);
                break;
            case SFX.LAND:
                this._noise(80, 20, 0.1, mainGain, 0.5);
                break;
            case SFX.COIN:
                this._ding(987.77, 0.15, mainGain); // B5 note
                break;
            case SFX.GEM:
                this._ding(1318.51, 0.3, mainGain); // E6
                this._ding(1567.98, 0.3, mainGain, 0.06); // G6
                break;
            case SFX.HURT:
                this._sweep(180, 80, 0.22, 'sawtooth', mainGain);
                break;
            case SFX.DIE:
                this._sweep(400, 60, 0.7, 'triangle', mainGain);
                this._sweep(350, 50, 0.7, 'sawtooth', mainGain, 0.05);
                break;
            case SFX.ATTACK:
                this._sweep(350, 100, 0.12, 'triangle', mainGain);
                this._noise(400, 100, 0.15, mainGain, 0.3);
                break;
            case SFX.ENEMY_DIE:
                this._sweep(300, 120, 0.15, 'sine', mainGain);
                this._noise(200, 50, 0.2, mainGain, 0.4);
                break;
            case SFX.CHECKPOINT:
                this._chord([261.63, 329.63, 392.00, 523.25], 0.6, mainGain); // C Major
                break;
            case SFX.POWERUP:
                this._chord([329.63, 440.00, 554.37, 659.25], 0.7, mainGain); // A Major
                break;
            case SFX.LEVEL_WIN:
                this._chord([523.25, 659.25, 783.99, 1046.50], 1.2, mainGain);
                break;
            case SFX.BOSS_HIT:
                this._sweep(120, 40, 0.3, 'sawtooth', mainGain);
                this._noise(100, 30, 0.3, mainGain, 0.7);
                break;
            case SFX.EXPLOSION:
                this._noise(500, 10, 0.8, mainGain, 1.0);
                this._sweep(150, 30, 0.6, 'sawtooth', mainGain);
                break;
            case SFX.SPLASH:
                this._noise(300, 80, 0.25, mainGain, 0.4);
                this._sweep(100, 50, 0.25, 'sine', mainGain);
                break;
            case SFX.STOMP:
                this._sweep(150, 50, 0.15, 'sine', mainGain);
                this._noise(150, 40, 0.15, mainGain, 0.6);
                break;
            case SFX.WALL_JUMP:
                this._sweep(250, 550, 0.12, 'sine', mainGain);
                break;
            case SFX.SLIDE:
                this._noise(100, 80, 0.25, mainGain, 0.2);
                break;
            case SFX.CRYSTAL:
                this._ding(1800, 0.6, mainGain);
                this._ding(2200, 0.6, mainGain, 0.1);
                break;
            case SFX.BOLT_SHIELD:
                this._sweep(60, 120, 0.4, 'sine', mainGain);
                break;
            case SFX.BOLT_HEAL:
                this._chord([392.00, 493.88, 587.33, 783.99], 0.8, mainGain); // G Major
                break;
            case SFX.BOLT_CANNON:
                this._sweep(1200, 300, 0.22, 'sawtooth', mainGain);
                break;
        }
    }

    _sweep(startFreq, endFreq, duration, type, mainGain, delay = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(mainGain);

        osc.type = type;
        const now = this.ctx.currentTime + delay;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    _ding(freq, duration, mainGain, delay = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(mainGain);

        osc.type = 'sine';
        const now = this.ctx.currentTime + delay;

        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    _chord(frequencies, duration, mainGain) {
        frequencies.forEach((freq, index) => {
            this._ding(freq, duration, mainGain, index * 0.05);
        });
    }

    _noise(startCutoff, endCutoff, duration, mainGain, volume = 0.5) {
        // Generate a 1-second white noise buffer
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Filter to shape the noise (water splash vs explosion)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        
        const now = this.ctx.currentTime;
        filter.frequency.setValueAtTime(startCutoff, now);
        filter.frequency.exponentialRampToValueAtTime(endCutoff, now + duration);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(mainGain);

        noiseNode.start(now);
        noiseNode.stop(now + duration);
    }
};
