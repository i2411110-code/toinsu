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

window.FIELD_COORDS = {
    DEFAULT: {
        // ── 피보험자 기본 정보 ──
        name:       { x: 145, y: 650 },
        jumin1:     { x: 270, y: 650 },
        jumin2:     { x: 370, y: 650 },
        phone:      { x: 145, y: 600 },
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

    samsung:      { name: { x: 140, y: 648 }, jumin1: { x: 260, y: 648 }, jumin2: { x: 355, y: 648 }, phone: { x: 140, y: 598 }, content: { x: 140, y: 390 }, year2: { x: 105, y: 128 }, month: { x: 158, y: 128 }, day: { x: 203, y: 128 }, signerName: { x: 365, y: 128 }, sign: { x: 430, y: 115, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    db:           { name: { x: 140, y: 645 }, jumin1: { x: 258, y: 645 }, jumin2: { x: 353, y: 645 }, phone: { x: 140, y: 595 }, content: { x: 140, y: 385 }, year2: { x: 107, y: 126 }, month: { x: 160, y: 126 }, day: { x: 205, y: 126 }, signerName: { x: 368, y: 126 }, sign: { x: 432, y: 113, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    kb:           { name: { x: 143, y: 647 }, jumin1: { x: 262, y: 647 }, jumin2: { x: 357, y: 647 }, phone: { x: 143, y: 597 }, content: { x: 143, y: 388 }, year2: { x: 108, y: 127 }, month: { x: 161, y: 127 }, day: { x: 206, y: 127 }, signerName: { x: 370, y: 127 }, sign: { x: 433, y: 114, width: 65, height: 22 }, bankName: { x: 143, y: 290 }, account: { x: 243, y: 290 } },
    meritz:       { name: { x: 141, y: 643 }, jumin1: { x: 259, y: 643 }, jumin2: { x: 354, y: 643 }, phone: { x: 141, y: 593 }, content: { x: 141, y: 383 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 366, y: 124 }, sign: { x: 430, y: 111, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    lotte:        { name: { x: 138, y: 640 }, jumin1: { x: 256, y: 640 }, jumin2: { x: 351, y: 640 }, phone: { x: 138, y: 590 }, content: { x: 138, y: 380 }, year2: { x: 103, y: 121 }, month: { x: 156, y: 121 }, day: { x: 201, y: 121 }, signerName: { x: 363, y: 121 }, sign: { x: 427, y: 108, width: 65, height: 22 }, bankName: { x: 138, y: 290 }, account: { x: 238, y: 290 } },
    mg:           { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 429, y: 110, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    nh:           { name: { x: 142, y: 646 }, jumin1: { x: 260, y: 646 }, jumin2: { x: 355, y: 646 }, phone: { x: 142, y: 596 }, content: { x: 142, y: 386 }, year2: { x: 107, y: 125 }, month: { x: 160, y: 125 }, day: { x: 205, y: 125 }, signerName: { x: 367, y: 125 }, sign: { x: 431, y: 112, width: 65, height: 22 }, bankName: { x: 142, y: 290 }, account: { x: 242, y: 290 } },
    heungkuk:     { name: { x: 139, y: 641 }, jumin1: { x: 257, y: 641 }, jumin2: { x: 352, y: 641 }, phone: { x: 139, y: 591 }, content: { x: 139, y: 381 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    samsunglife:  { name: { x: 143, y: 649 }, jumin1: { x: 261, y: 649 }, jumin2: { x: 356, y: 649 }, phone: { x: 143, y: 599 }, content: { x: 143, y: 389 }, year2: { x: 108, y: 128 }, month: { x: 161, y: 128 }, day: { x: 206, y: 128 }, signerName: { x: 369, y: 128 }, sign: { x: 432, y: 115, width: 65, height: 22 }, bankName: { x: 143, y: 290 }, account: { x: 243, y: 290 } },
    hanhwalife:   { name: { x: 141, y: 647 }, jumin1: { x: 259, y: 647 }, jumin2: { x: 354, y: 647 }, phone: { x: 141, y: 597 }, content: { x: 141, y: 387 }, year2: { x: 106, y: 126 }, month: { x: 159, y: 126 }, day: { x: 204, y: 126 }, signerName: { x: 367, y: 126 }, sign: { x: 431, y: 113, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    kyobolife:    { name: { x: 144, y: 650 }, jumin1: { x: 262, y: 650 }, jumin2: { x: 357, y: 650 }, phone: { x: 144, y: 600 }, content: { x: 144, y: 390 }, year2: { x: 109, y: 129 }, month: { x: 162, y: 129 }, day: { x: 207, y: 129 }, signerName: { x: 371, y: 129 }, sign: { x: 434, y: 116, width: 65, height: 22 }, bankName: { x: 144, y: 290 }, account: { x: 244, y: 290 } },
    shinhanlife:  { name: { x: 142, y: 648 }, jumin1: { x: 260, y: 648 }, jumin2: { x: 355, y: 648 }, phone: { x: 142, y: 598 }, content: { x: 142, y: 388 }, year2: { x: 107, y: 127 }, month: { x: 160, y: 127 }, day: { x: 205, y: 127 }, signerName: { x: 368, y: 127 }, sign: { x: 432, y: 114, width: 65, height: 22 }, bankName: { x: 142, y: 290 }, account: { x: 242, y: 290 } },
    aialife:      { name: { x: 140, y: 646 }, jumin1: { x: 258, y: 646 }, jumin2: { x: 353, y: 646 }, phone: { x: 140, y: 596 }, content: { x: 140, y: 386 }, year2: { x: 105, y: 125 }, month: { x: 158, y: 125 }, day: { x: 203, y: 125 }, signerName: { x: 366, y: 125 }, sign: { x: 430, y: 112, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    abllife:      { name: { x: 139, y: 645 }, jumin1: { x: 257, y: 645 }, jumin2: { x: 352, y: 645 }, phone: { x: 139, y: 595 }, content: { x: 139, y: 385 }, year2: { x: 104, y: 124 }, month: { x: 157, y: 124 }, day: { x: 202, y: 124 }, signerName: { x: 365, y: 124 }, sign: { x: 429, y: 111, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    kdblife:      { name: { x: 141, y: 647 }, jumin1: { x: 259, y: 647 }, jumin2: { x: 354, y: 647 }, phone: { x: 141, y: 597 }, content: { x: 141, y: 387 }, year2: { x: 106, y: 126 }, month: { x: 159, y: 126 }, day: { x: 204, y: 126 }, signerName: { x: 367, y: 126 }, sign: { x: 431, y: 113, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    nhlife:       { name: { x: 143, y: 649 }, jumin1: { x: 261, y: 649 }, jumin2: { x: 356, y: 649 }, phone: { x: 143, y: 599 }, content: { x: 143, y: 389 }, year2: { x: 108, y: 128 }, month: { x: 161, y: 128 }, day: { x: 206, y: 128 }, signerName: { x: 370, y: 128 }, sign: { x: 433, y: 115, width: 65, height: 22 }, bankName: { x: 143, y: 290 }, account: { x: 243, y: 290 } },
    hanalife:     { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 366, y: 123 }, sign: { x: 430, y: 110, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    dongyanglife: { name: { x: 138, y: 643 }, jumin1: { x: 256, y: 643 }, jumin2: { x: 351, y: 643 }, phone: { x: 138, y: 593 }, content: { x: 138, y: 383 }, year2: { x: 103, y: 122 }, month: { x: 156, y: 122 }, day: { x: 201, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 }, bankName: { x: 138, y: 290 }, account: { x: 238, y: 290 } },
    heungkuklife: { name: { x: 139, y: 641 }, jumin1: { x: 257, y: 641 }, jumin2: { x: 352, y: 641 }, phone: { x: 139, y: 591 }, content: { x: 139, y: 381 }, year2: { x: 104, y: 120 }, month: { x: 157, y: 120 }, day: { x: 202, y: 120 }, signerName: { x: 364, y: 120 }, sign: { x: 428, y: 107, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    linalife:     { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 121 }, month: { x: 158, y: 121 }, day: { x: 203, y: 121 }, signerName: { x: 365, y: 121 }, sign: { x: 429, y: 108, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    dblife:       { name: { x: 139, y: 643 }, jumin1: { x: 257, y: 643 }, jumin2: { x: 352, y: 643 }, phone: { x: 139, y: 593 }, content: { x: 139, y: 383 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    kblife:       { name: { x: 141, y: 645 }, jumin1: { x: 259, y: 645 }, jumin2: { x: 354, y: 645 }, phone: { x: 141, y: 595 }, content: { x: 141, y: 385 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 366, y: 124 }, sign: { x: 430, y: 111, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    hanhwa:       { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 429, y: 110, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    hana:         { name: { x: 139, y: 643 }, jumin1: { x: 257, y: 643 }, jumin2: { x: 352, y: 643 }, phone: { x: 139, y: 593 }, content: { x: 139, y: 383 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 }, bankName: { x: 139, y: 290 }, account: { x: 239, y: 290 } },
    miraeassetlife:{ name: { x: 142, y: 647 }, jumin1: { x: 260, y: 647 }, jumin2: { x: 355, y: 647 }, phone: { x: 142, y: 597 }, content: { x: 142, y: 387 }, year2: { x: 107, y: 126 }, month: { x: 160, y: 126 }, day: { x: 205, y: 126 }, signerName: { x: 368, y: 126 }, sign: { x: 432, y: 113, width: 65, height: 22 }, bankName: { x: 142, y: 290 }, account: { x: 242, y: 290 } },
    imlife:       { name: { x: 138, y: 641 }, jumin1: { x: 256, y: 641 }, jumin2: { x: 351, y: 641 }, phone: { x: 138, y: 591 }, content: { x: 138, y: 381 }, year2: { x: 103, y: 120 }, month: { x: 156, y: 120 }, day: { x: 201, y: 120 }, signerName: { x: 363, y: 120 }, sign: { x: 427, y: 107, width: 65, height: 22 }, bankName: { x: 138, y: 290 }, account: { x: 238, y: 290 } },
    lina:         { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 121 }, month: { x: 158, y: 121 }, day: { x: 203, y: 121 }, signerName: { x: 365, y: 121 }, sign: { x: 429, y: 108, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
    chubblife:    { name: { x: 141, y: 645 }, jumin1: { x: 259, y: 645 }, jumin2: { x: 354, y: 645 }, phone: { x: 141, y: 595 }, content: { x: 141, y: 385 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 367, y: 124 }, sign: { x: 431, y: 111, width: 65, height: 22 }, bankName: { x: 141, y: 290 }, account: { x: 241, y: 290 } },
    fubonlife:    { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 429, y: 110, width: 65, height: 22 }, bankName: { x: 140, y: 290 }, account: { x: 240, y: 290 } },
};