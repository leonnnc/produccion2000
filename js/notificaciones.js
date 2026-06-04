import { DB } from '../firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const sesionRaw = sessionStorage.getItem('sesion_activa');
    if (!sesionRaw) return;
    
    const sesion = JSON.parse(sesionRaw);
    if (!sesion || !sesion.uid) return;

    const btnTrigger = document.getElementById('notif-trigger');
    const dropdown = document.getElementById('notif-dropdown');
    const badge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');
    const btnMarcarLeidas = document.getElementById('btn-marcar-leidas');

    if (!btnTrigger || !dropdown) return;

    let notificacionesActuales = [];

    // Toggle dropdown
    btnTrigger.addEventListener('click', () => {
        dropdown.classList.toggle('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notificaciones-widget')) {
            dropdown.classList.add('hidden');
        }
    });

    // Escuchar notificaciones en tiempo real
    DB.listenNotificaciones(sesion.uid, (notificaciones) => {
        notificacionesActuales = notificaciones;
        renderNotificaciones();
    });

    function renderNotificaciones() {
        if (!notifList) return;
        
        const noLeidas = notificacionesActuales.filter(n => !n.leida);
        
        // Actualizar Badge
        if (noLeidas.length > 0) {
            badge.style.display = 'block';
            badge.textContent = noLeidas.length > 9 ? '9+' : noLeidas.length;
            btnTrigger.classList.add('pulsing-badge');
        } else {
            badge.style.display = 'none';
            btnTrigger.classList.remove('pulsing-badge');
        }

        if (notificacionesActuales.length === 0) {
            notifList.innerHTML = `<div style="padding:15px;font-size:0.85rem;color:var(--text-muted);text-align:center;">No tienes notificaciones nuevas.</div>`;
            return;
        }

        notifList.innerHTML = '';
        notificacionesActuales.slice(0, 20).forEach(noti => {
            const el = document.createElement('div');
            const bg = noti.leida ? 'transparent' : 'rgba(255, 71, 87, 0.1)';
            const border = noti.leida ? 'rgba(255,255,255,0.05)' : 'rgba(255, 71, 87, 0.3)';
            
            // Format Date
            const d = new Date(noti.fecha);
            const timeStr = d.toLocaleTimeString('es', {hour: '2-digit', minute:'2-digit'});
            const dateStr = d.toLocaleDateString('es', {day: 'numeric', month: 'short'});

            el.style.cssText = `padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:8px;cursor:pointer;transition:background 0.2s;`;
            el.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                    <strong style="font-size:0.85rem;color:var(--text-main);">${noti.titulo}</strong>
                    <span style="font-size:0.65rem;color:var(--text-muted);">${dateStr} ${timeStr}</span>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.3;">${noti.mensaje}</div>
            `;
            
            el.addEventListener('click', () => {
                if (!noti.leida) {
                    DB.marcarNotificacionLeida(sesion.uid, noti.id);
                }
            });
            
            notifList.appendChild(el);
        });
    }

    if (btnMarcarLeidas) {
        btnMarcarLeidas.addEventListener('click', () => {
            const noLeidas = notificacionesActuales.filter(n => !n.leida);
            noLeidas.forEach(n => {
                DB.marcarNotificacionLeida(sesion.uid, n.id);
            });
        });
    }
});
