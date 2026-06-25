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
            // 새 청구 시작 → 임시저장 ID 초기화
            window.currentDraftId = null;
            window.navigateTo('page-claim-form');
        };
    }
};

// ==========================================
// [청구서 작성 폼 - 캔버스 및 PDF 전역 로직]
// ==========================================

// ─── 보험사명 → PDF 파일명 매핑 테이블 ───
const CLAIM_PDF_MAP = {
    // ── 손해보험 ──
    '현대해상':          { file: 'hyundai',        pages: 5 },
    '삼성화재':          { file: 'samsung',        pages: 1 },
    'DB손해보험':        { file: 'db',             pages: 1 },
    'KB손해보험':        { file: 'kb',             pages: 1 },
    '메리츠화재':        { file: 'meritz',         pages: 1 },
    '롯데손보':          { file: 'lotte',          pages: 1 },
    'MG손보':            { file: 'mg',             pages: 1 },
    'NH손보':            { file: 'nh',             pages: 1 },
    '흥국화재':          { file: 'heungkuk',       pages: 1 },
    // ── 생명보험 ──
    '삼성생명':          { file: 'samsunglife',    pages: 1 },
    '한화생명':          { file: 'hanhwalife',     pages: 1 },
    '교보생명':          { file: 'kyobolife',      pages: 1 },
    '신한라이프':        { file: 'shinhanlife',    pages: 1 },
    'AIA생명':           { file: 'aialife',        pages: 1 },
    'ABL생명':           { file: 'abllife',        pages: 1 },
    'KDB생명':           { file: 'kdblife',        pages: 1 },
    'NH농협생명':        { file: 'nhlife',         pages: 1 },
    '하나생명':          { file: 'hanalife',       pages: 1 },
    '동양생명':          { file: 'dongyanglife',   pages: 1 },
    '흥국생명':          { file: 'heungkuklife',   pages: 1 },
    '라이나생명':        { file: 'linalife',       pages: 1 },
    'DB생명':            { file: 'dblife',         pages: 1 },
    'KB생명':            { file: 'kblife',         pages: 1 },
    '한화손보':          { file: 'hanhwa',         pages: 1 },
    '하나손보':          { file: 'hana',           pages: 1 },
    '미래에셋생명':      { file: 'miraeassetlife', pages: 1 },
    '흥국손보':          { file: 'heungkuk',       pages: 1 },
    'IM라이프':          { file: 'imlife',         pages: 1 },
    '라이나손보':        { file: 'lina',           pages: 1 },
    'KB손보':            { file: 'kb',             pages: 1 },
    'NH농협':            { file: 'nh',             pages: 1 },
    '에이스손보':        { file: 'chubblife',      pages: 1 },
    'BNP파리바카디프손보': { file: 'fubonlife',    pages: 1 },
    '우정사업본부':      { file: 'imlife',         pages: 1 },
};

// ─── 화면 초기화 ───
window.initClaimCanvas = function() {
    const company = window.selectedClaimInsurance || '선택안됨';
    const titleEl = document.getElementById('claim-form-title');
    if (titleEl) titleEl.innerText = company + ' 청구서 작성';

    // ✅ 사고 유형 토글 버튼 초기화
    window.initUiToggleGroups();

    // ✅ 첨부서류 업로드 UI 초기화
    window.claimAttachments = [];
    window._renderClaimFileList();

    // ✅ 피보험자/계약자 서명 캔버스를 각각 독립적으로 초기화
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

    // 임시저장된 데이터가 있으면 폼에 복원
    if (window.currentDraftId) {
        window._restoreDraftToForm(window.currentDraftId);
    }
};

// ─── 서명 그리기 (캔버스 ID를 받아 피보험자/계약자 서명을 독립적으로 처리) ───
window._signDrawState = {};

function _signPlaceholderId(canvasId) {
    return canvasId === 'signature-pad-contractor' ? 'sign-placeholder-contractor' : 'sign-placeholder';
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
        // ✅ data-show-target / data-show-when : 특정 값 선택 시 다른 영역을 표시/숨김
        //    예) 계약자와 피보험자 동일여부 토글 → '아니오' 선택 시 계약자 입력 영역 표시
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

        // 초기 상태(현재 active 버튼 기준)에 맞춰 표시 영역도 동기화
        if (showTargetId) {
            const activeBtn = group.querySelector('.toggle-btn.active');
            applyVisibility(activeBtn ? (activeBtn.dataset.val || activeBtn.innerText.trim()) : '');
        }
    });
};

// ─── 토글 그룹 값/표시상태를 코드에서 강제로 설정 (임시저장 복원 시 사용) ───
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
    const emptyEl = document.getElementById('claim-file-empty');
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

// ─── 공통 폼 데이터 수집 ───
function collectFormData() {
    const insuredName  = (document.getElementById('form-name')?.value         || '').trim();
    const phone        = (document.getElementById('form-phone')?.value        || '').trim();
    const content      = (document.getElementById('form-content')?.value      || '').trim();
    const accidentType = (document.getElementById('form-accident-type')?.value|| '').trim();
    const job          = (document.getElementById('form-job')?.value          || '').trim();

    // ✅ 만 14세 미만 여부
    const insuredUnder14 = (document.getElementById('form-under14')?.value || '아니오').trim();

    // ✅ 계약자와 피보험자 동일여부 + 계약자 정보 (다를 경우)
    const sameAsInsured        = (document.getElementById('form-same-as-insured')?.value || '예').trim();
    const contractorName       = (document.getElementById('form-contractor-name')?.value         || '').trim();
    const contractorPhone      = (document.getElementById('form-contractor-phone')?.value        || '').trim();
    const contractorJuminFront = (document.getElementById('form-contractor-jumin-front')?.value  || '').trim();
    const contractorJuminBack  = (document.getElementById('form-contractor-jumin-back')?.value   || '').trim();
    const contractorJumin      = (contractorJuminFront + contractorJuminBack).replace(/-/g, '').trim();

    // ✅ 보상안내 받으실 분
    const compensationRecipient = (document.getElementById('form-compensation-recipient')?.value || '보험청구인').trim();

    // ✅ 계좌 유형 + 은행명/계좌번호/예금주
    const accountType  = (document.getElementById('form-account-type')?.value || '일반').trim();
    const bankName      = (document.getElementById('form-bank-name')?.value    || '').trim();
    const account        = (document.getElementById('form-account')?.value      || '').trim();
    const accountHolder = (document.getElementById('form-account-holder')?.value || '').trim();

    // 진료(사고)일자
    const yy = (document.getElementById('form-year')?.value  || '').trim();
    const mm = (document.getElementById('form-month')?.value || '').trim().padStart(2, '0');
    const dd = (document.getElementById('form-day')?.value   || '').trim().padStart(2, '0');
    const treatDate = (yy && mm && dd) ? `${yy}-${mm}-${dd}` : '';

    // 주민등록번호 (피보험자)
    const juminFront = (document.getElementById('form-jumin-front')?.value || '').trim();
    const juminBack  = (document.getElementById('form-jumin-back')?.value  || '').trim();
    const jumin = (juminFront + juminBack).replace(/-/g, '').trim();

    return {
        insuredName, phone, content, treatDate, jumin, accidentType, job, bankName, account,
        insuredUnder14,
        sameAsInsured, contractorName, contractorPhone, contractorJumin,
        compensationRecipient,
        accountType, accountHolder,
    };
}

// ─── PDF 기입용 날짜 파생값 생성 ───
function getTodayDateFields() {
    const today = new Date();
    const year  = String(today.getFullYear());
    const year2 = year.slice(2, 4);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day   = String(today.getDate()).padStart(2, '0');
    return { year, year2, month, day };
}

// ─── PDF 기입용 주민번호 분리 ───
function splitJumin(jumin) {
    return { jumin1: jumin.slice(0, 6), jumin2: jumin.slice(6, 13) };
}

// ─── 서명 이미지 추출 ───
async function getSignImage(pdfDoc, canvasId) {
    canvasId = canvasId || 'signature-pad';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const signDataUrl = canvas.toDataURL('image/png');
    const blank = document.createElement('canvas').toDataURL('image/png');
    if (signDataUrl === blank) return null;
    const signBytes = await fetch(signDataUrl).then(r => r.arrayBuffer());
    return await pdfDoc.embedPng(signBytes);
}

// ─── 서명 DataURL 추출 (임시저장용) ───
function getSignDataUrl(canvasId) {
    canvasId = canvasId || 'signature-pad';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const blank = document.createElement('canvas').toDataURL('image/png');
    return dataUrl === blank ? null : dataUrl;
}

// ─── 서명 DataURL → 캔버스 복원 ───
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

// ─── PDF 출력 ───
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
// [임시저장 (Draft) 기능]
// ==========================================

window.currentDraftId = null;

window.saveDraft = async function() {
    const btn = document.getElementById('btn-save-draft');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 저장 중...'; }

    try {
        const { collection, doc, addDoc, updateDoc, serverTimestamp } =
            await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { alert('로그인이 필요합니다.'); return; }

        const db = window.__firestoreDb;
        if (!db) throw new Error('Firestore 인스턴스를 찾을 수 없습니다.');

        const fd = collectFormData();
        const signDataUrl            = getSignDataUrl('signature-pad');
        const contractorSignDataUrl  = getSignDataUrl('signature-pad-contractor'); // ✅ 계약자 서명

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
            accountHolder: fd.accountHolder,         // ✅ 예금주
            accountType:   fd.accountType,            // ✅ 계좌 유형
            insuredUnder14: fd.insuredUnder14,         // ✅ 만 14세 미만 여부
            sameAsInsured:  fd.sameAsInsured,          // ✅ 계약자=피보험자 동일여부
            contractorName:   fd.contractorName,       // ✅ 계약자 정보
            contractorPhone:  fd.contractorPhone,
            contractorJumin:  fd.contractorJumin,
            compensationRecipient: fd.compensationRecipient, // ✅ 보상안내 받으실 분
            signDataUrl:            signDataUrl,
            contractorSignDataUrl:  contractorSignDataUrl,   // ✅ 계약자 서명
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
        const { collection, doc, getDoc } =
            await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
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
            setVal('form-jumin-back',  d.jumin.slice(6, 13));
        }

        if (d.treatDate) {
            const [ty, tm, td] = d.treatDate.split('-');
            setVal('form-year',  ty);
            setVal('form-month', tm);
            setVal('form-day',   td);
        }

        if (d.accidentType) {
            setToggleGroupValue('form-accident-type', d.accidentType);
        }

        if (d.job) setVal('form-job', d.job);

        // ✅ 만 14세 미만 여부 복원
        if (d.insuredUnder14) setToggleGroupValue('form-under14', d.insuredUnder14);

        // ✅ 계약자와 피보험자 동일여부 + 계약자 정보 복원
        if (d.sameAsInsured) setToggleGroupValue('form-same-as-insured', d.sameAsInsured);
        setVal('form-contractor-name',  d.contractorName);
        setVal('form-contractor-phone', d.contractorPhone);
        if (d.contractorJumin) {
            setVal('form-contractor-jumin-front', d.contractorJumin.slice(0, 6));
            setVal('form-contractor-jumin-back',  d.contractorJumin.slice(6, 13));
        }

        // ✅ 보상안내 받으실 분 복원
        if (d.compensationRecipient) setToggleGroupValue('form-compensation-recipient', d.compensationRecipient);

        // ✅ 계좌 정보 복원 (계좌유형 + 은행명/계좌번호/예금주)
        if (d.accountType) setToggleGroupValue('form-account-type', d.accountType);
        if (d.bankName)      setVal('form-bank-name', d.bankName);
        if (d.account)        setVal('form-account', d.account);
        if (d.accountHolder) setVal('form-account-holder', d.accountHolder);

        if (Array.isArray(d.attachments)) {
            window.claimAttachments = d.attachments.slice();
            window._renderClaimFileList();
        }

        if (d.signDataUrl)           await restoreSignFromDataUrl(d.signDataUrl, 'signature-pad');
        if (d.contractorSignDataUrl) await restoreSignFromDataUrl(d.contractorSignDataUrl, 'signature-pad-contractor'); // ✅ 계약자 서명 복원

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
            opacity:0; transition:opacity 0.3s;
            pointer-events:none;
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

        const fd   = collectFormData();
        const date = getTodayDateFields();
        const jm   = splitJumin(fd.jumin);
        const signImage = await getSignImage(pdfDoc);

        // ✅ 사용자가 입력한 "사고일(발병일시)" — treatDate(yyyy-mm-dd)에서 파생
        const [ty, tm, td] = (fd.treatDate || '').split('-');
        const treat = {
            year2: ty ? ty.slice(2, 4) : '',
            month: tm || '',
            day:   td || '',
        };

        const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
        const checkOpt = { font: customFont, size: 14, color: rgb(0.15, 0.38, 0.92) };
        const checkMark = 'V';

        // ✅ 좌표는 claim-coords.js의 window.HYUNDAI_COORDS에서 가져옵니다.
        //    (claim-coords.js가 claim.js보다 먼저 로드되어 있어야 합니다.)
        const C = window.HYUNDAI_COORDS;

        // ── 1페이지 ──
        const p1 = C.page1;
        pages[0].drawText(fd.insuredName, { x: p1.name.x,       y: p1.name.y,       ...txtOpt });
        pages[0].drawText(jm.jumin1,      { x: p1.jumin1.x,     y: p1.jumin1.y,     ...txtOpt });
        pages[0].drawText(jm.jumin2,      { x: p1.jumin2.x,     y: p1.jumin2.y,     ...txtOpt });
        pages[0].drawText(fd.phone,       { x: p1.phone.x,      y: p1.phone.y,      ...txtOpt });
        pages[0].drawText(fd.content,     { x: p1.content.x,    y: p1.content.y,    ...txtOpt });
        pages[0].drawText(treat.year2,    { x: p1.year2.x,      y: p1.year2.y,      ...txtOpt });
        pages[0].drawText(treat.month,    { x: p1.month.x,      y: p1.month.y,      ...txtOpt });
        pages[0].drawText(treat.day,      { x: p1.day.x,        y: p1.day.y,        ...txtOpt });
        if (fd.job && p1.job) {
            pages[0].drawText(fd.job, { x: p1.job.x, y: p1.job.y, ...txtOpt });
        }
        pages[0].drawText(fd.insuredName, { x: p1.signerName.x, y: p1.signerName.y, ...txtOpt });
        if (signImage) pages[0].drawImage(signImage, { x: p1.sign.x, y: p1.sign.y, width: p1.sign.width, height: p1.sign.height });

        // ✅ 은행명 및 계좌번호 현대해상 1페이지 기입
        if (fd.bankName && fd.account) {
            pages[0].drawText(fd.bankName, { x: p1.bankName.x, y: p1.bankName.y, ...txtOpt });
            pages[0].drawText(fd.account,  { x: p1.account.x,  y: p1.account.y,  ...txtOpt });
        }

        // ── 2페이지 ──
        C.page2.checkmarks.forEach(mark => {
            pages[1].drawText(checkMark, { x: mark.x, y: mark.y, ...checkOpt });
        });

        // ── 3페이지 ──
        C.page3.checkmarks.forEach(mark => {
            pages[2].drawText(checkMark, { x: mark.x, y: mark.y, ...checkOpt });
        });

        // ── 4페이지 ──
        C.page4.checkmarks.forEach(mark => {
            pages[3].drawText(checkMark, { x: mark.x, y: mark.y, ...checkOpt });
        });

        // ── 5페이지 ──
        const p5 = C.page5;
        p5.checkmarks.forEach(mark => {
            pages[4].drawText(checkMark, { x: mark.x, y: mark.y, ...checkOpt });
        });
        pages[4].drawText(date.year,      { x: p5.year.x,  y: p5.year.y,  ...txtOpt });
        pages[4].drawText(date.month,     { x: p5.month.x, y: p5.month.y, ...txtOpt });
        pages[4].drawText(date.day,       { x: p5.day.x,   y: p5.day.y,   ...txtOpt });
        pages[4].drawText(fd.insuredName, { x: p5.name.x,  y: p5.name.y,  ...txtOpt });
        if (signImage) pages[4].drawImage(signImage, { x: p5.sign.x, y: p5.sign.y, width: p5.sign.width, height: p5.sign.height });

        const fileName = `${fd.insuredName || '청구서'}_${window.selectedClaimInsurance || ''}.pdf`;
        await outputPdf(pdfDoc, mode, fileName);
    } finally {
        setPdfBtnLoading(btn, false);
    }
};

// ==========================================
// [범용 1페이지 PDF 생성]
// ==========================================

// ─── 보험사별 필드 좌표 테이블 ───
// ✅ FIELD_COORDS는 claim-coords.js 파일로 분리되어 window.FIELD_COORDS로 제공됩니다.
//    HTML에서 claim.js보다 먼저 <script src="claim-coords.js"></script>를 로드해야 합니다.
// ─── 범용 1페이지 PDF 생성 ───
window.generateGenericPDF = async function(fileKey, companyName, mode) {
    mode = mode || 'preview';
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
    const sig  = await getSignImage(pdfDoc, 'signature-pad'); // 피보험자 서명

    // ✅ FIELD_COORDS는 claim-coords.js(window.FIELD_COORDS)에서 가져옵니다.
    const coords = { ...window.FIELD_COORDS.DEFAULT, ...(window.FIELD_COORDS[fileKey] || {}) };
    const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
    const checkOpt = { font: customFont, size: 13, color: rgb(0.15, 0.38, 0.92) };
    const CHECK = 'V';

    // ── 피보험자 기본 정보 ──
    page.drawText(fd.insuredName, { x: coords.name.x,       y: coords.name.y,       ...txtOpt });
    page.drawText(jm.jumin1,      { x: coords.jumin1.x,     y: coords.jumin1.y,     ...txtOpt });
    page.drawText(jm.jumin2,      { x: coords.jumin2.x,     y: coords.jumin2.y,     ...txtOpt });
    page.drawText(fd.phone,       { x: coords.phone.x,      y: coords.phone.y,      ...txtOpt });
    page.drawText(fd.content,     { x: coords.content.x,    y: coords.content.y,    ...txtOpt });
    page.drawText(date.year2,     { x: coords.year2.x,      y: coords.year2.y,      ...txtOpt });
    page.drawText(date.month,     { x: coords.month.x,      y: coords.month.y,      ...txtOpt });
    page.drawText(date.day,       { x: coords.day.x,        y: coords.day.y,        ...txtOpt });
    page.drawText(fd.insuredName, { x: coords.signerName.x, y: coords.signerName.y, ...txtOpt });

    // ── 은행명 / 계좌번호 / 예금주 ──
    if (coords.bankName && fd.bankName) {
        page.drawText(fd.bankName, { x: coords.bankName.x, y: coords.bankName.y, ...txtOpt });
    }
    if (coords.account && fd.account) {
        page.drawText(fd.account, { x: coords.account.x, y: coords.account.y, ...txtOpt });
    }
    if (coords.accountHolder && fd.accountHolder) { // ✅ 예금주
        page.drawText(fd.accountHolder, { x: coords.accountHolder.x, y: coords.accountHolder.y, ...txtOpt });
    }

    // ── ✅ 만 14세 미만 여부 체크 ──
    if (coords.under14) {
        const mark = (fd.insuredUnder14 === '예') ? coords.under14.yes : coords.under14.no;
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    // ── ✅ 보상안내 받으실 분 체크 ──
    if (coords.compensationRecipient) {
        const mark = (fd.compensationRecipient === '보험설계사')
            ? coords.compensationRecipient.agent
            : coords.compensationRecipient.claimant;
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    // ── ✅ 계좌 유형 체크 (기지급 / 일반 / 자동이체) ──
    if (coords.accountType) {
        const accTypeMap = {
            '기지급':   coords.accountType.prepaid,
            '일반':     coords.accountType.general,
            '자동이체': coords.accountType.autoDebit,
        };
        const mark = accTypeMap[fd.accountType];
        if (mark) page.drawText(CHECK, { x: mark.x, y: mark.y, ...checkOpt });
    }

    // ── 서명 (피보험자) ──
    if (sig) {
        page.drawImage(sig, {
            x: coords.sign.x, y: coords.sign.y,
            width: coords.sign.width, height: coords.sign.height,
        });
    }

    // ── ✅ 핵심 분기: 계약자와 피보험자 동일여부 ──
    // '아니오'(동일하지 않음) → 계약자 정보 + 계약자 서명을 별도 좌표(coords.contractor)에 추가로 기입
    // '예'(동일함)            → 위에서 그린 피보험자 서명 1개로 충분, 추가 작업 없음
    if (fd.sameAsInsured === '아니오' && coords.contractor) {
        const c   = coords.contractor;
        const cjm = splitJumin(fd.contractorJumin);
        const contractorSig = await getSignImage(pdfDoc, 'signature-pad-contractor'); // 계약자 서명(독립 캔버스)

        if (c.name)   page.drawText(fd.contractorName,  { x: c.name.x,   y: c.name.y,   ...txtOpt });
        if (c.jumin1) page.drawText(cjm.jumin1,          { x: c.jumin1.x, y: c.jumin1.y, ...txtOpt });
        if (c.jumin2) page.drawText(cjm.jumin2,          { x: c.jumin2.x, y: c.jumin2.y, ...txtOpt });
        if (c.phone)  page.drawText(fd.contractorPhone,  { x: c.phone.x,  y: c.phone.y,  ...txtOpt });
        if (contractorSig && c.sign) {
            page.drawImage(contractorSig, {
                x: c.sign.x, y: c.sign.y, width: c.sign.width, height: c.sign.height,
            });
        }
    }

    const fileName = `${fd.insuredName || '청구서'}_${companyName || ''}.pdf`;
    await outputPdf(pdfDoc, mode, fileName);
};