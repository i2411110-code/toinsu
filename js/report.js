// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v5: 행(Row) 단위 시각적 추출 및 JS 내부 매핑 (환각/오류 완벽 제거)
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

// ─── AI 프롬프트 (가장 직관적인 행 단위 추출로 환각 원천 차단) ───
function buildPrompt() {
  return `당신은 한국 보험 보장분석 제안서 표 데이터 추출 전문 AI입니다.

## 분석 대상
- PDF 표 상단에 "보험사별 계약정보"가 있고 가로로 여러 보험사가 나열된 "가입현황 | 세부내역" 페이지만 분석하세요.
- 세로로만 나열된 "별첨"이나 "가입담보 상세 List" 페이지는 무시하고 즉시 { "companies": [], "rows": [], "customer_name": "" } 를 반환하세요.

## 추출 방식 (매우 중요: 눈에 보이는 그대로 "행(Row)" 단위 추출)
AI가 열(Column) 단위로 값을 유추하여 매핑하려 하면 상품명이 망가지거나 금액이 섞이는 치명적인 오류가 발생합니다.
따라서 눈에 보이는 표 모양 그대로, 행(가로) 단위로 베껴서 추출하세요.

## 데이터 추출 규칙
1. customer_name: "심*진 님의 상품별 가입현황"에서 고객명 추출
2. companies: 표 최상단에 있는 보험사 정보 (왼쪽 열부터 순서대로)
   - name: "(1)흥국화재" -> "흥국화재" (괄호 및 숫자 제거, GA명칭 제외)
   - product: 줄바꿈 무시하고 정확한 전체 상품명
   - premium: 월보험료 (숫자만, 예: 24604)
   - start_date / end_date: 가입시기 / 만기시점 (YYYY.MM.DD)
3. rows: 표 좌측의 "담보명"과 우측의 "가입금액"들
   - label: 표 좌측에 적힌 글자 (예: "질병사망", "상해일당", "고액항암 치료비(표적)" 등 표에 적힌 그대로 작성)
   - values: 해당 담보명의 우측에 있는 보험사별 가입금액 숫자 배열 (companies 순서와 정확히 1:1 일치해야 함)
   - [금액 변환 필수]: "1억300만" -> 10300, "5,000만" -> 5000, "30만" -> 30, 빈칸/0/- -> 0
   - (주의) 5,000만은 만원 단위인 5000입니다. 50000000으로 적지 마세요.
   - 표에 존재하는 가로 행을 위에서부터 아래로 누락 없이 전부 작성하세요.

## 출력 형식 (마크다운 없이 순수 JSON만)
{
  "customer_name": "심*진",
  "companies": [
    { "name": "흥국화재", "product": "무배당 흥Good...", "start_date": "2025.12.22", "end_date": "2045.12.22", "premium": 24604 }
  ],
  "rows": [
    { "label": "질병사망", "values": [10300, 5000, 0, 100] },
    { "label": "고액항암 치료비(표적)", "values": [0, 28000, 4000, 0] }
  ]
}`;
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
  const startPage = totalPages > 1 ? 2 : 1;
  const endPage = Math.min(totalPages, 6); 
  const pagesToScan = [];
  for (let pn = startPage; pn <= endPage; pn++) pagesToScan.push(pn);

  const total = pagesToScan.length;

  try {
    for (let i = 0; i < pagesToScan.length; i++) {
      const pn = pagesToScan[i];
      const pct = Math.round(((i + 1) / total) * 100);
      setProgress(pct, `${pn}페이지 분석 중... (${i + 1}/${total})`, '가온 AI가 보험사 계약 정보를 정확히 인식하고 있습니다');

      const imgB64 = await pageToBase64(pn);
      const result = await callClaude(imgB64);

      if (result && result.companies && result.companies.length > 0) {
        
        // AI가 추출한 표(Row 단위) 데이터를 JS 내부에서 안전하게 정규화 매핑합니다.
        let parsed_companies = result.companies.map(c => ({
          name: c.name,
          product: c.product,
          start_date: c.start_date,
          end_date: c.end_date,
          premium: c.premium,
          coverages: {}
        }));

        (result.rows || []).forEach(r => {
          let key = null;
          let label = (r.label || '').replace(/\s+/g, '');
          
          if (label.includes('질병입원') || label.includes('상해입원')) key = 'inpatient';
          else if (label.includes('질병통원') || label.includes('상해통원')) key = 'outpatient';
          else if (label.includes('배상책임')) key = 'liability';
          else if (label === '질병수술비') key = 'disease_surg';
          else if (label === '상해수술비') key = 'injury_surg';
          else if (label.includes('뇌혈관수술비') || label.includes('허혈심장질환수술비')) key = 'brain_heart_surg';
          else if (label.includes('종수술')) key = 'type_surg';
          else if (label === '일반암진단비') key = 'cancer_diag';
          else if (label === '유사암진단비') key = 'minor_cancer';
          else if (label.includes('로봇암')) key = 'robot_surg';
          else if (label.includes('방사선약물')) key = 'chemo_rad';
          else if (label.includes('표적') || label.includes('고액항암')) key = 'targeted';
          else if (label === '암주요치료비' || label.includes('2대질환주요치료비')) key = 'cancer_main';
          else if (label === '뇌혈관진단비') key = 'cerebro';
          else if (label === '뇌졸중진단비') key = 'stroke';
          else if (label === '뇌출혈진단비') key = 'cerebro_hem';
          else if (label.includes('혈전용해')) key = 'thrombo';
          else if (label === '허혈성심장질환진단비') key = 'ischemic';
          else if (label === '부정맥진단비') key = 'arrhythmia';
          else if (label.includes('급성심근경색')) key = 'ami';
          else if (label === '상해일당') key = 'injury_hosp';
          else if (label === '질병일당') key = 'disease_hosp';
          else if (label.includes('1인실')) key = 'general_hosp';
          else if (label.includes('응급실')) key = 'er_visit';
          else if (label === '골절진단비') key = 'fracture';
          else if (label.includes('5대골절')) key = 'five_fracture';
          else if (label.includes('깁스')) key = 'cast';
          else if (label === '일반사망') key = 'death_general';
          else if (label === '질병사망') key = 'death_disease';
          else if (label === '암사망') key = 'death_cancer';
          else if (label === '상해사망') key = 'death_injury';
          else if (label.includes('부상치료비')) key = 'car_injury';
          else if (label === '벌금') key = 'car_fine';
          else if (label.includes('변호사선임')) key = 'car_lawyer';
          else if (label.includes('교통사고처리지원금')) key = 'car_settlement';

          if (key && r.values && Array.isArray(r.values)) {
            r.values.forEach((v, idx) => {
              if (parsed_companies[idx]) {
                parsed_companies[idx].coverages[key] = (parsed_companies[idx].coverages[key] || 0) + (Number(v) || 0);
              }
            });
          }
        });

        rptState.companies.push(...parsed_companies);
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

    function makeKey(c) {
      const name = (c.name || '').replace(/\s+/g, '').replace(/\(무\)|\(무배당\)|무배당/g, '');
      const prod = (c.product || '').replace(/\s+/g, '').replace(/\(무\)|\(무배당\)|무배당|갱신형/g, '').slice(0, 8);
      return `${name}|${prod}`;
    }

    const filtered = rptState.companies.filter(isValidCompany);

    // Deep Merge (중복된 계약 병합)
    const seen = new Map();
    const deduped = [];
    filtered.forEach(c => {
      const k = makeKey(c);
      if (seen.has(k)) {
        const idx = seen.get(k);
        const existing = deduped[idx];
        
        // 상품명이 더 긴/정확한 것으로 업데이트
        if (c.product && c.product.length > (existing.product || '').length) {
          if (!/^\(\d+\)/.test(c.product)) existing.product = c.product;
        }
        if (!existing.start_date && c.start_date) existing.start_date = c.start_date;
        if (!existing.end_date && c.end_date) existing.end_date = c.end_date;
        existing.premium = Math.max(existing.premium || 0, c.premium || 0);

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

  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr" style="background:#001E42;color:#fff;">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach(c => html += `<th class="r-ins">${c.name}</th>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">상품명</th><th class="r-date"></th>`;
  co.forEach(c => {
    const p = c.product.length > 20 ? c.product.slice(0, 20) + '…' : c.product;
    html += `<td class="r-date-alt" style="font-size:9px;" title="${c.product}">${p}</td>`;
  });
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">가입시기</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date">${c.start_date || ''}</td>`);
  html += `</tr>`;

  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date-alt" style="font-size:9px;">${c.end_date || ''}</td>`);
  html += `</tr>`;

  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee" style="background:#D6DEE7;color:#001E42;">보험료</th>
    <td class="r-sum r-fee">${fmtWon(totalPrem)}</td>`;
  co.forEach(c => html += `<td class="r-fee">${fmtWon(c.premium || 0)}</td>`);
  html += `</tr>`;

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
  setCell(r, 0, `${name} 님 보장분석표`, null, null, true, 'left', 14);
  addMerge(r, 0, r, 2 + N);
  r++;

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