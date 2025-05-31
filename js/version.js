export const VERSION = "v1.0.1";

export function setVersionBadge() {
    // Try to find a footer element, or create one if missing
    let footer = document.querySelector('footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'footer mt-4';
        document.body.appendChild(footer);
    }
    let container = footer.querySelector('.container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'container text-center py-2';
        footer.appendChild(container);
    }
    // Create or update the badge
    let badge = container.querySelector('.version-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge bg-secondary version-badge';
        badge.style.fontSize = '0.8em';
        container.appendChild(badge);
    }
    badge.textContent = VERSION;
}