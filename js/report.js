// ================================================
// 보장분석 리포트 생성기 - 텍스트 전용 최적화 모듈
// ================================================
(function () {
  // [필수] 발급받은 제미나이 API 키를 여기에 입력하세요
  const GEMINI_API_KEY = "여기에_무료_제미나이_키를_넣으세요";

  // ─── 담보 정의 (엑셀 순서 일치) ───
  const COVERAGE_DEF = [
    { cat: '실비',  key: 'inpatient', label: '입원 의료비' },
    { cat: null,    key: 'outpatient', label: '통원 의료비' },
    { cat: '배상',  key: 'liability', label: '일상생활 배상책임' },
    { cat: '수술',  key: 'disease_surg', label: '질병 수술비' },
    { cat: null,    key: 'injury_surg', label: '상해 / 재해 수술비' },
    { cat: null,    key: 'brain_heart_surg', label: '뇌 / 심장 수술비' },
    { cat: null,    key: 'type_surg', label: '1 ~ 5 종수술' },
    { cat: '암',    key: 'cancer_diag', label: '일반암 진단비' },
    { cat: null,    key: 'minor_cancer', label: '유사암 진단비' },
    { cat: null,    key: 'robot_surg', label: '로봇암 수술비' },
    { cat: null,    key: 'chemo_rad', label: '항암방사선약물 치료비' },
    { cat: null,    key: 'targeted', label: '표적항암약물 치료비' },
    { cat: null,    key: 'cancer_main', label: '암 주요 치료비' },
    { cat: '뇌',    key: 'cerebro', label: '뇌혈관질환 진단비' },
    { cat: null,    key: 'stroke', label: 'ㄴ뇌졸증 진단비' },
    { cat: null,    key: 'cerebro_hem', label: 'ㄴ뇌출혈 진단비' },
    { cat: null,    key: 'thrombo', label: '혈전용해제' },
    { cat: '심장',  key: 'ischemic', label: '허혈성심장질환 진단비' },
    { cat: null,    key: 'arrhythmia', label: 'ㄴ부정맥 진단비' },
    { cat: null,    key: 'ami', label: 'ㄴ급성심근경색 진단비' },
    { cat: '입원',  key: 'injury_hosp', label: '상해 / 재해 입원일당' },
    { cat: null,    key: 'disease_hosp', label: '질병 입원일당' },
    { cat: null,    key: 'general_hosp', label: '일반 입원일당' },
    { cat: null,    key: 'er_visit', label: '응급실 내원 진료비' },
    { cat: '골절',  key: 'fracture', label: '골절 진단비' },
    { cat: null,    key: 'five_fracture', label: '5대골절 진단비' },
    { cat: null,    key: 'cast', label: '깁스 치료비' },
    { cat: '사망',  key: 'death_general', label: '일반사망' },
    { cat: null,    key: 'death_disease', label: '질병사망' },
    { cat: null,    key: 'death_cancer', label: '암 사망' },
    { cat: null,    key: 'death_injury', label: '상해사망 / 재해사망' },
    { cat: '운전자', key: 'car_injury', label: '자동차 부상치료비(1급~14급)' },
    { cat: null,    key: 'car_fine', label: '벌금(대인)' },
    { cat: null,    key: 'car_lawyer', label: '변호사 선임비용' },
    { cat: null,    key: 'car_settlement', label: '사고처리 지원금(형사합의금)' },
  ];

  window.rptState = { companies: [], customerName: '' };

  // ─── UI 생성 ───
  window.initRptModule = function () {
    const app = document.getElementById('report-app');
    app.innerHTML = `
    <div class="rpt-card">
      <h3 class="rpt-step-title">보장내용 텍스트 붙여넣기</h3>
      <textarea id="rpt-text-input" style="width:100%; height:200px; padding:10px; border:1px solid #ccc; border-radius:8px;" placeholder="제안서 텍스트를 복사해서 붙여넣으세요."></textarea>
      <button id="rpt-analyze-btn" class="btn-action" style="margin-top:10px;" onclick="window.rptAnalyzeText()">분석 시작하기</button>
    </div>
    <div id="rpt-step3" class="rpt-card" style="display:none;">
      <button class="btn-action" style="background:#059669;" onclick="window.rptDownloadExcel()">엑셀 다운로드</button>
      <div id="rpt-preview-table" style="margin-top:15px; overflow-x:auto;"></div>
    </div>`;
  };

  // ─── 분석 로직 ───
  window.rptAnalyzeText = async function () {
    const text = document.getElementById('rpt-text-input').value;
    if (!text.trim()) return alert("텍스트를 입력해주세요!");

    const btn = document.getElementById('rpt-analyze-btn');
    btn.disabled = true;
    btn.innerHTML = '분석 중...';

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "보험 제안서 텍스트를 분석하여 JSON(customer_name, companies:[], rows:[{label, values:[]}] )으로 추출해줘. companies는 {name, product, premium, start_date, end_date} 정보 포함, rows는 {label, values:[]}로. 금액은 만원 단위 숫자만. " + text }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      
      window.rptState = { companies: result.companies, customerName: result.customer_name };
      
      document.getElementById('rpt-step3').style.display = 'block';
      renderPreview();
    } catch (e) {
      alert("분석 오류: " + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '분석 시작하기';
    }
  };

  // ─── 결과 미리보기 ───
  function renderPreview() {
    const co = window.rptState.companies;
    const name = window.rptState.customerName || '고객';
    let html = `<table style="width:100%; border-collapse:collapse; font-size:12px;">
      <tr><th>보험사</th><th>상품명</th><th>보험료</th></tr>`;
    co.forEach(c => {
      html += `<tr><td>${c.name}</td><td>${c.product}</td><td>${fmtWon(c.premium)}</td></tr>`;
    });
    html += `</table>`;
    document.getElementById('rpt-preview-table').innerHTML = html;
  }

  // ─── 엑셀 다운로드 ───
  window.rptDownloadExcel = async function () {
    if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(window.rptState.companies);
    XLSX.utils.book_append_sheet(wb, ws, "보장분석");
    XLSX.writeFile(wb, "보장분석결과.xlsx");
  };

  // ─── 유틸 ───
  function fmtWon(v) { return v ? v.toLocaleString() + '원' : ''; }
  function loadScript(src) {
    return new Promise((res) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; document.head.appendChild(s);
    });
  }
})();