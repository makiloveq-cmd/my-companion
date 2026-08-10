// ═══ Rifugio SPA Router ═══
// 管理頁面切換、history、各 view 模組的掛載與卸載。

window.RifugioRouter = (function () {
  const TAB_FOR_ROUTE = {
    home: 'home', chatlist: 'chatlist', chat: 'chatlist', space: 'chatlist',
    diary: 'diary', persona: 'persona', usage: 'home', settings: 'home', game: 'home',
    theme: 'theme', collection: 'home', quotes: 'chatlist', guest: 'home', friends: 'home',
    'visitor-room': 'home',
  };

  let currentCleanup = null;
  let viewEl = null;

  function setActiveTab(route) {
    const tabRoute = TAB_FOR_ROUTE[route] || 'home';
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.route === tabRoute);
    });
  }

  async function render(route, params = {}) {
    if (route === 'moments') return;

    const view = window.RifugioViews && window.RifugioViews[route];
    if (!view) {
      console.error('Unknown route:', route);
      return;
    }

    // 卸載上一個 view（清除 interval、event listener 等）
    if (currentCleanup) {
      try { currentCleanup(); } catch (e) {}
      currentCleanup = null;
    }

    viewEl.innerHTML = '';
    viewEl.classList.remove('fade-enter');
    void viewEl.offsetWidth; // reflow 觸發動畫重播
    viewEl.classList.add('fade-enter');

    setActiveTab(route);

    const cleanup = await view.mount(viewEl, params);
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  }

  function navigate(route, params = {}, pushState = true) {
    if (pushState) {
      const hash = params && Object.keys(params).length
        ? `#${route}?${new URLSearchParams(params).toString()}`
        : `#${route}`;
      history.pushState({ route, params }, '', hash);
    }
    render(route, params);
  }

  function parseHash() {
    const raw = location.hash.slice(1); // 去掉 #
    if (!raw) return { route: 'home', params: {} };
    const [route, qs] = raw.split('?');
    const params = {};
    if (qs) {
      new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
    }
    return { route: route || 'home', params };
  }

  function init() {
    viewEl = document.getElementById('view');

    document.getElementById('tabBar').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const route = btn.dataset.route;
      if (route === 'moments') return;
      navigate(route);
    });

    window.addEventListener('popstate', (e) => {
      const { route, params } = e.state || parseHash();
      render(route, params);
    });

    const { route, params } = parseHash();
    navigate(route, params, false);
    if (!location.hash) history.replaceState({ route: 'home', params: {} }, '', '#home');
  }

  return { init, navigate };
})();

// ── 全域共用工具 ────────────────────────────────────────────
window.formatTime = function(isoStr) {
  if (!isoStr) return '';
  let s = isoStr;
  if (typeof s === 'string') s = s.replace(' ', 'T');
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
};

window.showToast = function(msg, duration = 2000) {
  let t = document.getElementById('_globalToast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_globalToast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:8px 18px;border-radius:20px;font-size:14px;z-index:9999;pointer-events:none;transition:opacity 0.3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, duration);
};