// ================================================
// 토스DB 니즈환기 리포트 생성기 - 확장 모듈
// v2.0: 수정 가능한 HTML 표 + 실시간 멘트 자동 생성
// ================================================

(function () {

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
    if (totalPremium < std.low)  return { label: '부족',     emoji: '🔴', class: 'level-low'  };
    if (totalPremium <= std.high) return { label: '적정',     emoji: '🟢', class: 'level-ok'   };
    if (totalPremium <= std.over) return { label: '다소 높음', emoji: '🟠', class: 'level-warn' };
    return                               { label: '과다',     emoji: '🔴', class: 'level-over' };
  }

  // ─── [보장 분석 항목 자동 생성] ───
  // lowItems: parseTossExcel()이 반환한 rows 중 status === 'low' 배열
  // age: 고객 나이 (number)
  // totalPremium: 월납 합계 (원)
  // level: evaluatePremiumLevel() 반환값
  function buildAnalysisItems(lowItems, age, totalPremium, level) {
    const items = [];

    // ── 분석 우선순위 그룹 정의 ──
    const PRIORITY = [
      {
        key: 'realBenefit',
        cats: ['실비'],
        test: () => lowItems.some(r => r.cat === '실비'),
        build: () => {
          const subs = lowItems.filter(r => r.cat === '실비').map(r => r.label);
          return {
            emoji: '🔴',
            title: '실손의료비(실비) 한도 부족',
            body: `현재 실비 보장 한도가 권장 기준에 미치지 못합니다.\n`
                + `(부족 항목: ${subs.join(', ')})\n`
                + `실비는 실제 발생한 진료비를 직접 돌려받는 항목으로,\n`
                + `한도 부족 시 고액 치료비 발생 시 자비 부담이 커집니다.`,
          };
        },
      },
      {
        key: 'diagnosis',
        cats: ['3대진단'],
        test: () => lowItems.some(r => r.cat === '3대진단'),
        build: () => {
          const subs = lowItems.filter(r => r.cat === '3대진단').map(r => r.label);
          const hasAmt = lowItems.find(r => r.cat === '3대진단' && r.customerSum > 0);
          const emoji  = hasAmt ? '🟠' : '🔴';
          return {
            emoji,
            title: '암·뇌·심장 진단비 부족',
            body: `3대 질환(암·뇌혈관·심장질환) 진단비가 권장 기준보다 부족합니다.\n`
                + `(부족 항목: ${subs.join(', ')})\n`
                + `진단 후 치료비뿐 아니라 최소 6개월 이상의 생활비 공백을\n`
                + `감당할 수 있는 수준으로 보강이 필요합니다.`,
          };
        },
      },
      {
        key: 'surgery',
        cats: ['수술비'],
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
        key: 'daily',
        cats: ['입원일당'],
        test: () => lowItems.some(r => r.cat === '입원일당'),
        build: () => ({
          emoji: '🟠',
          title: '입원 중 생활비 지원금 미가입',
          body: `입원일당 보장이 없어 장기 입원 시 고정 생활비(월세, 공과금 등)가\n`
              + `그대로 지출됩니다.\n`
              + `1일 3만원 수준의 소액 입원일당으로도 실질적인 도움이 됩니다.`,
        }),
      },
      {
        key: 'death',
        cats: ['사망'],
        test: () => lowItems.some(r => r.cat === '사망' && r.label === '질병사망'),
        build: () => ({
          emoji: '🔴',
          title: '질병사망 보험금 미가입',
          body: `질병으로 인한 사망 시 지급되는 보험금이 없습니다.\n`
              + `가족의 생계 유지를 위한 최소 준비금으로 보강을 권장드립니다.`,
        }),
      },
      {
        key: 'driver',
        cats: ['운전자'],
        test: () => lowItems.some(r => r.cat === '운전자'),
        build: () => ({
          emoji: '🟠',
          title: '운전자 보장(벌금·합의금) 미가입',
          body: `교통사고 발생 시 벌금, 합의금, 변호사 선임비용 등을 보장하는\n`
              + `운전자 담보가 미가입 상태입니다.\n`
              + `운전하신다면 적은 보험료로 큰 리스크를 대비할 수 있습니다.`,
        }),
      },
      {
        key: 'dental',
        cats: ['치아'],
        test: () => lowItems.some(r => r.cat === '치아'),
        build: () => ({
          emoji: '🟡',
          title: '치과 치료비(보존·보철) 보장 없음',
          body: `치아 보존·보철 치료 보장이 없습니다.\n`
              + `치과 비급여 비율이 높아 임플란트·크라운 시 1개당 100만원 이상\n`
              + `실비 외 추가 지출이 발생할 수 있습니다.`,
        }),
      },
      {
        key: 'premium',
        cats: [],
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
        key: 'lowPremium',
        cats: [],
        test: () => level.label === '부족' && lowItems.length === 0,
        build: () => ({
          emoji: '🟡',
          title: '보험료 대비 보장 구성 재검토 권장',
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

    // 3개 미만이면 가장 부족 금액이 큰 항목으로 보충
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

    // 그래도 3개 미만이면 placeholder
    while (items.length < 3) {
      items.push({
        emoji: '🟢',
        title: '전반적인 보장 구성 유지',
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

    let opinion = '';
    if (criticalCount >= 2) {
      opinion = `${customerName}님은 현재 월 ${totalPremium.toLocaleString()}원을 납입 중이시지만, `
              + `${catStr} 등 핵심 보장에 다수의 공백이 확인됩니다. `
              + `보험료 부담은 있으나 정작 큰 사고·질환 발생 시 실질 보전이 어려운 구조입니다. `
              + `우선순위가 높은 항목부터 최소 비용으로 채우는 방향으로 상담을 진행해 드리겠습니다.`;
    } else if (level.label === '과다' || level.label === '다소 높음') {
      opinion = `${customerName}님의 총 월납 보험료(${totalPremium.toLocaleString()}원)는 `
              + `${age}세 기준 ${level.label} 수준입니다. `
              + `${catStr.length > 2 ? catStr + ' 보장이 미흡하여 ' : ''}`
              + `비용 대비 보장 효율이 떨어질 수 있습니다. `
              + `중복·불필요 특약을 정리하고 핵심 보장을 보강하는 리모델링 상담을 권장드립니다.`;
    } else if (level.label === '부족') {
      opinion = `${customerName}님은 ${age}세 기준 보험료 납입이 상대적으로 적은 편입니다. `
              + `현재 보장 공백(${catStr})을 소액으로 효율적으로 채울 수 있는 구조가 있어, `
              + `추가 부담을 최소화하면서 핵심 보장을 확보하는 방향으로 안내드리겠습니다.`;
    } else {
      opinion = `${customerName}님은 전반적으로 ${level.label} 수준의 보험료를 납입 중이시나, `
              + `${catStr.length > 2 ? catStr + ' 영역에서 ' : '일부 항목에서 '}`
              + `보장 공백이 발견되었습니다. `
              + `현재 구조를 유지하면서 핵심 공백만 효율적으로 보완하는 방향으로 상담드리겠습니다.`;
    }
    return opinion;
  }

  // ─── [멘트 전체 문자열 생성] ───
  function generateFullMessage(data) {
    const { customerName, age, category, companies, premiums, lowItems } = data;

    const activePremiums = premiums.filter(p => p.active !== false);
    const totalPremium   = activePremiums.reduce((s, p) => s + (p.amount || 0), 0);
    const level          = evaluatePremiumLevel(age, totalPremium);
    const analysisItems  = buildAnalysisItems(lowItems || [], age, totalPremium, level);
    const totalOpinion   = buildTotalOpinion(customerName, age, totalPremium, level, lowItems || [], analysisItems);

    const fmt = (item, idx) =>
      `${idx + 1}. ${item.emoji} ${item.title}\n${item.body.split('\n').map(l => `   ${l}`).join('\n')}`;

    return [
      `안녕하세요 ${customerName}님`,
      `토스 앱을 통해 신청하신 '${category}' 상담을 도와드릴 심현진 어드바이저 입니다.`,
      ``,
      `상담 진행에 앞서 안심하시고 질의응답 하실 수 있도록 당사 명함 함께 첨부해드립니다.`,
      ``,
      `신청해 주신 '${category}' 내용으로 분석한 결과 안내드리겠습니다.`,
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

  // ─── [수정 가능한 HTML 표 렌더링] ───
  // targetEl: 표를 삽입할 DOM 요소
  // msgTargetEl: 멘트를 실시간 반영할 <textarea> DOM 요소
  // data: { customerName, age, category, companies, premiums, lowItems }
  //   premiums 형식: [{ name: '현대해상', amount: 57430, active: true }, ...]
  function renderEditableTable(targetEl, msgTargetEl, data) {
    if (!targetEl) return;

    // 내부 상태 (표 수정 시 동기화)
    const state = {
      customerName: data.customerName || '',
      age:          Number(data.age)  || 0,
      category:     data.category     || '',
      companies:    (data.companies   || []).map(String),
      premiums:     (data.premiums    || []).map(p => ({ ...p })),
      lowItems:     data.lowItems     || [],
    };

    function recalc() {
      // 합계
      const total = state.premiums
        .filter(p => p.active !== false)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      const totalCell = targetEl.querySelector('#rpt2-total-premium');
      if (totalCell) totalCell.textContent = total.toLocaleString() + '원';

      const level = evaluatePremiumLevel(state.age, total);
      const levelCell = targetEl.querySelector('#rpt2-level');
      if (levelCell) {
        levelCell.textContent  = `${level.emoji} ${level.label}`;
        levelCell.className    = `rpt2-level-cell ${level.class}`;
      }

      // 멘트 실시간 반영
      if (msgTargetEl) {
        msgTargetEl.value = generateFullMessage({ ...state, premiums: state.premiums });
      }
    }

    // ── 스타일 주입 ──
    if (!document.getElementById('rpt2-styles')) {
      const s = document.createElement('style');
      s.id = 'rpt2-styles';
      s.textContent = `
#rpt2-wrap{font-family:'Noto Sans KR',sans-serif;font-size:13px;}
#rpt2-table{border-collapse:collapse;width:100%;min-width:480px;}
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
      `;
      document.head.appendChild(s);
    }

    // ── HTML 생성 ──
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
        <table id="rpt2-table">
          <thead>
            <tr>
              <th>가입한 보험사</th>
              <th>월납 보험료</th>
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

    // ── 이벤트 위임 ──
    targetEl.addEventListener('input', function (e) {
      const el  = e.target;
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

    // 금액 입력 시 천단위 콤마 포맷팅
    targetEl.addEventListener('change', function (e) {
      const el = e.target;
      if (el.dataset.field === 'amount') {
        const n = parseFloat(el.value.replace(/,/g, '')) || 0;
        el.value = n.toLocaleString();
      }
    });

    targetEl.addEventListener('click', function (e) {
      // 행 삭제
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        const idx = Number(delBtn.dataset.del);
        state.premiums.splice(idx, 1);
        targetEl.innerHTML = buildHTML();
        // 이벤트는 위임이라 재등록 불필요 (targetEl 자체는 유지됨)
        recalc();
        return;
      }

      // 보험사 추가
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

    // 최초 멘트 렌더링
    recalc();

    // 외부에서 state를 갱신할 수 있도록 공개
    return {
      getState:    () => ({ ...state }),
      setState:    (patch) => { Object.assign(state, patch); targetEl.innerHTML = buildHTML(); recalc(); },
      getMessage:  () => generateFullMessage(state),
      forceRecalc: recalc,
    };
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── 공개 API ───
  window.RptV2 = {
    renderEditableTable,
    generateFullMessage,
    evaluatePremiumLevel,
    buildAnalysisItems,
  };

  // ─── initRptExcelModule 후크: 기존 v1.2 모듈과 연동 ───
  // parseTossExcel 결과(exState)가 준비된 시점에 아래처럼 호출하세요:
  //
  //   const tableEl = document.getElementById('rpt2-table-panel');
  //   const msgEl   = document.getElementById('rptex-msg-output');
  //
  //   const data = {
  //     customerName: exState.customerName,
  //     age:          고객연령,           // 엑셀에 없으면 별도 입력 필드로 수집
  //     category:     신청카테고리,
  //     companies:    exState.companies,
  //     premiums:     exState.companies.map((name, i) => ({
  //                     name,
  //                     amount: 월납보험료배열[i],
  //                     active: true,
  //                   })),
  //     lowItems:     exState.rows.filter(r => r.status === 'low'),
  //   };
  //
  //   window.RptV2.renderEditableTable(tableEl, msgEl, data);

})();