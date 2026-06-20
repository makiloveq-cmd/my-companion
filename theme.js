// ═══ Rifugio 共用主題系統 ═══
// 每個頁面在 <head> 載入 theme.css，並在 <body> 結尾載入這支 script。
// 主題存在 Supabase identities 表（key: "theme"），跨裝置同步；同時快取在 localStorage 加速首次渲染。

(function () {
  const cached = localStorage.getItem('rifugio_theme');
  if (cached) {
    document.documentElement.setAttribute('data-theme', cached);
  }
})();

async function rifugioLoadTheme() {
  try {
    const res = await fetch('/theme');
    const data = await res.json();
    const theme = data.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rifugio_theme', theme);
    return theme;
  } catch (e) {
    return localStorage.getItem('rifugio_theme') || 'dark';
  }
}

async function rifugioSetTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rifugio_theme', theme);
  try {
    await fetch('/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });
  } catch (e) {}
}

rifugioLoadTheme();