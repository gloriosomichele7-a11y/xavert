"use strict";

const CACHE_NAME = "xavert-shell-20261108-v2";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/work/",
  "/ai/",
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
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html"))));
    return;
  }

  const isMutableAsset =
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname === "/site.webmanifest";

  if (isMutableAsset) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
