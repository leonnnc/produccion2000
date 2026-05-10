// ==========================================
// SCRIPT.JS — Login / Registro con Firebase
// ==========================================
import { DB } from './firebase.js';
import { hashPassword, showNotification } from './utils.js';

// ─── ADMIN POR DEFECTO ───────────────────────────────────
async function crearAdminPorDefecto() {
    const usuarios = await DB.getUsuarios();
    const adminIdx = usuarios.findIndex(u => u.rol === 'Admin');
    const claveCorrecta = await hashPassword('Admin2024!');

    if (adminIdx === -1) {
        // No existe ningún admin — crear uno nuevo con SHA-256
        usuarios.unshift({
            nombre: 'Administrador',
            correo: 'admin@produccion.com',
            clave: claveCorrecta,
            area: 'Administración',
            telefono: '',
            rol: 'Admin',
            fecha: new Date().toISOString()
        });
        await DB.setUsuarios(usuarios);
    } else {
        // Ya existe un admin — asegurarse de que su clave sea el hash correcto
        // de 'Admin2024!' (no btoa, no hash de btoa, sino hash del texto plano)
        const admin = usuarios[adminIdx];
        if (admin.clave !== claveCorrecta) {
            admin.clave = claveCorrecta;
            await DB.setUsuarios(usuarios);
        }
    }
}

// ─── MIGRACIÓN: btoa → SHA-256 ───────────────────────────
// Convierte contraseñas antiguas en base64 a SHA-256 la primera vez que el
// usuario inicia sesión correctamente con la clave en texto plano.
async function migrarClavesSiNecesario(usuarios) {
    const migrado = localStorage.getItem('claves_migradas_sha256');
    if (migrado) return usuarios;

    let cambios = false;
    for (const u of usuarios) {
        // Las claves SHA-256 tienen 64 chars hex; las btoa son más cortas y
        // contienen caracteres base64 (A-Z, a-z, 0-9, +, /, =).
        if (u.clave && u.clave.length < 64) {
            try {
                // Decodificar la clave base64 y re-hashear con SHA-256
                const claveTexto = atob(u.clave);
                u.clave = await hashPassword(claveTexto);
                cambios = true;
            } catch (_) { /* ignorar si no es base64 válido */ }
        }
    }
    if (cambios) {
        await DB.setUsuarios(usuarios);
        localStorage.setItem('claves_migradas_sha256', '1');
    }
    return usuarios;
}

// Estilos de animación
const style = document.createElement('style');
style.textContent = `@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', async () => {
    const loginPanel      = document.getElementById('login-panel');
    const registerPanel   = document.getElementById('register-panel');
    const forgotPanel     = document.getElementById('forgot-panel');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn    = document.getElementById('show-login');
    const showForgotBtn   = document.getElementById('show-forgot');
    const showLoginFromForgotBtn = document.getElementById('show-login-from-forgot');

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
    if (showForgotBtn)   showForgotBtn.addEventListener('click',   (e) => { e.preventDefault(); switchPanel(loginPanel, forgotPanel); });
    if (showLoginFromForgotBtn) showLoginFromForgotBtn.addEventListener('click', (e) => { e.preventDefault(); switchPanel(forgotPanel, loginPanel); });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Mínimo 8 caracteres, al menos una letra y un número
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

            let usuarios = await DB.getUsuarios();
            // Migrar claves antiguas (btoa → SHA-256) de forma transparente
            usuarios = await migrarClavesSiNecesario(usuarios);

            const usuario = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());

            if (!usuario) {
                btn.textContent = 'Iniciar Sesión';
                btn.style.pointerEvents = 'all';
                const regCorreo = document.getElementById('reg-correo');
                if (regCorreo) regCorreo.value = correo;
                switchPanel(loginPanel, registerPanel);
                showNotification('No encontramos esa cuenta. Completa tu registro.', 'error');
                return;
            }

            const claveHash = await hashPassword(clave);
            if (usuario.clave !== claveHash) {
                btn.textContent = 'Iniciar Sesión';
                btn.style.pointerEvents = 'all';
                showNotification('Contraseña incorrecta. Intenta de nuevo.', 'error');
                return;
            }

            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Ingresando...';
            // Guardamos solo datos no sensibles en sesión — el rol se verifica
            // contra Firebase al cargar el dashboard.
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

            const claveHash = await hashPassword(pwd);
            usuarios.push({
                nombre: `${nombre} ${apellido}`.trim(),
                correo,
                clave: claveHash,
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

    // ─── RECUPERACIÓN DE CONTRASEÑA ──────────────────────────
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const correo = document.getElementById('forgot-email').value.trim();
            const btn    = e.target.querySelector('button[type="submit"]');

            if (!emailRegex.test(correo)) {
                showNotification('Ingresa un correo válido.', 'error');
                return;
            }

            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Buscando...';
            btn.style.pointerEvents = 'none';

            const usuarios = await DB.getUsuarios();
            const usuario  = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());

            if (!usuario) {
                btn.textContent = 'Generar Clave Temporal';
                btn.style.pointerEvents = 'all';
                showNotification('No encontramos una cuenta con ese correo.', 'error');
                return;
            }

            // Generar clave temporal de 8 caracteres (letras + números)
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            let claveTemporal = '';
            for (let i = 0; i < 8; i++) claveTemporal += chars[Math.floor(Math.random() * chars.length)];

            const claveHash = await hashPassword(claveTemporal);
            const idx = usuarios.findIndex(u => u.correo.toLowerCase() === correo.toLowerCase());
            usuarios[idx].clave = claveHash;
            usuarios[idx].clave_temporal = true;
            await DB.setUsuarios(usuarios);

            // Mostrar clave temporal en pantalla
            document.getElementById('forgot-result').style.display = 'block';
            document.getElementById('forgot-clave-display').textContent = claveTemporal;
            btn.textContent = 'Generar Clave Temporal';
            btn.style.pointerEvents = 'all';
            showNotification('Clave temporal generada. Úsala para ingresar.');
        });
    }
});
