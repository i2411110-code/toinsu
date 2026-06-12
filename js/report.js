// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
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

// Claude Vision 프롬프트
function buildPrompt() {
  return `당신은 한국 보험 보장분석 제안서 전문 데이터 추출 AI입니다.
이 이미지는 메리츠화재 보장분석 제안서의 페이지입니다.

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

**중요:**
- 금액은 반드시 숫자만 (단위: 만원). 예: "5,000만원" → 5000, "1억" → 10000
- 이 페이지에 보험사 계약 정보가 없으면 companies를 빈 배열로 반환
- 고객명은 마스킹된 경우 그대로 (예: 심*진)

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "companies": [
    {
      "name": "보험사명",
      "product": "상품명(20자 이내로 줄여도 됨)",
      "start_date": "YYYY.MM.DD",
      "end_date": "YYYY.MM.DD",
      "premium": 숫자(원단위. 예:50450),
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

  <!-- STEP 1 -->
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

  <!-- STEP 2 -->
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

  <!-- STEP 3 -->
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
.rpt-drop-zone {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  border:2px dashed #BAD7FB; border-radius:12px; padding:30px 20px;
  cursor:pointer; background:#F8FBFF; transition:all 0.2s; text-align:center;
}
.rpt-drop-zone:hover { border-color:#3182F6; background:#EFF6FF; }

/* 미리보기 테이블 */
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

  const total = Math.min(rptState.pdfDoc.numPages, 10);

  try {
    for (let pn = 1; pn <= total; pn++) {
      const pct = Math.round((pn / total) * 100);
      setProgress(pct, `${pn}/${total} 페이지 분석 중...`,
        'Claude AI가 보험사 계약 정보를 인식하고 있습니다');

      const imgB64 = await pageToBase64(pn);
      const result  = await callClaude(imgB64);

      if (result && result.companies && result.companies.length > 0) {
        rptState.companies.push(...result.companies);
        if (result.customer_name && !rptState.customerName) {
          rptState.customerName = result.customer_name;
        }
      }
    }

    setProgress(100, `분석 완료! ${rptState.companies.length}개 보험사 인식됨`, '');

    // 중복 제거
    const seen = new Set();
    rptState.companies = rptState.companies.filter(c => {
      const k = c.name + '|' + c.product;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
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
  const vp   = page.getViewport({ scale: 1.8 });
  const canvas = document.createElement('canvas');
  canvas.width  = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
}

async function callClaude(imgB64) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgB64 } },
          { type: 'text', text: buildPrompt() }
        ]
      }]
    })
  });
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || '').join('');
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (_) {}
  return null;
}

// ─── 미리보기 렌더링 ───
function renderPreview() {
  const co = rptState.companies;
  const name = rptState.customerName || '고객';
  const N = co.length;

  let html = `<table>`;

  // 타이틀
  html += `<tr class="r-title"><td colspan="${3 + N}">${name} 님 보장분석표</td></tr>`;

  // 헤더 – 보험사명
  html += `<tr>
    <th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th>
    <th class="r-hdr">보험사</th>
    <th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach(c => html += `<th class="r-ins">${c.name}</th>`);
  html += `</tr>`;

  // 헤더 – 상품명
  html += `<tr><th class="r-hdr">상품명</th><th class="r-date"></th>`;
  co.forEach(c => {
    const p = c.product.length > 16 ? c.product.slice(0,16)+'…' : c.product;
    html += `<td class="r-date" style="font-size:9px;">${p}</td>`;
  });
  html += `</tr>`;

  // 헤더 – 가입시기
  html += `<tr><th class="r-hdr">가입시기</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date">${c.start_date || ''}</td>`);
  html += `</tr>`;

  // 헤더 – 만기
  html += `<tr><th class="r-hdr" style="white-space:normal;line-height:1.3;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date" style="font-size:9px;">${c.end_date || ''}</td>`);
  html += `</tr>`;

  // 보험료
  const totalPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr>
    <th class="r-item r-fee">보험료</th>
    <td class="r-sum r-fee">${fmtWon(totalPrem)}</td>`;
  co.forEach(c => html += `<td class="r-fee">${fmtWon(c.premium || 0)}</td>`);
  html += `</tr>`;

  // 데이터 행
  let activeCat = null;
  COVERAGE_DEF.forEach((cov) => {
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0);
    const sum  = vals.reduce((s, v) => s + v, 0);

    html += `<tr>`;
    if (cov.cat !== null) {
      activeCat = cov.cat;
      const span = CAT_SPANS[cov.cat]?.rowspan || 1;
      html += `<td class="r-cat" rowspan="${span}">${cov.cat}</td>`;
    }
    html += `<td class="r-item">${cov.label}</td>`;
    html += `<td class="r-sum">${sum ? fmtMan(sum) : ''}</td>`;
    vals.forEach(v => html += `<td class="r-val">${v ? fmtMan(v) : ''}</td>`);
    html += `</tr>`;
  });

  // 주석 행
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

  // 스타일 헬퍼
  const BD = { top:{style:'thin',color:{rgb:'C5CBD3'}}, bottom:{style:'thin',color:{rgb:'C5CBD3'}},
               left:{style:'thin',color:{rgb:'C5CBD3'}}, right:{style:'thin',color:{rgb:'C5CBD3'}} };
  const mkS = (v, s={}) => ({ v, t:'s', s:{ border: BD, ...s } });
  const mkN = (v, s={}) => ({ v: v||0, t:'n', s:{ border: BD, numFmt:'#,##0', ...s } });

  const catFill  = { type:'pattern', patternType:'solid', fgColor:{rgb:'001E42'} };
  const hdrFill  = { type:'pattern', patternType:'solid', fgColor:{rgb:'D6DEE7'} };
  const feeFill  = { type:'pattern', patternType:'solid', fgColor:{rgb:'D7DDE4'} };
  const whtFill  = { type:'pattern', patternType:'solid', fgColor:{rgb:'FFFFFF'} };
  const odFill   = { type:'pattern', patternType:'solid', fgColor:{rgb:'F8FAFC'} };

  function cell(r, c, v, s={}) {
    ws[XLSX.utils.encode_cell({r, c})] = mkS(v, s);
  }
  function ncell(r, c, v, s={}) {
    ws[XLSX.utils.encode_cell({r, c})] = mkN(v, s);
  }
  function merge(r1,c1,r2,c2) {
    merges.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} });
  }

  let r = 0;

  // 행1: 타이틀
  cell(r, 0, `${name} 님 보장분석표`, {
    font:{bold:true, sz:14}, alignment:{horizontal:'left'}
  });
  merge(r,0,r,2+N);
  r++;

  // 행2~5: 헤더
  const CAT_COL = { fill:catFill, font:{bold:true,color:{rgb:'FFFFFF'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true} };
  const HDR_COL = { fill:hdrFill, font:{bold:true}, alignment:{horizontal:'center',wrapText:true} };

  // 행2: 주요보장 + 보험사
  cell(r, 0, '주요\n보장', CAT_COL);
  merge(r,0,r+4,0); // A열 5행 병합 (보험료 행 제외)
  cell(r, 1, '보험사', HDR_COL);
  cell(r, 2, '고객\n보장합산', { fill:hdrFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'center',wrapText:true} });
  merge(r,2,r+3,2); // 합산열 4행
  co.forEach((c,i) => cell(r, 3+i, c.name, { fill:hdrFill, font:{bold:true,color:{rgb:'C00000'}}, alignment:{horizontal:'center',wrapText:true} }));

  // 행3~5: 상품명/가입시기/만기
  [['상품명', co.map(c=>c.product)], ['가입시기', co.map(c=>c.start_date||'')], ['납입기간/\n만기시점', co.map(c=>c.end_date||'')]].forEach(([h, vals]) => {
    r++;
    cell(r, 1, h, HDR_COL);
    vals.forEach((v,i) => cell(r, 3+i, v, { fill:whtFill, font:{sz:9}, alignment:{horizontal:'center',wrapText:true} }));
  });

  // 행6: 보험료
  r++;
  const FEE_S = { fill:feeFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'right'} };
  cell(r, 0, '', CAT_COL); // 카테고리 빈 칸 (병합에 포함)
  cell(r, 1, '보험료', { fill:feeFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'center'} });
  ncell(r, 2, co.reduce((s,c)=>s+(c.premium||0),0), FEE_S);
  co.forEach((c,i) => ncell(r, 3+i, c.premium||0, FEE_S));

  // 데이터 행
  let catStartRow = -1;
  let catCurr = null;

  COVERAGE_DEF.forEach((cov, idx) => {
    r++;
    const isEven = r % 2 === 0;
    const df = isEven ? odFill : whtFill;

    if (cov.cat !== null) {
      if (catCurr !== null) {
        merge(catStartRow, 0, r-1, 0);
      }
      catCurr = cov.cat;
      catStartRow = r;
      cell(r, 0, cov.cat, CAT_COL);
    }

    cell(r, 1, cov.label, { fill:hdrFill, alignment:{horizontal:'left'} });
    const vals = co.map(c => (c.coverages||{})[cov.key]||0);
    const sum  = vals.reduce((s,v)=>s+v,0);
    ncell(r, 2, sum, { fill:hdrFill, font:{bold:true,color:{rgb:'001E42'}}, alignment:{horizontal:'right'} });
    vals.forEach((v,i) => ncell(r, 3+i, v, { fill:df, alignment:{horizontal:'right'} }));
  });
  if (catCurr !== null) merge(catStartRow, 0, r, 0);

  // 주석
  r++;
  cell(r, 0, '* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.', {
    fill:{type:'pattern',patternType:'solid',fgColor:{rgb:'F8FAFC'}},
    font:{sz:9, color:{rgb:'94A3B8'}}, alignment:{horizontal:'left'}
  });
  merge(r,0,r,2+N);

  // 시트 설정
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
function fmtWon(v) {
  if (!v) return '';
  return v.toLocaleString() + '원';
}
function fmtMan(v) {
  if (!v) return '';
  if (v >= 10000) return (v/10000) + '억';
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