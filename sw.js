/* Service worker de Cuatro Lenguas.
   - La app (index.html) se pide primero a la red (para recibir actualizaciones) y,
     si no hay conexión o tarda más de 2,5 s, se sirve la copia guardada: funciona sin internet.
   - Íconos y manifiesto: primero la caché.
   - No toca peticiones a otros dominios (Firebase va directo a la red).
   Si cambias ESTE archivo, sube el número de versión. */
const CACHE = 'cuatro-lenguas-v4';
const BASE = ['./', './index.html', './manifest.webmanifest', './icons/icon-32.png', './icons/icon-192.png',
  './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (r.mode === 'navigate' || u.pathname.endsWith('/index.html')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const red = fetch(r).then(res => { if (res.ok) c.put('./index.html', res.clone()); return res; });
      try {
        return await Promise.race([red, new Promise((_, no) => setTimeout(() => no(new Error('lento')), 2500))]);
      } catch (x) {
        return (await c.match('./index.html')) || (await c.match('./')) || red;
      }
    })());
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
    return res;
  })));
});
