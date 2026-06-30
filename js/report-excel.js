// ================================================
// 토스DB 엑셀 보장분석 → 니즈환기 리포트 생성기
// v1.2 + v2.0 통합본
// - 토스 "OOO님의 보장분석 리포트.xlsx" 파싱
// - 부족 항목 빨간색 표시
// - v2.0: 수정 가능한 보험료 표 + 실시간 멘트 자동생성
// ================================================

(function () {

  // ─── [기준금액 설정] 단위: 만원 ───
  const RECOMMEND = {
    '질병입원의료비': 5000, '질병외래의료비': 30, '질병처방조제료': 10,
    '상해입원의료비': 5000, '상해외래의료비': 30, '상해처방조제료': 10,
    '일반암진단': 3000, '소액암(유사암)진단': 500, '고액암진단': 2000,
    '뇌혈관질환진단': 2000, '뇌졸중질환진단': 2000, '뇌출혈질환진단': 1000,
    '허혈성심장질환진단': 2000, '급성심근경색진단': 1000,
    '질병수술': 300, '상해수술': 300, '암수술': 500,
    '뇌혈관질환수술': 1000, '허혈성심장질환수술': 1000,
    '질병입원': 3, '상해입원': 3,
    '질병사망': 5000, '상해사망': 10000,
    '질병80%이상후유장해': 5000, '질병80%미만후유장해': 5000,
    '상해80%이상후유장해': 10000, '상해80%미만후유장해': 10000,
    '골절진단': 100, '화상진단': 100,
    '가족생활배상책임담보': 1000, '일상생활배상책임담보': 1000,
    '교통사고처리지원금': 3000, '벌금(대물)': 2000, '벌금(대인)': 3000,
    '변호사선임비용': 5000, '자동차부상치료비': 3000,
    '화재벌금': 2000,
    '보존치료': 100, '보철치료': 100,
  };

  // ─── [연령별 적정 보험료 기준] 단위: 원 ───
  const PREMIUM_STANDARD = {
    ranges: [
      { maxAge: 30, low: 80000,  high: 150000, over: 220000 },
      { maxAge: 40, low: 100000, high: 200000, over: 300000 },
      { maxAge: 50, low: 150000, high: 280000, over: 420000 },
      { maxAge: 60, low: 200000, high: 350000, over: 520000 },
      { maxAge: 99, low: 250000, high: 430000, over: 650000 },
    ],
  };

  function evaluatePremiumLevel(age, totalPremium) {
    const std = PREMIUM_STANDARD.ranges.find(r => age <= r.maxAge)
             || PREMIUM_STANDARD.ranges.at(-1);
    if (totalPremium < std.low)   return { label: '부족',     emoji: '🔴', class: 'level-low'  };
    if (totalPremium <= std.high) return { label: '적정',     emoji: '🟢', class: 'level-ok'   };
    if (totalPremium <= std.over) return { label: '다소 높음', emoji: '🟠', class: 'level-warn' };
    return                               { label: '과다',     emoji: '🔴', class: 'level-over' };
  }

  // ─── [보장 분석 항목 자동 생성] ───
  function buildAnalysisItems(lowItems, age, totalPremium, level) {
    const items = [];

    const PRIORITY = [
      {
        key: 'realBenefit', cats: ['실비'],
        test: () => lowItems.some(r => r.cat === '실비'),
        build: () => {
          const subs = lowItems.filter(r => r.cat === '실비').map(r => r.label);
          return {
            emoji: '🔴', title: '실손의료비(실비) 한도 부족',
            body: `현재 실비 보장 한도가 권장 기준에 미치지 못합니다.\n`
                + `(부족 항목: ${subs.join(', ')})\n`
                + `실비는 실제 발생한 진료비를 직접 돌려받는 항목으로,\n`
                + `한도 부족 시 고액 치료비 발생 시 자비 부담이 커집니다.`,
          };
        },
      },
      {
        key: 'diagnosis', cats: ['3대진단'],
        test: () => lowItems.some(r => r.cat === '3대진단'),
        build: () => {
          const subs = lowItems.filter(r => r.cat === '3대진단').map(r => r.label);
          const hasAmt = lowItems.find(r => r.cat === '3대진단' && r.customerSum > 0);
          return {
            emoji: hasAmt ? '🟠' : '🔴', title: '암·뇌·심장 진단비 부족',
            body: `3대 질환(암·뇌혈관·심장질환) 진단비가 권장 기준보다 부족합니다.\n`
                + `(부족 항목: ${subs.join(', ')})\n`
                + `진단 후 치료비뿐 아니라 최소 6개월 이상의 생활비 공백을\n`
                + `감당할 수 있는 수준으로 보강이 필요합니다.`,
          };
        },
      },
      {
        key: 'surgery', cats: ['수술비'],
        test: () => lowItems.some(r => r.cat === '수술비'),
        build: () => {
          const subs = lowItems.filter(r => r.cat === '수술비').map(r => r.label);
          const allZero = lowItems.filter(r => r.cat === '수술비').every(r => r.customerSum === 0);
          return {
            emoji: allZero ? '🔴' : '🟠',
            title: allZero ? '수술비 전 항목 미가입' : '수술비 보장 부족',
            body: `질병·상해·암 수술 시 발생하는 비급여 비용을 보전할 수술비가 부족합니다.\n`
                + `(부족 항목: ${subs.join(', ')})\n`
                + `수술 1회당 비급여 부담은 평균 100~500만원 수준으로,\n`
                + `실비만으로는 전액 커버가 어렵습니다.`,
          };
        },
      },
      {
        key: 'daily', cats: ['입원일당'],
        test: () => lowItems.some(r => r.cat === '입원일당'),
        build: () => ({
          emoji: '🟠', title: '입원 중 생활비 지원금 미가입',
          body: `입원일당 보장이 없어 장기 입원 시 고정 생활비(월세, 공과금 등)가\n`
              + `그대로 지출됩니다.\n`
              + `1일 3만원 수준의 소액 입원일당으로도 실질적인 도움이 됩니다.`,
        }),
      },
      {
        key: 'death', cats: ['사망'],
        test: () => lowItems.some(r => r.cat === '사망' && r.label === '질병사망'),
        build: () => ({
          emoji: '🔴', title: '질병사망 보험금 미가입',
          body: `질병으로 인한 사망 시 지급되는 보험금이 없습니다.\n`
              + `가족의 생계 유지를 위한 최소 준비금으로 보강을 권장드립니다.`,
        }),
      },
      {
        key: 'driver', cats: ['운전자'],
        test: () => lowItems.some(r => r.cat === '운전자'),
        build: () => ({
          emoji: '🟠', title: '운전자 보장(벌금·합의금) 미가입',
          body: `교통사고 발생 시 벌금, 합의금, 변호사 선임비용 등을 보장하는\n`
              + `운전자 담보가 미가입 상태입니다.\n`
              + `운전하신다면 적은 보험료로 큰 리스크를 대비할 수 있습니다.`,
        }),
      },
      {
        key: 'dental', cats: ['치아'],
        test: () => lowItems.some(r => r.cat === '치아'),
        build: () => ({
          emoji: '🟡', title: '치과 치료비(보존·보철) 보장 없음',
          body: `치아 보존·보철 치료 보장이 없습니다.\n`
              + `치과 비급여 비율이 높아 임플란트·크라운 시 1개당 100만원 이상\n`
              + `실비 외 추가 지출이 발생할 수 있습니다.`,
        }),
      },
      {
        key: 'premium', cats: [],
        test: () => level.label === '과다' || level.label === '다소 높음',
        build: () => ({
          emoji: level.label === '과다' ? '🔴' : '🟠',
          title: `월납 보험료 ${level.label} — 비용 효율 점검 필요`,
          body: `현재 월 ${totalPremium.toLocaleString()}원은 ${age}세 기준 ${level.label} 수준입니다.\n`
              + `중복 특약이나 불필요한 보장이 포함되어 있을 가능성이 있으며,\n`
              + `구조 조정을 통해 비용은 줄이고 핵심 보장을 강화할 수 있습니다.`,
        }),
      },
      {
        key: 'lowPremium', cats: [],
        test: () => level.label === '부족' && lowItems.length === 0,
        build: () => ({
          emoji: '🟡', title: '보험료 대비 보장 구성 재검토 권장',
          body: `납입 보험료가 연령 대비 낮은 수준입니다.\n`
              + `현재 보장 항목이 충족되어 있어도, 갱신형 특약의 경우\n`
              + `향후 보험료가 크게 오를 수 있어 구조 점검이 필요합니다.`,
        }),
      },
    ];

    for (const p of PRIORITY) {
      if (items.length >= 3) break;
      if (p.test()) items.push(p.build());
    }

    if (items.length < 3) {
      const usedCats = items.flatMap(i => i._cat || []);
      const extras = [...lowItems]
        .filter(r => !usedCats.includes(r.cat))
        .sort((a, b) => (b.recommend - b.customerSum) - (a.recommend - a.customerSum));
      for (const r of extras) {
        if (items.length >= 3) break;
        const gap = (r.recommend - r.customerSum).toLocaleString();
        items.push({
          emoji: r.customerSum === 0 ? '🔴' : '🟠',
          title: `${r.label} 보장 부족`,
          body: `현재 ${r.customerSum.toLocaleString()}만원 / 권장 ${r.recommend.toLocaleString()}만원\n`
              + `약 ${gap}만원의 보장 공백이 있습니다.`,
        });
      }
    }

    while (items.length < 3) {
      items.push({
        emoji: '🟢', title: '전반적인 보장 구성 유지',
        body: `현재 가입된 보험의 갱신 일정과 한도를 주기적으로 확인하여\n`
            + `변화하는 생활 환경에 맞게 조율해두시는 것을 권장드립니다.`,
      });
    }

    return items.slice(0, 3);
  }

  // ─── [종합 의견 생성] ───
  function buildTotalOpinion(customerName, age, totalPremium, level, lowItems, analysisItems) {
    const lowCats = [...new Set(lowItems.map(r => r.cat))];
    const catStr  = lowCats.length ? lowCats.join('·') : '없음';
    const criticalCount = analysisItems.filter(i => i.emoji === '🔴').length;

    if (criticalCount >= 2) {
      return `${customerName}님은 현재 월 ${totalPremium.toLocaleString()}원을 납입 중이시지만, `
           + `${catStr} 등 핵심 보장에 다수의 공백이 확인됩니다. `
           + `보험료 부담은 있으나 정작 큰 사고·질환 발생 시 실질 보전이 어려운 구조입니다. `
           + `우선순위가 높은 항목부터 최소 비용으로 채우는 방향으로 상담을 진행해 드리겠습니다.`;
    }
    if (level.label === '과다' || level.label === '다소 높음') {
      return `${customerName}님의 총 월납 보험료(${totalPremium.toLocaleString()}원)는 `
           + `${age}세 기준 ${level.label} 수준입니다. `
           + `${catStr.length > 2 ? catStr + ' 보장이 미흡하여 ' : ''}`
           + `비용 대비 보장 효율이 떨어질 수 있습니다. `
           + `중복·불필요 특약을 정리하고 핵심 보장을 보강하는 리모델링 상담을 권장드립니다.`;
    }
    if (level.label === '부족') {
      return `${customerName}님은 ${age}세 기준 보험료 납입이 상대적으로 적은 편입니다. `
           + `현재 보장 공백(${catStr})을 소액으로 효율적으로 채울 수 있는 구조가 있어, `
           + `추가 부담을 최소화하면서 핵심 보장을 확보하는 방향으로 안내드리겠습니다.`;
    }
    return `${customerName}님은 전반적으로 ${level.label} 수준의 보험료를 납입 중이시나, `
         + `${catStr.length > 2 ? catStr + ' 영역에서 ' : '일부 항목에서 '}`
         + `보장 공백이 발견되었습니다. `
         + `현재 구조를 유지하면서 핵심 공백만 효율적으로 보완하는 방향으로 상담드리겠습니다.`;
  }

  // ─── [v2.0 멘트 전체 문자열 생성] ───
  function generateFullMessage(data) {
    const { customerName, age, category, premiums, lowItems } = data;
    const activePremiums = (premiums || []).filter(p => p.active !== false);
    const totalPremium   = activePremiums.reduce((s, p) => s + (p.amount || 0), 0);
    const level          = evaluatePremiumLevel(age || 40, totalPremium);
    const analysisItems  = buildAnalysisItems(lowItems || [], age || 40, totalPremium, level);
    const totalOpinion   = buildTotalOpinion(customerName, age || 40, totalPremium, level, lowItems || [], analysisItems);

    const fmt = (item, idx) =>
      `${idx + 1}. ${item.emoji} ${item.title}\n${item.body.split('\n').map(l => `   ${l}`).join('\n')}`;

    return [
      `안녕하세요 ${customerName}님`,
      `토스 앱을 통해 신청하신 '${category || '보험 점검'}' 상담을 도와드릴 심현진 어드바이저 입니다.`,
      ``,
      `상담 진행에 앞서 안심하시고 질의응답 하실 수 있도록 당사 명함 함께 첨부해드립니다.`,
      ``,
      `신청해 주신 '${category || '보험 점검'}' 내용으로 분석한 결과 안내드리겠습니다.`,
      ``,
      `[ 보장 분석 ]`,
      analysisItems.map(fmt).join('\n\n'),
      ``,
      `💡 어드바이저의 종합 분석 의견`,
      totalOpinion,
      ``,
      `✅ ${customerName}님의 편의에 맞춰 카카오톡, 전화, 대면 상담 중 선택하실 수 있습니다.`,
      `✅ 상담은 신청하신 순서대로 진행되나, 최대한 원하시는 일정에 맞춰 조율해 드립니다.`,
      `✅ 궁금하신 점이나 상담 희망 시간을 회신 주시면 바로 확인하겠습니다.`,
      ``,
      `감사합니다.`,
    ].join('\n');
  }

  // ─── [v2.0 수정 가능한 보험료 표 렌더링] ───
  function renderEditableTable(targetEl, msgTargetEl, data) {
    if (!targetEl) return;

    const state = {
      customerName: data.customerName || '',
      age:          Number(data.age)  || 40,
      category:     data.category     || '보험 점검',
      companies:    (data.companies   || []).map(String),
      premiums:     (data.premiums    || []).map(p => ({ ...p })),
      lowItems:     data.lowItems     || [],
    };

    function recalc() {
      const total = state.premiums
        .filter(p => p.active !== false)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      const totalCell = targetEl.querySelector('#rpt2-total-premium');
      if (totalCell) totalCell.textContent = total.toLocaleString() + '원';

      const level = evaluatePremiumLevel(state.age, total);
      const levelCell = targetEl.querySelector('#rpt2-level');
      if (levelCell) {
        levelCell.textContent = `${level.emoji} ${level.label}`;
        levelCell.className   = `rpt2-level-cell ${level.class}`;
      }

      if (msgTargetEl) {
        msgTargetEl.value = generateFullMessage({ ...state, premiums: state.premiums });
      }
    }

    // 스타일 주입
    if (!document.getElementById('rpt2-styles')) {
      const s = document.createElement('style');
      s.id = 'rpt2-styles';
      s.textContent = `
#rpt2-wrap{font-family:'Noto Sans KR',sans-serif;font-size:13px;margin-top:16px;}
#rpt2-table{border-collapse:collapse;width:100%;min-width:340px;}
#rpt2-table th{background:#001E42;color:#fff;font-weight:700;padding:9px 12px;text-align:center;white-space:nowrap;}
#rpt2-table td{border:1px solid #E2E8F0;padding:7px 10px;vertical-align:middle;}
#rpt2-table tr:hover td{background:#F8FBFF;}
.rpt2-input{width:100%;border:none;background:transparent;font-size:13px;
  font-family:'Noto Sans KR',sans-serif;color:#334155;outline:none;text-align:right;}
.rpt2-input:focus{background:#EFF6FF;border-radius:4px;}
.rpt2-foot td{background:#F1F5F9;font-weight:700;}
.rpt2-level-cell{font-weight:800;text-align:center;}
.level-ok  {color:#16A34A;}
.level-warn{color:#D97706;}
.level-over{color:#DC2626;}
.level-low {color:#DC2626;}
.rpt2-del-btn{border:none;background:none;cursor:pointer;color:#94A3B8;font-size:15px;padding:0 4px;}
.rpt2-del-btn:hover{color:#DC2626;}
.rpt2-add-btn{margin-top:8px;padding:7px 16px;border:1.5px dashed #BAD7FB;border-radius:8px;
  background:#F8FBFF;color:#3182F6;font-size:12px;cursor:pointer;font-weight:600;}
.rpt2-add-btn:hover{background:#EFF6FF;}
.rpt2-age-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
.rpt2-age-row label{font-size:13px;font-weight:700;color:#334155;white-space:nowrap;}
.rpt2-age-input{width:72px;padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;
  font-size:13px;font-family:'Noto Sans KR',sans-serif;outline:none;text-align:center;}
.rpt2-age-input:focus{border-color:#3182F6;}
.rpt2-cat-input{flex:1;padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;
  font-size:13px;font-family:'Noto Sans KR',sans-serif;outline:none;}
.rpt2-cat-input:focus{border-color:#3182F6;}
      `;
      document.head.appendChild(s);
    }

    function buildHTML() {
      let rows = '';
      state.premiums.forEach((p, i) => {
        rows += `
        <tr data-idx="${i}">
          <td><input class="rpt2-input" style="text-align:left;" data-field="name" data-idx="${i}"
                value="${esc(p.name || '')}" placeholder="보험사명"></td>
          <td><input class="rpt2-input" data-field="amount" data-idx="${i}"
                value="${(p.amount || 0).toLocaleString()}" placeholder="0"></td>
          <td style="text-align:center;">
            <button class="rpt2-del-btn" data-del="${i}" title="삭제">✕</button>
          </td>
        </tr>`;
      });

      const total = state.premiums
        .filter(p => p.active !== false)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const level = evaluatePremiumLevel(state.age, total);

      return `
      <div id="rpt2-wrap">
        <div class="rpt2-age-row">
          <label>고객 나이</label>
          <input type="number" class="rpt2-age-input" id="rpt2-age-input"
            value="${state.age}" min="1" max="99" placeholder="나이">
          <label>상담 카테고리</label>
          <input type="text" class="rpt2-cat-input" id="rpt2-cat-input"
            value="${esc(state.category)}" placeholder="예) 보험 점검">
        </div>
        <table id="rpt2-table">
          <thead>
            <tr>
              <th>가입한 보험사</th>
              <th>월납 보험료 (원)</th>
              <th style="width:36px;"></th>
            </tr>
          </thead>
          <tbody id="rpt2-tbody">${rows}</tbody>
          <tfoot>
            <tr class="rpt2-foot">
              <td>합계</td>
              <td id="rpt2-total-premium" style="text-align:right;">${total.toLocaleString()}원</td>
              <td></td>
            </tr>
            <tr class="rpt2-foot">
              <td>연령 대비 보험료 수준</td>
              <td colspan="2" id="rpt2-level" class="rpt2-level-cell ${level.class}">${level.emoji} ${level.label}</td>
            </tr>
          </tfoot>
        </table>
        <button class="rpt2-add-btn" id="rpt2-add-btn">+ 보험사 추가</button>
      </div>`;
    }

    targetEl.innerHTML = buildHTML();

    // 나이/카테고리 입력 이벤트
    targetEl.addEventListener('input', function (e) {
      const el  = e.target;
      if (el.id === 'rpt2-age-input') {
        state.age = Number(el.value) || 40;
        recalc(); return;
      }
      if (el.id === 'rpt2-cat-input') {
        state.category = el.value;
        recalc(); return;
      }

      const idx = Number(el.dataset.idx);
      if (isNaN(idx)) return;
      if (el.dataset.field === 'name') {
        state.premiums[idx].name = el.value;
      } else if (el.dataset.field === 'amount') {
        const raw = el.value.replace(/,/g, '').trim();
        state.premiums[idx].amount = parseFloat(raw) || 0;
      }
      recalc();
    });

    // 천단위 콤마 포맷
    targetEl.addEventListener('change', function (e) {
      const el = e.target;
      if (el.dataset.field === 'amount') {
        const n = parseFloat(el.value.replace(/,/g, '')) || 0;
        el.value = n.toLocaleString();
      }
    });

    // 삭제 / 추가 버튼
    targetEl.addEventListener('click', function (e) {
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        state.premiums.splice(Number(delBtn.dataset.del), 1);
        targetEl.innerHTML = buildHTML();
        recalc(); return;
      }
      if (e.target.id === 'rpt2-add-btn') {
        state.premiums.push({ name: '', amount: 0, active: true });
        const tbody = targetEl.querySelector('#rpt2-tbody');
        const i = state.premiums.length - 1;
        const tr = document.createElement('tr');
        tr.dataset.idx = i;
        tr.innerHTML = `
          <td><input class="rpt2-input" style="text-align:left;" data-field="name" data-idx="${i}"
                value="" placeholder="보험사명"></td>
          <td><input class="rpt2-input" data-field="amount" data-idx="${i}"
                value="" placeholder="0"></td>
          <td style="text-align:center;">
            <button class="rpt2-del-btn" data-del="${i}" title="삭제">✕</button>
          </td>`;
        tbody.appendChild(tr);
        tr.querySelector('input').focus();
        recalc();
      }
    });

    recalc();
    return {
      getState:    () => ({ ...state }),
      getMessage:  () => generateFullMessage(state),
      forceRecalc: recalc,
    };
  }

  // ─── 내부 상태 ───
  let exState = { customerName: '', companies: [], rows: [] };
  let _tableController = null; // v2.0 표 컨트롤러

  // ─── 외부 스크립트 로더 ───
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // ─── 모듈 초기화 ───
  window.initRptExcelModule = function () {
    const panel = document.getElementById('rpt-mode-excel-panel');
    if (!panel) return;
    if (panel.dataset.inited) return;
    panel.dataset.inited = '1';
    panel.innerHTML = getExcelHTML();
    injectExcelStyles();
    bindDropZone();
  };

  function getExcelHTML() {
    return `
    <div class="rpt-card">
      <div class="rpt-step-label">STEP 1</div>
      <h3 class="rpt-step-title">토스DB 보장분석 엑셀 업로드</h3>
      <p class="rpt-step-desc">고객의 "OOO님의 보장분석 리포트.xlsx" 파일을 업로드하면, 부족한 보장 항목을 자동으로 찾아 빨간색으로 표시하고 니즈환기 멘트를 생성합니다.</p>
      <label id="rptex-drop" class="rptex-drop" for="rptex-file-input">
        <i class="bi bi-file-earmark-excel" style="font-size:28px;color:#3182F6;"></i>
        <span id="rptex-drop-text">클릭하거나 파일을 끌어다 놓으세요 (.xlsx)</span>
        <input type="file" id="rptex-file-input" accept=".xlsx" style="display:none;"
          onchange="window.rptExHandleFile(this.files[0])">
      </label>
      <div id="rptex-error-box" style="display:none;margin-top:12px;padding:12px 16px;
        background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#DC2626;font-size:13px;">
        <i class="bi bi-exclamation-circle-fill"></i> <span id="rptex-error-msg"></span>
      </div>
    </div>

    <div id="rptex-result" style="display:none;">

      <!-- STEP 2: 보장 분석표 -->
      <div class="rpt-card">
        <div class="rpt-step-label">STEP 2</div>
        <h3 class="rpt-step-title">보장 부족 항목 분석 결과</h3>
        <p class="rpt-step-desc" id="rptex-summary" style="color:#3182F6;font-weight:600;"></p>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;margin-top:10px;">
          <div id="rptex-table"></div>
        </div>
        <p style="font-size:11px;color:#94A3B8;margin-top:10px;">
          * 기준금액은 일반적인 권장 가입금액(예시)이며, 고객 상황에 맞게 상담 시 조정해주세요.
        </p>
      </div>

      <!-- STEP 3: 보험료 표 + 멘트 생성 (v2.0) -->
      <div class="rpt-card">
        <div class="rpt-step-label">STEP 3</div>
        <h3 class="rpt-step-title">월납 보험료 입력 → 니즈환기 멘트 자동 생성</h3>
        <p class="rpt-step-desc">나이·카테고리를 확인하고, 보험사별 월납 보험료를 입력하면 멘트가 자동으로 완성됩니다.</p>

        <!-- v2.0 수정 가능한 보험료 표가 여기에 삽입됩니다 -->
        <div id="rpt2-table-panel"></div>

        <p class="rpt-step-desc" style="margin-top:16px;margin-bottom:6px;">완성된 니즈환기 멘트</p>
        <textarea id="rptex-msg-output" style="width:100%;height:280px;border:1.5px solid #E2E8F0;border-radius:10px;
          padding:14px;font-size:13px;font-family:'Noto Sans KR',sans-serif;color:#334155;resize:vertical;
          box-sizing:border-box;line-height:1.7;background:#F8FAFC;"></textarea>

        <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn-action" style="width:auto;padding:10px 20px;" onclick="window.rptExCopyMsg()">
            <i class="bi bi-clipboard-check"></i> 멘트 복사하기
          </button>
          <button style="background:none;border:1px solid #E2E8F0;padding:10px 20px;border-radius:8px;
            cursor:pointer;font-size:13px;color:#475569;" onclick="window.rptExReset()">
            <i class="bi bi-arrow-counterclockwise"></i> 다시 시작
          </button>
        </div>
      </div>

    </div>`;
  }

  function injectExcelStyles() {
    if (document.getElementById('rptex-styles')) return;
    const s = document.createElement('style');
    s.id = 'rptex-styles';
    s.textContent = `
.rptex-drop{display:flex;flex-direction:column;align-items:center;gap:10px;
  border:2px dashed #BAD7FB;border-radius:14px;padding:34px 20px;cursor:pointer;
  background:#F8FBFF;transition:all .15s;text-align:center;}
.rptex-drop:hover{background:#EFF6FF;border-color:#3182F6;}
.rptex-drop.dragover{background:#EFF6FF;border-color:#3182F6;}
#rptex-drop-text{font-size:13px;color:#64748B;font-weight:600;}
#rptex-table table{border-collapse:collapse;font-size:12px;font-family:'Noto Sans KR',sans-serif;width:100%;min-width:600px;}
#rptex-table th,#rptex-table td{border:1px solid #E2E8F0;padding:8px 10px;text-align:center;white-space:nowrap;}
#rptex-table th{background:#001E42;color:#fff;font-weight:700;}
.rptex-cat{background:#D6DEE7;font-weight:700;color:#001E42;}
.rptex-label{text-align:left;font-weight:600;color:#334155;min-width:130px;}
.rptex-status{font-weight:800;border-radius:6px;padding:3px 10px;font-size:11px;display:inline-block;}
.rptex-status.ok{background:#EFF6FF;color:#3182F6;}
.rptex-status.low{background:#FEF2F2;color:#DC2626;}
.rptex-status.none{background:#F1F5F9;color:#64748B;}
.rptex-amt-low{color:#DC2626 !important;font-weight:800;background:#FEF2F2 !important;}
`;
    document.head.appendChild(s);
  }

  function bindDropZone() {
    const panel = document.getElementById('rpt-mode-excel-panel');
    if (!panel) return;
    panel.addEventListener('dragover', function (e) {
      const drop = document.getElementById('rptex-drop');
      if (drop) { e.preventDefault(); drop.classList.add('dragover'); }
    });
    panel.addEventListener('dragleave', function () {
      const drop = document.getElementById('rptex-drop');
      if (drop) drop.classList.remove('dragover');
    });
    panel.addEventListener('drop', function (e) {
      const drop = document.getElementById('rptex-drop');
      if (drop) {
        e.preventDefault();
        drop.classList.remove('dragover');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) window.rptExHandleFile(f);
      }
    });
  }

  function rptExShowError(msg) {
    const b = document.getElementById('rptex-error-box');
    if (b) { document.getElementById('rptex-error-msg').textContent = msg; b.style.display = 'block'; }
  }
  function rptExHideError() {
    const b = document.getElementById('rptex-error-box');
    if (b) b.style.display = 'none';
  }

  // ─── 파일 처리 진입점 ───
  window.rptExHandleFile = async function (file) {
    rptExHideError();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      rptExShowError('.xlsx 파일만 업로드 가능합니다.'); return;
    }
    const dropText = document.getElementById('rptex-drop-text');
    if (dropText) dropText.textContent = '분석 중... (' + file.name + ')';

    try {
      if (!window.XLSX) {
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js');
      }
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const parsed = parseTossExcel(aoa);
      if (!parsed.rows.length) {
        rptExShowError('보장 항목을 찾을 수 없습니다. 토스 보장분석 리포트 양식이 맞는지 확인해주세요.');
        if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
        return;
      }

      exState = parsed;
      renderExcelResult();
      if (dropText) dropText.textContent = '✅ ' + file.name + ' 분석 완료 (다른 파일을 올리면 다시 분석합니다)';
    } catch (err) {
      console.error(err);
      rptExShowError('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
      if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    }
  };

  // ─── 토스 보장분석 엑셀 파싱 ───
  function parseTossExcel(aoa) {
    let customerName = '';
    outer:
    for (let r = 0; r < Math.min(aoa.length, 5); r++) {
      const row = aoa[r] || [];
      for (let c = 0; c < row.length; c++) {
        const m = String(row[c] || '').match(/^(.+?)님/);
        if (m) { customerName = m[1].trim(); break outer; }
      }
    }

    let companies = [], rows = [];
    let currentCat = null, headerSeen = false;
    let catCol = -1, subCol = -1, amtCol = -1, companyStartCol = -1;

    for (let r = 0; r < aoa.length; r++) {
      const row = aoa[r] || [];
      if (!headerSeen) {
        for (let c = 0; c < row.length - 1; c++) {
          if (String(row[c] || '').trim() === '대분류' && String(row[c + 1] || '').trim() === '소분류') {
            headerSeen = true;
            catCol = c; subCol = c + 1; amtCol = c + 2; companyStartCol = c + 3;
            for (let cc = companyStartCol; cc < row.length; cc++) {
              const name = String(row[cc] || '').trim();
              if (name) companies.push(name);
            }
            break;
          }
        }
        continue;
      }
      const b = String(row[catCol] || '').trim();
      const c = String(row[subCol] || '').trim();
      if (b) currentCat = b;
      if (!c) continue;

      const sumAmt = parseManwon(row[amtCol]);
      const perProduct = [];
      for (let cc = companyStartCol; cc < companyStartCol + companies.length; cc++) {
        perProduct.push(parseManwon(row[cc]));
      }
      const recommend = RECOMMEND[c];
      let status = 'none';
      if (recommend !== undefined) status = sumAmt >= recommend ? 'ok' : 'low';

      rows.push({ cat: currentCat, label: c, customerSum: sumAmt, recommend, status, perProduct });
    }
    return { customerName, companies, rows };
  }

  function parseManwon(v) {
    if (v === undefined || v === null) return 0;
    const s = String(v).replace(/,/g, '').trim();
    if (!s || s === '-') return 0;
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // ─── 결과 렌더링 ───
  function renderExcelResult() {
    const { rows, companies, customerName } = exState;
    const lowItems   = rows.filter(r => r.status === 'low');
    const noneCount  = rows.filter(r => r.status === 'none').length;

    document.getElementById('rptex-result').style.display = 'block';
    document.getElementById('rptex-summary').textContent =
      `✅ 총 ${rows.length}개 보장 항목 중 ${lowItems.length}개 부족 항목을 찾았습니다.` +
      (noneCount ? ` (기준 미설정 항목 ${noneCount}개 회색 표시)` : '');

    // 보장 분석 테이블
    let html = `<table><tr>
      <th>대분류</th><th>소분류</th>
      <th>고객 보장합산<br>(만원)</th><th>권장 기준<br>(만원)</th><th>상태</th>
      ${companies.map(c => `<th style="font-size:10px;">${esc(c)}</th>`).join('')}
    </tr>`;

    const spans = {};
    let lastCat = null, startIdx = 0;
    rows.forEach((r, i) => {
      if (r.cat !== lastCat) {
        if (lastCat !== null) spans[startIdx] = i - startIdx;
        lastCat = r.cat; startIdx = i;
      }
    });
    if (lastCat !== null) spans[startIdx] = rows.length - startIdx;

    rows.forEach((r, i) => {
      html += `<tr>`;
      if (spans[i] !== undefined)
        html += `<td class="rptex-cat" rowspan="${spans[i]}">${esc(r.cat)}</td>`;
      const amtCls = r.status === 'low' ? 'rptex-amt-low' : '';
      const statusLabel = r.status === 'ok' ? '적정' : r.status === 'low' ? '부족' : '기준없음';
      const statusCls   = r.status === 'ok' ? 'ok' : r.status === 'low' ? 'low' : 'none';
      html += `<td class="rptex-label">${esc(r.label)}</td>`;
      html += `<td class="${amtCls}">${r.customerSum ? r.customerSum.toLocaleString() : '-'}</td>`;
      html += `<td>${r.recommend !== undefined ? r.recommend.toLocaleString() : '-'}</td>`;
      html += `<td><span class="rptex-status ${statusCls}">${statusLabel}</span></td>`;
      r.perProduct.forEach(v => { html += `<td>${v ? v.toLocaleString() : '-'}</td>`; });
      html += `</tr>`;
    });
    html += `</table>`;
    document.getElementById('rptex-table').innerHTML = html;

    // ── v2.0 연동: 수정 가능한 보험료 표 + 멘트 자동 생성 ──
    const tableEl = document.getElementById('rpt2-table-panel');
    const msgEl   = document.getElementById('rptex-msg-output');

    const data = {
      customerName: customerName || '고객',
      age:          40,   // 엑셀에 나이가 없으므로 기본값 40 (표에서 직접 수정 가능)
      category:     '보험 점검',
      companies:    companies,
      premiums:     companies.map(name => ({ name, amount: 0, active: true })),
      lowItems:     lowItems,
    };

    _tableController = renderEditableTable(tableEl, msgEl, data);
  }

  // ─── 멘트 복사 ───
  window.rptExCopyMsg = function () {
    const ta = document.getElementById('rptex-msg-output');
    if (!ta || !ta.value) return alert('생성된 멘트가 없습니다.');
    ta.select();
    navigator.clipboard.writeText(ta.value)
      .then(() => alert('멘트가 클립보드에 복사되었습니다.'))
      .catch(() => alert('복사에 실패했습니다. 직접 선택해서 복사해주세요.'));
  };

  // ─── 리셋 ───
  window.rptExReset = function () {
    exState = { customerName: '', companies: [], rows: [] };
    _tableController = null;
    const result = document.getElementById('rptex-result');
    if (result) result.style.display = 'none';
    const dropText = document.getElementById('rptex-drop-text');
    if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    const fileInput = document.getElementById('rptex-file-input');
    if (fileInput) fileInput.value = '';
    rptExHideError();
  };

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();