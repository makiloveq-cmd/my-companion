// ═══ View: 記憶管理（珍藏記憶 + 情緒記錄）═══
(function () {
  const STYLE_ID = 'view-memory-style';
  const CSS = `
  .mm-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .mm-header {
    padding: max(48px, env(safe-area-inset-top)) 20px 0;
    background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .mm-header-top { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; }
  .mm-header h1 { font-size: 20px; font-weight: 500; flex: 1; }
  .mm-back { background: none; border: none; color: var(--text-2); font-size: 20px; cursor: pointer; padding: 0 4px; }
  .mm-tabs { display: flex; gap: 4px; }
  .mm-tab {
    flex: 1; padding: 10px 0; background: none; border: none;
    color: var(--text-3); font-size: 14px; cursor: pointer; font-family: inherit;
    border-bottom: 2px solid transparent; transition: all .2s;
  }
  .mm-tab.active { color: var(--text); border-bottom-color: var(--accent); }
  .mm-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
  .mm-hint { font-size: 12px; color: var(--text-3); line-height: 1.6; padding: 2px 2px 6px; }
  .mm-item {
    background: var(--surface); border-radius: 14px; padding: 13px 15px;
    border: 1px solid var(--border); display: flex; flex-direction: column; gap: 7px;
  }
  .mm-item.pinned { border-color: var(--accent); }
  .mm-item-top { display: flex; align-items: center; gap: 8px; }
  .mm-badge {
    font-size: 10px; padding: 2px 7px; border-radius: 6px;
    background: var(--bg); color: var(--text-3); flex-shrink: 0;
  }
  .mm-badge.on { background: var(--accent); color: #fff; }
  .mm-date { font-size: 11px; color: var(--text-3); flex: 1; }
  .mm-pin-btn {
    background: none; border: 1px solid var(--border); border-radius: 8px;
    color: var(--text-3); font-size: 12px; cursor: pointer;
    padding: 4px 10px; font-family: inherit; flex-shrink: 0;
  }
  .mm-pin-btn.on { border-color: var(--accent); color: var(--accent); }
  .mm-pin-btn:disabled { opacity: .5; }
  .mm-text { font-size: 13px; color: var(--text-2); line-height: 1.7; white-space: pre-wrap; }
  .mm-text.clamp {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .mm-more { font-size: 11px; color: var(--text-3); cursor: pointer; align-self: flex-start; }
  .mm-kw { font-size: 11px; color: var(--text-3); }
  .mm-empty { text-align: center; color: var(--text-3); font-size: 14px; padding: 3rem 0; }
  .mm-emo-row { display: flex; align-items: center; gap: 10px; }
  .mm-emo-name { font-size: 15px; color: var(--text); font-weight: 500; }
  .mm-emo-bar { display: flex; gap: 3px; }
  .mm-emo-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
  .mm-emo-dot.on { background: var(--accent); }
  .mm-del { background: none; border: none; color: var(--text-3); font-size: 15px; cursor: pointer; padding: 2px 4px; }
  .mm-add {
    padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--border);
    flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .mm-add-row { display: flex; gap: 8px; }
  .mm-input {
    flex: 1; padding: 9px 12px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 10px; color: var(--text); font-size: 14px; outline: none;
    font-family: inherit; min-width: 0;
  }
  .mm-sel {
    padding: 9px 10px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 10px; color: var(--text); font-size: 14px; outline: none;
    font-family: inherit; flex-shrink: 0;
  }
  .mm-send {
    padding: 9px 18px; background: var(--accent); border: none; border-radius: 10px;
    color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; flex-shrink: 0;
  }
  .mm-send:disabled { opacity: .5; }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmtDate(ts) {
    if (!ts) return '';
    try {
      let s = String(ts).replace(' ', 'T');
      if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
      const d = new Date(s);
      if (isNaN(d.getTime())) return '';
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch (e) { return ''; }
  }

  async function mount(el) {
    ensureStyle();
    el.innerHTML = `
      <div class="mm-main">
        <div class="mm-header">
          <div class="mm-header-top">
            <button class="mm-back" id="mmBack">‹</button>
            <h1>記憶管理</h1>
          </div>
          <div class="mm-tabs">
            <button class="mm-tab active" data-tab="pinned">珍藏記憶</button>
            <button class="mm-tab" data-tab="emotion">情緒記錄</button>
          </div>
        </div>
        <div class="mm-body" id="mmBody"></div>
        <div class="mm-add" id="mmAdd" style="display:none;">
          <div class="mm-add-row">
            <input class="mm-input" id="mmEmoName" placeholder="情緒，例如：疲憊" maxlength="10" />
            <select class="mm-sel" id="mmEmoLevel">
              <option value="1">1 微</option>
              <option value="2">2 淡</option>
              <option value="3" selected>3 中</option>
              <option value="4">4 強</option>
              <option value="5">5 極</option>
            </select>
          </div>
          <div class="mm-add-row">
            <input class="mm-input" id="mmEmoNote" placeholder="原因（可留空）" maxlength="60" />
            <button class="mm-send" id="mmEmoSend">記錄</button>
          </div>
        </div>
      </div>
    `;

    const body = document.getElementById('mmBody');
    const addBar = document.getElementById('mmAdd');
    let quota = 2;

    document.getElementById('mmBack').onclick = () => {
      (window.SpaRouter || window.RifugioRouter).navigate('home');
    };

    // ── 珍藏記憶 ──
    async function loadPinned() {
      addBar.style.display = 'none';
      body.innerHTML = '<div class="mm-empty">載入中…</div>';
      try {
        const res = await fetch('/memory_summaries/list?limit=60');
        const data = await res.json();
        quota = data.quota != null ? data.quota : 2;
        const list = data.summaries || [];
        if (!list.length) {
          body.innerHTML = '<div class="mm-empty">還沒有記憶摘要</div>';
          return;
        }
        const pinnedCount = list.filter(r => r.pinned).length;
        body.innerHTML =
          `<div class="mm-hint">已珍藏 ${pinnedCount} 筆，每次對話會注入其中最新的 ${quota} 筆。珍藏的記憶不受時間衰減，晏永遠記得。</div>` +
          list.map(r => `
            <div class="mm-item ${r.pinned ? 'pinned' : ''}" data-id="${r.id}">
              <div class="mm-item-top">
                <span class="mm-badge ${r.pinned ? 'on' : ''}">${r.session_id === 'space' ? '空間' : '私聊'}</span>
                <span class="mm-date">${fmtDate(r.created_at)}</span>
                <button class="mm-pin-btn ${r.pinned ? 'on' : ''}" data-id="${r.id}" data-pinned="${r.pinned ? 1 : 0}">
                  ${r.pinned ? '★ 已珍藏' : '☆ 珍藏'}
                </button>
              </div>
              <div class="mm-text clamp" data-role="text">${esc(r.content)}</div>
              <div class="mm-more" data-role="more">展開</div>
              ${r.keywords ? `<div class="mm-kw">${esc(r.keywords)}</div>` : ''}
            </div>
          `).join('');

        body.querySelectorAll('[data-role="more"]').forEach(m => {
          m.onclick = () => {
            const t = m.parentElement.querySelector('[data-role="text"]');
            const open = !t.classList.contains('clamp');
            t.classList.toggle('clamp', open);
            m.textContent = open ? '展開' : '收合';
          };
        });

        body.querySelectorAll('.mm-pin-btn').forEach(btn => {
          btn.onclick = async () => {
            const id = btn.dataset.id;
            const next = btn.dataset.pinned !== '1';
            btn.disabled = true;
            try {
              await fetch(`/memory_summaries/${id}/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinned: next })
              });
              await loadPinned();
            } catch (e) { btn.disabled = false; }
          };
        });
      } catch (e) {
        body.innerHTML = '<div class="mm-empty">載入失敗，請重試</div>';
      }
    }

    // ── 情緒記錄 ──
    async function loadEmotion() {
      addBar.style.display = 'flex';
      body.innerHTML = '<div class="mm-empty">載入中…</div>';
      try {
        const res = await fetch('/emotion');
        const data = await res.json();
        const list = data.emotions || [];
        const hint = '<div class="mm-hint">晏會參考最近 7 天的情緒，讓語氣自然貼近你的狀態。系統也會在整理記憶時自動記錄。</div>';
        if (!list.length) {
          body.innerHTML = hint + '<div class="mm-empty">還沒有情緒記錄</div>';
          return;
        }
        body.innerHTML = hint + list.map(r => {
          const lv = Math.max(1, Math.min(5, r.intensity || 3));
          const dots = [1, 2, 3, 4, 5].map(i => `<span class="mm-emo-dot ${i <= lv ? 'on' : ''}"></span>`).join('');
          return `
            <div class="mm-item">
              <div class="mm-emo-row">
                <span class="mm-emo-name">${esc(r.emotion)}</span>
                <span class="mm-emo-bar">${dots}</span>
                <span class="mm-date" style="text-align:right;">${fmtDate(r.created_at)}</span>
                <button class="mm-del" data-id="${r.id}">✕</button>
              </div>
              ${r.note ? `<div class="mm-text">${esc(r.note)}</div>` : ''}
            </div>
          `;
        }).join('');

        body.querySelectorAll('.mm-del').forEach(b => {
          b.onclick = async () => {
            b.disabled = true;
            try {
              await fetch(`/emotion/${b.dataset.id}`, { method: 'DELETE' });
              await loadEmotion();
            } catch (e) { b.disabled = false; }
          };
        });
      } catch (e) {
        body.innerHTML = '<div class="mm-empty">載入失敗，請重試</div>';
      }
    }

    document.getElementById('mmEmoSend').onclick = async () => {
      const nameEl = document.getElementById('mmEmoName');
      const emotion = nameEl.value.trim();
      if (!emotion) return;
      const btn = document.getElementById('mmEmoSend');
      btn.disabled = true;
      try {
        await fetch('/emotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emotion,
            intensity: parseInt(document.getElementById('mmEmoLevel').value, 10),
            note: document.getElementById('mmEmoNote').value.trim()
          })
        });
        nameEl.value = '';
        document.getElementById('mmEmoNote').value = '';
        await loadEmotion();
      } catch (e) {}
      btn.disabled = false;
    };

    document.getElementById('mmEmoName').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('mmEmoSend').click(); }
    });
    document.getElementById('mmEmoNote').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('mmEmoSend').click(); }
    });

    el.querySelectorAll('.mm-tab').forEach(tab => {
      tab.onclick = () => {
        el.querySelectorAll('.mm-tab').forEach(t => t.classList.toggle('active', t === tab));
        if (tab.dataset.tab === 'pinned') loadPinned(); else loadEmotion();
      };
    });

    await loadPinned();
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.memory = { mount };
})();
