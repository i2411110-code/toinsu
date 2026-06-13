ash

cat > /mnt/user-data/outputs/report_module_fixed.js << 'ENDOFFILE'
// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈 (수정본)
// 수정사항:
//   1. guessCompany() 추가 → 상품명에서 보험사명 자동 추출
//   2. 담보 매핑 대폭 확장 (로봇암수술, 표적항암, 5대골절, 깁스, 혈전용해제 등)
//   3. AI 분석 버튼 UI 개선 + 로딩 애니메이션 추가
// ================================================

(function () {

// ─── 담보 정의 (엑셀 순서 일치) ───
const COVERAGE_DEF = [
  { cat: '실비',  key: 'inpatient',       label: '입원 의료비' },
  { cat: null,    key: 'outpatient',      label: '통원 의료비' },
  { cat: '배상',  key: 'liability',       label: '일상생활 배상책임' },
  { cat: '수술',  key: 'disease_surg',    label: '질병 수술비' },
  { cat: null,    key: 'injury_surg',     label: '상해 / 재해 수술비' },
  { cat: null,    key: 'brain_heart_surg',label: '뇌 / 심장 수술비' },
  { cat: null,    key: 'type_surg',       label: '1 ~ 5 종수술' },
  { cat: '암',    key: 'cancer_diag',     label: '일반암 진단비' },
  { cat: null,    key: 'minor_cancer',    label: '유사암 진단비' },
  { cat: null,    key: 'robot_surg',      label: '로봇암 수술비' },
  { cat: null,    key: 'chemo_rad',       label: '항암방사선약물 치료비' },
  { cat: null,    key: 'targeted',        label: '표적항암약물 치료비' },
  { cat: null,    key: 'cancer_main',     label: '암 주요 치료비' },
  { cat: '뇌',    key: 'cerebro',         label: '뇌혈관질환 진단비' },
  { cat: null,    key: 'stroke',          label: 'ㄴ뇌졸증 진단비' },
  { cat: null,    key: 'cerebro_hem',     label: 'ㄴ뇌출혈 진단비' },
  { cat: null,    key: 'thrombo',         label: '혈전용해제' },
  { cat: '심장',  key: 'ischemic',        label: '허혈성심장질환 진단비' },
  { cat: null,    key: 'arrhythmia',      label: 'ㄴ부정맥 진단비' },
  { cat: null,    key: 'ami',             label: 'ㄴ급성심근경색 진단비' },
  { cat: '입원',  key: 'injury_hosp',     label: '상해 / 재해 입원일당' },
  { cat: null,    key: 'disease_hosp',    label: '질병 입원일당' },
  { cat: null,    key: 'general_hosp',    label: '일반 입원일당' },
  { cat: null,    key: 'er_visit',        label: '응급실 내원 진료비' },
  { cat: '골절',  key: 'fracture',        label: '골절 진단비' },
  { cat: null,    key: 'five_fracture',   label: '5대골절 진단비' },
  { cat: null,    key: 'cast',            label: '깁스 치료비' },
  { cat: '사망',  key: 'death_general',   label: '일반사망' },
  { cat: null,    key: 'death_disease',   label: '질병사망' },
  { cat: null,    key: 'death_cancer',    label: '암 사망' },
  { cat: null,    key: 'death_injury',    label: '상해사망 / 재해사망' },
  { cat: '운전자',key: 'car_injury',      label: '자동차 부상치료비(1급~14급)' },
  { cat: null,    key: 'car_fine',        label: '벌금(대인)' },
  { cat: null,    key: 'car_lawyer',      label: '변호사 선임비용' },
  { cat: null,    key: 'car_settlement',  label: '사고처리 지원금(형사합의금)' },
];

// 카테고리별 rowspan 계산
const CAT_SPANS = {};
let lastCat = null;
let lastIdx = 0;
COVERAGE_DEF.forEach((cov, idx) => {
  if (cov.cat !== null) {
    if (lastCat !== null) CAT_SPANS[lastCat] = { rowspan: idx - lastIdx, startIdx: lastIdx };
    lastCat = cov.cat;
    lastIdx = idx;
  }
});
if (lastCat !== null) CAT_SPANS[lastCat] = { rowspan: COVERAGE_DEF.length - lastIdx, startIdx: lastIdx };


// ─── 상품명 → 보험사명 변환 (신규 추가) ───
function guessCompany(product) {
  const p = product.toLowerCase();
  const rules = [
    ['삼성화재',       ['삼성화재', '삼성생명']],
    ['현대해상',       ['현대해상', '굿앤굿', 'hi2412', 'hi2411']],
    ['DB손해보험',     ['db', '디비손']],
    ['KB손해보험',     ['kb', '케이비']],
    ['메리츠화재',     ['메리츠']],
    ['한화생명',       ['한화생명']],
    ['한화손해보험',   ['한화손해']],
    ['흥국화재',       ['흥국', '흥good', 'the편한']],
    ['NH농협생명',     ['nh농협', '농협생명', '건강플러스nh']],
    ['NH농협손해보험', ['농협손']],
    ['ABL생명',        ['abl', '에이비엘']],
    ['AIA생명',        ['aia']],
    ['처브라이프',     ['chubb', '처브']],
    ['KDB생명',        ['kdb', '버팀목new', '버팀목']],
    ['하나생명',       ['하나생명', '하나로누리']],
    ['동양생명',       ['동양생명']],
    ['라이나생명',     ['라이나', 'the건강한치아', '건강한치아']],
    ['에이스손보',     ['더핏', '더퍼스트']],
    ['우정사업본부',   ['에버리치', '우정사업']],
    ['신한라이프',     ['신한 이지로운', '신한라이프', '신한생명', '이지로운']],
    ['BNP파리바카디프',['bnp', '카디프']],
  ];
  for (const [name, keywords] of rules) {
    for (const kw of keywords) {
      if (p.includes(kw.toLowerCase())) return name;
    }
  }
  return null;
}


// ─── 담보 레이블 → coverage key 매핑 (확장판) ───
const RAW_COV_MAP = {
  // 실비
  '질병입원': 'inpatient', '상해입원': 'inpatient',
  '상해+질병 입원의료비': 'inpatient', '입원의료비': 'inpatient',
  '질병통원': 'outpatient', '상해통원': 'outpatient',
  '질병 외래의료비': 'outpatient', '질병 처방조제료': 'outpatient',
  '상해 외래의료비': 'outpatient', '상해 처방조제료': 'outpatient',
  '재해통원급부금': 'outpatient',

  // 배상
  '일상생활 배상책임': 'liability', '일상생활배상책임': 'liability',
  '가족생활 배상책임': 'liability',

  // 수술
  '질병수술비': 'disease_surg', '질병수술급여금': 'disease_surg',
  '상해수술비': 'injury_surg', '재해수술급부금': 'injury_surg',
  '상해재해수술비': 'injury_surg',
  '뇌혈관수술비': 'brain_heart_surg', '허혈심장질환수술비': 'brain_heart_surg',
  '뇌출혈및급성심근경색수술비': 'brain_heart_surg',
  '뇌혈관질환 수술': 'brain_heart_surg', '허혈성심장질환 수술': 'brain_heart_surg',
  '질병종수술': 'type_surg', '상해종수술': 'type_surg',
  '상해1~5종수술비': 'type_surg', '상해1~5종수술비ⅱ': 'type_surg',

  // 암
  '일반암진단비': 'cancer_diag', '일반암 진단비': 'cancer_diag',
  '암진단금': 'cancer_diag',
  '암진단ⅱ(유사암제외)(갱신형)담보': 'cancer_diag',
  '일반암진단(소액암 제외)': 'cancer_diag',
  '일반암진단iii(특정소액암 및 대장점막내암 제외)': 'cancer_diag',
  '유사암진단비': 'minor_cancer', '유사암 진단비': 'minor_cancer',
  '유사암진단ⅱ(양성뇌종양포함)(갱신형)담보': 'minor_cancer',
  '갑상샘암진단': 'minor_cancer', '경계성종양진단': 'minor_cancer',
  '기타피부암진단': 'minor_cancer', '제자리암(상피내암)진단': 'minor_cancer',
  '소액암진단': 'minor_cancer',

  // 로봇암 수술
  '로봇암수술': 'robot_surg', '다빈치로봇암수술': 'robot_surg',
  '다빈치레보아이로봇 암수술(수술1회당)_암(특정암제외)': 'robot_surg',
  '일반암수술': 'robot_surg',
  '암 관혈수술': 'robot_surg', '암내시경수술보장': 'robot_surg',
  '암수술(복강경하, 흉강경하)보장': 'robot_surg',
  '암수술(갱신형)담보': 'robot_surg',

  // 항암방사선
  '항암방사선약물치료비': 'chemo_rad', '항암방사선치료': 'chemo_rad',
  '항암방사선': 'chemo_rad',
  '항암세기조절방사선치료': 'chemo_rad', '항암양성자방사선치료': 'chemo_rad',
  '항암중입자방사선치료': 'chemo_rad', '항암중입자치료비': 'chemo_rad',
  '중입자방사선치료비': 'chemo_rad',
  '항암방사선(세기조절)치료(갱신형)담보': 'chemo_rad',
  '항암방사선(양성자)치료(갱신형)담보': 'chemo_rad',

  // 표적항암
  '표적항암약물치료비': 'targeted', '고액항암 치료비(표적)': 'targeted',
  '고액항암치료비(표적)': 'targeted',
  '표적항암약물허가치료(갱신형)담보': 'targeted',
  '카티(car-t)항암약물허가치료(연간1회한)(갱신형)담보': 'targeted',

  // 암 주요 치료비
  '암 주요치료비': 'cancer_main', '암주요치료비': 'cancer_main',

  // 뇌혈관
  '뇌혈관질환 진단비': 'cerebro', '뇌혈관진단비': 'cerebro', '뇌혈관 진단비': 'cerebro',
  '뇌혈관질환(ⅰ)진단(갱신형)담보': 'cerebro', '뇌혈관질환 진단': 'cerebro',
  '뇌졸중진단비': 'stroke', '뇌졸중 진단비': 'stroke',
  '뇌혈관질환(ⅱ)진단(갱신형)담보': 'stroke',
  '뇌출혈진단비': 'cerebro_hem', '뇌출혈 진단비': 'cerebro_hem', '뇌출혈진단': 'cerebro_hem',

  // 혈전용해제
  '혈전용해제': 'thrombo', '혈전용해치료비': 'thrombo',
  '혈전용해치료비ⅲ(최초1회한)(특정순환계질환ⅰ)(갱신형)담보': 'thrombo',
  '2대질환 주요치료비': 'thrombo',

  // 심장
  '허혈성심장질환 진단비': 'ischemic', '허혈성심장질환진단비': 'ischemic',
  '허혈성심장질환 진단': 'ischemic', '허혈성심장질환진단': 'ischemic',
  '심혈관질환(특정ⅰ,i49제외)진단(갱신형)담보': 'ischemic',
  '허혈성심장질환진단비(최초1회한)': 'ischemic',
  '부정맥진단비': 'arrhythmia', '부정맥 진단비': 'arrhythmia',
  '심혈관질환(i49)진단(갱신형)담보': 'arrhythmia',
  '급성심근경색증진단비': 'ami', '급성심근경색증 진단비': 'ami',
  '급성심근경색진단비': 'ami', '급성심근경색증진단': 'ami',
  '심혈관질환(특정2대)진단(갱신형)담보': 'ami',
  '심혈관질환(특정ⅱ)진단(갱신형)담보': 'ami',

  // 입원일당
  '상해일당': 'injury_hosp', '상해재해입원일당': 'injury_hosp',
  '[갱신형]상해입원일당(1일이상)': 'injury_hosp',
  '재해입원': 'injury_hosp',
  '질병일당': 'disease_hosp',
  '[갱신형]질병입원일당(1일이상)': 'disease_hosp',
  '질병입원일당(4-180)': 'disease_hosp',
  '1인실 입원일당': 'general_hosp', '1인실입원일당': 'general_hosp',
  '[통합간편]상급종합병원 1인실 입원일당(1일이상, 30일한도)': 'general_hosp',
  '[통합간편]종합병원 1인실 입원일당(1일이상, 30일한도)': 'general_hosp',

  // 골절
  '골절 진단비': 'fracture', '골절진단비': 'fracture', '골절치료자금': 'fracture',
  '골절진단비(치아파절제외)': 'fracture',
  '5대골절 진단비': 'five_fracture', '5대골절진단비': 'five_fracture',
  '깁스치료비': 'cast', '깁스 치료비': 'cast',

  // 사망
  '일반사망': 'death_general', '일반사망보험_신정원': 'death_general',
  '질병사망': 'death_disease', '유병자질병사망': 'death_disease',
  '암사망': 'death_cancer', '암 사망': 'death_cancer',
  '상해사망': 'death_injury', '재해사망': 'death_injury',
  '상해재해사망': 'death_injury', '재해사망보험금_신정원': 'death_injury',
  '유병자상해사망': 'death_injury', '평일일반재해사망보험금': 'death_injury',
  '[통합간편]상해 사망': 'death_injury',
  '기본계약(상해사망후유장해(갱신형))담보': 'death_injury',
  '일반상해사망': 'death_injury',
  '상해사망후유장해': 'death_injury',

  // 운전자
  '자동차 부상치료비': 'car_injury', '자동차사고 부상치료비': 'car_injury',
  '자동차사고부상치료비': 'car_injury',
  '자동차사고부상치료비ⅸ(운전자)': 'car_injury',
  '[갱신형]자동차사고부상치료지원금(운전자용)': 'car_injury',
  '벌금': 'car_fine', '벌금(대인)': 'car_fine',
  '변호사 선임비용': 'car_lawyer', '변호사선임비용': 'car_lawyer',
  '자동차사고변호사선임비용': 'car_lawyer',
  '교통사고 변호사선임비용(추가보장)': 'car_lawyer',
  '교통사고처리 지원금': 'car_settlement', '교통사고처리지원금': 'car_settlement',
  '사고처리지원금': 'car_settlement', '교통사고 처리지원금': 'car_settlement',
};

// 정규화 함수: 소문자 + 특수문자 제거
function normLabel(s) {
  return s.toLowerCase().replace(/[\s\(\)\[\]·,\/]/g, '');
}

// 정규화된 매핑 빌드
const NORM_COV_MAP = {};
for (const [k, v] of Object.entries(RAW_COV_MAP)) {
  NORM_COV_MAP[normLabel(k)] = v;
}

function findCovKey(label) {
  const n = normLabel(label);
  if (NORM_COV_MAP[n]) return NORM_COV_MAP[n];
  // 부분 매칭
  for (const [k, v] of Object.entries(NORM_COV_MAP)) {
    if (n === k || n.startsWith(k) || k.startsWith(n)) return v;
  }
  return null;
}


// ─── 한글 금액 파싱 ───
function parseManwon(str) {
  if (!str) return 0;
  str = str.replace(/[,\s]/g, '');
  let total = 0;
  const eokMatch = str.match(/(\d+)억/);
  if (eokMatch) total += parseInt(eokMatch[1], 10) * 10000;
  const manMatch = str.match(/(\d+)만/);
  if (manMatch) total += parseInt(manMatch[1], 10);
  if (!eokMatch && !manMatch) {
    const n = str.match(/(\d+)/);
    if (n) total += parseInt(n[1], 10);
  }
  return total;
}


// ─── 텍스트 붙여넣기 파서 ───
function parsePastedText(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const STATUS_WORDS = new Set(['충분', '부족', '미가입']);

  // 섹션 헤더 (카테고리 제목) — 건너뜀
  const SECTION_HEADERS = new Set([
    '사망', '암', '뇌혈관질환', '심장질환', '실손의료비', '수술비',
    '입원비(일당)', '치료비', '운전자', '법률,배상책임', '치아,화상,골절',
    '골절', '배상', '수술', '입원', '뇌', '심장', '치매', '후유장해',
  ]);

  const compMap = {};
  let currentCovKey = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 섹션 헤더 건너뜀
    if (SECTION_HEADERS.has(line) || SECTION_HEADERS.has(line.replace(/\s/g, ''))) {
      i++; continue;
    }

    // 담보명 줄: 다음 줄이 충분/부족/미가입
    if (i + 1 < lines.length && STATUS_WORDS.has(lines[i + 1])) {
      currentCovKey = findCovKey(line);
      i += 2;
      // 부족금액/권장금액/가입금액 라인 건너뜀
      while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('부족금액') || l.startsWith('권장금액') || l.startsWith('가입금액') || l === '미가입') {
          i++;
          if (i < lines.length && /원$/.test(lines[i])) i++;
        } else { break; }
      }
      continue;
    }

    // 상품명 + 세부담보 + 금액 3줄 묶음
    if (currentCovKey && i + 2 < lines.length && /원$/.test(lines[i + 2])) {
      const productFull = lines[i];
      const amountStr   = lines[i + 2];
      const manwon = parseManwon(amountStr);

      if (manwon > 0) {
        const companyName = guessCompany(productFull) || productFull;
        if (!compMap[companyName]) {
          compMap[companyName] = {
            name: companyName, product: productFull,
            premium: 0, start_date: '', end_date: '', coverages: {}
          };
        }
        const c = compMap[companyName];
        c.coverages[currentCovKey] = (c.coverages[currentCovKey] || 0) + manwon;
      }
      i += 3; continue;
    }

    i++;
  }

  return { companies: Object.values(compMap), customer_name: '' };
}

window.rptParsePastedText = parsePastedText;


// ─── Claude Vision 프롬프트 (AI 기능용, 그대로 유지) ───
function buildPrompt() {
  return `당신은 한국 보험 보장분석 제안서 전문 데이터 추출 AI입니다.
이 이미지는 한국 보험사 보장분석 제안서의 페이지입니다.

**추출 규칙:**
1. 이 페이지에서 보험사(회사명)별 계약 정보를 찾으세요.
2. 각 보험사의: 회사명, 상품명, 보장시기(가입일), 보장기간(만기일), 월보험료를 추출하세요.
3. 아래 담보 항목들의 가입금액을 추출하세요 (없으면 0, 단위: 만원):
   입원의료비(실손입원), 통원의료비(실손통원), 일상생활배상책임,
   질병수술비, 상해재해수술비, 뇌심장수술비, 1~5종수술,
   일반암진단비, 유사암진단비, 로봇암수술비, 항암방사선약물치료비, 표적항암약물치료비, 암주요치료비,
   뇌혈관질환진단비, 뇌졸중진단비, 뇌출혈진단비, 혈전용해제치료비,
   허혈성심장질환진단비, 부정맥진단비, 급성심근경색진단비,
   상해재해입원일당, 질병입원일당, 일반입원일당, 응급실내원진료비,
   골절진단비, 5대골절진단비, 깁스치료비,
   일반사망, 질병사망, 암사망, 상해재해사망,
   자동차부상치료비, 벌금대인, 변호사선임비용, 사고처리지원금

반드시 다음 JSON 형식으로만 응답하세요:
{
  "companies": [
    {
      "name": "보험사명",
      "product": "상품명(20자 이내)",
      "start_date": "YYYY.MM.DD",
      "end_date": "YYYY.MM.DD",
      "premium": 숫자(원단위),
      "coverages": {
        "inpatient": 0, "outpatient": 0, "liability": 0,
        "disease_surg": 0, "injury_surg": 0, "brain_heart_surg": 0, "type_surg": 0,
        "cancer_diag": 0, "minor_cancer": 0, "robot_surg": 0, "chemo_rad": 0, "targeted": 0, "cancer_main": 0,
        "cerebro": 0, "stroke": 0, "cerebro_hem": 0, "thrombo": 0,
        "ischemic": 0, "arrhythmia": 0, "ami": 0,
        "injury_hosp": 0, "disease_hosp": 0, "general_hosp": 0, "er_visit": 0,
        "fracture": 0, "five_fracture": 0, "cast": 0,
        "death_general": 0, "death_disease": 0, "death_cancer": 0, "death_injury": 0,
        "car_injury": 0, "car_fine": 0, "car_lawyer": 0, "car_settlement": 0
      }
    }
  ],
  "customer_name": "고객명"
}`;
}


// ─── 전역 상태 ───
let rptState = {
  pdfFile: null,
  pdfDoc: null,
  companies: [],
  customerName: '',
  analyzing: false,
};


// ─── HTML 삽입 ───
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

  <!-- STEP 1: PDF 업로드 -->
  <div class="rpt-card">
    <div class="rpt-step-label">STEP 1</div>
    <h3 class="rpt-step-title">보장분석 제안서 PDF 업로드</h3>
    <p class="rpt-step-desc">메리츠화재 보장분석 제안서 PDF를 업로드하면 AI가 자동으로 내용을 인식합니다.</p>
    <label id="rpt-drop-zone" for="rpt-pdf-input" class="rpt-drop-zone"
      ondragover="event.preventDefault()" ondrop="window.rptHandleDrop(event)">
      <i class="bi bi-cloud-upload-fill" style="font-size:36px; color:#3182F6; margin-bottom:8px; display:block;"></i>
      <div style="font-weight:600; color:#334155; margin-bottom:4px;">PDF 파일을 여기에 드래그하거나 클릭하여 선택</div>
      <div style="font-size:12px; color:#94A3B8;">보장분석 제안서 PDF만 지원됩니다</div>
      <input type="file" id="rpt-pdf-input" accept=".pdf" style="display:none;" onchange="window.rptHandleFile(event)">
    </label>
    <div id="rpt-file-info" style="display:none; margin-top:12px; padding:10px 14px;
      background:#F0F7FF; border-radius:8px; border:1px solid #BAD7FB; font-size:13px;
      color:#1E40AF; align-items:center; gap:8px;">
      <i class="bi bi-file-earmark-pdf-fill" style="font-size:18px;"></i>
      <span id="rpt-file-name"></span>
      <span id="rpt-page-count" style="color:#64748B; margin-left:4px;"></span>
    </div>
  </div>

  <!-- STEP 1-B: 텍스트 붙여넣기 (UI 개선) -->
  <div class="rpt-card">
    <div class="rpt-step-label">STEP 1-B</div>
    <h3 class="rpt-step-title">텍스트 붙여넣기로 분석</h3>
    <p class="rpt-step-desc">보장분석 제안서에서 복사한 텍스트를 그대로 붙여넣으면 즉시 보험사별로 정리합니다.</p>
    <textarea id="rpt-paste-text" class="form-control" placeholder="여기에 보장분석 제안서 텍스트를 붙여넣으세요"
      style="width:100%; height:160px; font-size:12px; line-height:1.5; resize:vertical;
             background:#F8FAFC; padding:10px; border:1px solid #E2E8F0; border-radius:8px;"></textarea>

    <div style="margin-top:10px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <label style="font-size:13px; color:#475569; display:flex; align-items:center; gap:6px;">
        고객명
        <input type="text" id="rpt-paste-customer-name" placeholder="고객"
          style="margin-left:4px; padding:7px 11px; border:1px solid #E2E8F0;
                 border-radius:6px; font-size:13px; width:100px;">
      </label>

      <!-- ★ 개선된 AI 분석 버튼 -->
      <button id="rpt-text-btn" class="rpt-ai-btn" onclick="window.rptStartTextAnalysis()">
        <span class="rpt-ai-btn-shine"></span>
        <i class="bi bi-robot"></i>
        텍스트 AI 분석
      </button>
    </div>

    <!-- 로딩 영역 -->
    <div id="rpt-text-loading" style="display:none; margin-top:16px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748B; margin-bottom:6px;">
        <span id="rpt-text-loading-msg">분석 중...</span>
        <span id="rpt-text-loading-pct">0%</span>
      </div>
      <div style="height:6px; background:#E5E8EB; border-radius:99px; overflow:hidden;">
        <div id="rpt-text-loading-bar"
          style="height:100%; width:0%; background:linear-gradient(90deg,#001E42,#3182F6);
                 border-radius:99px; transition:width 0.12s linear;"></div>
      </div>
      <div id="rpt-text-loading-step" style="font-size:11px; color:#94A3B8; margin-top:5px;"></div>
    </div>
  </div>

  <!-- STEP 2: AI 분석 (PDF) -->
  <div id="rpt-step2" class="rpt-card" style="display:none;">
    <div class="rpt-step-label">STEP 2</div>
    <h3 class="rpt-step-title">AI 보장 데이터 추출</h3>
    <p class="rpt-step-desc">Claude AI가 PDF에서 보험사별 보장 항목과 가입금액을 자동으로 인식합니다.</p>
    <div style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748B; margin-bottom:6px;">
        <span id="rpt-progress-text">분석 준비 중...</span>
        <span id="rpt-progress-pct">0%</span>
      </div>
      <div style="height:8px; background:#E5E8EB; border-radius:99px; overflow:hidden;">
        <div id="rpt-progress-bar" style="height:100%; width:0%;
          background:linear-gradient(90deg,#3182F6,#60A5FA); border-radius:99px; transition:width 0.4s;"></div>
      </div>
      <div id="rpt-page-status" style="font-size:11px; color:#94A3B8; margin-top:4px;"></div>
    </div>
    <button id="rpt-analyze-btn" class="rpt-ai-btn" onclick="window.rptStartAnalysis()">
      <span class="rpt-ai-btn-shine"></span>
      <i class="bi bi-cpu-fill"></i> AI 분석 시작
    </button>
  </div>

  <!-- STEP 3: 결과 -->
  <div id="rpt-step3" class="rpt-card" style="display:none;">
    <div class="rpt-step-label">STEP 3</div>
    <h3 class="rpt-step-title">보장분석표 미리보기 & 다운로드</h3>
    <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="btn-action" style="width:auto; padding:10px 20px;" onclick="window.rptDownloadExcel()">
        <i class="bi bi-file-earmark-excel-fill"></i> 엑셀 다운로드
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
/* ── 카드 & 스텝 ── */
.rpt-card {
  background:#fff; border:1px solid #E2E8F0; border-radius:14px;
  padding:20px 22px; margin-bottom:16px;
}
.rpt-step-label {
  display:inline-block; font-size:11px; font-weight:700; color:#3182F6;
  background:#EFF6FF; padding:2px 8px; border-radius:99px;
  margin-bottom:8px; letter-spacing:0.5px;
}
.rpt-step-title { font-size:16px; font-weight:700; color:#0F172A; margin:0 0 6px 0; }
.rpt-step-desc  { font-size:13px; color:#64748B; margin:0 0 14px 0; }

/* ── 드롭존 ── */
.rpt-drop-zone {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  border:2px dashed #BAD7FB; border-radius:12px; padding:30px 20px;
  cursor:pointer; background:#F8FBFF; transition:all 0.2s; text-align:center;
}
.rpt-drop-zone:hover { border-color:#3182F6; background:#EFF6FF; }

/* ── AI 분석 버튼 ── */
.rpt-ai-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 24px; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  border: none; color: #fff;
  background: #001E42;
  position: relative; overflow: hidden;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  letter-spacing: 0.2px;
}
.rpt-ai-btn:hover {
  background: #002a5c;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,30,66,0.22);
}
.rpt-ai-btn:active { transform: translateY(0); box-shadow: none; }
.rpt-ai-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.rpt-ai-btn i { font-size: 17px; }

/* 광택 애니메이션 */
.rpt-ai-btn-shine {
  position: absolute; top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent);
  animation: rpt-shine 2.6s ease-in-out infinite;
}
@keyframes rpt-shine {
  0%   { left: -100%; }
  55%  { left: 130%; }
  100% { left: 130%; }
}

/* ── 미리보기 테이블 ── */
#rpt-preview-table table { border-collapse:collapse; font-size:11px;
  font-family:'Noto Sans KR',sans-serif; min-width:700px; }
#rpt-preview-table th,
#rpt-preview-table td { border:1px solid #C5CBD3; padding:5px 7px;
  white-space:nowrap; text-align:center; }
#rpt-preview-table .r-cat   { background:#001E42; color:#fff; font-weight:700; }
#rpt-preview-table .r-item  { background:#D6DEE7; font-weight:600; text-align:left; min-width:130px; }
#rpt-preview-table .r-sum   { background:#D6DEE7; font-weight:700; color:#001E42; }
#rpt-preview-table .r-hdr   { background:#D6DEE7; font-weight:700; font-size:10px; }
#rpt-preview-table .r-ins   { background:#D6DEE7; font-weight:700; font-size:10px; color:#C00000; }
#rpt-preview-table .r-date  { background:#fff; font-size:10px; }
#rpt-preview-table .r-fee   { background:#D7DDE4; font-weight:700; color:#001E42; }
#rpt-preview-table .r-val   { color:#1E40AF; min-width:75px; }
#rpt-preview-table .r-title td {
  background:#fff; font-size:14px; font-weight:700;
  text-align:left; padding:10px 12px; border-bottom:2px solid #001E42;
}
#rpt-preview-table .r-foot td {
  background:#F8FAFC; font-size:10px; color:#64748B; text-align:left; padding:6px 10px;
}
`;
  document.head.appendChild(style);
}


// ─── 파일 업로드 ───
window.rptHandleDrop = function (e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') window.rptLoadPDF(file);
};

window.rptHandleFile = function (e) {
  const file = e.target.files[0];
  if (file) window.rptLoadPDF(file);
};

window.rptLoadPDF = async function (file) {
  rptState.pdfFile = file;
  rptHideError();
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  try {
    const ab = await file.arrayBuffer();
    rptState.pdfDoc = await window.pdfjsLib.getDocument({ data: ab }).promise;
    const pageCount = rptState.pdfDoc.numPages;
    const fi = document.getElementById('rpt-file-info');
    fi.style.display = 'flex';
    document.getElementById('rpt-file-name').textContent = file.name;
    document.getElementById('rpt-page-count').textContent = `(${pageCount}페이지)`;
    document.getElementById('rpt-step2').style.display = 'block';
  } catch (err) {
    rptShowError('PDF 로드 실패: ' + err.message);
  }
};


// ─── 텍스트 분석 (로딩 연출 포함) ───
window.rptStartTextAnalysis = function () {
  rptHideError();
  const raw = document.getElementById('rpt-paste-text').value.trim();
  if (!raw) { rptShowError('붙여넣은 텍스트가 없습니다.'); return; }

  const btn = document.getElementById('rpt-text-btn');
  btn.disabled = true;

  // 로딩 UI 시작
  const lo    = document.getElementById('rpt-text-loading');
  const bar   = document.getElementById('rpt-text-loading-bar');
  const msgEl = document.getElementById('rpt-text-loading-msg');
  const pctEl = document.getElementById('rpt-text-loading-pct');
  const stepEl= document.getElementById('rpt-text-loading-step');
  lo.style.display = 'block';

  const steps = [
    [15,  '텍스트 파싱 중...',   '줄 단위로 구조 분석'],
    [40,  '보험사 분류 중...',   '20개 보험사 패턴 매칭'],
    [65,  '담보 항목 매핑 중...','35개 담보 키워드 매핑'],
    [85,  '보장 데이터 정리...',  '보험사별 합산 계산'],
    [100, '완료!',               ''],
  ];

  let step = 0;
  const iv = setInterval(() => {
    if (step >= steps.length) { clearInterval(iv); return; }
    const [pct, msg, sub] = steps[step];
    bar.style.width = pct + '%';
    pctEl.textContent = pct + '%';
    msgEl.textContent = msg;
    stepEl.textContent = sub;
    step++;
  }, 180);

  setTimeout(() => {
    clearInterval(iv);
    bar.style.width = '100%';
    pctEl.textContent = '100%';

    const result = parsePastedText(raw);
    lo.style.display = 'none';
    btn.disabled = false;

    if (!result.companies || result.companies.length === 0) {
      rptShowError('텍스트에서 보장 정보를 찾을 수 없습니다. 형식을 확인해주세요.');
      return;
    }

    rptState.companies = result.companies;
    const nameInput = document.getElementById('rpt-paste-customer-name').value.trim();
    rptState.customerName = nameInput || result.customer_name || '고객';

    document.getElementById('rpt-step3').style.display = 'block';
    renderPreview();
    document.getElementById('rpt-step3').scrollIntoView({ behavior: 'smooth' });
  }, 1100);
};


// ─── AI 분석 (PDF용) ───
window.rptStartAnalysis = async function () {
  if (rptState.analyzing || !rptState.pdfDoc) return;
  rptState.analyzing = true;
  rptState.companies = [];
  rptState.customerName = '';
  rptHideError();

  const btn = document.getElementById('rpt-analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 분석 중...';

  const total = Math.min(rptState.pdfDoc.numPages, 10);
  try {
    for (let pn = 1; pn <= total; pn++) {
      const pct = Math.round((pn / total) * 100);
      setProgress(pct, `${pn}/${total} 페이지 분석 중...`, 'Claude AI가 보험사 계약 정보를 인식하고 있습니다');
      const imgB64 = await pageToBase64(pn);
      const result = await callClaude(imgB64);
      if (result && result.companies && result.companies.length > 0) {
        rptState.companies.push(...result.companies);
        if (result.customer_name && !rptState.customerName) rptState.customerName = result.customer_name;
      }
    }
    setProgress(100, `분석 완료! ${rptState.companies.length}개 보험사 인식됨`, '');
    const seen = new Set();
    rptState.companies = rptState.companies.filter(c => {
      const k = c.name + '|' + c.product;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
    if (rptState.companies.length === 0) {
      rptShowError('보험 계약 정보를 찾을 수 없습니다. 보장분석 제안서 PDF인지 확인해주세요.');
      return;
    }
    document.getElementById('rpt-step3').style.display = 'block';
    renderPreview();
    document.getElementById('rpt-step3').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    rptShowError('분석 오류: ' + err.message);
  } finally {
    rptState.analyzing = false;
    btn.disabled = false;
    btn.innerHTML = '<span class="rpt-ai-btn-shine"></span><i class="bi bi-cpu-fill"></i> AI 분석 시작';
  }
};

function setProgress(pct, text, status) {
  document.getElementById('rpt-progress-bar').style.width = pct + '%';
  document.getElementById('rpt-progress-pct').textContent = pct + '%';
  document.getElementById('rpt-progress-text').textContent = text;
  document.getElementById('rpt-page-status').textContent = status;
}

async function pageToBase64(pn) {
  const page = await rptState.pdfDoc.getPage(pn);
  const vp = page.getViewport({ scale: 1.8 });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
}

async function callClaude(imgB64) {
  const url = '/api/gemini';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt(), imageB64: imgB64 })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (err) { console.error('AI 호출 에러:', err); }
  return null;
}


// ─── 미리보기 렌더링 ───
function renderPreview() {
  const co = rptState.companies;
  const name = rptState.customerName || '고객';
  const N = co.length;

  let html = `<table>`;
  html += `<tr class="r-title"><td colspan="${3 + N}">${name} 님 보장분석표</td></tr>`;

  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach(c => html += `<th class="r-ins">${c.name}</th>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr">상품명</th><th class="r-date"></th>`;
  co.forEach(c => {
    const p = c.product.length > 16 ? c.product.slice(0, 16) + '…' : c.product;
    html += `<td class="r-date" style="font-size:9px;">${p}</td>`;
  });
  html += `</tr>`;

  html += `<tr><th class="r-hdr">가입시기</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date">${c.start_date || ''}</td>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="white-space:normal;line-height:1.3;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date" style="font-size:9px;">${c.end_date || ''}</td>`);
  html += `</tr>`;

  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee">보험료</th>
    <td class="r-sum r-fee">${fmtWon(totalPrem)}</td>`;
  co.forEach(c => html += `<td class="r-fee">${fmtWon(c.premium || 0)}</td>`);
  html += `</tr>`;

  COVERAGE_DEF.forEach(cov => {
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0);
    const sum  = vals.reduce((s, v) => s + v, 0);
    html += `<tr>`;
    if (cov.cat !== null) {
      const span = CAT_SPANS[cov.cat]?.rowspan || 1;
      html += `<td class="r-cat" rowspan="${span}">${cov.cat}</td>`;
    }
    html += `<td class="r-item">${cov.label}</td>`;
    html += `<td class="r-sum">${sum ? fmtMan(sum) : ''}</td>`;
    vals.forEach(v => html += `<td class="r-val">${v ? fmtMan(v) : ''}</td>`);
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
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  }
  const co   = rptState.companies;
  const name = rptState.customerName || '고객';
  const N    = co.length;
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const merges = [];

  const BD = { top:{style:'thin',color:{rgb:'C5CBD3'}}, bottom:{style:'thin',color:{rgb:'C5CBD3'}},
               left:{style:'thin',color:{rgb:'C5CBD3'}}, right:{style:'thin',color:{rgb:'C5CBD3'}} };
  const mkS = (v, s={}) => ({ v, t:'s', s:{ border: BD, ...s } });
  const mkN = (v, s={}) => ({ v: v||0, t:'n', s:{ border: BD, numFmt:'#,##0', ...s } });

  const catFill = { type:'pattern', patternType:'solid', fgColor:{rgb:'001E42'} };
  const hdrFill = { type:'pattern', patternType:'solid', fgColor:{rgb:'D6DEE7'} };
  const feeFill = { type:'pattern', patternType:'solid', fgColor:{rgb:'D7DDE4'} };
  const whtFill = { type:'pattern', patternType:'solid', fgColor:{rgb:'FFFFFF'} };
  const odFill  = { type:'pattern', patternType:'solid', fgColor:{rgb:'F8FAFC'} };

  function cell(r, c, v, s={}) { ws[XLSX.utils.encode_cell({r, c})] = mkS(v, s); }
  function ncell(r, c, v, s={}) { ws[XLSX.utils.encode_cell({r, c})] = mkN(v, s); }
  function merge(r1,c1,r2,c2) { merges.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} }); }

  let r = 0;
  const CAT_S = { fill:catFill, font:{bold:true,color:{rgb:'FFFFFF'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true} };
  const HDR_S = { fill:hdrFill, font:{bold:true}, alignment:{horizontal:'center',wrapText:true} };

  cell(r, 0, `${name} 님 보장분석표`, { font:{bold:true, sz:14}, alignment:{horizontal:'left'} });
  merge(r,0,r,2+N); r++;

  cell(r,0,'주요\n보장', CAT_S); merge(r,0,r+4,0);
  cell(r,1,'보험사', HDR_S);
  cell(r,2,'고객\n보장합산', { fill:hdrFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'center',wrapText:true} });
  merge(r,2,r+3,2);
  co.forEach((c,i) => cell(r, 3+i, c.name, { fill:hdrFill, font:{bold:true,color:{rgb:'C00000'}}, alignment:{horizontal:'center',wrapText:true} }));

  [['상품명', co.map(c=>c.product)], ['가입시기', co.map(c=>c.start_date||'')], ['납입기간/\n만기시점', co.map(c=>c.end_date||'')]].forEach(([h2, vals]) => {
    r++;
    cell(r,1,h2,HDR_S);
    vals.forEach((v,i) => cell(r, 3+i, v, { fill:whtFill, font:{sz:9}, alignment:{horizontal:'center',wrapText:true} }));
  });

  r++;
  const FEE_S = { fill:feeFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'right'} };
  cell(r,0,'',CAT_S);
  cell(r,1,'보험료', { fill:feeFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'center'} });
  ncell(r,2, co.reduce((s,c)=>s+(c.premium||0),0), FEE_S);
  co.forEach((c,i) => ncell(r, 3+i, c.premium||0, FEE_S));

  let catStartRow = -1, catCurr = null;
  COVERAGE_DEF.forEach(cov => {
    r++;
    const df = r % 2 === 0 ? odFill : whtFill;
    if (cov.cat !== null) {
      if (catCurr !== null) merge(catStartRow, 0, r-1, 0);
      catCurr = cov.cat; catStartRow = r;
      cell(r, 0, cov.cat, CAT_S);
    }
    cell(r, 1, cov.label, { fill:hdrFill, alignment:{horizontal:'left'} });
    const vals = co.map(c => (c.coverages||{})[cov.key]||0);
    const sum  = vals.reduce((s,v)=>s+v,0);
    ncell(r,2, sum, { fill:hdrFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'right'} });
    vals.forEach((v,i) => ncell(r, 3+i, v, { fill:df, alignment:{horizontal:'right'} }));
  });
  if (catCurr !== null) merge(catStartRow, 0, r, 0);

  r++;
  cell(r, 0, '* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.', {
    fill:{ type:'pattern', patternType:'solid', fgColor:{rgb:'F8FAFC'} },
    font:{ sz:9, color:{rgb:'94A3B8'} }, alignment:{horizontal:'left'}
  });
  merge(r,0,r,2+N);

  ws['!ref'] = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r, c:2+N} });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch:5 }, { wch:22 }, { wch:14 }, ...co.map(()=>({ wch:14 }))];
  const rowHeights = [];
  for (let i = 0; i <= r; i++) rowHeights.push({ hpt: i < 7 ? 36 : 24 });
  ws['!rows'] = rowHeights;

  XLSX.utils.book_append_sheet(wb, ws, '보장분석표');
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `${name}_보장분석표_${ds}.xlsx`);
};


// ─── 인쇄 ───
window.rptPrint = function () {
  const content = document.getElementById('rpt-preview-table').innerHTML;
  const win = window.open('', '_blank', 'width=1200,height=800');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>보장분석표</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box} body{font-family:'Noto Sans KR',sans-serif;margin:10px;font-size:10px;}
      table{border-collapse:collapse;width:100%;}
      th,td{border:1px solid #C5CBD3;padding:3px 5px;text-align:center;}
      .r-cat{background:#001E42!important;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-item{background:#D6DEE7!important;font-weight:600;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-sum{background:#D6DEE7!important;font-weight:700;color:#001E42;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-hdr{background:#D6DEE7!important;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-ins{background:#D6DEE7!important;font-weight:700;color:#C00000;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-fee{background:#D7DDE4!important;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .r-title td{font-size:13px;font-weight:700;text-align:left;padding:8px;border-bottom:2px solid #001E42;}
      @page{size:A4 landscape;margin:8mm;}
    </style>
  </head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 600);
};


// ─── 리셋 ───
window.rptReset = function () {
  rptState = { pdfFile:null, pdfDoc:null, companies:[], customerName:'', analyzing:false };
  const fi = document.getElementById('rpt-file-info');
  if (fi) fi.style.display = 'none';
  ['rpt-step2','rpt-step3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const inp = document.getElementById('rpt-pdf-input');
  if (inp) inp.value = '';
  setProgress(0, '분석 준비 중...', '');
  rptHideError();
};


// ─── 유틸 ───
function fmtWon(v) { if (!v) return ''; return v.toLocaleString() + '원'; }
function fmtMan(v) {
  if (!v) return '';
  if (v >= 10000) return (v / 10000) + '억';
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

})();
ENDOFFILE
echo "done"
출력

done
완료
