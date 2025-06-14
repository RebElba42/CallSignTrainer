/**
 * morse.js
 * 
 * Provides functions for converting text to Morse code and playing Morse code audio.
 * 
 * Author: DB4REB
 * License: MIT
 */

import { settings, getCurrentCallsignFrequency } from './settings.js';

export const morseTable = {
    "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".",
    "F": "..-.", "G": "--.", "H": "....", "I": "..", "J": ".---",
    "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---",
    "P": ".--.", "Q": "--.-", "R": ".-.", "S": "...", "T": "-",
    "U": "..-", "V": "...-", "W": ".--", "X": "-..-", "Y": "-.--",
    "Z": "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--",
    "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..",
    "9": "----."
};

/**
 * Seconds before noise stops after the last Morse character.
 * This is used to ensure the noise doesn't cut off abruptly.
 * It allows the user to hear the end of the Morse transmission.
 * This is especially important for the last character in a callsign.
 */
const NOISE_TAIL_SECONDS = 1.0;

/**
 * Converts a given text string to Morse code using the morseTable.
 * Non-mappable characters are ignored.
 * @param {string} text - The input text to convert.
 * @returns {string} The Morse code representation.
 */
export function textToMorse(text) {
    return text.toUpperCase().split('').map(ch => morseTable[ch] || '').join(' ');
}

let audioCtx = null;
let audioUnlocked = false;
let currentWhiteNoise = null;
let currentNoiseGain = null;
let currentQrmOsc = null;

/**
 * Unlocks the AudioContext on user interaction to enable audio playback,
 * which is required by some browsers' autoplay policies.
 */
export function unlockAudioContext() {
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

/**
 * Stops all currently playing noise and optionally cancels speech synthesis.
 * Cleans up audio nodes for white noise, QRM, and other noise types.
 * @param {boolean} cancelSpeech - Whether to cancel speech synthesis (default: true).
 */
export function stopNoise(cancelSpeech = true) {
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
    if (cancelSpeech && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (currentQrmOsc) {
        try {
            currentQrmOsc.osc.stop();
            currentQrmOsc.osc.disconnect();
            currentQrmOsc.gain.disconnect();
        } catch (e) { }
        currentQrmOsc = null;
    }
}

/**
 * Plays a Morse code string as audio, including optional noise and QRM/QSB effects.
 * Calls the onComplete callback when playback is finished.
 * @param {string} morse - Morse code string to play.
 * @param {number} wpm - Words per minute (character speed).
 * @param {number} farnsworthWpm - Farnsworth speed (overall speed).
 * @param {string} noiseType - Type of noise to add ("white", "pink", "brown", "qrn", "qrm").
 * @param {number} noiseLevel - Noise volume (0-100).
 * @param {number} qsbLevel - QSB (fading) level (0-100).
 * @param {number} qrmLevel - QRM (interference) level (0-73).
 * @param {Function} onComplete - Callback when playback is finished.
 */
export function playMorse(morse, wpm, farnsworthWpm, noiseType, noiseLevel, qsbLevel, qrmLevel, onComplete) {
    const unit = 1200 / wpm;
    const farnsworthUnit = 1200 / farnsworthWpm;
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtx;
    let time = ctx.currentTime;

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

    const isVVV = morse.replace(/\s/g, '').toLowerCase() === "...-...-...-";
    const delay = isVVV ? 0 : (settings.delayBeforeMorse || 0);

    setTimeout(() => {
        playCallsignMorse(ctx, morse, unit, farnsworthUnit, qsbLevel, onComplete, isVVV);
    }, delay * 1000);
}

/**
 * Plays a Morse code sequence as audio tones using the given AudioContext.
 * Handles Farnsworth timing and QSB effects.
 * Calls onComplete when finished.
 * @param {AudioContext} ctx - The audio context to use.
 * @param {string} morse - Morse code string.
 * @param {number} unit - Duration of a Morse "dit" in ms.
 * @param {number} farnsworthUnit - Farnsworth unit duration in ms.
 * @param {number} qsbLevel - QSB (fading) level.
 * @param {Function} onComplete - Callback when playback is finished.
 */
function playCallsignMorse(ctx, morse, unit, farnsworthUnit, qsbLevel, onComplete, isVVV) {
    let time = ctx.currentTime;
    let frequency = getCurrentCallsignFrequency();

    if (isVVV) {
        frequency = 700;
    }

    //console.log(`Playing Morse: ${morse} at frequency ${frequency}Hz with unit ${unit}ms and farnsworth unit ${farnsworthUnit}ms`);

    // Play a single Morse tone
    function playTone(duration) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = frequency;

        let minQsb = 1 - (qsbLevel / 100);
        let qsb = qsbLevel > 0 ? (minQsb + Math.random() * (1 - minQsb)) : 1.0;
        gain.gain.setValueAtTime(0, time); // Start silent
        gain.gain.linearRampToValueAtTime(qsb, time + 0.005); // Fade-in in 5ms
        gain.gain.setValueAtTime(qsb, time + duration / 1000 - 0.005); // Hold level
        gain.gain.linearRampToValueAtTime(0, time + duration / 1000); // Fade-out in 5ms

        osc.connect(gain).connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration / 1000);
        time += duration / 1000;
    }

    // Play Morse code sequence with farnsworth timing
    for (let symbol of morse) {
        if (symbol === '.') {
            playTone(unit);
            time += unit / 1000;
        } else if (symbol === '-') {
            playTone(3 * unit);
            time += unit / 1000;
        } else if (symbol === ' ') {
            time += (farnsworthUnit * 3) / 1000;
        }
    }
    setTimeout(() => {
        setTimeout(() => {
            stopNoise();
        }, NOISE_TAIL_SECONDS * 1000);
        if (onComplete) onComplete();
    }, (time - ctx.currentTime) * 1000);
}