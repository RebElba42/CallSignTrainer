export const DEFAULTS = {
    wpm: 20,
    pauseSeconds: 5,
    repeatCount: 3,
    noiseType: 'white',
    noiseLevel: 28,
    qsbLevel: 62,
    autoMode: true,
    qrmEnabled: true,
    qrmLevel: 0,
    preCallMode: 'vvv',
    lang: 'de',
    farnsworthWpm: 20,
    theme: 'dark'
};

export let settings = { ...DEFAULTS };

export function loadSettings() {
    Object.keys(DEFAULTS).forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) settings[key] = isNaN(DEFAULTS[key]) ? val : Number(val);
    });
}

export function saveSettings() {
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });
}