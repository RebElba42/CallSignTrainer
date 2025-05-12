// Copyright (c) 2025 RebElba
// Released under the MIT License. See LICENSE file for details.

document.addEventListener('DOMContentLoaded', () => {
    // Get important DOM elements
    const quizContainer = document.getElementById('quiz-container');
    const controls = document.getElementById('controls');
    const settings = document.getElementById('settings');
    const result = document.getElementById('result');
    const languageSelect = document.getElementById('language-select');
    const headline = document.getElementById('headline');

    // Supported languages and flags
    const languages = [
        { code: 'de', name: 'Deutsch', flag: '🇩🇪', file: 'js/lang/de.json', voice: 'de-DE' },
        { code: 'en', name: 'English', flag: '🇬🇧', file: 'js/lang/en.json', voice: 'en-US' }
    ];

    // Global variables for settings and state
    let availableLanguages = [];
    let loadedLangs = 0;
    let translations = {};
    let lang = localStorage.getItem('lang') || 'de';

    let wpm = Number(localStorage.getItem('wpm')) || 20; // Morse speed
    let pauseSeconds = Number(localStorage.getItem('pauseSeconds')) || 5;
    let repeatCount = Number(localStorage.getItem('repeatCount')) || 3;
    let noiseLevel = Number(localStorage.getItem('noiseLevel')) || 0;
    let qsbLevel = Number(localStorage.getItem('qsbLevel')) || 0;
    let autoMode = localStorage.getItem('autoMode') === 'false' ? false : true;

    let rufzeichenListe = [];
    let currentIndex = 0;
    let isPaused = false;
    let isStarted = false;
    let pauseCallback = null;

    // AudioContext and noise objects for Morse code and noise
    let audioCtx = null;
    let audioUnlocked = false;
    let currentWhiteNoise = null;
    let currentNoiseGain = null;

    // Morse code table for letters and numbers
    const morseTable = {
        "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".",
        "F": "..-.", "G": "--.", "H": "....", "I": "..", "J": ".---",
        "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---",
        "P": ".--.", "Q": "--.-", "R": ".-.", "S": "...", "T": "-",
        "U": "..-", "V": "...-", "W": ".--", "X": "-..-", "Y": "-.--",
        "Z": "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--",
        "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..",
        "9": "----."
    };

    // Shuffle an array randomly (Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Load translation files for language selection
    function loadTranslations(callback) {
        availableLanguages = [];
        loadedLangs = 0;
        translations = {};
        let toLoad = languages.length;
        languages.forEach(langObj => {
            fetch(langObj.file)
                .then(res => {
                    if (res.ok) {
                        availableLanguages.push(langObj);
                        return res.json();
                    }
                    throw new Error();
                })
                .then(json => {
                    translations[langObj.code] = json;
                })
                .catch(() => { })
                .finally(() => {
                    loadedLangs++;
                    if (loadedLangs === toLoad) callback();
                });
        });
    }

    // Return translation for a given key
    function t(key) {
        return translations[lang] && translations[lang][key] ? translations[lang][key] : key;
    }

    // Render language selection dropdown
    function renderLanguageSelect() {
        let html = `<div class="d-flex justify-content-center mb-2">
            <select id="langSelect" class="form-select form-select-sm w-auto">`;
        availableLanguages.forEach(l =>
            html += `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.name}</option>`
        );
        html += `</select></div>`;
        languageSelect.innerHTML = html;
        document.getElementById('langSelect').onchange = (e) => {
            lang = e.target.value;
            localStorage.setItem('lang', lang);
            updateAll();
        };
    }

    // Convert text to Morse code
    function textToMorse(text) {
        return text.toUpperCase().split('').map(ch => morseTable[ch] || '').join(' ');
    }

    // Initialize and unlock AudioContext (for mobile)
    function unlockAudioContext() {
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!audioUnlocked) {
            try {
                const unlockOsc = audioCtx.createOscillator();
                const unlockGain = audioCtx.createGain();
                unlockGain.gain.value = 0;
                unlockOsc.connect(unlockGain).connect(audioCtx.destination);
                unlockOsc.start();
                unlockOsc.stop(audioCtx.currentTime + 0.01);
                audioUnlocked = true;
            } catch (e) { }
        }
    }

    // Stop the noise (white noise)
    function stopNoise() {
        console.log('stopNoise called', currentWhiteNoise, currentNoiseGain);
        if (currentWhiteNoise) {
            try { currentWhiteNoise.stop(); } catch (e) { console.log('stop error', e); }
            try { currentWhiteNoise.disconnect(); } catch (e) { console.log('disconnect error', e); }
            currentWhiteNoise = null;
        }
        if (currentNoiseGain) {
            try { currentNoiseGain.disconnect(); } catch (e) { console.log('gain disconnect error', e); }
            currentNoiseGain = null;
        }
    }

    // Play a Morse code string as sound (with noise)
    function playMorse(morse, wpm, onComplete) {
        const unit = 1200 / wpm;
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtx;
        let time = ctx.currentTime;

        // Generate noise
        stopNoise();
        currentNoiseGain = ctx.createGain();
        currentNoiseGain.gain.value = noiseLevel / 100;

        let bufferSize = ctx.sampleRate * 2;
        let noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        let output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        currentWhiteNoise = ctx.createBufferSource();
        currentWhiteNoise.buffer = noiseBuffer;
        currentWhiteNoise.loop = true;
        currentWhiteNoise.connect(currentNoiseGain).connect(ctx.destination);
        if (noiseLevel > 0) currentWhiteNoise.start(time);

        // Play a single Morse tone
        function playTone(duration) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = 700;

            let minQsb = 1 - (qsbLevel / 100);
            let qsb = qsbLevel > 0 ? (minQsb + Math.random() * (1 - minQsb)) : 1.0;
            gain.gain.value = qsb;

            osc.connect(gain).connect(ctx.destination);
            osc.start(time);
            osc.stop(time + duration / 1000);
            time += duration / 1000;
        }

        // Play Morse code sequence
        for (let symbol of morse) {
            if (symbol === '.') {
                playTone(unit);
                time += unit / 1000;
            } else if (symbol === '-') {
                playTone(3 * unit);
                time += unit / 1000;
            } else if (symbol === ' ') {
                time += 2 * unit / 1000;
            }
        }
        setTimeout(() => {
            stopNoise();
            if (onComplete) onComplete();
        }, (time - ctx.currentTime) * 1000);
    }

    // Start the next quiz round
    function quizNext() {
        result.innerHTML = '';
        if (currentIndex >= rufzeichenListe.length) {
            shuffleArray(rufzeichenListe);
            currentIndex = 0;
        }
        const call = rufzeichenListe[currentIndex];

        // Show hint and speak it
        quizContainer.innerHTML = `
        <div class="alert alert-warning text-center py-3" style="font-size:1.3em;">
            ⭐ ${t('new_round')} ⭐<br>
            <small>${t('new_call')}</small>
        </div>
    `;
        if ('speechSynthesis' in window) {
            const langObj = availableLanguages.find(l => l.code === lang);
            const utter = new SpeechSynthesisUtterance(
                `${t('new_round')}. ${t('new_call')}`
            );
            utter.lang = langObj ? langObj.voice : 'de-DE';
            window.speechSynthesis.speak(utter);
        }

        // After pause, play Morse code
        setTimeout(() => {
            let played = 0;
            function repeatMorse() {
                if (isPaused) {
                    pauseCallback = repeatMorse;
                    stopNoise();
                    return;
                }
                if (played < repeatCount) {
                    const morse = textToMorse(call);
                    quizContainer.innerHTML = `<div class="alert alert-info text-center py-3">${t('playing')}<br><span class="badge bg-secondary">${played + 1} / ${repeatCount}</span></div>`;
                    playMorse(morse, wpm, () => {
                        played++;
                        if (played < repeatCount) {
                            setTimeout(() => {
                                if (isPaused) {
                                    pauseCallback = repeatMorse;
                                    stopNoise();
                                } else {
                                    repeatMorse();
                                }
                            }, pauseSeconds * 1000);
                        } else {
                            setTimeout(() => {
                                showResult(call);
                            }, pauseSeconds * 1000);
                        }
                    });
                }
            }
            repeatMorse();
        }, pauseSeconds * 1000);
    }

    // Show the solution and speak it
    function showResult(call) {
        stopNoise();
        quizContainer.innerHTML = `<div class="alert alert-success text-center py-3">${t('solution')}<br><span class="display-5 fw-bold">${call}</span></div>`;
        if ('speechSynthesis' in window) {
            const langObj = availableLanguages.find(l => l.code === lang);
            const utter = new SpeechSynthesisUtterance(`${t('solution')} ${call.split('').join(' ')}`);
            utter.lang = langObj ? langObj.voice : 'de-DE';
            window.speechSynthesis.speak(utter);
        }
        if (autoMode) {
            setTimeout(() => {
                currentIndex++;
                quizNext();
            }, pauseSeconds * 1000);
        }
    }

    // Render the control buttons
    function renderControls() {
        controls.innerHTML = `
            <div class="d-flex flex-wrap justify-content-center gap-2 mb-2">
                <button id="nextBtn" class="btn btn-primary"${autoMode || !isStarted || isPaused ? ' disabled' : ''}>${t('next')}</button>
                <button id="pauseBtn" class="btn btn-secondary">${!isStarted ? t('start') : (isPaused ? t('resume') : t('pause'))}</button>
                <div class="form-check form-switch ms-2">
                    <input class="form-check-input" type="checkbox" id="autoSwitch" ${autoMode ? 'checked' : ''}>
                    <label class="form-check-label" for="autoSwitch">${t('auto')}</label>
                </div>
            </div>
        `;
        document.getElementById('nextBtn').onclick = () => {
            if (!autoMode && isStarted && !isPaused) {
                currentIndex++;
                quizNext();
            }
        };
        document.getElementById('pauseBtn').onclick = () => {
            if (!isStarted) {
                unlockAudioContext();
                isStarted = true;
                isPaused = false;
                renderControls();
                quizNext();
            } else {
                isPaused = !isPaused;
                renderControls();
                if (isPaused) stopNoise();
                if (!isPaused && typeof pauseCallback === 'function') {
                    pauseCallback();
                    pauseCallback = null;
                }
            }
        };
        document.getElementById('autoSwitch').onchange = (e) => {
            autoMode = e.target.checked;
            localStorage.setItem('autoMode', autoMode);
            renderControls();
        };
    }

    // Render the settings form
    function renderSettings() {
        settings.innerHTML = `
        <form class="row g-2 justify-content-center mb-3 text-center">
            <div class="col-12">
                <h5 class="mb-3">${t('settings') || ''}</h5>
            </div>
            <div class="col-12 col-sm-6 col-md-3 mb-2">
                <label for="wpmInput" class="form-label mb-0 small w-100">${t('wpm')}</label>
                <input type="number" min="10" max="40" class="form-control form-control-sm text-center mx-auto" style="max-width:120px;" id="wpmInput" value="${wpm}">
            </div>
            <div class="col-12 col-sm-6 col-md-3 mb-2">
                <label for="pauseInput" class="form-label mb-0 small w-100">${t('pause_seconds')}</label>
                <input type="number" min="1" max="120" class="form-control form-control-sm text-center mx-auto" style="max-width:120px;" id="pauseInput" value="${pauseSeconds}">
            </div>
            <div class="col-12 col-sm-6 col-md-3 mb-2">
                <label for="repeatInput" class="form-label mb-0 small w-100">${t('repeat')}</label>
                <input type="number" min="1" max="10" class="form-control form-control-sm text-center mx-auto" style="max-width:120px;" id="repeatInput" value="${repeatCount}">
            </div>
            <div class="col-12 col-md-6 mb-2">
                <label for="noiseInput" class="form-label mb-0 small w-100">${t('noise')}</label>
                <div class="d-flex flex-column align-items-center">
                    <input type="range" min="0" max="100" step="1" class="form-range" id="noiseInput" value="${noiseLevel}" style="max-width:200px;">
                    <div>
                        <span id="noiseValue">${noiseLevel}</span>% 
                        <span class="small ms-2" title="${t('noise_help')}">?</span>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6 mb-2">
                <label for="qsbInput" class="form-label mb-0 small w-100">${t('qsb')}</label>
                <div class="d-flex flex-column align-items-center">
                    <input type="range" min="0" max="100" step="1" class="form-range" id="qsbInput" value="${qsbLevel}" style="max-width:200px;">
                    <div>
                        <span id="qsbValue">${qsbLevel}</span>% 
                        <span class="small ms-2" title="${t('qsb_help')}">?</span>
                    </div>
                </div>
            </div>
        </form>
    `;
        document.getElementById('wpmInput').addEventListener('change', (e) => {
            wpm = Math.max(10, Math.min(40, Number(e.target.value)));
            localStorage.setItem('wpm', wpm);
            e.target.value = wpm;
        });
        document.getElementById('pauseInput').addEventListener('change', (e) => {
            pauseSeconds = Math.max(1, Math.min(120, Number(e.target.value)));
            localStorage.setItem('pauseSeconds', pauseSeconds);
            e.target.value = pauseSeconds;
        });
        document.getElementById('repeatInput').addEventListener('change', (e) => {
            repeatCount = Math.max(1, Math.min(10, Number(e.target.value)));
            localStorage.setItem('repeatCount', repeatCount);
            e.target.value = repeatCount;
        });
        document.getElementById('noiseInput').addEventListener('input', (e) => {
            noiseLevel = Number(e.target.value);
            localStorage.setItem('noiseLevel', noiseLevel);
            document.getElementById('noiseValue').innerText = noiseLevel;
        });
        document.getElementById('qsbInput').addEventListener('input', (e) => {
            qsbLevel = Number(e.target.value);
            localStorage.setItem('qsbLevel', qsbLevel);
            document.getElementById('qsbValue').innerText = qsbLevel;
        });
    }

    // Update the entire UI
    function updateAll() {
        headline.innerText = t('headline');
        renderLanguageSelect();
        renderSettings();
        renderControls();
        if (!isStarted) {
            quizContainer.innerHTML = `<div class="alert alert-info text-center py-3">${t('press_start')}</div>`;
        }
    }

    // Load the call sign list and translations on startup
    fetch('data/rufzeichen.json')
        .then(res => res.json())
        .then(data => {
            rufzeichenListe = data;
            shuffleArray(rufzeichenListe);
            loadTranslations(() => {
                updateAll();
            });
        })
        .catch(() => {
            quizContainer.innerHTML = `<div class="alert alert-danger text-center py-3">${t('error_loading')}</div>`;
        });
});