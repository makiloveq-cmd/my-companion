// ═══ View: 聊天列表 ═══
(function () {
  const STYLE_ID = 'view-chatlist-style';
  const CSS = `
  .cl-header {
    padding: 20px 20px 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .cl-header h1 { font-size: 20px; font-weight: 500; }
  .cl-header-usage {
    font-size: 13px; color: var(--text-3);
    text-decoration: none; cursor: pointer;
    display: flex; align-items: center; gap: 4px;
    padding: 4px 8px; border: 1px solid var(--border); border-radius: 14px;
    background: none;
  }
  .cl-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
  .cl-item {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 20px; text-decoration: none; color: inherit;
    border-bottom: 1px solid var(--border); cursor: pointer; background: none; border-left: none; border-right: none; border-top: none; width: 100%; text-align: left; font-family: inherit;
  }
  .cl-item:active { background: var(--surface2); }
  .cl-avatar {
    width: 50px; height: 50px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 500; flex-shrink: 0; overflow: hidden;
  }
  .cl-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .cl-avatar.space { background: var(--surface3); color: var(--text-2); }
  .cl-avatar.quotes { background: var(--surface3); color: var(--text-2); font-size: 22px; }
  .cl-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .cl-name { font-size: 16px; font-weight: 500; color: var(--text); }
  .cl-preview { font-size: 13px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cl-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .cl-time { font-size: 11px; color: var(--text-3); }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function formatChatTime(ts) {
    if (!ts) return '';
    let s = ts;
    // Supabase 存的是 UTC；若字串沒帶時區資訊，補上 Z 再解析，避免被當成本地時間
    if (typeof s === 'string' && !/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
    const d = new Date(s);
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear()
                 && d.getMonth() === now.getMonth()
                 && d.getDate() === now.getDate();
    if (isToday) return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getFullYear() === yesterday.getFullYear()
                     && d.getMonth() === yesterday.getMonth()
                     && d.getDate() === yesterday.getDate();
    if (isYesterday) return '昨天';
    return `${d.getMonth()+1}/${d.getDate()}`;
  }

  async function mount(el, params) {
    ensureStyle();
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.innerHTML = `
      <div class="cl-header">
        <h1>聊天</h1>
        <button class="cl-header-usage" id="clUsageBtn">⚡ 用量</button>
      </div>
      <div class="cl-list" id="clList"></div>
    `;

    document.getElementById('clUsageBtn').onclick = () => RifugioRouter.navigate('usage');

    let avatars = {};
    try {
      const res = await fetch('/personas');
      const data = await res.json();
      avatars = { claude: data.claude?.avatar || null };
    } catch (e) {}

    try {
      const res = await fetch('/chat_list');
      const data = await res.json();
      const list = document.getElementById('clList');
      if (!list) return; // 已被卸載

      const items = [
        { route: 'chat', name: data.claude.name, preview: data.claude.preview, time: data.claude.time, cls: '', initial: data.claude.name[0], avatarSrc: avatars.claude },
        { route: 'space', name: '共同空間', preview: '進入你們的空間…', time: null, cls: 'space', initial: '◈', avatarSrc: null },
        { route: 'quotes', name: '語錄庫', preview: '你喜歡的話都在這裡…', time: null, cls: 'quotes', initial: '✦', avatarSrc: null },
      ];

      list.innerHTML = '';
      items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'cl-item';
        btn.onclick = () => RifugioRouter.navigate(item.route);

        const avatar = document.createElement('div');
        avatar.className = `cl-avatar ${item.cls}`;
        if (item.avatarSrc && item.avatarSrc.startsWith('data:')) {
          const img = document.createElement('img');
          img.src = item.avatarSrc;
          avatar.appendChild(img);
        } else {
          avatar.textContent = item.initial;
        }

        const info = document.createElement('div');
        info.className = 'cl-info';
        info.innerHTML = `
          <div class="cl-name">${item.name}</div>
          <div class="cl-preview">${item.preview}</div>
        `;

        const right = document.createElement('div');
        right.className = 'cl-right';
        right.innerHTML = `<div class="cl-time">${formatChatTime(item.time)}</div>`;

        btn.appendChild(avatar);
        btn.appendChild(info);
        btn.appendChild(right);
        list.appendChild(btn);
      });
    } catch (e) {}

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.chatlist = { mount };
})();