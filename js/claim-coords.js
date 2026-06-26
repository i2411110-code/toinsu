// ==========================================
// [보험사별 PDF 필드 좌표 설정 파일]
// ------------------------------------------
// claim.js 보다 먼저 <script> 로 로드되어야 합니다.
//   <script src="claim-coords.js"></script>
//   <script src="claim.js"></script>
//
// DB손보 등 특정 보험사의 양식이 갱신되어 좌표가 틀어졌다면
// 이 파일에서 해당 보험사 키(예: db, kb, samsung ...)의 숫자만 수정하면 됩니다.
// 모든 보험사 항목은 DEFAULT 좌표를 기준으로 병합되므로,
// 일부 필드만 다르면 그 필드만 적어주면 됩니다.
// ==========================================
//
// 🖊️ [서명(sign) 좌표 일괄 업데이트 - 2026-06-22]
// React 폼빌더 데이터(좌표.js)의 보험사별 1페이지(page:0) 서명 필드를 기준으로
// 각 보험사의 sign.x / sign.y 값만 갱신했습니다. (width/height는 기존 값 유지)
// 보험사별로 좌표.js에서 실제 사용한 필드명은 아래와 같습니다.
//   claimantSignature        → kb, meritz, lotte, nh, heungkuk, samsunglife,
//                               hanhwalife, kyobolife, shinhanlife, abllife,
//                               kdblife, nhlife, dongyanglife, heungkuklife,
//                               linalife, dblife, kblife, miraeassetlife,
//                               imlife, fubonlife
//   page1InsuredSignature     → samsung, db, hanhwa, hana
//   page1BeneficiarySignature → mg(새마을금고공제), aialife
//   signatureImage            → chubblife (실제 서명 "이미지" 좌표라 가장 정확)
// ⚠️ mg 키는 좌표.js의 "새마을금고공제" 항목으로 매칭했습니다(보험사명이 그대로
//    일치하지 않아 추정 매칭이니, 실제 양식과 한 번 대조해 보시는 걸 권장합니다).
// ⚠️ hanalife(하나생명), lina(라이나손해보험)는 좌표.js에 1페이지(page:0) 서명
//    필드 자체가 없어서(다른 페이지에만 존재) 임의로 추정하지 않고 기존 값을
//    그대로 두었습니다 — 아래 해당 줄의 주석 참고, 수동 확인이 필요합니다.
// ==========================================

window.FIELD_COORDS = {
    DEFAULT: {
        // ── 피보험자 기본 정보 ──
        name:       { x: 145, y: 650 },
        juminStart: { x: 264, y: 650 }, // 주민번호 맨 앞자리(1번째) x,y
        juminGap: 20,                   // 글자 사이의 기본 간격 (픽셀)
        phone:      { x: 145, y: 600 },
        job:        { x: 145, y: 625 },
        content:    { x: 145, y: 400 },
        year2:      { x: 110, y: 130 },
        month:      { x: 160, y: 130 },
        day:        { x: 205, y: 130 },
        signerName: { x: 370, y: 130 },
        sign:       { x: 430, y: 118, width: 70, height: 25 },

        // ── 계좌정보 ──
        bankName:     { x: 145, y: 300 },
        account:      { x: 250, y: 300 },
        accountHolder:{ x: 360, y: 300 }, // ✅ 예금주

        // ✅ 만 14세 미만 여부 체크박스 좌표 (예/아니오 위치가 양식마다 다르면 보험사별로 override)
        under14: {
            yes: { x: 480, y: 650 },
            no:  { x: 520, y: 650 },
        },

        // ✅ 보상안내 받으실 분 체크박스 좌표
        compensationRecipient: {
            agent:    { x: 480, y: 250 }, // 보험설계사
            claimant: { x: 520, y: 250 }, // 보험청구인
        },

        // ✅ 계좌 유형 체크박스 좌표
        accountType: {
            prepaid:   { x: 145, y: 320 }, // 기지급
            general:   { x: 200, y: 320 }, // 일반
            autoDebit: { x: 260, y: 320 }, // 자동이체
        },

        // ✅ 계약자(동일인 아님일 때) 정보 좌표 — 피보험자 정보와 별도 영역
        contractor: {
            name:   { x: 145, y: 560 },
            jumin1: { x: 270, y: 560 },
            jumin2: { x: 370, y: 560 },
            phone:  { x: 145, y: 520 },
            sign:   { x: 430, y: 500, width: 70, height: 25 },
        },
    },

    samsung:      { name: { x: 140, y: 648 }, jumin1: { x: 260, y: 648 }, jumin2: { x: 355, y: 648 }, phone: { x: 140, y: 598 }, content: { x: 140, y: 390 }, year2: { x: 105, y: 128 }, month: { x: 158, y: 128 }, day: { x: 203, y: 128 }, signerName: { x: 365, y: 128 }, sign: { x: 505, y: 172, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    db:           { name: { x: 140, y: 645 }, jumin1: { x: 258, y: 645 }, jumin2: { x: 353, y: 645 }, phone: { x: 140, y: 595 }, content: { x: 140, y: 385 }, year2: { x: 107, y: 126 }, month: { x: 160, y: 126 }, day: { x: 205, y: 126 }, signerName: { x: 368, y: 126 }, sign: { x: 535, y: 145, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    kb:           { name: { x: 143, y: 647 }, jumin1: { x: 262, y: 647 }, jumin2: { x: 357, y: 647 }, phone: { x: 143, y: 597 }, content: { x: 143, y: 388 }, year2: { x: 108, y: 127 }, month: { x: 161, y: 127 }, day: { x: 206, y: 127 }, signerName: { x: 370, y: 127 }, sign: { x: 515, y: 65, width: 65, height: 22 }, bankName: { x: 143, y: 290 }, account: { x: 243, y: 290 } },
    meritz:       { name: { x: 141, y: 643 }, jumin1: { x: 259, y: 643 }, jumin2: { x: 354, y: 643 }, phone: { x: 141, y: 593 }, content: { x: 141, y: 383 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 366, y: 124 }, sign: { x: 495, y: 72, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    lotte:        { name: { x: 138, y: 640 }, jumin1: { x: 256, y: 640 }, jumin2: { x: 351, y: 640 }, phone: { x: 138, y: 590 }, content: { x: 138, y: 380 }, year2: { x: 103, y: 121 }, month: { x: 156, y: 121 }, day: { x: 201, y: 121 }, signerName: { x: 363, y: 121 }, sign: { x: 460, y: 103, width: 65, height: 22 }, bankName: { x: 138, y: 290 }, account: { x: 238, y: 290 } },
    mg:           { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 310, y: 215, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    nh:           { name: { x: 142, y: 646 }, jumin1: { x: 260, y: 646 }, jumin2: { x: 355, y: 646 }, phone: { x: 142, y: 596 }, content: { x: 142, y: 386 }, year2: { x: 107, y: 125 }, month: { x: 160, y: 125 }, day: { x: 205, y: 125 }, signerName: { x: 367, y: 125 }, sign: { x: 520, y: 124, width: 65, height: 22 }, bankName: { x: 142, y: 290 }, account: { x: 242, y: 290 } },
    heungkuk:     { name: { x: 139, y: 641 }, jumin1: { x: 257, y: 641 }, jumin2: { x: 352, y: 641 }, phone: { x: 139, y: 591 }, content: { x: 139, y: 381 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 520, y: 96, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    samsunglife:  { name: { x: 143, y: 649 }, jumin1: { x: 261, y: 649 }, jumin2: { x: 356, y: 649 }, phone: { x: 143, y: 599 }, content: { x: 143, y: 389 }, year2: { x: 108, y: 128 }, month: { x: 161, y: 128 }, day: { x: 206, y: 128 }, signerName: { x: 369, y: 128 }, sign: { x: 510, y: 108, width: 65, height: 22 }, bankName: { x: 143, y: 290 }, account: { x: 243, y: 290 } },
    hanhwalife:   { name: { x: 141, y: 647 }, jumin1: { x: 259, y: 647 }, jumin2: { x: 354, y: 647 }, phone: { x: 141, y: 597 }, content: { x: 141, y: 387 }, year2: { x: 106, y: 126 }, month: { x: 159, y: 126 }, day: { x: 204, y: 126 }, signerName: { x: 367, y: 126 }, sign: { x: 500, y: 150, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    kyobolife:    { name: { x: 144, y: 650 }, jumin1: { x: 262, y: 650 }, jumin2: { x: 357, y: 650 }, phone: { x: 144, y: 600 }, content: { x: 144, y: 390 }, year2: { x: 109, y: 129 }, month: { x: 162, y: 129 }, day: { x: 207, y: 129 }, signerName: { x: 371, y: 129 }, sign: { x: 480, y: 130, width: 65, height: 22 }, bankName: { x: 144, y: 290 }, account: { x: 244, y: 290 } },
    shinhanlife:  { name: { x: 142, y: 648 }, jumin1: { x: 260, y: 648 }, jumin2: { x: 355, y: 648 }, phone: { x: 142, y: 598 }, content: { x: 142, y: 388 }, year2: { x: 107, y: 127 }, month: { x: 160, y: 127 }, day: { x: 205, y: 127 }, signerName: { x: 368, y: 127 }, sign: { x: 435, y: 170, width: 65, height: 22 }, bankName: { x: 142, y: 290 }, account: { x: 242, y: 290 } },
    aialife:      { name: { x: 140, y: 646 }, jumin1: { x: 258, y: 646 }, jumin2: { x: 353, y: 646 }, phone: { x: 140, y: 596 }, content: { x: 140, y: 386 }, year2: { x: 105, y: 125 }, month: { x: 158, y: 125 }, day: { x: 203, y: 125 }, signerName: { x: 366, y: 125 }, sign: { x: 500, y: 68, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    abllife:      { name: { x: 139, y: 645 }, jumin1: { x: 257, y: 645 }, jumin2: { x: 352, y: 645 }, phone: { x: 139, y: 595 }, content: { x: 139, y: 385 }, year2: { x: 104, y: 124 }, month: { x: 157, y: 124 }, day: { x: 202, y: 124 }, signerName: { x: 365, y: 124 }, sign: { x: 490, y: 210, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    kdblife:      { name: { x: 141, y: 647 }, jumin1: { x: 259, y: 647 }, jumin2: { x: 354, y: 647 }, phone: { x: 141, y: 597 }, content: { x: 141, y: 387 }, year2: { x: 106, y: 126 }, month: { x: 159, y: 126 }, day: { x: 204, y: 126 }, signerName: { x: 367, y: 126 }, sign: { x: 520, y: 180, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    nhlife:       { name: { x: 143, y: 649 }, jumin1: { x: 261, y: 649 }, jumin2: { x: 356, y: 649 }, phone: { x: 143, y: 599 }, content: { x: 143, y: 389 }, year2: { x: 108, y: 128 }, month: { x: 161, y: 128 }, day: { x: 206, y: 128 }, signerName: { x: 370, y: 128 }, sign: { x: 520, y: 120, width: 65, height: 22 }, bankName: { x: 143, y: 290 }, account: { x: 243, y: 290 } },
    hanalife:     { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 366, y: 123 }, sign: { x: 430, y: 110, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } }, // ⚠️ sign 미반영: 좌표.js "하나생명"에 1페이지 서명 필드 없음(가장 가까운 건 2페이지 p2BeneficiarySignature x:400,y:205) — 기존 값 유지
    dongyanglife: { name: { x: 138, y: 643 }, jumin1: { x: 256, y: 643 }, jumin2: { x: 351, y: 643 }, phone: { x: 138, y: 593 }, content: { x: 138, y: 383 }, year2: { x: 103, y: 122 }, month: { x: 156, y: 122 }, day: { x: 201, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 455, y: 185, width: 65, height: 22 }, bankName: { x: 138, y: 290 }, account: { x: 238, y: 290 } },
    heungkuklife: { name: { x: 139, y: 641 }, jumin1: { x: 257, y: 641 }, jumin2: { x: 352, y: 641 }, phone: { x: 139, y: 591 }, content: { x: 139, y: 381 }, year2: { x: 104, y: 120 }, month: { x: 157, y: 120 }, day: { x: 202, y: 120 }, signerName: { x: 364, y: 120 }, sign: { x: 480, y: 60, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    linalife:     { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 121 }, month: { x: 158, y: 121 }, day: { x: 203, y: 121 }, signerName: { x: 365, y: 121 }, sign: { x: 210, y: 40, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    dblife:       { name: { x: 139, y: 643 }, jumin1: { x: 257, y: 643 }, jumin2: { x: 352, y: 643 }, phone: { x: 139, y: 593 }, content: { x: 139, y: 383 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 510, y: 110, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    kblife:       { name: { x: 141, y: 645 }, jumin1: { x: 259, y: 645 }, jumin2: { x: 354, y: 645 }, phone: { x: 141, y: 595 }, content: { x: 141, y: 385 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 366, y: 124 }, sign: { x: 215, y: 140, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    hanhwa:       { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 505, y: 120, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    hana:         { name: { x: 139, y: 643 }, jumin1: { x: 257, y: 643 }, jumin2: { x: 352, y: 643 }, phone: { x: 139, y: 593 }, content: { x: 139, y: 383 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 505, y: 90, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    miraeassetlife:{ name: { x: 142, y: 647 }, jumin1: { x: 260, y: 647 }, jumin2: { x: 355, y: 647 }, phone: { x: 142, y: 597 }, content: { x: 142, y: 387 }, year2: { x: 107, y: 126 }, month: { x: 160, y: 126 }, day: { x: 205, y: 126 }, signerName: { x: 368, y: 126 }, sign: { x: 400, y: 196, width: 65, height: 22 }, bankName: { x: 142, y: 290 }, account: { x: 242, y: 290 } },
    imlife:       { name: { x: 138, y: 641 }, jumin1: { x: 256, y: 641 }, jumin2: { x: 351, y: 641 }, phone: { x: 138, y: 591 }, content: { x: 138, y: 381 }, year2: { x: 103, y: 120 }, month: { x: 156, y: 120 }, day: { x: 201, y: 120 }, signerName: { x: 363, y: 120 }, sign: { x: 130, y: 115, width: 65, height: 22 }, bankName: { x: 138, y: 290 }, account: { x: 238, y: 290 } },
    lina:         { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 121 }, month: { x: 158, y: 121 }, day: { x: 203, y: 121 }, signerName: { x: 365, y: 121 }, sign: { x: 429, y: 108, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } }, // ⚠️ sign 미반영: 좌표.js "라이나손해보험"에 1페이지 서명 필드 없음(가장 가까운 건 4페이지 lastPageInsuredSignature x:510,y:100) — 기존 값 유지
    chubblife:    { name: { x: 141, y: 645 }, jumin1: { x: 259, y: 645 }, jumin2: { x: 354, y: 645 }, phone: { x: 141, y: 595 }, content: { x: 141, y: 385 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 367, y: 124 }, sign: { x: 250, y: 280, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    fubonlife:    { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 510, y: 235, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
};

// ==========================================
// [현대해상 - 5페이지 전용 좌표]
// ------------------------------------------
// 현대해상은 일반 1페이지 양식과 달리 5페이지로 구성되어 있어
// 위 FIELD_COORDS(보험사당 좌표 1세트) 구조와 맞지 않습니다.
// 그래서 페이지별로 별도 객체에 정리했습니다.
// claim.js의 generateHyundai5PagePDF()에서 이 값을 참조합니다.
// ⚠️ 아래 값은 기존 claim.js에 하드코딩되어 있던 좌표를 그대로
//    옮긴 것입니다. (좌표.js 등 외부 출처 좌표는 적용하지 않았습니다 —
//    실제 템플릿과 맞는지 검증되지 않았기 때문입니다.)
// ==========================================
window.HYUNDAI_COORDS = {
    page1: {
    name:       { x: 135, y: 607 },
    juminCoords: [
            { x: 264, y: 607 }, { x: 288, y: 607 }, { x: 315, y: 607 },
            { x: 335, y: 607 }, { x: 360, y: 607 }, { x: 383, y: 607 },
            { x: 410, y: 607 }, { x: 433, y: 607 }, { x: 458, y: 607 },
            { x: 483, y: 607 }, { x: 507, y: 607 }, { x: 531, y: 607 }, { x: 554, y: 607 }
    

    // 주민번호 뒤 7자리 시작 위치(주민번호7)
    phone:      { /* ⚠️ 측정값 없음 - 기존 값 유지: x:145, y:493 */ x: 145, y: 493 },
    job:        { x: 135, y: 588 },   // ✅ 신규 추가 (기존 코드에 job 좌표 없었음)
    content:    { /* ⚠️ 측정값 없음 - 기존 값 유지 */ x: 240, y: 213 },
    year2:      { x: 115, y: 440 },   // 발병일시 년
    month:      { x: 181, y: 438 },   // 발병일시 월
    day:        { x: 229, y: 439 },   // 발병일시 일
    signerName: { x: 409, y: 132 },   // 작성일자 옆 성명
    sign:       { x: 521, y: 133, width: 60, height: 22 }, // width/height는 기존 값 유지
    bankName:   { x: 104, y: 218 },
    account:    { x: 253, y: 218 },
    accountHolder: { x: 493, y: 218 }, // ✅ 신규 추가 (기존 코드엔 예금주 좌표/출력 로직 없었음)

    // ✅ 신규 추가: 계약자 정보 (기존 HYUNDAI_COORDS엔 계약자 섹션이 없었음)
    contractorName: { x: 134, y: 565 },
    contractorJumin1: { x: 264, y: 566 },
    contractorJumin2: { x: 410, y: 566 },
    },
    page2: {
        checkmarks: [
            { x: 513, y: 416 },
            { x: 513, y: 311 },
            { x: 513, y: 188 },
        ],
    },
    page3: {
        checkmarks: [
            { x: 513, y: 288 },
            { x: 513, y: 188 },
        ],
    },
    page4: {
        checkmarks: [
            { x: 513, y: 645 },
            { x: 513, y: 226 },
            { x: 513, y: 134 },
        ],
    },
    page5: {
        checkmarks: [
            { x: 513, y: 564 },
            { x: 513, y: 518 },
            { x: 513, y: 429 },
        ],
        year:       { x: 230, y: 381 },
        month:      { x: 340, y: 381 },
        day:        { x: 460, y: 381 },
        name:       { x: 200, y: 320 },
        sign:       { x: 460, y: 295, width: 70, height: 25 },
    },
};