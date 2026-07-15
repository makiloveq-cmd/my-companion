// ═══ View: 收藏庫 ═══
(function () {
  const STYLE_ID = 'view-collection-style';
  const CSS = `
  .cl-main {
    flex: 1; overflow-y: auto;
    padding: max(48px, env(safe-area-inset-top)) 20px 40px;
    display: flex; flex-direction: column; gap: 28px;
  }
  .cl-section { display: flex; flex-direction: column; gap: 14px; }
  .cl-section-title {
    font-size: 11px; color: var(--text-3);
    letter-spacing: 2px; text-transform: uppercase;
  }
  .cl-shelf {
    background: var(--surface); border-radius: 14px;
    padding: 16px; border: 1px solid var(--border);
  }
  .cl-shelf-rail {
    display: flex; gap: 3px; align-items: flex-end;
    border-bottom: 3px solid var(--border); padding-bottom: 0;
    min-height: 100px; flex-wrap: wrap;
  }
  .cl-spine {
    cursor: pointer; border-radius: 2px 1px 1px 2px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s; flex-shrink: 0;
  }
  .cl-spine:hover { transform: translateY(-8px); }
  .cl-spine-text {
    writing-mode: vertical-rl; font-size: 8px;
    color: rgba(255,255,255,0.75); letter-spacing: 0.8px;
    white-space: nowrap; overflow: hidden;
  }
  .cl-disc-rail {
    display: flex; gap: 2px; align-items: stretch;
    border-bottom: 3px solid var(--border);
    min-height: 80px; flex-wrap: wrap;
  }
  .cl-disc {
    width: 14px; cursor: pointer; border-radius: 1px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s; flex-shrink: 0;
  }
  .cl-disc:hover { transform: translateY(-6px); }
  .cl-disc-text {
    writing-mode: vertical-rl; font-size: 7px;
    color: rgba(255,255,255,0.6); letter-spacing: 0.5px;
    white-space: nowrap; overflow: hidden;
  }
  .cl-empty {
    padding: 24px; text-align: center;
    font-size: 13px; color: var(--text-3);
  }
  .cl-detail {
    background: var(--surface2); border-radius: 10px;
    padding: 14px 16px; margin-top: 10px; display: none;
    border: 1px solid var(--border);
  }
  .cl-detail.show { display: block; }
  .cl-detail-title { font-size: 14px; color: var(--text); font-weight: 500; margin-bottom: 4px; }
  .cl-detail-meta { font-size: 11px; color: var(--text-3); margin-bottom: 10px; }
  .cl-detail-row { display: flex; flex-direction: column; gap: 6px; }
  .cl-detail-label { font-size: 11px; color: var(--text-3); letter-spacing: 0.5px; }
  .cl-detail-text { font-size: 13px; color: var(--text-2); line-height: 1.7; }
  .cl-delete-btn {
    margin-top: 12px; padding: 6px 14px;
    background: transparent; border: 1px solid var(--border);
    border-radius: 8px; color: var(--text-3);
    font-size: 12px; cursor: pointer; font-family: inherit;
  }
  .cl-delete-btn:hover { border-color: #e88; color: #e88; }
  `;

  const SPINE_COLORS = [
    '#5a3a2a','#3a4a3a','#3a3a5a','#5a3a3a','#4a4a3a',
    '#3a4a4a','#4a3a4a','#5a4a3a','#3a3a4a','#4a3a3a',
    '#3a5a4a','#5a4a4a','#4a5a3a','#3a4a5a','#5a3a4a',
  ];
  const DISC_COLORS = [
    '#5a4a8a','#4a7a5a','#8a5a4a','#8a7a4a','#6a4a7a',
    '#4a6a7a','#7a4a5a','#4a5a7a','#7a6a4a','#5a7a6a',
    '#8a5a6a','#6a7a4a','#4a7a7a','#7a5a7a','#5a6a8a',
  ];

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.replace('Z','').replace('+00:00','') + 'Z');
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  }

  async function mount(el) {
    ensureStyle();
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    el.innerHTML = `
      <div class="cl-main">
        <div class="cl-section">
          <div class="cl-section-title">書庫</div>
          <div class="cl-shelf">
            <div class="cl-shelf-rail" id="clBookRail"></div>
            <div class="cl-detail" id="clBookDetail">
              <div class="cl-detail-title" id="clBTitle"></div>
              <div class="cl-detail-meta" id="clBMeta"></div>
              <div class="cl-detail-row">
                <div class="cl-detail-label">然然說</div>
                <div class="cl-detail-text" id="clBYour"></div>
              </div>
              <div class="cl-detail-row" style="margin-top:8px;">
                <div class="cl-detail-label" id="clBHisLabel">晏說</div>
                <div class="cl-detail-text" id="clBHis"></div>
              </div>
              <div class="cl-detail-row" style="margin-top:8px;" id="clBConcRow">
                <div class="cl-detail-label">共同結論</div>
                <div class="cl-detail-text" id="clBConc"></div>
              </div>
              <button class="cl-delete-btn" id="clBDelete">移除這本書</button>
            </div>
          </div>
        </div>

        <div class="cl-section">
          <div class="cl-section-title">觀影收藏</div>
          <div class="cl-shelf">
            <div class="cl-disc-rail" id="clDiscRail"></div>
            <div class="cl-detail" id="clDiscDetail">
              <div class="cl-detail-title" id="clDTitle"></div>
              <div class="cl-detail-meta" id="clDMeta"></div>
              <div class="cl-detail-row">
                <div class="cl-detail-label">然然說</div>
                <div class="cl-detail-text" id="clDYour"></div>
              </div>
              <div class="cl-detail-row" style="margin-top:8px;">
                <div class="cl-detail-label" id="clDHisLabel">晏說</div>
                <div class="cl-detail-text" id="clDHis"></div>
              </div>
              <div class="cl-detail-row" style="margin-top:8px;" id="clDConcRow">
                <div class="cl-detail-label">共同結論</div>
                <div class="cl-detail-text" id="clDConc"></div>
              </div>
              <button class="cl-delete-btn" id="clDDelete">移除這部片</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let activeBookId = null;
    let activeDiscId = null;
    let books = [];
    let discs = [];

    async function loadBooks() {
      const rail = document.getElementById('clBookRail');
      rail.innerHTML = '';
      try {
        const res = await fetch('/collection/books');
        const data = await res.json();
        books = data.books || [];
        if (books.length === 0) {
          rail.innerHTML = '<div class="cl-empty">還沒有討論過的書</div>';
          return;
        }
        books.forEach((b, i) => {
          const color = SPINE_COLORS[i % SPINE_COLORS.length];
          const height = 74 + (i % 7) * 6;
          const el = document.createElement('div');
          el.className = 'cl-spine';
          el.style.cssText = `width:22px;height:${height}px;background:${color};`;
          el.innerHTML = `<span class="cl-spine-text">${b.title}</span>`;
          el.onclick = () => showBook(b, i);
          rail.appendChild(el);
        });
      } catch (e) {
        rail.innerHTML = '<div class="cl-empty">載入失敗</div>';
      }
    }

    async function loadDiscs() {
      const rail = document.getElementById('clDiscRail');
      rail.innerHTML = '';
      try {
        const res = await fetch('/collection/movies');
        const data = await res.json();
        discs = data.movies || [];
        if (discs.length === 0) {
          rail.innerHTML = '<div class="cl-empty">還沒有討論過的電影</div>';
          return;
        }
        discs.forEach((d, i) => {
          const color = DISC_COLORS[i % DISC_COLORS.length];
          const el = document.createElement('div');
          el.className = 'cl-disc';
          el.style.cssText = `background:${color};height:80px;`;
          el.innerHTML = `<span class="cl-disc-text">${d.title}</span>`;
          el.onclick = () => showDisc(d, i);
          rail.appendChild(el);
        });
      } catch (e) {
        rail.innerHTML = '<div class="cl-empty">載入失敗</div>';
      }
    }

    function showBook(b, i) {
      const detail = document.getElementById('clBookDetail');
      if (activeBookId === b.id) { detail.classList.remove('show'); activeBookId = null; return; }
      activeBookId = b.id;
      document.getElementById('clBTitle').textContent = b.title;
      document.getElementById('clBMeta').textContent = formatDate(b.created_at) + ' 討論';
      document.getElementById('clBYour').textContent = b.your_view || '—';
      document.getElementById('clBHis').textContent = b.his_view || '—';
      const concRow = document.getElementById('clBConcRow');
      if (b.conclusion) { concRow.style.display = 'flex'; document.getElementById('clBConc').textContent = b.conclusion; }
      else { concRow.style.display = 'none'; }
      document.getElementById('clBDelete').onclick = async () => {
        if (!confirm(`移除《${b.title}》？`)) return;
        await fetch(`/collection/books/${b.id}`, { method: 'DELETE' });
        detail.classList.remove('show'); activeBookId = null;
        loadBooks();
      };
      detail.classList.add('show');
    }

    function showDisc(d, i) {
      const detail = document.getElementById('clDiscDetail');
      if (activeDiscId === d.id) { detail.classList.remove('show'); activeDiscId = null; return; }
      activeDiscId = d.id;
      document.getElementById('clDTitle').textContent = d.title;
      document.getElementById('clDMeta').textContent = formatDate(d.created_at) + ' 觀影';
      document.getElementById('clDYour').textContent = d.your_view || '—';
      document.getElementById('clDHis').textContent = d.his_view || '—';
      const concRow = document.getElementById('clDConcRow');
      if (d.conclusion) { concRow.style.display = 'flex'; document.getElementById('clDConc').textContent = d.conclusion; }
      else { concRow.style.display = 'none'; }
      document.getElementById('clDDelete').onclick = async () => {
        if (!confirm(`移除《${d.title}》？`)) return;
        await fetch(`/collection/movies/${d.id}`, { method: 'DELETE' });
        detail.classList.remove('show'); activeDiscId = null;
        loadDiscs();
      };
      detail.classList.add('show');
    }

    // 讀取晏的名字
    try {
      const res = await fetch('/personas');
      const data = await res.json();
      const hisName = data.claude?.name || '晏';
      document.getElementById('clBHisLabel').textContent = hisName + '說';
      document.getElementById('clDHisLabel').textContent = hisName + '說';
    } catch (e) {}

    await Promise.all([loadBooks(), loadDiscs()]);
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.collection = { mount };
})();
