// ==========================================
// FIREBASE — Capa de datos compartida
// ==========================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getDatabase, ref, set, get, update, remove, onValue, push, child, onDisconnect }
    from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updatePassword }
    from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getStorage, ref as sRef, uploadBytes, getDownloadURL }
    from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyCnTRafmw1uayFrFe57700_VGPB5mRotnE",
    authDomain: "produccion-erp-bea1a.firebaseapp.com",
    databaseURL: "https://produccion-erp-bea1a-default-rtdb.firebaseio.com",
    projectId: "produccion-erp-bea1a",
    storageBucket: "produccion-erp-bea1a.firebasestorage.app",
    messagingSenderId: "205662876910",
    appId: "1:205662876910:web:5938515dc517e0b4f0efff"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ─── CLAVES DE COLECCIONES ────────────────────────────────
const KEYS = {
    usuarios:    'usuarios_registrados',
    proyectos:   'proyectos_creados',
    servicios:   'servicios_reservados',
    asistencias: 'asistencias_proyectos',
    aceptaciones:'aceptaciones_tareas',
    comentarios: 'comentarios',
    recursos_pdfs:   'recursos_pdfs',
    recursos_videos: 'recursos_videos',
    lideres:     'lideres_area',
    presencia:   'presencia_usuarios',
    chats:       'chats_mensajes'
};

// ─── HELPERS ─────────────────────────────────────────────

/** Lee una colección completa y retorna un array */
async function getCollection(key) {
    const snap = await get(ref(db, key));
    if (!snap.exists()) return [];
    const val = snap.val();
    // Realtime DB guarda objetos con keys automáticas; convertir a array
    if (Array.isArray(val)) return val.filter(Boolean);
    return Object.values(val);
}

/** Escribe un array completo en una colección */
async function setCollection(key, arr) {
    await set(ref(db, key), arr);
}

/** Escribe un objeto (no array) en una clave */
async function setObject(key, obj) {
    await set(ref(db, key), obj);
}

/** Lee un objeto (no array) */
async function getObject(key) {
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : {};
}

/** Escucha cambios en tiempo real en una colección (array) */
function listenCollection(key, callback) {
    onValue(ref(db, key), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const val = snap.val();
        callback(Array.isArray(val) ? val.filter(Boolean) : Object.values(val));
    });
}

/** Escucha cambios en tiempo real en un objeto (preserva claves) */
function listenObject(key, callback) {
    onValue(ref(db, key), (snap) => {
        callback(snap.exists() ? snap.val() : {});
    });
}

/** Escucha mensajes ordenados por timestamp */
function listenMensajesOrdenados(key, callback) {
    onValue(ref(db, key), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const val = snap.val();
        const arr = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
        arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(arr);
    });
}

// ─── API PÚBLICA ──────────────────────────────────────────

export const AUTH = {
    getAuth: () => auth,
    registrar: (email, pwd) => createUserWithEmailAndPassword(auth, email, pwd),
    login: (email, pwd) => signInWithEmailAndPassword(auth, email, pwd),
    recuperar: (email) => sendPasswordResetEmail(auth, email),
    logout: () => signOut(auth),
    onEstadoCambiado: (cb) => onAuthStateChanged(auth, cb),
    cambiarClave: (user, nuevaClave) => updatePassword(user, nuevaClave)
};

export const STORAGE = {
    subirFotoPerfil: async (uid, file) => {
        const fileRef = sRef(storage, `fotos_perfil/${uid}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
    }
};

// Bandera para evitar registrar múltiples listeners de presencia
let _presenciaInicializada = false;

export const DB = {
    // Presencia y Chat
    listenConexionState: (key, cb) => {
        if (_presenciaInicializada) {
            // Ya inicializada: solo actualizar el estado online si ya hay conexión
            const userPresenceRef = ref(db, `${KEYS.presencia}/${key}`);
            const connRef = ref(db, '.info/connected');
            onValue(connRef, (snap) => {
                if (snap.val() !== true) return;
                const offlineState = { online: false, ultima_conexion: Date.now() };
                const onlineState  = { online: true,  ultima_conexion: Date.now() };
                onDisconnect(userPresenceRef).set(offlineState).then(() => {
                    set(userPresenceRef, onlineState);
                    if (cb) cb(true);
                });
            }, { onlyOnce: true }); // solo una vez para no acumular
            return;
        }
        _presenciaInicializada = true;
        // Usar onAuthStateChanged para garantizar que Firebase Auth esté listo
        onAuthStateChanged(auth, (user) => {
            if (!user) return; // No autenticado, no registrar presencia
            const userPresenceRef = ref(db, `${KEYS.presencia}/${key}`);
            const connRef = ref(db, '.info/connected');
            onValue(connRef, (snap) => {
                if (snap.val() !== true) return;
                const offlineState = { online: false, ultima_conexion: Date.now() };
                const onlineState  = { online: true,  ultima_conexion: Date.now() };
                onDisconnect(userPresenceRef).set(offlineState).then(() => {
                    set(userPresenceRef, onlineState);
                    if (cb) cb(true);
                });
            });
        });
    },
    setOffline: async (key) => {
        const userPresenceRef = ref(db, `${KEYS.presencia}/${key}`);
        await set(userPresenceRef, { online: false, ultima_conexion: Date.now() });
    },
    // listenPresencia usa listenObject para preservar las claves email
    listenPresencia: (cb) => listenObject(KEYS.presencia, cb),
    enviarMensaje: async (msgObj) => {
        const chatRef = ref(db, KEYS.chats);
        const newMsgRef = push(chatRef);
        await set(newMsgRef, msgObj);
    },
    // Mensajes ordenados por timestamp
    listenMensajes: (cb) => listenMensajesOrdenados(KEYS.chats, cb),

    // Usuarios
    getUsuarios:    () => getCollection(KEYS.usuarios),
    setUsuarios:    (arr) => setCollection(KEYS.usuarios, arr),
    listenUsuarios: (cb) => listenCollection(KEYS.usuarios, cb),

    // Proyectos
    getProyectos:    () => getCollection(KEYS.proyectos),
    setProyectos:    (arr) => setCollection(KEYS.proyectos, arr),
    listenProyectos: (cb) => listenCollection(KEYS.proyectos, cb),

    // Servicios reservados
    getServicios:    () => getCollection(KEYS.servicios),
    setServicios:    (arr) => setCollection(KEYS.servicios, arr),
    listenServicios: (cb) => listenCollection(KEYS.servicios, cb),

    // Asistencias proyectos (objeto clave→valor)
    getAsistencias:  () => getObject(KEYS.asistencias),
    setAsistencias:  (obj) => setObject(KEYS.asistencias, obj),

    // Aceptaciones tareas (objeto clave→valor)
    getAceptaciones: () => getObject(KEYS.aceptaciones),
    setAceptaciones: (obj) => setObject(KEYS.aceptaciones, obj),

    // Comentarios (objeto clave→array)
    getComentarios:  () => getObject(KEYS.comentarios),
    setComentarios:  (obj) => setObject(KEYS.comentarios, obj),

    // Recursos PDFs
    getPdfs:    () => getCollection(KEYS.recursos_pdfs),
    setPdfs:    (arr) => setCollection(KEYS.recursos_pdfs, arr),
    listenPdfs: (cb) => listenCollection(KEYS.recursos_pdfs, cb),

    // Recursos Videos
    getVideos:    () => getCollection(KEYS.recursos_videos),
    setVideos:    (arr) => setCollection(KEYS.recursos_videos, arr),
    listenVideos: (cb) => listenCollection(KEYS.recursos_videos, cb),

    // Líderes de área (objeto)
    getLideres:  () => getObject(KEYS.lideres),
    setLideres:  (obj) => setObject(KEYS.lideres, obj),

    // ── Migración: sube localStorage a Firebase (solo una vez) ──
    async migrarDesdeLocalStorage() {
        const migrado = localStorage.getItem('firebase_migrado');
        if (migrado) return;

        const ops = [];

        for (const [dbKey, lsKey] of Object.entries(KEYS)) {
            const raw = localStorage.getItem(lsKey);
            if (!raw) continue;
            try {
                const data = JSON.parse(raw);
                if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
                    ops.push(set(ref(db, lsKey), data));
                }
            } catch(e) {}
        }

        await Promise.all(ops);
        localStorage.setItem('firebase_migrado', '1');
    }
};
