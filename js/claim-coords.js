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
//
// 🆕 [DB손해보험 - 5페이지 전용 좌표로 전환 - 2026-07-04]
// DB손해보험 실제 양식을 확인해보니 현대해상과 동일하게 본문 1페이지 +
// 동의서 3페이지(2,3,4) + 마지막 서명페이지(5)로 구성된 5페이지 양식이었습니다.
// 그래서 기존 FIELD_COORDS.db(1페이지 전용, 아래에 계속 남겨둠 - 더 이상 참조되지
// 않지만 백업 차원에서 유지)는 사용을 중단하고, HYUNDAI_COORDS와 동일한 구조의
// window.DB_COORDS를 새로 만들어 적용했습니다. claim.js의
// generateDB5PagePDF() 함수가 이 값을 참조합니다.
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
    // ⚠️ [FIELD_COORDS.db는 더 이상 사용되지 않습니다] DB손해보험은 실제로 5페이지
    //    양식이라 window.DB_COORDS(아래)를 사용하도록 변경했습니다. 이 줄은 과거
    //    1페이지 전용 좌표 백업으로만 남겨둡니다.
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
    ],

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

// ==========================================
// [DB손해보험 - 5페이지 전용 좌표 - 2026-07-04 실측 반영]
// ------------------------------------------
// DB손해보험도 현대해상과 마찬가지로 본문 1페이지 + 동의서 3페이지(2,3,4) +
// 마지막 서명페이지(5)로 구성된 5페이지 양식입니다.
// claim.js의 generateDB5PagePDF()에서 이 값을 참조합니다.
//
// ⚠️ 주민번호(jumin)는 다른 보험사처럼 앞자리(jumin1)/뒷자리(jumin2)로 나뉜
//    두 칸이 아니라, 좌표 1곳에 "990101-1234567" 형태로 하이픈 포함 전체를
//    한 줄로 적는 구조입니다. (generateDB5PagePDF에서 splitJumin으로 나눈 뒤
//    다시 하이픈으로 합쳐서 한 번에 출력합니다.)
//
// ⚠️ 1페이지·5페이지 모두 "성함/서명" 칸이 위·아래 2개씩 존재합니다.
//    위쪽 칸(y가 더 큼)은 청구인(피보험자 또는 대리 청구 시 대리인) 서명,
//    아래쪽 칸은 계약자 서명으로 가정해 매핑했습니다. 실제 양식에서 이 두 칸의
//    라벨을 한 번 확인해 보시고, 반대라면 signerName/sign ↔
//    contractorSignerName/contractorSign 값만 서로 바꿔주시면 됩니다.
//
// ⚠️ "보상안내 받으실 분" 항목에 텍스트 기입란이 두 곳(담당 설계사 / 로그인한
//    계정 이름)인데 정확한 용도 구분이 어려워 우선 둘 다 동일하게
//    window.__currentAgentName 값을 채우도록 처리했습니다(claim.js 참고).
//    실제로 서로 다른 값이 들어가야 한다면 claim.js의 해당 부분만 고치면 됩니다.
//
// ⚠️ 주소(address)는 이번에 새로 추가된 필드입니다. 이 값이 정상적으로
//    채워지려면 청구서 작성 폼(HTML)에 id="form-address" 인풋이 있어야 합니다.
//    아직 없다면 폼에 주소 입력칸을 추가해 주세요.
// ==========================================
window.DB_COORDS = {
    page1: {
        name:    { x: 159, y: 696 },
        jumin:   { x: 311, y: 694 }, // 주민번호 전체(하이픈 포함) 한 줄 출력
        job:     { x: 479, y: 673 },
        address: { x: 161, y: 653 }, // ✅ 신규: 주소

        // 사고 유형 체크 (교통/질병/상해)
        accidentType: {
            traffic: { x: 211, y: 498 }, // 교통
            disease: { x: 168, y: 498 }, // 질병
            injury:  { x: 128, y: 498 }, // 상해
        },

        baseConsentCheck: { x: 523, y: 701 }, // 기본 동의 체크 (항상 체크)

        // 보상안내 받으실 분
        compensationRecipient: {
            agentNameField:     { x: 440, y: 631 }, // 담당 설계사 성명 기입란
            loginUserNameField: { x: 276, y: 630 }, // 로그인한 계정(설계사) 이름 기입란
            agentCheck:         { x: 219, y: 631 }, // 보험 설계사 체크
            claimantCheck:      { x: 114, y: 631 }, // 보험 계약자 체크
        },

        // 자료 첨부 목록 (2줄에 나눠 기입)
        attachmentLines: [
            { x: 125, y: 446 },
            { x: 123, y: 420 },
        ],

        // 작성일자 (오늘 날짜)
        year2: { x: 97, y: 154 },
        month: { x: 147, y: 154 },
        day:   { x: 197, y: 154 },

        // 상단 성함/서명 (청구인)
        signerName: { x: 425, y: 153 },
        sign:       { x: 557, y: 156, width: 65, height: 22 },

        // 하단 성함/서명 (계약자)
        contractorSignerName: { x: 425, y: 118 },
        contractorSign:       { x: 555, y: 117, width: 65, height: 22 },

        // 계좌정보
        prepaidAccountCheck: { x: 381, y: 292 }, // 기지급 계좌 체크
        account:       { x: 180, y: 293 },
        bankName:      { x: 381, y: 293 },
        accountHolder: { x: 487, y: 293 },
    },
    page2: {
        checkmarks: [
            { x: 545, y: 443 },
            { x: 545, y: 353 },
            { x: 545, y: 261 },
        ],
    },
    page3: {
        checkmarks: [
            { x: 545, y: 339 },
            { x: 545, y: 235 },
            { x: 545, y: 101 },
        ],
    },
    page4: {
        checkmarks: [
            { x: 546, y: 345 },
            { x: 548, y: 244 },
        ],
    },
    page5: {
        checkmarks: [
            { x: 547, y: 665 },
            { x: 547, y: 594 },
            { x: 545, y: 460 },
        ],
        year2: { x: 100, y: 168 }, // 작성 년(뒤 두자리)
        month: { x: 149, y: 167 },
        day:   { x: 206, y: 167 },

        // 상단 성함/서명 (청구인)
        signerName: { x: 422, y: 171 },
        sign:       { x: 553, y: 171, width: 65, height: 22 },

        // 하단 성함/서명 (계약자)
        contractorSignerName: { x: 423, y: 133 },
        contractorSign:       { x: 553, y: 132, width: 65, height: 22 },
    },
};
// ==========================================
// [26개사 - 엑셀 기반 근사 좌표 - 2026-07-19 자동 추출]
// ------------------------------------------
// 첨부하신 "청구서자동작성_..._Microsoft_print_to_PDF_260622.xlsx" 파일은
// 실측 좌표표가 아니라, 실제 청구서 양식 위에 텍스트가 겹치도록 열 너비/행
// 높이를 한 칸씩 맞춰놓은 "인쇄용 목업 시트"였습니다. 그래서 셀 좌표를 직접
// 읽지 않고, 아래 방식으로 좌표를 역산했습니다.
//
//   1) 시트마다 '정보' 시트와 동일한 테스트 데이터(이재희/241015-3704783/
//      010-5807-1470/농협/352-2333-1925-43/아나/이창현 등)가 들어있어서,
//      값이 일치하는 셀을 찾아 그 값이 어떤 필드인지 자동 매칭했습니다.
//   2) 그 셀의 열 누적 너비 · 행 누적 높이를 pt 단위로 환산해 x, y를 계산
//      했습니다. (A4 기준 595.28 x 841.89pt, 열너비는 Excel의 문자단위 폭을
//      px≈width*7+5, pt=px*0.75 공식으로 근사 변환)
//   3) 시트 내 세로 길이가 A4 한 페이지(841.89pt)를 넘어가면 다음 페이지로
//      자동 판정했고, "회사명4"/"회사명4-5" 처럼 별도 시트로 분리된 서명
//      페이지는 본문 시트의 마지막 페이지 다음 페이지로 이어붙였습니다.
//
// ⚠️ DB손보/현대해상 때와 달리 이번 값은 "실측"이 아니라 "근사치"입니다.
//    검증 결과 기존에 실측으로 확인된 DB손보 name 좌표(x:159,y:696)와
//    비교했을 때 약 5~15pt 오차가 있었습니다. 즉 위치가 대략 맞긴 하지만
//    실제 인쇄 결과를 보고 미세 조정이 필요할 가능성이 높습니다.
//
// ⚠️ 필드명 해석 (엑셀 '정보' 시트 기준):
//    name/jumin/phone      = 피보험자(손보청구자) 본인 정보
//    beneficiaryName/Jumin = 수익자(생보청구자) 정보 — 예금주(accountHolder)
//                            위치로 추정해 매핑했으나, 실제로는 수익자 이름일
//                            수 있으니 실제 양식과 대조 확인 필요
//    legalRepName/Sign     = 법정대리인 정보 — 기존 코드의 "계약자(contractor)"
//                            개념과 동일한 자리로 간주해 매핑했습니다
//    sign                  = 본인(청구인) 서명 위치
//    beneficiarySign       = 수익자 서명란 위치 — 현재 코드에는 대응하는
//                            서명 캔버스가 없어 좌표만 기록해두었습니다
//                            (추후 서명 캔버스 추가 시 사용 가능)
//    relation/legalRepRelation = "피보험자와의 관계" 텍스트란 — 현재 코드에는
//                            대응 필드가 없어 draw 로직에서는 사용하지 않음
//
// ⚠️ job(직업)/address(주소)/content(사고내용)/작성일자/체크박스류는 엑셀
//    '정보' 시트에 테스트값이 없어 자동 추출이 불가능했습니다. 이 필드들은
//    기존처럼 실제 양식을 보고 실측해서 추가해주셔야 합니다.
//
// ⚠️ 이 좌표들은 window.MULTI_PAGE_COORDS[회사키][페이지번호] 구조이며,
//    claim.js의 새 window.generateMultiPagePDF() 함수가 참조합니다.
//    (기존 FIELD_COORDS의 1페이지 전용 항목들은 그대로 두었습니다 —
//    같은 회사키라도 이제 MULTI_PAGE_COORDS가 있으면 그쪽이 우선 사용됩니다)
// ==========================================
window.MULTI_PAGE_COORDS = {
    // 삼성화재
    samsung: {
        1: { name: { x: 119.3, y: 671.9 }, jumin: { x: 277.1, y: 671.9 }, beneficiaryName: { x: 189.4, y: 631.7 }, phone: { x: 312.1, y: 631.7 }, bankName: { x: 189.4, y: 365.6 }, account: { x: 312.1, y: 365.6 }, sign: { x: 540.0, y: 218.3 }, legalRepName: { x: 434.8, y: 203.3 }, legalRepSign: { x: 540.0, y: 203.3 }, beneficiarySign: { x: 540.0, y: 188.3 } },
        3: { name: { x: 352.9, y: 500.5 }, sign: { x: 409.2, y: 500.5 }, legalRepName: { x: 352.9, y: 480.4 }, legalRepSign: { x: 409.2, y: 480.4 }, beneficiaryName: { x: 352.9, y: 460.3 }, beneficiarySign: { x: 409.2, y: 460.3 } },
    },
    // KB손해보험
    kb: {
        1: { name: { x: 107.5, y: 739.4 }, jumin: { x: 214.1, y: 739.4 }, phone: { x: 107.5, y: 713.0 }, bankName: { x: 107.5, y: 215.7 }, account: { x: 214.1, y: 215.7 }, beneficiaryName: { x: 449.6, y: 215.7 }, sign: { x: 449.6, y: 118.9 } },
        2: { name: { x: 215.2, y: 295.9 }, sign: { x: 305.4, y: 295.9 }, legalRepName: { x: 374.8, y: 295.9 }, legalRepSign: { x: 476.8, y: 295.9 } },
    },
    // 메리츠화재
    meritz: {
        1: { name: { x: 107.9, y: 713.1 }, jumin: { x: 223.1, y: 713.1 }, phone: { x: 223.1, y: 635.6 }, bankName: { x: 77.3, y: 252.4 }, beneficiaryName: { x: 189.8, y: 252.4 }, beneficiaryJumin: { x: 293.8, y: 252.4 }, relation: { x: 467.1, y: 252.4 }, account: { x: 77.3, y: 226.1 }, sign: { x: 434.5, y: 113.9 } },
        3: { legalRepName: { x: 338.2, y: 122.8 }, legalRepSign: { x: 434.5, y: 122.8 } },
    },
    // 롯데손해보험
    lotte: {
        1: { name: { x: 165.0, y: 629.5 }, jumin: { x: 290.0, y: 629.5 }, beneficiaryName: { x: 165.0, y: 566.5 }, phone: { x: 290.0, y: 566.5 }, relation: { x: 165.0, y: 545.5 }, beneficiaryJumin: { x: 290.0, y: 294.2 }, bankName: { x: 114.0, y: 273.2 }, account: { x: 290.0, y: 273.2 }, sign: { x: 426.6, y: 160.7 } },
        2: { name: { x: 50.0, y: 577.7 }, sign: { x: 127.9, y: 577.7 }, legalRepName: { x: 218.1, y: 577.7 }, legalRepSign: { x: 284.2, y: 577.7 } },
    },
    // NH농협손해보험
    nh: {
        1: { name: { x: 148.4, y: 673.3 }, jumin: { x: 321.3, y: 673.3 }, phone: { x: 321.3, y: 573.5 }, bankName: { x: 95.7, y: 277.7 }, beneficiaryName: { x: 200.8, y: 277.7 }, beneficiaryJumin: { x: 321.3, y: 277.7 }, relation: { x: 468.1, y: 277.7 }, account: { x: 115.8, y: 258.1 }, sign: { x: 468.1, y: 169.3 } },
        2: { name: { x: 146.0, y: 191.5 }, legalRepName: { x: 323.2, y: 191.5 }, legalRepRelation: { x: 438.6, y: 191.5 }, sign: { x: 146.0, y: 162.4 }, legalRepSign: { x: 371.2, y: 162.4 } },
    },
    // 흥국화재
    heungkuk: {
        1: { name: { x: 156.0, y: 720.1 }, jumin: { x: 375.5, y: 720.1 }, phone: { x: 156.0, y: 700.0 }, beneficiaryName: { x: 156.0, y: 659.8 }, relation: { x: 375.5, y: 659.8 }, bankName: { x: 156.0, y: 435.4 }, account: { x: 277.9, y: 435.4 }, sign: { x: 477.5, y: 132.9 } },
        2: { name: { x: 360.8, y: 142.6 }, sign: { x: 415.1, y: 142.6 }, legalRepName: { x: 360.8, y: 122.5 }, legalRepSign: { x: 415.1, y: 122.5 } },
    },
    // 삼성생명
    samsunglife: {
        1: { name: { x: 114.0, y: 721.7 }, jumin: { x: 214.7, y: 721.7 }, phone: { x: 339.0, y: 721.7 }, beneficiaryName: { x: 114.0, y: 518.4 }, beneficiaryJumin: { x: 214.7, y: 518.4 }, bankName: { x: 147.3, y: 410.9 }, account: { x: 371.7, y: 410.9 }, beneficiarySign: { x: 449.0, y: 163.8 } },
        2: { name: { x: 114.0, y: 210.2 }, sign: { x: 163.1, y: 210.2 }, legalRepName: { x: 277.5, y: 210.2 }, legalRepSign: { x: 321.3, y: 210.2 }, beneficiaryName: { x: 114.0, y: 188.2 }, beneficiarySign: { x: 163.1, y: 188.2 } },
    },
    // 한화생명
    hanhwalife: {
        1: { name: { x: 117.1, y: 702.2 }, jumin: { x: 305.5, y: 702.2 }, phone: { x: 431.2, y: 684.7 }, beneficiaryName: { x: 117.1, y: 627.9 }, beneficiaryJumin: { x: 305.5, y: 627.9 }, relation: { x: 431.2, y: 610.4 }, bankName: { x: 147.1, y: 559.6 }, account: { x: 354.5, y: 559.6 }, beneficiarySign: { x: 475.0, y: 200.1 } },
        3: { name: { x: 126.3, y: 334.5 }, sign: { x: 226.0, y: 334.5 }, legalRepName: { x: 357.6, y: 334.5 }, legalRepSign: { x: 453.6, y: 334.5 }, beneficiaryName: { x: 126.3, y: 302.4 }, beneficiarySign: { x: 226.0, y: 302.4 } },
    },
    // 교보생명
    kyobolife: {
        1: { name: { x: 98.3, y: 754.1 }, jumin: { x: 200.9, y: 754.1 }, phone: { x: 327.9, y: 754.1 }, beneficiaryName: { x: 98.3, y: 707.9 }, beneficiaryJumin: { x: 200.9, y: 707.9 }, bankName: { x: 136.2, y: 441.8 }, account: { x: 239.5, y: 441.8 }, beneficiarySign: { x: 409.1, y: 179.3 } },
        2: { name: { x: 204.7, y: 122.0 }, sign: { x: 292.2, y: 122.0 }, legalRepName: { x: 394.2, y: 122.0 }, legalRepSign: { x: 478.5, y: 122.0 }, beneficiaryName: { x: 204.7, y: 97.1 }, beneficiarySign: { x: 292.2, y: 97.1 } },
    },
    // 신한라이프
    shinhanlife: {
        1: { bankName: { x: 124.3, y: 605.1 }, beneficiaryName: { x: 199.4, y: 605.1 }, account: { x: 273.4, y: 605.1 }, name: { x: 164.8, y: 526.0 }, jumin: { x: 296.2, y: 526.0 }, phone: { x: 426.4, y: 526.0 }, beneficiaryJumin: { x: 296.2, y: 481.3 }, beneficiarySign: { x: 411.5, y: 217.3 } },
        3: { sign: { x: 199.4, y: 163.1 }, legalRepName: { x: 296.2, y: 163.1 }, legalRepSign: { x: 411.5, y: 163.1 }, legalRepRelation: { x: 477.4, y: 163.1 } },
    },
    // AIA생명
    aialife: {
        1: { name: { x: 135.7, y: 685.9 }, phone: { x: 241.8, y: 685.9 }, jumin: { x: 396.1, y: 685.9 }, beneficiaryName: { x: 135.7, y: 671.5 }, beneficiaryJumin: { x: 396.1, y: 671.5 }, bankName: { x: 135.7, y: 474.6 }, account: { x: 349.9, y: 474.6 }, beneficiarySign: { x: 456.1, y: 121.3 } },
        4: { name: { x: 57.6, y: 338.9 }, sign: { x: 142.5, y: 338.9 }, beneficiaryName: { x: 217.0, y: 338.9 }, beneficiarySign: { x: 306.0, y: 338.9 }, legalRepName: { x: 57.6, y: 296.6 }, legalRepSign: { x: 142.5, y: 296.6 } },
    },
    // ABL생명
    abllife: {
        1: { name: { x: 129.8, y: 744.5 }, jumin: { x: 253.0, y: 744.5 }, phone: { x: 416.7, y: 728.6 }, beneficiaryName: { x: 129.8, y: 696.7 }, beneficiaryJumin: { x: 253.0, y: 696.7 }, bankName: { x: 129.8, y: 630.0 }, account: { x: 291.5, y: 630.0 }, beneficiarySign: { x: 416.7, y: 262.5 } },
        3: { name: { x: 93.0, y: 181.2 }, sign: { x: 189.0, y: 181.2 }, legalRepName: { x: 333.1, y: 181.2 }, legalRepSign: { x: 424.9, y: 181.2 }, beneficiaryName: { x: 93.0, y: 154.2 }, beneficiarySign: { x: 189.0, y: 154.2 } },
    },
    // KDB생명
    kdblife: {
        1: { name: { x: 145.2, y: 740.3 }, jumin: { x: 276.8, y: 740.3 }, phone: { x: 406.0, y: 740.3 }, beneficiaryName: { x: 145.2, y: 690.8 }, beneficiaryJumin: { x: 276.8, y: 690.8 }, bankName: { x: 125.7, y: 601.5 }, account: { x: 324.8, y: 601.5 }, beneficiarySign: { x: 461.6, y: 230.9 } },
        3: { name: { x: 119.3, y: 364.5 }, sign: { x: 215.6, y: 364.5 }, legalRepName: { x: 348.1, y: 364.5 }, legalRepSign: { x: 439.8, y: 364.5 }, beneficiaryName: { x: 119.3, y: 340.5 }, beneficiarySign: { x: 215.6, y: 340.5 } },
    },
    // NH농협생명
    nhlife: {
        1: { name: { x: 103.5, y: 752.4 }, jumin: { x: 193.1, y: 752.4 }, phone: { x: 302.9, y: 752.4 }, beneficiaryName: { x: 103.5, y: 723.2 }, beneficiaryJumin: { x: 193.1, y: 723.2 }, bankName: { x: 238.2, y: 425.6 }, account: { x: 350.9, y: 425.6 }, beneficiarySign: { x: 458.6, y: 165.1 } },
        2: { name: { x: 98.3, y: 186.2 }, sign: { x: 152.6, y: 186.2 }, beneficiaryName: { x: 255.2, y: 186.2 }, beneficiarySign: { x: 309.5, y: 186.2 }, legalRepName: { x: 414.1, y: 186.2 }, legalRepSign: { x: 462.1, y: 186.2 } },
    },
    // 하나생명
    hanalife: {
        1: { name: { x: 98.3, y: 612.3 }, jumin: { x: 293.1, y: 612.3 }, phone: { x: 293.1, y: 594.8 }, beneficiaryName: { x: 98.3, y: 541.0 }, beneficiaryJumin: { x: 293.1, y: 541.0 }, bankName: { x: 142.1, y: 207.3 }, account: { x: 142.1, y: 189.3 } },
        2: { beneficiarySign: { x: 344.1, y: 270.6 } },
        4: { name: { x: 308.0, y: 342.6 }, sign: { x: 432.3, y: 342.6 }, beneficiaryName: { x: 308.0, y: 322.5 }, beneficiarySign: { x: 432.3, y: 322.5 }, legalRepName: { x: 308.0, y: 303.8 }, legalRepSign: { x: 432.3, y: 303.8 } },
    },
    // 하나손해보험
    hana: {
        1: { name: { x: 148.6, y: 666.2 }, jumin: { x: 314.5, y: 666.2 }, phone: { x: 314.5, y: 618.2 }, account: { x: 148.6, y: 364.5 }, bankName: { x: 314.5, y: 364.5 }, beneficiaryName: { x: 429.1, y: 364.5 }, sign: { x: 429.1, y: 147.0 } },
        3: { name: { x: 109.5, y: 433.6 }, sign: { x: 205.6, y: 433.6 }, legalRepName: { x: 367.7, y: 433.6 }, legalRepSign: { x: 413.4, y: 433.6 }, beneficiaryName: { x: 367.7, y: 414.2 }, beneficiarySign: { x: 413.4, y: 414.2 } },
    },
    // 동양생명
    dongyanglife: {
        1: { name: { x: 89.1, y: 705.9 }, phone: { x: 403.6, y: 705.9 }, beneficiaryName: { x: 127.0, y: 652.9 }, relation: { x: 386.8, y: 652.9 }, bankName: { x: 175.3, y: 605.4 }, account: { x: 272.1, y: 605.4 }, beneficiarySign: { x: 403.6, y: 258.9 } },
        2: { name: { x: 115.4, y: 234.8 }, sign: { x: 211.5, y: 234.8 }, legalRepName: { x: 331.2, y: 234.8 }, legalRepSign: { x: 447.2, y: 234.8 }, beneficiaryName: { x: 115.4, y: 214.7 }, beneficiarySign: { x: 211.5, y: 214.7 } },
        3: { beneficiaryJumin: { x: 331.2, y: 680.2 }, phone: { x: 331.2, y: 519.6 } },
    },
    // 흥국생명
    heungkuklife: {
        1: { name: { x: 93.0, y: 737.1 }, jumin: { x: 226.1, y: 737.1 }, phone: { x: 260.0, y: 710.8 }, beneficiaryName: { x: 93.0, y: 628.1 }, beneficiaryJumin: { x: 226.1, y: 628.1 }, bankName: { x: 93.0, y: 516.7 }, account: { x: 93.0, y: 492.9 }, beneficiarySign: { x: 439.2, y: 132.5 } },
        3: { name: { x: 97.4, y: 245.2 }, sign: { x: 193.5, y: 245.2 }, legalRepName: { x: 337.5, y: 245.2 }, legalRepSign: { x: 433.5, y: 245.2 }, beneficiaryName: { x: 97.4, y: 177.7 }, beneficiarySign: { x: 193.5, y: 177.7 } },
    },
    // 라이나손해보험
    lina: {
        1: { beneficiaryName: { x: 147.3, y: 641.6 }, beneficiaryJumin: { x: 267.7, y: 641.6 }, phone: { x: 418.4, y: 641.6 }, name: { x: 147.3, y: 619.7 }, jumin: { x: 267.7, y: 619.7 }, bankName: { x: 98.3, y: 188.9 }, account: { x: 241.6, y: 188.9 } },
        2: { beneficiaryName: { x: 344.3, y: 152.1 }, beneficiarySign: { x: 464.1, y: 152.1 }, legalRepName: { x: 344.3, y: 132.0 }, legalRepSign: { x: 464.1, y: 132.0 } },
    },
    // KB라이프
    kblife: {
        1: { name: { x: 132.7, y: 532.7 }, jumin: { x: 238.6, y: 532.7 }, phone: { x: 347.8, y: 532.7 }, beneficiaryName: { x: 132.7, y: 518.6 }, beneficiaryJumin: { x: 238.6, y: 518.6 }, relation: { x: 132.7, y: 504.5 }, bankName: { x: 197.5, y: 436.7 }, account: { x: 289.6, y: 436.7 }, beneficiarySign: { x: 197.5, y: 195.9 } },
        2: { name: { x: 122.4, y: 236.9 }, sign: { x: 222.4, y: 236.9 }, legalRepName: { x: 389.2, y: 236.9 }, legalRepSign: { x: 466.2, y: 236.9 }, beneficiaryName: { x: 122.4, y: 220.9 }, beneficiarySign: { x: 222.4, y: 220.9 } },
    },
    // 한화손해보험
    hanhwa: {
        1: { name: { x: 114.0, y: 719.3 }, jumin: { x: 114.0, y: 698.3 }, phone: { x: 114.0, y: 677.3 }, bankName: { x: 114.0, y: 340.7 }, account: { x: 270.1, y: 340.7 }, beneficiaryName: { x: 114.0, y: 319.3 }, beneficiaryJumin: { x: 270.1, y: 319.3 }, sign: { x: 449.6, y: 164.1 }, legalRepName: { x: 355.9, y: 143.1 }, legalRepSign: { x: 449.6, y: 143.1 } },
    },
    // 미래에셋생명
    miraeassetlife: {
        1: { name: { x: 136.6, y: 739.7 }, jumin: { x: 232.7, y: 739.7 }, phone: { x: 336.7, y: 739.7 }, beneficiaryName: { x: 136.6, y: 697.7 }, beneficiaryJumin: { x: 232.7, y: 697.7 }, bankName: { x: 136.6, y: 600.1 }, account: { x: 336.7, y: 600.1 }, beneficiarySign: { x: 387.7, y: 242.8 }, relation: { x: 480.5, y: 242.8 } },
        2: { name: { x: 94.8, y: 231.2 }, sign: { x: 172.5, y: 231.2 }, beneficiaryName: { x: 94.8, y: 187.1 }, beneficiarySign: { x: 172.5, y: 187.1 }, legalRepName: { x: 94.8, y: 143.0 }, legalRepSign: { x: 172.5, y: 143.0 } },
    },
    // 푸본현대생명
    fubonlife: {
        1: { name: { x: 98.3, y: 708.9 }, jumin: { x: 258.5, y: 708.9 }, phone: { x: 411.0, y: 692.4 }, beneficiaryName: { x: 98.3, y: 662.2 }, beneficiaryJumin: { x: 258.5, y: 662.2 }, bankName: { x: 131.6, y: 599.8 }, account: { x: 225.9, y: 599.8 }, beneficiarySign: { x: 459.0, y: 258.7 } },
        2: { name: { x: 338.1, y: 222.4 }, sign: { x: 434.1, y: 222.4 }, beneficiaryName: { x: 338.1, y: 199.3 }, beneficiarySign: { x: 434.1, y: 199.3 }, legalRepName: { x: 338.1, y: 174.2 }, legalRepSign: { x: 434.1, y: 174.2 } },
    },
    // AIG손해보험
    aig: {
        1: { name: { x: 122.2, y: 724.0 }, jumin: { x: 330.1, y: 724.0 }, phone: { x: 122.2, y: 708.1 }, beneficiaryName: { x: 122.2, y: 667.4 }, beneficiaryJumin: { x: 279.8, y: 667.4 }, relation: { x: 470.3, y: 667.4 }, bankName: { x: 91.5, y: 358.9 }, account: { x: 370.0, y: 358.9 }, beneficiarySign: { x: 470.3, y: 88.9 } },
        3: { name: { x: 113.2, y: 203.8 }, sign: { x: 235.5, y: 203.8 }, beneficiaryName: { x: 113.2, y: 172.3 }, beneficiarySign: { x: 235.5, y: 172.3 } },
    },
    // AXA손해보험
    axa: {
        1: { name: { x: 117.1, y: 702.1 }, jumin: { x: 269.5, y: 702.1 }, beneficiaryName: { x: 117.1, y: 690.1 }, beneficiaryJumin: { x: 269.5, y: 690.1 }, phone: { x: 269.5, y: 678.1 }, bankName: { x: 117.1, y: 354.1 }, account: { x: 242.8, y: 354.1 }, sign: { x: 455.6, y: 210.4 }, legalRepName: { x: 385.7, y: 195.4 }, legalRepSign: { x: 455.6, y: 195.4 }, beneficiarySign: { x: 455.6, y: 180.4 } },
    },
    // 메트라이프
    metlife: {
        1: { name: { x: 116.0, y: 608.1 }, jumin: { x: 252.1, y: 608.1 }, phone: { x: 392.7, y: 608.1 }, beneficiaryName: { x: 116.0, y: 534.0 }, beneficiaryJumin: { x: 252.1, y: 534.0 }, bankName: { x: 252.1, y: 431.3 }, account: { x: 252.1, y: 417.3 }, beneficiarySign: { x: 290.7, y: 199.4 }, legalRepName: { x: 392.7, y: 199.4 }, legalRepSign: { x: 443.7, y: 199.4 } },
        3: { sign: { x: 201.1, y: 333.0 } },
    },
};