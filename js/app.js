window.globalClientRegistry = {};
window.currentUserSchedules = [];
let currentModalTargetName = "";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA1GU9E5WuFUPIyT4Ma4_crArdANpCMQfs",
    authDomain: "gaon-f3399.firebaseapp.com",
    projectId: "gaon-f3399",
    storageBucket: "gaon-f3399.firebasestorage.app",
    messagingSenderId: "870111782359",
    appId: "1:870111782359:web:d6d3eeb441d1ac06169792",
    measurementId: "G-JCW1K0YNZ3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserEmail = "";
const MASTER_INVITE_CODE = "gaon2026";

async function loadUserIntegratedData(email) {
    currentUserEmail = email;
    window.__currentUserEmail = email;
    if(document.getElementById('user-private-title')) {
        document.getElementById('user-private-title').innerText = email + " 전용 제어실";
    }
    const docRef = doc(db, "users_portal", email);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.globalClientRegistry = data.clientRegistry || {};
            // ✅ 이름 저장해두기
window.currentUserDisplayName = data.displayName || email.split('@')[0];
            window.currentUserSchedules = data.schedules || [];
            if(document.getElementById('memo-txt')) document.getElementById('memo-txt').value = data.memo || "";
        } else {
            window.globalClientRegistry = {};
            window.currentUserSchedules = [];
            if(document.getElementById('memo-txt')) document.getElementById('memo-txt').value = "";
        }
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
}

async function syncRegistryToDatabase() {
    if(!currentUserEmail) return;
    const docRef = doc(db, "users_portal", currentUserEmail);
    const memoVal = document.getElementById('memo-txt') ? document.getElementById('memo-txt').value : "";
    await setDoc(docRef, {
        clientRegistry: window.globalClientRegistry,
        schedules: window.currentUserSchedules,
        memo: memoVal
    }, { merge: true });
}

async function updateVisitCounter() {
    const today = new Date().toISOString().slice(0, 10);
    const statsRef = doc(db, "site_stats", "visit_counter");
    try {
        const snap = await getDoc(statsRef);
        if (!snap.exists()) {
            await setDoc(statsRef, { total: 1, lastDate: today, todayCount: 1 });
            document.getElementById('count-today').innerText = 1;
            document.getElementById('count-total').innerText = 1;
        } else {
            const data = snap.data();
            const isNewDay = data.lastDate !== today;
            await updateDoc(statsRef, {
                total: increment(1),
                todayCount: isNewDay ? 1 : increment(1),
                lastDate: today
            });
            document.getElementById('count-today').innerText = isNewDay ? 1 : (data.todayCount || 0) + 1;
            document.getElementById('count-total').innerText = (data.total || 0) + 1;
        }
    } catch (e) {
        console.error("카운터 업데이트 실패:", e);
    }
}

window.checkAndShowNotice = function() {
    const hideUntil = localStorage.getItem('hideNoticeGaon');
    if (!hideUntil || new Date().getTime() > parseInt(hideUntil)) {
        document.getElementById('notice-modal').style.display = 'flex';
    }
};

window.toggleAuthTab = function(mode) {
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const inviteGroup = document.getElementById('invite-code-group');
    document.getElementById('auth-error-msg').style.display = 'none';
    
    const nameGroup = document.getElementById('name-input-group');
    if(mode === 'login') {
        loginBtn.classList.add('active'); regBtn.classList.remove('active');
        title.innerText = "보험가온포탈 로그인"; submitBtn.innerText = "포탈 접속하기";
        inviteGroup.style.display = 'none';
        if(nameGroup) nameGroup.style.display = 'none';
    } else {
        regBtn.classList.add('active'); loginBtn.classList.remove('active');
        title.innerText = "신규 멤버 회원가입"; submitBtn.innerText = "가입 및 로그인";
        inviteGroup.style.display = 'block';
        if(nameGroup) nameGroup.style.display = 'block';
    }
}   // ← 이 닫는 괄호가 없어서 생긴 문제

window.handleAuthSubmit = function() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorMsg = document.getElementById('auth-error-msg');
    errorMsg.style.display = "none";

    if(!email || !password) {
        errorMsg.innerText = "❌ 이메일과 비밀번호를 모두 입력하세요.";
        errorMsg.style.display = "block"; return;
    }

    if(document.getElementById('tab-login-btn').classList.contains('active')) {
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { document.getElementById('auth-overlay').style.display = 'none'; })
            .catch((error) => {
                errorMsg.innerText = "❌ 로그인 실패: " + error.message;
                errorMsg.style.display = "block";
            });
    } else {
        const inviteCode = document.getElementById('auth-invite-code').value.trim();
        if(inviteCode !== MASTER_INVITE_CODE) {
            errorMsg.innerText = "❌ 추천인 코드가 올바르지 않습니다.";
            errorMsg.style.display = "block"; return;
        }
        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCred) => {
                const userName = document.getElementById('auth-name')?.value.trim() || '';
                if(userName) {
                    const userRef = doc(db, "users_portal", userCred.user.email);
                    await setDoc(userRef, { displayName: userName }, { merge: true });
                }
                alert("가입이 완료되었습니다!");
                document.getElementById('auth-overlay').style.display = 'none';
            })
            .catch((error) => { 
                errorMsg.innerText = "❌ 가입 실패: " + error.message; 
                errorMsg.style.display = "block"; 
            });
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('user-display-email').innerText = user.email;
        loadUserIntegratedData(user.email);
        updateVisitCounter();
        window.checkAndShowNotice();
        window.loadComponent('main-dashboard'); // 로그인 후 메인화면 로드
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

window.handleLogout = function() {
    if(confirm("로그아웃 하시겠습니까?")) { signOut(auth).then(() => { location.reload(); }); }
}

window.executeRegistrySync = syncRegistryToDatabase;

// ==========================================
// [SPA 부품 조립(라우팅) 엔진 추가]
// ==========================================
window.loadComponent = async function(pageId, extraAction) {
    const root = document.getElementById('app-root');
    let url = `components/${pageId}.html`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('파일을 찾을 수 없습니다.');
        const html = await response.text();
        root.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 페이지별 데이터 다시 불러오기
        if (pageId === 'page-private') {
            document.getElementById('user-private-title').innerText = currentUserEmail + " 전용 제어실";
            window.renderCombinedCrmList();
            window.renderSchedule();
        }

         // 실비 계산기 초기화
        if (pageId === 'page-silbi') {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    window.initSilsonPage();
                });
            });
        }

        // ✅ 약관조회 탭 초기 상태 세팅
        if (pageId === 'page-terms') {
            requestAnimationFrame(() => {
                const gridNon = document.getElementById('terms-grid-nonlife');
                const gridLife = document.getElementById('terms-grid-life');
                if (gridNon) gridNon.style.display = 'grid';
                if (gridLife) gridLife.style.display = 'none';
            });
        }

        // ✅ 메인 대시보드 이름 표시
        if (pageId === 'main-dashboard') {
            requestAnimationFrame(() => {
                const el = document.getElementById('main-user-name');
                if(el) el.innerText = (window.currentUserDisplayName || '') + '님';
            });
        }

        // ✅ 청구의 모든것 이름 표시
        if (pageId === 'page-claim-main') {
            requestAnimationFrame(() => {
                const el = document.getElementById('claim-user-name');
                if(el) el.innerText = window.currentUserDisplayName || '안녕하세요';
            });
        }

        // ✅ 재무 계산기 - 인라인 스크립트 재실행
        if (pageId === 'page-calculator') {
            requestAnimationFrame(() => {
                root.querySelectorAll('script').forEach(old => {
                    const s = document.createElement('script');
                    s.textContent = old.textContent;
                    document.body.appendChild(s);
                    document.body.removeChild(s);
                });
            });
        }

        // 탭 전환 등 예약된 액션이 있으면 실행
        if (typeof extraAction === 'function') {
            extraAction();
        }
    } catch (error) {
        console.error("로딩 실패:", error);
        root.innerHTML = `<div style="padding:50px; text-align:center;">오류: 화면을 불러올 수 없습니다.</div>`;
    }
}

// 탭 전환 기능을 예약 실행으로 바꾼 똑똑한 네비게이션
window.navigateTo = function(pageId, tabType) {
    if(tabType) {
        window.loadComponent(pageId, () => window.switchInsTab(tabType));
    } else {
        window.loadComponent(pageId);
    }
}


window.goBack = function() {
    window.loadComponent('main-dashboard');
}

// ==========================================
// [나머지 기존 기능들]
// ==========================================
window.saveMemo = async function() {
    if(window.executeRegistrySync) {
        await window.executeRegistrySync();
        alert("메모가 안전하게 클라우드에 보관되었습니다.");
    }
}

window.switchOfficeSubTab = function(target) {
    const btnInput = document.getElementById('btn-tab-input');
    const btnList = document.getElementById('btn-tab-list');
    const viewInput = document.getElementById('office-sub-input-view');
    const viewList = document.getElementById('office-sub-list-view');
    if(target === 'input') {
        btnInput.classList.add('active'); btnList.classList.remove('active');
        viewInput.style.display = 'block'; viewList.style.display = 'none';
    } else {
        btnInput.classList.remove('active'); btnList.classList.add('active');
        viewInput.style.display = 'none'; viewList.style.display = 'block';
        window.renderCombinedCrmList();
    }
}

window.runAiTextParser = function() {
    const rawText = document.getElementById('ai-raw-textarea').value;
    if(!rawText.trim()) { alert("분석할 텍스트 스크립트가 공백 상태입니다."); return; }

    const nameMatch    = rawText.match(/(?:성명|성함|이름)\s*[:：]?\s*([가-힣]{2,5})/);
    const idnumMatch   = rawText.match(/(?:주민번호|주민등록번호)\s*[:：]?\s*(\d{6}\s*-\s*\d{7})/);
    const phoneMatch   = rawText.match(/(?:휴대폰번호|전화번호|핸드폰|연락처)\s*[:：]?\s*(\d{3}-\d{3,4}-\d{4})/);
    const addressMatch = rawText.match(/(?:주소)\s*[:：]?\s*([^\n]+)/);
    const jobMatch     = rawText.match(/(?:직업\(회사명\)|직업)\s*[:：]?\s*([^\n]+)/);
    const driveMatch   = rawText.match(/(?:운전여부)\s*[:：]?\s*([^\n]+)/);

    let medicalContent = "";
    const medicalRegex = /(?:5년간의\s*병원치료내용|병력사항|치료내용|병력고지)\s*([\s\S]*?)(?=\n\s*\d+\.|\n\s*운전여부|$)/i;
    const medicalMatch = rawText.match(medicalRegex);
    if(medicalMatch) medicalContent = medicalMatch[1].replace(/^[:：\s-]+/, '').trim();

    if(nameMatch)    document.getElementById('c_name').value    = nameMatch[1].trim();
    if(idnumMatch)   document.getElementById('c_idnum').value   = idnumMatch[1].trim();
    if(phoneMatch)   document.getElementById('c_phone').value   = phoneMatch[1].trim();
    if(addressMatch) document.getElementById('c_address').value = addressMatch[1].trim();
    if(jobMatch)     document.getElementById('c_job').value     = jobMatch[1].trim();
    if(driveMatch)   document.getElementById('c_drive').value   = driveMatch[1].trim();
    if(medicalContent) document.getElementById('c_medical').value = medicalContent;

    alert("✨ AI 변환 완료: 항목에 맞춰 입력 완료되었습니다.");
}

window.submitCrmData = async function() {
    const name = document.getElementById('c_name').value.trim();
    if(!name) { alert("식별 데이터인 '성함'은 필수 필드입니다."); return; }

    window.globalClientRegistry[name] = {
        savedAt: Date.now(),
        relation: document.getElementById('c_relation').value,
        contract: document.getElementById('c_contract').value,
        document: document.getElementById('c_document').value,
        phone: document.getElementById('c_phone').value,
        idnum: document.getElementById('c_idnum').value,
        address: document.getElementById('c_address').value,
        job: document.getElementById('c_job').value,
        drive: document.getElementById('c_drive').value,
        body: document.getElementById('c_body').value,
        account: document.getElementById('c_account').value,
        medical: document.getElementById('c_medical').value,
        progress: document.getElementById('c_progress').value
    };

    try {
        await syncRegistryToDatabase(); 
        alert("저장 성공: 클라우드 데이터셋과 동기화되었습니다.");
        window.resetCrmInputForm();
        window.switchOfficeSubTab('list');
    } catch (error) {
        console.error("저장 중 오류 발생:", error);
        alert("저장에 실패했습니다. 다시 시도해주세요.");
    }
}

window.resetCrmInputForm = function() {
    const ids = ['c_name','c_relation','c_phone','c_idnum','c_address','c_job','c_drive','c_body','c_account','c_medical','c_progress','ai-raw-textarea'];
    ids.forEach(id => document.getElementById(id).value = "");
    document.getElementById('c_contract').value = "완료";
    document.getElementById('c_document').value = "출력만";
}

window.renderCombinedCrmList = function() {
    const tbody = document.getElementById('combined-crm-tbody');
    if(!tbody) return;
    tbody.innerHTML = "";

    const filterContract = document.getElementById('f_contract').value;
    const filterDoc      = document.getElementById('f_doc').value;
    const searchKeyword  = document.getElementById('f_search').value.trim();

    Object.entries(window.globalClientRegistry || {}).forEach(([name, d]) => {
        if(filterContract !== 'all' && d.contract !== filterContract) return;
        if(filterDoc !== 'all' && d.document !== filterDoc) return;
        if(searchKeyword && !name.includes(searchKeyword) && !(d.phone && d.phone.includes(searchKeyword))) return;

        const docBadgeClass = d.document === "출력만" ? "badge-blue" : d.document === "출력 X" ? "badge-gray" : "badge-yellow";
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700; color:#0F172A;">${name}</td>
            <td><span class="badge ${d.contract === '완료' ? 'badge-green' : 'badge-orange'}">${d.contract}</span></td>
            <td><span class="badge ${docBadgeClass}">${d.document}</span></td>
            <td>${d.phone || '-'}</td>
            <td style="text-align:left; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.progress || '-'}</td>
            <td><button onclick="window.triggerGodeungView(event, '${name}')" style="padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; background:white; font-size:12px; cursor:pointer;">고등</button></td>
            <td><button onclick="window.triggerDirectEdit('${name}')" style="padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; background:white; font-size:12px; cursor:pointer;">수정</button></td>
        `;
        tr.onclick = () => { window.triggerPopupDetailView(name); };
        tbody.appendChild(tr);
    });
}

window.sortCombinedCrm = function(criteria) {
    let entries = Object.entries(window.globalClientRegistry || {});
    if(criteria === 'name') entries.sort((a,b) => a[0].localeCompare(b[0], 'ko'));
    else entries.sort((a,b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));
    const sortedObj = {};
    entries.forEach(([k,v]) => sortedObj[k] = v);
    window.globalClientRegistry = sortedObj;
    window.renderCombinedCrmList();
}

window.triggerPopupDetailView = function(name) {
    const d = window.globalClientRegistry[name];
    currentModalTargetName = name;
    document.getElementById('modal-title-area').innerText = `👤 ${name} 고객 상세 명부`;
    document.getElementById('portal-modal-content-area').innerText =
`성함: ${name}
관계: ${d.relation || ''}
계약여부: ${d.contract || ''}
증권구분: ${d.document || ''}
전화번호: ${d.phone || ''}
주민번호: ${d.idnum || ''}
주소: ${d.address || ''}
직업군: ${d.job || ''}
운전 여부: ${d.drive || ''}
키/몸무게: ${d.body || ''}
실비/지정계좌: ${d.account || ''}
병력고지 요약내역:
${d.medical || ''}
---------------------------------
진행 상황 기록:
${d.progress || ''}`;
    const btnContainer = document.getElementById('modal-action-btn-layout');
    btnContainer.innerHTML = `
        <button class="btn-action" style="flex:1; background:var(--main-blue);" onclick="window.triggerDirectEdit('${name}')">수정실 전환</button>
        <button class="btn-action" style="flex:1; background:#EF4444;" onclick="window.removeCustomerRecord()">명부 삭제</button>
    `;
    document.getElementById('portal-global-modal').style.display = 'flex';
}

window.triggerGodeungView = function(event, name) {
    event.stopPropagation();
    const d = window.globalClientRegistry[name];
    document.getElementById('modal-title-area').innerText = `🏢 고등 가설계 연동단 (${name})`;
    document.getElementById('portal-modal-content-area').innerText =
`성함: ${name}
전화번호: ${d.phone || ''}
주민번호: ${d.idnum || ''}
주소: ${d.address || ''}
직업명: ${d.job || ''}
운전여부: ${d.drive || ''}
병력사항:
${d.medical || ''}`;
    const btnContainer = document.getElementById('modal-action-btn-layout');
    btnContainer.innerHTML = `<button class="btn-action" style="background:#64748B;" onclick="window.closePortalModal()">닫기</button>`;
    document.getElementById('portal-global-modal').style.display = 'flex';
}

window.triggerDirectEdit = function(name) {
    window.closePortalModal();
    const d = window.globalClientRegistry[name];
    window.switchOfficeSubTab('input');
    document.getElementById('c_name').value     = name;
    document.getElementById('c_relation').value = d.relation || '';
    document.getElementById('c_contract').value = d.contract || '완료';
    document.getElementById('c_document').value = d.document || '출력만';
    document.getElementById('c_phone').value    = d.phone || '';
    document.getElementById('c_idnum').value    = '';
    document.getElementById('c_address').value  = d.address || '';
    document.getElementById('c_job').value      = d.job || '';
    document.getElementById('c_drive').value    = d.drive || '';
    document.getElementById('c_body').value     = d.body || '';
    document.getElementById('c_account').value  = d.account || '';
    document.getElementById('c_medical').value  = d.medical || '';
    document.getElementById('c_progress').value = d.progress || '';
}

window.removeCustomerRecord = function() {
    if(!confirm("기록을 삭제하시겠습니까?")) return;
    delete window.globalClientRegistry[currentModalTargetName];
    if(window.executeRegistrySync) {
        window.executeRegistrySync().then(() => {
            window.closePortalModal();
            window.renderCombinedCrmList();
            alert("삭제되었습니다.");
        });
    }
}

window.closePortalModal = function() { document.getElementById('portal-global-modal').style.display = 'none'; }

window.exportClientDB = function() {
    const blob = new Blob([JSON.stringify(window.globalClientRegistry)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `가온포탈_CRM_백업_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

window.importClientDB = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            window.globalClientRegistry = JSON.parse(e.target.result);
            if(window.executeRegistrySync) {
                window.executeRegistrySync().then(() => {
                    alert("백업 동기화 완결.");
                    window.renderCombinedCrmList();
                });
            }
        } catch(err) { alert("파일 규격을 확인하세요."); }
    };
    reader.readAsText(file);
}

window.addSchedule = function() {
    const val = document.getElementById('todo-input').value.trim();
    if(!val) return;
    window.currentUserSchedules.push(val);
    document.getElementById('todo-input').value = '';
    if(window.executeRegistrySync) window.executeRegistrySync().then(() => { window.renderSchedule(); });
}

window.renderSchedule = function() {
    const ul = document.getElementById('todo-list');
    if(!ul) return;
    ul.innerHTML = (window.currentUserSchedules || []).map((item, idx) =>
        `<li><i class="bi bi-clock-history"></i> ${item} <span style="color:#EF4444; cursor:pointer; margin-left:8px;" onclick="window.deleteSchedule(${idx})">×</span></li>`
    ).join('');
}

window.deleteSchedule = function(idx) {
    window.currentUserSchedules.splice(idx, 1);
    if(window.executeRegistrySync) window.executeRegistrySync().then(() => { window.renderSchedule(); });
}

window.generateAiMessage = function() {
    const purpose  = document.getElementById('msg-purpose').value;
    const textarea = document.getElementById('memo-txt');
    const head     = `[토스인슈어런스 가온사업단 심현진 팀장]\n안녕하세요 고객님, 전담 매니저 심현진입니다.\n\n`;
    if(purpose === 'silbi') {
        textarea.value = head + `▶ 핵심 요약: 5세대 의료실비 개정안 적용 안내\n\n기존 실손 보장이 대대적으로 개정됨에 따라, 가장 유리한 조건으로 혜택을 선점하실 수 있도록 맞춤형 비교 리포트를 준비했습니다. 편하신 일정을 남겨주시면 조율해 드리겠습니다.`;
    } else if(purpose === 'maternity') {
        textarea.value = head + `▶ 핵심 요약: 산모 및 태아 집중 맞춤형 특약 제안\n\n한화/MG 등 주요 사별로 출산 및 임신 질환 집중 담보의 한도가 확대되었습니다. 필수 담보 위주로 거품을 뺀 비교 설계안을 발송해 드립니다.`;
    } else if(purpose === 'care') {
        textarea.value = head + `▶ 핵심 요약: 보장 내역 실시간 모니터링 및 유지율 관리 안부\n\n불필요하게 누수되고 있는 보험료 점검 주간입니다. 청구 누락된 진료비 서류가 있는지 점검을 원하시면 가온 창구로 접수해 주세요.`;
    } else {
        textarea.value = '';
    }
}

window.switchInsTab = function(type) {
    const nonlifeTab = document.getElementById('tab-nonlife');
    const lifeTab    = document.getElementById('tab-life');
    const gridNon    = document.getElementById('grid-nonlife');
    const gridLife   = document.getElementById('grid-life');
    if (type === 'nonlife') {
        nonlifeTab.style.background = 'white'; nonlifeTab.style.color = '#2563EB';
        lifeTab.style.background = 'transparent'; lifeTab.style.color = '#64748B';
        gridNon.style.display = 'grid'; gridLife.style.display = 'none';
    } else {
        lifeTab.style.background = 'white'; lifeTab.style.color = '#2563EB';
        nonlifeTab.style.background = 'transparent'; nonlifeTab.style.color = '#64748B';
        gridNon.style.display = 'none'; gridLife.style.display = 'grid';
    }
}

window.copyHelpTemplate = function() {
    const text = document.getElementById('help-template-text').value;
    navigator.clipboard.writeText(text).then(() => {
        alert('입력 양식이 클립보드에 복사되었습니다. 카톡이나 메모장에 붙여넣으세요!');
        document.getElementById('help-modal').style.display = 'none';
    }).catch(err => {
        alert('복사에 실패했습니다. 수동으로 복사해주세요.');
    });
}

window.closeNotice = function() {
    if (document.getElementById('hide-notice-chk').checked) {
        const now = new Date().getTime();
        const tomorrow = now + (24 * 60 * 60 * 1000);
        localStorage.setItem('hideNoticeGaon', tomorrow);
    }
    document.getElementById('notice-modal').style.display = 'none';
}

// ==========================================
// [비밀 메모 오피스 전용 로직]
// ==========================================

// 1. 비밀번호 확인 로직
// app.js 맨 아래에 추가하거나 수정하세요
window.unlockPrivate = function() {
    const pwd = document.getElementById('privatePwd').value;
    console.log("입력된 비밀번호:", pwd); // 💡 F12(개발자도구) 콘솔창에서 확인용
    
    if(pwd === 'gaon1004') {
        document.getElementById('privateAuthScreen').style.display = 'none';
        document.getElementById('privateMainContent').style.display = 'block';
    } else {
        alert('비밀번호가 일치하지 않습니다.');
    }
};

// 2. 내부 탭 (대시보드 vs 체크리스트) 전환
window.switchPrivateTab = function(target) {
    document.getElementById('btn-db-dash').classList.remove('active');
    document.getElementById('btn-chk-list').classList.remove('active');
    document.getElementById('dashboard-app').style.display = 'none';
    document.getElementById('checklist-app').style.display = 'none';

    if(target === 'db') {
        document.getElementById('btn-db-dash').classList.add('active');
        document.getElementById('dashboard-app').style.display = 'grid'; // 데스크탑 grid 유지
    } else {
        document.getElementById('btn-chk-list').classList.add('active');
        document.getElementById('checklist-app').style.display = 'block';
    }
};

// 3. 사이드바 메뉴 클릭 시 화면 전환
window.switchSidebarTab = function(tabId, btnElem) {
    document.querySelectorAll('.sidebar .tab-btn').forEach(b => b.classList.remove('active'));
    btnElem.classList.add('active');
    document.querySelectorAll('.main .tab-content').forEach(tc => tc.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
};

// 4. 거절 극복 등 아코디언 버튼 열기/닫기
window.toggleAccordion = function(contentId, btnElem) {
    const content = document.getElementById(contentId);
    if(content.classList.contains('show')) {
        content.classList.remove('show');
        btnElem.classList.remove('active');
    } else {
        // 같은 그룹 내 다른 창 닫기
        const parent = btnElem.closest('.card');
        parent.querySelectorAll('.content.show, .tab2-content.show').forEach(c => c.classList.remove('show'));
        parent.querySelectorAll('.toggle-btn.active, .tab2-btn.active').forEach(b => b.classList.remove('active'));
        
        // 클릭한 창 열기
        content.classList.add('show');
        btnElem.classList.add('active');
    }
};

// 5. 체크리스트 탭 작동
window.switchChkTab = function(targetId, btnElem) {
    document.querySelectorAll('.chk-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.chk-section').forEach(s => s.classList.remove('active'));
    btnElem.classList.add('active');
    document.getElementById(targetId).classList.add('active');
};
window.switchChkSubtab = function(targetId, btnElem) {
    const parent = btnElem.closest('.chk-section');
    parent.querySelectorAll('.chk-subtab').forEach(t => t.classList.remove('active'));
    parent.querySelectorAll('.chk-subsection').forEach(s => s.classList.remove('active'));
    btnElem.classList.add('active');
    document.getElementById(targetId).classList.add('active');
};

// 6. 카톡 모달 및 문구 생성
window.toggleKakaoModal = function() {
    document.getElementById('kakao-modal').classList.toggle('active');
};
window.generateKakaoMsg = function(type) {
    const checks = document.querySelectorAll('.analysis-panel input[type="checkbox"]:checked');
    let issues = Array.from(checks).map(c => c.value);
    let msg = "";

    if (type === "default") {
        msg += `안녕하세요, OOO님.\n토스 보험서비스 담당자 심현진 팀장입니다.\n\n고객님의 가입 현황을 확인한 결과,\n`;
        if (issues.length > 0) msg += issues.map((i, idx) => `${idx+1}. ${i}`).join("\n") + "\n\n";
        else msg += "특별히 큰 문제는 확인되지 않았습니다.\n\n";
        msg += `따라서, 불필요한 보험료 지출은 줄이고 꼭 필요한 보장은 강화할 수 있도록 상담을 도와드리고자 합니다.\n\n편하신 시간에 추가 안내 원하시면 말씀 부탁드립니다 🙂`;
    } else if (type === "absent") {
        msg += `안녕하세요, OOO님.\n토스 보험서비스 담당자 심현진 팀장입니다.\n\n토스 앱을 통해 상담 요청 주셔서 연락드렸으나,\n통화 연결이 어려우신 것 같아 카카오톡으로 연락드립니다.\n\n안심하시고 상담 받으실 수 있도록 당사 명함 첨부드립니다.\n\n익일 다시 연락드릴 예정이며, 원하시는 시간이 있으시다면 그 시간에 맞춰 전화드리겠습니다 🙂\n\n`;
    } else if (type === "reject") {
        msg += `안녕하세요, OOO님.\n조금 전 전화드린 토스 보험서비스 담당자 심현진 입니다.\n\n상담 여부와 관계없이 분석은 완료되어, 핵심 내용만 간단히 전달드립니다.\n\n`;
        if (issues.length > 0) msg += issues.map((i, idx) => `${idx+1}. ${i}`).join("\n") + "\n\n";
        msg += `필요하실 때 언제든 편하게 말씀 주시면, 짧게라도 추가 설명 도와드리겠습니다 🙂`;
    }
    
    document.getElementById("outputMsg").value = msg;
    const copyBtn = document.getElementById("copyBtn");
    copyBtn.innerText = "📋 문구 복사하기";
    copyBtn.classList.remove("copied");
};
window.copyKakaoMsg = function() {
    const textarea = document.getElementById("outputMsg");
    if(!textarea.value) return alert("먼저 문구를 생성해주세요.");
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        const copyBtn = document.getElementById("copyBtn");
        copyBtn.innerText = "✅ 복사 완료!";
        copyBtn.classList.add("copied");
        setTimeout(() => { copyBtn.innerText = "📋 문구 복사하기"; copyBtn.classList.remove("copied"); }, 2000);
    });
};


 // =====================================================
// 실손 계산기
// =====================================================
(function() {
  const GENERATIONS = [
    { id:"1gen", label:"1세대", period:"~2009.09", coverGubun:100, coverNonGubun:100, inpatientLimit:5e7, has3Types:false, limitOptions:[{label:"10만원",outpatientLimit:1e5,prescriptionLimit:0},{label:"30만원",outpatientLimit:3e5,prescriptionLimit:0},{label:"50만원",outpatientLimit:5e5,prescriptionLimit:0}], deductible:{clinic:5000,hospital:10000,general:10000,prescription:0} },
    { id:"2gen", label:"2세대", period:"2009.10~2013.03", coverGubun:90, coverNonGubun:90, inpatientLimit:5e7, has3Types:false, limitOptions:[{label:"외래 20만원 / 약제 10만원",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만원 / 약제 5만원",outpatientLimit:25e4,prescriptionLimit:5e4}], deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000} },
    { id:"2gen2", label:"2세대", period:"2013.04~2017.03", coverGubun:90, coverNonGubun:80, inpatientLimit:5e7, has3Types:false, limitOptions:[{label:"외래 20만원 / 약제 10만원",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만원 / 약제 5만원",outpatientLimit:25e4,prescriptionLimit:5e4}], deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000} },
    { id:"3gen", label:"3세대", period:"2017.04~2021.06", coverGubun:90, coverNonGubun:80, inpatientLimit:5e7, has3Types:true, type3SelfRate:30, limitOptions:[{label:"외래 20만원 / 약제 10만원",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만원 / 약제 5만원",outpatientLimit:25e4,prescriptionLimit:5e4}], deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000}, type3Deductible:{injection:20000,manual:20000,mri:20000} },
    { id:"4gen", label:"4세대", period:"2021.07~2026.04", coverGubun:80, coverNonGubun:70, inpatientLimit:5e7, has3Types:true, type3SelfRate:30, is4gen:true, limitOptions:[{label:"20만원(외래+약제)",outpatientLimit:2e5,prescriptionLimit:0}], deductible:{clinic:10000,hospital:15000,general:20000}, type3Deductible:{injection:30000,manual:30000,mri:30000} },
    { id:"5gen", label:"5세대", period:"2026.05~", is5gen:true, inpatientLimit:5e7 },
    { id:"sick", label:"유병자실손", period:"", coverGubun:70, coverNonGubun:70, inpatientLimit:5e7, has3Types:false, limitOptions:[{label:"20만원",outpatientLimit:2e5,prescriptionLimit:0}], deductible:{clinic:20000,hospital:20000,general:20000,prescription:0} }
  ];

  window.silsonState = { genId:'4gen', type:'outpatient', grade:'clinic', limitIdx:0 };
  const n = (v) => Number(v) || 0;
  const fmt = (v) => Math.round(Math.max(0, v)).toLocaleString();

  // window에 직접 등록해서 initSilsonPage에서 호출 가능하게
  window._sg_renderGenGrid = function() {
    const grid = document.getElementById('silson-gen-grid');
    if (!grid) return;
    grid.innerHTML = GENERATIONS.map(g => `
      <button class="silson-gen-btn ${window.silsonState.genId===g.id?'active':''}" onclick="window.selectSilsonGen('${g.id}')">
        <span class="gen-label">${g.label}</span>
        ${g.period?`<span class="gen-period">${g.period}</span>`:''}
      </button>`).join('');
  };

  window._sg_updateUI = function() {
    const g = GENERATIONS.find(x => x.id === window.silsonState.genId);
    if (!g) return;
    const limitSel = document.getElementById('silson-limit-select');
    const limitGroup = document.getElementById('silson-limit-group');
    if (g.limitOptions && limitGroup && limitSel) {
      limitGroup.style.display = '';
      limitSel.innerHTML = g.limitOptions.map((opt,i) => `<option value="${i}">${opt.label}</option>`).join('');
      limitSel.value = window.silsonState.limitIdx;
    } else if (limitGroup) { limitGroup.style.display = 'none'; }
    const hint = document.getElementById('silson-nongubun-hint');
    if (hint) hint.style.display = g.is4gen ? '' : 'none';
    const showPresc = !g.is4gen && !g.is5gen && g.id!=='sick' && g.limitOptions && g.limitOptions[0]?.prescriptionLimit > 0;
    const pc = document.getElementById('silson-prescription-card');
    if (pc) pc.style.display = showPresc ? '' : 'none';
    const show3 = g.has3Types && !g.is5gen;
    const t3 = document.getElementById('silson-type3-card');
    const t3i = document.getElementById('silson-inp-type3-card');
    if (t3) t3.style.display = show3 ? '' : 'none';
    if (t3i) t3i.style.display = show3 ? '' : 'none';
  };

  window.selectSilsonGen = function(id) {
    window.silsonState.genId = id;
    window.silsonState.limitIdx = 0;
    window._sg_renderGenGrid();
    window._sg_updateUI();
    window.renderSilsonResult();
  };

  window.selectSilsonGrade = function(grade) {
    window.silsonState.grade = grade;
    document.querySelectorAll('.silson-grade-btn').forEach(b => b.classList.toggle('active', b.dataset.grade===grade));
    window.renderSilsonResult();
  };

  window.switchSilsonType = function(type) {
    window.silsonState.type = type;
    document.getElementById('btn-outpatient').classList.toggle('active', type==='outpatient');
    document.getElementById('btn-inpatient').classList.toggle('active', type==='inpatient');
    document.getElementById('silson-outpatient-area').style.display = type==='outpatient' ? '' : 'none';
    document.getElementById('silson-inpatient-area').style.display = type==='inpatient' ? '' : 'none';
    document.getElementById('silson-total-label').textContent = type==='outpatient' ? '통원 예상 보험금' : '입원 예상 보험금';
    window.renderSilsonResult();
  };

  function calcOutpatient(g, grade, limitIdx) {
    if (g.is5gen) return {total:0,deduct:0,result:0};
    const lo = g.limitOptions ? (g.limitOptions[limitIdx]||g.limitOptions[0]) : null;
    const outLimit = lo ? lo.outpatientLimit : 0;
    const covered = n(document.getElementById('silson-gubun')?.value);
    const nonCovered = n(document.getElementById('silson-nongubun')?.value);
    const total = covered + nonCovered;
    const deductAmt = g.deductible[grade] || 0;
    if (g.is4gen) {
      const cd = covered>0 ? Math.max(deductAmt, covered*(1-g.coverGubun/100)) : 0;
      const nd = nonCovered>0 ? Math.max(30000, nonCovered*(1-g.coverNonGubun/100)) : 0;
      return {total, deduct:cd+nd, result:Math.max(0,Math.min(covered-cd,outLimit/2))+Math.max(0,Math.min(nonCovered-nd,outLimit/2))};
    }
    const selfPay = covered*(1-g.coverGubun/100) + nonCovered*(1-g.coverNonGubun/100);
    const fd = Math.max(deductAmt, selfPay);
    return {total, deduct:fd, result:Math.max(0,Math.min(total-fd,outLimit))};
  }

  function calcPrescription(g, limitIdx) {
    if (g.is5gen||g.is4gen||g.id==='sick') return null;
    const lo = g.limitOptions ? (g.limitOptions[limitIdx]||g.limitOptions[0]) : null;
    const prescLimit = lo ? lo.prescriptionLimit : 0;
    if (!prescLimit) return null;
    const covered = n(document.getElementById('silson-presc-gubun')?.value);
    const nonCovered = n(document.getElementById('silson-presc-nongubun')?.value);
    const total = covered + nonCovered;
    const deductAmt = g.deductible.prescription || 0;
    return {total, deduct:deductAmt, result:Math.max(0,Math.min(total-deductAmt,prescLimit))};
  }

  function calcType3(g, isInpatient) {
    if (!g.has3Types||g.is5gen) return null;
    const sr = g.type3SelfRate/100;
    const d = g.type3Deductible;
    const pfx = isInpatient ? 'silson-inp-' : 'silson-';
    const inj = n(document.getElementById(`${pfx}injection`)?.value);
    const man = n(document.getElementById(`${pfx}manual`)?.value);
    const mri = n(document.getElementById(`${pfx}mri`)?.value);
    const id2 = Math.max(d.injection, inj*sr), md = Math.max(d.manual, man*sr), rd = Math.max(d.mri, mri*sr);
    return {injDeduct:id2,manDeduct:md,mriDeduct:rd, injResult:Math.max(0,inj-id2), manResult:Math.max(0,man-md), mriResult:Math.max(0,mri-rd), total:Math.max(0,inj-id2)+Math.max(0,man-md)+Math.max(0,mri-rd)};
  }

  function calcInpatient(g) {
    if (g.is5gen) return {total:0,gubunPay:0,nonGubunPay:0,roomPay:0,result:0};
    const covered = n(document.getElementById('silson-inp-gubun')?.value);
    const nonCovered = n(document.getElementById('silson-inp-nongubun')?.value);
    const days = Math.max(1, n(document.getElementById('silson-days')?.value));
    const room = document.getElementById('silson-room')?.value;
    const roomDiff = room==='premium' ? n(document.getElementById('silson-room-diff')?.value) : 0;
    const gp = covered*(g.coverGubun/100), np = nonCovered*(g.coverNonGubun/100);
    const rpd = roomDiff*0.5/days;
    const rp = (g.id==='1gen' ? rpd : Math.min(rpd,100000)) * days;
    return {total:covered+nonCovered, gubunPay:gp, nonGubunPay:np, roomPay:rp, result:Math.min(gp+np+rp,g.inpatientLimit)};
  }

  window.renderSilsonResult = function() {
    const g = GENERATIONS.find(x => x.id===window.silsonState.genId);
    if (!g) return;
    const {limitIdx, grade, type} = window.silsonState;
    if (type==='outpatient') {
      const out=calcOutpatient(g,grade,limitIdx), presc=calcPrescription(g,limitIdx), t3=calcType3(g,false);
      const oe=document.getElementById('silson-outpatient-result');
      if(oe) oe.innerHTML=`<table><tr><td>병원비</td><td>${fmt(out.total)}원</td></tr><tr><td>공제액</td><td>${fmt(out.deduct)}원</td></tr><tr><td>추산보험금</td><td>${fmt(out.result)}원</td></tr></table>`;
      const pe=document.getElementById('silson-prescription-result');
      if(pe&&presc) pe.innerHTML=`<table><tr><td>약제비</td><td>${fmt(presc.total)}원</td></tr><tr><td>공제액</td><td>${fmt(presc.deduct)}원</td></tr><tr><td>추산보험금</td><td>${fmt(presc.result)}원</td></tr></table>`;
      if(t3){
        const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=`${fmt(v)}원`;};
        sv('silson-injection-deduct',t3.injDeduct); sv('silson-manual-deduct',t3.manDeduct); sv('silson-mri-deduct',t3.mriDeduct);
        const t3e=document.getElementById('silson-type3-result');
        if(t3e) t3e.innerHTML=`<table><tr><td>주사제</td><td>${fmt(t3.injResult)}원</td></tr><tr><td>도수/체외충격파</td><td>${fmt(t3.manResult)}원</td></tr><tr><td>MRI/MRA</td><td>${fmt(t3.mriResult)}원</td></tr><tr><td>비급여3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
      }
      const te=document.getElementById('silson-total-amount');
      if(te) te.textContent=`${fmt(out.result+(presc?.result||0)+(t3?.total||0))}원`;
    } else {
      const inp=calcInpatient(g), t3=calcType3(g,true);
      const ie=document.getElementById('silson-inpatient-result');
      if(ie){
        const rr=document.getElementById('silson-room')?.value==='premium'?`<tr><td>상급병실료 지급</td><td>${fmt(inp.roomPay)}원</td></tr>`:'';
        ie.innerHTML=`<table><tr><td>급여 지급 (${g.coverGubun||0}%)</td><td>${fmt(inp.gubunPay)}원</td></tr><tr><td>비급여 지급 (${g.coverNonGubun||0}%)</td><td>${fmt(inp.nonGubunPay)}원</td></tr>${rr}<tr><td>예상보험금</td><td>${fmt(inp.result)}원</td></tr></table>`;
      }
      if(t3){
        const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=`${fmt(v)}원`;};
        sv('silson-inp-injection-deduct',t3.injDeduct); sv('silson-inp-manual-deduct',t3.manDeduct); sv('silson-inp-mri-deduct',t3.mriDeduct);
        const t3e=document.getElementById('silson-inp-type3-result');
        if(t3e) t3e.innerHTML=`<table><tr><td>주사제</td><td>${fmt(t3.injResult)}원</td></tr><tr><td>도수/체외충격파</td><td>${fmt(t3.manResult)}원</td></tr><tr><td>MRI/MRA</td><td>${fmt(t3.mriResult)}원</td></tr><tr><td>비급여3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
      }
      const te=document.getElementById('silson-total-amount');
      if(te) te.textContent=`${fmt(inp.result+(t3?.total||0))}원`;
    }
  };

  window.initSilsonPage = function() {
    window.silsonState = {genId:'4gen', type:'outpatient', grade:'clinic', limitIdx:0};
    window._sg_renderGenGrid();   // ← 핵심: window에 등록된 함수 호출
    window._sg_updateUI();        // ← 핵심
    window.renderSilsonResult();
    const rs=document.getElementById('silson-room');
    if(rs) rs.addEventListener('change',function(){
      document.getElementById('silson-room-extra').style.display=this.value==='premium'?'':'none';
      window.renderSilsonResult();
    });
    const ls=document.getElementById('silson-limit-select');
    if(ls) ls.addEventListener('change',function(){
      window.silsonState.limitIdx=Number(this.value);
      window.renderSilsonResult();
    });
  };

})();

window.switchGongsilTab = function(type) {
    const nonlifeTab = document.getElementById('gongsil-tab-nonlife');
    const lifeTab    = document.getElementById('gongsil-tab-life');
    const gridNon    = document.getElementById('gongsil-grid-nonlife');
    const gridLife   = document.getElementById('gongsil-grid-life');
    if (type === 'nonlife') {
        nonlifeTab.style.background = 'white'; nonlifeTab.style.color = '#2563EB';
        lifeTab.style.background = 'transparent'; lifeTab.style.color = '#64748B';
        gridNon.style.display = 'grid'; gridLife.style.display = 'none';
    } else {
        lifeTab.style.background = 'white'; lifeTab.style.color = '#2563EB';
        nonlifeTab.style.background = 'transparent'; nonlifeTab.style.color = '#64748B';
        gridNon.style.display = 'none'; gridLife.style.display = 'grid';
    }
};

window.switchTermsTab = function(type) {
    const nonlifeTab = document.getElementById('terms-tab-nonlife');
    const lifeTab    = document.getElementById('terms-tab-life');
    const gridNon    = document.getElementById('terms-grid-nonlife');
    const gridLife   = document.getElementById('terms-grid-life');
    if (type === 'nonlife') {
        nonlifeTab.classList.add('active'); lifeTab.classList.remove('active');
        gridNon.style.display = 'grid'; gridLife.style.display = 'none';
    } else {
        lifeTab.classList.add('active'); nonlifeTab.classList.remove('active');
        gridNon.style.display = 'none'; gridLife.style.display = 'grid';
    }
};


(function(){
    const days = ['일','월','화','수','목','금','토'];
    const now = new Date();
    const el = document.getElementById('claim-main-date');
    if(el) el.innerText = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
})();

// =========================================
// 공지 시스템 (Firebase Firestore 연동)
// =========================================
const NOTICE_ADMIN_EMAIL = "dlsqh814@naver.com"; // ← 관리자 이메일 변경 가능
let _noticeList = [];       // 전체 공지 목록 캐시
let _currentNoticeId = "";  // 현재 열람중인 공지 ID
let _publishState = true;   // 작성 모달 게시 여부 상태
let _tickerTimer = null;    // 슬라이더 타이머
let _tickerIdx = 0;         // 현재 슬라이더 인덱스

// Firebase 모듈 동적 import 헬퍼
async function getDB() {
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const { getApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    return getFirestore(getApp());
}

// 날짜 포맷 헬퍼
function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}. ${String(d.getMonth()+1).padStart(2,'0')}. ${String(d.getDate()).padStart(2,'0')}.`;
}

// ---- 공지 바 슬라이더 시작 ----
function startTicker(publishedList) {
    if (_tickerTimer) clearInterval(_tickerTimer);
    if (!publishedList || publishedList.length === 0) {
        const el = document.getElementById('notice-bar-text');
        if (el) el.textContent = '등록된 공지가 없습니다.';
        return;
    }
    _tickerIdx = 0;
    function show(idx) {
        const el = document.getElementById('notice-bar-text');
        const wrap = document.getElementById('notice-ticker-wrap');
        if (!el || !wrap) return;
        wrap.style.opacity = '0';
        setTimeout(() => {
            el.textContent = publishedList[idx].title;
            wrap.style.opacity = '1';
        }, 400);
    }
    show(0);
    if (publishedList.length > 1) {
        _tickerTimer = setInterval(() => {
            _tickerIdx = (_tickerIdx + 1) % publishedList.length;
            show(_tickerIdx);
        }, 4000);
    }
}

// ---- 초기 공지 로드 ----
(async function initNotices() {
    try {
        const { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const db = await getDB();
        const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        _noticeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const published = _noticeList.filter(n => n.published);
        startTicker(published);
        // 관리자 버튼 노출
        if (window.__currentUserEmail === NOTICE_ADMIN_EMAIL) {
            const adminBtn = document.getElementById('notice-admin-write-btn');
            if (adminBtn) adminBtn.style.display = 'block';
        }
    } catch(e) {
        const el = document.getElementById('notice-bar-text');
        if (el) el.textContent = 'DB 손해보험 오류 관련 안내';
    }
})();

// ---- 공지 목록 모달 열기 ----
window.openNoticeListModal = async function() {
    const modal = document.getElementById('notice-list-modal');
    const body  = document.getElementById('notice-list-body');
    const adminBtn = document.getElementById('notice-admin-write-btn');
    modal.style.display = 'flex';

    const isAdmin = window.__currentUserEmail === NOTICE_ADMIN_EMAIL;
    if (adminBtn) adminBtn.style.display = isAdmin ? 'block' : 'none';

    body.innerHTML = '<div style="text-align:center;padding:40px;color:#B0B8C1;font-size:14px;">불러오는 중...</div>';

    try {
        const { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const db = await getDB();
        const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        _noticeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (_noticeList.length === 0) {
            body.innerHTML = '<div style="text-align:center;padding:40px;color:#B0B8C1;font-size:14px;">등록된 공지가 없습니다.</div>';
            return;
        }
        body.innerHTML = _noticeList.map(n => `
            <div class="notice-list-item" onclick="window.openNoticeDetail('${n.id}')">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <span style="background:#EFF6FF; color:#3182F6; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;">공지</span>
                    ${n.published ? '<span style="background:#F0FDF4; color:#16A34A; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;"><i class="bi bi-megaphone-fill"></i> 슬라이드</span>' : ''}
                    <span style="font-size:11px; color:#B0B8C1; margin-left:auto;">${fmtDate(n.createdAt)}</span>
                </div>
                <div style="font-size:15px; font-weight:700; color:#191F28;">${n.title}</div>
            </div>
        `).join('');
    } catch(e) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#EF4444;font-size:14px;">불러오기 실패</div>';
    }
};

// ---- 공지 상세 열기 ----
window.openNoticeDetail = function(id) {
    const n = _noticeList.find(x => x.id === id);
    if (!n) return;
    _currentNoticeId = id;

    document.getElementById('notice-detail-title').textContent = n.title;
    document.getElementById('notice-detail-content').textContent = n.content;
    document.getElementById('notice-detail-date').textContent = fmtDate(n.createdAt);

    const adminBtns = document.getElementById('notice-detail-admin-btns');
    const isAdmin = window.__currentUserEmail === NOTICE_ADMIN_EMAIL;
    if (adminBtns) adminBtns.style.display = isAdmin ? 'flex' : 'none';

    document.getElementById('notice-detail-modal').style.display = 'flex';
};

// ---- 공지 작성 모달 열기 ----
window.openNoticeWriter = function() {
    _currentNoticeId = '';
    document.getElementById('notice-edit-id').value = '';
    document.getElementById('notice-edit-title').value = '';
    document.getElementById('notice-edit-content').value = '';
    document.getElementById('notice-save-msg').style.display = 'none';
    document.getElementById('editor-modal-title').textContent = '공지 작성';
    window.setPublish(true);
    document.getElementById('notice-editor-modal').style.display = 'flex';
};

// ---- 공지 편집 모달 열기 ----
window.openNoticeEditor = function() {
    const n = _noticeList.find(x => x.id === _currentNoticeId);
    if (!n) return;
    document.getElementById('notice-detail-modal').style.display = 'none';
    document.getElementById('notice-edit-id').value = n.id;
    document.getElementById('notice-edit-title').value = n.title;
    document.getElementById('notice-edit-content').value = n.content;
    document.getElementById('notice-save-msg').style.display = 'none';
    document.getElementById('editor-modal-title').textContent = '공지 수정';
    window.setPublish(n.published !== false);
    document.getElementById('notice-editor-modal').style.display = 'flex';
};

// ---- 게시 여부 버튼 토글 ----
window.setPublish = function(val) {
    _publishState = val;
    const yes = document.getElementById('publish-btn-yes');
    const no  = document.getElementById('publish-btn-no');
    if (val) {
        yes.style.borderColor='#3182F6'; yes.style.background='#EFF6FF'; yes.style.color='#3182F6';
        no.style.borderColor='#E5E8EB';  no.style.background='white';    no.style.color='#8B95A1';
    } else {
        no.style.borderColor='#3182F6';  no.style.background='#EFF6FF';  no.style.color='#3182F6';
        yes.style.borderColor='#E5E8EB'; yes.style.background='white';   yes.style.color='#8B95A1';
    }
};

// ---- 공지 저장 (신규/수정) ----
window.saveNotice = async function() {
    const title   = document.getElementById('notice-edit-title').value.trim();
    const content = document.getElementById('notice-edit-content').value.trim();
    const editId  = document.getElementById('notice-edit-id').value;
    const msgEl   = document.getElementById('notice-save-msg');
    if (!title || !content) {
        msgEl.style.color = '#EF4444';
        msgEl.textContent = '제목과 내용을 모두 입력해주세요.';
        msgEl.style.display = 'block';
        return;
    }
    try {
        const { collection, doc, setDoc, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const db = await getDB();
        const data = { title, content, published: _publishState, createdAt: editId ? (_noticeList.find(x=>x.id===editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(), updatedAt: new Date().toISOString() };

        if (editId) {
            await setDoc(doc(db, "notices", editId), data);
        } else {
            await addDoc(collection(db, "notices"), data);
        }

        msgEl.style.color = '#16A34A';
        msgEl.textContent = '✅ 저장되었습니다!';
        msgEl.style.display = 'block';

        // 슬라이더 갱신
        const { getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        _noticeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        startTicker(_noticeList.filter(n => n.published));

        setTimeout(() => {
            document.getElementById('notice-editor-modal').style.display = 'none';
            window.openNoticeListModal();
        }, 1200);
    } catch(e) {
        msgEl.style.color = '#EF4444';
        msgEl.textContent = '저장 실패: ' + e.message;
        msgEl.style.display = 'block';
    }
};

// ---- 공지 삭제 ----
window.deleteCurrentNotice = async function() {
    if (!_currentNoticeId) return;
    if (!confirm('이 공지를 삭제하시겠습니까?')) return;
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const db = await getDB();
        await deleteDoc(doc(db, "notices", _currentNoticeId));
        document.getElementById('notice-detail-modal').style.display = 'none';
        _noticeList = _noticeList.filter(n => n.id !== _currentNoticeId);
        startTicker(_noticeList.filter(n => n.published));
        window.openNoticeListModal();
    } catch(e) {
        alert('삭제 실패: ' + e.message);
    }
};


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
            // window.navigateTo('page-claim-form');
            alert(companyName + " 청구 폼으로 이동합니다.");
        };
    }
};