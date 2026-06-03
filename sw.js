const CACHE = 'tzolkin-v71';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'tzolkin.js', 'manifest.json',
  'data/seals.json', 'data/tones.json', 'data/kin_descriptions.json', 'data/maya_classic.json', 'data/dreamspell_texts.json',
  ...Array.from({length:20}, (_,i) => `img/seal_${String(i+1).padStart(2,'0')}.png`),
  ...Array.from({length:13}, (_,i) => `img/tone_${String(i+1).padStart(2,'0')}.png`),
  'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  // addAll is atomic-ish but one 404 aborts the whole precache; cache items
  // individually so a single missing asset can't break offline support.
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

// Only cache same-origin GETs with a cacheable (200, basic) response — never
// opaque cross-origin (fonts/Telegram SDK) or 206 partials (ranged audio),
// which throw on cache.put.
function cacheable(req, res) {
  return req.method === 'GET' && res && res.status === 200 && res.type === 'basic';
}

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // let the network handle cross-origin

  // Images / fonts / icons rarely change → cache-first (instant, offline-safe).
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (cacheable(request, res)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Everything else — HTML, JS, CSS, JSON data: NETWORK-FIRST.
  // "Обновляется в начале, без сети — из кэша": when online we always fetch the
  // latest (so code/markup edits and new releases show on the next load — no
  // stale-while-revalidate lag); when offline we fall back to the cached copy.
  e.respondWith(
    fetch(request).then(res => {
      if (cacheable(request, res)) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
      }
      return res;
    }).catch(() => caches.match(request).then(c => c || Response.error()))
  );
});
