/**
 * settings.js
 * 
 * Manages application settings, including defaults, loading, and saving to localStorage.
 * 
 * Author: DB4REB
 * License: MIT
 */
export const DEFAULTS = {
    wpm: 20,
    pauseSeconds: 5,
    repeatCount: 3,
    noiseType: 'pink',
    noiseLevel: 24,
    qsbLevel: 24,
    autoMode: true,
    qrmEnabled: true,
    qrmLevel: 0,
    preCallMode: 'vvv',
    lang: 'de',
    farnsworthWpm: 20,
    theme: 'dark',
    delayBeforePreCall: 1,
    delayBeforeMorse: 2,
    delayBeforeSolution: 4,
    callsignCategory: "international",
    minFrequency: 600,
    maxFrequency: 900,
};

export let settings = { ...DEFAULTS };
let _currentCallsignFrequency = 700;

/**
 * Sets the current frequency for the callsign in the current round.
 * @param {number} freq - The frequency to use for the current callsign.
 */
export function setCurrentCallsignFrequency(freq) {
    _currentCallsignFrequency = freq;
}

/**
 * Gets the current frequency for the callsign in the current round.
 * @returns {number} The frequency used for the current callsign.
 */
export function getCurrentCallsignFrequency() {
    return _currentCallsignFrequency;
}
/**
 * Loads settings from localStorage, falling back to defaults if not present.
 */
export function loadSettings() {
    Object.keys(DEFAULTS).forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) {
            if (typeof DEFAULTS[key] === "boolean") {
                settings[key] = val === "true";
            } else if (typeof DEFAULTS[key] === "number") {
                settings[key] = Number(val);
            } else {
                settings[key] = val;
            }
        }
    });
}

/**
 * Saves current settings to localStorage.
 */
export function saveSettings() {
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });
}