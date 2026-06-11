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
        const { PDFDocument, rgb } = window.PDFLib; 

        // 폰트와 양식 경로
        const formUrl = './forms/hyundai.pdf'; 
        const fontUrl = 'fonts/noto-sans-kr/Noto_Sans_KR/NotoSansKR-Black.otf'; 

        // 파일 다운로드 시도
        const pdfRes = await fetch(formUrl);
        const fontRes = await fetch(fontUrl);

        // 파일이 없을 경우 에러 메시지
        if (!pdfRes.ok) {
            throw new Error(`현대해상 PDF 양식을 찾을 수 없습니다.\n깃허브에 forms 폴더와 hyundai.pdf 파일이 있는지 확인하세요.`);
        }
        if (!fontRes.ok) {
            throw new Error(`폰트 파일을 찾을 수 없습니다.\n깃허브에 fonts 폴더와 NotoSansKR-Black.otf 파일이 있는지 확인하세요.`);
        }

        // [문제 해결] 중복 선언된 코드를 하나로 깔끔하게 정리했습니다!
        const [pdfBytes, fontBytes] = await Promise.all([
            pdfRes.arrayBuffer(),
            fontRes.arrayBuffer()
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

        // 피보험자 성명 - 라벨("성 명")과 겹치지 않게, 셀 중앙: x:120.7~205.3, y:577.2~599.8
        pages[0].drawText(name, { x: 145, y: 584, size: 11, ...txtOpt });

        // 주민번호 - 셀 x:250.6~567.4 (폭 316.8), y:577.2~599.8
        // 13자리를 칸처럼 보이게 자간을 줘서 한 글자씩 출력
        // [수정됨] 하드코딩된 변수 중복 선언 제거, 상단에서 수집한 jumin 변수 사용
        const juminFull = jumin.slice(0,6) + "-" + jumin.slice(6); // 표시용
        let jx = 270;
        for (const ch of juminFull) {
          pages[0].drawText(ch, { x: jx, y: 584, size: 11, ...txtOpt });
          jx += 16; // 글자 간격(칸 너비)
        }

        // 연락처 - 셀 x:120.7~401.9, y:486.8~509.4
        // [수정됨] 하드코딩된 변수 중복 선언 제거, 상단에서 수집한 phone 변수 사용
        let px = 145;
        for (const ch of phone) {
          pages[0].drawText(ch, { x: px, y: 494, size: 11, ...txtOpt });
          px += 17;
        }

        // 작성일자 - "20"은 인쇄돼있으므로 26/06/11만, y:372.2~404.4 행, x:81.1~333.6 영역 안에서
        // "20 년 월 일" 라벨 위치에 맞춰 숫자만 겹쳐쓰기
        pages[0].drawText("26", { x: 110, y: 382, size: 11, ...txtOpt });
        pages[0].drawText(month, { x: 165, y: 382, size: 11, ...txtOpt });
        pages[0].drawText(day, { x: 215, y: 382, size: 11, ...txtOpt });

        // 보험금청구인(대리인) 성명 - x:380.4~562.3, y:372.2~404.4 셀, "성 명" 라벨 위에 겹치게
        // [수정됨] 존재하지 않는 boldFont 제거
        pages[0].drawText(name, { x: 430, y: 388, size: 12, ...txtOpt });

        // (서명) 위에 겹쳐서, 굵게
        if (signImage) {
          pages[0].drawImage(signImage, { x: 500, y: 376, width: 55, height: 22 });
        }

        // 보험금청구인(대리인) 성명 - 셀 x:380.4~562.3, y:404.4~427.0
        // "성 명" 글자 위에 겹치도록 같은 좌표
        // [수정됨] 존재하지 않는 boldFont 제거
        pages[0].drawText(name, { x: 430, y: 412, ...txtOpt });
        // 서명 - "(서명)" 칸 위에 겹쳐서, 더 두꺼운 폰트로
        if (signImage) pages[0].drawImage(signImage, { x: 500, y: 405, width: 60, height: 22 });

        // 2페이지(원본 pages[1]) - 동의 항목 3개
        pages[1].drawText(checkMark, { x: 513, y: 416, ...checkOpt }); // 고유식별정보
        pages[1].drawText(checkMark, { x: 513, y: 311, ...checkOpt }); // 민감정보
        pages[1].drawText(checkMark, { x: 513, y: 188, ...checkOpt }); // 개인(신용)정보

        // 3페이지(원본 pages[2]) - 국내제공 2개
        pages[2].drawText(checkMark, { x: 513, y: 288, ...checkOpt }); // 고유식별정보 제공
        pages[2].drawText(checkMark, { x: 513, y: 188, ...checkOpt }); // 민감정보 제공

        // 4페이지(원본 pages[3]) - 일반개인정보/국외이전 4개
        pages[3].drawText(checkMark, { x: 513, y: 645, ...checkOpt }); // 일반개인정보 제공
        pages[3].drawText(checkMark, { x: 513, y: 226, ...checkOpt }); // 민감정보(국외)
        pages[3].drawText(checkMark, { x: 513, y: 134, ...checkOpt }); // 개인(신용)정보(국외)
        // (참고: 4페이지에 항목이 더 있을 수 있으니 페이지 텍스트 재확인 필요)

        // 5페이지(원본 pages[4]) - 조회 동의 3개
        pages[4].drawText(checkMark, { x: 513, y: 564, ...checkOpt }); // 고유식별정보 조회
        pages[4].drawText(checkMark, { x: 513, y: 518, ...checkOpt }); // 민감정보 조회
        pages[4].drawText(checkMark, { x: 513, y: 429, ...checkOpt }); // 개인(신용)정보 조회

        // 동의일자 - 칸 한 개당 숫자 한 개, y: 362.7~385.3
        const yearDigits = year, monthDigits=month, dayDigits=day;
        const yearX = [117, 156, 195, 234];
        const monthX = [301, 341];
        const dayX = [408, 447];
        yearDigits.split('').forEach((d,i)=> pages[4].drawText(d, {x: yearX[i]+8, y: 369, size: 11, ...txtOpt}));
        monthDigits.split('').forEach((d,i)=> pages[4].drawText(d, {x: monthX[i]+8, y: 369, size: 11, ...txtOpt}));
        dayDigits.split('').forEach((d,i)=> pages[4].drawText(d, {x: dayX[i]+8, y: 369, size: 11, ...txtOpt}));

        // 동의자 본인 - 성명 셀 x:89.6~212.4, 서명 셀 x:419.7~554.1, y:275.8~315.3
        // "성 명" / "서 명" 글자 위에 겹쳐 쓰기
        // [수정됨] 존재하지 않는 boldFont 제거
        pages[4].drawText(name, { x: 130, y: 290, size: 12, ...txtOpt });
        if (signImage) pages[4].drawImage(signImage, { x: 460, y: 283, width: 70, height: 25 });

        // 완성된 PDF 미리보기 (새 탭에서 열기)
        const pdfResultBytes = await pdfDoc.save();
        const blob = new Blob([pdfResultBytes], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);
        
        // 브라우저의 새 창/새 탭에서 PDF를 바로 띄워줍니다.
        window.open(pdfUrl, '_blank');

    } catch (error) {
        console.error("PDF 생성 오류:", error);
        alert("오류 원인:\n" + error.message);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
};