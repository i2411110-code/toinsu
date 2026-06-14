// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v7.0: 상품명 중복제거 강화 + 미리보기 토글 + 인쇄 CSS + 엑셀 스타일 일치
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

// ─── 상품명 → 보험사명 정확 매핑 테이블 ───
const INSURER_MAP = [
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

// ─── [v7 개선] 담보 키워드 매핑 ───
const COVERAGE_RULES = [
  { key: 'inpatient',        kws: ['입원의료비', '입원 의료비', '상해+질병 입원', '입원실료'] },
  { key: 'outpatient',       kws: ['외래의료비', '처방조제료', '통원의료비', '통원 의료비', '외래'] },
  { key: 'liability',        kws: ['배상책임', '일상생활배상', '가족생활 배상', '가족일상생활'] },
  { key: 'robot_surg',       kws: ['다빈치', '레보아이', '로봇암수술', '로봇 암수술'] },
  { key: 'brain_heart_surg', kws: ['뇌혈관질환 수술', '허혈성심장질환 수술', '뇌출혈및급성심근경색수술', '뇌수술비', '심장수술비'] },
  { key: 'type_surg',        kws: ['질병종수술', '상해종수술', '종수술', '1~5종', '상해1~5종'] },
  { key: 'disease_surg',     kws: ['질병수술급여금', '질병수술비', '질병수술'] },
  { key: 'injury_surg',      kws: ['상해수술비', '재해수술비', '재해수술급부금', '상해수술'] },
  { key: 'minor_cancer',     kws: ['갑상샘암진단', '갑상선암진단', '제자리암', '상피내암', '기타피부암진단', '경계성종양진단', '유사암진단', '소액암진단', '치아파절'] },
  { key: 'cancer_diag',      kws: ['일반암진단', '암진단금', '암진단Ⅱ', '암진단II', '암진단2', '일반암 진단', '통합암진단', '통합암 진단', '남성통합암'] },
  { key: 'chemo_rad',        kws: ['항암방사선', '양성자치료', '항암중입자', '세기조절방사선', '중입자방사선', '항암방사선약물'] },
  { key: 'targeted',         kws: ['표적항암', '카티(CAR-T)', 'CAR-T', '카티항암'] },
  { key: 'cancer_main',      kws: ['암 주요치료비', '암주요치료비', '2대질환주요치료비'] },
  { key: 'cerebro_hem',      kws: ['뇌출혈진단'] },
  { key: 'stroke',           kws: ['뇌졸중진단', '뇌혈관질환(Ⅱ)', '뇌혈관질환(II)', '뇌졸증진단'] },
  { key: 'cerebro',          kws: ['뇌혈관질환진단', '뇌혈관질환(Ⅰ)', '뇌혈관질환(I)', '뇌혈관질환 진단'] },
  { key: 'thrombo',          kws: ['혈전용해'] },
  { key: 'arrhythmia',       kws: ['부정맥진단', '심혈관질환(I49)'] },
  { key: 'ami',              kws: ['급성심근경색증진단', '급성심근경색진단', '심혈관질환(특정Ⅱ)', '심혈관질환(특정II)', '심혈관질환(특정2)'] },
  { key: 'ischemic',         kws: ['허혈성심장질환진단', '허혈성심장질환 진단', '심혈관질환(특정Ⅰ)', '심혈관질환(특정I)', '심혈관질환(특정1)'] },
  { key: 'general_hosp',     kws: ['1인실 입원일당', '1인실입원일당', '상급종합병원 1인실', '종합병원 1인실', '상급종합병원1인실', '종합병원1인실'] },
  { key: 'injury_hosp',      kws: ['상해입원일당', '재해입원일당', '재해입원', '상해입원'] },
  { key: 'disease_hosp',     kws: ['질병입원일당'] },
  { key: 'er_visit',         kws: ['응급실'] },
  { key: 'five_fracture',    kws: ['5대골절'] },
  { key: 'cast',             kws: ['깁스'] },
  { key: 'fracture',         kws: ['골절진단비', '골절치료자금', '골절'] },
  { key: 'death_cancer',     kws: ['암사망'] },
  { key: 'death_disease',    kws: ['질병사망', '유병자질병사망'] },
  { key: 'death_injury',     kws: ['재해사망', '상해사망', '재해사망보험금', '평일일반재해사망', '상해사망후유장해'] },
  { key: 'death_general',    kws: ['일반사망'] },
  { key: 'car_settlement',   kws: ['교통사고처리지원금', '교통사고 처리지원금', '형사합의금', '형사합의지원금'] },
  { key: 'car_lawyer',       kws: ['변호사선임비용', '변호사 선임비용'] },
  { key: 'car_fine',         kws: ['벌금(대인)', '대인벌금'] },
  { key: 'car_injury',       kws: ['자동차사고부상치료비', '자동차부상치료지원금', '자동차사고 부상치료비', '자동차사고부상', '자동차부상치료'] },
];

// ─── 금액 파싱 ───
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
  const clean = product
    .replace(/\(무\)|\(무배당\)|무배당|무\)|해약환급금|미지급형|갱신형|\d+형/g, '')
    .trim();
  const m = clean.match(/^[^\s(（【\[、,]+/);
  return m ? m[0].slice(0, 10) : product.slice(0, 8);
}

// ─── [v7 핵심] 상품명 정규화 키 생성 ───
// 띄어쓰기·특수문자·괄호·형번호 등을 제거해 동일 상품 판별
function normalizeProductKey(name) {
  return name
    .replace(/\s/g, '')                    // 공백 제거
    .replace(/[()（）【】\[\]<>「」『』]/g, '') // 괄호 제거
    .replace(/[·・,，、]/g, '')              // 구분자 제거
    .replace(/무배당|무\)|무\(|갱신형|해약환급금|미지급형|납입면제형|최초계약|일반심사형/g, '') // 공통 접미사 제거
    .toLowerCase();
}

// ─── [v7 핵심] 상품명인지 담보명인지 판별 ───
// 진짜 보험 상품명 패턴: 브랜드+상품 키워드 포함, 금액 없음, 최소 길이
const PRODUCT_MUST_HAVE = /보험|케어|플러스|종합|건강|생명|화재|손보|통합보험|라이프|운전자보험|치아보험|누리는|에버리치|굿앤굿|Chubb|ABL|버팀목|이지로운|뉴케어|더핏|흥Good|흥good/i;
const AMT_RE = /[0-9,]+\s*(?:억\s*[0-9,]*\s*만원?|만원?|억)/;

// 담보명으로 오인될 수 있는 패턴 (이런 패턴이 있으면 상품명 아님)
const COVERAGE_LIKE = /진단비|진단금|수술비|입원일당|치료비|사망보험금|사망보험|사망급부|재해사망|상해사망|입원비|수술급|배상책임|치료자금|치료지원금|부상치료|골절|보장보험금|보험금$|손해액|합의금|선임비용|벌금|응급실|처방조제|외래진료|깁스|혈전|항암|표적|항암방사|로봇암/;

function isProductLine(line) {
  if (!PRODUCT_MUST_HAVE.test(line)) return false;  // 보험 키워드 없으면 false
  if (AMT_RE.test(line)) return false;              // 금액 포함이면 담보명
  if (COVERAGE_LIKE.test(line)) return false;       // 담보명 패턴이면 false
  if (line.length < 7) return false;               // 너무 짧으면 false
  return true;
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

// ─── [v7 핵심] 파싱 함수 - 중복 상품 병합 로직 강화 ───
function parseInsuranceText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let customerName = '';

  const nameMatch = lines[0] && lines[0].match(/^(.{1,8})\s*님/);
  if (nameMatch) customerName = nameMatch[1].trim();

  // 무시할 대분류 헤더
  const IGNORE_LINES = new Set([
    '사망','후유장해','실손의료비','수술비','입원비(일당)','치료비','뇌혈관질환',
    '심장질환','치매','운전자','법률,배상책임','치아,화상,골절','암','골절','배상',
    '실비','수술','입원','뇌','심장','운전자보장','기타',
  ]);
  const SUMMARY_RE = /^(충분|부족|미가입|권장금액|가입금액|부족금액)\s*[:：]?/;

  // productMap: normalizedKey → { displayName, insurer, coverages, premium, start_date, end_date }
  const productMap = new Map();
  // 삽입 순서 유지용
  const productOrder = [];

  function emptyEntry(product) {
    const cov = {};
    COVERAGE_DEF.forEach(c => { cov[c.key] = 0; });
    return {
      displayName: product,
      insurer: extractInsurer(product),
      coverages: cov,
      premium: 0,
      start_date: '',
      end_date: '',
    };
  }

  let currentNormKey = null;
  let pendingLabel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (IGNORE_LINES.has(line.replace(/\s/g, ''))) { pendingLabel = null; continue; }
    if (SUMMARY_RE.test(line)) { pendingLabel = null; continue; }
    if (i === 0 && nameMatch) continue;

    // 상품명 감지
    if (isProductLine(line)) {
      const nk = normalizeProductKey(line);
      if (!productMap.has(nk)) {
        productMap.set(nk, emptyEntry(line));
        productOrder.push(nk);
      }
      currentNormKey = nk;
      pendingLabel = null;
      continue;
    }

    // 금액 줄
    if (AMT_RE.test(line)) {
      if (currentNormKey && pendingLabel) {
        const key = mapCoverageKey(pendingLabel);
        if (key) {
          const amt = parseAmount(line);
          if (amt > 0) productMap.get(currentNormKey).coverages[key] += amt;
        }
      }
      pendingLabel = null;
      continue;
    }

    // 세부 보장명 후보 (담보명)
    if (currentNormKey && line.length >= 2) {
      pendingLabel = line;
    }
  }

  const companies = [];
  for (const nk of productOrder) {
    const data = productMap.get(nk);
    companies.push({
      name: data.insurer,
      product: data.displayName,
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
let previewVisible = false;

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
    <h3 class="rpt-step-title">분석 완료</h3>
    <p class="rpt-step-desc" id="rpt-result-summary" style="color:#3182F6;font-weight:600;margin-bottom:16px;"></p>

    <!-- 액션 버튼들 -->
    <div style="display:flex;gap:10px;margin-bottom:0;flex-wrap:wrap;">
      <!-- [v7] 미리보기 토글 버튼 -->
      <button id="rpt-preview-btn" class="btn-action" style="width:auto;padding:10px 20px;background:#0F172A;" onclick="window.rptTogglePreview()">
        <i class="bi bi-table"></i> 미리보기 펼치기
      </button>
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
  </div>

  <!-- [v7] 미리보기 패널 (토글) -->
  <div id="rpt-preview-panel" style="display:none;margin-top:0;">
    <div class="rpt-card" style="margin-bottom:0;border-top-left-radius:0;border-top-right-radius:0;border-top:none;">
      <p style="font-size:12px;color:#3182F6;margin:0 0 12px 0;font-weight:600;">
        💡 고객 이름, 금액, 텍스트를 클릭하면 직접 수정할 수 있습니다. (금액 수정 시 자동 합산)
      </p>
      <div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;">
        <div id="rpt-preview-table"></div>
      </div>
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

/* 미리보기 테이블 */
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

/* 미리보기 패널 애니메이션 */
#rpt-preview-panel{transition:opacity .3s ease;}
#rpt-step3.has-preview{border-bottom-left-radius:0;border-bottom-right-radius:0;margin-bottom:0;}
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

// ─── STEP 2: 분석 시작 ───
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
  const previewPanel = document.getElementById('rpt-preview-panel');

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 분석 중...';
  if (wrap) wrap.style.display = 'block';
  if (step3) step3.style.display = 'none';
  if (previewPanel) previewPanel.style.display = 'none';
  previewVisible = false;

  setProgress(0, '텍스트 구조 파악 중...', '보장 항목을 인식하고 있습니다');

  const STEPS = [
    { delay: 0,    pct: 12, text: '텍스트 구조 파악 중...',       status: '보장 항목을 인식하고 있습니다' },
    { delay: 280,  pct: 30, text: '상품명 추출 중...',             status: '가입 상품 목록을 정리하고 있습니다' },
    { delay: 560,  pct: 52, text: '보험사명 정규화 중...',         status: '보험사 정보를 매핑하고 있습니다' },
    { delay: 840,  pct: 71, text: '중복 상품 병합 중...',          status: '동일 상품을 하나로 통합하고 있습니다' },
    { delay: 1100, pct: 88, text: '담보별 금액 합산 중...',        status: '중복 항목을 통합하고 있습니다' },
    { delay: 1380, pct: 96, text: '미리보기 테이블 생성 중...',    status: '거의 완료되었습니다' },
  ];
  STEPS.forEach(({ delay, pct, text, status }) => {
    setTimeout(() => setProgress(pct, text, status), delay);
  });

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

      setTimeout(() => {
        if (step3) {
          step3.style.display = 'block';
          step3.classList.add('rpt-fadein');
          // 결과 요약 업데이트
          const summary = document.getElementById('rpt-result-summary');
          if (summary) {
            summary.textContent = `✅ 총 ${rptState.companies.length}개 보험 상품 분석 완료! 아래 버튼으로 미리보기·다운로드·인쇄할 수 있습니다.`;
          }
          // 미리보기 버튼 업데이트
          const pvBtn = document.getElementById('rpt-preview-btn');
          if (pvBtn) pvBtn.innerHTML = '<i class="bi bi-table"></i> 미리보기 펼치기';
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

// ─── [v7] 미리보기 토글 ───
window.rptTogglePreview = function () {
  const panel = document.getElementById('rpt-preview-panel');
  const btn = document.getElementById('rpt-preview-btn');
  const step3 = document.getElementById('rpt-step3');
  if (!panel) return;

  previewVisible = !previewVisible;
  if (previewVisible) {
    panel.style.display = 'block';
    panel.style.opacity = '0';
    requestAnimationFrame(() => { panel.style.opacity = '1'; });
    if (btn) btn.innerHTML = '<i class="bi bi-table"></i> 미리보기 접기';
    if (step3) step3.classList.add('has-preview');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    panel.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="bi bi-table"></i> 미리보기 펼치기';
    if (step3) step3.classList.remove('has-preview');
  }
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

  html += `<tr class="r-title"><td colspan="${3 + N}">
    <span contenteditable="true" onblur="window.rptUpdateName(this)"
      style="border-bottom:1px dashed #A0AAB5;padding-bottom:2px;">${esc(name)}</span> 님 보장분석표
  </td></tr>`;

  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr" style="background:#001E42;color:#fff;">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach((c, i) => html += `<th class="r-ins" contenteditable="true" onblur="window.rptUpdateText(this,${i},'name')">${esc(c.name)}</th>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">상품명</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date-alt" style="font-size:9px;" contenteditable="true" onblur="window.rptUpdateText(this,${i},'product')" title="${esc(c.product)}">${esc(c.product)}</td>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">가입시기</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date" contenteditable="true" onblur="window.rptUpdateText(this,${i},'start_date')">${esc(c.start_date||'')}</td>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach((c, i) => html += `<td class="r-date-alt" style="font-size:9px;" contenteditable="true" onblur="window.rptUpdateText(this,${i},'end_date')">${esc(c.end_date||'')}</td>`);
  html += `</tr>`;

  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee" style="background:#D6DEE7;color:#001E42;">보험료</th>
    <td class="r-sum r-fee" id="sum-premium">${fmtWon(totalPrem)}</td>`;
  co.forEach((c, i) => html += `<td class="r-fee" contenteditable="true" onblur="window.rptUpdateVal(this,${i},'premium')">${fmtWon(c.premium||0)}</td>`);
  html += `</tr>`;

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

// ─── [v7] 엑셀 다운로드 - 심*진 파일 스타일 완전 일치 ───
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

  // 색상 (심*진 엑셀에서 추출한 정확한 값)
  const C = {
    navy:    '001E42',  // 헤더 배경
    white:   'FFFFFF',
    gray:    'D6DEE7',  // 담보명/합산 배경
    feeGray: 'D7DDE4',  // 보험료 행 배경
    oddBg:   'FFFFFF',  // 홀수 담보 배경
    evenBg:  'F8FAFC',  // 짝수 담보 배경
    footBg:  'F8FAFC',
    blue:    '1E40AF',  // 담보 금액 글자
    darkNav: '001E42',  // 합산 글자
    red:     'C00000',  // 보험사명 글자
    grayTxt: '94A3B8',  // 각주 글자
    titleBorderBottom: '001E42',
  };

  const thin = { style: 'thin', color: { rgb: 'C5CBD3' } };
  const BD   = { top: thin, bottom: thin, left: thin, right: thin };

  function mkCell(v, fill, fontColor, bold, align, fontSize, wrapText) {
    const s = {
      border: BD,
      fill: fill ? { type: 'pattern', patternType: 'solid', fgColor: { rgb: fill } } : { type: 'pattern', patternType: 'none' },
      font: {
        name: 'Malgun Gothic',
        sz: fontSize || 10,
        bold: !!bold,
        color: fontColor ? { rgb: fontColor } : { rgb: '000000' },
      },
      alignment: { horizontal: align || 'center', vertical: 'center', wrapText: wrapText !== false },
    };
    if (v === null || v === undefined || v === '') return { v: '', t: 's', s };
    if (typeof v === 'number') return { v, t: 'n', s };
    return { v: String(v), t: 's', s };
  }

  function setCell(r, c, v, fill, fontColor, bold, align, fontSize, wrapText) {
    ws[XLSX.utils.encode_cell({ r, c })] = mkCell(v, fill, fontColor, bold, align, fontSize, wrapText);
  }
  function addMerge(r1, c1, r2, c2) {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  }

  let r = 0;

  // ── 타이틀 행 (Row 1) ──
  setCell(r, 0, `${name} 님 보장분석표`, null, C.navy, true, 'left', 14, false);
  // 타이틀 셀 하단 테두리 강조
  const titleCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
  titleCell.s.border = { ...BD, bottom: { style: 'medium', color: { rgb: C.navy } } };
  addMerge(r, 0, r, 2 + N);
  r++;

  // ── 헤더 블록 (Row 2~6): 주요보장 병합 ──
  // 주요보장 셀 (A열, rowspan 5)
  setCell(r, 0, '주요\n보장', C.navy, C.white, true, 'center', 10);
  addMerge(r, 0, r + 4, 0);

  // 고객보장합산 셀 (C열, rowspan 4 → 행 2~5, 보험료 행 위까지)
  setCell(r, 2, '고객\n보장합산', C.gray, C.darkNav, true, 'center', 10);
  addMerge(r, 2, r + 3, 2);

  // 보험사 행
  setCell(r, 1, '보험사', C.navy, C.white, true, 'center', 10);
  co.forEach((c, i) => setCell(r, 3 + i, c.name, C.gray, C.red, true, 'center', 10));
  r++;

  // 상품명 행
  setCell(r, 1, '상품명', C.navy, C.white, true, 'center', 10);
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.product, C.white, '000000', false, 'center', 9));
  r++;

  // 가입시기 행
  setCell(r, 1, '가입시기', C.navy, C.white, true, 'center', 10);
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.start_date || '', C.gray, '000000', false, 'center', 9));
  r++;

  // 납입기간/만기 행
  setCell(r, 1, '납입기간/\n만기시점', C.navy, C.white, true, 'center', 10);
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.end_date || '', C.white, '000000', false, 'center', 9));
  r++;

  // 보험료 행
  setCell(r, 0, '', C.navy, C.white, true, 'center'); // 주요보장 병합 내부
  setCell(r, 1, '보험료', C.feeGray, C.darkNav, true, 'center', 10);
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  setCell(r, 2, totalPrem || '', C.feeGray, C.darkNav, true, 'right', 10);
  co.forEach((c, i) => setCell(r, 3 + i, c.premium || '', C.feeGray, C.darkNav, true, 'right', 10));
  r++;

  // ── 담보 행 ──
  let catStartRow = -1, catCurr = null;

  COVERAGE_DEF.forEach((cov, idx) => {
    const isEven = idx % 2 === 1;
    const dataBg = isEven ? C.evenBg : C.oddBg;

    if (cov.cat !== null) {
      if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0);
      catCurr = cov.cat;
      catStartRow = r;
      setCell(r, 0, cov.cat, C.navy, C.white, true, 'center', 10);
    }

    setCell(r, 1, cov.label, C.gray, '000000', true, 'left', 10, false);

    const vals = co.map(c => (c.coverages || {})[cov.key] || 0);
    const sum  = vals.reduce((s, v) => s + v, 0);
    setCell(r, 2, sum ? fmtMan(sum) : '', C.gray, C.darkNav, true, 'right', 10, false);

    vals.forEach((v, i) => setCell(r, 3 + i, v ? fmtMan(v) : '', dataBg, C.blue, false, 'right', 10, false));
    r++;
  });

  // 마지막 카테고리 병합 닫기
  if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0);

  // ── 각주 행 ──
  setCell(r, 0,
    '* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.',
    C.footBg, C.grayTxt, false, 'left', 9, false
  );
  addMerge(r, 0, r, 2 + N);

  // ── 범위·병합·열너비·행높이 설정 ──
  ws['!ref']    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 + N } });
  ws['!merges'] = merges;

  // 심*진 엑셀과 동일한 열 너비
  ws['!cols'] = [
    { wch: 5 },   // A: 주요보장
    { wch: 22 },  // B: 담보명
    { wch: 12 },  // C: 고객보장합산
    ...co.map(() => ({ wch: 12 })), // 각 상품 열
  ];

  // 행 높이
  ws['!rows'] = Array.from({ length: r + 1 }, (_, i) => ({
    hpt: i === 0 ? 28         // 타이틀
       : i >= 1 && i <= 5 ? 36  // 헤더 5행
       : 22                   // 담보 행
  }));

  XLSX.utils.book_append_sheet(wb, ws, '보장분석표');

  const d  = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `${name}_보장분석표_${ds}.xlsx`);
};

// ─── [v7] 인쇄 - A4 가로 1페이지 행 잘림 방지 ───
window.rptPrint = function () {
  const content = document.getElementById('rpt-preview-table').innerHTML;
  const win = window.open('', '_blank', 'width=1400,height=900');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>보장분석표 인쇄</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }

      /* ── 화면 미리보기 ── */
      body {
        font-family: 'Noto Sans KR', sans-serif;
        background: #f0f0f0;
        padding: 10px;
      }
      .print-wrapper {
        background: white;
        padding: 8mm 6mm;
        width: fit-content;
        min-width: 100%;
      }

      table {
        border-collapse: collapse;
        table-layout: auto;
        width: 100%;
      }
      th, td {
        border: 1px solid #C5CBD3;
        padding: 3px 4px;
        text-align: center;
        font-size: 9px;
        font-family: 'Noto Sans KR', sans-serif;
        line-height: 1.3;
        vertical-align: middle;
        white-space: nowrap;
      }
      .r-cat    { background: #001E42 !important; color: #fff; font-weight: 700; width: 22px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-item   { background: #D6DEE7 !important; font-weight: 600; text-align: left; min-width: 90px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-sum    { background: #D6DEE7 !important; font-weight: 700; color: #001E42; min-width: 55px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-hdr    { background: #D6DEE7 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-ins    { background: #D6DEE7 !important; font-weight: 700; color: #C00000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-date   { background: #D6DEE7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-date-alt { background: #fff !important; font-size: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-fee    { background: #D7DDE4 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-val    { background: #fff !important; color: #1E40AF; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-val-alt{ background: #F8FAFC !important; color: #1E40AF; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .r-title td { font-size: 13px; font-weight: 700; text-align: left; padding: 7px 8px; border-bottom: 2px solid #001E42; }
      .r-foot td { background: #F8FAFC !important; font-size: 8px; color: #64748B; text-align: left; padding: 4px 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      /* ── @media print ──
         핵심 원칙:
         - 행(row)은 절대 잘리지 않도록 → page-break-inside: avoid on tr
         - 열(column)이 많으면 가로로 다음 페이지로 → 가로 overflow 허용
         - 모든 행이 한 세로 페이지에 들어가도록 세로 스케일 조정
      */
      @media print {
        @page {
          size: A4 landscape;
          margin: 8mm 6mm;
        }

        html, body {
          width: auto;
          height: auto;
          background: white !important;
          padding: 0;
          margin: 0;
        }

        .print-wrapper {
          padding: 0;
          background: white !important;
          /* 가로는 자연스럽게, 세로만 1페이지 강제 */
          /* transform 대신 테이블 자체 폰트/패딩 축소로 대응 */
        }

        table {
          width: auto;
          /* 열 수가 많을 때 가로로 넘어가도록 */
          page-break-inside: auto;
        }

        /* 행은 절대 중간에서 잘리지 않도록 */
        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* 세로 방향으로 모든 행이 들어가도록 폰트 및 패딩 최소화 */
        th, td {
          font-size: 7.5px !important;
          padding: 2px 3px !important;
          line-height: 1.2 !important;
        }
        .r-title td {
          font-size: 11px !important;
          padding: 5px 6px !important;
        }
        .r-foot td {
          font-size: 7px !important;
          padding: 3px 4px !important;
        }
        .r-item { min-width: 75px !important; }
        .r-sum  { min-width: 45px !important; }

        /* 인쇄 시 contenteditable 윤곽선 제거 */
        [contenteditable] { outline: none !important; }
      }
    </style>
  </head><body>
    <div class="print-wrapper">
      ${content}
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 800);
      };
    <\/script>
  </body></html>`);
  win.document.close();
};

// ─── 리셋 ───
window.rptReset = function () {
  rptState = { companies: [], customerName: '' };
  previewVisible = false;
  const ta = document.getElementById('rpt-text-input');
  if (ta) ta.value = '';
  window.rptCheckInput();
  const s3 = document.getElementById('rpt-step3');
  if (s3) { s3.style.display = 'none'; s3.classList.remove('rpt-fadein', 'has-preview'); }
  const panel = document.getElementById('rpt-preview-panel');
  if (panel) panel.style.display = 'none';
  const wrap = document.getElementById('rpt-progress-wrap');
  if (wrap) wrap.style.display = 'none';
  setProgress(0, '분석 준비 중...', '');
  const btn = document.getElementById('rpt-analyze-btn');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> AI 분석 시작'; }
  rptHideError();
};

// ─── 유틸 ───
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function fmtWon(v) { return v ? v.toLocaleString() + '원' : ''; }
function fmtMan(v) {
  if (!v) return '';
  if (v >= 10000) {
    const e = v / 10000, r = Math.round(e * 10) / 10;
    return (Number.isInteger(r) ? r : r.toFixed(1)) + '억';
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