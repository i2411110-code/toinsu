// ==========================================
// 1. Firebase 동적 Import (Pure HTML/JS 환경 호환 - window 전역 방식)
// claim-coords.js / claim.js / report.js / claim-dashboard.js 는
// index.html에서 <script src="..."> 태그로 직접 로드됩니다.
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// ✅ 끝부분에 sendPasswordResetEmail이 추가되었습니다.
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 2. 전역 변수 세팅 (Import가 모두 끝난 뒤에 와야 함!)
// ==========================================
window.globalClientRegistry = {};
window.currentUserSchedules = [];
let currentModalTargetName = "";

// 3. 파이어베이스 설정
const firebaseConfig = {
    apiKey: "AIzaSyA1GU9E5WuFUPIyT4Ma4_crArdANpCMQfs",
// ... (이 아래 코드는 그대로 두시면 됩니다!) ...
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

window.__firestoreDb = db;

let currentUserEmail = "";
const MASTER_INVITE_CODE = "gaon2026";

/* ==========================================
   카카오 로그인 (Redirect 방식 — 2026-07-24 카카오 팝업 로그인 지원 종료에 따라 전환)
   - KAKAO_JS_KEY는 카카오 개발자 콘솔 > 내 애플리케이션 > 앱 키 > "JavaScript 키" 값입니다.
     (hospitol 저장소와 같은 카카오 앱을 재사용하는 경우, 그 앱의 JS 키를 그대로 넣으면 됩니다.)
   - 카카오 개발자 콘솔 > 카카오 로그인 > Redirect URI 메뉴에 아래 KAKAO_REDIRECT_URI 값을
     "정확히 그대로" 등록해야 합니다.
   - 카카오 개발자 콘솔 > 앱 설정 > 플랫폼에 이 사이트의 실제 배포 도메인을 등록해야 합니다.
========================================== */
const KAKAO_JS_KEY = 'fe63758ba86171a9aa4341f1a6ae2052'; // ⚠️ hospitol과 동일한 카카오 앱 키. 다른 앱을 쓰려면 교체하세요.
const KAKAO_REDIRECT_URI = window.location.origin + window.location.pathname;

if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
}

window.handleKakaoLogin = function() {
    const errorMsg = document.getElementById('kakao-login-error');
    if (errorMsg) { errorMsg.style.display = 'none'; errorMsg.innerText = ''; }

    if (!window.Kakao) {
        if (errorMsg) { errorMsg.innerText = '❌ 카카오 SDK를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'; errorMsg.style.display = 'block'; }
        return;
    }

    // 팝업 대신 페이지 전체가 카카오 로그인 화면으로 이동했다가 redirectUri로 돌아옵니다.
    window.Kakao.Auth.authorize({
        redirectUri: KAKAO_REDIRECT_URI,
        scope: 'profile_nickname'
    });
};

// 카카오 로그인 화면에서 돌아왔을 때 (?code=... 붙어서 리다이렉트됨) 처리
(async function handleKakaoRedirectCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const kakaoError = params.get('error');
    const errorMsg = document.getElementById('kakao-login-error');

    if (kakaoError) {
        history.replaceState(null, '', window.location.pathname);
        if (errorMsg) { errorMsg.innerText = '❌ 카카오 로그인이 취소되었거나 실패했습니다.'; errorMsg.style.display = 'block'; }
        return;
    }
    if (!code) return;

    // 새로고침 시 인가 코드가 재사용되어 에러나지 않도록 URL에서 즉시 제거
    history.replaceState(null, '', window.location.pathname);

    try {
        const res = await fetch('/api/kakao-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri: KAKAO_REDIRECT_URI })
        });
        const data = await res.json();
        if (!res.ok) {
            if (errorMsg) {
                errorMsg.innerText = '❌ 카카오 로그인 실패: ' + (data.error || '알 수 없는 오류');
                errorMsg.style.display = 'block';
            }
            return;
        }
        await signInWithCustomToken(auth, data.token);
        document.getElementById('auth-overlay').style.display = 'none';
    } catch (err) {
        if (errorMsg) {
            errorMsg.innerText = '❌ 카카오 로그인 처리 중 오류가 발생했습니다.';
            errorMsg.style.display = 'block';
        }
    }
})();

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

async function updateVisitCounter(email) {
    // 🚫 집계에서 제외할 이메일 목록
    const excludedEmails = ['dlsqh814@naver.com'];
    const isExcluded = excludedEmails.includes(email);

   const now = new Date();
    const today = now.getFullYear() + '-'
        + String(now.getMonth() + 1).padStart(2, '0') + '-'
        + String(now.getDate()).padStart(2, '0');
    const statsRef = doc(db, "site_stats", "visit_counter");
    try {
        const snap = await getDoc(statsRef);
        if (!snap.exists()) {
            // 최초 문서 생성 시
            if (!isExcluded) {
                await setDoc(statsRef, { total: 1, lastDate: today, todayCount: 1 });
            }
            document.getElementById('count-today').innerText = isExcluded ? 0 : 1;
            document.getElementById('count-total').innerText = isExcluded ? 0 : 1;
        } else {
            const data = snap.data();
            const isNewDay = data.lastDate !== today;
            
            if (!isExcluded) {
                // [1] 일반 사원/고객: DB 카운트 올리고 화면 갱신
                if (isNewDay) {
                    // 새로운 날인 경우: 오늘 카운트를 1로 초기화하고 날짜 갱신
                    await updateDoc(statsRef, {
                        total: increment(1),
                        todayCount: 1,
                        lastDate: today
                    });
                    document.getElementById('count-today').innerText = 1;
                    document.getElementById('count-total').innerText = (data.total || 0) + 1;
                } else {
                    // 같은 날인 경우: 기존 카운트 누적
                    await updateDoc(statsRef, {
                        total: increment(1),
                        todayCount: increment(1)
                    });
                    document.getElementById('count-today').innerText = (data.todayCount || 0) + 1;
                    document.getElementById('count-total').innerText = (data.total || 0) + 1;
                }
            } else {
                // [2] 팀장님 계정: DB 수치는 안 올리지만 날짜 변화에 따른 화면 초기화 대응
                console.log(`[통계 제외] ${email} 접속 - UI 바인딩 진행 (날짜 변경 여부: ${isNewDay})`);
                
                if (isNewDay) {
                    // 🌟 핵심수정: 서버 데이터가 아직 어제 날짜에 머물러 있더라도, 
                    // 실제 날짜가 바뀌었다면 오늘 카운터는 화면에 '0'으로 표기되어야 합니다.
                    document.getElementById('count-today').innerText = 0;
                    document.getElementById('count-total').innerText = (data.total || 0);
                } else {
                    // 같은 날이라면 기존에 쌓인 오늘 카운트 정상 표시
                    document.getElementById('count-today').innerText = (data.todayCount || 0);
                    document.getElementById('count-total').innerText = (data.total || 0);
                }
            }
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
    
    // 숨기고 보여줄 대상들
    const inviteGroup = document.getElementById('invite-code-group');
    const passConfirmGroup = document.getElementById('password-confirm-group');
    const nameGroup = document.getElementById('name-input-group');
    const loginHelperGroup = document.getElementById('login-helper-group'); // ✅ 이메일기억/비번찾기 줄
    const emailHelperText = document.getElementById('email-helper-text');   // ✅ 이메일 필수 안내 문구
    
    document.getElementById('auth-error-msg').style.display = 'none';
    
    if(mode === 'login') {
        // [로그인 화면 세팅]
        loginBtn.classList.add('active'); regBtn.classList.remove('active');
        title.innerText = "보험가온포탈 로그인"; submitBtn.innerText = "포탈 접속하기";
        
        if(inviteGroup) inviteGroup.style.display = 'none';
        if(nameGroup) nameGroup.style.display = 'none';
        if(passConfirmGroup) passConfirmGroup.style.display = 'none';
        if(emailHelperText) emailHelperText.style.display = 'none';
        
        // 로그인 화면 전용 옵션 표시
        if(loginHelperGroup) loginHelperGroup.style.display = 'flex';
    } else {
        // [회원가입 화면 세팅]
        regBtn.classList.add('active'); loginBtn.classList.remove('active');
        title.innerText = "신규 멤버 회원가입"; submitBtn.innerText = "가입 및 로그인";
        
        if(inviteGroup) inviteGroup.style.display = 'block';
        if(nameGroup) nameGroup.style.display = 'block';
        if(passConfirmGroup) passConfirmGroup.style.display = 'block';
        
        // 가입 시 이메일 안내 표시 & 기억하기 줄 숨김
        if(emailHelperText) emailHelperText.style.display = 'block';
        if(loginHelperGroup) loginHelperGroup.style.display = 'none';
    }
}

window.handleAuthSubmit = function() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorMsg = document.getElementById('auth-error-msg');
    const saveEmailChk = document.getElementById('save-email-chk');
    const shouldSave = saveEmailChk ? saveEmailChk.checked : false;
    errorMsg.style.display = "none";

    if(!email || !password) {
        errorMsg.innerText = "❌ 이메일과 비밀번호를 모두 입력하세요.";
        errorMsg.style.display = "block"; return;
    }

    if(document.getElementById('tab-login-btn').classList.contains('active')) {
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { 
                if (shouldSave) {
                    localStorage.setItem('gaonSavedEmail', email); 
                } else {
                    localStorage.removeItem('gaonSavedEmail'); 
                }
                document.getElementById('auth-overlay').style.display = 'none'; 
            })
            .catch((error) => {
                errorMsg.innerText = "❌ 로그인 실패: " + error.message;
                errorMsg.style.display = "block";
            });
    } else {
        const passwordConfirm = document.getElementById('auth-password-confirm').value;
        const inviteCode = document.getElementById('auth-invite-code').value.trim();
        
        if(password !== passwordConfirm) {
            errorMsg.innerText = "❌ 비밀번호가 서로 일치하지 않습니다.";
            errorMsg.style.display = "block"; return;
        }
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
                if (shouldSave) {
                    localStorage.setItem('gaonSavedEmail', email);
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

// 👇 여기에 추가
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (!target || !target.id) return;
    const authInputIds = ['auth-email', 'auth-password', 'auth-password-confirm', 'auth-name', 'auth-invite-code'];
    if (authInputIds.includes(target.id)) {
        e.preventDefault();
        if (typeof window.handleAuthSubmit === 'function') {
            window.handleAuthSubmit();
        }
    }
});

// ⚠️ 중복 분량을 완전히 제거하고 하나로 통합한 상태 제어 엔진
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('user-display-email').innerText = user.email;
         window.__currentUserUid = user.uid;
        loadUserIntegratedData(user.email);
        updateVisitCounter(user.email);
        window.checkAndShowNotice();
        window.loadComponent('main-dashboard');
        window.startSessionTimer();
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
        const savedEmail = localStorage.getItem('gaonSavedEmail');
        if(savedEmail && document.getElementById('auth-email')) {
            document.getElementById('auth-email').value = savedEmail;
            const chkBox = document.getElementById('save-email-chk');
            if(chkBox) chkBox.checked = true;
        }
        if(window.clearSessionTimer) window.clearSessionTimer();
    }
});

window.handleLogout = function() {
    if(confirm("로그아웃 하시겠습니까?")) { 
        signOut(auth).then(() => { 
            window.clearSessionTimer();
            location.reload(); 
        }); 
    }
}

// ✨ [신규 추가] 파이어베이스 비밀번호 재설정 메일 전송 로직
window.handleForgotPassword = function() {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) {
        alert("💡 비밀번호를 찾으실 이메일 주소를 입력창에 먼저 적어주세요!");
        document.getElementById('auth-email').focus();
        return;
    }
    
    if (confirm(`${email} 주소로 비밀번호 재설정 링크를 전송하시겠습니까?`)) {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                alert("✉️ 비밀번호 재설정 이메일이 발송되었습니다.\n메일함을 확인하여 비밀번호를 변경해 주세요.");
            })
            .catch((error) => {
                alert("❌ 메일 발송 실패: " + error.message);
            });
    }
};

// ==========================================
// [신규 추가] 30분 자동 로그아웃 및 연장 시스템
// ==========================================
let sessionWarningTimer = null;
let sessionLogoutTimer = null;

// 테스트를 위해 시간 짧게 설정되어 있다면 아래처럼 원상복구 하세요 (25분 / 30분)
const WARNING_TIME = 25 * 60 * 1000; 
const LOGOUT_TIME = 30 * 60 * 1000;  

window.startSessionTimer = function() {
    window.clearSessionTimer(); // 기존 타이머 리셋
    
    // 25분 뒤에 경고 모달 띄우기
    sessionWarningTimer = setTimeout(() => {
        const modal = document.getElementById('session-extend-modal');
        if (modal) modal.style.display = 'flex';
    }, WARNING_TIME);

    // 30분 뒤에 강제 로그아웃
    sessionLogoutTimer = setTimeout(() => {
        alert("보안을 위해 자동 로그아웃 되었습니다.");
        signOut(auth).then(() => { location.reload(); });
    }, LOGOUT_TIME);
};

window.clearSessionTimer = function() {
    clearTimeout(sessionWarningTimer);
    clearTimeout(sessionLogoutTimer);
};

window.extendSession = function() {
    const modal = document.getElementById('session-extend-modal');
    if (modal) modal.style.display = 'none';
    window.startSessionTimer(); // 타이머를 다시 처음부터 세팅
};

window.executeRegistrySync = syncRegistryToDatabase;

// ==========================================
// [SPA 부품 조립(라우팅) 엔진 추가]
// ==========================================
window.loadComponent = async function(pageId, extraAction) {
    // 💡 1. 가온 오피스 클릭 시, 화면을 불러오기 전 서버 권한부터 즉시 체크합니다.
    if (pageId === 'page-가온 오피스') {
        const currentUserEmail = window.__currentUserEmail;
        const currentUserUid = window.__currentUserUid;
        if (!currentUserEmail && !currentUserUid) {
            alert("로그인 정보가 확인되지 않습니다. 다시 로그인해 주세요.");
            return; // ❌ 화면 안 넘어가고 중단
        }
        try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const accessRef = doc(window.__firestoreDb, "admin_settings", "office_access");
            const accessSnap = await getDoc(accessRef);

            if (accessSnap.exists()) {
                const allowedUsers = accessSnap.data().allowedUsers || [];
                // 명단에 없을 경우
               const currentUserUid = window.__currentUserUid;
if (!allowedUsers.includes(currentUserEmail) && !allowedUsers.includes(currentUserUid)) {
                    alert("가온 오피스 접근 권한이 없습니다.\n팀장님(관리자)에게 승인을 요청해 주세요.");
                    return; // ❌ 권한 없으면 메인 화면에 그대로 머무름
                }
            } else {
                alert("서버에 권한 설정 데이터가 존재하지 않습니다.");
                return;
            }
        } catch (error) {
            console.error("권한 확인 중 오류 발생:", error);
            alert("권한을 확인하는 중 서버 오류가 발생했습니다.");
            return;
        }
    }

    const root = document.getElementById('app-root');
    let url = `components/${pageId}.html`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('파일을 찾을 수 없습니다.');
        const html = await response.text();
        root.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 💡 2. 가온 오피스에 정상 입장했다면, 중간 화면 없이 곧바로 캘린더를 실행해줍니다.
        if (pageId === 'page-가온 오피스') {
            window.switchPrivateTab('cal');
            if (typeof window.initGaonCalendar === 'function') window.initGaonCalendar();
        }

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

        // 약관조회 탭 초기 상태 세팅
        window.switchTermsTab = function(type) {
            const nonlifeTab = document.getElementById('terms-tab-nonlife');
            const lifeTab    = document.getElementById('terms-tab-life');
            const gridNon    = document.getElementById('terms-grid-nonlife');
            const gridLife   = document.getElementById('terms-grid-life');
            if (!nonlifeTab || !lifeTab) return;
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

        // 공시실 탭 초기 상태 세팅
        if (pageId === 'page-gongsil') {
            requestAnimationFrame(() => {
                const nonlifeTab = document.getElementById('gongsil-tab-nonlife');
                const lifeTab    = document.getElementById('gongsil-tab-life');
                const gridNon    = document.getElementById('gongsil-grid-nonlife');
                const gridLife   = document.getElementById('gongsil-grid-life');
                function switchGongsilTab(type) {
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
                if (nonlifeTab && lifeTab) {
                    nonlifeTab.addEventListener('click', () => switchGongsilTab('nonlife'));
                    lifeTab.addEventListener('click', () => switchGongsilTab('life'));
                }
            });
        }

        // 메인 대시보드 이름 표시
        if (pageId === 'main-dashboard') {
            requestAnimationFrame(() => {
                const el = document.getElementById('main-user-name');
                if(el) el.innerText = (window.currentUserDisplayName || '') + '님';
            });
        }

        // 청구의 모든것 이름 표시
        if (pageId === 'page-claim-main') {
            requestAnimationFrame(async () => {
                const el = document.getElementById('claim-user-name');
                if(el) el.innerText = window.currentUserDisplayName || '안녕하세요';
                await window.loadClaimDashboard();
            });
        }

        // 청구서 작성 폼 초기화
        if (pageId === 'page-claim-form') {
            requestAnimationFrame(() => {
                if (typeof window.initClaimCanvas === 'function') window.initClaimCanvas();
            });
        }

        // 보험사 선택 화면 진입 시 첫 탭(손해보험) 활성화
        if (pageId === 'page-claim-select') {
            requestAnimationFrame(() => {
                const firstBtn = document.querySelector('.form-toggle-btn');
                if (firstBtn && typeof window.switchClaimTab === 'function') {
                    window.switchClaimTab(firstBtn, 'grid-nonlife');
                }
            });
        }

        // 재무 계산기 - 인라인 스크립트 재실행
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

// switchOfficeSubTab → switchPrivateDataTab 위임 (page-private.html 수정 탭 버튼과 호환)
window.switchOfficeSubTab = function(target) {
    window.switchPrivateDataTab(target);
};

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
    if (!tbody) return;
    tbody.innerHTML = '';

    const filterContract = document.getElementById('f_contract')?.value || 'all';
    const filterDoc      = document.getElementById('f_doc')?.value      || 'all';
    const searchKeyword  = (document.getElementById('f_search')?.value || '').trim();

    // ✅ 기본 정렬: savedAt 내림차순(최신순)
    const entries = Object.entries(window.globalClientRegistry || {})
        .sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));

    entries.forEach(([name, d]) => {
        if (filterContract !== 'all' && d.contract !== filterContract) return;
        if (filterDoc      !== 'all' && d.document !== filterDoc)      return;
        if (searchKeyword  && !name.includes(searchKeyword)
            && !(d.phone && d.phone.includes(searchKeyword)))           return;

        const docBadgeClass = d.document === '출력만'  ? 'badge-blue'
                            : d.document === '출력 X' ? 'badge-gray'
                            : 'badge-yellow';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700; color:#0F172A;">${name}</td>
            <td><span class="badge ${d.contract === '완료' ? 'badge-green' : 'badge-orange'}">${d.contract}</span></td>
            <td><span class="badge ${docBadgeClass}">${d.document}</span></td>
            <td>${d.phone || '-'}</td>
            <td style="text-align:left; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.progress || '-'}</td>
            <td><button onclick="window.triggerGodeungView(event,'${name}')"
                        style="padding:4px 8px;border-radius:6px;border:1px solid #CBD5E1;background:white;font-size:12px;cursor:pointer;">고등</button></td>
            <td><button onclick="window.triggerDirectEdit('${name}')"
                        style="padding:4px 8px;border-radius:6px;border:1px solid #CBD5E1;background:white;font-size:12px;cursor:pointer;">수정</button></td>
        `;
        tr.onclick = () => { window.triggerPopupDetailView(name); };
        tbody.appendChild(tr);
    });
}

window.sortCombinedCrm = function(criteria) {
    const entries = Object.entries(window.globalClientRegistry || {});
    if (criteria === 'name') {
        entries.sort((a, b) => a[0].localeCompare(b[0], 'ko'));
    } else {
        // 'date' 또는 기타 → 최신순
        entries.sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));
    }
    const sorted = {};
    entries.forEach(([k, v]) => { sorted[k] = v; });
    window.globalClientRegistry = sorted;
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

// ==========================================
// ✅ [신규] 할 일(Todo) — 데이터베이스 연동 및 취소선 기능 추가
// ==========================================

window.addTodo = function() {
    const input = document.getElementById('todoInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    // 객체 형태로 DB 배열의 맨 앞에 추가 (done 상태 포함)
    window.currentUserSchedules.unshift({ text: val, done: false });
    input.value = '';
    input.focus();
    
    // DB와 동기화 후 다시 그리기
    if (window.executeRegistrySync) {
        window.executeRegistrySync().then(() => { window._renderTodoList(); });
    } else {
        window._renderTodoList();
    }
};

window._renderTodoList = function() {
    const ul = document.getElementById('todoList');
    const emptyMsg = document.getElementById('todo-empty');
    if (!ul) return;

    const schedules = window.currentUserSchedules || [];

    if (schedules.length === 0) {
        ul.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    ul.innerHTML = schedules.map((item, idx) => {
        // 기존 텍스트 전용 과거 데이터와의 호환성 처리
        let isObj = typeof item === 'object';
        let text = isObj ? item.text : item;
        let done = isObj ? item.done : false;
        
        return `
        <li style="display:flex; align-items:flex-start; gap:8px; padding:10px; background:#F8FAFC; border-radius:10px; border:1px solid #E2E8F0; transition: all 0.2s;">
            <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; flex:1; margin:0;">
                <input type="checkbox" ${done ? 'checked' : ''} onchange="window._toggleTodo(${idx})" style="width:16px; height:16px; margin-top:2px; accent-color:var(--main-blue); cursor:pointer;">
                <span style="flex:1; font-size:13px; line-height:1.4; word-break:keep-all; transition: all 0.2s; ${done ? 'text-decoration:line-through; color:#94A3B8;' : 'color:#334155;'}">
                    ${text}
                </span>
            </label>
            <button onclick="window._deleteTodo(${idx})" style="background:none; border:none; color:#CBD5E1; cursor:pointer; font-size:18px; line-height:1; padding:0; flex-shrink:0; transition:color 0.2s;" onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='#CBD5E1'">&times;</button>
        </li>
        `;
    }).join('');
};

window._toggleTodo = function(idx) {
    let item = window.currentUserSchedules[idx];
    // 과거 텍스트 데이터였다면 객체로 변환
    if (typeof item === 'string') {
        window.currentUserSchedules[idx] = { text: item, done: true };
    } else {
        item.done = !item.done;
    }
    // 상태 변경 후 DB 동기화
    if (window.executeRegistrySync) {
        window.executeRegistrySync().then(() => window._renderTodoList());
    } else {
        window._renderTodoList();
    }
};

window._deleteTodo = function(idx) {
    window.currentUserSchedules.splice(idx, 1);
    // 삭제 후 DB 동기화
    if (window.executeRegistrySync) {
        window.executeRegistrySync().then(() => window._renderTodoList());
    } else {
        window._renderTodoList();
    }
};

// 기존 캘린더 로드 시 데이터를 불러오기 위한 렌더링 연결
window.renderSchedule = window._renderTodoList;
window.deleteSchedule = window._deleteTodo;

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
// [가온 오피스 전용 로직 - 파이어베이스 권한 검증]
// ==========================================

window.unlockPrivate = async function() {
    const currentUserEmail = window.__currentUserEmail;
    const currentUserUid = window.__currentUserUid;
    if (!currentUserEmail && !currentUserUid) {
        alert("로그인 정보가 확인되지 않습니다. 다시 로그인해 주세요.");
        return;
    }

    // 검증 중 사용자에게 보여줄 메시지 (선택 사항)
    const authBtn = document.querySelector('#privateAuthScreen .btn-action');
    const originalText = authBtn.innerText;
    authBtn.innerText = "서버에서 권한 확인 중...";
    authBtn.disabled = true;

    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const db = window.__firestoreDb; // 이미 초기화된 db 객체 사용

        // 🌟 파이어베이스에서 접근 권한 명단 조회
        const accessRef = doc(db, "admin_settings", "office_access");
        const accessSnap = await getDoc(accessRef);

        if (accessSnap.exists()) {
            const allowedUsers = accessSnap.data().allowedUsers || [];

            // 서버 명단과 현재 로그인된 이메일 대조
            const currentUserUid = window.__currentUserUid;
if (allowedUsers.includes(currentUserEmail) || allowedUsers.includes(currentUserUid)) {
                // 권한 승인: 오피스 입장
                document.getElementById('privateAuthScreen').style.display = 'none';
                document.getElementById('privateMainContent').style.display = 'block';
                
                // [수정 완료] 캘린더 자동 실행
                window.switchPrivateTab('cal');
                if (typeof window.initGaonCalendar === 'function') window.initGaonCalendar();
                
            } else {
                // 명단에 없음: 입장 거부
                alert("가온 오피스 접근 권한이 없습니다.\n팀장님(관리자)에게 승인을 요청해 주세요.");
            }
        } else {
            alert("서버에 권한 설정 데이터가 존재하지 않습니다.");
        }
    } catch (error) {
        console.error("권한 확인 중 오류 발생:", error);
        alert("권한을 확인하는 중 서버 오류가 발생했습니다.");
    } finally {
        // 버튼 상태 원상복구
        authBtn.innerText = originalText;
        authBtn.disabled = false;
    }
};

// 2. 내부 탭 전환 — 페이지별 라우터
// ─────────────────────────────────────────────────────────────────────────────
// ▶ page-가온_오피스 → switchGaonOfficeTab(tab)  (btn-ptab-* / dashboard-app 등)
// ▶ page-private     → switchPrivateDataTab(tab)  (btn-tab-input|list)
// ▶ window.switchPrivateTab 은 두 함수를 모두 위임하는 공용 라우터로 유지
//   (HTML 인라인 onclick 호출이 섞여있어 하나의 이름으로 통일)
// ─────────────────────────────────────────────────────────────────────────────

// ── 가온 오피스 전용: 4탭 전환 (db / chk / rpt / cal) ──
window.switchGaonOfficeTab = function(tab) {
    const PTAB_PANELS = {
        'db':  'dashboard-app',
        'chk': 'checklist-app',
        'rpt': 'report-app',
        'cal': 'calendar-app',
        'cca': 'cca-app',
    };
    // 모든 패널 숨김
    Object.values(PTAB_PANELS).forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.classList.remove('is-active'); }
    });
    // 모든 탭 버튼 비활성화
    Object.keys(PTAB_PANELS).forEach(k => {
        const btn = document.getElementById('btn-ptab-' + k);
        if (btn) btn.classList.remove('active');
    });
    // 선택 패널만 표시
    const panelId = PTAB_PANELS[tab];
    if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            // cal이나 db 탭일 때는 레이아웃이 깨지지 않게 grid 형태로 열어줍니다.
            panel.style.display = (tab === 'db' || tab === 'cal') ? 'grid' : 'block';
            panel.classList.add('is-active');
        }
    }
    const activeBtn = document.getElementById('btn-ptab-' + tab);
    if (activeBtn) activeBtn.classList.add('active');

    // 리포트 탭: 초기화 함수 호출
    if (tab === 'rpt' && window.initRptModule) window.initRptModule();
    // 캘린더 탭: 렌더
    if (tab === 'cal' && window.calendarRender) setTimeout(() => window.calendarRender(), 50);
};

// ── 개인공간 전산실 전용: 2탭 전환 (input / list) ──
window.switchPrivateDataTab = function(tab) {
    const TAB_MAP = {
        'input': 'office-sub-input-view',
        'list':  'office-sub-list-view',
    };
    Object.values(TAB_MAP).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    Object.keys(TAB_MAP).forEach(k => {
        const btn = document.getElementById('btn-tab-' + k);
        if (btn) btn.classList.remove('active');
    });
    const viewId = TAB_MAP[tab];
    if (viewId) {
        const view = document.getElementById(viewId);
        if (view) view.style.display = '';
    }
    const activeBtn = document.getElementById('btn-tab-' + tab);
    if (activeBtn) activeBtn.classList.add('active');
    if (tab === 'list') window.renderCombinedCrmList && window.renderCombinedCrmList();
};

// ── 공용 라우터: HTML onclick="window.switchPrivateTab(...)" 을 모두 처리 ──
window.switchPrivateTab = function(target) {
    // 가온 오피스 탭 키 (db/chk/rpt/cal/cca)
    if (['db', 'chk', 'rpt', 'cal', 'cca'].includes(target)) {
        window.switchGaonOfficeTab(target);
    // 개인공간 탭 키 (input/list)
    } else if (['input', 'list'].includes(target)) {
        window.switchPrivateDataTab(target);
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
// 실손 계산기 (5세대 로직 포함)
// =====================================================
(function() {
  const GENERATIONS = [
    { id:"1gen",  label:"1세대",    period:"~2009.09",       note:"자기부담금 0%",            coverGubun:100, coverNonGubun:100, inpatientLimit:5e7, has3Types:false,
      limitOptions:[{label:"10만원",outpatientLimit:1e5,prescriptionLimit:0},{label:"30만원",outpatientLimit:3e5,prescriptionLimit:0},{label:"50만원",outpatientLimit:5e5,prescriptionLimit:0}],
      deductible:{clinic:5000,hospital:10000,general:10000,prescription:0} },
    { id:"2gen",  label:"2세대",    period:"2009.10~2012.12", note:"급여 90%",                coverGubun:90,  coverNonGubun:90,  inpatientLimit:5e7, has3Types:false,
      limitOptions:[{label:"외래 20만 / 약제 10만",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만 / 약제 5만",outpatientLimit:25e4,prescriptionLimit:5e4}],
      deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000} },
    { id:"2gen2", label:"2세대",    period:"2013.01~2015.08", note:"급여 80%",                coverGubun:80,  coverNonGubun:80,  inpatientLimit:5e7, has3Types:false,
      limitOptions:[{label:"외래 20만 / 약제 10만",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만 / 약제 5만",outpatientLimit:25e4,prescriptionLimit:5e4}],
      deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000} },
    { id:"2gen3", label:"2세대",    period:"2015.09~2017.03", note:"급여 90% · 비급여 80%",   coverGubun:90,  coverNonGubun:80,  inpatientLimit:5e7, has3Types:false,
      limitOptions:[{label:"외래 20만 / 약제 10만",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만 / 약제 5만",outpatientLimit:25e4,prescriptionLimit:5e4}],
      deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000} },
    { id:"3gen",  label:"3세대",    period:"2017.04~2021.06", note:"급여 90% · 비급여 80%",   coverGubun:90,  coverNonGubun:80,  inpatientLimit:5e7, has3Types:true,  type3SelfRate:30,
      limitOptions:[{label:"외래 20만 / 약제 10만",outpatientLimit:2e5,prescriptionLimit:1e5},{label:"외래 25만 / 약제 5만",outpatientLimit:25e4,prescriptionLimit:5e4}],
      deductible:{clinic:10000,hospital:15000,general:20000,prescription:8000},
      type3Deductible:{injection:20000,manual:20000,mri:20000} },
    { id:"4gen",  label:"4세대",    period:"2021.07~2026.04", note:"급여 80% · 비급여 70%",   coverGubun:80,  coverNonGubun:70,  inpatientLimit:5e7, has3Types:true,  type3SelfRate:30, is4gen:true,
      limitOptions:[{label:"20만원 (외래+약제)",outpatientLimit:2e5,prescriptionLimit:0}],
      deductible:{clinic:10000,hospital:15000,general:20000},
      type3Deductible:{injection:30000,manual:30000,mri:30000} },
    { id:"5gen",  label:"5세대",    period:"2026.05~",        note:"중증·비중증 비급여 분리",  is5gen:true, inpatientLimit:5e7 },
    { id:"sick",  label:"유병자실손",period:"",               note:"약제비·비급여3종 제외",    coverGubun:70,  coverNonGubun:70,  inpatientLimit:5e7, has3Types:false,
      limitOptions:[{label:"20만원",outpatientLimit:2e5,prescriptionLimit:0}],
      deductible:{clinic:20000,hospital:20000,general:20000,prescription:0} }
  ];

  window.silsonState = { genId:'4gen', type:'outpatient', grade:'clinic', limitIdx:0, g5Type3OutMode:'severe', g5Type3InpMode:'severe' };
  const n = v => Number(v) || 0;
  const fmt = v => Math.round(Math.max(0, v)).toLocaleString();
  const gv = id => n(document.getElementById(id)?.value);

  // ── 세대 버튼 렌더 ──
  window._sg_renderGenGrid = function() {
    const grid = document.getElementById('silson-gen-grid');
    if (!grid) return;
    grid.innerHTML = GENERATIONS.map(g => `
      <button class="silson-gen-btn ${window.silsonState.genId===g.id?'active':''}" onclick="window.selectSilsonGen('${g.id}')">
        <span class="gen-label">${g.label}</span>
        ${g.period ? `<span class="gen-period">${g.period}</span>` : ''}
        ${g.note   ? `<span class="gen-note">${g.note}</span>` : ''}
      </button>`).join('');
  };

  // ── UI 표시/숨김 제어 ──
  window._sg_updateUI = function() {
    const g = GENERATIONS.find(x => x.id === window.silsonState.genId);
    if (!g) return;
    const is5 = !!g.is5gen;

    // 한도 셀렉트
    const limitSel = document.getElementById('silson-limit-select');
    const limitGroup = document.getElementById('silson-limit-group');
    if (limitGroup) limitGroup.style.display = (!is5 && g.limitOptions) ? '' : 'none';
    if (limitSel && g.limitOptions) {
      limitSel.innerHTML = g.limitOptions.map((o,i) => `<option value="${i}">${o.label}</option>`).join('');
      limitSel.value = window.silsonState.limitIdx;
    }

    // 통원 카드 전환
    const legacyOut = document.getElementById('silson-outpatient-legacy-card');
    const g5Out     = document.getElementById('silson-gen5-outpatient-area');
    if (legacyOut) legacyOut.style.display = is5 ? 'none' : '';
    if (g5Out)     g5Out.style.display     = is5 ? '' : 'none';

    // 입원 카드 전환
    const legacyInp = document.getElementById('silson-inpatient-legacy-card');
    const g5Inp     = document.getElementById('silson-gen5-inpatient-area');
    if (legacyInp) legacyInp.style.display = is5 ? 'none' : '';
    if (g5Inp)     g5Inp.style.display     = is5 ? '' : 'none';

    // 약제비 (2세대, 3세대만)
    const showPresc = !is5 && !g.is4gen && g.id!=='sick' && (g.limitOptions?.[0]?.prescriptionLimit > 0);
    const pc = document.getElementById('silson-prescription-card');
    if (pc) pc.style.display = showPresc ? '' : 'none';

    // 비급여 3종 (3세대, 4세대)
    const show3 = !is5 && !!g.has3Types;
    const t3out = document.getElementById('silson-type3-card');
    const t3inp = document.getElementById('silson-inp-type3-card');
    if (t3out) t3out.style.display = show3 ? '' : 'none';
    if (t3inp) t3inp.style.display = show3 ? '' : 'none';

    // 5세대 비급여 3종
    const g5t3out = document.getElementById('silson-g5-type3-out-card');
    const g5t3inp = document.getElementById('silson-g5-type3-inp-card');
    if (g5t3out) g5t3out.style.display = is5 ? '' : 'none';
    if (g5t3inp) g5t3inp.style.display = is5 ? '' : 'none';
  };

  // ── 세대 선택 ──
  window.selectSilsonGen = function(id) {
    window.silsonState.genId = id;
    window.silsonState.limitIdx = 0;
    window._sg_renderGenGrid();
    window._sg_updateUI();
    window.renderSilsonResult();
  };

  // ── 병원 등급 선택 ──
  window.selectSilsonGrade = function(grade) {
    window.silsonState.grade = grade;
    document.querySelectorAll('.silson-grade-btn').forEach(b => b.classList.toggle('active', b.dataset.grade===grade));
    window.renderSilsonResult();
  };

  // ── 통원/입원 전환 ──
  window.switchSilsonType = function(type) {
    window.silsonState.type = type;
    document.getElementById('btn-outpatient').classList.toggle('active', type==='outpatient');
    document.getElementById('btn-inpatient').classList.toggle('active', type==='inpatient');
    document.getElementById('silson-outpatient-area').style.display = type==='outpatient' ? '' : 'none';
    document.getElementById('silson-inpatient-area').style.display  = type==='inpatient'  ? '' : 'none';
    document.getElementById('silson-total-label').textContent = type==='outpatient' ? '통원 예상 보험금' : '입원 예상 보험금';
    window.renderSilsonResult();
  };

  // ── 5세대 비급여 3종 중증/비중증 전환 ──
  window.switchG5Type3 = function(area, mode) {
    const key = area==='out' ? 'g5Type3OutMode' : 'g5Type3InpMode';
    window.silsonState[key] = mode;
    const sevBtn  = document.getElementById(`g5-type3-${area}-severe-btn`);
    const mildBtn = document.getElementById(`g5-type3-${area}-mild-btn`);
    const sevArea = document.getElementById(`g5-type3-${area}-severe-area`);
    const mildArea= document.getElementById(`g5-type3-${area}-mild-area`);
    if(sevBtn)  sevBtn.classList.toggle('active', mode==='severe');
    if(mildBtn) mildBtn.classList.toggle('active', mode==='mild');
    if(sevArea) sevArea.style.display  = mode==='severe' ? '' : 'none';
    if(mildArea)mildArea.style.display = mode==='mild'   ? '' : 'none';
    window.renderSilsonResult();
  };

  // ====================================================
  // ── 계산 함수들 ──
  // ====================================================

  // 1~4세대, 유병자 통원 계산
  function calcOutpatient(g, grade, limitIdx) {
    const lo = g.limitOptions ? (g.limitOptions[limitIdx] || g.limitOptions[0]) : null;
    const outLimit = lo ? lo.outpatientLimit : 0;
    const covered    = gv('silson-gubun');
    const nonCovered = gv('silson-nongubun');
    const total = covered + nonCovered;

    if (g.is4gen) {
      const deductClinic = (grade==='clinic') ? 10000 : 20000;
      const cd = covered    > 0 ? Math.max(deductClinic, Math.round(covered    * 0.2)) : 0;
      const nd = nonCovered > 0 ? Math.max(30000,        Math.round(nonCovered * 0.3)) : 0;
      const pay = Math.max(0, Math.min(covered - cd, outLimit)) + Math.max(0, Math.min(nonCovered - nd, outLimit));
      return { total, deduct: cd + nd, result: pay };
    }
    if (g.id === 'sick') {
      const deductAmt = 20000;
      const selfRate  = 0.3;
      const deduct = Math.max(deductAmt, Math.round(total * selfRate));
      const pay    = Math.max(0, Math.min(total - deduct, outLimit));
      return { total, deduct, result: pay };
    }
    const deductAmt = g.deductible[grade] || 0;
    const selfPay   = Math.round(covered * (1 - g.coverGubun/100) + nonCovered * (1 - g.coverNonGubun/100));
    const fd = Math.max(deductAmt, selfPay);
    return { total, deduct: fd, result: Math.max(0, Math.min(total - fd, outLimit)) };
  }

  // 2~3세대 약제비
  function calcPrescription(g, limitIdx) {
    if (g.is4gen || g.is5gen || g.id==='sick') return null;
    const lo = g.limitOptions ? (g.limitOptions[limitIdx] || g.limitOptions[0]) : null;
    const prescLimit = lo ? lo.prescriptionLimit : 0;
    if (!prescLimit) return null;
    const covered    = gv('silson-presc-gubun');
    const nonCovered = gv('silson-presc-nongubun');
    const total      = covered + nonCovered;
    const deductAmt  = g.deductible.prescription || 0;
    const selfPay    = Math.round(covered*(1-g.coverGubun/100) + nonCovered*(1-g.coverNonGubun/100));
    const fd = Math.max(deductAmt, selfPay);
    return { total, deduct: fd, result: Math.max(0, Math.min(total - fd, prescLimit)) };
  }

  // 3~4세대 비급여 3종
  function calcType3(g, isInpatient) {
    if (!g.has3Types || g.is5gen) return null;
    const sr = g.type3SelfRate / 100;
    const d  = g.type3Deductible;
    const pfx = isInpatient ? 'silson-inp-' : 'silson-';
    const inj = gv(`${pfx}injection`), man = gv(`${pfx}manual`), mri = gv(`${pfx}mri`);
    const injD = Math.max(d.injection, Math.round(inj*sr));
    const manD = Math.max(d.manual,    Math.round(man*sr));
    const mriD = Math.max(d.mri,       Math.round(mri*sr));
    const injR = Math.max(0,inj-injD), manR = Math.max(0,man-manD), mriR = Math.max(0,mri-mriD);
    return { injDeduct:injD, manDeduct:manD, mriDeduct:mriD, injResult:injR, manResult:manR, mriResult:mriR, total:injR+manR+mriR };
  }

  // 1~4세대, 유병자 입원 계산
  function calcInpatient(g) {
    const covered    = gv('silson-inp-gubun');
    const nonCovered = gv('silson-inp-nongubun');
    const days    = Math.max(1, gv('silson-days') || 1);
    const room    = document.getElementById('silson-room')?.value;
    const roomDiff= (room==='premium') ? gv('silson-room-diff') : 0;

    if (g.id === 'sick') {
      const deduct = Math.max(100000, Math.round((covered+nonCovered)*0.3));
      const pay    = Math.max(0, Math.min(covered+nonCovered - deduct, 5e7));
      const rp     = Math.min(roomDiff*0.5, 100000) * days;
      return { total:covered+nonCovered, gubunPay:0, nonGubunPay:pay, roomPay:rp, result:Math.min(pay+rp,5e7) };
    }
    const gp = Math.round(covered    * (g.coverGubun/100));
    const np = Math.round(nonCovered * (g.coverNonGubun/100));
    const rpd = roomDiff * 0.5;
    const rp  = Math.min(g.id==='1gen' ? rpd : Math.min(rpd, 100000), 100000) * days;
    return { total:covered+nonCovered, gubunPay:gp, nonGubunPay:np, roomPay:rp, result:Math.min(gp+np+rp, g.inpatientLimit) };
  }

  // ── 5세대 통원 계산 ──
  function calc5GenOutpatient(grade) {
    const gubun   = gv('silson-g5-out-gubun');
    const severe  = gv('silson-g5-out-severe');
    const mild    = gv('silson-g5-out-mild');
    const deductG = (grade==='clinic') ? 10000 : 20000;
    const gPay    = Math.max(0, gubun   - Math.max(deductG, Math.round(gubun*0.2)));
    const sPay    = Math.max(0, severe  - Math.max(30000,   Math.round(severe*0.3)));
    const mPay    = Math.max(0, mild    - Math.max(50000,   Math.round(mild*0.5)));
    const nonPay  = Math.min(sPay + mPay, 200000); // 비급여 회당 20만 한도
    return {
      total: gubun+severe+mild,
      gubunPay: gPay,
      severePay: sPay,
      mildPay: mPay,
      nonPay,
      result: gPay + nonPay,
      gubunDeduct: Math.max(deductG, Math.round(gubun*0.2)),
      severeDeduct: Math.max(30000, Math.round(severe*0.3)),
      mildDeduct:  Math.max(50000, Math.round(mild*0.5))
    };
  }

  // ── 5세대 입원 계산 ──
  function calc5GenInpatient(grade) {
    const gubun  = gv('silson-g5-inp-gubun');
    const severe = gv('silson-g5-inp-severe');
    const mild   = gv('silson-g5-inp-mild');
    const gDeduct  = Math.min(Math.round(gubun*0.2 + severe*0.3), (grade==='general'||grade==='hospital') ? 5000000 : 2000000);
    const gPay     = Math.max(0, gubun+severe - gDeduct);
    const mDeduct  = Math.round(mild*0.5);
    const mPay     = Math.min(Math.max(0, mild - mDeduct), 3000000);
    return {
      total: gubun+severe+mild,
      gubunPay: gPay,
      mildPay: mPay,
      gDeduct, mDeduct,
      result: Math.min(gPay + mPay, 5e7)
    };
  }

  // ── 5세대 비급여 3종 ──
  function calc5GenType3(area) {
    const mode = area==='out' ? window.silsonState.g5Type3OutMode : window.silsonState.g5Type3InpMode;
    const pfx  = `silson-g5-${area}-`;
    if (mode==='severe') {
      const man = gv(`${pfx}manual`), inj = gv(`${pfx}injection`), mri = gv(`${pfx}mri`);
      const manD = Math.max(30000, Math.round(man*0.3));
      const injD = Math.max(30000, Math.round(inj*0.3));
      const mriD = Math.max(30000, Math.round(mri*0.3));
      const manR = Math.min(Math.max(0,man-manD), 3500000);
      const injR = Math.min(Math.max(0,inj-injD), 2500000);
      const mriR = Math.min(Math.max(0,mri-mriD), 3000000);
      return { mode:'severe', manDeduct:manD, injDeduct:injD, mriDeduct:mriD, manResult:manR, injResult:injR, mriResult:mriR, total:manR+injR+mriR };
    } else {
      const mriM = gv(`${pfx}mri-mild`);
      const mriD = Math.max(50000, Math.round(mriM*0.5));
      const mriR = Math.min(Math.max(0, mriM-mriD), 2000000);
      return { mode:'mild', mriMildDeduct:mriD, mriMildResult:mriR, total:mriR };
    }
  }

  // ── 화면 렌더 ──
  window.renderSilsonResult = function() {
    const g = GENERATIONS.find(x => x.id===window.silsonState.genId);
    if (!g) return;
    const { limitIdx, grade, type } = window.silsonState;
    const sv = (id, v) => { const el=document.getElementById(id); if(el) el.value=`${fmt(v)}원`; };

    if (type==='outpatient') {
      if (g.is5gen) {
        const out = calc5GenOutpatient(grade);
        const t3  = calc5GenType3('out');
        const e1 = document.getElementById('silson-g5-out-gubun-result');
        if(e1) e1.innerHTML=`<table><tr><td>급여 금액</td><td>${fmt(out.total-gv('silson-g5-out-severe')-gv('silson-g5-out-mild'))}원</td></tr><tr><td>공제액</td><td>${fmt(out.gubunDeduct)}원</td></tr><tr><td>급여 예상보험금</td><td>${fmt(out.gubunPay)}원</td></tr></table>`;
        const e2 = document.getElementById('silson-g5-out-nongubun-result');
        if(e2) e2.innerHTML=`<table><tr><td>중증 비급여 공제</td><td>${fmt(out.severeDeduct)}원</td></tr><tr><td>비중증 비급여 공제</td><td>${fmt(out.mildDeduct)}원</td></tr><tr><td>비급여 예상보험금</td><td>${fmt(out.nonPay)}원</td></tr></table>`;
        // 3종 렌더
        if (t3.mode==='severe') {
          sv('silson-g5-out-manual-deduct',    t3.manDeduct);
          sv('silson-g5-out-injection-deduct', t3.injDeduct);
          sv('silson-g5-out-mri-deduct',       t3.mriDeduct);
        } else {
          sv('silson-g5-out-mri-mild-deduct',  t3.mriMildDeduct);
        }
        const e3 = document.getElementById('silson-g5-type3-out-result');
        if(e3) {
          if(t3.mode==='severe') e3.innerHTML=`<table><tr><td>도수치료</td><td>${fmt(t3.manResult)}원</td></tr><tr><td>비급여주사제</td><td>${fmt(t3.injResult)}원</td></tr><tr><td>MRI/MRA</td><td>${fmt(t3.mriResult)}원</td></tr><tr><td>3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
          else e3.innerHTML=`<table><tr><td>MRI/MRA (비중증)</td><td>${fmt(t3.mriMildResult)}원</td></tr><tr><td>3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
        }
        const te = document.getElementById('silson-total-amount');
        if(te) te.textContent = `${fmt(out.result + t3.total)}원`;
      } else {
        const out   = calcOutpatient(g, grade, limitIdx);
        const presc = calcPrescription(g, limitIdx);
        const t3    = calcType3(g, false);
        const oe = document.getElementById('silson-outpatient-result');
        if(oe) oe.innerHTML=`<table><tr><td>병원비 합계</td><td>${fmt(out.total)}원</td></tr><tr><td>공제액</td><td>${fmt(out.deduct)}원</td></tr><tr><td>예상보험금</td><td>${fmt(out.result)}원</td></tr></table>`;
        const pe = document.getElementById('silson-prescription-result');
        if(pe&&presc) pe.innerHTML=`<table><tr><td>약제비</td><td>${fmt(presc.total)}원</td></tr><tr><td>공제액</td><td>${fmt(presc.deduct)}원</td></tr><tr><td>예상보험금</td><td>${fmt(presc.result)}원</td></tr></table>`;
        if(t3) {
          sv('silson-injection-deduct', t3.injDeduct);
          sv('silson-manual-deduct',    t3.manDeduct);
          sv('silson-mri-deduct',       t3.mriDeduct);
          const t3e = document.getElementById('silson-type3-result');
          if(t3e) t3e.innerHTML=`<table><tr><td>비급여주사제</td><td>${fmt(t3.injResult)}원</td></tr><tr><td>도수/체외충격파</td><td>${fmt(t3.manResult)}원</td></tr><tr><td>MRI/MRA</td><td>${fmt(t3.mriResult)}원</td></tr><tr><td>3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
        }
        const te = document.getElementById('silson-total-amount');
        if(te) te.textContent=`${fmt(out.result+(presc?.result||0)+(t3?.total||0))}원`;
      }
    } else {
      // 입원
      if (g.is5gen) {
        const inp = calc5GenInpatient(grade);
        const t3  = calc5GenType3('inp');
        const e1 = document.getElementById('silson-g5-inp-gubun-result');
        if(e1) e1.innerHTML=`<table><tr><td>급여+중증비급여</td><td>${fmt(gv('silson-g5-inp-gubun')+gv('silson-g5-inp-severe'))}원</td></tr><tr><td>공제액</td><td>${fmt(inp.gDeduct)}원</td></tr><tr><td>예상보험금</td><td>${fmt(inp.gubunPay)}원</td></tr></table>`;
        const e2 = document.getElementById('silson-g5-inp-nongubun-result');
        if(e2) e2.innerHTML=`<table><tr><td>비중증 비급여</td><td>${fmt(gv('silson-g5-inp-mild'))}원</td></tr><tr><td>공제액 (50%)</td><td>${fmt(inp.mDeduct)}원</td></tr><tr><td>예상보험금</td><td>${fmt(inp.mildPay)}원</td></tr></table>`;
        if (t3.mode==='severe') {
          sv('silson-g5-inp-manual-deduct',    t3.manDeduct);
          sv('silson-g5-inp-injection-deduct', t3.injDeduct);
          sv('silson-g5-inp-mri-deduct',       t3.mriDeduct);
        } else {
          sv('silson-g5-inp-mri-mild-deduct',  t3.mriMildDeduct);
        }
        const e3 = document.getElementById('silson-g5-type3-inp-result');
        if(e3) {
          if(t3.mode==='severe') e3.innerHTML=`<table><tr><td>도수치료</td><td>${fmt(t3.manResult)}원</td></tr><tr><td>비급여주사제</td><td>${fmt(t3.injResult)}원</td></tr><tr><td>MRI/MRA</td><td>${fmt(t3.mriResult)}원</td></tr><tr><td>3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
          else e3.innerHTML=`<table><tr><td>MRI/MRA (비중증)</td><td>${fmt(t3.mriMildResult)}원</td></tr><tr><td>3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
        }
        const te = document.getElementById('silson-total-amount');
        if(te) te.textContent=`${fmt(inp.result + t3.total)}원`;
      } else {
        const inp = calcInpatient(g);
        const t3  = calcType3(g, true);
        const ie = document.getElementById('silson-inpatient-result');
        if(ie) {
          const roomRow = (document.getElementById('silson-room')?.value==='premium') ? `<tr><td>상급병실료 지급</td><td>${fmt(inp.roomPay)}원</td></tr>` : '';
          ie.innerHTML=`<table><tr><td>급여 지급 (${g.coverGubun||0}%)</td><td>${fmt(inp.gubunPay)}원</td></tr><tr><td>비급여 지급 (${g.coverNonGubun||0}%)</td><td>${fmt(inp.nonGubunPay)}원</td></tr>${roomRow}<tr><td>예상보험금</td><td>${fmt(inp.result)}원</td></tr></table>`;
        }
        if(t3) {
          sv('silson-inp-injection-deduct', t3.injDeduct);
          sv('silson-inp-manual-deduct',    t3.manDeduct);
          sv('silson-inp-mri-deduct',       t3.mriDeduct);
          const t3e = document.getElementById('silson-inp-type3-result');
          if(t3e) t3e.innerHTML=`<table><tr><td>비급여주사제</td><td>${fmt(t3.injResult)}원</td></tr><tr><td>도수/체외충격파</td><td>${fmt(t3.manResult)}원</td></tr><tr><td>MRI/MRA</td><td>${fmt(t3.mriResult)}원</td></tr><tr><td>3종 합계</td><td>${fmt(t3.total)}원</td></tr></table>`;
        }
        const te = document.getElementById('silson-total-amount');
        if(te) te.textContent=`${fmt(inp.result+(t3?.total||0))}원`;
      }
    }
  };

  // ── 초기화 ──
  window.initSilsonPage = function() {
    window.silsonState = { genId:'4gen', type:'outpatient', grade:'clinic', limitIdx:0, g5Type3OutMode:'severe', g5Type3InpMode:'severe' };
    window._sg_renderGenGrid();
    window._sg_updateUI();
    window.renderSilsonResult();
    const rs = document.getElementById('silson-room');
    if(rs) rs.addEventListener('change', function(){
      document.getElementById('silson-room-extra').style.display = this.value==='premium' ? '' : 'none';
      window.renderSilsonResult();
    });
  };

})();


// =====================================================
// 실손 사전
// =====================================================
(function() {
  const DICT_DATA = {
    '1세대': {
      info: [
        ['구분','표준화 이전 (구실손)'],['보험기간','80세, 100세'],['갱신주기','5년, 3년'],
        ['본인부담한도','없음'],['상급병실','병실료 차액 50%'],
        ['가입금액','입원 최대 1억 / 통원 10만~50만 (상품별 상이)']
      ],
      selfpay: [
        ['입원','자기부담금 0%'],['통원','상품별 5천원 또는 1만원 공제'],
        ['약제비','통원 한도 내 포함 또는 상품별 상이'],['비급여3종','해당 없음']
      ],
      waiting: [
        ['상해입원','365일 보장'],['질병입원','365일 보장 후 180일 면책 가능'],
        ['통원','30회 보장 후 180일 면책 가능']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['건강검진','일부 가능','이상소견 추가검사 가능'],
        ['예방접종','제외','예방 목적 제외'],['임신·출산','제외','관련 질환 제외'],
        ['한방','제한','급여 일부 가능'],['치과','제한','급여 치료 일부 가능'],
        ['정신질환','제한','대부분 제한'],['안과','제한','비급여 시력교정 제외'],
        ['해외치료','일부 가능','구실손 일부 상품 가능']
      ]
    },
    '2세대 1차': {
      info: [
        ['구분','표준화 Ⅰ'],['보험기간','100세'],['갱신주기','3년'],
        ['본인부담한도','입원 자기부담금 연 200만원'],['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','입원 최대 5천만원 / 통원 최대 30만원']
      ],
      selfpay: [
        ['입원','급여·비급여 90% 보장 (자기부담 10%)'],
        ['통원','의원 1만 / 병원 1.5만 / 종합병원 2만원 공제'],
        ['약제비','8천원 공제'],['비급여3종','해당 없음']
      ],
      waiting: [
        ['입원','최초 입원일부터 365일 보장 후 90일 면책'],
        ['통원','1년 내 180회 보장']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['건강검진','일부 가능','이상소견 추가검사 가능'],
        ['예방접종','제외','예방 목적 제외'],['임신·출산','제외','관련 질환 제외'],
        ['한방','제한','급여 일부 가능'],['치과','제한','급여 치료 일부 가능'],
        ['정신질환','제한','대부분 제한'],['안과','제한','비급여 시력교정 제외'],
        ['해외치료','제외','국내 치료 중심']
      ]
    },
    '2세대 2차': {
      info: [
        ['구분','표준화 Ⅱ'],['보험기간','15년 재가입'],['갱신주기','1년'],
        ['본인부담한도','입원 자기부담금 연 200만원'],['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','입원 최대 5천만원 / 통원 최대 30만원']
      ],
      selfpay: [
        ['입원','표준형 20% / 선택형 10% 자기부담'],
        ['통원','의원 1만, 병원 1.5만, 종합병원 2만원 또는 20% 중 큰 금액'],
        ['약제비','8천원 또는 20% 중 큰 금액'],['비급여3종','해당 없음']
      ],
      waiting: [
        ['입원','최초 입원일부터 365일 보장 후 90일 면책'],
        ['통원','1년 내 180회 보장'],
        ['동일 질병·상해','퇴원 후 180일 이내 재입원 시 같은 사고로 볼 수 있음']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['예방접종','제외','예방 목적 제외'],
        ['임신·출산','제외','관련 질환 제외'],['한방','제한','급여 일부 가능'],
        ['치과','제한','급여 치료 일부 가능'],['정신질환','제한','대부분 제한'],
        ['안과','제한','비급여 시력교정 제외'],['해외치료','제외','국내 치료 중심']
      ]
    },
    '2세대 3차': {
      info: [
        ['구분','표준화 Ⅲ'],['보험기간','15년 재가입'],['갱신주기','1년'],
        ['본인부담한도','입원 자기부담금 연 200만원'],['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','입원 최대 5천만원 / 통원 최대 30만원']
      ],
      selfpay: [
        ['입원','급여 10% / 비급여 20% 자기부담'],
        ['통원','1만·1.5만·2만원 또는 급여 10%+비급여 20% 중 큰 금액'],
        ['약제비','8천원 또는 급여 10%+비급여 20% 중 큰 금액'],['비급여3종','해당 없음']
      ],
      waiting: [
        ['입원','275일 초과 시 90일 면책 / 이하 시 잔여일 면책'],
        ['통원','1년 내 180회 보장']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['임신·출산','제외','관련 질환 제외'],
        ['한방','제한','급여 일부 가능'],['치과','일부 가능','K09~K14 급여 일부 가능'],
        ['정신질환','일부 가능','2016년 이후 급여 일부 가능'],
        ['안과','제한','비급여 시력교정 제외'],['해외치료','제외','국내 치료 중심']
      ]
    },
    '3세대': {
      info: [
        ['구분','착한실손'],['보험기간','15년 재가입'],['갱신주기','1년'],
        ['본인부담한도','입원 자기부담금 연 200만원'],['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','입원 5천만 / 통원 최대 30만 / 도수 350만 / 주사 250만 / MRI 300만']
      ],
      selfpay: [
        ['입원','급여 10% / 비급여 20% 자기부담'],
        ['통원','1만·1.5만·2만원 또는 급여 10%+비급여 20% 중 큰 금액'],
        ['약제비','8천원 또는 급여 10%+비급여 20% 중 큰 금액'],
        ['비급여3종','2만원 또는 30% 중 큰 금액']
      ],
      waiting: [
        ['입원','한도 소진 시 다음 계약해당일부터 보장'],
        ['통원','1년 내 180회 보장'],
        ['비급여3종','도수 50회 / 비급여주사 50회 / MRI 연 300만원']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['비만','제외','치료 목적 제외'],
        ['임신·출산','제외','관련 질환 제외'],['한방','제한','급여 일부 가능'],
        ['치과','일부 가능','급여 치료 일부 가능'],['정신질환','일부 가능','급여 일부 보장'],
        ['안과','제한','비급여 시력교정 제외'],['도수치료','제한','치료 효과 입증 필요'],
        ['영양주사','제한','치료 목적 확인 필요'],['해외치료','제외','국내 치료 중심']
      ]
    },
    '4세대': {
      info: [
        ['구분','보험료 차등제'],['보험기간','5년 재가입'],['갱신주기','1년'],
        ['본인부담한도','급여 입원 자기부담금 연 200만원'],['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','급여 5천만 / 비급여 5천만 / 통원 회당 20만 / 도수 350만 / 주사 250만 / MRI 300만']
      ],
      selfpay: [
        ['입원 급여','20% 자기부담'],['입원 비급여','30% 자기부담'],
        ['통원 급여','병·의원 1만 / 상급·종합 2만 또는 20% 중 큰 금액'],
        ['통원 비급여','3만원 또는 30% 중 큰 금액'],
        ['약제비','통원 급여에 포함'],['비급여3종','3만원 또는 30% 중 큰 금액']
      ],
      waiting: [
        ['입원','한도 소진 시 다음 계약해당일부터 보장'],
        ['통원','회당 20만원 / 비급여 통원 연 100회'],
        ['비급여3종','한도 또는 횟수 소진 시 다음 계약해당일까지']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['비만','제외','치료 목적 제외'],
        ['임신·출산','제외','관련 질환 제외'],['한방','제한','급여 일부 가능'],
        ['치과','일부 가능','급여 치료 일부 가능'],['정신질환','일부 가능','급여 일부 보장'],
        ['안과','제한','비급여 시력교정 제외'],['비급여 백내장','제한','심사 강화'],
        ['영양주사','제한','치료 목적 확인 필요'],['해외치료','제외','국내 치료 중심']
      ]
    },
    '5세대': {
      info: [
        ['구분','중증·비중증 비급여 분리'],['적용기간','2026.05~'],
        ['보험기간','5년 재가입'],['갱신주기','1년'],
        ['본인부담한도','급여 200만 / 중증 비급여 상급·종합 연 500만'],
        ['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','급여 5천만 / 중증비급여 5천만 / 비중증비급여 1천만 / 중증 3종: 도수 350만·주사 250만·MRI 300만 / 비중증 MRI 200만']
      ],
      selfpay: [
        ['입원 급여','20% 자기부담'],['입원 중증 비급여','30% 자기부담'],
        ['입원 비중증 비급여','50% 자기부담'],
        ['통원 급여','병·의원 1만 / 상급·종합 2만 또는 20% 중 큰 금액'],
        ['통원 중증 비급여','3만원 또는 30% 중 큰 금액'],
        ['통원 비중증 비급여','5만원 또는 50% 중 큰 금액'],
        ['3종 중증 (도수·주사·MRI)','3만원 또는 30% 중 큰 금액'],
        ['3종 비중증 (MRI만)','5만원 또는 50% 중 큰 금액']
      ],
      waiting: [
        ['입원','한도 소진 시 다음 계약해당일부터 보장'],
        ['통원','통원 일당 20만원'],
        ['비급여3종','각 항목 한도 소진 시 다음 계약해당일까지']
      ],
      exclude: [
        ['미용·성형','제외','치료 목적 제외'],['비만','제외','치료 목적 제외'],
        ['한방','제한','급여 일부 가능'],['치과','일부 가능','급여 치료 일부 가능'],
        ['정신질환','일부 가능','급여 일부 보장'],
        ['안과','제한','비급여 시력교정 제외'],['해외치료','제외','국내 치료 중심'],
        ['근골격계 비중증','제한','비중증 비급여 50% 본인부담'],
        ['비급여 도수·주사','제한','중증·비중증 구분 적용'],
        ['비급여 백내장','제한','심사 강화']
      ]
    },
    '유병자': {
      info: [
        ['구분','간편심사 실손'],['보험기간','3년 재가입'],['갱신주기','1년'],
        ['상급병실','병실료 차액 50% (1일 10만원 한도)'],
        ['가입금액','입원 5천만원 / 통원 회당 20만원']
      ],
      selfpay: [
        ['입원','10만원 또는 30% 중 큰 금액'],
        ['통원','2만원 또는 30% 중 큰 금액'],
        ['약제비','보장 제외'],['비급여3종','보장 제외']
      ],
      waiting: [
        ['입원','365일 보장 후 90일 면책'],
        ['통원','연 180회 보장']
      ],
      exclude: [
        ['처방조제','제외','약제비 보장 제외'],['도수치료','제외','비급여 3종 제외'],
        ['비급여주사','제외','비급여 3종 제외'],['MRI/MRA','제외','비급여 3종 제외'],
        ['한방','제한','급여 일부 가능'],['치과','제한','급여 치료 일부 가능'],
        ['정신질환','제한','대부분 제한'],['안과','제한','비급여 시력교정 제외'],
        ['미용·성형','제외','치료 목적 제외'],['비만','제외','치료 목적 제외']
      ]
    }
  };

  let _dictGen = '1세대', _dictTab = 'info';

  window.openSilsonDict = function() {
    document.getElementById('silson-dict-modal').style.display = 'flex';
    window.switchDictGen('1세대');
  };
  window.closeSilsonDict = function() {
    document.getElementById('silson-dict-modal').style.display = 'none';
  };

  window.switchDictGen = function(gen) {
    _dictGen = gen;
    document.querySelectorAll('.dict-gen-btn').forEach(b => b.classList.toggle('active', b.textContent.trim()===gen));
    const lbl = document.getElementById('silson-dict-gen-label');
    const periods = { '1세대':'~2009.09', '2세대 1차':'2009.10~2012.12', '2세대 2차':'2013.01~2015.08', '2세대 3차':'2015.09~2017.03', '3세대':'2017.04~2021.06', '4세대':'2021.07~2026.04', '5세대':'2026.05~', '유병자':'유병자 실손' };
    if(lbl) lbl.textContent = periods[gen] || '';
    window.switchDictTab(_dictTab);
  };

  window.switchDictTab = function(tab) {
    _dictTab = tab;
    ['info','selfpay','waiting','exclude'].forEach(t => {
      document.getElementById(`dict-tab-${t}`)?.classList.toggle('active', t===tab);
    });
    const body = document.getElementById('silson-dict-body');
    if (!body) return;
    const data = DICT_DATA[_dictGen];
    if (!data) { body.innerHTML='<p style="color:#8B95A1; text-align:center; padding:30px;">데이터 준비중입니다.</p>'; return; }

    if (tab==='info' || tab==='selfpay' || tab==='waiting') {
      const key = tab==='info' ? 'info' : tab==='selfpay' ? 'selfpay' : 'waiting';
      body.innerHTML = (data[key]||[]).map(([k,v]) => `
        <div class="dict-item">
          <div class="dict-item-key">${k}</div>
          <div class="dict-item-val">${v}</div>
        </div>`).join('');
    } else {
      body.innerHTML = `
        <div style="overflow:hidden; border-radius:14px; border:1px solid #F2F4F6;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead><tr style="background:#F9FAFB;">
              <th style="padding:12px 14px; text-align:left; font-weight:800; color:#4E5968;">항목</th>
              <th style="padding:12px 8px; text-align:center; font-weight:800; color:#4E5968;">구분</th>
              <th style="padding:12px 14px; text-align:left; font-weight:800; color:#4E5968;">비고</th>
            </tr></thead>
            <tbody>${(data.exclude||[]).map(([item,status,note]) => {
              const cls = status.includes('제외') ? 'badge-exclude' : status.includes('가능') ? 'badge-possible' : 'badge-limit';
              return `<tr style="border-top:1px solid #F2F4F6;">
                <td style="padding:11px 14px; color:#191F28; font-weight:700;">${item}</td>
                <td style="padding:11px 8px; text-align:center;"><span class="dict-exclude-badge ${cls}">${status}</span></td>
                <td style="padding:11px 14px; color:#8B95A1;">${note||''}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
    }
  };

  // 모달 외부 클릭 시 닫기
  document.addEventListener('click', function(e) {
    const modal = document.getElementById('silson-dict-modal');
    if (modal && e.target === modal) window.closeSilsonDict();
  });
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