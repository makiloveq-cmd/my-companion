// ═══ View: 日記行事曆 ═══
(function () {
  async function mount(container) {
    container.innerHTML = `<style>
      .cal-wrap { display:flex; flex-direction:column; height:100%; background:var(--bg); }
      .cal-header { display:flex; align-items:center; justify-content:space-between;
        padding: max(16px,env(safe-area-inset-top)) 16px 12px;
        background:var(--bg); flex-shrink:0; }
      .cal-month { font-size:17px; font-weight:500; color:var(--text); }
      .cal-nav { background:none; border:0.5px solid var(--border); border-radius:20px;
        width:32px; height:32px; cursor:pointer; color:var(--text-2); font-size:18px;
        display:flex; align-items:center; justify-content:center; }
      .cal-nav:hover { background:var(--surface); }
      .cal-body { flex:1; overflow-y:auto; padding:0 10px max(16px,env(safe-area-inset-bottom)); }
      .cal-weekdays { display:grid; grid-template-columns:repeat(7,1fr); margin-bottom:4px; }
      .cal-wd { text-align:center; font-size:10px; color:var(--text-3); padding:4px 0; }
      .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:16px; }
      .cal-day { min-height:56px; border-radius:10px; display:flex; flex-direction:column;
        align-items:center; padding:6px 2px 4px; cursor:pointer; transition:background 0.15s; }
      .cal-day:hover { background:var(--surface); }
      .cal-day.today { background:rgba(180,140,230,0.12); }
      .cal-day.selected { background:rgba(180,140,230,0.2); border:0.5px solid rgba(180,140,230,0.4); }
      .cal-day.other { opacity:0.35; }
      .cal-num { font-size:13px; color:var(--text); line-height:1; margin-bottom:3px; }
      .cal-day.today .cal-num { background:var(--accent); color:#fff; border-radius:50%;
        width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:12px; }
      .cal-num.period { color:#f090a8; }
      .cal-icons { display:flex; align-items:center; justify-content:center; gap:1px; font-size:11px; min-height:14px; flex-wrap:wrap; }
      .cal-legend { display:flex; gap:12px; justify-content:center; flex-wrap:wrap;
        padding:10px 0; border-top:0.5px solid var(--border); margin-bottom:12px; }
      .cal-leg { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--text-3); }
      .cal-panel { background:var(--surface); border-radius:14px; padding:14px; margin-bottom:12px;
        border:0.5px solid var(--border); display:none; }
      .cal-panel.show { display:block; }
      .cal-panel-date { font-size:11px; color:var(--text-3); margin-bottom:10px; letter-spacing:0.5px; }
      .cal-section { margin-bottom:12px; }
      .cal-section-label { font-size:11px; color:var(--text-3); margin-bottom:5px; display:flex; align-items:center; gap:4px; }
      .cal-section-body { font-size:13px; color:var(--text); line-height:1.85; white-space:pre-wrap; }
      .cal-badge { display:inline-flex; align-items:center; gap:4px; border-radius:20px;
        padding:3px 10px; font-size:11px; margin-bottom:8px; }
      .cal-badge.period { background:rgba(240,144,168,0.12); color:#f090a8; border:0.5px solid rgba(240,144,168,0.3); }
      .cal-badge.event { background:rgba(100,180,130,0.12); color:#6ab08a; border:0.5px solid rgba(100,180,130,0.3); }
      .cal-badge.birthday { background:rgba(255,200,80,0.12); color:#e0b040; border:0.5px solid rgba(255,200,80,0.3); }
      .cal-divider { border:none; border-top:0.5px solid var(--border); margin:10px 0; }
      .cal-comments { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; max-height:200px; overflow-y:auto; }
      .cal-comment { display:flex; gap:7px; align-items:flex-start; }
      .cal-comment.me { flex-direction:row-reverse; }
      .cal-av { width:24px; height:24px; border-radius:50%; background:var(--surface2);
        display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; color:var(--text-2); }
      .cal-bubble { background:var(--surface2); border-radius:10px; padding:6px 10px;
        font-size:12px; color:var(--text); line-height:1.7; max-width:200px; }
      .cal-comment.me .cal-bubble { background:rgba(176,140,214,0.18); color:var(--text); }
      .cal-input-row { display:flex; gap:7px; align-items:center; }
      .cal-input { flex:1; background:var(--surface2); border:0.5px solid var(--border);
        border-radius:20px; padding:7px 12px; color:var(--text); font-size:12px; outline:none; font-family:inherit; }
      .cal-send { background:rgba(176,140,214,0.2); border:none; border-radius:50%;
        width:30px; height:30px; cursor:pointer; color:var(--accent); font-size:14px;
        display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .cal-send:hover { background:rgba(176,140,214,0.35); }
      .cal-add-event { margin-top:8px; }
      .cal-add-row { display:flex; gap:6px; margin-top:6px; }
      .cal-add-input { flex:1; background:var(--surface2); border:0.5px solid var(--border);
        border-radius:10px; padding:7px 10px; color:var(--text); font-size:12px; outline:none; font-family:inherit; }
      .cal-add-btn { padding:7px 12px; background:var(--surface2); border:0.5px solid var(--border);
        border-radius:10px; color:var(--text-2); font-size:12px; cursor:pointer; white-space:nowrap; }
      .cal-add-btn:hover { background:var(--surface3); }
      .cal-event-list { display:flex; flex-direction:column; gap:4px; margin-top:6px; }
      .cal-event-item { display:flex; align-items:center; justify-content:space-between;
        font-size:12px; color:var(--text-2); padding:4px 8px; background:var(--surface2);
        border-radius:8px; }
      .cal-del-btn { background:none; border:none; color:var(--text-3); cursor:pointer; font-size:14px; padding:0 2px; }
      .cal-period-toggle { margin-top:6px; }
      .cal-period-btn { font-size:12px; padding:6px 12px; border-radius:10px; border:0.5px solid var(--border);
        background:none; color:var(--text-3); cursor:pointer; }
      .cal-period-btn.active { background:rgba(240,144,168,0.15); color:#f090a8; border-color:rgba(240,144,168,0.4); }
      .cal-compose { background:var(--surface); border-radius:14px; padding:12px; margin-bottom:12px; border:0.5px solid var(--border); }
      .cal-compose textarea { border:none; outline:none; resize:none; width:100%;
        font-family:inherit; font-size:13px; line-height:1.7; color:var(--text);
        background:transparent; min-height:80px; }
      .cal-compose-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
      .cal-compose-btn { font-size:12px; padding:6px 14px; border-radius:10px; cursor:pointer;
        border:0.5px solid var(--border); background:none; color:var(--text-2); }
      .cal-compose-btn.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
      .no-entry { font-size:12px; color:var(--text-3); text-align:center; padding:14px 0; }
    </style>
    <div class="cal-wrap">
      <div class="cal-header">
        <button class="cal-nav" id="calPrev">‹</button>
        <div class="cal-month" id="calMonth"></div>
        <button class="cal-nav" id="calNext">›</button>
      </div>
      <div class="cal-body">
        <div class="cal-weekdays">
          <div class="cal-wd">日</div><div class="cal-wd">一</div><div class="cal-wd">二</div>
          <div class="cal-wd">三</div><div class="cal-wd">四</div><div class="cal-wd">五</div><div class="cal-wd">六</div>
        </div>
        <div class="cal-grid" id="calGrid"></div>
        <div class="cal-legend">
          <div class="cal-leg"><span>⭐</span>晏的日記</div>
          <div class="cal-leg"><span>🌙</span>我的日記</div>
          <div class="cal-leg"><span style="color:#f090a8;font-weight:500">7</span>生理期</div>
          <div class="cal-leg"><span>🎀</span>紀念日</div>
          <div class="cal-leg"><span>🎂</span>生日</div>
          <div class="cal-leg"><span>📌</span>備註</div>
        </div>
        <div class="cal-panel" id="calPanel">
          <div class="cal-panel-date" id="calPanelDate"></div>
          <div id="calPanelBadges"></div>
          <div id="calPanelDiary"></div>
          <hr class="cal-divider" id="calCommentDivider" style="display:none">
          <div class="cal-comments" id="calComments" style="display:none"></div>
          <div class="cal-input-row" id="calInputRow" style="display:none">
            <input class="cal-input" id="calCommentInput" placeholder="跟晏說點什麼…">
            <button class="cal-send" id="calSendBtn">➤</button>
          </div>
          <hr class="cal-divider">
          <div class="cal-period-toggle">
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button class="cal-period-btn" id="calPeriodBtn">🌸 標記生理期</button>
              <button class="cal-period-btn" id="calWriteDiaryBtn">✏️ 寫日記</button>
            </div>
          </div>
          <div class="cal-add-event">
            <div class="cal-event-list" id="calEventList"></div>
            <div class="cal-add-row">
              <input class="cal-add-input" id="calEventInput" placeholder="新增事件（紀念日、備註…）">
              <select class="cal-add-btn" id="calEventType" style="padding:7px 6px;">
                <option value="note">📌 備註</option>
                <option value="anniversary">🎀 紀念日</option>
                <option value="special">💫 特別</option>
              </select>
              <button class="cal-add-btn" id="calEventAdd">新增</button>
            </div>
          </div>
        </div>
        <div class="cal-compose" id="calCompose" style="display:none">
          <textarea id="calComposeText" placeholder="今天想寫點什麼…"></textarea>
          <div class="cal-compose-actions">
            <button class="cal-compose-btn" id="calComposeCancel">取消</button>
            <button class="cal-compose-btn primary" id="calComposeSave">儲存日記</button>
          </div>
        </div>
      </div>
    </div>`;

    const today = new Date();
    let cur = { y: today.getFullYear(), m: today.getMonth() };
    let curDate = null;
    let monthData = {};
    let curComments = [];
    let curPeriod = false;

    const typeIcon = { anniversary: '🎀', special: '💫', note: '📌', birthday: '🎂' };

    function dKey(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

    async function loadMonth() {
      const [diaryRes, periodRes, eventRes] = await Promise.all([
        fetch(`/diary?year=${cur.y}&month=${cur.m+1}`).catch(()=>null),
        fetch(`/calendar/period?year=${cur.y}&month=${cur.m+1}`).catch(()=>null),
        fetch(`/calendar/events?year=${cur.y}&month=${cur.m+1}`).catch(()=>null),
      ]);
      monthData = {};
      if (diaryRes) {
        const d = await diaryRes.json().catch(()=>({}));
        (d.entries || []).forEach(e => {
          if (!e.created_at) return;
          // 轉台灣時間（UTC+8）取日期
          const twDate = new Date(new Date(e.created_at).getTime() + 8*60*60*1000);
          const dt = twDate.toISOString().slice(0,10);
          if (!monthData[dt]) monthData[dt] = {};
          if (e.author === '然然') monthData[dt].me = true;
          else monthData[dt].yan = true;
        });
      }
      if (periodRes) {
        const d = await periodRes.json().catch(()=>({}));
        (d.logs || []).forEach(p => {
          if (!monthData[p.date]) monthData[p.date] = {};
          monthData[p.date].period = true;
        });
      }
      if (eventRes) {
        const d = await eventRes.json().catch(()=>({}));
        (d.events || []).forEach(e => {
          if (!monthData[e.date]) monthData[e.date] = {};
          if (!monthData[e.date].events) monthData[e.date].events = [];
          monthData[e.date].events.push(e);
        });
      }
      // 生日從 personas
      try {
        const pr = await fetch('/personas');
        const pd = await pr.json();
        ['user','claude'].forEach(key => {
          const bd = pd[key]?.birthday;
          if (!bd) return;
          const parts = bd.split('-');
          if (parts.length >= 2) {
            const bdKey = `${cur.y}-${String(parseInt(parts[parts.length-2])).padStart(2,'0')}-${String(parseInt(parts[parts.length-1])).padStart(2,'0')}`;
            if (!monthData[bdKey]) monthData[bdKey] = {};
            if (!monthData[bdKey].events) monthData[bdKey].events = [];
            monthData[bdKey].events.push({ title: key === 'user' ? '然然生日🎂' : '晏的生日🎂', type: 'birthday' });
          }
        });
      } catch(e) {}
      render();
    }

    function render() {
      const mnth = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
      document.getElementById('calMonth').textContent = `${cur.y} 年 ${mnth[cur.m]}`;
      const grid = document.getElementById('calGrid');
      grid.innerHTML = '';
      const first = new Date(cur.y, cur.m, 1).getDay();
      const dim = new Date(cur.y, cur.m+1, 0).getDate();
      const prev = new Date(cur.y, cur.m, 0).getDate();
      for (let i = 0; i < first; i++) {
        const el = document.createElement('div');
        el.className = 'cal-day other';
        el.innerHTML = `<div class="cal-num">${prev-first+1+i}</div>`;
        grid.appendChild(el);
      }
      for (let d = 1; d <= dim; d++) {
        const key = dKey(cur.y, cur.m, d);
        const info = monthData[key] || {};
        const isToday = cur.y===today.getFullYear()&&cur.m===today.getMonth()&&d===today.getDate();
        const el = document.createElement('div');
        let cls = 'cal-day';
        if (isToday) cls += ' today';
        if (curDate === key) cls += ' selected';
        el.className = cls;
        const numCls = info.period ? 'cal-num period' : 'cal-num';
        el.innerHTML = `<div class="${numCls}">${d}</div>`;
        const icons = document.createElement('div');
        icons.className = 'cal-icons';
        if (info.yan) icons.innerHTML += '⭐';
        if (info.me) icons.innerHTML += '🌙';
        if (info.events) {
          info.events.forEach(ev => {
            icons.innerHTML += (typeIcon[ev.type] || '📌');
          });
        }
        el.appendChild(icons);
        el.onclick = () => selectDay(key, d, info);
        grid.appendChild(el);
      }
    }

    async function selectDay(key, d, info) {
      curDate = key;
      curPeriod = !!info.period;
      render();
      const panel = document.getElementById('calPanel');
      const mn = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
      document.getElementById('calPanelDate').textContent = `${cur.y} 年 ${mn[cur.m]} ${d} 日`;

      // badges
      const badges = document.getElementById('calPanelBadges');
      badges.innerHTML = '';
      if (info.period) badges.innerHTML += `<span class="cal-badge period">🌸 生理期</span> `;
      if (info.events) {
        info.events.forEach(ev => {
          badges.innerHTML += `<span class="cal-badge event">${typeIcon[ev.type]||'📌'} ${ev.title}</span> `;
        });
      }

      // 日記
      const diaryEl = document.getElementById('calPanelDiary');
      diaryEl.innerHTML = '';
      try {
        const r = await fetch(`/diary?date=${key}`);
        const d2 = await r.json();
        const entries = d2.entries || [];
        const yanEntry = entries.find(e => e.author !== '然然');
        const meEntry = entries.find(e => e.author === '然然');
        if (yanEntry) {
          diaryEl.innerHTML += `<div class="cal-section"><div class="cal-section-label">⭐ 晏的日記</div><div class="cal-section-body">${escHtml(yanEntry.content)}</div></div>`;
        }
        if (meEntry) {
          diaryEl.innerHTML += `<div class="cal-section"><div class="cal-section-label">🌙 我的日記</div><div class="cal-section-body">${escHtml(meEntry.content)}</div></div>`;
        }
        if (!yanEntry && !meEntry && !info.period && !info.events) {
          diaryEl.innerHTML = '<div class="no-entry">這天還沒有記錄</div>';
        }
        const hasDiary = yanEntry || meEntry;
        document.getElementById('calCommentDivider').style.display = hasDiary ? 'block' : 'none';
        document.getElementById('calComments').style.display = hasDiary ? 'flex' : 'none';
        document.getElementById('calInputRow').style.display = hasDiary ? 'flex' : 'none';
        document.getElementById('calComments').innerHTML = '';
        curComments = [];
        if (yanEntry) {
          curComments.push({ from: 'yan', text: yanEntry.content.slice(0, 60) + (yanEntry.content.length > 60 ? '…' : '') });
        }
      } catch(e) {}

      // 生理期按鈕
      const pbtn = document.getElementById('calPeriodBtn');
      pbtn.className = 'cal-period-btn' + (curPeriod ? ' active' : '');
      pbtn.textContent = curPeriod ? '🌸 已標記生理期（點擊取消）' : '🌸 標記生理期';

      // 事件列表
      const evList = document.getElementById('calEventList');
      evList.innerHTML = '';
      if (info.events) {
        info.events.filter(ev => ev.type !== 'birthday').forEach(ev => {
          const item = document.createElement('div');
          item.className = 'cal-event-item';
          item.innerHTML = `<span>${typeIcon[ev.type]||'📌'} ${escHtml(ev.title)}</span><button class="cal-del-btn" data-id="${ev.id}">×</button>`;
          item.querySelector('.cal-del-btn').onclick = async () => {
            await fetch(`/calendar/events/${ev.id}`, { method: 'DELETE' });
            loadMonth();
          };
          evList.appendChild(item);
        });
      }

      document.getElementById('calCompose').style.display = 'none';
      panel.classList.add('show');
    }

    // 留言
    document.getElementById('calSendBtn').onclick = async () => {
      const inp = document.getElementById('calCommentInput');
      const val = inp.value.trim();
      if (!val) return;
      inp.value = '';
      addComment('me', val);
      curComments.push({ from: 'me', text: val });
      setTimeout(async () => {
        try {
          const r = await fetch('/chat/claude', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ message: `（你在日記留言區看到然然的留言：${val}，請簡短回應）` })
          });
          const d = await r.json();
          if (d.reply) addComment('yan', d.reply);
        } catch(e) {}
      }, 600);
    };

    function addComment(from, text) {
      const list = document.getElementById('calComments');
      list.style.display = 'flex';
      const div = document.createElement('div');
      div.className = 'cal-comment' + (from === 'me' ? ' me' : '');
      div.innerHTML = `<div class="cal-av">${from==='me'?'然':'晏'}</div><div class="cal-bubble">${escHtml(text)}</div>`;
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
    }

    // 生理期標記
    document.getElementById('calPeriodBtn').onclick = async () => {
      if (!curDate) return;
      await fetch('/calendar/period', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ date: curDate, type: curPeriod ? 'remove' : 'day' })
      });
      loadMonth();
    };

    // 寫日記按鈕
    document.getElementById('calWriteDiaryBtn').onclick = () => {
      const compose = document.getElementById('calCompose');
      compose.style.display = compose.style.display === 'none' ? 'block' : 'none';
      if (compose.style.display === 'block') {
        document.getElementById('calComposeText').focus();
      }
    };
    document.getElementById('calComposeCancel').onclick = () => {
      document.getElementById('calCompose').style.display = 'none';
      document.getElementById('calComposeText').value = '';
    };
    document.getElementById('calComposeSave').onclick = async () => {
      const text = document.getElementById('calComposeText').value.trim();
      if (!text) return;
      const btn = document.getElementById('calComposeSave');
      btn.disabled = true; btn.textContent = '儲存中…';
      try {
        await fetch('/diary', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ author: '然然', content: text, date: curDate })
        });
        document.getElementById('calComposeText').value = '';
        document.getElementById('calCompose').style.display = 'none';
        loadMonth();
        if (curDate) selectDay(curDate, parseInt(curDate.split('-')[2]), monthData[curDate] || {});
      } catch(e) { alert('儲存失敗'); }
      btn.disabled = false; btn.textContent = '儲存日記';
    };

    // 新增事件
    document.getElementById('calEventAdd').onclick = async () => {
      if (!curDate) return;
      const title = document.getElementById('calEventInput').value.trim();
      const type = document.getElementById('calEventType').value;
      if (!title) return;
      await fetch('/calendar/events', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ date: curDate, title, type })
      });
      document.getElementById('calEventInput').value = '';
      loadMonth();
    };

    // 月份切換
    document.getElementById('calPrev').onclick = () => {
      cur.m--; if (cur.m < 0) { cur.m = 11; cur.y--; }
      curDate = null;
      document.getElementById('calPanel').classList.remove('show');
      loadMonth();
    };
    document.getElementById('calNext').onclick = () => {
      cur.m++; if (cur.m > 11) { cur.m = 0; cur.y++; }
      curDate = null;
      document.getElementById('calPanel').classList.remove('show');
      loadMonth();
    };

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    loadMonth();
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.diary = { mount };
})();