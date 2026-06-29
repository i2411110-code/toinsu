// ================================================
// 토스DB 엑셀 보장분석 → 니즈환기 리포트 생성기
// v1.2: 컬럼 오프셋 버그 수정 (A열이 없는 엑셀 양식 대응)
// - 토스 "OOO님의 보장분석 리포트.xlsx" 양식 업로드
// - 소분류별 고객 보장총액(만원)을 권장 기준금액과 비교
// - 부족/미가입 항목 빨간색 표시
// - 부족 항목 기반 AI 니즈환기 멘트 자동 생성
// ================================================

(function () {

  // ─── [기준금액 설정] 단위: 만원 ───
  const RECOMMEND = {
    // 실비
    '질병입원의료비': 5000, '질병외래의료비': 30, '질병처방조제료': 10,
    '상해입원의료비': 5000, '상해외래의료비': 30, '상해처방조제료': 10,
    // 3대진단
    '일반암진단': 3000, '소액암(유사암)진단': 500, '고액암진단': 2000,
    '뇌혈관질환진단': 2000, '뇌졸중질환진단': 2000, '뇌출혈질환진단': 1000,
    '허혈성심장질환진단': 2000, '급성심근경색진단': 1000,
    // 수술비
    '질병수술': 300, '상해수술': 300, '암수술': 500,
    '뇌혈관질환수술': 1000, '허혈성심장질환수술': 1000,
    // 입원일당 (만원/일)
    '질병입원': 3, '상해입원': 3,
    // 사망
    '질병사망': 5000, '상해사망': 10000,
    // 후유장해
    '질병80%이상후유장해': 5000, '질병80%미만후유장해': 5000,
    '상해80%이상후유장해': 10000, '상해80%미만후유장해': 10000,
    // 골절화상
    '골절진단': 100, '화상진단': 100,
    // 생활배상책임
    '가족생활배상책임담보': 1000, '일상생활배상책임담보': 1000,
    // 운전자
    '교통사고처리지원금': 3000, '벌금(대물)': 2000, '벌금(대인)': 3000,
    '변호사선임비용': 5000, '자동차부상치료비': 3000,
    // 화재
    '화재벌금': 2000,
    // 치아
    '보존치료': 100, '보철치료': 100,
  };

  // ─── [대분류별 니즈환기 멘트 템플릿] ───
  const NEEDS_SCRIPT = {
    '실비':         '실손의료비가 부족하거나 미가입 상태입니다. 실비는 실제 발생한 진료비를 직접 보장받는 가장 기본적인 항목이라, 우선적으로 보완을 권장드립니다.',
    '3대진단':      '암·뇌혈관·심장질환(3대 진단비)이 권장 기준보다 부족합니다. 진단 시 치료비뿐 아니라 생활비까지 감당할 수 있는 수준으로 보강이 필요합니다.',
    '수술비':       '질병·상해 수술비 보장이 부족합니다. 수술 1회당 발생하는 비급여 부담을 고려하면 추가 보강이 필요합니다.',
    '입원일당':     '입원일당 보장이 부족합니다. 장기 입원 시 발생하는 간병비·생활비 공백을 막기 위한 보강이 필요합니다.',
    '사망':         '사망보험금이 부족합니다. 가족의 생계 유지를 위한 최소한의 준비금으로 보강을 권장드립니다.',
    '후유장해':     '후유장해 보장이 부족합니다. 장해로 인한 장기 소득 단절에 대비한 보강이 필요합니다.',
    '골절화상':     '골절·화상 진단 보장이 부족합니다. 비교적 발생 빈도가 높은 항목이라 소액으로도 보강해두시면 좋습니다.',
    '생활배상책임': '일상생활배상책임 보장이 부족합니다. 가입금액이 크지 않아 적은 비용으로 큰 사고를 대비할 수 있는 항목입니다.',
    '운전자':       '운전자 관련 보장(벌금·합의금·변호사비용 등)이 부족합니다. 운전을 하신다면 필수적으로 보강을 권장드립니다.',
    '화재':         '화재 관련 보장이 부족합니다.',
    '치아':         '치아 보존·보철 치료 보장이 부족합니다. 치과 치료비는 비급여 비중이 높아 보강 시 실질적인 도움이 됩니다.',
  };

  let exState = { customerName: '', companies: [], rows: [] };

  // ─── 외부 스크립트 로더 ───
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // ─── 모듈 초기화 ───
  window.initRptExcelModule = function () {
    const panel = document.getElementById('rpt-mode-excel-panel');
    if (!panel) return;
    // ✅ 이미 초기화된 경우 재실행 방지
    if (panel.dataset.inited) return;
    panel.dataset.inited = '1';
    panel.innerHTML = getExcelHTML();
    injectExcelStyles();
    bindDropZone(); // ✅ 드롭존 이벤트를 초기화 후 바인딩
  };

  function getExcelHTML() {
    return `
    <div class="rpt-card">
      <div class="rpt-step-label">STEP 1</div>
      <h3 class="rpt-step-title">토스DB 보장분석 엑셀 업로드</h3>
      <p class="rpt-step-desc">고객의 "OOO님의 보장분석 리포트.xlsx" 파일을 업로드하면, 부족한 보장 항목을 자동으로 찾아 빨간색으로 표시하고 안내 멘트를 생성합니다.</p>
      <label id="rptex-drop" class="rptex-drop" for="rptex-file-input">
        <i class="bi bi-file-earmark-excel" style="font-size:28px;color:#3182F6;"></i>
        <span id="rptex-drop-text">클릭하거나 파일을 끌어다 놓으세요 (.xlsx)</span>
        <input type="file" id="rptex-file-input" accept=".xlsx" style="display:none;" onchange="window.rptExHandleFile(this.files[0])">
      </label>
      <div id="rptex-error-box" style="display:none;margin-top:12px;padding:12px 16px;
        background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#DC2626;font-size:13px;">
        <i class="bi bi-exclamation-circle-fill"></i> <span id="rptex-error-msg"></span>
      </div>
    </div>

    <div id="rptex-result" style="display:none;">
      <div class="rpt-card">
        <div class="rpt-step-label">STEP 2</div>
        <h3 class="rpt-step-title">보장 부족 항목 분석 결과</h3>
        <p class="rpt-step-desc" id="rptex-summary" style="color:#3182F6;font-weight:600;"></p>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;margin-top:10px;">
          <div id="rptex-table"></div>
        </div>
        <p style="font-size:11px;color:#94A3B8;margin-top:10px;">
          * 기준금액은 일반적인 권장 가입금액(예시)이며, 고객 상황에 맞게 상담 시 조정해주세요.
        </p>
      </div>

      <div class="rpt-card">
        <div class="rpt-step-label">STEP 3</div>
        <h3 class="rpt-step-title">니즈환기 멘트 (자동 생성)</h3>
        <p class="rpt-step-desc">아래 멘트를 그대로 보내거나 수정해서 사용하세요.</p>
        <textarea id="rptex-msg-output" style="width:100%;height:260px;border:1.5px solid #E2E8F0;border-radius:10px;
          padding:14px;font-size:13px;font-family:'Noto Sans KR',sans-serif;color:#334155;resize:vertical;
          box-sizing:border-box;line-height:1.7;background:#F8FAFC;"></textarea>
        <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn-action" style="width:auto;padding:10px 20px;" onclick="window.rptExCopyMsg()">
            <i class="bi bi-clipboard-check"></i> 멘트 복사하기
          </button>
          <button style="background:none;border:1px solid #E2E8F0;padding:10px 20px;border-radius:8px;
            cursor:pointer;font-size:13px;color:#475569;" onclick="window.rptExReset()">
            <i class="bi bi-arrow-counterclockwise"></i> 다시 시작
          </button>
        </div>
      </div>
    </div>`;
  }

  function injectExcelStyles() {
    if (document.getElementById('rptex-styles')) return;
    const s = document.createElement('style');
    s.id = 'rptex-styles';
    s.textContent = `
.rptex-drop{display:flex;flex-direction:column;align-items:center;gap:10px;
  border:2px dashed #BAD7FB;border-radius:14px;padding:34px 20px;cursor:pointer;
  background:#F8FBFF;transition:all .15s;text-align:center;}
.rptex-drop:hover{background:#EFF6FF;border-color:#3182F6;}
.rptex-drop.dragover{background:#EFF6FF;border-color:#3182F6;}
#rptex-drop-text{font-size:13px;color:#64748B;font-weight:600;}
#rptex-table table{border-collapse:collapse;font-size:12px;font-family:'Noto Sans KR',sans-serif;width:100%;min-width:600px;}
#rptex-table th,#rptex-table td{border:1px solid #E2E8F0;padding:8px 10px;text-align:center;white-space:nowrap;}
#rptex-table th{background:#001E42;color:#fff;font-weight:700;}
.rptex-cat{background:#D6DEE7;font-weight:700;color:#001E42;}
.rptex-label{text-align:left;font-weight:600;color:#334155;min-width:130px;}
.rptex-status{font-weight:800;border-radius:6px;padding:3px 10px;font-size:11px;display:inline-block;}
.rptex-status.ok{background:#EFF6FF;color:#3182F6;}
.rptex-status.low{background:#FEF2F2;color:#DC2626;}
.rptex-status.none{background:#F1F5F9;color:#64748B;}
.rptex-amt-low{color:#DC2626 !important;font-weight:800;background:#FEF2F2 !important;}
`;
    document.head.appendChild(s);
  }

  // ✅ 드롭존 이벤트를 별도 함수로 분리 — 초기화 후 패널 내부 요소에만 바인딩
  function bindDropZone() {
    const panel = document.getElementById('rpt-mode-excel-panel');
    if (!panel) return;

    panel.addEventListener('dragover', function (e) {
      const drop = document.getElementById('rptex-drop');
      if (drop) { e.preventDefault(); drop.classList.add('dragover'); }
    });
    panel.addEventListener('dragleave', function (e) {
      const drop = document.getElementById('rptex-drop');
      if (drop) drop.classList.remove('dragover');
    });
    panel.addEventListener('drop', function (e) {
      const drop = document.getElementById('rptex-drop');
      if (drop) {
        e.preventDefault();
        drop.classList.remove('dragover');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) window.rptExHandleFile(f);
      }
    });
  }

  // ─── 에러 표시/숨김 ───
  function rptExShowError(msg) {
    const b = document.getElementById('rptex-error-box');
    if (b) { document.getElementById('rptex-error-msg').textContent = msg; b.style.display = 'block'; }
  }
  function rptExHideError() {
    const b = document.getElementById('rptex-error-box');
    if (b) b.style.display = 'none';
  }

  // ─── 파일 처리 진입점 ───
  window.rptExHandleFile = async function (file) {
    rptExHideError();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      rptExShowError('.xlsx 파일만 업로드 가능합니다.');
      return;
    }
    const dropText = document.getElementById('rptex-drop-text');
    if (dropText) dropText.textContent = '분석 중... (' + file.name + ')';

    try {
      if (!window.XLSX) {
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js');
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const parsed = parseTossExcel(aoa);
      if (!parsed.rows.length) {
        rptExShowError('보장 항목을 찾을 수 없습니다. 토스 보장분석 리포트 양식이 맞는지 확인해주세요.');
        if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
        return;
      }

      exState = parsed;
      renderExcelResult();
      if (dropText) dropText.textContent = '✅ ' + file.name + ' 분석 완료 (다른 파일을 올리면 다시 분석합니다)';
    } catch (err) {
      console.error(err);
      rptExShowError('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
      if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    }
  };

  // ─── 토스 보장분석 엑셀(AOA) 파싱 ───
  // ✅ [수정] 토스 양식은 A열이 비어있어 SheetJS가 A열 자체를 생성하지 않고
  //    B열 내용이 배열 index 0번부터 시작합니다. (직접 ZIP/XML 분석으로 확인됨:
  //    시트 범위가 "B2:G66" 형태라 컬럼이 한 칸씩 앞으로 당겨집니다.)
  //    그래서 기존 코드의 row[1](대분류) / row[2](소분류) / row[3](보장총액) /
  //    row[4..](보험사) 인덱스를 모두 1칸씩 줄였습니다.
  //    혹시 일부 양식이 A열을 포함해서 내려올 경우를 대비해, 헤더 행을 찾을 때
  //    "대분류"/"소분류" 텍스트가 어느 열에서 발견되는지 먼저 스캔하고
  //    그 위치를 기준으로 나머지 컬럼을 계산하는 방식으로 안전하게 처리합니다.
  function parseTossExcel(aoa) {
    let customerName = '';
    // 제목 행("OOO님의 보장분석 리포트")도 컬럼이 한 칸 당겨질 수 있으므로
    // 앞쪽 몇 개 셀을 모두 훑어서 "님"이 포함된 첫 텍스트를 찾습니다.
    outer:
    for (let r = 0; r < Math.min(aoa.length, 5); r++) {
      const row = aoa[r] || [];
      for (let c = 0; c < row.length; c++) {
        const m = String(row[c] || '').match(/^(.+?)님/);
        if (m) { customerName = m[1].trim(); break outer; }
      }
    }

    let companies = [];
    let rows = [];
    let currentCat = null;
    let headerSeen = false;
    let catCol = -1, subCol = -1, amtCol = -1, companyStartCol = -1;

    for (let r = 0; r < aoa.length; r++) {
      const row = aoa[r] || [];

      // 헤더 행 감지: "대분류"와 "소분류"가 어느 열에 있든 인접해서 나오면 헤더로 인식
      if (!headerSeen) {
        for (let c = 0; c < row.length - 1; c++) {
          const cur = String(row[c] || '').trim();
          const next = String(row[c + 1] || '').trim();
          if (cur === '대분류' && next === '소분류') {
            headerSeen = true;
            catCol = c;
            subCol = c + 1;
            amtCol = c + 2;
            companyStartCol = c + 3;
            for (let cc = companyStartCol; cc < row.length; cc++) {
              const name = String(row[cc] || '').trim();
              if (name) companies.push(name);
            }
            break;
          }
        }
        continue;
      }

      const b = String(row[catCol] || '').trim();
      const c = String(row[subCol] || '').trim();
      const d = row[amtCol];

      if (b) currentCat = b;
      if (!c) continue;

      const sumAmt = parseManwon(d);
      const perProduct = [];
      for (let cc = companyStartCol; cc < companyStartCol + companies.length; cc++) {
        perProduct.push(parseManwon(row[cc]));
      }

      const recommend = RECOMMEND[c];
      let status = 'none';
      if (recommend !== undefined) {
        status = sumAmt >= recommend ? 'ok' : 'low';
      }

      rows.push({ cat: currentCat, label: c, customerSum: sumAmt, recommend, status, perProduct });
    }

    return { customerName, companies, rows };
  }

  function parseManwon(v) {
    if (v === undefined || v === null) return 0;
    const s = String(v).replace(/,/g, '').trim();
    if (!s || s === '-') return 0;
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // ─── 결과 렌더링 ───
  function renderExcelResult() {
    const { rows, companies, customerName } = exState;
    const lowItems = rows.filter(r => r.status === 'low');
    const noneCount = rows.filter(r => r.status === 'none').length;

    document.getElementById('rptex-result').style.display = 'block';
    document.getElementById('rptex-summary').textContent =
      `✅ 총 ${rows.length}개 보장 항목 중 ${lowItems.length}개 부족 항목을 찾았습니다.` +
      (noneCount ? ` (기준 미설정 항목 ${noneCount}개는 회색으로 표시됩니다)` : '');

    // 테이블
    let html = `<table><tr>
      <th>대분류</th><th>소분류</th><th>고객 보장합산<br>(만원)</th><th>권장 기준<br>(만원)</th><th>상태</th>
      ${companies.map(c => `<th style="font-size:10px;">${esc(c)}</th>`).join('')}
    </tr>`;

    // 대분류 rowspan 계산
    const spans = {};
    let lastCat = null, startIdx = 0;
    rows.forEach((r, i) => {
      if (r.cat !== lastCat) {
        if (lastCat !== null) spans[startIdx] = i - startIdx;
        lastCat = r.cat; startIdx = i;
      }
    });
    if (lastCat !== null) spans[startIdx] = rows.length - startIdx;

    rows.forEach((r, i) => {
      html += `<tr>`;
      if (spans[i] !== undefined) {
        html += `<td class="rptex-cat" rowspan="${spans[i]}">${esc(r.cat)}</td>`;
      }
      const amtCls = r.status === 'low' ? 'rptex-amt-low' : '';
      const statusLabel = r.status === 'ok' ? '적정' : r.status === 'low' ? '부족' : '기준없음';
      const statusCls = r.status === 'ok' ? 'ok' : r.status === 'low' ? 'low' : 'none';
      html += `<td class="rptex-label">${esc(r.label)}</td>`;
      html += `<td class="${amtCls}">${r.customerSum ? r.customerSum.toLocaleString() : '-'}</td>`;
      html += `<td>${r.recommend !== undefined ? r.recommend.toLocaleString() : '-'}</td>`;
      html += `<td><span class="rptex-status ${statusCls}">${statusLabel}</span></td>`;
      r.perProduct.forEach(v => {
        html += `<td>${v ? v.toLocaleString() : '-'}</td>`;
      });
      html += `</tr>`;
    });
    html += `</table>`;
    document.getElementById('rptex-table').innerHTML = html;

    // 멘트 생성
    document.getElementById('rptex-msg-output').value = generateNeedsMessage(customerName, lowItems);
  }

  // ─── 니즈환기 멘트 생성 ───
  function generateNeedsMessage(name, lowItems) {
    if (!lowItems.length) {
      return `안녕하세요, ${name || '고객'}님.\n전담 매니저 심현진입니다.\n\n보장분석 결과, 전반적으로 보장이 양호하게 준비되어 있으십니다.\n다만 보험은 시기에 따라 갱신이나 한도 변경이 있을 수 있어, 1년에 한 번씩 점검해보시는 걸 권장드립니다. 🙂`;
    }

    const cats = [];
    lowItems.forEach(r => { if (!cats.includes(r.cat)) cats.push(r.cat); });

    let msg = `안녕하세요, ${name || '고객'}님.\n전담 매니저 심현진입니다.\n\n`;
    msg += `보유하신 보험 보장 내용을 분석한 결과, 아래와 같이 보강이 필요한 부분이 확인되었습니다.\n\n`;

    cats.forEach((cat, idx) => {
      const itemsInCat = lowItems.filter(r => r.cat === cat).map(r => r.label).join(', ');
      const script = NEEDS_SCRIPT[cat] || `${cat} 관련 보장이 부족합니다.`;
      msg += `${idx + 1}. [${cat}] ${script}\n   (부족 항목: ${itemsInCat})\n\n`;
    });

    msg += `위 내용을 바탕으로 부족한 부분만 효율적으로 채우는 맞춤 설계를 도와드리고자 합니다.\n편하신 시간 알려주시면 보다 자세한 비교 설계안을 안내드리겠습니다 🙂`;
    return msg;
  }

  // ─── 멘트 복사 ───
  window.rptExCopyMsg = function () {
    const ta = document.getElementById('rptex-msg-output');
    if (!ta || !ta.value) return alert('생성된 멘트가 없습니다.');
    ta.select();
    navigator.clipboard.writeText(ta.value).then(() => {
      alert('멘트가 클립보드에 복사되었습니다.');
    }).catch(() => alert('복사에 실패했습니다. 직접 선택해서 복사해주세요.'));
  };

  // ─── 리셋 ───
  window.rptExReset = function () {
    exState = { customerName: '', companies: [], rows: [] };
    const result = document.getElementById('rptex-result');
    if (result) result.style.display = 'none';
    const dropText = document.getElementById('rptex-drop-text');
    if (dropText) dropText.textContent = '클릭하거나 파일을 끌어다 놓으세요 (.xlsx)';
    const fileInput = document.getElementById('rptex-file-input');
    if (fileInput) fileInput.value = '';
    rptExHideError();
  };

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();