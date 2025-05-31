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
    theme: 'slate',
    delayBeforePreCall: 1,
    delayBeforeMorse: 2,
    delayBeforeSolution: 4

};

export let settings = { ...DEFAULTS };

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

export function saveSettings() {
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });
}