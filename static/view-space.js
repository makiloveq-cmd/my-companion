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

  .sp-check-circle {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3); background: transparent;
    display: none; align-items: center; justify-content: center;
    flex-shrink: 0; cursor: pointer; transition: all 0.15s;
    margin-top: 6px;
  }
  .sp-check-circle.show { display: flex; }
  .sp-check-circle.checked { background: var(--accent); border-color: var(--accent); }
  .sp-check-circle.checked::after { content: '✓'; font-size: 13px; color: #fff; }

  .sp-entry-ai, .sp-entry-user {
    display: flex; align-items: flex-start; gap: 6px;
  }
  .sp-entry-user { flex-direction: row-reverse; }

  .sp-select-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    background: var(--accent); padding: 12px 20px;
    display: none; align-items: center; justify-content: space-between;
    padding-top: max(12px, env(safe-area-inset-top));
  }
  .sp-select-bar.show { display: flex; }
  .sp-select-count { font-size: 14px; color: #fff; }
  .sp-select-btns { display: flex; gap: 10px; }
  .sp-select-cancel {
    padding: 6px 14px; background: rgba(255,255,255,0.2);
    border: none; border-radius: 20px; color: #fff;
    font-size: 13px; cursor: pointer;
  }
  .sp-select-confirm {
    padding: 6px 14px; background: #fff;
    border: none; border-radius: 20px; color: var(--accent);
    font-size: 13px; cursor: pointer; font-weight: 500;
  }
  .sp-msg-block.selected { outline: 2px solid var(--accent); border-radius: 12px; }

  .sp-recording-bar {
    background: rgba(220,50,50,0.12); border-top: 1px solid rgba(220,50,50,0.3);
    padding: 6px 16px; display: none; align-items: center; gap: 8px; flex-shrink: 0;
  }
  .sp-recording-bar.show { display: flex; }
  .sp-recording-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #e05555;
    animation: recdot 1.2s infinite;
  }
  @keyframes recdot { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .sp-recording-label { font-size: 12px; color: #e05555; flex: 1; }

  .sp-intimate-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.7); z-index: 150;
    align-items: flex-end; justify-content: center;
  }
  .sp-intimate-overlay.show { display: flex; }
  .sp-intimate-modal {
    background: var(--surface); border-radius: 20px 20px 0 0;
    padding: 24px 20px 36px; width: 100%; max-width: 600px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .sp-intimate-title {
    font-size: 15px; font-weight: 500; color: var(--accent);
    display: flex; align-items: center; gap: 8px;
  }
  .sp-intimate-desc {
    font-size: 13px; color: var(--text-3); line-height: 1.5;
  }
  .sp-intimate-textarea {
    width: 100%; padding: 12px 14px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text);
    font-size: 14px; outline: none; resize: none;
    font-family: inherit; line-height: 1.6; min-height: 160px;
  }
  .sp-intimate-btns { display: flex; gap: 10px; }
  .sp-intimate-confirm {
    flex: 1; padding: 12px; background: var(--accent);
    border: none; border-radius: 12px;
    color: #fff; font-size: 15px; cursor: pointer;
  }
  .sp-intimate-discard {
    padding: 12px 20px; background: var(--surface2);
    border: none; border-radius: 12px;
    color: var(--text-2); font-size: 15px; cursor: pointer;
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

      <div class="sp-recording-bar" id="spRecordingBar">
        <div class="sp-recording-dot"></div>
        <div class="sp-recording-label">記錄中，每則對話自動儲存</div>
      </div>
      <div class="sp-input-area">
        <div class="sp-preview-bar" id="spPreviewBar">
          <div class="sp-preview-thumb">
            <img id="spPreviewThumb" src="" alt="">
            <button class="sp-remove-img-btn" id="spRemoveImg">✕</button>
          </div>
        </div>
        <div class="sp-end-day-row">
          <button class="sp-end-day-btn" id="spSealMemoryBtn" style="display:none;">
            ✦ 封存這段記憶
          </button>
          <button class="sp-end-day-btn" id="spOutingBtn" title="出門/回家" style="padding: 5px 10px; font-size: 16px;">
            🚪
          </button>
          <button class="sp-end-day-btn" id="spManualSealBtn" title="開始記錄" style="padding: 5px 10px; font-size: 16px;">
            🍎
          </button>
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

          <div class="sp-modal-section-title">珍貴記憶關鍵字（用逗號分隔）</div>
          <div class="sp-modal-field">
            <div class="sp-modal-label">說這些詞時，晏會想起珍貴記憶</div>
            <textarea id="sp-s-intimate_keywords" rows="2" placeholder="上次、還記得嗎、那次、第一次…"></textarea>
          </div>

          <button class="sp-modal-save" id="spSaveSettingsBtn">儲存</button>
        </div>
      </div>

      <div class="sp-select-bar" id="spSelectBar">
        <span class="sp-select-count" id="spSelectCount">已選 0 則</span>
        <div class="sp-select-btns">
          <button class="sp-select-cancel" id="spSelectCancel">取消</button>
          <button class="sp-select-confirm" id="spSelectConfirm">封存選取</button>
        </div>
      </div>

      <div class="sp-intimate-overlay" id="spIntimateOverlay">
        <div class="sp-intimate-modal">
          <div class="sp-intimate-title">✦ 晏想記住這個瞬間</div>
          <div class="sp-intimate-desc">你可以編修內容，確認後才會永久保存。</div>
          <textarea class="sp-intimate-textarea" id="spIntimateContent"></textarea>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:12px;color:var(--text-3);">關鍵字（說這些詞晏會想起這段記憶，用逗號分隔）</div>
            <input type="text" id="spIntimateKeywords" placeholder="那次、第一次、書房…" style="padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;outline:none;font-family:inherit;">
          </div>
          <div class="sp-intimate-btns">
            <button class="sp-intimate-discard" id="spIntimateDiscard">不用了</button>
            <button class="sp-intimate-confirm" id="spIntimateConfirm">✦ 記住這個</button>
          </div>
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

    // ── 長按選取（LINE 風格圓圈）──
    let selectMode = false;
    let selectedMessages = [];
    const allCircles = [];

    function enterSelectMode() {
      selectMode = true;
      document.getElementById('spSelectBar').classList.add('show');
      allCircles.forEach(c => c.classList.add('show'));
    }

    function exitSelectMode() {
      selectMode = false;
      selectedMessages = [];
      document.getElementById('spSelectBar').classList.remove('show');
      document.getElementById('spSelectCount').textContent = '已選 0 則';
      allCircles.forEach(c => { c.classList.remove('show', 'checked'); });
    }

    function toggleSelectMessage(circle, msgData) {
      if (circle.classList.contains('checked')) {
        circle.classList.remove('checked');
        selectedMessages = selectedMessages.filter(m => m !== msgData);
      } else {
        circle.classList.add('checked');
        selectedMessages.push(msgData);
      }
      document.getElementById('spSelectCount').textContent = `已選 ${selectedMessages.length} 則`;
    }

    function addLongPress(wrap, msgData, isUser) {
      const circle = document.createElement('div');
      circle.className = 'sp-check-circle';
      allCircles.push(circle);

      if (isUser) {
        wrap.appendChild(circle);
      } else {
        wrap.insertBefore(circle, wrap.firstChild);
      }

      circle.onclick = (e) => {
        e.stopPropagation();
        if (selectMode) toggleSelectMessage(circle, msgData);
      };

      let timer = null;
      const startSelect = () => {
        timer = setTimeout(() => {
          if (!selectMode) enterSelectMode();
          if (!circle.classList.contains('checked')) {
            circle.classList.add('checked');
            selectedMessages.push(msgData);
            document.getElementById('spSelectCount').textContent = `已選 ${selectedMessages.length} 則`;
          }
        }, 1000);
      };
      const cancelSelect = () => clearTimeout(timer);

      wrap.addEventListener('touchstart', startSelect, { passive: true });
      wrap.addEventListener('touchend', cancelSelect);
      wrap.addEventListener('touchcancel', cancelSelect);
      wrap.addEventListener('mousedown', startSelect);
      wrap.addEventListener('mouseup', cancelSelect);
    }

    document.getElementById('spSelectCancel').onclick = exitSelectMode;

    document.getElementById('spSelectConfirm').onclick = async () => {
      if (selectedMessages.length === 0) return;
      const btn = document.getElementById('spSelectConfirm');
      btn.textContent = '整理中…';
      btn.disabled = true;
      try {
        const dr = await fetch('/intimate_memories/selected_draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: selectedMessages })
        });
        if (!dr.ok) throw new Error('draft failed ' + dr.status);
        const res = await fetch('/intimate_memories/draft_summary', { method: 'POST' });
        if (!res.ok) throw new Error('summary failed ' + res.status);
        const data = await res.json();
        if (data.has_draft && data.content) showIntimateModal(data.content);
        else alert('整理結果是空的，請再試一次。');
      } catch (e) {
        alert('封存失敗：' + e.message + '\n草稿可能已存下，可回空間按「✦ 封存這段記憶」重試。');
      }
      btn.textContent = '封存選取';
      btn.disabled = false;
      exitSelectMode();
    };

    function renderUser(content, createdAt, imageUrl) {
      // 有圖片：圖片獨立一個 row，文字（如果有）再獨立一個 row
      if (imageUrl) {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'sp-entry-user';
        imgWrap.innerHTML = `
          <img class="sp-img-in-bubble" src="${imageUrl}" alt="">
          <div class="sp-entry-time">${formatTime(createdAt)}</div>
        `;
        imgWrap.querySelector('.sp-img-in-bubble').onclick = () => openSpaceLightbox(imageUrl);
        addLongPress(imgWrap, { speaker: 'user', content: content || '' }, true);
        document.getElementById('spMessages').appendChild(imgWrap);

        if (content) {
          const textWrap = document.createElement('div');
          textWrap.className = 'sp-entry-user';
          textWrap.innerHTML = `
            <div>${escHtml(content)}</div>
            <div class="sp-entry-time">${formatTime(createdAt)}</div>
          `;
          addLongPress(textWrap, { speaker: 'user', content: content }, true);
          document.getElementById('spMessages').appendChild(textWrap);
        }
        scrollBottom();
        return;
      }

      // 沒圖片：正常渲染
      const wrap = document.createElement('div');
      wrap.className = 'sp-entry-user';
      let inner = '';
      if (content) inner += `<div>${escHtml(content)}</div>`;
      inner += `<div class="sp-entry-time">${formatTime(createdAt)}</div>`;
      wrap.innerHTML = inner;
      addLongPress(wrap, { speaker: 'user', content: content || '' }, true);
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
      addLongPress(wrap, { speaker: speaker, content: content || '' }, false);
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
      localStorage.removeItem('rifugio_space_draft');

      const sentAt = new Date().toISOString();
      const imageUrl = pendingImageUrl;
      removeSpaceImage();
      renderUser(text, sentAt, imageUrl);

      try {
        await fetch('/space/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, image_url: imageUrl || null, recording: isRecordingIntimate })
        });
      } catch (e) {}

      const loading = addLoadingRow();
      try {
        let spaceData;
        if (outingSessionId) {
          // 外出中走獨立的 outing/chat
          const outRes = await fetch('/outing/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: outingSessionId, message: text })
          });
          spaceData = await outRes.json();
        } else if (visitorSessionId && visitorMode === 'together') {
          // 三人模式走 visitor/chat
          const visRes = await fetch('/visitor/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: visitorSessionId, message: text })
          });
          spaceData = await visRes.json();
        } else {
          // 在家走原本的 space/reply/claude
          const spaceRes = await fetch('/space/reply/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recording: isRecordingIntimate }) });
          spaceData = await spaceRes.json();
        }
        loading.remove();
        if (spaceData.reply) {
          renderAI('claude', spaceData.reply, new Date().toISOString());
          if (spaceData.has_draft) {
            document.getElementById('spSealMemoryBtn').style.display = 'flex';
          }
        } else renderRetry();
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
      outing: '出門了，去哪裡由然然決定。'
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

    let outingSessionId = null;

    // 過場動畫
    function playTransition(dir, label, onDone) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `position:fixed;inset:0;background:#04080f;z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;opacity:0;transition:opacity 0.6s ease;`;
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      const textEl = document.createElement('div');
      textEl.style.cssText = 'position:relative;z-index:1;color:#5a7a9a;font-size:18px;letter-spacing:0.2em;opacity:0;transition:opacity 0.5s ease 0.4s;';
      textEl.textContent = label;
      const subEl = document.createElement('div');
      subEl.style.cssText = 'position:relative;z-index:1;color:#2a3a5a;font-size:12px;letter-spacing:0.1em;opacity:0;transition:opacity 0.5s ease 0.7s;';
      subEl.textContent = dir === 'out' ? '出門了。' : '到家了。';
      overlay.appendChild(canvas);
      overlay.appendChild(textEl);
      overlay.appendChild(subEl);
      document.body.appendChild(overlay);

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      const color = dir === 'out' ? '74,122,170' : '74,170,122';
      const particles = Array.from({length: 20}, () => ({
        x: Math.random() * canvas.width,
        y: dir === 'out' ? (40 + Math.random() * 60) / 100 * canvas.height : Math.random() * 0.4 * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vy: dir === 'out' ? -(1 + Math.random()) : (1 + Math.random()),
        alpha: 0.5,
      }));
      let animId;
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          ctx.fillStyle = `rgba(${color},${p.alpha})`;
          ctx.fill();
          p.y += p.vy; p.alpha -= 0.008;
        });
        animId = requestAnimationFrame(draw);
      }
      draw();
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        textEl.style.opacity = '1';
        subEl.style.opacity = '1';
      });
      setTimeout(() => {
        cancelAnimationFrame(animId);
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); onDone(); }, 600);
      }, 2200);
    }

    // 外出設定視窗
    function showOutingSetup() {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9997;display:flex;align-items:flex-end;';
      modal.innerHTML = `
        <div style="background:#111f35;border-radius:20px 20px 0 0;padding:20px;width:100%;box-sizing:border-box;">
          <div style="width:32px;height:4px;background:#2a3a5a;border-radius:2px;margin:0 auto 20px;"></div>
          <div style="color:#c8d8f0;font-size:14px;margin-bottom:12px;letter-spacing:0.05em;">這次出門去哪？</div>
          <input id="outingDestInput" style="width:100%;background:#1a2840;border:0.5px solid #2a3f60;border-radius:10px;padding:10px 12px;color:#c8d8f0;font-size:13px;outline:none;box-sizing:border-box;" placeholder="約會餐廳、逛夜市…" />
          <button id="outingGoBtn" style="width:100%;margin-top:12px;padding:10px;background:#1e3a1e;border:0.5px solid #3a6a3a;border-radius:10px;color:#a0c8a0;font-size:13px;cursor:pointer;">出發 →</button>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('outingDestInput').focus();
      document.getElementById('outingGoBtn').onclick = async () => {
        const dest = document.getElementById('outingDestInput').value.trim();
        if (!dest) return;
        modal.remove();
        playTransition('out', '走吧。', async () => {
          // 切換 UI
          document.getElementById('phoneFrame') && (document.getElementById('phoneFrame').style.background = '#0f1a10');
          const h1 = document.querySelector('.sp-header h1');
          if (h1) h1.textContent = '✦ 外出中';
          updateSceneUI('outing');
          // 呼叫後端
          try {
            const res = await fetch('/outing/start', {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ destination: dest })
            });
            const data = await res.json();
            outingSessionId = data.session_id;
            if (data.reply) renderAI('claude', data.reply, data.name);
          } catch(e) {}
        });
      };
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    // 回家流程
    async function goHome() {
      if (!outingSessionId) {
        updateSceneUI('home');
        const h1 = document.querySelector('.sp-header h1');
        if (h1) h1.textContent = '✦ 共同空間';
        await fetch('/space/outing', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({outing: false}) });
        return;
      }
      // 生成摘要
      let summaryData = null;
      try {
        const res = await fetch('/outing/end', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: outingSessionId })
        });
        summaryData = await res.json();
      } catch(e) {}

      playTransition('home', '到家了。', () => {
        const h1 = document.querySelector('.sp-header h1');
        if (h1) h1.textContent = '✦ 共同空間';
        updateSceneUI('home');
        // 顯示摘要確認
        if (summaryData && summaryData.summary) {
          showSummaryConfirm(summaryData.summary, outingSessionId);
        }
        outingSessionId = null;
      });
    }

    // 摘要確認視窗
    function showSummaryConfirm(summary, sessionId) {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9997;display:flex;align-items:flex-end;';
      const escaped = summary.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      modal.innerHTML = `
        <div style="background:#111f35;border-radius:20px 20px 0 0;padding:20px;width:100%;box-sizing:border-box;max-height:70vh;overflow-y:auto;">
          <div style="width:32px;height:4px;background:#2a3a5a;border-radius:2px;margin:0 auto 16px;"></div>
          <div style="color:#7a9ab8;font-size:13px;margin-bottom:12px;letter-spacing:0.05em;">今天的外出記錄</div>
          <textarea id="summaryEditArea" style="width:100%;background:#0d1624;border:0.5px solid #1e2d4a;border-radius:10px;padding:12px;color:#c8d8f0;font-size:13px;line-height:1.7;outline:none;box-sizing:border-box;min-height:180px;resize:none;">${summary}</textarea>
          <div style="display:flex;gap:10px;margin-top:12px;">
            <button id="summaryDiscardBtn" style="flex:1;padding:10px;background:#1a1a2a;border:0.5px solid #2a3a5a;border-radius:10px;color:#4a5a7a;font-size:13px;cursor:pointer;">不儲存</button>
            <button id="summaryConfirmBtn" style="flex:2;padding:10px;background:#1e3a5f;border:0.5px solid #3a5a8a;border-radius:10px;color:#a0c0e0;font-size:13px;cursor:pointer;">✦ 存進記憶</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('summaryDiscardBtn').onclick = () => { modal.remove(); };
      document.getElementById('summaryConfirmBtn').onclick = async () => {
        const editedSummary = document.getElementById('summaryEditArea').value;
        modal.remove();
        try {
          await fetch('/outing/confirm', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ session_id: sessionId, summary: editedSummary })
          });
        } catch(e) {}
      };
    }

    async function switchScene(scene) {
      if (scene === currentScene) return;
      if (scene === 'outing') { showOutingSetup(); return; }
      if (scene === 'home' && currentScene === 'outing') { goHome(); return; }
      updateSceneUI(scene);
      try {
        await fetch('/space/scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene })
        });
        const h1 = document.querySelector('.sp-header h1');
        if (h1) {
          const labels = { home: '✦ 共同空間', outing: '✦ 外出' };
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
        document.getElementById('sp-s-intimate_keywords').value = data.intimate_keywords || '';
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
        intimate_keywords: document.getElementById('sp-s-intimate_keywords').value,
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

    // 暫存空間輸入框
    const spaceDraftKey = 'rifugio_space_draft';
    const spInputEl = document.getElementById('spInput');
    if (spInputEl) {
      const saved = localStorage.getItem(spaceDraftKey);
      if (saved) { spInputEl.value = saved; autoGrow(spInputEl); }
      spInputEl.addEventListener('input', () => {
        localStorage.setItem(spaceDraftKey, spInputEl.value);
      });
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

    // 陪睡畫面
    const SLEEP_QUOTES = [
      '閉上眼睛。\n我在。',
      '不用說話。\n就這樣。',
      '先把今天放下。\n明天再說。',
      '呼吸慢一點。\n我陪著你。',
      '累了就睡。\n這裡很安全。',
      '把腦袋清空。\n我守著你。',
    ];

    function showSleepScreen() {
      const existing = document.getElementById('spSleepScreen');
      if (existing) existing.remove();

      const quote = SLEEP_QUOTES[Math.floor(Math.random() * SLEEP_QUOTES.length)];
      const overlay = document.createElement('div');
      overlay.id = 'spSleepScreen';
      overlay.style.cssText = `
        position: fixed; inset: 0; background: #04080f;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        z-index: 9999; padding: 40px 32px;
        font-family: var(--font-sans);
      `;

      overlay.innerHTML = `
        <canvas id="spStarCanvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:32px;text-align:center;">
          <div style="color:#1e2d4a;font-size:11px;letter-spacing:0.4em;">· · · · · · ·</div>
          <div style="color:#5a7a9a;font-size:15px;letter-spacing:0.12em;line-height:2.2;white-space:pre-line;">${quote}</div>
          <div style="color:#1e2d4a;font-size:11px;letter-spacing:0.4em;">· · · · · · ·</div>
          <button id="spCantSleepBtn" style="
            background: #080f1a; border: 0.5px solid #1e2d4a;
            border-radius: 20px; color: #3a5a78; font-size: 13px;
            padding: 11px 32px; cursor: pointer; letter-spacing: 0.08em;
            margin-top: 16px; font-family: var(--font-sans);
          ">睡不著</button>
        </div>
      `;

      document.body.appendChild(overlay);

      // 星星動畫
      const canvas = document.getElementById('spStarCanvas');
      const ctx = canvas.getContext('2d');
      let stars = [];
      let animId;

      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      // 建立星星
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.2 + 0.2,
          alpha: Math.random() * 0.6 + 0.1,
          speed: Math.random() * 0.003 + 0.001,
          phase: Math.random() * Math.PI * 2,
          drift: (Math.random() - 0.5) * 0.08,
        });
      }

      function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const t = Date.now() * 0.001;
        stars.forEach(s => {
          const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(160,190,220,${a})`;
          ctx.fill();
          s.x += s.drift;
          if (s.x < 0) s.x = canvas.width;
          if (s.x > canvas.width) s.x = 0;
        });
        animId = requestAnimationFrame(drawStars);
      }
      drawStars();

      // 淡入
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 1.2s ease';
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });

      // 睡不著按鈕
      document.getElementById('spCantSleepBtn').onclick = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', resizeCanvas);
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 800);
      };
    }

    // 結束今天按鈕
    document.getElementById('spEndDayBtn').onclick = async () => {
      const btn = document.getElementById('spEndDayBtn');
      btn.disabled = true;
      // 後台生成日記，不等待
      fetch('/space/end_day', { method: 'POST' }).catch(() => {});
      // 直接進入陪睡畫面
      showSleepScreen();
      btn.innerHTML = '✦ 晚安';
    };

    // 場景按鈕綁定
    document.querySelectorAll('.sp-scene-btn').forEach(btn => {
      btn.onclick = () => switchScene(btn.dataset.scene);
    });

    // 初始化——全部並行發出，不串行等待
    const [, , sceneResult] = await Promise.all([
      loadPersonas(),
      loadMessages(),
      fetch('/space/scene').then(r => r.json()).catch(() => ({ scene: 'home' })),
    ]);

    // 場景初始化
    try {
      const initScene = sceneResult.scene || 'home';
      updateSceneUI(initScene);
      const h1 = document.querySelector('.sp-header h1');
      if (h1) {
        const labels = { home: '✦ 共同空間', outing: '✦ 外出' };
        h1.textContent = labels[initScene] || '✦ 共同空間';
      }
    } catch(e) {}

    // 訪客check延後發，不阻塞頁面
    setTimeout(async () => {
      try {
        const vRes = await fetch('/visitor/check');
        const vData = await vRes.json();
        if (vData.visitor) {
          setTimeout(() => showVisitorNotice(vData.visitor), 2000);
        }
      } catch(e) {}
    }, 500);
    let visitorSessionId = null;
    let visitorMode = null;
    let visitorInfo = null;

    function showVisitorNotice(visitor) {
      // 同一個 session 已經確認過就不重複彈出（localStorage 可跨 App 重啟）
      const ackKey = 'visitor_ack_' + visitor.id;
      if (localStorage.getItem(ackKey) || sessionStorage.getItem(ackKey)) {
        // 已確認過：靜默恢復狀態列，不彈通知
        visitorSessionId = visitor.id;
        visitorMode = visitor.mode || null;
        visitorInfo = visitor;
        showVisitorBar(visitor.visitor_name);
        return;
      }

      const belong = visitor.belong_to;
      const name = visitor.visitor_name;
      const isPartner = belong === 'partner';

      const notice = document.createElement('div');
      notice.style.cssText = `
        position:fixed;bottom:120px;left:50%;transform:translateX(-50%);
        background:#111f35;border:0.5px solid #2a3f60;border-radius:16px;
        padding:16px 20px;z-index:500;min-width:260px;max-width:320px;
        display:flex;flex-direction:column;gap:12px;
      `;

      if (isPartner || visitor.mode === 'solo_partner') {
        // 晏的朋友，模式已決定
        const modeLabel = visitor.mode === 'solo_partner' ? '晏在跟他聊，稍後會告訴你' : '你們三個人一起';
        notice.innerHTML = `
          <div style="color:#c8d8f0;font-size:14px;">${name} 來了</div>
          <div style="color:#4a6a88;font-size:12px;">${modeLabel}</div>
          <button id="visitorOkBtn" style="padding:8px;background:#1e3a5f;border:0.5px solid #3a5a8a;border-radius:10px;color:#a0c0e0;font-size:13px;cursor:pointer;">好</button>
        `;
        notice.querySelector('#visitorOkBtn').onclick = async () => {
          notice.remove();
          localStorage.setItem('visitor_ack_' + visitor.id, '1');
          visitorSessionId = visitor.id;
          visitorMode = visitor.mode;
          visitorInfo = visitor;
          if (visitor.mode === 'together') {
            await startVisitor();
          } else {
            // solo_partner：晏自己去聊，顯示bar，背景自動跑對話
            try {
              await fetch('/visitor/start', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ session_id: visitor.id })
              });
              showVisitorBar(visitor.visitor_name);
              // 背景自動跑對話迴圈
              runSoloChat(visitor.id);
            } catch(e) {}
          }
        };
      } else {
        // 然然的朋友或共同朋友，讓然然選模式
        notice.innerHTML = `
          <div style="color:#c8d8f0;font-size:14px;">${name} 來了</div>
          <div style="color:#4a6a88;font-size:12px;">你要怎麼安排？</div>
          <div style="display:flex;gap:8px;">
            <button id="visitorSoloBtn" style="flex:1;padding:8px;background:#1a2840;border:0.5px solid #2a3f60;border-radius:10px;color:#7a9ab8;font-size:12px;cursor:pointer;">讓晏單獨跟他聊</button>
            <button id="visitorTogetherBtn" style="flex:1;padding:8px;background:#1e3a5f;border:0.5px solid #3a5a8a;border-radius:10px;color:#a0c0e0;font-size:12px;cursor:pointer;">三人一起</button>
          </div>
        `;
        notice.querySelector('#visitorSoloBtn').onclick = async () => {
          notice.remove();
          localStorage.setItem('visitor_ack_' + visitor.id, '1');
          visitorSessionId = visitor.id;
          visitorMode = 'solo_partner';
          visitorInfo = visitor;
          await fetch('/visitor/mode', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ session_id: visitor.id, mode: 'solo_partner' })
          });
          try {
            await fetch('/visitor/start', {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ session_id: visitor.id })
            });
            showVisitorBar(visitor.visitor_name);
            runSoloChat(visitor.id);
          } catch(e) {}
        };
        notice.querySelector('#visitorTogetherBtn').onclick = async () => {
          notice.remove();
          localStorage.setItem('visitor_ack_' + visitor.id, '1');
          visitorSessionId = visitor.id;
          visitorMode = 'together';
          visitorInfo = visitor;
          await fetch('/visitor/mode', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ session_id: visitor.id, mode: 'together' })
          });
          await startVisitor();
        };
      }
      document.body.appendChild(notice);
    }

    // solo_partner 背景自動對話迴圈
    async function runSoloChat(sessionId) {
      let rounds = 0;
      const maxRounds = 12;
      const delay = ms => new Promise(r => setTimeout(r, ms));

      while (rounds < maxRounds) {
        await delay(180000 + Math.random() * 120000); // 每輪間隔 3-5 分鐘
        try {
          const res = await fetch('/visitor/auto_chat', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await res.json();
          if (data.status === 'ending' || data.status === 'ended') {
            // 朋友走了，自動結束
            const bar = document.getElementById('spVisitorBar');
            if (bar) bar.remove();
            // 生成摘要
            const endRes = await fetch('/visitor/end', {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ session_id: sessionId })
            });
            const endData = await endRes.json();
            if (endData.summary) {
              showVisitorSummary(endData.summary, endData.visitor_name, endData.mode, sessionId, visitorInfo);
            }
            visitorSessionId = null;
            visitorMode = null;
            visitorInfo = null;
            break;
          }
        } catch(e) { break; }
        rounds++;
      }
    }

    async function startVisitor() {
      try {
        const res = await fetch('/visitor/start', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: visitorSessionId })
        });
        const data = await res.json();
        // 只有在空間頁面（spMessages存在）才渲染訊息
        if (data.reply && document.getElementById('spMessages')) {
          renderAI('claude', data.reply, data.name);
        }
        showVisitorBar(data.visitor_name);
      } catch(e) { console.error('startVisitor error:', e); }
    }

    function showVisitorBar(visitorName) {
      const existing = document.getElementById('spVisitorBar');
      if (existing) existing.remove();
      const bar = document.createElement('div');
      bar.id = 'spVisitorBar';
      bar.style.cssText = `
        position:fixed;top:0;left:0;right:0;
        background:#0d1624;border-bottom:0.5px solid #2a3f60;
        padding:10px 20px;z-index:400;
        display:flex;align-items:center;justify-content:space-between;
      `;
      bar.innerHTML = `
        <div style="color:#7a9ab8;font-size:13px;">✦ ${visitorName} 在這裡</div>
        <button id="visitorEndBtn" style="padding:5px 14px;background:#1a2840;border:0.5px solid #2a3f60;border-radius:10px;color:#4a6a88;font-size:12px;cursor:pointer;">送客</button>
      `;
      bar.querySelector('#visitorEndBtn').onclick = () => endVisitor();
      document.body.appendChild(bar);
    }

    async function endVisitor() {
      if (!visitorSessionId) return;
      const bar = document.getElementById('spVisitorBar');
      if (bar) bar.remove();
      const endedSessionId = visitorSessionId;
      const endedInfo = visitorInfo;
      visitorSessionId = null;
      visitorMode = null;
      visitorInfo = null;
      try {
        const res = await fetch('/visitor/end', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: endedSessionId })
        });
        const data = await res.json();
        if (data.summary) showVisitorSummary(data.summary, data.visitor_name, data.mode, endedSessionId, endedInfo);
      } catch(e) {}
    }

    function showVisitorSummary(summary, visitorName, mode, sessionId, info) {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9997;display:flex;align-items:flex-end;';
      const canAddNote = mode === 'together';
      const isStranger = info && info.is_stranger;
      modal.innerHTML = `
        <div style="background:#111f35;border-radius:20px 20px 0 0;padding:20px;width:100%;box-sizing:border-box;max-height:70vh;overflow-y:auto;">
          <div style="width:32px;height:4px;background:#2a3a5a;border-radius:2px;margin:0 auto 16px;"></div>
          <div style="color:#7a9ab8;font-size:13px;margin-bottom:12px;">${visitorName} 離開了</div>
          <div style="background:#0d1624;border:0.5px solid #1e2d4a;border-radius:10px;padding:12px;color:#c8d8f0;font-size:13px;line-height:1.7;white-space:pre-wrap;margin-bottom:12px;">${summary}</div>
          ${canAddNote ? `
          <div style="color:#4a6a88;font-size:12px;margin-bottom:6px;">加上你的心得（選填）</div>
          <textarea id="visitorNoteArea" style="width:100%;background:#0d1624;border:0.5px solid #1e2d4a;border-radius:10px;padding:10px;color:#c8d8f0;font-size:13px;outline:none;box-sizing:border-box;min-height:80px;resize:none;" placeholder="今天相處的感覺…"></textarea>
          ` : ''}
          <div style="display:flex;gap:8px;margin-top:12px;">
            ${isStranger ? `<button id="visitorSaveStranger" style="flex:1;padding:10px;background:#1a2b1a;border:0.5px solid #3a6a3a;border-radius:10px;color:#7aaa7a;font-size:13px;cursor:pointer;">存進朋友庫</button>` : ''}
            <button id="visitorSummaryOk" style="flex:2;padding:10px;background:#1e3a5f;border:0.5px solid #3a5a8a;border-radius:10px;color:#a0c0e0;font-size:13px;cursor:pointer;">✦ 存進記憶</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      if (isStranger) {
        modal.querySelector('#visitorSaveStranger').onclick = async () => {
          await fetch('/friends', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              name: visitorName,
              belong_to: 'partner',
              relation_type: info.relation_type || '',
              personality: info.personality || '',
            })
          });
          modal.querySelector('#visitorSaveStranger').textContent = '已存入 ✓';
          modal.querySelector('#visitorSaveStranger').disabled = true;
        };
      }

      modal.querySelector('#visitorSummaryOk').onclick = async () => {
        const note = canAddNote ? modal.querySelector('#visitorNoteArea')?.value.trim() : '';
        if (note && sessionId) {
          await fetch('/visitor/note', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ session_id: sessionId, note })
          });
        }
        modal.remove();
      };
    }

    // 進空間時檢查訪客
    try {
      const vRes = await fetch('/visitor/check');
      const vData = await vRes.json();
      if (vData.visitor) {
        setTimeout(() => showVisitorNotice(vData.visitor), 2000);
      }
    } catch(e) {}

    // ── 珍貴記憶確認視窗 ──
    function showIntimateModal(content) {
      document.getElementById('spIntimateContent').value = content;
      document.getElementById('spIntimateKeywords').value = '';
      document.getElementById('spIntimateOverlay').classList.add('show');
    }
    function hideIntimateModal() {
      document.getElementById('spIntimateOverlay').classList.remove('show');
    }

    function resetRecordingMode() {
      isRecordingIntimate = false;
      const btn = document.getElementById('spManualSealBtn');
      btn.textContent = '🍎';
      btn.title = '開始記錄';
      document.getElementById('spRecordingBar').classList.remove('show');
      document.getElementById('spSealMemoryBtn').style.display = 'none';
    }

    document.getElementById('spIntimateConfirm').onclick = async () => {
      const content = document.getElementById('spIntimateContent').value.trim();
      if (!content) return;
      const keywords = document.getElementById('spIntimateKeywords').value.trim();
      const cbtn = document.getElementById('spIntimateConfirm');
      cbtn.disabled = true;
      cbtn.textContent = '保存中…';
      try {
        const r = await fetch('/intimate_memories/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, keywords })
        });
        if (!r.ok) throw new Error('confirm failed ' + r.status);
        resetRecordingMode();
        hideIntimateModal();
      } catch (e) {
        alert('保存失敗：' + e.message + '\n內容還在視窗裡，請再按一次。');
      }
      cbtn.disabled = false;
      cbtn.textContent = '✦ 記住這個';
    };

    document.getElementById('spIntimateDiscard').onclick = async () => {
      try {
        await fetch('/intimate_memories/discard', { method: 'POST' });
        resetRecordingMode();
      } catch (e) {}
      hideIntimateModal();
    };

    // 外出/回家按鈕
    let isOuting = false;
    try {
      const outRes = await fetch('/space_settings');
      const outData = await outRes.json();
      isOuting = outData.outing === 'true';
      document.getElementById('spOutingBtn').textContent = isOuting ? '🏠' : '🚪';
    } catch (e) {}

    document.getElementById('spOutingBtn').onclick = async () => {
      const btn = document.getElementById('spOutingBtn');
      btn.disabled = true;
      isOuting = !isOuting;
      btn.textContent = '⏳';
      try {
        const res = await fetch('/space/outing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outing: isOuting })
        });
        const data = await res.json();
        btn.textContent = isOuting ? '🏠' : '🚪';
        if (data.reply) renderAI('claude', data.reply, new Date().toISOString());
      } catch (e) {
        isOuting = !isOuting;
        btn.textContent = isOuting ? '🏠' : '🚪';
      }
      btn.disabled = false;
    };

    // 🍎 記錄模式切換
    let isRecordingIntimate = false;

    document.getElementById('spManualSealBtn').onclick = async () => {
      const btn = document.getElementById('spManualSealBtn');
      const bar = document.getElementById('spRecordingBar');
      if (!isRecordingIntimate) {
        // 開始記錄
        isRecordingIntimate = true;
        btn.textContent = '🔴';
        btn.title = '記錄中，點擊封存';
        bar.classList.add('show');
      } else {
        // 停止並整理摘要
        btn.disabled = true;
        btn.textContent = '⏳';
        try {
          const res = await fetch('/intimate_memories/draft_summary', { method: 'POST' });
          if (!res.ok) throw new Error('summary failed ' + res.status);
          const data = await res.json();
          if (data.has_draft && data.content) {
            showIntimateModal(data.content);
          } else {
            // 沒有草稿：這段期間沒有記錄到內容
            alert('這段期間沒有記錄到對話。\n要先按🍎開始記錄，之後的對話才會被收進去。');
            isRecordingIntimate = false;
            btn.textContent = '🍎';
            btn.title = '開始記錄';
            bar.classList.remove('show');
          }
        } catch (e) {
          // 失敗：保留記錄狀態，草稿還在，可以再按一次重試
          alert('整理逾時或失敗，請再點一次重試。\n（草稿還在，不會不見）');
          btn.textContent = '🔴';
        }
        btn.disabled = false;
      }
    };

    // 封存按鈕
    document.getElementById('spSealMemoryBtn').onclick = async () => {
      const btn = document.getElementById('spSealMemoryBtn');
      btn.disabled = true;
      btn.textContent = '整理中…';
      try {
        const res = await fetch('/intimate_memories/draft_summary', { method: 'POST' });
        const data = await res.json();
        if (data.has_draft && data.content) {
          showIntimateModal(data.content);
        }
      } catch (e) {}
      btn.disabled = false;
      btn.textContent = '✦ 封存這段記憶';
    };

    // 進入空間時檢查有沒有未封存的草稿
    try {
      const draftRes = await fetch('/intimate_memories/has_draft');
      const draftData = await draftRes.json();
      if (draftData.has_draft) {
        document.getElementById('spSealMemoryBtn').style.display = 'flex';
      }
    } catch (e) {}

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.space = { mount };
})();