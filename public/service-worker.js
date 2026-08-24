const VERSION = "ltv-1.1.10";
const STATIC = `${VERSION}-static`;
const APP_SHELL = ["./","./index.html","./manifest.webmanifest","./favicon.ico","./images/lt-cover-front.webp","./icons/favicon-32.png","./icons/favicon-48.png","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(STATIC).then(cache => cache.addAll(APP_SHELL))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== STATIC).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone();caches.open(STATIC).then(c=>c.put("./index.html",copy));return response; }).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if(response.ok&&new URL(event.request.url).origin===location.origin){const copy=response.clone();caches.open(STATIC).then(c=>c.put(event.request,copy));}return response; })));
});
self.addEventListener("message", event => { if(event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
