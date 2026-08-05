// ═══ View: 主題 ═══
(function () {
  const STYLE_ID = 'view-theme-style';
  const CSS = `
  .th-main {
    flex: 1; overflow-y: auto;
    padding: max(48px, env(safe-area-inset-top)) 20px 40px;
    display: flex; flex-direction: column; gap: 24px;
  }
  .th-section { display: flex; flex-direction: column; gap: 14px; }
  .th-section-title {
    font-size: 11px; color: var(--text-3);
    letter-spacing: 2px; text-transform: uppercase;
  }
  .th-preview {
    border-radius: 16px; overflow: hidden;
    border: 1px solid var(--border);
  }
  .th-preview-header {
    padding: 12px 16px; display: flex; align-items: center;
    justify-content: space-between; font-size: 13px;
  }
  .th-preview-msgs { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 90px; }
  .th-crow { display: flex; gap: 8px; align-items: flex-end; }
  .th-crow.user { flex-direction: row-reverse; }
  .th-av { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .th-bubble { padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.6; max-width: 75%; }
  .th-preview-input { padding: 10px 14px; display: flex; gap: 8px; border-top-width: 1px; border-top-style: solid; }
  .th-inp { flex: 1; border-radius: 18px; padding: 6px 12px; font-size: 13px; border-width: 1px; border-style: solid; }
  .th-send { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: none; }

  .th-tabs { display: flex; gap: 8px; }
  .th-tab {
    padding: 7px 16px; border-radius: 20px; font-size: 13px;
    cursor: pointer; border: 1px solid var(--border);
    color: var(--text-2); background: transparent;
  }
  .th-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

  .th-picker { display: flex; flex-direction: column; gap: 14px; }
  .th-color-show { display: flex; align-items: center; gap: 12px; }
  .th-swatch { width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border); flex-shrink: 0; }
  .th-hex { font-family: monospace; font-size: 13px; color: var(--text-2); }
  .th-slider-row { display: flex; flex-direction: column; gap: 4px; }
  .th-slider-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-2); }
  input[type=range].th-range { width: 100%; height: 6px; border-radius: 3px; -webkit-appearance: none; cursor: pointer; border: none; outline: none; }
  input[type=range].th-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,0.2); cursor: pointer; }

  .th-save-btn {
    padding: 13px; background: var(--accent); border: none;
    border-radius: 14px; color: #fff; font-size: 15px;
    cursor: pointer; font-family: inherit;
  }
  .th-save-btn:active { opacity: 0.8; }

  .th-img-section { display: flex; flex-direction: column; gap: 12px; }
  .th-img-upload {
    border: 1.5px dashed var(--border); border-radius: 14px;
    padding: 28px; text-align: center; cursor: pointer;
    color: var(--text-3); font-size: 14px; transition: border-color 0.15s;
  }
  .th-img-upload:hover { border-color: var(--accent); }
  .th-img-preview { position: relative; border-radius: 14px; overflow: hidden; }
  .th-img-preview img { width: 100%; height: 140px; object-fit: cover; display: block; }
  .th-img-remove {
    position: absolute; top: 8px; right: 8px;
    background: rgba(0,0,0,0.6); color: #fff; border: none;
    border-radius: 20px; padding: 4px 10px; font-size: 12px; cursor: pointer;
  }
  .th-opacity-row { display: flex; flex-direction: column; gap: 4px; }
  .th-opacity-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-2); }
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
      <div class="th-main">
        <div class="th-section">
          <div class="th-section-title">預覽</div>
          <div class="th-preview" id="thPreview">
            <div class="th-preview-header" id="thPH">
              <span>✦ 我的陪伴空間</span>
              <span style="opacity:0.4; font-size:18px;">⚙</span>
            </div>
            <div class="th-preview-msgs" id="thPM">
              <div class="th-crow">
                <div class="th-av" id="thAv1">晏</div>
                <div class="th-bubble" id="thBAi">外面還在下雨。不用急著出去。</div>
              </div>
              <div class="th-crow user">
                <div class="th-bubble" id="thBUser">好，我就賴在這裡了。</div>
              </div>
              <div class="th-crow">
                <div class="th-av" id="thAv2">晏</div>
                <div class="th-bubble" id="thBAi2">嗯。</div>
              </div>
            </div>
            <div class="th-preview-input" id="thPI">
              <div class="th-inp" id="thInp" style="color:rgba(255,255,255,0.3);">說點什麼…</div>
              <div class="th-send" id="thSend">→</div>
            </div>
          </div>
        </div>

        <div class="th-section">
          <div class="th-section-title">色系</div>
          <div class="th-tabs" id="thTabs">
            <button class="th-tab active" data-key="bg">背景</button>
            <button class="th-tab" data-key="surface">表面</button>
            <button class="th-tab" data-key="user">你的氣泡</button>
            <button class="th-tab" data-key="accent">按鈕</button>
            <button class="th-tab" data-key="text">文字</button>
          </div>
          <div class="th-picker">
            <div class="th-color-show">
              <div class="th-swatch" id="thSwatch"></div>
              <div class="th-hex" id="thHex">#1e1710</div>
            </div>
            <div class="th-slider-row">
              <div class="th-slider-label"><span>色相 H</span><span id="thHV">20</span></div>
              <input type="range" class="th-range" id="thH" min="0" max="360" value="20">
            </div>
            <div class="th-slider-row">
              <div class="th-slider-label"><span>飽和度 S</span><span id="thSV">25</span>%</div>
              <input type="range" class="th-range" id="thS" min="0" max="100" value="25">
            </div>
            <div class="th-slider-row">
              <div class="th-slider-label"><span>亮度 L</span><span id="thLV">9</span>%</div>
              <input type="range" class="th-range" id="thL" min="0" max="100" value="9">
            </div>
          </div>
        </div>

        <div class="th-section">
          <div class="th-section-title">背景圖片</div>
          <div class="th-img-section">
            <div id="thImgUploadArea">
              <div class="th-img-upload" id="thImgUpload">
                ＋ 點擊上傳背景圖片
              </div>
              <input type="file" id="thImgInput" accept="image/*" style="display:none;">
            </div>
            <div id="thImgPreviewWrap" style="display:none;">
              <div class="th-img-preview">
                <img id="thImgPreviewImg" src="" alt="">
                <button class="th-img-remove" id="thImgRemove">移除</button>
              </div>
            </div>
            <div class="th-opacity-row" id="thOpacityRow" style="display:none;">
              <div class="th-opacity-label"><span>圖片透明度</span><span id="thOpV">30</span>%</div>
              <input type="range" class="th-range" id="thOp" min="5" max="80" value="30">
            </div>
          </div>
        </div>

        <button class="th-save-btn" id="thSaveBtn">儲存主題</button>
      </div>
    `;

    const defaults = {
      bg:      [20, 25, 9],
      surface: [25, 28, 16],
      user:    [30, 45, 38],
      accent:  [30, 45, 38],
      text:    [38, 40, 88],
    };

    const state = {};
    Object.keys(defaults).forEach(k => state[k] = [...defaults[k]]);
    let currentKey = 'bg';
    let bgImageUrl = null;
    let bgOpacity = 30;

    function hexToHsl(hex) {
      let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b); let h,s,l=(max+min)/2;
      if(max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
        switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
      return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
    }
    function hsl2hex(h, s, l) {
      s /= 100; l /= 100;
      const a = s * Math.min(l, 1 - l);
      const f = n => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * c).toString(16).padStart(2, '0');
      };
      return '#' + f(0) + f(8) + f(4);
    }

    function hex2rgb(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
    function luminance(h) { const [r,g,b] = hex2rgb(h).map(c => { c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; }
    function contrast(a, b) { const la=luminance(a), lb=luminance(b); return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05); }
    function textOn(bg) { return contrast(bg,'#ffffff') > contrast(bg,'#111111') ? '#ffffff' : '#111111'; }
    function getHex(key) { const [h,s,l] = state[key]; return hsl2hex(h,s,l); }

    function applyPreview() {
      const bg = getHex('bg'), sf = getHex('surface'), usr = getHex('user'), acc = getHex('accent'), txt = getHex('text');
      document.getElementById('thPreview').style.background = bg;
      const ph = document.getElementById('thPH'); ph.style.background = sf; ph.style.color = txt;
      document.getElementById('thPM').style.background = bg;
      ['thBAi','thBAi2'].forEach(id => {
        const el = document.getElementById(id);
        el.style.background = sf; el.style.color = txt;
        el.style.border = '1px solid rgba(255,255,255,0.07)';
      });
      ['thAv1','thAv2'].forEach(id => { const el = document.getElementById(id); el.style.background = sf; el.style.color = txt; });
      const bu = document.getElementById('thBUser'); bu.style.background = usr; bu.style.color = textOn(usr);
      const pi = document.getElementById('thPI'); pi.style.background = sf; pi.style.borderTopColor = 'rgba(255,255,255,0.07)';
      document.getElementById('thInp').style.background = bg;
      document.getElementById('thInp').style.borderColor = 'rgba(255,255,255,0.1)';
      const send = document.getElementById('thSend'); send.style.background = acc; send.style.color = textOn(acc);
    }

    function loadSliders(key) {
      const [h,s,l] = state[key];
      document.getElementById('thH').value = h;
      document.getElementById('thS').value = s;
      document.getElementById('thL').value = l;
      document.getElementById('thHV').textContent = h;
      document.getElementById('thSV').textContent = s;
      document.getElementById('thLV').textContent = l;
      const hex = hsl2hex(h, s, l);
      document.getElementById('thSwatch').style.background = hex;
      document.getElementById('thHex').textContent = hex;
      document.getElementById('thH').style.background = `linear-gradient(to right,hsl(0,${s}%,${l}%),hsl(60,${s}%,${l}%),hsl(120,${s}%,${l}%),hsl(180,${s}%,${l}%),hsl(240,${s}%,${l}%),hsl(300,${s}%,${l}%),hsl(360,${s}%,${l}%))`;
    }

    ['thH','thS','thL'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        const h = +document.getElementById('thH').value;
        const s = +document.getElementById('thS').value;
        const l = +document.getElementById('thL').value;
        document.getElementById('thHV').textContent = h;
        document.getElementById('thSV').textContent = s;
        document.getElementById('thLV').textContent = l;
        state[currentKey] = [h, s, l];
        const hex = hsl2hex(h, s, l);
        document.getElementById('thSwatch').style.background = hex;
        document.getElementById('thHex').textContent = hex;
        document.getElementById('thH').style.background = `linear-gradient(to right,hsl(0,${s}%,${l}%),hsl(60,${s}%,${l}%),hsl(120,${s}%,${l}%),hsl(180,${s}%,${l}%),hsl(240,${s}%,${l}%),hsl(300,${s}%,${l}%),hsl(360,${s}%,${l}%))`;
        applyPreview();
      });
    });

    document.querySelectorAll('.th-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.th-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentKey = tab.dataset.key;
        loadSliders(currentKey);
      };
    });

    // 背景圖上傳
    document.getElementById('thImgUpload').onclick = () => document.getElementById('thImgInput').click();
    document.getElementById('thImgInput').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await fetch('/upload_space_image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          bgImageUrl = data.url;
          document.getElementById('thImgPreviewImg').src = bgImageUrl;
          document.getElementById('thImgPreviewWrap').style.display = 'block';
          document.getElementById('thOpacityRow').style.display = 'flex';
          document.getElementById('thImgUpload').style.display = 'none';
        }
      } catch (err) {}
      e.target.value = '';
    };

    document.getElementById('thImgRemove').onclick = () => {
      bgImageUrl = null;
      document.getElementById('thImgPreviewWrap').style.display = 'none';
      document.getElementById('thOpacityRow').style.display = 'none';
      document.getElementById('thImgUpload').style.display = 'block';
    };

    document.getElementById('thOp').addEventListener('input', (e) => {
      bgOpacity = +e.target.value;
      document.getElementById('thOpV').textContent = bgOpacity;
    });

    // 儲存
    document.getElementById('thSaveBtn').onclick = async () => {
      const btn = document.getElementById('thSaveBtn');
      btn.textContent = '儲存中…';
      btn.disabled = true;
      try {
        const theme = {
          bg: getHex('bg'),
          surface: getHex('surface'),
          'bubble-user': getHex('user'),
          accent: getHex('accent'),
          text: getHex('text'),
          bg_image: bgImageUrl || '',
          bg_opacity: bgOpacity,
        };
        await fetch('/theme/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(theme)
        });
        // 套用到整個 app
        const root = document.documentElement;
        root.style.setProperty('--bg', theme.bg);
        root.style.setProperty('--surface', theme.surface);
        root.style.setProperty('--surface2', theme.surface);
        root.style.setProperty('--bubble-user', theme['bubble-user']);
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--text', theme.text);
        if (bgImageUrl) {
          document.body.style.backgroundImage = `url(${bgImageUrl})`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundAttachment = 'fixed';
          document.getElementById('app').style.background = `rgba(0,0,0,${bgOpacity/100})`;
        }
        btn.textContent = '✓ 已儲存';
        setTimeout(() => { btn.textContent = '儲存主題'; btn.disabled = false; }, 1500);
      } catch (e) {
        btn.textContent = '儲存失敗，請重試';
        btn.disabled = false;
      }
    };

    // 載入已儲存的主題
    try {
      const res = await fetch('/theme/custom');
      const data = await res.json();
      if (data && data.bg) {
        // 還原顏色滑桿
        const fields = ['bg','surface','user','accent','text'];
        const keys = ['bg','surface','bubble-user','accent','text'];
        fields.forEach((f,i) => {
          const hex = data[keys[i]];
          if (!hex) return;
          const hsl = hexToHsl(hex);
          if (!hsl) return;
          sliders[f] = hsl;
        });
        // 還原背景圖片
        if (data.bg_image) {
          bgImageUrl = data.bg_image;
          const previewImg = document.getElementById('thImgPreviewImg');
          const previewWrap = document.getElementById('thImgPreviewWrap');
          const opRow = document.getElementById('thOpacityRow');
          const uploadBtn = document.getElementById('thImgUpload');
          if (previewImg) previewImg.src = bgImageUrl;
          if (previewWrap) previewWrap.style.display = 'block';
          if (opRow) opRow.style.display = 'flex';
          if (uploadBtn) uploadBtn.style.display = 'none';
        }
        if (data.bg_opacity !== undefined) {
          bgOpacity = data.bg_opacity;
          const opEl = document.getElementById('thOp');
          const opV = document.getElementById('thOpV');
          if (opEl) opEl.value = bgOpacity;
          if (opV) opV.textContent = bgOpacity;
        }
      }
    } catch (e) {}

    loadSliders('bg');
    applyPreview();

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.theme = { mount };
})();