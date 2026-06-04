// ==========================================
// SERVICE WORKER — ProDUC PWA  v2
// ==========================================
const CACHE_NAME = 'produc-v6';

// Assets estáticos que se cachean al instalar
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/firebase.js',
    '/utils.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js',
    'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js'
];

// Instalar: cachear archivos estáticos inmediatamente
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
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

// Fetch: estrategia híbrida para máxima velocidad
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = e.request.url;

    // Peticiones de datos de Firebase van directo a la red
    if (url.includes('firebaseio.com') ||
        url.includes('googleapis.com') ||
        url.includes('firebaseapp.com')) {
        return;
    }

    const isHTML = e.request.destination === 'document';
    const isStatic = e.request.destination === 'script' ||
                     e.request.destination === 'style'  ||
                     e.request.destination === 'image'  ||
                     e.request.destination === 'font';

    if (isStatic) {
        // Stale-While-Revalidate para JS/CSS -> carga ultra rápida y actualiza en background
        e.respondWith(
            caches.match(e.request).then(cachedResponse => {
                const fetchPromise = fetch(e.request).then(networkResponse => {
                    if (networkResponse.ok) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, responseToCache));
                    }
                    return networkResponse;
                }).catch(() => {});
                return cachedResponse || fetchPromise;
            })
        );
    } else if (isHTML) {
        // Network First para HTML → contenido siempre fresco
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(e.request))
        );
    } else {
        // Network First genérico con fallback a cache
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(e.request))
        );
    }
});
