// ═══ View: 人物書（真正 SPA 化）═══
(function () {
  const STYLE_ID = 'view-persona-style';
  const CSS = `
  .pn-ph {
    display: flex; align-items: center;
    padding: max(14px, env(safe-area-inset-top)) 16px 14px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 50; flex-shrink: 0;
  }
  .pn-ph-title { flex: 1; text-align: center; font-size: 16px; font-weight: 500; }
  .pn-ph-save { font-size: 14px; color: var(--accent); cursor: pointer; padding: 4px 0 4px 8px; font-weight: 500; }
  .pn-persona-switch {
    display: flex; background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .pn-ps-btn {
    flex: 1; text-align: center;
    padding: 10px 0; font-size: 14px; color: var(--text-3);
    cursor: pointer; border-bottom: 2px solid transparent;
    transition: color .15s, border-color .15s;
  }
  .pn-ps-btn.active { color: var(--accent); border-color: var(--accent); font-weight: 500; }
  .pn-tab-bar {
    display: flex; overflow-x: auto;
    background: var(--surface2); border-bottom: 1px solid var(--border);
    scrollbar-width: none; flex-shrink: 0;
  }
  .pn-tab-bar::-webkit-scrollbar { display: none; }
  .pn-tab-item {
    flex-shrink: 0; padding: 9px 18px;
    font-size: 13px; color: var(--text-3);
    cursor: pointer; border-bottom: 2px solid transparent;
    white-space: nowrap; transition: color .15s, border-color .15s;
  }
  .pn-tab-item.active { color: var(--accent); border-color: var(--accent); }
  .pn-tab-item.hidden { display: none; }
  .pn-tab-body { flex: 1; overflow-y: auto; }
  .pn-tab-panel { display: none; padding-bottom: 40px; }
  .pn-tab-panel.active { display: block; }
  .pn-sec-label {
    font-size: 11px; font-weight: 600; letter-spacing: .08em;
    color: var(--text-3); text-transform: uppercase; padding: 18px 16px 6px;
  }
  .pn-form-group {
    background: var(--surface);
    border-top: .5px solid var(--border); border-bottom: .5px solid var(--border);
  }
  .pn-form-row {
    padding: 12px 16px; border-bottom: .5px solid var(--border);
    display: flex; flex-direction: column; gap: 6px;
  }
  .pn-form-row:last-child { border-bottom: none; }
  .pn-form-label { font-size: 13px; color: var(--text-2); display: flex; align-items: center; gap: 6px; }
  .pn-badge { font-size: 10px; background: var(--accent); color: #fff; border-radius: 4px; padding: 1px 5px; }
  .pn-form-input {
    width: 100%; background: transparent; border: none; outline: none;
    font-size: 15px; color: var(--text); font-family: inherit;
    line-height: 1.5; resize: none;
  }
  .pn-form-input::placeholder { color: var(--text-3); }
  textarea.pn-form-input { min-height: 60px; }
  .pn-readonly-text {
    font-size: 14px; color: var(--text); line-height: 1.7;
    white-space: pre-wrap; min-height: 40px;
  }
  .pn-readonly-hint { font-size: 11px; color: var(--text-3); margin-top: 4px; }
  .pn-av-hero {
    display: flex; flex-direction: column; align-items: center; padding: 24px 16px 8px;
  }
  .pn-av-circle {
    width: 88px; height: 88px; border-radius: 50%;
    background: var(--surface2); border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; overflow: hidden; position: relative; font-size: 40px;
  }
  .pn-av-circle img { width: 100%; height: 100%; object-fit: cover; }
  .pn-av-hint { font-size: 12px; color: var(--text-3); margin-top: 8px; }
  .pn-opt-group { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 4px; }
  .pn-opt-btn {
    padding: 6px 14px; border-radius: 20px;
    background: var(--surface2); border: 1px solid var(--border);
    font-size: 13px; color: var(--text-2);
    cursor: pointer; transition: background .12s, color .12s, border-color .12s;
    user-select: none;
  }
  .pn-opt-btn.sel { background: var(--accent); color: #fff; border-color: var(--accent); }
  .pn-perspective-card {
    background: var(--surface);
    border-top: .5px solid var(--border); border-bottom: .5px solid var(--border); margin-bottom: 8px;
  }
  .pn-perspective-header {
    padding: 14px 16px 6px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .pn-perspective-title { font-size: 14px; font-weight: 500; }
  .pn-perspective-refresh {
    font-size: 12px; color: var(--accent); cursor: pointer;
    padding: 4px 8px; border: 1px solid var(--accent); border-radius: 12px;
  }
  .pn-perspective-refresh:disabled { opacity: 0.4; pointer-events: none; }
  .pn-perspective-body {
    padding: 8px 16px 14px; font-size: 14px; line-height: 1.8;
    color: var(--text); white-space: pre-wrap; min-height: 60px;
  }
  .pn-perspective-body.loading { color: var(--text-3); font-style: italic; }
  .pn-perspective-time { padding: 0 16px 10px; font-size: 11px; color: var(--text-3); }
  .pn-toast {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.75); color: #fff;
    font-size: 13px; padding: 8px 18px; border-radius: 20px;
    opacity: 0; pointer-events: none; transition: opacity .25s;
    white-space: nowrap; z-index: 999;
  }
  .pn-toast.show { opacity: 1; }
  `;

  const TAGS = ['傲嬌','溫柔','冷靜','話少','活潑','體貼','霸道','純情','成熟','幽默','神秘','認真','撒嬌','腹黑','直率','細膩','溫暖','理性'];
  const RELATIONS = [
    { v: 'lover', l: '戀人' }, { v: 'childhood', l: '青梅竹馬' },
    { v: 'friend', l: '好友' }, { v: 'online', l: '網友' },
    { v: 'colleague', l: '同事' }, { v: 'stranger', l: '陌生人' },
  ];
  const TEXT_FIELDS = ['name','job','appearance','outfit','persona','hobby','rel_bg','taboo','extra'];

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
      <div class="pn-ph">
        <div class="pn-ph-title">人物書</div>
        <div class="pn-ph-save" id="pnSaveBtn">儲存</div>
      </div>
      <div class="pn-persona-switch">
        <div class="pn-ps-btn active" id="pnPsClaude">晏</div>
        <div class="pn-ps-btn" id="pnPsUser">然然</div>
      </div>
      <div class="pn-tab-bar">
        <div class="pn-tab-item active" data-tab="0">基本資訊</div>
        <div class="pn-tab-item" data-tab="1">個性背景</div>
        <div class="pn-tab-item" id="pnTabRelation" data-tab="2">關係設定</div>
        <div class="pn-tab-item" id="pnTabAdvanced" data-tab="3">進階設定</div>
        <div class="pn-tab-item hidden" id="pnTabPerspective" data-tab="4">我的視角</div>
      </div>
      <input type="file" id="pnAvInput" accept="image/*" style="display:none">
      <div class="pn-tab-body">
        <!-- Tab 0: 基本資訊 -->
        <div class="pn-tab-panel active" id="pnTp0">
          <div class="pn-av-hero">
            <div class="pn-av-circle" id="pnAvCircle">
              <span id="pnAvEmoji">🌸</span>
              <img id="pnAvImg" src="" style="display:none">
            </div>
            <div class="pn-av-hint">點擊更換頭像</div>
          </div>
          <div class="pn-sec-label">基本資訊</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">名字 <span class="pn-badge">必填</span></div>
              <input class="pn-form-input" type="text" id="pn-f-name" placeholder="例：晏、然然…">
            </div>
            <div class="pn-form-row">
              <div class="pn-form-label">職業 / 身份</div>
              <input class="pn-form-input" type="text" id="pn-f-job" placeholder="例：研究生、攝影師…">
            </div>
          </div>
          <div class="pn-sec-label">外觀</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">外觀描述</div>
              <textarea class="pn-form-input" id="pn-f-appearance" rows="3" placeholder="膚色、髮型、眼神、身形特徵…"></textarea>
            </div>
            <div class="pn-form-row">
              <div class="pn-form-label">衣著穿搭風格</div>
              <textarea class="pn-form-input" id="pn-f-outfit" rows="2" placeholder="常見穿搭、色系偏好、細節…"></textarea>
            </div>
          </div>
        </div>
        <!-- Tab 1: 個性背景 -->
        <div class="pn-tab-panel" id="pnTp1">
          <div class="pn-sec-label">個性</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">個性描述 <span class="pn-badge">必填</span></div>
              <textarea class="pn-form-input" id="pn-f-persona" rows="5" placeholder="描述他的性格…"></textarea>
            </div>
            <div class="pn-form-row">
              <div class="pn-form-label">性格標籤 <span id="pnTagCount" style="font-size:11px;color:var(--text-3)">（最多5個）</span></div>
              <div class="pn-opt-group" id="pnTagGroup"></div>
            </div>
          </div>
          <div class="pn-sec-label">喜好</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">喜好與興趣</div>
              <textarea class="pn-form-input" id="pn-f-hobby" rows="2" placeholder="例：深夜騎車、黑膠唱片…"></textarea>
            </div>
          </div>
        </div>
        <!-- Tab 2: 關係設定 -->
        <div class="pn-tab-panel" id="pnTp2">
          <div class="pn-sec-label">與你的關係</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">關係類型</div>
              <div class="pn-opt-group" id="pnRelationGroup"></div>
            </div>
            <div class="pn-form-row">
              <div class="pn-form-label">關係背景</div>
              <div id="pnRelBgReadonly" style="display:none">
                <div class="pn-readonly-text" id="pnRelBgDisplay">（尚未生成，累積對話後會自動更新）</div>
                <div class="pn-readonly-hint">由系統根據對話自動更新，不可手動編輯</div>
              </div>
              <textarea class="pn-form-input" id="pn-f-rel_bg" rows="4" placeholder="你們是怎麼認識的、相處的故事…"></textarea>
            </div>
          </div>
        </div>
        <!-- Tab 3: 進階設定 -->
        <div class="pn-tab-panel" id="pnTp3">
          <div class="pn-sec-label">限制</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">禁止話題</div>
              <textarea class="pn-form-input" id="pn-f-taboo" rows="2" placeholder="不希望角色提及或深入的話題…"></textarea>
            </div>
          </div>
          <div class="pn-sec-label">補充</div>
          <div class="pn-form-group">
            <div class="pn-form-row">
              <div class="pn-form-label">補充指令</div>
              <textarea class="pn-form-input" id="pn-f-extra" rows="4" placeholder="其他特殊設定或行為指令…"></textarea>
            </div>
          </div>
        </div>
        <!-- Tab 4: 我的視角 -->
        <div class="pn-tab-panel" id="pnTp4">
          <div class="pn-sec-label">晏對然然的內心想法</div>
          <div class="pn-perspective-card">
            <div class="pn-perspective-header">
              <div class="pn-perspective-title" id="pnPerspectiveTitle">晏眼中的然然</div>
              <button class="pn-perspective-refresh" id="pnRefreshBtn">重新分析</button>
            </div>
            <div class="pn-perspective-body loading" id="pnPerspectiveBody">載入中…</div>
            <div class="pn-perspective-time" id="pnPerspectiveTime"></div>
          </div>
        </div>
      </div>
      <div class="pn-toast" id="pnToast"></div>
    `;

    let currentPersona = 'claude';
    let allData = {};
    let selectedTags = [];
    let toastTimer;

    function showToast(msg) {
      const t = document.getElementById('pnToast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
    }

    function buildTags() {
      const g = document.getElementById('pnTagGroup');
      if (!g) return;
      g.innerHTML = '';
      TAGS.forEach(tag => {
        const b = document.createElement('div');
        b.className = 'pn-opt-btn';
        b.textContent = tag;
        b.dataset.val = tag;
        b.onclick = () => {
          if (b.classList.contains('sel')) {
            b.classList.remove('sel');
            selectedTags = selectedTags.filter(x => x !== tag);
          } else if (selectedTags.length < 5) {
            b.classList.add('sel');
            selectedTags.push(tag);
          } else {
            showToast('最多選 5 個標籤');
          }
          updateTagCount();
        };
        g.appendChild(b);
      });
    }

    function buildRelations() {
      const g = document.getElementById('pnRelationGroup');
      if (!g) return;
      g.innerHTML = '';
      RELATIONS.forEach(o => {
        const b = document.createElement('div');
        b.className = 'pn-opt-btn';
        b.textContent = o.l;
        b.dataset.val = o.v;
        b.onclick = () => {
          g.querySelectorAll('.pn-opt-btn').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
        };
        g.appendChild(b);
      });
    }

    function updateTagCount() {
      const el = document.getElementById('pnTagCount');
      if (el) el.textContent = `（已選 ${selectedTags.length} / 最多 5 個）`;
    }

    function setRelation(val) {
      document.querySelectorAll('#pnRelationGroup .pn-opt-btn').forEach(b => {
        b.classList.toggle('sel', b.dataset.val === val);
      });
    }

    function getRelation() {
      const sel = document.querySelector('#pnRelationGroup .pn-opt-btn.sel');
      return sel ? sel.dataset.val : '';
    }

    function showAvatar(src) {
      const avImg = document.getElementById('pnAvImg');
      const avEmoji = document.getElementById('pnAvEmoji');
      if (!avImg || !avEmoji) return;
      if (src && src.startsWith('data:')) {
        avImg.src = src;
        avImg.style.display = 'block';
        avEmoji.style.display = 'none';
      } else {
        avImg.style.display = 'none';
        avEmoji.style.display = 'block';
        avEmoji.textContent = src || '🌸';
      }
    }

    let curTab = 0;
    function switchTab(n) {
      document.querySelectorAll('.pn-tab-item').forEach(t => t.classList.toggle('active', parseInt(t.dataset.tab) === n));
      document.querySelectorAll('.pn-tab-panel').forEach((p, i) => p.classList.toggle('active', i === n));
      curTab = n;
      if (n === 4) loadPerspective();
    }

    function applyUserMode(isUser) {
      const tabRelation = document.getElementById('pnTabRelation');
      const tabAdvanced = document.getElementById('pnTabAdvanced');
      const tabPerspective = document.getElementById('pnTabPerspective');
      if (tabRelation) tabRelation.classList.toggle('hidden', isUser);
      if (tabAdvanced) tabAdvanced.classList.toggle('hidden', isUser);
      if (tabPerspective) tabPerspective.classList.toggle('hidden', !isUser);

      const readonly = document.getElementById('pnRelBgReadonly');
      const editable = document.getElementById('pn-f-rel_bg');
      if (!isUser) {
        if (readonly) readonly.style.display = 'block';
        if (editable) editable.style.display = 'none';
        const relBg = allData[currentPersona]?.rel_bg || '';
        const display = document.getElementById('pnRelBgDisplay');
        if (display) display.textContent = relBg || '（尚未生成，累積對話後會自動更新）';
      } else {
        if (readonly) readonly.style.display = 'none';
        if (editable) editable.style.display = 'block';
      }
      if (isUser && curTab > 1) switchTab(0);
    }

    function saveCurrentToCache() {
      const d = allData[currentPersona] || {};
      TEXT_FIELDS.forEach(f => {
        const el = document.getElementById(`pn-f-${f}`);
        if (el) d[f] = el.value;
      });
      d.tags = selectedTags.join(',');
      d.relation = getRelation();
      allData[currentPersona] = d;
    }

    function loadCurrentFromCache() {
      const d = allData[currentPersona] || {};
      TEXT_FIELDS.forEach(f => {
        const el = document.getElementById(`pn-f-${f}`);
        if (el) el.value = d[f] || '';
      });
      showAvatar(d.avatar || '🌸');
      selectedTags = d.tags ? d.tags.split(',').filter(Boolean) : [];
      document.querySelectorAll('#pnTagGroup .pn-opt-btn').forEach(b => {
        b.classList.toggle('sel', selectedTags.includes(b.dataset.val));
      });
      updateTagCount();
      setRelation(d.relation || '');
    }

    function switchPersona(key) {
      saveCurrentToCache();
      currentPersona = key;
      document.getElementById('pnPsClaude').classList.toggle('active', key === 'claude');
      document.getElementById('pnPsUser').classList.toggle('active', key === 'user');
      loadCurrentFromCache();
      applyUserMode(key === 'user');
    }

    async function savePersona() {
      saveCurrentToCache();
      const d = allData[currentPersona];
      if (!d.name || !d.name.trim()) { showToast('請填寫名字'); return; }
      try {
        await fetch(`/personas/${currentPersona}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d)
        });
        showToast('已儲存');
      } catch (e) {
        showToast('儲存失敗');
      }
    }

    function formatPerspectiveTime(isoStr) {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} 更新`;
    }

    async function loadPerspective() {
      const claudeName = allData.claude?.name || '晏';
      const userName = allData.user?.name || '然然';
      const titleEl = document.getElementById('pnPerspectiveTitle');
      if (titleEl) titleEl.textContent = `${claudeName}眼中的${userName}`;
      try {
        const res = await fetch('/perspective');
        const data = await res.json();
        const body = document.getElementById('pnPerspectiveBody');
        const time = document.getElementById('pnPerspectiveTime');
        if (data.claude?.content) {
          if (body) { body.textContent = data.claude.content; body.classList.remove('loading'); }
          if (time) time.textContent = formatPerspectiveTime(data.claude.updated_at);
        } else {
          if (body) { body.textContent = '尚未生成，點右上角重新分析。'; body.classList.add('loading'); }
        }
      } catch (e) {
        const body = document.getElementById('pnPerspectiveBody');
        if (body) body.textContent = '載入失敗';
      }
    }

    async function refreshPerspective() {
      const btn = document.getElementById('pnRefreshBtn');
      if (btn) { btn.disabled = true; btn.textContent = '分析中…'; }
      const body = document.getElementById('pnPerspectiveBody');
      if (body) { body.textContent = '分析中，請稍候…'; body.classList.add('loading'); }
      try {
        const res = await fetch('/perspective/claude', { method: 'POST' });
        const data = await res.json();
        if (data.content) {
          if (body) { body.textContent = data.content; body.classList.remove('loading'); }
          const time = document.getElementById('pnPerspectiveTime');
          if (time) time.textContent = formatPerspectiveTime(new Date().toISOString());
        } else {
          if (body) body.textContent = '分析失敗，請稍後再試。';
        }
      } catch (e) {
        if (body) body.textContent = '分析失敗，請稍後再試。';
      }
      if (btn) { btn.disabled = false; btn.textContent = '重新分析'; }
    }

    // 頭像上傳
    document.getElementById('pnAvCircle').onclick = () => document.getElementById('pnAvInput').click();
    document.getElementById('pnAvInput').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 200;
          const ctx = canvas.getContext('2d');
          const s = Math.min(img.width, img.height);
          const ox = (img.width - s) / 2, oy = (img.height - s) / 2;
          ctx.drawImage(img, ox, oy, s, s, 0, 0, 200, 200);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          showAvatar(dataUrl);
          allData[currentPersona] = allData[currentPersona] || {};
          allData[currentPersona].avatar = dataUrl;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    };

    // tab 切換
    document.querySelectorAll('.pn-tab-item').forEach(t => {
      t.onclick = () => switchTab(parseInt(t.dataset.tab));
    });

    // persona 切換
    document.getElementById('pnPsClaude').onclick = () => switchPersona('claude');
    document.getElementById('pnPsUser').onclick = () => switchPersona('user');

    // 儲存 & 重新分析
    document.getElementById('pnSaveBtn').onclick = savePersona;
    document.getElementById('pnRefreshBtn').onclick = refreshPerspective;

    // 初始化
    buildTags();
    buildRelations();
    try {
      const res = await fetch('/personas');
      allData = await res.json();
    } catch (e) {}

    const cnName = allData.claude?.name || '晏';
    const unName = allData.user?.name || '然然';
    document.getElementById('pnPsClaude').textContent = cnName;
    document.getElementById('pnPsUser').textContent = unName;
    loadCurrentFromCache();
    applyUserMode(false);

    return function cleanup() {
      clearTimeout(toastTimer);
    };
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.persona = { mount };
})();