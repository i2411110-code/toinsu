// ================================================
// 토스DB 엑셀 보장분석 → 니즈환기 리포트 생성기
// v6.5: 하단에 '+ 연령대별 적정 보험료 가이드' 토글 카드 추가
//       — 고객 나이에 맞춰 해당 연령대 자동 하이라이트
//       — '가이드 이미지 복사' 버튼으로 카톡 전송용 이미지 생성
// v6.4: '분석표 이미지 복사' 버튼 색상 통일(#3182F6)
//       + makeMsg() 내 따옴표 이스케이프 누락으로 인한
//         스크립트 전체 로드 실패 버그 수정
// ================================================
(function () {

  // ─── 기준금액 (만원) ───
  const RECOMMEND = {
    '질병입원의료비': 5000, '질병외래의료비': 20, '질병처방조제료': 5,
    '상해입원의료비': 5000, '상해외래의료비': 20, '상해처방조제료': 5,
    '일반암진단': 10000, '소액암(유사암)진단': 2000, '고액암진단': 5000,
    '뇌혈관질환진단': 3000, '뇌졸중질환진단': 2000, '뇌출혈질환진단': 1000,
    '허혈성심장질환진단': 3000, '급성심근경색진단': 1000,
    '질병수술': 50, '상해수술': 100, '암수술': 1000,
    '뇌혈관질환수술': 1000, '허혈성심장질환수술': 1000,
    '질병입원': 3, '상해입원': 3,
    '질병사망': 5000, '상해사망': 10000,
    '질병80%이상후유장해': 5000, '질병80%미만후유장해': 5000,
    '상해80%이상후유장해': 10000, '상해80%미만후유장해': 10000,
    '골절진단': 100, '화상진단': 100,
    '가족생활배상책임담보': 10000, '일상생활배상책임담보': 10000,
    '교통사고처리지원금': 20000, '벌금(대물)': 500, '벌금(대인)': 2000,
    '변호사선임비용': 5000, '자동차부상치료비': 30,
    '화재벌금': 2000, '보존치료': 100, '보철치료': 100,
  };

  // ─── 연령별 보험료 기준 (원) ───
  const PREMIUM_STD = [
    { maxAge: 20, low: 80000,  high: 150000, over: 220000, avg: 115000 },
    { maxAge: 30, low: 80000,  high: 150000, over: 220000, avg: 115000 },
    { maxAge: 40, low: 100000, high: 200000, over: 300000, avg: 150000 },
    { maxAge: 50, low: 150000, high: 280000, over: 420000, avg: 215000 },
    { maxAge: 60, low: 200000, high: 350000, over: 520000, avg: 275000 },
    { maxAge: 99, low: 250000, high: 430000, over: 650000, avg: 340000 },
  ];

  // ─── 보장 항목 상태(부족/적정/미가입/과잉) 판정 & 공통 메타 ───
  // EXCESS_MULTIPLIER: 권장 기준 대비 몇 배를 넘으면 '과잉'으로 볼지 (조정 가능)
  var EXCESS_MULTIPLIER = 1.5;
var NEAR_THRESHOLD = 0.9;   // 권장기준의 90% 이상이면 '적정'으로 인정
var ROW_STATUS_CYCLE = ['ok', 'low', 'unregistered', 'excess'];
  var ROW_STATUS_META = {
    ok:           { label: '적정',   cls: 'ok',           color: '#3182F6', bg: '#EFF6FF' },
    low:          { label: '부족',   cls: 'low',           color: '#DC2626', bg: '#FEF2F2' },
    unregistered: { label: '미가입', cls: 'unregistered',  color: '#8B95A1', bg: '#F2F4F6' },
    excess:       { label: '과잉',   cls: 'excess',        color: '#D97706', bg: '#FFFBEB' },
    none:         { label: '기준없음', cls: 'none',        color: '#64748B', bg: '#F1F5F9' },
  };
  function computeRowStatus(sum, rec) {
    if (rec === undefined) return 'none';
    if (!sum || sum <= 0) return 'unregistered';
    if (sum < rec * NEAR_THRESHOLD) return 'low';
    if (sum > rec * EXCESS_MULTIPLIER) return 'excess';
    return 'ok';
}

  function evalLevel(age, total) {
    const s = PREMIUM_STD.find(r => age <= r.maxAge) || PREMIUM_STD[PREMIUM_STD.length - 1];
    if (total < s.low)   return { label: '부족',     emoji: '🔴', cls: 'lv-low'  };
    if (total <= s.high) return { label: '적정',     emoji: '🟢', cls: 'lv-ok'   };
    if (total <= s.over) return { label: '다소 높음', emoji: '🟠', cls: 'lv-warn' };
    return                     { label: '과다',     emoji: '🔴', cls: 'lv-over' };
  }

   function getPeerAvgPremium(age) {
    const s = PREMIUM_STD.find(r => age <= r.maxAge) || PREMIUM_STD[PREMIUM_STD.length - 1];
    return s.avg;
  }


  // ─── ✅ 연령대별 적정 보험료 가이드 (참고용 · 소득 대비 % 기준) ───
  const AGE_GUIDE = [
    { label: '20대',     maxAge: 29,  ratio: '5~10%',   premium: '5만 ~ 10만 원',  coverage: '실손의료보험, 3대 질병(암·뇌·심장) 진단비' },
    { label: '30대',     maxAge: 39,  ratio: '10~15%',  premium: '10만 ~ 25만 원', coverage: '20대 기본 보장 + 정기/종신보험(가장인 경우), 태아/어린이보험' },
    { label: '40대',     maxAge: 49,  ratio: '12~18%',  premium: '15만 ~ 35만 원', coverage: '3대 중대질병 보장 한도 확대, 수술비/입원비 보강' },
    { label: '50대',     maxAge: 59,  ratio: '10~15%',  premium: '15만 ~ 30만 원', coverage: '노후/간병 대비, 질병 이력이 있다면 유병자 보험' },
    { label: '60대 이상', maxAge: 999, ratio: '5~10%',   premium: '10만 ~ 20만 원', coverage: '기존 보험 유지, 치매/간병보험, 유병자 보험' },
  ];

  function ageGuideIndex(age) {
    var a = Number(age) || 40;
    for (var i = 0; i < AGE_GUIDE.length; i++) {
      if (a <= AGE_GUIDE[i].maxAge) return i;
    }
    return AGE_GUIDE.length - 1;
  }

  // ─── 날짜/시간 포맷 헬퍼 (신청 내역 체크 멘트용) ───
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function formatKoreanDateTime(d) {
    d = d || new Date();
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    var dow = days[d.getDay()];
    var h = d.getHours();
    var ampm = h < 12 ? '오전' : '오후';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    var min = d.getMinutes();
    return y + '-' + pad2(m) + '-' + pad2(day) + ' (' + dow + ') ' + ampm + ' ' + h12 + '시 ' + min + '분';
  }

  // ─── 규칙 기반 폴백 로직 (AI 호출 실패 시 사용) ───
  function buildItemsFallback(lowItems, age, total, level, category, excessItems) {
    var out = [];
    excessItems = excessItems || [];

    // 카테고리별 우선 규칙 — 있으면 무조건 첫 번째로 추가
    var categoryRule = null;
    if (category === '실비부족' && lowItems.some(function(r){ return r.cat === '실비'; })) {
      var s0 = lowItems.filter(function(r){ return r.cat === '실비'; }).map(function(r){ return r.label; });
      categoryRule = { emoji:'🔴', title:'실손의료비, 지금 상태로 괜찮으신가요?',
        body:'요청하신 실비 점검 결과, 보장 한도가 권장 기준에 못 미칩니다.\n(부족 항목: ' + s0.join(', ') + ')\n실비는 실제 진료비를 직접 돌려받는 항목이라 한도 부족 시 자비 부담이 커집니다.' };
    } else if (category === '보장과잉' && excessItems.length) {
      var s1 = excessItems.slice(0, 3).map(function(r){ return r.label; });
      categoryRule = { emoji:'🟠', title:'혹시 같은 보장을 여러 번 가입하고 계신 건 아닐까요?',
        body:'요청하신 보험료 점검 결과 일부 항목이 권장 기준보다 과도하게 높습니다.\n(해당 항목: ' + s1.join(', ') + ')\n중복 보장은 사고 시 비례보상되어 실제 받는 금액은 생각보다 적을 수 있습니다.' };
    } else if (category === '보장부족' && lowItems.length) {
      var s2 = lowItems.slice(0, 3).map(function(r){ return r.label; });
      categoryRule = { emoji:'🔴', title:'가장 큰 리스크부터 짚어드릴게요',
        body:'요청하신 보장 점검 결과, 다음 항목이 권장 기준 대비 부족합니다.\n(부족 항목: ' + s2.join(', ') + ')\n특히 진단비·수술비처럼 목돈이 드는 항목의 공백은 우선 채워두시는 게 좋습니다.' };
    } else if (category === '또래월보험비교') {
      categoryRule = { emoji:'🟡', title: age + '세 또래들은 보통 얼마를 낼까요?',
        body:'현재 월 ' + total.toLocaleString() + '원은 ' + age + '세 기준 ' + level.label + ' 수준입니다.\n또래 대비 보험료 수준뿐 아니라 보장 구성도 함께 비교해볼 필요가 있습니다.' };
    }
    if (categoryRule) out.push(categoryRule);

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

  function buildOpinionFallback(name, age, total, level, lowItems, items, category) {
    var catNote = {
      '또래월보험비교': ' 특히 또래 대비 보험료·보장 수준을 함께 짚어드렸습니다.',
      '실비부족': ' 요청하신 실비 보장 점검 결과를 우선적으로 반영했습니다.',
      '보장과잉': ' 요청하신 보험료 절감 가능성을 중심으로 살펴봤습니다.',
      '보장부족': ' 요청하신 보장 공백을 우선순위로 짚어드렸습니다.',
      '종합분석': ''
    }[category] || '';
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
    return name + '님은 전반적으로 ' + level.label + ' 수준의 보험료를 납입 중이시나, ' + (catStr.length > 2 ? catStr + ' 영역에서 ' : '일부 항목에서 ') + '보장 공백이 발견되었습니다.' + catNote + ' 현재 구조를 유지하면서 핵심 공백만 효율적으로 보완하는 방향으로 상담드리겠습니다.';
  }

  // ─── 상담 카테고리별 AI 지시 힌트 ───
  function categoryHint(category) {
    var map = {
      '또래월보험비교': '고객은 자신과 비슷한 나이·상황의 또래들과 비교했을 때 본인의 보험료·보장 수준이 어느 위치에 있는지를 가장 궁금해합니다. 반드시 "또래 대비" 관점(보험료 수준, 보장 공백)을 첫 번째 인사이트에서 다루고, "또래들은 보통 이런데 고객님은 어떻다"는 식으로 비교 궁금증을 자극하세요.',
      '실비부족': '고객은 실손의료비 보장이 충분한지를 걱정하며 신청했습니다. 실비(질병/상해 입원·통원·처방조제) 관련 항목을 반드시 첫 번째 인사이트로 다루고, 실제 진료비 부담과 연결해 위기감을 조성하세요.',
      '종합분석': '고객은 본인의 전체 보험 구성을 폭넓게 점검받고 싶어합니다. 보험료 수준과 보장 공백을 균형 있게 다루되, 가장 심각한 리스크를 첫 번째로 배치하세요.',
      '보장부족': '고객은 특정 보장이 부족하지 않은지 걱정하며 신청했습니다. 부족항목요약 중 가장 치명적인 항목(진단비·수술비 등 고액 지출 관련)을 첫 번째 인사이트로 다루세요.',
      '보장과잉': '고객은 보험료를 너무 많이 내고 있는 건 아닌지 걱정하며 신청했습니다. 과잉항목요약과 보험사별 중복 가입 여부를 첫 번째 인사이트로 다루고, 절약 가능성을 구체적으로 암시하세요.',
    };
    return map[category] || map['종합분석'];
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
    '1. 전달받은 "상담요청_배경" 문구를 반드시 참고하여, items의 첫 번째 항목(1번)은',
    '   고객이 신청한 상담카테고리와 직접적으로 관련된 내용으로 작성하세요.',
    '   상담카테고리가 "또래월보험비교"인 경우, 전달받은 "또래평균월납보험료" 값을 반드시 그대로 인용해',
    '   "고객님과 비슷한 또래는 평균 OOO원대의 보험료를 납입하고 계십니다" 형태로 실제 숫자를 채워 문장을 완성하세요.',
    '   이 숫자는 반드시 전달받은 데이터값을 그대로 사용하고 임의로 만들어내지 마세요.',
    '   제목이나 내용에 고객이 궁금해할 법한 질문형 뉘앙스(예: "~하지 않으셨나요?", "~괜찮으신가요?")를',
    '   자연스럽게 녹여 궁금증을 유발하세요. 단, 물음표로 끝나는 문장은 남발하지 말고 1문장 이내로 제한.',
    '2. 나머지 2개 항목은 전체보장항목과 보험사별 데이터를 종합 분석하여 선정.',
    '   단순 부족항목 나열이 아닌, 아래 관점에서 고객에게 실질적으로 중요한 항목을 우선:',
    '   - 중복 가입 여부 (동일 보장을 여러 보험사에서 가입 → 실제 지급은 비례 보상)',
    '   - 보험료 대비 보장 효율 (보험료는 높은데 핵심 보장이 부족한 구조)',
    '   - 갱신형 위험 (나이 들수록 보험료 급등 가능성)',
    '   - 미가입이거나 권장 대비 현저히 부족한 핵심 보장',
    '   부족항목이 없으면 보험료 과다/중복/비효율 관점으로 채움.',
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
    '8. 금액 단위 절대 규칙: 데이터의 "_만원"이 붙은 필드값은 이미 "만원" 단위입니다.',
    '   예) 고객보장합산_만원: 5000 → 반드시 "5,000만원"이라고 표기하세요. "500만원"처럼 자릿수를 절대 바꾸지 마세요.',
    '   원 단위로 환산하거나 나누거나 곱하는 등의 임의 변환을 절대 하지 마세요. 데이터에 있는 숫자를 그대로, 단위만 "만원"을 붙여 사용하세요.',
    '   억원 단위로 바꾸지 말고("1억원" 금지) 항상 "만원" 단위 그대로 표기하세요(예: 10000 → "10,000만원").',
  ].join('\n');

  function buildAIPayload() {
    var rows = exState.rows || [];
    var companies = exState.companies || [];
    var lowItems = rows.filter(function(r){ return r.status === 'low'; });
    var excessItems = rows.filter(function(r){ return r.status === 'excess'; });
    var okItems  = rows.filter(function(r){ return r.status === 'ok'; });
    var total = gState.premiums.reduce(function(s,p){ return s+(p.amount||0); }, 0);
    var level = evalLevel(gState.age || 40, total);

    var premiumDetail = gState.premiums.map(function(p) {
      return { 보험사: p.name, 월납보험료_원: p.amount };
    });

    var allItems = rows.map(function(r) {
      var detail = {
        대분류: r.cat,
        소분류: r.label,
        고객보장합산: r.customerSum ? (r.customerSum.toLocaleString() + '만원') : '0만원',
        권장기준: r.recommend !== undefined ? (r.recommend.toLocaleString() + '만원') : null,
        상태: (ROW_STATUS_META[r.status] || {}).label || r.status
      };
      if (r.perProduct && companies.length > 0) {
        var byCompany = {};
        companies.forEach(function(c, i) { if (r.perProduct[i]) byCompany[c] = r.perProduct[i]; });
        if (Object.keys(byCompany).length > 0) detail.보험사별_만원 = byCompany;
      }
      return detail;
    });

    return {
      고객나이: gState.age || 40,
      상담카테고리: gState.category || '또래월보험비교',
      상담요청_배경: categoryHint(gState.category || '또래월보험비교'),
      또래평균월납보험료: getPeerAvgPremium(gState.age || 40).toLocaleString() + '원',
      가입보험사수: companies.length,
      가입보험사목록: companies,
      보험사별월납보험료: premiumDetail,
      월납보험료합계_원: total,
      연령대비보험료수준: level.label,
      전체보장항목: allItems,
      부족항목요약: lowItems.map(function(r){
        return {
          대분류: r.cat, 소분류: r.label,
          고객보장합산: r.customerSum ? (r.customerSum.toLocaleString() + '만원') : '0만원',
          권장기준: r.recommend !== undefined ? (r.recommend.toLocaleString() + '만원') : null
        };
      }),
      과잉항목요약: excessItems.map(function(r){
        return {
          대분류: r.cat, 소분류: r.label,
          고객보장합산: r.customerSum ? (r.customerSum.toLocaleString() + '만원') : '0만원',
          권장기준: r.recommend !== undefined ? (r.recommend.toLocaleString() + '만원') : null
        };
      }),
    };
  }

  // ─── 백엔드 프록시 엔드포인트 ───
  var AI_PROXY_ENDPOINT = '/api/generate-message';

  // ─── AI 응답 텍스트에서 JSON 블록만 안전하게 추출 ───
  function extractJSON(raw) {
    var text = String(raw || '');
    // 코드펜스 제거
    text = text.replace(/```json/gi, '').replace(/```/g, '');
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('응답에서 JSON 블록을 찾을 수 없습니다.');
    }
    var jsonStr = text.slice(start, end + 1);
    return JSON.parse(jsonStr);
  }

  // ─── AI 호출 1회 시도 (성공 시 파싱된 객체 반환, 실패 시 throw) ───
  async function attemptAIGeneration() {
    var payload = buildAIPayload();
    var fullPrompt = AI_SYSTEM_PROMPT + '\n\n고객 보장 데이터:\n' + JSON.stringify(payload);

    var resp = await fetch(AI_PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!resp.ok) {
      var errBody = await resp.text();
      throw new Error('서버 응답 오류 (' + resp.status + '): ' + errBody);
    }

    var data = await resp.json();
    if (data.error) throw new Error(data.error);
    if (!data.text) throw new Error('응답에서 텍스트를 찾을 수 없습니다.');

    var parsed = extractJSON(data.text);
    if (!parsed.items || parsed.items.length < 1 || !parsed.opinion) {
      throw new Error('AI 응답 형식 오류');
    }
    return parsed;
  }

  // ─── AI 호출 + 결과를 textarea에 반영 (백엔드 프록시 경유, 1회 자동 재시도 포함) ───
  window.rptExGenerateAIMessage = async function() {
    if (!gState) return;
    var btn = document.getElementById('rptex-ai-gen-btn');
    var ta  = document.getElementById('rptex-msg-output');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-stars"></i> AI 분석 중...'; }

    if (ta) { ta.style.display = 'none'; }
    var loadingEl = document.getElementById('rptex-ai-loading');
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'rptex-ai-loading';
      loadingEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:280px;border:1.5px solid #E2E8F0;border-radius:10px;background:#F8FAFC;';
      loadingEl.innerHTML = '<div class="rptex-ai-dots"><span></span><span></span><span></span></div>'
        + '<div style="font-size:13px;color:#64748B;font-weight:600;" id="rptex-ai-loading-text">🤖 보장 데이터 분석 중...</div>';
      if (ta && ta.parentNode) ta.parentNode.insertBefore(loadingEl, ta);
    } else {
      loadingEl.style.display = 'flex';
    }
    var loadingMsgs = ['🤖 보장 데이터 분석 중...', '📊 부족 항목 검토 중...', '✍️ 멘트 작성 중...', '🔍 보험료 수준 비교 중...'];
    var msgIdx = 0;
    var loadingTextEl = document.getElementById('rptex-ai-loading-text');
    var loadingInterval = setInterval(function() {
      msgIdx = (msgIdx + 1) % loadingMsgs.length;
      if (loadingTextEl) loadingTextEl.textContent = loadingMsgs[msgIdx];
    }, 900);

    var parsed = null;
    var failed = false;
    try {
      parsed = await attemptAIGeneration();
    } catch (firstErr) {
      console.warn('AI 1차 시도 실패 — 자동 재시도합니다.', firstErr);
      try {
        parsed = await attemptAIGeneration();
      } catch (secondErr) {
        console.error('AI 2차 시도도 실패했습니다.', secondErr);
        parsed = null;
        failed = true;
      }
    }
    gState.aiContent = parsed;

    clearInterval(loadingInterval);
    if (loadingEl) loadingEl.style.display = 'none';
    if (ta) ta.style.display = '';

    if (failed) {
      // 기본 멘트(규칙기반 폴백)는 사용하지 않음. 실패 사실만 안내.
      if (ta) ta.value = '⚠️ AI 멘트 생성에 실패했습니다. 잠시 후 [AI 멘트 재생성] 버튼을 다시 눌러주세요.';
    } else {
      refreshMsg();
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-stars"></i> AI 멘트 생성'; }
  };

  // ─── 로그인한 어드바이저 이름 가져오기 ───
  function getCurrentAdvisorName() {
    if (window.currentUserDisplayName && window.currentUserDisplayName.trim()) {
      return window.currentUserDisplayName.trim();
    }
    var el = document.getElementById('main-user-name');
    if (el) {
      var name = el.textContent.replace(/님$/, '').trim();
      if (name && name !== '설계사') return name;
    }
    return '어드바이저';
  }

  // ================================================================
  // ✅ 카톡 발송 순서(6단계) 멘트 빌더
  // 1) 인사 → 2) 분석표 이미지 첨부 → 3) 신청내역 체크 →
  // 4) 필수보장 이미지 첨부 → 5) 상담안내/질문 → 6) AI 니즈환기 멘트
  // ================================================================

  // STEP 1. 인사 멘트
  function buildGreetingMsg(state) {
    var name = state.customerName || '고객';
    var category = state.category || '보험 점검';
    var advisorName = getCurrentAdvisorName();
    var lines = [];
    lines.push('안녕하세요 ' + name + '님');
    lines.push('');
    lines.push('토스 앱을 통해 신청하신 \'' + category + '\' 상담을 도와드릴 ' + advisorName + ' 어드바이저 입니다.');
    lines.push('');
    lines.push('상담 진행에 앞서 안심하시고 질의응답 하실 수 있도록 당사 명함 함께 첨부해드립니다.');
    return lines.join('\n');
  }

  // STEP 3. 신청 내역 체크 멘트 (신청 일시 필요)
  function buildTimeCheckMsg(state) {
    var applyDT = state.applyDateTime || formatKoreanDateTime();
    var lines = [];
    lines.push(applyDT + '에 신청하신 보험 내역을 살펴봤어요. 🔍');
    lines.push('');
    lines.push('소중한 보험료가 허투루 쓰이지 않게,');
    lines.push('딱 3가지만 확실하게 짚어드릴게요.');
    lines.push('');
    lines.push('▪ 매달 낭비되는 보험료 잡아내기');
    lines.push('▪ 내 나이에 꼭 필요한 핵심 보장 체크');
    lines.push('▪ 유지할지, 조정할지 명쾌한 결론');
    return lines.join('\n');
  }

  // STEP 5. 상담 안내 & 질문 멘트
  function buildQuestionMsg() {
    var lines = [];
    lines.push('분석 결과는 1~3일 내로 안내해 드릴 예정이에요.');
    lines.push('분석 결과를 준비하기 전에 질문을 하나 드릴게요.');
    lines.push('지금 내 보험에 대해 어떤 생각이 가장 먼저 드시나요?');
    lines.push('');
    lines.push('1️⃣ 매달 나가는 보험료가 너무 부담돼요.');
    lines.push('2️⃣ 나중에 아플 때 제대로 보장받을 수 있을지 불안해요.');
    lines.push('3️⃣ 사실 내가 무슨 보험에 들었는지 잘 모르겠어요.');
    lines.push('');
    lines.push('해당되는 번호를 보내주시면 그 고민을 중심으로 집중 분석해 드릴게요.');
    lines.push('');
    lines.push('📞 통화가 편하신 시간을 미리 남겨주시면 전문가의 도움을 받으실 수 있습니다.');
    lines.push('');
    lines.push('상담 가능 시간');
    lines.push('* 평일 오전 10시 ~ 오후 8시');
    lines.push('* 일요일, 공휴일은 전화상담 불가(카톡 가능)');
    return lines.join('\n');
  }

  // STEP 6. AI 니즈환기 멘트 (앞 단계에서 인사·상담안내를 이미 보냈으므로
  // 여기서는 보장 분석 상세 + 종합의견 + 마무리 인사만 담는다)
  function makeMsg(state) {
    var name     = state.customerName || '고객';
    var age      = state.age || 40;
    var premiums = state.premiums || [];
    var lowItems = state.lowItems || [];
    var total    = premiums.reduce(function(s, p){ return s + (p.amount || 0); }, 0);
    var level    = evalLevel(age, total);

    var items, opinion;
    if (state.aiContent && Array.isArray(state.aiContent.items) && state.aiContent.items.length) {
      items = state.aiContent.items;
      opinion = state.aiContent.opinion || '';
    } else {
      items = buildItemsFallback(lowItems, age, total, level, state.category, state.excessItems);
      opinion = buildOpinionFallback(name, age, total, level, lowItems, items, state.category);
    }

    var lines = [];
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
    // ⚠️ 수정: 아래 줄에 작은따옴표 문자열 안에 이스케이프 없는 '비교' 가 들어있어
    // 문법 오류(스크립트 전체 로드 실패)를 일으키던 부분을 큰따옴표로 교체
    lines.push('✅ ' + name + '님 지금 발견된 보장의 문제점을 가장 현명하게 해결하는 방법은 "비교"해보는 것입니다.');
    lines.push('✅ 토스에서는 국내 34개 보험사의 상품을 한눈에 비교 분석해 드릴 수 있어요.');
    lines.push('✅ 비교해 보시고, 그때 가서 "아, 이게 맞다"고 판단되시면 추가로 이야기를 나누셔도 늦지 않습니다.');
    lines.push('');
    lines.push('더 이상 아까운 보험료가 낭비되지 않도록 가장 빠른 길을 안내 드리겠습니다.');
    lines.push('감사합니다.');
    return lines.join('\n');
  }

  // ─── 발송 순서 1/3/5단계 멘트를 화면에 갱신 (+ 6단계는 refreshMsg에 위임) ───
  function refreshFlowMessages() {
    if (!gState) return;

    var greetEl = document.getElementById('rptex-flow-greet');
    if (greetEl) greetEl.value = buildGreetingMsg(gState);

    var dtInput = document.getElementById('rptex-apply-dt');
    if (dtInput && !dtInput.value) dtInput.value = gState.applyDateTime || formatKoreanDateTime();
    gState.applyDateTime = (dtInput && dtInput.value) || gState.applyDateTime || formatKoreanDateTime();

    var timeEl = document.getElementById('rptex-flow-time');
    if (timeEl) timeEl.value = buildTimeCheckMsg(gState);

    var qEl = document.getElementById('rptex-flow-q');
    if (qEl) qEl.value = buildQuestionMsg();

    refreshMsg();
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

  // ================================================================
  // ✅ 필수 보장 분석 (실비/3대진단/항암/운전자) — 카드형 그리드
  // "항암 보장 분석 솔루션" 참고 디자인과 동일한 스타일(볼드 항목명 +
  // 테두리 없는 얇은 금액 입력 + 알약형 상태 버튼)로 통일.
  // dataKey가 있는 항목은 업로드된 엑셀(RECOMMEND 기준)에서 실제 값을
  // 자동으로 가져와 매핑한다. dataKey가 없는 항목(신기술 항암치료비 등,
  // 토스 리포트에 없는 항목)은 수동 입력을 유지한다.
  // ================================================================
  var ESSENTIAL_TEMPLATE = [
    {
      key: '실비',
      title: '실비보험',
      desc: '병원비를 돌려받는 기본 보장',
      items: [
        { name: '질병 입원비', dataKey: '질병입원의료비', amount: '', status: '미가입' },
        { name: '질병 통원비', dataKey: '질병외래의료비', amount: '', status: '미가입' },
        { name: '상해 입원비', dataKey: '상해입원의료비', amount: '', status: '미가입' },
        { name: '상해 통원비', dataKey: '상해외래의료비', amount: '', status: '미가입' },
      ],
    },
    {
      key: '3대진단',
      title: '3대 진단비 (암/뇌/심장)',
      desc: '치료비와 생활비가 많이 필요한 질병 준비',
      items: [
        { name: '일반암', dataKey: '일반암진단', amount: '', status: '미가입' },
        { name: '유사암', dataKey: '소액암(유사암)진단', amount: '', status: '미가입' },
        { name: '뇌혈관질환', dataKey: '뇌혈관질환진단', amount: '', status: '미가입' },
        { name: '허혈성심장질환', dataKey: '허혈성심장질환진단', amount: '', status: '미가입' },
      ],
    },
    {
      key: '항암',
      title: '항암 치료비',
      desc: '암 진단 이후 치료 단계별 고액 비급여 치료비 대비',
      items: [
        { name: '표적항암약물허가치료비', dataKey: null, amount: '', status: '미가입' },
        { name: '중입자치료비',           dataKey: null, amount: '', status: '미가입' },
        { name: '세기조절방사선치료비',   dataKey: null, amount: '', status: '미가입' },
        { name: '양성자치료비',           dataKey: null, amount: '', status: '미가입' },
        { name: 'CAR-T항암치료비',        dataKey: null, amount: '', status: '미가입' },
        { name: '로봇암 수술비',          dataKey: null, amount: '', status: '미가입' },
        { name: '암 수술비',              dataKey: '암수술', amount: '', status: '미가입' },
        { name: '항암방사선·약물치료비',  dataKey: null, amount: '', status: '미가입' },
      ],
    },
    {
      key: '운전자',
      title: '운전자 보험',
      desc: "자동차 사고 '형사적 책임' 준비",
      items: [
        { name: '교통사고처리지원금', dataKey: '교통사고처리지원금', amount: '', status: '미가입' },
        { name: '벌금(대물)',         dataKey: '벌금(대물)', amount: '', status: '미가입' },
        { name: '벌금(대인)',         dataKey: '벌금(대인)', amount: '', status: '미가입' },
        { name: '변호사선임비용',     dataKey: '변호사선임비용', amount: '', status: '미가입' },
      ],
    },
  ];

  var ESSENTIAL_GROUPS = cloneEssentialTemplate();

  function cloneEssentialTemplate() {
    return JSON.parse(JSON.stringify(ESSENTIAL_TEMPLATE));
  }

  // ─── 업로드된 엑셀 파싱 결과(rows)를 기반으로 필수 보장 카드에 자동 매핑 ───
  function autoMapEssential(rows) {
    var byLabel = {};
    (rows || []).forEach(function(r) { byLabel[r.label] = r; });

    ESSENTIAL_GROUPS.forEach(function(g) {
      g.items.forEach(function(it) {
        if (!it.dataKey) return; // 수동 입력 유지 항목
        var r = byLabel[it.dataKey];
        if (r && r.customerSum > 0) {
          it.amount = r.customerSum.toLocaleString() + '만원';
          it.status = r.status === 'excess' ? '과잉' : r.status === 'ok' ? '적정' : '부족';
        } else {
          // 엑셀상 항목이 없거나 고객 보장합산이 0원 → 미가입
          it.amount = '미가입';
          it.status = '미가입';
        }
      });
    });
  }

  var ESSENTIAL_STATUS_CYCLE = ['적정', '부족', '미가입', '과잉'];
  var ESSENTIAL_STATUS_CLASS = {
    '적정': 'rptex-ess-blue',
    '부족': 'rptex-ess-red',
    '미가입': 'rptex-ess-gray',
    '과잉': 'rptex-ess-orange',
  };

  function essentialItemHTML(g, gi, it, ii) {
    return '<div class="rptex-ess-item">'
      + '<div class="rptex-ess-item-name">' + esc(it.name) + '</div>'
      + '<input type="text" class="rptex-ess-item-input" '
      +   'value="' + esc(it.amount) + '" placeholder="-" '
      +   'data-g="' + gi + '" data-i="' + ii + '" '
      +   'oninput="window.rptExEssAmountEdit(this,' + gi + ',' + ii + ')">'
      + '<button class="rptex-ess-item-btn ' + ESSENTIAL_STATUS_CLASS[it.status] + '" '
      +   'data-g="' + gi + '" data-i="' + ii + '" '
      +   'onclick="window.rptExEssToggle(' + gi + ',' + ii + ')">' + it.status + '</button>'
      + '</div>';
  }

  function essentialGroupHTML(g, gi) {
    var itemsHtml = g.items.map(function (it, ii) { return essentialItemHTML(g, gi, it, ii); }).join('');
    var gridClass = 'rptex-ess-grid' + (g.key === '항암' ? ' rptex-ess-grid-4col' : '');
    return '<div class="rptex-ess-card">'
      + '<div class="rptex-ess-card-title">' + esc(g.title) + '</div>'
      + '<div class="rptex-ess-card-desc">' + esc(g.desc) + '</div>'
      + '<div class="' + gridClass + '">' + itemsHtml + '</div>'
      + '</div>';
  }

  function getEssentialHTML() {
    var groupsHtml = ESSENTIAL_GROUPS.map(function (g, gi) { return essentialGroupHTML(g, gi); }).join('');
    return '<div class="rpt-card">'
      + '<div class="rpt-step-label">STEP 3</div>'
      + '<h3 class="rpt-step-title">필수 보장 분석</h3>'
      + '<p class="rpt-step-desc">실비·3대진단비·항암치료비·운전자보험 핵심 항목을 한눈에 점검합니다.<br>'
      + '<span style="color:#64748B;font-size:12px;">📌 엑셀 데이터에서 자동으로 채워집니다 · 금액 직접 입력 · 상태버튼 클릭 시 적정 → 부족 → 미가입 → 과잉 순으로 전환됩니다.</span></p>'
      + '<div id="rptex-essential-wrap">' + groupsHtml + '</div>'
      + '</div>';
  }

  window.rptExEssToggle = function (gi, ii) {
    var item = ESSENTIAL_GROUPS[gi].items[ii];
    var idx = ESSENTIAL_STATUS_CYCLE.indexOf(item.status);
    item.status = ESSENTIAL_STATUS_CYCLE[(idx + 1) % ESSENTIAL_STATUS_CYCLE.length];
    var btn = document.querySelector(
      '.rptex-ess-item-btn[data-g="' + gi + '"][data-i="' + ii + '"]'
    );
    if (btn) {
      btn.className = 'rptex-ess-item-btn ' + ESSENTIAL_STATUS_CLASS[item.status];
      btn.textContent = item.status;
    }
    if (gState) gState.essentialGroups = ESSENTIAL_GROUPS;
  };

  // 숫자만 남기고 천 단위 콤마 + '만원' 단위를 붙여 표기 (예: 1000 → "1,000만원")
  function formatManwonAmount(raw) {
    var digits = String(raw || '').replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ko-KR') + '만원';
  }

  window.rptExEssAmountEdit = function (el, gi, ii) {
    var g = ESSENTIAL_GROUPS[gi];
    var val = el.value;
    if (g.key === '항암') {
      val = formatManwonAmount(val);
      el.value = val;
    }
    g.items[ii].amount = val;
    if (gState) gState.essentialGroups = ESSENTIAL_GROUPS;
  };

  function renderEssentialGrid() {
    var wrap = document.getElementById('rptex-essential-wrap');
    if (!wrap) return;
    wrap.innerHTML = ESSENTIAL_GROUPS.map(function (g, gi) { return essentialGroupHTML(g, gi); }).join('');
    if (gState) gState.essentialGroups = ESSENTIAL_GROUPS;
  }
  // ================================================================
  // ✅ 필수 보장 분석 섹션 끝
  // ================================================================

  // ================================================================
  // ✅ 연령대별 적정 보험료 가이드 (하단 + 토글, 선택 첨부)
  // ================================================================
  function renderAgeGuideTable() {
    var wrap = document.getElementById('rptex-ageguide-table');
    if (!wrap || !gState) return;
    var hi = ageGuideIndex(gState.age || 40);
    var rowsHtml = AGE_GUIDE.map(function (g, i) {
      var hl = i === hi;
      return '<tr' + (hl ? ' class="rptex-ageguide-hl"' : '') + '>'
        + '<td style="text-align:center;font-weight:' + (hl ? '800' : '700') + ';">' + esc(g.label)
        +   (hl ? ' <span class="rptex-ageguide-tag">고객 연령대</span>' : '') + '</td>'
        + '<td style="text-align:center;">' + esc(g.ratio) + '</td>'
        + '<td style="text-align:center;">' + esc(g.premium) + '</td>'
        + '<td style="text-align:left;">' + esc(g.coverage) + '</td>'
        + '</tr>';
    }).join('');
    wrap.innerHTML = '<table class="rptex-ageguide-tbl">'
      + '<thead><tr><th>연령대</th><th>적정 비율<br><span style="font-weight:400;">(월소득 대비)</span></th><th>예상 월보험료</th><th style="text-align:left;">꼭 챙겨야 할 핵심 보험</th></tr></thead>'
      + '<tbody>' + rowsHtml + '</tbody></table>';
  }

  window.rptExToggleAgeGuide = function () {
    var body = document.getElementById('rptex-ageguide-body');
    var btn  = document.getElementById('rptex-ageguide-toggle-btn');
    if (!body) return;
    var isOpen = body.style.display !== 'none';
    if (isOpen) {
      body.style.display = 'none';
      if (btn) btn.classList.remove('open');
    } else {
      renderAgeGuideTable();
      body.style.display = 'block';
      if (btn) btn.classList.add('open');
    }
  };

  // ─── 연령대 가이드 → 이미지 복사 (카톡 전송용) ───
  window.rptExCopyAgeGuideImage = async function () {
    if (!gState) return alert('먼저 엑셀을 업로드해주세요.');

    var btn = document.getElementById('rptex-ageguide-img-btn');
    if (btn) { btn.innerHTML = '⏳ 이미지 생성 중...'; btn.disabled = true; }

    try {
      if (!window.html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }

      var hi = ageGuideIndex(gState.age || 40);
      var rowsHtml = AGE_GUIDE.map(function (g, i) {
        var hl = i === hi;
        var bg = hl ? '#EFF6FF' : '#fff';
        var nameColor = hl ? '#0C447C' : '#001E42';
        return '<tr style="background:' + bg + ';">'
          + '<td style="padding:12px 10px;border:1px solid #E2E8F0;text-align:center;font-weight:' + (hl ? '800' : '700') + ';color:' + nameColor + ';font-size:13.5px;">'
          +   esc(g.label) + (hl ? '<div style="font-size:10.5px;color:#3182F6;font-weight:700;margin-top:2px;">고객 연령대</div>' : '') + '</td>'
          + '<td style="padding:12px 10px;border:1px solid #E2E8F0;text-align:center;color:#334155;font-size:13px;">' + esc(g.ratio) + '</td>'
          + '<td style="padding:12px 10px;border:1px solid #E2E8F0;text-align:center;color:#334155;font-size:13px;">' + esc(g.premium) + '</td>'
          + '<td style="padding:12px 16px;border:1px solid #E2E8F0;text-align:left;color:#334155;font-size:12.5px;line-height:1.6;">' + esc(g.coverage) + '</td>'
          + '</tr>';
      }).join('');

      var html =
        '<div style="width:640px;background:#fff;border-radius:18px;overflow:hidden;font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',\'Noto Sans KR\',sans-serif;box-shadow:0 1px 3px rgba(0,0,0,0.06);">'
          + '<div style="background:linear-gradient(135deg,#001E42,#0B3A6F);padding:26px 28px;">'
            + '<div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px;">' + esc(gState.customerName) + '님을 위한 연령대별 적정 보험료 가이드</div>'
            + '<div style="font-size:12.5px;color:#BFD4EE;margin-top:6px;">월 소득 대비 권장 비율 기준 참고 자료</div>'
          + '</div>'
          + '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">'
            + '<thead><tr>'
              + '<th style="background:#F1F5F9;padding:12px 10px;border:1px solid #E2E8F0;color:#334155;font-size:12px;width:15%;">연령대</th>'
              + '<th style="background:#F1F5F9;padding:12px 10px;border:1px solid #E2E8F0;color:#334155;font-size:12px;width:16%;">적정 비율</th>'
              + '<th style="background:#F1F5F9;padding:12px 10px;border:1px solid #E2E8F0;color:#334155;font-size:12px;width:19%;">예상 월 보험료</th>'
              + '<th style="background:#F1F5F9;padding:12px 14px;border:1px solid #E2E8F0;color:#334155;font-size:12px;text-align:left;width:50%;">꼭 챙겨야 할 핵심 보험</th>'
            + '</tr></thead>'
            + '<tbody>' + rowsHtml + '</tbody>'
          + '</table>'
          + '<div style="padding:14px 28px;font-size:11px;color:#94A3B8;background:#F8FAFC;line-height:1.6;">※ 예상 월 보험료는 연령별 평균 소득을 바탕으로 계산된 일반적 가이드라인이며, 개인의 소득과 가족력에 따라 달라질 수 있습니다.</div>'
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

      canvas.toBlob(async function (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✅ 연령대별 가이드 이미지가 복사되었습니다!\n카카오톡 채팅창에 바로 붙여넣기(Ctrl+V) 하세요.');
        } catch (e) {
          var a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = '연령대별보험료가이드.png';
          a.click();
          alert('📥 클립보드 복사가 차단되어 이미지를 다운로드했습니다.\n다운로드된 이미지를 카카오톡에 첨부해주세요.');
        }
        if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 가이드 이미지 복사'; btn.disabled = false; }
      }, 'image/png');

    } catch (err) {
      console.error(err);
      alert('이미지 생성 실패: ' + err.message);
      if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 가이드 이미지 복사'; btn.disabled = false; }
    }
  };
  // ================================================================
  // ✅ 연령대별 적정 보험료 가이드 섹션 끝
  // ================================================================

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
      + '<select id="rptex-category" class="rptex-meta-input" style="width:160px;">'
      + '<option value="또래월보험비교">또래월보험비교</option>'
      + '<option value="실비부족">실비부족</option>'
      + '<option value="종합분석">종합분석</option>'
      + '<option value="보장부족">보장부족</option>'
      + '<option value="보장과잉">보장과잉</option>'
      + '</select></div>'
      + '<div class="rptex-meta-item"><label class="rptex-meta-label">신청 일시</label>'
      + '<input type="text" id="rptex-apply-dt" class="rptex-meta-input" style="width:230px;" placeholder="예) 2026-07-01 (수) 오후 4시 24분"></div>'
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

      /* ── ✅ 필수 보장 분석 카드 섹션 ── */
      + getEssentialHTML()

      /* ── ✅ 카톡 발송 순서 (6단계) ── */
      + '<div class="rptex-flow-wrap">'
      + '<div class="rptex-flow-title">📤 카톡 발송 순서 <span class="rptex-flow-sub">— 순서대로 복사해서 카카오톡으로 보내주세요</span></div>'

      + '<div class="rptex-flow-step">'
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">1</span>인사 멘트</div>'
      + '<textarea id="rptex-flow-greet" class="rptex-flow-ta" readonly></textarea>'
      + '<div class="rptex-flow-actions">'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;" onclick="window.rptExCopyFlow(\'rptex-flow-greet\')"><i class="bi bi-clipboard-check"></i> 복사</button>'
      + '<span class="rptex-flow-note">📎 이 메시지와 함께 어드바이저 명함을 첨부해주세요.</span>'
      + '</div></div>'

      + '<div class="rptex-flow-step">'
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">2</span>보장 분석 결과 첨부</div>'
      + '<div class="rptex-flow-note" style="display:block;margin-bottom:10px;">📎 분석표 이미지를 복사해서 전송하세요.</div>'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#3182F6;" id="rptex-img-copy-btn" onclick="window.rptExCopyTableImage()"><i class="bi bi-image"></i> 분석표 이미지 복사</button>'
      + '</div>'

      + '<div class="rptex-flow-step">'
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">3</span>신청 내역 체크 멘트</div>'
      + '<div class="rptex-flow-note" style="display:block;margin-bottom:10px;">📎 상단의 "신청 일시" 값을 기준으로 멘트가 생성됩니다.</div>'
      + '<textarea id="rptex-flow-time" class="rptex-flow-ta" readonly></textarea>'
      + '<div class="rptex-flow-actions"><button class="btn-action" style="width:auto;padding:8px 18px;" onclick="window.rptExCopyFlow(\'rptex-flow-time\')"><i class="bi bi-clipboard-check"></i> 복사</button></div>'
      + '</div>'

      + '<div class="rptex-flow-step">'
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">4</span>필수 보장 분석 첨부</div>'
      + '<div class="rptex-flow-note" style="display:block;margin-bottom:10px;">📎 필수보장 이미지를 복사해서 전송하세요.</div>'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#3182F6;" id="rptex-ess-img-copy-btn" onclick="window.rptExCopyEssentialImage()"><i class="bi bi-image"></i> 필수보장 이미지 복사</button>'
      + '</div>'

      + '<div class="rptex-flow-step">'
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">5</span>상담 안내 &amp; 질문 멘트</div>'
      + '<textarea id="rptex-flow-q" class="rptex-flow-ta" readonly></textarea>'
      + '<div class="rptex-flow-actions"><button class="btn-action" style="width:auto;padding:8px 18px;" onclick="window.rptExCopyFlow(\'rptex-flow-q\')"><i class="bi bi-clipboard-check"></i> 복사</button></div>'
      + '</div>'

      + '<div class="rptex-flow-step">'
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">6</span>AI 니즈환기 멘트 <span class="rptex-flow-sub">— 고객 답변 확인 후 전송</span></div>'
      + '<div class="rptex-flow-note" style="display:block;margin-bottom:10px;">💬 고객이 선택한 항목이나 직접 짚어줄 부분을 확인한 뒤, AI 멘트를 생성해서 전송하세요.</div>'
      + '<textarea id="rptex-msg-output" class="rptex-flow-ta" style="height:280px;"></textarea>'
      + '<div class="rptex-flow-actions">'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#7C3AED;" id="rptex-ai-gen-btn" onclick="window.rptExGenerateAIMessage()"><i class="bi bi-stars"></i> AI 멘트 생성</button>'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;" onclick="window.rptExCopyFlow(\'rptex-msg-output\')"><i class="bi bi-clipboard-check"></i> 복사</button>'
      + '</div></div>'

      + '</div>'

      /* ── ✅ 연령대별 적정 보험료 가이드 (하단 + 토글, 선택 첨부) ── */
      + '<div class="rptex-ageguide-wrap">'
      + '<button class="rptex-ageguide-toggle" id="rptex-ageguide-toggle-btn" onclick="window.rptExToggleAgeGuide()">'
      + '<span class="rptex-ageguide-plus">+</span> 연령대별 적정 보험료 가이드 <span class="rptex-ageguide-toggle-sub">(선택 첨부 · 참고용)</span>'
      + '</button>'
      + '<div class="rptex-ageguide-body" id="rptex-ageguide-body" style="display:none;">'
      + '<div id="rptex-ageguide-table"></div>'
      + '<div class="rptex-flow-actions" style="margin-top:12px;">'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#3182F6;" id="rptex-ageguide-img-btn" onclick="window.rptExCopyAgeGuideImage()"><i class="bi bi-image"></i> 가이드 이미지 복사</button>'
      + '<span class="rptex-flow-note">📎 고객 나이에 맞는 연령대가 자동으로 강조 표시됩니다.</span>'
      + '</div>'
      + '</div>'
      + '</div>'

      + '<div style="margin-top:16px;">'
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
      '.rptex-premium-row td{background:#EFF6FF;font-weight:700;color:#001E42;border-color:#C7D9F5;}',
      '.rptex-premium-row .rptex-cat{background:#C7D9F5;color:#001E42;}',
      '.rptex-prem-editable{cursor:text;min-width:60px;}',
      '.rptex-prem-editable:hover{outline:1px dashed #3182F6;border-radius:3px;background:rgba(49,130,246,.06);}',
      '.rptex-prem-editable:focus{outline:2px solid #3182F6;border-radius:3px;background:#fff;}',
      '.rptex-status{font-weight:800;border-radius:6px;padding:2px 9px;font-size:11px;display:inline-block;cursor:pointer;user-select:none;transition:opacity .1s;}',
      '.rptex-status:hover{opacity:0.75;}',
      '.rptex-status.ok{background:#EFF6FF;color:#3182F6;}',
      '.rptex-status.low{background:#FEF2F2;color:#DC2626;}',
      '.rptex-status.unregistered{background:#F2F4F6;color:#8B95A1;}',
      '.rptex-status.excess{background:#FFFBEB;color:#D97706;}',
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
      /* ── 필수 보장 분석 카드: "항암 보장 분석 솔루션" 디자인과 통일 ── */
      '.rptex-ess-card{background:#fff;border:1px solid #EDF0F3;border-radius:28px;padding:32px 28px;margin-bottom:20px;box-shadow:0 4px 30px rgba(0,0,0,0.02);}',
      '.rptex-ess-card-title{font-size:20px;font-weight:800;color:#191F28;margin-bottom:2px;letter-spacing:-0.3px;}',
      '.rptex-ess-card-desc{font-size:13px;color:#6B7684;margin-bottom:26px;font-weight:500;}',
      '.rptex-ess-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:36px 16px;}',
      '.rptex-ess-grid-4col{grid-template-columns:repeat(4,1fr)!important;gap:28px 16px;}',
      '.rptex-ess-item{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0;}',
      '.rptex-ess-item-name{font-size:14px;font-weight:700;color:#191F28;margin-bottom:6px;letter-spacing:-0.2px;line-height:1.3;white-space:nowrap;}',
      '.rptex-ess-item-input{width:100%;text-align:center;border:none;background:transparent;font-size:13px;color:#8B95A1;font-weight:500;padding:0;margin-bottom:12px;font-family:"Noto Sans KR",sans-serif;outline:none;}',
      '.rptex-ess-item-input:focus{color:#3182F6;}',
      '.rptex-ess-item-btn{width:100%;max-width:112px;border:none;border-radius:16px;padding:10px 0;font-size:14px;font-weight:800;cursor:pointer;font-family:"Noto Sans KR",sans-serif;transition:transform .1s,opacity .12s;}',
      '.rptex-ess-item-btn:hover{opacity:.85;}',
      '.rptex-ess-item-btn:active{transform:scale(.95);}',
      '.rptex-ess-blue{background:#E8F3FF;color:#3182F6;}',
      '.rptex-ess-red{background:#FFF0F0;color:#F04452;}',
      '.rptex-ess-gray{background:#F2F4F6;color:#8B95A1;}',
      '.rptex-ess-orange{background:#FFF7E8;color:#D97706;}',
      /* ── 카톡 발송 순서(6단계) 스타일 ── */
      '.rptex-flow-wrap{margin-bottom:16px;}',
      '.rptex-flow-title{font-size:14px;font-weight:800;color:#001E42;margin-bottom:14px;}',
      '.rptex-flow-sub{font-weight:400;color:#94A3B8;font-size:11.5px;}',
      '.rptex-flow-step{background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;padding:18px 18px 16px;margin-bottom:14px;}',
      '.rptex-flow-step-head{font-size:14px;font-weight:800;color:#191F28;margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.rptex-flow-num{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#3182F6;color:#fff;font-size:12px;font-weight:800;flex:none;}',
      '.rptex-flow-ta{width:100%;min-height:110px;border:1.5px solid #E2E8F0;border-radius:10px;padding:12px 14px;font-size:13px;font-family:"Noto Sans KR",sans-serif;color:#334155;resize:vertical;box-sizing:border-box;line-height:1.7;background:#F8FAFC;}',
      '.rptex-flow-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px;}',
      '.rptex-flow-note{font-size:12px;color:#64748B;}',
      /* ── 연령대별 적정 보험료 가이드 (하단 + 토글) ── */
      '.rptex-ageguide-wrap{margin-top:4px;margin-bottom:16px;display:flex;flex-direction:column;align-items:flex-start;}',
      '.rptex-ageguide-toggle{display:inline-flex;align-items:center;gap:8px;background:#F8FBFF;border:1.5px dashed #BAD7FB;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#3182F6;font-family:"Noto Sans KR",sans-serif;transition:all .15s;}',
      '.rptex-ageguide-toggle:hover{background:#EFF6FF;border-color:#3182F6;}',
      '.rptex-ageguide-toggle.open{background:#EFF6FF;}',
      '.rptex-ageguide-toggle-sub{font-weight:400;color:#94A3B8;font-size:11px;}',
      '.rptex-ageguide-plus{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#3182F6;color:#fff;font-size:14px;font-weight:800;line-height:1;flex:none;transition:transform .2s ease;}',
      '.rptex-ageguide-toggle.open .rptex-ageguide-plus{transform:rotate(45deg);}',
      '.rptex-ageguide-body{margin-top:10px;width:100%;border:1.5px solid #E2E8F0;border-radius:12px;padding:14px;background:#fff;box-sizing:border-box;}',
      '.rptex-ageguide-tbl{border-collapse:collapse;width:100%;font-size:12px;font-family:"Noto Sans KR",sans-serif;}',
      '.rptex-ageguide-tbl th,.rptex-ageguide-tbl td{border:1px solid #E2E8F0;padding:9px 10px;}',
      '.rptex-ageguide-tbl th{background:#001E42;color:#fff;font-weight:700;text-align:center;}',
      '.rptex-ageguide-hl{background:#EFF6FF;}',
      '.rptex-ageguide-tag{display:inline-block;font-size:9.5px;font-weight:700;color:#3182F6;background:#DCEBFF;border-radius:8px;padding:1px 6px;margin-left:4px;vertical-align:middle;}',
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

      if (companies.length > 0 && premiumAmounts.length === 0 && rowHasPremiumKeyword(row)) {
        for (var pc2 = coStart; pc2 < coStart + companies.length; pc2++) {
          var pv = String(row[pc2]||'').replace(/,/g,'').trim();
          var pn = parseFloat(pv) || 0;
          premiumAmounts.push(pn);
        }
        continue;
      }

      var catVal = String(row[catCol]||'').trim();
      var subVal = String(row[subCol]||'').trim();

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
        status: computeRowStatus(sum, rec), perProduct: per });
    }

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

    // 새 고객 데이터가 로드될 때마다 필수 보장 카드는 템플릿에서 새로 복제
    // (이전 고객의 수동 수정값이 남지 않도록)
    ESSENTIAL_GROUPS = cloneEssentialTemplate();
    autoMapEssential(rows);

    gState = {
      customerName: customerName || '고객',
      age: Number((ageEl0 && ageEl0.value) || 40) || 40,
      category: (catEl0 && catEl0.value) || '또래월보험비교',
      premiums: companies.map(function(name, i){
        return { name: name, amount: premiumAmounts[i] || 0 };
      }),
      lowItems: lowItems,
      excessItems: rows.filter(function(r){ return r.status === 'excess'; }),
      aiContent: null,
      essentialGroups: ESSENTIAL_GROUPS,
      applyDateTime: formatKoreanDateTime(new Date()),
    };

    renderAnalysisTable();
    renderPremiumTable();
    renderEssentialGrid();

    // 가이드가 이미 펼쳐져 있는 상태였다면(고객 전환 시) 새 나이 기준으로 갱신
    var ageGuideBody = document.getElementById('rptex-ageguide-body');
    if (ageGuideBody && ageGuideBody.style.display !== 'none') renderAgeGuideTable();

    var dtInputInit = document.getElementById('rptex-apply-dt');
    if (dtInputInit) dtInputInit.value = gState.applyDateTime;

    refreshFlowMessages();

    var ageEl = document.getElementById('rptex-age');
    var catEl = document.getElementById('rptex-category');
    var dtEl  = document.getElementById('rptex-apply-dt');
    if (ageEl) ageEl.addEventListener('input', function() {
      gState.age = Number(this.value) || 40;
      refreshPremiumSummary(); refreshAnalysisPremiumRow(); refreshMsg();
      var body = document.getElementById('rptex-ageguide-body');
      if (body && body.style.display !== 'none') renderAgeGuideTable();
    });
    if (catEl) catEl.addEventListener('change', function() { gState.category = this.value; refreshFlowMessages(); });
    if (dtEl) dtEl.addEventListener('input', function() {
      gState.applyDateTime = this.value;
      var timeEl = document.getElementById('rptex-flow-time');
      if (timeEl) timeEl.value = buildTimeCheckMsg(gState);
    });
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

    rows.forEach(function(r, i) {
      html += '<tr>';
      if (spans[i] !== undefined) {
        html += '<td class="rptex-cat" rowspan="' + spans[i] + '">' + esc(r.cat) + '</td>';
      }
      var meta   = ROW_STATUS_META[r.status] || ROW_STATUS_META.none;
      var amtCls = (r.status === 'low' || r.status === 'excess') ? 'rptex-amt-low' : '';
      var stLbl  = meta.label;
      var stCls  = meta.cls;
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

  window.rptExPremCellEdit = function(el, ci) {
    var raw = el.innerText.replace(/,/g,'').replace(/원/g,'').trim();
    var val = parseFloat(raw) || 0;
    if (gState.premiums[ci]) gState.premiums[ci].amount = val;
    el.innerText = val ? val.toLocaleString() : '-';
    var inputs = document.querySelectorAll('#rptex-premium-tbody input[data-field="amount"]');
    if (inputs[ci]) inputs[ci].value = val ? val.toLocaleString() : '';
    refreshPremiumSummary();
    refreshAnalysisPremiumRow();
    refreshMsg();
  };

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

  window.rptExToggleStatus = function(rowIdx) {
    var r = exState.rows[rowIdx];
    if (r.status === 'none') return;
    var idx = ROW_STATUS_CYCLE.indexOf(r.status);
    r.status = ROW_STATUS_CYCLE[(idx + 1) % ROW_STATUS_CYCLE.length];
    var meta = ROW_STATUS_META[r.status];
    var stEl = document.getElementById('rptex-st-' + rowIdx);
    if (stEl) { stEl.className = 'rptex-status ' + meta.cls; stEl.textContent = meta.label; }
    var amtEl = document.getElementById('rptex-amt-' + rowIdx);
    if (amtEl) amtEl.className = 'rptex-editable-cell' + ((r.status === 'low' || r.status === 'excess') ? ' rptex-amt-low' : '');
    gState.lowItems = exState.rows.filter(function(r){ return r.status === 'low'; });
    gState.excessItems = exState.rows.filter(function(r){ return r.status === 'excess'; });
    autoMapEssential(exState.rows);
    renderEssentialGrid();
    refreshMsg();
  };

  window.rptExCellEdit = function(el, rowIdx) {
    var raw = el.innerText.replace(/,/g,'').trim();
    var val = parseFloat(raw) || 0;
    exState.rows[rowIdx].customerSum = val;
    el.innerText = val ? val.toLocaleString() : '-';
    var r = exState.rows[rowIdx];
    if (r.recommend !== undefined) {
      r.status = computeRowStatus(val, r.recommend);
      var meta = ROW_STATUS_META[r.status];
      var stEl = document.getElementById('rptex-st-' + rowIdx);
      if (stEl) { stEl.className = 'rptex-status ' + meta.cls; stEl.textContent = meta.label; }
      el.className = 'rptex-editable-cell' + ((r.status === 'low' || r.status === 'excess') ? ' rptex-amt-low' : '');
      gState.lowItems = exState.rows.filter(function(r){ return r.status === 'low'; });
      gState.excessItems = exState.rows.filter(function(r){ return r.status === 'excess'; });
      // 통합 분석표를 수정했을 때 필수 보장 카드도 함께 갱신
      autoMapEssential(exState.rows);
      renderEssentialGrid();
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

  // ─── 텍스트영역 갱신: AI 결과가 있을 때만 멘트를 표시. 없으면 빈칸 유지 ───
  function refreshMsg() {
    var ta = document.getElementById('rptex-msg-output');
    if (!ta || !gState) return;
    if (!gState.aiContent) { ta.value = ''; return; }
    ta.value = makeMsg(gState);
  }

  // ─── 발송 순서 단계별 텍스트 공통 복사 함수 ───
  window.rptExCopyFlow = function(id) {
    var el = document.getElementById(id);
    if (!el || !el.value) return alert('복사할 내용이 없습니다.');
    navigator.clipboard.writeText(el.value)
      .then(function(){ alert('✅ 복사되었습니다.'); })
      .catch(function(){ el.select(); document.execCommand('copy'); alert('✅ 복사 완료'); });
  };

  window.rptExCopyMsg = function() {
    window.rptExCopyFlow('rptex-msg-output');
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

      var spans = {}, last = null, si = 0;
      exState.rows.forEach(function(r, i) {
        if (r.cat !== last) { if (last !== null) spans[si] = i - si; last = r.cat; si = i; }
      });
      if (last !== null) spans[si] = exState.rows.length - si;

      var rowsHtml = '';
      exState.rows.forEach(function(r, i) {
        var meta    = ROW_STATUS_META[r.status] || ROW_STATUS_META.none;
        var stColor = meta.color;
        var stBg    = meta.bg;
        var stLbl   = meta.label;
        rowsHtml += '<tr>';
        if (spans[i] !== undefined) {
          rowsHtml += '<td rowspan="' + spans[i] + '" style="background:#F8FAFC;font-weight:700;color:#001E42;text-align:center;padding:12px 10px;border:1px solid #E2E8F0;font-size:13px;">' + esc(r.cat) + '</td>';
        }
        rowsHtml += '<td style="text-align:left;padding:12px 16px;font-weight:600;color:#334155;border:1px solid #E2E8F0;font-size:13px;">' + esc(r.label) + '</td>';
        rowsHtml += '<td style="text-align:right;padding:12px 16px;border:1px solid #E2E8F0;font-size:13px;' + ((r.status==='low'||r.status==='excess')?'color:'+stColor+';font-weight:700;':'color:#334155;') + '">' + (r.customerSum ? r.customerSum.toLocaleString()+'만원' : '-') + '</td>';
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

  // ─── 필수 보장 분석 카드 → 이미지 복사 (카톡 전송용) ───
  window.rptExCopyEssentialImage = async function() {
    if (!gState) return alert('먼저 엑셀을 업로드해주세요.');

    var btn = document.getElementById('rptex-ess-img-copy-btn');
    if (btn) { btn.innerHTML = '⏳ 이미지 생성 중...'; btn.disabled = true; }

    try {
      if (!window.html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }

      function statusColor(status) {
        if (status === '적정') return { bg: '#E8F3FF', text: '#3182F6' };
        if (status === '부족') return { bg: '#FFF0F0', text: '#F04452' };
        if (status === '과잉') return { bg: '#FFF7E8', text: '#D97706' };
        return { bg: '#F2F4F6', text: '#8B95A1' }; // 미가입
      }

      var groupsHtml = ESSENTIAL_GROUPS.map(function(g) {
        var cols = 4;
        var itemsHtml = g.items.map(function(it) {
          var c = statusColor(it.status);
          return '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0;">'
            + '<div style="font-size:14px;font-weight:700;color:#191F28;margin-bottom:6px;white-space:nowrap;">' + esc(it.name) + '</div>'
            + '<div style="font-size:12.5px;color:#8B95A1;font-weight:500;margin-bottom:10px;">' + esc(it.amount || '미가입') + '</div>'
            + '<div style="background:' + c.bg + ';color:' + c.text + ';font-weight:800;font-size:13px;border-radius:14px;padding:9px 0;width:100%;max-width:104px;">' + esc(it.status) + '</div>'
            + '</div>';
        }).join('');
        return '<div style="background:#fff;border:1px solid #EDF0F3;border-radius:24px;padding:26px 24px;margin-bottom:16px;">'
          + '<div style="font-size:17px;font-weight:800;color:#191F28;margin-bottom:2px;">' + esc(g.title) + '</div>'
          + '<div style="font-size:12.5px;color:#6B7684;margin-bottom:22px;">' + esc(g.desc) + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:26px 16px;">' + itemsHtml + '</div>'
          + '</div>';
      }).join('');

      var html = '<div style="width:640px;background:#F2F4F6;border-radius:24px;padding:26px;font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',\'Noto Sans KR\',sans-serif;">'
        + '<div style="font-size:17px;font-weight:800;color:#191F28;margin:4px 4px 18px;letter-spacing:-0.2px;">' + esc(gState.customerName) + '님의 필수 보장 분석</div>'
        + groupsHtml
        + '<div style="padding:10px 6px 2px;font-size:11px;color:#94A3B8;line-height:1.6;">본 분석은 고객 제공 가입설계서 기준의 참고 자료이며, 실제 보장 내용은 약관을 기준으로 합니다.</div>'
        + '</div>';

      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      var canvas = await window.html2canvas(wrapper.firstElementChild, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#F2F4F6',
        logging: false,
      });
      document.body.removeChild(wrapper);

      canvas.toBlob(async function(blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✅ 필수 보장 분석 이미지가 복사되었습니다!\n카카오톡 채팅창에 바로 붙여넣기(Ctrl+V) 하세요.');
        } catch(e) {
          var a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = '필수보장분석.png';
          a.click();
          alert('📥 클립보드 복사가 차단되어 이미지를 다운로드했습니다.\n다운로드된 이미지를 카카오톡에 첨부해주세요.');
        }
        if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 필수보장 이미지 복사'; btn.disabled = false; }
      }, 'image/png');

    } catch(err) {
      console.error(err);
      alert('이미지 생성 실패: ' + err.message);
      if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 필수보장 이미지 복사'; btn.disabled = false; }
    }
  };

  window.rptExReset = function() {
    exState = { customerName:'', companies:[], rows:[], premiumAmounts:[] };
    gState  = null;
    ESSENTIAL_GROUPS = cloneEssentialTemplate();
    var r = document.getElementById('rptex-result'); if(r) r.style.display='none';
    var d = document.getElementById('rptex-drop-text'); if(d) d.textContent='클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    var f = document.getElementById('rptex-file-input'); if(f) f.value='';
    var dt = document.getElementById('rptex-apply-dt'); if(dt) dt.value='';
    var ageGuideBody = document.getElementById('rptex-ageguide-body');
    var ageGuideBtn  = document.getElementById('rptex-ageguide-toggle-btn');
    if (ageGuideBody) ageGuideBody.style.display = 'none';
    if (ageGuideBtn) ageGuideBtn.classList.remove('open');
    hideError();
  };

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();