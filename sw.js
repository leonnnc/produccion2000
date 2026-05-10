// ==========================================
// SERVICE WORKER — ProDUC PWA
// ==========================================
const CACHE_NAME = 'produc-v1';

// Archivos a cachear para modo offline
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/style.css',
    '/script.js',
    '/dashboard.js',
    '/firebase.js',
    '/utils.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Instalar: cachear archivos estáticos
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_ASSETS))
    );
    self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network first, fallback a cache
self.addEventListener('fetch', (e) => {
    // Solo manejar requests GET
    if (e.request.method !== 'GET') return;

    // No interceptar requests a Firebase (siempre necesitan red)
    if (e.request.url.includes('firebaseio.com') ||
        e.request.url.includes('googleapis.com') ||
        e.request.url.includes('gstatic.com')) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Guardar copia en cache si es exitoso
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
