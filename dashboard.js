// ==========================================
// DASHBOARD ERP — dashboard.js
// ==========================================
import { DB } from './firebase.js';
import { hashPassword, showNotification } from './utils.js';

// ─── CAPA DE COMPATIBILIDAD localStorage ↔ Firebase ─────
// Sincroniza Firebase → localStorage al cargar, y localStorage → Firebase al escribir
const SYNC_KEYS = [
    'usuarios_registrados','proyectos_creados',
    'servicios_reservados','asistencias_proyectos','aceptaciones_tareas',
    'comentarios','recursos_pdfs','recursos_videos','lideres_area'
];

// Parchear localStorage.setItem para sincronizar a Firebase automáticamente
const _lsSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
    _lsSetItem(key, value);
    if (!SYNC_KEYS.includes(key)) return;
    try {
        const data = JSON.parse(value);
        const writeMap = {
            'usuarios_registrados': () => DB.setUsuarios(data),
            'proyectos_creados':    () => DB.setProyectos(data),
            'servicios_reservados': () => DB.setServicios(data),
            'asistencias_proyectos':() => DB.setAsistencias(data),
            'aceptaciones_tareas':  () => DB.setAceptaciones(data),
            'comentarios':          () => DB.setComentarios(data),
            'recursos_pdfs':        () => DB.setPdfs(data),
            'recursos_videos':      () => DB.setVideos(data),
            'lideres_area':         () => DB.setLideres(data),
        };
        if (writeMap[key]) writeMap[key]().catch(() => {});
    } catch(e) {}
};

async function sincronizarDesdeFirebase() {
    await Promise.all(SYNC_KEYS.map(async key => {
        try {
            let data;
            const methodMap = {
                'usuarios_registrados':  () => DB.getUsuarios(),
                'proyectos_creados':     () => DB.getProyectos(),
                'servicios_reservados':  () => DB.getServicios(),
                'asistencias_proyectos': () => DB.getAsistencias(),
                'aceptaciones_tareas':   () => DB.getAceptaciones(),
                'comentarios':           () => DB.getComentarios(),
                'recursos_pdfs':         () => DB.getPdfs(),
                'recursos_videos':       () => DB.getVideos(),
                'lideres_area':          () => DB.getLideres(),
            };
            if (methodMap[key]) {
                data = await methodMap[key]();
                if (data !== null && data !== undefined) {
                    _lsSetItem(key, JSON.stringify(data));
                }
            }
        } catch(e) { /* ignorar errores de sincronización */ }
    }));
}

// Variable global para el offset de la agenda
let agendaMonthOffset = 0;

// Constantes globales
const ADMIN_MAESTRO = 'admin@produccion.com';

const AREA_MAP = {
    'visuales': 'Visuales', 'filmakers': 'Filmakers', 'fotografia': 'Fotografía',
    'coordinacion': 'Coordinación', 'switchers': 'Switchers', 'streaming': 'Streaming',
    'luces': 'Luces', 'diseno': 'Diseño', 'edicion': 'Edición',
    'protocolos': 'Protocolos', 'camaras': 'Cámaras', 'administracion': 'Administración'
};

function normalizarArea(area) {
    if (!area) return '';
    return AREA_MAP[area.toLowerCase()] || area;
}

const SERVICIOS_SEMANA = [
    { label: '☀️ Domingo · 1er Servicio (7:30 AM)',  value: 'dom-1' },
    { label: '☀️ Domingo · 2do Servicio (11:00 AM)', value: 'dom-2' },
    { label: '☀️ Domingo · 3er Servicio (1:00 PM)',  value: 'dom-3' },
    { label: '☀️ Domingo · 4to Servicio (7:00 PM)',  value: 'dom-4' },
    { label: '🌙 Miércoles · Servicio (7:00 PM)',    value: 'mie-1' },
];

// showNotification se importa desde utils.js

function confirmar(titulo, mensaje, onOk) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent   = titulo;
    document.getElementById('confirm-message').textContent = mensaje;
    modal.classList.remove('hidden');
    const btnOkOld = document.getElementById('confirm-ok');
    const btnOk    = btnOkOld.cloneNode(true);
    btnOkOld.parentNode.replaceChild(btnOk, btnOkOld);
    const btnCancel = document.getElementById('confirm-cancel');
    const close = () => modal.classList.add('hidden');
    btnOk.addEventListener('click', () => { close(); onOk(); });
    btnCancel.onclick = close;
}

document.addEventListener('DOMContentLoaded', async () => {

    // Sincronizar datos desde Firebase antes de renderizar
    await sincronizarDesdeFirebase();

    const sesionRaw = sessionStorage.getItem('sesion_activa');
    let sesion      = sesionRaw ? JSON.parse(sesionRaw) : null;
    if (!sesion) { window.location.replace('index.html'); return; }

    // ─── VERIFICACIÓN DE ROL CONTRA FIREBASE ─────────────────
    // Evita que un usuario manipule su rol en sessionStorage.
    try {
        const usuarios = await DB.getUsuarios();
        const usuarioReal = usuarios.find(u => u.correo.toLowerCase() === sesion.correo.toLowerCase());
        if (!usuarioReal) {
            // La cuenta fue eliminada mientras estaba activa
            sessionStorage.removeItem('sesion_activa');
            window.location.replace('index.html');
            return;
        }
        // Sincronizar rol y área desde Firebase (fuente de verdad)
        if (usuarioReal.rol !== sesion.rol || usuarioReal.area !== sesion.area || usuarioReal.nombre !== sesion.nombre) {
            sesion.rol    = usuarioReal.rol;
            sesion.area   = usuarioReal.area || '';
            sesion.nombre = usuarioReal.nombre;
            sessionStorage.setItem('sesion_activa', JSON.stringify(sesion));
        }
    } catch (e) {
        // Continuar con la sesión local si hay error de red
    }

    const displayRole = document.querySelector('.user-role');
    if (displayRole) {
        const roleMap = { 'Admin': 'Administrador', 'SuperLider': 'Super Líder', 'Lider': 'Líder', 'Siervo': 'Siervo' };
        displayRole.textContent = roleMap[sesion.rol] || 'Siervo';
    }

    const avatarEl = document.querySelector('.user-info .avatar');
    if (avatarEl) {
        const iniciales = sesion.nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.textContent = iniciales;
        avatarEl.style.fontSize = '1rem';
        avatarEl.style.fontWeight = '800';
    }

    const esAdmin = sesion.rol === 'Admin' || sesion.rol === 'SuperLider';
    const esLider = sesion.rol === 'Lider';

    const permitido = {
        'Admin':      ['dashboard-view','usuarios-view','proyectos-view','agenda-view','recursos-view','ajustes-view'],
        'SuperLider': ['dashboard-view','usuarios-view','proyectos-view','agenda-view','recursos-view','ajustes-view'],
        'Lider':      ['dashboard-view','usuarios-view','agenda-view','recursos-view'],
        'Siervo':     ['dashboard-view','agenda-view','recursos-view']
    };
    const acceso = permitido[sesion.rol] || permitido['Siervo'];
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.parentElement.style.display = acceso.includes(link.getAttribute('data-target')) ? '' : 'none';
    });

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        const text = link.textContent.trim();
        if (text) link.setAttribute('title', text);
    });
    document.querySelector('.logout-btn')?.setAttribute('title', 'Cerrar Sesion');

    document.querySelector('.logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        confirmar('Cerrar sesion', '\u00bfSeguro que quieres salir?', () => {
            sessionStorage.removeItem('sesion_activa');
            window.location.replace('index.html');
        });
    });

    const navLinks     = document.querySelectorAll('.sidebar-nav .nav-link');
    const viewSections = document.querySelectorAll('.view-section');

    function irA(targetId) {
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        const link = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (link) link.parentElement.classList.add('active');
        viewSections.forEach(v => { v.classList.remove('active-view'); v.classList.add('hidden-view'); });
        const target = document.getElementById(targetId);
        if (target) { target.classList.remove('hidden-view'); target.classList.add('active-view'); }
        // Regenerar agenda al navegar a ella
        if (targetId === 'agenda-view') setTimeout(() => generateAgendaMonth(), 100);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); irA(link.getAttribute('data-target')); });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) document.getElementById(modalId)?.classList.add('hidden');
        });
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    });

    // ─── ESTADISTICAS ────────────────────────────────────────
    function actualizarEstadisticas() {
        const sets = [
            { key: 'usuarios_registrados', statId: 'stat-usuarios',  labelId: 'stat-usuarios-label',  empty: 'Sin registros', filled: n => `${n} activos`,
              filter: arr => arr.filter(u => u.correo?.toLowerCase() !== ADMIN_MAESTRO) },
            { key: 'proyectos_creados',    statId: 'stat-proyectos', labelId: 'stat-proyectos-label', empty: 'Sin proyectos', filled: n => `${n} en total` },
            { key: 'servicios_reservados', statId: 'stat-servicios', labelId: 'stat-servicios-label', empty: 'Sin reservas',  filled: n => `${n} este mes` },
        ];
        sets.forEach(({ key, statId, labelId, empty, filled, filter }) => {
            let arr = JSON.parse(localStorage.getItem(key) || '[]');
            if (filter) arr = filter(arr);
            const n = arr.length;
            const el = document.getElementById(statId);
            const lb = document.getElementById(labelId);
            if (el) el.textContent = n;
            if (lb) { lb.textContent = n === 0 ? empty : filled(n); lb.className = `trend ${n > 0 ? 'positive' : 'neutral'}`; }
        });
    }
    actualizarEstadisticas();

    // ─── TARJETA DE BIENVENIDA CON ROL Y ACCESOS ─────────────
    const bienvenidaContent = document.getElementById('bienvenida-content');
    if (bienvenidaContent) {
        const hora = new Date().getHours();
        const momento = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
        const roleMap = { 'Admin': 'Administrador', 'SuperLider': 'Super Líder', 'Lider': 'Líder', 'Siervo': 'Siervo' };
        const rolLabel = roleMap[sesion.rol] || 'Siervo';
        const roleColors = { 'Admin': '#ff4757', 'SuperLider': '#ff6b6b', 'Lider': '#4facfe', 'Siervo': '#2ed573' };
        const rolColor = roleColors[sesion.rol] || '#2ed573';

        const accesosPorRol = {
            'Admin':      ['Dashboard', 'Usuarios', 'Proyectos', 'Agenda', 'Recursos', 'Ajustes'],
            'SuperLider': ['Dashboard', 'Usuarios', 'Proyectos', 'Agenda', 'Recursos', 'Ajustes'],
            'Lider':      ['Dashboard', 'Usuarios', 'Agenda', 'Recursos'],
            'Siervo':     ['Dashboard', 'Agenda', 'Recursos']
        };
        const accesos = accesosPorRol[sesion.rol] || accesosPorRol['Siervo'];

        bienvenidaContent.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;text-align:center;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:800;color:white;flex-shrink:0;box-shadow:0 0 16px rgba(79,172,254,0.3);">
                    ${sesion.nombre.split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:700;">${momento}, <span style="color:var(--primary-color);">${sesion.nombre.split(' ')[0]}</span> &nbsp;·&nbsp; <span style="color:${rolColor};font-weight:600;">${rolLabel}</span>${sesion.area ? ` &nbsp;·&nbsp; <span style="color:var(--text-muted);font-size:0.85rem;">${sesion.area}</span>` : ''}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:6px;">
                        ${accesos.map(a => `<span style="background:rgba(79,172,254,0.1);border:1px solid rgba(79,172,254,0.25);border-radius:20px;padding:2px 10px;font-size:0.72rem;color:var(--primary-color);">${a}</span>`).join('')}
                    </div>
                </div>
            </div>`;
    }

    // ─── CARDS DE USUARIOS ───────────────────────────────────
    const usuariosContainer = document.getElementById('usuarios-cards-container');

    function accionesParaRol(u) {
        // Solo Admin y SuperLider pueden editar usuarios
        if (!esAdmin) return '';
        const editBtn  = `<button class="btn-secondary btn-edit" style="padding:5px 10px;font-size:0.75rem;">✏️ Editar</button>`;
        const resetBtn = `<button class="btn-secondary btn-reset-pwd" style="padding:5px 10px;font-size:0.75rem;" title="Resetear contraseña">🔑 Reset</button>`;
        const delBtn   = `<button class="btn-danger btn-del" style="padding:5px 10px;font-size:0.75rem;">🗑️</button>`;
        let extra = '';
        if (u.rol === 'Siervo') {
            extra = `<button class="btn-secondary btn-upgrade" data-role="lider" style="padding:5px 10px;font-size:0.75rem;color:#4facfe;border-color:rgba(79,172,254,0.4);">↑ Líder</button>
                     <button class="btn-secondary btn-upgrade" data-role="superlider" style="padding:5px 10px;font-size:0.75rem;color:#ff6b6b;border-color:rgba(255,107,107,0.4);">↑ SuperLíder</button>`;
        } else if (u.rol === 'Lider') {
            extra = `<button class="btn-downgrade btn-downgrade-btn" data-role="siervo" style="padding:5px 10px;font-size:0.75rem;">↓ Siervo</button>
                     <button class="btn-secondary btn-upgrade" data-role="superlider" style="padding:5px 10px;font-size:0.75rem;color:#ff6b6b;border-color:rgba(255,107,107,0.4);">↑ SuperLíder</button>`;
        } else if (u.rol === 'SuperLider') {
            extra = `<button class="btn-downgrade btn-downgrade-btn" data-role="lider" style="padding:5px 10px;font-size:0.75rem;">↓ Líder</button>`;
        } else if (u.rol === 'Admin') {
            // Admin oculto — sin botones de cambio de rol
            extra = '';
        }
        return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">${editBtn}${resetBtn}${extra}${delBtn}</div>`;
    }

    function crearCardUsuario(u) {
        const roleClasses = { 'Admin': 'role-admin', 'SuperLider': 'role-superlider', 'Lider': 'role-lider', 'Siervo': 'role-siervo' };
        const rolClass = roleClasses[u.rol] || 'role-siervo';
        const iniciales = u.nombre.split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase();
        const roleColors = { 'Admin': '#ff4757', 'SuperLider': '#ff6b6b', 'Lider': '#4facfe', 'Siervo': '#2ed573' };
        const rolColor = roleColors[u.rol] || '#2ed573';
        const fechaReg = u.fecha ? new Date(u.fecha).toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' }) : '—';
        const card = document.createElement('div');
        card.dataset.correo = u.correo;
        card.className = 'usuario-card';
        card.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:4px;transition:border-color 0.2s;';
        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${rolColor}44,${rolColor}22);border:2px solid ${rolColor}66;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:${rolColor};flex-shrink:0;">${iniciales}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.nombre}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.correo}</div>
                </div>
                <span class="role-badge ${rolClass}" style="flex-shrink:0;">${u.rol}</span>
            </div>
            <div style="display:flex;gap:12px;font-size:0.8rem;color:var(--text-muted);flex-wrap:wrap;">
                <span>🎯 ${u.area || '—'}</span>
                <span>📞 ${u.telefono || '—'}</span>
                <span>📅 ${fechaReg}</span>
            </div>
            ${accionesParaRol(u)}`;
        return card;
    }

    // Migrar áreas legacy en localStorage (minúsculas → formato correcto)
    (function migrarAreas() {
        const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        let cambios = false;
        usuarios.forEach(u => {
            const normalizada = normalizarArea(u.area);
            if (normalizada !== u.area) { u.area = normalizada; cambios = true; }
        });
        if (cambios) localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
    })();

    function cargarTablaUsuarios(filtroRol = '', filtroArea = '') {
        if (!usuariosContainer) return;
        usuariosContainer.innerHTML = '';
        let usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        // Ocultar el admin maestro y todos los usuarios con rol Admin
        usuarios = usuarios.filter(u => u.correo.toLowerCase() !== ADMIN_MAESTRO && u.rol !== 'Admin');
        
        // Si es Líder, solo mostrar siervos de su área
        if (esLider) {
            const areaLider = (sesion.area || '').toLowerCase();
            usuarios = usuarios.filter(u => u.rol === 'Siervo' && (u.area || '').toLowerCase() === areaLider);
        }
        
        if (filtroRol)  usuarios = usuarios.filter(u => u.rol === filtroRol);
        if (filtroArea) usuarios = usuarios.filter(u => (u.area || '').toLowerCase() === filtroArea.toLowerCase());
        if (usuarios.length === 0) {
            usuariosContainer.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:10px;">👤</div><p>No hay usuarios con esos filtros.</p></div>`;
        } else {
            usuarios.forEach(u => usuariosContainer.appendChild(crearCardUsuario(u)));
        }
    }
    cargarTablaUsuarios();

    // Si es Líder: ocultar filtros y mostrar título con su área
    if (esLider) {
        document.getElementById('filtro-rol')?.closest('div')?.style && (document.getElementById('filtro-rol').closest('div[style]').style.display = 'none');
        const tituloEl = document.querySelector('#usuarios-view .panel-heading h2');
        if (tituloEl) tituloEl.textContent = `Siervos de ${sesion.area || 'mi área'}`;
    }

    document.getElementById('filtro-rol')?.addEventListener('change',  e => cargarTablaUsuarios(e.target.value, document.getElementById('filtro-area').value));
    document.getElementById('filtro-area')?.addEventListener('change', e => cargarTablaUsuarios(document.getElementById('filtro-rol').value, e.target.value));

    // ─── ACCIONES CARDS USUARIOS ─────────────────────────────
    const tablaUsuariosAdmin = document.getElementById('usuarios-cards-container');
    if (tablaUsuariosAdmin && esAdmin) {
        tablaUsuariosAdmin.addEventListener('click', (e) => {
            const card = e.target.closest('[data-correo]');
            if (!card) return;
            const correoUsuario = card.dataset.correo;
            if (e.target.classList.contains('btn-edit')) { openEditModalByCorreo(correoUsuario); }
            if (e.target.classList.contains('btn-reset-pwd')) {
                const nombre = card.querySelector('[style*="font-weight:700"]')?.textContent || correoUsuario;
                confirmar('Resetear contraseña', `¿Resetear la contraseña de "${nombre}"? Se establecerá como "Reset2024!".`, () => {
                    const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
                    const idx = usuarios.findIndex(u => u.correo === correoUsuario);
                    if (idx !== -1) {
                        hashPassword('Reset2024!').then(hash => {
                            usuarios[idx].clave = hash;
                            localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
                        });
                    }
                    showNotification(`Contraseña de "${nombre}" reseteada a "Reset2024!".`);
                });
            }
            if (e.target.classList.contains('btn-del')) {
                const nombre = card.querySelector('[style*="font-weight:700"]')?.textContent || correoUsuario;
                confirmar('Eliminar usuario', `¿Eliminar a "${nombre}"?`, () => {
                    let usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
                    usuarios = usuarios.filter(u => u.correo !== correoUsuario);
                    localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
                    cargarTablaUsuarios(); actualizarEstadisticas();
                    showNotification(`Usuario "${nombre}" eliminado.`);
                });
            }
            if (e.target.classList.contains('btn-upgrade')) {
                const targetRole = e.target.getAttribute('data-role');
                const nombre = card.querySelector('[style*="font-weight:700"]')?.textContent || '';
                const roleMap = { 'superlider': 'SuperLider', 'lider': 'Lider', 'siervo': 'Siervo' };
                const nomRolVer = roleMap[targetRole];
                if (!nomRolVer) return; // bloquear cualquier intento de asignar Admin
                confirmar('Cambiar rol', `¿Ascender a "${nombre}" como ${nomRolVer}?`, () => {
                    const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
                    const idx = usuarios.findIndex(u => u.correo === correoUsuario);
                    if (idx !== -1) { usuarios[idx].rol = nomRolVer; localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios)); }
                    cargarTablaUsuarios(document.getElementById('filtro-rol').value, document.getElementById('filtro-area').value);
                    showNotification(`${nombre} ahora es ${nomRolVer}.`);
                });
            }
            if (e.target.classList.contains('btn-downgrade-btn')) {
                const targetRole = e.target.getAttribute('data-role');
                const nombre = card.querySelector('[style*="font-weight:700"]')?.textContent || '';
                const roleMap = { 'superlider': 'SuperLider', 'lider': 'Lider', 'siervo': 'Siervo' };
                const nomRolVer = roleMap[targetRole];
                if (!nomRolVer) return; // bloquear cualquier intento de asignar Admin
                confirmar('Cambiar rol', `¿Degradar a "${nombre}" como ${nomRolVer}?`, () => {
                    const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
                    const idx = usuarios.findIndex(u => u.correo === correoUsuario);
                    if (idx !== -1) { usuarios[idx].rol = nomRolVer; localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios)); }
                    cargarTablaUsuarios(document.getElementById('filtro-rol').value, document.getElementById('filtro-area').value);
                    showNotification(`${nombre} ahora es ${nomRolVer}.`);
                });
            }
        });
    }

    const editModal = document.getElementById('edit-user-modal');
    const editForm  = document.getElementById('edit-user-form');
    let currentEditCorreo = null;

    function openEditModalByCorreo(correo) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        const u = usuarios.find(x => x.correo === correo);
        if (!u) return;
        currentEditCorreo = correo;
        document.getElementById('edit-nombre').value   = u.nombre;
        document.getElementById('edit-correo').value   = u.correo;
        document.getElementById('edit-password').value = '';
        const sel = document.getElementById('edit-area');
        if (sel) for (const opt of sel.options) opt.selected = opt.value === u.area;
        editModal.classList.remove('hidden');
    }

    editForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentEditCorreo) return;
        const nuevoNombre    = document.getElementById('edit-nombre').value.trim();
        const nuevoCorreo    = document.getElementById('edit-correo').value.trim();
        const nuevaArea      = document.getElementById('edit-area').value;
        const nuevaClave     = document.getElementById('edit-password').value;
        const correoOriginal = currentEditCorreo;
        const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        const idx = usuarios.findIndex(u => u.correo === correoOriginal);
        if (idx !== -1) {
            usuarios[idx].nombre = nuevoNombre; usuarios[idx].correo = nuevoCorreo; usuarios[idx].area = nuevaArea;
            if (nuevaClave) {
                hashPassword(nuevaClave).then(hash => {
                    usuarios[idx].clave = hash;
                    localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
                });
            } else {
                localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
            }
        }
        if (correoOriginal === sesion.correo) {
            sesion.nombre = nuevoNombre; sesion.correo = nuevoCorreo; sesion.area = nuevaArea;
            sessionStorage.setItem('sesion_activa', JSON.stringify(sesion));
            if (avatarEl) {
                const ini = nuevoNombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
                avatarEl.textContent = ini;
            }
        }
        cargarTablaUsuarios(document.getElementById('filtro-rol').value, document.getElementById('filtro-area').value);
        editModal.classList.add('hidden');
        showNotification('Usuario actualizado correctamente.');
    });

    // ─── AREAS COUNTER (+/-) ─────────────────────────────────
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('area-plus') || e.target.classList.contains('area-minus')) {
            const row   = e.target.closest('.area-row');
            const input = row?.querySelector('.area-cantidad');
            if (!input) return;
            const val = parseInt(input.value) || 0;
            input.value = e.target.classList.contains('area-plus') ? val + 1 : Math.max(0, val - 1);
            row.classList.toggle('area-activa', parseInt(input.value) > 0);
        }
        if (e.target.classList.contains('area-cantidad')) return;
    });
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('area-cantidad')) {
            const row = e.target.closest('.area-row');
            if (row) row.classList.toggle('area-activa', parseInt(e.target.value) > 0);
        }
    });

    // ─── PROYECTOS ───────────────────────────────────────────
    if (!esAdmin) {
        document.getElementById('crear-proyecto-panel')?.style && (document.getElementById('crear-proyecto-panel').style.display = 'none');
    }

    function estadoBadge(estado) {
        const cls = estado === 'Planificado' ? 'estado-planificado' : estado === 'En curso' ? 'estado-en-curso' : 'estado-completado';
        return `<span class="estado-badge ${cls}">${estado}</span>`;
    }

    function calcularEstadoProyecto(p) {
        if (!p.fecha) return 'Planificado';
        const hora = p.hora || '00:00';
        const fechaEvento = new Date(`${p.fecha}T${hora}:00`);
        const ahora = new Date();
        const manana = new Date(fechaEvento);
        manana.setDate(manana.getDate() + 1);
        manana.setHours(0, 0, 0, 0);
        if (ahora >= manana)      return 'Completado';
        if (ahora >= fechaEvento) return 'En curso';
        return 'Planificado';
    }

    function esProyectoActivo(p) {
        return calcularEstadoProyecto(p) !== 'Completado';
    }

    function cuentaRegresiva(p) {
        if (!p.fecha) return '';
        const hora = p.hora || '00:00';
        const fechaEvento = new Date(`${p.fecha}T${hora}:00`);
        const diff = fechaEvento - new Date();
        if (diff <= 0) return '';
        const dias  = Math.floor(diff / 86400000);
        const horas = Math.floor((diff % 86400000) / 3600000);
        const mins  = Math.floor((diff % 3600000) / 60000);
        if (dias > 0)  return `\u23f3 Faltan ${dias}d ${horas}h`;
        if (horas > 0) return `\u23f3 Faltan ${horas}h ${mins}m`;
        return `\u23f3 Faltan ${mins} min`;
    }

    function verificarAlertas() {
        const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const areaUsuario = (sesion.area || '').toLowerCase();
        proyectos.forEach(p => {
            if (!p.fecha || !p.hora) return;
            const fechaEvento = new Date(`${p.fecha}T${p.hora}:00`);
            const diff = fechaEvento - new Date();
            if (diff > 55 * 60000 && diff <= 65 * 60000) {
                const involucrado = esAdmin || (p.areasData && p.areasData.some(a => a.area.toLowerCase() === areaUsuario));
                if (!involucrado) return;
                const alertaKey = `alerta_1h_${p.fecha_registro}`;
                if (!localStorage.getItem(alertaKey)) {
                    showNotification(`\u26a0\ufe0f "${p.nombre}" comienza en 1 hora. \u00a1Prep\u00e1rate!`, 'success');
                    localStorage.setItem(alertaKey, '1');
                }
                const pushKey = `push_1h_${p.fecha_registro}`;
                if (!localStorage.getItem(pushKey)) {
                    enviarNotificacionPush(`\u26a0\ufe0f ${p.nombre}`, 'El evento comienza en 1 hora. \u00a1Prep\u00e1rate!');
                    localStorage.setItem(pushKey, '1');
                }
            }
        });
    }
    verificarAlertas();
    setInterval(verificarAlertas, 60000);

    // ─── NOTIFICACIONES PUSH DEL NAVEGADOR ───────────────────
    function solicitarPermisoNotificaciones() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    solicitarPermisoNotificaciones();

    function enviarNotificacionPush(titulo, cuerpo) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(titulo, { body: cuerpo, icon: '' });
        }
    }

    function renderProyectos() {
        const lista = document.getElementById('proyectos-lista');
        const historialEl = document.getElementById('proyectos-historial');
        const count = document.getElementById('proyectos-count');
        const historialCount = document.getElementById('historial-count');
        if (!lista) return;

        let proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const filtroEstado = document.getElementById('filtro-estado-proy')?.value || '';

        // Separar activos e historial usando el helper esProyectoActivo
        const activos   = proyectos.filter(p => esProyectoActivo(p));
        const historial = proyectos.filter(p => !esProyectoActivo(p));

        // Aplicar filtro de estado solo a activos; 'Completado' siempre da 0 resultados en el panel activo
        const activosFiltrados = filtroEstado
            ? activos.filter(p => calcularEstadoProyecto(p) === filtroEstado)
            : activos;

        if (count) count.textContent = activosFiltrados.length > 0 ? `${activosFiltrados.length} proyecto(s)` : '';
        if (historialCount) historialCount.textContent = `${historial.length}`;

        // ── Render activos ──
        lista.innerHTML = '';
        if (activosFiltrados.length === 0) {
            lista.innerHTML = '<p style="color:var(--text-muted);padding:16px 0;">No hay proyectos activos.</p>';
        } else {
            [...activosFiltrados].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach((p, i) => {
                const estado    = calcularEstadoProyecto(p);
                const regresiva = cuentaRegresiva(p);
                const card = document.createElement('div');
                const cardEstadoCls = estado === 'Planificado' ? 'estado-planificado-card' : 'estado-en-curso-card';
                card.className = `proyecto-card ${cardEstadoCls}`;
                card.dataset.fechaReg = p.fecha_registro;
                const fechaFmt = p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '\u2014';
                const horaFmt  = p.hora ? ` \u00b7 ${p.hora}` : '';
                const areasResumen = p.areasData ? p.areasData.map(a => `${a.area}(${a.cantidad})`).join(', ') : (p.areas || '\u2014');
                const realIdx = proyectos.indexOf(p);

                let asistenciaHtml = '';
                if (esAdmin && p.areasData) {
                    const asistencias = JSON.parse(localStorage.getItem('asistencias_proyectos') || '{}');
                    const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
                    const areasDelProy = p.areasData.map(a => a.area.toLowerCase());
                    const involucrados = usuarios.filter(u => areasDelProy.includes((u.area || '').toLowerCase()));
                    const confirmados  = involucrados.filter(u => asistencias[`${p.fecha_registro}_${u.correo}`] === 'confirma').length;
                    const noPueden    = involucrados.filter(u => asistencias[`${p.fecha_registro}_${u.correo}`] === 'no-puedo').length;
                    const sinResp     = involucrados.length - confirmados - noPueden;
                    if (involucrados.length > 0) {
                        asistenciaHtml = `<p class="proy-asistencia-resumen">
                            <span class="asist-ok">\u2713 ${confirmados}</span>
                            <span class="asist-no">\u2715 ${noPueden}</span>
                            <span class="asist-pend">\u25cb ${sinResp} sin resp.</span>
                        </p>`;
                    }
                }

                card.innerHTML = `
                    <div class="proyecto-card-info">
                        <h4>${p.nombre} ${estadoBadge(estado)}</h4>
                        <p>\ud83d\udcc5 ${fechaFmt}${horaFmt} &nbsp;\u00b7&nbsp; \ud83d\udc65 ${p.siervos || '\u2014'} siervos</p>
                        <p style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">\ud83c\udfaf ${areasResumen}</p>
                        ${regresiva ? `<p class="proy-cuenta-regresiva" data-fecha="${p.fecha}" data-hora="${p.hora || '00:00'}">${regresiva}</p>` : ''}
                        ${asistenciaHtml}
                    </div>
                    <div class="proyecto-card-actions">
                        <button class="btn-secondary btn-ver-proy" data-idx="${realIdx}">Ver</button>
                        <button class="btn-secondary btn-comentarios-proy" data-key="${p.fecha_registro}" style="font-size:0.75rem;">\ud83d\udcac</button>
                        ${esAdmin ? `<button class="btn-secondary btn-edit-proy" data-idx="${realIdx}">\u270f\ufe0f</button>` : ''}
                        ${esAdmin ? `<button class="btn-danger btn-del-proy" data-idx="${realIdx}">\ud83d\uddd1\ufe0f</button>` : ''}
                    </div>`;
                lista.appendChild(card);
            });
        }

        // ── Render historial (completados, más reciente primero) ──
        if (historialEl) {
            historialEl.innerHTML = '';
            if (historial.length === 0) {
                historialEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">Sin eventos en el historial.</p>';
            } else {
                [...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(p => {
                    const realIdx = proyectos.indexOf(p);
                    const fechaFmt = p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '\u2014';
                    const areasResumen = p.areasData ? p.areasData.map(a => `${a.area}(${a.cantidad})`).join(', ') : (p.areas || '\u2014');
                    const item = document.createElement('div');
                    item.className = 'historial-item';
                    item.innerHTML = `
                        <div class="historial-info">
                            <span class="historial-nombre">${p.nombre} ${estadoBadge('Completado')}</span>
                            <span class="historial-fecha">\ud83d\udcc5 ${fechaFmt}${p.hora ? ' \u00b7 ' + p.hora : ''}</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">\ud83c\udfaf ${areasResumen}</span>
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button class="btn-secondary btn-ver-proy" data-idx="${realIdx}" style="padding:3px 8px;font-size:0.75rem;">Ver</button>
                        </div>`;
                    historialEl.appendChild(item);
                });
            }
        }

        // Actualizar cuentas regresivas cada minuto
        clearInterval(window._cuentaRegresivaInterval);
        window._cuentaRegresivaInterval = setInterval(() => {
            document.querySelectorAll('.proy-cuenta-regresiva').forEach(el => {
                const p = { fecha: el.dataset.fecha, hora: el.dataset.hora };
                const nueva = cuentaRegresiva(p);
                if (nueva) el.textContent = nueva;
                else el.remove();
            });
        }, 60000);
    }
    renderProyectos();

    document.getElementById('proyectos-lista')?.addEventListener('click', (e) => {
        const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');

        if (e.target.classList.contains('btn-ver-proy') || e.target.classList.contains('btn-edit-proy') || e.target.classList.contains('btn-del-proy') || e.target.classList.contains('btn-comentarios-proy')) {
            manejarClickProyecto(e, proyectos);
        }
    });

    document.getElementById('proyectos-historial')?.addEventListener('click', (e) => {
        const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        manejarClickProyecto(e, proyectos);
    });

    function manejarClickProyecto(e, proyectos) {
        const idx = parseInt(e.target.dataset.idx);
        const p   = proyectos[idx];
        if (!p) return;

        if (e.target.classList.contains('btn-ver-proy')) {
            const estado    = calcularEstadoProyecto(p);
            const regresiva = cuentaRegresiva(p);
            const fechaFmt  = p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '\u2014';
            const horaFmt   = p.hora || '\u2014';
            document.getElementById('proy-modal-nombre').textContent = p.nombre;
            document.getElementById('proy-modal-body').innerHTML = `
                <div class="proy-detail-row"><span>Estado:</span><span>${estadoBadge(estado)}</span></div>
                <div class="proy-detail-row"><span>Fecha:</span><span>${fechaFmt}</span></div>
                <div class="proy-detail-row"><span>Hora:</span><span>${horaFmt}</span></div>
                ${regresiva ? `<div class="proy-detail-row"><span>Tiempo:</span><span style="color:var(--secondary-color);">${regresiva}</span></div>` : ''}
                <div class="proy-detail-row"><span>Total siervos:</span><span>${p.siervos || '\u2014'}</span></div>
                <div class="proy-detail-row"><span>\u00c1reas:</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${
                    p.areasData
                        ? p.areasData.map(a => {
                            const lideres = JSON.parse(localStorage.getItem('lideres_area') || '{}');
                            const lider   = lideres[a.area] ? ` \u00b7 ${lideres[a.area]}` : '';
                            return `<span class="area-badge">${a.area} <strong>${a.cantidad}</strong>${lider ? `<span style="color:var(--secondary-color);font-size:0.7rem;"> ${lider}</span>` : ''}</span>`;
                          }).join('')
                        : (p.areas || '\u2014')
                }</div></div>
                ${p.desc ? `<div class="proy-detail-row"><span>Notas:</span><span>${p.desc}</span></div>` : ''}
                <div class="proy-detail-row"><span>Creado:</span><span>${new Date(p.fecha_registro).toLocaleDateString('es')}</span></div>`;
            document.getElementById('proy-modal-acciones').innerHTML = '';
            document.getElementById('proyecto-modal').classList.remove('hidden');
        }

        if (e.target.classList.contains('btn-edit-proy') && esAdmin) {
            document.getElementById('ep-nombre').value = p.nombre;
            document.getElementById('ep-fecha').value  = p.fecha || '';
            document.getElementById('ep-hora').value   = p.hora  || '';
            document.getElementById('ep-desc').value   = p.desc  || '';
            document.querySelectorAll('#ep-areas-container .area-row').forEach(row => {
                const found = p.areasData?.find(a => a.area === row.dataset.area);
                row.querySelector('.area-cantidad').value = found ? found.cantidad : 0;
            });
            document.getElementById('edit-proyecto-modal')._proyKey = p.fecha_registro;
            document.getElementById('edit-proyecto-modal').classList.remove('hidden');
        }

        if (e.target.classList.contains('btn-comentarios-proy')) {
            abrirComentarios(`proy_${p.fecha_registro}`, p.nombre);
        }

        if (e.target.classList.contains('btn-del-proy') && esAdmin) {
            confirmar('Eliminar proyecto', `\u00bfEliminar "${p.nombre}"?`, () => {
                const allProyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
                const realIdx = allProyectos.findIndex(x => x.fecha_registro === p.fecha_registro);
                if (realIdx !== -1) allProyectos.splice(realIdx, 1);
                localStorage.setItem('proyectos_creados', JSON.stringify(allProyectos));
                renderProyectos(); actualizarEstadisticas();
                showNotification('Proyecto eliminado.');
            });
        }
    }

    const formProyectos = document.getElementById('proyectos-form');
    if (formProyectos && esAdmin) {
        formProyectos.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('proj-nombre').value.trim();
            const fecha  = document.getElementById('proj-fecha').value;
            const hora   = document.getElementById('proj-hora').value;
            const desc   = document.getElementById('proj-desc').value.trim();
            const areasData = [];
            document.querySelectorAll('#proj-areas-container .area-row').forEach(row => {
                const cantidad = parseInt(row.querySelector('.area-cantidad').value) || 0;
                if (cantidad > 0) areasData.push({ area: row.dataset.area, cantidad });
            });
            if (areasData.length === 0) { showNotification('Agrega al menos un \u00e1rea con siervos requeridos.', 'error'); return; }
            const totalSiervos = areasData.reduce((acc, a) => acc + a.cantidad, 0);
            const areasTexto   = areasData.map(a => `${a.area}(${a.cantidad})`).join(', ');
            const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
            proyectos.push({ nombre, fecha, hora, siervos: totalSiervos, areasData, areas: areasTexto, desc, fecha_registro: new Date().toISOString() });
            localStorage.setItem('proyectos_creados', JSON.stringify(proyectos));
            renderProyectos(); actualizarEstadisticas();
            showNotification(`Proyecto "${nombre}" creado.`);
            formProyectos.reset();
            document.querySelectorAll('#proj-areas-container .area-cantidad').forEach(i => i.value = 0);
            renderDashboardProyectosYTareas();
            irA('dashboard-view');
        });
    }

    // ─── EDITAR PROYECTO ─────────────────────────────────────
    document.getElementById('edit-proyecto-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const key = document.getElementById('edit-proyecto-modal')._proyKey;
        const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const idx = proyectos.findIndex(x => x.fecha_registro === key);
        if (idx === -1) return;
        const areasData = [];
        document.querySelectorAll('#ep-areas-container .area-row').forEach(row => {
            const cantidad = parseInt(row.querySelector('.area-cantidad').value) || 0;
            if (cantidad > 0) areasData.push({ area: row.dataset.area, cantidad });
        });
        proyectos[idx].nombre   = document.getElementById('ep-nombre').value.trim();
        proyectos[idx].fecha    = document.getElementById('ep-fecha').value;
        proyectos[idx].hora     = document.getElementById('ep-hora').value;
        proyectos[idx].desc     = document.getElementById('ep-desc').value.trim();
        proyectos[idx].areasData = areasData;
        proyectos[idx].siervos  = areasData.reduce((acc, a) => acc + a.cantidad, 0);
        proyectos[idx].areas    = areasData.map(a => `${a.area}(${a.cantidad})`).join(', ');
        localStorage.setItem('proyectos_creados', JSON.stringify(proyectos));
        document.getElementById('edit-proyecto-modal').classList.add('hidden');
        renderProyectos(); renderDashboardProyectosYTareas();
        showNotification('Proyecto actualizado.');
    });

    // ─── AGENDA MENSUAL ──────────────────────────────────────

    function getMonthDays(offset = 0) {
        const today = new Date();
        const month = today.getMonth() + offset;
        const first = new Date(today.getFullYear(), month, 1);
        const last  = new Date(today.getFullYear(), month + 1, 0);
        const days  = [];
        for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) days.push(new Date(d));
        return days;
    }

    /**
     * Dado un día (Date) y una hora en formato "7:30 AM", retorna el Date exacto del servicio.
     */
    function servicioFechaExacta(dia, horaStr) {
        const m = horaStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return null;
        let h = parseInt(m[1]);
        const min = parseInt(m[2]);
        const period = m[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, min, 0, 0);
    }

    /**
     * Retorna true si el servicio ya expiró (pasaron 2h desde su inicio).
     */
    function servicioExpirado(dia, horaStr) {
        const fechaServicio = servicioFechaExacta(dia, horaStr);
        if (!fechaServicio) return false;
        const expira = new Date(fechaServicio.getTime() + 2 * 60 * 60 * 1000);
        return new Date() > expira;
    }

    function generateAgendaMonth() {
        const container = document.getElementById('agenda-dynamic-container');
        const titleEl   = document.getElementById('agenda-week-title');
        const rangeEl   = document.getElementById('agenda-week-range');
        if (!container) return;

        const allDays    = getMonthDays(agendaMonthOffset);
        const ahora      = new Date();

        // Solo domingos y miércoles que NO hayan expirado completamente
        // (un día expira cuando su último servicio + 2h ya pasó)
        const sundays    = allDays.filter(d => {
            if (d.getDay() !== 0) return false;
            // El último servicio del domingo es 7:00 PM → expira a las 9:00 PM
            return !servicioExpirado(d, '7:00 PM');
        });
        const wednesdays = allDays.filter(d => {
            if (d.getDay() !== 3) return false;
            // El único servicio del miércoles es 7:00 PM → expira a las 9:00 PM
            return !servicioExpirado(d, '7:00 PM');
        });

        const monthName = allDays[0].toLocaleDateString('es', { month: 'long', year: 'numeric' });
        if (titleEl) titleEl.textContent = `Agenda — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
        if (rangeEl) rangeEl.textContent = 'Selecciona los servicios en los que participarás este mes';

        const sesionActual = JSON.parse(sessionStorage.getItem('sesion_activa') || 'null');
        const userName = sesionActual?.nombre || '';
        const serviciosGuardados = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
        const misReservas = new Set(serviciosGuardados.filter(s => s.usuario === userName).map(s => s.servicio));

        const esAdminAgenda = sesionActual?.rol === 'Admin' || sesionActual?.rol === 'SuperLider';

        /**
         * Construye la tabla de servicios para un grupo de días.
         * Cada columna = un día, cada fila = un horario.
         * Los servicios ya expirados se muestran atenuados y deshabilitados.
         */
        const buildTable = (days, times, prefix, dayLabel, colorClass) => {
            if (days.length === 0) return '';

            // Formato de cabecera: "Dom\n4 may"
            const fmtHeader = d => {
                const dia  = d.getDate();
                const mes  = d.toLocaleDateString('es', { month: 'short' });
                const esHoy = d.toDateString() === ahora.toDateString();
                return `${dia} ${mes}${esHoy ? ' 📍' : ''}`;
            };

            let t = `<div class="table-container" style="margin-bottom:24px;overflow-x:auto;">`;
            t += `<table class="users-table agenda-reserve-table agenda-table-${colorClass}">`;
            t += `<thead><tr><th style="width:110px;">Horario</th>`;
            days.forEach(d => {
                t += `<th class="text-center agenda-col-${colorClass}">${fmtHeader(d)}<br><small>${dayLabel}</small></th>`;
            });
            t += `</tr></thead><tbody>`;

            times.forEach((time, ti) => {
                t += `<tr><td><strong>${time}</strong></td>`;
                days.forEach((d, di) => {
                    const value    = `${dayLabel} ${d.getDate()} a las ${time}`;
                    const id       = `${prefix}-${ti}-${di}`;
                    const expirado = servicioExpirado(d, time);
                    const isReserved = misReservas.has(value);

                    if (expirado) {
                        t += `<td class="text-center agenda-cell-${colorClass}" style="vertical-align:middle;opacity:0.35;">
                            <span class="time-label compact-label" style="cursor:default;font-size:0.75rem;color:var(--text-muted);">Finalizado</span>
                        </td>`;
                    } else if (isReserved && esAdminAgenda) {
                        // Admin/SuperLider: mostrar ✓ con botón de cancelar
                        t += `<td class="text-center agenda-cell-${colorClass}" style="vertical-align:middle;">
                            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                                <span class="time-label compact-label" style="background:rgba(46,213,115,0.2);border-color:#2ed573;color:#2ed573;cursor:default;">✓ Reservado</span>
                                <button class="btn-cancelar-reserva" data-value="${value}" data-usuario="${userName}" style="font-size:0.65rem;padding:2px 8px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);color:#ff4757;border-radius:6px;cursor:pointer;">✕ Quitar</button>
                            </div>
                        </td>`;
                    } else {
                        t += `<td class="text-center agenda-cell-${colorClass}" style="vertical-align:middle;">
                            <input type="checkbox" id="${id}" name="agenda-servicios[]" value="${value}" class="time-checkbox" ${isReserved ? 'checked disabled' : ''}>
                            <label for="${id}" class="time-label compact-label">${isReserved ? '✓' : 'Reservar'}</label>
                        </td>`;
                    }
                });
                t += `</tr>`;
            });

            t += `</tbody></table></div>`;
            return t;
        };

        let html = '';
        if (sundays.length === 0 && wednesdays.length === 0) {
            html = `<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                <div style="font-size:2.5rem;margin-bottom:12px;">📅</div>
                <p>No quedan servicios disponibles este mes.</p>
                <p style="font-size:0.85rem;margin-top:6px;">Los servicios aparecen hasta 2 horas después de su inicio.</p>
            </div>`;
        } else {
            if (sundays.length > 0) {
                html += '<h3 class="agenda-section-title agenda-title-domingo">☀️ Servicios de Domingo</h3>';
                html += buildTable(sundays, ['7:30 AM','11:00 AM','1:00 PM','7:00 PM'], 'sun', 'Domingo', 'domingo');
            }
            if (wednesdays.length > 0) {
                html += '<h3 class="agenda-section-title agenda-title-miercoles">🌙 Servicios de Miércoles</h3>';
                html += buildTable(wednesdays, ['7:00 PM'], 'wed', 'Miércoles', 'miercoles');
            }
        }
        container.innerHTML = html;

        const btnVerReservas = document.getElementById('btn-ver-reservas');
        if (btnVerReservas) btnVerReservas.style.display = (sesionActual?.rol === 'Admin') ? 'inline-block' : 'none';

        // Auto-refrescar la agenda cuando expire el próximo servicio
        programarRefrescoAgenda(allDays);
    }

    /**
     * Calcula cuándo expira el próximo servicio activo y programa un setTimeout
     * para regenerar la agenda automáticamente en ese momento.
     */
    function programarRefrescoAgenda(allDays) {
        clearTimeout(window._agendaRefreshTimer);
        const ahora = new Date();
        const todosServicios = [];

        allDays.forEach(d => {
            const times = d.getDay() === 0
                ? ['7:30 AM','11:00 AM','1:00 PM','7:00 PM']
                : d.getDay() === 3 ? ['7:00 PM'] : [];
            times.forEach(t => {
                const expira = servicioFechaExacta(d, t);
                if (expira) {
                    const expiraMs = expira.getTime() + 2 * 60 * 60 * 1000;
                    if (expiraMs > ahora.getTime()) todosServicios.push(expiraMs);
                }
            });
        });

        if (todosServicios.length === 0) return;
        const proximaExpiracion = Math.min(...todosServicios);
        const msHasta = proximaExpiracion - ahora.getTime();

        window._agendaRefreshTimer = setTimeout(() => {
            generateAgendaMonth();
            limpiarServiciosExpirados();
        }, msHasta + 1000); // +1s de margen
    }
    generateAgendaMonth();

    // Handler para quitar reservas propias (Admin/SuperLider)
    document.getElementById('agenda-dynamic-container')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-cancelar-reserva');
        if (!btn) return;
        const value   = btn.dataset.value;
        const usuario = btn.dataset.usuario;
        confirmar('Quitar reserva', `¿Quitar la reserva de "${usuario}" para "${value}"?`, () => {
            let servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
            servicios = servicios.filter(s => !(s.servicio === value && s.usuario === usuario));
            localStorage.setItem('servicios_reservados', JSON.stringify(servicios));
            showNotification(`Reserva de "${usuario}" eliminada.`);
            generateAgendaMonth();
            renderReservasSemana();
            actualizarEstadisticas();
        });
    });

    document.getElementById('btn-ver-reservas')?.addEventListener('click', () => {
        const allDays   = getMonthDays(agendaMonthOffset);
        const monthNum  = allDays[0].getMonth();
        const yearNum   = allDays[0].getFullYear();
        const servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
        const mesServicios = servicios.filter(s => { const f = new Date(s.fecha); return f.getMonth() === monthNum && f.getFullYear() === yearNum; });
        const modal     = document.getElementById('reservas-modal');
        const subtitle  = document.getElementById('reservas-modal-subtitle');
        const content   = document.getElementById('reservas-modal-content');
        const monthName = allDays[0].toLocaleDateString('es', { month: 'long', year: 'numeric' });
        subtitle.textContent = `${monthName} \u2014 ${mesServicios.length} reserva(s)`;
        content.innerHTML = mesServicios.length === 0
            ? '<p style="color:var(--text-muted);">Nadie ha reservado servicios este mes a\u00fan.</p>'
            : `<div class="reservas-grid">${mesServicios.map(s => `<div class="reserva-item"><span class="reserva-servicio">\u26ea ${s.servicio}</span><span class="reserva-usuario">${s.usuario}</span></div>`).join('')}</div>`;
        modal.classList.remove('hidden');
    });

    const formAgenda = document.getElementById('agenda-form');
    formAgenda?.addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = document.querySelectorAll('input[name="agenda-servicios[]"]:checked:not(:disabled)');
        if (selected.length === 0) { showNotification('Selecciona al menos un horario.', 'error'); return; }
        const userName = sesion.nombre;
        const servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
        selected.forEach(opt => {
            servicios.push({ servicio: opt.value, usuario: userName, area: sesion.area || '', fecha: new Date().toISOString() });
        });
        localStorage.setItem('servicios_reservados', JSON.stringify(servicios));
        actualizarEstadisticas();
        showNotification(`${selected.length} horario(s) reservado(s).`);
        generateAgendaMonth();
        renderReservasSemana();
        irA('dashboard-view');
    });

    // ─── LIMPIEZA DE SERVICIOS EXPIRADOS ─────────────────────

    /**
     * Convierte el string de un servicio reservado a su Date de inicio.
     * Usa la fecha de reserva (s.fecha) para determinar el mes/año correcto.
     * Formato del string: "Domingo 4 a las 7:30 AM" o "Miércoles 7 a las 7:00 PM"
     */
    function servicioToDate(servicioStr, fechaReservaISO) {
        const m = servicioStr.match(/^(Domingo|Mi[eé]rcoles)\s+(\d+)\s+a las\s+(.+)$/);
        if (!m) return null;
        const [, , numDia, horaStr] = m;
        const horaMatch = horaStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!horaMatch) return null;
        let h = parseInt(horaMatch[1]);
        const min = parseInt(horaMatch[2]);
        const period = horaMatch[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;

        // Usar el mes/año de cuando se hizo la reserva para ubicar el día correcto
        const ref = fechaReservaISO ? new Date(fechaReservaISO) : new Date();
        return new Date(ref.getFullYear(), ref.getMonth(), parseInt(numDia), h, min, 0, 0);
    }

    function limpiarServiciosExpirados() {
        const ahora = new Date();
        const DOS_HORAS_MS = 2 * 60 * 60 * 1000;
        let servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
        const antes = servicios.length;
        servicios = servicios.filter(s => {
            const f = servicioToDate(s.servicio, s.fecha);
            if (!f) return true; // si no se puede parsear, conservar
            const expira = f.getTime() + DOS_HORAS_MS;
            return ahora.getTime() < expira;
        });
        if (servicios.length !== antes) {
            localStorage.setItem('servicios_reservados', JSON.stringify(servicios));
            renderReservasSemana(); actualizarEstadisticas();
        }
    }
    limpiarServiciosExpirados();
    setInterval(limpiarServiciosExpirados, 60000);

    // ─── SERVICIOS ESTA SEMANA ────────────────────────────────
    function servicioSortKey(servicioStr) {
        const diaMatch  = servicioStr.match(/(\d+)/);
        const dia = diaMatch ? parseInt(diaMatch[1]) : 0;
        const horaMatch = servicioStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        let horas = 0;
        if (horaMatch) {
            horas = parseInt(horaMatch[1]);
            const mins = parseInt(horaMatch[2]);
            const period = horaMatch[3].toUpperCase();
            if (period === 'PM' && horas !== 12) horas += 12;
            if (period === 'AM' && horas === 12) horas = 0;
            horas = horas * 60 + mins;
        }
        return dia * 10000 + horas;
    }

    function renderReservasSemana() {
        const panel = document.getElementById('servicios-semana-list');
        if (!panel) return;
        const userName  = sesion.nombre;
        const usuarios  = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        const servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
        const visibles  = servicios.filter(s => esAdmin || s.usuario === userName);
        panel.innerHTML = '';
        if (visibles.length === 0) {
            panel.innerHTML = '<li><span style="color:var(--text-muted);font-size:0.9rem;">Sin servicios reservados a\u00fan.</span></li>';
            return;
        }
        const domingos  = visibles.filter(s => s.servicio.startsWith('Domingo'));
        const miercoles = visibles.filter(s => s.servicio.startsWith('Mi\u00e9rcoles'));
        const sortServicios = arr => [...arr].sort((a, b) => servicioSortKey(a.servicio) - servicioSortKey(b.servicio));

        const renderGroup = (items, label, colorClass) => {
            if (items.length === 0) return;
            const sep = document.createElement('div');
            sep.className = `semana-group-sep semana-sep-${colorClass}`;
            sep.textContent = label;
            panel.appendChild(sep);
            sortServicios(items).forEach(s => {
                let area = s.area || '';
                if (!area) { const u = usuarios.find(u => u.nombre === s.usuario); area = u?.area || ''; }
                const servicioNumMap = { '7:30 AM': '1er Servicio', '11:00 AM': '2do Servicio', '1:00 PM': '3er Servicio', '7:00 PM': colorClass === 'domingo' ? '4to Servicio' : '7:00 PM' };
                const partes = s.servicio.split(' a las ');
                const diaStr = partes[0] || s.servicio;
                const horaStr = partes[1] || '';
                const numServicio = servicioNumMap[horaStr] || horaStr;
                const li = document.createElement('li');
                li.className = `semana-item semana-item-${colorClass}`;
                li.innerHTML = `<span class="semana-nombre">\ud83d\udc64 ${s.usuario}</span><span class="semana-area">${area}</span><span class="semana-servicio">\ud83d\udcc5 ${diaStr} \u00b7 ${numServicio}</span>`;
                panel.appendChild(li);
            });
        };
        renderGroup(domingos,  '\u2600\ufe0f Domingos',  'domingo');
        renderGroup(miercoles, '\ud83c\udf19 Mi\u00e9rcoles', 'miercoles');
    }
    renderReservasSemana();

    // ─── PROGRAMACIÓN EN DASHBOARD (todos los roles) ────────────

    /**
     * Retorna true si el PDF de programación ya expiró.
     * Un PDF expira 2 horas después del inicio del servicio al que está asociado.
     * Si el servicio no tiene fecha próxima (ya pasó esta semana y no hay otro),
     * el PDF se considera expirado.
     */
    function esPdfExpirado(p) {
        if (!p.servicio) return false;

        // Hora de inicio de cada tipo de servicio
        const SERVICIOS_INICIO = {
            'dom-1': { diaSemana: 0, h: 7,  m: 30 },
            'dom-2': { diaSemana: 0, h: 11, m: 0  },
            'dom-3': { diaSemana: 0, h: 13, m: 0  },
            'dom-4': { diaSemana: 0, h: 19, m: 0  },
            'mie-1': { diaSemana: 3, h: 19, m: 0  }
        };

        const ahora = new Date();
        const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

        // Evento especial: expira 2h después de su hora de inicio
        if (p.servicio.startsWith('especial_')) {
            const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
            const proy = proyectos.find(x => x.fecha_registro === p.servicio.replace('especial_', ''));
            if (!proy || !proy.fecha) return false;
            const hora = proy.hora || '00:00';
            const fechaEvento = new Date(`${proy.fecha}T${hora}:00`);
            return ahora.getTime() > fechaEvento.getTime() + DOS_HORAS_MS;
        }

        const cfg = SERVICIOS_INICIO[p.servicio];
        if (!cfg) return false;

        // Calcular el día de esta semana que corresponde al servicio
        const diffDia = (cfg.diaSemana - ahora.getDay() + 7) % 7;
        const candidato = new Date(ahora);
        candidato.setDate(ahora.getDate() + diffDia);
        candidato.setHours(cfg.h, cfg.m, 0, 0);

        const expira = candidato.getTime() + DOS_HORAS_MS;

        // Si el servicio de esta semana aún no expiró → mostrar
        if (ahora.getTime() < expira) return false;

        // El servicio de esta semana ya pasó → expirado
        return true;
    }

    function renderDashProgramacion() {
        const panel = document.getElementById('dash-programacion-panel');
        const cont  = document.getElementById('dash-programacion-content');
        if (!panel || !cont) return;

        const pdfs = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
        if (pdfs.length === 0) { panel.style.display = 'none'; return; }

        const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const getLabel = (key) => {
            if (!key) return 'General';
            if (key === 'dom-1') return '☀️ Domingo · 1er Servicio';
            if (key === 'dom-2') return '☀️ Domingo · 2do Servicio';
            if (key === 'dom-3') return '☀️ Domingo · 3er Servicio';
            if (key === 'dom-4') return '☀️ Domingo · 4to Servicio';
            if (key === 'mie-1') return '🌙 Miércoles · Servicio';
            if (key.startsWith('especial_')) {
                const proy = proyectos.find(x => x.fecha_registro === key.replace('especial_', ''));
                return proy ? `🎯 ${proy.nombre}` : '🎯 Evento Especial';
            }
            return key;
        };

        // Determinar PDFs relevantes según rol
        let relevantes;
        if (esAdmin) {
            relevantes = pdfs;
        } else {
            const servicios    = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
            const misServicios = servicios.filter(s => s.usuario === sesion.nombre);
            const misKeys = new Set();
            misServicios.forEach(s => {
                const partes = s.servicio.split(' a las ');
                const dia = partes[0] || '', hora = partes[1] || '';
                if (dia.startsWith('Domingo')) {
                    if (hora === '7:30 AM')  misKeys.add('dom-1');
                    if (hora === '11:00 AM') misKeys.add('dom-2');
                    if (hora === '1:00 PM')  misKeys.add('dom-3');
                    if (hora === '7:00 PM')  misKeys.add('dom-4');
                }
                if (dia.startsWith('Mi\u00e9rcoles')) misKeys.add('mie-1');
            });
            relevantes = pdfs.filter(p => !p.servicio || misKeys.has(p.servicio));
        }

        if (relevantes.length === 0) { panel.style.display = 'none'; return; }

        // Solo mostrar PDFs activos — los expirados no aparecen en el dashboard
        const activos = relevantes.filter(p => !esPdfExpirado(p));

        if (activos.length === 0) { panel.style.display = 'none'; return; }

        panel.style.display = '';
        cont.innerHTML = '';

        const renderPdfCard = (p) => {
            const idx = pdfs.indexOf(p);
            const fechaReal = p.servicio ? getFechasServicio(p.servicio) : '';
            const card = document.createElement('div');
            card.className = 'recurso-card';
            card.style.cssText = 'cursor:pointer;flex-direction:column;align-items:flex-start;padding:12px;gap:6px;';
            card.innerHTML = `
                <div class="btn-abrir-doc-dash" data-idx="${idx}" style="cursor:pointer;width:100%;display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="font-size:1.8rem;flex-shrink:0;">📄</div>
                        <div style="flex:1;min-width:0;">
                            <div class="recurso-titulo" style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.titulo}</div>
                            <div style="color:var(--secondary-color);font-size:0.72rem;margin-top:2px;">${p.servicio ? getLabel(p.servicio) + (fechaReal ? ' — ' + fechaReal : '') : 'General'}</div>
                        </div>
                    </div>
                </div>`;
            return card;
        };

        // Activos agrupados por servicio
        if (activos.length > 0) {
            const grupos = {};
            activos.forEach(p => {
                const key = p.servicio || 'general';
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(p);
            });
            Object.entries(grupos).forEach(([key, items]) => {
                if (key !== 'general') {
                    const sep = document.createElement('div');
                    sep.className = 'recurso-servicio-sep';
                    const fechaReal = getFechasServicio(key);
                    sep.textContent = `${getLabel(key)}${fechaReal ? ' — ' + fechaReal : ''}`;
                    cont.appendChild(sep);
                }
                const grid = document.createElement('div');
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:8px;';
                items.forEach(p => grid.appendChild(renderPdfCard(p)));
                cont.appendChild(grid);
            });
        }

        // Click handler para abrir modal
        cont.querySelectorAll('.btn-abrir-doc-dash').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = pdfs[parseInt(btn.dataset.idx)];
                if (p) abrirDocPreview(p);
            });
        });
    }
    renderDashProgramacion();

    // ─── DASHBOARD: PROYECTOS Y TAREAS POR ROL ───────────────
    function renderDashboardProyectosYTareas() {
        const listaProy  = document.getElementById('dash-proyectos-list');
        const listaTarea = document.getElementById('dash-tareas-list');
        const titProy    = document.getElementById('dash-proyectos-titulo');
        const titTarea   = document.getElementById('dash-tareas-titulo');
        if (!listaProy || !listaTarea) return;
        const proyectos   = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const areaUsuario = (sesion.area || '').toLowerCase();

        let proyFiltrados;
        if (esAdmin) {
            proyFiltrados = proyectos.filter(p => esProyectoActivo(p));
            if (titProy) titProy.textContent = 'Todos los Proyectos';
        } else {
            proyFiltrados = proyectos.filter(p => {
                if (!esProyectoActivo(p)) return false;
                if (p.areasData) return p.areasData.some(a => a.area.toLowerCase() === areaUsuario);
                if (p.areas)     return p.areas.toLowerCase().includes(areaUsuario);
                return false;
            });
            if (titProy) titProy.textContent = 'Mis Proyectos';
        }

        if (titTarea) titTarea.textContent = esAdmin ? 'Proyectos' : 'Mis Proyectos';
        listaTarea.innerHTML = '';

        listaProy.innerHTML = '';
        if (proyFiltrados.length === 0) {
            if (!esAdmin) {
                // Mostrar próximo servicio reservado
                const servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
                const userName  = sesion.nombre;
                const misServicios = servicios.filter(s => s.usuario === userName);
                const proximoServicio = misServicios.length > 0
                    ? `<div class="proximo-servicio">\ud83d\udcc5 Pr\u00f3ximo servicio: <strong>${misServicios[0].servicio}</strong></div>`
                    : '';
                listaProy.innerHTML = `<li><div class="dash-bienvenida">
                    <div class="dash-bienvenida-icon">\ud83d\udc4b</div>
                    <p>Hola <strong>${sesion.nombre.split(' ')[0]}</strong>, a\u00fan no tienes proyectos asignados.<br>Cuando el Admin te asigne a un evento aparecer\u00e1 aqu\u00ed.</p>
                    ${proximoServicio}
                </div></li>`;
            } else {
                listaProy.innerHTML = '<li><span style="color:var(--text-muted);font-size:0.9rem;">Sin proyectos activos.</span></li>';
            }
        } else {
            [...proyFiltrados].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach(p => {
                const estado    = calcularEstadoProyecto(p);
                const regresiva = cuentaRegresiva(p);
                const fechaFmt  = p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014';
                const cls = estado === 'Planificado' ? 'estado-planificado' : estado === 'En curso' ? 'estado-en-curso' : 'estado-completado';
                const li = document.createElement('li');
                li.innerHTML = `<span class="activity-note-line">
                    <span class="note-detail">\ud83d\udcc5 ${p.nombre}</span>
                    <span class="note-user">${fechaFmt}${p.hora ? ' ' + p.hora : ''}</span>
                    <span class="note-time"><span class="estado-badge ${cls}" style="padding:1px 7px;font-size:0.7rem;">${estado}</span></span>
                </span>${regresiva ? `<div style="font-size:0.75rem;color:var(--secondary-color);padding:2px 4px;">${regresiva}</div>` : ''}
                ${!esAdmin && estado !== 'Completado' ? (() => {
                    const asistencias = JSON.parse(localStorage.getItem('asistencias_proyectos') || '{}');
                    const key = `${p.fecha_registro}_${sesion.correo}`;
                    const resp = asistencias[key];
                    if (resp === 'confirma')  return `<div style="margin-top:4px;"><span class="asistencia-btn asistencia-confirmado">\u2713 Asistencia confirmada</span></div>`;
                    if (resp === 'no-puedo')  return `<div style="margin-top:4px;"><span class="asistencia-btn asistencia-rechazado">\u2715 No puedo ir</span></div>`;
                    return `<div style="margin-top:4px;display:flex;gap:6px;">
                        <button class="asistencia-btn asistencia-confirmar btn-asistencia" data-key="${key}" data-resp="confirma">\u2713 Confirmar asistencia</button>
                        <button class="asistencia-btn asistencia-no-puedo btn-asistencia" data-key="${key}" data-resp="no-puedo">\u2715 No puedo ir</button>
                    </div>`;
                })() : ''}`;
                listaProy.appendChild(li);
            });
        }

        // Handler asistencia proyectos
        listaProy.querySelectorAll('.btn-asistencia').forEach(btn => {
            btn.addEventListener('click', () => {
                const asistencias = JSON.parse(localStorage.getItem('asistencias_proyectos') || '{}');
                asistencias[btn.dataset.key] = btn.dataset.resp;
                localStorage.setItem('asistencias_proyectos', JSON.stringify(asistencias));
                const msg = btn.dataset.resp === 'confirma' ? '\u2713 Asistencia confirmada' : '\u2715 No puedo ir registrado';
                showNotification(msg);
                renderDashboardProyectosYTareas();
            });
        });
    }
    renderDashboardProyectosYTareas();

    // Ocultar panel de proyectos para Siervos
    if (sesion.rol === 'Siervo') {
        document.getElementById('dash-proyectos-panel')?.style && (document.getElementById('dash-proyectos-panel').style.display = 'none');
    }

    // ─── COMENTARIOS ─────────────────────────────────────────
    let comentariosKey = null;

    function abrirComentarios(key, titulo) {
        comentariosKey = key;
        document.getElementById('comentarios-modal-titulo').textContent = `\ud83d\udcac ${titulo}`;
        renderComentarios();
        document.getElementById('comentarios-modal').classList.remove('hidden');
        document.getElementById('comentario-input').value = '';
        document.getElementById('comentario-input').focus();
    }

    function renderComentarios() {
        const lista = document.getElementById('comentarios-lista');
        if (!lista || !comentariosKey) return;
        const todos = JSON.parse(localStorage.getItem('comentarios') || '{}');
        const items = todos[comentariosKey] || [];
        lista.innerHTML = '';
        if (items.length === 0) {
            lista.innerHTML = '<li style="color:var(--text-muted);font-size:0.85rem;padding:8px 4px;">Sin comentarios a\u00fan.</li>';
            return;
        }
        items.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<div class="comentario-item">
                <span class="comentario-autor">${c.autor}</span>
                <span>${c.texto}</span>
                <span class="comentario-hora">${new Date(c.fecha).toLocaleString('es', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
            </div>`;
            lista.appendChild(li);
        });
        lista.scrollTop = lista.scrollHeight;
    }

    document.getElementById('btn-enviar-comentario')?.addEventListener('click', () => {
        const input = document.getElementById('comentario-input');
        const texto = input.value.trim();
        if (!texto || !comentariosKey) return;
        const todos = JSON.parse(localStorage.getItem('comentarios') || '{}');
        if (!todos[comentariosKey]) todos[comentariosKey] = [];
        todos[comentariosKey].push({ autor: sesion.nombre, texto, fecha: new Date().toISOString() });
        localStorage.setItem('comentarios', JSON.stringify(todos));
        input.value = '';
        renderComentarios();
    });

    document.getElementById('comentario-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-enviar-comentario').click();
    });

    // Delegación para botones de comentarios en proyectos
    document.getElementById('proyectos-lista')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-comentarios-proy')) {
            const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
            const p = proyectos.find(x => x.fecha_registro === e.target.dataset.key);
            if (p) abrirComentarios(`proy_${p.fecha_registro}`, p.nombre);
        }
    }, true); // capture para no interferir con el listener existente

    // ─── FILTRO PROYECTOS ─────────────────────────────────────
    document.getElementById('filtro-estado-proy')?.addEventListener('change', () => renderProyectos());

    // ─── CALENDARIO VISUAL DE PROYECTOS ──────────────────────
    let calendarioVisible = false;
    function renderCalendario() {
        const cont = document.getElementById('proyectos-calendario');
        if (!cont) return;
        const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes  = hoy.getMonth();
        const primerDia = new Date(anio, mes, 1).getDay();
        const diasMes   = new Date(anio, mes + 1, 0).getDate();
        const mesNombre = hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' });

        // Mapear proyectos por día
        const eventosPorDia = {};
        proyectos.forEach(p => {
            if (!p.fecha) return;
            const d = new Date(p.fecha + 'T00:00:00');
            if (d.getFullYear() === anio && d.getMonth() === mes) {
                const dia = d.getDate();
                if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
                eventosPorDia[dia].push(p);
            }
        });

        let html = `<div class="cal-header"><strong>${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</strong></div>
        <div class="cal-grid">
            <div class="cal-dia-label">Dom</div><div class="cal-dia-label">Lun</div><div class="cal-dia-label">Mar</div>
            <div class="cal-dia-label">Mié</div><div class="cal-dia-label">Jue</div><div class="cal-dia-label">Vie</div><div class="cal-dia-label">Sáb</div>`;
        for (let i = 0; i < primerDia; i++) html += '<div class="cal-celda vacia"></div>';
        for (let d = 1; d <= diasMes; d++) {
            const esHoy = d === hoy.getDate();
            const eventos = eventosPorDia[d] || [];
            const puntosHtml = eventos.map(p => {
                const estado = calcularEstadoProyecto(p);
                const color  = estado === 'Completado' ? '#2ed573' : estado === 'En curso' ? '#ffa500' : '#4facfe';
                return `<span class="cal-punto" style="background:${color};" title="${p.nombre}"></span>`;
            }).join('');
            html += `<div class="cal-celda${esHoy ? ' cal-hoy' : ''}${eventos.length ? ' cal-tiene-evento' : ''}">${d}${puntosHtml}</div>`;
        }
        html += '</div>';
        cont.innerHTML = html;
    }

    document.getElementById('btn-toggle-calendario')?.addEventListener('click', () => {
        calendarioVisible = !calendarioVisible;
        const cont = document.getElementById('proyectos-calendario');
        if (calendarioVisible) { cont.classList.remove('hidden'); renderCalendario(); }
        else cont.classList.add('hidden');
    });

    // ─── PERFIL DE USUARIO ────────────────────────────────────
    function cargarPerfil() {
        const inp = document.getElementById('perfil-nombre');
        const tel = document.getElementById('perfil-telefono');
        if (inp) inp.value = sesion.nombre;
        const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        const u = usuarios.find(x => x.correo === sesion.correo);
        if (tel && u) tel.value = u.telefono || '';
        renderHistorialAsistencia();
    }

    function renderHistorialAsistencia() {
        const cont = document.getElementById('perfil-historial-content');
        if (!cont) return;
        const proyectos   = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
        const asistencias = JSON.parse(localStorage.getItem('asistencias_proyectos') || '{}');
        const historial   = proyectos.map(p => {
            const key  = `${p.fecha_registro}_${sesion.correo}`;
            const resp = asistencias[key];
            return { nombre: p.nombre, fecha: p.fecha, hora: p.hora, resp };
        }).filter(p => p.resp);

        if (historial.length === 0) {
            cont.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Sin historial de asistencia aún.</p>';
            return;
        }
        const confirmados = historial.filter(p => p.resp === 'confirma').length;
        const noPuedo     = historial.filter(p => p.resp === 'no-puedo').length;
        cont.innerHTML = `
            <div style="display:flex;gap:16px;margin-bottom:12px;font-size:0.85rem;">
                <span style="color:#2ed573;">\u2713 Confirmados: <strong>${confirmados}</strong></span>
                <span style="color:#ff4757;">\u2715 No pude ir: <strong>${noPuedo}</strong></span>
                <span style="color:var(--text-muted);">Total: <strong>${historial.length}</strong></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${historial.map(p => {
                    const fechaFmt = p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                    const color = p.resp === 'confirma' ? '#2ed573' : '#ff4757';
                    const icon  = p.resp === 'confirma' ? '\u2713' : '\u2715';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.82rem;">
                        <span>${p.nombre}</span>
                        <span style="color:var(--text-muted);font-size:0.75rem;">${fechaFmt}${p.hora ? ' ' + p.hora : ''}</span>
                        <span style="color:${color};font-weight:600;">${icon}</span>
                    </div>`;
                }).join('')}
            </div>`;
    }

    document.getElementById('perfil-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoNombre = document.getElementById('perfil-nombre').value.trim();
        const nuevoTel    = document.getElementById('perfil-telefono').value.trim();
        const nuevaClave  = document.getElementById('perfil-password').value;
        const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        const idx = usuarios.findIndex(u => u.correo === sesion.correo);
        if (idx !== -1) {
            usuarios[idx].nombre   = nuevoNombre;
            usuarios[idx].telefono = nuevoTel;
            if (nuevaClave) {
                const hash = await hashPassword(nuevaClave);
                usuarios[idx].clave = hash;
            }
            localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
        }
        sesion.nombre = nuevoNombre;
        sessionStorage.setItem('sesion_activa', JSON.stringify(sesion));
        if (avatarEl) {
            const iniciales = nuevoNombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
            avatarEl.textContent = iniciales;
        }
        document.getElementById('perfil-password').value = '';
        showNotification('Perfil actualizado correctamente.');
    });

    // Cargar perfil al entrar a ajustes
    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === 'ajustes-view') {
            link.addEventListener('click', () => setTimeout(cargarPerfil, 50));
        }
    });
    cargarPerfil();

    // ─── RECURSOS ────────────────────────────────────────────

    function getFechasServicio(servicioKey) {
        if (!servicioKey) return '';

        // Evento especial vinculado a un proyecto
        if (servicioKey.startsWith('especial_')) {
            const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
            const proy = proyectos.find(x => x.fecha_registro === servicioKey.replace('especial_', ''));
            if (!proy || !proy.fecha) return '';
            const fechaFmt = new Date(proy.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
            return `${fechaFmt}${proy.hora ? ' · ' + proy.hora : ''}`;
        }

        const hoy = new Date();
        const horaMap = { 'dom-1': '7:30 AM', 'dom-2': '11:00 AM', 'dom-3': '1:00 PM', 'dom-4': '7:00 PM', 'mie-1': '7:00 PM' };
        const diaBuscado = servicioKey.startsWith('dom') ? 0 : servicioKey === 'mie-1' ? 3 : -1;
        if (diaBuscado === -1) return '';

        // Buscar hasta 14 días adelante para encontrar siempre el próximo día
        for (let i = 0; i <= 14; i++) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() + i);
            if (d.getDay() === diaBuscado) {
                return `${d.toLocaleDateString('es', {day:'numeric', month:'short'})} · ${horaMap[servicioKey]}`;
            }
        }
        return '';
    }

    function poblarSelectorServicios() {
        const sels = [
            document.getElementById('pdf-servicio'),
            document.getElementById('er-servicio')
        ].filter(Boolean);

        sels.forEach(sel => {
            sel.innerHTML = '<option value="">General</option>';

            // Miércoles próximo
            const fechaMie = getFechasServicio('mie-1');
            const optMie = document.createElement('option');
            optMie.value = 'mie-1';
            optMie.textContent = `🌙 Miércoles · Servicio${fechaMie ? ' — ' + fechaMie : ''}`;
            sel.appendChild(optMie);

            // Domingos próximos — 4 servicios
            const serviciosDom = [
                { key: 'dom-1', label: '☀️ Domingo · 1er Servicio' },
                { key: 'dom-2', label: '☀️ Domingo · 2do Servicio' },
                { key: 'dom-3', label: '☀️ Domingo · 3er Servicio' },
                { key: 'dom-4', label: '☀️ Domingo · 4to Servicio' },
            ];
            serviciosDom.forEach(({ key, label }) => {
                const fecha = getFechasServicio(key);
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = fecha ? `${label} — ${fecha}` : label;
                sel.appendChild(opt);
            });

            // Proyectos especiales activos (no completados)
            const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
            const especiales = proyectos.filter(p => esProyectoActivo(p) && p.fecha);
            if (especiales.length > 0) {
                const sep = document.createElement('option');
                sep.disabled = true;
                sep.textContent = '── Eventos Especiales ──';
                sel.appendChild(sep);
                especiales.forEach(p => {
                    const fechaFmt = new Date(p.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
                    const opt = document.createElement('option');
                    opt.value = `especial_${p.fecha_registro}`;
                    opt.textContent = `🎯 ${p.nombre} — ${fechaFmt}${p.hora ? ' · ' + p.hora : ''}`;
                    sel.appendChild(opt);
                });
            }
        });
    }

    function abrirDocPreview(p) {
        const modal   = document.getElementById('doc-preview-modal');
        const titulo  = document.getElementById('doc-preview-titulo');
        const content = document.getElementById('doc-preview-content');
        if (!modal) return;
        titulo.textContent = p.titulo;
        content.innerHTML  = '';
        const ext = (p.nombreArchivo || '').split('.').pop().toLowerCase();
        if (['pdf'].includes(ext) && p.url.startsWith('data:')) {
            content.innerHTML = `<iframe src="${p.url}" style="width:100%;height:60vh;border:none;border-radius:8px;"></iframe>`;
        } else if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
            content.innerHTML = `<img src="${p.url}" style="max-width:100%;border-radius:8px;">`;
        } else {
            content.innerHTML = `<div style="text-align:center;padding:30px;">
                <div style="font-size:3rem;margin-bottom:16px;">\ud83d\udcc4</div>
                <p style="color:var(--text-muted);margin-bottom:20px;">Vista previa no disponible para este formato.</p>
                <a href="${p.url}" download="${p.nombreArchivo || p.titulo}" class="btn-primary" style="display:inline-block;padding:10px 24px;text-decoration:none;border-radius:10px;background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));color:white;font-weight:600;">\ud83d\udce5 Descargar</a>
            </div>`;
        }
        modal.classList.remove('hidden');
    }

    function puedeSubirRecursos() {
        if (esAdmin || esLider) return true;
        const lideres = JSON.parse(localStorage.getItem('lideres_area') || '{}');
        return Object.values(lideres).includes(sesion.nombre);
    }

    function renderRecursos() {
        const videos = JSON.parse(localStorage.getItem('recursos_videos') || '[]');
        const pdfs   = JSON.parse(localStorage.getItem('recursos_pdfs')   || '[]');
        const puedeSubir = puedeSubirRecursos();

        const listaVideos = document.getElementById('recursos-videos-lista');
        const listaPdfs   = document.getElementById('recursos-pdfs-lista');
        const countVideos = document.getElementById('recursos-videos-count');
        const countPdfs   = document.getElementById('recursos-pdfs-count');

        if (countVideos) countVideos.textContent = videos.length > 0 ? `${videos.length} video(s)` : '';
        if (countPdfs)   countPdfs.textContent   = pdfs.length   > 0 ? `${pdfs.length} recurso(s)` : '';

        // Mostrar formularios solo a Admin y Líderes
        document.getElementById('recursos-add-video-panel').style.display = puedeSubir ? '' : 'none';
        document.getElementById('recursos-add-pdf-panel').style.display   = puedeSubir ? '' : 'none';

        // Programación siempre primero, Videos siempre después
        const contenedor = document.getElementById('recursos-view');
        const secVideos  = document.getElementById('recursos-videos-section');
        const secPdfs    = document.getElementById('recursos-pdfs-section');
        if (contenedor && secVideos && secPdfs) {
            if (secVideos.previousElementSibling !== secPdfs) {
                contenedor.insertBefore(secPdfs, secVideos);
            }
        }

        // Lista de videos — solo cards, sin tabla
        if (listaVideos) {
            listaVideos.innerHTML = '';
            if (videos.length === 0) {
                listaVideos.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Sin videos agregados aún.</p>';
            } else {
                videos.forEach((v, i) => {
                    const card = document.createElement('div');
                    card.className = 'recurso-card';
                    const ytMatch = v.url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
                    const thumb = ytMatch
                        ? `<img src="https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg" class="recurso-thumb" alt="">`
                        : '<div class="recurso-thumb-placeholder">🎬</div>';
                    card.innerHTML = `
                        <a href="${v.url}" target="_blank" rel="noopener" class="recurso-link" style="flex:1;">
                            ${thumb}
                            <div class="recurso-info">
                                <span class="recurso-titulo">${v.titulo}</span>
                                <span class="recurso-url">${v.url.length > 50 ? v.url.substring(0,50)+'...' : v.url}</span>
                            </div>
                        </a>
                        ${puedeSubir ? `
                        <div style="display:flex;gap:4px;flex-shrink:0;">
                            <button class="btn-secondary btn-edit-recurso-video" data-idx="${i}" style="padding:4px 8px;font-size:0.7rem;">✏️</button>
                            <button class="btn-danger recurso-del" data-tipo="videos" data-idx="${i}" style="padding:4px 8px;font-size:0.7rem;">🗑️</button>
                        </div>` : ''}`;
                    listaVideos.appendChild(card);
                });
            }
        }

        // Agrupar PDFs por servicio — solo cards, sin tabla
        if (listaPdfs) {
            listaPdfs.innerHTML = '';
            if (pdfs.length === 0) {
                listaPdfs.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Sin cursos o PDFs agregados aún.</p>';
            } else {
                const renderPdfCard = (p, realIdx) => {
                    const card = document.createElement('div');
                    card.className = 'recurso-card';
                    card.style.cursor = 'pointer';
                    const subtitulo = p.nombreArchivo || (p.url.length > 50 ? p.url.substring(0,50)+'...' : p.url);
                    card.innerHTML = `
                        <div class="recurso-link btn-abrir-doc" data-idx="${realIdx}" style="cursor:pointer;flex:1;display:flex;align-items:center;gap:12px;">
                            <div class="recurso-thumb-placeholder">📄</div>
                            <div class="recurso-info">
                                <span class="recurso-titulo">${p.titulo}</span>
                                <span class="recurso-url">${subtitulo}</span>
                            </div>
                        </div>
                        ${puedeSubir ? `
                        <div style="display:flex;gap:4px;flex-shrink:0;">
                            <button class="btn-secondary btn-edit-recurso-pdf" data-idx="${realIdx}" style="padding:4px 8px;font-size:0.7rem;">✏️</button>
                            <button class="btn-danger btn-del-recurso-pdf" data-idx="${realIdx}" style="padding:4px 8px;font-size:0.7rem;">🗑️</button>
                        </div>` : ''}`;
                    return card;
                };

                SERVICIOS_SEMANA.forEach(srv => {
                    const srvPdfs = pdfs.filter(p => p.servicio === srv.value);
                    if (srvPdfs.length === 0) return;
                    const fechaReal = getFechasServicio(srv.value);
                    const sep = document.createElement('div');
                    sep.className = 'recurso-servicio-sep';
                    sep.textContent = `${srv.label}${fechaReal ? ' — ' + fechaReal : ''}`;
                    listaPdfs.appendChild(sep);
                    srvPdfs.forEach(p => listaPdfs.appendChild(renderPdfCard(p, pdfs.indexOf(p))));
                });

                // Eventos especiales
                const gruposEspeciales = {};
                pdfs.filter(p => p.servicio && p.servicio.startsWith('especial_')).forEach(p => {
                    if (!gruposEspeciales[p.servicio]) gruposEspeciales[p.servicio] = [];
                    gruposEspeciales[p.servicio].push(p);
                });
                Object.entries(gruposEspeciales).forEach(([key, items]) => {
                    const proyectosAll = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
                    const proy = proyectosAll.find(x => x.fecha_registro === key.replace('especial_', ''));
                    const label = proy ? `🎯 ${proy.nombre}` : '🎯 Evento Especial';
                    const fechaReal = getFechasServicio(key);
                    const sep = document.createElement('div');
                    sep.className = 'recurso-servicio-sep';
                    sep.textContent = `${label}${fechaReal ? ' — ' + fechaReal : ''}`;
                    listaPdfs.appendChild(sep);
                    items.forEach(p => listaPdfs.appendChild(renderPdfCard(p, pdfs.indexOf(p))));
                });

                const sinServicio = pdfs.filter(p => !p.servicio);
                if (sinServicio.length > 0) {
                    const sep = document.createElement('div');
                    sep.className = 'recurso-servicio-sep';
                    sep.textContent = 'General';
                    listaPdfs.appendChild(sep);
                    sinServicio.forEach(p => listaPdfs.appendChild(renderPdfCard(p, pdfs.indexOf(p))));
                }
            }
        }
    } // fin renderRecursos

    // ── Delegación de eventos recursos (una sola vez) ──
    document.getElementById('recursos-videos-lista')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit-recurso-video')) {
                const idx    = parseInt(e.target.dataset.idx);
                const videos = JSON.parse(localStorage.getItem('recursos_videos') || '[]');
                const v      = videos[idx];
                if (!v) return;
                document.getElementById('ev-titulo').value = v.titulo;
                document.getElementById('ev-url').value    = v.url;
                document.getElementById('edit-video-modal')._videoIdx = idx;
                document.getElementById('edit-video-modal').classList.remove('hidden');
            }
        });

        // Handler eliminar — delegación
        document.getElementById('recursos-videos-lista')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('recurso-del') && e.target.dataset.tipo === 'videos') {
                const idx   = parseInt(e.target.dataset.idx);
                const items = JSON.parse(localStorage.getItem('recursos_videos') || '[]');
                items.splice(idx, 1);
                localStorage.setItem('recursos_videos', JSON.stringify(items));
                renderRecursos();
            }
        });

        document.getElementById('recursos-pdfs-lista')?.addEventListener('click', (e) => {
            const target = e.target.closest('[data-idx]');
            const idx = target ? parseInt(target.dataset.idx) : -1;

            // Abrir previsualización
            if (e.target.classList.contains('btn-abrir-doc') || e.target.closest('.btn-abrir-doc')) {
                const pdfs = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
                const p = pdfs[idx];
                if (p) abrirDocPreview(p);
                return;
            }
            if (e.target.classList.contains('btn-del-recurso-pdf') || e.target.closest('.btn-del-recurso-pdf')) {
                const items = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
                items.splice(idx, 1);
                localStorage.setItem('recursos_pdfs', JSON.stringify(items));
                renderRecursos();
                return;
            }
            if (e.target.classList.contains('recurso-del') && e.target.dataset.tipo === 'pdfs') {
                const items = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
                items.splice(idx, 1);
                localStorage.setItem('recursos_pdfs', JSON.stringify(items));
                renderRecursos();
                return;
            }
            if (e.target.classList.contains('btn-edit-recurso-pdf')) {
                const pdfs = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
                const p    = pdfs[idx];
                if (!p) return;
                poblarSelectorServicios();
                document.getElementById('er-titulo').value   = p.titulo;
                document.getElementById('er-servicio').value = p.servicio || '';
                document.getElementById('er-file').value     = '';
                const archivoActual = document.getElementById('er-archivo-actual');
                if (archivoActual) archivoActual.textContent = p.nombreArchivo ? `Archivo actual: ${p.nombreArchivo}` : '';
                document.getElementById('edit-recurso-modal')._recursoIdx = idx;
                document.getElementById('edit-recurso-modal').classList.remove('hidden');
            }
        });

    document.getElementById('edit-video-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const idx    = document.getElementById('edit-video-modal')._videoIdx;
        const videos = JSON.parse(localStorage.getItem('recursos_videos') || '[]');
        if (!videos[idx]) return;
        videos[idx].titulo = document.getElementById('ev-titulo').value.trim();
        videos[idx].url    = document.getElementById('ev-url').value.trim();
        localStorage.setItem('recursos_videos', JSON.stringify(videos));
        document.getElementById('edit-video-modal').classList.add('hidden');
        renderRecursos();
        showNotification('Video actualizado.');
    });

    document.getElementById('edit-recurso-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const idx     = document.getElementById('edit-recurso-modal')._recursoIdx;
        const pdfs    = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
        if (!pdfs[idx]) return;
        const titulo   = document.getElementById('er-titulo').value.trim();
        const servicio = document.getElementById('er-servicio').value;
        const file     = document.getElementById('er-file')?.files[0];

        const guardar = (nuevoUrl, nuevoNombre) => {
            pdfs[idx].titulo   = titulo;
            pdfs[idx].servicio = servicio;
            if (nuevoUrl)    pdfs[idx].url           = nuevoUrl;
            if (nuevoNombre) pdfs[idx].nombreArchivo = nuevoNombre;
            localStorage.setItem('recursos_pdfs', JSON.stringify(pdfs));
            document.getElementById('edit-recurso-modal').classList.add('hidden');
            renderRecursos();
            showNotification('Recurso actualizado.');
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => guardar(ev.target.result, file.name);
            reader.readAsDataURL(file);
        } else {
            guardar(null, null);
        }
    });

    document.getElementById('form-add-video')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const titulo = document.getElementById('video-titulo').value.trim();
        const url    = document.getElementById('video-url').value.trim();
        const videos = JSON.parse(localStorage.getItem('recursos_videos') || '[]');
        videos.push({ titulo, url, fecha: new Date().toISOString() });
        localStorage.setItem('recursos_videos', JSON.stringify(videos));
        e.target.reset();
        renderRecursos();
        showNotification('Video agregado.');
    });

    document.getElementById('form-add-pdf')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const titulo    = document.getElementById('pdf-titulo').value.trim();
        const fileInput = document.getElementById('pdf-file');
        const file      = fileInput?.files[0];

        if (!file) {
            showNotification('Selecciona un archivo para subir.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const pdfs     = JSON.parse(localStorage.getItem('recursos_pdfs') || '[]');
            const servicio = document.getElementById('pdf-servicio')?.value || '';
            pdfs.push({ titulo, url: ev.target.result, esLocal: true, nombreArchivo: file.name, servicio, fecha: new Date().toISOString() });
            localStorage.setItem('recursos_pdfs', JSON.stringify(pdfs));
            e.target.reset();
            renderRecursos();
            renderDashProgramacion();
            showNotification('Archivo subido correctamente.');
        };
        reader.readAsDataURL(file);
    });

    // Cargar recursos al entrar a la vista y al inicio
    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === 'recursos-view') {
            link.addEventListener('click', () => { setTimeout(renderRecursos, 50); poblarSelectorServicios(); });
        }
        // Regenerar agenda al entrar para tener reservas actualizadas
        if (link.getAttribute('data-target') === 'agenda-view') {
            link.addEventListener('click', () => setTimeout(generateAgendaMonth, 50));
        }
    });
    renderRecursos(); // Cargar al inicio también
    poblarSelectorServicios(); // Poblar selector con fechas reales

    // ─── AJUSTES: LIDERES DE AREA (solo Admin) ───────────────
    const AREAS = ['Visuales','Filmakers','Fotografía','Coordinación','Switchers','Streaming','Luces','Diseño','Edición','Protocolos','Cámaras'];

    function cargarLideres() {
        const panel = document.getElementById('lideres-container');
        if (!panel) return;
        if (!esAdmin) { document.getElementById('ajustes-lideres-panel')?.style && (document.getElementById('ajustes-lideres-panel').style.display = 'none'); return; }
        const lideres   = JSON.parse(localStorage.getItem('lideres_area') || '{}');
        const usuarios  = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
        panel.innerHTML = '';
        AREAS.forEach(area => {
            const row = document.createElement('div');
            row.className = 'area-row';
            const optsHtml = `<option value="">Sin líder</option>` +
                usuarios.map(u => `<option value="${u.nombre}" ${lideres[area] === u.nombre ? 'selected' : ''}>${u.nombre} (${u.area})</option>`).join('');
            row.innerHTML = `
                <span class="area-nombre">${area}</span>
                <select class="filter-select lider-select" data-area="${area}" style="flex:1;max-width:220px;">${optsHtml}</select>`;
            panel.appendChild(row);
        });
    }
    cargarLideres();

    document.getElementById('btn-guardar-lideres')?.addEventListener('click', () => {
        const lideres = {};
        document.querySelectorAll('.lider-select').forEach(sel => {
            if (sel.value) lideres[sel.dataset.area] = sel.value;
        });
        localStorage.setItem('lideres_area', JSON.stringify(lideres));
        showNotification('Líderes de área guardados.');
    });

    // ─── AJUSTES: MODO CLARO/OSCURO ──────────────────────────
    const toggleTheme = document.getElementById('toggle-theme');
    const savedTheme  = localStorage.getItem('tema') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (toggleTheme) toggleTheme.textContent = '\ud83c\udf19 Modo Oscuro';
    }
    toggleTheme?.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('tema', isLight ? 'light' : 'dark');
        toggleTheme.textContent = isLight ? '\ud83c\udf19 Modo Oscuro' : '\u2600\ufe0f Modo Claro';
    });

    // ─── LISTENERS FIREBASE EN TIEMPO REAL ───────────────────
    // Se registran al final para que todas las funciones estén definidas
    DB.listenUsuarios(data => {
        _lsSetItem('usuarios_registrados', JSON.stringify(data));
        cargarTablaUsuarios(
            document.getElementById('filtro-rol')?.value || '',
            document.getElementById('filtro-area')?.value || ''
        );
        actualizarEstadisticas();
    });
    DB.listenProyectos(data => {
        _lsSetItem('proyectos_creados', JSON.stringify(data));
        renderProyectos(); renderDashboardProyectosYTareas();
    });
    DB.listenServicios(data => {
        _lsSetItem('servicios_reservados', JSON.stringify(data));
        renderReservasSemana(); actualizarEstadisticas();
    });
    DB.listenPdfs(data => {
        _lsSetItem('recursos_pdfs', JSON.stringify(data));
        renderDashProgramacion(); renderRecursos();
    });

}); // fin DOMContentLoaded
