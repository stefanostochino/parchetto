// SCHEDONE: prima di tutto offline.
// L'app si apre sempre dalla copia salvata sul telefono; gli aggiornamenti arrivano in sottofondo.
const CACHE = "schedone-v9";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./fonts/Barlow-Medium.ttf", "./fonts/Barlow-Regular.ttf",
  "./fonts/Barlow-SemiBold.ttf", "./fonts/BarlowCondensed-Bold.ttf", "./fonts/BarlowCondensed-ExtraBold.ttf"];
// Lettore di foto (circa 10 MB): scaricato in sottofondo dopo l'installazione, così funziona anche offline.
const OCR = ["./vendor/tesseract/tesseract.min.js", "./vendor/tesseract/worker.min.js", "./vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
  "./vendor/tesseract/tesseract-core-lstm.wasm.js", "./vendor/tesseract/lang/ita.traineddata.gz"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => caches.open(CACHE))
      .then((c) => Promise.all(OCR.map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => null)))))
      .catch(() => null)
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate";
  const isVendor = req.url.indexOf("/vendor/") > -1;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const key = isPage ? "./index.html" : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      if (cached && isVendor) return cached; // file pesanti e fissi: niente ricontrollo
      const update = fetch(req, { cache: "no-cache" })
        .then((res) => { if (res && res.ok) cache.put(key, res.clone()); return res; })
        .catch(() => null);
      if (cached) { e.waitUntil(update); return cached; }
      const net = await update;
      return net || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    })
  );
});
