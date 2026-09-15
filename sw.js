var CACHE_NAME = 'maxtv20-v21';

var ASSETS = [
  './',
  './index.html',
  './style.css?v=21',
  './app.js?v=21',
  './supabase-config.js?v=21',
  './manifest.json',
  './ht-logo-white.svg',
  './icon-192.png',
  './icon-512.png',
  './nagrada-tv.webp',
  './nagrada-tv-2.webp',
  './fonts/TeleNeo-ExtraBold.woff2',
  './fonts/TeleNeo-Thin.woff2',
  './fonts/TeleNeoWeb-Regular.woff2',
  './fonts/TeleNeoWeb-Medium.woff2',
  './fonts/TeleNeoWeb-Bold.woff2',
  './fonts/TeleNeoWeb-ExtraBold.woff2'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.indexOf('supabase') > -1 || url.indexOf('esm.sh') > -1) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
