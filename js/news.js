/**
 * news.js - 보험가온포탈 뉴스 허브 연동 전산망
 */

const NewsWidget = (() => {
  const clean = (str = '') => str.replace(/<b>/g, '').replace(/<\/b>/g, '').replace(/&quot;/g, '"');
  const fmtDate = (str) => {
    const d = new Date(str);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const weatherEmoji = (desc = '') => desc.includes('맑') ? '☀️' : desc.includes('구름') || desc.includes('흐림') ? '☁️' : '🌧️';

  const api = {
    news: async (query, display = 12) => { try { const r = await fetch(`/api/naver-news?query=${encodeURIComponent(query)}&display=${display}`); const j = await r.json(); return j.items || []; } catch { return []; } },
    exchange: async () => { try { const r = await fetch('/api/naver-exchange'); const j = await r.json(); return { items: j.items || [] }; } catch { return { items: [] }; } },
    market: async () => { try { const r = await fetch('/api/market'); const j = await r.json(); return { items: j || [] }; } catch { return { items: [] }; } },
    weather: async (region) => { try { const r = await fetch(`/api/weather?region=${region}`); return await r.json(); } catch { return { error: true }; } }
  };

  const renderWeatherStrip = (list) => {
    const el = document.querySelector('.weather-strip');
    if (!el || !list.length) return;
    el.innerHTML = list.map(w => `<div class="weather-pill">${w.region} ${weatherEmoji(w.description)} ${w.temp || 24}°</div>`).join('');
  };

  const renderNewsFeed = (items) => {
    const el = document.querySelector('.feed-section');
    if (!el) return;
    let html = `<div class="toss-hero-header" style="padding:24px;">최신 속보 피드</div><div style="max-height:480px; overflow-y:auto;">`;
    items.slice(1, 6).forEach(item => {
      html += `<div class="feed-card"><h3>${clean(item.title)}</h3><a href="${item.link}" target="_blank">기사 원문</a></div>`;
    });
    el.innerHTML = html + `</div>`;
  };

  const renderMorningPaper = (topItem, fxList, mktList) => {
    const paperTitleEl = document.querySelector('.paper-body-text');
    if (paperTitleEl && topItem) {
        paperTitleEl.innerHTML = `<strong>"${clean(topItem.title)}"</strong><div>${clean(topItem.description)}</div>`;
    }
  };

  const renderBottomIndicators = (fxList, mktList) => {
    const el = document.getElementById('news-bottom-market-grid');
    if (!el) return;

    const usd = fxList.find(i => i.label === 'USD') || { value: 1385, change: 0, direction: 'up' };
    const jpy = fxList.find(i => i.label === 'JPY') || { value: 890, change: 0, direction: 'down' };
    const kospi = mktList.find(i => i.label === '코스피') || { value: 2750, change: 0, direction: 'up' };
    const gold = mktList.find(i => i.label === '국내 금 (원/g)') || { value: 105400, change: 0, direction: 'up' };

    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin:20px 0 10px 0;">
            <div style="font-size: 15px; font-weight: 700;">오늘의 시장 지표</div>
            <button id="btn-refresh-market" style="padding:4px 10px; cursor:pointer;">데이터 갱신</button>
        </div>
        <div class="indicator-grid">
            <div class="ind-card">USD: ${usd.value}</div>
            <div class="ind-card">JPY: ${jpy.value}</div>
            <div class="ind-card">KOSPI: ${kospi.value}</div>
            <div class="ind-card">금: ${gold.value}</div>
        </div>
    `;
    document.getElementById('btn-refresh-market').onclick = () => loadAllData();
  };

  const loadAllData = async (keyword = '전체 뉴스') => {
    let apiQuery = (keyword === '전체 뉴스' || keyword === '전체') ? "보험 금융 경제" : keyword;
    const [news, fx, mkt] = await Promise.all([api.news(apiQuery), api.exchange(), api.market()]);
    
    renderBottomIndicators(fx.items, mkt.items);
    if (news.length > 0) {
        renderMorningPaper(news[0], fx.items, mkt.items);
        renderNewsFeed(news);
    }
  };

  const init = async () => {
    const regions = ['서울'];
    const weather = await Promise.all(regions.map(r => api.weather(r)));
    renderWeatherStrip(weather);
    await loadAllData();
  };

  return { init };
})();