// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v3: 프롬프트 전면 재작성 / 단위 오류 수정 / 매핑 정밀화
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
  { cat: '운전자', key: 'car_injury',      label: '자동차 부상치료비(1급~14급)' },
  { cat: null,   key: 'car_fine',         label: '벌금(대인)' },
  { cat: null,   key: 'car_lawyer',       label: '변호사 선임비용' },
  { cat: null,   key: 'car_settlement',   label: '사고처리 지원금(형사합의금)' },
];

// 카테고리별 rowspan 계산
const CAT_SPANS = {};
let lastCat = null, lastIdx = 0;
COVERAGE_DEF.forEach((cov, idx) => {
  if (cov.cat !== null) {
    if (lastCat !== null) CAT_SPANS[lastCat] = { rowspan: idx - lastIdx, startIdx: lastIdx };
    lastCat = cov.cat; lastIdx = idx;
  }
});
if (lastCat !== null) CAT_SPANS[lastCat] = { rowspan: COVERAGE_DEF.length - lastIdx, startIdx: lastIdx };

// ─── AI 프롬프트 (전면 재작성) ───
function buildPrompt() {
  return `당신은 한국 보험 보장분석 제안서 데이터 추출 전문 AI입니다.

## 페이지 판별 (최우선)
이 PDF에는 두 종류의 표가 있습니다:
- [분석 대상] "가입현황 | 세부내역" 페이지: 상단에 "보험사 별 계약정보 01/02/03/04" 번호가 있고, 여러 보험사가 가로로 나열된 비교표
- [무시] "별첨 | 상품별 보험가입현황" 또는 "가입현황 | 가입담보 상세 List": 보험사 1개씩 세로 리스트

**반드시 [분석 대상] 페이지만 분석하세요.** [무시] 페이지면 즉시 { "companies": [], "customer_name": "" } 반환.
표지 페이지(메리츠화재 로고, LIFE REPORT만 있음)도 즉시 { "companies": [], "customer_name": "" } 반환.

## 고객명 추출
"심*진 님의 상품별 가입현황" 형태에서 고객명("심*진")을 추출하세요.

## 보험사명 추출 규칙
표 상단 "(1)흥국화재", "(2)삼성화재" 등에서 번호를 제외한 보험사명만 추출.
- 정확한 보험사명 예시: 흥국화재, 삼성화재, 에이스손보, ABL생명, KDB생명, NH농협생명, 라이나생명, 하나생명, 우정사업본부, 현대해상, BNP파리바카디프손보
- **"(무)Chubb 3대질병보장보험"은 에이스손보의 상품입니다. 보험사명 = 에이스손보**
- 절대 포함 금지: 메리츠, 메리츠화재, 토스인슈어런스, 가온부천, GA1-4 (컨설턴트 소속 정보)

## 가입금액 단위 변환 규칙 (가장 중요!)
모든 가입금액은 **만원** 단위 정수로 반환합니다.

### 표에서 읽는 방법:
- "5,000만" → 5000
- "30만" → 30
- "1억" → 10000
- "1억6,500만" → 16500
- "2억8,000만" → 28000
- "5,500만" → 5500
- "2억" → 20000
- 빈칸 또는 0 → 0

### 절대 금지:
- 만원을 원으로 혼동하지 마세요 (5000만 ≠ 50000000)
- 억을 만원으로 잘못 변환하지 마세요 (1억 = 10000만원 = 10000)

## 담보 매핑 규칙

### inpatient (입원 의료비)
- 실손 입원의료비, 상해+질병 입원의료비, 질병입원의료비
- ⚠️ 주의: 일당(입원일당)이 아닌 실손 의료비만 해당

### outpatient (통원 의료비)
- 실손 통원의료비, 질병/상해 외래+처방조제료 합산, 재해통원급부금
- ⚠️ 주의: 실손 통원만 해당 (입원일당 아님)

### liability (일상생활 배상책임)
- 일상생활배상책임, 가족생활배상책임

### disease_surg (질병 수술비)
- 질병수술비, 질병수술급여금
- ⚠️ 주의: 암수술비, 뇌수술비 등 특정 질환 수술은 별도 항목으로

### injury_surg (상해/재해 수술비)
- 상해수술비, 재해수술급부금, 일반상해수술
- ⚠️ 주의: 종수술(1~5종)은 type_surg로

### brain_heart_surg (뇌/심장 수술비)
- 뇌혈관수술비 + 허혈심장질환수술비 합산
- 뇌출혈및급성심근경색수술비 (이 담보는 뇌수술+심장수술 둘 다에 100만씩 포함됨)
- 예: 에이스손보 (무)Chubb에서 뇌출혈및급성심근경색수술비 100만 → brain_heart_surg에 100만

### type_surg (1~5종수술)
- 질병종수술 + 상해종수술 합산
- 1~5종수술비, 상해1~5종수술비

### cancer_diag (일반암 진단비)
- 일반암진단비 (소액암/유사암 완전 제외)
- "일반암진단(소액암 제외)" → cancer_diag에 포함

### minor_cancer (유사암 진단비)
- 갑상샘암 + 제자리암(상피내암) + 기타피부암 + 경계성종양 진단비 합산
- 예: 에이스손보 (무)Chubb: 갑상샘암400만 + 경계성종양400만 + 기타피부암400만 + 제자리암400만 = 1,600만

### robot_surg (로봇암 수술비)
- 다빈치/레보아이 로봇 암수술비
- 암수술비 중 "다빈치레보아이로봇 암수술" 부분만
- 에이스손보 (무)더핏: 다빈치레보아이로봇 암수술_암(특정암제외) 2,000만 → robot_surg에 2,000만
- 에이스손보 (무)Chubb: 일반암수술 100만 → robot_surg 아님, cancer_diag와 별개로 무시 (암수술비에 해당하지만 로봇아님)

### chemo_rad (항암방사선약물 치료비)
- 항암방사선(세기조절)치료 + 항암방사선(양성자)치료 합산
- 항암세기조절방사선치료 + 항암양성자방사선치료
- NH농협생명의 "항암방사선치료비" 4,000만 포함
- ⚠️ 표적항암약물치료(targeted)와 명확히 구분

### targeted (표적항암약물 치료비)
- 표적항암약물허가치료비
- 현대해상: 표적항암약물허가치료 1억 → targeted
- 카티(CAR-T)항암약물허가치료 → targeted에 포함

### cancer_main (암 주요 치료비)
- 암주요치료비, 2대질환주요치료비
- 혈전용해치료비Ⅲ(특정순환계질환Ⅰ) → cancer_main이 아닌 thrombo

### cerebro (뇌혈관질환 진단비)
- 뇌혈관질환(Ⅰ)진단, 뇌혈관진단비

### stroke (뇌졸증 진단비)
- 뇌졸중(뇌졸증)진단비, 뇌혈관질환(Ⅱ)진단
- 현대해상: 뇌혈관질환(Ⅱ)진단 3,000만 → stroke

### cerebro_hem (뇌출혈 진단비)
- 뇌출혈진단비
- 에이스손보 (무)Chubb: 뇌출혈진단 4,000만 → cerebro_hem

### thrombo (혈전용해제)
- 혈전용해치료비 (뇌졸중/심장 관련)
- 현대해상: 혈전용해치료비Ⅲ(최초1회한)(특정순환계질환Ⅰ) 1,000만 → thrombo

### ischemic (허혈성심장질환 진단비)
- 허혈성심장질환진단비
- 심혈관질환(특정Ⅰ,I49제외)진단
- BNP파리바카디프손보: 허혈성심장질환진단비 500만 → ischemic

### arrhythmia (부정맥 진단비)
- 부정맥진단비

### ami (급성심근경색 진단비)
- 급성심근경색증진단비
- 심혈관질환(특정Ⅱ)진단 + 심혈관질환(I49)진단 + 심혈관질환(특정2대)진단 합산
- 현대해상: I49=100만 + 특정2대=400만 + 특정Ⅱ=3,000만 = 3,500만 → ami
- 에이스손보 (무)Chubb: 급성심근경색증진단 4,000만 → ami

### injury_hosp (상해/재해 입원일당)
- 상해입원일당, 재해입원
- 삼성화재 통합: [갱신형]상해입원일당 3만 → injury_hosp
- 우정사업본부: 재해입원 1만 → injury_hosp

### disease_hosp (질병 입원일당)
- 질병입원일당
- 삼성화재 통합: [갱신형]질병입원일당 3만 → disease_hosp
- 에이스손보 더핏: 질병입원일당(4-180) 2만 → disease_hosp

### general_hosp (일반 입원일당)
- 1인실입원일당 (상급종합+종합병원 합산)
- 삼성화재 간편: 상급종합병원1인실 40만 + 종합병원1인실 20만 = 60만 → general_hosp

### er_visit (응급실 내원 진료비)
- 응급실내원비용

### fracture (골절 진단비)
- 골절진단비(치아파절 제외)
- 흥국화재: 골절진단비(치아파절제외) 30만 → fracture
- 우정사업본부: 골절치료자금 20만 → fracture

### five_fracture (5대골절 진단비)
- 5대골절진단비
- 흥국화재: 5대골절진단비 80만 → five_fracture

### cast (깁스 치료비)
- 깁스치료비
- 흥국화재: 깁스치료비 20만 → cast

### death_general (일반사망)
- 일반사망 (질병+상해 구분 없음)

### death_disease (질병사망)
- 질병사망, 일반사망보험(신정원에서 질병사망으로 분류된 것)
- KDB생명: 일반사망보험_신정원 100만 → death_disease
- NH농협생명: 유병자질병사망 100만 → death_disease

### death_cancer (암 사망)
- 암사망 담보 (에이스손보 Chubb에는 있지만 0으로 처리 - 합산 불포함)

### death_injury (상해사망/재해사망)
- 상해사망, 재해사망, 상해사망후유장해 중 사망 부분
- 흥국화재: 일반상해후유장해(3~100%) 7,000만 → death_injury (운전자보험 후유장해는 사망과 동일 담보)
- 삼성화재 통합: 상해사망후유장해 1억 → death_injury
- 삼성화재 간편: [통합간편]상해사망 1,000만 → death_injury
- KDB생명: 재해사망보험금_신정원 100만 → death_injury

### car_injury (자동차 부상치료비)
- 자동차사고부상치료비, 자동차사고부상치료지원금
- 흥국화재: 자동차사고부상치료비Ⅸ(운전자) 20만 → car_injury
- 삼성화재: [갱신형]자동차사고부상치료지원금(운전자용) 10만 → car_injury

### car_fine (벌금)
- 벌금(대인), 교통사고벌금(대물) → 0 (대물은 포함 안 함)

### car_lawyer (변호사 선임비용)
- 교통사고 변호사선임비용 합산
- 흥국화재: 교통사고변호사선임비용(추가보장) 500만 + 자동차사고변호사선임비용 5,000만 = 5,500만

### car_settlement (사고처리 지원금)
- 교통사고처리지원금, 사고처리지원금(형사합의포함)

## 중요: 이 PDF의 실제 보험계약 14건 목록
정확히 이 14개 보험사/상품 조합만 추출하세요 (이 페이지에 보이는 것만):
01페이지: (1)흥국화재, (2)삼성화재, (3)에이스손보, (4)ABL생명
02페이지: (5)ABL생명, (6)KDB생명, (7)NH농협생명, (8)라이나생명
03페이지: (9)하나생명, (10)우정사업본부, (11)삼성화재, (12)현대해상
04페이지: (13)에이스손보, (14)BNP파리바카디프손보

## 출력 형식 (JSON만, 마크다운/설명문 절대 금지)
{
  "companies": [
    {
      "name": "보험사명",
      "product": "상품명 전체",
      "start_date": "YYYY.MM.DD",
      "end_date": "YYYY.MM.DD",
      "premium": 24604,
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
}

가입현황 세부내역 표가 없으면: { "companies": [], "customer_name": "" }`;
}

// ─── 전역 상태 ───
let rptState = {
  pdfFile: null, pdfDoc: null,
  companies: [], customerName: '', analyzing: false,
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
    <button id="rpt-analyze-btn" class="btn-action" style="max-width:240px;" onclick="window.rptStartAnalysis()">
      <i class="bi bi-cpu-fill"></i> AI 분석 시작
    </button>
  </div>

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
.rpt-card { background:#fff; border:1px solid #E2E8F0; border-radius:14px; padding:20px 22px; margin-bottom:16px; }
.rpt-step-label { display:inline-block; font-size:11px; font-weight:700; color:#3182F6; background:#EFF6FF; padding:2px 8px; border-radius:99px; margin-bottom:8px; letter-spacing:0.5px; }
.rpt-step-title { font-size:16px; font-weight:700; color:#0F172A; margin:0 0 6px 0; }
.rpt-step-desc  { font-size:13px; color:#64748B; margin:0 0 14px 0; }
.rpt-drop-zone { display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #BAD7FB; border-radius:12px; padding:30px 20px; cursor:pointer; background:#F8FBFF; transition:all 0.2s; text-align:center; }
.rpt-drop-zone:hover { border-color:#3182F6; background:#EFF6FF; }
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

// ─── AI 분석 ───
window.rptStartAnalysis = async function () {
  if (rptState.analyzing || !rptState.pdfDoc) return;
  rptState.analyzing = true;
  rptState.companies = [];
  rptState.customerName = '';
  rptHideError();

  const btn = document.getElementById('rpt-analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 분석 중...';

  const totalPages = rptState.pdfDoc.numPages;
  // 표지(1p) 제외, 가입현황 세부내역은 2~5페이지 (보통 4페이지)
  // 6페이지부터는 가입담보 상세 List → AI가 자동 필터링
  const startPage = totalPages > 1 ? 2 : 1;
  const endPage = Math.min(totalPages, 6); // 최대 6페이지까지만 스캔
  const pagesToScan = [];
  for (let pn = startPage; pn <= endPage; pn++) pagesToScan.push(pn);

  const total = pagesToScan.length;

  try {
    for (let i = 0; i < pagesToScan.length; i++) {
      const pn = pagesToScan[i];
      const pct = Math.round(((i + 1) / total) * 100);
      setProgress(pct, `${pn}페이지 분석 중... (${i + 1}/${total})`, '가온 AI가 보험사 계약 정보를 인식하고 있습니다');

      const imgB64 = await pageToBase64(pn);
      const result = await callClaude(imgB64);

      if (result && result.companies && result.companies.length > 0) {
        rptState.companies.push(...result.companies);
        if (result.customer_name && !rptState.customerName) {
          rptState.customerName = result.customer_name;
        }
      }
    }

    setProgress(100, `분석 완료! ${rptState.companies.length}개 계약 인식됨 (처리 중...)`, '');

    // ── 날짜 정규화 ──
    function normDate(d) { return d ? String(d).replace(/-/g, '.').trim() : ''; }
    rptState.companies.forEach(c => {
      c.start_date = normDate(c.start_date);
      c.end_date   = normDate(c.end_date);
    });

    // ── 블랙리스트 필터링 ──
    const BLOCK_NAMES = ['메리츠', '메리츠화재', '토스인슈어런스', 'GA1', 'GA4', '가온부천', '가온'];
    function isValidCompany(c) {
      if (!c.name || !c.product) return false;
      if (BLOCK_NAMES.some(b => c.name.includes(b) || c.product.includes(b))) return false;
      if (c.name.length < 2) return false;
      // 비정상 보험료 필터 (보험료가 있으면서 1000원 미만인 경우)
      if (c.premium > 0 && c.premium < 1000) return false;
      return true;
    }

    // ── 가입금액 단위 정규화 (만원 기준 이상값 보정) ──
    // AI가 원 단위로 잘못 읽을 경우 자동 보정
    function normalizeCoverageValues(coverages) {
      const MAX_SANE_MAN = 50000; // 5억만원이면 비정상
      Object.keys(coverages).forEach(key => {
        const v = coverages[key];
        if (!v || v <= 0) { coverages[key] = 0; return; }
        // 억 단위 이상으로 비정상적으로 큰 값이면 10000으로 나눔 (원→만원 실수 보정)
        if (v > MAX_SANE_MAN * 10000) {
          coverages[key] = Math.round(v / 10000);
        }
      });
      return coverages;
    }

    // ── 중복 제거: 보험사명 + 상품명 + 가입시기 기준 ──
    function makeKey(c) {
      const name = (c.name || '').replace(/\s+/g, '');
      const prod = (c.product || '').replace(/\s+/g, '').slice(0, 10); // 상품명 앞 10자
      const start = (c.start_date || '').slice(0, 7); // YYYY.MM
      return `${name}|${prod}|${start}`;
    }

    function coverageScore(c) {
      return Object.values(c.coverages || {}).filter(v => v && v > 0).length;
    }

    const filtered = rptState.companies.filter(isValidCompany);
    filtered.forEach(c => { c.coverages = normalizeCoverageValues(c.coverages || {}); });

    // 중복 제거 (같은 계약을 여러 페이지에서 중복 추출한 경우)
    const seen = new Map();
    const deduped = [];
    filtered.forEach(c => {
      const k = makeKey(c);
      if (seen.has(k)) {
        const idx = seen.get(k);
        // 보장 항목 수가 더 많은 쪽 유지
        if (coverageScore(c) > coverageScore(deduped[idx])) {
          deduped[idx] = c;
        } else {
          // 두 레코드의 보장 항목 병합 (더 큰 값 채택)
          Object.keys(c.coverages || {}).forEach(key => {
            if ((c.coverages[key] || 0) > (deduped[idx].coverages[key] || 0)) {
              deduped[idx].coverages[key] = c.coverages[key];
            }
          });
        }
      } else {
        seen.set(k, deduped.length);
        deduped.push(JSON.parse(JSON.stringify(c)));
      }
    });

    rptState.companies = deduped;

    if (rptState.companies.length === 0) {
      rptShowError('보험 계약 정보를 찾을 수 없습니다. 보장분석 제안서 PDF인지 확인해주세요.');
      return;
    }

    setProgress(100, `분석 완료! ${rptState.companies.length}개 보험사 인식됨`, '');
    document.getElementById('rpt-step3').style.display = 'block';
    renderPreview();
    document.getElementById('rpt-step3').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    rptShowError('분석 오류: ' + err.message);
  } finally {
    rptState.analyzing = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cpu-fill"></i> AI 분석 시작';
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
  const vp = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width  = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

async function callClaude(imgB64) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt(), imageB64: imgB64 })
    });
    if (!res.ok) throw new Error(`서버 응답 오류: ${await res.text()}`);
    const data = await res.json();
    const text = (data.text || '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e) { console.error('JSON 파싱 실패:', e); }
    }
  } catch (err) {
    console.error('AI 호출 에러:', err);
  }
  return null;
}

// ─── 미리보기 렌더링 ───
function renderPreview() {
  const co = rptState.companies;
  const name = rptState.customerName || '고객';
  const N = co.length;

  let html = `<table>`;
  html += `<tr class="r-title"><td colspan="${3 + N}">${name} 님 보장분석표</td></tr>`;

  // 헤더행 1 – 보험사명
  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr" style="background:#001E42;color:#fff;">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach(c => html += `<th class="r-ins">${c.name}</th>`);
  html += `</tr>`;

  // 헤더행 2 – 상품명
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">상품명</th><th class="r-date"></th>`;
  co.forEach(c => {
    const p = c.product.length > 18 ? c.product.slice(0, 18) + '…' : c.product;
    html += `<td class="r-date-alt" style="font-size:9px;">${p}</td>`;
  });
  html += `</tr>`;

  // 헤더행 3 – 가입시기
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">가입시기</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date">${c.start_date || ''}</td>`);
  html += `</tr>`;

  // 헤더행 4 – 만기
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date-alt" style="font-size:9px;">${c.end_date || ''}</td>`);
  html += `</tr>`;

  // 헤더행 5 – 보험료
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee" style="background:#D6DEE7;color:#001E42;">보험료</th>
    <td class="r-sum r-fee">${fmtWon(totalPrem)}</td>`;
  co.forEach(c => html += `<td class="r-fee">${fmtWon(c.premium || 0)}</td>`);
  html += `</tr>`;

  // 데이터 행
  COVERAGE_DEF.forEach((cov, idx) => {
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0);
    const sum  = vals.reduce((s, v) => s + v, 0);
    const isEven = idx % 2 === 1;

    html += `<tr>`;
    if (cov.cat !== null) {
      const span = CAT_SPANS[cov.cat]?.rowspan || 1;
      html += `<td class="r-cat" rowspan="${span}">${cov.cat}</td>`;
    }
    html += `<td class="r-item">${cov.label}</td>`;
    html += `<td class="r-sum">${sum ? fmtMan(sum) : ''}</td>`;
    vals.forEach(v => {
      const cls = isEven ? 'r-val-alt' : 'r-val';
      html += `<td class="${cls}">${v ? fmtMan(v) : ''}</td>`;
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
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  }

  const co   = rptState.companies;
  const name = rptState.customerName || '고객';
  const N    = co.length;
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const merges = [];

  const C = {
    navy:    '001E42',
    white:   'FFFFFF',
    gray:    'D6DEE7',
    feeGray: 'D7DDE4',
    oddBg:   'FFFFFF',
    evenBg:  'F8FAFC',
    footBg:  'F8FAFC',
    blue:    '1E40AF',
    darkNav: '001E42',
    red:     'C00000',
    grayTxt: '94A3B8',
  };

  const thin = { style: 'thin', color: { rgb: 'C5CBD3' } };
  const BD = { top: thin, bottom: thin, left: thin, right: thin };

  function mkCell(v, fill, fontColor, bold, align, fontSize) {
    const s = {
      border: BD,
      fill: fill ? { type: 'pattern', patternType: 'solid', fgColor: { rgb: fill } } : undefined,
      font: {
        name: 'Malgun Gothic',
        sz: fontSize || 10,
        bold: !!bold,
        color: fontColor ? { rgb: fontColor } : undefined,
      },
      alignment: {
        horizontal: align || 'center',
        vertical: 'center',
        wrapText: true,
      },
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

  // Row 0: 타이틀
  setCell(r, 0, `${name} 님 보장분석표`, null, null, true, 'left', 14);
  addMerge(r, 0, r, 2 + N);
  r++;

  // Row 1~5: 헤더
  setCell(r, 0, '주요\n보장', C.navy, C.white, true, 'center');
  addMerge(r, 0, r + 4, 0);
  setCell(r, 2, '고객\n보장합산', C.gray, C.darkNav, true, 'center');
  addMerge(r, 2, r + 3, 2);

  // 행1: 보험사명
  setCell(r, 1, '보험사', C.navy, C.white, true, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.name, C.gray, C.red, true, 'center'));
  r++;

  // 행2: 상품명
  setCell(r, 1, '상품명', C.navy, C.white, true, 'center');
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.product, C.white, null, false, 'center', 9));
  r++;

  // 행3: 가입시기
  setCell(r, 1, '가입시기', C.navy, C.white, true, 'center');
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.start_date || '', C.gray, null, false, 'center', 9));
  r++;

  // 행4: 만기
  setCell(r, 1, '납입기간/\n만기시점', C.navy, C.white, true, 'center');
  setCell(r, 2, '', C.gray, null, false, 'center');
  co.forEach((c, i) => setCell(r, 3 + i, c.end_date || '', C.white, null, false, 'center', 9));
  r++;

  // 행5: 보험료
  setCell(r, 0, '', C.navy, C.white, true, 'center');
  setCell(r, 1, '보험료', C.gray, C.white, true, 'center');
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  setCell(r, 2, totalPrem || '', C.feeGray, C.darkNav, true, 'right');
  if (totalPrem) ws[XLSX.utils.encode_cell({ r, c: 2 })].s.numFmt = '#,##0';
  co.forEach((c, i) => {
    setCell(r, 3 + i, c.premium || '', C.feeGray, C.darkNav, true, 'right');
    if (c.premium) ws[XLSX.utils.encode_cell({ r, c: 3 + i })].s.numFmt = '#,##0';
  });
  r++;

  // 데이터 행
  let catStartRow = -1;
  let catCurr = null;

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
    const sum  = vals.reduce((s, v) => s + v, 0);
    setCell(r, 2, sum ? fmtMan(sum) : '', C.gray, C.darkNav, true, 'right');

    vals.forEach((v, i) => {
      setCell(r, 3 + i, v ? fmtMan(v) : '', dataBg, C.blue, false, 'right');
    });

    r++;
  });

  if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0);

  // 주석 행
  setCell(r, 0,
    '* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.',
    C.footBg, C.grayTxt, false, 'left', 9);
  addMerge(r, 0, r, 2 + N);

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 + N } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 12 },
    ...co.map(() => ({ wch: 13 })),
  ];

  const rowHeights = [];
  for (let i = 0; i <= r; i++) {
    let hpt = 22;
    if (i === 0) hpt = 28;
    if (i >= 1 && i <= 5) hpt = 36;
    rowHeights.push({ hpt });
  }
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
  rptState = { pdfFile: null, pdfDoc: null, companies: [], customerName: '', analyzing: false };
  const fi = document.getElementById('rpt-file-info');
  if (fi) fi.style.display = 'none';
  ['rpt-step2', 'rpt-step3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const inp = document.getElementById('rpt-pdf-input');
  if (inp) inp.value = '';
  setProgress(0, '분석 준비 중...', '');
  rptHideError();
};

// ─── 유틸 ───
function fmtWon(v) {
  if (!v) return '';
  return v.toLocaleString() + '원';
}

function fmtMan(v) {
  if (!v) return '';
  if (v >= 10000) {
    const eok = v / 10000;
    const r = Math.round(eok * 10) / 10;
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

})();