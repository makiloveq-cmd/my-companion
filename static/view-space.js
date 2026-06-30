// ═══ View: 共同空間（過渡版，使用 iframe，待後續完整 SPA 化）═══
(function () {
  async function mount(el) {
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.innerHTML = `<iframe src="/space_page" style="width:100%;height:100%;border:none;display:block;"></iframe>`;
    return function cleanup() {};
  }
  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.space = { mount };
})();