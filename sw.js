// Service worker : garde l'application disponible hors ligne.
// Changer CACHE_VERSION à chaque modification des fichiers pour forcer la mise à jour.
const CACHE_VERSION = 'annuaire-g12-v1';
const FILES = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

// Réseau d'abord (pour avoir la dernière version), cache si hors ligne
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const copy = response.clone();
                caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
});
