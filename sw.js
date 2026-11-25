// 離線快取：先用快取，同時在背景更新。改了程式或資料後把 VERSION 加 1。
const VERSION = "v131";
const CACHE = `chengyu-${VERSION}`;
const CONTENT_CACHE = "chengyu-offline-v1";
const SHELL = [
  "./", "index.html", "css/app.css", "js/app.js", "js/render.js",
  "data/moe-index.json", "data/meta.json", "data/mine.json", "data/illustrations.json",
  "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
];

// 新版裝好後先等著，由網頁顯示「有新版本」通知，使用者按「更新」才切換（避免作答到一半被換掉）。
// v116 以前的網頁還不會顯示通知，從那些舊版升級時直接切換，避免卡在舊版。
const FIRST_WITH_BANNER = 117;
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })));
    const olds = (await caches.keys()).map((k) => /^chengyu-v(\d+)$/.exec(k)).filter(Boolean).map((m) => +m[1]);
    if (olds.some((v) => v < FIRST_WITH_BANNER)) await self.skipWaiting();
  })());
});
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "VERSION") e.source?.postMessage({ type: "VERSION", version: VERSION });
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => /^chengyu-v/.test(k) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 取資料的規則：
// - 有快取就先用快取（最多等 1.5 秒，iPhone 上快取很大時查詢可能很慢，就改走網路）。
// - 從網路拿到的檔案「馬上」交給網頁顯示，存進快取在背景進行，不讓大張插圖卡住畫面。
// - 插圖的網址帶 ?retry=… 時不查快取，直接重新下載（網頁上「點一下重試」用）。
const lookup = (p, ms) => Promise.race([p.catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const ok = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!ok) return;
  // Visited and explicitly downloaded pictures share one cache, avoiding two
  // stored copies of every large image. Keep it across application upgrades.
  // 插圖：直接從網路載入，不在下載時另外複製一份存快取（iPhone 上這樣做可能讓圖片卡住載不完）。
  // 沒有網路時，才改用「下載全部內容」存好的那一份。
  if (url.origin === location.origin && /\/img\/idioms\//.test(url.pathname)) {
    e.respondWith(fetch(req).catch(() =>
      caches.open(CONTENT_CACHE).then((c) => c.match(req, { ignoreSearch: true })).then((r) => r || Response.error())));
    return;
  }
  const content = url.origin === location.origin && /\/data\/detail\//.test(url.pathname);
  const retry = url.searchParams.has("retry");
  const cacheP = caches.open(content ? CONTENT_CACHE : CACHE);
  const key = retry ? new Request(url.origin + url.pathname) : req;
  let finish;
  e.waitUntil(new Promise((r) => { finish = r; }));
  const net = fetch(retry ? new Request(url.href, { cache: "reload" }) : req).then((res) => {
    if (res.ok || res.type === "opaque") {
      const copy = res.clone();
      cacheP.then((c) => c.put(key, copy)).catch(() => {}).finally(finish);
    } else finish();
    return res;
  }, (err) => { finish(); throw err; });
  if (retry) { e.respondWith(net); return; }
  const hit = lookup(cacheP.then((c) => c.match(req, { ignoreSearch: url.origin === location.origin })), 1500);
  e.respondWith(hit.then((res) => res || net));
});
