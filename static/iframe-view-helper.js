// ═══ 共用工具：iframe 過渡版頁面用，隱藏/還原外層 tabBar ═══
window.RifugioIframeView = {
  hideTabBar() {
    const tabBar = document.getElementById('tabBar');
    if (tabBar) tabBar.style.display = 'none';
  },
  showTabBar() {
    const tabBar = document.getElementById('tabBar');
    if (tabBar) tabBar.style.display = '';
  }
};