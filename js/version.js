/**
 * version.js
 * 
 * Contains the application version and logic to display it in the UI.
 * 
 * Author: DB4REB
 * License: MIT
 */
export const VERSION = "v1.1.1";

/**
 * Sets or updates the version badge in the footer of the page.
 */
export function setVersionBadge() {
    // Try to find  the version badge element
    const badge = document.getElementById('version-badge');
    if (badge) {
        badge.className = 'badge bg-secondary version-badge';
        badge.style.fontSize = '0.8em';
        badge.textContent = VERSION;
    }
}