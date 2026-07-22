// ═══ View: 訪客管理 ═══
(function () {
  const STYLE_ID = 'view-guest-style';
  const CSS = `
  .gst-main { flex: 1; overflow-y: auto; padding: max(48px, env(safe-area-inset-top)) 20px 40px; display: flex; flex-direction: column; gap: 20px; }
  .gst-create { background: var(--surface); border-radius: 14px; padding: 18px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
  .gst-create-title { font-size: 15px; font-weight: 500; }
  .gst-input { padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; outline: none; font-family: inherit; width: 100%; }
  .gst-row { display: flex; gap: 10px; align-items: center; }
  .gst-label { font-size: 13px; color: var(--text-2); white-space: nowrap; }
  .gst-create-btn { padding: 10px; background: var(--accent); border: none; border-radius: 10px; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }
  .gst-section-title { font-size: 11px; color: var(--text-3); letter-spacing: 2px; text-transform: uppercase; }
  .gst-card { background: var(--surface); border-radius: 14px; border: 1px solid var(--border); overflow: hidden; }
  .gst-card-header { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
  .gst-card-left { display: flex; flex-direction: column; gap: 3px; }
  .gst-card-name { font-size: 15px; color: var(--text); }
  .gst-card-meta { font-size: 12px; color: var(--text-3); }
  .gst-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; }
  .gst-badge.active { background: rgba(50,160,80,0.15); color: #50a060; }
  .gst-badge.ended { background: var(--surface2); color: var(--text-3); }
  .gst-card-btns { display: flex; gap: 8px; padding: 0 16px 14px; }
  .gst-btn { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-2); font-size: 13px; cursor: pointer; font-family: inherit; }
  .gst-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .gst-btn.danger { border-color: rgba(200,60,60,0.3); color: #e06060; }
  .gst-summary { background: var(--surface2); padding: 14px 16px; font-size: 14px; color: var(--text-2); line-height: 1.7; border-top: 1px solid var(--border); white-space: pre-wrap; }
  .gst-link-box { background: var(--surface2); padding: 12px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .gst-link-url { font-size: 12px; color: var(--text-3); font-family: monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gst-copy-btn { padding: 4px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text-2); font-size: 12px; cursor: pointer; flex-shrink: 0; }
  .gst-empty { text-align: center; color: var(--text-3); font-size: 14px; padding: 2rem 0; }
  .gst-live-section { background: var(--surface); border-radius: 14px; border: 1px solid var(--border); overflow: hidden; }
  .gst-live-title { padding: 14px 16px 10px; font-size: 11px; color: var(--text-3); letter-spacing: 2px; }
  .gst-live-card { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
  .gst-live-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(160,100,200,0.2); display: flex; align-items: center; justify-content: center; color: rgba(160,100,200,0.9); font-size: 15px; flex-shrink: 0; }
  .gst-live-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .gst-live-name { font-size: 14px; color: var(--text); }
  .gst-live-meta { font-size: 12px; color: var(--text-3); }
  .gst-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #50a060; flex-shrink: 0; animation: gst-pulse 1.5s infinite; }
  @keyframes gst-pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
  .gst-live-empty { padding: 14px 16px; font-size: 13px; color: var(--text-3); }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  async function mount(el) {
    ensureStyle();
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    el.innerHTML = `
      <div class="gst-main">
        <div class="gst-live-section">
          <div class="gst-live-title">晏的訪客動態</div>
          <div id="gstLiveList"><div class="gst-live-empty">目前沒有進行中的訪客</div></div>
        </div>

        <div class="gst-create">
          <div class="gst-create-title">產生訪客連結</div>
          <div>
            <div class="gst-label" style="margin-bottom:6px;">訪客名字</div>
            <input class="gst-input" id="gstGuestName" placeholder="小花、阿明…">
          </div>
          <div class="gst-row">
            <div class="gst-label">有效時間</div>
            <select class="gst-input" id="gstTtl" style="flex:1;">
              <option value="2">2 小時</option>
              <option value="24" selected>24 小時</option>
              <option value="72">3 天</option>
              <option value="168">7 天</option>
            </select>
            <div class="gst-label">訊息上限</div>
            <select class="gst-input" id="gstMax" style="flex:1;">
              <option value="30">30 則</option>
              <option value="50" selected>50 則</option>
              <option value="100">100 則</option>
            </select>
          </div>
          <div>
            <div class="gst-label" style="margin-bottom:6px;">密碼保護（可留空）</div>
            <input class="gst-input" id="gstPassword" placeholder="留空則不需密碼" type="password">
          </div>
          <button class="gst-create-btn" id="gstCreateBtn">產生連結</button>
          <button class="gst-btn" id="gstFriendsBtn" style="margin-top:4px;">👥 管理朋友記憶庫</button>
          <div id="gstResult" style="display:none;" class="gst-result">
            <div class="gst-result-label">連結已產生，複製給你的朋友：</div>
            <div class="gst-result-url" id="gstResultUrl"></div>
            <button class="gst-btn primary" id="gstCopyResult" style="align-self:flex-start;">複製連結</button>
          </div>
        </div>

        <div class="gst-section-title">訪客記錄</div>
        <div id="gstList"></div>
      </div>
    `;

    async function loadSessions() {
      const list = document.getElementById('gstList');
      try {
        const res = await fetch('/guest/sessions');
        const data = await res.json();
        list.innerHTML = '';
        if (!data.sessions || data.sessions.length === 0) {
          list.innerHTML = '<div class="gst-empty">還沒有訪客記錄</div>';
          return;
        }
        data.sessions.forEach(s => {
          const card = document.createElement('div');
          card.className = 'gst-card';
          const statusLabel = s.status === 'active' ? '進行中' : '已結束';
          const hasPw = s.has_password ? ' 🔒' : '';
          const statusClass = s.status === 'active' ? 'active' : 'ended';
          const url = `${location.origin}/visit/${s.token}`;
          card.innerHTML = `
            <div class="gst-card-header">
              <div class="gst-card-left">
                <div class="gst-card-name">${s.guest_name || '訪客'}${hasPw}</div>
                <div class="gst-card-meta">${formatDate(s.created_at)} ・ ${s.message_count || 0} 則訊息</div>
              </div>
              <span class="gst-badge ${statusClass}">${statusLabel}</span>
            </div>
            ${s.status === 'active' ? `
            <div class="gst-link-box">
              <div class="gst-link-url">${url}</div>
              <button class="gst-copy-btn" data-url="${url}">複製</button>
            </div>` : ''}
            ${s.summary ? `<div class="gst-summary">${s.summary}</div>` : ''}
            <div class="gst-card-btns">
              ${s.status === 'active' ? `<button class="gst-btn danger" data-end="${s.id}" data-token="${s.token}">結束會話</button>` : ''}
              <button class="gst-btn danger" data-del="${s.id}">刪除</button>
            </div>
          `;

          card.querySelectorAll('.gst-copy-btn').forEach(btn => {
            btn.onclick = () => {
              navigator.clipboard.writeText(btn.dataset.url).catch(() => {});
              btn.textContent = '已複製';
              setTimeout(() => btn.textContent = '複製', 1500);
            };
          });

          const endBtn = card.querySelector('[data-end]');
          if (endBtn) {
            endBtn.onclick = async () => {
              endBtn.disabled = true;
              endBtn.textContent = '結束中…';
              try {
                await fetch(`/guest/${endBtn.dataset.token}/end`, { method: 'POST' });
                loadSessions();
              } catch (e) { endBtn.disabled = false; endBtn.textContent = '結束會話'; }
            };
          }

          const delBtn = card.querySelector('[data-del]');
          if (delBtn) {
            delBtn.onclick = async () => {
              if (!confirm('確定要刪除這筆記錄？')) return;
              await fetch(`/guest/sessions/${delBtn.dataset.del}`, { method: 'DELETE' });
              loadSessions();
            };
          }

          list.appendChild(card);
        });
      } catch (e) {
        list.innerHTML = '<div class="gst-empty">載入失敗</div>';
      }
    }

    document.getElementById('gstFriendsBtn').onclick = () => {
      if (window.RifugioRouter) RifugioRouter.navigate('friends');
    };

    document.getElementById('gstCreateBtn').onclick = async () => {
      const name = document.getElementById('gstGuestName').value.trim();
      if (!name) { document.getElementById('gstGuestName').focus(); return; }
      const ttl = +document.getElementById('gstTtl').value;
      const max = +document.getElementById('gstMax').value;
      const btn = document.getElementById('gstCreateBtn');
      btn.disabled = true; btn.textContent = '產生中…';
      try {
        const res = await fetch('/guest/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_name: name, ttl_hours: ttl, max_messages: max, password: document.getElementById('gstPassword').value.trim() })
        });
        const data = await res.json();
        if (data.url) {
          document.getElementById('gstResultUrl').textContent = data.url;
          document.getElementById('gstResult').style.display = 'flex';
          document.getElementById('gstCopyResult').onclick = () => {
            navigator.clipboard.writeText(data.url).catch(() => {});
            document.getElementById('gstCopyResult').textContent = '已複製！';
            setTimeout(() => document.getElementById('gstCopyResult').textContent = '複製連結', 1500);
          };
          loadSessions();
        }
      } catch (e) {}
      btn.disabled = false; btn.textContent = '產生連結';
    };

    // 載入晏的訪客動態
    async function loadLiveSessions() {
      const list = document.getElementById('gstLiveList');
      try {
        const res = await fetch('/visitor/sessions');
        const data = await res.json();
        const active = (data.sessions || []).filter(s => s.status === 'active');
        if (active.length === 0) {
          list.innerHTML = '<div class="gst-live-empty">目前沒有進行中的訪客</div>';
          return;
        }
        list.innerHTML = '';
        active.forEach(s => {
          const modeLabel = s.mode === 'together' ? '三人一起' : '單獨聊';
          const item = document.createElement('div');
          item.className = 'gst-live-card';
          item.innerHTML = `
            <div class="gst-live-avatar">${s.visitor_name?.charAt(0) || '訪'}</div>
            <div class="gst-live-info">
              <div class="gst-live-name">${s.visitor_name}</div>
              <div class="gst-live-meta">${modeLabel} · ${formatDate(s.created_at)}</div>
            </div>
            <div class="gst-live-dot"></div>
          `;
          list.appendChild(item);
        });
      } catch(e) {
        list.innerHTML = '<div class="gst-live-empty">載入失敗</div>';
      }
    }

    await Promise.all([loadSessions(), loadLiveSessions()]);
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.guest = { mount };
})();