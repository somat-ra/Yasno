/* Service worker «Ясно».
   Стратегія: network-first для index.html (щоб оновлення прилітали одразу),
   cache-first для іконок/шрифтів. Офлайн — віддаємо кеш. */
const VER = 'yasno-v1';
const CORE = ['./index.html', './manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Навігація/HTML: мережа перша, кеш як офлайн-фолбек
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Google API / авторизація — ніколи не кешувати
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('accounts.google.com')) return;

  // Решта (іконки, шрифти): кеш перший, докешовуємо з мережі
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && (url.origin === location.origin || url.hostname.includes('gstatic.com') || url.hostname.includes('fonts.googleapis.com'))) {
        const cp = r.clone(); caches.open(VER).then(c => c.put(e.request, cp));
      }
      return r;
    }))
  );
});
