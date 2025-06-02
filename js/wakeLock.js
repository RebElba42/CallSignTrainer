/**
 * wakeLock.js
 * 
 * Provides functions to request and release a screen Wake Lock,
 * preventing the device from dimming or locking the screen during training sessions.
 * 
 * Author: DB4REB
 * License: MIT
 */

let wakeLock = null;

/**
 * Requests a screen Wake Lock to keep the device awake.
 * If the Wake Lock is released (e.g., by the system), a message is logged.
 */
export async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
            });
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

/**
 * Releases the previously acquired Wake Lock, if any.
 */
export function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}