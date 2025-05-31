import { settings } from './settings.js';
import { textToMorse, playMorse, stopNoise } from './morse.js';
import { t, lang, availableLanguages } from './i18n.js';
import { pickPreferredVoice } from './voices.js';

let rufzeichenListe = [];
let currentIndex = 0;
let isPaused = false;
let isStarted = false;
let pauseCallback = null;

export function setCallsignList(list) {
    rufzeichenListe = list;
    shuffleArray(rufzeichenListe);
    currentIndex = 0;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function doPreCall(nextStep) {
    if (settings.preCallMode === 'speech') {
        if ('speechSynthesis' in window) {
            const langObj = availableLanguages.find(l => l.code === lang);
            const utter = new SpeechSynthesisUtterance(t('pre_call_speech'));
            utter.lang = langObj ? langObj.voice : 'de-DE';
            utter.onend = nextStep;
            pickPreferredVoice(utter);
            window.speechSynthesis.speak(utter);
        } else {
            nextStep();
        }
    } else {
        const vvv = textToMorse('V V V');
        const oldNoise = settings.noiseLevel;
        const oldQsb = settings.qsbLevel;
        const oldQrm = settings.qrmLevel;
        const oldFarnsworth = settings.farnsworthWpm;
        settings.noiseLevel = 0;
        settings.qsbLevel = 0;
        settings.qrmLevel = 0;
        settings.farnsworthWpm = settings.wpm;

        playMorse(vvv, settings.wpm, settings.farnsworthWpm, settings.noiseType, settings.noiseLevel, settings.qsbLevel, settings.qrmLevel, () => {
            settings.noiseLevel = oldNoise;
            settings.qsbLevel = oldQsb;
            settings.qrmLevel = oldQrm;
            settings.farnsworthWpm = oldFarnsworth;
            nextStep();
        });
    }
}

export function quizNext(quizContainer, result, updateUI) {
    result.innerHTML = '';
    if (currentIndex >= rufzeichenListe.length) {
        shuffleArray(rufzeichenListe);
        currentIndex = 0;
    }
    const call = rufzeichenListe[currentIndex];

    quizContainer.innerHTML = `
    <div class="alert alert-warning text-center py-3" style="font-size:1.3em;">
        ⭐ ${t('new_round')} ⭐<br>
        <small>${t('new_call')}</small>
    </div>
    `;

    doPreCall(() => {
        setTimeout(() => {
            let played = 0;
            function repeatMorse() {
                if (isPaused) {
                    pauseCallback = repeatMorse;
                    stopNoise();
                    return;
                }
                if (played < settings.repeatCount) {
                    const morse = textToMorse(call);
                    quizContainer.innerHTML = `<div class="alert alert-info text-center py-3">${t('playing')}<br><span class="badge bg-secondary">${played + 1} / ${settings.repeatCount}</span></div>`;
                    playMorse(morse, settings.wpm, settings.farnsworthWpm, settings.noiseType, settings.noiseLevel, settings.qsbLevel, settings.qrmLevel, () => {
                        played++;
                        if (played < settings.repeatCount) {
                            setTimeout(() => {
                                if (isPaused) {
                                    pauseCallback = repeatMorse;
                                    stopNoise();
                                } else {
                                    repeatMorse();
                                }
                            }, settings.pauseSeconds * 1000);
                        } else {
                            setTimeout(() => {
                                showResult(call, quizContainer, result, updateUI);
                            }, settings.pauseSeconds * 1000);
                        }
                    });
                }
            }
            repeatMorse();
        }, settings.pauseSeconds * 1000);
    });
}

export function showResult(call, quizContainer, result, updateUI) {
    stopNoise(false);
    quizContainer.innerHTML = `<div class="alert alert-success text-center py-3">${t('solution')}<br><span class="display-5 fw-bold">${call}</span></div>`;
    if ('speechSynthesis' in window) {
        const langObj = availableLanguages.find(l => l.code === lang);
        const utter = new SpeechSynthesisUtterance(`${t('solution')} ${call.split('').join(' ')}`);
        utter.lang = langObj ? langObj.voice : 'de-DE';
        pickPreferredVoice(utter);
        window.speechSynthesis.speak(utter);
    }
    if (settings.autoMode) {
        setTimeout(() => {
            currentIndex++;
            quizNext(quizContainer, result, updateUI);
        }, settings.pauseSeconds * 1000);
    }
}

export function getQuizState() {
    return { isPaused, isStarted, currentIndex, pauseCallback };
}

export function setQuizState(state) {
    isPaused = state.isPaused;
    isStarted = state.isStarted;
    currentIndex = state.currentIndex;
    pauseCallback = state.pauseCallback;
}