// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v6.0: 텍스트 파싱 + 보험사명 정교화 + 로딩UX + 미리보기 완벽 복구
// ================================================

(function () {

// ─── 담보 정의 ───
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

// ─── 카테고리 rowspan 계산 ───
const CAT_SPANS = {};
let _lastCat = null, _lastIdx = 0;
COVERAGE_DEF.forEach((cov, idx) => {
  if (cov.cat !== null) {
    if (_lastCat !== null) CAT_SPANS[_lastCat] = { rowspan: idx - _lastIdx, startIdx: _lastIdx };
    _lastCat = cov.cat; _lastIdx = idx;
  }
});
if (_lastCat !== null) CAT_SPANS[_lastCat] = { rowspan: COVERAGE_DEF.length - _lastIdx, startIdx: _lastIdx };

// ─── 상품명 → 보험사명 정확 매핑 테이블 (키워드 포함 여부로 판단, 우선순위 순서) ───
const INSURER_MAP = [
  // 브랜드명이 상품명에 직접 포함된 경우
  { keyword: '삼성화재',       insurer: '삼성화재' },
  { keyword: '현대해상',       insurer: '현대해상' },
  { keyword: '흥국화재',       insurer: '흥국화재' },
  { keyword: '흥Good',        insurer: '흥국화재' },
  { keyword: 'ABL',           insurer: 'ABL생명' },
  { keyword: 'Chubb',         insurer: '에이스손보' },
  { keyword: '더핏',           insurer: '에이스손보' },
  { keyword: 'NH통합보험',     insurer: 'NH농협생명' },
  { keyword: '건강플러스NH',   insurer: 'NH농협생명' },
  { keyword: 'NH농협',         insurer: 'NH농협생명' },
  { keyword: '버팀목',         insurer: 'KDB생명' },
  { keyword: '하나로누리는',   insurer: '하나생명' },
  { keyword: '에버리치',       insurer: '우정사업본부' },
  { keyword: '굿앤굿',         insurer: '현대해상' },
  { keyword: 'THE건강한치아',  insurer: '라이나생명' },
  { keyword: '신한 이지로운',  insurer: 'BNP파리바카디프손보' },
  { keyword: '신한이지로운',   insurer: 'BNP파리바카디프손보' },
  { keyword: '신한라이프',      insurer: '신한라이프' },
  { keyword: '동양생명',       insurer: '동양생명' },
  { keyword: '한화생명',       insurer: '한화생명' },
  { keyword: 'KB손보',         insurer: 'KB손해보험' },
  { keyword: 'DB손해보험',     insurer: 'DB손해보험' },
  { keyword: 'AIA',            insurer: 'AIA생명' },
  { keyword: '라이나',          insurer: '라이나생명' },
  { keyword: '메트라이프',      insurer: '메트라이프생명' },
  { keyword: '교보생명',       insurer: '교보생명' },
];

// ─── 담보 키워드 매핑 (세부 보장명 → coverage key) ───
// 배열 순서가 우선순위. 더 구체적인 것을 앞에 배치.
const COVERAGE_RULES = [
  // ── 실비 ──
  { key: 'inpatient',        kws: ['입원의료비', '입원 의료비', '상해+질병 입원', '입원실료'] },
  { key: 'outpatient',       kws: ['외래의료비', '처방조제료', '통원의료비', '통원 의료비', '외래'] },

  // ── 배상 ──
  { key: 'liability',        kws: ['배상책임', '일상생활배상', '가족생활 배상', '가족일상생활'] },

  // ── 수술비 ──
  { key: 'robot_surg',       kws: ['다빈치', '레보아이', '로봇암수술', '로봇 암수술'] },
  { key: 'brain_heart_surg', kws: ['뇌혈관질환 수술', '허혈성심장질환 수술', '뇌출혈및급성심근경색수술', '뇌수술비', '심장수술비'] },
  { key: 'type_surg',        kws: ['질병종수술', '상해종수술', '종수술', '1~5종', '상해1~5종'] },
  { key: 'disease_surg',     kws: ['질병수술급여금', '질병수술비', '질병수술'] },
  { key: 'injury_surg',      kws: ['상해수술비', '재해수술비', '재해수술급부금', '상해수술'] },

  // ── 암 ──
  { key: 'robot_surg',       kws: ['다빈치레보아이', '로봇암수술'] },  // 중복이지만 혹시 모를 변형 대비
  { key: 'minor_cancer',     kws: ['갑상샘암진단', '갑상선암진단', '제자리암', '상피내암', '기타피부암진단', '경계성종양진단', '유사암진단', '소액암진단'] },
  { key: 'cancer_diag',      kws: ['일반암진단', '암진단금', '암진단Ⅱ', '암진단II', '암진단2', '일반암 진단'] },
  { key: 'chemo_rad',        kws: ['항암방사선', '양성자치료', '항암중입자', '세기조절방사선', '중입자방사선', '항암방사선약물'] },
  { key: 'targeted',         kws: ['표적항암', '카티(CAR-T)', 'CAR-T', '카티항암'] },
  { key: 'cancer_main',      kws: ['암 주요치료비', '암주요치료비', '2대질환주요치료비', '혈전용해치료비'] },

  // ── 뇌 ──
  { key: 'cerebro_hem',      kws: ['뇌출혈진단'] },
  { key: 'stroke',           kws: ['뇌졸중진단', '뇌혈관질환(Ⅱ)', '뇌혈관질환(II)', '뇌졸증진단'] },
  { key: 'cerebro',          kws: ['뇌혈관질환진단', '뇌혈관질환(Ⅰ)', '뇌혈관질환(I)', '뇌혈관질환 진단'] },
  { key: 'thrombo',          kws: ['혈전용해'] },

  // ── 심장 ──
  { key: 'arrhythmia',       kws: ['부정맥진단', '심혈관질환(I49)', '심혈관질환(특정2대)', '심혈관질환(특정2'] },
  { key: 'ami',              kws: ['급성심근경색증진단', '급성심근경색진단', '심혈관질환(특정Ⅱ)', '심혈관질환(특정II)', '심혈관질환(특정2)'] },
  { key: 'ischemic',         kws: ['허혈성심장질환진단', '허혈성심장질환 진단', '심혈관질환(특정Ⅰ)', '심혈관질환(특정I)', '심혈관질환(특정1)'] },

  // ── 입원일당 ──
  { key: 'general_hosp',     kws: ['1인실 입원일당', '1인실입원일당', '상급종합병원 1인실', '종합병원 1인실'] },
  { key: 'injury_hosp',      kws: ['상해입원일당', '재해입원일당', '재해입원', '상해입원'] },
  { key: 'disease_hosp',     kws: ['질병입원일당'] },
  { key: 'er_visit',         kws: ['응급실'] },

  // ── 골절 ──
  { key: 'five_fracture',    kws: ['5대골절'] },
  { key: 'cast',             kws: ['깁스'] },
  { key: 'fracture',         kws: ['골절진단비', '골절치료자금', '골절'] },

  // ── 사망 ──
  { key: 'death_cancer',     kws: ['암사망'] },
  { key: 'death_disease',    kws: ['질병사망', '유병자질병사망'] },
  { key: 'death_injury',     kws: ['재해사망', '상해사망', '재해사망보험금', '평일일반재해사망', '상해사망후유장해'] },
  { key: 'death_general',    kws: ['일반사망'] },

  // ── 운전자 ──
  { key: 'car_settlement',   kws: ['교통사고처리지원금', '교통사고 처리지원금', '형사합의금', '형사합의지원금'] },
  { key: 'car_lawyer',       kws: ['변호사선임비용', '변호사 선임비용'] },
  { key: 'car_fine',         kws: ['벌금(대인)', '대인벌금'] },
  { key: 'car_injury',       kws: ['자동차사고부상치료비', '자동차부상치료지원금', '자동차사고 부상치료비', '자동차사고부상'] },
];

// ─── 금액 파싱: 만원 단위 정수 반환 ───
function parseAmount(str) {
  if (!str) return 0;
  str = str.replace(/,/g, '').trim();
  let total = 0;
  const eok = str.match(/([0-9.]+)\s*억/);
  if (eok) total += parseFloat(eok[1]) * 10000;
  const man = str.match(/([0-9.]+)\s*만/);
  if (man) total += parseFloat(man[1]);
  if (!eok && !man) {
    const num = str.match(/^([0-9.]+)원?$/);
    if (num) total = parseFloat(num[1]);
  }
  return Math.round(total) || 0;
}

// ─── 보험사명 추출 ───
function extractInsurer(product) {
  const norm = product.replace(/\s/g, '');
  for (const { keyword, insurer } of INSURER_MAP) {
    if (norm.includes(keyword.replace(/\s/g, ''))) return insurer;
  }
  // 폴백: 첫 의미 있는 단어
  const clean = product
    .replace(/\(무\)|\(무배당\)|무배당|무\)|해약환급금|미지급형|갱신형|\d+형/g, '')
    .trim();
  const m = clean.match(/^[^\s(（【\[、,]+/);
  return m ? m[0].slice(0, 10) : product.slice(0, 8);
}

// ─── 세부 보장명 → coverage key 매핑 ───
function mapCoverageKey(label) {
  const norm = label.replace(/\s/g, '');
  for (const rule of COVERAGE_RULES) {
    for (const kw of rule.kws) {
      if (norm.includes(kw.replace(/\s/g, ''))) return rule.key;
    }
  }
  return null;
}

// ─── 핵심 파싱 함수 ───
function parseInsuranceText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let customerName = '';

  // 고객명 추출 (OOO 님 or OOO님)
  const nameMatch = lines[0] && lines[0].match(/^(.{1,8})\s*님/);
  if (nameMatch) customerName = nameMatch[1].trim();

  // 금액 판별 정규식
  const AMT_RE = /[0-9,]+\s*(?:억\s*[0-9,]*\s*만원?|만원?|억)/;

  // 상품명 판별: 보험/케어/플러스/종합/더핏/Chubb/ABL 등 포함 + 금액 없음 + 일정 길이
  const PRODUCT_KEYWORDS = /보험|케어|플러스|종합|건강|생명|화재|손보|통합|라이프|상해보험|운전자|치아|누리는|에버리치|굿앤굿|Chubb|ABL|버팀목|이지로운|뉴케어|더핏/i;

  // 무시할 대분류 헤더 목록
  const IGNORE_LINES = new Set([
    '사망','후유장해','실손의료비','수술비','입원비(일당)','치료비','뇌혈관질환',
    '심장질환','치매','운전자','법률,배상책임','치아,화상,골절','암','골절','배상',
    '실비','수술','입원','뇌','심장','운전자보장','기타',
  ]);

  // 상태요약 줄 패턴
  const SUMMARY_RE = /^(충분|부족|미가입|권장금액|가입금액|부족금액)\s*[:：]?/;

  // 공백으로만 구성된 보험사명 단독 줄 패턴 (상품명이 아닌 경우)
  function isProductLine(line) {
    if (!PRODUCT_KEYWORDS.test(line)) return false;
    if (AMT_RE.test(line)) return false;
    if (line.length < 6) return false;
    return true;
  }

  const productMap = new Map(); // product → entry
  function emptyEntry(product) {
    const cov = {};
    COVERAGE_DEF.forEach(c => { cov[c.key] = 0; });
    return { insurer: extractInsurer(product), coverages: cov, premium: 0, start_date: '', end_date: '' };
  }

  let currentProduct = null;
  let pendingLabel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 무시: 대분류 헤더
    if (IGNORE_LINES.has(line.replace(/\s/g, ''))) { pendingLabel = null; continue; }
    // 무시: 상태요약
    if (SUMMARY_RE.test(line)) { pendingLabel = null; continue; }
    // 무시: 첫 줄(고객명)
    if (i === 0 && nameMatch) continue;

    // 상품명 감지
    if (isProductLine(line)) {
      currentProduct = line;
      if (!productMap.has(currentProduct)) {
        productMap.set(currentProduct, emptyEntry(currentProduct));
      }
      pendingLabel = null;
      continue;
    }

    // 금액 줄
    if (AMT_RE.test(line)) {
      if (currentProduct && pendingLabel) {
        const key = mapCoverageKey(pendingLabel);
        if (key) {
          const amt = parseAmount(line);
          if (amt > 0) productMap.get(currentProduct).coverages[key] += amt;
        }
      }
      pendingLabel = null;
      continue;
    }

    // 그 외: 세부 보장명 후보
    if (currentProduct && line.length >= 2) {
      pendingLabel = line;
    }
  }

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
let rptState = { companies: [], customerName: '' };

// ─── 초기화 ───
window.initRptModule = function () {
  const app = document.getElementById('report-app');
  if (!app || app.dataset.inited) return;
  app.dataset.inited = '1';
  app.innerHTML = getRptHTML();
  injectRptStyles();
};

function getRptHTML() {
  return `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
    <div style="font-size:18px;font-weight:700;color:#001E42;">
      <i class="bi bi-file-earmark-bar-graph-fill" style="color:#3182F6;margin-right:6px;"></i>
      보장분석 리포트 생성기
    </div>
  </div>

  <!-- STEP 1 -->
  <div class="rpt-card">
    <div class="rpt-step-label">STEP 1</div>
    <h3 class="rpt-step-title">보장 텍스트 붙여넣기</h3>
    <p class="rpt-step-desc">보장분석 요약 텍스트를 아래 영역에 붙여넣으세요.</p>
    <textarea id="rpt-text-input"
      placeholder="예시)
신정원 님

사망
질병사망
(무)버팀목New케어보험 일반형 해약환급금 미지급형Ⅲ
일반사망보험_신정원
100만원
..."
      style="width:100%;height:220px;border:1.5px solid #BAD7FB;border-radius:10px;
        padding:12px 14px;font-size:13px;font-family:'Noto Sans KR',sans-serif;
        color:#334155;resize:vertical;box-sizing:border-box;line-height:1.7;
        background:#F8FBFF;outline:none;transition:border 0.2s;"
      oninput="window.rptCheckInput()"
      onfocus="this.style.borderColor='#3182F6'"
      onblur="this.style.borderColor='#BAD7FB'"
    ></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
      <span id="rpt-char-count" style="font-size:11px;color:#94A3B8;">0자 입력됨</span>
      <button onclick="document.getElementById('rpt-text-input').value='';window.rptCheckInput();"
        style="background:none;border:none;font-size:12px;color:#94A3B8;cursor:pointer;padding:2px 6px;">지우기</button>
    </div>
  </div>

  <!-- STEP 2 -->
  <div class="rpt-card">
    <div class="rpt-step-label">STEP 2</div>
    <h3 class="rpt-step-title">AI 보장 분석 시작</h3>
    <p class="rpt-step-desc">버튼을 클릭하면 입력된 텍스트를 분석하여 보장분석표를 생성합니다.</p>

    <!-- 프로그레스 바 영역 -->
    <div id="rpt-progress-wrap" style="display:none;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:6px;">
        <span id="rpt-progress-text">분석 준비 중...</span>
        <span id="rpt-progress-pct">0%</span>
      </div>
      <div style="height:10px;background:#E5E8EB;border-radius:99px;overflow:hidden;">
        <div id="rpt-progress-bar"
          style="height:100%;width:0%;background:linear-gradient(90deg,#3182F6,#60A5FA);
          border-radius:99px;transition:width 0.45s cubic-bezier(0.4,0,0.2,1);"></div>
      </div>
      <div id="rpt-page-status" style="font-size:11px;color:#94A3B8;margin-top:5px;"></div>
    </div>

    <button id="rpt-analyze-btn" class="btn-action" style="max-width:240px;" onclick="window.rptStartParsing()">
      <i class="bi bi-lightning-charge-fill"></i> AI 분석 시작
    </button>
  </div>

  <!-- STEP 3 -->
  <div id="rpt-step3" class="rpt-card" style="display:none;">
    <div class="rpt-step-label">STEP 3</div>
    <h3 class="rpt-step-title">보장분석표 미리보기 &amp; 수정</h3>
    <p class="rpt-step-desc" style="color:#3182F6;font-weight:600;margin-bottom:12px;">
      💡 고객 이름, 금액, 텍스트를 클릭하면 직접 수정할 수 있습니다. (금액 수정 시 자동 합산)
    </p>
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn-action" style="width:auto;padding:10px 20px;" onclick="window.rptDownloadExcel()">
        <i class="bi bi-file-earmark-excel-fill"></i> 엑셀 다운로드
      </button>
      <button class="btn-action" style="width:auto;padding:10px 20px;background:#475569;" onclick="window.rptPrint()">
        <i class="bi bi-printer-fill"></i> 인쇄하기
      </button>
      <button style="background:none;border:1px solid #E2E8F0;padding:10px 20px;border-radius:8px;
        cursor:pointer;font-size:13px;color:#475569;" onclick="window.rptReset()">
        <i class="bi bi-arrow-counterclockwise"></i> 다시 시작
      </button>
    </div>
    <div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;">
      <div id="rpt-preview-table"></div>
    </div>
  </div>

  <!-- 에러 박스 -->
  <div id="rpt-error-box" style="display:none;margin-top:12px;padding:12px 16px;
    background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#DC2626;font-size:13px;">
    <i class="bi bi-exclamation-circle-fill"></i> <span id="rpt-error-msg"></span>
  </div>`;
}

function injectRptStyles() {
  if (document.getElementById('rpt-styles')) return;
  const s = document.createElement('style');
  s.id = 'rpt-styles';
  s.textContent = `
.rpt-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:20px 22px;margin-bottom:16px;}
.rpt-step-label{display:inline-block;font-size:11px;font-weight:700;color:#3182F6;background:#EFF6FF;padding:2px 8px;border-radius:99px;margin-bottom:8px;letter-spacing:.5px;}
.rpt-step-title{font-size:16px;font-weight:700;color:#0F172A;margin:0 0 6px 0;}
.rpt-step-desc{font-size:13px;color:#64748B;margin:0 0 14px 0;}
.btn-action{display:inline-flex;align-items:center;gap:7px;background:#3182F6;color:#fff;
  border:none;border-radius:8px;padding:11px 18px;font-size:13px;font-weight:600;
  cursor:pointer;transition:background .2s;width:100%;justify-content:center;}
.btn-action:hover{background:#1D6FE8;}
.btn-action:disabled{background:#94A3B8;cursor:not-allowed;}
#rpt-preview-table table{border-collapse:collapse;font-size:11px;font-family:'Noto Sans KR',sans-serif;min-width:700px;}
#rpt-preview-table th,#rpt-preview-table td{border:1px solid #C5CBD3;padding:5px 7px;white-space:nowrap;text-align:center;}
#rpt-preview-table .r-cat{background:#001E42;color:#fff;font-weight:700;}
#rpt-preview-table .r-item{background:#D6DEE7;font-weight:600;text-align:left;min-width:130px;}
#rpt-preview-table .r-sum{background:#D6DEE7;font-weight:700;color:#001E42;}
#rpt-preview-table .r-hdr{background:#D6DEE7;font-weight:700;font-size:10px;}
#rpt-preview-table .r-ins{background:#D6DEE7;font-weight:700;font-size:10px;color:#C00000;}
#rpt-preview-table .r-date{background:#D6DEE7;font-size:10px;}
#rpt-preview-table .r-date-alt{background:#fff;font-size:10px;}
#rpt-preview-table .r-fee{background:#D7DDE4;font-weight:700;color:#001E42;}
#rpt-preview-table .r-val{color:#1E40AF;min-width:75px;}
#rpt-preview-table .r-val-alt{background:#F8FAFC;color:#1E40AF;min-width:75px;}
#rpt-preview-table .r-title td{background:#fff;font-size:14px;font-weight:700;text-align:left;padding:10px 12px;border-bottom:2px solid #001E42;}
#rpt-preview-table .r-foot td{background:#F8FAFC;font-size:10px;color:#64748B;text-align:left;padding:6px 10px;}
[contenteditable="true"]{cursor:text;transition:all .2s;border-radius:2px;}
[contenteditable="true"]:hover{outline:1px dashed #3182F6;background:rgba(49,130,246,.1)!important;}
[contenteditable="true"]:focus{outline:2px solid #3182F6;background:#fff!important;color:#000!important;}
@keyframes rpt-fadein{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.rpt-fadein{animation:rpt-fadein .5s ease both;}
`;
  document.head.appendChild(s);
}

// ─── 글자수 카운트 ───
window.rptCheckInput = function () {
  const v = (document.getElementById('rpt-text-input') || {}).value || '';
  const el = document.getElementById('rpt-char-count');
  if (el) el.textContent = v.length.toLocaleString() + '자 입력됨';
};

// ─── 프로그레스 제어 ───
function setProgress(pct, text, status) {
  const bar = document.getElementById('rpt-progress-bar');
  const pctEl = document.getElementById('rpt-progress-pct');
  const txtEl = document.getElementById('rpt-progress-text');
  const stEl  = document.getElementById('rpt-page-status');
  if (bar)   bar.style.width   = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (txtEl) txtEl.textContent = text;
  if (stEl)  stEl.textContent  = status || '';
}

// ─── STEP 2: 분석 시작 (로딩 UX 포함) ───
window.rptStartParsing = function () {
  rptHideError();
  const textarea = document.getElementById('rpt-text-input');
  const text = (textarea && textarea.value) || '';
  if (text.trim().length < 10) {
    rptShowError('텍스트를 먼저 입력해주세요. (최소 10자 이상)');
    return;
  }

  const btn = document.getElementById('rpt-analyze-btn');
  const wrap = document.getElementById('rpt-progress-wrap');
  const step3 = document.getElementById('rpt-step3');

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 분석 중...';
  if (wrap) wrap.style.display = 'block';
  if (step3) step3.style.display = 'none';

  setProgress(0, '텍스트 구조 파악 중...', '보장 항목을 인식하고 있습니다');

  // 단계별 로딩 시퀀스 (총 ~1.8초)
  const STEPS = [
    { delay: 0,    pct: 12, text: '텍스트 구조 파악 중...',       status: '보장 항목을 인식하고 있습니다' },
    { delay: 280,  pct: 30, text: '상품명 추출 중...',             status: '가입 상품 목록을 정리하고 있습니다' },
    { delay: 560,  pct: 52, text: '보험사명 정규화 중...',         status: '보험사 정보를 매핑하고 있습니다' },
    { delay: 840,  pct: 71, text: '보장 항목 매핑 중...',          status: 'COVERAGE_DEF 기준으로 분류하고 있습니다' },
    { delay: 1100, pct: 88, text: '담보별 금액 합산 중...',        status: '중복 항목을 통합하고 있습니다' },
    { delay: 1380, pct: 96, text: '미리보기 테이블 생성 중...',    status: '거의 완료되었습니다' },
  ];

  STEPS.forEach(({ delay, pct, text, status }) => {
    setTimeout(() => setProgress(pct, text, status), delay);
  });

  // 실제 파싱은 1.7초 후 실행 → 100% 완료 → STEP3 표시
  setTimeout(() => {
    try {
      const result = parseInsuranceText(text);
      rptState.customerName = result.customerName;
      rptState.companies    = result.companies;

      setProgress(100, `분석 완료! 총 ${rptState.companies.length}개 상품 추출됨`, '');

      if (rptState.companies.length === 0) {
        rptShowError('상품 정보를 찾을 수 없습니다. 텍스트 형식을 확인해주세요.\n(보험 상품명과 금액이 포함된 텍스트여야 합니다)');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> AI 분석 시작';
        return;
      }

      // 100% 된 직후 잠깐 후에 STEP3 표시 (0.3초 딜레이 → 부드러운 전환)
      setTimeout(() => {
        if (step3) {
          step3.style.display = 'block';
          step3.classList.add('rpt-fadein');
        }
        renderPreview();
        step3.scrollIntoView({ behavior: 'smooth' });

        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> AI 분석 시작';
      }, 320);

    } catch (err) {
      rptShowError('파싱 오류: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> AI 분석 시작';
    }
  }, 1700);
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
    if (text.includes('억'))      val = parseFloat(text.replace('억', '')) * 10000;
    else if (text.includes('만')) val = parseFloat(text.replace('만', ''));
    else if (text.includes('원')) val = parseFloat(text.replace('원', ''));
    else                          val = parseFloat(text);
    if (isNaN(val)) val = 0;
  }
  if (key === 'premium') {
    rptState.companies[idx].premium = val;
    el.innerText = fmtWon(val);
    const total = rptState.companies.reduce((s, c) => s + (c.premium || 0), 0);
    const sumEl = document.getElementById('sum-premium');
    if (sumEl) sumEl.innerText = fmtWon(total);
  } else {
    rptState.companies[idx].coverages[key] = val;
    el.innerText = val ? fmtMan(val) : '';
    const sum = rptState.companies.reduce((s, c) => s + ((c.coverages || {})[key] || 0), 0);
    const sumEl = document.getElementById('sum-' + key);
    if (sumEl) sumEl.innerText = sum ? fmtMan(sum) : '';
  }
};

// ─── 미리보기 렌더링 ───
function renderPreview() {
  const co   = rptState.companies;
  const name = rptState.customerName || '고객';
  const N    = co.length;

  let html = `<table>`;

  // 타이틀
  html += `<tr class="r-title"><td colspan="${3 + N}">
    <span contenteditable="true" onblur="window.rptUpdateName(this)"
      style="border-bottom:1px dashed #A0AAB5;padding-bottom:2px;">${esc(name)}</span> 님 보장분석표
  </td></tr>`;

  // 헤더 1: 보험사
  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr" style="background:#001E42;color:#fff;">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach((c, i) => html += `<th class="r-ins" contenteditable="true" onblur="window.rptUpdateText(this,${i},'name')">${esc(c.name)}</th>`);
  html += `</tr>`;

  // 헤더 2: 상품명
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">상품명</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date-alt" style="font-size:9px;" contenteditable="true" onblur="window.rptUpdateText(this,${i},'product')" title="${esc(c.product)}">${esc(c.product)}</td>`);
  html += `</tr>`;

  // 헤더 3: 가입시기
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">가입시기</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date" contenteditable="true" onblur="window.rptUpdateText(this,${i},'start_date')">${esc(c.start_date||'')}</td>`);
  html += `</tr>`;

  // 헤더 4: 만기
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date-alt" style="font-size:9px;" contenteditable="true" onblur="window.rptUpdateText(this,${i},'end_date')">${esc(c.end_date||'')}</td>`);
  html += `</tr>`;

  // 헤더 5: 보험료
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee" style="background:#D6DEE7;color:#001E42;">보험료</th>
    <td class="r-sum r-fee" id="sum-premium">${fmtWon(totalPrem)}</td>`;
  co.forEach((c, i) => html += `<td class="r-fee" contenteditable="true" onblur="window.rptUpdateVal(this,${i},'premium')">${fmtWon(c.premium||0)}</td>`);
  html += `</tr>`;

  // 담보 행
  COVERAGE_DEF.forEach((cov, idx) => {
    const vals = co.map(c => (c.coverages||{})[cov.key] || 0);
    const sum  = vals.reduce((s, v) => s + v, 0);
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
      html += `<td class="${cls}" contenteditable="true" onblur="window.rptUpdateVal(this,${i},'${cov.key}')">${v ? fmtMan(v) : ''}</td>`;
    });
    html += `</tr>`;
  });

  html += `<tr class="r-foot"><td colspan="${3 + N}">
    * 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.
  </td></tr>`;
  html += `</table>`;

  document.getElementById('rpt-preview-table').innerHTML = html;
}

// ─── 엑셀 다운로드 ───
window.rptDownloadExcel = async function () {
  if (!window.XLSX) {
    await loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js');
  }
  const co   = rptState.companies;
  const name = rptState.customerName || '고객';
  const N    = co.length;
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const merges = [];

  const C = {
    navy:'001E42', white:'FFFFFF', gray:'D6DEE7', feeGray:'D7DDE4',
    oddBg:'FFFFFF', evenBg:'F8FAFC', footBg:'F8FAFC',
    blue:'1E40AF', darkNav:'001E42', red:'C00000', grayTxt:'94A3B8',
  };
  const thin = { style:'thin', color:{ rgb:'C5CBD3' } };
  const BD   = { top:thin, bottom:thin, left:thin, right:thin };

  function mkCell(v, fill, fontColor, bold, align, fontSize) {
    const s = {
      border: BD,
      fill: fill ? { type:'pattern', patternType:'solid', fgColor:{ rgb:fill } } : undefined,
      font: { name:'Malgun Gothic', sz:fontSize||10, bold:!!bold, color:fontColor ? { rgb:fontColor } : undefined },
      alignment: { horizontal:align||'center', vertical:'center', wrapText:true },
    };
    if (v===null||v===undefined||v==='') return { v:'', t:'s', s };
    if (typeof v==='number') return { v, t:'n', s };
    return { v:String(v), t:'s', s };
  }
  function setCell(r,c,v,fill,fontColor,bold,align,fontSize) {
    ws[XLSX.utils.encode_cell({r,c})] = mkCell(v,fill,fontColor,bold,align,fontSize);
  }
  function addMerge(r1,c1,r2,c2) { merges.push({s:{r:r1,c:c1},e:{r:r2,c:c2}}); }

  let r = 0;
  setCell(r,0,`${name} 님 보장분석표`,null,null,true,'left',14);
  addMerge(r,0,r,2+N); r++;

  setCell(r,0,'주요\n보장',C.navy,C.white,true,'center');
  addMerge(r,0,r+4,0);
  setCell(r,2,'고객\n보장합산',C.gray,C.darkNav,true,'center');
  addMerge(r,2,r+3,2);
  setCell(r,1,'보험사',C.navy,C.white,true,'center');
  co.forEach((c,i)=>setCell(r,3+i,c.name,C.gray,C.red,true,'center')); r++;

  setCell(r,1,'상품명',C.navy,C.white,true,'center');
  setCell(r,2,'',C.gray,null,false,'center');
  co.forEach((c,i)=>setCell(r,3+i,c.product,C.white,null,false,'center',9)); r++;

  setCell(r,1,'가입시기',C.navy,C.white,true,'center');
  setCell(r,2,'',C.gray,null,false,'center');
  co.forEach((c,i)=>setCell(r,3+i,c.start_date||'',C.gray,null,false,'center',9)); r++;

  setCell(r,1,'납입기간/\n만기시점',C.navy,C.white,true,'center');
  setCell(r,2,'',C.gray,null,false,'center');
  co.forEach((c,i)=>setCell(r,3+i,c.end_date||'',C.white,null,false,'center',9)); r++;

  setCell(r,0,'',C.navy,C.white,true,'center');
  setCell(r,1,'보험료',C.gray,C.white,true,'center');
  const totalPrem = co.reduce((s,c)=>s+(c.premium||0),0);
  setCell(r,2,totalPrem||'',C.feeGray,C.darkNav,true,'right');
  co.forEach((c,i)=>setCell(r,3+i,c.premium||'',C.feeGray,C.darkNav,true,'right')); r++;

  let catStartRow=-1, catCurr=null;
  COVERAGE_DEF.forEach((cov,idx)=>{
    const isEven = idx%2===1;
    const dataBg = isEven ? C.evenBg : C.oddBg;
    if (cov.cat!==null) {
      if (catCurr!==null) addMerge(catStartRow,0,r-1,0);
      catCurr=cov.cat; catStartRow=r;
      setCell(r,0,cov.cat,C.navy,C.white,true,'center');
    }
    setCell(r,1,cov.label,C.gray,null,true,'left');
    const vals = co.map(c=>(c.coverages||{})[cov.key]||0);
    const sum  = vals.reduce((s,v)=>s+v,0);
    setCell(r,2,sum?fmtMan(sum):'',C.gray,C.darkNav,true,'right');
    vals.forEach((v,i)=>setCell(r,3+i,v?fmtMan(v):'',dataBg,C.blue,false,'right'));
    r++;
  });
  if (catCurr!==null) addMerge(catStartRow,0,r-1,0);

  setCell(r,0,'* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.',C.footBg,C.grayTxt,false,'left',9);
  addMerge(r,0,r,2+N);

  ws['!ref']    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r,c:2+N}});
  ws['!merges'] = merges;
  ws['!cols']   = [{wch:5},{wch:18},{wch:12},...co.map(()=>({wch:14}))];
  ws['!rows']   = Array.from({length:r+1},(_,i)=>({hpt:i===0?28:(i>=1&&i<=5)?36:22}));

  XLSX.utils.book_append_sheet(wb,ws,'보장분석표');
  const d  = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb,`${name}_보장분석표_${ds}.xlsx`);
};

// ─── 인쇄 ───
window.rptPrint = function () {
  const content = document.getElementById('rpt-preview-table').innerHTML;
  const win = window.open('','_blank','width=1200,height=800');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>보장분석표 인쇄</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;}
      @page{size:A4 landscape;margin:10mm;}
      body{font-family:'Noto Sans KR',sans-serif;margin:0;padding:0;zoom:.65;}
      table{border-collapse:collapse;width:100%;table-layout:fixed;word-break:break-all;}
      th,td{border:1px solid #C5CBD3;padding:4px 2px;text-align:center;font-size:11px;}
      .r-cat{background:#001E42!important;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:40px;}
      .r-item{background:#D6DEE7!important;font-weight:600;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:120px;}
      .r-sum{background:#D6DEE7!important;font-weight:700;color:#001E42;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:70px;}
      .r-hdr{background:#D6DEE7!important;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-ins{background:#D6DEE7!important;font-weight:700;color:#C00000;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-date{background:#D6DEE7!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-fee{background:#D7DDE4!important;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-title td{font-size:16px;font-weight:700;text-align:left;padding:10px;border-bottom:2px solid #001E42;}
    </style>
  </head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(()=>{win.focus();win.print();},800);
};

// ─── 리셋 ───
window.rptReset = function () {
  rptState = { companies:[], customerName:'' };
  const ta = document.getElementById('rpt-text-input');
  if (ta) ta.value='';
  window.rptCheckInput();
  const s3 = document.getElementById('rpt-step3');
  if (s3) { s3.style.display='none'; s3.classList.remove('rpt-fadein'); }
  const wrap = document.getElementById('rpt-progress-wrap');
  if (wrap) wrap.style.display='none';
  setProgress(0,'분석 준비 중...','');
  const btn = document.getElementById('rpt-analyze-btn');
  if (btn) { btn.disabled=false; btn.innerHTML='<i class="bi bi-lightning-charge-fill"></i> AI 분석 시작'; }
  rptHideError();
};

// ─── 유틸 ───
function esc(str) {
  return String(str||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function fmtWon(v) { return v ? v.toLocaleString()+'원' : ''; }
function fmtMan(v) {
  if (!v) return '';
  if (v>=10000) {
    const e=v/10000, r=Math.round(e*10)/10;
    return (Number.isInteger(r)?r:r.toFixed(1))+'억';
  }
  return v.toLocaleString()+'만';
}
function rptShowError(msg) {
  const b=document.getElementById('rpt-error-box');
  if(b){document.getElementById('rpt-error-msg').textContent=msg;b.style.display='block';}
}
function rptHideError() {
  const b=document.getElementById('rpt-error-box');
  if(b)b.style.display='none';
}
function loadScript(src) {
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src=src;s.onload=res;s.onerror=rej;
    document.head.appendChild(s);
  });
}

// ─── 자동 초기화 ───
if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', window.initRptModule);
} else {
  window.initRptModule();
}

})();