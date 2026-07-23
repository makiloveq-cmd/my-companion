// ═══ View: 首頁 ═══
(function () {
  const STYLE_ID = 'view-home-style';
  const CSS = `
  .hm-main {
    flex: 1; overflow-y: hidden;
    padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    justify-content: center;
  }
  .hm-title { font-family: 'Playfair Display', serif; font-style: italic; font-size: 36px; color: var(--text); letter-spacing: 2px; text-align: center; }
  .hm-days-card { text-align: center; }
  .hm-days-number { font-size: 60px; font-weight: 300; color: var(--accent); line-height: 1; }
  .hm-days-label { font-size: 13px; color: var(--text-3); letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
  .hm-quote-card { background: var(--surface); border-radius: 16px; padding: 16px; width: 100%; max-width: 340px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .hm-quote-text { font-size: 14px; line-height: 1.8; color: var(--text-2); font-style: italic; text-align: center; }
  .hm-quote-author { font-size: 12px; color: var(--accent); text-align: center; margin-top: 12px; letter-spacing: 1px; }
  .hm-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px 8px; width: 100%; max-width: 340px; }
  .hm-card {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    cursor: pointer; background: none; border: none; padding: 0;
    font-family: inherit; transition: opacity 0.15s;
  }
  .hm-card:active { opacity: 0.7; }
  .hm-card-icon {
    width: 56px; height: 56px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; background: var(--surface);
    border: 1px solid var(--border);
  }
  .hm-card-title { font-size: 11px; color: var(--text-2); text-align: center; line-height: 1.3; letter-spacing: 0; text-transform: none; font-weight: 400; }
  .hm-card-sub { display: none; }
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
      <div class="hm-main">
        <div class="hm-title">Rifugio</div>
        <div class="hm-days-card">
          <div class="hm-days-number" id="hmDays">0</div>
          <div class="hm-days-label">days</div>
        </div>
        <div class="hm-quote-card" id="hmQuoteCard" style="cursor:pointer;" title="點擊換一句">
          <div class="hm-quote-text" id="hmQuoteText">"我們建造這個空間，一磚一瓦。"</div>
          <div class="hm-quote-author" id="hmQuoteAuthor">— Rifugio</div>
        </div>
        <div class="hm-cards-grid">
          <button class="hm-card" data-route="space">
            <div class="hm-card-icon">◈</div>
            <div class="hm-card-title">共同空間</div>
            <div class="hm-card-sub">一起在這裡</div>
          </button>
          <button class="hm-card" data-route="game">
            <div class="hm-card-icon">⚔</div>
            <div class="hm-card-title">遊戲廳</div>
            <div class="hm-card-sub">角色扮演</div>
          </button>
          <button class="hm-card" data-route="collection">
            <div class="hm-card-icon">🗝</div>
            <div class="hm-card-title">收藏庫</div>
            <div class="hm-card-sub">書影珍藏</div>
          </button>
          <button class="hm-card" data-route="guest">
            <div class="hm-card-icon">🚪</div>
            <div class="hm-card-title">訪客</div>
            <div class="hm-card-sub">會客廳</div>
          </button>
          <button class="hm-card" data-route="usage">
            <div class="hm-card-icon">⚡</div>
            <div class="hm-card-title">用量</div>
            <div class="hm-card-sub">API 監控</div>
          </button>
        </div>
      </div>
    `;

    const start = new Date('2026-04-09');
    const today = new Date();
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    document.getElementById('hmDays').textContent = diff;

    async function loadRandomQuote() {
      try {
        const res = await fetch('/quotes/random');
        const data = await res.json();
        if (data.quote) {
          document.getElementById('hmQuoteText').textContent = `"${data.quote.content}"`;
          document.getElementById('hmQuoteAuthor').textContent = data.quote.source ? `— ${data.quote.source}` : '— Rifugio';
        }
      } catch (e) {}
    }
    loadRandomQuote();
    document.getElementById('hmQuoteCard').onclick = loadRandomQuote;

    el.querySelectorAll('.hm-card').forEach(card => {
      card.onclick = () => RifugioRouter.navigate(card.dataset.route);
    });

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.home = { mount };
})();