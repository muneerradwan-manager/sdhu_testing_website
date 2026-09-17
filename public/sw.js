/* Service worker — national Hajj platform demo.
 * - Pages: network first, fall back to the cached copy, then to /offline.
 * - Build assets, images, fonts, lesson audio: cache first (they are immutable or rarely change).
 * - API calls and videos are never cached (videos are large and range-requested).
 */
const VERSION = "sdhu-v2";
/** "" locally, "/sdhu_testing_website" on GitHub Pages — derived from where the worker is registered */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const PRECACHE = [`${BASE}/offline/`, `${BASE}/icons/icon-192.png`, `${BASE}/icons/icon-512.png`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE)).catch(() => {})
      .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  if (path.startsWith("/api/") || path.startsWith("/videos/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(`${BASE}/offline/`))),
    );
    return;
  }

  const cacheable =
    path.startsWith("/_next/static/") ||
    path.startsWith("/_next/image") ||
    path.startsWith("/images/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/audio/");
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.status === 200) {
            const copy = res.clone();
            caches.open(ASSETS).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
