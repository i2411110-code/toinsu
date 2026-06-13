// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v4.2: 다중 페이지 딥머지 및 CoT(사고 과정 메모) 강제 적용
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

// ─── AI 프롬프트 (사고 과정 'Chain of Thought' 강제 적용) ───
function buildPrompt() {
  return `당신은 한국 보험 보장분석 제안서 데이터 추출 전문 AI입니다.

## 🚨 치명적 오류 주의 (AI의 고질적 밀림 현상 방지)
과거 분석 시, 특정 보험사에 보장금액이 없는(빈칸) 경우 우측에 있는 다른 보험사의 금액을 끌어와서 잘못 기입하는 심각한 오류가 있었습니다. 이를 방지하기 위해 **반드시 세로열(Column) 단위로 완전히 분리**해서 읽어야 합니다.

## 🚨 사고 과정 (작업 지시사항) - 가장 중요
당신은 최종 JSON 데이터를 출력하기 전에, 반드시 아래 양식처럼 [데이터 추출 메모]를 텍스트로 먼저 작성해야 합니다. 이 메모를 작성하지 않으면 작업은 실패한 것입니다. 중괄호 { } 는 절대 메모에 쓰지 마세요.

[데이터 추출 메모 예시]
1열_흥국화재: 상품명(무배당 흥Good), 보험료(24604), 상해수술비(50), 질병수술비(0), 자동차부상(20)...
2열_삼성화재: 상품명(무배당 삼성화재), 보험료(50450), 상해수술비(0), 질병수술비(0), 자동차부상(10)...
3열_에이스손보: ...

## 계약 정보 추출 기준
- 표의 세로 열(Column) 하나가 보험계약 1건입니다.
- 고객명: "OOO 님의 상품별 가입현황" 형태에서 이름만 추출
- 보험사명: 괄호/번호 제외한 "흥국화재" 형태
- 보장금액 단위: 반드시 **'만원' 단위 정수** (예: "5,000만" -> 5000, "1.6억" -> 16000, 빈칸/0 -> 0)

## 담보 매핑 규칙
- inpatient: 입원 의료비 (실비)
- outpatient: 통원 의료비 (실비)
- liability: 일상생활 배상책임
- disease_surg: 질병 수술비
- injury_surg: 상해 / 재해 수술비
- brain_heart_surg: 뇌 / 심장 수술비 (뇌혈관+허혈성+뇌출혈+심근경색 수술 합산)
- type_surg: 1~5 종수술
- cancer_diag: 일반암 진단비
- minor_cancer: 유사암 진단비
- robot_surg: 로봇암 수술비
- chemo_rad: 항암방사선약물 치료비
- targeted: 표적항암약물 치료비
- cancer_main: 암 주요 치료비
- cerebro: 뇌혈관질환 진단비
- stroke: 뇌졸증 진단비
- cerebro_hem: 뇌출혈 진단비
- thrombo: 혈전용해제
- ischemic: 허혈성심장질환 진단비
- arrhythmia: 부정맥 진단비
- ami: 급성심근경색 진단비
- injury_hosp: 상해/재해 입원일당
- disease_hosp: 질병 입원일당
- general_hosp: 일반 입원일당
- fracture: 골절 진단비
- death_general: 일반사망
- death_disease: 질병사망
- death_injury: 상해/재해사망
- car_injury: 자동차 부상치료비(1급~14급)
- car_fine: 벌금(대인)
- car_lawyer: 변호사 선임비용
- car_settlement: 사고처리 지원금(형사합의금)

## 출력 형식
[데이터 추출 메모]를 모두 작성한 후, 마지막에 **오직 한 번만** 순수한 JSON 포맷을 출력하세요. 마크다운(\`\`\`json)은 생략하세요.

{
  "companies": [
    {
      "name": "보험사명",
      "product": "상품명 전체",
      "start_date": "YYYY.MM.DD",
      "end_date": "YYYY.MM.DD",
      "premium": 12345,
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
`;
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
    <p class="rpt-step-desc">가입현황 세부내역이 포함된 PDF를 업로드하세요.</p>
    <label id="rpt-drop-zone" for="rpt-pdf-input" class="rpt-drop-zone"
      ondragover="event.preventDefault()" ondrop="window.rptHandleDrop(event)">
      <i class="bi bi-cloud-upload-fill" style="font-size:36px; color:#3182F6; margin-bottom:8px; display:block;"></i>
      <div style="font-weight:600; color:#334155; margin-bottom:4px;">PDF 파일을 여기에 드래그하거나 클릭하여 선택</div>
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

// ─── AI 분석 및 Deep Merge ───
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
  const startPage = totalPages > 1 ? 2 : 1;
  const endPage = Math.min(totalPages, 6); 
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

    setProgress(100, `추출 완료! 데이터 병합 최적화 중...`, '');

    // 날짜 정규화
    function normDate(d) { return d ? String(d).replace(/-/g, '.').trim() : ''; }
    rptState.companies.forEach(c => {
      c.start_date = normDate(c.start_date);
      c.end_date   = normDate(c.end_date);
    });

    const BLOCK_NAMES = ['메리츠', '메리츠화재', '토스인슈어런스', 'GA1', 'GA4', '가온부천', '가온'];
    function isValidCompany(c) {
      if (!c.name || !c.product) return false;
      if (BLOCK_NAMES.some(b => c.name.includes(b) || c.product.includes(b))) return false;
      if (c.name.length < 2) return false;
      return true;
    }

    // 과도한 단위 오류 방지 로직 (만원 기준)
    function normalizeCoverageValues(coverages) {
      const MAX_SANE_MAN = 50000; 
      Object.keys(coverages).forEach(key => {
        const v = coverages[key];
        if (!v || v <= 0) { coverages[key] = 0; return; }
        if (v > MAX_SANE_MAN * 10000) {
          coverages[key] = Math.round(v / 10000); // 억 단위를 원으로 잘못 표기 시 보정
        }
      });
      return coverages;
    }

    // 중복 제거 및 Deep Merge용 Key 생성 (보험사명 + 상품명 + 보험료 기반)
    function makeKey(c) {
      const name = (c.name || '').replace(/\s+/g, '').replace(/\(무\)|\(무배당\)|무배당|생명|화재|손보|손해보험/g, '');
      const prod = (c.product || '').replace(/\s+/g, '').replace(/\(무\)|\(무배당\)|무배당|갱신형/g, '').slice(0, 12);
      const premKey = Math.floor((c.premium || 0) / 10000); 
      return `${name}|${prod}|${premKey}`;
    }

    const filtered = rptState.companies.filter(isValidCompany);
    filtered.forEach(c => { c.coverages = normalizeCoverageValues(c.coverages || {}); });

    // ─── 핵심: Deep Merge 병합 로직 ───
    const seen = new Map();
    const deduped = [];
    filtered.forEach(c => {
      const k = makeKey(c);
      if (seen.has(k)) {
        const idx = seen.get(k);
        const existing = deduped[idx];

        // 1. 더 길고 정확한 상품명 유지 (잘못 잘린 텍스트 방지)
        if (c.product && c.product.length > (existing.product || '').length) {
          if (!/^\(\d+\)/.test(c.product)) { 
            existing.product = c.product;
          }
        }
        
        // 2. 가입시기, 만기시점 빈 값 채우기
        if (!existing.start_date && c.start_date) existing.start_date = c.start_date;
        if (!existing.end_date && c.end_date) existing.end_date = c.end_date;
        
        // 3. 보험료 보존 (누락된 페이지 대비)
        existing.premium = Math.max(existing.premium || 0, c.premium || 0);

        // 4. 보장항목 누적(Deep Merge) - 페이지별로 나뉜 보장금액을 모두 취합
        Object.keys(c.coverages || {}).forEach(key => {
          existing.coverages[key] = Math.max(existing.coverages[key] || 0, c.coverages[key] || 0);
        });
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

    setProgress(100, `분석 완료! 총 ${rptState.companies.length}개 계약 정리됨`, '');
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
    if (!res.ok) throw new Error(`서버 응답 오류`);
    const data = await res.json();
    const text = (data.text || '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e) {}
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
    const p = c.product.length > 20 ? c.product.slice(0, 20) + '…' : c.product;
    html += `<td class="r-date-alt" style="font-size:9px;" title="${c.product}">${p}</td>`;
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
    navy:    '001E42', white:   'FFFFFF', gray:    'D6DEE7',
    feeGray: 'D7DDE4', oddBg:   'FFFFFF', evenBg:  'F8FAFC',
    footBg:  'F8FAFC', blue:    '1E40AF', darkNav: '001E42',
    red:     'C00000', grayTxt: '94A3B8',
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

  // Row 0: 타이틀
  setCell(r, 0, `${name} 님 보장분석표`, null, null, true, 'left', 14);
  addMerge(r, 0, r, 2 + N);
  r++;

  // Row 1~5: 헤더
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
  if (totalPrem) ws[XLSX.utils.encode_cell({ r, c: 2 })].s.numFmt = '#,##0';
  co.forEach((c, i) => {
    setCell(r, 3 + i, c.premium || '', C.feeGray, C.darkNav, true, 'right');
    if (c.premium) ws[XLSX.utils.encode_cell({ r, c: 3 + i })].s.numFmt = '#,##0';
  });
  r++;

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
function fmtWon(v) { return v ? v.toLocaleString() + '원' : ''; }
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