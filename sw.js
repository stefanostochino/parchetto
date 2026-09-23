// Parchetto: prima di tutto offline.
// L'app si apre sempre dalla copia salvata sul telefono (istantanea, anche senza segnale).
// Se c'è internet, in sottofondo scarica l'eventuale versione nuova per la volta successiva.
const CACHE = "parchetto-v2";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./fonts/Barlow-Medium.ttf", "./fonts/Barlow-Regular.ttf", "./fonts/Barlow-SemiBold.ttf", "./fonts/BarlowCondensed-Bold.ttf", "./fonts/BarlowCondensed-ExtraBold.ttf"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(isPage ? "./index.html" : req, { ignoreSearch: true });
      const update = fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res && res.ok) cache.put(isPage ? "./index.html" : req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        e.waitUntil(update);
        return cached;
      }
      const net = await update;
      return net || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    })
  );
});
