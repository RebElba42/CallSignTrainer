// Copyright (c) 2025 RebElba
// Released under the MIT License. See LICENSE file for details.

document.addEventListener('DOMContentLoaded', () => {
    let wakeLock = null;

    // Try to request a wake lock (prevent screen from sleeping)
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    //console.log('Wake Lock was released');
                });
                //console.log('Wake Lock is active');
            }
        } catch (err) {
            console.log('Wake Lock error:', err);
        }
    }

    // Re-acquire wake lock on visibility change (e.g. after screen off)
    document.addEventListener('visibilitychange', () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });

    // Set Theme CSS dynamically based on saved theme
    document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    });

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

    const DEFAULTS = {
        wpm: 20,
        pauseSeconds: 5,
        repeatCount: 3,
        noiseType: 'white',
        noiseLevel: 28,
        qsbLevel: 62,
        autoMode: true,
        qrmEnabled: true,
        qrmLevel: 0,
        preCallMode: 'vvv',
        lang: 'de'
    };

    // Global variables for settings and state
    let availableLanguages = [];
    let loadedLangs = 0;
    let translations = {};
    // Use defaults if nothing is stored yet
    let wpm = Number(localStorage.getItem('wpm')) || DEFAULTS.wpm;
    let pauseSeconds = Number(localStorage.getItem('pauseSeconds')) || DEFAULTS.pauseSeconds;
    let repeatCount = Number(localStorage.getItem('repeatCount')) || DEFAULTS.repeatCount;
    let noiseType = localStorage.getItem('noiseType') || DEFAULTS.noiseType;
    let noiseLevel = Number(localStorage.getItem('noiseLevel')) || DEFAULTS.noiseLevel;
    let qrmEnabled = localStorage.getItem('qrmEnabled') === 'true';
    let qrmLevel = Number(localStorage.getItem('qrmLevel')) || DEFAULTS.qrmLevel;
    let qsbLevel = Number(localStorage.getItem('qsbLevel')) || DEFAULTS.qsbLevel;
    let autoMode = localStorage.getItem('autoMode') === 'false' ? false : DEFAULTS.autoMode;
    let preCallMode = localStorage.getItem('preCallMode') || DEFAULTS.preCallMode;
    let lang = localStorage.getItem('lang') || DEFAULTS.lang;

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
    let currentQrmOsc = null

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
        if (currentWhiteNoise) {
            try {
                if (typeof currentWhiteNoise.stop === 'function') currentWhiteNoise.stop();
                if (typeof currentWhiteNoise.disconnect === 'function') currentWhiteNoise.disconnect();
            } catch (e) { }
            currentWhiteNoise = null;
        }
        if (currentNoiseGain) {
            try { currentNoiseGain.disconnect(); } catch (e) { }
            currentNoiseGain = null;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        // Stop the QRM oscillator if it exists
        if (currentQrmOsc) {
            try {
                currentQrmOsc.osc.stop();
                currentQrmOsc.osc.disconnect();
                currentQrmOsc.gain.disconnect();
            } catch (e) { }
            currentQrmOsc = null;
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

        // Generate noise according to selected type (white, pink, brown, QRN, QRM)
        if (noiseLevel > 0) {
            let noiseNode;
            if (noiseType === 'white') {
                // White noise
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
                currentWhiteNoise.start(time);
            } else if (noiseType === 'pink') {
                // Pink noise using ScriptProcessorNode
                let bufferSize = 4096;
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                noiseNode = ctx.createScriptProcessor(bufferSize, 1, 1);
                noiseNode.onaudioprocess = function (e) {
                    let output = e.outputBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        let white = Math.random() * 2 - 1;
                        b0 = 0.99886 * b0 + white * 0.0555179;
                        b1 = 0.99332 * b1 + white * 0.0750759;
                        b2 = 0.96900 * b2 + white * 0.1538520;
                        b3 = 0.86650 * b3 + white * 0.3104856;
                        b4 = 0.55000 * b4 + white * 0.5329522;
                        b5 = -0.7616 * b5 - white * 0.0168980;
                        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                        output[i] *= 0.11;
                        b6 = white * 0.115926;
                    }
                };
                noiseNode.connect(currentNoiseGain).connect(ctx.destination);
                currentWhiteNoise = noiseNode;
            } else if (noiseType === 'brown') {
                // Brown noise using ScriptProcessorNode
                let bufferSize = 4096;
                let lastOut = 0.0;
                noiseNode = ctx.createScriptProcessor(bufferSize, 1, 1);
                noiseNode.onaudioprocess = function (e) {
                    let output = e.outputBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        let white = Math.random() * 2 - 1;
                        lastOut = (lastOut + (0.02 * white)) / 1.02;
                        output[i] = lastOut * 3.5;
                    }
                };
                noiseNode.connect(currentNoiseGain).connect(ctx.destination);
                currentWhiteNoise = noiseNode;
            } else if (noiseType === 'qrn') {
                // QRN: Static/impulse noise (random short spikes)
                let bufferSize = 4096;
                noiseNode = ctx.createScriptProcessor(bufferSize, 1, 1);
                noiseNode.onaudioprocess = function (e) {
                    let output = e.outputBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        // Mostly silence, sometimes a spike
                        output[i] = (Math.random() < 0.995) ? 0 : (Math.random() * 2 - 1) * 0.8;
                    }
                };
                noiseNode.connect(currentNoiseGain).connect(ctx.destination);
                currentWhiteNoise = noiseNode;
            } else if (noiseType === 'qrm') {
                // QRM: CW interference (background Morse tone)
                let osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 650 + Math.random() * 100; // Randomize a bit
                osc.connect(currentNoiseGain).connect(ctx.destination);
                osc.start(time);
                currentWhiteNoise = osc;
            }
        }

        // If QRM is enabled, add a background Morse tone
        if (qrmLevel > 0) {
            let qrmOsc = ctx.createOscillator();
            qrmOsc.type = 'sine';
            qrmOsc.frequency.value = 650 + Math.random() * 100;
            let qrmGain = ctx.createGain();
            qrmGain.gain.value = qrmLevel / 100; // 0 bis 0.73
            qrmOsc.connect(qrmGain).connect(ctx.destination);
            qrmOsc.start(time);
            currentQrmOsc = { osc: qrmOsc, gain: qrmGain };
        } else {
            currentQrmOsc = null;
        }

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

    function doPreCall(nextStep) {
        if (preCallMode === 'speech') {
            // Speech output (language-dependent)
            if ('speechSynthesis' in window) {
                const langObj = availableLanguages.find(l => l.code === lang);
                const utter = new SpeechSynthesisUtterance(
                    t('pre_call_speech')
                );
                utter.lang = langObj ? langObj.voice : 'de-DE';
                utter.onend = nextStep;

                // Stimme setzen (wie in showResult)
                const selectedVoiceURI = localStorage.getItem('voiceURI') || '';
                const voices = window.speechSynthesis.getVoices();
                if (selectedVoiceURI) {
                    const found = voices.find(v => v.voiceURI === selectedVoiceURI);
                    if (found) utter.voice = found;
                } else {
                    let preferred = voices.find(v => v.lang === utter.lang && v.gender === 'female');
                    if (!preferred) preferred = voices.find(v => v.lang === utter.lang && /google|apple/i.test(v.name));
                    if (!preferred) preferred = voices.find(v => v.lang === utter.lang);
                    if (preferred) utter.voice = preferred;
                }

                window.speechSynthesis.speak(utter);
            } else {
                nextStep();
            }
        } else {
            // Morse "V V V"
            const vvv = textToMorse('V V V');
            // Save current settings
            const oldNoise = noiseLevel;
            const oldQsb = qsbLevel;
            const oldQrm = qrmLevel;
            noiseLevel = 0;
            qsbLevel = 0;
            qrmLevel = 0;
            playMorse(vvv, wpm, () => {
                // Restore settings
                noiseLevel = oldNoise;
                qsbLevel = oldQsb;
                qrmLevel = oldQrm;
                nextStep();
            });
        }
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

        // Pre-call announcement (speech or VVV), then pause, then Morse code
        doPreCall(() => {
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
        });
    }

    // Show the solution and speak it
    function showResult(call) {
        stopNoise();
        quizContainer.innerHTML = `<div class="alert alert-success text-center py-3">${t('solution')}<br><span class="display-5 fw-bold">${call}</span></div>`;
        if ('speechSynthesis' in window) {
            const langObj = availableLanguages.find(l => l.code === lang);
            const utter = new SpeechSynthesisUtterance(`${t('solution')} ${call.split('').join(' ')}`);
            utter.lang = langObj ? langObj.voice : 'de-DE';
            // Stimme setzen:
            const selectedVoiceURI = localStorage.getItem('voiceURI') || '';
            const voices = window.speechSynthesis.getVoices();
            if (selectedVoiceURI) {
                const found = voices.find(v => v.voiceURI === selectedVoiceURI);
                if (found) utter.voice = found;
            } else {
                let preferred = voices.find(v => v.lang === utter.lang && v.gender === 'female');
                if (!preferred) preferred = voices.find(v => v.lang === utter.lang && /google|apple/i.test(v.name));
                if (!preferred) preferred = voices.find(v => v.lang === utter.lang);
                if (preferred) utter.voice = preferred;
            }
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
                requestWakeLock();
                unlockAudioContext();
                isStarted = true;
                isPaused = false;
                renderControls();
                quizNext();
            } else {
                isPaused = !isPaused;
                renderControls();
                if (isPaused) stopNoise();
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                if (!isPaused && typeof pauseCallback === 'function') {
                    pauseCallback();
                    pauseCallback = null;
                }
                if (typeof activeTimeout !== 'undefined' && activeTimeout) {
                    clearTimeout(activeTimeout);
                    activeTimeout = null;
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
        <div class="accordion" id="settingsAccordion">
        <div class="accordion-item">
            <h2 class="accordion-header" id="headingGeneral">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseGeneral" aria-expanded="false" aria-controls="collapseGeneral">
                ${t('settings_group_general')}
            </button>
            </h2>
            <div id="collapseGeneral" class="accordion-collapse collapse" aria-labelledby="headingGeneral" data-bs-parent="#settingsAccordion">
            <div class="accordion-body">
                <!-- General settings here -->
                <div class="mb-2 d-flex flex-column">
                    <label for="wpmInput" class="form-label mb-0 small w-100">${t('wpm')}</label>
                    <input type="number" min="5" max="50" required class="form-control form-control-sm" style="max-width:120px;" id="wpmInput" value="${wpm}">
                </div>
                <div class="mb-2 d-flex flex-column">
                    <label for="pauseInput" class="form-label mb-0 small w-100">${t('pause_seconds')}</label>
                    <input type="number" min="1" max="10" required class="form-control form-control-sm" style="max-width:120px;" id="pauseInput" value="${pauseSeconds}">
                </div>
                <div class="mb-2 d-flex flex-column">
                    <label for="repeatInput" class="form-label mb-0 small w-100">${t('repeat')}</label>
                    <input type="number" min="1" max="10" required class="form-control form-control-sm" style="max-width:120px;" id="repeatInput" value="${repeatCount}">
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
                        <option value="white" ${noiseType === 'white' ? 'selected' : ''}>${t('noise_type_white')}</option>
                        <option value="pink" ${noiseType === 'pink' ? 'selected' : ''}>${t('noise_type_pink')}</option>
                        <option value="brown" ${noiseType === 'brown' ? 'selected' : ''}>${t('noise_type_brown')}</option>
                        <option value="qrn" ${noiseType === 'qrn' ? 'selected' : ''}>${t('noise_type_qrn')}</option>
                    </select>
                </div>
                <div class="mb-2">
                    <label for="noiseInput" class="form-label mb-0 small w-100">${t('noise')}</label>
                    <input type="range" min="0" max="100" step="1" class="form-range" id="noiseInput" value="${noiseLevel}" style="max-width:200px;">
                    <span id="noiseValue">${noiseLevel}</span>%
                </div>
                <div class="mb-2">
                    <label for="qrmInput" class="form-label mb-0 small w-100">${t('noise_type_qrm')}</label>
                    <input type="range" min="0" max="73" step="1" class="form-range" id="qrmInput" value="${qrmLevel}" style="max-width:200px;">
                    <span id="qrmValue">${qrmLevel}</span>%
                </div>
                <div class="mb-2">
                    <label for="qsbInput" class="form-label mb-0 small w-100">${t('qsb')}</label>
                    <input type="range" min="0" max="100" step="1" class="form-range" id="qsbInput" value="${qsbLevel}" style="max-width:200px;">
                    <span id="qsbValue">${qsbLevel}</span>%
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
                        <input class="form-check-input" type="radio" name="preCallMode" id="preCallSpeech" value="speech" ${localStorage.getItem('preCallMode') !== 'vvv' ? 'checked' : ''}>
                        <label class="form-check-label" for="preCallSpeech">${t('pre_call_speech_v')}</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="preCallMode" id="preCallVVV" value="vvv" ${localStorage.getItem('preCallMode') === 'vvv' ? 'checked' : ''}>
                        <label class="form-check-label" for="preCallVVV">${t('pre_call_morse_v')}</label>
                    </div>
                </div>
                <div class="mb-2 d-flex flex-column">
                    <label for="themeSelect" class="form-label mb-0 small w-100">${t('theme')}</label>
                    <select id="themeSelect" class="form-select form-select-sm" style="max-width:200px;">
                        <option value="dark">${t('theme_dark')}</option>
                        <option value="cerulean">${t('theme_cerulean')}</option>
                        <option value="cosmo">${t('theme_cosmo')}</option>
                        <option value="flatly">${t('theme_flatly')}</option>
                        <option value="lumen">${t('theme_lumen')}</option>
                        <option value="minty">${t('theme_minty')}</option>
                        <option value="sandstone">${t('theme_sandstone')}</option>
                        <option value="slate">${t('theme_slate')}</option>
                        <option value="spacelab">${t('theme_spacelab')}</option>
                        <option value="superhero">${t('theme_superhero')}</option>
                        <option value="yeti">${t('theme_yeti')}</option>
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
            </div>
            </div>
        </div>
        </div>
        `;

        document.getElementById('qrmInput').addEventListener('input', (e) => {
            qrmLevel = Number(e.target.value);
            localStorage.setItem('qrmLevel', qrmLevel);
            document.getElementById('qrmValue').innerText = qrmLevel;
        });

        // Event listener for noise type selection
        document.getElementById('noiseTypeInput').addEventListener('change', (e) => {
            noiseType = e.target.value;
            localStorage.setItem('noiseType', noiseType);
        });

        // Event listener for pre-call mode
        document.querySelectorAll('input[name="preCallMode"]').forEach(el => {
            el.addEventListener('change', (e) => {
                preCallMode = e.target.value; // Variable sofort aktualisieren!
                localStorage.setItem('preCallMode', preCallMode);
            });
        });

        document.getElementById('wpmInput').addEventListener('change', (e) => {
            wpm = Math.max(5, Math.min(50, Number(e.target.value)));
            localStorage.setItem('wpm', wpm);
            e.target.value = wpm;
        });

        document.getElementById('pauseInput').addEventListener('change', (e) => {
            pauseSeconds = Math.max(1, Math.min(10, Number(e.target.value)));
            localStorage.setItem('pauseSeconds', pauseSeconds);
            e.target.value = pauseSeconds;
        });

        document.getElementById('repeatInput').addEventListener('change', (e) => {
            repeatCount = Math.max(1, Math.min(10, Number(e.target.value)));
            localStorage.setItem('repeatCount', repeatCount);
            e.target.value = repeatCount;
        });

        // ...nach den bisherigen Event-Listenern für wpmInput, pauseInput, repeatInput...

        // Custom Validity für WPM
        const wpmInput = document.getElementById('wpmInput');
        wpmInput.addEventListener('input', (e) => {
            if (e.target.value < 5 || e.target.value > 50) {
                e.target.setCustomValidity(t('wpm_hint'));
                e.target.reportValidity();
            } else {
                e.target.setCustomValidity('');
            }
        });

        // Custom Validity für Pause
        const pauseInput = document.getElementById('pauseInput');
        pauseInput.addEventListener('input', (e) => {
            if (e.target.value < 1 || e.target.value > 10) {
                e.target.setCustomValidity(t('pause_hint'));
                e.target.reportValidity();
            } else {
                e.target.setCustomValidity('');
            }
        });

        // Custom Validity für Wiederholungen
        const repeatInput = document.getElementById('repeatInput');
        repeatInput.addEventListener('input', (e) => {
            if (e.target.value < 1 || e.target.value > 10) {
                e.target.setCustomValidity(t('repeat_hint'));
                e.target.reportValidity();
            } else {
                e.target.setCustomValidity('');
            }
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

        // Accordion state: restore from localStorage
        ['General', 'Noise', 'Announce'].forEach(group => {
            const key = `settingsAccordion_${group}`;
            const collapse = document.getElementById(`collapse${group}`);
            if (collapse && localStorage.getItem(key) === 'show') {
                new bootstrap.Collapse(collapse, { show: true, toggle: true });
            }
            // Listener für Statusänderung
            collapse.addEventListener('show.bs.collapse', () => localStorage.setItem(key, 'show'));
            collapse.addEventListener('hide.bs.collapse', () => localStorage.setItem(key, 'hide'));
        });

        const themeSelect = document.getElementById('themeSelect');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        themeSelect.value = savedTheme;

        // Load Theme CSS dynamically
        setTheme(savedTheme);

        themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            setTheme(theme);
            localStorage.setItem('theme', theme);
        });

        function setTheme(theme) {
            let themeHref = themeMap[theme] || themeMap['dark'];
            let themeLink = document.getElementById('theme-css');
            if (!themeLink) {
                // Fallback: Theme-Link dynamisch einfügen, falls nicht vorhanden
                themeLink = document.createElement('link');
                themeLink.rel = 'stylesheet';
                themeLink.id = 'theme-css';
                document.head.appendChild(themeLink);
            }
            themeLink.href = themeHref;
        }

        // Populate voice selection
        const voiceSelect = document.getElementById('voiceSelect');
        const savedVoiceURI = localStorage.getItem('voiceURI') || '';

        function populateVoices() {
            if (!('speechSynthesis' in window)) return;
            const voices = window.speechSynthesis.getVoices();
            // Filter nach aktueller Sprache
            const langObj = availableLanguages.find(l => l.code === lang);
            const langCode = langObj ? langObj.voice : 'de-DE';
            // Nur Stimmen für die aktuelle Sprache
            const filtered = voices.filter(v => v.lang === langCode);
            // Sortiere: bevorzugt weiblich, dann Google/Apple, dann Rest
            filtered.sort((a, b) => {
                // Weiblich bevorzugen
                if (a.gender === 'female' && b.gender !== 'female') return -1;
                if (a.gender !== 'female' && b.gender === 'female') return 1;
                // Google/Apple bevorzugen
                if (/google|apple/i.test(a.name) && !/google|apple/i.test(b.name)) return -1;
                if (!/google|apple/i.test(a.name) && /google|apple/i.test(b.name)) return 1;
                return a.name.localeCompare(b.name);
            });
            // Dropdown befüllen
            voiceSelect.innerHTML = `<option value="">${t('voice_default')}</option>`;
            filtered.forEach(voice => {
                voiceSelect.innerHTML += `<option value="${voice.voiceURI}"${voice.voiceURI === savedVoiceURI ? ' selected' : ''}>${voice.name} (${voice.lang})</option>`;
            });
        }
        if ('speechSynthesis' in window) {
            populateVoices();
            // Stimmen können asynchron nachgeladen werden
            window.speechSynthesis.onvoiceschanged = populateVoices;
        }

        // Auswahl speichern
        voiceSelect.addEventListener('change', (e) => {
            localStorage.setItem('voiceURI', e.target.value);
        });

        // Test button for voice
        document.getElementById('voiceTestBtn').addEventListener('click', () => {
            if ('speechSynthesis' in window) {
                const langObj = availableLanguages.find(l => l.code === lang);
                const utter = new SpeechSynthesisUtterance(t('new_round'));
                utter.lang = langObj ? langObj.voice : 'de-DE';
                const selectedVoiceURI = localStorage.getItem('voiceURI') || '';
                const voices = window.speechSynthesis.getVoices();
                if (selectedVoiceURI) {
                    const found = voices.find(v => v.voiceURI === selectedVoiceURI);
                    if (found) utter.voice = found;
                } else {
                    let preferred = voices.find(v => v.lang === utter.lang && v.gender === 'female');
                    if (!preferred) preferred = voices.find(v => v.lang === utter.lang && /google|apple/i.test(v.name));
                    if (!preferred) preferred = voices.find(v => v.lang === utter.lang);
                    if (preferred) utter.voice = preferred;
                }
                window.speechSynthesis.cancel(); // Stop any running speech
                window.speechSynthesis.speak(utter);
            }
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