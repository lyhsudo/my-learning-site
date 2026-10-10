/* 离线缓存：让网站装到桌面/手机后也能离线打开。

   ⚠ 2026-09-18 修正（此前是 bug）：
   旧实现把 CACHE 写死为 "lls-v1" 且 fetch 是**纯 cache-first**——
   资源一旦进缓存就再也不会更新，改完 style.css / app.js 用户永远看到旧界面
   （activate 里只删「名字不同」的缓存，而名字恒定，所以旧缓存永不被清理）。

   现在的策略：
   - 应用外壳（HTML / CSS / JS / data.js）→ **network-first**，拿到新的就更新缓存，
     断网时回退缓存。保证改动能立即生效，同时保留离线能力。
   - 厂商资源（KaTeX / 字体 / 图标）→ cache-first，这些几乎不变，优先本地加速。
   - 导航请求失败 → 回退缓存的 index.html。

   📌 以后发版如果发现仍有旧资源残留，把下面的 VERSION 加一即可强制清缓存。 */

var VERSION = "v3";
var CACHE = "lls-" + VERSION;

/* 首次安装时预缓存的核心文件 */
var ASSETS = [
  "./", "./index.html", "./data.js",
  "./assets/style.css", "./assets/app.js",
  "./assets/katex/katex.min.css", "./assets/katex/katex.min.js",
  "./assets/icon.svg"
];

/* 需要「先联网、后缓存」的应用外壳 */
function isAppShell(url) {
  if (url.origin !== self.location.origin) return false;
  return /\.(?:html|css|js|json)$/i.test(url.pathname) ||
    url.pathname === "/" || url.pathname.slice(-1) === "/";
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      /* 删掉所有非当前版本的缓存 —— 顺带清掉历史遗留的 lls-v1 */
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  /* 应用外壳：先联网，成功就顺手更新缓存；失败回退缓存（离线可用） */
  if (isAppShell(url)) {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* 厂商资源：缓存优先（KaTeX / 字体 / 图标，基本不变） */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return resp;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
