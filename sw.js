// ============================================================================
//  Service worker — guarda una copia de la página (no de los datos) para que
//  cargue aunque no haya señal. Los pedidos al backend (Apps Script) nunca
//  pasan por aquí: esos siempre se piden en vivo.
// ============================================================================

const CACHE_NOMBRE = 'encuesta-satisfaccion-v2';
const ARCHIVOS_A_GUARDAR = ['./', './index.html', './encuesta.html', './manifest.json',
                             './icono-192.png', './icono-512.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NOMBRE).then(function (cache) { return cache.addAll(ARCHIVOS_A_GUARDAR); })
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
    fetch(e.request).then(function (respuesta) {
      const copia = respuesta.clone();
      caches.open(CACHE_NOMBRE).then(function (cache) { cache.put(e.request, copia); });
      return respuesta;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
