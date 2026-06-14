// ==========================================
// [청구하기 - 보험사 선택 화면 전역 로직]
// ==========================================
window.selectedClaimInsurance = "";

window.switchClaimTab = function(clickedBtn, targetGridId) {
    const parent = clickedBtn.parentElement;
    parent.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#8B95A1';
        btn.style.border = 'none';
        btn.style.boxShadow = 'none';
    });
    
    clickedBtn.classList.add('active');
    clickedBtn.style.background = 'white';
    clickedBtn.style.color = '#3182F6';
    clickedBtn.style.border = '1px solid #3182F6';
    clickedBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    
    document.querySelectorAll('.ins-grid-container').forEach(grid => {
        grid.style.display = 'none';
    });
    
    const targetGrid = document.getElementById(targetGridId);
    if(targetGrid) {
        if(targetGridId === 'grid-liability') {
            targetGrid.style.display = 'block'; 
        } else {
            targetGrid.style.display = 'grid'; 
        }
    }
    window.resetClaimSelection();
};

window.resetClaimSelection = function() {
    window.selectedClaimInsurance = "";
    document.querySelectorAll('.ins-select-card').forEach(card => {
        card.style.borderColor = '#E5E8EB';
        card.style.background = 'white';
    });
    const nextBtn = document.getElementById('next-step-btn');
    if(nextBtn) {
        nextBtn.disabled = true;
        nextBtn.style.background = '#E5E8EB';
        nextBtn.style.color = '#8B95A1';
        nextBtn.style.cursor = 'not-allowed';
        nextBtn.innerText = '보험사를 선택해주세요';
    }
};

window.selectClaimCompany = function(cardElement, companyName) {
    document.querySelectorAll('.ins-select-card').forEach(card => {
        card.style.border = '1px solid #E5E8EB';
        card.style.background = 'white';
    });
    cardElement.style.border = '2px solid #3182F6';
    cardElement.style.background = 'white';
    window.selectedClaimInsurance = companyName;

    const nextBtn = document.getElementById('next-step-btn');
    if(nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.background = '#3182F6';
        nextBtn.style.color = 'white';
        nextBtn.style.cursor = 'pointer';
        nextBtn.innerText = companyName + ' 청구 진행하기';
        nextBtn.onclick = function() {
            window.navigateTo('page-claim-form'); 
        };
    }
};

// ==========================================
// [청구서 작성 폼 - 캔버스 및 PDF 전역 로직]
// ==========================================

// ─── 보험사명 → PDF 파일명 매핑 테이블 ───
// 보험사 선택 카드에서 넘어오는 companyName과 정확히 일치해야 합니다.
const CLAIM_PDF_MAP = {
    // ── 손해보험 ──
    '현대해상':          { file: 'hyundai',      pages: 5 },
    '삼성화재':          { file: 'samsung',      pages: 1 },
    'DB손해보험':        { file: 'db',           pages: 1 },
    'KB손해보험':        { file: 'kb',           pages: 1 },
    '메리츠화재':        { file: 'meritz',       pages: 1 },
    '롯데손보':          { file: 'lotte',        pages: 1 },
    'MG손보':            { file: 'mg',           pages: 1 },
    'NH손보':            { file: 'nh',           pages: 1 },
    '흥국화재':          { file: 'heungkuk',     pages: 1 },

    // ── 생명보험 ──
    '삼성생명':          { file: 'samsunglife',  pages: 1 },
    '한화생명':          { file: 'hanhwalife',   pages: 1 },
    '교보생명':          { file: 'kyobolife',    pages: 1 },
    '신한라이프':        { file: 'shinhanlife',  pages: 1 },
    'AIA생명':           { file: 'aialife',      pages: 1 },
    'ABL생명':           { file: 'abllife',      pages: 1 },
    'KDB생명':           { file: 'kdblife',      pages: 1 },
    'NH농협생명':        { file: 'nhlife',       pages: 1 },
    '하나생명':          { file: 'hanalife',     pages: 1 },
    '동양생명':          { file: 'dongyanglife', pages: 1 },
    '흥국생명':          { file: 'heungkuklife', pages: 1 },
    '라이나생명':        { file: 'linalife',     pages: 1 },
    'DB생명':            { file: 'dblife',       pages: 1 },
    'KB생명':            { file: 'kblife',       pages: 1 },
    '한화손보':          { file: 'hanhwa',       pages: 1 },
    '하나손보':          { file: 'hana',         pages: 1 },
    '미래에셋생명':      { file: 'miraeassetlife', pages: 1 },
    '흥국손보':          { file: 'heungkuk',     pages: 1 },
    'IM라이프':          { file: 'imlife',       pages: 1 },
    '라이나손보':        { file: 'lina',         pages: 1 },
    'KB손보':            { file: 'kb',           pages: 1 },
    'NH농협':            { file: 'nh',           pages: 1 },
    '에이스손보':        { file: 'chubblife',    pages: 1 },
    'BNP파리바카디프손보': { file: 'fubonlife',  pages: 1 },
    '우정사업본부':      { file: 'imlife',       pages: 1 },
};

// ─── 화면 초기화 ───
window.initClaimCanvas = function() {
    const company = window.selectedClaimInsurance || '선택안됨';
    const titleEl = document.getElementById('claim-form-title');
    if(titleEl) titleEl.innerText = company + ' 청구서 작성';

    const canvas = document.getElementById('signature-pad');
    if(!canvas) return;
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';
};

// ─── 서명 그리기 ───
window.isDrawingSign = false;
window.startSign = function(e) {
    if(e.type.includes('touch')) e.preventDefault();
    window.isDrawingSign = true;
    document.getElementById('sign-placeholder').style.display = 'none';
    window.drawSign(e);
};
window.stopSign = function() {
    window.isDrawingSign = false;
    const canvas = document.getElementById('signature-pad');
    if(canvas) canvas.getContext('2d').beginPath();
};
window.drawSign = function(e) {
    if (!window.isDrawingSign) return;
    if(e.type.includes('touch')) e.preventDefault();
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
};
window.clearSignature = function() {
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    document.getElementById('sign-placeholder').style.display = 'block';
};

// ─── 공통 폼 데이터 수집 ───
function collectFormData() {
    const name    = (document.getElementById('form-name')?.value    || '').trim();
    const phone   = (document.getElementById('form-phone')?.value   || '').trim();
    const content = (document.getElementById('form-content')?.value || '').trim();
    let   jumin   = (document.getElementById('form-jumin')?.value   || '').replace(/-/g, '');
    const jumin1  = jumin.slice(0, 6);
    const jumin2  = jumin.slice(6, 13);

    const today  = new Date();
    const year   = String(today.getFullYear());
    const year2  = year.slice(2, 4);
    const month  = String(today.getMonth() + 1).padStart(2, '0');
    const day    = String(today.getDate()).padStart(2, '0');

    return { name, phone, content, jumin, jumin1, jumin2, year, year2, month, day };
}

// ─── 서명 이미지 추출 ───
async function getSignImage(pdfDoc) {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return null;
    const signDataUrl = canvas.toDataURL('image/png');
    const blank = document.createElement('canvas').toDataURL('image/png');
    if (signDataUrl === blank) return null;
    const signBytes = await fetch(signDataUrl).then(r => r.arrayBuffer());
    return await pdfDoc.embedPng(signBytes);
}

// ─── PDF 로드 공통 헬퍼 ───
async function loadPdfAndFont(pdfDoc, fileKey) {
    const formUrl = `./forms/${fileKey}.pdf`;
    const fontUrl = 'fonts/noto-sans-kr/Noto_Sans_KR/NotoSansKR-Black.otf';

    const [pdfRes, fontRes] = await Promise.all([fetch(formUrl), fetch(fontUrl)]);

    if (!pdfRes.ok)  throw new Error(`PDF 양식을 찾을 수 없습니다: forms/${fileKey}.pdf`);
    if (!fontRes.ok) throw new Error('폰트 파일을 찾을 수 없습니다: fonts/noto-sans-kr/Noto_Sans_KR/NotoSansKR-Black.otf');

    const [pdfBytes, fontBytes] = await Promise.all([pdfRes.arrayBuffer(), fontRes.arrayBuffer()]);
    return { pdfBytes, fontBytes };
}

// ─── PDF 저장 & 새 탭 열기 ───
async function openPdfInNewTab(pdfDoc) {
    const resultBytes = await pdfDoc.save();
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
}

// ─── 버튼 로딩 상태 제어 ───
function setPdfBtnLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn._originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 청구서 생성 중...';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn._originalHTML || '청구서 PDF 생성';
        btn.disabled = false;
    }
}

// ==========================================
// [보험사별 PDF 생성 분기 - 진입점]
// ==========================================
window.processClaimPDF = async function() {
    const company = window.selectedClaimInsurance;
    const info    = CLAIM_PDF_MAP[company];
    const btn     = document.querySelector('button[onclick="window.processClaimPDF()"]');

    if (!info) {
        alert(`"${company}" 양식은 현재 등록 대기 중입니다.`);
        return;
    }

    setPdfBtnLoading(btn, true);
    try {
        // 현대해상은 5페이지 전용 함수, 나머지는 범용 1페이지 함수
        if (company === '현대해상') {
            await window.generateHyundai5PagePDF();
        } else {
            await window.generateGenericPDF(info.file, company);
        }
    } catch (error) {
        console.error('PDF 생성 오류:', error);
        alert('오류 원인:\n' + error.message);
    } finally {
        setPdfBtnLoading(btn, false);
    }
};

// ==========================================
// [현대해상 - 5페이지 전용 로직] (기존 유지)
// ==========================================
window.generateHyundai5PagePDF = async function() {
    const btn = document.querySelector('button[onclick="window.processClaimPDF()"]');
    setPdfBtnLoading(btn, true);

    try {
        const { PDFDocument, rgb } = window.PDFLib;
        const { pdfBytes, fontBytes } = await loadPdfAndFont(null, 'hyundai');

        // PDFDocument는 load 후 font 등록이므로 별도 생성
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(window.fontkit);
        const customFont = await pdfDoc.embedFont(fontBytes);
        const pages = pdfDoc.getPages();

        const fd = collectFormData();
        const signImage = await getSignImage(pdfDoc);

        const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
        const checkOpt = { font: customFont, size: 14, color: rgb(0.15, 0.38, 0.92) };
        const checkMark = 'V';

        // ── 1페이지 ──
        pages[0].drawText(fd.name,   { x: 145, y: 583, ...txtOpt });
        pages[0].drawText(fd.jumin1, { x: 270, y: 583, ...txtOpt });
        pages[0].drawText(fd.jumin2, { x: 400, y: 583, ...txtOpt });
        pages[0].drawText(fd.phone,  { x: 145, y: 493, ...txtOpt });
        pages[0].drawText(fd.content,{ x: 240, y: 213, ...txtOpt });
        pages[0].drawText(fd.year2,  { x: 110, y: 412, ...txtOpt });
        pages[0].drawText(fd.month,  { x: 165, y: 412, ...txtOpt });
        pages[0].drawText(fd.day,    { x: 215, y: 412, ...txtOpt });
        pages[0].drawText(fd.name,   { x: 430, y: 412, ...txtOpt });
        if (signImage) pages[0].drawImage(signImage, { x: 500, y: 405, width: 60, height: 22 });

        // ── 2페이지 (동의 3개) ──
        pages[1].drawText(checkMark, { x: 513, y: 416, ...checkOpt });
        pages[1].drawText(checkMark, { x: 513, y: 311, ...checkOpt });
        pages[1].drawText(checkMark, { x: 513, y: 188, ...checkOpt });

        // ── 3페이지 (국내제공 2개) ──
        pages[2].drawText(checkMark, { x: 513, y: 288, ...checkOpt });
        pages[2].drawText(checkMark, { x: 513, y: 188, ...checkOpt });

        // ── 4페이지 (일반개인정보/국외이전 3개) ──
        pages[3].drawText(checkMark, { x: 513, y: 645, ...checkOpt });
        pages[3].drawText(checkMark, { x: 513, y: 226, ...checkOpt });
        pages[3].drawText(checkMark, { x: 513, y: 134, ...checkOpt });

        // ── 5페이지 (조회 동의 3개 + 날짜 + 서명) ──
        pages[4].drawText(checkMark, { x: 513, y: 564, ...checkOpt });
        pages[4].drawText(checkMark, { x: 513, y: 518, ...checkOpt });
        pages[4].drawText(checkMark, { x: 513, y: 429, ...checkOpt });
        pages[4].drawText(fd.year,   { x: 230, y: 381, ...txtOpt });
        pages[4].drawText(fd.month,  { x: 340, y: 381, ...txtOpt });
        pages[4].drawText(fd.day,    { x: 460, y: 381, ...txtOpt });
        pages[4].drawText(fd.name,   { x: 200, y: 320, ...txtOpt });
        if (signImage) pages[4].drawImage(signImage, { x: 460, y: 295, width: 70, height: 25 });

        await openPdfInNewTab(pdfDoc);

    } finally {
        setPdfBtnLoading(btn, false);
    }
};

// ==========================================
// [범용 1페이지 PDF 생성 - 기본 필드 자동 기입]
// 각 보험사 양식의 좌표가 다를 수 있으므로,
// 아래 FIELD_COORDS 테이블에서 보험사별로 좌표를 관리합니다.
// ==========================================

// ─── 보험사별 필드 좌표 테이블 ───
// 추후 각 PDF를 열어 좌표를 확인한 뒤 보험사별로 덮어쓰세요.
// 미설정 보험사는 DEFAULT 좌표가 적용됩니다.
const FIELD_COORDS = {

    DEFAULT: {
        name:    { x: 145, y: 650 },
        jumin1:  { x: 270, y: 650 },
        jumin2:  { x: 370, y: 650 },
        phone:   { x: 145, y: 600 },
        content: { x: 145, y: 400 },
        year2:   { x: 110, y: 130 },
        month:   { x: 160, y: 130 },
        day:     { x: 205, y: 130 },
        signerName: { x: 370, y: 130 },
        sign:    { x: 430, y: 118, width: 70, height: 25 },
    },

    // ── 삼성화재 ──
    samsung: {
        name:    { x: 140, y: 648 },
        jumin1:  { x: 260, y: 648 },
        jumin2:  { x: 355, y: 648 },
        phone:   { x: 140, y: 598 },
        content: { x: 140, y: 390 },
        year2:   { x: 105, y: 128 },
        month:   { x: 158, y: 128 },
        day:     { x: 203, y: 128 },
        signerName: { x: 365, y: 128 },
        sign:    { x: 430, y: 115, width: 65, height: 22 },
    },

    // ── DB손해보험 ──
    db: {
        name:    { x: 140, y: 645 },
        jumin1:  { x: 258, y: 645 },
        jumin2:  { x: 353, y: 645 },
        phone:   { x: 140, y: 595 },
        content: { x: 140, y: 385 },
        year2:   { x: 107, y: 126 },
        month:   { x: 160, y: 126 },
        day:     { x: 205, y: 126 },
        signerName: { x: 368, y: 126 },
        sign:    { x: 432, y: 113, width: 65, height: 22 },
    },

    // ── KB손해보험 ──
    kb: {
        name:    { x: 143, y: 647 },
        jumin1:  { x: 262, y: 647 },
        jumin2:  { x: 357, y: 647 },
        phone:   { x: 143, y: 597 },
        content: { x: 143, y: 388 },
        year2:   { x: 108, y: 127 },
        month:   { x: 161, y: 127 },
        day:     { x: 206, y: 127 },
        signerName: { x: 370, y: 127 },
        sign:    { x: 433, y: 114, width: 65, height: 22 },
    },

    // ── 메리츠화재 ──
    meritz: {
        name:    { x: 141, y: 643 },
        jumin1:  { x: 259, y: 643 },
        jumin2:  { x: 354, y: 643 },
        phone:   { x: 141, y: 593 },
        content: { x: 141, y: 383 },
        year2:   { x: 106, y: 124 },
        month:   { x: 159, y: 124 },
        day:     { x: 204, y: 124 },
        signerName: { x: 366, y: 124 },
        sign:    { x: 430, y: 111, width: 65, height: 22 },
    },

    // ── 롯데손보 ──
    lotte: {
        name:    { x: 138, y: 640 },
        jumin1:  { x: 256, y: 640 },
        jumin2:  { x: 351, y: 640 },
        phone:   { x: 138, y: 590 },
        content: { x: 138, y: 380 },
        year2:   { x: 103, y: 121 },
        month:   { x: 156, y: 121 },
        day:     { x: 201, y: 121 },
        signerName: { x: 363, y: 121 },
        sign:    { x: 427, y: 108, width: 65, height: 22 },
    },

    // ── MG손보 ──
    mg: {
        name:    { x: 140, y: 642 },
        jumin1:  { x: 258, y: 642 },
        jumin2:  { x: 353, y: 642 },
        phone:   { x: 140, y: 592 },
        content: { x: 140, y: 382 },
        year2:   { x: 105, y: 123 },
        month:   { x: 158, y: 123 },
        day:     { x: 203, y: 123 },
        signerName: { x: 365, y: 123 },
        sign:    { x: 429, y: 110, width: 65, height: 22 },
    },

    // ── NH손보 ──
    nh: {
        name:    { x: 142, y: 646 },
        jumin1:  { x: 260, y: 646 },
        jumin2:  { x: 355, y: 646 },
        phone:   { x: 142, y: 596 },
        content: { x: 142, y: 386 },
        year2:   { x: 107, y: 125 },
        month:   { x: 160, y: 125 },
        day:     { x: 205, y: 125 },
        signerName: { x: 367, y: 125 },
        sign:    { x: 431, y: 112, width: 65, height: 22 },
    },

    // ── 흥국화재 ──
    heungkuk: {
        name:    { x: 139, y: 641 },
        jumin1:  { x: 257, y: 641 },
        jumin2:  { x: 352, y: 641 },
        phone:   { x: 139, y: 591 },
        content: { x: 139, y: 381 },
        year2:   { x: 104, y: 122 },
        month:   { x: 157, y: 122 },
        day:     { x: 202, y: 122 },
        signerName: { x: 364, y: 122 },
        sign:    { x: 428, y: 109, width: 65, height: 22 },
    },

    // ── 삼성생명 ──
    samsunglife: {
        name:    { x: 143, y: 649 },
        jumin1:  { x: 261, y: 649 },
        jumin2:  { x: 356, y: 649 },
        phone:   { x: 143, y: 599 },
        content: { x: 143, y: 389 },
        year2:   { x: 108, y: 128 },
        month:   { x: 161, y: 128 },
        day:     { x: 206, y: 128 },
        signerName: { x: 369, y: 128 },
        sign:    { x: 432, y: 115, width: 65, height: 22 },
    },

    // ── 한화생명 ──
    hanhwalife: {
        name:    { x: 141, y: 647 },
        jumin1:  { x: 259, y: 647 },
        jumin2:  { x: 354, y: 647 },
        phone:   { x: 141, y: 597 },
        content: { x: 141, y: 387 },
        year2:   { x: 106, y: 126 },
        month:   { x: 159, y: 126 },
        day:     { x: 204, y: 126 },
        signerName: { x: 367, y: 126 },
        sign:    { x: 431, y: 113, width: 65, height: 22 },
    },

    // ── 교보생명 ──
    kyobolife: {
        name:    { x: 144, y: 650 },
        jumin1:  { x: 262, y: 650 },
        jumin2:  { x: 357, y: 650 },
        phone:   { x: 144, y: 600 },
        content: { x: 144, y: 390 },
        year2:   { x: 109, y: 129 },
        month:   { x: 162, y: 129 },
        day:     { x: 207, y: 129 },
        signerName: { x: 371, y: 129 },
        sign:    { x: 434, y: 116, width: 65, height: 22 },
    },

    // ── 신한라이프 ──
    shinhanlife: {
        name:    { x: 142, y: 648 },
        jumin1:  { x: 260, y: 648 },
        jumin2:  { x: 355, y: 648 },
        phone:   { x: 142, y: 598 },
        content: { x: 142, y: 388 },
        year2:   { x: 107, y: 127 },
        month:   { x: 160, y: 127 },
        day:     { x: 205, y: 127 },
        signerName: { x: 368, y: 127 },
        sign:    { x: 432, y: 114, width: 65, height: 22 },
    },

    // ── AIA생명 ──
    aialife: {
        name:    { x: 140, y: 646 },
        jumin1:  { x: 258, y: 646 },
        jumin2:  { x: 353, y: 646 },
        phone:   { x: 140, y: 596 },
        content: { x: 140, y: 386 },
        year2:   { x: 105, y: 125 },
        month:   { x: 158, y: 125 },
        day:     { x: 203, y: 125 },
        signerName: { x: 366, y: 125 },
        sign:    { x: 430, y: 112, width: 65, height: 22 },
    },

    // ── ABL생명 ──
    abllife: {
        name:    { x: 139, y: 645 },
        jumin1:  { x: 257, y: 645 },
        jumin2:  { x: 352, y: 645 },
        phone:   { x: 139, y: 595 },
        content: { x: 139, y: 385 },
        year2:   { x: 104, y: 124 },
        month:   { x: 157, y: 124 },
        day:     { x: 202, y: 124 },
        signerName: { x: 365, y: 124 },
        sign:    { x: 429, y: 111, width: 65, height: 22 },
    },

    // ── KDB생명 ──
    kdblife: {
        name:    { x: 141, y: 647 },
        jumin1:  { x: 259, y: 647 },
        jumin2:  { x: 354, y: 647 },
        phone:   { x: 141, y: 597 },
        content: { x: 141, y: 387 },
        year2:   { x: 106, y: 126 },
        month:   { x: 159, y: 126 },
        day:     { x: 204, y: 126 },
        signerName: { x: 367, y: 126 },
        sign:    { x: 431, y: 113, width: 65, height: 22 },
    },

    // ── NH농협생명 ──
    nhlife: {
        name:    { x: 143, y: 649 },
        jumin1:  { x: 261, y: 649 },
        jumin2:  { x: 356, y: 649 },
        phone:   { x: 143, y: 599 },
        content: { x: 143, y: 389 },
        year2:   { x: 108, y: 128 },
        month:   { x: 161, y: 128 },
        day:     { x: 206, y: 128 },
        signerName: { x: 370, y: 128 },
        sign:    { x: 433, y: 115, width: 65, height: 22 },
    },

    // ── 하나생명 ──
    hanalife: {
        name:    { x: 140, y: 644 },
        jumin1:  { x: 258, y: 644 },
        jumin2:  { x: 353, y: 644 },
        phone:   { x: 140, y: 594 },
        content: { x: 140, y: 384 },
        year2:   { x: 105, y: 123 },
        month:   { x: 158, y: 123 },
        day:     { x: 203, y: 123 },
        signerName: { x: 366, y: 123 },
        sign:    { x: 430, y: 110, width: 65, height: 22 },
    },

    // ── 동양생명 ──
    dongyanglife: {
        name:    { x: 138, y: 643 },
        jumin1:  { x: 256, y: 643 },
        jumin2:  { x: 351, y: 643 },
        phone:   { x: 138, y: 593 },
        content: { x: 138, y: 383 },
        year2:   { x: 103, y: 122 },
        month:   { x: 156, y: 122 },
        day:     { x: 201, y: 122 },
        signerName: { x: 364, y: 122 },
        sign:    { x: 428, y: 109, width: 65, height: 22 },
    },

    // ── 흥국생명 ──
    heungkuklife: {
        name:    { x: 139, y: 641 },
        jumin1:  { x: 257, y: 641 },
        jumin2:  { x: 352, y: 641 },
        phone:   { x: 139, y: 591 },
        content: { x: 139, y: 381 },
        year2:   { x: 104, y: 120 },
        month:   { x: 157, y: 120 },
        day:     { x: 202, y: 120 },
        signerName: { x: 364, y: 120 },
        sign:    { x: 428, y: 107, width: 65, height: 22 },
    },

    // ── 라이나생명 ──
    linalife: {
        name:    { x: 140, y: 642 },
        jumin1:  { x: 258, y: 642 },
        jumin2:  { x: 353, y: 642 },
        phone:   { x: 140, y: 592 },
        content: { x: 140, y: 382 },
        year2:   { x: 105, y: 121 },
        month:   { x: 158, y: 121 },
        day:     { x: 203, y: 121 },
        signerName: { x: 365, y: 121 },
        sign:    { x: 429, y: 108, width: 65, height: 22 },
    },

    // ── DB생명 ──
    dblife: {
        name:    { x: 139, y: 643 },
        jumin1:  { x: 257, y: 643 },
        jumin2:  { x: 352, y: 643 },
        phone:   { x: 139, y: 593 },
        content: { x: 139, y: 383 },
        year2:   { x: 104, y: 122 },
        month:   { x: 157, y: 122 },
        day:     { x: 202, y: 122 },
        signerName: { x: 364, y: 122 },
        sign:    { x: 428, y: 109, width: 65, height: 22 },
    },

    // ── KB생명 ──
    kblife: {
        name:    { x: 141, y: 645 },
        jumin1:  { x: 259, y: 645 },
        jumin2:  { x: 354, y: 645 },
        phone:   { x: 141, y: 595 },
        content: { x: 141, y: 385 },
        year2:   { x: 106, y: 124 },
        month:   { x: 159, y: 124 },
        day:     { x: 204, y: 124 },
        signerName: { x: 366, y: 124 },
        sign:    { x: 430, y: 111, width: 65, height: 22 },
    },

    // ── 한화손보 ──
    hanhwa: {
        name:    { x: 140, y: 644 },
        jumin1:  { x: 258, y: 644 },
        jumin2:  { x: 353, y: 644 },
        phone:   { x: 140, y: 594 },
        content: { x: 140, y: 384 },
        year2:   { x: 105, y: 123 },
        month:   { x: 158, y: 123 },
        day:     { x: 203, y: 123 },
        signerName: { x: 365, y: 123 },
        sign:    { x: 429, y: 110, width: 65, height: 22 },
    },

    // ── 하나손보 ──
    hana: {
        name:    { x: 139, y: 643 },
        jumin1:  { x: 257, y: 643 },
        jumin2:  { x: 352, y: 643 },
        phone:   { x: 139, y: 593 },
        content: { x: 139, y: 383 },
        year2:   { x: 104, y: 122 },
        month:   { x: 157, y: 122 },
        day:     { x: 202, y: 122 },
        signerName: { x: 364, y: 122 },
        sign:    { x: 428, y: 109, width: 65, height: 22 },
    },

    // ── 미래에셋생명 ──
    miraeassetlife: {
        name:    { x: 142, y: 647 },
        jumin1:  { x: 260, y: 647 },
        jumin2:  { x: 355, y: 647 },
        phone:   { x: 142, y: 597 },
        content: { x: 142, y: 387 },
        year2:   { x: 107, y: 126 },
        month:   { x: 160, y: 126 },
        day:     { x: 205, y: 126 },
        signerName: { x: 368, y: 126 },
        sign:    { x: 432, y: 113, width: 65, height: 22 },
    },

    // ── IM라이프 / 우정사업본부 (공용) ──
    imlife: {
        name:    { x: 138, y: 641 },
        jumin1:  { x: 256, y: 641 },
        jumin2:  { x: 351, y: 641 },
        phone:   { x: 138, y: 591 },
        content: { x: 138, y: 381 },
        year2:   { x: 103, y: 120 },
        month:   { x: 156, y: 120 },
        day:     { x: 201, y: 120 },
        signerName: { x: 363, y: 120 },
        sign:    { x: 427, y: 107, width: 65, height: 22 },
    },

    // ── 라이나손보 ──
    lina: {
        name:    { x: 140, y: 642 },
        jumin1:  { x: 258, y: 642 },
        jumin2:  { x: 353, y: 642 },
        phone:   { x: 140, y: 592 },
        content: { x: 140, y: 382 },
        year2:   { x: 105, y: 121 },
        month:   { x: 158, y: 121 },
        day:     { x: 203, y: 121 },
        signerName: { x: 365, y: 121 },
        sign:    { x: 429, y: 108, width: 65, height: 22 },
    },

    // ── 에이스손보 (Chubb) ──
    chubblife: {
        name:    { x: 141, y: 645 },
        jumin1:  { x: 259, y: 645 },
        jumin2:  { x: 354, y: 645 },
        phone:   { x: 141, y: 595 },
        content: { x: 141, y: 385 },
        year2:   { x: 106, y: 124 },
        month:   { x: 159, y: 124 },
        day:     { x: 204, y: 124 },
        signerName: { x: 367, y: 124 },
        sign:    { x: 431, y: 111, width: 65, height: 22 },
    },

    // ── BNP파리바카디프손보 (Fubon) ──
    fubonlife: {
        name:    { x: 140, y: 644 },
        jumin1:  { x: 258, y: 644 },
        jumin2:  { x: 353, y: 644 },
        phone:   { x: 140, y: 594 },
        content: { x: 140, y: 384 },
        year2:   { x: 105, y: 123 },
        month:   { x: 158, y: 123 },
        day:     { x: 203, y: 123 },
        signerName: { x: 365, y: 123 },
        sign:    { x: 429, y: 110, width: 65, height: 22 },
    },
};

// ─── 범용 1페이지 PDF 생성 ───
window.generateGenericPDF = async function(fileKey, companyName) {
    const { PDFDocument, rgb } = window.PDFLib;

    const { pdfBytes, fontBytes } = await loadPdfAndFont(null, fileKey);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const pages = pdfDoc.getPages();
    const page  = pages[0]; // 기본 1페이지 기입

    const fd  = collectFormData();
    const sig = await getSignImage(pdfDoc);

    // 좌표: 해당 보험사 전용 → 없으면 DEFAULT
    const coords = { ...FIELD_COORDS.DEFAULT, ...(FIELD_COORDS[fileKey] || {}) };

    const txtOpt = { font: customFont, size: 11, color: rgb(0, 0, 0) };

    // 피보험자 성명
    page.drawText(fd.name,    { x: coords.name.x,    y: coords.name.y,    ...txtOpt });
    // 주민번호 앞/뒤
    page.drawText(fd.jumin1,  { x: coords.jumin1.x,  y: coords.jumin1.y,  ...txtOpt });
    page.drawText(fd.jumin2,  { x: coords.jumin2.x,  y: coords.jumin2.y,  ...txtOpt });
    // 연락처
    page.drawText(fd.phone,   { x: coords.phone.x,   y: coords.phone.y,   ...txtOpt });
    // 치료경위/사고내용
    page.drawText(fd.content, { x: coords.content.x, y: coords.content.y, ...txtOpt });
    // 작성일자
    page.drawText(fd.year2,   { x: coords.year2.x,   y: coords.year2.y,   ...txtOpt });
    page.drawText(fd.month,   { x: coords.month.x,   y: coords.month.y,   ...txtOpt });
    page.drawText(fd.day,     { x: coords.day.x,     y: coords.day.y,     ...txtOpt });
    // 청구인 성명
    page.drawText(fd.name,    { x: coords.signerName.x, y: coords.signerName.y, ...txtOpt });
    // 서명
    if (sig) {
        page.drawImage(sig, {
            x: coords.sign.x, y: coords.sign.y,
            width: coords.sign.width, height: coords.sign.height,
        });
    }

    await openPdfInNewTab(pdfDoc);
};