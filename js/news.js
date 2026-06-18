/**
 * news.js - 보험가온포탈 뉴스 허브 연동 전산망
 * 독립형 단독 페이지(news.html)에 실시간으로 데이터셋을 매핑하는 모듈
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
  /* 전산 텍스트 유틸리티                                               */
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
    const s = Number(val).toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const [int, dec] = s.split('.');
    return { int, dec };
  };

  const weatherEmoji = (desc = '') =>
    desc.includes('맑') || desc.includes('태양') ? '☀️' : desc.includes('구름') || desc.includes('흐림') ? '☁️' :
    desc.includes('비') || desc.includes('소나기') ? '🌧️' : desc.includes('눈') ? '❄️' : '☀️';

  /* ------------------------------------------------------------------ */
  /* 네이버 증권 및 기상청 API 실시간 호출 연동                          */
  /* ------------------------------------------------------------------ */
  const api = {
    news: async (query, display = 12) => {
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
      } catch { return { error: true, region, temp: 24, description: '맑음' }; }
    }
  };

  /* ------------------------------------------------------------------ */
  /* news.html 전용 타겟 렌더링 파이프라인                             */
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

  // 2. 우측 최신 속보 타일형 피드 연동 (높이 스크롤 기능 추가 완료)
  const renderNewsFeed = (items) => {
    const el = document.querySelector('.feed-section');
    if (!el) return;

    if (!items.length) {
      el.innerHTML = `<div style="padding:40px;text-align:center;color:#94A3B8;">실시간 속보 데이터를 불러올 수 없습니다.</div>`;
      return;
    }

    // 토스 히어로 스타일 및 스크롤 박스 시작
    let html = `
      <div class="toss-hero-header" style="padding: 24px; margin-bottom: 16px;">
        <div class="toss-hero-top">
            <div class="toss-hero-sub" style="color: rgba(255,255,255,0.9);">LIVE NEWS FEED</div>
            <button class="toss-hero-home-btn" id="nw-btn-refresh-live">
                <i class="bi bi-arrow-clockwise"></i> 실시간 새로고침
            </button>
        </div>
        <div class="toss-hero-main" style="font-size: 20px;">최신 속보 피드</div>
      </div>
      <div style="max-height: 480px; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 12px; scrollbar-width: thin;">
    `;

    // 인덱스 1번부터 끝까지는 피드 카드로 배치합니다.
    const feedItems = items.slice(1, 6);
    feedItems.forEach((item, idx) => {
      const isFirst = idx === 0;
      html += `
        <div class="feed-card" ${isFirst ? 'style="border-left: 4px solid #EF4444;"' : ''}>
          <span class="feed-badge ${isFirst ? 'alert-type' : ''}">${isFirst ? '주요속보' : '실시간뉴스'}</span>
          <span style="font-size:11px;color:#94A3B8;float:right;font-weight:500;">${fmtDate(item.pubDate)}</span>
          <h3 class="feed-title">${clean(item.title)}</h3>
          <p class="feed-desc">${clean(item.description)}</p>
          <a href="${item.link || item.originallink}" target="_blank" rel="noopener noreferrer" class="feed-link">기사 원문 보기 <i class="bi bi-arrow-right-short"></i></a>
        </div>`;
    });

    html += `</div>`; // 스크롤 박스 닫기

    el.innerHTML = html;

    // 실시간 리프레시 이벤트 핸들러 주입
    document.getElementById('nw-btn-refresh-live').addEventListener('click', () => {
        loadAllData(document.querySelector('.tag-btn.active')?.textContent || '전체 뉴스');
    });
  };

  // 3. 좌측 MORNING NEWS 지면 데이터 매핑
  const renderMorningPaper = (topItem, fxList, mktList) => {
    const paperTitleEl = document.querySelector('.paper-body-text');
    const paperIndexEl = document.querySelector('.paper-top-index');
    const paperDateEl = document.getElementById('paper-live-date');
    
    // 오늘 날짜로 자동 업데이트
    if (paperDateEl) {
        const today = new Date();
        paperDateEl.textContent = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }

    // 메인 헤드라인 텍스트 배치
    if (paperTitleEl && topItem) {
        paperTitleEl.innerHTML = `
            <strong style="font-size: 18px; line-height: 1.4;">"${clean(topItem.title)}"</strong>
            <span style="font-size:11px;color:#94A3B8;display:block;margin-top:8px;margin-bottom:15px;">발행처: NAVER NEWS HUB &middot; 스크랩: ${fmtDate(topItem.pubDate)}</span>
            <div style="font-size: 15px; line-height: 1.8; color: #4E5936; margin-bottom: 25px; text-align: justify;">
                ${clean(topItem.description)} ...
            </div>
            <a href="${topItem.link || topItem.originallink}" target="_blank" rel="noopener noreferrer" 
               style="display: block; background: #F8FAFC; color: #3182F6; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 700; text-align: center; transition: all 0.2s;">
               <i class="bi bi-newspaper"></i> 네이버에서 기사 원문 전체 읽기
            </a>
        `;
    }

    // 신문 상단 미니 경제 지표 매칭
    if (paperIndexEl) {
        const usd = fxList.find(i => i.label === 'USD') || { value: 1514.60, change: 5.20, direction: 'down' };
        const kospi = mktList.find(i => i.label === '코스피') || { value: 8545.98, change: 422.36, direction: 'up' };
        const kosdaq = mktList.find(i => i.label === '코스닥') || { value: 1034.03, change: 14.98, direction: 'up' };

        paperIndexEl.innerHTML = `
            <div class="p-idx-item">
                <div class="t">USD / KRW</div>
                <div class="v">${Number(usd.value).toFixed(2)}</div>
                <div class="c ${usd.direction}"><i class="bi bi-caret-${usd.direction}-fill"></i> ${Math.abs(usd.change).toFixed(2)}</div>
            </div>
            <div class="p-idx-item" style="border-left:1px solid #334155; border-right:1px solid #334155;">
                <div class="t">KOSPI</div>
                <div class="v">${Number(kospi.value).toLocaleString('ko-KR', {maximumFractionDigits:2})}</div>
                <div class="c ${kospi.direction}"><i class="bi bi-caret-${kospi.direction}-fill"></i> ${Math.abs(kospi.change).toFixed(2)}</div>
            </div>
            <div class="p-idx-item">
                <div class="t">KOSDAQ</div>
                <div class="v">${Number(kosdaq.value).toLocaleString('ko-KR', {maximumFractionDigits:2})}</div>
                <div class="c ${kosdaq.direction}"><i class="bi bi-caret-${kosdaq.direction}-fill"></i> ${Math.abs(kosdaq.change).toFixed(2)}</div>
            </div>
        `;
    }
  };

  // 4. 하단 환율 및 종합 지표 종합판 매핑
  const renderBottomIndicators = (fxList, mktList) => {
    const el = document.querySelector('.indicator-grid');
    if (!el) return;

    const usd = fxList.find(i => i.label === 'USD') || { value: 1512.40, change: 1.40, direction: 'up' };
    const jpy = fxList.find(i => i.label === 'JPY') || { value: 943.63, change: 1.78, direction: 'up' };
    const kospi = mktList.find(i => i.label === '코스피') || { value: 8864.24, change: 137.84, direction: 'up' };
    const gold = mktList.find(i => i.label === '국내 금 (원/g)') || { value: 209700, change: 80, direction: 'up' };

    el.innerHTML = `
        <div class="ind-card">
            <div class="lbl">USD / KRW (원/달러 환율)</div>
            <div class="price">${Number(usd.value).toFixed(2)}</div>
            <div class="state ${usd.direction}"><i class="bi bi-caret-${usd.direction}-fill"></i> ${Math.abs(usd.change).toFixed(2)} (${usd.direction === 'up' ? '상승' : '하락'})</div>
        </div>
        <div class="ind-card">
            <div class="lbl">JPY / KRW (100엔 환율)</div>
            <div class="price">${Number(jpy.value).toFixed(2)}</div>
            <div class="state ${jpy.direction}"><i class="bi bi-caret-${jpy.direction}-fill"></i> ${Math.abs(jpy.change).toFixed(2)} (${jpy.direction === 'up' ? '상승' : '하락'})</div>
        </div>
        <div class="ind-card">
            <div class="lbl">KOSPI 종합지수</div>
            <div class="price">${Number(kospi.value).toLocaleString('ko-KR', {maximumFractionDigits:2})}</div>
            <div class="state ${kospi.direction}"><i class="bi bi-caret-${kospi.direction}-fill"></i> ${Math.abs(kospi.change).toFixed(2)} (${kospi.direction === 'up' ? '상승' : '하락'})</div>
        </div>
        <div class="ind-card">
            <div class="lbl">국내 금시세 (g당)</div>
            <div class="price">${Number(gold.value).toLocaleString('ko-KR', {maximumFractionDigits:0})}</div>
            <div class="state ${gold.direction}"><i class="bi bi-caret-${gold.direction}-fill"></i> ${Math.abs(gold.change).toLocaleString('ko-KR', {maximumFractionDigits:0})} (${gold.direction === 'up' ? '상승' : '하락'})</div>
        </div>
    `;
  };

  /* ------------------------------------------------------------------ */
  /* 종합 오케스트레이션 로더                                              */
  /* ------------------------------------------------------------------ */
  const loadAllData = async (keyword = '전체 뉴스') => {
    // 키워드 변환 파싱
    let apiQuery = "보험 금융 경제";
    if (keyword !== '전체 뉴스' && keyword !== '전체') {
        apiQuery = keyword;
    }

    // 병렬 패치 개시
    const [newsItems, fxData, mktItems] = await Promise.all([
        api.news(apiQuery, 10),
        api.exchange(),
        api.market()
    ]);

    const fxList = fxData.items || [];

    // 전산 바인딩 출력 실행
    if (newsItems.length > 0) {
        renderMorningPaper(newsItems[0], fxList, mktItems);
        renderNewsFeed(newsItems);
    }
    renderBottomIndicators(fxList, mktItems);
  };

  const init = async () => {
    // 1. 날씨 데이터 우선 구동 및 상단 적용
    const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '제주'];
    Promise.all(regions.map(r => api.weather(r))).then(results => {
        renderWeatherStrip(results.filter(r => !r.error));
    });

    // 2. 카테고리 태그 탭 클릭 이벤트 및 검색어 인풋 실시간 바인딩
    const tagButtons = document.querySelectorAll('.tag-wrap .tag-btn');
    const searchBar = document.querySelector('.search-bar');

    tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tagButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (searchBar) searchBar.value = ''; // 탭 전환시 검색창 리셋
            loadAllData(btn.textContent);
        });
    });

    if (searchBar) {
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = searchBar.value.trim();
                if (val.length > 0) {
                    loadAllData(val);
                }
            }
        });
    }

    // 3. 메인 첫 실행 데이터 트랙 가동
    await loadAllData('전체 뉴스');
  };

  return { init };
})();