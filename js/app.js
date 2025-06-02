/**
 * app.js
 * 
 * Main entry point for the CallSignTrainer application.
 * Initializes i18n, settings, UI, version badge, and handles wake lock events.
 * 
 * Author: DB4REB
 * License: MIT
 */
import { initUI } from './ui.js';
import { loadSettings } from './settings.js';
import { initI18n } from './i18n.js';
import { setVersionBadge } from './version.js';
import { requestWakeLock, releaseWakeLock } from './wakeLock.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    loadSettings();
    initUI();
    setVersionBadge();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        releaseWakeLock();
    } else if (settings && settings.autoMode) {
        requestWakeLock();
    }
});

window.addEventListener('beforeunload', () => {
    releaseWakeLock();
});