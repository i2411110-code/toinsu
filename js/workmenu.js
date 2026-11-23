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

        // ── 계산·조회 ──
        { id:'terms',        group:'계산·조회', label:'약관조회',    icon:'bi-search-heart',    bg:'#EFF6FF', color:'#2563EB', type:'page', target:'page-terms' },
        { id:'precedent',    group:'계산·조회', label:'보험판례',    icon:'bi-bank2',           bg:'#F0FDF4', color:'#16A34A', type:'page', target:'page-precedent' },
        { id:'silbi',        group:'계산·조회', label:'실비계산기',  icon:'bi-calculator-fill', bg:'#EFF6FF', color:'#2563EB', type:'page', target:'page-silbi' },
        { id:'calculator',   group:'계산·조회', label:'재무 계산기', icon:'bi-calculator-fill', bg:'#E0F2FE', color:'#0284C7', type:'page', target:'page-calculator' },
    ];

    // 사용자 구분 키 (로그인 정보가 늦게 들어와도 되도록 호출 시점에 계산)
    const userKey = () => {
        let id = 'guest';
        try {
            id = window.currentUser?.uid || window.currentUser?.email
              || window.auth?.currentUser?.uid
              || (window.firebase?.auth && window.firebase.auth().currentUser?.uid)
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

    const render = () => {
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
        document.querySelectorAll('body > #wm-modal').forEach(el => el.remove());
        const modal = document.getElementById('wm-modal');
        if (!modal) return;
        if (modal.parentElement !== document.body) document.body.appendChild(modal);
        renderEditor();
        modal.classList.add('open');
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
    };
    new MutationObserver(() => {
        if (!queued) { queued = true; requestAnimationFrame(check); }
    }).observe(document.documentElement, { childList: true, subtree: true });

    check();
})();