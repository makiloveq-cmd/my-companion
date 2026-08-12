// ═══ View: 遊戲廳 ═══
(function () {
  const STYLE_ID = 'view-game-style';
  const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,500;1,500&family=IM+Fell+English:ital@0;1&family=Libre+Baskerville:wght@400;700&display=swap');

  .gm-wrap { display: flex; flex-direction: column; height: 100%; background: var(--bg); }

  /* ── 主頁 ── */
  .gm-home { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; padding: 40px 24px; flex: 1; }
  .gm-home-title { font-size: 22px; font-weight: 400; color: var(--text); letter-spacing: 0.1em; text-align: center; }
  .gm-home-subtitle { font-size: 13px; color: var(--text-3); text-align: center; line-height: 1.7; margin-top: -20px; }
  .gm-home-btns { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 320px; }
  .gm-btn-primary { padding: 14px; background: var(--accent); border: none; border-radius: 14px; color: #fff; font-size: 16px; cursor: pointer; letter-spacing: 0.05em; }
  .gm-btn-secondary { padding: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; color: var(--text-2); font-size: 15px; cursor: pointer; }

  /* ── 我的世界 ── */
  .gm-worlds { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .gm-world-item { background: var(--surface); border-radius: 14px; margin: 0 16px 10px; overflow: hidden; border: 1px solid var(--border); }
  .gm-world-item-header { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
  .gm-world-item-header:active { background: var(--surface2); }
  .gm-world-left { display: flex; flex-direction: column; gap: 3px; }
  .gm-world-title { font-size: 15px; color: var(--text); }
  .gm-world-meta { font-size: 11px; color: var(--text-3); }
  .gm-world-status { font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border); color: var(--text-3); }
  .gm-world-status.playing { border-color: var(--accent); color: var(--accent); }
  .gm-world-btns { display: flex; gap: 8px; padding: 0 16px 14px; }
  .gm-world-continue { flex: 1; padding: 9px; background: var(--accent); border: none; border-radius: 10px; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }
  .gm-world-pause { padding: 9px 14px; background: var(--surface2); border: none; border-radius: 10px; color: var(--text-2); font-size: 14px; cursor: pointer; font-family: inherit; }

  /* ── 封存確認視窗 ── */
  .gm-seal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 150; align-items: flex-end; justify-content: center; }
  .gm-seal-overlay.show { display: flex; }
  .gm-seal-modal { background: var(--surface); border-radius: 20px 20px 0 0; padding: 24px 20px 36px; width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 12px; max-height: 90vh; overflow-y: auto; }
  .gm-seal-title { font-size: 15px; font-weight: 500; color: var(--accent); }
  .gm-seal-desc { font-size: 13px; color: var(--text-3); line-height: 1.6; }
  .gm-seal-input { padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; outline: none; font-family: inherit; width: 100%; box-sizing: border-box; }
  .gm-seal-label { font-size: 12px; color: var(--text-3); margin-bottom: 4px; letter-spacing: 0.05em; }
  .gm-seal-select { padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; outline: none; font-family: inherit; width: 100%; box-sizing: border-box; }
  .gm-seal-textarea { padding: 12px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; color: var(--text); font-size: 14px; outline: none; resize: none; font-family: inherit; line-height: 1.6; min-height: 120px; width: 100%; box-sizing: border-box; }
  .gm-seal-btns { display: flex; gap: 10px; }
  .gm-seal-cancel { padding: 11px 18px; background: var(--surface2); border: none; border-radius: 12px; color: var(--text-2); font-size: 14px; cursor: pointer; }
  .gm-seal-confirm { flex: 1; padding: 11px; background: var(--accent); border: none; border-radius: 12px; color: #fff; font-size: 14px; cursor: pointer; }
  .gm-seal-confirm:disabled { opacity: 0.4; cursor: default; }
  .gm-seal-divider { border: none; border-top: 1px solid var(--border); margin: 4px 0; }

  /* ── 回憶錄：書架 ── */
  .gm-archive { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .gm-archive-header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
  .gm-back-btn { font-size: 20px; color: var(--text-3); background: none; border: none; cursor: pointer; padding: 4px; }
  .gm-archive-header h1 { font-size: 17px; font-weight: 400; }
  .gm-archive-body { flex: 1; overflow-y: auto; padding: 20px 16px 32px; }

  /* 書架木板 */
  .gm-shelf-wrap { position: relative; padding-bottom: 14px; margin-bottom: 8px; }
  .gm-shelf-board { position: absolute; bottom: 0; left: -4px; right: -4px; height: 12px; background: var(--surface3, #1a1510); border-radius: 0 0 4px 4px; }
  .gm-shelf-board::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--border); }
  .gm-books-row { display: flex; align-items: flex-end; gap: 3px; padding: 0 4px; overflow-x: auto; }
  .gm-books-row::-webkit-scrollbar { display: none; }

  /* 書脊 */
  .gm-spine { display: flex; flex-direction: column; align-items: center; justify-content: space-between; cursor: pointer; position: relative; transition: transform .18s; padding: 10px 0 8px; border-radius: 2px 1px 1px 2px; flex-shrink: 0; }
  .gm-spine:hover { transform: translateY(-7px); }
  .gm-spine:active { transform: translateY(-3px); }
  .gm-spine::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 2px 0 0 2px; background: rgba(255,255,255,0.07); }
  .gm-spine-title { writing-mode: vertical-lr; text-orientation: mixed; font-size: 11px; letter-spacing: 0.13em; line-height: 1; z-index: 1; padding: 0 3px; text-align: center; }
  .gm-spine-num { writing-mode: vertical-lr; font-size: 9px; letter-spacing: 0.06em; z-index: 1; opacity: 0.6; font-family: -apple-system, sans-serif; }
  .gm-spine-deco { width: 13px; height: 1px; z-index: 1; opacity: 0.4; }
  .gm-spine-new { width: 26px; border: 1px dashed var(--border); border-radius: 2px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.35; transition: opacity .15s; flex-shrink: 0; height: 140px; }
  .gm-spine-new:hover { opacity: 0.7; }

  /* 書架標籤 */
  .gm-shelf-label { font-size: 10px; letter-spacing: 2px; color: var(--text-3); text-transform: uppercase; margin: 16px 0 8px 4px; }

  /* 書籍詳情展開 */
  .gm-book-detail { background: var(--surface); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; display: none; margin-top: 16px; }
  .gm-book-detail.show { display: block; }
  .gm-book-detail-cover { padding: 14px; border-bottom: 1px solid var(--border); display: flex; gap: 10px; }
  .gm-book-spine-mini { width: 7px; border-radius: 2px 0 0 2px; flex-shrink: 0; align-self: stretch; }
  .gm-book-info { flex: 1; }
  .gm-book-tag { font-size: 10px; letter-spacing: 1.5px; color: var(--text-3); text-transform: uppercase; margin-bottom: 5px; }
  .gm-book-title { font-size: 15px; color: var(--text); font-weight: 500; margin-bottom: 4px; }
  .gm-book-desc { font-size: 12px; color: var(--text-3); line-height: 1.65; }
  .gm-book-chapters { padding: 8px 14px 4px; }
  .gm-ch-item { display: flex; align-items: center; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .gm-ch-item:last-child { border-bottom: none; }
  .gm-ch-num { font-size: 10px; color: var(--text-3); min-width: 36px; }
  .gm-ch-title { font-size: 13px; color: var(--text-2); flex: 1; }
  .gm-ch-rounds { font-size: 11px; color: var(--text-3); }
  .gm-ch-arrow { font-size: 13px; color: var(--text-3); }

  /* 章節摘要展開 */
  .gm-ch-summary { padding: 10px 14px 14px 50px; font-size: 13px; color: var(--text-2); line-height: 1.75; display: none; white-space: pre-wrap; border-bottom: 1px solid var(--border); }
  .gm-ch-summary.open { display: block; }

  /* 孤兒 sessions */
  .gm-orphan-section { margin-top: 24px; }
  .gm-orphan-item { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .gm-orphan-title { font-size: 13px; color: var(--text-2); flex: 1; }
  .gm-orphan-date { font-size: 11px; color: var(--text-3); }
  .gm-assign-btn { font-size: 12px; padding: 5px 12px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border); color: var(--text-2); cursor: pointer; flex-shrink: 0; }

  /* ── 設定頁 ── */
  .gm-setup { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .gm-setup-header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--surface); }
  .gm-setup-header h1 { font-size: 17px; font-weight: 400; }
  .gm-setup-body { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; }
  .gm-setup-hint { font-size: 13px; color: var(--text-3); line-height: 1.7; }
  .gm-setup-label { font-size: 12px; color: var(--text-3); margin-bottom: 6px; letter-spacing: 0.06em; }
  .gm-setup-textarea { width: 100%; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; color: var(--text); font-size: 15px; outline: none; resize: none; font-family: inherit; line-height: 1.7; box-sizing: border-box; }
  .gm-setup-start { padding: 14px; background: var(--accent); border: none; border-radius: 14px; color: #fff; font-size: 16px; cursor: pointer; margin-top: 8px; }
  .gm-setup-start:disabled { opacity: 0.4; cursor: default; }

  /* ── 遊戲中 ── */
  .gm-game { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .gm-game-header { padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
  .gm-game-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 6px; }
  .gm-game-title { font-size: 13px; color: var(--text-2); flex: 1; }
  .gm-pause-btn { font-size: 12px; color: var(--text-3); background: none; border: 1px solid var(--border); border-radius: 10px; padding: 4px 10px; cursor: pointer; white-space: nowrap; }
  .gm-chapter-btn { font-size: 12px; color: var(--accent); background: none; border: 1px solid var(--accent); border-radius: 10px; padding: 4px 10px; cursor: pointer; white-space: nowrap; opacity: 0.85; }
  .gm-end-btn { font-size: 12px; color: var(--text-3); background: none; border: 1px solid var(--border); border-radius: 10px; padding: 4px 10px; cursor: pointer; white-space: nowrap; }
  .gm-setting-preview { font-size: 12px; color: var(--text-3); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .gm-messages { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; }
  .gm-entry-user { align-self: flex-end; max-width: 75%; background: var(--bubble-user); color: #fff; padding: 12px 16px; border-radius: 16px 16px 4px 16px; font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
  .gm-entry-user .gm-time { font-size: 11px; opacity: 0.7; margin-top: 4px; text-align: right; }
  .gm-entry-ai { align-self: flex-start; max-width: 88%; display: flex; gap: 10px; align-items: flex-start; }
  .gm-av { width: 36px; height: 36px; border-radius: 50%; background: var(--surface3); color: var(--text-2); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; flex-shrink: 0; overflow: hidden; }
  .gm-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .gm-content-wrap { display: flex; flex-direction: column; gap: 4px; }
  .gm-speaker-name { font-size: 12px; color: var(--text-3); padding: 0 2px; }
  .gm-bubble { background: var(--bubble-ai); border: 1px solid var(--border); border-radius: 4px 16px 16px 16px; padding: 14px 16px; font-size: 15px; line-height: 1.9; color: var(--text); white-space: pre-wrap; }
  .gm-time { font-size: 11px; color: var(--text-3); padding: 0 2px; }
  .gm-loading-wrap { display: flex; gap: 10px; align-items: flex-start; }
  .gm-loading-dots { background: var(--bubble-ai); border: 1px solid var(--border); border-radius: 4px 16px 16px 16px; padding: 14px 20px; font-size: 20px; color: var(--text-3); letter-spacing: 4px; animation: gm-pulse 1.2s infinite; }
  @keyframes gm-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
  .gm-input-area { background: var(--surface); border-top: 1px solid var(--border); padding: 10px 12px max(14px, env(safe-area-inset-bottom)); flex-shrink: 0; }
  .gm-input-row { display: flex; gap: 8px; align-items: flex-end; }
  .gm-input-wrapper { flex: 1; position: relative; }
  .gm-input-wrapper textarea { width: 100%; padding: 9px 36px 9px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 22px; color: var(--text); font-size: 15px; outline: none; resize: none; font-family: inherit; max-height: 140px; line-height: 1.6; overflow-y: auto; }
  .gm-newline-btn { position: absolute; right: 8px; bottom: 7px; width: 24px; height: 24px; border: none; background: transparent; color: var(--text-3); border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .gm-send-btn { width: 38px; height: 38px; flex-shrink: 0; background: var(--accent); border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .gm-send-btn:disabled { opacity: 0.4; cursor: default; }

  /* ── 遊戲中 modal ── */
  .gm-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 150; align-items: flex-end; justify-content: center; }
  .gm-modal-overlay.show { display: flex; }
  .gm-modal { background: var(--surface); border-radius: 20px 20px 0 0; padding: 24px 20px max(36px, env(safe-area-inset-bottom)); width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 12px; max-height: 90vh; overflow-y: auto; }
  .gm-modal-title { font-size: 15px; font-weight: 500; color: var(--accent); }
  .gm-modal-desc { font-size: 13px; color: var(--text-3); line-height: 1.6; }
  .gm-modal-btns { display: flex; gap: 10px; margin-top: 4px; }
  .gm-modal-cancel { padding: 11px 18px; background: var(--surface2); border: none; border-radius: 12px; color: var(--text-2); font-size: 14px; cursor: pointer; }
  .gm-modal-confirm { flex: 1; padding: 11px; background: var(--accent); border: none; border-radius: 12px; color: #fff; font-size: 14px; cursor: pointer; }
  .gm-modal-confirm:disabled { opacity: 0.4; cursor: default; }
  .gm-modal-confirm.danger { background: #c05050; }
  `;

  // 書脊配色與字體池
  const SPINE_STYLES = [
    { bg: '#2b1d40', color: '#e2cef5', deco: '#c9a0dc', font: "'Cormorant Garamond', serif", style: 'italic' },
    { bg: '#0c2818', color: '#b8e8cc', deco: '#50a870', font: "'IM Fell English', serif", style: 'normal' },
    { bg: '#2a1008', color: '#f0c898', deco: '#c07838', font: "'Libre Baskerville', serif", style: 'normal' },
    { bg: '#0a1e38', color: '#b8d8f8', deco: '#5888c8', font: "'Playfair Display', serif", style: 'italic' },
    { bg: '#1e1008', color: '#f0d080', deco: '#b88830', font: "'IM Fell English', serif", style: 'italic' },
    { bg: '#0e2230', color: '#a8d8f0', deco: '#4888b0', font: "'Cormorant Garamond', serif", style: 'normal' },
    { bg: '#280a28', color: '#f0b8e8', deco: '#c060b0', font: "'Playfair Display', serif", style: 'normal' },
    { bg: '#101a08', color: '#c8e888', deco: '#70a830', font: "'Libre Baskerville', serif", style: 'italic' },
    { bg: '#1a0a10', color: '#f0c0c8', deco: '#c06070', font: "'Cormorant Garamond', serif", style: 'italic' },
    { bg: '#0a1820', color: '#c0d8e8', deco: '#4878a0', font: "'IM Fell English', serif", style: 'normal' },
    { bg: '#201808', color: '#e8d0a0', deco: '#a08030', font: "'Playfair Display', serif", style: 'italic' },
    { bg: '#080e20', color: '#b0b8e8', deco: '#5060b0', font: "'Libre Baskerville', serif", style: 'normal' },
  ];
  const HEIGHTS = [148, 162, 175, 188, 155, 170, 180, 145, 165, 158];
  const WIDTHS  = [28, 32, 30, 36, 28, 34, 30, 32, 28, 34];

  function spineStyleFor(index) {
    return SPINE_STYLES[index % SPINE_STYLES.length];
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    let s = iso;
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
    const d = new Date(s);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  }

  async function mount(el) {
    ensureStyle();
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    let botName = '晏', botAvatar = null;
    try {
      const res = await fetch('/personas');
      const data = await res.json();
      botName = data.claude?.name || '晏';
      botAvatar = data.claude?.avatar || null;
    } catch (e) {}

    let currentView = 'home';
    let currentSessionId = null;
    let currentBookId = null;
    let currentChapterNumber = 1;
    let gameMessages = [];
    let gameSetting = '';
    let isSending = false;
    let prevChapterSummary = ''; // 上一章摘要，新章節開始時注入

    // ── 主頁 ──
    function renderHome() {
      currentView = 'home';
      el.innerHTML = `
        <div class="gm-wrap">
          <div class="gm-home">
            <div><div class="gm-home-title">遊戲廳</div></div>
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

    // ── 回憶錄（書架）──
    async function renderArchive() {
      currentView = 'archive';
      el.innerHTML = `
        <div class="gm-archive">
          <div class="gm-archive-header">
            <button class="gm-back-btn" id="gmArchiveBack">‹</button>
            <h1>回憶錄</h1>
          </div>
          <div class="gm-archive-body" id="gmArchiveBody">
            <div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:14px;">載入中…</div>
          </div>
        </div>
      `;
      document.getElementById('gmArchiveBack').onclick = renderHome;

      try {
        const res = await fetch('/game/books');
        const data = await res.json();
        const body = document.getElementById('gmArchiveBody');
        body.innerHTML = '';

        if ((!data.books || data.books.length === 0) && (!data.orphans || data.orphans.length === 0)) {
          body.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:14px;">還沒有故事</div>';
          return;
        }

        // 書架
        if (data.books && data.books.length > 0) {
          const label = document.createElement('div');
          label.className = 'gm-shelf-label';
          label.textContent = '故事書架';
          body.appendChild(label);

          const shelfWrap = document.createElement('div');
          shelfWrap.className = 'gm-shelf-wrap';
          const row = document.createElement('div');
          row.className = 'gm-books-row';

          // 每本書一根書脊
          data.books.forEach((book, bi) => {
            const st = spineStyleFor(bi);
            const h = HEIGHTS[bi % HEIGHTS.length];
            const w = WIDTHS[bi % WIDTHS.length];
            const chapters = book.chapters || [];
            const hasActive = chapters.some(ch => ch.status === 'playing' || ch.status === 'paused');
            const statusLabel = hasActive ? '進行中' : `${chapters.length} 章`;

            const spine = document.createElement('div');
            spine.className = 'gm-spine';
            spine.style.cssText = `width:${w}px;height:${h}px;background:${st.bg};`;
            spine.innerHTML = `
              <div class="gm-spine-num" style="color:${st.deco};">${statusLabel}</div>
              <div class="gm-spine-deco" style="background:${st.deco};"></div>
              <div class="gm-spine-title" style="color:${st.color};font-family:${st.font};font-style:${st.style};">${escHtml(book.title)}</div>
            `;
            spine.onclick = () => showBookDetail(book, data.books);
            row.appendChild(spine);
          });

          // 新書按鈕
          const newSpine = document.createElement('div');
          newSpine.className = 'gm-spine-new';
          newSpine.innerHTML = `<span style="font-size:16px;color:var(--accent);">+</span>`;
          newSpine.onclick = () => showNewBookModal(body, () => renderArchive());
          row.appendChild(newSpine);

          const board = document.createElement('div');
          board.className = 'gm-shelf-board';
          shelfWrap.appendChild(row);
          shelfWrap.appendChild(board);
          body.appendChild(shelfWrap);
        }

        // 書籍詳情容器
        const detailContainer = document.createElement('div');
        detailContainer.id = 'gmBookDetailContainer';
        body.appendChild(detailContainer);

        // 孤兒 sessions（未歸入書冊）
        if (data.orphans && data.orphans.length > 0) {
          const orphanSection = document.createElement('div');
          orphanSection.className = 'gm-orphan-section';
          orphanSection.innerHTML = `<div class="gm-shelf-label">未歸檔記錄</div>`;
          data.orphans.filter(s => s.status === 'archived').forEach(s => {
            const item = document.createElement('div');
            item.className = 'gm-orphan-item';
            item.innerHTML = `
              <div>
                <div class="gm-orphan-title">${escHtml(s.title || s.chapter_title || '無題')}</div>
                <div class="gm-orphan-date">${formatDate(s.created_at)}</div>
              </div>
              <button class="gm-assign-btn" data-id="${s.id}">歸入書冊</button>
            `;
            item.querySelector('.gm-assign-btn').onclick = () => showAssignModal(s, data.books, () => renderArchive());
            orphanSection.appendChild(item);
          });
          body.appendChild(orphanSection);
        }

      } catch (e) {
        document.getElementById('gmArchiveBody').innerHTML = '<div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:14px;">載入失敗</div>';
      }
    }

    // 展開書籍詳情
    let currentDetailBookId = null;
    function showBookDetail(book, allBooks) {
      const container = document.getElementById('gmBookDetailContainer');
      if (!container) return;
      if (currentDetailBookId === book.id) {
        container.innerHTML = '';
        currentDetailBookId = null;
        return;
      }
      currentDetailBookId = book.id;
      const st = spineStyleFor(allBooks.findIndex(b => b.id === book.id));
      const chapters = book.chapters || [];
      container.innerHTML = '';
      const detail = document.createElement('div');
      detail.className = 'gm-book-detail show';
      detail.innerHTML = `
        <div class="gm-book-detail-cover">
          <div class="gm-book-spine-mini" style="background:${st.bg};"></div>
          <div class="gm-book-info">
            <div class="gm-book-title">${escHtml(book.title)}</div>
            <div class="gm-book-desc">${escHtml(book.setting || '')}</div>
          </div>
        </div>
        <div class="gm-book-chapters" id="gmChapterList">
          ${chapters.length === 0 ? '<div style="padding:12px 0;font-size:13px;color:var(--text-3);">還沒有章節</div>' : ''}
        </div>
      `;
      container.appendChild(detail);
      const chList = document.getElementById('gmChapterList');
      chapters.forEach(ch => {
        const isActive = ch.status === 'playing' || ch.status === 'paused';
        const numLabel = ch.chapter_number ? `第${ch.chapter_number}章` : '章節';
        const item = document.createElement('div');
        item.innerHTML = `
          <div class="gm-ch-item">
            <span class="gm-ch-num">${numLabel}</span>
            <span class="gm-ch-title">${escHtml(ch.chapter_title || ch.title || '無題')}</span>
            <span class="gm-ch-rounds">${isActive ? '進行中' : (ch.messages ? (Array.isArray(ch.messages) ? ch.messages.length : 0) + ' 輪' : '')}</span>
            <span class="gm-ch-arrow">›</span>
          </div>
          <div class="gm-ch-summary">${escHtml(ch.summary || '（無摘要）')}</div>
        `;
        const row = item.querySelector('.gm-ch-item');
        const summary = item.querySelector('.gm-ch-summary');
        const arrow = item.querySelector('.gm-ch-arrow');
        row.onclick = () => {
          const open = summary.classList.toggle('open');
          arrow.style.transform = open ? 'rotate(90deg)' : '';
        };
        chList.appendChild(item);
      });
      setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }

    // 新書冊 modal
    function showNewBookModal(body, onDone) {
      showSealModal({
        title: '新故事書',
        desc: '幫這個故事取個名字和簡短設定描述。',
        fields: [
          { label: '書名', id: 'newBookTitle', type: 'input', placeholder: '例：維多利亞 Paro' },
          { label: '設定描述（可留空）', id: 'newBookSetting', type: 'input', placeholder: '時代背景、身份…' },
        ],
        confirmText: '建立',
        onConfirm: async () => {
          const title = document.getElementById('newBookTitle').value.trim();
          if (!title) { document.getElementById('newBookTitle').focus(); return false; }
          await fetch('/game/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, setting: document.getElementById('newBookSetting').value.trim() })
          });
          onDone();
          return true;
        }
      });
    }

    // 歸入書冊 modal
    function showAssignModal(session, books, onDone) {
      const bookOptions = books.map(b => `<option value="${b.id}">${escHtml(b.title)}</option>`).join('');
      showSealModal({
        title: '歸入書冊',
        desc: `將「${session.title || '無題'}」歸入一本故事書。`,
        fields: [
          { label: '故事書', id: 'assignBook', type: 'select', options: bookOptions },
          { label: '章節編號', id: 'assignChNum', type: 'input', placeholder: '1', value: '1' },
          { label: '章節標題', id: 'assignChTitle', type: 'input', placeholder: '書房初見…', value: session.title || '' },
        ],
        confirmText: '歸入',
        onConfirm: async () => {
          const bookId = document.getElementById('assignBook').value;
          const chNum = parseInt(document.getElementById('assignChNum').value) || 1;
          const chTitle = document.getElementById('assignChTitle').value.trim();
          await fetch('/game/assign_book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.id, book_id: bookId, chapter_number: chNum, chapter_title: chTitle })
          });
          onDone();
          return true;
        }
      });
    }

    // 通用 seal modal
    function showSealModal({ title, desc, fields, confirmText, onConfirm, extraHtml = '' }) {
      const existing = document.getElementById('gmSealOverlayEl');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'gm-modal-overlay';
      overlay.id = 'gmSealOverlayEl';
      let fieldsHtml = fields.map(f => {
        if (f.type === 'select') return `<div><div class="gm-seal-label">${f.label}</div><select class="gm-seal-select" id="${f.id}">${f.options}</select></div>`;
        if (f.type === 'textarea') return `<div><div class="gm-seal-label">${f.label}</div><textarea class="gm-seal-textarea" id="${f.id}" rows="6">${escHtml(f.value || '')}</textarea></div>`;
        return `<div><div class="gm-seal-label">${f.label}</div><input class="gm-seal-input" id="${f.id}" placeholder="${f.placeholder || ''}" value="${escHtml(f.value || '')}"></div>`;
      }).join('');
      overlay.innerHTML = `
        <div class="gm-modal">
          <div class="gm-modal-title">${escHtml(title)}</div>
          ${desc ? `<div class="gm-modal-desc">${escHtml(desc)}</div>` : ''}
          ${fieldsHtml}
          ${extraHtml}
          <div class="gm-modal-btns">
            <button class="gm-modal-cancel" id="gmSealCancelBtn">取消</button>
            <button class="gm-modal-confirm" id="gmSealConfirmBtn">${escHtml(confirmText)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
      document.getElementById('gmSealCancelBtn').onclick = close;
      document.getElementById('gmSealConfirmBtn').onclick = async () => {
        const btn = document.getElementById('gmSealConfirmBtn');
        btn.disabled = true; btn.textContent = '處理中…';
        const ok = await onConfirm();
        if (ok !== false) close();
        else { btn.disabled = false; btn.textContent = confirmText; }
      };
    }

    // ── 封存這一章（故事繼續）──
    async function sealChapter() {
      // 先生成摘要
      const res = await fetch('/game/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: gameSetting, messages: gameMessages })
      });
      const data = await res.json();
      const summary = data.summary || '';

      // 取書冊清單
      const booksRes = await fetch('/game/books');
      const booksData = await booksRes.json();
      const books = booksData.books || [];
      const bookOptions = [
        '<option value="new">＋ 新建故事書</option>',
        ...books.map(b => `<option value="${b.id}"${currentBookId === b.id ? ' selected' : ''}>${escHtml(b.title)}</option>`)
      ].join('');

      showSealModal({
        title: '✦ 封存這一章',
        desc: '封存後故事繼續，下一章從空白開始。',
        fields: [
          { label: '故事書', id: 'chBookSel', type: 'select', options: bookOptions },
          { label: '章節名稱', id: 'chTitle', type: 'input', placeholder: '書房初見…', value: '' },
          { label: '章節摘要（可編修）', id: 'chSummary', type: 'textarea', value: summary },
        ],
        confirmText: '封存，繼續下一章',
        onConfirm: async () => {
          const chTitle = document.getElementById('chTitle').value.trim();
          const chSummary = document.getElementById('chSummary').value.trim();
          let bookId = document.getElementById('chBookSel').value;
          if (!chTitle) { document.getElementById('chTitle').focus(); return false; }

          if (bookId === 'new') {
            const newTitle = prompt('新故事書名稱：');
            if (!newTitle) return false;
            const nb = await fetch('/game/books', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newTitle, setting: gameSetting })
            });
            const nbData = await nb.json();
            bookId = nbData.book?.id;
          }

          const r = await fetch('/game/seal_chapter', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: currentSessionId,
              book_id: bookId,
              chapter_number: currentChapterNumber,
              chapter_title: chTitle,
              summary: chSummary,
              messages: gameMessages,
              setting: gameSetting
            })
          });
          const rd = await r.json();
          // 繼續下一章
          currentSessionId = rd.new_session_id;
          currentBookId = bookId;
          currentChapterNumber = rd.next_chapter || (currentChapterNumber + 1);
          prevChapterSummary = document.getElementById('gmSealSummary')?.value?.trim() || '';
          gameMessages = [];
          // 清空訊息區，繼續
          const msgArea = document.getElementById('gmMessages');
          if (msgArea) {
            msgArea.innerHTML = '';
            const divider = document.createElement('div');
            divider.style.cssText = 'text-align:center;font-size:12px;color:var(--text-3);padding:12px 0;';
            divider.textContent = `── 第${currentChapterNumber}章 開始 ──`;
            msgArea.appendChild(divider);
          }
          return true;
        }
      });
    }

    // ── 結束故事 ──
    async function endStory() {
      const res = await fetch('/game/summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: gameSetting, messages: gameMessages })
      });
      const data = await res.json();
      const summary = data.summary || '';

      const booksRes = await fetch('/game/books');
      const booksData = await booksRes.json();
      const books = booksData.books || [];
      const bookOptions = [
        '<option value="new">＋ 新建故事書</option>',
        ...books.map(b => `<option value="${b.id}"${currentBookId === b.id ? ' selected' : ''}>${escHtml(b.title)}</option>`)
      ].join('');

      showSealModal({
        title: '✦ 結束這個故事',
        desc: '封存最後一章，整本書標記完結。',
        fields: [
          { label: '故事書', id: 'endBookSel', type: 'select', options: bookOptions },
          { label: '章節名稱', id: 'endChTitle', type: 'input', placeholder: '終章…', value: '' },
          { label: '章節摘要（可編修）', id: 'endChSummary', type: 'textarea', value: summary },
        ],
        confirmText: '封存並結束故事',
        onConfirm: async () => {
          const chTitle = document.getElementById('endChTitle').value.trim();
          const chSummary = document.getElementById('endChSummary').value.trim();
          let bookId = document.getElementById('endBookSel').value;
          if (!chTitle) { document.getElementById('endChTitle').focus(); return false; }

          if (bookId === 'new') {
            const newTitle = prompt('新故事書名稱：');
            if (!newTitle) return false;
            const nb = await fetch('/game/books', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newTitle, setting: gameSetting })
            });
            const nbData = await nb.json();
            bookId = nbData.book?.id;
          }

          await fetch('/game/end_story', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: currentSessionId,
              book_id: bookId,
              chapter_number: currentChapterNumber,
              chapter_title: chTitle,
              summary: chSummary,
              messages: gameMessages,
              setting: gameSetting
            })
          });
          renderHome();
          return true;
        }
      });
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
      settingInput.oninput = () => { startBtn.disabled = !settingInput.value.trim(); };
      startBtn.disabled = true;
      startBtn.onclick = () => { gameSetting = settingInput.value.trim(); if (gameSetting) startGame(); };
    }

    // ── 我的世界 ──
    async function renderWorlds() {
      currentView = 'worlds';
      el.innerHTML = `
        <div class="gm-worlds">
          <div class="gm-archive-header">
            <button class="gm-back-btn" id="gmWorldsBack">‹</button>
            <h1>我的世界</h1>
          </div>
          <div class="gm-archive-list" id="gmWorldsList" style="padding-top:12px;">
            <div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:14px;">載入中…</div>
          </div>
        </div>
      `;
      document.getElementById('gmWorldsBack').onclick = renderHome;
      try {
        // 同時抓書冊和孤兒 session
        const [booksRes, sessionsRes] = await Promise.all([
          fetch('/game/books'),
          fetch('/game/sessions?status=active')
        ]);
        const booksData = await booksRes.json();
        const sessionsData = await sessionsRes.json();

        const list = document.getElementById('gmWorldsList');
        list.innerHTML = '';

        const items = [];

        // 有書冊的：每本書只取最新 active chapter
        (booksData.books || []).forEach(book => {
          const activeChapters = (book.chapters || []).filter(ch => ch.status === 'playing' || ch.status === 'paused');
          if (activeChapters.length === 0) return;
          // 取章節號最大的
          const latestCh = activeChapters.reduce((a, b) => (a.chapter_number > b.chapter_number ? a : b));
          items.push({
            id: latestCh.id,
            displayTitle: book.title, // 用書冊標題
            chapterLabel: latestCh.chapter_number > 1 ? `第 ${latestCh.chapter_number} 章` : '',
            status: latestCh.status,
            updated_at: latestCh.updated_at,
            setting: latestCh.title || '',
            book_id: book.id,
            chapter_number: latestCh.chapter_number,
            messages: latestCh.messages || []
          });
        });

        // 沒有書冊的孤兒 active session
        (sessionsData.sessions || []).filter(s => !s.book_id).forEach(s => {
          items.push({
            id: s.id,
            displayTitle: s.chapter_title || s.title || s.setting?.slice(0, 30) || '無題',
            chapterLabel: '',
            status: s.status,
            updated_at: s.updated_at,
            setting: s.setting || '',
            book_id: null,
            chapter_number: s.chapter_number || 1,
            messages: s.messages || []
          });
        });

        if (items.length === 0) {
          list.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:14px;">還沒有進行中的世界</div>';
          return;
        }

        // 按更新時間排序
        items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        items.forEach(item => {
          const statusLabel = item.status === 'playing' ? '進行中' : '暫停中';
          const div = document.createElement('div');
          div.className = 'gm-world-item';
          div.innerHTML = `
            <div class="gm-world-item-header">
              <div class="gm-world-left">
                <div class="gm-world-title">${escHtml(item.displayTitle)}</div>
                ${item.chapterLabel ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px;">${escHtml(item.chapterLabel)}</div>` : ''}
                <div class="gm-world-meta">${item.updated_at ? new Date(item.updated_at).toLocaleDateString('zh-TW') : ''}</div>
              </div>
              <span class="gm-world-status ${item.status}">${statusLabel}</span>
            </div>
            <div class="gm-world-btns">
              <button class="gm-world-continue" data-id="${item.id}">繼續</button>
            </div>
          `;
          div.querySelector('.gm-world-continue').onclick = async () => {
            gameSetting = item.setting;
            currentBookId = item.book_id;
            currentChapterNumber = item.chapter_number;
            // 撈上一章的 summary 當 prevChapterSummary
            prevChapterSummary = '';
            if (item.book_id && item.chapter_number > 1) {
              try {
                const bRes = await fetch('/game/books');
                const bData = await bRes.json();
                const thisBook = (bData.books || []).find(b => b.id === item.book_id);
                if (thisBook) {
                  const prevChapter = (thisBook.chapters || []).find(ch => ch.chapter_number === item.chapter_number - 1);
                  if (prevChapter && prevChapter.summary) prevChapterSummary = prevChapter.summary;
                }
              } catch (e) {}
            }
            startGame(item.id, item.messages);
          };
          list.appendChild(div);
        });
      } catch (e) {
        document.getElementById('gmWorldsList').innerHTML = '<div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:14px;">載入失敗</div>';
      }
    }

    // ── 遊戲中 ──
    async function startGame(sessionId = null, existingMessages = null) {
      currentView = 'game';
      currentSessionId = sessionId;
      gameMessages = existingMessages || [];
      renderGame();
      if (existingMessages && existingMessages.length > 0) {
        existingMessages.forEach(m => {
          if (m.role === 'user') appendGameUser(m.content);
          else appendGameAI(m.content);
        });
        return;
      }
      const loading = addGameLoading();
      try {
        const res = await fetch('/game/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: gameSetting })
        });
        const data = await res.json();
        loading.remove();
        if (data.reply) {
          currentSessionId = data.session_id || null;
          gameMessages.push({ role: 'assistant', content: data.reply });
          appendGameAI(data.reply);
        }
      } catch (e) { loading.remove(); }
    }

    async function pauseGame() {
      try {
        await fetch('/game/pause', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: gameSetting, messages: gameMessages, title: gameSetting.slice(0, 20), session_id: currentSessionId })
        });
      } catch (e) {}
      renderHome();
    }

    function renderGame() {
      el.innerHTML = `
        <div class="gm-game">
          <div class="gm-game-header">
            <div class="gm-game-header-top">
              <span class="gm-game-title">✦ 第${currentChapterNumber}章</span>
              <button class="gm-pause-btn" id="gmPauseBtn">暫停</button>
              <button class="gm-chapter-btn" id="gmChapterBtn">封存這章</button>
              <button class="gm-end-btn" id="gmEndBtn">結束故事</button>
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
      `;

      const gmInputEl = document.getElementById('gmInput');
      const saved = localStorage.getItem('rifugio_game_draft');
      if (saved) { gmInputEl.value = saved; autoGrow(gmInputEl); }
      gmInputEl.addEventListener('input', () => localStorage.setItem('rifugio_game_draft', gmInputEl.value));

      document.getElementById('gmSendBtn').onclick = sendGameMessage;
      document.getElementById('gmNewlineBtn').onclick = () => {
        const ta = document.getElementById('gmInput');
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '\n' + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 1;
        autoGrow(ta); ta.focus();
      };
      document.getElementById('gmInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGameMessage(); } });
      document.getElementById('gmInput').addEventListener('input', e => autoGrow(e.target));
      document.getElementById('gmPauseBtn').onclick = pauseGame;
      document.getElementById('gmChapterBtn').onclick = async () => {
        const btn = document.getElementById('gmChapterBtn');
        btn.disabled = true; btn.textContent = '整理中…';
        await sealChapter();
        if (btn) { btn.disabled = false; btn.textContent = '封存這章'; }
      };
      document.getElementById('gmEndBtn').onclick = async () => {
        const btn = document.getElementById('gmEndBtn');
        btn.disabled = true; btn.textContent = '整理中…';
        await endStory();
        if (btn) { btn.disabled = false; btn.textContent = '結束故事'; }
      };
    }

    function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
    function scrollBottom() { const m = document.getElementById('gmMessages'); if (m) m.scrollTop = m.scrollHeight; }

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
        const img = document.createElement('img'); img.src = botAvatar; av.appendChild(img);
      } else { av.textContent = botName[0]; }
      const contentWrap = document.createElement('div');
      contentWrap.className = 'gm-content-wrap';
      const nameEl = document.createElement('div');
      nameEl.className = 'gm-speaker-name'; nameEl.textContent = botName;
      contentWrap.appendChild(nameEl);
      const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p);
      paragraphs.forEach(para => {
        const bubble = document.createElement('div');
        bubble.className = 'gm-bubble'; bubble.textContent = para;
        contentWrap.appendChild(bubble);
      });
      const timeEl = document.createElement('div');
      timeEl.className = 'gm-time'; timeEl.textContent = formatTime(new Date().toISOString());
      contentWrap.appendChild(timeEl);
      wrap.appendChild(av); wrap.appendChild(contentWrap);
      document.getElementById('gmMessages').appendChild(wrap);
      scrollBottom();
    }

    function addGameLoading() {
      const wrap = document.createElement('div');
      wrap.className = 'gm-loading-wrap';
      const av = document.createElement('div');
      av.className = 'gm-av'; av.textContent = botName[0];
      const dots = document.createElement('div');
      dots.className = 'gm-loading-dots'; dots.textContent = '···';
      wrap.appendChild(av); wrap.appendChild(dots);
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
      input.value = ''; localStorage.removeItem('rifugio_game_draft'); input.style.height = 'auto';
      gameMessages.push({ role: 'user', content: text });
      appendGameUser(text);
      const loading = addGameLoading();
      try {
        const res = await fetch('/game/reply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setting: gameSetting,
            messages: gameMessages,
            prev_summary: prevChapterSummary,
            chapter_number: currentChapterNumber
          })
        });
        const data = await res.json();
        loading.remove();
        if (data.reply) {
          gameMessages.push({ role: 'assistant', content: data.reply });
          appendGameAI(data.reply);
          // 第一次回覆後清掉 prevChapterSummary（只需要帶一次）
          prevChapterSummary = '';
          if (currentSessionId) {
            fetch('/game/autosave', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: currentSessionId, messages: gameMessages })
            }).catch(() => {});
          }
        }
      } catch (e) { loading.remove(); }
      finally {
        isSending = false;
        const btn = document.getElementById('gmSendBtn');
        if (btn) btn.disabled = false;
      }
    }

    renderHome();
    return function cleanup() {
      const overlay = document.getElementById('gmSealOverlayEl');
      if (overlay) overlay.remove();
    };
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.game = { mount };
})();