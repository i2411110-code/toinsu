(function () {
    const MENU_REGISTRY = [
        // ── 청구 ──
        { id:'claim-main',   group:'청구', label:'청구의 모든것', icon:'bi-send-fill',       bg:'#FFF0F0', color:'#E11D48', type:'page', target:'page-claim-main' },
        { id:'claim-select', group:'청구', label:'청구하기',      icon:'bi-send-fill',       bg:'#EEF2FF', color:'#4F46E5', type:'page', target:'page-claim-select' },

        // ── 업무 ──
        { id:'hospital',     group:'업무', label:'병원근무',      icon:'bi-hospital-fill',   bg:'#ECFDF5', color:'#059669', type:'url',  target:'https://hospitol-ten.vercel.app/' },
        { id:'folder',       group:'업무', label:'자료폴더',      icon:'bi-folder-fill',     bg:'#FEF3C7', color:'#D97706', type:'url',  target:'https://naver.me/xNpxyjvi' },
        { id:'recruit',      group:'업무', label:'이직 컨설팅',   icon:'bi-briefcase-fill',  bg:'#F0FDF4', color:'#16A34A', type:'page', target:'page-recruit' },
        { id:'private',      group:'업무', label:'고객 데이터',   icon:'bi-people-fill',     bg:'#EFF6FF', color:'#2563EB', type:'page', target:'page-private' },
        { id:'gaon-office',  group:'업무', label:'가온 오피스',   icon:'bi-lock-fill',       bg:'#F5F3FF', color:'#7C3AED', type:'page', target:'page-가온 오피스' },
        { id:'calendar',     group:'업무', label:'캘린더',        icon:'bi-calendar3',       bg:'#FFF7ED', color:'#EA580C', type:'page', target:'page-calendar' },

        // ── 계산·조회 ──
        { id:'terms',        group:'계산·조회', label:'약관조회',    icon:'bi-search-heart',    bg:'#EFF6FF', color:'#2563EB', type:'page', target:'page-terms' },
        { id:'precedent',    group:'계산·조회', label:'보험판례',    icon:'bi-bank2',           bg:'#F0FDF4', color:'#16A34A', type:'page', target:'page-precedent' },
        { id:'silbi',        group:'계산·조회', label:'실비계산기',  icon:'bi-calculator-fill', bg:'#EFF6FF', color:'#2563EB', type:'page', target:'page-silbi' },
        { id:'calculator',   group:'계산·조회', label:'재무 계산기', icon:'bi-calculator-fill', bg:'#E0F2FE', color:'#0284C7', type:'page', target:'page-calculator' },
    ];

    // 사용자 구분 키 (호출 시점에 계산)
    const userKey = () => {
        let id = 'guest';
        try {
            id = window._currentUser?.uid || window._currentUser?.email
              || window.currentUser?.uid || window.currentUser?.email
              || window.auth?.currentUser?.uid
              || window.currentUserId || 'guest';
        } catch (e) {}
        return 'workmenu:' + id;
    };

    const load = () => {
        try { return JSON.parse(localStorage.getItem(userKey())) || { hidden:[], order:[] }; }
        catch (e) { return { hidden:[], order:[] }; }
    };
    const save = (s) => {
        try { localStorage.setItem(userKey(), JSON.stringify(s)); } catch (e) {}
    };

    const ordered = () => {
        const { order } = load();
        const byId = Object.fromEntries(MENU_REGISTRY.map(m => [m.id, m]));
        const head = order.filter(id => byId[id]).map(id => byId[id]);
        const tail = MENU_REGISTRY.filter(m => !order.includes(m.id));
        return [...head, ...tail];
    };

    const go = (id) => {
        const m = MENU_REGISTRY.find(x => x.id === id);
        if (!m) return;
        if (m.type === 'url') window.open(m.target, '_blank', 'noopener');
        else window.navigateTo(m.target, m.arg);
    };

    // ── 스타일 + 편집 모달을 body에 직접 생성 ──
    const ensureUI = () => {
        if (!document.getElementById('wm-style')) {
            const st = document.createElement('style');
            st.id = 'wm-style';
            st.textContent = `
.wm-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
.wm-empty { grid-column:1/-1; text-align:center; color:#8B95A1; font-size:13px; padding:24px 0; }
.wm-edit-btn { border:1px solid #E5E8EB; background:#F9FAFB; color:#4E5968; border-radius:10px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s; }
.wm-edit-btn:hover { background:#EFF6FF; color:#3182F6; border-color:#BFDBFE; }
.wm-modal { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; display:none; align-items:center; justify-content:center; padding:20px; }
.wm-modal.open { display:flex; }
.wm-modal-box { background:white; border-radius:20px; padding:22px; width:100%; max-width:460px; max-height:85vh; display:flex; flex-direction:column; }
.wm-close { border:none; background:none; font-size:18px; color:#8B95A1; cursor:pointer; }
.wm-editor-list { overflow-y:auto; flex:1; }
.wm-group-label { font-size:11px; font-weight:800; color:#8B95A1; margin:14px 0 6px; }
.wm-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid #F2F4F6; border-radius:12px; margin-bottom:6px; }
.wm-row input[type=checkbox] { width:18px; height:18px; accent-color:#3182F6; cursor:pointer; }
.wm-row .wm-ico { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:14px; }
.wm-row .wm-name { flex:1; font-size:13px; font-weight:700; color:#191F28; }
.wm-row .wm-arrow { border:none; background:#F2F4F6; border-radius:8px; width:28px; height:28px; cursor:pointer; color:#4E5968; }
.wm-row .wm-arrow:hover { background:#E5E8EB; }
.wm-btn-main, .wm-btn-sub { flex:1; border:none; border-radius:12px; padding:12px; font-size:14px; font-weight:800; cursor:pointer; }
.wm-btn-main { background:#3182F6; color:white; }
.wm-btn-sub { background:#F2F4F6; color:#4E5968; }`;
            document.head.appendChild(st);
        }

        // 대시보드 HTML 안에 남아 있는 옛 모달은 제거
        document.querySelectorAll('#wm-modal').forEach(el => {
            if (el.parentElement !== document.body) el.remove();
        });

        if (!document.getElementById('wm-modal')) {
            const m = document.createElement('div');
            m.id = 'wm-modal';
            m.className = 'wm-modal';
            m.innerHTML = `
<div class="wm-modal-box">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div style="font-size:18px; font-weight:800; color:#191F28;">업무 메뉴 편집</div>
        <button class="wm-close" onclick="WorkMenu.closeEditor()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div style="font-size:12px; color:#8B95A1; margin-bottom:14px;">체크한 메뉴만 표시되고, 화살표로 순서를 바꿀 수 있어요.</div>
    <div id="wm-editor-list" class="wm-editor-list"></div>
    <div style="display:flex; gap:8px; margin-top:16px;">
        <button class="wm-btn-sub" onclick="WorkMenu.reset()">전체 메뉴로 초기화</button>
        <button class="wm-btn-main" onclick="WorkMenu.closeEditor()">완료</button>
    </div>
</div>`;
            m.addEventListener('click', (e) => { if (e.target === m) closeEditor(); });
            document.body.appendChild(m);
        }
    };

    const render = () => {
        ensureUI();
        const { hidden } = load();
        const items = ordered().filter(m => !hidden.includes(m.id));
        const empty = '<div class="wm-empty">표시할 메뉴가 없어요. [메뉴 편집]에서 추가해 보세요.</div>';

        const pc = document.getElementById('work-menu-grid');
        if (pc) {
            pc.innerHTML = items.length ? items.map(m => `
                <div class="toss-menu-item" onclick="WorkMenu.go('${m.id}')">
                    <div class="toss-menu-icon" style="background:${m.bg}; color:${m.color};"><i class="bi ${m.icon}"></i></div>
                    <span>${m.label}</span>
                </div>`).join('') : empty;
        }

        const mo = document.getElementById('mobile-menu-grid');
        if (mo) {
            mo.innerHTML = items.length ? items.map(m => `
                <div class="mobile-quick-item" onclick="WorkMenu.go('${m.id}')">
                    <div class="mobile-quick-icon" style="background:${m.bg}; color:${m.color};"><i class="bi ${m.icon}"></i></div>
                    <span>${m.label}</span>
                </div>`).join('') : empty;
        }
    };

    const renderEditor = () => {
        const { hidden } = load();
        const items = ordered();
        let lastGroup = '';
        document.getElementById('wm-editor-list').innerHTML = items.map(m => {
            const head = m.group !== lastGroup ? `<div class="wm-group-label">${m.group}</div>` : '';
            lastGroup = m.group;
            return head + `
            <div class="wm-row">
                <input type="checkbox" ${hidden.includes(m.id) ? '' : 'checked'} onchange="WorkMenu.toggle('${m.id}')">
                <div class="wm-ico" style="background:${m.bg}; color:${m.color};"><i class="bi ${m.icon}"></i></div>
                <div class="wm-name">${m.label}</div>
                <button class="wm-arrow" onclick="WorkMenu.move('${m.id}',-1)"><i class="bi bi-chevron-up"></i></button>
                <button class="wm-arrow" onclick="WorkMenu.move('${m.id}',1)"><i class="bi bi-chevron-down"></i></button>
            </div>`;
        }).join('');
    };

    const toggle = (id) => {
        const s = load();
        s.hidden = s.hidden.includes(id) ? s.hidden.filter(x => x !== id) : [...s.hidden, id];
        save(s); render();
    };

    const move = (id, dir) => {
        const s = load();
        const ids = ordered().map(m => m.id);
        const i = ids.indexOf(id), j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        s.order = ids;
        save(s); render(); renderEditor();
    };

    const reset = () => {
        if (!confirm('전체 메뉴 표시 상태로 초기화할까요?')) return;
        save({ hidden:[], order:[] });
        render(); renderEditor();
    };

    const openEditor = () => {
        ensureUI();
        renderEditor();
        document.getElementById('wm-modal').classList.add('open');
    };
    const closeEditor = () => {
        const modal = document.getElementById('wm-modal');
        if (modal) modal.classList.remove('open');
    };

    window.WorkMenu = { render, go, toggle, move, reset, openEditor, closeEditor, registry: MENU_REGISTRY };
    window.renderWorkMenu = render;

    // 대시보드가 innerHTML로 (다시) 그려질 때마다 자동으로 메뉴를 채움
    let queued = false;
    const check = () => {
        queued = false;
        const pc = document.getElementById('work-menu-grid');
        const mo = document.getElementById('mobile-menu-grid');
        if ((pc && !pc.childElementCount) || (mo && !mo.childElementCount)) render();
        // 대시보드 안에 옛 모달이 다시 생기면 제거
        document.querySelectorAll('#wm-modal').forEach(el => {
            if (el.parentElement !== document.body) el.remove();
        });
    };
    new MutationObserver(() => {
        if (!queued) { queued = true; requestAnimationFrame(check); }
    }).observe(document.documentElement, { childList: true, subtree: true });

    const start = () => { ensureUI(); check(); };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();