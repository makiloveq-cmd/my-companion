// ═══ View: 用量監控（真正 SPA 化）═══
(function () {
  const STYLE_ID = 'view-usage-style';
  const CSS = `
  .ug-header {
    padding: 14px 20px; background: var(--surface);
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
    position: sticky; top: 0; z-index: 10;
  }
  .ug-header h1 { font-size: 17px; font-weight: 400; flex: 1; }
  .ug-currency-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; background: var(--surface);
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .ug-currency-label { font-size: 13px; color: var(--text-3); }
  .ug-currency-toggle {
    display: flex; border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden;
  }
  .ug-currency-btn {
    padding: 6px 14px; font-size: 13px;
    background: transparent; border: none;
    color: var(--text-2); cursor: pointer;
  }
  .ug-currency-btn.active { background: var(--accent); color: #fff; }
  .ug-rate-wrap { display: flex; align-items: center; gap: 6px; margin-left: auto; }
  .ug-rate-label { font-size: 12px; color: var(--text-3); }
  .ug-rate-input {
    width: 70px; padding: 5px 8px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text);
    font-size: 13px; outline: none; text-align: center;
  }
  .ug-content {
    flex: 1; overflow-y: auto;
    padding: 16px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) 16px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .ug-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
  }
  .ug-card-header {
    padding: 14px 16px 10px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border);
  }
  .ug-card-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; background: #d4a574;
  }
  .ug-card-title { font-size: 15px; font-weight: 500; }
  .ug-card-subtitle { font-size: 12px; color: var(--text-3); margin-top: 1px; }
  .ug-card-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  .ug-balance-row { display: flex; align-items: baseline; gap: 6px; }
  .ug-balance-amount { font-size: 32px; font-weight: 300; letter-spacing: -1px; }
  .ug-balance-amount.warn { color: #e8a020; }
  .ug-balance-amount.danger { color: #e05252; }
  .ug-balance-unit { font-size: 14px; color: var(--text-3); }
  .ug-progress-wrap { display: flex; flex-direction: column; gap: 4px; }
  .ug-progress-label {
    display: flex; justify-content: space-between;
    font-size: 12px; color: var(--text-3);
  }
  .ug-progress-bar { height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
  .ug-progress-fill {
    height: 100%; border-radius: 3px;
    background: var(--accent); transition: width 0.4s ease;
  }
  .ug-progress-fill.warn { background: #e8a020; }
  .ug-progress-fill.danger { background: #e05252; }
  .ug-detail-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 0; border-bottom: .5px solid var(--border);
  }
  .ug-detail-row:last-child { border-bottom: none; }
  .ug-detail-label { font-size: 13px; color: var(--text-2); }
  .ug-detail-val { font-size: 13px; font-weight: 500; }
  .ug-budget-section { display: flex; flex-direction: column; gap: 6px; }
  .ug-budget-hint { font-size: 12px; color: var(--text-3); }
  .ug-budget-row { display: flex; gap: 8px; align-items: center; }
  .ug-budget-input {
    flex: 1; padding: 9px 12px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 10px; color: var(--text); font-size: 14px; outline: none;
  }
  .ug-budget-unit-toggle {
    display: flex; border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden;
  }
  .ug-budget-unit-btn {
    padding: 9px 10px; font-size: 12px;
    background: transparent; border: none;
    color: var(--text-2); cursor: pointer;
  }
  .ug-budget-unit-btn.active { background: var(--surface2); color: var(--text); font-weight: 500; }
  .ug-budget-btn {
    padding: 9px 16px; background: var(--accent);
    border: none; border-radius: 10px;
    color: #fff; font-size: 14px; cursor: pointer;
  }
  .ug-links-card { display: flex; flex-direction: column; }
  .ug-ext-link {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: .5px solid var(--border);
    cursor: pointer; text-decoration: none; color: var(--text);
  }
  .ug-ext-link:last-child { border-bottom: none; }
  .ug-ext-link:active { background: var(--surface2); }
  .ug-ext-link-left { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  .ug-ext-link-icon { font-size: 18px; }
  .ug-ext-arrow { color: var(--text-3); font-size: 14px; }
  .ug-toast {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.75); color: #fff;
    font-size: 13px; padding: 8px 18px; border-radius: 20px;
    opacity: 0; pointer-events: none; transition: opacity .25s;
    white-space: nowrap; z-index: 999;
  }
  .ug-toast.show { opacity: 1; }
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
      <div class="ug-header"><h1>用量監控</h1></div>
      <div class="ug-currency-bar">
        <div class="ug-currency-label">顯示單位</div>
        <div class="ug-currency-toggle">
          <button class="ug-currency-btn active" id="ugBtnUsd">USD</button>
          <button class="ug-currency-btn" id="ugBtnTwd">TWD</button>
        </div>
        <div class="ug-rate-wrap">
          <div class="ug-rate-label">匯率 1 USD =</div>
          <input class="ug-rate-input" type="number" id="ugRateInput" value="31.5" step="0.1" min="1">
          <div class="ug-rate-label">TWD</div>
        </div>
      </div>
      <div class="ug-content">
        <div class="ug-card">
          <div class="ug-card-header">
            <div class="ug-card-icon">✦</div>
            <div>
              <div class="ug-card-title">晏（Anthropic）</div>
              <div class="ug-card-subtitle">claude-sonnet-4-5</div>
            </div>
          </div>
          <div class="ug-card-body">
            <div>
              <div style="font-size:12px;color:var(--text-3);margin-bottom:4px;">預估剩餘</div>
              <div class="ug-balance-row">
                <div class="ug-balance-amount" id="ugRemaining">—</div>
                <div class="ug-balance-unit" id="ugUnit">USD</div>
              </div>
            </div>
            <div class="ug-progress-wrap">
              <div class="ug-progress-label">
                <span>已使用</span><span id="ugPct">—</span>
              </div>
              <div class="ug-progress-bar">
                <div class="ug-progress-fill" id="ugBar" style="width:0%"></div>
              </div>
            </div>
            <div>
              <div class="ug-detail-row">
                <div class="ug-detail-label">儲值金額</div>
                <div class="ug-detail-val" id="ugBudget">—</div>
              </div>
              <div class="ug-detail-row">
                <div class="ug-detail-label">累計花費</div>
                <div class="ug-detail-val" id="ugCost">—</div>
              </div>
              <div class="ug-detail-row">
                <div class="ug-detail-label">Input tokens</div>
                <div class="ug-detail-val" id="ugIn">—</div>
              </div>
              <div class="ug-detail-row">
                <div class="ug-detail-label">Output tokens</div>
                <div class="ug-detail-val" id="ugOut">—</div>
              </div>
            </div>
            <div class="ug-budget-section">
              <div class="ug-budget-hint">本次充值（累加）</div>
              <div class="ug-budget-row">
                <input class="ug-budget-input" type="number" id="ugBudgetInput" placeholder="金額" step="0.01" min="0">
                <div class="ug-budget-unit-toggle">
                  <button class="ug-budget-unit-btn active" id="ugUnitUsd">USD</button>
                  <button class="ug-budget-unit-btn" id="ugUnitTwd">TWD</button>
                </div>
                <button class="ug-budget-btn" id="ugSaveBudgetBtn">新增</button>
              </div>
            </div>
          </div>
        </div>
        <div class="ug-card ug-links-card">
          <a class="ug-ext-link" href="https://console.anthropic.com/settings/billing" target="_blank">
            <div class="ug-ext-link-left">
              <span class="ug-ext-link-icon">✦</span>
              <span>Anthropic Console 充值</span>
            </div>
            <span class="ug-ext-arrow">›</span>
          </a>
        </div>
      </div>
      <div class="ug-toast" id="ugToast"></div>
    `;

    let currency = 'usd';
    let budgetUnit = 'usd';
    let rawData = null;
    let toastTimer;

    function getRate() {
      return parseFloat(document.getElementById('ugRateInput').value) || 31.5;
    }

    function showToast(msg) {
      const t = document.getElementById('ugToast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
    }

    function fmtMoney(usdVal) {
      if (currency === 'twd') return 'NT$' + (usdVal * getRate()).toFixed(0);
      return '$' + Number(usdVal).toFixed(4);
    }

    function fmtNum(n) { return Number(n).toLocaleString(); }

    function renderAll() {
      if (!rawData) return;
      const { cost_usd: cost, budget_usd: budget } = rawData.anthropic;
      const remaining = budget - cost;
      const pct = budget > 0 ? Math.min(100, (cost / budget) * 100) : 0;
      const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';

      const remainEl = document.getElementById('ugRemaining');
      if (remainEl) {
        remainEl.textContent = fmtMoney(Math.max(0, remaining));
        remainEl.className = 'ug-balance-amount' + (cls ? ' ' + cls : '');
      }
      const unitEl = document.getElementById('ugUnit');
      if (unitEl) unitEl.textContent = currency === 'twd' ? '' : 'USD';

      const pctEl = document.getElementById('ugPct');
      if (pctEl) pctEl.textContent = budget > 0 ? `${pct.toFixed(1)}%` : '—';

      const bar = document.getElementById('ugBar');
      if (bar) {
        bar.style.width = pct + '%';
        bar.className = 'ug-progress-fill' + (cls ? ' ' + cls : '');
      }

      const budgetEl = document.getElementById('ugBudget');
      if (budgetEl) budgetEl.textContent = fmtMoney(budget);
      const costEl = document.getElementById('ugCost');
      if (costEl) costEl.textContent = fmtMoney(cost);
    }

    async function loadUsage() {
      try {
        const res = await fetch('/usage');
        rawData = await res.json();
        const inEl = document.getElementById('ugIn');
        const outEl = document.getElementById('ugOut');
        if (inEl) inEl.textContent = fmtNum(rawData.anthropic.input_tokens);
        if (outEl) outEl.textContent = fmtNum(rawData.anthropic.output_tokens);
        renderAll();
      } catch (e) {}
    }

    async function saveBudget() {
      let val = parseFloat(document.getElementById('ugBudgetInput')?.value);
      if (isNaN(val) || val <= 0) { showToast('請輸入正確金額'); return; }
      if (budgetUnit === 'twd') val = val / getRate();
      try {
        await fetch('/usage/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anthropic_budget: val })
        });
        showToast('已新增');
        const input = document.getElementById('ugBudgetInput');
        if (input) input.value = '';
        await loadUsage();
      } catch (e) {
        showToast('新增失敗');
      }
    }

    // 綁定事件
    document.getElementById('ugBtnUsd').onclick = () => {
      currency = 'usd';
      document.getElementById('ugBtnUsd').classList.add('active');
      document.getElementById('ugBtnTwd').classList.remove('active');
      renderAll();
    };
    document.getElementById('ugBtnTwd').onclick = () => {
      currency = 'twd';
      document.getElementById('ugBtnTwd').classList.add('active');
      document.getElementById('ugBtnUsd').classList.remove('active');
      renderAll();
    };
    document.getElementById('ugUnitUsd').onclick = () => {
      budgetUnit = 'usd';
      document.getElementById('ugUnitUsd').classList.add('active');
      document.getElementById('ugUnitTwd').classList.remove('active');
    };
    document.getElementById('ugUnitTwd').onclick = () => {
      budgetUnit = 'twd';
      document.getElementById('ugUnitTwd').classList.add('active');
      document.getElementById('ugUnitUsd').classList.remove('active');
    };
    document.getElementById('ugRateInput').onchange = renderAll;
    document.getElementById('ugSaveBudgetBtn').onclick = saveBudget;

    await loadUsage();

    return function cleanup() {
      clearTimeout(toastTimer);
    };
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.usage = { mount };
})();