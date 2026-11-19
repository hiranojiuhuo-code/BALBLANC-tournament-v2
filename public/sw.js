/*
 * サービスワーカー。合宿地のように電波が悪い場所でもアプリが開くようにする。
 *
 * - 画面(HTML)は「まず通信、だめならキャッシュ」。古い画面を掴み続けないため。
 * - /_next/static/ 配下はファイル名にハッシュが入っていて中身が変わらないので「キャッシュ優先」。
 * - 同期先(Firebase)やAIのAPIなど、他のサイトへの通信には一切手を出さない。
 *
 * __BUILD__ はビルド時に scripts/stamp-sw.mjs が時刻へ書き換える。配信のたびに
 * このファイルが変わることで、端末側のキャッシュが新しい版に入れ替わる。
 */
const BUILD = '__BUILD__';
const CACHE = 'balblanc-' + BUILD;
const SCOPE = new URL(self.registration.scope).pathname; // 例: /BALBLANC-tournament-v2/
const ROUTES = ['', 'matches/', 'standings/', 'players/', 'stats/', 'import/', 'saves/', 'settings/', 'setup/'];
const NAV_TIMEOUT_MS = 4000;

/*
 * 初回に全画面とその部品を取り込んでおく。開いたことのない画面もオフラインで開けるようにするため。
 * 画面には2種類のファイルがある:
 *   - index.html … アドレスを直接開いたとき
 *   - index.txt  … アプリ内で画面を切り替えたとき（Next.js が画面のデータだけを取りに行く）
 * index.txt を保存し忘れると、電波が無いときに画面の切り替えだけが失敗する。
 */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const assets = new Set();
    const files = ROUTES.flatMap((r) => [SCOPE + r, SCOPE + r + 'index.txt']);
    await Promise.all(files.map(async (path) => {
      try {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.clone().text();
        await cache.put(path, res);
        for (const m of body.matchAll(/["'(]([^"'()\s\\]*\/_next\/static\/[^"'()\s\\]+)/g)) assets.add(m[1]);
      } catch { /* 取れなかった分は、実際に開いたときに保存される */ }
    }));
    await Promise.all([...assets].map(async (u) => {
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch { /* 同上 */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('balblanc-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// ?_rsc=... のような問い合わせ文字列は毎回変わるので、保存と照合はパスだけで行う
async function networkFirst(req, isNav) {
  const cache = await caches.open(CACHE);
  const key = new URL(req.url).pathname;
  // 画面データ(index.txt)のアドレスで開かれた場合は、その画面本体を返す（先頭画面に飛ばさない）
  const pageKey = key.endsWith('/index.txt') ? key.slice(0, -'index.txt'.length) : key;
  const fromCache = async () =>
    (await cache.match(isNav ? pageKey : key)) || (isNav ? await cache.match(SCOPE) : undefined);

  try {
    const net = fetch(req).then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });
    if (!isNav) return await net;
    // 電波が弱いと応答が返らないまま長く待たされる。画面は一定時間で手元の版に切り替える
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
    const first = await Promise.race([net, timeout]);
    if (first) return first;
    return (await fromCache()) || (await net);
  } catch (e) {
    const hit = await fromCache();
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(networkFirst(req, req.mode === 'navigate'));
});
