// ═══ Rifugio SPA Router ═══
// 管理頁面切換、history、各 view 模組的掛載與卸載。

window.RifugioRouter = (function () {
  const TAB_FOR_ROUTE = {
    home: 'home', chatlist: 'chatlist', chat: 'chatlist', space: 'chatlist',
    diary: 'diary', persona: 'persona', usage: 'home', settings: 'home', game: 'home',
    theme: 'theme', collection: 'home', quotes: 'chatlist', guest: 'home',
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