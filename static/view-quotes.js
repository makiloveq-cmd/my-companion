// ═══ View: 語錄庫 ═══
(function () {
  const STYLE_ID = 'view-quotes-style';
  const CSS = `
  .qt-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .qt-header {
    padding: max(48px, env(safe-area-inset-top)) 20px 14px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }
  .qt-header h1 { font-size: 20px; font-weight: 500; flex: 1; }
  .qt-list { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
  .qt-item {
    background: var(--surface); border-radius: 14px;
    padding: 14px 16px; border: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 6px; position: relative;
  }
  .qt-content { font-size: 15px; color: var(--text); line-height: 1.7; font-style: italic; }
  .qt-source { font-size: 12px; color: var(--text-3); }
  .qt-delete {
    position: absolute; top: 10px; right: 12px;
    background: none; border: none; color: var(--text-3);
    font-size: 16px; cursor: pointer; padding: 4px;
  }
  .qt-empty { text-align: center; color: var(--text-3); font-size: 14px; padding: 3rem 0; }
  .qt-add-area {
    padding: 12px 16px; background: var(--surface);
    border-top: 1px solid var(--border); flex-shrink: 0;
    display: flex; flex-direction: column; gap: 8px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .qt-input {
    width: 100%; padding: 10px 14px; background: var(--bg);
    border: 1px solid var(--border); border-radius: 12px;
    color: var(--text); font-size: 15px; outline: none;
    font-family: inherit; resize: none; line-height: 1.5;
  }
  .qt-input-row { display: flex; gap: 8px; }
  .qt-source-input {
    flex: 1; padding: 8px 12px; background: var(--bg);
    border: 1px solid var(--border); border-radius: 10px;
    color: var(--text); font-size: 14px; outline: none; font-family: inherit;
  }
  .qt-send {
    padding: 8px 18px; background: var(--accent); border: none;
    border-radius: 10px; color: #fff; font-size: 14px;
    cursor: pointer; font-family: inherit; flex-shrink: 0;
  }
  .qt-send:disabled { opacity: 0.5; }
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
      <div class="qt-main">
        <div class="qt-header">
          <h1>語錄庫</h1>
        </div>
        <div class="qt-list" id="qtList"></div>
        <div class="qt-add-area">
          <textarea class="qt-input" id="qtContent" rows="2" placeholder="貼上你喜歡的話…"></textarea>
          <div class="qt-input-row">
            <input class="qt-source-input" id="qtSource" placeholder="出處（書名、電影、作者…）">
            <button class="qt-send" id="qtSend">新增</button>
          </div>
        </div>
      </div>
    `;

    async function loadQuotes() {
      const list = document.getElementById('qtList');
      try {
        const res = await fetch('/quotes');
        const data = await res.json();
        list.innerHTML = '';
        if (!data.quotes || data.quotes.length === 0) {
          list.innerHTML = '<div class="qt-empty">還沒有語錄，貼一句你喜歡的話吧</div>';
          return;
        }
        data.quotes.forEach(q => {
          const item = document.createElement('div');
          item.className = 'qt-item';
          item.innerHTML = `
            <div class="qt-content">${q.content}</div>
            ${q.source ? `<div class="qt-source">— ${q.source}</div>` : ''}
            <button class="qt-delete" data-id="${q.id}">✕</button>
          `;
          item.querySelector('.qt-delete').onclick = async () => {
            await fetch(`/quotes/${q.id}`, { method: 'DELETE' });
            loadQuotes();
          };
          list.appendChild(item);
        });
      } catch (e) {
        list.innerHTML = '<div class="qt-empty">載入失敗</div>';
      }
    }

    document.getElementById('qtSend').onclick = async () => {
      const content = document.getElementById('qtContent').value.trim();
      const source = document.getElementById('qtSource').value.trim();
      if (!content) return;
      const btn = document.getElementById('qtSend');
      btn.disabled = true;
      try {
        await fetch('/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, source })
        });
        document.getElementById('qtContent').value = '';
        document.getElementById('qtSource').value = '';
        loadQuotes();
      } catch (e) {}
      btn.disabled = false;
    };

    document.getElementById('qtContent').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('qtSend').click();
      }
    });

    await loadQuotes();
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.quotes = { mount };
})();