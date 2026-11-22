"use strict";

// XAVERT PWA: a page that is unavailable offline must not silently become
// the home page. Keep assets fresh while preserving previously visited pages.
const CACHE_NAME = "xavert-shell-20261122-v2";
const CACHE_PREFIX = "xavert-shell-";
const OFFLINE_URL = "/offline.html";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/work/",
  "/ai/",
  OFFLINE_URL,
  "/favicon.svg",
  "/logo-hero.svg",
  "/site.webmanifest",
  "/assets/css/home-next.css",
  "/assets/css/global.css",
  "/assets/css/components.css",
  "/assets/css/responsive.css",
  "/assets/css/hub.css",
  "/assets/js/home-i18n.js",
  "/assets/js/index.js",
  "/assets/js/global.js",
  "/assets/js/hub-i18n.js",
  "/assets/js/pwa-install.js",
  "/assets/images/pwa-icon-192.png",
  "/assets/images/pwa-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function mayCache(response) {
  // Do not cache errors, redirects or opaque responses.
  return Boolean(response && response.ok && response.type === "basic" && !response.redirected);
}

async function networkFirst(request, event, fallbackNavigation = false) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (mayCache(response)) {
      const save = cache.put(request, response.clone()).catch(() => {});
      event.waitUntil(save);
    }
    return response;
  } catch {
    const saved = await cache.match(request);
    if (saved) return saved;
    if (fallbackNavigation) return (await cache.match(OFFLINE_URL)) || Response.error();
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, event, true));
    return;
  }

  const mutable = /\.(?:css|js)$/.test(url.pathname) || url.pathname === "/site.webmanifest";
  if (mutable) {
    event.respondWith(networkFirst(request, event));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const saved = await cache.match(request);
      if (saved) return saved;
      return networkFirst(request, event);
    })
  );
});
