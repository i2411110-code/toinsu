/* 가온원 심평원 분석 모듈 - PDF는 브라우저 안에서 처리 */
(function () {
  "use strict";
  const VERSION = "4.10.38";
  let pdfjsPromise, selectedFiles = [];

  function getPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + VERSION + "/pdf.min.mjs")
        .then(pdfjs => {
          pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + VERSION + "/pdf.worker.min.mjs";
          return pdfjs;
        });
    }
    return pdfjsPromise;
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function detectType(name, text) {
    const s = (name + " " + text.slice(0, 4000)).toLowerCase();
    if (/처방조제|조제내역|약국/.test(s)) return "처방조제정보";
    if (/세부진료|세부내역|진료상세/.test(s)) return "세부진료정보";
    if (/기본진료|진료정보요약|기본내역/.test(s)) return "기본진료정보";
    return "문서 유형 미확인";
  }
  async function extractPdf(file, password) {
    const pdfjs = await getPdfJs();
    const task = pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()), password:password || ""});
    let pdf;
    try { pdf = await task.promise; }
    catch (err) {
      if (err && (err.name === "PasswordException" || err.code === 1 || err.code === 2)) {
        const e = new Error("PDF 비밀번호가 없거나 올바르지 않습니다."); e.passwordError = true; throw e;
      }
      throw err;
    }
    const pages = [];
    for (let n=1; n<=pdf.numPages; n++) {
      const page = await pdf.getPage(n), content = await page.getTextContent();
      let lines=[], line=[], y0=null;
      (content.items || []).forEach(item => {
        if (typeof item.str !== "string") return;
        const y = item.transform ? item.transform[5] : 0;
        if (y0 !== null && Math.abs(y-y0)>3) { lines.push(line.join(" ")); line=[]; }
        line.push(item.str); y0=y;
      });
      if (line.length) lines.push(line.join(" "));
      pages.push(lines.join("\n"));
    }
    return {pages:pdf.numPages, text:pages.join("\n\n")};
  }
  function parse(text) {
    const dates=[], codes=[];
    const dr=/(20\d{2})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})일?/g;
    const cr=/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g;
    let m;
    while ((m=dr.exec(text))) { const d=m[1]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[3]).padStart(2,"0"); if(!dates.includes(d)) dates.push(d); }
    while ((m=cr.exec(text))) if(!codes.includes(m[1])) codes.push(m[1]);
    return {dates:dates.sort(),codes:codes.sort()};
  }
  function renderFiles() {
    const el=document.getElementById("hma-file-list"); if(!el) return;
    if(!selectedFiles.length){el.innerHTML='<p class="hma-empty">아직 선택된 파일이 없습니다.</p>';return;}
    el.innerHTML=selectedFiles.map((f,i)=>'<div class="hma-file-row"><div class="hma-file-meta"><b>'+esc(f.name)+'</b><small>'+(f.size/1048576).toFixed(2)+' MB</small></div><label class="hma-password-label">PDF 비밀번호<input class="hma-password" data-index="'+i+'" type="password" autocomplete="off" placeholder="없으면 비워두세요"></label></div>').join("");
  }
  function renderResults(docs) {
    const dates=[...new Set(docs.flatMap(d=>d.dates))].sort(), codes=[...new Set(docs.flatMap(d=>d.codes))].sort();
    const el=document.getElementById("hma-results"); el.hidden=false;
    el.innerHTML='<div class="hma-result-head"><h3>진료내역 추출 결과</h3><button id="hma-print" class="hma-secondary">인쇄 / PDF 저장</button></div>'+
      '<div class="hma-stats"><div><small>분석 파일</small><b>'+docs.length+'개</b></div><div><small>질병코드 후보</small><b>'+codes.length+'종</b></div><div><small>진료일 후보</small><b>'+dates.length+'일</b></div><div><small>자료 기간</small><b>'+esc(dates[0]||"-")+'<br>~ '+esc(dates.at(-1)||"-")+'</b></div></div>'+
      '<div class="hma-result-card"><h4>질병코드 후보</h4><p>'+esc(codes.join(", ")||"추출된 코드 후보가 없습니다.")+'</p></div>'+
      '<div class="hma-result-card"><h4>파일별 처리 결과</h4><div class="hma-table-scroll"><table><thead><tr><th>파일</th><th>문서 유형</th><th>페이지</th><th>날짜</th><th>코드</th></tr></thead><tbody>'+
      docs.map(d=>'<tr><td>'+esc(d.name)+'</td><td>'+esc(d.type)+'</td><td>'+d.pages+'</td><td>'+d.dates.length+'</td><td>'+d.codes.length+'</td></tr>').join("")+
      '</tbody></table></div></div><div class="hma-result-card"><h4>날짜 후보</h4><p>'+esc(dates.join(", ")||"날짜 후보를 추출하지 못했습니다.")+'</p><small>날짜는 원문 확인이 필요한 후보이며 고지 여부를 뜻하지 않습니다.</small></div>'+
      '<details class="hma-raw"><summary>파일별 추출 텍스트 확인</summary>'+docs.map(d=>'<h4>'+esc(d.name)+'</h4><pre>'+esc(d.text.slice(0,15000))+'</pre>').join("")+'</details>'+
      '<p class="hma-disclaimer">이 초기 버전은 날짜·질병코드 후보 추출 도구입니다. 통원 횟수, 입원, 수술·시술, 투약일수 및 보험 고지의무를 확정하지 않습니다.</p>';
    document.getElementById("hma-print").onclick=()=>{
      const w=window.open("","_blank"); if(!w){alert("팝업을 허용해 주세요.");return;}
      w.document.write('<!doctype html><html lang="ko"><meta charset="utf-8"><title>진료내역 검토표</title><style>body{font:14px Arial;padding:25px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style><h1>심평원 진료내역 검토표</h1><p>질병코드 후보: '+esc(codes.join(", ")||"없음")+'</p><p>자료 기간: '+esc(dates[0]||"-")+' ~ '+esc(dates.at(-1)||"-")+'</p><table><tr><th>파일</th><th>문서 유형</th><th>페이지</th><th>날짜</th><th>코드</th></tr>'+docs.map(d=>'<tr><td>'+esc(d.name)+'</td><td>'+esc(d.type)+'</td><td>'+d.pages+'</td><td>'+d.dates.length+'</td><td>'+d.codes.length+'</td></tr>').join("")+'</table><p>참고용 후보이며 고지의무 또는 인수 여부를 확정하지 않습니다.</p><script>window.onload=()=>window.print()<\/script></html>');
      w.document.close();
    };
  }
  window.initMedicalAnalysisPage=function(){
    const root=document.getElementById("hira-medical-analysis");
    if(!root || root.dataset.ready==="1") return;
    root.dataset.ready="1"; selectedFiles=[];
    const input=document.getElementById("hma-files"), status=document.getElementById("hma-status"), results=document.getElementById("hma-results");
    input.addEventListener("change",()=>{selectedFiles=Array.from(input.files||[]);renderFiles();results.hidden=true;status.textContent=selectedFiles.length+"개 파일 선택됨. 각 PDF의 비밀번호를 입력하세요.";});
    document.getElementById("hma-reset").addEventListener("click",()=>{input.value="";selectedFiles=[];renderFiles();results.hidden=true;results.innerHTML="";status.textContent="";});
    document.getElementById("hma-analyze").addEventListener("click",async()=>{
      if(!selectedFiles.length){status.textContent="먼저 PDF 파일을 선택해 주세요.";return;}
      const pw=Array.from(document.querySelectorAll(".hma-password")).map(x=>x.value), btn=document.getElementById("hma-analyze"), docs=[];
      btn.disabled=true;
      try {
        for(let i=0;i<selectedFiles.length;i++){
          status.textContent="분석 중 "+(i+1)+"/"+selectedFiles.length+" — "+selectedFiles[i].name;
          const raw=await extractPdf(selectedFiles[i],pw[i]), p=parse(raw.text);
          docs.push({name:selectedFiles[i].name,type:detectType(selectedFiles[i].name,raw.text),pages:raw.pages,text:raw.text,dates:p.dates,codes:p.codes});
        }
        renderResults(docs); status.textContent="텍스트 추출 완료. 원문을 대조해 주세요.";
      } catch(e) {
        console.error("[심평원 분석]",e);
        status.textContent=e.passwordError?"PDF 비밀번호가 틀렸습니다. 해당 파일의 비밀번호를 확인한 뒤 다시 분석해 주세요.":"PDF 처리 오류: "+(e.message||"알 수 없는 오류");
      } finally {btn.disabled=false;}
    });
    renderFiles();
  };
})();