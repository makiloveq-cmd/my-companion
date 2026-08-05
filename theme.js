// ═══ Rifugio 共用主題系統 ═══

function applyCustomTheme(custom) {
  if (!custom || !Object.keys(custom).length) return;
  const root = document.documentElement;
  if (custom.bg) root.style.setProperty('--bg', custom.bg);
  if (custom.surface) {
    root.style.setProperty('--surface', custom.surface);
    root.style.setProperty('--surface2', custom.surface);
  }
  if (custom['bubble-user']) root.style.setProperty('--bubble-user', custom['bubble-user']);
  if (custom.accent) root.style.setProperty('--accent', custom.accent);
  if (custom.text) root.style.setProperty('--text', custom.text);
  // 背景圖片
  if (custom.bg_image) {
    document.body.style.backgroundImage = `url(${custom.bg_image})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    const app = document.getElementById('app');
    if (app) app.style.background = `rgba(0,0,0,${(custom.bg_opacity || 30) / 100})`;
  } else {
    document.body.style.backgroundImage = '';
    const app = document.getElementById('app');
    if (app) app.style.background = '';
  }
}

// 立即執行：先用 localStorage 快取套用，避免閃白
(function () {
  const cached = localStorage.getItem('rifugio_theme');
  if (cached) document.documentElement.setAttribute('data-theme', cached);
  const cachedCustom = localStorage.getItem('rifugio_theme_custom');
  if (cachedCustom) {
    try { applyCustomTheme(JSON.parse(cachedCustom)); } catch(e) {}
  }
})();

async function rifugioLoadTheme() {
  try {
    const [themeRes, customRes] = await Promise.all([
      fetch('/theme').catch(() => null),
      fetch('/theme/custom').catch(() => null),
    ]);
    if (themeRes) {
      const data = await themeRes.json();
      const theme = data.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('rifugio_theme', theme);
    }
    if (customRes) {
      const custom = await customRes.json();
      if (custom && Object.keys(custom).length > 0) {
        applyCustomTheme(custom);
        localStorage.setItem('rifugio_theme_custom', JSON.stringify(custom));
      }
    }
    return document.documentElement.getAttribute('data-theme') || 'dark';
  } catch (e) {
    const cached = localStorage.getItem('rifugio_theme_custom');
    if (cached) { try { applyCustomTheme(JSON.parse(cached)); } catch(e2) {} }
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