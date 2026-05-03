// ==========================================
// UTILS.JS — Utilidades compartidas
// ==========================================

/**
 * Hashea una contraseña usando SHA-256 (Web Crypto API).
 * Retorna el hash en formato hex.
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Muestra una notificación toast en pantalla.
 * @param {string} message - Texto a mostrar
 * @param {'success'|'error'} type - Tipo de notificación
 */
export function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const iconSvg = type === 'success'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"></path></svg>';
    notification.innerHTML = `<div class="notification-icon">${iconSvg}</div><div class="notification-message">${message}</div>`;
    container.appendChild(notification);
    requestAnimationFrame(() => requestAnimationFrame(() => notification.classList.add('show')));
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 4500);
}
