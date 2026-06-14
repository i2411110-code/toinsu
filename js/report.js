// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v5.0: 텍스트 붙여넣기 기반 로컬 정규식 파싱 방식으로 전환
// ================================================

(function () {

// ─── 담보 정의 (엑셀 순서 일치) ───
const COVERAGE_DEF = [
  { cat: '실비',  key: 'inpatient',        label: '입원 의료비' },
  { cat: null,   key: 'outpatient',       label: '통원 의료비' },
  { cat: '배상',  key: 'liability',        label: '일상생활 배상책임' },
  { cat: '수술',  key: 'disease_surg',     label: '질병 수술비' },
  { cat: null,   key: 'injury_surg',      label: '상해 / 재해 수술비' },
  { cat: null,   key: 'brain_heart_surg', label: '뇌 / 심장 수술비' },
  { cat: null,   key: 'type_surg',        label: '1 ~ 5 종수술' },
  { cat: '암',   key: 'cancer_diag',      label: '일반암 진단비' },
  { cat: null,   key: 'minor_cancer',     label: '유사암 진단비' },
  { cat: null,   key: 'robot_surg',       label: '로봇암 수술비' },
  { cat: null,   key: 'chemo_rad',        label: '항암방사선약물 치료비' },
  { cat: null,   key: 'targeted',         label: '표적항암약물 치료비' },
  { cat: null,   key: 'cancer_main',      label: '암 주요 치료비' },
  { cat: '뇌',   key: 'cerebro',          label: '뇌혈관질환 진단비' },
  { cat: null,   key: 'stroke',           label: 'ㄴ뇌졸증 진단비' },
  { cat: null,   key: 'cerebro_hem',      label: 'ㄴ뇌출혈 진단비' },
  { cat: null,   key: 'thrombo',          label: '혈전용해제' },
  { cat: '심장',  key: 'ischemic',         label: '허혈성심장질환 진단비' },
  { cat: null,   key: 'arrhythmia',       label: 'ㄴ부정맥 진단비' },
  { cat: null,   key: 'ami',              label: 'ㄴ급성심근경색 진단비' },
  { cat: '입원',  key: 'injury_hosp',      label: '상해 / 재해 입원일당' },
  { cat: null,   key: 'disease_hosp',     label: '질병 입원일당' },
  { cat: null,   key: 'general_hosp',     label: '일반 입원일당' },
  { cat: null,   key: 'er_visit',         label: '응급실 내원 진료비' },
  { cat: '골절',  key: 'fracture',         label: '골절 진단비' },
  { cat: null,   key: 'five_fracture',    label: '5대골절 진단비' },
  { cat: null,   key: 'cast',             label: '깁스 치료비' },
  { cat: '사망',  key: 'death_general',    label: '일반사망' },
  { cat: null,   key: 'death_disease',    label: '질병사망' },
  { cat: null,   key: 'death_cancer',     label: '암 사망' },
  { cat: null,   key: 'death_injury',     label: '상해사망 / 재해사망' },
  { cat: '운전자', key: 'car_injury',       label: '자동차 부상치료비(1급~14급)' },
  { cat: null,   key: 'car_fine',         label: '벌금(대인)' },
  { cat: null,   key: 'car_lawyer',       label: '변호사 선임비용' },
  { cat: null,   key: 'car_settlement',   label: '사고처리 지원금(형사합의금)' },
];

const CAT_SPANS = {};
let lastCat = null, lastIdx = 0;
COVERAGE_DEF.forEach((cov, idx) => {
  if (cov.cat !== null) {
    if (lastCat !== null) CAT_SPANS[lastCat] = { rowspan: idx - lastIdx, startIdx: lastIdx };
    lastCat = cov.cat; lastIdx = idx;
  }
});
if (lastCat !== null) CAT_SPANS[lastCat] = { rowspan: COVERAGE_DEF.length - lastIdx, startIdx: lastIdx };

// ─── 담보 키 → 매핑 키워드 (정규식 매칭용) ───
// 각 key에 해당하는 세부 보장명 키워드 목록 (포함 여부로 판단)
const COVERAGE_KEYWORDS = {
  inpatient:        ['입원의료비', '입원 의료비', '상해+질병 입원', '입원실료'],
  outpatient:       ['외래의료비', '처방조제료', '통원의료비', '통원 의료비'],
  liability:        ['배상책임', '일상생활배상', '가족생활 배상', '가족일상생활배상'],
  disease_surg:     ['질병수술급여금', '질병수술비'],
  injury_surg:      ['상해수술비', '재해수술비', '재해수술급부금', '상해1~5종수술비'],
  brain_heart_surg: ['뇌혈관질환 수술', '허혈성심장질환 수술', '뇌출혈및급성심근경색수술', '뇌수술', '심장수술'],
  type_surg:        ['질병종수술', '상해종수술', '종수술'],
  cancer_diag:      ['일반암진단', '암진단금', '암진단Ⅱ(유사암제외)', '일반암진단(소액암 제외)', '일반암진단III'],
  minor_cancer:     ['갑상샘암진단', '갑상선암진단', '제자리암', '상피내암', '기타피부암진단', '경계성종양진단', '유사암진단'],
  robot_surg:       ['다빈치', '레보아이', '로봇 암수술', '다빈치레보아이'],
  chemo_rad:        ['항암방사선', '양성자치료', '항암방사선약물', '세기조절방사선', '항암양성자방사선치료', '항암세기조절방사선치료', '중입자', '항암중입자방사선치료', '항암중입자치료비', '중입자방사선'],
  targeted:         ['표적항암', '카티(CAR-T)', 'CAR-T', '카티항암'],
  cancer_main:      ['암 주요치료비', '암주요치료비', '2대질환주요치료비', '혈전용해치료비'],
  cerebro:          ['뇌혈관질환진단', '뇌혈관질환(Ⅰ)진단', '뇌혈관질환 진단'],
  stroke:           ['뇌졸중진단', '뇌혈관질환(Ⅱ)진단'],
  cerebro_hem:      ['뇌출혈진단'],
  thrombo:          ['혈전용해'],
  ischemic:         ['허혈성심장질환진단', '허혈성심장질환 진단', '심혈관질환(특정Ⅰ', '심혈관질환(특정1'],
  arrhythmia:       ['부정맥진단', '심혈관질환(I49)', '심혈관질환(특정2대)'],
  ami:              ['급성심근경색증진단', '급성심근경색진단', '심혈관질환(특정Ⅱ)'],
  injury_hosp:      ['상해입원일당', '재해입원일당', '재해입원', '상해입원'],
  disease_hosp:     ['질병입원일당'],
  general_hosp:     ['1인실 입원일당', '1인실입원일당', '상급종합병원 1인실', '종합병원 1인실'],
  er_visit:         ['응급실'],
  fracture:         ['골절진단비', '골절치료자금'],
  five_fracture:    ['5대골절'],
  cast:             ['깁스'],
  death_general:    ['일반사망보험', '일반사망', '일반사망금'],
  death_disease:    ['질병사망', '유병자질병사망'],
  death_cancer:     ['암사망'],
  death_injury:     ['재해사망', '상해사망', '재해사망보험금', '평일일반재해사망'],
  car_injury:       ['자동차사고부상치료비', '자동차부상치료지원금', '자동차사고 부상치료비'],
  car_fine:         ['벌금'],
  car_lawyer:       ['변호사선임비용', '변호사 선임비용'],
  car_settlement:   ['교통사고처리지원금', '교통사고 처리지원금', '형사합의금', '형사합의지원금'],
};

// ─── 금액 파싱: "5,000만원" / "1억" / "1억 300만원" / "100만원" → 만원 단위 정수 ───
function parseAmount(str) {
  if (!str) return 0;
  str = str.replace(/,/g, '').trim();
  let total = 0;
  const eokMatch = str.match(/([0-9.]+)\s*억/);
  if (eokMatch) total += parseFloat(eokMatch[1]) * 10000;
  const manMatch = str.match(/([0-9.]+)\s*만/);
  if (manMatch) total += parseFloat(manMatch[1]);
  // 순수 숫자만 있고 단위 없는 경우 (ex: 원단위 그대로)
  if (!eokMatch && !manMatch) {
    const numMatch = str.match(/^([0-9.]+)$/);
    if (numMatch) total = parseFloat(numMatch[1]);
  }
  return Math.round(total);
}

// ─── 보험사명 추출: 상품명에서 첫 번째 의미 있는 토큰 ───
function extractInsurer(product) {
  // 알려진 보험사명 목록으로 매칭
  const INSURERS = [
    'ABL', '흥국화재', '흥국생명', '삼성화재', '삼성생명', '현대해상', '메리츠화재', '메리츠생명',
    'KB손해보험', 'KB생명', 'DB손해보험', 'DB생명', '한화생명', '한화손해보험',
    'NH농협생명', 'NH농협손보', 'NH농협', '신한생명', '신한라이프', '신한금융',
    'Chubb', 'AIA', '라이나생명', '흥Good', '흥Good더편한',
    '에버리치', 'THE건강한치아', '굿앤굿', '하나로누리는',
  ];
  for (const ins of INSURERS) {
    if (product.includes(ins)) return ins;
  }
  // 괄호 제거 후 첫 단어
  const clean = product.replace(/\(무\)|\(무배당\)|무배당|해약환급금|미지급형|갱신형|\d+형/g, '').trim();
  const m = clean.match(/^[^\s(（【\[]+/);
  return m ? m[0].slice(0, 8) : product.slice(0, 6);
}

// ─── 핵심: 텍스트 파싱 함수 ───
function parseInsuranceText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 고객명 추출 (첫 줄에 "OOO 님" 패턴)
  let customerName = '';
  const nameMatch = lines[0] && lines[0].match(/^(.{1,6})\s*님/);
  if (nameMatch) customerName = nameMatch[1].trim();

  // 금액 패턴: 숫자+만원 or 숫자+억 포함
  const AMT_RE = /[0-9,]+\s*(?:억\s*[0-9,]*\s*만원?|만원?|억)/;
  // 상품명 패턴: (무), 무배당, 보험, 플러스, 케어 등 포함
  const PRODUCT_RE = /보험|케어|플러스|종합|건강|생명|화재|손보|통합|라이프|상해|운전자|치아|누리|에버리치|굿앤굿|Chubb|ABL|The편한/i;

  // 모든 고유 상품명 수집 (순서 유지)
  const productMap = new Map(); // product → { insurer, coverages:{}, premium:0 }

  function emptyCoverages() {
    const obj = {};
    COVERAGE_DEF.forEach(c => { obj[c.key] = 0; });
    return obj;
  }

  // 어떤 coverage key에 해당하는지 매핑
  function mapCoverageKey(label) {
    const normalized = label.replace(/\s/g, '');
    for (const [key, keywords] of Object.entries(COVERAGE_KEYWORDS)) {
      for (const kw of keywords) {
        if (normalized.includes(kw.replace(/\s/g, ''))) return key;
      }
    }
    return null;
  }

  // 상태 머신 방식으로 파싱
  // 패턴: 상품명 줄 → 세부보장명 줄 → 금액 줄 (반복)
  let i = 0;
  let currentProduct = null;

  // 상품명인지 판단: PRODUCT_RE 매칭 + 금액 미포함
  function isProductLine(line) {
    return PRODUCT_RE.test(line) && !AMT_RE.test(line) && line.length > 5;
  }

  // 세부 보장명인지 판단: 금액 아님, 짧지 않음, 대분류 헤더 아님
  const HEADER_WORDS = ['사망', '후유장해', '실손의료비', '수술비', '입원비', '치료비', '뇌혈관질환', '심장질환', '치매', '운전자', '법률', '배상책임', '치아', '화상', '골절', '암'];
  function isHeaderLine(line) {
    return HEADER_WORDS.includes(line.replace(/\s/g, ''));
  }

  // 상태값 추적
  let pendingLabel = null; // 마지막으로 읽은 세부 보장명

  while (i < lines.length) {
    const line = lines[i];

    // 대분류 헤더 무시 (예: "사망", "암", "실손의료비" 단독 줄)
    if (isHeaderLine(line)) { i++; continue; }

    // 상태/충분/부족/미가입 등 요약 줄 무시
    if (/^(충분|부족|미가입|권장금액|가입금액|부족금액)\s*[:：]?/.test(line)) { i++; continue; }

    // 고객명 줄 무시
    if (nameMatch && line === lines[0]) { i++; continue; }

    // 상품명 감지
    if (isProductLine(line)) {
      currentProduct = line;
      if (!productMap.has(currentProduct)) {
        productMap.set(currentProduct, {
          insurer: extractInsurer(line),
          coverages: emptyCoverages(),
          premium: 0,
          start_date: '',
          end_date: '',
        });
      }
      pendingLabel = null;
      i++;
      continue;
    }

    // 금액 줄 감지
    if (AMT_RE.test(line) && currentProduct) {
      const entry = productMap.get(currentProduct);
      if (pendingLabel) {
        const key = mapCoverageKey(pendingLabel);
        if (key) {
          const amt = parseAmount(line);
          entry.coverages[key] += amt;
        }
      }
      pendingLabel = null;
      i++;
      continue;
    }

    // 그 외: 세부 보장명으로 간주
    if (currentProduct && line.length >= 2 && !line.startsWith('(') ) {
      pendingLabel = line;
    }

    i++;
  }

  // companies 배열로 변환
  const companies = [];
  for (const [product, data] of productMap.entries()) {
    companies.push({
      name: data.insurer,
      product,
      start_date: data.start_date,
      end_date: data.end_date,
      premium: data.premium,
      coverages: data.coverages,
    });
  }

  return { customerName, companies };
}

// ─── State ───
let rptState = {
  companies: [],
  customerName: '',
};

// ─── 모듈 초기화 ───
window.initRptModule = function () {
  const app = document.getElementById('report-app');
  if (!app || app.dataset.inited) return;
  app.dataset.inited = '1';
  app.innerHTML = getRptHTML();
  injectRptStyles();
};

function getRptHTML() {
  return `
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
    <div style="font-size:18px; font-weight:700; color:#001E42;">
      <i class="bi bi-file-earmark-bar-graph-fill" style="color:#3182F6; margin-right:6px;"></i>
      보장분석 리포트 생성기
    </div>
  </div>

  <!-- STEP 1: 텍스트 붙여넣기 -->
  <div class="rpt-card">
    <div class="rpt-step-label">STEP 1</div>
    <h3 class="rpt-step-title">보장 텍스트 붙여넣기</h3>
    <p class="rpt-step-desc">보장분석 요약 텍스트를 아래 영역에 붙여넣으세요. (고객명 · 상품명 · 세부보장명 · 가입금액 포함)</p>
    <textarea
      id="rpt-text-input"
      placeholder="예시)
신정원 님

사망
질병사망
(무)버팀목New케어보험 일반형 해약환급금 미지급형Ⅲ
일반사망보험_신정원
100만원
..."
      style="width:100%; height:220px; border:1.5px solid #BAD7FB; border-radius:10px;
        padding:12px 14px; font-size:13px; font-family:'Noto Sans KR',sans-serif;
        color:#334155; resize:vertical; box-sizing:border-box; line-height:1.7;
        background:#F8FBFF; outline:none; transition:border 0.2s;"
      oninput="window.rptCheckInput()"
      onfocus="this.style.borderColor='#3182F6'"
      onblur="this.style.borderColor='#BAD7FB'"
    ></textarea>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
      <span id="rpt-char-count" style="font-size:11px; color:#94A3B8;">0자 입력됨</span>
      <button onclick="document.getElementById('rpt-text-input').value=''; window.rptCheckInput();"
        style="background:none; border:none; font-size:12px; color:#94A3B8; cursor:pointer; padding:2px 6px;">
        지우기
      </button>
    </div>
  </div>

  <!-- STEP 2: 파싱 실행 -->
  <div id="rpt-step2" class="rpt-card">
    <div class="rpt-step-label">STEP 2</div>
    <h3 class="rpt-step-title">텍스트 파싱 시작</h3>
    <p class="rpt-step-desc">버튼을 클릭하면 입력된 텍스트를 즉시 분석하여 보장분석표를 생성합니다.</p>
    <button id="rpt-analyze-btn" class="btn-action" style="max-width:240px;" onclick="window.rptStartParsing()">
      <i class="bi bi-lightning-charge-fill"></i> 텍스트 파싱 시작
    </button>
    <div id="rpt-parse-status" style="margin-top:12px; font-size:13px; color:#64748B; display:none;"></div>
  </div>

  <!-- STEP 3: 미리보기 & 수정 -->
  <div id="rpt-step3" class="rpt-card" style="display:none;">
    <div class="rpt-step-label">STEP 3</div>
    <h3 class="rpt-step-title">보장분석표 미리보기 &amp; 수정</h3>
    <p class="rpt-step-desc" style="color:#3182F6; font-weight:600; margin-bottom:12px;">
      💡 고객 이름, 금액, 텍스트를 클릭하면 직접 수정할 수 있습니다. (금액 수정 시 자동 합산)
    </p>
    <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="btn-action" style="width:auto; padding:10px 20px;" onclick="window.rptDownloadExcel()">
        <i class="bi bi-file-earmark-excel-fill"></i> 엑셀 다운로드 (스타일 포함)
      </button>
      <button class="btn-action" style="width:auto; padding:10px 20px; background:#475569;" onclick="window.rptPrint()">
        <i class="bi bi-printer-fill"></i> 인쇄하기
      </button>
      <button style="background:none; border:1px solid #E2E8F0; padding:10px 20px; border-radius:8px;
        cursor:pointer; font-size:13px; color:#475569;" onclick="window.rptReset()">
        <i class="bi bi-arrow-counterclockwise"></i> 다시 시작
      </button>
    </div>
    <div style="overflow-x:auto; border-radius:10px; border:1px solid #E2E8F0;">
      <div id="rpt-preview-table"></div>
    </div>
  </div>

  <!-- 에러 박스 -->
  <div id="rpt-error-box" style="display:none; margin-top:12px; padding:12px 16px;
    background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; color:#DC2626; font-size:13px;">
    <i class="bi bi-exclamation-circle-fill"></i> <span id="rpt-error-msg"></span>
  </div>`;
}

function injectRptStyles() {
  if (document.getElementById('rpt-styles')) return;
  const style = document.createElement('style');
  style.id = 'rpt-styles';
  style.textContent = `
.rpt-card { background:#fff; border:1px solid #E2E8F0; border-radius:14px; padding:20px 22px; margin-bottom:16px; }
.rpt-step-label { display:inline-block; font-size:11px; font-weight:700; color:#3182F6; background:#EFF6FF; padding:2px 8px; border-radius:99px; margin-bottom:8px; letter-spacing:0.5px; }
.rpt-step-title { font-size:16px; font-weight:700; color:#0F172A; margin:0 0 6px 0; }
.rpt-step-desc  { font-size:13px; color:#64748B; margin:0 0 14px 0; }
.btn-action { display:inline-flex; align-items:center; gap:7px; background:#3182F6; color:#fff;
  border:none; border-radius:8px; padding:11px 18px; font-size:13px; font-weight:600;
  cursor:pointer; transition:background 0.2s; width:100%; justify-content:center; }
.btn-action:hover { background:#1D6FE8; }
.btn-action:disabled { background:#94A3B8; cursor:not-allowed; }
#rpt-preview-table table { border-collapse:collapse; font-size:11px; font-family:'Noto Sans KR',sans-serif; min-width:700px; }
#rpt-preview-table th, #rpt-preview-table td { border:1px solid #C5CBD3; padding:5px 7px; white-space:nowrap; text-align:center; }
#rpt-preview-table .r-cat   { background:#001E42; color:#fff; font-weight:700; }
#rpt-preview-table .r-item  { background:#D6DEE7; font-weight:600; text-align:left; min-width:130px; }
#rpt-preview-table .r-sum   { background:#D6DEE7; font-weight:700; color:#001E42; }
#rpt-preview-table .r-hdr   { background:#D6DEE7; font-weight:700; font-size:10px; }
#rpt-preview-table .r-ins   { background:#D6DEE7; font-weight:700; font-size:10px; color:#C00000; }
#rpt-preview-table .r-date  { background:#D6DEE7; font-size:10px; }
#rpt-preview-table .r-date-alt { background:#fff; font-size:10px; }
#rpt-preview-table .r-fee   { background:#D7DDE4; font-weight:700; color:#001E42; }
#rpt-preview-table .r-val   { color:#1E40AF; min-width:75px; }
#rpt-preview-table .r-val-alt { background:#F8FAFC; color:#1E40AF; min-width:75px; }
#rpt-preview-table .r-title td { background:#fff; font-size:14px; font-weight:700; text-align:left; padding:10px 12px; border-bottom:2px solid #001E42; }
#rpt-preview-table .r-foot td { background:#F8FAFC; font-size:10px; color:#64748B; text-align:left; padding:6px 10px; }
[contenteditable="true"] { cursor:text; transition:all 0.2s; border-radius:2px; }
[contenteditable="true"]:hover { outline:1px dashed #3182F6; background:rgba(49,130,246,0.1) !important; }
[contenteditable="true"]:focus { outline:2px solid #3182F6; background:#fff !important; color:#000 !important; }
`;
  document.head.appendChild(style);
}

// ─── 입력 글자수 카운트 ───
window.rptCheckInput = function () {
  const val = (document.getElementById('rpt-text-input') || {}).value || '';
  const el = document.getElementById('rpt-char-count');
  if (el) el.textContent = val.length.toLocaleString() + '자 입력됨';
};

// ─── STEP 2: 텍스트 파싱 실행 ───
window.rptStartParsing = function () {
  rptHideError();
  const textarea = document.getElementById('rpt-text-input');
  const text = (textarea && textarea.value) || '';

  if (text.trim().length < 10) {
    rptShowError('텍스트를 먼저 입력해주세요. (최소 10자 이상)');
    return;
  }

  const status = document.getElementById('rpt-parse-status');
  if (status) { status.style.display = 'block'; status.textContent = '⚙️ 파싱 중...'; }

  // 비동기처럼 처리하여 UI 블로킹 방지
  setTimeout(() => {
    try {
      const result = parseInsuranceText(text);
      rptState.customerName = result.customerName;
      rptState.companies = result.companies;

      if (rptState.companies.length === 0) {
        rptShowError('상품 정보를 찾을 수 없습니다. 텍스트 형식을 확인해주세요.\n(상품명과 금액이 포함된 텍스트여야 합니다)');
        if (status) status.style.display = 'none';
        return;
      }

      if (status) {
        status.textContent = `✅ 파싱 완료! 총 ${rptState.companies.length}개 상품 추출됨.`;
      }

      document.getElementById('rpt-step3').style.display = 'block';
      renderPreview();
      document.getElementById('rpt-step3').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      rptShowError('파싱 오류: ' + err.message);
      if (status) status.style.display = 'none';
    }
  }, 60);
};

// ─── 인라인 수정 콜백 ───
window.rptUpdateName = function (el) {
  rptState.customerName = el.innerText.trim();
};
window.rptUpdateText = function (el, idx, key) {
  rptState.companies[idx][key] = el.innerText.trim();
};
window.rptUpdateVal = function (el, idx, key) {
  let text = el.innerText.replace(/,/g, '').trim();
  let val = 0;
  if (text) {
    if (text.includes('억')) val = parseFloat(text.replace('억', '')) * 10000;
    else if (text.includes('만')) val = parseFloat(text.replace('만', ''));
    else if (text.includes('원')) val = parseFloat(text.replace('원', ''));
    else val = parseFloat(text);
    if (isNaN(val)) val = 0;
  }
  if (key === 'premium') {
    rptState.companies[idx].premium = val;
    el.innerText = fmtWon(val);
    const totalPrem = rptState.companies.reduce((s, c) => s + (c.premium || 0), 0);
    document.getElementById('sum-premium').innerText = fmtWon(totalPrem);
  } else {
    rptState.companies[idx].coverages[key] = val;
    el.innerText = val ? fmtMan(val) : '';
    const sum = rptState.companies.reduce((s, c) => s + ((c.coverages || {})[key] || 0), 0);
    document.getElementById('sum-' + key).innerText = sum ? fmtMan(sum) : '';
  }
};

// ─── 미리보기 렌더링 ───
function renderPreview() {
  const co = rptState.companies;
  const name = rptState.customerName || '고객';
  const N = co.length;

  let html = `<table>`;
  html += `<tr class="r-title"><td colspan="${3 + N}"><span contenteditable="true" onblur="window.rptUpdateName(this)" style="border-bottom:1px dashed #A0AAB5; padding-bottom:2px;">${name}</span> 님 보장분석표</td></tr>`;

  // 헤더 1: 보험사
  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr" style="background:#001E42;color:#fff;">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach((c, i) => html += `<th class="r-ins" contenteditable="true" onblur="window.rptUpdateText(this, ${i}, 'name')">${c.name}</th>`);
  html += `</tr>`;

  // 헤더 2: 상품명
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">상품명</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date-alt" style="font-size:9px;" contenteditable="true" onblur="window.rptUpdateText(this, ${i}, 'product')" title="${c.product}">${c.product}</td>`);
  html += `</tr>`;

  // 헤더 3: 가입시기
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">가입시기</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date" contenteditable="true" onblur="window.rptUpdateText(this, ${i}, 'start_date')">${c.start_date || ''}</td>`);
  html += `</tr>`;

  // 헤더 4: 만기
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date-alt" style="font-size:9px;" contenteditable="true" onblur="window.rptUpdateText(this, ${i}, 'end_date')">${c.end_date || ''}</td>`);
  html += `</tr>`;

  // 헤더 5: 보험료
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee" style="background:#D6DEE7;color:#001E42;">보험료</th>
    <td class="r-sum r-fee" id="sum-premium">${fmtWon(totalPrem)}</td>`;
  co.forEach((c, i) => html += `<td class="r-fee" contenteditable="true" onblur="window.rptUpdateVal(this, ${i}, 'premium')">${fmtWon(c.premium || 0)}</td>`);
  html += `</tr>`;

  // 담보 데이터 행
  COVERAGE_DEF.forEach((cov, idx) => {
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0);
    const sum = vals.reduce((s, v) => s + v, 0);
    const isEven = idx % 2 === 1;

    html += `<tr>`;
    if (cov.cat !== null) {
      const span = CAT_SPANS[cov.cat]?.rowspan || 1;
      html += `<td class="r-cat" rowspan="${span}">${cov.cat}</td>`;
    }
    html += `<td class="r-item">${cov.label}</td>`;
    html += `<td class="r-sum" id="sum-${cov.key}">${sum ? fmtMan(sum) : ''}</td>`;
    vals.forEach((v, i) => {
      const cls = isEven ? 'r-val-alt' : 'r-val';
      html += `<td class="${cls}" contenteditable="true" onblur="window.rptUpdateVal(this, ${i}, '${cov.key}')">${v ? fmtMan(v) : ''}</td>`;
    });
    html += `</tr>`;
  });

  html += `<tr class="r-foot"><td colspan="${3 + N}">
    * 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.
  </td></tr>`;
  html += `</table>`;
  document.getElementById('rpt-preview-table').innerHTML = html;
}

// ─── 엑셀 다운로드 (xlsx-js-style) ───
window.rptDownloadExcel = async function () {
  if (!window.XLSX) {
    await loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js');
  }

  const co = rptState.companies;
  const name = rptState.customerName || '고객';
  const N = co.length;
  const wb = XLSX.utils.book_new();
  const ws = {};
  const merges = [];

  const C = {
    navy: '001E42', white: 'FFFFFF', gray: 'D6DEE7',
    feeGray: 'D7DDE4', oddBg: 'FFFFFF', evenBg: 'F8FAFC',
    footBg: 'F8FAFC', blue: '1E40AF', darkNav: '001E42',
    red: 'C00000', grayTxt: '94A3B8',
  };

  const thin = { style: 'thin', color: { rgb: 'C5CBD3' } };
  const BD = { top: thin, bottom: thin, left: thin, right: thin };

  function mkCell(v, fill, fontColor, bold, align, fontSize) {
    const s = {
      border: BD,
      fill: fill ? { type: 'pattern', patternType: 'solid', fgColor: { rgb: fill } } : undefined,
      font: { name: 'Malgun Gothic', sz: fontSize || 10, bold: !!bold, color: fontColor ? { rgb: fontColor } : undefined },
      alignment: { horizontal: align || 'center', vertical: 'center', wrapText: true },
    };
    if (v === null || v === undefined || v === '') return { v: '', t: 's', s };
    if (typeof v === 'number') return { v, t: 'n', s };
    return { v: String(v), t: 's', s };
  }

  function setCell(r, c, v, fill, fontColor, bold, align, fontSize) {
    ws[XLSX.utils.encode_cell({ r, c })] = mkCell(v, fill, fontColor, bold, align, fontSize);
  }
  function addMerge(r1, c1, r2, c2) {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  }

  let r = 0;

  // 타이틀
  setCell(r, 0, `${name} 님 보장분석표`, null, null, true, 'left', 14);
  addMerge(r, 0, r, 2 + N);
  r++;

  // 헤더 행들
  setCell(r, 0, '주요\n보장', C.navy, C.white, true, 'center');
  addMerge(r, 0, r + 4, 0);
  setCell(r, 2, '고객\n보장합산', C.gray, C.darkNav, true, 'center');
  addMerge(r, 2, r + 3, 2);
  setCell(r, 1, '보험사', C.navy, C.white, true, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.name, C.gray, C.red, true, 'center'));
  r++;

  setCell(r, 1, '상품명', C.navy, C.white, true, 'center');
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.product, C.white, null, false, 'center', 9));
  r++;

  setCell(r, 1, '가입시기', C.navy, C.white, true, 'center');
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.start_date || '', C.gray, null, false, 'center', 9));
  r++;

  setCell(r, 1, '납입기간/\n만기시점', C.navy, C.white, true, 'center');
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.end_date || '', C.white, null, false, 'center', 9));
  r++;

  setCell(r, 0, '', C.navy, C.white, true, 'center');
  setCell(r, 1, '보험료', C.gray, C.white, true, 'center');
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  setCell(r, 2, totalPrem || '', C.feeGray, C.darkNav, true, 'right');
  co.forEach((c, i) => setCell(r, 3 + i, c.premium || '', C.feeGray, C.darkNav, true, 'right'));
  r++;

  let catStartRow = -1, catCurr = null;
  COVERAGE_DEF.forEach((cov, idx) => {
    const isEven = idx % 2 === 1;
    const dataBg = isEven ? C.evenBg : C.oddBg;
    if (cov.cat !== null) {
      if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0);
      catCurr = cov.cat;
      catStartRow = r;
      setCell(r, 0, cov.cat, C.navy, C.white, true, 'center');
    }
    setCell(r, 1, cov.label, C.gray, null, true, 'left');
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0);
    const sum = vals.reduce((s, v) => s + v, 0);
    setCell(r, 2, sum ? fmtMan(sum) : '', C.gray, C.darkNav, true, 'right');
    vals.forEach((v, i) => setCell(r, 3 + i, v ? fmtMan(v) : '', dataBg, C.blue, false, 'right'));
    r++;
  });
  if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0);

  setCell(r, 0, '* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.', C.footBg, C.grayTxt, false, 'left', 9);
  addMerge(r, 0, r, 2 + N);

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 + N } });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 12 }, ...co.map(() => ({ wch: 13 }))];
  const rowHeights = [];
  for (let i = 0; i <= r; i++) {
    rowHeights.push({ hpt: i === 0 ? 28 : (i >= 1 && i <= 5) ? 36 : 22 });
  }
  ws['!rows'] = rowHeights;

  XLSX.utils.book_append_sheet(wb, ws, '보장분석표');

  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `${name}_보장분석표_${ds}.xlsx`);
};

// ─── 인쇄 ───
window.rptPrint = function () {
  const content = document.getElementById('rpt-preview-table').innerHTML;
  const win = window.open('', '_blank', 'width=1200,height=800');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>보장분석표 인쇄</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Noto Sans KR', sans-serif; margin: 0; padding: 0; zoom: 0.65; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; word-break: break-all; }
      th, td { border: 1px solid #C5CBD3; padding: 4px 2px; text-align: center; font-size: 11px; }
      .r-cat { background: #001E42 !important; color: #fff; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 40px; }
      .r-item { background: #D6DEE7 !important; font-weight: 600; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 120px; }
      .r-sum { background: #D6DEE7 !important; font-weight: 700; color: #001E42; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 70px; }
      .r-hdr { background: #D6DEE7 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-ins { background: #D6DEE7 !important; font-weight: 700; color: #C00000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-date { background: #D6DEE7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-fee { background: #D7DDE4 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-title td { font-size: 16px; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #001E42; }
    </style>
  </head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 800);
};

// ─── 리셋 ───
window.rptReset = function () {
  rptState = { companies: [], customerName: '' };
  const ta = document.getElementById('rpt-text-input');
  if (ta) ta.value = '';
  window.rptCheckInput();
  const s3 = document.getElementById('rpt-step3');
  if (s3) s3.style.display = 'none';
  const st = document.getElementById('rpt-parse-status');
  if (st) { st.style.display = 'none'; st.textContent = ''; }
  rptHideError();
};

// ─── 유틸 ───
function fmtWon(v) { return v ? v.toLocaleString() + '원' : ''; }
function fmtMan(v) {
  if (!v) return '';
  if (v >= 10000) {
    const eok = v / 10000;
    const rnd = Math.round(eok * 10) / 10;
    return (Number.isInteger(rnd) ? rnd : rnd.toFixed(1)) + '억';
  }
  return v.toLocaleString() + '만';
}
function rptShowError(msg) {
  const b = document.getElementById('rpt-error-box');
  if (b) { document.getElementById('rpt-error-msg').textContent = msg; b.style.display = 'block'; }
}
function rptHideError() {
  const b = document.getElementById('rpt-error-box');
  if (b) b.style.display = 'none';
}
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// ─── 자동 초기화 ───
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initRptModule);
} else {
  window.initRptModule();
}

})();