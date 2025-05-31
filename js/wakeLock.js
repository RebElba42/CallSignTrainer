let wakeLock = null;

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

export function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}