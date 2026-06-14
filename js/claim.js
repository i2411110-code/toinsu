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

    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';

    // 임시저장된 데이터가 있으면 폼에 복원
    if (window.currentDraftId) {
        window._restoreDraftToForm(window.currentDraftId);
    }
};

// ─── 서명 그리기 ───
window.isDrawingSign = false;
window.startSign = function(e) {
    if (e.type.includes('touch')) e.preventDefault();
    window.isDrawingSign = true;
    document.getElementById('sign-placeholder').style.display = 'none';
    window.drawSign(e);
};
window.stopSign = function() {
    window.isDrawingSign = false;
    const canvas = document.getElementById('signature-pad');
    if (canvas) canvas.getContext('2d').beginPath();
};
window.drawSign = function(e) {
    if (!window.isDrawingSign) return;
    if (e.type.includes('touch')) e.preventDefault();
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

// ==========================================
// [사고 유형 토글 버튼 (.ui-toggle)]
// 클릭 시 .active 토글 + 연결된 hidden input 값 업데이트
// ==========================================
window.initUiToggleGroups = function() {
    document.querySelectorAll('.ui-toggle').forEach(group => {
        const targetId = group.dataset.target;
        const hiddenInput = targetId ? document.getElementById(targetId) : null;

        group.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (hiddenInput) hiddenInput.value = btn.dataset.val || btn.innerText.trim();
            });
        });
    });
};

// ==========================================
// [첨부서류 업로드]
// window.claimAttachments: Array<{ name, type, dataUrl }>
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

    // 같은 파일 재선택 가능하도록 초기화
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
// [청구 데이터 모델]
// ─────────────────────────────────────────
// ClaimRecord 구조 (Firestore 저장 단위):
// {
//   id:           string  (Firestore doc ID, 저장 후 채워짐)
//   status:       'draft' | 'sent'
//   company:      string  (보험사명)
//   fileKey:      string  (PDF 파일 키)
//   insuredName:  string  (피보험자 이름)
//   jumin:        string  (주민번호 13자리, 평문 — 필요시 서버사이드 암호화 권장)
//   phone:        string
//   treatDate:    string  (진료일자 YYYY-MM-DD)
//   content:      string  (질병/사고내용)
//   signDataUrl:  string | null  (서명 PNG base64 — 임시저장 전용, PDF 생성 후 제거 권장)
//   attachments:  Array<{ name, type, dataUrl }>  (추후 팩스 발송용 첨부파일)
//   createdAt:    string  (ISO)
//   updatedAt:    string  (ISO)
//   faxSentAt:    string | null
// }
// ==========================================

// ─── 공통 폼 데이터 수집 ───
// 반환값을 ClaimRecord 필드와 1:1 매핑하도록 정리
// PDF 좌표 계산용 파생값(year, year2, month, day)은 별도 헬퍼에서 생성
function collectFormData() {
    const insuredName  = (document.getElementById('form-name')?.value         || '').trim();
    const phone        = (document.getElementById('form-phone')?.value        || '').trim();
    const content      = (document.getElementById('form-content')?.value      || '').trim();
    const accidentType = (document.getElementById('form-accident-type')?.value|| '').trim();
    const job          = (document.getElementById('form-job')?.value           || '').trim();

    // 진료(사고)일자: form-year / form-month / form-day → YYYY-MM-DD
    const yy = (document.getElementById('form-year')?.value  || '').trim();
    const mm = (document.getElementById('form-month')?.value || '').trim().padStart(2, '0');
    const dd = (document.getElementById('form-day')?.value   || '').trim().padStart(2, '0');
    const treatDate = (yy && mm && dd) ? `${yy}-${mm}-${dd}` : '';

    // 주민등록번호: form-jumin-front + form-jumin-back → 13자리 (하이픈 제거)
    const juminFront = (document.getElementById('form-jumin-front')?.value || '').trim();
    const juminBack  = (document.getElementById('form-jumin-back')?.value  || '').trim();
    const jumin = (juminFront + juminBack).replace(/-/g, '').trim();

    return { insuredName, phone, content, treatDate, jumin, accidentType, job };
}

// ─── PDF 기입용 날짜 파생값 생성 ───
// 작성일(오늘) 기준으로 year/month/day 생성
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
async function getSignImage(pdfDoc) {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return null;
    const signDataUrl = canvas.toDataURL('image/png');
    const blank = document.createElement('canvas').toDataURL('image/png');
    if (signDataUrl === blank) return null;
    const signBytes = await fetch(signDataUrl).then(r => r.arrayBuffer());
    return await pdfDoc.embedPng(signBytes);
}

// ─── 서명 DataURL 추출 (임시저장용) ───
function getSignDataUrl() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const blank = document.createElement('canvas').toDataURL('image/png');
    return dataUrl === blank ? null : dataUrl;
}

// ─── 서명 DataURL → 캔버스 복원 ───
async function restoreSignFromDataUrl(dataUrl) {
    if (!dataUrl) return;
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const ph = document.getElementById('sign-placeholder');
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

// ─── PDF 출력 (미리보기: 새 탭 / 다운로드: 파일 저장) ───
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
        // 미리보기: 새 탭에서 열기
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

// 현재 편집 중인 임시저장 doc ID (null = 새 청구)
window.currentDraftId = null;

/**
 * 폼 내용을 Firestore에 임시저장
 * - 신규: claims/{userEmail}/records 컬렉션에 addDoc
 * - 수정: 기존 doc에 updateDoc
 */
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

        // Firestore 인스턴스는 app.js에서 초기화된 것을 재사용
        const db = window.__firestoreDb;
        if (!db) throw new Error('Firestore 인스턴스를 찾을 수 없습니다. app.js에서 window.__firestoreDb를 노출해주세요.');

        const fd = collectFormData();
        const signDataUrl = getSignDataUrl();

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
            signDataUrl:  signDataUrl,   // 임시저장에만 보관 (PDF 생성 후 null로 교체 권장)
            attachments:  (window.claimAttachments || []).map(a => ({ name: a.name, type: a.type, dataUrl: a.dataUrl })),
            updatedAt:    new Date().toISOString(),
        };

        const colRef = collection(db, 'claims', user.email, 'records');

        if (window.currentDraftId) {
            // 기존 임시저장 덮어쓰기
            await updateDoc(doc(db, 'claims', user.email, 'records', window.currentDraftId), record);
        } else {
            // 신규 임시저장
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

// ─── 임시저장 데이터 → 폼 복원 ───
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

        // 보험사 세팅
        if (d.company) window.selectedClaimInsurance = d.company;

        // 폼 필드 복원
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('form-name',    d.insuredName);
        setVal('form-phone',   d.phone);
        setVal('form-content', d.content);

        // 주민등록번호 분리 복원
        if (d.jumin) {
            setVal('form-jumin-front', d.jumin.slice(0, 6));
            setVal('form-jumin-back',  d.jumin.slice(6, 13));
        }

        // 진료(사고)일자 분리 복원 (YYYY-MM-DD → 년/월/일)
        if (d.treatDate) {
            const [ty, tm, td] = d.treatDate.split('-');
            setVal('form-year',  ty);
            setVal('form-month', tm);
            setVal('form-day',   td);
        }

        // 사고 유형 토글 복원
        if (d.accidentType) {
            setVal('form-accident-type', d.accidentType);
            document.querySelectorAll('.ui-toggle[data-target="form-accident-type"] .toggle-btn').forEach(btn => {
                btn.classList.toggle('active', (btn.dataset.val || btn.innerText.trim()) === d.accidentType);
            });
        }

        // 직업 복원
        if (d.job) setVal('form-job', d.job);

        // 첨부서류 복원
        if (Array.isArray(d.attachments)) {
            window.claimAttachments = d.attachments.slice();
            window._renderClaimFileList();
        }

        // 서명 복원
        if (d.signDataUrl) await restoreSignFromDataUrl(d.signDataUrl);

        // 제목 복원
        const titleEl = document.getElementById('claim-form-title');
        if (titleEl && d.company) titleEl.innerText = d.company + ' 청구서 작성 (임시저장)';

    } catch (e) {
        console.error('임시저장 복원 실패:', e);
    }
};

// ─── 임시저장 완료 토스트 ───
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
// mode: 'preview' (새 탭에서 열기) | 'download' (파일로 저장)
// ==========================================
window.processClaimPDF = async function(mode) {
    mode = mode || 'preview';
    const company = window.selectedClaimInsurance;
    const info    = CLAIM_PDF_MAP[company];
    const btn     = mode === 'download'
        ? document.querySelector('button[onclick="window.downloadClaimPDF()"]')
        : document.querySelector('button[onclick="window.previewClaimPDF()"]');

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

// ─── 미리보기 버튼 ───
window.previewClaimPDF = async function() {
    await window.processClaimPDF('preview');
};

// ─── PDF 다운로드 버튼 ───
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

        const txtOpt   = { font: customFont, size: 11, color: rgb(0, 0, 0) };
        const checkOpt = { font: customFont, size: 14, color: rgb(0.15, 0.38, 0.92) };
        const checkMark = 'V';

        // ── 1페이지 ──
        pages[0].drawText(fd.insuredName, { x: 145, y: 583, ...txtOpt });
        pages[0].drawText(jm.jumin1,      { x: 270, y: 583, ...txtOpt });
        pages[0].drawText(jm.jumin2,      { x: 400, y: 583, ...txtOpt });
        pages[0].drawText(fd.phone,       { x: 145, y: 493, ...txtOpt });
        pages[0].drawText(fd.content,     { x: 240, y: 213, ...txtOpt });
        pages[0].drawText(date.year2,     { x: 110, y: 412, ...txtOpt });
        pages[0].drawText(date.month,     { x: 165, y: 412, ...txtOpt });
        pages[0].drawText(date.day,       { x: 215, y: 412, ...txtOpt });
        pages[0].drawText(fd.insuredName, { x: 430, y: 412, ...txtOpt });
        if (signImage) pages[0].drawImage(signImage, { x: 500, y: 405, width: 60, height: 22 });

        // ── 2페이지 ──
        pages[1].drawText(checkMark, { x: 513, y: 416, ...checkOpt });
        pages[1].drawText(checkMark, { x: 513, y: 311, ...checkOpt });
        pages[1].drawText(checkMark, { x: 513, y: 188, ...checkOpt });

        // ── 3페이지 ──
        pages[2].drawText(checkMark, { x: 513, y: 288, ...checkOpt });
        pages[2].drawText(checkMark, { x: 513, y: 188, ...checkOpt });

        // ── 4페이지 ──
        pages[3].drawText(checkMark, { x: 513, y: 645, ...checkOpt });
        pages[3].drawText(checkMark, { x: 513, y: 226, ...checkOpt });
        pages[3].drawText(checkMark, { x: 513, y: 134, ...checkOpt });

        // ── 5페이지 ──
        pages[4].drawText(checkMark,      { x: 513, y: 564, ...checkOpt });
        pages[4].drawText(checkMark,      { x: 513, y: 518, ...checkOpt });
        pages[4].drawText(checkMark,      { x: 513, y: 429, ...checkOpt });
        pages[4].drawText(date.year,      { x: 230, y: 381, ...txtOpt });
        pages[4].drawText(date.month,     { x: 340, y: 381, ...txtOpt });
        pages[4].drawText(date.day,       { x: 460, y: 381, ...txtOpt });
        pages[4].drawText(fd.insuredName, { x: 200, y: 320, ...txtOpt });
        if (signImage) pages[4].drawImage(signImage, { x: 460, y: 295, width: 70, height: 25 });

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
const FIELD_COORDS = {
    DEFAULT: {
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
    },
    samsung:      { name: { x: 140, y: 648 }, jumin1: { x: 260, y: 648 }, jumin2: { x: 355, y: 648 }, phone: { x: 140, y: 598 }, content: { x: 140, y: 390 }, year2: { x: 105, y: 128 }, month: { x: 158, y: 128 }, day: { x: 203, y: 128 }, signerName: { x: 365, y: 128 }, sign: { x: 430, y: 115, width: 65, height: 22 } },
    db:           { name: { x: 140, y: 645 }, jumin1: { x: 258, y: 645 }, jumin2: { x: 353, y: 645 }, phone: { x: 140, y: 595 }, content: { x: 140, y: 385 }, year2: { x: 107, y: 126 }, month: { x: 160, y: 126 }, day: { x: 205, y: 126 }, signerName: { x: 368, y: 126 }, sign: { x: 432, y: 113, width: 65, height: 22 } },
    kb:           { name: { x: 143, y: 647 }, jumin1: { x: 262, y: 647 }, jumin2: { x: 357, y: 647 }, phone: { x: 143, y: 597 }, content: { x: 143, y: 388 }, year2: { x: 108, y: 127 }, month: { x: 161, y: 127 }, day: { x: 206, y: 127 }, signerName: { x: 370, y: 127 }, sign: { x: 433, y: 114, width: 65, height: 22 } },
    meritz:       { name: { x: 141, y: 643 }, jumin1: { x: 259, y: 643 }, jumin2: { x: 354, y: 643 }, phone: { x: 141, y: 593 }, content: { x: 141, y: 383 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 366, y: 124 }, sign: { x: 430, y: 111, width: 65, height: 22 } },
    lotte:        { name: { x: 138, y: 640 }, jumin1: { x: 256, y: 640 }, jumin2: { x: 351, y: 640 }, phone: { x: 138, y: 590 }, content: { x: 138, y: 380 }, year2: { x: 103, y: 121 }, month: { x: 156, y: 121 }, day: { x: 201, y: 121 }, signerName: { x: 363, y: 121 }, sign: { x: 427, y: 108, width: 65, height: 22 } },
    mg:           { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 429, y: 110, width: 65, height: 22 } },
    nh:           { name: { x: 142, y: 646 }, jumin1: { x: 260, y: 646 }, jumin2: { x: 355, y: 646 }, phone: { x: 142, y: 596 }, content: { x: 142, y: 386 }, year2: { x: 107, y: 125 }, month: { x: 160, y: 125 }, day: { x: 205, y: 125 }, signerName: { x: 367, y: 125 }, sign: { x: 431, y: 112, width: 65, height: 22 } },
    heungkuk:     { name: { x: 139, y: 641 }, jumin1: { x: 257, y: 641 }, jumin2: { x: 352, y: 641 }, phone: { x: 139, y: 591 }, content: { x: 139, y: 381 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 } },
    samsunglife:  { name: { x: 143, y: 649 }, jumin1: { x: 261, y: 649 }, jumin2: { x: 356, y: 649 }, phone: { x: 143, y: 599 }, content: { x: 143, y: 389 }, year2: { x: 108, y: 128 }, month: { x: 161, y: 128 }, day: { x: 206, y: 128 }, signerName: { x: 369, y: 128 }, sign: { x: 432, y: 115, width: 65, height: 22 } },
    hanhwalife:   { name: { x: 141, y: 647 }, jumin1: { x: 259, y: 647 }, jumin2: { x: 354, y: 647 }, phone: { x: 141, y: 597 }, content: { x: 141, y: 387 }, year2: { x: 106, y: 126 }, month: { x: 159, y: 126 }, day: { x: 204, y: 126 }, signerName: { x: 367, y: 126 }, sign: { x: 431, y: 113, width: 65, height: 22 } },
    kyobolife:    { name: { x: 144, y: 650 }, jumin1: { x: 262, y: 650 }, jumin2: { x: 357, y: 650 }, phone: { x: 144, y: 600 }, content: { x: 144, y: 390 }, year2: { x: 109, y: 129 }, month: { x: 162, y: 129 }, day: { x: 207, y: 129 }, signerName: { x: 371, y: 129 }, sign: { x: 434, y: 116, width: 65, height: 22 } },
    shinhanlife:  { name: { x: 142, y: 648 }, jumin1: { x: 260, y: 648 }, jumin2: { x: 355, y: 648 }, phone: { x: 142, y: 598 }, content: { x: 142, y: 388 }, year2: { x: 107, y: 127 }, month: { x: 160, y: 127 }, day: { x: 205, y: 127 }, signerName: { x: 368, y: 127 }, sign: { x: 432, y: 114, width: 65, height: 22 } },
    aialife:      { name: { x: 140, y: 646 }, jumin1: { x: 258, y: 646 }, jumin2: { x: 353, y: 646 }, phone: { x: 140, y: 596 }, content: { x: 140, y: 386 }, year2: { x: 105, y: 125 }, month: { x: 158, y: 125 }, day: { x: 203, y: 125 }, signerName: { x: 366, y: 125 }, sign: { x: 430, y: 112, width: 65, height: 22 } },
    abllife:      { name: { x: 139, y: 645 }, jumin1: { x: 257, y: 645 }, jumin2: { x: 352, y: 645 }, phone: { x: 139, y: 595 }, content: { x: 139, y: 385 }, year2: { x: 104, y: 124 }, month: { x: 157, y: 124 }, day: { x: 202, y: 124 }, signerName: { x: 365, y: 124 }, sign: { x: 429, y: 111, width: 65, height: 22 } },
    kdblife:      { name: { x: 141, y: 647 }, jumin1: { x: 259, y: 647 }, jumin2: { x: 354, y: 647 }, phone: { x: 141, y: 597 }, content: { x: 141, y: 387 }, year2: { x: 106, y: 126 }, month: { x: 159, y: 126 }, day: { x: 204, y: 126 }, signerName: { x: 367, y: 126 }, sign: { x: 431, y: 113, width: 65, height: 22 } },
    nhlife:       { name: { x: 143, y: 649 }, jumin1: { x: 261, y: 649 }, jumin2: { x: 356, y: 649 }, phone: { x: 143, y: 599 }, content: { x: 143, y: 389 }, year2: { x: 108, y: 128 }, month: { x: 161, y: 128 }, day: { x: 206, y: 128 }, signerName: { x: 370, y: 128 }, sign: { x: 433, y: 115, width: 65, height: 22 } },
    hanalife:     { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 366, y: 123 }, sign: { x: 430, y: 110, width: 65, height: 22 } },
    dongyanglife: { name: { x: 138, y: 643 }, jumin1: { x: 256, y: 643 }, jumin2: { x: 351, y: 643 }, phone: { x: 138, y: 593 }, content: { x: 138, y: 383 }, year2: { x: 103, y: 122 }, month: { x: 156, y: 122 }, day: { x: 201, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 } },
    heungkuklife: { name: { x: 139, y: 641 }, jumin1: { x: 257, y: 641 }, jumin2: { x: 352, y: 641 }, phone: { x: 139, y: 591 }, content: { x: 139, y: 381 }, year2: { x: 104, y: 120 }, month: { x: 157, y: 120 }, day: { x: 202, y: 120 }, signerName: { x: 364, y: 120 }, sign: { x: 428, y: 107, width: 65, height: 22 } },
    linalife:     { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 121 }, month: { x: 158, y: 121 }, day: { x: 203, y: 121 }, signerName: { x: 365, y: 121 }, sign: { x: 429, y: 108, width: 65, height: 22 } },
    dblife:       { name: { x: 139, y: 643 }, jumin1: { x: 257, y: 643 }, jumin2: { x: 352, y: 643 }, phone: { x: 139, y: 593 }, content: { x: 139, y: 383 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 } },
    kblife:       { name: { x: 141, y: 645 }, jumin1: { x: 259, y: 645 }, jumin2: { x: 354, y: 645 }, phone: { x: 141, y: 595 }, content: { x: 141, y: 385 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 366, y: 124 }, sign: { x: 430, y: 111, width: 65, height: 22 } },
    hanhwa:       { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 429, y: 110, width: 65, height: 22 } },
    hana:         { name: { x: 139, y: 643 }, jumin1: { x: 257, y: 643 }, jumin2: { x: 352, y: 643 }, phone: { x: 139, y: 593 }, content: { x: 139, y: 383 }, year2: { x: 104, y: 122 }, month: { x: 157, y: 122 }, day: { x: 202, y: 122 }, signerName: { x: 364, y: 122 }, sign: { x: 428, y: 109, width: 65, height: 22 } },
    miraeassetlife:{ name: { x: 142, y: 647 }, jumin1: { x: 260, y: 647 }, jumin2: { x: 355, y: 647 }, phone: { x: 142, y: 597 }, content: { x: 142, y: 387 }, year2: { x: 107, y: 126 }, month: { x: 160, y: 126 }, day: { x: 205, y: 126 }, signerName: { x: 368, y: 126 }, sign: { x: 432, y: 113, width: 65, height: 22 } },
    imlife:       { name: { x: 138, y: 641 }, jumin1: { x: 256, y: 641 }, jumin2: { x: 351, y: 641 }, phone: { x: 138, y: 591 }, content: { x: 138, y: 381 }, year2: { x: 103, y: 120 }, month: { x: 156, y: 120 }, day: { x: 201, y: 120 }, signerName: { x: 363, y: 120 }, sign: { x: 427, y: 107, width: 65, height: 22 } },
    lina:         { name: { x: 140, y: 642 }, jumin1: { x: 258, y: 642 }, jumin2: { x: 353, y: 642 }, phone: { x: 140, y: 592 }, content: { x: 140, y: 382 }, year2: { x: 105, y: 121 }, month: { x: 158, y: 121 }, day: { x: 203, y: 121 }, signerName: { x: 365, y: 121 }, sign: { x: 429, y: 108, width: 65, height: 22 } },
    chubblife:    { name: { x: 141, y: 645 }, jumin1: { x: 259, y: 645 }, jumin2: { x: 354, y: 645 }, phone: { x: 141, y: 595 }, content: { x: 141, y: 385 }, year2: { x: 106, y: 124 }, month: { x: 159, y: 124 }, day: { x: 204, y: 124 }, signerName: { x: 367, y: 124 }, sign: { x: 431, y: 111, width: 65, height: 22 } },
    fubonlife:    { name: { x: 140, y: 644 }, jumin1: { x: 258, y: 644 }, jumin2: { x: 353, y: 644 }, phone: { x: 140, y: 594 }, content: { x: 140, y: 384 }, year2: { x: 105, y: 123 }, month: { x: 158, y: 123 }, day: { x: 203, y: 123 }, signerName: { x: 365, y: 123 }, sign: { x: 429, y: 110, width: 65, height: 22 } },
};

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
    const sig  = await getSignImage(pdfDoc);

    const coords = { ...FIELD_COORDS.DEFAULT, ...(FIELD_COORDS[fileKey] || {}) };
    const txtOpt = { font: customFont, size: 11, color: rgb(0, 0, 0) };

    page.drawText(fd.insuredName, { x: coords.name.x,       y: coords.name.y,       ...txtOpt });
    page.drawText(jm.jumin1,      { x: coords.jumin1.x,     y: coords.jumin1.y,     ...txtOpt });
    page.drawText(jm.jumin2,      { x: coords.jumin2.x,     y: coords.jumin2.y,     ...txtOpt });
    page.drawText(fd.phone,       { x: coords.phone.x,      y: coords.phone.y,      ...txtOpt });
    page.drawText(fd.content,     { x: coords.content.x,    y: coords.content.y,    ...txtOpt });
    page.drawText(date.year2,     { x: coords.year2.x,      y: coords.year2.y,      ...txtOpt });
    page.drawText(date.month,     { x: coords.month.x,      y: coords.month.y,      ...txtOpt });
    page.drawText(date.day,       { x: coords.day.x,        y: coords.day.y,        ...txtOpt });
    page.drawText(fd.insuredName, { x: coords.signerName.x, y: coords.signerName.y, ...txtOpt });

    if (sig) {
        page.drawImage(sig, {
            x: coords.sign.x, y: coords.sign.y,
            width: coords.sign.width, height: coords.sign.height,
        });
    }

    const fileName = `${fd.insuredName || '청구서'}_${companyName || ''}.pdf`;
    await outputPdf(pdfDoc, mode, fileName);
};