const CACHE_NAME = 'firelog-ui-v1';
const ASSETS = [ '/', '/style.css', '/client.js', '/offline.html', '/icon.svg', '/manifest.json' ];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
    // Never intercept the live Server-Sent Events log stream
    if (e.request.url.includes('/stream')) return;

    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Cache the newest version of files while the CLI is running
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                return response;
            })
            .catch(() => {
                // If fetch fails (CLI is stopped), serve the waiting screen for HTML requests
                if (e.request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
                // Fallback for CSS/JS
                return caches.match(e.request);
            })
    );
});