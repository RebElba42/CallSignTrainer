/**
 * i18n.js
 * 
 * Handles internationalization (i18n) for the application.
 * Loads translations, manages language switching, and provides translation lookup.
 * 
 * Author: DB4REB
 * License: MIT
 */
export let translations = {};
export let lang = localStorage.getItem('lang') || 'de';
export const availableLanguages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', file: 'js/lang/de.json', voice: 'de-DE' },
    { code: 'en', name: 'English', flag: '🇬🇧', file: 'js/lang/en.json', voice: 'en-US' }
];

/**
 * Loads all translation files for available languages asynchronously.
 */
export async function initI18n() {
    translations = {};
    await Promise.all(availableLanguages.map(async (langObj) => {
        const res = await fetch(langObj.file);
        if (res.ok) {
            translations[langObj.code] = await res.json();
        }
    }));
}

/**
 * Returns the translation for a given key in the current language.
 * Falls back to the key if not found.
 * @param {string} key - Translation key
 * @returns {string}
 */
export function t(key) {
    if (!translations[lang]) console.log('No translations for', lang);
    if (!translations[lang][key]) console.log('Missing key', key, 'in', lang, translations[lang]);
    return translations[lang] && translations[lang][key] ? translations[lang][key] : key;
}

/**
 * Sets the current language and saves it to localStorage.
 * @param {string} newLang - Language code
 */
export function setLanguage(newLang) {
    lang = newLang;
    localStorage.setItem('lang', lang);
}