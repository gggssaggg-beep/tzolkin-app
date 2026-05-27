const CACHE = 'tzolkin-v44';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'tzolkin.js', 'manifest.json',
  'data/seals.json', 'data/tones.json', 'data/kin_descriptions.json', 'data/maya_classic.json', 'data/dreamspell_texts.json',
  ...Array.from({length:20}, (_,i) => `img/seal_${String(i+1).padStart(2,'0')}.png`),
  ...Array.from({length:13}, (_,i) => `img/tone_${String(i+1).padStart(2,'0')}.png`),
  'icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
