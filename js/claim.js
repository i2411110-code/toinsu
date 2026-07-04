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
    if (targetGrid) {
        targetGrid.style.display = (targetGridId === 'grid-liability') ? 'block' : 'grid';
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
    if (nextBtn) {
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
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.background = '#3182F6';
        nextBtn.style.color = 'white';
        nextBtn.style.cursor = 'pointer';
        nextBtn.innerText = companyName + ' 청구 진행하기';
        nextBtn.onclick = function() {
            window.currentDraftId = null;
            window.navigateTo('page-claim-form');
        };
    }
};

// ==========================================
// [청구서 작성 폼 - 캔버스 및 PDF 전역 로직]
// ==========================================

// ─── 보험사명 → PDF 파일명 매핑 테이블 (정식 명칭 100% 매치 완료) ───
const CLAIM_PDF_MAP = {
    // ── 손해보험 ──
    '현대해상':          { file: 'hyundai',        pages: 5 },
    'AIG손해보험':       { file: 'aig',            pages: 1 },
    'AXA손해보험':       { file: 'axa',            pages: 1 },
    'DB손해보험':        { file: 'db',             pages: 5 },
    'KB손해보험':        { file: 'kb',             pages: 1 },
    'NH농협손해보험':    { file: 'nh',             pages: 1 },
    '교직원공제':        { file: 'thek',           pages: 1 },
    '라이나손해보험':    { file: 'lina',           pages: 1 },
    '롯데손해보험':      { file: 'lotte',          pages: 1 },
    '메리츠화재':        { file: 'meritz',         pages: 1 },
    '삼성화재':          { file: 'samsung',        pages: 1 },
    '새마을금고공제':    { file: 'mg',             pages: 1 },
    '수협공제':          { file: 'suhyup',         pages: 1 },
    '신한EZ손해보험':    { file: 'shinhanez',      pages: 1 },
    '신협공제':          { file: 'sinhup',         pages: 1 },
    '예별손해보험':      { file: 'ybi',            pages: 1 },
    '우체국보험':        { file: 'epost',          pages: 1 },
    '하나손해보험':      { file: 'hana',           pages: 1 },
    '한화손해보험':      { file: 'hanwha',         pages: 1 },
    '흥국화재':          { file: 'heungkuk',       pages: 1 },

    // ── 생명보험 ──
    'ABL생명':           { file: 'abllife',        pages: 1 },
    'AIA생명':           { file: 'aialife',        pages: 1 },
    'BNP파리바카디프생명': { file: 'fubonlife',    pages: 1 },
    'DB생명':            { file: 'dblife',         pages: 1 },
    'KB라이프생명':      { file: 'kblife',         pages: 1 },
    'KDB생명':           { file: 'kdblife',        pages: 1 },
    'NH농협생명':        { file: 'nhlife',         pages: 1 },
    'iM생명':            { file: 'imlife',         pages: 1 },
    '교보라이프플래닛생명': { file: 'lifeplanet',   pages: 1 },
    '교보생명':          { file: 'kyobolife',      pages: 1 },
    '동양생명':          { file: 'dongyanglife',   pages: 1 },
    '라이나생명':        { file: 'linalife',       pages: 1 },
    '메트라이프생명':    { file: 'metlife',        pages: 1 },
    '미래에셋생명':      { file: 'miraeassetlife', pages: 1 },
    '삼성생명':          { file: 'samsunglife',    pages: 1 },
    '신한라이프':        { file: 'shinhanlife',    pages: 1 },
    '오렌지라이프':      { file: 'orangelife',     pages: 1 },
    '처브라이프생명':    { file: 'chubblife',      pages: 1 },
    '푸르덴셜생명':      { file: 'prudential',     pages: 1 },
    '푸본현대생명':      { file: 'fubonlife',      pages: 1 },
    '하나생명':          { file: 'hanalife',       pages: 1 },
    '한화생명':          { file: 'hanhwalife',     pages: 1 },
    '흥국생명':          { file: 'heungkuklife',   pages: 1 }
};

// ─── 화면 초기화 ───
window.initClaimCanvas = function() {
    const company = window.selectedClaimInsurance || '선택안됨';
    const titleEl = document.getElementById('claim-form-title');
    if (titleEl) titleEl.innerText = company + ' 청구서 작성';

    window.initUiToggleGroups();

    window.claimAttachments = [];
    window._renderClaimFileList();

    ['signature-pad', 'signature-pad-contractor'].forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0F172A';
    });

     ['signature-pad', 'signature-pad-contractor', 'signature-pad-agent'].forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0F172A';
    });

    if (window.currentDraftId) {
        window._restoreDraftToForm(window.currentDraftId);
    }
};

// ─── 서명 그리기 ───
window._signDrawState = {};

function _signPlaceholderId(canvasId) {
    if (canvasId === 'signature-pad-contractor') return 'sign-placeholder-contractor';
    if (canvasId === 'signature-pad-agent')       return 'sign-placeholder-agent';
    return 'sign-placeholder';
}


window.startSign = function(e, canvasId) {
    canvasId = canvasId || 'signature-pad';
    if (e.type.includes('touch')) e.preventDefault();
    window._signDrawState[canvasId] = true;
    const ph = document.getElementById(_signPlaceholderId(canvasId));
    if (ph) ph.style.display = 'none';
    window.drawSign(e, canvasId);
};
window.stopSign = function(canvasId) {
    canvasId = canvasId || 'signature-pad';
    window._signDrawState[canvasId] = false;
    const canvas = document.getElementById(canvasId);
    if (canvas) canvas.getContext('2d').beginPath();
};
window.drawSign = function(e, canvasId) {
    canvasId = canvasId || 'signature-pad';
    if (!window._signDrawState[canvasId]) return;
    if (e.type.includes('touch')) e.preventDefault();
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
};
window.clearSignature = function(canvasId) {
    canvasId = canvasId || 'signature-pad';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const ph = document.getElementById(_signPlaceholderId(canvasId));
    if (ph) ph.style.display = 'block';
};

// ==========================================
// [사고 유형 토글 버튼 (.ui-toggle)]
// ==========================================
window.initUiToggleGroups = function() {
    document.querySelectorAll('.ui-toggle').forEach(group => {
        const targetId    = group.dataset.target;
        const hiddenInput = targetId ? document.getElementById(targetId) : null;
        const showTargetId = group.dataset.showTarget;
        const showWhen     = group.dataset.showWhen;

        const applyVisibility = (val) => {
            if (!showTargetId) return;
            const showEl = document.getElementById(showTargetId);
            if (showEl) showEl.style.display = (val === showWhen) ? 'block' : 'none';
        };

        group.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = btn.dataset.val || btn.innerText.trim();
                if (hiddenInput) hiddenInput.value = val;
                applyVisibility(val);
            });
        });

        if (showTargetId) {
            const activeBtn = group.querySelector('.toggle-btn.active');
            applyVisibility(activeBtn ? (activeBtn.dataset.val || activeBtn.innerText.trim()) : '');
        }
    });
};

function setToggleGroupValue(targetId, value) {
    const hiddenInput = document.getElementById(targetId);
    if (hiddenInput) hiddenInput.value = value;

    const group = document.querySelector(`.ui-toggle[data-target="${targetId}"]`);
    if (!group) return;

    group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.val || btn.innerText.trim()) === value);
    });

    const showTargetId = group.dataset.showTarget;
    const showWhen      = group.dataset.showWhen;
    if (showTargetId) {
        const showEl = document.getElementById(showTargetId);
        if (showEl) showEl.style.display = (value === showWhen) ? 'block' : 'none';
    }
}

// ==========================================
// [첨부서류 업로드]
// ==========================================
window.claimAttachments = window.claimAttachments || [];

window.handleClaimFileSelect = function(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    files.forEach(file => {
        if (file.size > MAX_SIZE) {
            alert(`"${file.name}" 파일이 너무 큽니다 (10MB 이하만 업로드 가능).`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            window.claimAttachments.push({
                name: file.name,
                type: file.type,
                dataUrl: e.target.result,
            });
            window._renderClaimFileList();
        };
        reader.readAsDataURL(file);
    });
    event.target.value = '';
};

window.removeClaimFile = function(idx) {
    window.claimAttachments.splice(idx, 1);
    window._renderClaimFileList();
};

window._renderClaimFileList = function() {
    const listEl  = document.getElementById('claim-file-list');
    if (!listEl) return;

    const files = window.claimAttachments || [];

    if (files.length === 0) {
        listEl.innerHTML = `
            <div id="claim-file-empty" style="text-align:center; color:#B0B8C1; font-size:13px; padding:8px 0;">
                아직 첨부된 파일이 없습니다.
            </div>`;
        return;
    }

    listEl.innerHTML = files.map((f, idx) => {
        const isImg = f.type && f.type.startsWith('image/');
        const icon = isImg ? 'bi-file-image' : 'bi-file-earmark-pdf';
        return `
            <div class="file-item">
                <span style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <i class="bi ${icon}" style="color:#3182F6; flex-shrink:0;"></i>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
                </span>
                <button type="button" class="file-remove" onclick="window.removeClaimFile(${idx})">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>`;
    }).join('');
};

// ==========================================
// [청구 데이터 모델 및 수집]
// ==========================================
function collectFormData() {
    const insuredName  = (document.getElementById('form-name')?.value         || '').trim();
    const phone        = (document.getElementById('form-phone')?.value        || '').trim();
    const content      = (document.getElementById('form-content')?.value      || '').trim();
    const accidentType = (document.getElementById('form-accident-type')?.value|| '').trim();
    const job          = (document.getElementById('form-job')?.value          || '').trim();
    // ✅ 주소 (DB손해보험 전용 신규 필드 - HTML 폼에 id="form-address" 인풋 필요)
    const address       = (document.getElementById('form-address')?.value     || '').trim();

    const insuredUnder14 = (document.getElementById('form-under14')?.value || '아니오').trim();

    const sameAsInsured        = (document.getElementById('form-same-as-insured')?.value || '예').trim();
    const contractorName       = (document.getElementById('form-contractor-name')?.value         || '').trim();
    const contractorPhone      = (document.getElementById('form-contractor-phone')?.value        || '').trim();
    const contractorJuminFront = (document.getElementById('form-contractor-jumin-front')?.value  || '').trim();
    const contractorJuminBack  = (document.getElementById('form-contractor-jumin-back')?.value   || '').trim();
    const contractorJumin      = (contractorJuminFront + contractorJuminBack).replace(/[^0-9]/g, '').trim();

    const compensationRecipient = (document.getElementById('form-compensation-recipient')?.value || '보험청구인').trim();

    const accountType  = (document.getElementById('form-account-type')?.value || '일반').trim();
    const bankName      = (document.getElementById('form-bank-name')?.value    || '').trim();
    const account        = (document.getElementById('form-account')?.value      || '').trim();
    const accountHolder = (document.getElementById('form-account-holder')?.value || '').trim();

    const yy = (document.getElementById('form-year')?.value  || '').trim();
    const mm = (document.getElementById('form-month')?.value || '').trim().padStart(2, '0');
    const dd = (document.getElementById('form-day')?.value   || '').trim().padStart(2, '0');
    const treatDate = (yy && mm && dd) ? `${yy}-${mm}-${dd}` : '';

    const juminFront = (document.getElementById('form-jumin-front')?.value || '').trim();
    const juminBack  = (document.getElementById('form-jumin-back')?.value  || '').trim();
    const jumin = (juminFront + juminBack).replace(/[^0-9]/g, '').trim();

    return {
        insuredName, phone, content, treatDate, jumin, accidentType, job, address, bankName, account,
        insuredUnder14, sameAsInsured, contractorName, contractorPhone, contractorJumin,
        compensationRecipient, accountType, accountHolder,
    };
}

function getTodayDateFields() {
    const today = new Date();
    const year  = String(today.getFullYear());
    const year2 = year.slice(2, 4);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day   = String(today.getDate()).padStart(2, '0');
    return { year, year2, month, day };
}

// 주민등록번호 뒷자리 7자리 안전 수집
function splitJumin(jumin) {
    if (!jumin) return { jumin1: '', jumin2: '' };
    const clean = jumin.replace(/[^0-9]/g, '');
    return { jumin1: clean.slice(0, 6), jumin2: clean.slice(6) };
}

// 🔴 [추가] 주민번호 13자리를 분리해서 찍어주는 함수
function drawJumin(pdfPage, juminValue, insuranceKey) {
    if (!juminValue || juminValue.length !== 13) return;

    const config = window.FIELD_COORDS[insuranceKey] || window.FIELD_COORDS.DEFAULT;
    const start = config.juminStart || window.FIELD_COORDS.DEFAULT.juminStart;
    const gap = config.juminGap || window.FIELD_COORDS.DEFAULT.juminGap;

    const chars = juminValue.split('');
    chars.forEach((char, index) => {
        // 주민번호 뒷자리(7번째 글자, index 6)부터는 하이픈(-) 영역 때문에 추가 여백 10을 줌
        const xOffset = (index >= 6) ? 10 : 0; 
        
        pdfPage.drawText(char, {
            x: start.x + (index * gap) + xOffset,
            y: start.y,
            size: 12 // 필요시 폰트 사이즈 조정
        });
    });
}

async function getSignImage(pdfDoc, canvasId) {
    canvasId = canvasId || 'signature-pad';
    const canvas = document.getElementById(canvasId);
    // ⚠️ [방어 코드 - 2026-07-04 추가] 계약자 서명칸처럼 화면에서 display:none으로
    // 숨겨진 상태로 초기화된 캔버스는 offsetWidth가 0이 되어(initClaimCanvas의
    // canvas.width = canvas.parentElement.offsetWidth 로직 때문) 크기가 0인 캔버스가
    // 됩니다. 이 상태에서 toDataURL()을 호출하면 "data:," 같은 깨진 값이 나와서
    // embedPng()가 "The input is not a PNG file!" 오류를 던집니다. 아래에서
    // 캔버스 크기와 dataURL 형식을 먼저 검증해 서명이 없는 것으로 안전하게 처리합니다.
    if (!canvas || !canvas.width || !canvas.height) return null;
    try {
        const signDataUrl = canvas.toDataURL('image/png');
        if (!signDataUrl || !signDataUrl.startsWith('data:image/png')) return null;
        const blank = document.createElement('canvas').toDataURL('image/png');
        if (signDataUrl === blank) return null;
        const signBytes = await fetch(signDataUrl).then(r => r.arrayBuffer());
        return await pdfDoc.embedPng(signBytes);
    } catch (e) {
        console.warn(`[서명 이미지 무시] "${canvasId}" 캔버스에서 서명을 읽는 중 오류가 발생해 서명 없이 진행합니다:`, e);
        return null;
    }
}

function getSignDataUrl(canvasId) {
    canvasId = canvasId || 'signature-pad';
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.width || !canvas.height) return null;
    try {
        const dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || !dataUrl.startsWith('data:image/png')) return null;
        const blank = document.createElement('canvas').toDataURL('image/png');
        return dataUrl === blank ? null : dataUrl;
    } catch (e) {
        console.warn(`[서명 저장 무시] "${canvasId}" 캔버스 dataURL 변환 중 오류:`, e);
        return null;
    }
}

async function restoreSignFromDataUrl(dataUrl, canvasId) {
    canvasId = canvasId || 'signature-pad';
    if (!dataUrl) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const ph = document.getElementById(_signPlaceholderId(canvasId));
        if (ph) ph.style.display = 'none';
    };
    img.src = dataUrl;
}

async function loadPdfAndFont(pdfDoc, fileKey) {
    const formUrl = `./forms/${fileKey}.pdf`;
    const fontUrl = 'fonts/noto-sans-kr/Noto_Sans_KR/ChosunSg.TTF';
    const [pdfRes, fontRes] = await Promise.all([fetch(formUrl), fetch(fontUrl)]);
    if (!pdfRes.ok)  throw new Error(`PDF 양식을 찾을 수 없습니다: forms/${fileKey}.pdf`);
    if (!fontRes.ok) throw new Error('폰트 파일을 찾을 수 없습니다: fonts/noto-sans-kr/Noto_Sans_KR/ChosunSg.TTF');
    const [pdfBytes, fontBytes] = await Promise.all([pdfRes.arrayBuffer(), fontRes.arrayBuffer()]);
    return { pdfBytes, fontBytes };
}

async function outputPdf(pdfDoc, mode, fileName) {
    const resultBytes = await pdfDoc.save();
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    if (mode === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || '청구서.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
        window.open(url, '_blank');
    }
}

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
// [임시저장 (Draft) 기능]
// ==========================================
window.currentDraftId = null;

window.saveDraft = async function() {
    const btn = document.getElementById('btn-save-draft');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 저장 중...'; }

    try {
        const { collection, doc, addDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { alert('로그인이 필요합니다.'); return; }

        const db = window.__firestoreDb;
        if (!db) throw new Error('Firestore 인스턴스를 찾을 수 없습니다.');

        const fd = collectFormData();
        const signDataUrl            = getSignDataUrl('signature-pad');
        const contractorSignDataUrl  = getSignDataUrl('signature-pad-contractor');

        const record = {
            status:       'draft',
            company:      window.selectedClaimInsurance || '',
            fileKey:      CLAIM_PDF_MAP[window.selectedClaimInsurance]?.file || '',
            insuredName:  fd.insuredName,
            jumin:        fd.jumin,
            phone:        fd.phone,
            treatDate:    fd.treatDate,
            content:      fd.content,
            accidentType: fd.accidentType,
            job:          fd.job,
            bankName:     fd.bankName,
            account:      fd.account,
            accountHolder: fd.accountHolder,
            accountType:   fd.accountType,
            insuredUnder14: fd.insuredUnder14,
            sameAsInsured:  fd.sameAsInsured,
            contractorName:   fd.contractorName,
            contractorPhone:  fd.contractorPhone,
            contractorJumin:  fd.contractorJumin,
            compensationRecipient: fd.compensationRecipient,
            signDataUrl:            signDataUrl,
            contractorSignDataUrl:  contractorSignDataUrl,
            attachments:  (window.claimAttachments || []).map(a => ({ name: a.name, type: a.type, dataUrl: a.dataUrl })),
            updatedAt:    new Date().toISOString(),
        };

        const colRef = collection(db, 'claims', user.email, 'records');

        if (window.currentDraftId) {
            await updateDoc(doc(db, 'claims', user.email, 'records', window.currentDraftId), record);
        } else {
            record.createdAt = new Date().toISOString();
            record.faxSentAt = null;
            const docRef = await addDoc(colRef, record);
            window.currentDraftId = docRef.id;
        }

        _showDraftToast('임시저장 완료 ✅');
    } catch (e) {
        console.error('임시저장 실패:', e);
        alert('임시저장 실패: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-bookmark-fill"></i> 임시저장'; }
    }
};

window._restoreDraftToForm = async function(draftId) {
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const db = window.__firestoreDb;
        const snap = await getDoc(doc(db, 'claims', user.email, 'records', draftId));
        if (!snap.exists()) return;

        const d = snap.data();

        if (d.company) window.selectedClaimInsurance = d.company;

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('form-name',    d.insuredName);
        setVal('form-phone',   d.phone);
        setVal('form-content', d.content);

        if (d.jumin) {
            setVal('form-jumin-front', d.jumin.slice(0, 6));
            setVal('form-jumin-back',  d.jumin.slice(6));
        }

        if (d.treatDate) {
            const [ty, tm, td] = d.treatDate.split('-');
            setVal('form-year',  ty);
            setVal('form-month', tm);
            setVal('form-day',   td);
        }

        if (d.accidentType) setToggleGroupValue('form-accident-type', d.accidentType);
        if (d.job) setVal('form-job', d.job);

        if (d.insuredUnder14) setToggleGroupValue('form-under14', d.insuredUnder14);
        if (d.sameAsInsured) setToggleGroupValue('form-same-as-insured', d.sameAsInsured);
        setVal('form-contractor-name',  d.contractorName);
        setVal('form-contractor-phone', d.contractorPhone);
        if (d.contractorJumin) {
            setVal('form-contractor-jumin-front', d.contractorJumin.slice(0, 6));
            setVal('form-contractor-jumin-back',  d.contractorJumin.slice(6));
        }

        if (d.compensationRecipient) setToggleGroupValue('form-compensation-recipient', d.compensationRecipient);

        if (d.accountType) setToggleGroupValue('form-account-type', d.accountType);
        if (d.bankName)    setVal('form-bank-name', d.bankName);
        if (d.account)     setVal('form-account', d.account);
        if (d.accountHolder) setVal('form-account-holder', d.accountHolder);

        if (Array.isArray(d.attachments)) {
            window.claimAttachments = d.attachments.slice();
            window._renderClaimFileList();
        }

        if (d.signDataUrl)           await restoreSignFromDataUrl(d.signDataUrl, 'signature-pad');
        if (d.contractorSignDataUrl) await restoreSignFromDataUrl(d.contractorSignDataUrl, 'signature-pad-contractor');

        const titleEl = document.getElementById('claim-form-title');
        if (titleEl && d.company) titleEl.innerText = d.company + ' 청구서 작성 (임시저장)';

    } catch (e) {
        console.error('임시저장 복원 실패:', e);
    }
};

function _showDraftToast(msg) {
    let toast = document.getElementById('claim-draft-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'claim-draft-toast';
        toast.style.cssText = `
            position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
            background:#1E293B; color:white; padding:12px 24px; border-radius:20px;
            font-size:14px; font-weight:700; z-index:9999;
            opacity:0; transition:opacity 0.3s; pointer-events:none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ==========================================
// [보험사별 PDF 생성 분기 - 진입점]
// ==========================================
window.processClaimPDF = async function(mode) {
    mode = mode || 'preview';
    const company = window.selectedClaimInsurance;
    const info    = CLAIM_PDF_MAP[company];
    const btn     = mode === 'download'
        ? document.querySelector('button[onclick="window.downloadClaimPDF()"]')
        : document.querySelector('button[onclick="window.previewClaimPDF()"]');

    if (!company) {
        alert('보험사가 선택되지 않았습니다.\n청구하기 메뉴에서 보험사를 먼저 선택해주세요.');
        return;
    }
    if (!info) {
        alert(`"${company}" 양식은 현재 등록 대기 중입니다.`);
        return;
    }

    setPdfBtnLoading(btn, true);
    try {
        if (company === '현대해상') {
            await window.generateHyundai5PagePDF(mode);
        } else if (company === 'DB손해보험') {
            await window.generateDB5PagePDF(mode);
        } else {
            await window.generateGenericPDF(info.file, company, mode);
        }
    } catch (error) {
        console.error('PDF 생성 오류:', error);
        alert('오류 원인:\n' + error.message);
    } finally {
        setPdfBtnLoading(btn, false);
    }
};

window.previewClaimPDF = async function() {
    await window.processClaimPDF('preview');
};

window.downloadClaimPDF = async function() {
    await window.processClaimPDF('download');
};

// ==========================================
// [현대해상 - 5페이지 전용 로직]
// ==========================================
window.generateHyundai5PagePDF = async function(mode) {
    const { PDFDocument, rgb } = window.PDFLib;
    const { pdfBytes, fontBytes } = await loadPdfAndFont(null, 'hyundai');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const pages = pdfDoc.getPages();

    const fd   = collectFormData();
    const date = getTodayDateFields();
    const signImage = await getSignImage(pdfDoc, 'signature-pad');

    const [ty, tm, td] = (fd.treatDate || '').split('-');
    const treat = {
        year2: ty ? ty.slice(2, 4) : '',
        month: tm || '',
        day:   td || '',
    };

    const txtOpt   = { font: customFont, size: 11, color: rgb(50, 50, 50) };
    const checkOpt = { font: customFont, size: 14, color: rgb(50, 50, 50

    ) };
    const checkMark = 'V';

    const C = window.HYUNDAI_COORDS;

    // 관계 및 분기 조건식 동기화
    const isSameAsInsured = (fd.sameAsInsured === '예');
    const isUnder14 = (fd.insuredUnder14 === '예');
    const usesBenType = isUnder14 || !isSameAsInsured;
    console.log(`[DEBUG] contact branch check - company: 현대해상, usesBenType: ${usesBenType}, isSameAsInsured: ${isSameAsInsured}`);

    // ── 1페이지 기입 ──
    const p1 = C.page1;
    if (p1.name)    pages[0].drawText(fd.insuredName, { x: p1.name.x,       y: p1.name.y,       ...txtOpt });

    // 주민번호 13자리 - juminCoords(자리별 좌표 배열)에 한 글자씩 출력
    // (HYUNDAI_COORDS.page1은 jumin1/jumin2 두 블록이 아니라 juminCoords 배열 구조)
    if (p1.juminCoords && fd.jumin) {
        fd.jumin.replace(/[^0-9]/g, '').split('').forEach((char, idx) => {
            const pos = p1.juminCoords[idx];
            if (pos) pages[0].drawText(char, { x: pos.x, y: pos.y, ...txtOpt });
        });
    }

    if (p1.phone)   pages[0].drawText(fd.phone,       { x: p1.phone.x,      y: p1.phone.y,      ...txtOpt });
    if (p1.content) pages[0].drawText(fd.content,     { x: p1.content.x,    y: p1.content.y,    ...txtOpt });
    if (p1.year2)   pages[0].drawText(treat.year2,    { x: p1.year2.x,      y: p1.year2.y,      ...txtOpt });
    if (p1.month)   pages[0].drawText(treat.month,    { x: p1.month.x,      y: p1.month.y,      ...txtOpt });
    if (p1.day)     pages[0].drawText(treat.day,      { x: p1.day.x,        y: p1.day.y,        ...txtOpt });
    
    if (fd.job && p1.job) pages[0].drawText(fd.job, { x: p1.job.x, y: p1.job.y, ...txtOpt });

    // 피보험자 서명 및 대리인(usesBenType) 최종 청구인 하단 스위칭 보정
    const effectiveName = usesBenType ? fd.contractorName : fd.insuredName;
    const mainSig = usesBenType ? await getSignImage(pdfDoc, 'signature-pad-contractor') : signImage;

    if (p1.signerName) pages[0].drawText(effectiveName, { x: p1.signerName.x, y: p1.signerName.y, ...txtOpt });
    if (mainSig && p1.sign) pages[0].drawImage(mainSig, { x: p1.sign.x, y: p1.sign.y, width: p1.sign.width, height: p1.sign.height });

    if (fd.bankName && p1.bankName)     pages[0].drawText(fd.bankName, { x: p1.bankName.x, y: p1.bankName.y, ...txtOpt });
    if (fd.account && p1.account)       pages[0].drawText(fd.account,  { x: p1.account.x,  y: p1.account.y,  ...txtOpt });
    if (fd.accountHolder && p1.accountHolder) pages[0].drawText(fd.accountHolder, { x: p1.accountHolder.x, y: p1.accountHolder.y, ...txtOpt });

    // 대리인(계약자) 고유 칸 기입
    if (usesBenType) {
        const cjm = splitJumin(fd.contractorJumin);

        if (p1.contractorName && fd.contractorName) pages[0].drawText(fd.contractorName, { x: p1.contractorName.x,   y: p1.contractorName.y,   ...txtOpt });
        if (p1.contractorJumin1 && cjm.jumin1)      pages[0].drawText(cjm.jumin1,         { x: p1.contractorJumin1.x, y: p1.contractorJumin1.y, ...txtOpt });
        if (p1.contractorJumin2 && cjm.jumin2)      pages[0].drawText(cjm.jumin2,         { x: p1.contractorJumin2.x, y: p1.contractorJumin2.y, ...txtOpt });
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
        if (p5.name)  pages[4].drawText(effectiveName, { x: p5.name.x,  y: p5.name.y,  ...txtOpt });
        if (mainSig && p5.sign) pages[4].drawImage(mainSig, { x: p5.sign.x, y: p5.sign.y, width: p5.sign.width, height: p5.sign.height });
    }

    const fileName = `${fd.insuredName || '청구서'}_${window.selectedClaimInsurance || ''}.pdf`;
    await outputPdf(pdfDoc, mode, fileName);
};

// ==========================================
// [DB손해보험 - 5페이지 전용 로직 - 2026-07-04 신규]
// ==========================================
window.generateDB5PagePDF = async function(mode) {
    const { PDFDocument, rgb } = window.PDFLib;
    const { pdfBytes, fontBytes } = await loadPdfAndFont(null, 'db');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const pages = pdfDoc.getPages();

    const fd   = collectFormData();
    const date = getTodayDateFields();
    const signImage           = await getSignImage(pdfDoc, 'signature-pad');
    const contractorSignImage = await getSignImage(pdfDoc, 'signature-pad-contractor');
    const agentSignImage      = await getSignImage(pdfDoc, 'signature-pad-agent');

    const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
    const checkOpt = { font: customFont, size: 14, color: rgb(0, 0, 0) };
    const CHECK = 'V';

    const C  = window.DB_COORDS;
    const p1 = C.page1;

    console.log(`[DEBUG] contact branch check - company: DB손해보험`);

    // ── 1페이지 ──
    if (p1.name) pages[0].drawText(fd.insuredName, { x: p1.name.x, y: p1.name.y, ...txtOpt });

    if (p1.jumin && fd.jumin) {
        const jm = splitJumin(fd.jumin);
        const juminText = jm.jumin1 && jm.jumin2 ? `${jm.jumin1}-${jm.jumin2}` : (jm.jumin1 || '');
        pages[0].drawText(juminText, { x: p1.jumin.x, y: p1.jumin.y, ...txtOpt });
    }

    if (p1.address && fd.address) pages[0].drawText(fd.address, { x: p1.address.x, y: p1.address.y, ...txtOpt });
    if (p1.phone && fd.phone)     pages[0].drawText(fd.phone,   { x: p1.phone.x,   y: p1.phone.y,   ...txtOpt });

    // ✅ 사고 상세정보
    if (p1.diseaseInfo && fd.diseaseInfo)                 pages[0].drawText(fd.diseaseInfo,         { x: p1.diseaseInfo.x,         y: p1.diseaseInfo.y,         ...txtOpt });
    if (p1.accidentPlace && fd.accidentPlace)             pages[0].drawText(fd.accidentPlace,       { x: p1.accidentPlace.x,       y: p1.accidentPlace.y,       ...txtOpt });
    if (p1.hospitalName && fd.hospitalName)               pages[0].drawText(fd.hospitalName,        { x: p1.hospitalName.x,        y: p1.hospitalName.y,        ...txtOpt });
    if (p1.accidentDescription && fd.content)             pages[0].drawText(fd.content,             { x: p1.accidentDescription.x, y: p1.accidentDescription.y, ...txtOpt });

    // ✅ 자동차사고 처리여부 (교통사고 선택시에만)
    if (fd.accidentType && fd.accidentType.includes('교통')) {
        if (p1.autoInsurance) {
            if (fd.autoInsuranceYn === '예'   && p1.autoInsurance.yes) pages[0].drawText(CHECK, { x: p1.autoInsurance.yes.x, y: p1.autoInsurance.yes.y, ...checkOpt });
            if (fd.autoInsuranceYn === '아니오' && p1.autoInsurance.no)  pages[0].drawText(CHECK, { x: p1.autoInsurance.no.x,  y: p1.autoInsurance.no.y,  ...checkOpt });
        }
        if (p1.autoInsuranceCompany && fd.autoInsuranceCompany) pages[0].drawText(fd.autoInsuranceCompany, { x: p1.autoInsuranceCompany.x, y: p1.autoInsuranceCompany.y, ...txtOpt });
        if (p1.autoInsuranceContact && fd.autoInsuranceContact) pages[0].drawText(fd.autoInsuranceContact, { x: p1.autoInsuranceContact.x, y: p1.autoInsuranceContact.y, ...txtOpt });
        if (p1.vehicleNumber && fd.vehicleNumber)               pages[0].drawText(fd.vehicleNumber,        { x: p1.vehicleNumber.x,        y: p1.vehicleNumber.y,        ...txtOpt });
    }

    // 사고 유형 체크 (교통/질병/상해)
    if (p1.accidentType && fd.accidentType) {
        const at = p1.accidentType;
        if (fd.accidentType.includes('교통') && at.traffic) pages[0].drawText(CHECK, { x: at.traffic.x, y: at.traffic.y, ...checkOpt });
        if (fd.accidentType.includes('질병') && at.disease) pages[0].drawText(CHECK, { x: at.disease.x, y: at.disease.y, ...checkOpt });
        if (fd.accidentType.includes('상해') && at.injury)  pages[0].drawText(CHECK, { x: at.injury.x,  y: at.injury.y,  ...checkOpt });
    }

    // 항상 체크되는 동의 체크마크 3개
    if (p1.page1Checkmarks) p1.page1Checkmarks.forEach(m => pages[0].drawText(CHECK, { x: m.x, y: m.y, ...checkOpt }));

    // 보상안내 받으실 분 (계약자 / 피보험자 / 설계사)
    if (p1.compensationRecipient) {
        const cr = p1.compensationRecipient;
        const agentName = window.__currentAgentName || window.currentUserDisplayName || '';
        if (fd.compensationRecipient === '보험설계사') {
            if (cr.agentCheck) pages[0].drawText(CHECK, { x: cr.agentCheck.x, y: cr.agentCheck.y, ...checkOpt });
            if (cr.agentNameField && agentName)     pages[0].drawText(agentName,   { x: cr.agentNameField.x,     y: cr.agentNameField.y,     ...txtOpt });
            if (cr.agentRelationField)              pages[0].drawText('담당설계사', { x: cr.agentRelationField.x, y: cr.agentRelationField.y, ...txtOpt });
        } else if (fd.sameAsInsured === '예') {
            if (cr.insuredCheck) pages[0].drawText(CHECK, { x: cr.insuredCheck.x, y: cr.insuredCheck.y, ...checkOpt });
        } else {
            if (cr.contractorCheck) pages[0].drawText(CHECK, { x: cr.contractorCheck.x, y: cr.contractorCheck.y, ...checkOpt });
        }
    }

    // 첨부서류 목록 (2줄에 나눠 기입)
    if (p1.attachmentLines && window.claimAttachments?.length) {
        const names = window.claimAttachments.map(a => a.name);
        const half  = Math.ceil(names.length / 2);
        const line1 = names.slice(0, half).join(', ');
        const line2 = names.slice(half).join(', ');
        if (p1.attachmentLines[0] && line1) pages[0].drawText(line1, { x: p1.attachmentLines[0].x, y: p1.attachmentLines[0].y, ...txtOpt });
        if (p1.attachmentLines[1] && line2) pages[0].drawText(line2, { x: p1.attachmentLines[1].x, y: p1.attachmentLines[1].y, ...txtOpt });
    }

    // 작성일자 (오늘 날짜)
    if (p1.year2) pages[0].drawText(date.year2, { x: p1.year2.x, y: p1.year2.y, ...txtOpt });
    if (p1.month) pages[0].drawText(date.month, { x: p1.month.x, y: p1.month.y, ...txtOpt });
    if (p1.day)   pages[0].drawText(date.day,   { x: p1.day.x,   y: p1.day.y,   ...txtOpt });

    // 상단 3단 성함/서명 (청구인 / 설계사 / 계약자·수익자)
    if (p1.signerName) pages[0].drawText(fd.insuredName, { x: p1.signerName.x, y: p1.signerName.y, ...txtOpt });
    if (signImage && p1.sign) pages[0].drawImage(signImage, { x: p1.sign.x, y: p1.sign.y, width: p1.sign.width, height: p1.sign.height });

    const agentDisplayName = window.currentUserDisplayName || '';
    if (p1.agentSignerName && agentDisplayName) pages[0].drawText(agentDisplayName, { x: p1.agentSignerName.x, y: p1.agentSignerName.y, ...txtOpt });
    if (agentSignImage && p1.agentSign) pages[0].drawImage(agentSignImage, { x: p1.agentSign.x, y: p1.agentSign.y, width: p1.agentSign.width, height: p1.agentSign.height });

    if (fd.contractorName && p1.contractorSignerName) pages[0].drawText(fd.contractorName, { x: p1.contractorSignerName.x, y: p1.contractorSignerName.y, ...txtOpt });
    if (contractorSignImage && p1.contractorSign) pages[0].drawImage(contractorSignImage, { x: p1.contractorSign.x, y: p1.contractorSign.y, width: p1.contractorSign.width, height: p1.contractorSign.height });

    // 계좌정보
    if (p1.existingAccountCheck && fd.accountType === '기지급') pages[0].drawText(CHECK, { x: p1.existingAccountCheck.x, y: p1.existingAccountCheck.y, ...checkOpt });
    if (p1.account && fd.account)             pages[0].drawText(fd.account, { x: p1.account.x, y: p1.account.y, ...txtOpt });
    if (p1.bankName && fd.bankName)           pages[0].drawText(fd.bankName, { x: p1.bankName.x, y: p1.bankName.y, ...txtOpt });
    if (p1.accountHolder && fd.accountHolder) pages[0].drawText(fd.accountHolder, { x: p1.accountHolder.x, y: p1.accountHolder.y, ...txtOpt });

    // ── 2~4페이지 동의서 체크마크 ──
    if (C.page2?.checkmarks) C.page2.checkmarks.forEach(m => pages[1].drawText(CHECK, { x: m.x, y: m.y, ...checkOpt }));
    if (C.page3?.checkmarks) C.page3.checkmarks.forEach(m => pages[2].drawText(CHECK, { x: m.x, y: m.y, ...checkOpt }));
    if (C.page4?.checkmarks) C.page4.checkmarks.forEach(m => pages[3].drawText(CHECK, { x: m.x, y: m.y, ...checkOpt }));

    // ── 5페이지 ──
    const p5 = C.page5;
    if (p5?.checkmarks) p5.checkmarks.forEach(m => pages[4].drawText(CHECK, { x: m.x, y: m.y, ...checkOpt }));

    if (p5) {
        if (p5.year2) pages[4].drawText(date.year2, { x: p5.year2.x, y: p5.year2.y, ...txtOpt });
        if (p5.month) pages[4].drawText(date.month, { x: p5.month.x, y: p5.month.y, ...txtOpt });
        if (p5.day)   pages[4].drawText(date.day,   { x: p5.day.x,   y: p5.day.y,   ...txtOpt });

        if (p5.signerName) pages[4].drawText(fd.insuredName, { x: p5.signerName.x, y: p5.signerName.y, ...txtOpt });
        if (signImage && p5.sign) pages[4].drawImage(signImage, { x: p5.sign.x, y: p5.sign.y, width: p5.sign.width, height: p5.sign.height });

        if (p5.agentSignerName && agentDisplayName) pages[4].drawText(agentDisplayName, { x: p5.agentSignerName.x, y: p5.agentSignerName.y, ...txtOpt });
        if (agentSignImage && p5.agentSign) pages[4].drawImage(agentSignImage, { x: p5.agentSign.x, y: p5.agentSign.y, width: p5.agentSign.width, height: p5.agentSign.height });

        if (fd.contractorName && p5.contractorSignerName) pages[4].drawText(fd.contractorName, { x: p5.contractorSignerName.x, y: p5.contractorSignerName.y, ...txtOpt });
        if (contractorSignImage && p5.contractorSign) pages[4].drawImage(contractorSignImage, { x: p5.contractorSign.x, y: p5.contractorSign.y, width: p5.contractorSign.width, height: p5.contractorSign.height });
    }

    const fileName = `${fd.insuredName || '청구서'}_${window.selectedClaimInsurance || 'DB손해보험'}.pdf`;
    await outputPdf(pdfDoc, mode, fileName);
};

// ==========================================
// [범용 1페이지 PDF 생성 - 원본 완벽 동기화]
// ==========================================
window.generateGenericPDF = async function(fileKey, companyName, mode) {
    const { PDFDocument, rgb } = window.PDFLib;
    const { pdfBytes, fontBytes } = await loadPdfAndFont(null, fileKey);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const pages = pdfDoc.getPages();
    const page  = pages[0];

    const fd   = collectFormData();
    const date = getTodayDateFields();
    const jm   = splitJumin(fd.jumin);
    const sig  = await getSignImage(pdfDoc, 'signature-pad');

    const coords = { ...window.FIELD_COORDS.DEFAULT, ...(window.FIELD_COORDS[fileKey] || {}) };
    const txtOpt   = { font: customFont, size: 12, color: rgb(50, 50, 50) };
    const checkOpt = { font: customFont, size: 13, color: rgb(50, 50, 50) };
    const CHECK = 'V';

    // 9번째 원본 데이터 관계 연산 정밀 구동
    const isSameAsInsured = (fd.sameAsInsured === '예');
    const isUnder14 = (fd.insuredUnder14 === '예');
    const usesBenType = isUnder14 || !isSameAsInsured;

    console.log(`[DEBUG] contact branch check - company: ${companyName}, usesBenType: ${usesBenType}, isSameAsInsured: ${isSameAsInsured}`);

    // 피보험자 기본 정보 기입
    if (coords.name)    page.drawText(fd.insuredName, { x: coords.name.x,       y: coords.name.y,       ...txtOpt });
    if (coords.jumin1)  page.drawText(jm.jumin1,      { x: coords.jumin1.x,     y: coords.jumin1.y,     ...txtOpt });
    if (coords.jumin2)  page.drawText(jm.jumin2,      { x: coords.jumin2.x,     y: coords.jumin2.y,     ...txtOpt });
    if (coords.phone)   page.drawText(fd.phone,       { x: coords.phone.x,      y: coords.phone.y,      ...txtOpt });
    if (coords.content) page.drawText(fd.content,     { x: coords.content.x,    y: coords.content.y,    ...txtOpt });
    
    if (coords.year2) page.drawText(date.year2, { x: coords.year2.x, y: coords.year2.y, ...txtOpt });
    if (coords.month) page.drawText(date.month, { x: coords.month.x, y: coords.month.y, ...txtOpt });
    if (coords.day)   page.drawText(date.day,   { x: coords.day.x,   y: coords.day.y,   ...txtOpt });

    // 하단 최종 서명인명 및 서명 패드 (usesBenType 스위칭 흐름 매핑)
    const effectiveName = usesBenType ? fd.contractorName : fd.insuredName;
    const mainSig = usesBenType ? await getSignImage(pdfDoc, 'signature-pad-contractor') : sig;

    if (coords.signerName) page.drawText(effectiveName, { x: coords.signerName.x, y: coords.signerName.y, ...txtOpt });
    if (mainSig && coords.sign) {
        page.drawImage(mainSig, { x: coords.sign.x, y: coords.sign.y, width: coords.sign.width, height: coords.sign.height });
    }

    // 금융 정보 기입
    if (coords.bankName && fd.bankName)       page.drawText(fd.bankName, { x: coords.bankName.x, y: coords.bankName.y, ...txtOpt });
    if (coords.account && fd.account)         page.drawText(fd.account, { x: coords.account.x, y: coords.account.y, ...txtOpt });
    if (coords.accountHolder && fd.accountHolder) page.drawText(fd.accountHolder, { x: coords.accountHolder.x, y: coords.accountHolder.y, ...txtOpt });

    // 계좌유형 한글-영어 파이프라인 매핑 완벽 해결
    if (coords.accountType) {
        const targetMark = coords.accountType[fd.accountType] || 
                           (fd.accountType === '일반' ? coords.accountType.general : 
                            fd.accountType === '기지급' ? coords.accountType.prepaid : coords.accountType.autoDebit);
        if (targetMark) page.drawText(CHECK, { x: targetMark.x, y: targetMark.y, ...checkOpt });
    }

    // 만 14세 미만 체크박스 매핑 보정
    if (coords.under14) {
        const mark = isUnder14 ? coords.under14.yes : coords.under14.no;
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    if (coords.compensationRecipient) {
        const mark = (fd.compensationRecipient === '보험설계사') ? coords.compensationRecipient.agent : coords.compensationRecipient.claimant;
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    // 계약자 고유 입력칸 데이터 주입
    if (usesBenType && coords.contractor) {
        const c = coords.contractor;
        const cjm = splitJumin(fd.contractorJumin);
        const contractorSig = await getSignImage(pdfDoc, 'signature-pad-contractor');

        if (c.name && fd.contractorName)   page.drawText(fd.contractorName,  { x: c.name.x,   y: c.name.y,   ...txtOpt });
        if (c.jumin1 && cjm.jumin1)        page.drawText(cjm.jumin1,         { x: c.jumin1.x, y: c.jumin1.y, ...txtOpt });
        if (c.jumin2 && cjm.jumin2)        page.drawText(cjm.jumin2,         { x: c.jumin2.x, y: c.jumin2.y, ...txtOpt });
        if (c.phone && fd.contractorPhone) page.drawText(fd.contractorPhone, { x: c.phone.x,  y: c.phone.y,  ...txtOpt });
        if (contractorSig && c.sign) {
            page.drawImage(contractorSig, { x: c.sign.x, y: c.sign.y, width: c.sign.width, height: c.sign.height });
        }
        if (c.signerName && fd.contractorName) {
            page.drawText(fd.contractorName, { x: c.signerName.x, y: c.signerName.y, ...txtOpt });
        }
    }

    const fileName = `${fd.insuredName || '청구서'}_${companyName || ''}.pdf`;
    await outputPdf(pdfDoc, mode, fileName);
};