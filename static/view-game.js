// ═══ View: 遊戲廳 ═══
(function () {
  const STYLE_ID = 'view-game-style';
  const CSS = `
  .gm-wrap {
    display: flex; flex-direction: column; height: 100%;
    background: var(--bg);
  }

  /* ── 主頁 ── */
  .gm-home {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 32px; padding: 40px 24px; flex: 1;
  }
  .gm-home-title {
    font-size: 22px; font-weight: 400; color: var(--text);
    letter-spacing: 0.1em; text-align: center;
  }
  .gm-home-subtitle {
    font-size: 13px; color: var(--text-3); text-align: center;
    line-height: 1.7; margin-top: -20px;
  }
  .gm-home-btns {
    display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 320px;
  }
  .gm-btn-primary {
    padding: 14px; background: var(--accent);
    border: none; border-radius: 14px;
    color: #fff; font-size: 16px; cursor: pointer;
    letter-spacing: 0.05em;
  }
  .gm-btn-secondary {
    padding: 14px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 14px;
    color: var(--text-2); font-size: 15px; cursor: pointer;
  }

  /* ── 回憶錄 ── */
  .gm-archive {
    display: flex; flex-direction: column; height: 100%;
  }
  .gm-archive-header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .gm-back-btn {
    font-size: 20px; color: var(--text-3); background: none;
    border: none; cursor: pointer; padding: 4px;
  }
  .gm-archive-header h1 { font-size: 17px; font-weight: 400; }
  .gm-archive-list {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .gm-archive-empty {
    text-align: center; color: var(--text-3);
    font-size: 14px; padding: 40px 0;
  }
  .gm-archive-item {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
  }
  .gm-archive-item-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; cursor: pointer;
  }
  .gm-archive-item-header:active { background: var(--surface2); }
  .gm-archive-item-left { display: flex; flex-direction: column; gap: 4px; }
  .gm-archive-item-title { font-size: 15px; color: var(--text); }
  .gm-archive-item-date { font-size: 11px; color: var(--text-3); }
  .gm-archive-item-arrow { color: var(--text-3); transition: transform .2s; }
  .gm-archive-item-arrow.open { transform: rotate(90deg); }
  .gm-archive-item-body {
    display: none; padding: 0 16px 16px;
    font-size: 13px; color: var(--text-2);
    line-height: 1.8; border-top: 1px solid var(--border);
    padding-top: 12px; white-space: pre-wrap;
  }

  /* ── 設定頁 ── */
  .gm-setup {
    display: flex; flex-direction: column; height: 100%;
  }
  .gm-setup-header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .gm-setup-header h1 { font-size: 17px; font-weight: 400; }
  .gm-setup-body {
    flex: 1; overflow-y: auto; padding: 24px 20px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .gm-setup-hint {
    font-size: 13px; color: var(--text-3); line-height: 1.7;
  }
  .gm-setup-label {
    font-size: 12px; color: var(--text-3); margin-bottom: 6px;
    letter-spacing: 0.06em;
  }
  .gm-setup-textarea {
    width: 100%; padding: 12px 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text);
    font-size: 15px; outline: none; resize: none;
    font-family: inherit; line-height: 1.7;
    box-sizing: border-box;
  }
  .gm-setup-start {
    padding: 14px; background: var(--accent);
    border: none; border-radius: 14px;
    color: #fff; font-size: 16px; cursor: pointer;
    margin-top: 8px;
  }
  .gm-setup-start:disabled { opacity: 0.4; cursor: default; }

  /* ── 遊戲中 ── */
  .gm-game {
    display: flex; flex-direction: column; height: 100%;
  }
  .gm-game-header {
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-shrink: 0;
  }
  .gm-game-header-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 4px;
  }
  .gm-game-title { font-size: 15px; color: var(--text-2); }
  .gm-end-btn {
    font-size: 12px; color: var(--text-3);
    background: none; border: 1px solid var(--border);
    border-radius: 10px; padding: 4px 10px; cursor: pointer;
  }
  .gm-setting-preview {
    font-size: 12px; color: var(--text-3);
    line-height: 1.5; overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .gm-messages {
    flex: 1; overflow-y: auto;
    padding: 24px 20px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .gm-entry-user {
    align-self: flex-end; max-width: 75%;
    background: var(--bubble-user); color: #fff;
    padding: 12px 16px; border-radius: 16px 16px 4px 16px;
    font-size: 15px; line-height: 1.7; white-space: pre-wrap;
  }
  .gm-entry-user .gm-time { font-size: 11px; opacity: 0.7; margin-top: 4px; text-align: right; }
  .gm-entry-ai {
    align-self: flex-start; max-width: 88%;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .gm-av {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--surface3); color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 500; flex-shrink: 0; overflow: hidden;
  }
  .gm-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .gm-content-wrap { display: flex; flex-direction: column; gap: 4px; }
  .gm-speaker-name { font-size: 12px; color: var(--text-3); padding: 0 2px; }
  .gm-bubble {
    background: var(--bubble-ai); border: 1px solid var(--border);
    border-radius: 4px 16px 16px 16px;
    padding: 14px 16px; font-size: 15px; line-height: 1.9;
    color: var(--text); white-space: pre-wrap;
  }
  .gm-time { font-size: 11px; color: var(--text-3); padding: 0 2px; }
  .gm-loading-wrap { display: flex; gap: 10px; align-items: flex-start; }
  .gm-loading-dots {
    background: var(--bubble-ai); border: 1px solid var(--border);
    border-radius: 4px 16px 16px 16px;
    padding: 14px 20px; font-size: 20px;
    color: var(--text-3); letter-spacing: 4px;
    animation: gm-pulse 1.2s infinite;
  }
  @keyframes gm-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
  .gm-input-area {
    background: var(--surface); border-top: 1px solid var(--border);
    padding: 10px 12px max(14px, env(safe-area-inset-bottom));
    flex-shrink: 0;
  }
  .gm-input-row { display: flex; gap: 8px; align-items: flex-end; }
  .gm-input-wrapper { flex: 1; position: relative; }
  .gm-input-wrapper textarea {
    width: 100%; padding: 9px 36px 9px 14px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 22px; color: var(--text);
    font-size: 15px; outline: none; resize: none;
    font-family: inherit; max-height: 140px; line-height: 1.6;
    overflow-y: auto;
  }
  .gm-newline-btn {
    position: absolute; right: 8px; bottom: 7px;
    width: 24px; height: 24px; border: none; background: transparent;
    color: var(--text-3); border-radius: 6px; font-size: 13px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .gm-send-btn {
    width: 38px; height: 38px; flex-shrink: 0;
    background: var(--accent); border: none; border-radius: 50%;
    color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .gm-send-btn:disabled { opacity: 0.4; cursor: default; }

  /* ── 結束對話框 ── */
  .gm-end-modal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); z-index: 100;
    align-items: flex-end; justify-content: center;
  }
  .gm-end-modal-overlay.show { display: flex; }
  .gm-end-modal {
    background: var(--surface); border-radius: 20px 20px 0 0;
    padding: 24px 20px max(32px, env(safe-area-inset-bottom));
    width: 100%; max-width: 600px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .gm-end-modal-title { font-size: 16px; font-weight: 500; }
  .gm-end-modal-hint { font-size: 13px; color: var(--text-3); line-height: 1.6; }
  .gm-end-modal input {
    padding: 12px 14px; background: var(--bg);
    border: 1px solid var(--border); border-radius: 12px;
    color: var(--text); font-size: 15px; outline: none;
    font-family: inherit; width: 100%; box-sizing: border-box;
  }
  .gm-end-modal-btns { display: flex; gap: 10px; }
  .gm-end-cancel {
    flex: 1; padding: 12px; background: var(--surface2);
    border: none; border-radius: 12px;
    color: var(--text-2); font-size: 15px; cursor: pointer;
  }
  .gm-end-confirm {
    flex: 2; padding: 12px; background: var(--accent);
    border: none; border-radius: 12px;
    color: #fff; font-size: 15px; cursor: pointer;
  }
  .gm-end-confirm:disabled { opacity: 0.4; cursor: default; }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  async function mount(el) {
    ensureStyle();
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    // 讀角色名稱和頭像
    let botName = '晏', botAvatar = null;
    try {
      const res = await fetch('/personas');
      const data = await res.json();
      botName = data.claude?.name || '晏';
      botAvatar = data.claude?.avatar || null;
    } catch (e) {}

    // 狀態
    let currentView = 'home'; // home | archive | setup | game
    let gameMessages = []; // {role, content}
    let gameSetting = '';
    let isSending = false;

    function formatTime(iso) {
      if (!iso) return '';
      let s = iso;
      if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
      const d = new Date(s);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    function escHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── 主頁 ──
    function renderHome() {
      currentView = 'home';
      el.innerHTML = `
        <div class="gm-wrap">
          <div class="gm-home">
            <div>
              <div class="gm-home-title">遊戲廳</div>
            </div>
            <div class="gm-home-subtitle">角色扮演，寫下時代與身份<br>然後，開始演。</div>
            <div class="gm-home-btns">
              <button class="gm-btn-primary" id="gmStartBtn">開始新劇本</button>
              <button class="gm-btn-secondary" id="gmArchiveBtn">回憶錄</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('gmStartBtn').onclick = renderSetup;
      document.getElementById('gmArchiveBtn').onclick = renderArchive;
    }

    // ── 回憶錄 ──
    async function renderArchive() {
      currentView = 'archive';
      el.innerHTML = `
        <div class="gm-archive">
          <div class="gm-archive-header">
            <button class="gm-back-btn" id="gmArchiveBack">‹</button>
            <h1>回憶錄</h1>
          </div>
          <div class="gm-archive-list" id="gmArchiveList">
            <div class="gm-archive-empty">載入中…</div>
          </div>
        </div>
      `;
      document.getElementById('gmArchiveBack').onclick = renderHome;

      try {
        const res = await fetch('/game/sessions');
        const data = await res.json();
        const list = document.getElementById('gmArchiveList');
        if (!data.sessions || data.sessions.length === 0) {
          list.innerHTML = '<div class="gm-archive-empty">還沒有劇本紀錄</div>';
          return;
        }
        list.innerHTML = '';
        data.sessions.forEach(s => {
          const d = new Date((s.created_at || '').replace('Z','') + 'Z');
          const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
          const item = document.createElement('div');
          item.className = 'gm-archive-item';
          item.innerHTML = `
            <div class="gm-archive-item-header">
              <div class="gm-archive-item-left">
                <div class="gm-archive-item-title">${escHtml(s.title || '無題')}</div>
                <div class="gm-archive-item-date">${dateStr}</div>
              </div>
              <span class="gm-archive-item-arrow">›</span>
            </div>
            <div class="gm-archive-item-body">${escHtml(s.summary || '（無摘要）')}</div>
          `;
          const header = item.querySelector('.gm-archive-item-header');
          const body = item.querySelector('.gm-archive-item-body');
          const arrow = item.querySelector('.gm-archive-item-arrow');
          header.onclick = () => {
            const isOpen = body.style.display !== 'none' && body.style.display !== '';
            body.style.display = isOpen ? 'none' : 'block';
            arrow.classList.toggle('open', !isOpen);
          };
          list.appendChild(item);
        });
      } catch (e) {
        document.getElementById('gmArchiveList').innerHTML = '<div class="gm-archive-empty">載入失敗</div>';
      }
    }

    // ── 設定頁 ──
    function renderSetup() {
      currentView = 'setup';
      el.innerHTML = `
        <div class="gm-setup">
          <div class="gm-setup-header">
            <button class="gm-back-btn" id="gmSetupBack">‹</button>
            <h1>劇本設定</h1>
          </div>
          <div class="gm-setup-body">
            <div class="gm-setup-hint">
              寫下這個故事的時代、身份與裝扮。<br>
              例如：「維多利亞年代。你是剛來報到的家庭教師，穿深色西裝、白色襯衫。我是大戶人家的女兒，身著深藍塔夫綢裙，髮型梳得整齊。下午的書房，初次見面。」
            </div>
            <div>
              <div class="gm-setup-label">時代、身份與裝扮</div>
              <textarea class="gm-setup-textarea" id="gmSettingInput" rows="6" placeholder="在這裡寫下開場設定…"></textarea>
            </div>
            <button class="gm-btn-primary gm-setup-start" id="gmStartGame">開幕</button>
          </div>
        </div>
      `;
      document.getElementById('gmSetupBack').onclick = renderHome;
      const startBtn = document.getElementById('gmStartGame');
      const settingInput = document.getElementById('gmSettingInput');
      settingInput.oninput = () => {
        startBtn.disabled = !settingInput.value.trim();
      };
      startBtn.disabled = true;
      startBtn.onclick = () => {
        gameSetting = settingInput.value.trim();
        if (gameSetting) startGame();
      };
    }

    // ── 遊戲中 ──
    async function startGame() {
      currentView = 'game';
      gameMessages = [];
      renderGame();
      // 送出開場設定，取得第一段回應
      const loading = addGameLoading();
      try {
        const res = await fetch('/game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: gameSetting })
        });
        const data = await res.json();
        loading.remove();
        if (data.reply) {
          gameMessages.push({ role: 'assistant', content: data.reply });
          appendGameAI(data.reply);
        }
      } catch (e) {
        loading.remove();
      }
    }

    function renderGame() {
      el.innerHTML = `
        <div class="gm-game">
          <div class="gm-game-header">
            <div class="gm-game-header-top">
              <span class="gm-game-title">✦ 進行中</span>
              <button class="gm-end-btn" id="gmEndBtn">結束遊戲</button>
            </div>
            <div class="gm-setting-preview">${escHtml(gameSetting)}</div>
          </div>
          <div class="gm-messages" id="gmMessages"></div>
          <div class="gm-input-area">
            <div class="gm-input-row">
              <div class="gm-input-wrapper">
                <textarea id="gmInput" rows="1" placeholder="繼續劇情…"></textarea>
                <button class="gm-newline-btn" id="gmNewlineBtn">⏎</button>
              </div>
              <button class="gm-send-btn" id="gmSendBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="gm-end-modal-overlay" id="gmEndModal">
          <div class="gm-end-modal">
            <div class="gm-end-modal-title">結束這個劇本</div>
            <div class="gm-end-modal-hint">幫這個故事取個名字，系統會自動整理摘要存進回憶錄。</div>
            <input id="gmTitleInput" placeholder="劇本名稱…" maxlength="30">
            <div class="gm-end-modal-btns">
              <button class="gm-end-cancel" id="gmEndCancel">取消</button>
              <button class="gm-end-confirm" id="gmEndConfirm">儲存並結束</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('gmSendBtn').onclick = sendGameMessage;
      document.getElementById('gmNewlineBtn').onclick = () => {
        const ta = document.getElementById('gmInput');
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '\n' + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 1;
        autoGrow(ta);
        ta.focus();
      };
      document.getElementById('gmInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGameMessage(); }
      });
      document.getElementById('gmInput').addEventListener('input', (e) => autoGrow(e.target));
      document.getElementById('gmEndBtn').onclick = () => {
        document.getElementById('gmEndModal').classList.add('show');
        document.getElementById('gmTitleInput').focus();
      };
      document.getElementById('gmEndCancel').onclick = () => {
        document.getElementById('gmEndModal').classList.remove('show');
      };
      document.getElementById('gmEndConfirm').onclick = endGame;
    }

    function autoGrow(el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }

    function scrollBottom() {
      const m = document.getElementById('gmMessages');
      if (m) m.scrollTop = m.scrollHeight;
    }

    function appendGameUser(text) {
      const wrap = document.createElement('div');
      wrap.className = 'gm-entry-user';
      wrap.innerHTML = `<div>${escHtml(text)}</div><div class="gm-time">${formatTime(new Date().toISOString())}</div>`;
      document.getElementById('gmMessages').appendChild(wrap);
      scrollBottom();
    }

    function appendGameAI(text) {
      const wrap = document.createElement('div');
      wrap.className = 'gm-entry-ai';
      const av = document.createElement('div');
      av.className = 'gm-av';
      if (botAvatar && botAvatar.startsWith('data:')) {
        const img = document.createElement('img');
        img.src = botAvatar;
        av.appendChild(img);
      } else {
        av.textContent = botName[0];
      }
      const contentWrap = document.createElement('div');
      contentWrap.className = 'gm-content-wrap';
      contentWrap.innerHTML = `
        <div class="gm-speaker-name">${escHtml(botName)}</div>
        <div class="gm-bubble">${escHtml(text)}</div>
        <div class="gm-time">${formatTime(new Date().toISOString())}</div>
      `;
      wrap.appendChild(av);
      wrap.appendChild(contentWrap);
      document.getElementById('gmMessages').appendChild(wrap);
      scrollBottom();
    }

    function addGameLoading() {
      const wrap = document.createElement('div');
      wrap.className = 'gm-loading-wrap';
      const av = document.createElement('div');
      av.className = 'gm-av';
      av.textContent = botName[0];
      const dots = document.createElement('div');
      dots.className = 'gm-loading-dots';
      dots.textContent = '···';
      wrap.appendChild(av);
      wrap.appendChild(dots);
      const msgs = document.getElementById('gmMessages');
      if (msgs) { msgs.appendChild(wrap); scrollBottom(); }
      return wrap;
    }

    async function sendGameMessage() {
      const input = document.getElementById('gmInput');
      if (!input) return;
      const text = input.value.trim();
      if (!text || isSending) return;
      isSending = true;
      document.getElementById('gmSendBtn').disabled = true;
      input.value = '';
      input.style.height = 'auto';

      gameMessages.push({ role: 'user', content: text });
      appendGameUser(text);

      const loading = addGameLoading();
      try {
        const res = await fetch('/game/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: gameSetting, messages: gameMessages })
        });
        const data = await res.json();
        loading.remove();
        if (data.reply) {
          gameMessages.push({ role: 'assistant', content: data.reply });
          appendGameAI(data.reply);
        }
      } catch (e) {
        loading.remove();
      } finally {
        isSending = false;
        const btn = document.getElementById('gmSendBtn');
        if (btn) btn.disabled = false;
      }
    }

    async function endGame() {
      const titleInput = document.getElementById('gmTitleInput');
      const title = titleInput ? titleInput.value.trim() : '';
      if (!title) { if (titleInput) titleInput.focus(); return; }

      const confirmBtn = document.getElementById('gmEndConfirm');
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '儲存中…'; }

      try {
        await fetch('/game/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: gameSetting, messages: gameMessages, title })
        });
      } catch (e) {}

      renderHome();
    }

    renderHome();
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.game = { mount };
})();
