import { t, setLanguage, lang, availableLanguages } from './i18n.js';
import { quizNext, getQuizState, setQuizState, setCallsignList } from './quiz.js';
import { unlockAudioContext, playMorse, textToMorse } from './morse.js';
import { pickPreferredVoice } from './voices.js';
import { settings, saveSettings, DEFAULTS } from './settings.js';
import { requestWakeLock, releaseWakeLock } from './wakeLock.js';

// Theme mapping for Bootstrap themes
const themeMap = {
    dark: "css/themes/bootstrap-dark.min.css",
    cerulean: "css/themes/bootstrap-cerulean.min.css",
    cosmo: "css/themes/bootstrap-cosmo.min.css",
    flatly: "css/themes/bootstrap-flatly.min.css",
    lumen: "css/themes/bootstrap-lumen.min.css",
    minty: "css/themes/bootstrap-minty.min.css",
    sandstone: "css/themes/bootstrap-sandstone.min.css",
    slate: "css/themes/bootstrap-slate.min.css",
    spacelab: "css/themes/bootstrap-spacelab.min.css",
    superhero: "css/themes/bootstrap-superhero.min.css",
    yeti: "css/themes/bootstrap-yeti.min.css"
};

// check if the browser is iOS Safarix
export function isIOSSafari() {
    const ua = navigator.userAgent;
    const isIOS = /iP(ad|hone|od)/i.test(ua);
    const isSafari = !!ua.match(/Safari/i) && !ua.match(/CriOS|FxiOS|EdgiOS/);
    return isIOS && isSafari;
}

/**
 * Activate or deactivate the action buttons
 * @param {boolean} disable - true = deactivate, false = activate
 */
function setActionButtonsDisabled(disable) {
    const { isPaused, isStarted } = getQuizState();
    const btnIds = [
        'testMorseBtn',
        'pauseBtn',
        'autoSwitch'
    ];
    btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !!disable;
        }
    });

}

// Apply the selected theme by updating the CSS link
function applyTheme(theme) {
    let themeHref = themeMap[theme] || themeMap['dark'];
    let themeLink = document.getElementById('theme-css');
    if (!themeLink) {
        themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.id = 'theme-css';
        document.head.appendChild(themeLink);
    }
    themeLink.href = themeHref;
}

export function initUI() {
    const quizContainer = document.getElementById('quiz-container');
    const controls = document.getElementById('controls');
    const settingsDiv = document.getElementById('settings');
    const result = document.getElementById('result');
    const languageSelect = document.getElementById('language-select');
    const headline = document.getElementById('headline');

    function renderLanguageSelect() {
        let html = `<div class="d-flex justify-content-center mb-2">
            <select id="langSelect" class="form-select form-select-sm w-auto">`;
        availableLanguages.forEach(l =>
            html += `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.name}</option>`
        );
        html += `</select></div>`;
        languageSelect.innerHTML = html;
        document.getElementById('langSelect').onchange = (e) => {
            setLanguage(e.target.value);
            updateAll();
        };
    }

    function renderControls() {
        const { isPaused, isStarted } = getQuizState();
        controls.innerHTML = `
        <div class="d-flex flex-wrap justify-content-center gap-2 mb-2">
            <button id="nextBtn" class="btn btn-primary"${settings.autoMode || !isStarted || isPaused ? ' disabled' : ''}>${t('next')}</button>
            <button id="pauseBtn" class="btn btn-secondary">
                ${!isStarted ? t('start') : (t('stop') || 'Stopp')}
            </button>
            <div class="form-check form-switch ms-2">
                <input class="form-check-input" type="checkbox" id="autoSwitch" ${settings.autoMode ? 'checked' : ''}>
                <label class="form-check-label" for="autoSwitch">${t('auto')}</label>
            </div>
        </div>
    `;

        // Disable the "Test Morse" button if the quiz is started
        const testBtn = document.getElementById('testMorseBtn');
        if (testBtn) {
            const { isStarted } = getQuizState();
            testBtn.disabled = isStarted;
        }

        document.getElementById('nextBtn').onclick = () => {
            if (!settings.autoMode && isStarted && !isPaused) {
                let state = getQuizState();
                state.currentIndex++;
                setQuizState(state);
                quizNext(quizContainer, result, updateAll);
            }
        };
        document.getElementById('pauseBtn').onclick = () => {
            let state = getQuizState();
            if (!state.isStarted) {
                unlockAudioContext();
                if (isIOSSafari()) {
                    const dummy = new window.SpeechSynthesisUtterance(' ');
                    dummy.volume = 0;
                    dummy.rate = 10;
                    window.speechSynthesis.speak(dummy);
                }
                state.isStarted = true;
                state.isPaused = false;
                setQuizState(state);
                renderControls();
                quizNext(quizContainer, result, updateAll);
                if (settings.autoMode) requestWakeLock();
            } else {
                // Stopp: Seite neu laden
                location.reload();
            }
        };
        document.getElementById('autoSwitch').onchange = (e) => {
            settings.autoMode = e.target.checked;
            saveSettings();
            let state = getQuizState();
            if (settings.autoMode) {
                requestWakeLock();
                if (state.isStarted && !state.isPaused) {
                    quizNext(quizContainer, result, updateAll);
                }
            } else {
                releaseWakeLock();
            }
            renderControls();
        };
    }

    function renderSettings() {
        settingsDiv.innerHTML = `
    <div class="accordion" id="settingsAccordion">
        <div class="accordion-item">
            <h2 class="accordion-header" id="headingGeneral">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseGeneral" aria-expanded="false" aria-controls="collapseGeneral">
                    ${t('settings_group_general')}
                </button>
            </h2>
            <div id="collapseGeneral" class="accordion-collapse collapse" aria-labelledby="headingGeneral" data-bs-parent="#settingsAccordion">
                <div class="accordion-body">
                    <div class="mb-2 d-flex flex-column">
                        <label for="wpmInput" class="form-label mb-0 small w-100">${t('wpm')}</label>
                        <input type="number" min="5" max="50" required class="form-control form-control-sm" style="max-width:120px;" id="wpmInput" value="${settings.wpm}">
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="pauseInput" class="form-label mb-0 small w-100">${t('pause_seconds')}</label>
                        <input type="number" min="1" max="10" required class="form-control form-control-sm" style="max-width:120px;" id="pauseInput" value="${settings.pauseSeconds}">
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="repeatInput" class="form-label mb-0 small w-100">${t('repeat')}</label>
                        <input type="number" min="1" max="10" required class="form-control form-control-sm" style="max-width:120px;" id="repeatInput" value="${settings.repeatCount}">
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="delayBeforePreCallInput" class="form-label mb-0 small w-100">${t('delay_before_pre_call')}</label>
                        <input type="number" min="0" max="10" class="form-control form-control-sm" style="max-width:120px;" id="delayBeforePreCallInput" value="${settings.delayBeforePreCall}">
                        <small class="text-muted">${t('delay_before_pre_call_hint')}</small>
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="delayBeforeMorseInput" class="form-label mb-0 small w-100">${t('delay_before_morse')}</label>
                        <input type="number" min="0" max="10" class="form-control form-control-sm" style="max-width:120px;" id="delayBeforeMorseInput" value="${settings.delayBeforeMorse}">
                        <small class="text-muted">${t('delay_before_morse_hint')}</small>
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="delayBeforeSolutionInput" class="form-label mb-0 small w-100">${t('delay_before_solution')}</label>
                        <input type="number" min="0" max="10" class="form-control form-control-sm" style="max-width:120px;" id="delayBeforeSolutionInput" value="${settings.delayBeforeSolution}">
                        <small class="text-muted">${t('delay_before_solution_hint')}</small>
                    </div>                    
                    <div class="mb-2 d-flex flex-column">
                        <label for="farnsworthWpmInput" class="form-label mb-0 small w-100">Farnsworth-WPM</label>
                        <input type="range" min="5" max="${settings.wpm}" step="1" class="form-range" id="farnsworthWpmInput" value="${settings.farnsworthWpm}" style="max-width:120px;">
                        <span id="farnsworthWpmValue">${settings.farnsworthWpm} WPM</span> 
                        <small class="text-muted">${t('farnsworth_hint')}</small>
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <button id="testMorseBtn" type="button" class="btn btn-success btn-sm mt-2">
                            ${t('test_morse')}
                        </button>
                    </div>                    
                </div>
            </div>
        </div>
        <div class="accordion-item">
            <h2 class="accordion-header" id="headingNoise">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseNoise" aria-expanded="false" aria-controls="collapseNoise">
                    ${t('settings_group_noise')}
                </button>
            </h2>
            <div id="collapseNoise" class="accordion-collapse collapse" aria-labelledby="headingNoise" data-bs-parent="#settingsAccordion">
                <div class="accordion-body">
                    <div class="mb-2 d-flex flex-column">
                        <label for="noiseTypeInput" class="form-label mb-0 small w-100">${t('noise_type')}</label>
                        <select id="noiseTypeInput" class="form-select form-select-sm" style="max-width:200px;">
                            <option value="white" ${settings.noiseType === 'white' ? 'selected' : ''}>${t('noise_type_white')}</option>
                            <option value="pink" ${settings.noiseType === 'pink' ? 'selected' : ''}>${t('noise_type_pink')}</option>
                            <option value="brown" ${settings.noiseType === 'brown' ? 'selected' : ''}>${t('noise_type_brown')}</option>
                            <option value="qrn" ${settings.noiseType === 'qrn' ? 'selected' : ''}>${t('noise_type_qrn')}</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label for="noiseInput" class="form-label mb-0 small w-100">${t('noise')}</label>
                        <input type="range" min="0" max="100" step="1" class="form-range" id="noiseInput" value="${settings.noiseLevel}" style="max-width:200px;">
                        <span id="noiseValue">${settings.noiseLevel}</span>%
                    </div>
                    <div class="mb-2">
                        <label for="qrmInput" class="form-label mb-0 small w-100">${t('noise_type_qrm')}</label>
                        <input type="range" min="0" max="73" step="1" class="form-range" id="qrmInput" value="${settings.qrmLevel}" style="max-width:200px;">
                        <span id="qrmValue">${settings.qrmLevel}</span>%
                    </div>
                    <div class="mb-2">
                        <label for="qsbInput" class="form-label mb-0 small w-100">${t('qsb')}</label>
                        <input type="range" min="0" max="100" step="1" class="form-range" id="qsbInput" value="${settings.qsbLevel}" style="max-width:200px;">
                        <span id="qsbValue">${settings.qsbLevel}</span>%
                    </div>
                </div>
            </div>
        </div>
        <div class="accordion-item">
            <h2 class="accordion-header" id="headingAnnounce">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseAnnounce" aria-expanded="false" aria-controls="collapseAnnounce">
                    ${t('settings_group_announce')}
                </button>
            </h2>
            <div id="collapseAnnounce" class="accordion-collapse collapse" aria-labelledby="headingAnnounce" data-bs-parent="#settingsAccordion">
                <div class="accordion-body">
                    <div>
                        <label class="form-label mb-0 small w-100">${t('pre_call_announcement')}</label>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="preCallMode" id="preCallSpeech" value="speech" ${settings.preCallMode === 'speech' ? 'checked' : ''}>
                            <label class="form-check-label" for="preCallSpeech">${t('pre_call_speech_v')}</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="preCallMode" id="preCallVVV" value="vvv" ${settings.preCallMode === 'vvv' ? 'checked' : ''}>
                            <label class="form-check-label" for="preCallVVV">${t('pre_call_morse_v')}</label>
                        </div>
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="themeSelect" class="form-label mb-0 small w-100">${t('theme')}</label>
                        <select id="themeSelect" class="form-select form-select-sm" style="max-width:200px;">
                            <option value="dark"${settings.theme === 'dark' ? ' selected' : ''}>${t('theme_dark')}</option>
                            <option value="cerulean"${settings.theme === 'cerulean' ? ' selected' : ''}>${t('theme_cerulean')}</option>
                            <option value="cosmo"${settings.theme === 'cosmo' ? ' selected' : ''}>${t('theme_cosmo')}</option>
                            <option value="flatly"${settings.theme === 'flatly' ? ' selected' : ''}>${t('theme_flatly')}</option>
                            <option value="lumen"${settings.theme === 'lumen' ? ' selected' : ''}>${t('theme_lumen')}</option>
                            <option value="minty"${settings.theme === 'minty' ? ' selected' : ''}>${t('theme_minty')}</option>
                            <option value="sandstone"${settings.theme === 'sandstone' ? ' selected' : ''}>${t('theme_sandstone')}</option>
                            <option value="slate"${settings.theme === 'slate' ? ' selected' : ''}>${t('theme_slate')}</option>
                            <option value="spacelab"${settings.theme === 'spacelab' ? ' selected' : ''}>${t('theme_spacelab')}</option>
                            <option value="superhero"${settings.theme === 'superhero' ? ' selected' : ''}>${t('theme_superhero')}</option>
                            <option value="yeti"${settings.theme === 'yeti' ? ' selected' : ''}>${t('theme_yeti')}</option>
                        </select>
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <label for="voiceSelect" class="form-label mb-0 small w-100">${t('voice')}</label>
                        <div class="d-flex align-items-center gap-2">
                            <select id="voiceSelect" class="form-select form-select-sm" style="max-width:300px;">
                                <option value="">${t('voice_default')}</option>
                            </select>
                            <button id="voiceTestBtn" type="button" class="btn btn-outline-secondary btn-sm">${t('voice_test')}</button>
                        </div>
                        <small class="text-muted">${t('voice_help')}</small>
                    </div>
                    <div class="mb-2 d-flex flex-column">
                        <button id="resetSettingsBtn" type="button" class="btn btn-outline-danger btn-sm mt-2">
                            ${t('reset_settings')}
                        </button>
                    </div>                    
                </div>
            </div>
        </div>
    </div>
    `;

        // Test Morse button
        document.getElementById('testMorseBtn').addEventListener('click', () => {
            // Example call sign for testing
            const testCall = "DL1ABC";
            // Import the Morse conversion function
            const morse = textToMorse(testCall);
            const oldQuizValue = quizContainer.innerHTML;
            quizContainer.innerHTML = `<div class="alert alert-info text-center py-3">${t('test_morse_pre_hint')}</div>`;
            setActionButtonsDisabled(true);
            playMorse(
                morse,
                settings.wpm,
                settings.farnsworthWpm,
                settings.noiseType,
                settings.noiseLevel,
                settings.qsbLevel,
                settings.qrmLevel,
                () => {
                    // Feedback after playing Morse
                    quizContainer.innerHTML = `<div class="alert alert-info text-center py-3">${t('test_morse') + " ✔"}</div>`;
                    setTimeout(() => quizContainer.innerHTML = oldQuizValue, 3000);
                    setActionButtonsDisabled(false);
                }
            );
        });
        // Disable the test Morse button if the quiz is started
        const { isStarted } = getQuizState();
        document.getElementById('testMorseBtn').disabled = isStarted;

        // Reset settings button
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            if (confirm(t('reset_settings_confirm'))) {
                Object.assign(settings, DEFAULTS);
                Object.keys(DEFAULTS).forEach(key => localStorage.removeItem(key));
                saveSettings();
                location.reload();
            }
        });
        // General settings
        document.getElementById('wpmInput').addEventListener('change', (e) => {
            settings.wpm = Math.max(5, Math.min(50, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.wpm;
            document.getElementById('farnsworthWpmInput').max = settings.wpm;
            if (settings.farnsworthWpm > settings.wpm) {
                settings.farnsworthWpm = settings.wpm;
                document.getElementById('farnsworthWpmInput').value = settings.farnsworthWpm;
                document.getElementById('farnsworthWpmValue').innerText = settings.farnsworthWpm + " WPM";
            }
        });
        document.getElementById('pauseInput').addEventListener('change', (e) => {
            settings.pauseSeconds = Math.max(1, Math.min(10, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.pauseSeconds;
        });
        document.getElementById('repeatInput').addEventListener('change', (e) => {
            settings.repeatCount = Math.max(1, Math.min(10, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.repeatCount;
        });
        document.getElementById('farnsworthWpmInput').addEventListener('input', (e) => {
            settings.farnsworthWpm = Math.max(5, Math.min(settings.wpm, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.farnsworthWpm;
            document.getElementById('farnsworthWpmValue').innerText = settings.farnsworthWpm + " WPM";
        });
        // Noise settings
        document.getElementById('noiseTypeInput').addEventListener('change', (e) => {
            settings.noiseType = e.target.value;
            saveSettings();
        });
        document.getElementById('noiseInput').addEventListener('input', (e) => {
            settings.noiseLevel = Number(e.target.value);
            saveSettings();
            document.getElementById('noiseValue').innerText = settings.noiseLevel;
        });
        document.getElementById('qrmInput').addEventListener('input', (e) => {
            settings.qrmLevel = Number(e.target.value);
            saveSettings();
            document.getElementById('qrmValue').innerText = settings.qrmLevel;
        });
        document.getElementById('qsbInput').addEventListener('input', (e) => {
            settings.qsbLevel = Number(e.target.value);
            saveSettings();
            document.getElementById('qsbValue').innerText = settings.qsbLevel;
        });
        document.getElementById('delayBeforePreCallInput').addEventListener('change', (e) => {
            settings.delayBeforePreCall = Math.max(0, Math.min(10, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.delayBeforePreCall;
        });
        document.getElementById('delayBeforeMorseInput').addEventListener('change', (e) => {
            settings.delayBeforeMorse = Math.max(0, Math.min(10, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.delayBeforeMorse;
        });
        document.getElementById('delayBeforeSolutionInput').addEventListener('change', (e) => {
            settings.delayBeforeSolution = Math.max(0, Math.min(10, Number(e.target.value)));
            saveSettings();
            e.target.value = settings.delayBeforeSolution;
        });

        // Pre-call mode
        document.querySelectorAll('input[name="preCallMode"]').forEach(el => {
            el.addEventListener('change', (e) => {
                settings.preCallMode = e.target.value;
                saveSettings();
            });
        });

        // Theme selection
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            settings.theme = e.target.value;
            saveSettings();
            applyTheme(settings.theme);
        });

        // Voice selection and test button
        const voiceSelect = document.getElementById('voiceSelect');
        function populateVoices() {
            if (!('speechSynthesis' in window)) return;
            const voices = window.speechSynthesis.getVoices();
            const langObj = availableLanguages.find(l => l.code === lang);
            const langCode = langObj ? langObj.voice : 'de-DE';
            const filtered = voices.filter(v => v.lang === langCode);

            const voiceKey = 'voiceURI_' + lang;
            let savedVoiceURI = localStorage.getItem(voiceKey) || '';

            voiceSelect.innerHTML = `<option value="">${t('voice_default')}</option>`;
            filtered.forEach(voice => {
                const selected = (voice.voiceURI === savedVoiceURI) ? ' selected' : '';
                voiceSelect.innerHTML += `<option value="${voice.voiceURI}"${selected}>${voice.name} (${voice.lang})</option>`;
            });
            voiceSelect.value = savedVoiceURI;
        }
        if ('speechSynthesis' in window) {
            populateVoices();
            window.speechSynthesis.onvoiceschanged = populateVoices;
        }
        voiceSelect.addEventListener('change', (e) => {
            const voiceKey = 'voiceURI_' + lang;
            localStorage.setItem(voiceKey, e.target.value);
        });
        document.getElementById('voiceTestBtn').addEventListener('click', () => {
            if ('speechSynthesis' in window) {
                const langObj = availableLanguages.find(l => l.code === lang);
                const utter = new window.SpeechSynthesisUtterance(t('new_round'));
                utter.lang = langObj ? langObj.voice : 'de-DE';
                pickPreferredVoice(utter);
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utter);
            }
        });
    }

    function updateAll() {
        headline.innerText = t('headline');
        renderLanguageSelect();
        renderSettings();
        renderControls();
        let state = getQuizState();
        if (!state.isStarted) {
            quizContainer.innerHTML = `<div class="alert alert-info text-center py-3">${t('press_start')}</div>`;
        }
    }

    // Load the call sign list and translations on startup
    fetch('data/rufzeichen.json')
        .then(res => res.json())
        .then(data => {
            setCallsignList(data);
            updateAll();
            applyTheme(settings.theme);
        })
        .catch(() => {
            quizContainer.innerHTML = `<div class="alert alert-danger text-center py-3">${t('error_loading')}</div>`;
        });
}