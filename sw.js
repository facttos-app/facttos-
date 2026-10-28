/* FACTYOS — service worker
   Principe : on va TOUJOURS chercher la version la plus récente sur le site.
   La copie gardée en mémoire ne sert que lorsque le téléphone est hors connexion. */
var CACHE = "factyos-v3";
var BASE = ["./", "index.html", "confidentialite.html", "manifest.json"];

self.addEventListener("install", function (e) {
  self.skipWaiting(); // la nouvelle version prend la place de l'ancienne tout de suite
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(BASE.map(function (u) { return c.add(u).catch(function () {}); }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, polices, CDN : on ne touche à rien

  e.respondWith(
    fetch(req.url, { cache: "no-store", credentials: "same-origin" })
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (r) {
          return r || (req.mode === "navigate" ? caches.match("index.html") : undefined);
        });
      })
  );
});
