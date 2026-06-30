// ═══ View: 日記（過渡版）═══
(function () {
  async function mount(el) {
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.innerHTML = `<iframe src="/diary_page" style="width:100%;height:100%;border:none;display:block;"></iframe>`;

    window.RifugioIframeView.hideTabBar();

    return function cleanup() {
      window.RifugioIframeView.showTabBar();
    };
  }
  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.diary = { mount };
})();