// ═══ View: 共同空間（真正 SPA 化）═══
(function () {
  const STYLE_ID = 'view-space-style';
  const CSS = `
  .sp-header {
    padding: 14px 20px; background: var(--surface);
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .sp-header h1 { font-size: 17px; font-weight: 400; flex: 1; }
  .sp-header-setting { font-size: 20px; cursor: pointer; color: var(--text-3); padding: 4px; }

  .sp-messages {
    flex: 1; overflow-y: auto;
    padding: 24px 20px;
    display: flex; flex-direction: column; gap: 20px;
  }

  .sp-entry-user {
    align-self: flex-end; max-width: 75%;
    background: var(--bubble-user); color: #fff;
    padding: 12px 16px;
    border-radius: 16px 16px 4px 16px;
    font-size: 15px; line-height: 1.7; white-space: pre-wrap;
  }
  .sp-entry-user .sp-entry-time { font-size: 11px; opacity: 0.7; margin-top: 4px; text-align: right; }

  .sp-entry-ai {
    align-self: flex-start; max-width: 88%;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .sp-entry-ai .sp-av {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--surface3); color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 500; flex-shrink: 0; overflow: hidden;
  }
  .sp-entry-ai .sp-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .sp-content-wrap { display: flex; flex-direction: column; gap: 4px; }
  .sp-speaker-name { font-size: 12px; color: var(--text-3); padding: 0 2px; }
  .sp-bubble {
    background: var(--bubble-ai); border: 1px solid var(--border);
    border-radius: 4px 16px 16px 16px;
    padding: 14px 16px; font-size: 15px; line-height: 1.9;
    color: var(--text); white-space: pre-wrap;
  }
  .sp-entry-time { font-size: 11px; color: var(--text-3); padding: 0 2px; }

  .sp-entry-background {
    align-self: flex-start; max-width: 88%;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .sp-entry-background .sp-av {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--surface2); color: var(--text-3);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0; overflow: hidden; opacity: 0.6;
  }
  .sp-entry-background .sp-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .sp-entry-background .sp-speaker-name { opacity: 0.7; }
  .sp-bg-text {
    font-size: 13px; line-height: 1.7;
    color: var(--text-3); font-style: italic;
    padding: 2px 4px; white-space: pre-wrap;
  }
  .sp-entry-background .sp-entry-time { opacity: 0.6; }

  .sp-loading-wrap { display: flex; gap: 10px; align-items: flex-start; }
  .sp-loading-wrap .sp-av {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--surface3);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: var(--text-2); flex-shrink: 0;
    overflow: hidden;
  }
  .sp-loading-dots {
    background: var(--bubble-ai); border: 1px solid var(--border);
    border-radius: 4px 16px 16px 16px;
    padding: 14px 20px; font-size: 20px;
    color: var(--text-3); letter-spacing: 4px;
    animation: sp-pulse 1.2s infinite;
  }
  @keyframes sp-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }

  .sp-input-area {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 10px 12px max(14px, env(safe-area-inset-bottom));
    flex-shrink: 0;
  }
  .sp-end-day-row {
    display: flex; justify-content: flex-end;
    margin-bottom: 6px;
  }
  .sp-end-day-btn {
    padding: 5px 14px;
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: 20px;
    color: var(--text-3);
    font-size: 13px;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    font-family: inherit;
  }
  .sp-end-day-btn:active { opacity: 0.6; }
  .sp-end-day-btn:disabled { opacity: 0.4; cursor: default; }
  .sp-input-hint { font-size: 12px; color: var(--text-3); margin-bottom: 6px; padding: 0 2px; }
  .sp-input-row { display: flex; gap: 8px; align-items: flex-end; }
  .sp-input-wrapper { flex: 1; position: relative; }
  .sp-input-wrapper textarea {
    width: 100%; padding: 9px 36px 9px 14px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 22px; color: var(--text);
    font-size: 15px; outline: none; resize: none;
    font-family: inherit; max-height: 140px; line-height: 1.6; overflow-y: auto;
  }
  .sp-newline-btn {
    position: absolute; right: 8px; bottom: 7px;
    width: 24px; height: 24px; border: none; background: transparent;
    color: var(--text-3); border-radius: 6px; font-size: 13px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .sp-send-btn {
    width: 38px; height: 38px; flex-shrink: 0;
    background: var(--accent); border: none; border-radius: 50%;
    color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .sp-send-btn:active { opacity: 0.8; }
  .sp-send-btn:disabled { opacity: 0.4; cursor: default; }

  .sp-preview-bar {
    display: none; padding: 6px 12px 0;
    background: var(--surface);
  }
  .sp-preview-bar.show { display: block; }
  .sp-preview-thumb {
    position: relative; display: inline-block;
  }
  .sp-preview-thumb img {
    height: 60px; width: 60px; object-fit: cover;
    border-radius: 8px; border: 1px solid var(--border);
  }
  .sp-remove-img-btn {
    position: absolute; top: -6px; right: -6px;
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--text-3); color: #fff;
    border: none; font-size: 10px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .sp-img-in-bubble {
    max-width: 220px; max-height: 220px;
    border-radius: 10px; margin-bottom: 6px;
    display: block; cursor: pointer;
    object-fit: cover;
  }
  .sp-lightbox {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.85); z-index: 200;
    align-items: center; justify-content: center;
  }
  .sp-lightbox.show { display: flex; }
  .sp-lightbox img {
    max-width: 92vw; max-height: 88vh;
    border-radius: 10px; object-fit: contain;
  }

  .sp-modal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); z-index: 100;
    align-items: flex-end; justify-content: center;
  }
  .sp-modal-overlay.show { display: flex; }
  .sp-modal {
    background: var(--surface); border-radius: 20px 20px 0 0;
    padding: 24px 20px 36px; width: 100%; max-width: 600px;
    display: flex; flex-direction: column; gap: 14px;
    max-height: 85vh; overflow-y: auto;
  }
  .sp-modal-title {
    font-size: 16px; font-weight: 500;
    display: flex; justify-content: space-between; align-items: center;
  }
  .sp-modal-close { font-size: 20px; cursor: pointer; color: var(--text-3); }
  .sp-modal-section-title {
    font-size: 11px; color: var(--text-3); text-transform: uppercase;
    letter-spacing: 0.08em; padding-top: 4px;
    border-top: 1px solid var(--border); margin-top: 4px;
  }
  .sp-modal-field { display: flex; flex-direction: column; gap: 6px; }
  .sp-modal-label { font-size: 13px; color: var(--text-2); }
  .sp-modal-field textarea {
    padding: 10px 14px; background: var(--bg);
    border: 1px solid var(--border); border-radius: 12px;
    color: var(--text); font-size: 14px; outline: none;
    resize: none; font-family: inherit; line-height: 1.5;
  }
  .sp-modal-save {
    padding: 12px; background: var(--accent);
    border: none; border-radius: 12px;
    color: #fff; font-size: 15px; cursor: pointer; margin-top: 4px;
  }
  .sp-scene-row {
    display: flex; gap: 8px; margin-bottom: 2px;
  }
  .sp-scene-btn {
    flex: 1; padding: 10px 6px;
    background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 12px; color: var(--text-2);
    font-size: 14px; cursor: pointer;
    transition: all 0.15s;
  }
  .sp-scene-btn.active {
    background: var(--accent); color: #fff;
    border-color: var(--accent);
  }
  .sp-scene-hint {
    font-size: 12px; color: var(--text-3);
    min-height: 16px; padding: 0 2px;
  }
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

    el.innerHTML = `
      <div class="sp-header">
        <h1>✦ 共同空間</h1>
        <div class="sp-header-setting" id="spSettingBtn" title="空間設定">⚙</div>
      </div>

      <div class="sp-messages" id="spMessages"></div>

      <div class="sp-input-area">
        <div class="sp-preview-bar" id="spPreviewBar">
          <div class="sp-preview-thumb">
            <img id="spPreviewThumb" src="" alt="">
            <button class="sp-remove-img-btn" id="spRemoveImg">✕</button>
          </div>
        </div>
        <div class="sp-end-day-row">
          <button class="sp-end-day-btn" id="spEndDayBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            結束今天
          </button>
        </div>
        <div class="sp-input-hint">描述你在做什麼，或對晏說話…</div>
        <div class="sp-input-row">
          <button class="sp-send-btn" style="background:transparent;color:var(--text-3);" id="spImgBtn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input type="file" id="spImageInput" accept="image/*" style="display:none">
          <div class="sp-input-wrapper">
            <textarea id="spInput" rows="1" placeholder="「我回來了！」推開門，把包包放到玄關…"></textarea>
            <button class="sp-newline-btn" id="spNewlineBtn">⏎</button>
          </div>
          <button class="sp-send-btn" id="spSendBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="sp-lightbox" id="spLightbox"><img id="spLightboxImg" src="" alt=""></div>

      <div class="sp-modal-overlay" id="spSettingModal">
        <div class="sp-modal">
          <div class="sp-modal-title">
            空間設定
            <span class="sp-modal-close" id="spModalClose">✕</span>
          </div>

          <div class="sp-modal-section-title">場景</div>
          <div class="sp-scene-row" id="spSceneRow">
            <button class="sp-scene-btn" data-scene="home" id="sceneHome">🏠 家</button>
            <button class="sp-scene-btn" data-scene="cinema" id="sceneCinema">🎬 放映廳</button>
            <button class="sp-scene-btn" data-scene="outing" id="sceneOuting">✦ 外出</button>
          </div>
          <div class="sp-scene-hint" id="spSceneHint"></div>

          <div class="sp-modal-section-title">基本氛圍</div>
          <div class="sp-modal-field">
            <div class="sp-modal-label">空間描述</div>
            <textarea id="sp-s-room_desc" rows="2" placeholder="這是一間什麼樣的空間？整體感受…"></textarea>
          </div>
          <div class="sp-modal-field">
            <div class="sp-modal-label">氛圍</div>
            <textarea id="sp-s-atmosphere" rows="2" placeholder="溫暖、安靜、昏黃的燈光、總是放著音樂…"></textarea>
          </div>

          <div class="sp-modal-section-title">空間細節</div>
          <div class="sp-modal-field">
            <div class="sp-modal-label">房間布局</div>
            <textarea id="sp-s-layout" rows="2" placeholder="客廳在入口右側、廚房在走廊盡頭…"></textarea>
          </div>
          <div class="sp-modal-field">
            <div class="sp-modal-label">家具擺設</div>
            <textarea id="sp-s-furniture" rows="2" placeholder="沙發、書桌、燈、植物…"></textarea>
          </div>
          <div class="sp-modal-field">
            <div class="sp-modal-label">角落細節</div>
            <textarea id="sp-s-corner_details" rows="2" placeholder="書架第二層有仙人掌、玄關有舊木椅…"></textarea>
          </div>

          <div class="sp-modal-section-title">慣常位置（用逗號或頓號分隔多個地點）</div>
          <div class="sp-modal-field">
            <div class="sp-modal-label" id="spLabelClaudeSpots">晏常待的地方</div>
            <textarea id="sp-s-claude_spots" rows="2" placeholder="書房、沙發角落、廚房流理台旁…"></textarea>
          </div>

          <button class="sp-modal-save" id="spSaveSettingsBtn">儲存</button>
        </div>
      </div>
    `;

    let names = { user: '然然', claude: '晏' };
    let avatars = { user: null, claude: null };
    let isSending = false;
    let pendingImageUrl = null;

    function removeSpaceImage() {
      pendingImageUrl = null;
      document.getElementById('spPreviewBar').classList.remove('show');
      document.getElementById('spPreviewThumb').src = '';
    }

    function openSpaceLightbox(src) {
      document.getElementById('spLightboxImg').src = src;
      document.getElementById('spLightbox').classList.add('show');
    }

    document.addEventListener('click', (e) => {
      const lb = document.getElementById('spLightbox');
      if (lb && lb.classList.contains('show') && e.target === lb) {
        lb.classList.remove('show');
      }
    });

    function formatTime(isoStr) {
      if (!isoStr) return '';
      let s = isoStr;
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

    async function loadPersonas() {
      try {
        const res = await fetch('/personas');
        const data = await res.json();
        names.user = data.user?.name || names.user;
        names.claude = data.claude?.name || names.claude;
        avatars.claude = data.claude?.avatar || null;
        avatars.user = data.user?.avatar || null;
        const label = document.getElementById('spLabelClaudeSpots');
        if (label) label.textContent = `${names.claude}常待的地方`;
        const hint = document.getElementById('spInputHint');
        if (hint) hint.textContent = `描述你在做什麼，或對${names.claude}說話…`;
      } catch (e) {}
    }

    function makeAv(speaker, dim) {
      const av = document.createElement('div');
      av.className = 'sp-av';
      if (dim) av.style.opacity = '0.5';
      const src = avatars[speaker];
      if (src && src.startsWith('data:')) {
        const img = document.createElement('img');
        img.src = src;
        av.appendChild(img);
      } else {
        av.textContent = (names[speaker] || speaker)[0];
      }
      return av;
    }

    function escHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function scrollBottom() {
      const m = document.getElementById('spMessages');
      if (m) m.scrollTop = m.scrollHeight;
    }

    function renderUser(content, createdAt, imageUrl) {
      const wrap = document.createElement('div');
      wrap.className = 'sp-entry-user';
      let inner = '';
      if (imageUrl) inner += `<img class="sp-img-in-bubble" src="${imageUrl}" alt="">`;
      if (content) inner += `<div>${escHtml(content)}</div>`;
      inner += `<div class="sp-entry-time">${formatTime(createdAt)}</div>`;
      wrap.innerHTML = inner;
      if (imageUrl) {
        wrap.querySelector('.sp-img-in-bubble').onclick = () => openSpaceLightbox(imageUrl);
      }
      document.getElementById('spMessages').appendChild(wrap);
      scrollBottom();
    }

    function renderAI(speaker, content, createdAt) {
      const wrap = document.createElement('div');
      wrap.className = 'sp-entry-ai';
      const av = makeAv(speaker);
      const contentWrap = document.createElement('div');
      contentWrap.className = 'sp-content-wrap';
      contentWrap.innerHTML = `
        <div class="sp-speaker-name">${escHtml(names[speaker] || speaker)}</div>
        <div class="sp-bubble">${escHtml(content)}</div>
        <div class="sp-entry-time">${formatTime(createdAt)}</div>
      `;
      wrap.appendChild(av);
      wrap.appendChild(contentWrap);
      document.getElementById('spMessages').appendChild(wrap);
      scrollBottom();
    }

    function renderBackground(speaker, content, createdAt) {
      const wrap = document.createElement('div');
      wrap.className = 'sp-entry-background';
      const av = makeAv(speaker, true);
      const contentWrap = document.createElement('div');
      contentWrap.className = 'sp-content-wrap';
      contentWrap.innerHTML = `
        <div class="sp-speaker-name">${escHtml(names[speaker] || speaker)}</div>
        <div class="sp-bg-text">${escHtml(content)}</div>
        <div class="sp-entry-time">${formatTime(createdAt)}</div>
      `;
      wrap.appendChild(av);
      wrap.appendChild(contentWrap);
      document.getElementById('spMessages').appendChild(wrap);
      scrollBottom();
    }

    function addLoadingRow() {
      const wrap = document.createElement('div');
      wrap.className = 'sp-loading-wrap';
      const av = makeAv('claude');
      const dots = document.createElement('div');
      dots.className = 'sp-loading-dots';
      dots.textContent = '···';
      wrap.appendChild(av);
      wrap.appendChild(dots);
      document.getElementById('spMessages').appendChild(wrap);
      scrollBottom();
      return wrap;
    }

    function renderRetry() {
      const wrap = document.createElement('div');
      wrap.className = 'sp-entry-ai';
      const av = makeAv('claude');
      const contentWrap = document.createElement('div');
      contentWrap.className = 'sp-content-wrap';
      const nameEl = document.createElement('div');
      nameEl.className = 'sp-speaker-name';
      nameEl.textContent = names.claude;
      const errBubble = document.createElement('div');
      errBubble.className = 'sp-bubble';
      errBubble.style.cssText = 'color:var(--text-3);font-size:13px;';
      errBubble.textContent = '連線失敗';
      const retryBtn = document.createElement('button');
      retryBtn.textContent = '重試';
      retryBtn.style.cssText = 'margin-top:6px;padding:5px 14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:13px;cursor:pointer;';
      retryBtn.onclick = async () => {
        wrap.remove();
        const loading = addLoadingRow();
        try {
          const res = await fetch('/space/reply/claude', { method: 'POST' });
          const data = await res.json();
          loading.remove();
          if (data.reply) renderAI('claude', data.reply, new Date().toISOString());
          else renderRetry();
        } catch (e) {
          loading.remove();
          renderRetry();
        }
      };
      contentWrap.appendChild(nameEl);
      contentWrap.appendChild(errBubble);
      contentWrap.appendChild(retryBtn);
      wrap.appendChild(av);
      wrap.appendChild(contentWrap);
      document.getElementById('spMessages').appendChild(wrap);
      scrollBottom();
    }

    async function loadMessages() {
      try {
        const res = await fetch('/space/messages');
        const data = await res.json();
        const messages = document.getElementById('spMessages');
        if (!messages) return;
        messages.innerHTML = '';
        data.messages.forEach(m => {
          if (m.speaker === 'user') {
            renderUser(m.content, m.created_at, m.image_url);
          } else if (m.message_type === 'background') {
            renderBackground(m.speaker, m.content, m.created_at);
          } else {
            renderAI(m.speaker, m.content, m.created_at);
          }
        });
      } catch (e) {}
    }

    async function trySpaceReply() {
      try {
        const res = await fetch('/space/reply/claude', { method: 'POST' });
        const data = await res.json();
        if (data.reply) return data.reply;
        throw new Error('no reply');
      } catch (e) {
        try {
          const res2 = await fetch('/space/reply/claude', { method: 'POST' });
          const data2 = await res2.json();
          if (data2.reply) return data2.reply;
        } catch (e2) {}
        return null;
      }
    }

    async function sendAction() {
      const input = document.getElementById('spInput');
      const text = input.value.trim();
      if ((!text && !pendingImageUrl) || isSending) return;

      isSending = true;
      document.getElementById('spSendBtn').disabled = true;
      input.value = '';
      input.style.height = 'auto';

      const sentAt = new Date().toISOString();
      const imageUrl = pendingImageUrl;
      removeSpaceImage();
      renderUser(text, sentAt, imageUrl);

      try {
        await fetch('/space/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, image_url: imageUrl || null })
        });
      } catch (e) {}

      const loading = addLoadingRow();
      try {
        const reply = await trySpaceReply();
        loading.remove();
        if (reply) renderAI('claude', reply, new Date().toISOString());
        else renderRetry();
        try {
          const relRes = await fetch('/relationship_stats');
          const relData = await relRes.json();
          if (window.StageUnlock) {
            window.StageUnlock.checkAndShow(relData.stage, relData.prev_stage);
          }
        } catch (e) {}
      } catch (e) {
        loading.remove();
        renderRetry();
      } finally {
        isSending = false;
        document.getElementById('spSendBtn').disabled = false;
      }
    }

    function autoGrow(elx) {
      elx.style.height = 'auto';
      elx.style.height = elx.scrollHeight + 'px';
    }
    function insertNewline() {
      const elx = document.getElementById('spInput');
      const s = elx.selectionStart, end = elx.selectionEnd;
      elx.value = elx.value.slice(0, s) + '\n' + elx.value.slice(end);
      elx.selectionStart = elx.selectionEnd = s + 1;
      autoGrow(elx);
      elx.focus();
    }

    const SCENE_HINTS = {
      home: '整個家都在這裡，廚房、浴室、臥室隨意走動。',
      cinema: '家裡的放映廳，投影和劇院音響，想看什麼都行。',
      outing: '出門了，去哪裡由然然決定，切換時會自動記下出門前的狀態。'
    };
    let currentScene = 'home';

    function updateSceneUI(scene) {
      currentScene = scene;
      document.querySelectorAll('.sp-scene-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scene === scene);
      });
      const hint = document.getElementById('spSceneHint');
      if (hint) hint.textContent = SCENE_HINTS[scene] || '';
    }

    async function switchScene(scene) {
      if (scene === currentScene) return;
      updateSceneUI(scene);
      try {
        await fetch('/space/scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene })
        });
        const h1 = document.querySelector('.sp-header h1');
        if (h1) {
          const labels = { home: '✦ 共同空間', cinema: '✦ 放映廳', outing: '✦ 外出' };
          h1.textContent = labels[scene] || '✦ 共同空間';
        }
      } catch (e) {}
    }

    async function openSettings() {
      try {
        const res = await fetch('/space_settings');
        const data = await res.json();
        document.getElementById('sp-s-room_desc').value = data.room_desc || '';
        document.getElementById('sp-s-atmosphere').value = data.atmosphere || '';
        document.getElementById('sp-s-layout').value = data.layout || '';
        document.getElementById('sp-s-furniture').value = data.furniture || '';
        document.getElementById('sp-s-corner_details').value = data.corner_details || '';
        document.getElementById('sp-s-claude_spots').value = data.claude_spots || '';
        updateSceneUI(data.scene || 'home');
      } catch (e) {}
      document.getElementById('spSettingModal').classList.add('show');
    }

    function closeSettings() {
      document.getElementById('spSettingModal').classList.remove('show');
    }

    async function saveSettings() {
      const payload = {
        room_desc: document.getElementById('sp-s-room_desc').value,
        atmosphere: document.getElementById('sp-s-atmosphere').value,
        layout: document.getElementById('sp-s-layout').value,
        furniture: document.getElementById('sp-s-furniture').value,
        corner_details: document.getElementById('sp-s-corner_details').value,
        claude_spots: document.getElementById('sp-s-claude_spots').value,
      };
      try {
        await fetch('/space_settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {}
      closeSettings();
    }

    // 綁定事件
    document.getElementById('spSendBtn').onclick = sendAction;
    document.getElementById('spNewlineBtn').onclick = insertNewline;
    document.getElementById('spInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAction(); }
    });
    document.getElementById('spInput').addEventListener('input', (e) => autoGrow(e.target));
    document.getElementById('spSettingBtn').onclick = openSettings;
    document.getElementById('spModalClose').onclick = closeSettings;
    document.getElementById('spSaveSettingsBtn').onclick = saveSettings;
    document.getElementById('spRemoveImg').onclick = removeSpaceImage;
    document.getElementById('spImgBtn').onclick = () => document.getElementById('spImageInput').click();
    document.getElementById('spImageInput').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.getElementById('spPreviewThumb').src = URL.createObjectURL(file);
      document.getElementById('spPreviewBar').classList.add('show');
      pendingImageUrl = null;
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await fetch('/upload_space_image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) { pendingImageUrl = data.url; }
        else { alert('圖片上傳失敗'); removeSpaceImage(); }
      } catch (err) { alert('圖片上傳失敗'); removeSpaceImage(); }
      e.target.value = '';
    };

    // 結束今天按鈕
    document.getElementById('spEndDayBtn').onclick = async () => {
      const btn = document.getElementById('spEndDayBtn');
      btn.disabled = true;
      try {
        await fetch('/space/end_day', { method: 'POST' });
        btn.innerHTML = '✦ 晚安';
      } catch (e) {
        btn.disabled = false;
      }
    };

    // 場景按鈕綁定
    document.querySelectorAll('.sp-scene-btn').forEach(btn => {
      btn.onclick = () => switchScene(btn.dataset.scene);
    });

    // 初始化場景狀態
    try {
      const sceneRes = await fetch('/space/scene');
      const sceneData = await sceneRes.json();
      const initScene = sceneData.scene || 'home';
      updateSceneUI(initScene);
      const h1 = document.querySelector('.sp-header h1');
      if (h1) {
        const labels = { home: '✦ 共同空間', cinema: '✦ 放映廳', outing: '✦ 外出' };
        h1.textContent = labels[initScene] || '✦ 共同空間';
      }
    } catch (e) {}

    await Promise.all([loadPersonas(), loadMessages()]);

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.space = { mount };
})();