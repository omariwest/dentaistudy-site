const CACHE_NAME = "bracketmotion-shell-v4";
const STATIC_SHELL = [
  "/",
  "/manifest.webmanifest?v=black-20261128",
  "/favicon.ico?v=black-20261128",
  "/icons/bracketmotion-icon.svg?v=black-20261128",
  "/icons/favicon-16.png?v=black-20261128",
  "/icons/favicon-32.png?v=black-20261128",
  "/icons/favicon-48.png?v=black-20261128",
  "/icons/icon-180.png?v=black-20261128",
  "/icons/icon-192.png?v=black-20261128",
  "/icons/icon-512.png?v=black-20261128",
];

async function precacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(STATIC_SHELL);

  const appResponse = await fetch("/app", { cache: "no-store" });
  if (!appResponse.ok) {
    throw new Error("BracketMotion app shell could not be cached.");
  }

  const html = await appResponse.clone().text();
  await cache.put("/app", appResponse);

  const assetUrls = [
    ...new Set(
      [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(
        (match) => match[1],
      ),
    ),
  ];

  await Promise.all(
    assetUrls.map(async (assetUrl) => {
      try {
        const response = await fetch(assetUrl);
        if (response.ok) {
          await cache.put(assetUrl, response);
        }
      } catch {
        // The app shell remains installable even if one optional asset misses cache.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplicationShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/app", copy));
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match("/app")) ||
            (await caches.match("/"))
          );
        }),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fresh;
      }),
    );
  }
});
