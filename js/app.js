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
    if(document.getElementById('user-private-title')) {
        document.getElementById('user-private-title').innerText = email + " 전용 제어실";
    }
    const docRef = doc(db, "users_portal", email);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.globalClientRegistry = data.clientRegistry || {};
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
    
    if(mode === 'login') {
        loginBtn.classList.add('active'); regBtn.classList.remove('active');
        title.innerText = "보험가온포탈 로그인"; submitBtn.innerText = "포탈 접속하기";
        inviteGroup.style.display = 'none';
    } else {
        regBtn.classList.add('active'); loginBtn.classList.remove('active');
        title.innerText = "신규 멤버 회원가입"; submitBtn.innerText = "가입 및 로그인";
        inviteGroup.style.display = 'block';
    }
}

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
            .then(() => { 
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
window.unlockPrivate = function() {
    const pwd = document.getElementById('privatePwd').value;
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