// 離線快取：先用快取，同時在背景更新。改了程式或資料後把 VERSION 加 1。
const VERSION = "v40";
const CACHE = `chengyu-${VERSION}`;
const CONTENT_CACHE = "chengyu-offline-v1";
const SHELL = [
  "./", "index.html", "css/app.css", "js/app.js", "js/render.js",
  "data/moe-index.json", "data/meta.json", "data/mine.json", "data/illustrations.json",
  "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => /^chengyu-v/.test(k) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const ok = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!ok) return;
  // Visited and explicitly downloaded pictures share one cache, avoiding two
  // stored copies of every large image. Keep it across application upgrades.
  const content = url.origin === location.origin && /\/(data\/detail|img\/idioms)\//.test(url.pathname);
  const cache = caches.open(content ? CONTENT_CACHE : CACHE);
  const hit = cache.then((c) => c.match(req, { ignoreSearch: url.origin === location.origin }));
  const net = fetch(req).then(async (res) => {
    if (res.ok || res.type === "opaque") {
      await cache.then((c) => c.put(req, res.clone())).catch(() => {});
    }
    return res;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  e.respondWith(hit.then((res) => res || net));
});
