// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v6: 세로(Column) 단위 시각적 추출 및 다중 병합셀 오류 해결
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

// ─── AI 프롬프트 (세로 읽기 강제 적용) ───
function buildPrompt() {
  return `당신은 데이터 추출 전문가입니다. 

## 치명적인 오류 수정 지시 (가장 중요)
이전에는 표를 가로(행)로 읽다가 담보명 줄바꿈(병합셀)과 금액 줄바꿈 위치를 혼동하여 금액이 전부 틀리게 추출되었습니다.
이 오류를 방지하기 위해 **절대 표를 가로로 읽지 말고, 세로(열, Column) 단위로 읽으세요.**
하나의 보험사(열)를 정했으면, 그 보험사의 세로줄만 위에서 아래로 쭉 내려가면서 표 좌측의 담보명과 자신의 금액을 1:1로 짝맞추어 추출해야 합니다.

## 분석 대상
- "가입현황 | 세부내역" 비교표 페이지만 분석. (가입담보 상세 List 등 세로형 별첨 페이지는 분석하지 말고 즉시 빈 배열 반환)

## 추출 규칙
1. customer_name: 상단의 "OOO 님의 상품별 가입현황"에서 추출
2. companies: (표의 보험사 열 단위로 하나씩 세로로 스캔하며 추출)
   - name: 보험사명 (괄호와 숫자 제외)
   - product: 상품명 전체 (줄바꿈 무시)
   - premium: 월보험료 (원 단위 숫자만)
   - coverages: 해당 보험사의 세로줄을 위에서 아래로 읽으며, 존재하는 담보명의 금액만 추출.
     * KEY: 표 좌측에 적힌 담보명 그대로 작성 (예: "질병사망", "일반암 진단비")
     * VALUE: 반드시 만원 단위 숫자로 변환 ("1억300만"->10300, "5,000만"->5000, "30만"->30, 빈칸/0/- -> 0)

## 출력 형식 (순수 JSON만 반환)
{
  "customer_name": "심*진",
  "companies": [
    { 
      "name": "흥국화재", 
      "product": "무배당 흥Good...", 
      "start_date": "2025.12.22", 
      "end_date": "2045.12.22", 
      "premium": 24604,
      "coverages": {
        "질병사망": 10300,
        "상해사망": 15100,
        "일반암 진단비": 16500
      }
    }
  ]
}`;
}

let rptState = {
  pdfFile: null, pdfDoc: null,
  companies: [], customerName: '', analyzing: false,
};

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
      보장분석 리포트 생성기 (v6)
    </div>
  </div>

  <div class="rpt-card">
    <div class="rpt-step-label">STEP 1</div>
    <h3 class="rpt-step-title">보장분석 제안서 PDF 업로드</h3>
    <label id="rpt-drop-zone" for="rpt-pdf-input" class="rpt-drop-zone"
      ondragover="event.preventDefault()" ondrop="window.rptHandleDrop(event)">
      <i class="bi bi-cloud-upload-fill" style="font-size:36px; color:#3182F6; margin-bottom:8px; display:block;"></i>
      <div style="font-weight:600; color:#334155; margin-bottom:4px;">PDF 파일을 여기에 드래그하거나 클릭하여 선택</div>
      <input type="file" id="rpt-pdf-input" accept=".pdf" style="display:none;" onchange="window.rptHandleFile(event)">
    </label>
    <div id="rpt-file-info" style="display:none; margin-top:12px; padding:10px 14px;
      background:#F0F7FF; border-radius:8px; border:1px solid #BAD7FB; font-size:13px; color:#1E40AF; align-items:center; gap:8px;">
      <i class="bi bi-file-earmark-pdf-fill" style="font-size:18px;"></i>
      <span id="rpt-file-name"></span>
      <span id="rpt-page-count" style="color:#64748B; margin-left:4px;"></span>
    </div>
  </div>

  <div id="rpt-step2" class="rpt-card" style="display:none;">
    <div class="rpt-step-label">STEP 2</div>
    <h3 class="rpt-step-title">AI 세로 정밀 추출 (금액 오류 방지)</h3>
    <div style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748B; margin-bottom:6px;">
        <span id="rpt-progress-text">분석 준비 중...</span>
        <span id="rpt-progress-pct">0%</span>
      </div>
      <div style="height:8px; background:#E5E8EB; border-radius:99px; overflow:hidden;">
        <div id="rpt-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#3182F6,#60A5FA); border-radius:99px; transition:width 0.4s;"></div>
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
      <button style="background:none; border:1px solid #E2E8F0; padding:10px 20px; border-radius:8px; cursor:pointer; font-size:13px; color:#475569;" onclick="window.rptReset()">
        <i class="bi bi-arrow-counterclockwise"></i> 다시 시작
      </button>
    </div>
    <div style="overflow-x:auto; border-radius:10px; border:1px solid #E2E8F0;">
      <div id="rpt-preview-table"></div>
    </div>
  </div>

  <div id="rpt-error-box" style="display:none; margin-top:12px; padding:12px 16px; background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; color:#DC2626; font-size:13px;">
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

window.rptHandleDrop = function (e) { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) window.rptLoadPDF(f); };
window.rptHandleFile = function (e) { const f = e.target.files[0]; if (f) window.rptLoadPDF(f); };

window.rptLoadPDF = async function (file) {
  rptState.pdfFile = file;
  rptHideError();
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  try {
    const ab = await file.arrayBuffer();
    rptState.pdfDoc = await window.pdfjsLib.getDocument({ data: ab }).promise;
    document.getElementById('rpt-file-info').style.display = 'flex';
    document.getElementById('rpt-file-name').textContent = file.name;
    document.getElementById('rpt-page-count').textContent = `(${rptState.pdfDoc.numPages}페이지)`;
    document.getElementById('rpt-step2').style.display = 'block';
  } catch (err) {
    rptShowError('PDF 로드 실패: ' + err.message);
  }
};

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
      setProgress(Math.round(((i + 1) / total) * 100), `${pn}페이지 열(Column) 단위 스캔 중... (${i + 1}/${total})`, '금액 오차 방지를 위해 세로로 읽고 있습니다');

      const imgB64 = await pageToBase64(pn);
      const result = await callClaude(imgB64);

      if (result && result.companies && result.companies.length > 0) {
        
        // ── JS 내부 동적 매핑 (환각 원천 차단) ──
        let parsed_companies = result.companies.map(c => {
          let mappedCoverages = {};
          
          Object.entries(c.coverages || {}).forEach(([label, v]) => {
            let key = null;
            let L = label.replace(/\s+/g, '');
            
            // 키워드 기반 스마트 매핑
            if (L.includes('질병입원') || L.includes('상해입원')) key = 'inpatient';
            else if (L.includes('외래') || L.includes('처방조제료') || L.includes('질병통원') || L.includes('상해통원')) key = 'outpatient';
            else if (L.includes('일상생활배상책임') || L.includes('가족생활배상')) key = 'liability';
            else if (L === '질병수술비' || L.includes('질병수술급여금')) key = 'disease_surg';
            else if (L === '상해수술비' || L === '재해수술비' || L.includes('일반상해수술')) key = 'injury_surg';
            else if (L.includes('뇌혈관수술비') || L.includes('허혈심장질환수술비') || L.includes('뇌출혈및급성심근경색수술비')) key = 'brain_heart_surg';
            else if (L.includes('종수술')) key = 'type_surg';
            else if (L.includes('일반암진단비') || L.includes('통합암진단비') || L.includes('특정암진단비')) key = 'cancer_diag';
            else if (L.includes('유사암진단비')) key = 'minor_cancer';
            else if (L.includes('로봇암') || L.includes('다빈치')) key = 'robot_surg';
            else if (L.includes('항암방사선') || L.includes('중입자')) key = 'chemo_rad';
            else if (L.includes('표적항암') || L.includes('고액항암') || L.includes('카티')) key = 'targeted';
            else if (L.includes('암주요치료비') || L.includes('2대질환주요치료비')) key = 'cancer_main';
            else if (L === '뇌혈관진단비' || L.includes('뇌혈관질환')) key = 'cerebro';
            else if (L.includes('뇌졸중')) key = 'stroke';
            else if (L.includes('뇌출혈')) key = 'cerebro_hem';
            else if (L.includes('혈전용해')) key = 'thrombo';
            else if (L === '허혈성심장질환진단비' || L.includes('허혈심장')) key = 'ischemic';
            else if (L.includes('부정맥')) key = 'arrhythmia';
            else if (L.includes('급성심근경색')) key = 'ami';
            else if (L === '상해일당' || L.includes('재해입원일당')) key = 'injury_hosp';
            else if (L === '질병일당' || L.includes('질병입원일당')) key = 'disease_hosp';
            else if (L.includes('1인실')) key = 'general_hosp';
            else if (L.includes('응급실')) key = 'er_visit';
            else if (L === '골절진단비') key = 'fracture';
            else if (L.includes('5대골절')) key = 'five_fracture';
            else if (L.includes('깁스')) key = 'cast';
            else if (L === '일반사망') key = 'death_general';
            else if (L === '질병사망' || L.includes('유병자질병사망')) key = 'death_disease';
            else if (L === '암사망') key = 'death_cancer';
            else if (L === '상해사망' || L === '재해사망' || L.includes('상해사망후유장해')) key = 'death_injury';
            else if (L.includes('부상치료비')) key = 'car_injury';
            else if (L === '벌금' || L.includes('교통사고벌금')) key = 'car_fine';
            else if (L.includes('변호사선임')) key = 'car_lawyer';
            else if (L.includes('교통사고처리지원금') || L.includes('사고처리지원금')) key = 'car_settlement';

            if (key) {
              mappedCoverages[key] = Math.max(mappedCoverages[key] || 0, Number(v) || 0);
            }
          });

          return {
            name: c.name,
            product: c.product,
            start_date: c.start_date,
            end_date: c.end_date,
            premium: c.premium,
            coverages: mappedCoverages
          };
        });

        rptState.companies.push(...parsed_companies);
        if (result.customer_name && !rptState.customerName) rptState.customerName = result.customer_name;
      }
    }

    setProgress(100, `추출 완료! JS 정밀 매핑 중...`, '');

    function normDate(d) { return d ? String(d).replace(/-/g, '.').trim() : ''; }
    rptState.companies.forEach(c => { c.start_date = normDate(c.start_date); c.end_date = normDate(c.end_date); });

    const BLOCK = ['메리츠', '메리츠화재', '토스인슈어런스', 'GA1', '가온부천'];
    const filtered = rptState.companies.filter(c => c.name && c.product && c.name.length >= 2 && !BLOCK.some(b => c.name.includes(b) || c.product.includes(b)));

    // Deep Merge (중복 합산 방지 및 최댓값 적용)
    const seen = new Map();
    const deduped = [];
    filtered.forEach(c => {
      const k = `${c.name.replace(/\s+/g, '')}|${c.product.replace(/\s+|\(무\)|\(무배당\)|무배당/g, '').slice(0, 8)}`;
      if (seen.has(k)) {
        const ex = deduped[seen.get(k)];
        if (c.product.length > (ex.product || '').length && !/^\(\d+\)/.test(c.product)) ex.product = c.product;
        if (!ex.start_date && c.start_date) ex.start_date = c.start_date;
        if (!ex.end_date && c.end_date) ex.end_date = c.end_date;
        ex.premium = Math.max(ex.premium || 0, c.premium || 0);
        Object.keys(c.coverages || {}).forEach(key => ex.coverages[key] = Math.max(ex.coverages[key] || 0, c.coverages[key] || 0));
      } else {
        seen.set(k, deduped.length); deduped.push(JSON.parse(JSON.stringify(c)));
      }
    });

    rptState.companies = deduped;
    if (rptState.companies.length === 0) { rptShowError('계약 정보를 찾을 수 없습니다.'); return; }

    setProgress(100, `분석 완료! 총 ${rptState.companies.length}개 계약 매핑 성공`, '');
    document.getElementById('rpt-step3').style.display = 'block';
    renderPreview();
    document.getElementById('rpt-step3').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    rptShowError('분석 오류: ' + err.message);
  } finally {
    rptState.analyzing = false; btn.disabled = false; btn.innerHTML = '<i class="bi bi-cpu-fill"></i> AI 분석 시작';
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
  const canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

async function callClaude(imgB64) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt(), imageB64: imgB64 })
    });
    if (!res.ok) throw new Error(`서버 응답 오류`);
    const text = ((await res.json()).text || '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (err) { console.error(err); }
  return null;
}

function renderPreview() {
  const co = rptState.companies, name = rptState.customerName || '고객', N = co.length;
  let html = `<table><tr class="r-title"><td colspan="${3 + N}">${name} 님 보장분석표</td></tr>`;
  html += `<tr><th class="r-cat" rowspan="5" style="width:28px;">주요<br>보장</th><th class="r-hdr" style="background:#001E42;color:#fff;">보험사</th><th class="r-sum r-hdr">고객<br>보장합산</th>`;
  co.forEach(c => html += `<th class="r-ins">${c.name}</th>`); html += `</tr>`;
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">상품명</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date-alt" style="font-size:9px;" title="${c.product}">${c.product.length > 20 ? c.product.slice(0, 20) + '…' : c.product}</td>`); html += `</tr>`;
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">가입시기</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date">${c.start_date || ''}</td>`); html += `</tr>`;
  html += `<tr><th class="r-hdr" style="background:#001E42;color:#fff;">납입기간/<br>만기시점</th><th class="r-date"></th>`;
  co.forEach(c => html += `<td class="r-date-alt" style="font-size:9px;">${c.end_date || ''}</td>`); html += `</tr>`;
  const tPrem = co.reduce((s, c) => s + (c.premium || 0), 0);
  html += `<tr><th class="r-item r-fee" style="background:#D6DEE7;color:#001E42;">보험료</th><td class="r-sum r-fee">${fmtWon(tPrem)}</td>`;
  co.forEach(c => html += `<td class="r-fee">${fmtWon(c.premium || 0)}</td>`); html += `</tr>`;

  COVERAGE_DEF.forEach((cov, idx) => {
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0), sum = vals.reduce((s, v) => s + v, 0);
    html += `<tr>`;
    if (cov.cat !== null) html += `<td class="r-cat" rowspan="${CAT_SPANS[cov.cat]?.rowspan || 1}">${cov.cat}</td>`;
    html += `<td class="r-item">${cov.label}</td><td class="r-sum">${sum ? fmtMan(sum) : ''}</td>`;
    vals.forEach(v => html += `<td class="${idx % 2 === 1 ? 'r-val-alt' : 'r-val'}">${v ? fmtMan(v) : ''}</td>`);
    html += `</tr>`;
  });
  html += `<tr class="r-foot"><td colspan="${3 + N}">* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.</td></tr></table>`;
  document.getElementById('rpt-preview-table').innerHTML = html;
}

window.rptDownloadExcel = async function () {
  if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const co = rptState.companies, name = rptState.customerName || '고객', N = co.length, wb = XLSX.utils.book_new(), ws = {}, merges = [];
  const C = { navy: '001E42', white: 'FFFFFF', gray: 'D6DEE7', feeGray: 'D7DDE4', oddBg: 'FFFFFF', evenBg: 'F8FAFC', footBg: 'F8FAFC', blue: '1E40AF', darkNav: '001E42', red: 'C00000', grayTxt: '94A3B8' };
  const BD = { top: { style: 'thin', color: { rgb: 'C5CBD3' } }, bottom: { style: 'thin', color: { rgb: 'C5CBD3' } }, left: { style: 'thin', color: { rgb: 'C5CBD3' } }, right: { style: 'thin', color: { rgb: 'C5CBD3' } } };
  function mkCell(v, fill, fColor, bold, align, sz) { const s = { border: BD, fill: fill ? { type: 'pattern', patternType: 'solid', fgColor: { rgb: fill } } : undefined, font: { name: 'Malgun Gothic', sz: sz || 10, bold: !!bold, color: fColor ? { rgb: fColor } : undefined }, alignment: { horizontal: align || 'center', vertical: 'center', wrapText: true } }; return { v: (v === null || v === '') ? '' : (typeof v === 'number' ? v : String(v)), t: typeof v === 'number' ? 'n' : 's', s }; }
  function setCell(r, c, v, fill, fColor, bold, align, sz) { ws[XLSX.utils.encode_cell({ r, c })] = mkCell(v, fill, fColor, bold, align, sz); }
  function addMerge(r1, c1, r2, c2) { merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); }

  let r = 0; setCell(r, 0, `${name} 님 보장분석표`, null, null, true, 'left', 14); addMerge(r, 0, r, 2 + N); r++;
  setCell(r, 0, '주요\n보장', C.navy, C.white, true, 'center'); addMerge(r, 0, r + 4, 0); setCell(r, 2, '고객\n보장합산', C.gray, C.darkNav, true, 'center'); addMerge(r, 2, r + 3, 2);
  setCell(r, 1, '보험사', C.navy, C.white, true, 'center'); co.forEach((c, i) => setCell(r, 3 + i, c.name, C.gray, C.red, true, 'center')); r++;
  setCell(r, 1, '상품명', C.navy, C.white, true, 'center'); setCell(r, 2, '', C.gray, null, false, 'center'); co.forEach((c, i) => setCell(r, 3 + i, c.product, C.white, null, false, 'center', 9)); r++;
  setCell(r, 1, '가입시기', C.navy, C.white, true, 'center'); setCell(r, 2, '', C.gray, null, false, 'center'); co.forEach((c, i) => setCell(r, 3 + i, c.start_date || '', C.gray, null, false, 'center', 9)); r++;
  setCell(r, 1, '납입기간/\n만기시점', C.navy, C.white, true, 'center'); setCell(r, 2, '', C.gray, null, false, 'center'); co.forEach((c, i) => setCell(r, 3 + i, c.end_date || '', C.white, null, false, 'center', 9)); r++;
  setCell(r, 0, '', C.navy, C.white, true, 'center'); setCell(r, 1, '보험료', C.gray, C.white, true, 'center'); const tPrem = co.reduce((s, c) => s + (c.premium || 0), 0); setCell(r, 2, tPrem || '', C.feeGray, C.darkNav, true, 'right'); if (tPrem) ws[XLSX.utils.encode_cell({ r, c: 2 })].s.numFmt = '#,##0'; co.forEach((c, i) => { setCell(r, 3 + i, c.premium || '', C.feeGray, C.darkNav, true, 'right'); if (c.premium) ws[XLSX.utils.encode_cell({ r, c: 3 + i })].s.numFmt = '#,##0'; }); r++;

  let catStartRow = -1, catCurr = null;
  COVERAGE_DEF.forEach((cov, idx) => {
    if (cov.cat !== null) { if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0); catCurr = cov.cat; catStartRow = r; setCell(r, 0, cov.cat, C.navy, C.white, true, 'center'); }
    setCell(r, 1, cov.label, C.gray, null, true, 'left');
    const vals = co.map(c => (c.coverages || {})[cov.key] || 0), sum = vals.reduce((s, v) => s + v, 0);
    setCell(r, 2, sum ? fmtMan(sum) : '', C.gray, C.darkNav, true, 'right');
    vals.forEach((v, i) => setCell(r, 3 + i, v ? fmtMan(v) : '', idx % 2 === 1 ? C.evenBg : C.oddBg, C.blue, false, 'right')); r++;
  });
  if (catCurr !== null) addMerge(catStartRow, 0, r - 1, 0);
  setCell(r, 0, '* 본 자료는 단순 참고용이며 보험 보장에 대한 자세한 사항은 해당 증권과 약관을 참고하시기 바랍니다.', C.footBg, C.grayTxt, false, 'left', 9); addMerge(r, 0, r, 2 + N);
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 + N } }); ws['!merges'] = merges; ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 12 }, ...co.map(() => ({ wch: 13 }))];
  ws['!rows'] = Array.from({ length: r + 1 }, (_, i) => ({ hpt: i === 0 ? 28 : (i >= 1 && i <= 5) ? 36 : 22 }));
  XLSX.utils.book_append_sheet(wb, ws, '보장분석표');
  const d = new Date(), ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `${name}_보장분석표_${ds}.xlsx`);
};

window.rptPrint = function () {
  const content = document.getElementById('rpt-preview-table').innerHTML, win = window.open('', '_blank', 'width=1200,height=800');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>보장분석표 인쇄</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap'); * { box-sizing: border-box; } @page { size: A4 landscape; margin: 10mm; } body { font-family: 'Noto Sans KR', sans-serif; zoom: 0.65; } table { border-collapse: collapse; width: 100%; table-layout: fixed; word-break: break-all; } th, td { border: 1px solid #C5CBD3; padding: 4px 2px; text-align: center; font-size: 11px; } .r-cat { background: #001E42 !important; color: #fff; font-weight: 700; -webkit-print-color-adjust: exact; width: 40px; } .r-item { background: #D6DEE7 !important; font-weight: 600; text-align: left; -webkit-print-color-adjust: exact; width: 120px; } .r-sum, .r-hdr, .r-ins, .r-date, .r-fee { background: #D6DEE7 !important; -webkit-print-color-adjust: exact; } .r-title td { font-size: 16px; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #001E42; }</style></head><body>${content}</body></html>`);
  win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 800);
};

window.rptReset = function () { rptState = { pdfFile: null, pdfDoc: null, companies: [], customerName: '', analyzing: false }; document.getElementById('rpt-file-info').style.display = 'none'; ['rpt-step2', 'rpt-step3'].forEach(id => document.getElementById(id).style.display = 'none'); document.getElementById('rpt-pdf-input').value = ''; setProgress(0, '분석 준비 중...', ''); rptHideError(); };
function fmtWon(v) { return v ? v.toLocaleString() + '원' : ''; }
function fmtMan(v) { if (!v) return ''; return v >= 10000 ? (Number.isInteger(Math.round(v / 1000) / 10) ? Math.round(v / 1000) / 10 : (v / 10000).toFixed(1)) + '억' : v.toLocaleString() + '만'; }
function rptShowError(msg) { const b = document.getElementById('rpt-error-box'); if (b) { document.getElementById('rpt-error-msg').textContent = msg; b.style.display = 'block'; } }
function rptHideError() { const b = document.getElementById('rpt-error-box'); if (b) b.style.display = 'none'; }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

})();