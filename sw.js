// ════════════════════════════════════════════════════
//  보험가온포탈 Service Worker
//  ✅ 배포 시마다 CACHE_VERSION 숫자만 +1 하세요
//     → 아이콘·매니페스트 기존 사용자 기기에서도 강제 갱신됨
// ════════════════════════════════════════════════════
const CACHE_VERSION = 'v5';                        // ← 로고·매니페스트 변경 시 여기만 올리면 됩니다
const CACHE_NAME    = `gaon-portal-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// ── 1. 설치: 새 캐시에 핵심 파일 저장 ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW ${CACHE_VERSION}] 핵심 파일 캐싱 중...`);
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] 캐싱 스킵: ${url}`, err)
          )
        )
      );
    })
  );
  // 설치 즉시 활성화 (이전 SW 대기 없이)
  self.skipWaiting();
});

// ── 2. 활성화: 이전 버전 캐시 전부 삭제 ────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('gaon-portal-') && name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] 구 캐시 삭제: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log(`[SW ${CACHE_VERSION}] 활성화 완료. 모든 클라이언트 즉시 제어.`);
      // ★ 열려 있는 탭을 새 SW로 즉시 전환 후 강제 새로고침 신호 송신
      return self.clients.claim();
    }).then(() => {
      // 활성화된 직후 열린 탭 전체에 UPDATE 메시지 → 앱이 받아서 새로고침 배너 표시
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// ── 3. Fetch 전략: 아이콘·매니페스트는 항상 네트워크 우선 ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // manifest.json 과 /icons/* 는 항상 네트워크 우선 → 실패 시 캐시 폴백
  const isIconOrManifest =
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/icons/');

  if (isIconOrManifest) {
    event.respondWith(
      fetch(event.request)
        .then(networkRes => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 그 외 파일: 캐시 우선, 없으면 네트워크 후 캐시 저장
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(networkRes => {
        if (event.request.method === 'GET' && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkRes;
      });
    })
  );
});

// ── 4. 클라이언트에서 SKIP_WAITING 메시지 수신 시 즉시 활성화 ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});