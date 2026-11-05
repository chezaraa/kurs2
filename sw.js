// Офлайн-режим курса: страница берётся из сети, а без интернета из кэша.
var VERSION = 'ifr-202611051236';
var CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k.indexOf('ifr-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var p = url.pathname;
      if (res.ok && url.origin === self.location.origin && (/\/$/.test(p) || /\/index\.html$/.test(p))) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put('./index.html', copy); });
      }
      return res;
    }).catch(function () {
      return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
    }));
    return;
  }
  var font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !font) return;
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});

// Напоминание: сервер присылает пустой push, текст подбирается здесь.
var TEXTS = [
  'Лента фраз ждёт: 60 секунд.',
  'Минута испанского: открой ленту.',
  'Одна фраза сегодня приблизит тебя к клиенту.',
  'Бой на 60 секунд: побей свой рекорд.',
  'Серия ждёт. Хватит одной минуты.'
];
self.addEventListener('push', function (e) {
  var body = TEXTS[Math.floor(Math.random() * TEXTS.length)];
  e.waitUntil(self.registration.showNotification('Испанский для ремонта', { body: body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'daily', data: { url: './#/feed' } }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { var c = list[i]; if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
