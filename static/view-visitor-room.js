// view-visitor-room.js — 訪客三人聊天室（together 模式）
(function() {
  async function mount(container, params) {
    const sessionId = params.session_id;
    const visitorName = decodeURIComponent(params.visitor_name || '訪客');

    container.innerHTML = `<style>
      .vr-wrap { display:flex; flex-direction:column; height:100%; background:var(--bg); }
      .vr-header { display:flex; align-items:center; gap:10px; padding:14px 16px 10px;
        border-bottom:0.5px solid var(--border); background:var(--bg); flex-shrink:0; }
      .vr-header-back { font-size:20px; color:var(--text-2); cursor:pointer; line-height:1; }
      .vr-header-title { font-size:15px; color:var(--text-1); flex:1; }
      .vr-header-end { font-size:12px; color:#e06060; cursor:pointer; padding:4px 10px;
        border:0.5px solid #e06060; border-radius:8px; }
      .vr-messages { flex:1; overflow-y:auto; padding:16px 14px 8px; display:flex;
        flex-direction:column; gap:12px; }
      /* AI 泡泡 */
      .vr-entry-ai { display:flex; align-items:flex-start; gap:8px; max-width:88%; }
      .vr-av { width:32px; height:32px; border-radius:50%; background:var(--accent-dim);
        flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center;
        font-size:13px; color:var(--text-2); }
      .vr-av img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
      .vr-block { display:flex; flex-direction:column; gap:4px; }
      .vr-name { font-size:11px; color:var(--text-3); padding:0 2px; margin-bottom:2px; }
      .vr-bubble { background:var(--bubble-ai,#1a2a3a); color:var(--text-1);
        padding:10px 14px; border-radius:4px 16px 16px 16px;
        font-size:15px; line-height:1.7; white-space:pre-wrap; }
      .vr-time { font-size:11px; color:var(--text-3); padding:0 2px; }
      /* User 泡泡 */
      .vr-entry-user { align-self:flex-end; max-width:75%;
        display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
      .vr-user-bubble { background:var(--bubble-user); color:#fff;
        padding:10px 14px; border-radius:16px 16px 4px 16px;
        font-size:15px; line-height:1.7; white-space:pre-wrap; }
      /* 輸入區 */
      .vr-input-area { padding:10px 14px 20px; background:var(--bg);
        border-top:0.5px solid var(--border); flex-shrink:0; }
      .vr-input-row { display:flex; gap:8px; align-items:flex-end; }
      .vr-input { flex:1; background:var(--input-bg,#0d1624); border:0.5px solid var(--border);
        border-radius:14px; padding:10px 14px; color:var(--text-1); font-size:15px;
        outline:none; resize:none; line-height:1.5; max-height:120px; font-family:inherit; }
      .vr-send { width:38px; height:38px; border-radius:50%; background:var(--accent);
        border:none; color:#fff; font-size:18px; cursor:pointer; display:flex;
        align-items:center; justify-content:center; flex-shrink:0; }
      .vr-send:disabled { opacity:0.4; cursor:default; }
      .vr-thinking { opacity:0.5; font-size:14px; color:var(--text-3); padding:4px 0; }
    </style>
    <div class="vr-wrap">
      <div class="vr-header">
        <div class="vr-header-back" id="vrBack">‹</div>
        <div class="vr-header-title" id="vrTitle">${visitorName} 來訪中</div>
        <div class="vr-header-end" id="vrEnd">送客</div>
      </div>
      <div class="vr-messages" id="vrMessages"></div>
      <div class="vr-input-area">
        <div class="vr-input-row">
          <textarea class="vr-input" id="vrInput" rows="1" placeholder="說些什麼…"></textarea>
          <button class="vr-send" id="vrSend">➤</button>
        </div>
      </div>
    </div>`;

    const msgs = container.querySelector('#vrMessages');
    const input = container.querySelector('#vrInput');
    const sendBtn = container.querySelector('#vrSend');

    // 載入頭像
    let avatarSrc = '';
    try {
      const r = await fetch('/avatars');
      const d = await r.json();
      avatarSrc = d.claude || '';
    } catch(e) {}

    function formatT(iso) { return window.formatTime ? window.formatTime(iso) : ''; }

    function appendAI(text, createdAt) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const bubbles = [];
      let cur = [];
      for (const l of lines) {
        cur.push(l);
        if (cur.length === 5 || l === lines[lines.length - 1]) {
          bubbles.push(cur.join('\n'));
          cur = [];
        }
      }
      if (!bubbles.length) bubbles.push(text.trim());

      const entry = document.createElement('div');
      entry.className = 'vr-entry-ai';
      const av = document.createElement('div');
      av.className = 'vr-av';
      av.innerHTML = avatarSrc ? `<img src="${avatarSrc}">` : '晏';
      const block = document.createElement('div');
      block.className = 'vr-block';
      bubbles.forEach((b, i) => {
        const bubble = document.createElement('div');
        bubble.className = 'vr-bubble';
        bubble.textContent = b;
        if (i > 0) { bubble.style.opacity = '0'; bubble.style.transition = 'opacity 0.2s'; setTimeout(() => bubble.style.opacity = '1', i * 500); }
        block.appendChild(bubble);
      });
      const timeEl = document.createElement('div');
      timeEl.className = 'vr-time';
      timeEl.textContent = formatT(createdAt || new Date().toISOString());
      block.appendChild(timeEl);
      entry.appendChild(av);
      entry.appendChild(block);
      msgs.appendChild(entry);
      msgs.scrollTop = 99999;
    }

    function appendUser(text) {
      const wrap = document.createElement('div');
      wrap.className = 'vr-entry-user';
      const bubble = document.createElement('div');
      bubble.className = 'vr-user-bubble';
      bubble.textContent = text;
      const timeEl = document.createElement('div');
      timeEl.className = 'vr-time';
      timeEl.textContent = formatT(new Date().toISOString());
      wrap.appendChild(bubble);
      wrap.appendChild(timeEl);
      msgs.appendChild(wrap);
      msgs.scrollTop = 99999;
    }

    function showThinking() {
      const el = document.createElement('div');
      el.className = 'vr-thinking';
      el.id = 'vrThinking';
      el.textContent = '…';
      msgs.appendChild(el);
      msgs.scrollTop = 99999;
    }

    function hideThinking() {
      const el = document.getElementById('vrThinking');
      if (el) el.remove();
    }

    // 載入歷史訊息（如果 together 已開始）
    try {
      const r = await fetch(`/visitor/status/${sessionId}`);
      const d = await r.json();
      const history = d.messages || [];
      history.forEach(m => {
        if (m.role === 'assistant') appendAI(m.content, m.created_at);
        else if (m.role === 'user') appendUser(m.content);
      });
    } catch(e) {}

    // 如果沒有任何訊息，呼叫 visitor/start 取得開場白
    if (!msgs.querySelector('.vr-entry-ai')) {
      try {
        const r = await fetch('/visitor/start', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: sessionId })
        });
        const d = await r.json();
        if (d.reply) appendAI(d.reply, new Date().toISOString());
      } catch(e) {}
    }

    // 自動高度
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      input.style.height = 'auto';
      sendBtn.disabled = true;
      appendUser(text);
      showThinking();
      try {
        const r = await fetch('/visitor/chat', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: sessionId, message: text })
        });
        const d = await r.json();
        hideThinking();
        if (d.reply) appendAI(d.reply, new Date().toISOString());
      } catch(e) {
        hideThinking();
      }
      sendBtn.disabled = false;
      input.focus();
    }

    sendBtn.onclick = sendMessage;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // 返回
    container.querySelector('#vrBack').onclick = () => {
      window.SpaRouter.navigate('space');
    };

    // 送客
    container.querySelector('#vrEnd').onclick = async () => {
      if (!confirm('確定要送客嗎？')) return;
      try {
        const r = await fetch('/visitor/end', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: sessionId })
        });
        const d = await r.json();
        // 清掉 localStorage ack，讓訪客 bar 消失
        localStorage.removeItem('visitor_ack_' + sessionId);
        sessionStorage.removeItem('visitor_ack_' + sessionId);
        window.SpaRouter.navigate('space');
        // 跳摘要視窗（延遲等 space 掛載）
        if (d.summary && window.RifugioViews?.space?.showSummary) {
          setTimeout(() => window.RifugioViews.space.showSummary(d), 500);
        }
      } catch(e) { alert('送客失敗，請再試一次'); }
    };

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews['visitor-room'] = { mount };
})();
