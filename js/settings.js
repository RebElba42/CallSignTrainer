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
 */
export function setCurrentCallsignFrequency() {
    const min = settings.minFrequency || 500;
    const max = settings.maxFrequency || 900;
    _currentCallsignFrequency = Math.floor(Math.random() * (max - min + 1)) + min;
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

    // set language based on localStorage or browser settings
    if (!localStorage.getItem('lang')) {
        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (browserLang.startsWith('de')) {
            settings.lang = 'de';
        } else if (browserLang.startsWith('en')) {
            settings.lang = 'en';
        } else {
            settings.lang = 'en';
        }
        localStorage.setItem('lang', settings.lang);
    }
}

/**
 * Saves current settings to localStorage.
 */
export function saveSettings() {
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });
}