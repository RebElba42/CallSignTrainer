import { lang } from './i18n.js';

export function pickPreferredVoice(utter) {
    const voices = window.speechSynthesis.getVoices();
    const voiceKey = 'voiceURI_' + lang;
    const selectedVoiceURI = localStorage.getItem(voiceKey) || '';
    let found = null;
    if (selectedVoiceURI) {
        found = voices.find(v => v.voiceURI === selectedVoiceURI);
    }
    if (!found) {
        let preferredVoiceName = '';
        if (utter.lang === 'de-DE') preferredVoiceName = 'Anna';
        if (utter.lang === 'en-US') preferredVoiceName = 'Kathrin';
        if (preferredVoiceName) {
            found = voices.find(v => v.lang === utter.lang && v.name.includes(preferredVoiceName));
        }
    }
    if (!found) {
        found = voices.find(v => v.lang === utter.lang && v.gender === 'female');
        if (!found) found = voices.find(v => v.lang === utter.lang && /google|apple/i.test(v.name));
        if (!found) found = voices.find(v => v.lang === utter.lang);
    }
    if (found) utter.voice = found;
}