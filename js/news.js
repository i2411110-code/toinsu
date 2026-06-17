/**
 * news.js - 보험가온포탈 뉴스 위젯
 * 대시보드 하단에 삽입되는 뉴스 / 환율 / 시장지표 모듈
 *
 * 사용법:
 *   <script src="/js/news.js"></script>
 *   <div id="dashboard-news-widget"></div>
 *   <script>NewsWidget.init('dashboard-news-widget');</script>
 */

const NewsWidget = (() => {
  /* ------------------------------------------------------------------ */
  /*  상수                                                                */
  /* ------------------------------------------------------------------ */
  const CATEGORIES = ['전체', '보험', '금융', '경제', '금감원', '실손보험', '손해보험', '생명보험'];

  const EXCHANGE_LINKS = {
    USD: 'https://m.stock.naver.com/marketindex/exchange/FX_USDKRW',
    JPY: 'https://m.stock.naver.com/marketindex/exchange/FX_JPYKRW',
    EUR: 'https://m.stock.naver.com/marketindex/exchange/FX_EURKRW',
    CNY: 'https://m.stock.naver.com/marketindex/exchange/FX_CNYKRW',
  };

  const MARKET_LINKS = {
    '코스피':          'https://m.stock.naver.com/domestic/index/KOSPI/total',
    '코스닥':          'https://m.stock.naver.com/domestic/index/KOSDAQ/total',
    '국내 금 (원/g)': 'https://m.stock.naver.com/marketindex/metals/M04020000',
    '은 (USD/OZS)':   'https://m.stock.naver.com/marketindex/metals/SIcv1',
  };

  /* ------------------------------------------------------------------ */
  /*  유틸                                                                */
  /* ------------------------------------------------------------------ */
  const clean = (str = '') =>
    str
      .replace(/<b>/g, '').replace(/<\/b>/g, '')
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  const fmtDate = (str) => {
    const d = new Date(str);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const splitNum = (val, label) => {
    const isGold = label === '국내 금 (원/g)';
    const digits = isGold ? 0 : 2;
    const s = val.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const [int, dec] = s.split('.');
    return { int, dec };
  };

  const dirColor  = (d) => d === 'up' ? '#E11D48' : d === 'down' ? '#2563EB' : '#8B95A1';
  const dirArrow  = (d) => d === 'up' ? '▲ ' : d === 'down' ? '▼ ' : '';
  const weatherEmoji = (desc = '') =>
    desc.includes('맑') ? '☀️' : desc.includes('구름') ? '☁️' :
    desc.includes('비') ? '🌧️' : desc.includes('눈') ? '❄️' : '☀️';

  /* ------------------------------------------------------------------ */
  /*  API 호출 (프록시 엔드포인트는 기존 Next.js 경로 재사용)            */
  /* ------------------------------------------------------------------ */
  const api = {
    news: async (query, display = 10) => {
      try {
        const r = await fetch(`/api/naver-news?query=${encodeURIComponent(query)}&display=${display}`, { cache: 'no-store' });
        const j = await r.json();
        return j.items || [];
      } catch { return []; }
    },
    exchange: async () => {
      try {
        const r = await fetch('/api/naver-exchange', { cache: 'no-store' });
        const j = await r.json();
        return { date: j.date || '', items: j.items || [] };
      } catch { return { date: '', items: [] }; }
    },
    market: async () => {
      try {
        const r = await fetch('/api/market', { cache: 'no-store' });
        const j = await r.json();
        return j.items || [];
      } catch { return []; }
    },
    weather: async (region) => {
      try {
        const r = await fetch(`/api/weather?region=${region}`, { cache: 'no-store' });
        return await r.json();
      } catch { return { error: true }; }
    },
    instagram: async () => {
      try {
        const r = await fetch('/api/instagram', { cache: 'no-store' });
        const j = await r.json();
        return j.data?.[0] || null;
      } catch { return null; }
    },
  };

  /* ------------------------------------------------------------------ */
  /*  렌더 헬퍼                                                           */
  /* ------------------------------------------------------------------ */
  const spinner = `<span class="nw-spinner"></span>`;
  const empty   = (msg) => `<div class="nw-empty">${msg}</div>`;

  const renderNewsCard = (item, badge = '주요뉴스') => `
    <div class="nw-card nw-card--main">
      <div class="nw-card-meta">
        <span class="nw-badge">${badge}</span>
        <span class="nw-date">${fmtDate(item.pubDate)}</span>
      </div>
      <h3 class="nw-card-title">${clean(item.title)}</h3>
      <p  class="nw-card-desc">${clean(item.description)}</p>
      <a class="nw-card-link" href="${item.link || item.originallink}" target="_blank" rel="noopener noreferrer">기사 원문 보기</a>
    </div>`;

  const renderNewsCardSm = (item) => `
    <div class="nw-card nw-card--sm">
      <div class="nw-card-sm-inner">
        <p class="nw-date">${fmtDate(item.pubDate)}</p>
        <h3 class="nw-card-title nw-card-title--sm">${clean(item.title)}</h3>
        <p class="nw-card-desc">${clean(item.description)}</p>
      </div>
      <a class="nw-card-link" href="${item.link || item.originallink}" target="_blank" rel="noopener noreferrer">자세히 보기</a>
    </div>`;

  const renderFxCard = (item) => {
    const { int, dec } = splitNum(item.value, item.label);
    const color = dirColor(item.direction);
    return `
      <a class="nw-fin-card" href="${EXCHANGE_LINKS[item.label] || '#'}" target="_blank" rel="noopener noreferrer">
        <p class="nw-fin-label">${item.label}/KRW</p>
        <p class="nw-fin-value">
          <span>${int}</span>${dec ? `<span class="nw-fin-dec">.${dec}</span>` : ''}
        </p>
        <p class="nw-fin-change" style="color:${color}">
          ${dirArrow(item.direction)}${Math.abs(item.change).toFixed(2)}
        </p>
      </a>`;
  };

  const renderMktCard = (item) => {
    const { int, dec } = splitNum(item.value, item.label);
    const isGold = item.label === '국내 금 (원/g)';
    const color = dirColor(item.direction);
    const changeStr = Math.abs(item.change).toLocaleString('ko-KR', {
      minimumFractionDigits: isGold ? 0 : 2,
      maximumFractionDigits: isGold ? 0 : 2,
    });
    return `
      <a class="nw-fin-card" href="${MARKET_LINKS[item.label] || '#'}" target="_blank" rel="noopener noreferrer">
        <p class="nw-fin-label">${item.label}</p>
        <p class="nw-fin-value">
          <span>${int}</span>${dec ? `<span class="nw-fin-dec">.${dec}</span>` : ''}
        </p>
        <p class="nw-fin-change" style="color:${color}">
          ${dirArrow(item.direction)}${changeStr}
        </p>
      </a>`;
  };

  /* ------------------------------------------------------------------ */
  /*  CSS 인라인 주입 (한 번만)                                           */
  /* ------------------------------------------------------------------ */
  const injectStyles = () => {
    if (document.getElementById('nw-styles')) return;
    const s = document.createElement('style');
    s.id = 'nw-styles';
    s.textContent = `
/* ===== NewsWidget 스타일 ===== */
#dashboard-news-widget { font-family: inherit; }

/* 섹션 래퍼 */
.nw-section {
  background: white;
  border-radius: 20px;
  padding: 22px 20px;
  border: 1px solid #F2F4F6;
  margin-bottom: 16px;
}

/* 섹션 헤더 */
.nw-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 14px;
}
.nw-section-title {
  font-size: 17px;
  font-weight: 800;
  color: #191F28;
  margin: 0;
}
.nw-section-sub {
  font-size: 12px;
  color: #8B95A1;
  font-weight: 700;
  margin-left: 8px;
}

/* 티커 배너 */
.nw-ticker-wrap {
  background: #1f2937;
  border-radius: 14px;
  overflow: hidden;
  height: 44px;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.nw-ticker-inner {
  display: flex;
  width: max-content;
  white-space: nowrap;
  animation: nwTickerMove 50s linear infinite;
  padding-left: 5%;
}
.nw-ticker-wrap:hover .nw-ticker-inner { animation-play-state: paused; }
.nw-ticker-label-breaking { font-size: 13px; font-weight: 900; color: #F87171; margin-right: 10px; }
.nw-ticker-label-main     { font-size: 13px; font-weight: 900; color: #93C5FD; margin-right: 10px; }
.nw-ticker-item { font-size: 13px; color: white; margin-right: 32px; text-decoration: none; }
.nw-ticker-item:hover { text-decoration: underline; }

@keyframes nwTickerMove {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* 검색 & 카테고리 */
.nw-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.nw-search-box:focus-within {
  border-color: #6B7280;
  box-shadow: 0 0 0 3px rgba(107,114,128,0.12);
}
.nw-search-icon { color: #9CA3AF; font-size: 16px; flex-shrink: 0; }
.nw-search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #191F28;
}

.nw-cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.nw-cats::-webkit-scrollbar { display: none; }
.nw-cat-btn {
  flex-shrink: 0;
  height: 34px;
  padding: 0 14px;
  border-radius: 20px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
  color: #6B7280;
}
.nw-cat-btn:hover  { background: white; border-color: #E5E7EB; }
.nw-cat-btn.active { background: white; border-color: #E5E7EB; color: #191F28; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

/* 새로고침 버튼 */
.nw-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  background: white;
  border: 1px solid #E5E7EB;
  font-size: 12px;
  font-weight: 700;
  color: #6B7280;
  cursor: pointer;
  transition: background 0.15s;
}
.nw-refresh-btn:hover { background: #F9FAFB; }
.nw-refresh-btn .nw-spin { display: inline-block; }
.nw-refresh-btn .nw-spin.spinning { animation: nwSpin 0.8s linear infinite; }
@keyframes nwSpin { to { transform: rotate(360deg); } }

/* 뉴스 그리드 */
.nw-news-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 900px) {
  .nw-news-layout { grid-template-columns: 1fr; }
}

/* 모닝뉴스(인스타) */
.nw-morning-img {
  display: block;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #F2F4F6;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}
.nw-morning-img:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.12); transform: translateY(-2px); }
.nw-morning-img img  { width: 100%; display: block; object-fit: cover; }

/* 뉴스 카드 */
.nw-cards-wrap { display: flex; flex-direction: column; gap: 12px; }
.nw-cards-sm   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .nw-cards-sm { grid-template-columns: 1fr; } }

.nw-card {
  background: white;
  border: 1px solid #F2F4F6;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
}
.nw-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.10); transform: translateY(-2px); }
.nw-card--main { min-height: 200px; }
.nw-card--sm   { min-height: 180px; }

.nw-card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.nw-badge {
  height: 24px; padding: 0 10px;
  border-radius: 999px;
  background: #EFF6FF; color: #2563EB;
  font-size: 11px; font-weight: 900;
  display: inline-flex; align-items: center;
}
.nw-date { font-size: 11px; color: #9CA3AF; font-weight: 700; }

.nw-card-title {
  font-size: 16px; font-weight: 900; color: #191F28;
  line-height: 1.45; word-break: keep-all;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin: 0 0 8px;
}
.nw-card-title--sm { font-size: 14px; -webkit-line-clamp: 2; margin-bottom: 6px; }
.nw-card-desc {
  font-size: 13px; color: #6B7280; line-height: 1.6; word-break: keep-all;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  margin: 0 0 auto;
}
.nw-card-sm-inner { flex: 1; }
.nw-card-link {
  display: inline-flex; align-items: center;
  margin-top: 12px; padding: 6px 10px;
  border-radius: 10px; align-self: flex-start;
  font-size: 13px; font-weight: 700; color: #2563EB;
  text-decoration: none;
  transition: background 0.15s;
}
.nw-card-link:hover { background: #EFF6FF; color: #1D4ED8; }

/* 금융 카드 */
.nw-fin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 700px) { .nw-fin-grid { grid-template-columns: repeat(2, 1fr); } }

.nw-fin-card {
  display: block;
  background: #F9FAFB;
  border: 1px solid #F2F4F6;
  border-radius: 20px;
  padding: 18px;
  text-decoration: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s, transform 0.2s;
}
.nw-fin-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.10); transform: translateY(-2px); }
.nw-fin-label { font-size: 11px; font-weight: 900; color: #9CA3AF; margin: 0 0 8px; }
.nw-fin-value { font-size: 22px; font-weight: 900; color: #191F28; margin: 0 0 8px; letter-spacing: -0.5px; }
.nw-fin-dec   { color: #6B7280; }
.nw-fin-change { font-size: 14px; font-weight: 700; margin: 0; }

/* 날씨 티커 (모바일) */
.nw-weather-ticker {
  background: white;
  border: 1px solid #F2F4F6;
  border-radius: 14px;
  overflow: hidden;
  height: 44px;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.nw-weather-inner {
  display: flex;
  width: max-content;
  white-space: nowrap;
  animation: nwTickerMove 28s linear infinite;
}
.nw-weather-ticker:hover .nw-weather-inner { animation-play-state: paused; }
.nw-weather-item {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0 20px;
  font-size: 13px; font-weight: 700; color: #374151;
}
.nw-weather-region { color: #6B7280; }
.nw-weather-temp   { font-weight: 900; color: #191F28; }

/* 로딩 / 빈 상태 */
.nw-empty  { padding: 32px; text-align: center; font-size: 13px; color: #9CA3AF; }
.nw-spinner {
  display: inline-block;
  width: 28px; height: 28px;
  border: 3px solid #E5E7EB;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: nwSpin 0.7s linear infinite;
  vertical-align: middle;
}

/* 하단 링크바 */
.nw-footer-bar {
  background: white;
  border-top: 1px solid #F2F4F6;
  border-radius: 0 0 20px 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
}
.nw-footer-link {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px;
  text-decoration: none; color: #374151;
  font-size: 12px; font-weight: 700;
  transition: background 0.15s;
}
.nw-footer-link:hover { background: #F9FAFB; }
    `;
    document.head.appendChild(s);
  };

  /* ------------------------------------------------------------------ */
  /*  메인 init                                                           */
  /* ------------------------------------------------------------------ */
  const init = async (containerId = 'dashboard-news-widget') => {
    injectStyles();

    const root = document.getElementById(containerId);
    if (!root) { console.warn(`[NewsWidget] #${containerId} not found`); return; }

    /* 초기 스켈레톤 */
    root.innerHTML = `
      <div class="nw-section">
        <div class="nw-section-header">
          <div>
            <span class="nw-section-title">오늘의 뉴스</span>
            <span class="nw-section-sub">보험 · 금융 · 경제 · 모닝뉴스</span>
          </div>
        </div>
        <div id="nw-ticker" class="nw-ticker-wrap">
          <div class="nw-ticker-inner">
            <span class="nw-ticker-label-main">[주요뉴스]</span>
            <span style="color:white;font-size:13px;">뉴스를 불러오는 중...</span>
          </div>
        </div>
        <div id="nw-weather" class="nw-weather-ticker">
          <div class="nw-weather-inner">
            <span class="nw-weather-item"><span class="nw-weather-region">날씨 로딩중...</span></span>
          </div>
        </div>
        <div id="nw-search-area"></div>
        <div id="nw-news-area" class="nw-section">
          <div class="nw-empty">${spinner} 뉴스를 불러오는 중입니다.</div>
        </div>
        <div id="nw-fx-area" class="nw-section"></div>
        <div id="nw-mkt-area" class="nw-section"></div>
      </div>`;

    /* 내부 렌더 함수들 */
    let currentCat = '전체';

    const renderSearch = () => {
      document.getElementById('nw-search-area').innerHTML = `
        <div class="nw-search-box">
          <span class="nw-search-icon">🔍</span>
          <input id="nw-search-input" class="nw-search-input" placeholder="뉴스 검색" value="${currentCat === '전체' ? '' : currentCat}">
        </div>
        <div class="nw-cats">
          ${CATEGORIES.map(c => `<button class="nw-cat-btn${c === currentCat ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>`;

      document.getElementById('nw-search-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const v = e.target.value.trim() || '보험';
          currentCat = v;
          loadNews(v);
        }
      });
      document.querySelectorAll('.nw-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentCat = btn.dataset.cat;
          document.getElementById('nw-search-input').value = currentCat === '전체' ? '' : currentCat;
          loadNews(currentCat);
          document.querySelectorAll('.nw-cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    };

    const renderNews = (items, insta) => {
      const area = document.getElementById('nw-news-area');
      if (!items.length) { area.innerHTML = empty('표시할 뉴스가 없습니다.'); return; }

      const top  = items[0];
      const rest = items.slice(2, 6);
      const morningHtml = insta
        ? `<a class="nw-morning-img" href="${insta.permalink}" target="_blank" rel="noopener noreferrer">
             <img src="${insta.media_url}" alt="모닝뉴스" loading="lazy">
           </a>`
        : empty('모닝뉴스 이미지를 불러오지 못했습니다.');

      area.innerHTML = `
        <div class="nw-section-header">
          <span class="nw-section-title">최신 뉴스</span>
          <button class="nw-refresh-btn" id="nw-news-refresh-btn">
            <span class="nw-spin" id="nw-news-spin">↻</span> 새로고침
          </button>
        </div>
        <div class="nw-news-layout">
          <div>
            <p class="nw-section-title" style="font-size:15px;margin-bottom:12px;">모닝뉴스</p>
            ${morningHtml}
          </div>
          <div class="nw-cards-wrap">
            ${renderNewsCard(top)}
            <div class="nw-cards-sm">
              ${rest.map(renderNewsCardSm).join('')}
            </div>
          </div>
        </div>`;

      document.getElementById('nw-news-refresh-btn').addEventListener('click', () => loadNews(currentCat));
    };

    const renderFx = ({ items }) => {
      const area = document.getElementById('nw-fx-area');
      area.innerHTML = `
        <div class="nw-section-header">
          <div>
            <span class="nw-section-title">오늘의 환율</span>
            <span class="nw-section-sub">네이버 증권 기준</span>
          </div>
          <button class="nw-refresh-btn" id="nw-fx-refresh">
            <span class="nw-spin" id="nw-fx-spin">↻</span> 새로고침
          </button>
        </div>
        <div class="nw-fin-grid">
          ${items.length ? items.map(renderFxCard).join('') : `<div class="nw-empty" style="grid-column:1/-1">환율 정보를 불러오지 못했습니다.</div>`}
        </div>`;
      document.getElementById('nw-fx-refresh').addEventListener('click', loadFx);
    };

    const renderMkt = (items) => {
      const area = document.getElementById('nw-mkt-area');
      area.innerHTML = `
        <div class="nw-section-header">
          <div>
            <span class="nw-section-title">오늘의 시장지표</span>
            <span class="nw-section-sub">네이버 증권 기준</span>
          </div>
          <button class="nw-refresh-btn" id="nw-mkt-refresh">
            <span class="nw-spin" id="nw-mkt-spin">↻</span> 새로고침
          </button>
        </div>
        <div class="nw-fin-grid">
          ${items.length ? items.map(renderMktCard).join('') : `<div class="nw-empty" style="grid-column:1/-1">시장지표를 불러오지 못했습니다.</div>`}
        </div>`;
      document.getElementById('nw-mkt-refresh').addEventListener('click', loadMkt);
    };

    const renderTicker = (breaking, headline) => {
      const el = document.getElementById('nw-ticker');
      const breakHtml = breaking.length
        ? `<span class="nw-ticker-label-breaking">[속보]</span>`
          + breaking.map(i => `<a class="nw-ticker-item" href="${i.link || i.originallink}" target="_blank" rel="noopener noreferrer">${clean(i.title)}</a>`).join('')
        : '';
      const mainHtml = `<span class="nw-ticker-label-main">[주요뉴스]</span>`
        + headline.map(i => `<a class="nw-ticker-item" href="${i.link || i.originallink}" target="_blank" rel="noopener noreferrer">${clean(i.title)}</a>`).join('');
      const inner = breakHtml + mainHtml;
      el.innerHTML = `<div class="nw-ticker-inner">${inner}${inner}</div>`;
    };

    const renderWeather = (list) => {
      const el = document.getElementById('nw-weather');
      if (!list.length) { el.style.display = 'none'; return; }
      const items = list.map(w =>
        `<div class="nw-weather-item">
           <span class="nw-weather-region">${w.region}</span>
           <span>${weatherEmoji(w.description || '')}</span>
           <span class="nw-weather-temp">${w.temp}°</span>
         </div>`
      ).join('');
      el.innerHTML = `<div class="nw-weather-inner">${items}${items}</div>`;
    };

    /* 로드 함수들 */
    const loadNews = async (cat = '전체') => {
      const area = document.getElementById('nw-news-area');
      area.innerHTML = `<div class="nw-empty">${spinner}</div>`;
      const [items, insta] = await Promise.all([api.news(cat), api.instagram()]);
      renderNews(items, insta);
      renderSearch(); // 카테고리 active 상태 갱신
    };

    const loadFx = async () => {
      const spin = document.getElementById('nw-fx-spin');
      if (spin) spin.classList.add('spinning');
      const data = await api.exchange();
      renderFx(data);
    };

    const loadMkt = async () => {
      const spin = document.getElementById('nw-mkt-spin');
      if (spin) spin.classList.add('spinning');
      const items = await api.market();
      renderMkt(items);
    };

    const loadTicker = async () => {
      const [breaking, headline] = await Promise.all([
        api.news('속보', 5),
        api.news('실시간 주요뉴스', 5),
      ]);
      renderTicker(breaking, headline);
    };

    const loadWeather = async () => {
      const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '제주'];
      const results = await Promise.all(regions.map(r => api.weather(r)));
      renderWeather(results.filter(r => !r.error));
    };

    /* 초기 렌더 */
    renderSearch();

    /* 병렬 로드 */
    await Promise.all([
      loadNews('전체'),
      loadFx(),
      loadMkt(),
      loadTicker(),
      loadWeather(),
    ]);
  };

  return { init };
})();