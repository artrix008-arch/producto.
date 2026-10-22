/* producto. service worker
   Goal: launch instantly and work offline, but never serve a stale app
   and never get between Firebase and the network. */
const VERSION = 'producto-v60';  // Pixel Night assets cache on first use, never on install.
const SHELL   = VERSION + '-shell';
const FONTS   = VERSION + '-fonts';

const SHELL_FILES = [
  '/', '/index.html', '/manifest.json', '/favicon.ico',
  '/pixel-icon-catalog.js?v=60', '/pixel-art-ui.css?v=60', '/design-refinement.css?v=60', '/pixel-icons.js?v=60', '/modern-icons.js?v=60', '/emoji-icons.js?v=60', '/icons/modern-v34.svg', '/rpg-icon-aliases.js?v=60', '/rpg-ui.js?v=60', '/icon-picker.js?v=60', '/pixel-icons.css?v=60', '/arcade-sfx.js?v=60', '/reward-fx.js?v=60', '/interaction-fx.js?v=60', '/interaction-fx.css?v=60',
  '/day-checkpoints.js?v=60', '/day-checkpoints.css?v=60', '/checklists.js?v=60', '/checklists.css?v=60',
  '/app-refinement.js?v=60', '/app-refinement.css?v=60', '/power-budget.js?v=60', '/ui-polish.css?v=60', '/ui-polish.js?v=60', '/task-tools.js?v=60',
  '/wallpapers.js?v=60', '/wallpapers.css?v=60', '/display-prefs.js?v=60', '/display-prefs.css?v=60',
  '/khmer-locale.js?v=60', '/khmer-messages.js?v=60', '/khmer-content.js?v=60', '/khmer-fortune.js?v=60', '/khmer-goals.js?v=60', '/khmer-fonts.css?v=60',
  '/khmer-challenges-a.js?v=60', '/khmer-challenges-b.js?v=60',
  '/khmer-fortune-rotation.js?v=60', '/khmer-artifacts.js?v=60', '/khmer-ui-extra.js?v=60',
  '/khmer-module-extra.js?v=60',
  '/fonts/khmer/Adit1.0.8-Condensed.otf', '/fonts/khmer/Adit1.0.8-SemiCondensed.otf', '/fonts/khmer/Adit1.0.8-Bold.otf',
  '/fonts/khmer/Adit1.0.8-CondensedSlant.otf', '/fonts/khmer/Adit1.0.8-SemiCondensedSlant.otf', '/fonts/khmer/Adit1.0.8-BoldSlant.otf',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/icons/maskable-192.png', '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/cards/CardBacks.jpg'          // the deck has to look like a deck offline too
];

// Firebase must always talk to the live network: auth tokens, Firestore
// listeners and Storage uploads all break if a cache answers for them.
const BYPASS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'www.googleapis.com',
  'apis.google.com',
  'accounts.google.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // a missing optional file must not block install
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Mobile notifications are shown via registration.showNotification(), so the
// tap has to be handled here — focus an open tab if there is one, else open.
// The Done / Snooze buttons only ever appear on a quest reminder, and the page
// owns the state, so the action is forwarded rather than acted on here.
self.addEventListener('notificationclick', e => {
  const act = e.action;
  const data = e.notification.data || {};
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const msg = { type: 'notif-action', action: act || 'open', id: data.id || '', kind: data.kind || '' };
    for (const c of all) c.postMessage(msg);
    // Done and Snooze are meant to be dealt with without leaving whatever you
    // were doing; only a plain tap should pull the window forward.
    if (act === 'snooze' || act === 'done') {
      if (all.length) return;
      // Nothing is running to record it, so open the app and hand the action
      // over once the page has had time to register its message listener.
      if (self.clients.openWindow) {
        const w = await self.clients.openWindow('/');
        if (w) setTimeout(() => { try { w.postMessage(msg); } catch (_) {} }, 3000);
      }
      return;
    }
    for (const c of all) {
      if ('focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('/');
  })());
});

// The reminder that arrives while the app is closed. The sender function ships
// data-only messages precisely so this runs: a background reminder is then
// built here, by the same code and with the same buttons as one fired by the
// page, instead of by FCM's own default renderer.
//
// One thing genuinely cannot follow it here: the custom ringtone. Those are
// rendered and played by the page, and when this fires there is no page. A
// pushed reminder gets the system notification sound and the vibration below.
self.addEventListener('push', e => {
  let d = {};
  try {
    const raw = e.data ? e.data.json() : {};
    // FCM wraps a data-only send in { data: {...} }; a raw web push does not.
    d = raw && raw.data ? raw.data : raw;
  } catch (_) {
    d = { title: 'producto.', body: e.data ? e.data.text() : '' };
  }
  const opts = {
    body: d.body || '',
    tag: d.tag || 'producto',
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-48.png',
    renotify: true,
    requireInteraction: d.persist === '1' || d.persist === true,
    timestamp: Date.now(),
    data: { id: d.id || '', kind: d.kind || '' }
  };
  if (d.vibrate !== '' && d.vibrate !== false) opts.vibrate = [180, 90, 180];
  if (d.id) opts.actions = [{ action: 'done', title: 'Mark done' },
                            { action: 'snooze', title: 'Snooze' }];
  e.waitUntil(self.registration.showNotification(d.title || 'producto.', opts));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                    // never touch writes
  const url = new URL(req.url);
  if (BYPASS.some(h => url.hostname.endsWith(h))) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  // Stream wallpapers directly, including Range requests. Never cache entire videos.
  if(url.origin===self.location.origin && url.pathname.startsWith('/music/lofi/')) return;
  if (url.origin === self.location.origin && url.pathname.startsWith('/wallpapers/') && url.pathname.endsWith('.mp4')) return;

  // The app itself: network first, so a deploy lands immediately.
  // Fall back to cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const pre = await e.preloadResponse;
        if (pre) { putSafe(SHELL, '/index.html', pre.clone()); return pre; }
        const net = await fetch(req);
        putSafe(SHELL, '/index.html', net.clone());
        return net;
      } catch (_) {
        return (await caches.match('/index.html')) || (await caches.match('/')) ||
               new Response('<h1>Offline</h1><p>Open the app once while online.</p>',
                            { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Google Fonts: stale-while-revalidate — instant, refreshes quietly.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then(r => { putSafe(FONTS, req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || new Response('', { status: 504 });
    })());
    return;
  }

  // Our own static files: cache first.
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const net = await fetch(req);
        putSafe(SHELL, req, net.clone());
        return net;
      } catch (_) {
        return new Response('', { status: 504 });
      }
    })());
  }
});

function putSafe(cacheName, req, res) {
  if (!res || res.status !== 200 || (res.type !== 'basic' && res.type !== 'cors')) return;
  caches.open(cacheName).then(c => c.put(req, res)).catch(() => {});
}
