/* 가온 원 — 새 버전 알림 (js/update-check.js)
 * 배포할 때: ① 이 파일의 APP_VERSION ② 루트의 version.json 의 "version" 을 같은 값으로 올리세요.
 * version.json 의 "force": true 이면 닫을 수 없는 필수 업데이트 화면이 뜹니다.
 */
(function () {
    'use strict';

    const APP_VERSION = '2026-11-27-2';
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5분마다 확인

    // "업데이트" 버튼을 누르면 이 파일들을 새로 받아 캐시를 교체한 뒤 새로고침합니다.
    const REFRESH_FILES = [
        './index.html',
        './manifest.json',
        './css/style.css',
        './js/app.js',
        './js/name-input-modal.js',
        './js/news.js',
        './js/claim-coords.js',
        './js/claim.js',
        './js/claim-dashboard.js',
        './js/report.js',
        './js/report-excel.js',
        './js/workmenu.js',
        './js/update-check.js'
    ];

    let timer = null;
    let shown = false;

    async function fetchLatest() {
        const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('version.json ' + res.status);
        return res.json();
    }

    async function applyUpdate(btn) {
        if (btn) { btn.disabled = true; btn.textContent = '업데이트 중...'; }
        try {
            await Promise.all(REFRESH_FILES.map(function (u) {
                return fetch(u, { cache: 'reload' }).catch(function () {});
            }));
        } finally {
            location.reload();
        }
    }

    function showBanner(info) {
        if (shown) return;
        shown = true;

        const force = info.force === true;
        const notes = info.notes ? String(info.notes) : '';

        const wrap = document.createElement('div');
        wrap.id = 'app-update-banner';
        if (force) {
            wrap.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:20px;';
        } else {
            wrap.style.cssText = 'position:fixed;top:12px;left:12px;right:12px;z-index:6000;display:flex;justify-content:center;pointer-events:none;';
        }

        const box = document.createElement('div');
        box.style.cssText = 'pointer-events:auto;background:#fff;border:1px solid #DBEAFE;border-radius:16px;'
            + 'box-shadow:0 8px 30px rgba(37,99,235,.2);padding:14px 16px;display:flex;align-items:center;gap:12px;'
            + 'max-width:420px;width:100%;font-family:"Noto Sans KR",sans-serif;box-sizing:border-box;'
            + (force ? 'flex-direction:column;text-align:center;padding:24px 20px;' : '');

        const text = document.createElement('div');
        text.style.cssText = 'flex:1;min-width:0;';
        const title = document.createElement('div');
        title.style.cssText = 'font-size:14px;font-weight:800;color:#191F28;';
        title.textContent = force ? '필수 업데이트가 있어요' : '새 버전이 나왔어요';
        text.appendChild(title);
        if (notes) {
            const sub = document.createElement('div');
            sub.style.cssText = 'font-size:12px;color:#64748B;margin-top:3px;line-height:1.5;';
            sub.textContent = notes;
            text.appendChild(sub);
        }

        const btn = document.createElement('button');
        btn.textContent = '업데이트';
        btn.style.cssText = 'border:none;background:#2563EB;color:#fff;font-size:13px;font-weight:700;'
            + 'padding:9px 16px;border-radius:10px;cursor:pointer;white-space:nowrap;font-family:inherit;'
            + (force ? 'width:100%;padding:12px;' : '');
        btn.onclick = function () { applyUpdate(btn); };

        box.appendChild(text);
        box.appendChild(btn);

        if (!force) {
            const close = document.createElement('button');
            close.innerHTML = '&times;';
            close.setAttribute('aria-label', '닫기');
            close.style.cssText = 'border:none;background:none;color:#94A3B8;font-size:22px;line-height:1;cursor:pointer;padding:0 2px;';
            close.onclick = function () { wrap.remove(); };
            box.appendChild(close);
        }

        wrap.appendChild(box);
        document.body.appendChild(wrap);
    }

    async function check() {
        try {
            const info = await fetchLatest();
            if (info && info.version && info.version !== APP_VERSION) showBanner(info);
        } catch (e) {
            // 오프라인이거나 version.json이 없으면 조용히 넘어갑니다.
        }
    }

    window.startUpdateWatch = function () {
        if (timer) return;
        check();
        timer = setInterval(check, CHECK_INTERVAL);
    };
    window.checkAppUpdate = check;

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) check();
    });
    window.addEventListener('load', window.startUpdateWatch);
})();