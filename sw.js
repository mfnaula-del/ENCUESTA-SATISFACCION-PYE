// ============================================================================
//  Service worker — guarda una copia de la página (no de los datos) para que
//  cargue aunque no haya señal. Los pedidos al backend (Apps Script) nunca
//  pasan por aquí: esos siempre se piden en vivo.
// ============================================================================

const CACHE_NOMBRE = 'encuesta-satisfaccion-v5';
const ARCHIVOS_A_GUARDAR = ['./', './index.html', './encuesta.html', './taller.html', './proteccion.html', './manifest.json',
                             './icono-192.png', './icono-512.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NOMBRE).then(function (cache) {
      // {cache:'reload'} obliga a pedirle el archivo a la red de verdad, sin
      // usar el caché HTTP del navegador — si no, podríamos guardar en el
      // Service Worker una copia que YA estaba vieja desde antes.
      return Promise.all(ARCHIVOS_A_GUARDAR.map(function (url) {
        return fetch(url, { cache: 'reload' }).then(function (resp) { return cache.put(url, resp); });
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(nombres.filter(function (n) { return n !== CACHE_NOMBRE; })
                                  .map(function (n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  // Solo intervenimos en pedidos GET a nuestras propias páginas. Todo lo que
  // va hacia el backend (Apps Script, otro origen) pasa de largo sin tocarlo:
  // esos datos siempre deben pedirse en vivo, nunca servirse desde la copia guardada.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(function (respuesta) {
      const copia = respuesta.clone();
      caches.open(CACHE_NOMBRE).then(function (cache) { cache.put(e.request, copia); });
      return respuesta;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
