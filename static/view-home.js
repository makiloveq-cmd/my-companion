// ═══ View: 首頁 ═══
(function () {
  const STYLE_ID = 'view-home-style';
  const CSS = `
  .hm-main {
    flex: 1; overflow-y: hidden;
    padding: 48px 24px 20px;
    display: flex; flex-direction: column; align-items: center; gap: 24px;
    justify-content: space-between;
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
        <div id="hmSpotifyCard" style="display:none;margin-top:12px;">
          <style>
            .hm-vinyl-wrap{display:flex;align-items:center;gap:14px;background:var(--surface);border-radius:16px;border:0.5px solid var(--border);padding:12px 14px}
            .hm-disc{width:64px;height:64px;border-radius:50%;background:conic-gradient(#1a1a1a 0deg,#2a2a2a 20deg,#1a1a1a 40deg,#2a2a2a 60deg,#1a1a1a 80deg,#2a2a2a 100deg,#1a1a1a 120deg,#2a2a2a 140deg,#1a1a1a 160deg,#2a2a2a 180deg,#1a1a1a 200deg,#2a2a2a 220deg,#1a1a1a 240deg,#2a2a2a 260deg,#1a1a1a 280deg,#2a2a2a 300deg,#1a1a1a 320deg,#2a2a2a 340deg,#1a1a1a 360deg);animation:hmSpin 4s linear infinite;position:relative;flex-shrink:0}
            .hm-disc-inner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;overflow:hidden;border:2px solid #111}
            .hm-disc-inner img{width:100%;height:100%;object-fit:cover}
            .hm-disc-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:7px;height:7px;border-radius:50%;background:#1a1a1a;border:1.5px solid #444;z-index:2}
            @keyframes hmSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            .hm-vinyl-info{flex:1;min-width:0}
            .hm-vinyl-track{font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .hm-vinyl-artist{font-size:11px;color:var(--text-3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .hm-vinyl-now{font-size:10px;color:#1db954;margin-top:5px;display:flex;align-items:center;gap:4px}
            .hm-bars{display:flex;align-items:flex-end;gap:2px;height:10px}
            .hm-bar{width:2px;background:#1db954;border-radius:1px;animation:hmBounce var(--d) ease-in-out infinite alternate}
            @keyframes hmBounce{from{height:2px}to{height:10px}}
            .hm-vinyl-prog{margin-top:8px;height:2px;background:var(--border);border-radius:1px;overflow:hidden}
            .hm-vinyl-prog-fill{height:100%;width:0%;background:#1db954;border-radius:1px;transition:width 1s linear}
          </style>
          <div class="hm-vinyl-wrap">
            <div class="hm-disc" id="hmDisc">
              <div class="hm-disc-inner"><img id="hmSpotifyArt" src="" alt=""></div>
              <div class="hm-disc-center"></div>
            </div>
            <div class="hm-vinyl-info">
              <div class="hm-vinyl-track" id="hmSpotifyTrack"></div>
              <div class="hm-vinyl-artist" id="hmSpotifyArtist"></div>
              <div class="hm-vinyl-now">
                <div class="hm-bars">
                  <div class="hm-bar" style="--d:0.6s"></div>
                  <div class="hm-bar" style="--d:0.4s"></div>
                  <div class="hm-bar" style="--d:0.8s"></div>
                  <div class="hm-bar" style="--d:0.5s"></div>
                </div>
                正在播放
              </div>
              <div class="hm-vinyl-prog"><div class="hm-vinyl-prog-fill" id="hmSpotifyProg"></div></div>
            </div>
          </div>
        </div>
        <div id="hmSpotifyConnect" style="margin-top:12px;text-align:center;display:none;">
          <button id="hmSpotifyConnectBtn" style="font-size:12px;padding:8px 16px;background:rgba(30,215,96,0.12);border:0.5px solid rgba(30,215,96,0.3);border-radius:20px;color:#1ed760;cursor:pointer;">
            🎵 連結 Spotify
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

    // Spotify 狀態
    async function loadSpotify() {
      try {
        const res = await fetch('/spotify/now_playing');
        const data = await res.json();
        if (data.connected && data.playing) {
          const card = document.getElementById('hmSpotifyCard');
          if (card) {
            card.style.display = 'block';
            document.getElementById('hmSpotifyTrack').textContent = data.track;
            document.getElementById('hmSpotifyArtist').textContent = `${data.artist}${data.album ? ' · ' + data.album : ''}`;
            const art = document.getElementById('hmSpotifyArt');
            if (data.album_art && art.src !== data.album_art) art.src = data.album_art;
            // 進度條
            if (data.duration_ms > 0) {
              const pct = Math.round((data.progress_ms / data.duration_ms) * 100);
              const prog = document.getElementById('hmSpotifyProg');
              if (prog) prog.style.width = pct + '%';
            }
          }
        } else if (data.connected && !data.playing) {
          const card = document.getElementById('hmSpotifyCard');
          if (card) card.style.display = 'none';
        } else if (!data.connected) {
          const connectDiv = document.getElementById('hmSpotifyConnect');
          if (connectDiv) connectDiv.style.display = 'block';
        }
      } catch(e) {}
    }
    loadSpotify();

    document.getElementById('hmSpotifyConnectBtn')?.addEventListener('click', () => {
      window.location.href = '/spotify/auth';
    });

    // 每 30 秒更新播放狀態
    const spotifyInterval = setInterval(loadSpotify, 30000);

    return function cleanup() { clearInterval(spotifyInterval); };
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.home = { mount };
})();