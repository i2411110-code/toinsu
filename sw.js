const CACHE_NAME = 'gaon-portal-v1';
// 캐싱할 필수 파일 목록 (팀장님의 파일 구조에 맞게 수정 가능)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js'
];

// 1. 서비스 워커 설치 및 파일 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 필수 파일 캐싱 중...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('캐싱 실패 파일 있음:', err));
    })
  );
  self.skipWaiting(); // 대기 없이 바로 활성화
});

// 2. 활성화 및 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] 이전 캐시 삭제 중...', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. ★가장 중요: 네트워크 요청 가로채기 (이게 있어야 설치 배너가 뜹니다)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 캐시된 파일이 있으면 캐시에서 반환, 없으면 네트워크에서 가져옴
      return cachedResponse || fetch(event.request);
    })
  );
});