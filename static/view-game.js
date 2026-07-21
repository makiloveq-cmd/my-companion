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

  /* ── 我的世界 ── */
  .gm-worlds { display: flex; flex-direction: column; height: 100%; }
  .gm-world-item {
    background: var(--surface); border-radius: 14px; margin: 0 16px 10px;
    overflow: hidden; border: 1px solid var(--border);
  }
  .gm-world-item-header {
    padding: 14px 16px; display: flex; align-items: center;
    justify-content: space-between; cursor: pointer;
  }
  .gm-world-item-header:active { background: var(--surface2); }
  .gm-world-left { display: flex; flex-direction: column; gap: 3px; }
  .gm-world-title { font-size: 15px; color: var(--text); }
  .gm-world-meta { font-size: 11px; color: var(--text-3); }
  .gm-world-status {
    font-size: 10px; padding: 2px 8px; border-radius: 10px;
    border: 1px solid var(--border); color: var(--text-3);
  }
  .gm-world-status.playing { border-color: var(--accent); color: var(--accent); }
  .gm-world-btns { display: flex; gap: 8px; padding: 0 16px 14px; }
  .gm-world-continue {
    flex: 1; padding: 9px; background: var(--accent);
    border: none; border-radius: 10px; color: #fff;
    font-size: 14px; cursor: pointer; font-family: inherit;
  }
  .gm-world-pause {
    padding: 9px 14px; background: var(--surface2);
    border: none; border-radius: 10px; color: var(--text-2);
    font-size: 14px; cursor: pointer; font-family: inherit;
  }

  /* ── 封存確認視窗 ── */
  .gm-seal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.7); z-index: 150;
    align-items: flex-end; justify-content: center;
  }
  .gm-seal-overlay.show { display: flex; }
  .gm-seal-modal {
    background: var(--surface); border-radius: 20px 20px 0 0;
    padding: 24px 20px 36px; width: 100%; max-width: 600px;
    display: flex; flex-direction: column; gap: 12px;
    max-height: 85vh; overflow-y: auto;
  }
  .gm-seal-title { font-size: 15px; font-weight: 500; color: var(--accent); }
  .gm-seal-desc { font-size: 13px; color: var(--text-3); line-height: 1.6; }
  .gm-seal-textarea {
    padding: 12px 14px; background: var(--bg);
    border: 1px solid var(--border); border-radius: 12px;
    color: var(--text); font-size: 14px; outline: none;
    resize: none; font-family: inherit; line-height: 1.6; min-height: 120px;
  }
  .gm-seal-btns { display: flex; gap: 10px; }
  .gm-seal-cancel {
    padding: 11px 18px; background: var(--surface2);
    border: none; border-radius: 12px;
    color: var(--text-2); font-size: 14px; cursor: pointer;
  }
  .gm-seal-confirm {
    flex: 1; padding: 11px; background: var(--accent);
    border: none; border-radius: 12px;
    color: #fff; font-size: 14px; cursor: pointer;
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
    let currentView = 'home';
    let currentSessionId = null; // home | archive | setup | game
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
              <button class="gm-btn-secondary" id="gmWorldsBtn">我的世界</button>
              <button class="gm-btn-secondary" id="gmArchiveBtn">回憶錄</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('gmStartBtn').onclick = renderSetup;
      document.getElementById('gmWorldsBtn').onclick = renderWorlds;
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
    async function startGame(sessionId = null, existingMessages = null) {
      currentView = 'game';
      currentSessionId = sessionId;
      gameMessages = existingMessages || [];
      renderGame();
      if (existingMessages && existingMessages.length > 0) {
        // 繼續舊世界，重新渲染歷史
        existingMessages.forEach(m => {
          if (m.role === 'user') appendGameUser(m.content);
          else appendGameAI(m.content);
        });
        return;
      }
      // 新遊戲，先建立 session 取得 id
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
          currentSessionId = data.session_id || null;
          gameMessages.push({ role: 'assistant', content: data.reply });
          appendGameAI(data.reply);
        }
      } catch (e) {
        loading.remove();
      }
    }

    async function pauseGame() {
      try {
        await fetch('/game/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: gameSetting, messages: gameMessages, title: gameSetting.slice(0, 20), session_id: currentSessionId })
        });
      } catch (e) {}
      renderHome();
    }

    async function renderWorlds() {
      currentView = 'worlds';
      el.innerHTML = `
        <div class="gm-worlds">
          <div class="gm-archive-header">
            <button class="gm-back-btn" id="gmWorldsBack">‹</button>
            <h1>我的世界</h1>
          </div>
          <div class="gm-archive-list" id="gmWorldsList" style="padding-top:12px;">
            <div class="gm-archive-empty">載入中…</div>
          </div>
        </div>
      `;
      document.getElementById('gmWorldsBack').onclick = renderHome;
      try {
        const res = await fetch('/game/sessions?status=active');
        const data = await res.json();
        const list = document.getElementById('gmWorldsList');
        if (!data.sessions || data.sessions.length === 0) {
          list.innerHTML = '<div class="gm-archive-empty">還沒有進行中的世界</div>';
          return;
        }
        list.innerHTML = '';
        data.sessions.forEach(s => {
          const statusLabel = s.status === 'playing' ? '進行中' : '暫停中';
          const item = document.createElement('div');
          item.className = 'gm-world-item';
          item.innerHTML = `
            <div class="gm-world-item-header">
              <div class="gm-world-left">
                <div class="gm-world-title">${escHtml(s.title || s.setting?.slice(0, 20) || '無題')}</div>
                <div class="gm-world-meta">${s.updated_at ? new Date(s.updated_at).toLocaleDateString('zh-TW') : ''}</div>
              </div>
              <span class="gm-world-status ${s.status}">${statusLabel}</span>
            </div>
            <div class="gm-world-btns">
              <button class="gm-world-continue" data-id="${s.id}">繼續</button>
            </div>
          `;
          item.querySelector('.gm-world-continue').onclick = () => {
            gameSetting = s.setting || '';
            startGame(s.id, s.messages || []);
          };
          list.appendChild(item);
        });
      } catch (e) {
        document.getElementById('gmWorldsList').innerHTML = '<div class="gm-archive-empty">載入失敗</div>';
      }
    }

    function renderGame() {
      el.innerHTML = `
        <div class="gm-game">
          <div class="gm-game-header">
            <div class="gm-game-header-top">
              <span class="gm-game-title">✦ 進行中</span>
              <button class="gm-pause-btn" id="gmPauseBtn">暫停</button>
              <button class="gm-end-btn" id="gmEndBtn">封存</button>
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
            <div class="gm-end-modal-title">封存這個劇本</div>
            <div class="gm-end-modal-hint">幫這個故事取個名字，晏會先整理摘要讓你確認。</div>
            <input id="gmTitleInput" placeholder="劇本名稱…" maxlength="30">
            <div class="gm-end-modal-btns">
              <button class="gm-end-cancel" id="gmEndCancel">取消</button>
              <button class="gm-end-confirm" id="gmEndConfirm">整理摘要</button>
            </div>
          </div>
        </div>

        <div class="gm-seal-overlay" id="gmSealOverlay">
          <div class="gm-seal-modal">
            <div class="gm-seal-title">✦ 封存前確認</div>
            <div class="gm-seal-desc">這是晏整理的劇本摘要，你可以直接編修。</div>
            <textarea class="gm-seal-textarea" id="gmSealSummary"></textarea>
            <div class="gm-seal-btns">
              <button class="gm-seal-cancel" id="gmSealCancel">不封存了</button>
              <button class="gm-seal-confirm" id="gmSealConfirm">✦ 封存進回憶錄</button>
            </div>
          </div>
        </div>
      `;

      // 暫存遊戲廳輸入框
      const gameDraftKey = 'rifugio_game_draft';
      const gmInputEl = document.getElementById('gmInput');
      if (gmInputEl) {
        const saved = localStorage.getItem(gameDraftKey);
        if (saved) { gmInputEl.value = saved; autoGrow(gmInputEl); }
        gmInputEl.addEventListener('input', () => {
          localStorage.setItem(gameDraftKey, gmInputEl.value);
        });
      }

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
      document.getElementById('gmPauseBtn').onclick = () => pauseGame();
      document.getElementById('gmEndBtn').onclick = () => {
        document.getElementById('gmEndModal').classList.add('show');
        document.getElementById('gmTitleInput').focus();
      };
      document.getElementById('gmEndCancel').onclick = () => {
        document.getElementById('gmEndModal').classList.remove('show');
      };
      document.getElementById('gmEndConfirm').onclick = async () => {
        const titleInput = document.getElementById('gmTitleInput');
        const title = titleInput ? titleInput.value.trim() : '';
        if (!title) { if (titleInput) titleInput.focus(); return; }
        const confirmBtn = document.getElementById('gmEndConfirm');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '整理中…'; }
        document.getElementById('gmEndModal').classList.remove('show');
        try {
          const res = await fetch('/game/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting: gameSetting, messages: gameMessages, title })
          });
          const data = await res.json();
          if (data.summary) {
            document.getElementById('gmSealSummary').value = data.summary;
            document.getElementById('gmSealOverlay').classList.add('show');
            document.getElementById('gmSealConfirm').onclick = async () => {
              const summary = document.getElementById('gmSealSummary').value.trim();
              await fetch('/game/seal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setting: gameSetting, messages: gameMessages, title, summary, session_id: currentSessionId })
              });
              document.getElementById('gmSealOverlay').classList.remove('show');
              renderHome();
            };
            document.getElementById('gmSealCancel').onclick = () => {
              document.getElementById('gmSealOverlay').classList.remove('show');
            };
          }
        } catch (e) {}
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = '整理摘要'; }
      };
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
      localStorage.removeItem('rifugio_game_draft');
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
          if (currentSessionId) {
            fetch('/game/autosave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: currentSessionId, messages: gameMessages })
            }).catch(() => {});
          }
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
    return function cleanup() {
      // 清除所有可能殘留的 fixed overlay（避免換頁後蓋在其他頁面上）
      ['gmEndModal', 'gmSealOverlay'].forEach(id => {
        const el2 = document.getElementById(id);
        if (el2) el2.classList.remove('show');
      });
    };
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.game = { mount };
})();
