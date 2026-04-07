// ==========================================
// SCRIPT.JS — Login / Registro con Firebase
// ==========================================
import { DB } from './firebase.js';

// ─── ADMIN POR DEFECTO ───────────────────────────────────
async function crearAdminPorDefecto() {
    const usuarios = await DB.getUsuarios();
    const tieneAdmin = usuarios.some(u => u.rol === 'Admin');
    if (!tieneAdmin) {
        usuarios.unshift({
            nombre: 'Administrador',
            correo: 'admin@produccion.com',
            clave: btoa('Admin2024!'),
            area: 'Administración',
            telefono: '',
            rol: 'Admin',
            fecha: new Date().toISOString()
        });
        await DB.setUsuarios(usuarios);
    }
}

// Estilos de animación
const style = document.createElement('style');
style.textContent = `@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`;
document.head.appendChild(style);

// ─── NOTIFICACIONES ──────────────────────────────────────
const showNotification = (message, type = 'success') => {
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
    setTimeout(() => { notification.classList.remove('show'); setTimeout(() => notification.remove(), 400); }, 4500);
};

document.addEventListener('DOMContentLoaded', async () => {
    const loginPanel      = document.getElementById('login-panel');
    const registerPanel   = document.getElementById('register-panel');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn    = document.getElementById('show-login');

    if (!loginPanel) return;

    if (sessionStorage.getItem('sesion_activa')) {
        window.location.replace('dashboard.html');
        return;
    }

    // Migrar datos locales a Firebase si existen
    await DB.migrarDesdeLocalStorage();
    // Crear admin por defecto si no existe
    await crearAdminPorDefecto();

    const switchPanel = (hidePanel, showPanel) => {
        hidePanel.style.opacity = '0';
        hidePanel.style.transform = 'translateY(-20px) scale(0.95)';
        setTimeout(() => {
            hidePanel.classList.add('hidden');
            hidePanel.style.opacity = '';
            hidePanel.style.transform = '';
            showPanel.classList.remove('hidden');
            void showPanel.offsetWidth;
            showPanel.style.opacity = '1';
            showPanel.style.transform = 'translateY(0) scale(1)';
        }, 300);
    };

    if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); switchPanel(loginPanel, registerPanel); });
    if (showLoginBtn)    showLoginBtn.addEventListener('click',    (e) => { e.preventDefault(); switchPanel(registerPanel, loginPanel); });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function validarClave(pwd) { return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd); }
    function mostrarError(inputId, msg) {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.style.borderColor = '#ff4757';
        let hint = el.parentElement.querySelector('.field-hint');
        if (!hint) { hint = document.createElement('span'); hint.className = 'field-hint'; el.parentElement.appendChild(hint); }
        hint.textContent = msg; hint.style.color = '#ff4757';
    }
    function limpiarError(inputId) {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.style.borderColor = '';
        const hint = el.parentElement.querySelector('.field-hint');
        if (hint) hint.textContent = '';
    }

    // ─── LOGIN ───────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const correo = document.getElementById('login-email').value.trim();
            const clave  = document.getElementById('login-password').value;
            const btn    = e.target.querySelector('button[type="submit"]');

            if (!emailRegex.test(correo)) { showNotification('El correo no tiene un formato válido.', 'error'); return; }
            if (!clave) { showNotification('Ingresa tu contraseña.', 'error'); return; }

            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Verificando...';
            btn.style.pointerEvents = 'none';

            const usuarios = await DB.getUsuarios();
            const usuario  = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());

            if (!usuario) {
                btn.textContent = 'Iniciar Sesión';
                btn.style.pointerEvents = 'all';
                const regCorreo = document.getElementById('reg-correo');
                if (regCorreo) regCorreo.value = correo;
                switchPanel(loginPanel, registerPanel);
                showNotification('No encontramos esa cuenta. Completa tu registro.', 'error');
                return;
            }
            if (usuario.clave !== btoa(clave)) {
                btn.textContent = 'Iniciar Sesión';
                btn.style.pointerEvents = 'all';
                showNotification('Contraseña incorrecta. Intenta de nuevo.', 'error');
                return;
            }

            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Ingresando...';
            sessionStorage.setItem('sesion_activa', JSON.stringify({
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol:    usuario.rol,
                area:   usuario.area || ''
            }));
            showNotification(`¡Bienvenido, ${usuario.nombre.split(' ')[0]}!`);
            setTimeout(() => { window.location.replace('dashboard.html'); }, 900);
        });
    }

    // ─── REGISTRO ────────────────────────────────────────────
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let valido = true;

            const nombre   = document.getElementById('reg-nombre')?.value.trim() || '';
            const apellido = document.getElementById('reg-apellido')?.value.trim() || '';
            const correo   = document.getElementById('reg-correo')?.value.trim() || '';
            const area     = document.getElementById('reg-area')?.value || '';
            const telefono = document.getElementById('reg-telefono')?.value.trim() || '';
            const pwd      = document.getElementById('reg-password')?.value || '';
            const pwdConf  = document.getElementById('reg-password-confirm')?.value || '';

            if (!nombre)   { mostrarError('reg-nombre',   'Campo requerido'); valido = false; } else limpiarError('reg-nombre');
            if (!apellido) { mostrarError('reg-apellido', 'Campo requerido'); valido = false; } else limpiarError('reg-apellido');
            if (!emailRegex.test(correo)) { mostrarError('reg-correo', 'Correo no válido'); valido = false; } else limpiarError('reg-correo');
            if (!area)     { mostrarError('reg-area',     'Selecciona un área'); valido = false; } else limpiarError('reg-area');
            if (!validarClave(pwd)) { mostrarError('reg-password', 'Mín. 8 chars, incluye letras y números'); valido = false; } else limpiarError('reg-password');
            if (pwd !== pwdConf)    { mostrarError('reg-password-confirm', 'Las contraseñas no coinciden'); valido = false; } else limpiarError('reg-password-confirm');

            if (!valido) return;

            const btn = e.target.querySelector('button[type="submit"]');
            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Verificando...';
            btn.style.pointerEvents = 'none';

            const usuarios = await DB.getUsuarios();
            if (usuarios.some(u => u.correo.toLowerCase() === correo.toLowerCase())) {
                btn.textContent = 'Completar Registro';
                btn.style.pointerEvents = 'all';
                showNotification('Ya existe una cuenta con ese correo.', 'error');
                return;
            }

            usuarios.push({
                nombre: `${nombre} ${apellido}`.trim(),
                correo,
                clave: btoa(pwd),
                area,
                telefono,
                rol: 'Siervo',
                fecha: new Date().toISOString()
            });
            await DB.setUsuarios(usuarios);

            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Registrando...';
            setTimeout(() => {
                showNotification('¡Registro exitoso! Ya puedes iniciar sesión.');
                btn.textContent = 'Completar Registro';
                btn.style.pointerEvents = 'all';
                e.target.reset();
                switchPanel(registerPanel, loginPanel);
            }, 1200);
        });
    }
});
