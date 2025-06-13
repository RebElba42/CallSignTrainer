/**
 * quiz.js
 * 
 * Contains the quiz logic for the CallSignTrainer application.
 * Manages the callsign list, quiz state, Morse playback, and result display.
 * 
 * Author: DB4REB
 * License: MIT
 */
import { settings, setCurrentCallsignFrequency } from './settings.js';
import { textToMorse, playMorse, stopNoise } from './morse.js';
import { t, lang, availableLanguages } from './i18n.js';
import { pickPreferredVoice } from './voices.js';
import { requestWakeLock, releaseWakeLock } from './wakeLock.js';

let rufzeichenListe = [];
let currentIndex = 0;
let isPaused = false;
let isStarted = false;
let pauseCallback = null;

/**
 * Sets and shuffles the callsign list for the quiz.
 * @param {Array<string>} list - List of callsigns
 */
export function setCallsignList(list) {
    rufzeichenListe = list;
    shuffleArray(rufzeichenListe);
    currentIndex = 0;
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * Ensures each permutation is equally likely.
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Handles the pre-call announcement (speech or Morse "VVV") before the callsign is played.
 * @param {Function} nextStep - Callback to continue after pre-call
 */
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
        // Morse V V V
        const vvv = textToMorse('V V V');
        // Save current settings to restore later
        const oldNoise = settings.noiseLevel;
        const oldQsb = settings.qsbLevel;
        const oldQrm = settings.qrmLevel;
        const oldFarnsworth = settings.farnsworthWpm;
        settings.noiseLevel = 0;
        settings.qsbLevel = 0;
        settings.qrmLevel = 0;
        settings.farnsworthWpm = settings.wpm;

        playMorse(
            vvv,
            settings.wpm,
            settings.farnsworthWpm,
            settings.noiseType,
            settings.noiseLevel,
            settings.qsbLevel,
            settings.qrmLevel,
            () => {
                // Reset settings to old values
                settings.noiseLevel = oldNoise;
                settings.qsbLevel = oldQsb;
                settings.qrmLevel = oldQrm;
                settings.farnsworthWpm = oldFarnsworth;
                nextStep();
            }
        );
    }
}

/**
 * Advances the quiz to the next callsign and handles Morse playback.
 * @param {HTMLElement} quizContainer
 * @param {HTMLElement} result
 * @param {Function} updateUI
 */
export function quizNext(quizContainer, result, updateUI) {
    result.innerHTML = '';
    if (currentIndex >= rufzeichenListe.length) {
        shuffleArray(rufzeichenListe);
        currentIndex = 0;
    }
    const call = rufzeichenListe[currentIndex];
    
    // Set the current callsign frequency
    setCurrentCallsignFrequency(
        Math.floor(Math.random() * (settings.maxFrequency - settings.minFrequency + 1)) + settings.minFrequency
    );

    if (!settings.autoMode) {
        requestWakeLock(); // Wake Lock auch im manuellen Modus aktivieren
    }

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
                } else {
                    setTimeout(() => {
                        showResult(call, quizContainer, result, updateUI);
                    }, settings.delayBeforeSolution * 1000);
                }
            }
            repeatMorse();
        }, settings.delayBeforePreCall * 1000);
    });
}

/**
 * Displays the result (callsign) and optionally speaks it.
 * @param {string} call - The callsign
 * @param {HTMLElement} quizContainer
 * @param {HTMLElement} result
 * @param {Function} updateUI
 */
export function showResult(call, quizContainer, result, updateUI) {
    stopNoise(false);
    quizContainer.innerHTML = `<div class="alert alert-success text-center py-3">${t('solution')}<br><span class="display-5 fw-bold">${call}</span></div>`;
    if ('speechSynthesis' in window) {
        // Workaround für iOS/Safari: Erst einen stummen Utterance abspielen
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0;
        dummy.rate = 10;
        dummy.onend = () => {
            const langObj = availableLanguages.find(l => l.code === lang);
            const utter = new SpeechSynthesisUtterance(`${t('solution')} ${call.split('').join('\u200B ')}`);
            utter.lang = langObj ? langObj.voice : 'de-DE';
            pickPreferredVoice(utter);
            window.speechSynthesis.speak(utter);
        };
        window.speechSynthesis.speak(dummy);
    }

    if (settings.autoMode) {
        setTimeout(() => {
            currentIndex++;
            quizNext(quizContainer, result, updateUI);
        }, settings.pauseSeconds * 1000);
    } else {
        releaseWakeLock();
    }
}

/**
 * Returns the current quiz state.
 * @returns {Object}
 */
export function getQuizState() {
    return { isPaused, isStarted, currentIndex, pauseCallback };
}

/**
 * Sets the quiz state.
 * @param {Object} state
 */
export function setQuizState(state) {
    isPaused = state.isPaused;
    isStarted = state.isStarted;
    currentIndex = state.currentIndex;
    pauseCallback = state.pauseCallback;
}