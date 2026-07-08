/**
 * ============================================================
 * ZIKO'S CRYSTAL QUEST — Save Manager
 * ============================================================
 * Handles persistent game saves, settings, achievements, and statistics
 * through browser LocalStorage.
 */

'use strict';

window.SaveManager = class SaveManager {
    constructor() {
        this.savePrefix = "zikos_crystal_quest_save_";
        this.settingsKey = "zikos_crystal_quest_settings";
        this.achievementsKey = "zikos_crystal_quest_achievements";
    }

    /**
     * Save progress to a specific slot (1, 2, or 3)
     * @param {number} slot 
     * @param {Object} data 
     * @returns {boolean} Success
     */
    save(slot, data) {
        const fullData = {
            ...data,
            timestamp: Date.now(),
            formattedTime: new Date().toLocaleString()
        };
        const serialized = this._serialize(fullData);
        if (serialized) {
            try {
                localStorage.setItem(this.savePrefix + slot, serialized);
                return true;
            } catch (e) {
                console.error("Failed to write to LocalStorage:", e);
                return false;
            }
        }
        return false;
    }

    /**
     * Load progress from a specific slot
     * @param {number} slot 
     * @returns {Object|null} Game state
     */
    load(slot) {
        try {
            const raw = localStorage.getItem(this.savePrefix + slot);
            if (!raw) return null;
            return this._deserialize(raw);
        } catch (e) {
            console.error("Failed to load slot from LocalStorage:", e);
            return null;
        }
    }

    /**
     * Delete save file in a slot
     */
    delete(slot) {
        try {
            localStorage.removeItem(this.savePrefix + slot);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if a slot has valid save data
     */
    hasSave(slot) {
        return localStorage.getItem(this.savePrefix + slot) !== null;
    }

    /**
     * Get summary info of a slot for UI display
     */
    getSaveInfo(slot) {
        const data = this.load(slot);
        if (!data) return null;
        return {
            levelId: data.currentLevelId || 1,
            levelName: data.levelName || 'Green Hills',
            score: data.totalScore || 0,
            coins: data.totalCoins || 0,
            difficulty: data.difficulty || 'MEDIUM',
            timestamp: data.timestamp,
            formattedTime: data.formattedTime
        };
    }

    /**
     * Menu compat load slot (maps index 0-2 to slot 1-3)
     */
    loadSlot(i) {
        const slot = i + 1;
        const data = this.load(slot);
        if (!data) return null;
        return {
            world: Math.ceil((data.currentLevelId || 1) / 4),
            level: data.currentLevelId || 1,
            score: data.totalScore || 0
        };
    }

    /**
     * Save application settings
     */
    saveSettings(settings) {
        const serialized = this._serialize(settings);
        if (serialized) {
            localStorage.setItem(this.settingsKey, serialized);
        }
    }

    /**
     * Load settings or return defaults
     */
    loadSettings() {
        try {
            const raw = localStorage.getItem(this.settingsKey);
            if (!raw) return this.getDefaultSettings();
            return { ...this.getDefaultSettings(), ...this._deserialize(raw) };
        } catch (e) {
            return this.getDefaultSettings();
        }
    }

    /**
     * Save unlocked achievements
     */
    saveAchievements(achievements) {
        const serialized = this._serialize(achievements);
        if (serialized) {
            localStorage.setItem(this.achievementsKey, serialized);
        }
    }

    /**
     * Load unlocked achievements list
     */
    loadAchievements() {
        try {
            const raw = localStorage.getItem(this.achievementsKey);
            if (!raw) return {};
            return this._deserialize(raw);
        } catch (e) {
            return {};
        }
    }

    getDefaultSettings() {
        return {
            musicVolume: 0.7,
            sfxVolume: 0.8,
            difficulty: 'MEDIUM',
            graphicsQuality: 'high',
            fullscreen: false,
            vibration: true,
            showFps: false,
            language: 'en'
        };
    }

    _serialize(data) {
        try {
            return JSON.stringify(data);
        } catch (e) {
            console.error("Serialization failed:", e);
            return null;
        }
    }

    _deserialize(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error("Deserialization failed:", e);
            return null;
        }
    }
};
