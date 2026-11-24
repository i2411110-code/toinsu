// ================================================
// 토스 CRM 화면 붙여넣기 → 니즈환기 리포트 생성기
// v6.8: ① 발송 2단계 이미지를 '상태 기반 맞춤형'으로 개편
//          — 암: 상단 요약(일반암·유사암·고액암 금액+상태) → 부족한 항목(유사암=갑상선암 스토리) 중심 / 적정·충분 항목은 '잘 준비되어 있어요'
//          — 뇌·심장: 생활비 비교 대신 통계 + 보장 범위(뇌출혈⊂뇌졸중⊂뇌혈관질환 등) + 진단비를 준비해야 하는 이유
//          — 실비·화재·운전자 이미지 신규: 미가입자용 비교 예시표 / 법 개정 타임라인과 가입 시점 비교
//       ② 월 생활비를 연령대별 평균으로 자동 매핑 (LIVING_BY_AGE 표에서 수정)
//       ③ 성별 선택 추가 (CRM 성별 자동 인식) — 갑상선암 통계 문구에 사용
// v6.7: ① '고객 기본정보' 화면 붙여넣기 지원 — 상담 목적(카테고리)·신청 일시·보험나이 자동 입력
//       ② 발송 2단계 '보장 분석 결과 첨부'를 카테고리별 이미지로 분리
// v6.6: 엑셀 업로드/파싱 제거 → '토스 CRM 화면 붙여넣기' 전용
// v6.5: 하단에 '+ 연령대별 적정 보험료 가이드' 토글 카드 추가
// v6.4: '분석표 이미지 복사' 버튼 색상 통일 + makeMsg() 따옴표 버그 수정
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
        '(가족)일상생활배상책임': 10000,
    '교통사고처리지원금': 20000, '벌금(대물)': 500, '벌금(대인)': 2000,
    '변호사선임비용': 5000, '자동차부상치료비': 30,
    '화재벌금': 2000, '보존치료': 100, '보철치료': 100,

    // ─── 항암 치료비 / n대·종 수술비 기준금액 (만원) ───
    // 아래 줄 앞의 // 를 지우고 숫자를 넣으면 그 기준으로 적정/부족/과잉이 자동 판정됩니다.
    // 비워두면(기준 없음) 가입 시 '적정', 미가입 시 '미가입'으로만 표시됩니다.
     '표적항암약물허가치료비': 10000,
     '중입자치료비': 5000,
     '세기조절방사선치료비': 2000,
     '양성자치료비': 2000,
     'CAR-T항암치료비': 5000,
     '로봇암 수술비': 1000,
     '암 수술비': 1000,            // (토스 표에 '암수술' 행이 있으면 위쪽 '암수술' 값이 사용됩니다)
     '항암방사선·약물치료비': 1000,
     'n대·종 수술비': 1000,         // 항목명이 보장명 그대로(예: '1~5종수술비')면 그 이름으로 추가
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

  // ================================================================
  // ✅ 경각심·니즈환기 이미지용 통계 · 기준 (v6.8)
  //    ※ 고객에게 나가는 자료이므로 매년 최신 통계로 교체하고, 사내 심의/컴플라이언스 기준에 맞는지 확인하세요.
  //    ※ 숫자·출처 문구는 아래에서만 고치면 이미지에 그대로 반영됩니다.
  // ================================================================

  // ── 월 생활비(만원) ──
  var LIVING_COST_MAN = 294;   // 가구당 월평균 소비지출(만원) — 통계청(국가데이터처) 가계동향조사 2025 연간(1인 이상 가구)
  var LIVING_DETAIL = [        // 같은 통계의 비목별 월평균(만원). 나머지는 '그 외'로 자동 계산 (전체 평균일 때만 표시)
    { label: '식료품·비주류음료', man: 44.9 },
    { label: '주거·수도·광열',   man: 36.1 },
  ];
  var LIVING_SRC = '통계청(국가데이터처) 2025년 가계동향조사 · 1인 이상 가구 월평균 소비지출';
  var LIVING_SRC_AGE = '통계청(국가데이터처) 가계동향조사 · 가구주 연령대별 월평균 소비지출';

  // ★ 연령대별 월평균 생활비(만원) — 고객 보험나이에 맞춰 자동 선택됩니다.
  //   아래 man 값은 지금 전체 평균(294)으로 채워져 있습니다.
  //   국가데이터처(KOSIS) '가계동향조사 > 가구주 연령별 가구당 월평균 가계수지' 표의 소비지출(만원)을
  //   연령대별로 확인해서 man 숫자만 바꿔 넣으세요. (숫자를 바꾸면 이미지 출처 문구도 '가구주 연령대별'로 자동 변경)
  var LIVING_BY_AGE = [
    { maxAge: 29,  label: '20대 이하', man: 294 },
    { maxAge: 39,  label: '30대',      man: 294 },
    { maxAge: 49,  label: '40대',      man: 294 },
    { maxAge: 59,  label: '50대',      man: 294 },
    { maxAge: 999, label: '60대 이상', man: 294 },
  ];
  function livingEntryForAge(age) {
    var a = Number(age) || 40;
    for (var i = 0; i < LIVING_BY_AGE.length; i++) if (a <= LIVING_BY_AGE[i].maxAge) return LIVING_BY_AGE[i];
    return LIVING_BY_AGE[LIVING_BY_AGE.length - 1];
  }
  function livingIsAgeSpecific(entry) { return !!entry && entry.man !== LIVING_COST_MAN; }
  function livingSrcFor(man) {
    return man === LIVING_COST_MAN ? LIVING_SRC : LIVING_SRC_AGE;
  }

  // ── 암 / 뇌 / 심장 이미지 설정 ──
  //    rows: [CRM 소분류명, 짧은 이름, '적정·충분일 때 보여줄 한 줄']
  var THYROID_SRC = '보건복지부·국립암센터 「2023년 국가암등록통계」(갑상선암 발생 순위, 여성 암 발생 건수) · 「2022년 국가암등록통계」(갑상선암 5년 상대생존율 100.1%, 2018~2022년 진단)';
  var RARE_SRC = '보건복지부·국립암센터 「2022년 국가암등록통계」(2018~2022년 진단, 5년 상대생존율: 췌장암 16.5%, 간암 39.4%, 폐암 40.6%)';

  // 유사암(소액암) 설명 — 갑상선암 스토리용
  var SIMILAR_NOTE = '갑상선암·기타피부암·제자리암·경계성종양은 약관상 ‘유사암(소액암)’으로 분류되는 경우가 많아요. 이 경우 일반암 진단비가 아니라 유사암 진단비 기준(보통 일반암의 10~20% 수준)으로 지급돼요. 상품 약관에 따라 달라요.';

  // 갑상선암 통계 타일 (여성 / 그 외)
  var THYROID_TILES_F = [
    { big: '2.6만명', title: '여성 갑상선암 발생', desc: '2023년 한 해 여성 26,114명이 진단받았어요. 여성 암 발생 2위예요.', src: '국가암등록통계 2023' },
    { big: '1위', title: '남녀 전체 발생 1위 암', desc: '2023년 가장 많이 발생한 암이 갑상선암이에요.', src: '국가암등록통계 2023' },
    { big: '100.1%', title: '5년 상대생존율', desc: '치료 뒤에도 오래 살아가기 때문에 치료 이후 관리·재발 대비 기간이 길어요.', src: '국가암등록통계 2022' },
  ];
  var THYROID_TILES_ALL = [
    { big: '1위', title: '남녀 전체 발생 1위 암', desc: '2023년 가장 많이 발생한 암이 갑상선암이에요.', src: '국가암등록통계 2023' },
    { big: '10~30대', title: '가장 흔한 암', desc: '10대·20대·30대에서 가장 많이 발생한 암이 갑상선암이에요.', src: '국가암등록통계 2023' },
    { big: '100.1%', title: '5년 상대생존율', desc: '치료 뒤에도 오래 살아가기 때문에 치료 이후 관리·재발 대비 기간이 길어요.', src: '국가암등록통계 2022' },
  ];
  // 고액암 통계 타일
  var RARE_TILES = [
    { big: '16.5%', title: '췌장암 5년 상대생존율', desc: '10명 중 2명도 안 되는 수준이에요.', src: '국가암등록통계 2022' },
    { big: '39.4%', title: '간암 5년 상대생존율', desc: '전체 암 평균(72.9%)의 절반 남짓이에요.', src: '국가암등록통계 2022' },
    { big: '40.6%', title: '폐암 5년 상대생존율', desc: '치료 기간이 길고 치료비 부담이 큰 암일수록 추가 대비가 필요해요.', src: '국가암등록통계 2022' },
  ];

  var RISK_CFG = {
    cancer: {
      icon: '🎗️',
      title: '암 진단비 점검',
      jobTitle: '암 진단비 — 상태별 맞춤 (유사암·갑상선암 포함)',
      rows: [
        ['일반암진단',         '일반암', '진단 직후 치료비와 소득 공백을 함께 대비할 수 있는 핵심 담보예요.'],
        ['소액암(유사암)진단', '유사암', '갑상선암처럼 발생 빈도가 높은 암까지 대비되어 있어요.'],
        ['고액암진단',         '고액암', '치료비 부담이 큰 암에 대한 추가 대비가 되어 있어요.'],
      ],
      targetMonths: 60, targetLabel: '5년(60개월) 경과관찰 기간',
      scenario: '가정: 암 진단 후 치료로 일을 이어가기 어려워 소득이 끊기는 경우',
      statTitle: '진단받고 나면, 소득이 먼저 흔들립니다',
      tiles: [
        { big: '73.7%', title: '암 5년 상대생존율', desc: '10명 중 7명 이상이 5년 넘게 생존해요. 치료 뒤 ‘살아갈 시간’이 그만큼 길어졌다는 뜻이에요.', src: '국가암등록통계 2023' },
        { big: '1.42배', title: '진단 후 실직 위험', desc: '19~50세 근로자를 6년 추적하니 26.5%가 일자리를 잃었어요. (일반인 23.2%)', src: 'Supportive Care in Cancer 2023' },
        { big: '50.5%', title: '실직 후 복직 비율', desc: '일반인(57.4%)보다 낮아 소득 공백이 더 길어질 수 있어요.', src: 'Supportive Care in Cancer 2023' },
      ],
      sources: [
        '보건복지부·국립암센터 「2023년 국가암등록통계」(2019~2023년 진단, 5년 상대생존율 73.7%)',
        'Supportive Care in Cancer (2023), 국내 암 진단 근로자 6년 추적 코호트(19~50세, 건강보험 행정자료)',
      ],
    },
    brain: {
      icon: '🧠',
      title: '뇌혈관질환 진단비 점검',
      jobTitle: '뇌혈관질환 — 통계 · 보장범위 비교',
      rows: [
        ['뇌혈관질환진단', '뇌혈관질환', '뇌졸중은 물론 그 밖의 뇌혈관 질환까지 넓게 대비되어 있어요.'],
        ['뇌졸중질환진단', '뇌졸중',     '뇌출혈과 뇌경색(막힘)을 모두 대비할 수 있어요.'],
        ['뇌출혈질환진단', '뇌출혈',     '뇌출혈 진단 시 목돈을 받을 수 있도록 준비되어 있어요.'],
      ],
      statTitle: '뇌졸중, 한 번으로 끝나지 않습니다',
      tiles: [
        { big: '11.3만건', title: '연간 뇌졸중 발생', desc: '2023년 한 해 113,098건이 발생했어요.', src: '질병관리청 2023' },
        { big: '25.3%', title: '다시 발생한 비중', desc: '뇌졸중 4건 중 1건은 재발생이에요.', src: '질병관리청 2023' },
        { big: '19.8%', title: '발병 1년 내 사망', desc: '65세 이상은 31.2%로 더 높아요.', src: '질병관리청 2023' },
      ],
      note: '',
      // 질환별 진료 환자 수·1인당 진료비 (건강보험심사평가원 2022). costMan 은 알고 있는 값만 넣으세요(없으면 null).
      patientsTitle: '질환별 환자 수와 치료비',
      patientsSub: '뇌졸중 환자 10명 중 8명 이상은 뇌경색, 뇌출혈은 약 6분의 1이에요.',
      patients: [
        { name: '뇌졸중',   n: 634177, costMan: 385.6 },
        { name: '뇌경색',   n: 520895, costMan: null },
        { name: '뇌출혈',   n: 102127, costMan: null },
      ],
      patientsBase: 634177,
      patientsNote: '진료비는 건강보험 급여 기준 1인당 평균이에요. 비급여·재활·소득 공백은 포함되지 않아 실제 부담은 더 커질 수 있어요.',
      whyTitle: '왜 ‘뇌혈관질환’ 진단비를 준비해야 할까요?',
      whySub: '같은 뇌 질환이라도 담보 이름에 따라 보장받는 범위가 달라져요.',
      ladder: [
        { label: '뇌혈관질환진단', range: '가장 넓음', w: 100, desc: '뇌출혈·뇌경색뿐 아니라 그 밖의 뇌혈관 질환까지 포함돼요.' },
        { label: '뇌졸중질환진단', range: '중간',     w: 68,  desc: '뇌출혈과 뇌경색이 대상이에요.' },
        { label: '뇌출혈질환진단', range: '가장 좁음', w: 38,  desc: '터지는 뇌출혈만 대상이에요. 환자가 훨씬 많은 뇌경색은 해당되지 않아요.' },
      ],
      closingNeed: '범위가 넓은 담보부터 확인하면 같은 비용으로 더 넓게 대비할 수 있어요.',
      closingGood: '진단비는 치료비뿐 아니라 재활·회복 기간의 소득 공백을 메우는 목적이에요. 지금 구성이 그 역할을 하고 있어요.',
      sources: [
        '질병관리청 「2023 심뇌혈관질환 발생통계」(뇌졸중 113,098건, 재발생 비중 25.3%, 1년 치명률 19.8%, 65세 이상 31.2%)',
        '건강보험심사평가원 「2022년 진료 현황」(뇌졸중 환자 634,177명 · 뇌경색 520,895명 · 뇌출혈 102,127명, 1인당 진료비 뇌졸중 385.6만원)',
      ],
    },
    heart: {
      icon: '❤️',
      title: '심장질환 진단비 점검',
      jobTitle: '심장질환 — 통계 · 보장범위 비교',
      rows: [
        ['허혈성심장질환진단', '허혈성심장질환', '협심증까지 포함해 넓은 범위의 심장 질환에 대비되어 있어요.'],
        ['급성심근경색진단',   '급성심근경색',   '급성심근경색 진단 시 목돈을 받을 수 있도록 준비되어 있어요.'],
        ['허혈성심장질환수술', '심장질환 수술비', '혈관 치료·수술이 필요할 때의 비용까지 대비되어 있어요.'],
      ],
      statTitle: '한 번 막히면, 그 뒤 1년이 승부입니다',
      tiles: [
        { big: '3.5만건', title: '연간 심근경색 발생', desc: '2023년 34,768건, 이 중 약 75%가 남성이에요.', src: '질병관리청 2023' },
        { big: '8.9%', title: '발병 30일 내 사망', desc: '급성기 한 달 안에 10명 중 1명 가까이 사망해요.', src: '질병관리청 2023' },
        { big: '16.1%', title: '발병 1년 내 사망', desc: '남성 13.5% · 여성 23.6%. 환자 중 9.6%는 재발 사례예요.', src: '질병관리청 2023' },
      ],
      note: '',
      whyTitle: '왜 ‘허혈성심장질환’ 진단비를 준비해야 할까요?',
            matrixTitle: '같은 심장 질환, 담보에 따라 지급이 갈려요',
      matrixSub: '협심증과 급성심근경색을 예로 비교해 봤어요.',
      matrixCols: ['허혈성심장질환진단', '급성심근경색진단'],
      matrixColNames: ['허혈성심장질환 진단비', '급성심근경색 진단비'],
      matrix: [
        { name: '협심증',       desc: '혈관이 좁아져 가슴 통증이 생기는 상태', pay: [true, false] },
        { name: '급성심근경색', desc: '혈관이 갑자기 완전히 막히는 응급 상태', pay: [true, true]  },
      ],
      matrixNote: '지급 여부는 상품 약관의 질병 분류 기준에 따라 달라질 수 있어요.',
      whySub: '같은 심장 질환이라도 담보 이름에 따라 보장받는 범위가 달라져요.',
      ladder: [
        { label: '허혈성심장질환진단', range: '넓음',   w: 100, desc: '협심증·심근경색 등 심장 혈관이 좁아지거나 막히는 질환이 폭넓게 포함돼요.' },
        { label: '급성심근경색진단',   range: '좁음',   w: 55,  desc: '혈관이 갑자기 완전히 막히는 급성심근경색만 대상이에요. 협심증은 해당되지 않는 경우가 많아요.' },
        { label: '허혈성심장질환수술', range: '치료 단계', w: null, desc: '혈관 치료·수술이 필요할 때 지급되는 담보예요. 진단비와 별도로 확인이 필요해요.' },
      ],
      closingNeed: '범위가 넓은 진단비부터 확인하면 같은 비용으로 더 넓게 대비할 수 있어요.',
      closingGood: '진단비는 치료비뿐 아니라 회복 기간의 소득 공백을 메우는 목적이에요. 지금 구성이 그 역할을 하고 있어요.',
      sources: [
        '질병관리청 「2023 심뇌혈관질환 발생통계」(심근경색증 34,768건, 30일 치명률 8.9%, 1년 치명률 16.1%, 재발 비중 9.6%)',
        '담보별 보장 범위는 한국표준질병사인분류(KCD)와 상품 약관의 정의에 따라 다를 수 있습니다',
      ],
    },
  };

  // ── 실손의료비 이미지 설정 ──
  var MED_CFG = {
    icon: '🏥',
    title: '실손의료비 점검',
    jobTitle: '실손의료비 — 가입/미가입 비교 예시표',
    rows: [
      ['질병입원의료비', '질병 입원', '질병으로 입원해도 병원비 걱정 없이 치료받을 수 있어요.'],
      ['질병외래의료비', '질병 통원', '통원 치료비 본인부담도 돌려받을 수 있어요.'],
      ['질병처방조제료', '질병 처방', '약값 본인부담도 대비되어 있어요.'],
      ['상해입원의료비', '상해 입원', '다쳐서 입원해도 병원비를 돌려받을 수 있어요.'],
      ['상해외래의료비', '상해 통원', '사고로 인한 통원 치료비도 대비되어 있어요.'],
      ['상해처방조제료', '상해 처방', '사고 후 약값도 대비되어 있어요.'],
    ],
    // 예시표 가정값(만원): 맹장염 수술 · 입원 5일
    example: { title: '맹장염 수술 · 입원 5일', pay: 200, nonpay: 100, payRate: 0.8, nonpayRate: 0.7 },
    sources: [
      '금융위원회 「4세대 실손의료보험 출시」 보도자료(자기부담 급여 20%·비급여 30%, 통원 최소 공제 1~2만원, 비급여 특약 분리)',
    ],
  };

  // ── 화재 이미지 설정 ──
  var FIRE_CFG = {
    icon: '🔥',
    title: '화재·배상책임 점검',
    jobTitle: '화재(실화) 배상책임 — 법 개정 · 비교 예시표',
    liabLabels: ['일상생활배상책임담보', '가족생활배상책임담보', '(가족)일상생활배상책임'],
    fineLabel: '화재벌금',
    damageMan: 5000,   // 예시표 가정: 이웃집 피해액(만원)
    events: [
      { date: '2007.08.30', title: '헌법재판소 ‘경과실 실화 면책’ 헌법불합치', desc: '가벼운 실수로 낸 불은 이웃에 배상하지 않아도 되던 기존 규정이 위헌 결정을 받았어요.' },
      { date: '2009.05.08', title: '실화책임법 전부 개정', desc: '이제는 가벼운 실수로 낸 불이어도 이웃 피해에 배상책임이 생겨요. (중대한 과실이 없으면 법원에 배상액 경감 청구 가능)' },
    ],
    goodLine: '이웃에게 번질 수 있는 실화 배상책임까지 대비되어 있어요.',
    sources: [
      '헌법재판소 2007. 8. 30. 선고 2004헌가25 결정(실화책임에 관한 법률 헌법불합치)',
      '「실화책임에 관한 법률」 전부개정(법률 제9648호, 2009. 5. 8. 시행)',
      '예시표의 피해액·보상 내용은 이해를 돕기 위한 가정이며, 실제 보상은 약관과 과실 정도에 따라 달라집니다',
    ],
  };

  // ── 운전자보험 이미지 설정 ──
  var DRIVER_CFG = {
    icon: '🚗',
    title: '운전자보험 점검',
    jobTitle: '운전자보험 — 법 개정 타임라인 · 가입 시점 비교',
    rows: [
      ['교통사고처리지원금', '교통사고처리지원금', '형사합의금 부담을 대비할 수 있어요.'],
      ['벌금(대인)',         '벌금(대인)',         '사람을 다치게 한 사고의 벌금을 대비할 수 있어요.'],
      ['벌금(대물)',         '벌금(대물)',         '물건 피해 사고의 벌금을 대비할 수 있어요.'],
      ['변호사선임비용',     '변호사선임비용',     '형사 절차에서 변호사 비용을 대비할 수 있어요.'],
    ],
    finePeakMan: 3000,   // 어린이보호구역 어린이 상해 시 벌금 상한(만원)
        events: [
      { date: '2009-02-26', show: '2009.02.26', title: '교통사고처리특례법 일부 위헌 결정',
        desc: '보험에 가입했어도 중상해 사고는 형사처벌 대상이 될 수 있게 되어, 교통사고처리지원금(형사합의금) 대비가 중요해졌어요.',
        short: '형사합의금 대비 필요', miss: '교통사고처리지원금(형사합의금) 담보가 없거나 부족할 수 있어요.' },
      { date: '2020-03-25', show: '2020.03.25', title: '민식이법 시행',
        desc: '어린이보호구역 어린이 상해: 징역 1~15년 또는 벌금 500만~3,000만원 / 사망: 무기 또는 3년 이상 징역. 이후 운전자 벌금 담보 한도도 3,000만원까지 확대됐어요.',
        short: '민식이법', miss: '벌금(대인) 한도가 최대 3,000만원에 못 미칠 수 있어요.' },
      { date: '2022-07-12', show: '2022.07.12', title: '보행자 보호 의무 강화 (우회전·횡단보도 일시정지)',
        desc: '횡단보도를 건너려는 보행자가 있을 때도 일시정지해야 하고, 보행자우선도로·아파트단지 등으로 보호 의무가 넓어졌어요. 어기고 사고가 나면 12대 중과실로 형사처벌 대상이 될 수 있어요.',
        short: '보행자 보호 의무 강화', miss: '형사합의금·벌금·변호사비용 한도가 지금 기준에 충분한지 확인이 필요해요.' },
      { date: '2025-12-01', show: '2025.12~', kind: 'terms', title: '변호사선임비용 담보 약관 개정 (금융당국 권고)',
        desc: '재판 단계(1·2·3심)별 한도로 나뉘고 자기부담 50%가 붙는 상품이 판매되고 있어요. (보험사별 시행 시점 상이)',
        short: '변호사선임비용 약관 개정', miss: '이 계약은 이전 약관이 유지돼요. 다만 새 상품으로 바꾸면 새 조건(자기부담 50%)이 적용될 수 있어요.' },
    ],
    sources: [
      '헌법재판소 2009. 2. 26. 결정(교통사고처리특례법 제4조 제1항 위헌)',
      '「특정범죄 가중처벌 등에 관한 법률」 제5조의13(2020. 3. 25. 시행, 어린이보호구역 어린이 사상 사고 가중처벌)',
      '보험연구원·손해보험업계 자료(자동차보험은 벌금·변호사선임비용·교통사고처리지원금 미보장, 실손 담보는 중복 보상 불가)',
            '「도로교통법」 개정(2022. 7. 12. 시행, 보행자 보호 의무 강화)',
      '금융당국 운전자보험 변호사선임비용 담보 개정 권고(2025.11, 언론 보도 기준) 및 보험사별 개정 약관',
    ],
  };

  var CAT_IMG_MAX = 6;   // 일반 카테고리 이미지 한 장당 최대 항목 수 (넘으면 자동 분할)
  var CAT_IMG_SKIP = ['항암 치료비'];  // 필수 보장 분석(4단계) 이미지와 중복되는 대분류

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

  // STEP 1. 인사 멘트 (고객 정보 화면에서 읽은 '상담 목적' 원문이 있으면 그대로 사용)
  function buildGreetingMsg(state) {
    var name = state.customerName || '고객';
    var category = state.purposeLabel || state.category || '보험 점검';
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

  // STEP 5. 상담 안내 & 질문 멘트 — 상담 카테고리별 맞춤 + 회신 편의 안내
  var CATEGORY_QUESTION_META = {
    '실비부족': {
      hook: '실비 보장을 짚어드리기 전에, 질문 하나만 드릴게요!\n실비 관련해서 지금 가장 걸리는 부분이 뭔가요?',
      options: [
        '실비 한도가 부족한 건 아닌지 걱정돼요',
        '병원비를 실제로 얼마나 돌려받을 수 있는지 궁금해요',
        '지금 실비가 있는지 없는지도 잘 모르겠어요',
      ],
    },
    '보장부족': {
      hook: '보장 공백을 짚어드리기 전에, 질문 하나만 드릴게요!\n지금 보험에서 가장 걱정되는 부분이 뭔가요?',
      options: [
        '암·뇌·심장 같은 큰 병 진단비가 부족한 건 아닌지 걱정돼요',
        '수술비·입원비처럼 목돈 드는 항목이 빠진 건 아닌지 궁금해요',
        '어떤 보장이 부족한지 정확히 모르겠어요',
      ],
    },
    '보장과잉': {
      hook: '보험료 절감 포인트를 짚어드리기 전에, 질문 하나만 드릴게요!\n지금 보험료에 대해 어떤 생각이 가장 먼저 드시나요?',
      options: [
        '보험료를 너무 많이 내고 있는 건 아닌지 걱정돼요',
        '같은 보장을 여러 번 중복 가입한 건 아닌지 궁금해요',
        '어떤 특약을 줄여야 할지 모르겠어요',
      ],
    },
    '또래월보험비교': {
      hook: '또래 비교 결과를 안내해 드리기 전에, 질문 하나만 드릴게요!\n또래 대비 내 보험, 뭐가 제일 궁금하세요?',
      options: [
        '또래들보다 보험료를 더 내고 있는 건 아닌지 궁금해요',
        '또래들은 어떤 보장을 채워놨는지 궁금해요',
        '제 보험료 수준이 적정한지 전혀 감이 안 와요',
      ],
    },
    '종합분석': {
      hook: '분석 결과를 준비하기 전에 질문을 하나 드릴게요.\n지금 내 보험에 대해 어떤 생각이 가장 먼저 드시나요?',
      options: [
        '매달 나가는 보험료가 너무 부담돼요',
        '나중에 아플 때 제대로 보장받을 수 있을지 불안해요',
        '사실 내가 무슨 보험에 들었는지 잘 모르겠어요',
      ],
    },
  };

  function buildQuestionMsg(category) {
    var meta = CATEGORY_QUESTION_META[category] || CATEGORY_QUESTION_META['종합분석'];
    var lines = [];
    lines.push('분석 결과는 1~3일 내로 안내해 드릴 예정이에요.');
    meta.hook.split('\n').forEach(function(l){ lines.push(l); });
    lines.push('');
    lines.push('1️⃣ ' + meta.options[0]);
    lines.push('2️⃣ ' + meta.options[1]);
    lines.push('3️⃣ ' + meta.options[2]);
    lines.push('');
    lines.push('번호만 편하게 답장해주셔도 충분해요! (예: 2)');
    lines.push('');
    lines.push('상담 방식도 편하신 걸로 골라주세요 👇');
    lines.push('A. 카카오톡 상담');
    lines.push('B. 전화 상담');
    lines.push('C. 대면 상담');
    lines.push('');
    lines.push('고민 번호 + 상담 방식만 함께 보내주시면 바로 준비해서 안내드릴게요! (예: "2, B")');
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
    if (qEl) qEl.value = buildQuestionMsg(gState.category);

    refreshMsg();
  }

  // ─── 내부 상태 ───
  var exState = { customerName: '', companies: [], rows: [], premiumAmounts: [], gender: '', driverStarts: [] };
  var gState  = null;
  var custInfo = null;   // '고객 기본정보' 화면에서 읽은 값 (상담 목적·신청 일시·보험나이)
  var livingManual = false;   // 월 생활비를 사용자가 직접 고쳤는지 (true면 나이 변경 시 자동 매핑 안 함)

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
  // dataKey가 있는 항목은 분석표(rows)의 같은 이름 행에서 값을 자동으로 가져온다.
  // 항암 치료비 항목은 CRM '상품별 보장목록'에서 계산한 행(항암 치료비 대분류)과 연결된다.
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
        { name: '표적항암약물허가치료비', dataKey: '표적항암약물허가치료비', amount: '', status: '미가입' },
        { name: '중입자치료비',           dataKey: '중입자치료비', amount: '', status: '미가입' },
        { name: '세기조절방사선치료비',   dataKey: '세기조절방사선치료비', amount: '', status: '미가입' },
        { name: '양성자치료비',           dataKey: '양성자치료비', amount: '', status: '미가입' },
        { name: 'CAR-T항암치료비',        dataKey: 'CAR-T항암치료비', amount: '', status: '미가입' },
        { name: '로봇암 수술비',          dataKey: '로봇암 수술비', amount: '', status: '미가입' },
        { name: '암 수술비',              dataKey: '암수술', amount: '', status: '미가입' },
        { name: '항암방사선·약물치료비',  dataKey: '항암방사선·약물치료비', amount: '', status: '미가입' },
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

  // ─── 분석표 rows 를 기반으로 필수 보장 카드에 자동 매핑 ───
  function autoMapEssential(rows) {
    var byLabel = {};
    (rows || []).forEach(function(r) { byLabel[r.label] = r; });
    // 토스 표기 차이 대응: '암수술' ↔ '암수술비' ↔ '암 수술비'
    var cancerSurg = byLabel['암수술'] || byLabel['암수술비'] || byLabel['암 수술비'];
    if (cancerSurg) byLabel['암수술'] = cancerSurg;

    ESSENTIAL_GROUPS.forEach(function(g) {
      g.items.forEach(function(it) {
        if (!it.dataKey) return; // 수동 입력 유지 항목
        var r = byLabel[it.dataKey];
        if (r && r.customerSum > 0) {
          it.amount = r.customerSum.toLocaleString() + '만원';
          it.status = r.status === 'excess' ? '과잉' : r.status === 'ok' ? '적정' : '부족';
        } else {
          // 항목이 없거나 고객 보장합산이 0원 → 미가입
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
      + '<span style="color:#64748B;font-size:12px;">📌 CRM 데이터에서 자동으로 채워집니다 · 금액 직접 입력 · 상태버튼 클릭 시 적정 → 부족 → 미가입 → 과잉 순으로 전환됩니다.</span></p>'
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
    if (!gState) return alert('먼저 토스 CRM 화면을 붙여넣어 분석해주세요.');

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
  };

  function getHTML() {
    return ''
      /* ── STEP 1 : 토스 CRM 화면 붙여넣기 (유일한 입력 방식) ── */
      + '<div class="rpt-card" id="rptex-crm-card">'
      + '<div class="rpt-step-label">STEP 1</div>'
      + '<h3 class="rpt-step-title">토스 CRM 화면 붙여넣기</h3>'
      + '<p class="rpt-step-desc">① <b>고객 기본정보</b> 화면과 ② <b>보장분석</b> 화면을 각각 전체 선택(Ctrl+A) → 복사(Ctrl+C) → 아래에 붙여넣기(Ctrl+V)하세요. 순서는 상관없어요.<br>'
      + '<span style="color:#3182F6;font-size:12px;font-weight:600;">✨ 고객 기본정보 화면을 붙여넣으면 상담 카테고리 · 신청 일시 · 보험나이가 자동으로 입력돼요.</span><br>'
      + '<span style="color:#64748B;font-size:12px;">📌 숨긴 행은 복사되지 않아요. CRM에서 숨김을 모두 푼 뒤 복사하세요. 분석이 끝나면 붙여넣은 내용은 자동으로 지워져요. 다른 고객은 [초기화] 후 다시 붙여넣으세요.</span></p>'
      + '<textarea id="rptex-crm-text" class="rptex-flow-ta" style="min-height:110px;" placeholder="여기에 붙여넣기 (Ctrl+V) — 고객 기본정보 화면 / 보장분석 화면" onpaste="setTimeout(window.rptExHandleCrmPaste,60)"></textarea>'
      + '<div class="rptex-flow-actions">'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#3182F6;" onclick="window.rptExHandleCrmPaste()"><i class="bi bi-clipboard-data"></i> 붙여넣기 분석</button>'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#64748B;" onclick="window.rptExReset()"><i class="bi bi-arrow-counterclockwise"></i> 초기화 (다른 고객 입력)</button>'
      + '<span id="rptex-crm-status" class="rptex-flow-note"></span></div>'
      + '<div id="rptex-crm-warn" style="display:none;"></div>'
      + '</div>'

      + '<div id="rptex-result" style="display:none;">'
      + '<div class="rpt-card">'
      + '<div class="rpt-step-label">STEP 2</div>'
      + '<h3 class="rpt-step-title">보장 분석 결과</h3>'
      + '<p class="rpt-step-desc" id="rptex-summary" style="color:#3182F6;font-weight:600;"></p>'

      + '<div class="rptex-meta-row">'
      + '<div class="rptex-meta-item"><label class="rptex-meta-label">고객 나이</label>'
      + '<input type="number" id="rptex-age" class="rptex-meta-input" value="40" min="1" max="99" style="width:70px;"></div>'
      + '<div class="rptex-meta-item"><label class="rptex-meta-label" title="CRM 성별을 자동 인식해요. 갑상선암 통계 문구에 사용돼요.">성별</label>'
      + '<select id="rptex-gender" class="rptex-meta-input" style="width:90px;">'
      + '<option value="">미확인</option><option value="F">여성</option><option value="M">남성</option>'
      + '</select></div>'
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
      + '<div class="rptex-meta-item"><label class="rptex-meta-label" id="rptex-living-label" title="경각심 이미지의 ‘생활비 환산’ 기준 (고객 나이에 맞는 연령대 평균이 자동 입력돼요. 직접 고치면 그 값을 사용해요)">월 생활비(만원)</label>'
      + '<input type="number" id="rptex-living" class="rptex-meta-input" value="' + LIVING_COST_MAN + '" min="50" max="2000" style="width:80px;"></div>'
      + '</div>'

      /* ── 통합 분석표 ── */
      + '<p style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">'
      + '📊 보장 분석표 '
      + '<span style="font-weight:400;color:#94A3B8;font-size:11px;">— 상태 클릭: 상태 전환 · 합산금액 클릭: 직접 수정 · 보험료: 클릭하여 수정</span></p>'
      + '<div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;margin-bottom:4px;"><div id="rptex-table"></div></div>'
      + '<p style="font-size:11px;color:#94A3B8;margin-bottom:16px;">💡 이미지는 아래 발송 순서 2·4단계에서 카테고리별로 복사해 카카오톡에 붙여넣기 하세요. 이미지는 분석표의 상태(부족/적정/충분)에 맞춰 내용이 달라져요.</p>'

      /* ── 보험료 수동 추가 ── */
      + '<div style="border:1.5px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:16px;">'
      + '<div style="background:#001E42;color:#fff;padding:10px 14px;font-size:13px;font-weight:700;">💰 보험사별 월납 보험료 <span style="font-size:11px;font-weight:400;opacity:.8;">(CRM 자동 파싱 · 직접 수정 가능)</span></div>'
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
      + '<div class="rptex-flow-step-head"><span class="rptex-flow-num">2</span>보장 분석 결과 첨부 <span class="rptex-flow-sub">— 카테고리별로 한 장씩 전송</span></div>'
      + '<div class="rptex-flow-note" style="display:block;margin-bottom:10px;">📎 카톡에서 잘리지 않도록 카테고리별 이미지로 나눴어요. 필요한 항목만 골라 복사 → 붙여넣기 하세요. 부족/미가입 항목은 크게, 적정/충분 항목은 ‘잘 준비되어 있어요’로 자동 정리돼요.</div>'
      + '<div id="rptex-img-jobs"></div>'
      + '<details class="rptex-legacy"><summary>전체 한 장 이미지 (길어서 카톡에서 잘릴 수 있어요)</summary>'
      + '<div class="rptex-flow-actions">'
      + '<select id="rptex-img-mode" class="rptex-meta-input" style="width:230px;">'
      + '<option value="summary">요약형 (부족·미가입·과잉 중심)</option>'
      + '<option value="full">전체 상세표 (모든 항목)</option>'
      + '</select>'
      + '<button class="btn-action" style="width:auto;padding:8px 18px;background:#64748B;" id="rptex-img-copy-btn" onclick="window.rptExCopyTableImage()"><i class="bi bi-image"></i> 분석표 이미지 복사</button>'
      + '</div></details></div>'

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
      + '<div class="rptex-flow-note" style="display:block;margin-bottom:10px;">📎 상단의 "상담 카테고리" 선택값에 맞춰 멘트가 자동으로 바뀝니다.</div>'
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
      + '<button style="background:none;border:1px solid #E2E8F0;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;color:#475569;font-family:\'Noto Sans KR\',sans-serif;" onclick="window.rptExReset()"><i class="bi bi-arrow-counterclockwise"></i> 초기화 (다른 고객 입력)</button>'
      + '</div>'
      + '</div></div>';
  }

  function injectStyles() {
    if (document.getElementById('rptex-styles')) return;
    var s = document.createElement('style');
    s.id = 'rptex-styles';
    s.textContent = [
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
      /* ── 필수 보장 분석 카드 ── */
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
      /* ── 2단계: 카테고리별 이미지 목록 ── */
      '.rptex-job{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid #E2E8F0;border-radius:12px;margin-bottom:8px;background:#fff;}',
      '.rptex-job-risk{border-color:#FBD5A5;background:#FFFCF7;}',
      '.rptex-job-ico{font-size:22px;flex:none;width:34px;text-align:center;}',
      '.rptex-job-main{flex:1;min-width:0;}',
      '.rptex-job-title{font-size:13.5px;font-weight:800;color:#191F28;}',
      '.rptex-job-desc{font-size:12px;color:#64748B;margin-top:2px;}',
      '.rptex-job-tag{display:inline-block;font-size:10.5px;font-weight:700;color:#D97706;background:#FFF7E8;border-radius:8px;padding:1px 7px;margin-left:6px;vertical-align:middle;}',
      '.rptex-legacy{margin-top:10px;font-size:12px;color:#64748B;}',
      '.rptex-legacy summary{cursor:pointer;font-weight:600;}',

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

  // ================================================================
  // ✅ 토스 CRM 화면 붙여넣기 (Ctrl+A → Ctrl+C → Ctrl+V)
  //    · 보장분석 화면  → exState (분석표/보험료/필수보장)
  //    · 고객 기본정보 화면 → custInfo (상담 목적·신청 일시·보험나이 자동 입력)
  // ================================================================

  // ── 1) 토스 CRM 보장분석 텍스트 파서 (독립 모듈: 이 블록 안에서만 쓰이는 이름들) ──
  var TossCrm = (function () {
    'use strict';
  var VAL_RE  = /^(-|[\d,]+(?:\.\d+)?\s*만원)$/;   // 카테고리 표의 값 한 칸
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var PREM_RE = /^[\d,]+\s*원\s*\|\s*\S+/;          // "60,270 원 | 월납"
  var COL_LABELS = ['보험명', '보험사명', '상품 종류', '계약일', '계약상태', '갱신 유무',
    '계약자/피보험자', '증권번호', '납입 여부', '납입주기/납입기간', '보장만기/만기연령',
    '납입종료일/종료연령', '월납보험료', '기납보험료', '잔여보험료', '총보험료'];

  function won(s) {
    var m = String(s == null ? '' : s).replace(/[,\s*]/g, '').match(/(\d+)원/);
    return m ? Number(m[1]) : null;
  }
  function man(s) {
    s = String(s == null ? '' : s).trim();
    if (s === '-' || s === '') return 0;
    var m = s.replace(/,/g, '').match(/([\d.]+)\s*만원/);
    return m ? Number(m[1]) : null;
  }
  function num(s) { var m = String(s == null ? '' : s).match(/\d+/); return m ? Number(m[0]) : null; }
  function split2(s) { var p = String(s == null ? '' : s).split('/'); return [p[0].trim(), p.slice(1).join('/').trim()]; }
  function sum(a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); }
  function idx(lines, text, from, to) {
    for (var i = from || 0, e = to == null ? lines.length : to; i < e; i++) if (lines[i] === text) return i;
    return -1;
  }
  function after(lines, label, from, to) { var i = idx(lines, label, from, to); return i < 0 ? null : lines[i + 1]; }
  function col(cols, label, k) { var v = (cols[label] || [])[k]; return v === undefined ? null : v; }

  function parse(text) {
    var warnings = [];
    var raw = String(text || '');
    var lines = raw.replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);

    var iDetail = idx(lines, '가입보험 상세정보');
    var iCat = idx(lines, '카테고리별 상세정보');
    var iList = idx(lines, '상품별 보장목록');
    if (iDetail < 0 || iCat < 0) {
      return { ok: false, error: '토스 CRM 보장분석 화면 전체(Ctrl+A)를 복사했는지 확인해 주세요.', warnings: warnings };
    }
    if (iList < 0) {
      iList = lines.length;
      warnings.push('"상품별 보장목록" 구간이 없어 보장명 단위 데이터 없이 합계표만 읽었어요. (항암 치료비·n대 수술비는 미가입으로 표시될 수 있어요)');
    }

    // 1) 고객 기본정보
    var bm = (after(lines, '생년월일', 0, iDetail) || '').match(/(\d{4}-\d{2}-\d{2})\s*\(보험나이\s*(\d+)세\)/);
    var client = {
      name: lines[0],
      insuNo: (raw.match(/Insu No\.\s*(\S+)/) || [])[1] || null,
      gender: after(lines, '성별', 0, iDetail),
      birth: bm ? bm[1] : null,
      insuranceAge: bm ? Number(bm[2]) : null,
      sangryeongDate: after(lines, '상령일', 0, iDetail),
      firstLinkedAt: after(lines, '최초 보험연결일', 0, iDetail)
    };

    // 2) 요약
    var pm = raw.match(/페이지 노출 보험\s*(\d+)개\s*\/\s*전체 보험\s*(\d+)개/);
    var summary = {
      shown: pm ? Number(pm[1]) : null,
      total: pm ? Number(pm[2]) : null,
      count: num(after(lines, '보험 개수', iDetail, iCat)),
      monthlyPremium: won(after(lines, '월납 보험료 합계', iDetail, iCat)),
      paidPremium: won(after(lines, '기납 보험료 합계', iDetail, iCat)),
      remainPremium: won(after(lines, '잔여 보험료 합계', iDetail, iCat)),
      totalPremium: won(after(lines, '총 보험료 합계', iDetail, iCat))
    };
    if (pm && pm[1] !== pm[2]) {
      warnings.push('화면에 보이는 보험은 ' + pm[1] + '개이고 전체는 ' + pm[2] +
        '개예요. CRM에서 숨김을 모두 풀고 다시 복사해 주세요.');
    }

    // 3) 계약 표 (라벨 다음 줄부터 계약 수(n)만큼이 값)
    var iName = idx(lines, '보험명', iDetail, iCat);
    var iIns = iName < 0 ? -1 : idx(lines, '보험사명', iName + 1, iCat);
    if (iName < 0 || iIns < 0) {
      return { ok: false, error: '가입보험 상세정보 표를 찾지 못했어요. 화면 전체를 다시 복사해 주세요.', warnings: warnings };
    }
    var n = iIns - iName - 1;
    var cols = {};
    for (var i = iName; i < iCat; i++) {
      var lab = lines[i];
      if (lab === '매니저 의견') break;
      if (COL_LABELS.indexOf(lab) >= 0) { cols[lab] = lines.slice(i + 1, i + 1 + n); i += n; }
    }
    var contracts = [];
    for (var k = 0; k < n; k++) {
      var cyc = split2(col(cols, '납입주기/납입기간', k));
      var cov = split2(col(cols, '보장만기/만기연령', k));
      var pay = split2(col(cols, '납입종료일/종료연령', k));
      contracts.push({
        index: k,
        name: col(cols, '보험명', k),
        insurer: col(cols, '보험사명', k),
        productType: col(cols, '상품 종류', k),
        contractDate: col(cols, '계약일', k),
        status: col(cols, '계약상태', k),
        renewal: col(cols, '갱신 유무', k),
        holderInsured: col(cols, '계약자/피보험자', k),
        policyNo: col(cols, '증권번호', k),
        payStatus: col(cols, '납입 여부', k),
        payCycle: cyc[0], payYears: num(cyc[1]),
        coverageEnd: cov[0], coverageEndAge: num(cov[1]),
        payEnd: pay[0], payEndAge: num(pay[1]),
        monthlyPremium: won(col(cols, '월납보험료', k)),
        paidPremium: won(col(cols, '기납보험료', k)),
        remainPremium: won(col(cols, '잔여보험료', k)),
        totalPremium: won(col(cols, '총보험료', k)),
        coverages: []
      });
    }

    // 4) 카테고리별 표: [대분류?] 소분류 합계 값×n  (대분류는 그룹 첫 행에만 나옴)
    var matrix = [];
    var iHead = idx(lines, '보험명', iCat, iList);
    if (iHead >= 0) {
      var pos = iHead + 1 + n, pending = [], major = null;
      if (lines[pos] === '보장금액') pos++;
      while (pos < iList) {
        if (!VAL_RE.test(lines[pos])) { pending.push(lines[pos]); pos++; continue; }
        var run = [];
        while (pos < iList && VAL_RE.test(lines[pos])) run.push(lines[pos++]);
        var labels = pending.splice(0), minor = null;
        if (labels.length >= 2) { major = labels[labels.length - 2]; minor = labels[labels.length - 1]; }
        else if (labels.length === 1) { minor = labels[0]; }
        if (run.length !== n + 1) {
          warnings.push('"' + (minor || '?') + '" 행의 칸 수가 ' + run.length + '개예요(예상 ' + (n + 1) + '개).');
        }
        matrix.push({ major: major, minor: minor, totalMan: man(run[0]), byContract: run.slice(1).map(man) });
      }
    } else {
      warnings.push('카테고리별 보장 표를 찾지 못했어요.');
    }

    // 5) 상품별 보장목록: [보험사, 상품명, 상태, "보험료 | 납입주기"] + 헤더 8줄 + (8줄 × 행)
    var premIdx = [];
    for (var j = iList + 4; j < lines.length; j++) if (PREM_RE.test(lines[j])) premIdx.push(j);
    premIdx.forEach(function (p, bi) {
      var end = bi + 1 < premIdx.length ? premIdx[bi + 1] - 3 : lines.length;
      var insurer = lines[p - 3], name = lines[p - 2];
      var hdr = idx(lines, '보장종료일', p, end);
      if (hdr < 0) { warnings.push('"' + name + '" 보장목록 헤더를 찾지 못했어요.'); return; }
      var target = null;
      for (var c = 0; c < contracts.length; c++) {
        if (contracts[c].name === name && contracts[c].insurer === insurer && !contracts[c]._filled) { target = contracts[c]; break; }
      }
      if (!target) { warnings.push('보장목록의 "' + name + '" 계약을 상단 표에서 찾지 못했어요.'); return; }
      target._filled = true;
      if ((end - hdr - 1) % 8 !== 0) warnings.push('"' + name + '" 보장목록의 줄 수가 8의 배수가 아니에요.');
      for (var q = hdr + 1; q + 8 <= end; q += 8) {
        var r = lines.slice(q, q + 8);
        if (!DATE_RE.test(r[6]) || !DATE_RE.test(r[7])) {
          warnings.push('"' + name + '" 보장목록 형식이 달라 이후 행을 건너뛰었어요.');
          break;
        }
        var hasSlash = r[3].indexOf('/') >= 0, sp = split2(r[3]);
        target.coverages.push({
          holderInsured: r[0], major: r[1], minor: r[2], rawName: r[3],
          group: hasSlash ? sp[0] : null,        // 토스 분류명 (예: 암진단, 특정암진단)
          title: hasSlash ? sp[1] : r[3],        // 실제 담보명
          amountMan: man(r[4]), payYears: num(r[5]), start: r[6], end: r[7]
        });
      }
    });
    contracts.forEach(function (c) { delete c._filled; });

    // 6) 검산
    if (summary.count != null && summary.count !== n) {
      warnings.push('보험 개수(' + summary.count + ')와 읽은 계약 수(' + n + ')가 달라요.');
    }
    var active = contracts.filter(function (c) { return c.status === '정상' && c.payStatus === '납입중'; });
    var monthly = sum(active.map(function (c) { return c.monthlyPremium; }));
    if (summary.monthlyPremium != null && monthly !== summary.monthlyPremium) {
      warnings.push('월납 보험료 합계(' + summary.monthlyPremium + '원)와 계약별 합(' + monthly + '원)이 달라요.');
    }
    matrix.forEach(function (row) {
      if (Math.abs(sum(row.byContract) - row.totalMan) > 0.001) {
        warnings.push('"' + row.minor + '" 합계(' + row.totalMan + ')와 칸 합(' + sum(row.byContract) +
          ')이 달라요. 토스가 겹치는 특약을 합산하지 않았을 수 있어요.');
      }
    });

    return { ok: true, client: client, summary: summary, contracts: contracts, matrix: matrix, warnings: warnings };
  }
    return { parse: parse };
  })();

  // ── 1-b) 토스 CRM '고객 기본정보' 화면 파서 (상담 목적 · 신청 일시 · 보험나이) ──
  var CustInfo = (function () {
    'use strict';
    var CATEGORIES = ['또래월보험비교', '실비부족', '종합분석', '보장부족', '보장과잉'];
    var DT_RE = /^(\d{4})-(\d{2})-(\d{2})\s*\(.\)\s*(오전|오후)\s*(\d{1,2})시\s*(\d{1,2})분$/;

    function dtValue(s) {
      var m = DT_RE.exec(String(s || ''));
      if (!m) return 0;
      var h = Number(m[5]) % 12;
      if (m[4] === '오후') h += 12;
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, Number(m[6])).getTime();
    }
    function idxOf(lines, text, from) {
      for (var i = from || 0; i < lines.length; i++) if (lines[i] === text) return i;
      return -1;
    }
    // 상담 목적 문구 → 이 도구의 상담 카테고리
    function mapCategory(purpose) {
      var t = String(purpose || '').replace(/\s+/g, '');
      if (CATEGORIES.indexOf(t) >= 0) return t;
      if (/또래/.test(t)) return '또래월보험비교';
      if (/실비|실손/.test(t)) return '실비부족';
      if (/과잉|과다|절감|절약/.test(t)) return '보장과잉';
      if (/부족|공백|보완/.test(t)) return '보장부족';
      if (/종합|전체|점검|분석/.test(t)) return '종합분석';
      return null;
    }

    function parse(text) {
      var warnings = [];
      var lines = String(text || '').replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);

      var iHead = idxOf(lines, '상담신청 일시');
      if (iHead < 0) return { ok: false, error: '고객 기본정보 화면의 "신청 이력" 표를 찾지 못했어요. 화면 전체(Ctrl+A)를 다시 복사해 주세요.', warnings: warnings };

      var iPurpose = -1;
      for (var i = iHead; i < Math.min(iHead + 6, lines.length); i++) if (lines[i] === '상담 목적') { iPurpose = i; break; }
      if (iPurpose < 0) return { ok: false, error: '"상담 목적" 열을 찾지 못했어요. 화면 전체(Ctrl+A)를 다시 복사해 주세요.', warnings: warnings };

      // 신청 이력 행: [No, 일시, 지역, 상담 목적] × n
      var apps = [], p = iPurpose + 1;
      while (p + 3 < lines.length + 0 && /^\d+$/.test(lines[p]) && /^\d{4}-\d{2}-\d{2}/.test(lines[p + 1])) {
        apps.push({ no: Number(lines[p]), dt: lines[p + 1], region: lines[p + 2], purpose: lines[p + 3], t: dtValue(lines[p + 1]) });
        p += 4;
      }
      if (!apps.length) return { ok: false, error: '신청 이력에 내용이 없어요.', warnings: warnings };

      // 가장 최근 신청 건 사용
      var pick = apps.slice().sort(function (a, b) { return b.t - a.t || a.no - b.no; })[0];
      if (apps.length > 1) {
        warnings.push('신청 이력이 ' + apps.length + '건이에요. 가장 최근 건(' + pick.dt + ' · ' + pick.purpose + ')을 사용했어요.');
      }

      var category = mapCategory(pick.purpose);
      if (!category) {
        warnings.push('상담 목적 "' + pick.purpose + '"은(는) 카테고리 목록에 없어 "종합분석"으로 넣었어요. 필요하면 상담 카테고리를 직접 바꿔주세요.');
        category = '종합분석';
      }

      var nameIdx = idxOf(lines, '고객명');
      var name = nameIdx >= 0 ? lines[nameIdx + 1] : lines[0];
      var bIdx = idxOf(lines, '생년월일');
      var am = bIdx >= 0 ? String(lines[bIdx + 1] || '').match(/\(보험나이\s*(\d+)세\)/) : null;

      return {
        ok: true,
        name: name,
        age: am ? Number(am[1]) : null,
        applyDateTime: pick.dt,
        purpose: pick.purpose,
        category: category,
        region: pick.region,
        count: apps.length,
        warnings: warnings
      };
    }
    return { parse: parse };
  })();

  // ── 2) 파서 결과 → exState ──
  function crmShortInsurer(s) { return String(s || '').replace(/해상보험$/, '').replace(/보험$/, '').trim(); }
  function crmCleanName(s) { return String(s || '').replace(/^\(무\)\s*/, '').replace(/^무배당\s*/, '').trim(); }
  function crmFit(arr, n) { var a = (arr || []).slice(0, n); while (a.length < n) a.push(0); return a; }

  // ── 3) 항암 치료비 8개 항목 + n대/종 수술비: '상품별 보장목록'의 보장명으로 계산 ──
  // 같은 계약 안에서 겹치는 특약은 '가장 큰 금액 1개'만 인정(토스 표와 같은 방식), 계약끼리는 합산.
  var CRM_CANCER_ORDER = [
    '표적항암약물허가치료비', '중입자치료비', '세기조절방사선치료비', '양성자치료비',
    'CAR-T항암치료비', '로봇암 수술비', '암 수술비', '항암방사선·약물치료비'
  ];
  var CRM_CANCER_RULES = {
    '표적항암약물허가치료비': function (t) { return /표적항암/.test(t); },
    '중입자치료비':           function (t) { return /중입자/.test(t); },
    '세기조절방사선치료비':   function (t) { return /세기조절/.test(t); },
    '양성자치료비':           function (t) { return /양성자/.test(t); },
    // 토스는 '특정면역항암약물허가치료비'를 카티(CAR-T) 항에 넣어 보여줌 → 동일하게 맞춤
    // (면역항암 약물과 CAR-T는 실제로는 다른 치료이므로, 분리하려면 '|면역항암' 을 지우세요)
    'CAR-T항암치료비':        function (t) { return /카티|CAR-?T|면역항암/i.test(t); },
    '로봇암 수술비':          function (t) { return /(로봇|다빈치).*암|암.*(로봇|다빈치)/.test(t); },
    // '유사암제외' 같은 표기는 지우고 판단 / 로봇·다빈치 수술은 위 항목으로 분리 / 유사암 전용 수술은 제외
    '암 수술비':              function (t) {
      var s = String(t).replace(/(유사암|소액암|특정암)\s*제외/g, '');
      return /암.*수술/.test(s) && !/(로봇|다빈치)/.test(s) && !/(유사암|소액암|갑상선|제자리|경계성)/.test(s);
    },
    '항암방사선·약물치료비':  function (t) { return /항암방사선|항암약물치료/.test(t) && !/허가|표적|면역|카티|CAR/i.test(t); }
  };

  // 계약별로 '조건에 맞는 보장 중 최댓값' 배열 반환 (정상 계약만)
  function crmBestPerContract(parsed, testFn) {
    return parsed.contracts.map(function (c) {
      if (c.status !== '정상') return 0;
      var best = 0;
      c.coverages.forEach(function (v) {
        if (testFn(v) && (v.amountMan || 0) > best) best = v.amountMan;
      });
      return best;
    });
  }

  // n대 / n종 수술비 판별 (예: '1~5종 수술비', '질병1-7종수술비', '5대기관질병수술비') → 정리된 이름 or null
  function crmNSurgeryKey(v) {
    var t = String(v.title || v.rawName || '');
    if (!/수술/.test(t)) return null;
    if (!/\d\s*[~\-–∼]?\s*\d*\s*(대|종)/.test(t)) return null;
    return t.replace(/\(.*?\)/g, '').replace(/\s+/g, '');
  }

  // 분석표에 쓰는 '권장기준 없는 수동 행' (가입하면 적정, 아니면 미가입 / 상태는 클릭으로 전환 가능)
  function crmManualRow(cat, label, per) {
    var total = per.reduce(function (s, v) { return s + (v || 0); }, 0);
    var rec = RECOMMEND[label];   // 상단 RECOMMEND에 기준금액을 넣으면 자동 판정
    return { cat: cat, label: label, customerSum: total, recommend: rec, manual: true,
      status: rec !== undefined ? computeRowStatus(total, rec) : (total > 0 ? 'ok' : 'unregistered'),
      perProduct: per };
  }

  function crmBuildExtraRows(parsed, existingRows) {
    var extra = [];
    var has = function (labels) {
      return existingRows.some(function (r) { return labels.indexOf(r.label) >= 0; });
    };

    // (1) 항암 치료비 8개 항목 — 항상 표시(없으면 미가입)
    CRM_CANCER_ORDER.forEach(function (name) {
      if (name === '암 수술비' && has(['암수술', '암수술비', '암 수술비'])) return; // 토스 표에 이미 있음
      var rule = CRM_CANCER_RULES[name];
      var per = crmBestPerContract(parsed, function (v) { return rule(v.rawName); });
      extra.push(crmManualRow('항암 치료비', name, per));
    });

    // (2) n대 / n종 수술비 — CRM 보장명에서 찾은 것만 행으로 추가, 없으면 '미가입' 자리표시 1행
    var keys = [], perByKey = {};
    parsed.contracts.forEach(function (c, ci) {
      if (c.status !== '정상') return;
      c.coverages.forEach(function (v) {
        var k = crmNSurgeryKey(v);
        if (!k) return;
        if (!perByKey[k]) { perByKey[k] = parsed.contracts.map(function () { return 0; }); keys.push(k); }
        if ((v.amountMan || 0) > perByKey[k][ci]) perByKey[k][ci] = v.amountMan;
      });
    });
    var NS_CAT = 'n대·종 수술비';
    if (keys.length) {
      keys.forEach(function (k) { extra.push(crmManualRow(NS_CAT, k, perByKey[k])); });
    } else {
      extra.push(crmManualRow(NS_CAT, 'n대·종 수술비', parsed.contracts.map(function () { return 0; })));
    }
    return extra;
  }

  // 운전자 담보(교통사고처리지원금·벌금·변호사선임비용)의 보장 시작일을 계약별로 수집 → 운전자보험 이미지의 '가입 시점 vs 법 개정' 비교에 사용
  var CRM_DRIVER_RE = /교통사고처리지원금|(대인|대물).*벌금|벌금.*(대인|대물)|스쿨존.*벌금|운전자.*벌금|변호사.*선임|선임.*비용/;
  function crmDriverStarts(parsed) {
    var out = [];
    parsed.contracts.forEach(function (c) {
      if (c.status !== '정상') return;
      var isDriverProduct = /운전자/.test(String(c.name || ''));
      var starts = [];
      c.coverages.forEach(function (v) {
        var t = String(v.rawName || '');
        if (/화재/.test(t)) return;
        if ((isDriverProduct || CRM_DRIVER_RE.test(t)) && v.start) starts.push(v.start);
      });
      if (starts.length) {
        starts.sort();
        out.push({ name: (crmShortInsurer(c.insurer) + ' ' + crmCleanName(c.name)).trim(), start: starts[0] });
      }
    });
    out.sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
    return out;
  }

  function crmToExState(parsed) {
    var cs = parsed.contracts, n = cs.length, seen = {};
    // 같은 보험사가 여러 건이어도 열 이름이 겹치지 않게 '보험사 + 상품명'으로 구성
    var companies = cs.map(function (c) {
      var base = (crmShortInsurer(c.insurer) + ' ' + crmCleanName(c.name)).trim();
      seen[base] = (seen[base] || 0) + 1;
      return seen[base] > 1 ? base + ' (' + seen[base] + ')' : base;
    });
    // 월납 보험료는 '정상 + 납입중' 계약만 반영 (토스 화면 합계와 같은 기준)
    var prem = cs.map(function (c) {
      return (c.status === '정상' && c.payStatus === '납입중') ? (c.monthlyPremium || 0) : 0;
    });
    var rows = parsed.matrix.map(function (m) {
      var rec = RECOMMEND[m.minor];
      return { cat: m.major || '', label: m.minor, customerSum: m.totalMan, recommend: rec,
        status: computeRowStatus(m.totalMan, rec), perProduct: crmFit(m.byContract, n) };
    });
    rows = rows.concat(crmBuildExtraRows(parsed, rows));
    return {
      customerName: parsed.client.name, companies: companies, rows: rows, premiumAmounts: prem,
      gender: parsed.client.gender || '', driverStarts: crmDriverStarts(parsed)
    };
  }

  function genderCode(s) {
    s = String(s || '');
    if (/여/.test(s)) return 'F';
    if (/남/.test(s)) return 'M';
    return '';
  }

  // 고객 나이에 맞는 연령대 평균 생활비를 입력칸에 자동 반영 (사용자가 직접 고친 뒤에는 건드리지 않음)
  function syncLivingToAge(force) {
    var livEl = document.getElementById('rptex-living');
    var lblEl = document.getElementById('rptex-living-label');
    var entry = livingEntryForAge(gState ? gState.age : 40);
    if (force) livingManual = false;
    if (livEl && !livingManual) livEl.value = entry.man;
    if (lblEl) lblEl.textContent = '월 생활비(만원) · ' + (livingIsAgeSpecific(entry) ? entry.label + ' 평균' : '전체 평균');
  }

  // ── 4) 화면 처리 ──
  function crmStatus(msg) { var el = document.getElementById('rptex-crm-status'); if (el) el.textContent = msg || ''; }
  function crmShowWarn(list, isError) {
    var box = document.getElementById('rptex-crm-warn'); if (!box) return;
    if (!list || !list.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.cssText = 'display:block;margin-top:12px;padding:12px 16px;border-radius:8px;font-size:12.5px;line-height:1.7;'
      + (isError ? 'background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;' : 'background:#FFFBEB;border:1px solid #FDE68A;color:#B45309;');
    box.innerHTML = list.map(function (w) { return (isError ? '⚠️ ' : '• ') + esc(w); }).join('<br>');
  }
  function crmPasteReset() {
    var ta = document.getElementById('rptex-crm-text'); if (ta) ta.value = '';
    crmShowWarn(null); crmStatus('');
  }

  // 고객 정보(상담 목적·신청 일시·나이)를 이미 분석된 화면에 즉시 반영 (보장분석을 먼저 붙여넣은 경우)
  function applyCustInfoLive() {
    if (!gState || !custInfo) return;
    var ageEl = document.getElementById('rptex-age');
    var catEl = document.getElementById('rptex-category');
    var dtEl  = document.getElementById('rptex-apply-dt');
    if (custInfo.age) { gState.age = custInfo.age; if (ageEl) ageEl.value = custInfo.age; }
    if (custInfo.category) { gState.category = custInfo.category; if (catEl) catEl.value = custInfo.category; }
    gState.purposeLabel = custInfo.purpose || '';
    if (custInfo.applyDateTime) { gState.applyDateTime = custInfo.applyDateTime; if (dtEl) dtEl.value = custInfo.applyDateTime; }
    syncLivingToAge(false);
    refreshPremiumSummary();
    refreshAnalysisPremiumRow();
    var body = document.getElementById('rptex-ageguide-body');
    if (body && body.style.display !== 'none') renderAgeGuideTable();
    refreshFlowMessages();
  }

  window.rptExHandleCrmPaste = function () {
    var ta = document.getElementById('rptex-crm-text');
    if (!ta || !ta.value.trim()) return;
    var text = ta.value;
    var hasInfo = text.indexOf('상담신청 일시') >= 0;
    var hasCov  = text.indexOf('가입보험 상세정보') >= 0 && text.indexOf('카테고리별 상세정보') >= 0;
    crmShowWarn(null); crmStatus('⏳ 분석 중...');

    if (!hasInfo && !hasCov) {
      crmShowWarn(['토스 CRM 고객 기본정보 화면 또는 보장분석 화면 전체(Ctrl+A)를 복사했는지 확인해 주세요.'], true);
      crmStatus(''); return;
    }

    try {
      var info = hasInfo ? CustInfo.parse(text) : null;
      var parsed = hasCov ? TossCrm.parse(text) : null;
      var errs = [];
      if (info && !info.ok) { errs.push(info.error); info = null; }
      if (parsed && !parsed.ok) { errs.push(parsed.error); parsed = null; }
      if (parsed && (!parsed.matrix.length || !parsed.contracts.length)) {
        errs.push('카테고리별 보장 표를 읽지 못했어요. 화면 전체(Ctrl+A)를 다시 복사해 주세요.'); parsed = null;
      }
      if (!info && !parsed) { crmShowWarn(errs, true); crmStatus(''); return; }

      var warns = errs.slice();
      if (info) warns = warns.concat(info.warnings);
      if (parsed) warns = warns.concat(parsed.warnings);

      // 고객명 일치 확인 (다른 고객의 화면이 섞이지 않게)
      var curName = parsed ? parsed.client.name : (exState.rows.length ? exState.customerName : '');
      if (info && curName && info.name && info.name !== curName) {
        crmShowWarn(['고객명이 달라요. 고객 기본정보는 "' + info.name + '", 보장분석은 "' + curName + '"님이에요. [초기화] 후 같은 고객의 화면을 붙여넣어 주세요.'], true);
        crmStatus(''); return;
      }
      if (!info && parsed && custInfo && custInfo.name !== parsed.client.name) {
        warns.push('앞서 붙여넣은 고객 기본정보("' + custInfo.name + '")는 다른 고객이라 적용하지 않았어요.');
        custInfo = null;
      }
      if (info) custInfo = info;

      var statusParts = [];
      if (parsed) {
        var ageEl = document.getElementById('rptex-age');           // 보험나이 자동 입력 (render()가 이 값을 읽음)
        if (parsed.client.insuranceAge && ageEl) ageEl.value = parsed.client.insuranceAge;
        exState = crmToExState(parsed);
        render();                                                    // custInfo 가 있으면 render() 안에서 함께 반영
        statusParts.push(parsed.client.name + '님 · 보험 ' + parsed.contracts.length + '건 · 보장분석 완료');
        if (!custInfo) warns.push('고객 기본정보 화면도 붙여넣으면 상담 카테고리·신청 일시가 자동으로 입력돼요.');
        if (!exState.gender) warns.push('CRM에서 성별을 읽지 못했어요. 상단 ‘성별’에서 직접 선택하면 갑상선암 통계 문구가 맞춰져요.');
      } else if (gState) {
        applyCustInfoLive();                                         // 보장분석이 먼저 들어와 있던 경우
      }
      if (info) {
        statusParts.push('상담 목적 "' + info.purpose + '" → ' + info.category + ' · 신청 ' + info.applyDateTime + ' 자동 입력');
        if (!parsed && !gState) statusParts.push('이제 보장분석 화면을 붙여넣어 주세요');
      }

      ta.value = '';                                                 // 고객 정보가 화면에 남지 않도록 비움
      crmShowWarn(warns, false);
      crmStatus('✅ ' + statusParts.join(' · '));
    } catch (e) {
      console.error(e);
      crmShowWarn(['붙여넣기 분석 오류: ' + e.message], true); crmStatus('');
    }
  };
  // ================================================================
  // ✅ 토스 CRM 화면 붙여넣기 끝
  // ================================================================

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
    var genEl0 = document.getElementById('rptex-gender');

    // 고객 기본정보 화면에서 읽은 값이 같은 고객이면 나이·상담 카테고리·신청 일시를 자동 적용
    var ci = (custInfo && custInfo.name === customerName) ? custInfo : null;
    if (ci) {
      if (ci.age && ageEl0) ageEl0.value = ci.age;
      if (ci.category && catEl0) catEl0.value = ci.category;
    }
    if (genEl0) genEl0.value = genderCode(exState.gender);

    // 새 고객 데이터가 로드될 때마다 필수 보장 카드는 템플릿에서 새로 복제
    // (이전 고객의 수동 수정값이 남지 않도록)
    ESSENTIAL_GROUPS = cloneEssentialTemplate();
    autoMapEssential(rows);

    gState = {
      customerName: customerName || '고객',
      age: Number((ageEl0 && ageEl0.value) || 40) || 40,
      gender: genEl0 ? genEl0.value : '',
      category: (catEl0 && catEl0.value) || '또래월보험비교',
      purposeLabel: ci ? (ci.purpose || '') : '',
      premiums: companies.map(function(name, i){
        return { name: name, amount: premiumAmounts[i] || 0 };
      }),
      lowItems: lowItems,
      excessItems: rows.filter(function(r){ return r.status === 'excess'; }),
      aiContent: null,
      essentialGroups: ESSENTIAL_GROUPS,
      applyDateTime: (ci && ci.applyDateTime) || formatKoreanDateTime(new Date()),
    };

    syncLivingToAge(true);   // 고객 나이에 맞는 연령대 평균 생활비로 초기화

    renderAnalysisTable();
    renderPremiumTable();
    renderEssentialGrid();

    // 가이드가 이미 펼쳐져 있는 상태였다면(고객 전환 시) 새 나이 기준으로 갱신
    var ageGuideBody = document.getElementById('rptex-ageguide-body');
    if (ageGuideBody && ageGuideBody.style.display !== 'none') renderAgeGuideTable();

    var dtInputInit = document.getElementById('rptex-apply-dt');
    if (dtInputInit) dtInputInit.value = gState.applyDateTime;

    refreshFlowMessages();   // (내부에서 refreshMsg → 카테고리별 이미지 목록도 갱신)

    // on* 속성 방식으로 등록 → 고객을 여러 번 분석해도 리스너가 중복 쌓이지 않음
    var ageEl = document.getElementById('rptex-age');
    var catEl = document.getElementById('rptex-category');
    var genEl = document.getElementById('rptex-gender');
    var dtEl  = document.getElementById('rptex-apply-dt');
    var livEl = document.getElementById('rptex-living');
    if (ageEl) ageEl.oninput = function() {
      gState.age = Number(this.value) || 40;
      syncLivingToAge(false);
      refreshPremiumSummary(); refreshAnalysisPremiumRow(); refreshMsg();
      var body = document.getElementById('rptex-ageguide-body');
      if (body && body.style.display !== 'none') renderAgeGuideTable();
    };
    if (genEl) genEl.onchange = function() { gState.gender = this.value; renderImageJobs(); };
    if (catEl) catEl.onchange = function() { gState.category = this.value; gState.purposeLabel = ''; refreshFlowMessages(); };
    if (dtEl) dtEl.oninput = function() {
      gState.applyDateTime = this.value;
      var timeEl = document.getElementById('rptex-flow-time');
      if (timeEl) timeEl.value = buildTimeCheckMsg(gState);
    };
    if (livEl) livEl.oninput = function() { livingManual = true; renderImageJobs(); };
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
    var r = exState.rows[rowIdx];
    r.customerSum = val;
    el.innerText = val ? val.toLocaleString() : '-';

    var changed = false;
    if (r.recommend !== undefined) {
      r.status = computeRowStatus(val, r.recommend);
      changed = true;
    } else if (r.manual) {
      // 권장기준이 없는 항목(항암 치료비·n대 수술비): 금액이 있으면 적정, 없으면 미가입
      r.status = val > 0 ? 'ok' : 'unregistered';
      changed = true;
    }
    if (changed) {
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
    } else {
      renderImageJobs();
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

    // on* 속성 방식 → 다시 렌더해도 이벤트가 중복 등록되지 않음
    tbody.oninput = function(e) {
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
    };
    tbody.onchange = function(e) {
      if (e.target.dataset.field === 'amount') {
        var n = parseFloat(e.target.value.replace(/,/g,'')) || 0;
        e.target.value = n ? n.toLocaleString() : '';
        var idx = Number(e.target.dataset.idx);
        var pCell = document.getElementById('rptex-prem-co-' + idx);
        if (pCell) pCell.textContent = n ? n.toLocaleString() : '-';
      }
    };
    tbody.onclick = function(e) {
      var btn = e.target.closest('[data-del]');
      if (!btn) return;
      gState.premiums.splice(Number(btn.dataset.del), 1);
      renderPremiumTable();
      refreshPremiumSummary();
      refreshAnalysisPremiumRow();
      refreshMsg();
    };

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
    renderImageJobs();   // 상태/금액이 바뀔 때마다 2단계 카테고리별 이미지 목록도 최신화
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

  // ================================================================
  // ✅ 이미지 복사 공통 (html2canvas, 카톡 전송용)
  // ================================================================

  // HTML 문자열 → 이미지로 렌더 → 클립보드 복사 (차단 시 다운로드)
  function copyHtmlAsImage(html, bg, fileName, okMsg) {
    return new Promise(async function(resolve, reject) {
      var wrapper = null;
      try {
        wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;';
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        var canvas = await window.html2canvas(wrapper.firstElementChild, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: bg,
          logging: false,
        });
        document.body.removeChild(wrapper);
        wrapper = null;

        canvas.toBlob(async function(blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            alert(okMsg);
          } catch(e) {
            var a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = fileName;
            a.click();
            alert('📥 클립보드 복사가 차단되어 이미지를 다운로드했습니다.\n다운로드된 이미지를 카카오톡에 첨부해주세요.');
          }
          resolve();
        }, 'image/png');
      } catch (err) {
        if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        reject(err);
      }
    });
  }

  var IMG_FONT = '\'Malgun Gothic\',\'Apple SD Gothic Neo\',\'Noto Sans KR\',sans-serif';
  var IMG_DISCLAIMER = '본 분석은 고객 제공 가입설계서 기준의 참고 자료이며, 실제 보장 내용은 약관을 기준으로 합니다.';

// ================================================================
  // ✅ 발송 2단계: 상태 기반 맞춤 이미지 (v6.8)
  //    암 · 뇌 · 심장 · 실비 · 화재 · 운전자 + 그 외 대분류 점검 이미지
  //    · 부족/미가입 → 크게 강조하고 '왜 필요한지'를 보여줌
  //    · 적정/과잉(충분) → '잘 준비되어 있어요'로 짧게 정리
  // ================================================================

  function findRowByLabel(label) {
    var rows = exState.rows || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].label === label) return rows[i];
    return null;
  }
  function fmtMan(n) { return (Math.round((n || 0) * 10) / 10).toLocaleString('ko-KR') + '만원'; }
  function monthsLabel(m) {
    if (!(m >= 1)) return '1개월 미만';
    if (m >= 12) {
      var y = Math.floor(m / 12), rm = Math.round(m - y * 12);
      if (rm === 12) { y += 1; rm = 0; }
      return y + '년' + (rm ? ' ' + rm + '개월' : '');
    }
    return Math.round(m) + '개월';
  }
  function getLivingCost() {
    var el = document.getElementById('rptex-living');
    var v = el ? Number(el.value) : 0;
    return v > 0 ? v : LIVING_COST_MAN;
  }

  // 한 항목의 현재 상태 (행이 없거나 0원이면 미가입, 기준없음은 가입 시 적정)
  function rowState(label) {
    var r = findRowByLabel(label);
    var sum = r ? (r.customerSum || 0) : 0;
    var st = (!r || sum <= 0) ? 'unregistered' : r.status;
    if (st === 'none') st = 'ok';
    return { row: r, exists: !!r, sum: sum, status: st, rec: r ? r.recommend : undefined };
  }
  function isNeed(st) { return st === 'low' || st === 'unregistered'; }
  function statusMeta(st) { return ROW_STATUS_META[st] || ROW_STATUS_META.none; }

  // ── 이미지 공통 조각 ──
  function imgWrap(inner, width) {
    return '<div style="width:' + (width || 640) + 'px;box-sizing:border-box;background:#F2F4F6;border-radius:24px;padding:24px;font-family:' + IMG_FONT + ';">' + inner + '</div>';
  }
  function imgHeader(icon, title, sub) {
    return '<div style="background:linear-gradient(135deg,#001E42,#0B3A6F);color:#fff;border-radius:18px;padding:22px 24px;">'
      + '<div style="font-size:21px;font-weight:800;letter-spacing:-0.3px;line-height:1.35;">' + icon + ' ' + esc(title) + '</div>'
      + (sub ? '<div style="font-size:13.5px;opacity:.88;margin-top:7px;line-height:1.5;">' + sub + '</div>' : '')
      + '</div>';
  }
  function card(inner, extra) {
    return '<div style="margin-top:14px;background:#fff;border-radius:16px;padding:18px 18px 16px;' + (extra || '') + '">' + inner + '</div>';
  }
  function cardTitle(t, sub) {
    return '<div style="font-size:15.5px;font-weight:800;color:#191F28;line-height:1.4;">' + t + '</div>'
      + (sub ? '<div style="font-size:12.5px;color:#6B7684;margin-top:4px;line-height:1.55;">' + sub + '</div>' : '');
  }
  function pill(st, labelOverride) {
    var m = statusMeta(st);
    return '<span style="display:inline-block;background:' + m.bg + ';color:' + m.color + ';font-weight:800;font-size:12.5px;border-radius:12px;padding:5px 12px;white-space:nowrap;">' + (labelOverride || m.label) + '</span>';
  }
  // 상단 요약: 항목명 + 금액 + 상태(예: 일반암 17,000만원 (과잉))
  function summaryCard(title, items, cols) {
    cols = cols || items.length;
    var cells = items.map(function (it) {
      return '<div style="width:' + (100 / cols).toFixed(2) + '%;box-sizing:border-box;padding:6px 6px;text-align:center;">'
        + '<div style="font-size:13px;font-weight:700;color:#4E5968;">' + esc(it.name) + '</div>'
        + '<div style="font-size:17px;font-weight:800;color:#191F28;margin:5px 0 8px;letter-spacing:-0.3px;">' + (it.sum > 0 ? fmtMan(it.sum) : '미가입') + '</div>'
        + pill(it.status)
        + '</div>';
    }).join('');
    return card((title ? '<div style="font-size:13px;font-weight:800;color:#6B7684;margin:0 4px 8px;">' + esc(title) + '</div>' : '')
      + '<div style="display:flex;flex-wrap:wrap;">' + cells + '</div>');
  }
  function statTiles(tiles) {
    return '<div style="display:flex;justify-content:space-between;margin-top:12px;">' + tiles.map(function (t) {
      return '<div style="width:31.5%;box-sizing:border-box;background:#F8FAFC;border-radius:14px;padding:14px 10px 11px;text-align:center;">'
        + '<div style="font-size:22px;font-weight:800;color:#F04452;letter-spacing:-0.5px;line-height:1.2;">' + esc(t.big) + '</div>'
        + '<div style="font-size:12.5px;font-weight:800;color:#191F28;margin-top:6px;">' + esc(t.title) + '</div>'
        + '<div style="font-size:11.5px;color:#6B7684;line-height:1.55;margin-top:6px;">' + esc(t.desc) + '</div>'
        + '<div style="font-size:10px;color:#A0AAB5;margin-top:7px;">' + esc(t.src) + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }
  // '잘 준비되어 있어요' 카드: items = [{name, sum, status, good}]
  function goodCard(items, title) {
    if (!items.length) return '';
    var rows = items.map(function (it) {
      return '<div style="display:flex;align-items:flex-start;padding:9px 0;border-top:1px solid #EDF0F3;">'
        + '<div style="flex:none;width:22px;font-size:16px;">✅</div>'
        + '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:800;color:#191F28;">' + esc(it.name) + ' <span style="font-weight:600;color:#6B7684;font-size:12.5px;">' + (it.sum > 0 ? fmtMan(it.sum) : '') + '</span></div>'
        + (it.good ? '<div style="font-size:12.5px;color:#4E5968;line-height:1.55;margin-top:2px;">' + esc(it.good) + '</div>' : '') + '</div>'
        + '</div>';
    }).join('');
    return card('<div style="font-size:15.5px;font-weight:800;color:#3182F6;margin-bottom:4px;">' + (title || '잘 준비되어 있으세요! 👏') + '</div>' + rows, 'background:#F5F9FF;');
  }
  function bannerAllGood(text) {
    return '<div style="margin-top:14px;background:#E8F3FF;border-radius:16px;padding:18px 18px;text-align:center;font-size:16px;font-weight:800;color:#1D5FD0;line-height:1.5;">' + esc(text) + '</div>';
  }
  function footerSources(list, extraNote) {
    return '<div style="padding:12px 4px 0;font-size:10.5px;color:#94A3B8;line-height:1.65;">'
      + (list || []).map(function (t) { return '· 출처: ' + esc(t); }).join('<br>')
      + '<br>※ ' + (extraNote ? esc(extraNote) + ' ' : '') + esc(IMG_DISCLAIMER)
      + '</div>';
  }
  // 요약 한 줄 (작업 목록 설명용): 일반암 과잉 · 유사암 부족 · 고액암 과잉
  function statusLine(items) {
    return items.map(function (it) { return it.name + ' ' + statusMeta(it.status).label; }).join(' · ');
  }

  // 생활비 환산 카드 (암 '일반암'이 부족/미가입일 때만 사용)
  function livingCalcCard(sum, mainName, cfg) {
    var living = getLivingCost();
    var months = living > 0 ? sum / living : 0;
    var need = cfg.targetMonths * living;
    var ratio = cfg.targetMonths > 0 ? months / cfg.targetMonths : 0;
    var pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    var color = sum <= 0 ? '#DC2626' : ratio < 0.34 ? '#DC2626' : ratio < 1 ? '#D97706' : '#3182F6';
    var verdict = sum <= 0 ? '미가입 — 진단 즉시 생활비 공백이 시작돼요'
      : ratio < 0.34 ? '생활비 ' + monthsLabel(months) + '분 — 금방 바닥나요'
      : ratio < 1 ? cfg.targetLabel + '의 ' + Math.round(ratio * 100) + '%만 버틸 수 있어요'
      : cfg.targetLabel + '을 버틸 수 있는 수준이에요';
    var gap = Math.max(0, need - sum);
    var entry = livingEntryForAge(gState.age);
    var who = (living === entry.man && livingIsAgeSpecific(entry)) ? entry.label + ' 가구 평균' : '월 생활비';
    return card(cardTitle('🧮 ' + esc(gState.customerName) + '님 ' + esc(mainName) + ' 진단비를 생활비로 환산하면', esc(cfg.scenario))
      + '<div style="text-align:center;margin:14px 0 4px;"><div style="font-size:12.5px;color:#6B7684;">현재 진단비로 버틸 수 있는 기간</div>'
      + '<div style="font-size:34px;font-weight:800;color:' + color + ';letter-spacing:-1px;margin-top:2px;">' + (sum > 0 ? '약 ' + monthsLabel(months) : '0개월') + '</div></div>'
      + '<div style="height:12px;background:#EEF1F4;border-radius:6px;overflow:hidden;margin:10px 0 6px;"><div style="height:12px;width:' + pct + '%;background:' + color + ';border-radius:6px;"></div></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:#8B95A1;"><span>0개월</span><span>' + esc(cfg.targetLabel) + '</span></div>'
      + '<div style="font-size:12.5px;color:#334155;line-height:1.75;margin-top:12px;background:#F8FAFC;border-radius:12px;padding:12px 14px;">'
      + fmtMan(sum) + ' ÷ ' + esc(who) + ' ' + fmtMan(living) + ' = <b>약 ' + monthsLabel(months) + '</b><br>'
      + esc(cfg.targetLabel) + ' 생활비 <b>' + fmtMan(need) + '</b>'
      + (gap > 0 ? ' 중 <b style="color:#DC2626;">' + fmtMan(gap) + ' 부족</b>' : ' → <b style="color:#3182F6;">충당 가능</b>') + '</div>'
      + '<div style="text-align:center;margin-top:12px;"><span style="display:inline-block;background:#F8FAFC;color:' + color + ';font-weight:800;font-size:14px;border-radius:14px;padding:9px 18px;">' + esc(verdict) + '</span></div>'
      + '<div style="font-size:10.5px;color:#A0AAB5;margin-top:10px;">출처: ' + esc(livingSrcFor(living)) + '</div>');
  }

  // ───────────────────────── 암 ─────────────────────────
  function buildCancerImageHTML() {
    var cfg = RISK_CFG.cancer, name = gState.customerName;
    var items = cfg.rows.map(function (d) {
      var s = rowState(d[0]);
      return { name: d[1], good: d[2], sum: s.sum, status: s.status, rec: s.rec };
    });
    var g = items[0], s = items[1], h = items[2];
    var body = '';

    // 1) 유사암(갑상선암) — 사용자가 가장 강조하길 원한 부분
    if (isNeed(s.status)) {
      var female = gState.gender === 'F';
      var maxV = Math.max(g.sum, s.sum, 1);
      var bars = '';
      if (g.sum > 0) {
        bars = '<div style="margin-top:14px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:#4E5968;font-weight:700;"><span>일반암 진단비</span><span>' + fmtMan(g.sum) + '</span></div>'
          + '<div style="height:14px;background:#EEF1F4;border-radius:7px;overflow:hidden;margin:5px 0 12px;"><div style="height:14px;width:' + Math.round(g.sum / maxV * 100) + '%;background:#3182F6;border-radius:7px;"></div></div>'
          + '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:#4E5968;font-weight:700;"><span>유사암 진단비 (갑상선암 등)</span><span style="color:#DC2626;">' + (s.sum > 0 ? fmtMan(s.sum) : '미가입') + '</span></div>'
          + '<div style="height:14px;background:#EEF1F4;border-radius:7px;overflow:hidden;margin:5px 0 4px;"><div style="height:14px;width:' + (s.sum > 0 ? Math.max(2, Math.round(s.sum / maxV * 100)) : 0) + '%;background:#F04452;border-radius:7px;"></div></div>'
          + '</div>';
      }
      var punch = g.sum > 0
        ? '일반암 진단비가 ' + fmtMan(g.sum) + '이어도, 갑상선암으로 진단받으면 받을 수 있는 금액은 <b style="color:#DC2626;">' + (s.sum > 0 ? fmtMan(s.sum) : '0원') + '</b>일 수 있어요.'
        : '갑상선암으로 진단받으면 받을 수 있는 금액은 <b style="color:#DC2626;">' + (s.sum > 0 ? fmtMan(s.sum) : '0원') + '</b>일 수 있어요.';
      var gapTxt = (s.rec !== undefined && s.sum < s.rec)
        ? '<div style="margin-top:10px;font-size:12.5px;color:#4E5968;">유사암 권장 <b>' + fmtMan(s.rec) + '</b> 대비 <b style="color:#DC2626;">' + fmtMan(s.rec - s.sum) + ' 부족</b></div>' : '';
      body += card(cardTitle('🦋 ' + (female ? '여성에게 특히 가까운 암, 갑상선암' : '가장 흔한 암, 갑상선암'),
          female ? '여성 암 발생 2위, 그런데 일반암 진단비로는 보장되지 않는 경우가 많아요.' : '발생이 가장 많은 암인데, 일반암 진단비로는 보장되지 않는 경우가 많아요.')
        + '<div style="font-size:13.5px;color:#191F28;line-height:1.7;margin-top:12px;background:#FFF5F5;border-radius:12px;padding:12px 14px;">' + punch + '</div>'
        + bars + gapTxt
        + statTiles(female ? THYROID_TILES_F : THYROID_TILES_ALL)
        + '<div style="font-size:11.5px;color:#6B7684;line-height:1.65;margin-top:12px;">' + esc(SIMILAR_NOTE) + '</div>');
    }

    // 2) 일반암이 부족/미가입 → 통계 + 생활비 환산 (이때만 생활비 사용)
    if (isNeed(g.status)) {
      body += card(cardTitle('📊 ' + esc(cfg.statTitle)) + statTiles(cfg.tiles));
      body += livingCalcCard(g.sum, g.name, cfg);
    }

    // 3) 고액암이 부족/미가입 → 생존율 통계로 접근
    if (isNeed(h.status)) {
      body += card(cardTitle('💊 치료비 부담이 큰 암, 고액암', '치료 기간이 길고 비용이 큰 암일수록 일반암 진단비 외에 추가 대비가 필요해요.')
        + '<div style="font-size:13px;color:#191F28;line-height:1.7;margin-top:10px;">현재 고액암 진단비 <b style="color:#DC2626;">' + (h.sum > 0 ? fmtMan(h.sum) : '미가입') + '</b>'
        + (h.rec !== undefined ? ' / 권장 ' + fmtMan(h.rec) : '') + '</div>'
        + statTiles(RARE_TILES));
    }

    // 4) 적정·충분(과잉 포함) 항목 → 짧게
    var goods = items.filter(function (it) { return !isNeed(it.status); });
    var needs = items.filter(function (it) { return isNeed(it.status); });
    if (!needs.length) body += bannerAllGood('암 진단비, 정말 잘 준비되어 있으세요! 👏');
    body += goodCard(goods, needs.length ? '이 부분은 잘 준비되어 있어요 ✅' : '항목별로 이렇게 대비되어 있어요');

    var sources = cfg.sources.slice();
    if (isNeed(s.status)) sources.push(THYROID_SRC);
    if (isNeed(h.status)) sources.push(RARE_SRC);
    return imgWrap(imgHeader(cfg.icon, name + '님 암 진단비', '일반암 · 유사암 · 고액암 현황을 한눈에 확인해요')
      + summaryCard('', items, 3) + body + footerSources(sources, '유사암·고액암의 분류와 지급 범위는 상품 약관에 따라 다릅니다.'));
  }

  // ───────────────────── 뇌혈관 · 심장 ─────────────────────
  function buildDiseaseImageHTML(kind) {
    var cfg = RISK_CFG[kind], name = gState.customerName;
    var items = cfg.rows.map(function (d) {
      var s = rowState(d[0]);
      return { name: d[1], label: d[0], good: d[2], sum: s.sum, status: s.status, rec: s.rec };
    });
    var needs = items.filter(function (it) { return isNeed(it.status); });
    var goods = items.filter(function (it) { return !isNeed(it.status); });
    var body = '';

    // 1) 통계
    body += card(cardTitle('📊 ' + esc(cfg.statTitle)) + statTiles(cfg.tiles)
      + (cfg.note ? '<div style="font-size:12px;color:#475569;line-height:1.6;background:#F8FAFC;border-radius:12px;padding:11px 13px;margin-top:10px;">' + esc(cfg.note) + '</div>' : ''));

    // 2) 질환별 환자 비율 + 치료비 (뇌혈관)
    if (cfg.patients && needs.length) {
      var base = cfg.patientsBase || cfg.patients[0].n;
      var prow = cfg.patients.map(function (p, i) {
        var pct = Math.round(p.n / base * 1000) / 10;
        var colors = ['#3182F6', '#6AA9F9', '#F04452'];
        var c = colors[i % colors.length];
        return '<div style="margin-top:12px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:800;color:#191F28;"><span>' + esc(p.name) + '</span>'
          + '<span style="font-size:12.5px;color:#6B7684;font-weight:600;">' + p.n.toLocaleString('ko-KR') + '명' + (i > 0 ? ' · 뇌졸중 환자의 ' + pct + '%' : '') + '</span></div>'
          + '<div style="height:12px;background:#EEF1F4;border-radius:6px;overflow:hidden;margin-top:5px;"><div style="height:12px;width:' + Math.max(2, Math.min(100, pct)) + '%;background:' + c + ';border-radius:6px;"></div></div>'
          + (p.costMan ? '<div style="font-size:12px;color:#4E5968;margin-top:4px;">1인당 진료비 <b>' + fmtMan(p.costMan) + '</b></div>' : '')
          + '</div>';
      }).join('');
      body += card(cardTitle('🧑‍⚕️ ' + esc(cfg.patientsTitle), esc(cfg.patientsSub)) + prow
        + '<div style="font-size:11px;color:#8B95A1;line-height:1.6;margin-top:12px;">' + esc(cfg.patientsNote) + '</div>');
    }

    // 3) 왜 이 진단비를 준비해야 하나 — 보장 범위 사다리 (부족·미가입이 있을 때만 자세히)
        // 2-b) 질환 예시표 (협심증 · 급성심근경색) — cfg.matrix 가 있는 질환에서만 표시
    if (cfg.matrix && needs.length) {
      var mcols = cfg.matrixCols.map(function (lb) { return rowState(lb); });
      var mhead = '<div style="display:flex;align-items:flex-end;margin-top:14px;">'
        + '<div style="width:34%;"></div>'
        + cfg.matrixColNames.map(function (nm, ci) {
            return '<div style="width:33%;text-align:center;padding:0 4px;box-sizing:border-box;">'
              + '<div style="font-size:12.5px;font-weight:800;color:#191F28;line-height:1.4;">' + esc(nm) + '</div>'
              + '<div style="font-size:11.5px;color:#6B7684;margin:3px 0 5px;">' + (mcols[ci].sum > 0 ? fmtMan(mcols[ci].sum) : '미가입') + '</div>'
              + pill(mcols[ci].status) + '</div>';
          }).join('')
        + '</div>';
      var mrows = cfg.matrix.map(function (r) {
        var anyPay = false;
        var cells = r.pay.map(function (covers, ci) {
          var has = mcols[ci].sum > 0, bg, fg, txt;
          if (!covers)  { bg = '#F2F4F6'; fg = '#8B95A1'; txt = '대상 아님'; }
          else if (has) { bg = '#EFF6FF'; fg = '#1D5FD0'; txt = '✅ ' + fmtMan(mcols[ci].sum); anyPay = true; }
          else          { bg = '#FFF0F0'; fg = '#F04452'; txt = '미가입'; }
          return '<div style="width:33%;padding:0 4px;box-sizing:border-box;"><div style="background:' + bg + ';color:' + fg + ';font-weight:800;font-size:12.5px;border-radius:12px;padding:10px 0;text-align:center;">' + txt + '</div></div>';
        }).join('');
        return '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #EDF0F3;">'
          + '<div style="display:flex;align-items:center;">'
          +   '<div style="width:34%;padding-right:6px;box-sizing:border-box;"><div style="font-size:14px;font-weight:800;color:#191F28;">' + esc(r.name) + '</div>'
          +   '<div style="font-size:11px;color:#6B7684;line-height:1.5;margin-top:2px;">' + esc(r.desc) + '</div></div>'
          +   cells + '</div>'
          + (anyPay ? '' : '<div style="margin-top:8px;font-size:12.5px;font-weight:800;color:#DC2626;background:#FFF5F5;border-radius:10px;padding:8px 10px;line-height:1.55;">' + esc(name) + '님이 ' + esc(r.name) + '(으)로 진단받으면, 지금 보장으로는 받을 수 있는 진단비가 없을 수 있어요.</div>')
          + '</div>';
      }).join('');
      body += card(cardTitle('🫀 ' + esc(cfg.matrixTitle), esc(cfg.matrixSub)) + mhead + mrows
        + '<div style="font-size:11px;color:#8B95A1;line-height:1.6;margin-top:12px;">' + esc(cfg.matrixNote) + '</div>');
    }
    if (needs.length) {
      var lad = cfg.ladder.map(function (L) {
        var st = rowState(L.label);
        var m = statusMeta(st.status);
                var pct = st.rec ? Math.min(100, Math.round(st.sum / st.rec * 100)) : (st.sum > 0 ? 100 : 0);
        var barColor = isNeed(st.status) ? '#F04452' : m.color;
        var gaugeTxt = st.rec ? '권장 ' + fmtMan(st.rec) + ' 대비 ' + pct + '%' : (st.sum > 0 ? '가입됨' : '미가입');
        return '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #EDF0F3;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;">'
          +   '<div style="font-size:14px;font-weight:800;color:#191F28;">' + esc(L.label.replace(/진단$/, ' 진단비').replace(/수술$/, ' 수술비')) + ' <span style="font-size:11px;font-weight:700;color:#6B7684;background:#F2F4F6;border-radius:8px;padding:2px 8px;margin-left:4px;">' + esc(L.range) + '</span></div>'
          +   '<div style="text-align:right;font-size:12px;color:#4E5968;font-weight:700;">' + (st.sum > 0 ? fmtMan(st.sum) : '미가입') + ' ' + pill(st.status) + '</div>'
          + '</div>'
                    + (L.w ? '<div style="font-size:11px;font-weight:700;color:#8B95A1;margin-top:10px;">보장 범위</div>'
              + '<div style="height:8px;background:#EEF1F4;border-radius:4px;overflow:hidden;margin-top:4px;"><div style="height:8px;width:' + L.w + '%;background:#BFD3F2;border-radius:4px;"></div></div>' : '')
          + '<div style="font-size:11px;font-weight:700;color:#8B95A1;margin-top:10px;">내 진단비 · ' + gaugeTxt + '</div>'
          + '<div style="height:8px;background:#EEF1F4;border-radius:4px;overflow:hidden;margin:4px 0 8px;"><div style="height:8px;width:' + (st.sum > 0 ? Math.max(3, pct) : 0) + '%;background:' + barColor + ';border-radius:4px;"></div></div>'
          + '<div style="font-size:12.5px;color:#4E5968;line-height:1.6;">' + esc(L.desc) + '</div>'
          + '</div>';
      }).join('');
      body += card(cardTitle('🔎 ' + esc(cfg.whyTitle), esc(cfg.whySub)) + lad
        + '<div style="margin-top:14px;font-size:13px;font-weight:700;color:#1D5FD0;background:#EFF6FF;border-radius:12px;padding:12px 14px;line-height:1.6;">' + esc(cfg.closingNeed) + '</div>');
    }

    // 4) 잘 준비된 항목
    if (!needs.length) body += bannerAllGood(cfg.title.replace(' 점검', '') + ', 잘 준비되어 있으세요! 👏');
    body += goodCard(goods, needs.length ? '이 부분은 잘 준비되어 있어요 ✅' : '항목별로 이렇게 대비되어 있어요');
    if (!needs.length) body += card('<div style="font-size:13px;color:#334155;line-height:1.7;">' + esc(cfg.closingGood) + '</div>');

    return imgWrap(imgHeader(cfg.icon, name + '님 ' + cfg.title.replace(' 점검', ''), '담보별 현황과 보장 범위를 확인해요')
      + summaryCard('', items, 3) + body + footerSources(cfg.sources));
  }

  // ───────────────────────── 실비 ─────────────────────────
  function buildMedImageHTML() {
    var cfg = MED_CFG, name = gState.customerName;
    var items = cfg.rows.map(function (d) {
      var s = rowState(d[0]);
      return { name: d[1], good: d[2], sum: s.sum, status: s.status, rec: s.rec, exists: s.exists, label: d[0] };
    });
    // 처방조제료 행은 CRM에 없으면 미가입으로 단정하지 않음 (입원·통원은 항상 점검)
    var needs = items.filter(function (it) { return isNeed(it.status) && (it.exists || /입원|통원/.test(it.name)); });
    var goods = items.filter(function (it) { return !isNeed(it.status); });
    var body = '';

    if (needs.length) {
      var ex = cfg.example;
      var total = ex.pay + ex.nonpay;
      var refund = Math.round(ex.pay * ex.payRate + ex.nonpay * ex.nonpayRate);
      var mine = total - refund;
      var inpat = items[0];   // 질병 입원
      var noPolicy = inpat.status === 'unregistered';
      var colA = 'background:' + (noPolicy ? '#FFF0F0;border:2px solid #F04452;' : '#F8FAFC;border:2px solid transparent;');
      var colB = 'background:' + (noPolicy ? '#F8FAFC;border:2px solid transparent;' : '#EFF6FF;border:2px solid #3182F6;');
      body += card(cardTitle('🧾 예를 들어, ' + esc(ex.title), '병원비 ' + fmtMan(total) + ' (급여 ' + fmtMan(ex.pay) + ' + 비급여 ' + fmtMan(ex.nonpay) + ') 가 나왔다면?')
        + '<div style="display:flex;justify-content:space-between;margin-top:14px;">'
        + '<div style="width:48.5%;box-sizing:border-box;border-radius:14px;padding:16px 10px;text-align:center;' + colA + '">'
        +   '<div style="font-size:13px;font-weight:800;color:#4E5968;">실비 미가입</div>'
        +   '<div style="font-size:12px;color:#8B95A1;margin-top:8px;">내 주머니에서</div>'
        +   '<div style="font-size:26px;font-weight:800;color:#F04452;letter-spacing:-0.5px;margin-top:2px;">' + fmtMan(total) + '</div>'
        +   (noPolicy ? '<div style="margin-top:8px;">' + pill('unregistered', '지금 내 상태') + '</div>' : '')
        + '</div>'
        + '<div style="width:48.5%;box-sizing:border-box;border-radius:14px;padding:16px 10px;text-align:center;' + colB + '">'
        +   '<div style="font-size:13px;font-weight:800;color:#4E5968;">실비 가입 (4세대 기준 가정)</div>'
        +   '<div style="font-size:12px;color:#8B95A1;margin-top:8px;">보험금으로 돌려받아요</div>'
        +   '<div style="font-size:26px;font-weight:800;color:#3182F6;letter-spacing:-0.5px;margin-top:2px;">' + fmtMan(refund) + '</div>'
        +   '<div style="font-size:12px;color:#4E5968;margin-top:6px;">내 부담 ' + fmtMan(mine) + '</div>'
        + '</div></div>'
        + '<div style="font-size:11px;color:#8B95A1;line-height:1.6;margin-top:10px;">가정: 급여 ' + Math.round(ex.payRate * 100) + '%·비급여 ' + Math.round(ex.nonpayRate * 100) + '% 보장(자기부담 급여 20%·비급여 30%). 실제 금액은 가입 세대·특약·치료 내용에 따라 달라요.</div>');

      var list = needs.map(function (it) {
        var m = statusMeta(it.status);
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #EDF0F3;">'
          + '<div style="font-size:14px;font-weight:800;color:#191F28;">' + esc(it.name) + '</div>'
          + '<div style="text-align:right;font-size:12.5px;color:#4E5968;font-weight:700;">현재 ' + (it.sum > 0 ? fmtMan(it.sum) : '미가입')
          + (it.rec !== undefined ? ' / 권장 ' + fmtMan(it.rec) : '') + ' ' + pill(it.status) + '</div></div>';
      }).join('');
      body += card(cardTitle('🔍 먼저 확인이 필요한 항목') + '<div style="margin-top:8px;">' + list + '</div>');
    } else {
      body += bannerAllGood('실손의료비, 잘 준비되어 있으시네요! 👏');
    }
    body += goodCard(goods, needs.length ? '이 부분은 잘 준비되어 있어요 ✅' : '항목별로 이렇게 대비되어 있어요');

    return imgWrap(imgHeader(cfg.icon, name + '님 ' + cfg.title.replace(' 점검', ''), '병원비를 돌려받는 기본 보장 현황이에요')
      + summaryCard('', items, 3) + body + footerSources(cfg.sources, '예시 금액은 이해를 돕기 위한 가정입니다.'));
  }

  // ───────────────────────── 화재 ─────────────────────────
  function buildFireImageHTML() {
    var cfg = FIRE_CFG, name = gState.customerName;
    // 배상책임 담보: 후보 중 가장 큰 금액 / 없으면 미가입
    var best = null;
    cfg.liabLabels.forEach(function (lb) {
      var s = rowState(lb);
      if (s.exists && (!best || s.sum > best.sum)) best = s;
    });
    if (!best) best = { sum: 0, status: 'unregistered', rec: undefined, exists: false };
    var fine = rowState(cfg.fineLabel);
    var items = [
      { name: '일상생활배상책임', good: cfg.goodLine, sum: best.sum, status: best.status, rec: best.rec },
      { name: '화재벌금', good: '실화로 형사 벌금이 나온 경우의 부담을 대비할 수 있어요.', sum: fine.sum, status: fine.exists || fine.sum > 0 ? fine.status : 'unregistered', rec: fine.rec },
    ];
    var needs = items.filter(function (it) { return isNeed(it.status); });
    var goods = items.filter(function (it) { return !isNeed(it.status); });
    var body = '';

    // 법 개정 타임라인 (왜 이웃 피해를 내가 배상해야 하는지)
    var tl = cfg.events.map(function (e, i) {
      return '<div style="display:flex;margin-top:' + (i ? 12 : 14) + 'px;">'
        + '<div style="flex:none;width:14px;display:flex;flex-direction:column;align-items:center;"><div style="width:12px;height:12px;border-radius:50%;background:#F04452;margin-top:3px;"></div>' + (i < cfg.events.length - 1 ? '<div style="flex:1;width:2px;background:#E5E8EB;margin-top:3px;"></div>' : '') + '</div>'
        + '<div style="flex:1;margin-left:12px;"><div style="font-size:12px;font-weight:800;color:#F04452;">' + esc(e.date) + '</div>'
        + '<div style="font-size:13.5px;font-weight:800;color:#191F28;margin-top:2px;">' + esc(e.title) + '</div>'
        + '<div style="font-size:12.5px;color:#4E5968;line-height:1.6;margin-top:3px;">' + esc(e.desc) + '</div></div></div>';
    }).join('');
    body += card(cardTitle('⚖️ 실수로 낸 불도, 이웃 피해는 배상해야 해요', '법이 바뀌면서 달라진 점이에요.') + tl);

    if (needs.length) {
      var dmg = cfg.damageMan;
      var covered = best.status !== 'unregistered' && best.sum > 0;
      var cover = covered ? Math.min(dmg, best.sum) : 0;
      var colA = 'background:' + (!covered ? '#FFF0F0;border:2px solid #F04452;' : '#F8FAFC;border:2px solid transparent;');
      var colB = 'background:' + (!covered ? '#F8FAFC;border:2px solid transparent;' : '#EFF6FF;border:2px solid #3182F6;');
      body += card(cardTitle('🧾 예를 들어, 우리 집 불이 이웃집으로 번져 ' + fmtMan(dmg) + ' 피해가 났다면?', '미가입자가 가장 많이 놓치는 부분이에요.')
        + '<div style="display:flex;justify-content:space-between;margin-top:14px;">'
        + '<div style="width:48.5%;box-sizing:border-box;border-radius:14px;padding:16px 10px;text-align:center;' + colA + '">'
        +   '<div style="font-size:13px;font-weight:800;color:#4E5968;">배상책임 미가입</div>'
        +   '<div style="font-size:12px;color:#8B95A1;margin-top:8px;">내가 직접 배상</div>'
        +   '<div style="font-size:26px;font-weight:800;color:#F04452;letter-spacing:-0.5px;margin-top:2px;">' + fmtMan(dmg) + '</div>'
        +   (!covered ? '<div style="margin-top:8px;">' + pill('unregistered', '지금 내 상태') + '</div>' : '') + '</div>'
        + '<div style="width:48.5%;box-sizing:border-box;border-radius:14px;padding:16px 10px;text-align:center;' + colB + '">'
        +   '<div style="font-size:13px;font-weight:800;color:#4E5968;">배상책임 가입</div>'
        +   '<div style="font-size:12px;color:#8B95A1;margin-top:8px;">보험으로 처리 (한도 내)</div>'
        +   '<div style="font-size:26px;font-weight:800;color:#3182F6;letter-spacing:-0.5px;margin-top:2px;">' + fmtMan(dmg) + '</div>'
        +   '<div style="font-size:12px;color:#4E5968;margin-top:6px;">내 부담 0원 (자기부담금 제외)</div></div></div>'
        + '<div style="font-size:11px;color:#8B95A1;line-height:1.6;margin-top:10px;">가정: 피해액 ' + fmtMan(dmg) + ' · 보상한도 이내. 실제 보상은 약관, 과실 정도, 담보 한도에 따라 달라요.</div>');

      var list = needs.map(function (it) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #EDF0F3;">'
          + '<div style="font-size:14px;font-weight:800;color:#191F28;">' + esc(it.name) + '</div>'
          + '<div style="text-align:right;font-size:12.5px;color:#4E5968;font-weight:700;">현재 ' + (it.sum > 0 ? fmtMan(it.sum) : '미가입')
          + (it.rec !== undefined ? ' / 권장 ' + fmtMan(it.rec) : '') + ' ' + pill(it.status) + '</div></div>';
      }).join('');
      body += card(cardTitle('🔍 먼저 확인이 필요한 항목') + '<div style="margin-top:8px;">' + list + '</div>');
    } else {
      body += bannerAllGood('화재·배상책임, 잘 준비되어 있으시네요! 👏');
    }
    body += goodCard(goods, needs.length ? '이 부분은 잘 준비되어 있어요 ✅' : '항목별로 이렇게 대비되어 있어요');

    return imgWrap(imgHeader(cfg.icon, name + '님 ' + cfg.title.replace(' 점검', ''), '내 집 불이 이웃에게 번졌을 때의 책임을 점검해요')
      + summaryCard('', items, 2) + body + footerSources(cfg.sources));
  }

  // ───────────────────────── 운전자 ─────────────────────────
    function driverGapHTML(start) {
    var after = DRIVER_CFG.events.filter(function (e) { return e.date > start; });
    if (!after.length) {
      return '<div style="font-size:12.5px;line-height:1.6;margin-top:4px;color:#3182F6;font-weight:700;background:#F8FAFC;border-radius:10px;padding:8px 10px;">가입 이후 바뀐 법·제도가 없어요. 한도와 갱신 조건만 확인해 보세요.</div>';
    }
    var laws = after.filter(function (e) { return e.kind !== 'terms'; });
    var head = laws.length
      ? '가입 이후 바뀐 법·제도 ' + after.length + '건 — 내 계약에는 반영되지 않았을 수 있어요'
      : '가입 이후 약관이 바뀌었어요 — 내 계약 조건을 확인해 보세요';
    var items = after.map(function (e) {
      var isTerms = e.kind === 'terms';
      return '<div style="margin-top:6px;"><span style="color:' + (isTerms ? '#D97706' : '#DC2626') + ';font-weight:800;">' + (isTerms ? '△ ' : '✕ ') + esc(e.show) + ' ' + esc(e.short) + '</span><br>'
        + '<span style="color:#4E5968;">' + esc(e.miss) + '</span></div>';
    }).join('');
    return '<div style="font-size:12.5px;line-height:1.6;margin-top:4px;background:#F8FAFC;border-radius:10px;padding:9px 11px;">'
      + '<div style="font-weight:800;color:' + (laws.length ? '#DC2626' : '#D97706') + ';">' + head + '</div>' + items + '</div>';
  }
  function buildDriverImageHTML() {
    var cfg = DRIVER_CFG, name = gState.customerName;
    var items = cfg.rows.map(function (d) {
      var s = rowState(d[0]);
      return { name: d[1], good: d[2], sum: s.sum, status: s.status, rec: s.rec };
    });
    var needs = items.filter(function (it) { return isNeed(it.status); });
    var goods = items.filter(function (it) { return !isNeed(it.status); });
    var starts = exState.driverStarts || [];
    var body = '';

        // 타임라인: 법·제도 변경 + 내 가입 시점을 날짜순으로
    var nodes = cfg.events.map(function (e) { return { type: 'law', date: e.date, show: e.show || e.date, title: e.title, desc: e.desc, kind: e.kind }; });
    starts.forEach(function (s) { nodes.push({ type: 'mine', date: s.start, show: s.start.replace(/-/g, '.'), title: '내 운전자 담보 가입 · ' + s.name }); });
    nodes.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.type === 'law' ? -1 : 1); });
    var firstStart = starts.length ? starts[0].start : null;
    var tl = nodes.map(function (n, i) {
      var isMine = n.type === 'mine';
      var missed = !isMine && firstStart && n.date > firstStart;
      var dot = isMine ? '#3182F6' : (n.kind === 'terms' ? '#D97706' : '#F04452');
      var chip = missed ? '<span style="display:inline-block;font-size:10.5px;font-weight:800;color:#DC2626;background:#FEF2F2;border-radius:8px;padding:1px 7px;margin-left:6px;">내 가입 이후 변경</span>' : '';
      var inner = isMine
        ? '<div style="font-size:12px;font-weight:800;color:' + dot + ';">' + esc(n.show) + ' · 내 가입 시점</div>'
          + '<div style="font-size:13.5px;font-weight:800;color:#191F28;margin-top:2px;">' + esc(n.title) + '</div>'
          + driverGapHTML(n.date)
        : '<div style="font-size:12px;font-weight:800;color:' + dot + ';">' + esc(n.show) + chip + '</div>'
          + '<div style="font-size:13.5px;font-weight:800;color:#191F28;margin-top:2px;">' + esc(n.title) + '</div>'
          + '<div style="font-size:12.5px;color:#4E5968;line-height:1.6;margin-top:3px;">' + esc(n.desc) + '</div>';
      return '<div style="display:flex;margin-top:' + (i ? 12 : 14) + 'px;">'
        + '<div style="flex:none;width:14px;display:flex;flex-direction:column;align-items:center;"><div style="width:12px;height:12px;border-radius:50%;background:' + dot + ';margin-top:3px;"></div>' + (i < nodes.length - 1 ? '<div style="flex:1;width:2px;background:#E5E8EB;margin-top:3px;"></div>' : '') + '</div>'
        + '<div style="flex:1;margin-left:12px;">' + inner + '</div></div>';
    }).join('');
    var tlSub = starts.length ? '법·제도가 바뀐 시점과 내 가입 시점을 비교해 봤어요.' : '운전자 담보 가입 이력이 확인되지 않아 법·제도 변화 흐름만 정리했어요.';
    body += card(cardTitle('🛣️ 법·제도가 바뀔 때마다, 필요한 보장도 바뀌어 왔어요', tlSub) + tl);

    // 벌금(대인) 한도 vs 민식이법 이후 최대 벌금
    var fineIn = rowState('벌금(대인)');
    if (fineIn.sum > 0 || starts.length) {
      var peak = cfg.finePeakMan;
      var short = fineIn.sum < peak;
      body += card(cardTitle('⚖️ 내 벌금 한도, 지금 법에 맞을까요?', '어린이보호구역 어린이 상해 사고의 벌금은 최대 ' + fmtMan(peak) + '까지 나올 수 있어요.')
        + '<div style="display:flex;margin-top:12px;"><div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6B7684;">내 벌금(대인) 한도</div>'
        + '<div style="font-size:22px;font-weight:800;color:' + (short ? '#DC2626' : '#3182F6') + ';margin-top:3px;">' + (fineIn.sum > 0 ? fmtMan(fineIn.sum) : '미가입') + '</div></div>'
        + '<div style="flex:none;width:1px;background:#EDF0F3;"></div>'
        + '<div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6B7684;">법정 최고 벌금</div><div style="font-size:22px;font-weight:800;color:#191F28;margin-top:3px;">' + fmtMan(peak) + '</div></div></div>'
        + '<div style="text-align:center;margin-top:12px;font-size:13px;font-weight:800;color:' + (short ? '#DC2626' : '#3182F6') + ';">'
        + (short ? (fineIn.sum > 0 ? fmtMan(peak - fineIn.sum) + ' 차이가 날 수 있어요' : '벌금 전액을 직접 부담할 수 있어요') : '최고 벌금까지 대비되어 있어요') + '</div>');
    }

    if (needs.length) {
      var list = needs.map(function (it) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #EDF0F3;">'
          + '<div style="font-size:14px;font-weight:800;color:#191F28;">' + esc(it.name) + '</div>'
          + '<div style="text-align:right;font-size:12.5px;color:#4E5968;font-weight:700;">현재 ' + (it.sum > 0 ? fmtMan(it.sum) : '미가입')
          + (it.rec !== undefined ? ' / 권장 ' + fmtMan(it.rec) : '') + ' ' + pill(it.status) + '</div></div>';
      }).join('');
      body += card(cardTitle('🔍 먼저 확인이 필요한 항목', '자동차보험은 벌금·변호사비용·형사합의금을 보장하지 않아요.') + '<div style="margin-top:8px;">' + list + '</div>');
    } else {
      body += bannerAllGood('운전자보험, 잘 준비되어 있으시네요! 👏');
    }
    body += goodCard(goods, needs.length ? '이 부분은 잘 준비되어 있어요 ✅' : '항목별로 이렇게 대비되어 있어요');
    body += card('<div style="font-size:13px;font-weight:700;color:#1D5FD0;line-height:1.7;">운전자보험은 법과 제도에 맞춰 만들어진 보험이에요. 법이 바뀌면 필요한 보장과 한도도 달라지기 때문에, 가입 시점 이후 한 번도 점검하지 않았다면 지금 기준으로 다시 확인해 보시는 게 좋아요.</div>', 'background:#EFF6FF;');

    return imgWrap(imgHeader(cfg.icon, name + '님 ' + cfg.title.replace(' 점검', ''), '법 개정 시점과 가입 시점을 비교해 점검해요')
      + summaryCard('', items, 4) + body + footerSources(cfg.sources));
  }

  // ─────────────── 일반 카테고리(대분류) 점검 이미지 ───────────────
  // 일반 카테고리(대분류) 점검 이미지 — 항목 6개 단위로 분할
  function buildCategoryImageHTML(catName, list, part, parts) {
    var cnt = { low: 0, unregistered: 0, excess: 0, ok: 0 };
    list.forEach(function (r) { if (cnt[r.status] !== undefined) cnt[r.status]++; });

    var cards = list.map(function (r) {
      var m = ROW_STATUS_META[r.status] || ROW_STATUS_META.none;
      var rec = r.recommend;
      var pct = rec ? Math.min(100, Math.round((r.customerSum || 0) / rec * 100)) : ((r.customerSum || 0) > 0 ? 100 : 0);
      var nowTxt = r.customerSum ? fmtMan(r.customerSum) : '미가입';
      var recTxt = rec !== undefined ? ' / 권장 ' + fmtMan(rec) : '';
      var gapTxt = (r.status === 'low' || r.status === 'unregistered') && rec !== undefined
        ? '<div style="font-size:12px;font-weight:800;color:#DC2626;margin-top:4px;">권장까지 ' + fmtMan(Math.max(0, rec - (r.customerSum || 0))) + ' 부족</div>' : '';
      if (r.status === 'excess' && rec !== undefined) {
        gapTxt = '<div style="font-size:12px;font-weight:800;color:#D97706;margin-top:4px;">권장보다 ' + fmtMan(Math.max(0, (r.customerSum || 0) - rec)) + ' 많아요</div>';
      }
      return '<div style="background:#fff;border-radius:16px;padding:15px 16px 14px;margin-bottom:10px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
          + '<div style="font-size:16px;font-weight:800;color:#191F28;line-height:1.35;padding-right:8px;">' + esc(r.label) + '</div>'
          + '<div style="flex:none;background:' + m.bg + ';color:' + m.color + ';font-weight:800;font-size:12.5px;border-radius:12px;padding:4px 11px;">' + m.label + '</div>'
        + '</div>'
        + '<div style="height:8px;background:#EEF1F4;border-radius:4px;margin:12px 0 8px;overflow:hidden;"><div style="height:8px;width:' + pct + '%;background:' + m.color + ';border-radius:4px;"></div></div>'
        + '<div style="font-size:13.5px;font-weight:700;color:#334155;">현재 ' + nowTxt + '<span style="font-weight:500;color:#8B95A1;font-size:12.5px;">' + recTxt + '</span></div>'
        + gapTxt
        + '</div>';
    }).join('');

    var chipsHtml = [['low', '부족'], ['unregistered', '미가입'], ['excess', '과잉'], ['ok', '적정']].map(function (p) {
      var m = ROW_STATUS_META[p[0]];
      return '<span style="display:inline-block;background:' + m.bg + ';color:' + m.color + ';font-weight:800;font-size:12.5px;border-radius:12px;padding:5px 12px;margin-right:6px;">' + p[1] + ' ' + cnt[p[0]] + '</span>';
    }).join('');

    return '<div style="width:640px;box-sizing:border-box;background:#F2F4F6;border-radius:24px;padding:24px;font-family:' + IMG_FONT + ';">'
      + '<div style="background:linear-gradient(135deg,#001E42,#0B3A6F);color:#fff;border-radius:18px;padding:22px 24px;">'
        + '<div style="font-size:21px;font-weight:800;letter-spacing:-0.3px;">' + esc(gState.customerName) + '님 · ' + esc(catName) + ' 점검' + (parts > 1 ? ' <span style="font-size:14px;opacity:.8;">(' + (part + 1) + '/' + parts + ')</span>' : '') + '</div>'
        + '<div style="margin-top:12px;">' + chipsHtml + '</div>'
      + '</div>'
      + '<div style="margin-top:14px;">' + cards + '</div>'
      + '<div style="padding:4px 4px 0;font-size:11px;color:#94A3B8;line-height:1.6;">' + esc(IMG_DISCLAIMER) + '</div>'
      + '</div>';
  }

  // ─────────────── 2단계 이미지 목록 ───────────────
  var IMG_JOBS = [];
  function buildImageJobs() {
    IMG_JOBS = [];
    if (!gState || !exState.rows.length) return;

    function items(cfgRows) {
      return cfgRows.map(function (d) { var s = rowState(d[0]); return { name: d[1], status: s.status }; });
    }

    // ① 상태 맞춤 이미지 (암·뇌·심장·실비·화재·운전자)
    var cc = RISK_CFG.cancer;
    IMG_JOBS.push({ risk: true, tag: '상태별 맞춤', icon: cc.icon, title: cc.jobTitle, desc: statusLine(items(cc.rows)), file: 'cancer.png', build: buildCancerImageHTML });
    ['brain', 'heart'].forEach(function (kind) {
      var c = RISK_CFG[kind];
      IMG_JOBS.push({ risk: true, tag: '통계 + 보장범위', icon: c.icon, title: c.jobTitle, desc: statusLine(items(c.rows)), file: kind + '.png',
        build: function () { return buildDiseaseImageHTML(kind); } });
    });
    IMG_JOBS.push({ risk: true, tag: '예시표', icon: MED_CFG.icon, title: MED_CFG.jobTitle,
      desc: statusLine(items(MED_CFG.rows.slice(0, 4))), file: 'medical.png', build: buildMedImageHTML });
    IMG_JOBS.push({ risk: true, tag: '법 개정 + 예시표', icon: FIRE_CFG.icon, title: FIRE_CFG.jobTitle,
      desc: '일상생활배상책임 ' + statusMeta(rowState(FIRE_CFG.liabLabels[0]).status).label + ' · 화재벌금 ' + statusMeta(rowState(FIRE_CFG.fineLabel).status).label,
      file: 'fire.png', build: buildFireImageHTML });
    IMG_JOBS.push({ risk: true, tag: '법 개정 타임라인', icon: DRIVER_CFG.icon, title: DRIVER_CFG.jobTitle,
      desc: (exState.driverStarts && exState.driverStarts.length ? '운전자 담보 가입 ' + exState.driverStarts[0].start + ' · ' : '운전자 담보 가입 이력 없음 · ') + statusLine(items(DRIVER_CFG.rows).slice(0, 2)),
      file: 'driver.png', build: buildDriverImageHTML });

    // ② 위 이미지에 이미 담긴 항목은 일반 점검 이미지에서 제외
    var covered = {};
    [RISK_CFG.cancer.rows, RISK_CFG.brain.rows, RISK_CFG.heart.rows, MED_CFG.rows, DRIVER_CFG.rows].forEach(function (rs) {
      rs.forEach(function (d) { covered[d[0]] = true; });
    });
    FIRE_CFG.liabLabels.concat([FIRE_CFG.fineLabel]).forEach(function (l) { covered[l] = true; });

    var order = [], byCat = {};
    exState.rows.forEach(function (r) {
      if (covered[r.label]) return;
      var c = r.cat || '기타';
      if (!byCat[c]) { byCat[c] = []; order.push(c); }
      byCat[c].push(r);
    });
    order.forEach(function (c) {
      if (CAT_IMG_SKIP.indexOf(c) >= 0) return;   // 항암 치료비는 4단계 '필수 보장' 이미지에 포함
      var list = byCat[c], parts = Math.ceil(list.length / CAT_IMG_MAX);
      for (var p = 0; p < parts; p++) {
        (function (p) {
          var chunk = list.slice(p * CAT_IMG_MAX, (p + 1) * CAT_IMG_MAX);
          var n = { low: 0, unregistered: 0, excess: 0 };
          chunk.forEach(function (r) { if (n[r.status] !== undefined) n[r.status]++; });
          var bits = [];
          if (n.low) bits.push('부족 ' + n.low);
          if (n.unregistered) bits.push('미가입 ' + n.unregistered);
          if (n.excess) bits.push('과잉 ' + n.excess);
          IMG_JOBS.push({ risk: false, icon: '📋',
            title: c + (parts > 1 ? ' (' + (p + 1) + '/' + parts + ')' : ''),
            desc: (bits.length ? bits.join(' · ') : '모두 적정/기준없음') + ' · 항목 ' + chunk.length + '개',
            file: '보장분석_' + c + '_' + (p + 1) + '.png',
            build: function () { return buildCategoryImageHTML(c, chunk, p, parts); } });
        })(p);
      }
    });
  }

  function renderImageJobs() {
    var wrap = document.getElementById('rptex-img-jobs');
    if (!wrap) return;
    buildImageJobs();
    wrap.innerHTML = IMG_JOBS.map(function (j, i) {
      return '<div class="rptex-job' + (j.risk ? ' rptex-job-risk' : '') + '">'
        + '<div class="rptex-job-ico">' + j.icon + '</div>'
        + '<div class="rptex-job-main"><div class="rptex-job-title">' + esc(j.title) + (j.risk ? '<span class="rptex-job-tag">' + esc(j.tag || '상태별 맞춤') + '</span>' : '') + '</div>'
        + '<div class="rptex-job-desc">' + esc(j.desc) + '</div></div>'
        + '<button class="btn-action" style="width:auto;padding:8px 16px;flex:none;background:#3182F6;" id="rptex-job-btn-' + i + '" onclick="window.rptExCopyImageJob(' + i + ')"><i class="bi bi-image"></i> 이미지 복사</button>'
        + '</div>';
    }).join('');
  }

  window.rptExCopyImageJob = async function (i) {
    var job = IMG_JOBS[i];
    if (!job || !gState) return alert('분석표가 없습니다.');
    var btn = document.getElementById('rptex-job-btn-' + i);
    if (btn) { btn.textContent = '⏳ 생성 중...'; btn.disabled = true; }
    try {
      if (!window.html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      await copyHtmlAsImage(job.build(), '#F2F4F6', job.file || '보장분석.png',
        '✅ ' + job.title + ' 이미지가 복사되었습니다!\n카카오톡 채팅창에 바로 붙여넣기(Ctrl+V) 하세요.');
    } catch (err) {
      console.error(err);
      alert('이미지 생성 실패: ' + err.message);
    }
    btn = document.getElementById('rptex-job-btn-' + i);
    if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 이미지 복사'; btn.disabled = false; }
  };

// ================================================================
  // ✅ (보관용) 전체 한 장 이미지 — 요약형 / 전체 상세표
  //   · 요약형: 부족/미가입/과잉 항목을 큰 카드 2열로
  //   · 전체 상세표: 모든 항목을 표로 (길어서 카톡에서 잘릴 수 있음)
  // ================================================================

  // 요약형 이미지 HTML
  function buildSummaryImageHTML() {
    var rows = exState.rows.filter(function(r){ return r.status !== 'none'; });
    var total = gState.premiums.reduce(function(s,p){ return s+(p.amount||0); }, 0);
    var level = evalLevel(gState.age || 40, total);

    var cnt = { low: 0, unregistered: 0, excess: 0, ok: 0 };
    rows.forEach(function(r){ if (cnt[r.status] !== undefined) cnt[r.status]++; });

    function statBox(key, label) {
      var m = ROW_STATUS_META[key];
      return '<div style="flex:1;background:#fff;border-radius:16px;padding:14px 6px;text-align:center;margin:0 4px;">'
        + '<div style="font-size:30px;font-weight:800;color:' + m.color + ';line-height:1.1;">' + cnt[key] + '</div>'
        + '<div style="font-size:13px;font-weight:700;color:#6B7684;margin-top:4px;">' + label + '</div>'
        + '</div>';
    }

    function itemCard(r) {
      var m = ROW_STATUS_META[r.status];
      var rec = r.recommend;
      var pct = rec ? Math.min(100, Math.round((r.customerSum || 0) / rec * 100)) : ((r.customerSum || 0) > 0 ? 100 : 0);
      var nowTxt = r.customerSum ? r.customerSum.toLocaleString() + '만원' : '미가입';
      var recTxt = rec !== undefined ? ' / 권장 ' + rec.toLocaleString() + '만원' : '';
      return '<div style="width:48.5%;box-sizing:border-box;background:#fff;border-radius:16px;padding:16px 16px 14px;margin-bottom:12px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
          + '<div style="font-size:16px;font-weight:800;color:#191F28;line-height:1.35;padding-right:8px;">' + esc(r.label) + '</div>'
          + '<div style="flex:none;background:' + m.bg + ';color:' + m.color + ';font-weight:800;font-size:12.5px;border-radius:12px;padding:4px 11px;">' + m.label + '</div>'
        + '</div>'
        + '<div style="font-size:11.5px;color:#8B95A1;margin-top:2px;">' + esc(r.cat || '') + '</div>'
        + '<div style="height:8px;background:#EEF1F4;border-radius:4px;margin:12px 0 8px;overflow:hidden;">'
          + '<div style="height:8px;width:' + pct + '%;background:' + m.color + ';border-radius:4px;"></div>'
        + '</div>'
        + '<div style="font-size:13.5px;font-weight:700;color:#334155;">현재 ' + nowTxt
          + '<span style="font-weight:500;color:#8B95A1;font-size:12.5px;">' + recTxt + '</span></div>'
        + '</div>';
    }

    function section(key, title) {
      var list = rows.filter(function(r){ return r.status === key; });
      if (!list.length) return '';
      var m = ROW_STATUS_META[key];
      return '<div style="margin-top:18px;">'
        + '<div style="font-size:16px;font-weight:800;color:' + m.color + ';margin:0 2px 10px;">' + title + ' <span style="color:#8B95A1;font-weight:600;font-size:14px;">' + list.length + '개</span></div>'
        + '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;">' + list.map(itemCard).join('') + '</div>'
        + '</div>';
    }

    var problemHtml = section('low', '🔴 부족한 보장') + section('unregistered', '⚪ 미가입 보장') + section('excess', '🟠 과잉 보장');
    if (!problemHtml) {
      problemHtml = '<div style="margin-top:18px;background:#fff;border-radius:16px;padding:22px;text-align:center;font-size:15px;font-weight:700;color:#3182F6;">모든 항목이 적정 수준이에요 👍</div>';
    }

    var okList = rows.filter(function(r){ return r.status === 'ok'; });
    var okHtml = '';
    if (okList.length) {
      okHtml = '<div style="margin-top:8px;background:#fff;border-radius:16px;padding:16px 16px 6px;">'
        + '<div style="font-size:15px;font-weight:800;color:#3182F6;margin-bottom:10px;">✅ 적정한 보장 <span style="color:#8B95A1;font-weight:600;font-size:14px;">' + okList.length + '개</span></div>'
        + '<div style="display:flex;flex-wrap:wrap;">'
        + okList.map(function(r){
            return '<div style="background:#EFF6FF;color:#1D5FD0;font-size:13px;font-weight:700;border-radius:12px;padding:6px 12px;margin:0 8px 10px 0;">' + esc(r.label) + '</div>';
          }).join('')
        + '</div></div>';
    }

    return '<div style="width:720px;box-sizing:border-box;background:#F2F4F6;border-radius:24px;padding:24px;font-family:' + IMG_FONT + ';">'
      + '<div style="background:linear-gradient(135deg,#001E42,#0B3A6F);color:#fff;border-radius:18px;padding:24px 26px;">'
        + '<div style="font-size:22px;font-weight:800;letter-spacing:-0.3px;">' + esc(gState.customerName) + '님 보장 분석 리포트</div>'
        + '<div style="display:flex;margin-top:12px;">'
          + '<div style="font-size:15px;opacity:.92;margin-right:22px;">💰 월납 ' + total.toLocaleString() + '원</div>'
          + '<div style="font-size:15px;opacity:.92;">' + level.emoji + ' 연령 대비 ' + level.label + '</div>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;margin:14px -4px 0;">'
        + statBox('low', '부족') + statBox('unregistered', '미가입') + statBox('excess', '과잉') + statBox('ok', '적정')
      + '</div>'
      + problemHtml
      + okHtml
      + '<div style="padding:12px 4px 0;font-size:11.5px;color:#94A3B8;line-height:1.6;">' + esc(IMG_DISCLAIMER) + '</div>'
      + '</div>';
  }

  // 전체 상세표 이미지 HTML (기존 방식)
  function buildFullTableImageHTML() {
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

    return '<div style="width:660px;background:#fff;border-radius:18px;overflow:hidden;font-family:' + IMG_FONT + ';box-shadow:0 1px 3px rgba(0,0,0,0.06);">'
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
      + '<div style="padding:16px 28px;font-size:11.5px;color:#94A3B8;background:#F8FAFC;line-height:1.6;">' + esc(IMG_DISCLAIMER) + '</div>'
    + '</div>';
  }

  window.rptExCopyTableImage = async function() {
    if (!exState.rows.length || !gState) return alert('분석표가 없습니다.');

    var btn = document.getElementById('rptex-img-copy-btn');
    var modeEl = document.getElementById('rptex-img-mode');
    var mode = (modeEl && modeEl.value) || 'summary';
    if (btn) { btn.textContent = '⏳ 이미지 생성 중...'; btn.disabled = true; }

    try {
      if (!window.html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      var html = mode === 'full' ? buildFullTableImageHTML() : buildSummaryImageHTML();
      var bg   = mode === 'full' ? '#ffffff' : '#F2F4F6';
      await copyHtmlAsImage(html, bg, '보장분석표.png',
        '✅ 분석표 이미지가 복사되었습니다!\n카카오톡 채팅창에 바로 붙여넣기(Ctrl+V) 하세요.');
    } catch(err) {
      console.error(err);
      alert('이미지 생성 실패: ' + err.message);
    }
    if (btn) { btn.innerHTML = '<i class="bi bi-image"></i> 분석표 이미지 복사'; btn.disabled = false; }
  };

  // ─── 필수 보장 분석 카드 → 이미지 복사 (카톡 전송용) ───
  window.rptExCopyEssentialImage = async function() {
    if (!gState) return alert('먼저 토스 CRM 화면을 붙여넣어 분석해주세요.');

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
        + '<div style="padding:10px 6px 2px;font-size:11px;color:#94A3B8;line-height:1.6;">' + esc(IMG_DISCLAIMER) + '</div>'
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

  // ─── 초기화: 다른 고객을 입력하기 위해 모든 화면/상태를 처음 상태로 ───
  window.rptExReset = function() {
    exState = { customerName:'', companies:[], rows:[], premiumAmounts:[], gender:'', driverStarts:[] };
    gState  = null;
    custInfo = null;
    livingManual = false;
    IMG_JOBS = [];
    ESSENTIAL_GROUPS = cloneEssentialTemplate();

    var r = document.getElementById('rptex-result'); if (r) r.style.display = 'none';
    var dt = document.getElementById('rptex-apply-dt'); if (dt) dt.value = '';
    var ageEl = document.getElementById('rptex-age'); if (ageEl) ageEl.value = 40;
    var catEl = document.getElementById('rptex-category'); if (catEl) catEl.selectedIndex = 0;
    var genEl = document.getElementById('rptex-gender'); if (genEl) genEl.value = '';
    var livEl = document.getElementById('rptex-living'); if (livEl) livEl.value = LIVING_COST_MAN;
    var livLbl = document.getElementById('rptex-living-label'); if (livLbl) livLbl.textContent = '월 생활비(만원)';
    var modeEl = document.getElementById('rptex-img-mode'); if (modeEl) modeEl.selectedIndex = 0;

    // 이전 고객의 멘트/표가 남지 않도록 비우기
    ['rptex-flow-greet', 'rptex-flow-time', 'rptex-flow-q', 'rptex-msg-output'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var tbl = document.getElementById('rptex-table'); if (tbl) tbl.innerHTML = '';
    var ptb = document.getElementById('rptex-premium-tbody'); if (ptb) ptb.innerHTML = '';
    var jobs = document.getElementById('rptex-img-jobs'); if (jobs) jobs.innerHTML = '';
    var loading = document.getElementById('rptex-ai-loading'); if (loading) loading.style.display = 'none';
    var msgTa = document.getElementById('rptex-msg-output'); if (msgTa) msgTa.style.display = '';

    var ageGuideBody = document.getElementById('rptex-ageguide-body');
    var ageGuideBtn  = document.getElementById('rptex-ageguide-toggle-btn');
    if (ageGuideBody) ageGuideBody.style.display = 'none';
    if (ageGuideBtn) ageGuideBtn.classList.remove('open');

    crmPasteReset();

    // 붙여넣기 칸으로 이동 + 포커스
    var card = document.getElementById('rptex-crm-card');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var ta = document.getElementById('rptex-crm-text'); if (ta) ta.focus();
  };

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
