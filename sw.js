/* Offline service worker (generated into dist/sw.js by vite.config.ts). Cache-first for every
   built file; audio requests with a Range header are answered from the cached full file. */
const VERSION = 'cd4c2f7686';
const CACHE = `slicer-${VERSION}`;
const FILES = ["./","CNAME","assets/audio/Cardmove.m4a","assets/audio/Collapse3.mp3","assets/audio/Expand-click.mp3","assets/audio/Expand3.mp3","assets/audio/GameMusic.m4a","assets/audio/GetCollapse.mp3","assets/audio/Lose-whoosh.mp3","assets/audio/MenuMusic.m4a","assets/audio/Win1.mp3","assets/audio/menu-click.mp3","assets/audio/start-game.mp3","assets/fonts/FbAharoniNew-Bold.otf","assets/fonts/SNPro-Bold.ttf","assets/fonts/SNPro-OFL.txt","assets/img/bg3.png","assets/img/card-artwork.svg","assets/img/card-back.svg","assets/img/digit-bottom-1.svg","assets/img/digit-bottom-2.svg","assets/img/digit-bottom-3.svg","assets/img/digit-bottom-4.svg","assets/img/digit-bottom-5.svg","assets/img/digit-bottom-6.svg","assets/img/digit-bottom-7.svg","assets/img/digit-top-1.svg","assets/img/digit-top-2.svg","assets/img/digit-top-3.svg","assets/img/digit-top-4.svg","assets/img/digit-top-5.svg","assets/img/digit-top-6.svg","assets/img/digit-top-7.svg","assets/img/grass1.svg","assets/img/grass2.svg","assets/img/grass3.svg","assets/img/grass4.svg","assets/img/leaf1.svg","assets/img/leaf2.svg","assets/img/logo-en.png","assets/img/logo-he.png","assets/img/merge-card.png","assets/img/merge-icon.svg","assets/img/pink_flower.svg","assets/img/smallflowerPink.svg","assets/img/smallflowerYellow.svg","assets/img/yellow_flower.svg","assets/index-BmdzgXda.css","assets/index-Bx0dlAgw.js","icons/icon-1024.png","icons/icon-192.png","icons/icon-512.png","index.html","manifest.webmanifest"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new URL(f, self.registration.scope).toString()))).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('slicer-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

async function rangeResponse(request, response) {
  const range = request.headers.get('range');
  if (!range || !response || response.status !== 200) return response;
  const m = /bytes=(\d+)-(\d*)/.exec(range);
  if (!m) return response;
  const buf = await response.arrayBuffer();
  const start = Number(m[1]);
  const end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mp4',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
    },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // third-party requests (analytics) go straight to the network

  // The page itself (index.html): NETWORK first, so anyone who is online always gets the newest version
  // right away (a plain cache-first page showed the PREVIOUS release until the second reload). Offline,
  // or if the network stalls for 4s, the cached copy is served. The fresh copy is cached for next time.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const home = new URL('./', self.registration.scope).toString();
        try {
          const fresh = await Promise.race([
            fetch(req),
            new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000)),
          ]);
          if (fresh && fresh.ok) cache.put(home, fresh.clone());
          return fresh;
        } catch (err) {
          return (await cache.match(home)) || (await cache.match(req, { ignoreSearch: true })) || Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else (hashed JS/CSS, art, audio, fonts): cache first.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      if (hit) return rangeResponse(req, hit);
      return fetch(req);
    }),
  );
});
