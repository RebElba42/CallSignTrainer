// Start of the main application script
import { initUI } from './ui.js';
import { loadSettings } from './settings.js';
import { initI18n } from './i18n.js';
import { setVersionBadge } from './version.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    loadSettings();
    initUI();
    setVersionBadge();
});