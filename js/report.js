// ================================================
// 보장분석 리포트 생성기 - 가온사업단 오피스 모듈
// v8.0: 텍스트/PDF 분석 삭제 → 토스 CRM 붙여넣기(report-excel.js) 전용
// ================================================
(function () {

  window.initRptModule = function () {
    const app = document.getElementById('report-app');
    if (!app || app.dataset.inited) return;
    app.dataset.inited = '1';
    app.innerHTML = getRptHTML();
    injectRptStyles();
    if (window.initRptExcelModule) window.initRptExcelModule();
  };

  function getRptHTML() {
    return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <div style="font-size:18px;font-weight:700;color:#001E42;">
        <i class="bi bi-file-earmark-bar-graph-fill" style="color:#3182F6;margin-right:6px;"></i>
        보장분석 리포트 생성기
      </div>
    </div>
    <div id="rpt-mode-excel-panel"></div>`;
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
[contenteditable="true"]{cursor:text;transition:all .2s;border-radius:2px;}
[contenteditable="true"]:hover{outline:1px dashed #3182F6;background:rgba(49,130,246,.1)!important;}
[contenteditable="true"]:focus{outline:2px solid #3182F6;background:#fff!important;color:#000!important;}
`;
    document.head.appendChild(s);
  }

  // (혹시 app.js 등에서 호출하더라도 에러 나지 않도록 남겨둔 호환용)
  window.rptSwitchMode = function () {
    if (window.initRptExcelModule) window.initRptExcelModule();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initRptModule);
  } else {
    window.initRptModule();
  }
})();