// ═══ View: 人物書（過渡版）═══
(function () {
  async function mount(el) {
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.innerHTML = `<iframe src="/persona_page" style="width:100%;height:100%;border:none;display:block;"></iframe>`;
    return function cleanup() {};
  }
  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.persona = { mount };
})();