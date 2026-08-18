/* Sufle — çevrimdışı çalışması için service worker */
const CACHE = 'sufle-v102';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-180.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // GEZİNME: ÖNCE AĞ, olmazsa önbellekten index.
  // ⚠️ BU SATIRI CACHE-FIRST YAPMAYIN. Uygulamanın tamamı tek index.html
  // dosyası; gezinme önbellekten servis edilirse kullanıcı yayınlanan her
  // yeni sürümü kaçırır ve bunu anlamasının hiçbir yolu olmaz — ne hata
  // çıkar ne uyarı. tests/28 bu davranışı kilitliyor.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // diğerleri (simgeler, manifest): önce önbellek, yoksa ağ (ve önbelleğe al)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    // Eskiden burada `.catch(() => hit)` yazıyordu; bu noktada hit HER ZAMAN
    // falsy (zaten önbellekte bulunmadığı için ağa gidiliyor), yani sözde
    // çevrimdışı yedeği undefined döndürüp isteği sessizce bozuyordu.
    }).catch(() => new Response('', { status: 504, statusText: 'cevrimdisi' })))
  );
});
