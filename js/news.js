/**
 * news.js - 보험가온포탈 뉴스 허브 연동 전산망
 * 독립형 단독 페이지(news.html)에 실시간으로 데이터셋을 매핑하는 모듈
 *
 * 사용법:
 * <script src="js/news.js"></script>
 * <script>NewsWidget.init();</script>
 */

const NewsWidget = (() => {
  /* ------------------------------------------------------------------ */
  /* 상수 및 웹링크 정의                                                  */
  /* ------------------------------------------------------------------ */
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
  /* 전산 텍스트 유틸리티                                                 */
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

  /* 실시간 오늘 날짜 포맷 (예: 2026년 06월 18일 (목)) */
  const getTodayLabel = () => {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const day = days[now.getDay()];
    return `${y}년 ${m}월 ${d}일 (${day})`;
  };

  const weatherEmoji = (desc = '') =>
    desc.includes('맑') || desc.includes('태양') ? '☀️' :
    desc.includes('구름') || desc.includes('흐림') ? '☁️' :
    desc.includes('비') || desc.includes('소나기') ? '🌧️' :
    desc.includes('눈') ? '❄️' : '☀️';

  //* ------------------------------------------------------------------ */
  /* 네이버 증권 및 기상청 API 실시간 호출 연동                           */
  /* ------------------------------------------------------------------ */
  const api = {
    news: async (query, display = 12) => {
      try {
        const r = await fetch(`/api/naver-news?query=${encodeURIComponent(query)}&display=${display}`, { cache: 'no-store' });
        const j = await r.json();
        return j.items || [];
      } catch { return []; }
    },
    // 기존 exchange와 market 함수를 통합하여 하나의 엔드포인트에서 모든 지표를 가져옵니다.
    marketData: async () => {
      try {
        const r = await fetch('/api/naver-exchange', { cache: 'no-store' });
        const j = await r.json();
        return j.items || [];
      } catch { return []; }
    },
    weather: async (region) => {
      try {
        const r = await fetch(`/api/weather?region=${region}`, { cache: 'no-store' });
        return await r.json();
      } catch { return { error: true, region, temp: 24, description: '맑음' }; }
    }
  };

  /* ------------------------------------------------------------------ */
  /* news.html 전용 타겟 렌더링 파이프라인                                */
  /* ------------------------------------------------------------------ */

  // 1. 상단 스크롤 띠 배너 날씨 연동
  const renderWeatherStrip = (list) => {
    const el = document.querySelector('.weather-strip');
    if (!el || !list.length) return;
    el.innerHTML = list.map(w => `
      <div class="weather-pill">
        ${w.region} ${weatherEmoji(w.description)} <span style="font-weight:700;margin-left:2px;">${w.temp || 24}°</span>
      </div>
    `).join('');
  };

  // 2. 우측 최신 속보 타일형 피드 연동
  const renderNewsFeed = (items) => {
    const wrap = document.getElementById('news-live-feed-target-container');
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div style="padding:40px;text-align:center;color:#94A3B8;font-size:14px;">실시간 속보 데이터를 불러올 수 없습니다.</div>`;
      return;
    }

    const feedItems = items.slice(0, 5);
    wrap.innerHTML = feedItems.map((item, idx) => `
      <div class="feed-card">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">
          <span class="feed-badge ${idx === 0 ? 'alert-type' : ''}">${idx === 0 ? '🔴 주요속보' : '실시간뉴스'}</span>
          <span style="font-size:11px;color:#94A3B8;font-weight:500;">${fmtDate(item.pubDate)}</span>
        </div>
        <h3 class="feed-title">${clean(item.title)}</h3>
        <p class="feed-desc">${clean(item.description)}</p>
        <a href="${item.link || item.originallink}" target="_blank" rel="noopener noreferrer" class="feed-link">
          기사 원문 보기 <i class="bi bi-arrow-right-short"></i>
        </a>
      </div>`).join('');
  };

  // 3. 좌측 MORNING NEWS 지면 데이터 매핑
  const renderMorningPaper = (topItem, fxList, mktList) => {
    /* ── 실시간 날짜 업데이트 ── */
    const dateEl = document.getElementById('paper-live-date');
    if (dateEl) dateEl.textContent = getTodayLabel();

    const paperBodyEl  = document.getElementById('paper-main-headline-body');
    const paperIndexEl = document.getElementById('paper-mini-index-box');

    /* ── 메인 헤드라인 + 본문 전체 + 원문 버튼 ── */
    if (paperBodyEl && topItem) {
      const link = topItem.link || topItem.originallink || '#';
      const desc = clean(topItem.description);

      paperBodyEl.innerHTML = `
        <strong>${clean(topItem.title)}</strong>
        <span class="paper-meta">
          <i class="bi bi-clock" style="font-size:10px;"></i>
          ${fmtDate(topItem.pubDate)} &nbsp;·&nbsp; NAVER NEWS HUB
        </span>
        <p class="paper-content">${desc}</p>
        <a href="${link}" target="_blank" rel="noopener noreferrer" class="paper-read-link">
          <i class="bi bi-newspaper"></i> 기사 원문 전체 보기
          <i class="bi bi-arrow-right-short" style="font-size:16px;"></i>
        </a>
      `;
    }

    /* ── 신문 상단 미니 경제 지표 (클릭 → 네이버 증권) ── */
    if (paperIndexEl) {
      const usd   = fxList.find(i => i.label === 'USD')    || { value: 1514.60, change: 5.20,  direction: 'down' };
      const kospi = mktList.find(i => i.label === '코스피') || { value: 8545.98, change: 422.36, direction: 'up'  };
      const kosdaq= mktList.find(i => i.label === '코스닥') || { value: 1034.03, change: 14.98,  direction: 'up'  };

      const idxItem = (href, label, val, dir, chg, borderStyle = '') => `
        <a class="p-idx-link" href="${href}" target="_blank" rel="noopener noreferrer" style="${borderStyle}">
          <div class="p-idx-item">
            <div class="t">${label}</div>
            <div class="v">${val}</div>
            <div class="c ${dir}"><i class="bi bi-caret-${dir}-fill"></i> ${chg}</div>
          </div>
        </a>`;

      paperIndexEl.innerHTML =
        idxItem(EXCHANGE_LINKS.USD,        'USD / KRW',
                Number(usd.value).toFixed(2),
                usd.direction, Math.abs(usd.change).toFixed(2)) +
        idxItem(MARKET_LINKS['코스피'],     'KOSPI',
                Number(kospi.value).toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
                kospi.direction, Math.abs(kospi.change).toFixed(2),
                'border-left:1px solid #334155; border-right:1px solid #334155;') +
        idxItem(MARKET_LINKS['코스닥'],     'KOSDAQ',
                Number(kosdaq.value).toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
                kosdaq.direction, Math.abs(kosdaq.change).toFixed(2));
    }
  };

  // 4. 하단 환율 및 종합 지표 종합판 매핑
  const renderBottomIndicators = (fxList, mktList) => {
    const el = document.getElementById('news-indicator-grid-inner') || document.querySelector('.indicator-grid');
    if (!el) return;

    const usd   = fxList.find(i => i.label === 'USD')            || { value: 1512.40, change: 1.40,  direction: 'up' };
    const jpy   = fxList.find(i => i.label === 'JPY')            || { value: 943.63,  change: 1.78,  direction: 'up' };
    const kospi = mktList.find(i => i.label === '코스피')         || { value: 2750.00, change: 12.00, direction: 'up' };
    const gold  = mktList.find(i => i.label === '국내 금 (원/g)') || { value: 105400,  change: 80,    direction: 'up' };

    const card = (link, lbl, price, dir, change) => `
      <a class="ind-card-link" href="${link}" target="_blank" rel="noopener noreferrer">
        <div class="ind-card">
          <div class="lbl">${lbl}</div>
          <div class="price">${price}</div>
          <div class="state ${dir}"><i class="bi bi-caret-${dir}-fill"></i> ${change} (${dir === 'up' ? '▲ 상승' : '▼ 하락'})</div>
          <div style="font-size:10px;color:#B0B8C1;margin-top:6px;display:flex;align-items:center;gap:3px;">
            <i class="bi bi-box-arrow-up-right"></i> 네이버 증권 바로가기
          </div>
        </div>
      </a>`;

    el.innerHTML =
      card(EXCHANGE_LINKS.USD,
           'USD / KRW (원/달러 환율)',
           Number(usd.value).toFixed(2),
           usd.direction, Math.abs(usd.change).toFixed(2)) +
      card(EXCHANGE_LINKS.JPY,
           'JPY / KRW (100엔 환율)',
           Number(jpy.value).toFixed(2),
           jpy.direction, Math.abs(jpy.change).toFixed(2)) +
      card(MARKET_LINKS['코스피'],
           'KOSPI 종합지수',
           Number(kospi.value).toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
           kospi.direction, Math.abs(kospi.change).toFixed(2)) +
      card(MARKET_LINKS['국내 금 (원/g)'],
           '국내 금시세 (원/g)',
           Number(gold.value).toLocaleString('ko-KR', { maximumFractionDigits: 0 }),
           gold.direction, Math.abs(gold.change).toLocaleString('ko-KR', { maximumFractionDigits: 0 }));
  };

  /* ------------------------------------------------------------------ */
  /* 종합 오케스트레이션 로더                                              */
  /* ------------------------------------------------------------------ */
  const loadAllData = async (keyword = '전체 뉴스') => {
    let apiQuery = '보험 금융 경제';
    if (keyword !== '전체 뉴스' && keyword !== '전체') {
      apiQuery = keyword;
    }

    const [newsItems, mktItems] = await Promise.all([
      api.news(apiQuery, 10),
      api.marketData() // 통합된 API 하나만 호출
    ]);

    if (newsItems.length > 0) {
      renderMorningPaper(newsItems[0], mktItems, mktItems); // fxList와 mktList를 동일한 데이터로 넘김
      renderNewsFeed(newsItems);
    } else {
      const dateEl = document.getElementById('paper-live-date');
      if (dateEl) dateEl.textContent = getTodayLabel();
    }

    renderBottomIndicators(mktItems, mktItems);
  };

  const init = async () => {
    /* ── 1. 날짜 즉시 반영 (API 응답 전에도 표시) ── */
    const dateEl = document.getElementById('paper-live-date');
    if (dateEl) dateEl.textContent = getTodayLabel();

    /* ── 2. 날씨 데이터 우선 구동 ── */
    const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '제주'];
    Promise.all(regions.map(r => api.weather(r))).then(results => {
      renderWeatherStrip(results.filter(r => !r.error));
    });

    /* ── 3. 최신속보 새로고침 버튼 ── */
    const feedRefreshBtn = document.getElementById('news-feed-manual-refresh-btn');
    if (feedRefreshBtn) {
      feedRefreshBtn.addEventListener('click', async () => {
        const icon = feedRefreshBtn.querySelector('i');
        if (icon) icon.classList.add('spin');
        feedRefreshBtn.disabled = true;
        const keyword = document.querySelector('.tag-btn.active')?.textContent?.trim() || '전체 뉴스';
        await loadAllData(keyword);
        if (icon) icon.classList.remove('spin');
        feedRefreshBtn.disabled = false;
      });
    }

    /* ── 4. 카테고리 태그 탭 클릭 & 검색어 인풋 바인딩 ── */
    const tagButtons = document.querySelectorAll('.tag-wrap .tag-btn');
    const searchBar  = document.querySelector('.search-bar');

    tagButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tagButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (searchBar) searchBar.value = '';
        loadAllData(btn.textContent.trim());
      });
    });

    if (searchBar) {
      searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = searchBar.value.trim();
          if (val.length > 0) loadAllData(val);
        }
      });
    }

    /* ── 5. 경제지표 새로고침 버튼 로직 보완 ── */
const indRefreshBtn = document.getElementById('indicator-refresh-btn');
if (indRefreshBtn) {
    indRefreshBtn.addEventListener('click', async () => {
        const icon = indRefreshBtn.querySelector('i');
        if (icon) icon.style.animation = 'ind-spin 0.6s linear infinite';
        indRefreshBtn.disabled = true;

        try {
            const mktItems = await api.marketData();
            renderBottomIndicators(mktItems, mktItems);
        } catch (err) {
            console.error('지표 새로고침 실패:', err);
        } finally {
            if (icon) icon.style.animation = '';
            indRefreshBtn.disabled = false;
        }
    });
}

    /* ── 6. 메인 첫 실행 데이터 트랙 가동 ── */
    await loadAllData('전체 뉴스');
  };

  return { init };
})();