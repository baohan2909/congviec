// ============================================================
// CÔNG VIỆC — Service Worker
// ⚠️ VERSION BUMP: đổi cùng SYS.version (00-config.js) + app_settings
// ============================================================
const CACHE_VERSION = 'congviec-0.2.11';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/00-config.js', './js/01-supabase.js', './js/02-auth.js',
  './js/03-ui.js', './js/04-voice.js', './js/05-troly.js',
  './js/10-tab-homnay.js', './js/11-tab-baocao.js', './js/12-tab-kehoach.js',
  './js/13-tab-taikhoan.js', './js/14-tab-quantri.js', './js/99-app.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // KHÔNG tự skipWaiting — chờ người dùng bấm "Cập nhật" để không reload đột ngột
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)));
});
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API/Storage/Functions: luôn ra mạng
  if (url.hostname.endsWith('.supabase.co')) return;

  // Điều hướng: mạng trước, rớt mạng dùng shell
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  // Tĩnh cùng nguồn + fonts/CDN: cache trước, cập nhật nền
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok) caches.open(CACHE_VERSION).then((c) => c.put(e.request, res.clone())).catch(() => {});
        return res.clone();
      }).catch(() => hit);
      return hit || net;
    })
  );
});

// ---------- WEB PUSH ----------
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || 'Công việc', {
    body: d.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'congviec',
    data: { url: './' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    for (const w of ws) if ('focus' in w) return w.focus();
    return clients.openWindow('./');
  }));
});
