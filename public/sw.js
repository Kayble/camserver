self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Deixa o tráfego de mídia e sinalização do WebRTC passar direto
    event.respondWith(fetch(event.request));
});