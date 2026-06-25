// claim-coords.js
window.FIELD_COORDS = {
    DEFAULT: {
        // ── 피보험자 기본 정보 ──
        name:       { x: 145, y: 650, type: "text" },
        jumin1:     { x: 270, y: 650, gap: 14, type: "split" },
        jumin2:     { x: 370, y: 650, gap: 14, type: "split" },
        phone:      { x: 145, y: 600, gap: 14, type: "split" },
        job:        { x: 145, y: 625, type: "text" },
        content:    { x: 145, y: 400, type: "text" },
        year2:      { x: 110, y: 130, gap: 14, type: "split" },
        month:      { x: 160, y: 130, gap: 14, type: "split" },
        day:        { x: 205, y: 130, gap: 14, type: "split" },
        signerName: { x: 370, y: 130, type: "text" },
        sign:       { x: 430, y: 118, width: 70, height: 25, type: "image" },

        // ── 계좌정보 ──
        bankName:     { x: 145, y: 300, type: "text" },
        account:      { x: 250, y: 300, gap: 11, type: "split" },
        accountHolder:{ x: 360, y: 300, type: "text" },

        // ✅ 체크박스 분기 처리 연동
        under14: {
            yes: { x: 480, y: 650, type: "check" },
            no:  { x: 520, y: 650, type: "check" },
        },
        compensationRecipient: {
            agent:    { x: 480, y: 250, type: "check" },
            claimant: { x: 520, y: 250, type: "check" },
        },
        accountType: {
            prepaid:   { x: 145, y: 320, type: "check" },
            general:   { x: 200, y: 320, type: "check" },
            autoDebit: { x: 260, y: 320, type: "check" },
        },

        // ── 계약자 정보 ──
        contractor: {
            name:   { x: 145, y: 560, type: "text" },
            jumin1: { x: 270, y: 560, gap: 14, type: "split" },
            jumin2: { x: 370, y: 560, gap: 14, type: "split" },
            phone:  { x: 145, y: 520, gap: 14, type: "split" },
            sign:   { x: 430, y: 500, width: 70, height: 25, type: "image" },
        },
    },

    samsung:      { name: { x: 140, y: 648, type: "text" }, jumin1: { x: 260, y: 648, gap: 14, type: "split" }, jumin2: { x: 355, y: 648, gap: 14, type: "split" }, phone: { x: 140, y: 598, gap: 14, type: "split" }, content: { x: 140, y: 390, type: "text" }, year2: { x: 105, y: 128, gap: 14, type: "split" }, month: { x: 158, y: 128, gap: 14, type: "split" }, day: { x: 203, y: 128, gap: 14, type: "split" }, signerName: { x: 365, y: 128, type: "text" }, sign: { x: 505, y: 172, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    db:           { name: { x: 140, y: 645, type: "text" }, jumin1: { x: 258, y: 645, gap: 14, type: "split" }, jumin2: { x: 353, y: 645, gap: 14, type: "split" }, phone: { x: 140, y: 595, gap: 14, type: "split" }, content: { x: 140, y: 385, type: "text" }, year2: { x: 107, y: 126, gap: 14, type: "split" }, month: { x: 160, y: 126, gap: 14, type: "split" }, day: { x: 205, y: 126, gap: 14, type: "split" }, signerName: { x: 368, y: 126, type: "text" }, sign: { x: 535, y: 145, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    kb:           { name: { x: 143, y: 647, type: "text" }, jumin1: { x: 262, y: 647, gap: 14, type: "split" }, jumin2: { x: 357, y: 647, gap: 14, type: "split" }, phone: { x: 143, y: 597, gap: 14, type: "split" }, content: { x: 143, y: 388, type: "text" }, year2: { x: 108, y: 127, gap: 14, type: "split" }, month: { x: 161, y: 127, gap: 14, type: "split" }, day: { x: 206, y: 127, gap: 14, type: "split" }, signerName: { x: 370, y: 127, type: "text" }, sign: { x: 515, y: 65, width: 65, height: 22, type: "image" }, bankName: { x: 143, y: 290, type: "text" }, account: { x: 243, y: 290, gap: 11, type: "split" } },
    meritz:       { name: { x: 141, y: 643, type: "text" }, jumin1: { x: 259, y: 643, gap: 14, type: "split" }, jumin2: { x: 354, y: 643, gap: 14, type: "split" }, phone: { x: 141, y: 593, gap: 14, type: "split" }, content: { x: 141, y: 383, type: "text" }, year2: { x: 106, y: 124, gap: 14, type: "split" }, month: { x: 159, y: 124, gap: 14, type: "split" }, day: { x: 204, y: 124, gap: 14, type: "split" }, signerName: { x: 366, y: 124, type: "text" }, sign: { x: 495, y: 72, width: 65, height: 22, type: "image" }, bankName: { x: 141, y: 290, type: "text" }, account: { x: 241, y: 290, gap: 11, type: "split" } },
    lotte:        { name: { x: 138, y: 640, type: "text" }, jumin1: { x: 256, y: 640, gap: 14, type: "split" }, jumin2: { x: 351, y: 640, gap: 14, type: "split" }, phone: { x: 138, y: 590, gap: 14, type: "split" }, content: { x: 138, y: 380, type: "text" }, year2: { x: 103, y: 121, gap: 14, type: "split" }, month: { x: 156, y: 121, gap: 14, type: "split" }, day: { x: 201, y: 121, gap: 14, type: "split" }, signerName: { x: 363, y: 121, type: "text" }, sign: { x: 460, y: 103, width: 65, height: 22, type: "image" }, bankName: { x: 138, y: 290, type: "text" }, account: { x: 238, y: 290, gap: 11, type: "split" } },
    mg:           { name: { x: 140, y: 642, type: "text" }, jumin1: { x: 258, y: 642, gap: 14, type: "split" }, jumin2: { x: 353, y: 642, gap: 14, type: "split" }, phone: { x: 140, y: 592, gap: 14, type: "split" }, content: { x: 140, y: 382, type: "text" }, year2: { x: 105, y: 123, gap: 14, type: "split" }, month: { x: 158, y: 123, gap: 14, type: "split" }, day: { x: 203, y: 123, gap: 14, type: "split" }, signerName: { x: 365, y: 123, type: "text" }, sign: { x: 310, y: 215, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    nh:           { name: { x: 142, y: 646, type: "text" }, jumin1: { x: 260, y: 646, gap: 14, type: "split" }, jumin2: { x: 355, y: 646, gap: 14, type: "split" }, phone: { x: 142, y: 596, gap: 14, type: "split" }, content: { x: 142, y: 386, type: "text" }, year2: { x: 107, y: 125, gap: 14, type: "split" }, month: { x: 160, y: 125, gap: 14, type: "split" }, day: { x: 205, y: 125, gap: 14, type: "split" }, signerName: { x: 367, y: 125, type: "text" }, sign: { x: 520, y: 124, width: 65, height: 22, type: "image" }, bankName: { x: 142, y: 290, type: "text" }, account: { x: 242, y: 290, gap: 11, type: "split" } },
    heungkuk:     { name: { x: 139, y: 641, type: "text" }, jumin1: { x: 257, y: 641, gap: 14, type: "split" }, jumin2: { x: 352, y: 641, gap: 14, type: "split" }, phone: { x: 139, y: 591, gap: 14, type: "split" }, content: { x: 139, y: 381, type: "text" }, year2: { x: 104, y: 122, gap: 14, type: "split" }, month: { x: 157, y: 122, gap: 14, type: "split" }, day: { x: 202, y: 122, gap: 14, type: "split" }, signerName: { x: 364, y: 122, type: "text" }, sign: { x: 520, y: 96,  width: 65, height: 22, type: "image" }, bankName: { x: 139, y: 290, type: "text" }, account: { x: 239, y: 290, gap: 11, type: "split" } },
    samsunglife:  { name: { x: 143, y: 649, type: "text" }, jumin1: { x: 261, y: 649, gap: 14, type: "split" }, jumin2: { x: 356, y: 649, gap: 14, type: "split" }, phone: { x: 143, y: 599, gap: 14, type: "split" }, content: { x: 143, y: 389, type: "text" }, year2: { x: 108, y: 128, gap: 14, type: "split" }, month: { x: 161, y: 128, gap: 14, type: "split" }, day: { x: 206, y: 128, gap: 14, type: "split" }, signerName: { x: 369, y: 128, type: "text" }, sign: { x: 510, y: 108, width: 65, height: 22, type: "image" }, bankName: { x: 143, y: 290, type: "text" }, account: { x: 243, y: 290, gap: 11, type: "split" } },
    hanhwalife:   { name: { x: 141, y: 647, type: "text" }, jumin1: { x: 259, y: 647, gap: 14, type: "split" }, jumin2: { x: 354, y: 647, gap: 14, type: "split" }, phone: { x: 141, y: 597, gap: 14, type: "split" }, content: { x: 141, y: 387, type: "text" }, year2: { x: 106, y: 126, gap: 14, type: "split" }, month: { x: 159, y: 126, gap: 14, type: "split" }, day: { x: 204, y: 126, gap: 14, type: "split" }, signerName: { x: 367, y: 126, type: "text" }, sign: { x: 500, y: 150, width: 65, height: 22, type: "image" }, bankName: { x: 141, y: 290, type: "text" }, account: { x: 241, y: 290, gap: 11, type: "split" } },
    kyobolife:    { name: { x: 144, y: 650, type: "text" }, jumin1: { x: 262, y: 650, gap: 14, type: "split" }, jumin2: { x: 357, y: 650, gap: 14, type: "split" }, phone: { x: 144, y: 600, gap: 14, type: "split" }, content: { x: 144, y: 390, type: "text" }, year2: { x: 109, y: 129, gap: 14, type: "split" }, month: { x: 162, y: 129, gap: 14, type: "split" }, day: { x: 207, y: 129, gap: 14, type: "split" }, signerName: { x: 371, y: 129, type: "text" }, sign: { x: 480, y: 130, width: 65, height: 22, type: "image" }, bankName: { x: 144, y: 290, type: "text" }, account: { x: 244, y: 290, gap: 11, type: "split" } },
    shinhanlife:  { name: { x: 142, y: 648, type: "text" }, jumin1: { x: 260, y: 648, gap: 14, type: "split" }, jumin2: { x: 355, y: 648, gap: 14, type: "split" }, phone: { x: 142, y: 598, gap: 14, type: "split" }, content: { x: 142, y: 388, type: "text" }, year2: { x: 107, y: 127, gap: 14, type: "split" }, month: { x: 160, y: 127, gap: 14, type: "split" }, day: { x: 205, y: 127, gap: 14, type: "split" }, signerName: { x: 368, y: 127, type: "text" }, sign: { x: 435, y: 170, width: 65, height: 22, type: "image" }, bankName: { x: 142, y: 290, type: "text" }, account: { x: 242, y: 290, gap: 11, type: "split" } },
    aialife:      { name: { x: 140, y: 646, type: "text" }, jumin1: { x: 258, y: 646, gap: 14, type: "split" }, jumin2: { x: 353, y: 646, gap: 14, type: "split" }, phone: { x: 140, y: 596, gap: 14, type: "split" }, content: { x: 140, y: 386, type: "text" }, year2: { x: 105, y: 125, gap: 14, type: "split" }, month: { x: 158, y: 125, gap: 14, type: "split" }, day: { x: 203, y: 125, gap: 14, type: "split" }, signerName: { x: 366, y: 125, type: "text" }, sign: { x: 500, y: 68,  width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    abllife:      { name: { x: 139, y: 645, type: "text" }, jumin1: { x: 257, y: 645, gap: 14, type: "split" }, jumin2: { x: 352, y: 645, gap: 14, type: "split" }, phone: { x: 139, y: 595, gap: 14, type: "split" }, content: { x: 139, y: 385, type: "text" }, year2: { x: 104, y: 124, gap: 14, type: "split" }, month: { x: 157, y: 124, gap: 14, type: "split" }, day: { x: 202, y: 124, gap: 14, type: "split" }, signerName: { x: 365, y: 124, type: "text" }, sign: { x: 490, y: 210, width: 65, height: 22, type: "image" }, bankName: { x: 139, y: 290, type: "text" }, account: { x: 239, y: 290, gap: 11, type: "split" } },
    kdblife:      { name: { x: 141, y: 647, type: "text" }, jumin1: { x: 259, y: 647, gap: 14, type: "split" }, jumin2: { x: 354, y: 647, gap: 14, type: "split" }, phone: { x: 141, y: 597, gap: 14, type: "split" }, content: { x: 141, y: 387, type: "text" }, year2: { x: 106, y: 126, gap: 14, type: "split" }, month: { x: 159, y: 126, gap: 14, type: "split" }, day: { x: 204, y: 126, gap: 14, type: "split" }, signerName: { x: 367, y: 126, type: "text" }, sign: { x: 520, y: 180, width: 65, height: 22, type: "image" }, bankName: { x: 141, y: 290, type: "text" }, account: { x: 241, y: 290, gap: 11, type: "split" } },
    nhlife:       { name: { x: 143, y: 649, type: "text" }, jumin1: { x: 261, y: 649, gap: 14, type: "split" }, jumin2: { x: 356, y: 649, gap: 14, type: "split" }, phone: { x: 143, y: 599, gap: 14, type: "split" }, content: { x: 143, y: 389, type: "text" }, year2: { x: 108, y: 128, gap: 14, type: "split" }, month: { x: 161, y: 128, gap: 14, type: "split" }, day: { x: 206, y: 128, gap: 14, type: "split" }, signerName: { x: 370, y: 128, type: "text" }, sign: { x: 520, y: 120, width: 65, height: 22, type: "image" }, bankName: { x: 143, y: 290, type: "text" }, account: { x: 243, y: 290, gap: 11, type: "split" } },
    hanalife:     { name: { x: 140, y: 644, type: "text" }, jumin1: { x: 258, y: 644, gap: 14, type: "split" }, jumin2: { x: 353, y: 644, gap: 14, type: "split" }, phone: { x: 140, y: 594, gap: 14, type: "split" }, content: { x: 140, y: 384, type: "text" }, year2: { x: 105, y: 123, gap: 14, type: "split" }, month: { x: 158, y: 123, gap: 14, type: "split" }, day: { x: 203, y: 123, gap: 14, type: "split" }, signerName: { x: 366, y: 123, type: "text" }, sign: { x: 430, y: 110, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    dongyanglife: { name: { x: 138, y: 643, type: "text" }, jumin1: { x: 256, y: 643, gap: 14, type: "split" }, jumin2: { x: 351, y: 643, gap: 14, type: "split" }, phone: { x: 138, y: 593, gap: 14, type: "split" }, content: { x: 138, y: 383, type: "text" }, year2: { x: 103, y: 122, gap: 14, type: "split" }, month: { x: 156, y: 122, gap: 14, type: "split" }, day: { x: 201, y: 122, gap: 14, type: "split" }, signerName: { x: 364, y: 122, type: "text" }, sign: { x: 455, y: 185, width: 65, height: 22, type: "image" }, bankName: { x: 138, y: 290, type: "text" }, account: { x: 238, y: 290, gap: 11, type: "split" } },
    heungkuklife: { name: { x: 139, y: 641, type: "text" }, jumin1: { x: 257, y: 641, gap: 14, type: "split" }, jumin2: { x: 352, y: 641, gap: 14, type: "split" }, phone: { x: 139, y: 591, gap: 14, type: "split" }, content: { x: 139, y: 381, type: "text" }, year2: { x: 104, y: 120, gap: 14, type: "split" }, month: { x: 157, y: 120, gap: 14, type: "split" }, day: { x: 202, y: 120, gap: 14, type: "split" }, signerName: { x: 364, y: 120, type: "text" }, sign: { x: 480, y: 60,  width: 65, height: 22, type: "image" }, bankName: { x: 139, y: 290, type: "text" }, account: { x: 239, y: 290, gap: 11, type: "split" } },
    linalife:     { name: { x: 140, y: 642, type: "text" }, jumin1: { x: 258, y: 642, gap: 14, type: "split" }, jumin2: { x: 353, y: 642, gap: 14, type: "split" }, phone: { x: 140, y: 592, gap: 14, type: "split" }, content: { x: 140, y: 382, type: "text" }, year2: { x: 105, y: 121, gap: 14, type: "split" }, month: { x: 158, y: 121, gap: 14, type: "split" }, day: { x: 203, y: 121, gap: 14, type: "split" }, signerName: { x: 365, y: 121, type: "text" }, sign: { x: 210, y: 40,  width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    dblife:       { name: { x: 139, y: 643, type: "text" }, jumin1: { x: 257, y: 643, gap: 14, type: "split" }, jumin2: { x: 352, y: 643, gap: 14, type: "split" }, phone: { x: 139, y: 593, gap: 14, type: "split" }, content: { x: 139, y: 383, type: "text" }, year2: { x: 104, y: 122, gap: 14, type: "split" }, month: { x: 157, y: 122, gap: 14, type: "split" }, day: { x: 202, y: 122, gap: 14, type: "split" }, signerName: { x: 364, y: 122, type: "text" }, sign: { x: 510, y: 110, width: 65, height: 22, type: "image" }, bankName: { x: 139, y: 290, type: "text" }, account: { x: 239, y: 290, gap: 11, type: "split" } },
    kblife:       { name: { x: 141, y: 645, type: "text" }, jumin1: { x: 259, y: 645, gap: 14, type: "split" }, jumin2: { x: 354, y: 645, gap: 14, type: "split" }, phone: { x: 141, y: 595, gap: 14, type: "split" }, content: { x: 141, y: 385, type: "text" }, year2: { x: 106, y: 124, gap: 14, type: "split" }, month: { x: 159, y: 124, gap: 14, type: "split" }, day: { x: 204, y: 124, gap: 14, type: "split" }, signerName: { x: 366, y: 124, type: "text" }, sign: { x: 215, y: 140, width: 65, height: 22, type: "image" }, bankName: { x: 141, y: 290, type: "text" }, account: { x: 241, y: 290, gap: 11, type: "split" } },
    hanhwa:       { name: { x: 140, y: 644, type: "text" }, jumin1: { x: 258, y: 644, gap: 14, type: "split" }, jumin2: { x: 353, y: 644, gap: 14, type: "split" }, phone: { x: 140, y: 594, gap: 14, type: "split" }, content: { x: 140, y: 384, type: "text" }, year2: { x: 105, y: 123, gap: 14, type: "split" }, month: { x: 158, y: 123, gap: 14, type: "split" }, day: { x: 203, y: 123, gap: 14, type: "split" }, signerName: { x: 365, y: 123, type: "text" }, sign: { x: 505, y: 120, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    hana:         { name: { x: 139, y: 643, type: "text" }, jumin1: { x: 257, y: 643, gap: 14, type: "split" }, jumin2: { x: 352, y: 643, gap: 14, type: "split" }, phone: { x: 139, y: 593, gap: 14, type: "split" }, content: { x: 139, y: 383, type: "text" }, year2: { x: 104, y: 122, gap: 14, type: "split" }, month: { x: 157, y: 122, gap: 14, type: "split" }, day: { x: 202, y: 122, gap: 14, type: "split" }, signerName: { x: 364, y: 122, type: "text" }, sign: { x: 505, y: 90,  width: 65, height: 22, type: "image" }, bankName: { x: 139, y: 290, type: "text" }, account: { x: 239, y: 290, gap: 11, type: "split" } },
    miraeassetlife:{ name: { x: 142, y: 647, type: "text" }, jumin1: { x: 260, y: 647, gap: 14, type: "split" }, jumin2: { x: 355, y: 647, gap: 14, type: "split" }, phone: { x: 142, y: 597, gap: 14, type: "split" }, content: { x: 142, y: 387, type: "text" }, year2: { x: 107, y: 126, gap: 14, type: "split" }, month: { x: 160, y: 126, gap: 14, type: "split" }, day: { x: 205, y: 126, gap: 14, type: "split" }, signerName: { x: 368, y: 126, type: "text" }, sign: { x: 400, y: 196, width: 65, height: 22, type: "image" }, bankName: { x: 142, y: 290, type: "text" }, account: { x: 242, y: 290, gap: 11, type: "split" } },
    imlife:       { name: { x: 138, y: 641, type: "text" }, jumin1: { x: 256, y: 641, gap: 14, type: "split" }, jumin2: { x: 351, y: 641, gap: 14, type: "split" }, phone: { x: 138, y: 591, gap: 14, type: "split" }, content: { x: 138, y: 381, type: "text" }, year2: { x: 103, y: 120, gap: 14, type: "split" }, month: { x: 156, y: 120, gap: 14, type: "split" }, day: { x: 201, y: 120, gap: 14, type: "split" }, signerName: { x: 363, y: 120, type: "text" }, sign: { x: 130, y: 115, width: 65, height: 22, type: "image" }, bankName: { x: 138, y: 290, type: "text" }, account: { x: 238, y: 290, gap: 11, type: "split" } },
    lina:         { name: { x: 140, y: 642, type: "text" }, jumin1: { x: 258, y: 642, gap: 14, type: "split" }, jumin2: { x: 353, y: 642, gap: 14, type: "split" }, phone: { x: 140, y: 592, gap: 14, type: "split" }, content: { x: 140, y: 382, type: "text" }, year2: { x: 105, y: 121, gap: 14, type: "split" }, month: { x: 158, y: 121, gap: 14, type: "split" }, day: { x: 203, y: 121, gap: 14, type: "split" }, signerName: { x: 365, y: 121, type: "text" }, sign: { x: 429, y: 108, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
    chubblife:    { name: { x: 141, y: 645, type: "text" }, jumin1: { x: 259, y: 645, gap: 14, type: "split" }, jumin2: { x: 354, y: 645, gap: 14, type: "split" }, phone: { x: 141, y: 595, gap: 14, type: "split" }, content: { x: 141, y: 385, type: "text" }, year2: { x: 106, y: 124, gap: 14, type: "split" }, month: { x: 159, y: 124, gap: 14, type: "split" }, day: { x: 204, y: 124, gap: 14, type: "split" }, signerName: { x: 367, y: 124, type: "text" }, sign: { x: 250, y: 280, width: 65, height: 22, type: "image" }, bankName: { x: 141, y: 290, type: "text" }, account: { x: 241, y: 290, gap: 11, type: "split" } },
    fubonlife:    { name: { x: 140, y: 644, type: "text" }, jumin1: { x: 258, y: 644, gap: 14, type: "split" }, jumin2: { x: 353, y: 644, gap: 14, type: "split" }, phone: { x: 140, y: 594, gap: 14, type: "split" }, content: { x: 140, y: 384, type: "text" }, year2: { x: 105, y: 123, gap: 14, type: "split" }, month: { x: 158, y: 123, gap: 14, type: "split" }, day: { x: 203, y: 123, gap: 14, type: "split" }, signerName: { x: 365, y: 123, type: "text" }, sign: { x: 510, y: 235, width: 65, height: 22, type: "image" }, bankName: { x: 140, y: 290, type: "text" }, account: { x: 240, y: 290, gap: 11, type: "split" } },
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
        name:       { x: 145, y: 583 },
        jumin1:     { x: 270, y: 583 },
        jumin2:     { x: 400, y: 583 },
        phone:      { x: 145, y: 493 },
        content:    { x: 240, y: 213 },
        year2:      { x: 110, y: 412 },
        month:      { x: 165, y: 412 },
        day:        { x: 215, y: 412 },
        signerName: { x: 430, y: 412 },
        sign:       { x: 500, y: 405, width: 60, height: 22 },
        bankName:   { x: 145, y: 300 },
        account:    { x: 250, y: 300 },
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