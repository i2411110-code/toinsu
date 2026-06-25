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