// ═══ View: 私聊 ═══
(function () {
  const STYLE_ID = 'view-chat-style';
  const CSS = `
  .ch-header {
    padding: 16px 20px; background: var(--surface);
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .ch-back { font-size: 22px; color: var(--accent); cursor: pointer; padding: 0 8px 0 0; line-height: 1; background: none; border: none; }
  .ch-header h1 { font-size: 18px; font-weight: 400; flex: 1; }
  .ch-header-name { font-size: 15px; color: var(--text-2); cursor: pointer; background: none; border: none; font-family: inherit; }
  .ch-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .ch-row { display: flex; align-items: flex-end; gap: 10px; }
  .ch-row.user { flex-direction: row-reverse; }
  .ch-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 500; flex-shrink: 0;
    cursor: pointer; user-select: none; transition: opacity 0.15s; overflow: hidden;
  }
  .ch-avatar:active { opacity: 0.7; }
  .ch-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .ch-avatar.user { background: var(--accent); color: #fff; }
  .ch-avatar.ai { background: var(--surface3); color: var(--text-2); }
  .ch-block { display: flex; flex-direction: column; gap: 4px; max-width: 70%; }
  .ch-row.user .ch-block { align-items: flex-end; }
  .ch-name { font-size: 12px; color: var(--text-3); padding: 0 4px; }
  .ch-bubble { padding: 12px 16px; border-radius: 16px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
  .ch-bubble.user { background: var(--bubble-user); color: #fff; border-radius: 16px 16px 4px 16px; }
  .ch-bubble.ai { background: var(--bubble-ai); color: var(--text); border: 1px solid var(--border); border-radius: 16px 16px 16px 4px; }
  .ch-bubble.has-img { padding: 0; background: transparent; border: none; }
  .ch-bubble.has-img .ch-img { max-width: 200px; max-height: 260px; border-radius: 14px; display: block; cursor: pointer; border: 1px solid var(--border); }
  .ch-bubble.has-img .ch-caption { margin-top: 4px; padding: 8px 12px; font-size: 14px; line-height: 1.5; }
  .ch-time { font-size: 11px; color: var(--text-3); padding: 0 4px; align-self: flex-end; }
  .ch-input-area { background: var(--surface); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); flex-shrink: 0; }
  .ch-preview-bar { display: none; align-items: center; gap: 10px; padding: 8px 16px 0; }
  .ch-preview-bar.show { display: flex; }
  .ch-preview-thumb { position: relative; width: 60px; height: 60px; }
  .ch-preview-thumb img { width: 60px; height: 60px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); }
  .ch-remove-img-btn { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; background: var(--text-2); color: var(--surface); border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .ch-input-row { display: flex; align-items: flex-end; padding: 10px 12px 12px; gap: 8px; }
  .ch-toolbar-icon { width: 36px; height: 36px; flex-shrink: 0; background: transparent; border: none; color: var(--text-3); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.15s; padding: 0; }
  .ch-toolbar-icon:hover { background: var(--surface2); }
  .ch-input-wrapper { position: relative; flex: 1; }
  .ch-input-wrapper textarea { width: 100%; padding: 9px 36px 9px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 22px; color: var(--text); font-size: 15px; outline: none; resize: none; font-family: inherit; max-height: 120px; overflow-y: auto; line-height: 1.5; }
  .ch-newline-btn { position: absolute; right: 8px; bottom: 7px; width: 24px; height: 24px; border: none; background: transparent; color: var(--text-3); border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .ch-send-btn { width: 36px; height: 36px; flex-shrink: 0; background: var(--accent); border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .ch-send-btn:active { opacity: 0.8; }
  .ch-lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 200; align-items: center; justify-content: center; }
  .ch-lightbox.show { display: flex; }
  .ch-lightbox img { max-width: 94vw; max-height: 90vh; border-radius: 10px; }
  .ch-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; }
  .ch-modal-overlay.show { display: flex; }
  .ch-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 280px; display: flex; flex-direction: column; gap: 16px; }
  .ch-modal h3 { font-size: 15px; font-weight: 500; color: var(--text-2); }
  .ch-modal input { padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 15px; outline: none; width: 100%; }
  .ch-modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
  .ch-modal-btns button { padding: 8px 18px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; }
  .ch-btn-cancel { background: var(--surface2); color: var(--text-2); }
  .ch-btn-confirm { background: var(--accent); color: #fff; }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  async function mount(el, params) {
    ensureStyle();
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    el.innerHTML = `
      <div class="ch-header">
        <button class="ch-back" id="chBack">‹</button>
        <h1>✦ 我的陪伴空間</h1>
        <button class="ch-header-name" id="chHeaderName">晏</button>
      </div>
      <div class="ch-messages" id="chMessages"></div>
      <div class="ch-input-area">
        <div class="ch-preview-bar" id="chPreviewBar">
          <div class="ch-preview-thumb">
            <img id="chPreviewThumb" src="" alt="">
            <button class="ch-remove-img-btn" id="chRemoveImg">✕</button>
          </div>
        </div>
        <div class="ch-input-row">
          <button class="ch-toolbar-icon" id="chImgBtn" title="傳送圖片">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input type="file" id="chImageInput" accept="image/*" style="display:none">
          <div class="ch-input-wrapper">
            <textarea id="chInput" placeholder="說點什麼…" rows="1"></textarea>
            <button class="ch-newline-btn" id="chNewlineBtn">⏎</button>
          </div>
          <button class="ch-send-btn" id="chSendBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
      <div class="ch-lightbox" id="chLightbox"><img id="chLightboxImg" src="" alt=""></div>
      <div class="ch-modal-overlay" id="chModal">
        <div class="ch-modal">
          <h3>修改名稱</h3>
          <input type="text" id="chModalInput" placeholder="輸入新名稱">
          <div class="ch-modal-btns">
            <button class="ch-btn-cancel" id="chModalCancel">取消</button>
            <button class="ch-btn-confirm" id="chModalConfirm">確認</button>
          </div>
        </div>
      </div>
    `;

    let names = { user: '然然', claude: '晏' };
    let avatars = { user: null, claude: null };
    let pendingImageUrl = null;
    let holdTimer = null;

    function formatTime(isoStr) {
      if (!isoStr) return '';
      let s = isoStr;
      // Supabase 存的是 UTC；若字串沒帶時區資訊，補上 Z 再解析，避免被當成本地時間
      if (typeof s === 'string' && !/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
      const d = new Date(s);
      const now = new Date();
      const isToday = d.getFullYear() === now.getFullYear()
                   && d.getMonth() === now.getMonth()
                   && d.getDate() === now.getDate();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      if (isToday) return `${hh}:${mm}`;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.getFullYear() === yesterday.getFullYear()
                       && d.getMonth() === yesterday.getMonth()
                       && d.getDate() === yesterday.getDate();
      if (isYesterday) return `昨天 ${hh}:${mm}`;
      return `${d.getMonth()+1}/${d.getDate()} ${hh}:${mm}`;
    }

    function makeAvatar(role) {
      const target = role === 'user' ? 'user' : 'claude';
      const av = document.createElement('div');
      av.className = `ch-avatar ${role}`;
      const src = avatars[target];
      if (src && src.startsWith('data:')) {
        const img = document.createElement('img');
        img.src = src;
        av.appendChild(img);
      } else {
        av.textContent = names[target]?.[0] || '？';
      }
      av.addEventListener('mousedown', () => { holdTimer = setTimeout(() => openModal(target), 600); });
      av.addEventListener('touchstart', () => { holdTimer = setTimeout(() => openModal(target), 600); }, { passive: true });
      av.addEventListener('mouseup', () => clearTimeout(holdTimer));
      av.addEventListener('touchend', () => clearTimeout(holdTimer));
      av.addEventListener('mouseleave', () => clearTimeout(holdTimer));
      return av;
    }

    function addMessage(text, role, imageUrl, createdAt) {
      const target = role === 'user' ? 'user' : 'claude';
      const row = document.createElement('div');
      row.className = `ch-row ${role}`;
      const avatar = makeAvatar(role);
      const block = document.createElement('div');
      block.className = 'ch-block';
      const nameEl = document.createElement('div');
      nameEl.className = 'ch-name';
      nameEl.textContent = names[target];
      const bubble = document.createElement('div');
      if (imageUrl) {
        bubble.className = `ch-bubble ${role} has-img`;
        const img = document.createElement('img');
        img.className = 'ch-img';
        img.src = imageUrl;
        img.onclick = () => openLightbox(imageUrl);
        bubble.appendChild(img);
        if (text) {
          const cap = document.createElement('div');
          cap.className = 'ch-caption';
          cap.textContent = text;
          bubble.appendChild(cap);
        }
      } else if (role === 'ai') {
        // 晏的訊息：按換行切，「……」單獨一行合併進下一段，每個氣泡最多 3 行，最多 3 個氣泡
        let lines = text.split('\n').map(l => l.trim());
        // 合併孤立的 ……
        let mergedLines = [];
        for (let i = 0; i < lines.length; i++) {
          const isEllipsisOnly = /^[\u2026\.]{2,}$/.test(lines[i]);
          if (isEllipsisOnly && i + 1 < lines.length) {
            mergedLines.push(lines[i] + lines[i + 1]);
            i++;
          } else if (lines[i] !== '') {
            mergedLines.push(lines[i]);
          }
        }
        // 每個氣泡最多 3 行，最多 3 個氣泡
        let paragraphs = [];
        let current = [];
        for (let i = 0; i < mergedLines.length; i++) {
          current.push(mergedLines[i]);
          if (current.length === 5 && paragraphs.length < 2) {
            paragraphs.push(current.join('\n'));
            current = [];
          }
        }
        if (current.length > 0) {
          if (paragraphs.length < 2) {
            paragraphs.push(current.join('\n'));
          } else {
            paragraphs[2] = (paragraphs[2] ? paragraphs[2] + '\n' : '') + current.join('\n');
          }
        }
        if (paragraphs.length === 0) paragraphs = [text.trim()];
        block.appendChild(nameEl);
        if (paragraphs.length <= 1) {
          bubble.className = `ch-bubble ${role}`;
          bubble.textContent = text.trim();
          block.appendChild(bubble);
        } else {
          paragraphs.forEach((para, idx) => {
            const b = document.createElement('div');
            b.className = `ch-bubble ${role}`;
            b.textContent = para;
            b.style.opacity = '0';
            b.style.transition = 'opacity 0.2s ease';
            block.appendChild(b);
            setTimeout(() => { b.style.opacity = '1'; }, idx * 600);
          });
        }
      } else {
        bubble.className = `ch-bubble ${role}`;
        bubble.textContent = text;
      }
      const timeEl = document.createElement('div');
      timeEl.className = 'ch-time';
      timeEl.textContent = formatTime(createdAt || new Date().toISOString());
      if (role !== 'ai') {
        block.appendChild(bubble);
      }
      block.appendChild(timeEl);
      row.appendChild(avatar);
      row.appendChild(block);
      const messages = document.getElementById('chMessages');
      if (messages) {
        messages.appendChild(row);
        messages.scrollTop = 999999;
      }
    }

    function addPendingRow() {
      const row = document.createElement('div');
      row.className = 'ch-row ai';
      row.innerHTML = `<div class="ch-block"><div class="ch-bubble ai" style="opacity:0.5;">…</div></div>`;
      const messages = document.getElementById('chMessages');
      messages.appendChild(row);
      messages.scrollTop = 999999;
      return row;
    }

    function addFailedRow(msg, messageId, imageUrl) {
      const row = document.createElement('div');
      row.className = 'ch-row ai';
      const block = document.createElement('div');
      block.className = 'ch-block';
      const bubble = document.createElement('div');
      bubble.className = 'ch-bubble ai';
      bubble.style.color = 'var(--danger)';
      bubble.textContent = '連線失敗，訊息可能未送達。';
      const retryBtn = document.createElement('button');
      retryBtn.textContent = '重試';
      retryBtn.style.cssText = 'margin-top:6px;padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:14px;font-size:13px;cursor:pointer;align-self:flex-start;';
      retryBtn.onclick = async () => { row.remove(); await sendToServer(msg, messageId, imageUrl); };
      block.appendChild(bubble);
      block.appendChild(retryBtn);
      row.appendChild(block);
      const messages = document.getElementById('chMessages');
      messages.appendChild(row);
      messages.scrollTop = 999999;
    }

    async function sendToServer(msg, messageId, imageUrl, isRetry = false) {
      const row = addPendingRow();
      try {
        const res = await fetch('/chat/claude', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, message_id: messageId, image_url: imageUrl || null })
        });
        if (!res.ok) throw new Error('server error');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        row.remove();
        addMessage(data.reply, 'ai', null, new Date().toISOString());
        // 升階偵測
        try {
          const relRes = await fetch('/relationship_stats');
          const relData = await relRes.json();
          if (window.StageUnlock) {
            window.StageUnlock.checkAndShow(relData.stage, relData.prev_stage);
          }
        } catch (e) {}
      } catch (e) {
        row.remove();
        if (!isRetry) {
          const retryRow = addPendingRow();
          try {
            const res2 = await fetch('/chat/claude', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg, message_id: messageId, image_url: imageUrl || null })
            });
            if (!res2.ok) throw new Error('server error');
            const data2 = await res2.json();
            if (data2.error) throw new Error(data2.error);
            retryRow.remove();
            addMessage(data2.reply, 'ai', null, new Date().toISOString());
            return;
          } catch (e2) { retryRow.remove(); }
        }
        addFailedRow(msg, messageId, imageUrl);
      }
    }

    function generateMessageId() { return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10); }

    async function sendMessage() {
      const input = document.getElementById('chInput');
      const msg = input.value.trim();
      if (!msg && !pendingImageUrl) return;
      input.value = '';
      input.style.height = 'auto';
      const imageUrl = pendingImageUrl;
      removeImage();
      const messageId = generateMessageId();
      const sentAt = new Date().toISOString();
      addMessage(msg, 'user', imageUrl, sentAt);
      await sendToServer(msg, messageId, imageUrl);
    }

    function removeImage() {
      pendingImageUrl = null;
      document.getElementById('chPreviewBar').classList.remove('show');
      document.getElementById('chPreviewThumb').src = '';
    }

    function openLightbox(src) {
      document.getElementById('chLightboxImg').src = src;
      document.getElementById('chLightbox').classList.add('show');
    }

    let editingTarget = null;
    function openModal(target) {
      editingTarget = target;
      const modal = document.getElementById('chModal');
      modal.querySelector('h3').textContent = target === 'user' ? '修改你的名稱' : `修改 ${names[target]} 的名稱`;
      document.getElementById('chModalInput').value = names[target];
      modal.classList.add('show');
      document.getElementById('chModalInput').focus();
    }
    function closeModal() { document.getElementById('chModal').classList.remove('show'); editingTarget = null; }
    async function confirmName() {
      const val = document.getElementById('chModalInput').value.trim();
      if (!val || !editingTarget) return;
      names[editingTarget] = val;
      const keyMap = { user: 'name_user', claude: 'name_claude' };
      await fetch('/names', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyMap[editingTarget], name: val })
      });
      if (editingTarget === 'claude') document.getElementById('chHeaderName').textContent = val;
      closeModal();
      await loadHistory();
    }

    async function loadAvatars() {
      try {
        const res = await fetch('/personas');
        const data = await res.json();
        avatars.user = data.user?.avatar || null;
        avatars.claude = data.claude?.avatar || null;
      } catch (e) {}
    }
    async function loadNames() {
      try {
        const res = await fetch('/names');
        const data = await res.json();
        names.user = data.name_user || names.user;
        names.claude = data.name_claude || names.claude;
      } catch (e) {}
      document.getElementById('chHeaderName').textContent = names.claude;
    }
    async function loadHistory() {
      const messages = document.getElementById('chMessages');
      if (!messages) return;
      messages.innerHTML = '';
      try {
        const res = await fetch('/history/claude');
        const data = await res.json();
        data.history.forEach(m => {
          const role = m.role === 'user' ? 'user' : 'ai';
          addMessage(m.content, role, m.image_url, m.created_at);
        });
      } catch (e) {}
    }

    function autoGrow(el2) { el2.style.height = 'auto'; el2.style.height = el2.scrollHeight + 'px'; }
    function insertNewline() {
      const el2 = document.getElementById('chInput');
      const s = el2.selectionStart, end = el2.selectionEnd;
      el2.value = el2.value.slice(0, s) + '\n' + el2.value.slice(end);
      el2.selectionStart = el2.selectionEnd = s + 1;
      autoGrow(el2);
      el2.focus();
    }

    async function handleImageSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      document.getElementById('chPreviewThumb').src = URL.createObjectURL(file);
      document.getElementById('chPreviewBar').classList.add('show');
      pendingImageUrl = null;
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await fetch('/upload_image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) { pendingImageUrl = data.url; }
        else { alert('圖片上傳失敗：' + (data.error || '未知錯誤')); removeImage(); }
      } catch (err) { alert('圖片上傳失敗'); removeImage(); }
      e.target.value = '';
    }

    // 綁定事件
    const backBtn = document.getElementById('chBack');
    backBtn.onclick = () => RifugioRouter.navigate('chatlist');
    document.getElementById('chHeaderName').onmousedown = () => { holdTimer = setTimeout(() => openModal('claude'), 600); };
    document.getElementById('chHeaderName').ontouchstart = () => { holdTimer = setTimeout(() => openModal('claude'), 600); };
    document.getElementById('chHeaderName').onmouseup = () => clearTimeout(holdTimer);
    document.getElementById('chHeaderName').ontouchend = () => clearTimeout(holdTimer);
    document.getElementById('chImgBtn').onclick = () => document.getElementById('chImageInput').click();
    document.getElementById('chImageInput').onchange = handleImageSelect;
    document.getElementById('chRemoveImg').onclick = removeImage;
    document.getElementById('chSendBtn').onclick = sendMessage;
    document.getElementById('chNewlineBtn').onclick = insertNewline;
    document.getElementById('chInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('chInput').addEventListener('input', (e) => autoGrow(e.target));
    document.getElementById('chLightbox').onclick = () => document.getElementById('chLightbox').classList.remove('show');
    document.getElementById('chModalCancel').onclick = closeModal;
    document.getElementById('chModalConfirm').onclick = confirmName;
    document.getElementById('chModalInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmName();
      if (e.key === 'Escape') closeModal();
    });

    await loadAvatars();
    await loadNames();
    await loadHistory();

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.chat = { mount };
})();