// ==========================================
// SCRIPT.JS — Login / Registro con Firebase
// ==========================================
import { DB, AUTH } from './firebase.js';
import { showNotification } from './utils.js';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
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

            try {
                const userCredential = await AUTH.login(correo, clave);
                const usuarios = await DB.getUsuarios();
                const usuario = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());

                if (!usuario) {
                    btn.textContent = 'Iniciar Sesión';
                    btn.style.pointerEvents = 'all';
                    showNotification('Usuario autenticado pero sin perfil en la base de datos.', 'error');
                    AUTH.logout();
                    return;
                }

                btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Ingresando...';
                sessionStorage.setItem('sesion_activa', JSON.stringify({
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol:    usuario.rol,
                    area:   usuario.area || '',
                    uid:    userCredential.user.uid
                }));
                showNotification(`¡Bienvenido, ${usuario.nombre.split(' ')[0]}!`);
                setTimeout(() => { window.location.replace('dashboard.html'); }, 900);
            } catch (error) {
                btn.textContent = 'Iniciar Sesión';
                btn.style.pointerEvents = 'all';
                console.error("Login error:", error);
                
                // Tratar el caso donde el usuario existe en DB pero no en Auth (ej: antiguos)
                const usuarios = await DB.getUsuarios();
                const existeAntiguo = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());
                if (existeAntiguo && error.code === 'auth/invalid-credential') {
                    showNotification('Debido a una actualización de seguridad, necesitas restablecer tu contraseña. Ve a "¿Olvidaste tu contraseña?".', 'error');
                } else {
                    showNotification('Credenciales incorrectas o usuario no existe.', 'error');
                }
            }
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
            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Registrando...';
            btn.style.pointerEvents = 'none';

            try {
                // Crear usuario en Firebase Auth (Lanza error si el correo ya existe)
                const userCredential = await AUTH.registrar(correo, pwd);

                // Como ya estamos autenticados, podemos leer/escribir en la base de datos
                const usuarios = await DB.getUsuarios();
                usuarios.push({
                    uid: userCredential.user.uid,
                    nombre: `${nombre} ${apellido}`.trim(),
                    correo,
                    area,
                    telefono,
                    rol: 'Siervo',
                    fecha: new Date().toISOString()
                });
                await DB.setUsuarios(usuarios);

                showNotification('¡Registro exitoso! Ya puedes iniciar sesión.');
                btn.textContent = 'Completar Registro';
                btn.style.pointerEvents = 'all';
                e.target.reset();
                switchPanel(registerPanel, loginPanel);
                
                // Por seguridad cerramos la sesión generada por el registro automático
                AUTH.logout();
            } catch (error) {
                btn.textContent = 'Completar Registro';
                btn.style.pointerEvents = 'all';
                console.error("Registro error:", error);
                if (error.code === 'auth/email-already-in-use') {
                    showNotification('Ya existe una cuenta con ese correo.', 'error');
                } else {
                    showNotification('Error al registrar: ' + (error.message || 'Intenta de nuevo'), 'error');
                }
            }
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

            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Enviando...';
            btn.style.pointerEvents = 'none';

            try {
                await AUTH.recuperar(correo);
                
                // Mostrar confirmación
                const resultDiv = document.getElementById('forgot-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <p style="font-size:0.95rem;color:var(--accent-green);text-align:center;margin-bottom:8px;">
                        ✓ Enlace de recuperación enviado.
                    </p>
                    <p style="font-size:0.85rem;color:var(--text-muted);text-align:center;">
                        Por favor, revisa tu bandeja de entrada o la carpeta de SPAM para restablecer tu contraseña.
                    </p>
                `;
                
                btn.textContent = 'Generar Enlace Temporal';
                btn.style.pointerEvents = 'all';
                showNotification('Enlace de recuperación enviado.');
            } catch (error) {
                btn.textContent = 'Generar Enlace Temporal';
                btn.style.pointerEvents = 'all';
                console.error("Recovery error:", error);
                if (error.code === 'auth/user-not-found') {
                    showNotification('No encontramos una cuenta con ese correo.', 'error');
                } else {
                    showNotification('No se pudo enviar el correo de recuperación.', 'error');
                }
            }
        });
    }
});
