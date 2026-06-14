// ==========================================
// [claim-dashboard.js]
// '청구의 모든 것' 대시보드 Firebase 연동 모듈
//
// [app.js에 추가 필요한 작업 2가지]
// 1) import './claim-dashboard.js'; 를 import 목록에 추가
// 2) Firestore 인스턴스를 전역에 노출:
//      window.__firestoreDb = db;  ← const db = getFirestore(app); 직후에 추가
//
// [Firestore 컬렉션 구조]
//   claims/{userEmail}/records/{docId}
//   각 doc은 claim.js의 ClaimRecord 구조를 따름
//
// [loadComponent 훅 추가]
//   app.js의 loadComponent 함수에 아래 블록 추가:
//
//   if (pageId === 'page-claim-main') {
//       requestAnimationFrame(async () => {
//           const el = document.getElementById('claim-user-name');
//           if (el) el.innerText = window.currentUserDisplayName || '안녕하세요';
//           await window.loadClaimDashboard();  // ← 이 줄 추가
//       });
//   }
//
//   if (pageId === 'page-claim-form') {
//       // 임시저장 목록에서 진입 시 복원 처리
//       // (window.currentDraftId가 세팅된 상태로 navigateTo 호출)
//   }
// ==========================================

// ─── Firestore 헬퍼 (app.js와 동일한 인스턴스 재사용) ───
async function getClaimsCol(userEmail) {
    const { collection } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const db = window.__firestoreDb;
    if (!db) throw new Error('Firestore 미초기화. app.js에서 window.__firestoreDb = db; 를 추가하세요.');
    return collection(db, 'claims', userEmail, 'records');
}

// ─── 날짜 포매터 ───
function fmtClaimDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d)) return isoStr;
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// ─── 상태 배지 HTML ───
function statusBadge(status) {
    if (status === 'sent') {
        return '<span style="background:#F0FDF4; color:#16A34A; font-size:11px; font-weight:800; padding:3px 10px; border-radius:20px;">발송완료</span>';
    }
    return '<span style="background:#FFF7ED; color:#EA580C; font-size:11px; font-weight:800; padding:3px 10px; border-radius:20px;">임시저장</span>';
}

// ==========================================
// [대시보드 메인 로더]
// page-claim-main 화면 진입 시 호출
// ==========================================
window.loadClaimDashboard = async function() {
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const user = getAuth().currentUser;
    if (!user) return;

    try {
        const { getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const col = await getClaimsCol(user.email);
        const snap = await getDocs(query(col, orderBy('updatedAt', 'desc')));
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        _updateClaimCounters(records);
        _renderRecentClaims(records);

        // 전역에 캐시 (필터링용)
        window.__claimRecords = records;
    } catch (e) {
        console.error('대시보드 로드 실패:', e);
    }
};

// ─── 카운터 업데이트 ───
function _updateClaimCounters(records) {
    const total  = records.length;
    const drafts = records.filter(r => r.status === 'draft').length;
    const sent   = records.filter(r => r.status === 'sent').length;

    _setText('claim-count-total-all',  total);
    _setText('claim-count-total',      total);
    _setText('claim-count-draft',      drafts);
    _setText('claim-count-sent',       sent);
}

function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val + '건';
}

// ─── 최근 청구 리스트 렌더링 ───
function _renderRecentClaims(records) {
    const container = document.getElementById('claim-recent-list');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:32px 0; color:#B0B8C1; font-size:14px; font-weight:500;">
                <i class="bi bi-inbox" style="font-size:28px; display:block; margin-bottom:8px;"></i>
                최근 청구 내역이 없습니다.
            </div>`;
        return;
    }

    // 최신순 최대 5개
    const recent = records.slice(0, 5);
    container.innerHTML = recent.map(r => `
        <div onclick="window.openClaimRecord('${r.id}', '${r.status}')"
             style="display:flex; align-items:center; justify-content:space-between;
                    padding:14px 0; border-bottom:1px solid #F2F4F6; cursor:pointer;
                    transition: background 0.15s;"
             onmouseover="this.style.background='#F8FAFC'"
             onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; border-radius:50%; background:#EFF6FF;
                            display:flex; align-items:center; justify-content:center;
                            font-size:18px; color:#3182F6; flex-shrink:0;">
                    <i class="bi bi-file-earmark-medical"></i>
                </div>
                <div>
                    <div style="font-size:15px; font-weight:700; color:#191F28; margin-bottom:3px;">
                        ${r.company || '보험사 미정'}
                        ${r.insuredName ? `<span style="font-weight:500; color:#8B95A1; font-size:13px;">· ${r.insuredName}</span>` : ''}
                    </div>
                    <div style="font-size:12px; color:#B0B8C1;">
                        ${r.treatDate ? '진료일 ' + fmtClaimDate(r.treatDate) + ' · ' : ''}
                        ${fmtClaimDate(r.updatedAt)}
                    </div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                ${statusBadge(r.status)}
                <i class="bi bi-chevron-right" style="color:#CBD5E1;"></i>
            </div>
        </div>
    `).join('');
}

// ─── 청구 레코드 클릭 처리 ───
window.openClaimRecord = function(recordId, status) {
    if (status === 'draft') {
        // 임시저장 → 폼으로 이동하여 복원
        window.currentDraftId = recordId;
        // company는 레코드에서 복원하므로 선택 화면 없이 바로 폼으로
        window.navigateTo('page-claim-form');
    } else {
        // 발송완료 → 상세 모달 또는 별도 페이지 (추후 구현)
        window.openClaimDetailModal(recordId);
    }
};

// ==========================================
// [청구 목록 필터 뷰]
// 각 카운터 클릭 시 호출
// ==========================================
window.showClaimList = async function(filterStatus) {
    // filterStatus: 'all' | 'draft' | 'sent'
    const records = window.__claimRecords || [];
    const filtered = filterStatus === 'all'
        ? records
        : records.filter(r => r.status === filterStatus);

    const modal = document.getElementById('claim-list-modal');
    const body  = document.getElementById('claim-list-modal-body');
    const title = document.getElementById('claim-list-modal-title');

    if (!modal || !body) {
        // 모달이 없으면 인라인으로 렌더링
        _renderFilteredList(filterStatus, filtered);
        return;
    }

    const titleMap = { all: '전체 청구', draft: '임시저장 목록', sent: '발송 완료 목록' };
    if (title) title.innerText = titleMap[filterStatus] || '청구 목록';

    if (filtered.length === 0) {
        body.innerHTML = `
            <div style="text-align:center; padding:48px 0; color:#B0B8C1; font-size:14px;">
                <i class="bi bi-inbox" style="font-size:32px; display:block; margin-bottom:12px;"></i>
                내역이 없습니다.
            </div>`;
    } else {
        body.innerHTML = filtered.map(r => `
            <div onclick="window.openClaimRecord('${r.id}', '${r.status}'); window.closeClaimListModal();"
                 style="display:flex; align-items:center; justify-content:space-between;
                        padding:16px; margin-bottom:8px; background:#F8FAFC;
                        border-radius:12px; cursor:pointer; border:1px solid #F2F4F6;">
                <div>
                    <div style="font-size:15px; font-weight:700; color:#191F28; margin-bottom:4px;">
                        ${r.company || '보험사 미정'}
                        ${r.insuredName ? `<span style="font-weight:500; color:#8B95A1; font-size:13px;">· ${r.insuredName}</span>` : ''}
                    </div>
                    <div style="font-size:12px; color:#B0B8C1;">
                        ${r.treatDate ? '진료일 ' + fmtClaimDate(r.treatDate) + ' · ' : ''}저장 ${fmtClaimDate(r.updatedAt)}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${statusBadge(r.status)}
                    ${r.status === 'draft'
                        ? `<button onclick="event.stopPropagation(); window.deleteDraftRecord('${r.id}');"
                               style="background:none; border:none; color:#EF4444; font-size:18px; cursor:pointer; padding:4px;">
                               <i class="bi bi-trash3"></i>
                           </button>`
                        : ''}
                </div>
            </div>
        `).join('');
    }

    modal.style.display = 'flex';
};

window.closeClaimListModal = function() {
    const modal = document.getElementById('claim-list-modal');
    if (modal) modal.style.display = 'none';
};

// ─── 임시저장 삭제 ───
window.deleteDraftRecord = async function(recordId) {
    if (!confirm('이 임시저장을 삭제하시겠습니까?')) return;
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const user = getAuth().currentUser;
        if (!user) return;
        const db = window.__firestoreDb;
        await deleteDoc(doc(db, 'claims', user.email, 'records', recordId));

        // 캐시 업데이트
        window.__claimRecords = (window.__claimRecords || []).filter(r => r.id !== recordId);
        _updateClaimCounters(window.__claimRecords);

        // 모달 내 목록 갱신
        await window.showClaimList('draft');
        // 대시보드 최근 목록도 갱신
        _renderRecentClaims(window.__claimRecords);
    } catch (e) {
        alert('삭제 실패: ' + e.message);
    }
};

// ─── 발송완료 상세 모달 (기본 구현 - 추후 팩스 발송 시 확장) ───
window.openClaimDetailModal = function(recordId) {
    const r = (window.__claimRecords || []).find(x => x.id === recordId);
    if (!r) return;
    alert(`[발송완료] ${r.company} · ${r.insuredName}\n진료일: ${r.treatDate || '-'}\n발송일: ${fmtClaimDate(r.faxSentAt) || '-'}`);
};

// ─── 인라인 필터 렌더링 (모달 없는 경우 fallback) ───
function _renderFilteredList(filterStatus, filtered) {
    const container = document.getElementById('claim-recent-list');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:32px 0;color:#B0B8C1;font-size:14px;">내역이 없습니다.</div>`;
        return;
    }
    _renderRecentClaims(filtered);
}

// ==========================================
// [HTML 스니펫 참고 - page-claim-main.html에 아래 요소들이 있어야 합니다]
//
// <!-- 카운터 클릭 가능 영역 -->
// <div onclick="window.showClaimList('all')">
//   전체보기: <span id="claim-count-total-all">0건</span>
// </div>
// <div>전체 청구: <span id="claim-count-total">0건</span></div>
// <div onclick="window.showClaimList('draft')">
//   임시 저장: <span id="claim-count-draft">0건</span>
// </div>
// <div onclick="window.showClaimList('sent')">
//   발송 완료: <span id="claim-count-sent">0건</span>
// </div>
//
// <!-- 최근 청구 리스트 -->
// <div id="claim-recent-list"></div>
//
// <!-- 목록 모달 (선택적, 없으면 인라인 렌더링으로 fallback) -->
// <div id="claim-list-modal" style="display:none; position:fixed; inset:0;
//      background:rgba(0,0,0,0.5); z-index:1000; align-items:flex-end; justify-content:center;">
//   <div style="background:white; border-radius:20px 20px 0 0; width:100%; max-width:480px;
//               max-height:80vh; overflow-y:auto; padding:24px 20px 40px;">
//     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
//       <h3 id="claim-list-modal-title" style="font-size:18px;font-weight:800;margin:0;">목록</h3>
//       <button onclick="window.closeClaimListModal()"
//               style="background:none;border:none;font-size:22px;cursor:pointer;color:#8B95A1;">✕</button>
//     </div>
//     <div id="claim-list-modal-body"></div>
//   </div>
// </div>
//
// <!-- 임시저장 버튼 (page-claim-form.html에 추가) -->
// <button id="btn-save-draft" onclick="window.saveDraft()"
//         style="width:100%; margin-bottom:10px; padding:14px; background:white;
//                color:#3182F6; border:2px solid #3182F6; border-radius:12px;
//                font-size:15px; font-weight:800; cursor:pointer;">
//   <i class="bi bi-bookmark-fill"></i> 임시저장
// </button>
// ==========================================