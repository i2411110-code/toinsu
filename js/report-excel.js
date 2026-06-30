// ================================================
// 토스DB 엑셀 보장분석 → 니즈환기 리포트 생성기
// v6.0: AI(Claude) 기반 보장분석 멘트 자동 작성 추가
// ================================================
(function () {

  // ─── 기준금액 (만원) ───
  const RECOMMEND = {
    '질병입원의료비': 5000, '질병외래의료비': 25, '질병처방조제료': 5,
    '상해입원의료비': 5000, '상해외래의료비': 25, '상해처방조제료': 5,
    '일반암진단': 5000, '소액암(유사암)진단': 1000, '고액암진단': 2000,
    '뇌혈관질환진단': 2000, '뇌졸중질환진단': 2000, '뇌출혈질환진단': 1000,
    '허혈성심장질환진단': 2000, '급성심근경색진단': 1000,
    '질병수술': 50, '상해수술': 100, '암수술': 500,
    '뇌혈관질환수술': 1000, '허혈성심장질환수술': 1000,
    '질병입원': 3, '상해입원': 3,
    '질병사망': 5000, '상해사망': 10000,
    '질병80%이상후유장해': 5000, '질병80%미만후유장해': 5000,
    '상해80%이상후유장해': 10000, '상해80%미만후유장해': 10000,
    '골절진단': 100, '화상진단': 100,
    '가족생활배상책임담보': 10000, '일상생활배상책임담보': 10000,
    '교통사고처리지원금': 3000, '벌금(대물)': 2000, '벌금(대인)': 3000,
    '변호사선임비용': 5000, '자동차부상치료비': 3000,
    '화재벌금': 2000, '보존치료': 100, '보철치료': 100,
  };

  // ─── 연령별 보험료 기준 (원) ───
  const PREMIUM_STD = [
    { maxAge: 20, low: 80000,  high: 150000, over: 220000 },
    { maxAge: 30, low: 80000,  high: 150000, over: 220000 },
    { maxAge: 40, low: 100000, high: 200000, over: 300000 },
    { maxAge: 50, low: 150000, high: 280000, over: 420000 },
    { maxAge: 60, low: 200000, high: 350000, over: 520000 },
    { maxAge: 99, low: 250000, high: 430000, over: 650000 },
  ];

  function evalLevel(age, total) {
    const s = PREMIUM_STD.find(r => age <= r.maxAge) || PREMIUM_STD[PREMIUM_STD.length - 1];
    if (total < s.low)   return { label: '부족',     emoji: '🔴', cls: 'lv-low'  };
    if (total <= s.high) return { label: '적정',     emoji: '🟢', cls: 'lv-ok'   };
    if (total <= s.over) return { label: '다소 높음', emoji: '🟠', cls: 'lv-warn' };
    return                     { label: '과다',     emoji: '🔴', cls: 'lv-over' };
  }

  // ─── 규칙 기반 폴백 로직 (AI 호출 실패 시 사용) ───
  function buildItemsFallback(lowItems, age, total, level) {
    var out = [];
    var RULES = [
      { test: function() { return lowItems.some(function(r){ return r.cat === '실비'; }); },
        build: function() {
          var s = lowItems.filter(function(r){ return r.cat === '실비'; }).map(function(r){ return r.label; });
          return { emoji:'🔴', title:'실손의료비(실비) 한도 부족',
            body:'현재 실비 보장 한도가 권장 기준에 미치지 못합니다.\n(부족 항목: ' + s.join(', ') + ')\n실비는 실제 진료비를 직접 돌려받는 항목으로,\n한도 부족 시 자비 부담이 커집니다.' };
        }
      },
      { test: function() { return lowItems.some(function(r){ return r.cat === '3대진단'; }); },
        build: function() {
          var s = lowItems.filter(function(r){ return r.cat === '3대진단'; }).map(function(r){ return r.label; });
          var has = lowItems.find(function(r){ return r.cat === '3대진단' && r.customerSum > 0; });
          return { emoji: has ? '🟠':'🔴', title:'암·뇌·심장 진단비 부족',
            body:'3대 질환 진단비가 권장 기준보다 부족합니다.\n(부족 항목: ' + s.join(', ') + ')\n진단 후 최소 6개월 이상의 생활비 공백을 감당할 수 있는 수준으로 보강이 필요합니다.' };
        }
      },
      { test: function() { return lowItems.some(function(r){ return r.cat === '수술비'; }); },
        build: function() {
          var s = lowItems.filter(function(r){ return r.cat === '수술비'; }).map(function(r){ return r.label; });
          var z = lowItems.filter(function(r){ return r.cat === '수술비'; }).every(function(r){ return r.customerSum === 0; });
          return { emoji: z ? '🔴':'🟠', title: z ? '수술비 전 항목 미가입':'수술비 보장 부족',
            body:'수술비 보장이 부족합니다.\n(부족 항목: ' + s.join(', ') + ')\n수술 1회당 비급여 부담은 평균 100~500만원 수준으로\n실비만으로는 전액 커버가 어렵습니다.' };
        }
      },
      { test: function() { return lowItems.some(function(r){ return r.cat === '입원일당'; }); },
        build: function() { return { emoji:'🟠', title:'입원 중 생활비 지원금 미가입',
          body:'입원일당 보장이 없어 장기 입원 시 고정 생활비가 그대로 지출됩니다.\n1일 3만원 수준의 소액 입원일당으로도 실질적인 도움이 됩니다.' }; }
      },
      { test: function() { return lowItems.some(function(r){ return r.cat === '사망' && r.label === '질병사망'; }); },
        build: function() { return { emoji:'🔴', title:'질병사망 보험금 미가입',
          body:'질병으로 인한 사망 시 지급되는 보험금이 없습니다.\n가족의 생계 유지를 위한 최소 준비금으로 보강을 권장드립니다.' }; }
      },
      { test: function() { return lowItems.some(function(r){ return r.cat === '운전자'; }); },
        build: function() { return { emoji:'🟠', title:'운전자 보장(벌금·합의금) 미가입',
          body:'교통사고 발생 시 벌금·합의금·변호사비용을 보장하는 운전자 담보가 미가입 상태입니다.\n적은 보험료로 큰 리스크를 대비할 수 있습니다.' }; }
      },
      { test: function() { return lowItems.some(function(r){ return r.cat === '치아'; }); },
        build: function() { return { emoji:'🟡', title:'치과 치료비 보장 없음',
          body:'치아 보존·보철 치료 보장이 없습니다.\n임플란트·크라운 시 1개당 100만원 이상 실비 외 추가 지출이 발생할 수 있습니다.' }; }
      },
      { test: function() { return level.label === '과다' || level.label === '다소 높음'; },
        build: function() { return { emoji: level.label==='과다'?'🔴':'🟠',
          title:'월납 보험료 ' + level.label + ' — 비용 효율 점검 필요',
          body:'현재 월 ' + total.toLocaleString() + '원은 ' + age + '세 기준 ' + level.label + ' 수준입니다.\n중복·불필요 특약을 정리하고 핵심 보장을 강화하는 리모델링 상담을 권장드립니다.' }; }
      },
    ];
    for (var i = 0; i < RULES.length; i++) {
      if (out.length >= 3) break;
      if (RULES[i].test()) out.push(RULES[i].build());
    }
    while (out.length < 3) {
      out.push({ emoji:'🟢', title:'전반적인 보장 구성 유지',
        body:'현재 가입된 보험의 갱신 일정과 한도를 주기적으로 확인하여\n변화하는 생활 환경에 맞게 조율해두시는 것을 권장드립니다.' });
    }
    return out;
  }

  function buildOpinionFallback(name, age, total, level, lowItems, items) {
    var cats = [];
    lowItems.forEach(function(r){ if (cats.indexOf(r.cat) === -1) cats.push(r.cat); });
    var catStr = cats.join('·') || '없음';
    var critical = items.filter(function(i){ return i.emoji === '🔴'; }).length;
    if (critical >= 2)
      return name + '님은 현재 월 ' + total.toLocaleString() + '원을 납입 중이시지만, ' + catStr + ' 등 핵심 보장에 다수의 공백이 확인됩니다. 보험료 부담은 있으나 정작 큰 사고·질환 발생 시 실질 보전이 어려운 구조입니다. 우선순위가 높은 항목부터 최소 비용으로 채우는 방향으로 상담을 진행해 드리겠습니다.';
    if (level.label === '과다' || level.label === '다소 높음')
      return name + '님의 총 월납 보험료(' + total.toLocaleString() + '원)는 ' + age + '세 기준 ' + level.label + ' 수준입니다. ' + (catStr.length > 2 ? catStr + ' 보장이 미흡하여 ' : '') + '비용 대비 보장 효율이 떨어질 수 있습니다. 중복·불필요 특약을 정리하고 핵심 보장을 보강하는 리모델링 상담을 권장드립니다.';
    if (level.label === '부족')
      return name + '님은 ' + age + '세 기준 보험료 납입이 상대적으로 적은 편입니다. 현재 보장 공백(' + catStr + ')을 소액으로 효율적으로 채울 수 있는 구조가 있어, 추가 부담을 최소화하면서 핵심 보장을 확보하는 방향으로 안내드리겠습니다.';
    return name + '님은 전반적으로 ' + level.label + ' 수준의 보험료를 납입 중이시나, ' + (catStr.length > 2 ? catStr + ' 영역에서 ' : '일부 항목에서 ') + '보장 공백이 발견되었습니다. 현재 구조를 유지하면서 핵심 공백만 효율적으로 보완하는 방향으로 상담드리겠습니다.';
  }

  // ─── AI 멘트 작성 가이드 ───
  var AI_SYSTEM_PROMPT = [
    '당신은 보험 어드바이저(심현진)를 보조해 고객에게 보낼 카카오톡 보장분석 멘트의 핵심 부분을 작성하는 전문 작성자입니다.',
    '전달받은 고객 보장 데이터(JSON)를 분석하여, 반드시 아래 JSON 형식으로만 응답하세요.',
    'JSON 외 설명, 인사말, 코드블록(```) 절대 포함 금지.',
    '',
    '응답 형식 (정확히 이 구조):',
    '{"items":[{"emoji":"이모지","title":"제목","body":"내용"}, ...3개],"opinion":"종합의견"}',
    '',
    '[ items 작성 규칙 ]',
    '1. 부족항목 중 권장기준 대비 부족 정도가 큰 순서로 3개 선정.',
    '   부족항목이 3개 미만이면 보험료 과다/적정 점검 또는 유지 권장 항목으로 채움.',
    '2. emoji 기준:',
    '   🔴 미가입이거나 권장기준 대비 50% 미만 → 매우 위험',
    '   🟠 권장기준 대비 50~80% 수준 → 다소 부족',
    '   🟡 권장기준 대비 80~99% 수준 → 경미한 보완 필요',
    '   🟢 권장기준 이상 또는 유지 권장 → 양호',
    '3. title: "방패·보호막·울타리" 같은 추상적 비유 절대 금지.',
    '   고객이 바로 이해할 수 있는 보장 명칭 사용.',
    '   예) "암 진단비 부족", "실손의료비 한도 부족", "수술비 미가입", "월 보험료 과다"',
    '4. body: 2~3문장, 간결하게.',
    '   - 무조건적 칭찬 금지. 보완이 필요한 이유를 데이터 근거로 제시.',
    '   - 고객이 추가 상담을 받고 싶어지도록 자연스럽게 궁금증 유발.',
    '   - 단정적 의학·법률 주장 금지, 일반적 안내 수준으로 작성.',
    '   - 띄어쓰기 활용해 가독성 있게.',
    '',
    '[ opinion 작성 규칙 ]',
    '5. items 3개와 보험료 수준을 종합한 2~4문장 총평.',
    '   보험료 수준(부족/적정/다소높음/과다)과 보장 공백을 함께 언급.',
    '   마지막 문장은 추가 상담 필요성으로 자연스럽게 연결.',
    '',
    '[ 공통 규칙 ]',
    '6. 모든 문장 한국어 존댓말.',
    '7. 숫자·사실은 반드시 전달받은 데이터 기반. 데이터에 없는 내용 임의 추가 금지.',
  ].join('\n');

  function buildAIPayload() {
    var rows = exState.rows || [];
    var lowItems = rows.filter(function(r){ return r.status === 'low'; });
    var okItems  = rows.filter(function(r){ return r.status === 'ok'; });
    var total = gState.premiums.reduce(function(s,p){ return s+(p.amount||0); }, 0);
    var level = evalLevel(gState.age || 40, total);
    return {
      고객나이: gState.age || 40,
      상담카테고리: gState.category || '보험 점검',
      월납보험료합계_원: total,
      연령대비보험료수준: level.label,
      부족항목: lowItems.map(function(r){
        return { 대분류: r.cat, 소분류: r.label, 고객보장합산_만원: r.customerSum, 권장기준_만원: r.recommend };
      }),
      적정항목: okItems.map(function(r){ return { 대분류: r.cat, 소분류: r.label }; }),
    };
  }

  // ─── 백엔드 프록시 엔드포인트 ───
  // 실제 Gemini API 키는 서버(GEMINI_API_KEY 환경변수)에만 보관되고,
  // 프론트엔드는 이 엔드포인트로만 요청을 보냅니다. 경로는 운영 환경에 맞게 수정하세요.
  var AI_PROXY_ENDPOINT = '/api/generate-message';

  // ─── AI 호출 + 결과를 textarea에 반영 (백엔드 프록시 경유) ───
  window.rptExGenerateAIMessage = async function() {
    if (!gState) return;
    var btn = document.getElementById('rptex-ai-gen-btn');
    var ta  = document.getElementById('rptex-msg-output');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-stars"></i> AI 분석 중...'; }
    if (ta) ta.value = '🤖 AI가 보장분석 데이터를 검토해 멘트를 작성하고 있습니다...';

    try {
      var payload = buildAIPayload();
      var fullPrompt = AI_SYSTEM_PROMPT + '\n\n고객 보장 데이터:\n' + JSON.stringify(payload);

      var resp = await fetch(AI_PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          responseFormat: 'json',
        }),
      });

      if (!resp.ok) {
        var errBody = await resp.text();
        throw new Error('서버 응답 오류 (' + resp.status + '): ' + errBody);
      }

      // report-excel.js - rptExGenerateAIMessage 함수 내부 수정
var data = await resp.json();
if (data.error) throw new Error(data.error);
if (!data.text) throw new Error('응답에서 텍스트를 찾을 수 없습니다.');

// 백틱 코드 블록이 포함되어 있든, 순수 JSON이든 모두 처리할 수 있는 정규식으로 방어형 코드 작성
var clean = String(data.text);
if (clean.includes('```')) {
  clean = clean.replace(/```json|```/g, '').trim();
} else {
  clean = clean.trim();
}

var parsed = JSON.parse(clean);
      if (!parsed.items || parsed.items.length < 1 || !parsed.opinion) throw new Error('AI 응답 형식 오류');
      gState.aiContent = parsed;
    } catch (err) {
      console.error('AI 멘트 생성 실패 — 기본 로직으로 대체합니다.', err);
      gState.aiContent = null; // makeMsg에서 자동으로 폴백 로직 사용
    }

    clearInterval(loadingInterval);
    var loadingEl2 = document.getElementById('rptex-ai-loading');
    if (loadingEl2) loadingEl2.style.display = 'none';
    var ta2 = document.getElementById('rptex-msg-output');
    if (ta2) ta2.style.display = '';
    clearInterval(loadingInterval);
    var loadingEl2 = document.getElementById('rptex-ai-loading');
    if (loadingEl2) loadingEl2.style.display = 'none';
    var ta2 = document.getElementById('rptex-msg-output');
    if (ta2) ta2.style.display = '';
    refreshMsg();
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-stars"></i> AI 멘트 재생성'; }
  };

  // ─── 로그인한 어드바이저 이름 가져오기 ───
  function getCurrentAdvisorName() {
    // app.js에서 로그인 후 window.currentUserDisplayName에 저장됨
    if (window.currentUserDisplayName && window.currentUserDisplayName.trim()) {
      return window.currentUserDisplayName.trim();
    }
    // 폴백: #main-user-name DOM 텍스트 (끝에 '님' 제거)
    var el = document.getElementById('main-user-name');
    if (el) {
      var name = el.textContent.replace(/님$/, '').trim();
      if (name && name !== '설계사') return name;
    }
    return '어드바이저';
  }

  function makeMsg(state) {
    var name     = state.customerName || '고객';
    var age      = state.age || 40;
    var category = state.category || '보험 점검';
    var advisorName = getCurrentAdvisorName();
    var premiums = state.premiums || [];
    var lowItems = state.lowItems || [];
    var total    = premiums.reduce(function(s, p){ return s + (p.amount || 0); }, 0);
    var level    = evalLevel(age, total);

    var items, opinion;
    if (state.aiContent && Array.isArray(state.aiContent.items) && state.aiContent.items.length) {
      items = state.aiContent.items;
      opinion = state.aiContent.opinion || '';
    } else {
      items = buildItemsFallback(lowItems, age, total, level);
      opinion = buildOpinionFallback(name, age, total, level, lowItems, items);
    }

    var lines = [];
    lines.push('안녕하세요 ' + name + '님');
    // 💡 고정된 '심현진' 대신 advisorName 변수를 사용하도록 안전하게 수정
    lines.push('토스 앱을 통해 신청하신 \'' + category + '\' 상담을 도와드릴 ' + advisorName + ' 어드바이저 입니다.');
    lines.push('');
    lines.push('상담 진행에 앞서 안심하시고 질의응답 하실 수 있도록 당사 명함 함께 첨부해드립니다.');
    lines.push('');
    lines.push('신청해 주신 \'' + category + '\' 내용으로 분석한 결과 안내드리겠습니다.');
    lines.push('');
    lines.push('[ 보장 분석 ]');
    items.forEach(function(it, i) {
      lines.push((i+1) + '. ' + it.emoji + ' ' + it.title);
      String(it.body || '').split('\n').forEach(function(l){ lines.push('   ' + l); });
      if (i < items.length - 1) lines.push('');
    });
    lines.push('');
    lines.push('💡 어드바이저의 종합 분석 의견');
    lines.push(opinion);
    lines.push('');
    lines.push('✅ ' + name + '님의 편의에 맞춰 카카오톡, 전화, 대면 상담 중 선택하실 수 있습니다.');
    lines.push('✅ 상담은 신청하신 순서대로 진행되나, 최대한 원하시는 일정에 맞춰 조율해 드립니다.');
    lines.push('✅ 궁금하신 점이나 상담 희망 시간을 회신 주시면 바로 확인하겠습니다.');
    lines.push('');
    lines.push('감사합니다.');
    return lines.join('\n');
  }

  // ─── 내부 상태 ───
  var exState = { customerName: '', companies: [], rows: [], premiumAmounts: [] };
  var gState  = null;

  function loadScript(src) {
    return new Promise(function(res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  window.initRptExcelModule = function () {
    var panel = document.getElementById('rpt-mode-excel-panel');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = '1';
    panel.innerHTML = getHTML();
    injectStyles();
    bindDrop();
  };

  function getHTML() {
    return '<div class="rpt-card">'
      + '<div class="rpt-step-label">STEP 1</div>'
      + '<h3 class="rpt-step-title">토스DB 보장분석 엑셀 업로드</h3>'
      + '<p class="rpt-step-desc">고객의 "OOO님의 보장분석 리포트.xlsx" 파일을 업로드하세요.<br><span style="color:#64748B;font-size:12px;">📌 보험료 행이 자동으로 파싱됩니다.</span></p>'
      + '<label id="rptex-drop" class="rptex-drop" for="rptex-file-input">'
      + '<i class="bi bi-file-earmark-excel" style="font-size:28px;color:#3182F6;"></i>'
      + '<span id="rptex-drop-text">클릭하거나 파일을 끌어다 놓으세요 (.xlsx)</span>'
      + '<input type="file" id="rptex-file-input" accept=".xlsx" style="display:none;" onchange="window.rptExHandleFile(this.files[0])">'
      + '</label>'
      + '<div id="rptex-error-box" style="display:none;margin-top:12px;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#DC2626;font-size:13px;">'
      + '<i class="bi bi-exclamation-circle-fill"></i> <span id="rptex-error-msg"></span></div>'
      + '</div>'

      + '<div id="rptex-result" style="display:none;">'
      + '<div class="rpt-card">'
      + '<div class="rpt-step-label">STEP 2</div>'
      + '<h3 class="rpt-step-title">보장 분석 결과</h3>'
      + '<p class="rpt-step-desc" id="rptex-summary" style="color:#3182F6;font-weight:600;"></p>'

      + '<div class="rptex-meta-row">'
      + '<div class="rptex-meta-item"><label class="rptex-meta-label">고객 나이</label>'
      + '<input type="number" id="rptex-age" class="rptex-meta-input" value="40" min="1" max="99" style="width:70px;"></div>'
      + '<div class="rptex-meta-item"><label class="rptex-meta-label">상담 카테고리</label>'
      + '<input type="text" id="rptex-category" class="rptex-meta-input" value="보험 점검" style="width:160px;"></div>'
      + '</div>'

      /* ── 통합 분석표 ── */
      + '<p style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">'
      + '📊 보장 분석표 '
      + '<span style="font-weight:400;color:#94A3B8;font-size:11px;">— 상태 클릭: 적정↔부족 전환 · 합산금액 클릭: 직접 수정 · 보험료: 클릭하여 수정</span></p>'
      + '<div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;margin-bottom:4px;"><div id="rptex-table"></div></div>'
      + '<p style="font-size:11px;color:#94A3B8;margin-bottom:16px;">💡 분석표 이미지 복사 후 카카오톡에 바로 붙여넣기 하세요. (이미지는 보기 좋게 별도로 재구성되어 생성됩니다)</p>'

      /* ── 보험료 수동 추가 ── */
      + '<div style="border:1.5px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:16px;">'
      + '<div style="background:#001E42;color:#fff;padding:10px 14px;font-size:13px;font-weight:700;">💰 보험사별 월납 보험료 <span style="font-size:11px;font-weight:400;opacity:.8;">(엑셀 자동 파싱 · 직접 수정 가능)</span></div>'
      + '<div style="padding:14px;">'
      + '<table style="border-collapse:collapse;width:100%;font-size:13px;">'
      + '<thead><tr>'
      + '<th style="background:#F1F5F9;padding:8px 12px;text-align:left;border:1px solid #E2E8F0;font-weight:700;color:#334155;">보험사</th>'
      + '<th style="background:#F1F5F9;padding:8px 12px;text-align:right;border:1px solid #E2E8F0;font-weight:700;color:#334155;">월납 보험료 (원)</th>'
      + '</tr></thead>'
      + '<tbody id="rptex-premium-tbody"></tbody>'
      + '<tfoot>'
      + '<tr><td style="background:#EFF6FF;padding:9px 12px;border:1px solid #E2E8F0;font-weight:700;color:#001E42;">합계</td>'
      + '<td id="rptex-premium-total" style="background:#EFF6FF;padding:9px 12px;border:1px solid #E2E8F0;font-weight:700;color:#001E42;text-align:right;">0원</td></tr>'
      + '<tr><td style="background:#F8FAFC;padding:9px 12px;border:1px solid #E2E8F0;font-weight:700;color:#334155;">연령 대비 수준</td>'
      + '<td id="rptex-premium-level" style="background:#F8FAFC;padding:9px 12px;border:1px solid #E2E8F0;font-weight:800;text-align:center;"></td></tr>'
      + '</tfoot></table>'
      + '<button class="rptex-add-co-btn" onclick="window.rptExAddCompany()">+ 보험사 추가</button>'
      + '</div></div>'

      + '<p style="font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">📋 니즈환기 멘트 <span style="font-weight:400;color:#94A3B8;font-size:11px;">— 🤖 AI가 보장분석 데이터를 보고 직접 작성합니다. 나이/카테고리/보험료 수정 후 재생성 버튼을 눌러주세요.</span></p>'
      + '<textarea id="rptex-msg-output" style="width:100%;height:300px;border:1.5px solid #E2E8F0;border-radius:10px;padding:14px;font-size:13px;font-family:\'Noto Sans KR\',sans-serif;color:#334155;resize:vertical;box-sizing:border-box;line-height:1.7;background:#F8FAFC;"></textarea>'

      + '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">'
      + '<button class="btn-action" style="width:auto;padding:10px 22px;background:#7C3AED;" id="rptex-ai-gen-btn" onclick="window.rptExGenerateAIMessage()"><i class="bi bi-stars"></i> AI 멘트 재생성</button>'
      + '<button class="btn-action" style="width:auto;padding:10px 22px;" onclick="window.rptExCopyMsg()"><i class="bi bi-clipboard-check"></i> 멘트 복사</button>'
      + '<button class="btn-action" style="width:auto;padding:10px 22px;background:#0F172A;" id="rptex-img-copy-btn" onclick="window.rptExCopyTableImage()"><i class="bi bi-image"></i> 분석표 이미지 복사</button>'
      + '<button style="background:none;border:1px solid #E2E8F0;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;color:#475569;font-family:\'Noto Sans KR\',sans-serif;" onclick="window.rptExReset()"><i class="bi bi-arrow-counterclockwise"></i> 다시 시작</button>'
      + '</div>'
      + '</div></div>';
  }

  function injectStyles() {
    if (document.getElementById('rptex-styles')) return;
    var s = document.createElement('style');
    s.id = 'rptex-styles';
    s.textContent = [
      '.rptex-drop{display:flex;flex-direction:column;align-items:center;gap:10px;border:2px dashed #BAD7FB;border-radius:14px;padding:34px 20px;cursor:pointer;background:#F8FBFF;transition:all .15s;text-align:center;}',
      '.rptex-drop:hover,.rptex-drop.dragover{background:#EFF6FF;border-color:#3182F6;}',
      '#rptex-drop-text{font-size:13px;color:#64748B;font-weight:600;}',
      '#rptex-table table{border-collapse:collapse;font-size:12px;font-family:"Noto Sans KR",sans-serif;width:100%;min-width:500px;}',
      '#rptex-table th,#rptex-table td{border:1px solid #CBD5E1;padding:7px 10px;text-align:center;white-space:nowrap;}',
      '#rptex-table th{background:#001E42;color:#fff;font-weight:700;border-color:#001E42;}',
      '.rptex-cat{background:#D6DEE7;font-weight:700;color:#001E42;}',
      '.rptex-label{text-align:left;font-weight:600;color:#334155;min-width:120px;}',
      /* 보험료 행 */
      '.rptex-premium-row td{background:#EFF6FF;font-weight:700;color:#001E42;border-color:#C7D9F5;}',
      '.rptex-premium-row .rptex-cat{background:#C7D9F5;color:#001E42;}',
      '.rptex-prem-editable{cursor:text;min-width:60px;}',
      '.rptex-prem-editable:hover{outline:1px dashed #3182F6;border-radius:3px;background:rgba(49,130,246,.06);}',
      '.rptex-prem-editable:focus{outline:2px solid #3182F6;border-radius:3px;background:#fff;}',
      /* 상태 뱃지 */
      '.rptex-status{font-weight:800;border-radius:6px;padding:2px 9px;font-size:11px;display:inline-block;cursor:pointer;user-select:none;transition:opacity .1s;}',
      '.rptex-status:hover{opacity:0.75;}',
      '.rptex-status.ok{background:#EFF6FF;color:#3182F6;}',
      '.rptex-status.low{background:#FEF2F2;color:#DC2626;}',
      '.rptex-status.none{background:#F1F5F9;color:#64748B;cursor:default;}',
      '.rptex-amt-low{color:#DC2626!important;font-weight:800;background:#FEF2F2!important;}',
      '.rptex-editable-cell{cursor:text;}',
      '.rptex-editable-cell:hover{outline:1px dashed #3182F6;border-radius:3px;background:rgba(49,130,246,.06);}',
      '.rptex-editable-cell:focus{outline:2px solid #3182F6;border-radius:3px;background:#fff;}',
      '#rptex-premium-tbody td{border:1px solid #E2E8F0;padding:8px 12px;}',
      '.rptex-premium-input{width:100%;border:none;background:transparent;font-size:13px;font-family:"Noto Sans KR",sans-serif;color:#334155;outline:none;text-align:right;}',
      '.rptex-premium-input:focus{background:#EFF6FF;border-radius:4px;}',
      '.rptex-del-btn{border:none;background:none;cursor:pointer;color:#CBD5E1;font-size:16px;padding:0 4px;transition:color .15s;}',
      '.rptex-del-btn:hover{color:#DC2626;}',
      '.rptex-add-co-btn{margin-top:10px;padding:7px 16px;border:1.5px dashed #BAD7FB;border-radius:8px;background:#F8FBFF;color:#3182F6;font-size:12px;cursor:pointer;font-weight:600;font-family:"Noto Sans KR",sans-serif;}',
      '.rptex-add-co-btn:hover{background:#EFF6FF;}',
      '.rptex-meta-row{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}',
      '.rptex-meta-item{display:flex;align-items:center;gap:8px;}',
      '.rptex-meta-label{font-size:13px;font-weight:700;color:#334155;white-space:nowrap;}',
      '.rptex-meta-input{padding:7px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:"Noto Sans KR",sans-serif;outline:none;}',
      '.rptex-meta-input:focus{border-color:#3182F6;}',
      '.lv-ok{color:#16A34A;} .lv-warn{color:#D97706;} .lv-over{color:#DC2626;} .lv-low{color:#DC2626;}',
      '.rptex-ai-dots{display:flex;gap:8px;align-items:center;}',
      '.rptex-ai-dots span{width:10px;height:10px;border-radius:50%;background:#3182F6;animation:rptex-bounce 1.2s infinite ease-in-out;}',
      '.rptex-ai-dots span:nth-child(1){animation-delay:0s;}',
      '.rptex-ai-dots span:nth-child(2){animation-delay:0.2s;}',
      '.rptex-ai-dots span:nth-child(3){animation-delay:0.4s;}',
      '@keyframes rptex-bounce{0%,80%,100%{transform:scale(0.6);opacity:.4;}40%{transform:scale(1.1);opacity:1;}}',
      '.rptex-ai-dots{display:flex;gap:8px;align-items:center;}',
      '.rptex-ai-dots span{width:10px;height:10px;border-radius:50%;background:#3182F6;animation:rptex-bounce 1.2s infinite ease-in-out;}',
      '.rptex-ai-dots span:nth-child(1){animation-delay:0s;}',
      '.rptex-ai-dots span:nth-child(2){animation-delay:0.2s;}',
      '.rptex-ai-dots span:nth-child(3){animation-delay:0.4s;}',
      '@keyframes rptex-bounce{0%,80%,100%{transform:scale(0.6);opacity:.4;}40%{transform:scale(1.1);opacity:1;}}',
    ].join('');
    document.head.appendChild(s);
  }

  function bindDrop() {
    var panel = document.getElementById('rpt-mode-excel-panel');
    if (!panel) return;
    panel.addEventListener('dragover', function(e) { e.preventDefault(); var d = document.getElementById('rptex-drop'); if(d) d.classList.add('dragover'); });
    panel.addEventListener('dragleave', function() { var d = document.getElementById('rptex-drop'); if(d) d.classList.remove('dragover'); });
    panel.addEventListener('drop', function(e) {
      e.preventDefault();
      var d = document.getElementById('rptex-drop'); if(d) d.classList.remove('dragover');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) window.rptExHandleFile(f);
    });
  }

  function showError(msg) { var b = document.getElementById('rptex-error-box'); if(b){ document.getElementById('rptex-error-msg').textContent = msg; b.style.display='block'; } }
  function hideError()    { var b = document.getElementById('rptex-error-box'); if(b) b.style.display='none'; }

  window.rptExHandleFile = async function(file) {
    hideError();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) { showError('.xlsx 파일만 업로드 가능합니다.'); return; }
    var dropText = document.getElementById('rptex-drop-text');
    if (dropText) dropText.textContent = '분석 중... (' + file.name + ')';
    try {
      if (!window.XLSX) await loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js');
      var buf  = await file.arrayBuffer();
      var wb   = XLSX.read(buf, { type:'array' });
      var ws   = wb.Sheets[wb.SheetNames[0]];
      var aoa  = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      var parsed = parseToss(aoa);
      if (!parsed.rows.length) {
        showError('보장 항목을 찾을 수 없습니다. 토스 보장분석 리포트 양식인지 확인해주세요.');
        if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
        return;
      }
      exState = parsed;
      render();
      if (dropText) dropText.textContent = '✅ ' + file.name + ' 분석 완료';
    } catch(err) {
      console.error(err);
      showError('파일 읽기 오류: ' + err.message);
      if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    }
  };

  // ─── parseToss: 보험료 행 자동 파싱 (절대 행번호 의존 제거) ───
  function parseToss(aoa) {
    var customerName = '';
    var found = false;
    for (var r = 0; r < Math.min(aoa.length, 5) && !found; r++) {
      for (var c = 0; c < (aoa[r]||[]).length; c++) {
        var m = String(aoa[r][c]||'').match(/^(.+?)님/);
        if (m) { customerName = m[1].trim(); found = true; break; }
      }
    }

    var companies = [], rows = [], currentCat = null, headerSeen = false;
    var catCol = -1, subCol = -1, amtCol = -1, coStart = -1;
    var premiumAmounts = [];

    // 행 전체(어느 셀이든)에서 보험료 관련 키워드 탐지
    function rowHasPremiumKeyword(row) {
      for (var i = 0; i < row.length; i++) {
        var v = String(row[i] || '').replace(/\s/g, '');
        if (/보험료|월납|월보험료|합계보험료|총보험료/.test(v)) return true;
      }
      return false;
    }

    for (var ri = 0; ri < aoa.length; ri++) {
      var row = aoa[ri] || [];

      if (!headerSeen) {
        for (var ci = 0; ci < row.length - 1; ci++) {
          if (String(row[ci]||'').trim() === '대분류' && String(row[ci+1]||'').trim() === '소분류') {
            headerSeen = true;
            catCol = ci; subCol = ci+1; amtCol = ci+2; coStart = ci+3;
            for (var cc = coStart; cc < row.length; cc++) {
              var n = String(row[cc]||'').trim(); if (n) companies.push(n);
            }
            break;
          }
        }
        continue;
      }

      // 헤더 이후 모든 행 대상으로 보험료 행 탐지 (행 번호에 의존하지 않음)
      if (companies.length > 0 && premiumAmounts.length === 0 && rowHasPremiumKeyword(row)) {
        for (var pc2 = coStart; pc2 < coStart + companies.length; pc2++) {
          var pv = String(row[pc2]||'').replace(/,/g,'').trim();
          var pn = parseFloat(pv) || 0;
          premiumAmounts.push(pn);
        }
        continue; // 보험료 행은 보장 항목 목록에서 제외
      }

      var catVal = String(row[catCol]||'').trim();
      var subVal = String(row[subCol]||'').trim();

      // 엑셀 중간에 헤더 행("대분류"/"소분류")이 반복되는 경우 건너뛰기
      if (catVal === '대분류' && subVal === '소분류') continue;

      var b = catVal;
      var lbl = subVal;
      if (b) currentCat = b;
      if (!lbl) continue;
      var sum = pMan(row[amtCol]);
      var per = [];
      for (var pc = coStart; pc < coStart + companies.length; pc++) per.push(pMan(row[pc]));
      var rec = RECOMMEND[lbl];
      rows.push({ cat: currentCat, label: lbl, customerSum: sum, recommend: rec,
        status: rec === undefined ? 'none' : sum >= rec ? 'ok' : 'low', perProduct: per });
    }

    // 폴백: 위 로직으로 보험료를 못 찾았을 경우, 시트 전체를 한 번 더 훑어서
    // "보험료"라는 단어가 포함된 행을 모두 검사 (헤더 발견 전이라도 탐지)
    if (companies.length > 0 && premiumAmounts.length === 0) {
      for (var ri2 = 0; ri2 < aoa.length; ri2++) {
        var row2 = aoa[ri2] || [];
        if (rowHasPremiumKeyword(row2)) {
          var tmp = [];
          for (var pc3 = coStart; pc3 < coStart + companies.length; pc3++) {
            var pv2 = String(row2[pc3]||'').replace(/,/g,'').trim();
            tmp.push(parseFloat(pv2) || 0);
          }
          if (tmp.some(function(v){ return v > 0; })) { premiumAmounts = tmp; break; }
        }
      }
    }

    return { customerName: customerName, companies: companies, rows: rows, premiumAmounts: premiumAmounts };
  }

  function pMan(v) {
    if (v == null) return 0;
    var s = String(v).replace(/,/g, '').trim();
    if (!s || s === '-') return 0;
    var n = parseFloat(s); return isNaN(n) ? 0 : n;
  }

  function render() {
    var rows = exState.rows, companies = exState.companies, customerName = exState.customerName;
    var premiumAmounts = exState.premiumAmounts || [];
    var lowItems  = rows.filter(function(r){ return r.status === 'low'; });
    var noneCount = rows.filter(function(r){ return r.status === 'none'; }).length;

    document.getElementById('rptex-result').style.display = 'block';

    var parsedMsg = premiumAmounts.length > 0
      ? ' · 보험료 ' + premiumAmounts.length + '건 자동 파싱됨'
      : ' · 보험료 수동 입력 필요';
    document.getElementById('rptex-summary').textContent =
      '✅ 총 ' + rows.length + '개 항목 중 ' + lowItems.length + '개 부족 항목 발견' +
      (noneCount ? ' (기준 미설정 ' + noneCount + '개)' : '') + parsedMsg;

    var ageEl0 = document.getElementById('rptex-age');
    var catEl0 = document.getElementById('rptex-category');
    gState = {
      customerName: customerName || '고객',
      age: Number((ageEl0 && ageEl0.value) || 40) || 40,
      category: (catEl0 && catEl0.value) || '보험 점검',
      premiums: companies.map(function(name, i){
        return { name: name, amount: premiumAmounts[i] || 0 };
      }),
      lowItems: lowItems,
      aiContent: null, // AI가 생성한 {items, opinion}; 없으면 폴백 로직 사용
    };

    renderAnalysisTable();
    renderPremiumTable();

    var ageEl = document.getElementById('rptex-age');
    var catEl = document.getElementById('rptex-category');
    if (ageEl) ageEl.addEventListener('input', function() {
      gState.age = Number(this.value) || 40;
      refreshPremiumSummary(); refreshAnalysisPremiumRow(); refreshMsg();
    });
    if (catEl) catEl.addEventListener('input', function() { gState.category = this.value; refreshMsg(); });

    // 업로드 완료 직후 AI 멘트 1차 자동 생성
    window.rptExGenerateAIMessage();
  }

  // ─── 분석표 렌더 (보험료 행 포함, 편집용 인터랙티브 테이블) ───
  function renderAnalysisTable() {
    var rows = exState.rows;
    var companies = exState.companies;

    var spans = {}, last = null, si = 0;
    rows.forEach(function(r, i) {
      if (r.cat !== last) { if (last !== null) spans[si] = i - si; last = r.cat; si = i; }
    });
    if (last !== null) spans[si] = rows.length - si;

    var total = gState.premiums.reduce(function(s,p){ return s+(p.amount||0); }, 0);
    var level = evalLevel(gState.age || 40, total);

    var html = '<table id="rptex-analysis-table"><thead><tr>'
      + '<th>대분류</th><th>소분류</th>'
      + '<th>고객 보장합산<br>(만원)</th>'
      + '<th>권장 기준<br>(만원)</th>'
      + '<th>상태</th>';
    companies.forEach(function(c){ html += '<th style="font-size:10px;color:#FBBF24;">' + esc(c) + '</th>'; });
    html += '</tr></thead><tbody>';

    // ── 보험료 행 (편집 가능) ──
    html += '<tr class="rptex-premium-row" id="rptex-prem-row">'
      + '<td class="rptex-cat">💰 월납보험료</td>'
      + '<td style="text-align:left;font-weight:700;">보험사별 합계</td>'
      + '<td colspan="2" id="rptex-prem-total-cell" style="font-weight:800;color:#001E42;">' + total.toLocaleString() + '원</td>'
      + '<td id="rptex-prem-level-cell" style="font-weight:800;">' + level.emoji + ' ' + level.label + '</td>';
    companies.forEach(function(c, ci) {
      var amt = (gState.premiums[ci] && gState.premiums[ci].amount) ? gState.premiums[ci].amount : 0;
      html += '<td class="rptex-prem-editable" id="rptex-prem-co-' + ci + '"'
            + ' contenteditable="true" spellcheck="false"'
            + ' onblur="window.rptExPremCellEdit(this,' + ci + ')">'
            + (amt ? amt.toLocaleString() : '-') + '</td>';
    });
    html += '</tr>';

    // ── 보장 항목 행 ──
    rows.forEach(function(r, i) {
      html += '<tr>';
      if (spans[i] !== undefined) {
        html += '<td class="rptex-cat" rowspan="' + spans[i] + '">' + esc(r.cat) + '</td>';
      }
      var amtCls = r.status === 'low' ? 'rptex-amt-low' : '';
      var stLbl  = r.status === 'ok' ? '적정' : r.status === 'low' ? '부족' : '기준없음';
      var stCls  = r.status === 'ok' ? 'ok' : r.status === 'low' ? 'low' : 'none';
      var toggleAttr = r.status !== 'none' ? ' onclick="window.rptExToggleStatus(' + i + ')"' : '';
      html += '<td class="rptex-label">' + esc(r.label) + '</td>';
      html += '<td class="rptex-editable-cell ' + amtCls + '" id="rptex-amt-' + i + '"'
            + ' contenteditable="true" spellcheck="false"'
            + ' onblur="window.rptExCellEdit(this,' + i + ')">'
            + (r.customerSum || '-') + '</td>';
      html += '<td>' + (r.recommend !== undefined ? r.recommend.toLocaleString() : '-') + '</td>';
      html += '<td><span class="rptex-status ' + stCls + '" id="rptex-st-' + i + '"' + toggleAttr + '>' + stLbl + '</span></td>';
      r.perProduct.forEach(function(v){ html += '<td>' + (v ? v.toLocaleString() : '-') + '</td>'; });
      html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('rptex-table').innerHTML = html;
  }

  // 표 안 보험료 셀 직접 편집
  window.rptExPremCellEdit = function(el, ci) {
    var raw = el.innerText.replace(/,/g,'').replace(/원/g,'').trim();
    var val = parseFloat(raw) || 0;
    if (gState.premiums[ci]) gState.premiums[ci].amount = val;
    el.innerText = val ? val.toLocaleString() : '-';
    // 하단 입력 패널 동기화
    var inputs = document.querySelectorAll('#rptex-premium-tbody input[data-field="amount"]');
    if (inputs[ci]) inputs[ci].value = val ? val.toLocaleString() : '';
    refreshPremiumSummary();
    refreshAnalysisPremiumRow();
    refreshMsg();
  };

  // 보험료 요약 행 갱신
  function refreshAnalysisPremiumRow() {
    if (!gState) return;
    var total = gState.premiums.reduce(function(s,p){ return s+(p.amount||0); }, 0);
    var level = evalLevel(gState.age || 40, total);
    var tc = document.getElementById('rptex-prem-total-cell');
    if (tc) tc.textContent = total.toLocaleString() + '원';
    var lc = document.getElementById('rptex-prem-level-cell');
    if (lc) lc.textContent = level.emoji + ' ' + level.label;
    gState.premiums.forEach(function(p, ci) {
      var el = document.getElementById('rptex-prem-co-' + ci);
      if (el && document.activeElement !== el) el.textContent = p.amount ? p.amount.toLocaleString() : '-';
    });
  }

  // ─── 상태 토글 ───
  window.rptExToggleStatus = function(rowIdx) {
    var r = exState.rows[rowIdx];
    if (r.status === 'none') return;
    r.status = r.status === 'ok' ? 'low' : 'ok';
    var stEl = document.getElementById('rptex-st-' + rowIdx);
    if (stEl) { stEl.className = 'rptex-status ' + (r.status === 'ok' ? 'ok' : 'low'); stEl.textContent = r.status === 'ok' ? '적정' : '부족'; }
    var amtEl = document.getElementById('rptex-amt-' + rowIdx);
    if (amtEl) amtEl.className = 'rptex-editable-cell' + (r.status === 'low' ? ' rptex-amt-low' : '');
    gState.lowItems = exState.rows.filter(function(r){ return r.status === 'low'; });
    refreshMsg();
  };

  window.rptExCellEdit = function(el, rowIdx) {
    var raw = el.innerText.replace(/,/g,'').trim();
    var val = parseFloat(raw) || 0;
    exState.rows[rowIdx].customerSum = val;
    el.innerText = val ? val.toLocaleString() : '-';
    var r = exState.rows[rowIdx];
    if (r.recommend !== undefined) {
      r.status = val >= r.recommend ? 'ok' : 'low';
      var stEl = document.getElementById('rptex-st-' + rowIdx);
      if (stEl) { stEl.className = 'rptex-status ' + (r.status === 'ok' ? 'ok' : 'low'); stEl.textContent = r.status === 'ok' ? '적정' : '부족'; }
      el.className = 'rptex-editable-cell' + (r.status === 'low' ? ' rptex-amt-low' : '');
      gState.lowItems = exState.rows.filter(function(r){ return r.status === 'low'; });
      refreshMsg();
    }
  };

  function renderPremiumTable() {
    var tbody = document.getElementById('rptex-premium-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    gState.premiums.forEach(function(p, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="text-align:left;border:1px solid #E2E8F0;padding:8px 12px;">'
        + '<input class="rptex-premium-input" style="text-align:left;" placeholder="보험사명" data-idx="' + i + '" data-field="name" value="' + esc(p.name) + '"></td>'
        + '<td style="border:1px solid #E2E8F0;padding:8px 12px;">'
        + '<div style="display:flex;align-items:center;gap:4px;">'
        + '<input class="rptex-premium-input" placeholder="예) 57430" type="text" data-idx="' + i + '" data-field="amount" value="' + (p.amount ? p.amount.toLocaleString() : '') + '">'
        + '<button class="rptex-del-btn" data-del="' + i + '">✕</button>'
        + '</div></td>';
      tbody.appendChild(tr);
    });

    tbody.addEventListener('input', function(e) {
      var el = e.target, idx = Number(el.dataset.idx);
      if (isNaN(idx)) return;
      if (el.dataset.field === 'name') {
        gState.premiums[idx].name = el.value;
      } else if (el.dataset.field === 'amount') {
        gState.premiums[idx].amount = parseFloat(el.value.replace(/,/g,'')) || 0;
        refreshPremiumSummary();
        refreshAnalysisPremiumRow();
        refreshMsg();
      }
    });
    tbody.addEventListener('change', function(e) {
      if (e.target.dataset.field === 'amount') {
        var n = parseFloat(e.target.value.replace(/,/g,'')) || 0;
        e.target.value = n ? n.toLocaleString() : '';
        // 분석표 보험료 셀도 동기화
        var idx = Number(e.target.dataset.idx);
        var pCell = document.getElementById('rptex-prem-co-' + idx);
        if (pCell) pCell.textContent = n ? n.toLocaleString() : '-';
      }
    });
    tbody.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-del]');
      if (!btn) return;
      gState.premiums.splice(Number(btn.dataset.del), 1);
      renderPremiumTable();
      refreshPremiumSummary();
      refreshAnalysisPremiumRow();
      refreshMsg();
    });

    refreshPremiumSummary();
  }

  window.rptExAddCompany = function() {
    gState.premiums.push({ name: '', amount: 0 });
    renderPremiumTable();
    refreshAnalysisPremiumRow();
  };

  function refreshPremiumSummary() {
    var total = gState.premiums.reduce(function(s,p){ return s + (p.amount||0); }, 0);
    var level = evalLevel(gState.age || 40, total);
    var tEl = document.getElementById('rptex-premium-total');
    var lEl = document.getElementById('rptex-premium-level');
    if (tEl) tEl.textContent = total.toLocaleString() + '원';
    if (lEl) { lEl.textContent = level.emoji + ' ' + level.label; lEl.className = level.cls; }
  }

  function refreshMsg() {
    var ta = document.getElementById('rptex-msg-output');
    if (!ta || !gState) return;
    ta.value = makeMsg(gState);
  }

  window.rptExCopyMsg = function() {
    var ta = document.getElementById('rptex-msg-output');
    if (!ta || !ta.value) return alert('생성된 멘트가 없습니다.');
    navigator.clipboard.writeText(ta.value)
      .then(function(){ alert('✅ 멘트가 클립보드에 복사되었습니다.'); })
      .catch(function(){ ta.select(); document.execCommand('copy'); alert('✅ 복사 완료'); });
  };

  // ─── 분석표 이미지 복사 (html2canvas, 카톡 전송용 별도 카드 디자인) ───
  window.rptExCopyTableImage = async function() {
    if (!exState.rows.length || !gState) return alert('분석표가 없습니다.');

    var btn = document.getElementById('rptex-img-copy-btn');
    if (btn) { btn.textContent = '⏳ 이미지 생성 중...'; btn.disabled = true; }

    try {
      if (!window.html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }

      var total = gState.premiums.reduce(function(s,p){ return s+(p.amount||0); }, 0);
      var level = evalLevel(gState.age || 40, total);

      // 대분류 rowspan 계산
      var spans = {}, last = null, si = 0;
      exState.rows.forEach(function(r, i) {
        if (r.cat !== last) { if (last !== null) spans[si] = i - si; last = r.cat; si = i; }
      });
      if (last !== null) spans[si] = exState.rows.length - si;

      var rowsHtml = '';
      exState.rows.forEach(function(r, i) {
        var stColor = r.status === 'ok' ? '#3182F6' : r.status === 'low' ? '#DC2626' : '#94A3B8';
        var stBg    = r.status === 'ok' ? '#EFF6FF' : r.status === 'low' ? '#FEF2F2' : '#F1F5F9';
        var stLbl   = r.status === 'ok' ? '적정' : r.status === 'low' ? '부족' : '기준없음';
        rowsHtml += '<tr>';
        if (spans[i] !== undefined) {
          rowsHtml += '<td rowspan="' + spans[i] + '" style="background:#F8FAFC;font-weight:700;color:#001E42;text-align:center;padding:12px 10px;border:1px solid #E2E8F0;font-size:13px;">' + esc(r.cat) + '</td>';
        }
        rowsHtml += '<td style="text-align:left;padding:12px 16px;font-weight:600;color:#334155;border:1px solid #E2E8F0;font-size:13px;">' + esc(r.label) + '</td>';
        rowsHtml += '<td style="text-align:right;padding:12px 16px;border:1px solid #E2E8F0;font-size:13px;' + (r.status==='low'?'color:#DC2626;font-weight:700;':'color:#334155;') + '">' + (r.customerSum ? r.customerSum.toLocaleString()+'만원' : '-') + '</td>';
        rowsHtml += '<td style="text-align:right;padding:12px 16px;color:#94A3B8;border:1px solid #E2E8F0;font-size:13px;">' + (r.recommend !== undefined ? r.recommend.toLocaleString()+'만원' : '-') + '</td>';
        rowsHtml += '<td style="text-align:center;padding:10px;border:1px solid #E2E8F0;"><span style="display:inline-block;background:' + stBg + ';color:' + stColor + ';font-weight:800;font-size:12px;padding:4px 14px;border-radius:20px;">' + stLbl + '</span></td>';
        rowsHtml += '</tr>';
      });

      var html =
        '<div style="width:660px;background:#fff;border-radius:18px;overflow:hidden;font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',\'Noto Sans KR\',sans-serif;box-shadow:0 1px 3px rgba(0,0,0,0.06);">'
          + '<div style="background:linear-gradient(135deg,#001E42,#0B3A6F);color:#fff;padding:26px 28px;">'
            + '<div style="font-size:18px;font-weight:800;letter-spacing:-0.3px;">' + esc(gState.customerName) + '님 보장 분석 리포트</div>'
            + '<div style="display:flex;gap:18px;margin-top:10px;">'
              + '<div style="font-size:13px;opacity:.85;">💰 월납 ' + total.toLocaleString() + '원</div>'
              + '<div style="font-size:13px;opacity:.85;">' + level.emoji + ' 연령 대비 ' + level.label + '</div>'
            + '</div>'
          + '</div>'
          + '<table style="width:100%;border-collapse:collapse;">'
            + '<thead><tr>'
              + '<th style="background:#F1F5F9;padding:12px 10px;border:1px solid #E2E8F0;color:#334155;font-size:12px;">대분류</th>'
              + '<th style="background:#F1F5F9;padding:12px 16px;border:1px solid #E2E8F0;color:#334155;font-size:12px;text-align:left;">소분류</th>'
              + '<th style="background:#F1F5F9;padding:12px 16px;border:1px solid #E2E8F0;color:#334155;font-size:12px;text-align:right;">고객 보장합산</th>'
              + '<th style="background:#F1F5F9;padding:12px 16px;border:1px solid #E2E8F0;color:#334155;font-size:12px;text-align:right;">권장 기준</th>'
              + '<th style="background:#F1F5F9;padding:12px 10px;border:1px solid #E2E8F0;color:#334155;font-size:12px;">상태</th>'
            + '</tr></thead>'
            + '<tbody>' + rowsHtml + '</tbody>'
          + '</table>'
          + '<div style="padding:16px 28px;font-size:11.5px;color:#94A3B8;background:#F8FAFC;line-height:1.6;">본 분석은 고객 제공 가입설계서 기준의 참고 자료이며, 실제 보장 내용은 약관을 기준으로 합니다.</div>'
        + '</div>';

      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      var canvas = await window.html2canvas(wrapper.firstElementChild, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      document.body.removeChild(wrapper);

      canvas.toBlob(async function(blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✅ 분석표 이미지가 복사되었습니다!\n카카오톡 채팅창에 바로 붙여넣기(Ctrl+V) 하세요.');
        } catch(e) {
          var a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = '보장분석표.png';
          a.click();
          alert('📥 클립보드 복사가 차단되어 이미지를 다운로드했습니다.\n다운로드된 이미지를 카카오톡에 첨부해주세요.');
        }
        if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 분석표 이미지 복사'; btn.disabled = false; }
      }, 'image/png');

    } catch(err) {
      console.error(err);
      alert('이미지 생성 실패: ' + err.message);
      if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 분석표 이미지 복사'; btn.disabled = false; }
    }
  };

  window.rptExReset = function() {
    exState = { customerName:'', companies:[], rows:[], premiumAmounts:[] };
    gState  = null;
    var r = document.getElementById('rptex-result'); if(r) r.style.display='none';
    var d = document.getElementById('rptex-drop-text'); if(d) d.textContent='클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    var f = document.getElementById('rptex-file-input'); if(f) f.value='';
    hideError();
  };

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();