export let translations = {};
export let lang = localStorage.getItem('lang') || 'de';
export const availableLanguages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', file: 'js/lang/de.json', voice: 'de-DE' },
    { code: 'en', name: 'English', flag: '🇬🇧', file: 'js/lang/en.json', voice: 'en-US' }
];

export async function initI18n() {
    translations = {};
    await Promise.all(availableLanguages.map(async (langObj) => {
        const res = await fetch(langObj.file);
        if (res.ok) {
            translations[langObj.code] = await res.json();
        }
    }));
}

export function t(key) {
    if (!translations[lang]) console.log('No translations for', lang);
    if (!translations[lang][key]) console.log('Missing key', key, 'in', lang, translations[lang]);
    return translations[lang] && translations[lang][key] ? translations[lang][key] : key;
}

export function setLanguage(newLang) {
    lang = newLang;
    localStorage.setItem('lang', lang);
}