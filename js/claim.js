// ==========================================
// [전체 보험사 공통 - 범용 1페이지 PDF 생성 로직]
// ==========================================
window.generateGenericPDF = async function(fileKey, companyName, mode) {
    mode = mode || 'preview';
    const { PDFDocument, rgb } = window.PDFLib;
    const { pdfBytes, fontBytes } = await loadPdfAndFont(null, fileKey);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const pages = pdfDoc.getPages();
    const page  = pages[0];

    // 1. 데이터 수집 및 주민번호 버그 수정 (slice(6)으로 7자리 모두 수집)
    const fd   = collectFormData();
    const date = getTodayDateFields();
    
    const cleanJumin = (fd.jumin || '').replace(/[^0-9]/g, '');
    const jm = {
        jumin1: cleanJumin.slice(0, 6),
        jumin2: cleanJumin.slice(6) // 뒤 끝까지 안전하게 자름 (기존 13 자름 오류 수정)
    };

    const sig = await getSignImage(pdfDoc, 'signature-pad'); // 피보험자 서명

    // 2. claim-coords.js 구조와 완벽 매핑
    const coords = { ...window.FIELD_COORDS.DEFAULT, ...(window.FIELD_COORDS[fileKey] || {}) };
    const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
    const checkOpt = { font: customFont, size: 13, color: rgb(0.15, 0.38, 0.92) };
    const CHECK = 'V';

    // 3. [DEBUG 구조 재현] 기본 조건 연산
    const isSameAsInsured = (fd.sameAsInsured === '예');
    const isUnder14 = (fd.insuredUnder14 === '예');
    
    // 9번째 로직의 'usesBenType' (수익자/대리인 지정 필요 여부) 트리 계산
    const usesBenType = isUnder14 || !isSameAsInsured;

    console.log(`[DEBUG] contact branch check - company: ${companyName}, usesBenType: ${usesBenType}, isSameAsInsured: ${isSameAsInsured}`);

    // 4. 피보험자 기본 정보 기입
    if (coords.name)    page.drawText(fd.insuredName, { x: coords.name.x,       y: coords.name.y,       ...txtOpt });
    if (coords.jumin1)  page.drawText(jm.jumin1,      { x: coords.jumin1.x,     y: coords.jumin1.y,     ...txtOpt });
    if (coords.jumin2)  page.drawText(jm.jumin2,      { x: coords.jumin2.x,     y: coords.jumin2.y,     ...txtOpt });
    if (coords.phone)   page.drawText(fd.phone,       { x: coords.phone.x,      y: coords.phone.y,      ...txtOpt });
    if (coords.content) page.drawText(fd.content,     { x: coords.content.x,    y: coords.content.y,    ...txtOpt });
    
    // 날짜
    if (coords.year2) page.drawText(date.year2, { x: coords.year2.x, y: coords.year2.y, ...txtOpt });
    if (coords.month) page.drawText(date.month, { x: coords.month.x, y: coords.month.y, ...txtOpt });
    if (coords.day)   page.drawText(date.day,   { x: coords.day.x,   y: coords.day.y,   ...txtOpt });
    
    if (coords.signerName) page.drawText(fd.insuredName, { x: coords.signerName.x, y: coords.signerName.y, ...txtOpt });

    // 5. 금융/계좌 정보 (텍스트 & 체크박스 동시 대응)
    if (coords.bankName && fd.bankName)       page.drawText(fd.bankName, { x: coords.bankName.x, y: coords.bankName.y, ...txtOpt });
    if (coords.account && fd.account)         page.drawText(fd.account, { x: coords.account.x, y: coords.account.y, ...txtOpt });
    if (coords.accountHolder && fd.accountHolder) page.drawText(fd.accountHolder, { x: coords.accountHolder.x, y: coords.accountHolder.y, ...txtOpt });

    // 계좌 유형 매핑 한글-영어 호환 처리
    if (coords.accountType) {
        const targetMark = coords.accountType[fd.accountType] || 
                           (fd.accountType === '일반' ? coords.accountType.general : 
                            fd.accountType === '기지급' ? coords.accountType.prepaid : coords.accountType.autoDebit);
        if (targetMark) page.drawText(CHECK, { x: targetMark.x, y: targetMark.y, ...checkOpt });
    }

    // 6. 만 14세 미만 여부 체크박스 표시
    if (coords.under14) {
        const mark = isUnder14 ? coords.under14.yes : coords.under14.no;
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    // 7. 보상안내 수령인 체크박스 표시
    if (coords.compensationRecipient) {
        const mark = (fd.compensationRecipient === '보험설계사') ? coords.compensationRecipient.agent : coords.compensationRecipient.claimant;
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    // 8. 피보험자 서명
    if (sig && coords.sign) {
        page.drawImage(sig, { x: coords.sign.x, y: coords.sign.y, width: coords.sign.width, height: coords.sign.height });
    }

    // 9. [핵심] 계약자가 다르거나 만 14세 미만 대리인(usesBenType) 처리 분기
    if (usesBenType && coords.contractor) {
        const c = coords.contractor;
        const cleanContractorJumin = (fd.contractorJumin || '').replace(/[^0-9]/g, '');
        const cjm = {
            jumin1: cleanContractorJumin.slice(0, 6),
            jumin2: cleanContractorJumin.slice(6)
        };
        
        // 계약자/대리인 서명 이미지 가져오기
        const contractorSig = await getSignImage(pdfDoc, 'signature-pad-contractor');

        if (c.name && fd.contractorName)   page.drawText(fd.contractorName,  { x: c.name.x,   y: c.name.y,   ...txtOpt });
        if (c.jumin1 && cjm.jumin1)        page.drawText(cjm.jumin1,         { x: c.jumin1.x, y: c.jumin1.y, ...txtOpt });
        if (c.jumin2 && cjm.jumin2)        page.drawText(cjm.jumin2,         { x: c.jumin2.x, y: c.jumin2.y, ...txtOpt });
        if (c.phone && fd.contractorPhone) page.drawText(fd.contractorPhone, { x: c.phone.x,  y: c.phone.y,  ...txtOpt });
        
        // 대리인 서명란 매핑
        if (contractorSig && c.sign) {
            page.drawImage(contractorSig, { x: c.sign.x, y: c.sign.y, width: c.sign.width, height: c.sign.height });
        }
        
        // 만약 양식에 '대리인 청구인 서명명' 텍스트 칸이 따로 잡혀 있다면 채워줌
        if (c.signerName && fd.contractorName) {
            page.drawText(fd.contractorName, { x: c.signerName.x, y: c.signerName.y, ...txtOpt });
        }
    }

    // PDF 다운로드/미리보기 출력
    const fileName = `${fd.insuredName || '청구서'}_${companyName || ''}.pdf`;
    await outputPdf(pdfDoc, mode, fileName);
};

// ==========================================
// [현대해상 - 5페이지 전용 로직 리팩토링]
// ==========================================
window.generateHyundai5PagePDF = async function(mode) {
    mode = mode || 'preview';
    const btn = mode === 'download'
        ? document.querySelector('button[onclick="window.downloadClaimPDF()"]')
        : document.querySelector('button[onclick="window.previewClaimPDF()"]');
    setPdfBtnLoading(btn, true);

    try {
        const { PDFDocument, rgb } = window.PDFLib;
        const { pdfBytes, fontBytes } = await loadPdfAndFont(null, 'hyundai');

        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(window.fontkit);
        const customFont = await pdfDoc.embedFont(fontBytes);
        const pages = pdfDoc.getPages();

        // 1. 데이터 수집 및 주민번호 버그 수정
        const fd   = collectFormData();
        const date = getTodayDateFields();
        
        const cleanJumin = (fd.jumin || '').replace(/[^0-9]/g, '');
        const jm = {
            jumin1: cleanJumin.slice(0, 6),
            jumin2: cleanJumin.slice(6) // 뒤 끝까지 안전하게 자름
        };

        const signImage = await getSignImage(pdfDoc, 'signature-pad'); // 피보험자 서명

        // 사고일 파생값
        const [ty, tm, td] = (fd.treatDate || '').split('-');
        const treat = {
            year2: ty ? ty.slice(2, 4) : '',
            month: tm || '',
            day:   td || '',
        };

        const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
        const checkOpt = { font: customFont, size: 14, color: rgb(0.15, 0.38, 0.92) };
        const checkMark = 'V';

        // 좌표 바인딩
        const C = window.HYUNDAI_COORDS;

        // ── 1페이지 기입 ──
        const p1 = C.page1;
        if (p1.name)    pages[0].drawText(fd.insuredName, { x: p1.name.x,       y: p1.name.y,       ...txtOpt });
        if (p1.jumin1)  pages[0].drawText(jm.jumin1,      { x: p1.jumin1.x,     y: p1.jumin1.y,     ...txtOpt });
        if (p1.jumin2)  pages[0].drawText(jm.jumin2,      { x: p1.jumin2.x,     y: p1.jumin2.y,     ...txtOpt });
        if (p1.phone)   pages[0].drawText(fd.phone,       { x: p1.phone.x,      y: p1.phone.y,      ...txtOpt });
        if (p1.content) pages[0].drawText(fd.content,     { x: p1.content.x,    y: p1.content.y,    ...txtOpt });
        if (p1.year2)   pages[0].drawText(treat.year2,    { x: p1.year2.x,      y: p1.year2.y,      ...txtOpt });
        if (p1.month)   pages[0].drawText(treat.month,    { x: p1.month.x,      y: p1.month.y,      ...txtOpt });
        if (p1.day)     pages[0].drawText(treat.day,      { x: p1.day.x,        y: p1.day.y,        ...txtOpt });
        
        if (fd.job && p1.job) {
            pages[0].drawText(fd.job, { x: p1.job.x, y: p1.job.y, ...txtOpt });
        }
        
        if (p1.signerName) pages[0].drawText(fd.insuredName, { x: p1.signerName.x, y: p1.signerName.y, ...txtOpt });
        if (signImage && p1.sign) {
            pages[0].drawImage(signImage, { x: p1.sign.x, y: p1.sign.y, width: p1.sign.width, height: p1.sign.height });
        }

        // 은행명, 계좌번호, 예금주 현대해상 1페이지 기입 보정
        if (fd.bankName && p1.bankName)     pages[0].drawText(fd.bankName, { x: p1.bankName.x, y: p1.bankName.y, ...txtOpt });
        if (fd.account && p1.account)       pages[0].drawText(fd.account,  { x: p1.account.x,  y: p1.account.y,  ...txtOpt });
        if (fd.accountHolder && p1.accountHolder) pages[0].drawText(fd.accountHolder, { x: p1.accountHolder.x, y: p1.accountHolder.y, ...txtOpt });

        // 관계 분기 연산 (isSameAsInsured, usesBenType 트래킹 로그 출력)
        const isSameAsInsured = (fd.sameAsInsured === '예');
        const isUnder14 = (fd.insuredUnder14 === '예');
        const usesBenType = isUnder14 || !isSameAsInsured;
        console.log(`[DEBUG] contact branch check - company: 현대해상, usesBenType: ${usesBenType}, isSameAsInsured: ${isSameAsInsured}`);

        // 계약자가 다르거나 만 14세 미만일 때 대리인 정보 추가 기입 (현대해상용 좌표 구조 대응)
        if (usesBenType && p1.contractor) {
            const pc = p1.contractor;
            const cleanContractorJumin = (fd.contractorJumin || '').replace(/[^0-9]/g, '');
            const cjm = {
                jumin1: cleanContractorJumin.slice(0, 6),
                jumin2: cleanContractorJumin.slice(6)
            };
            const contractorSig = await getSignImage(pdfDoc, 'signature-pad-contractor');

            if (pc.name && fd.contractorName)   pages[0].drawText(fd.contractorName,  { x: pc.name.x,   y: pc.name.y,   ...txtOpt });
            if (pc.jumin1 && cjm.jumin1)        pages[0].drawText(cjm.jumin1,         { x: pc.jumin1.x, y: pc.jumin1.y, ...txtOpt });
            if (pc.jumin2 && cjm.jumin2)        pages[0].drawText(cjm.jumin2,         { x: pc.jumin2.x, y: pc.jumin2.y, ...txtOpt });
            if (pc.phone && fd.contractorPhone) pages[0].drawText(fd.contractorPhone, { x: pc.phone.x,  y: pc.phone.y,  ...txtOpt });
            if (contractorSig && pc.sign) {
                pages[0].drawImage(contractorSig, { x: pc.sign.x, y: pc.sign.y, width: pc.sign.width, height: pc.sign.height });
            }
        }

        // ── 2 ~ 4페이지 동의서 체크마크 ──
        if (C.page2?.checkmarks) C.page2.checkmarks.forEach(m => pages[1].drawText(checkMark, { x: m.x, y: m.y, ...checkOpt }));
        if (C.page3?.checkmarks) C.page3.checkmarks.forEach(m => pages[2].drawText(checkMark, { x: m.x, y: m.y, ...checkOpt }));
        if (C.page4?.checkmarks) C.page4.checkmarks.forEach(m => pages[3].drawText(checkMark, { x: m.x, y: m.y, ...checkOpt }));

        // ── 5페이지 서명 및 날짜 기입 ──
        const p5 = C.page5;
        if (p5?.checkmarks) p5.checkmarks.forEach(m => pages[4].drawText(checkMark, { x: m.x, y: m.y, ...checkOpt }));
        
        if (p5) {
            if (p5.year)  pages[4].drawText(date.year,      { x: p5.year.x,  y: p5.year.y,  ...txtOpt });
            if (p5.month) pages[4].drawText(date.month,     { x: p5.month.x, y: p5.month.y, ...txtOpt });
            if (p5.day)   pages[4].drawText(date.day,       { x: p5.day.x,   y: p5.day.y,   ...txtOpt });
            if (p5.name)  pages[4].drawText(fd.insuredName, { x: p5.name.x,  y: p5.name.y,  ...txtOpt });
            if (signImage && p5.sign) {
                pages[4].drawImage(signImage, { x: p5.sign.x, y: p5.sign.y, width: p5.sign.width, height: p5.sign.height });
            }
            
            // 5페이지에 대리인/계약자 동의 서명란 좌표가 별도로 잡혀있다면 반영
            if (usesBenType && p5.contractorSign) {
                const contractorSig5 = await getSignImage(pdfDoc, 'signature-pad-contractor');
                if (contractorSig5) {
                    pages[4].drawImage(contractorSig5, { x: p5.contractorSign.x, y: p5.contractorSign.y, width: p5.contractorSign.width, height: p5.contractorSign.height });
                }
                if (p5.contractorName && fd.contractorName) {
                    pages[4].drawText(fd.contractorName, { x: p5.contractorName.x, y: p5.contractorName.y, ...txtOpt });
                }
            }
        }

        const fileName = `${fd.insuredName || '청구서'}_${window.selectedClaimInsurance || ''}.pdf`;
        await outputPdf(pdfDoc, mode, fileName);
    } catch (err) {
        console.error("현대해상 PDF 생성 에러:", err);
        alert("현대해상 PDF 생성 중 오류가 발생했습니다: " + err.message);
    } finally {
        setPdfBtnLoading(btn, false);
    }
};