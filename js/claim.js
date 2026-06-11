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
    // 1. 모든 카드 활성화 해제 (기본 얇은 회색 테두리)
    document.querySelectorAll('.ins-select-card').forEach(card => {
        card.style.border = '1px solid #E5E8EB';
        card.style.background = 'white';
    });

    // 2. 누른 카드 활성화 (배경은 하얗게 유지, 파란색 테두리만 2px로 강조)
    cardElement.style.border = '2px solid #3182F6';
    cardElement.style.background = 'white';
    
    // 3. 선택된 회사명 저장
    window.selectedClaimInsurance = companyName;

    // 4. 하단 고정 버튼 활성화
    const nextBtn = document.getElementById('next-step-btn');
    if(nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.background = '#3182F6';
        nextBtn.style.color = 'white';
        nextBtn.style.cursor = 'pointer';
        nextBtn.innerText = companyName + ' 청구 진행하기';
        
        // 5. 다음 화면 이동 연결
        nextBtn.onclick = function() {
            // 1. 앞에 있던 '//' 를 지워서 화면 이동 코드를 살려줍니다.
            window.navigateTo('page-claim-form'); 
            
            // 2. 이제 알림창은 필요 없으니 지우셔도 됩니다.
            // alert(companyName + " 청구 폼으로 이동합니다."); 
        };
    }
};








// ==========================================
// [청구서 작성 폼 - 캔버스 및 PDF 전역 로직]
// ==========================================

// 1. 화면 뜰 때 초기화 (HTML의 img onerror에서 호출됨)
window.initClaimCanvas = function() {
    const company = window.selectedClaimInsurance || '선택안됨';
    const titleEl = document.getElementById('claim-form-title');
    if(titleEl) titleEl.innerText = company + ' 청구서 작성';

    const canvas = document.getElementById('signature-pad');
    if(!canvas) return;
    
    // 디스플레이 크기에 맞게 캔버스 픽셀 조정
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';
};

// 2. 서명 그리기 로직
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

// 3. 보험사별 PDF 생성 분기점
window.processClaimPDF = async function() {
    const company = window.selectedClaimInsurance;
    
    if (company === '현대해상') {
        await window.generateHyundai5PagePDF();
    } else {
        alert(company + ' 양식은 현재 등록 대기 중입니다. (현대해상 먼저 테스트해주세요!)');
    }
};

// 4. 현대해상 5페이지 합성 로직
window.generateHyundai5PagePDF = async function() {
    const btn = document.querySelector('button[onclick="window.processClaimPDF()"]');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 5단 청구서 생성 중...';
    btn.disabled = true;

    try {
        const { PDFDocument, rgb } = window.PDFLib; // CDN에서 로드된 pdf-lib 사용

        // ⚠️ 깃허브 경로에 맞게 파일 위치를 조정하세요
        const formUrl = './보험사 청구 양식지/hyundai.pdf'; 
        const fontUrl = './폰트/NotoSansKR-Black.otf';

        const [pdfBytes, fontBytes] = await Promise.all([
            fetch(formUrl).then(res => res.arrayBuffer()),
            fetch(fontUrl).then(res => res.arrayBuffer())
        ]);

        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(window.fontkit);
        const customFont = await pdfDoc.embedFont(fontBytes);
        const pages = pdfDoc.getPages();

        // 폼 데이터 수집
        const name = document.getElementById('form-name').value;
        const jumin = document.getElementById('form-jumin').value;
        const phone = document.getElementById('form-phone').value;
        const content = document.getElementById('form-content').value;

        // 오늘 날짜
        const today = new Date();
        const year = String(today.getFullYear());
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        // 텍스트 & 체크 스타일
        const txtOpt = { font: customFont, size: 11, color: rgb(0, 0, 0) };
        const checkOpt = { font: customFont, size: 14, color: rgb(0.15, 0.38, 0.92) };
        const checkMark = 'V';

        // 서명 이미지 변환
        const canvas = document.getElementById('signature-pad');
        const signDataUrl = canvas.toDataURL('image/png');
        let signImage = null;
        if (signDataUrl !== document.createElement('canvas').toDataURL('image/png')) {
            const signBytes = await fetch(signDataUrl).then(res => res.arrayBuffer());
            signImage = await pdfDoc.embedPng(signBytes);
        }
        const signOpt = { width: 60, height: 30 };

        // [1페이지] 인적사항
        pages[0].drawText(name, { x: 130, y: 720, ...txtOpt });
        pages[0].drawText(jumin, { x: 280, y: 720, ...txtOpt });
        pages[0].drawText(phone, { x: 130, y: 680, ...txtOpt });
        pages[0].drawText(content, { x: 130, y: 490, maxWidth: 300, lineHeight: 15, ...txtOpt });
        
        pages[0].drawText(year, { x: 150, y: 130, ...txtOpt });
        pages[0].drawText(month, { x: 210, y: 130, ...txtOpt });
        pages[0].drawText(day, { x: 250, y: 130, ...txtOpt });
        pages[0].drawText(name, { x: 350, y: 130, ...txtOpt });
        if (signImage) pages[0].drawImage(signImage, { x: 420, y: 120, ...signOpt });

        // [2~4페이지] 필수 동의 체크박스 (좌표는 실제 PDF에 맞춰 수정 필요)
        pages[1].drawText(checkMark, { x: 350, y: 600, ...checkOpt });
        pages[1].drawText(checkMark, { x: 350, y: 450, ...checkOpt });
        pages[1].drawText(checkMark, { x: 350, y: 300, ...checkOpt });
        
        pages[2].drawText(checkMark, { x: 350, y: 500, ...checkOpt }); 
        pages[3].drawText(checkMark, { x: 350, y: 650, ...checkOpt });

        // [5페이지] 최종 서명
        pages[4].drawText(year, { x: 180, y: 250, ...txtOpt });
        pages[4].drawText(month, { x: 230, y: 250, ...txtOpt });
        pages[4].drawText(day, { x: 280, y: 250, ...txtOpt });
        pages[4].drawText(name, { x: 350, y: 220, ...txtOpt });
        if (signImage) pages[4].drawImage(signImage, { x: 430, y: 210, ...signOpt });

        // 완성된 PDF 다운로드
        const pdfResultBytes = await pdfDoc.save();
        const blob = new Blob([pdfResultBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `현대해상_청구서_${name}.pdf`;
        link.click();

    } catch (error) {
        console.error("PDF 생성 오류:", error);
        alert("청구서 생성 중 오류가 발생했습니다. (경로나 파일명을 확인해주세요)");
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
};