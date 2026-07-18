// ═══ View: 朋友關係網 ═══
(function () {
  const STYLE_ID = 'view-friends-style';
  const CSS = `
  .fr-main { flex: 1; overflow-y: auto; padding: max(48px, env(safe-area-inset-top)) 0 40px; display: flex; flex-direction: column; gap: 0; }
  .fr-header { padding: 0 20px 16px; display: flex; align-items: center; justify-content: space-between; }
  .fr-title { font-size: 20px; font-weight: 500; }
  .fr-add-btn { padding: 7px 16px; background: var(--accent); border: none; border-radius: 20px; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }

  .fr-friend-card { background: var(--surface); border-bottom: 1px solid var(--border); }
  .fr-card-header { padding: 14px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .fr-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; }
  .fr-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .fr-name { font-size: 16px; color: var(--text); }
  .fr-keywords { font-size: 12px; color: var(--text-3); }
  .fr-chevron { font-size: 18px; color: var(--text-3); transition: transform 0.2s; }
  .fr-chevron.open { transform: rotate(90deg); }

  .fr-detail { display: none; padding: 0 20px 16px; }
  .fr-detail.show { display: flex; flex-direction: column; gap: 12px; }
  .fr-section-label { font-size: 11px; color: var(--text-3); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
  .fr-textarea { width: 100%; padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; outline: none; resize: none; font-family: inherit; line-height: 1.6; }
  .fr-input { width: 100%; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; outline: none; font-family: inherit; }
  .fr-btns { display: flex; gap: 8px; }
  .fr-save-btn { flex: 1; padding: 9px; background: var(--accent); border: none; border-radius: 10px; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }
  .fr-del-btn { padding: 9px 16px; background: transparent; border: 1px solid rgba(200,60,60,0.3); border-radius: 10px; color: #e06060; font-size: 14px; cursor: pointer; font-family: inherit; }

  .fr-pending { background: rgba(200,160,50,0.08); border: 1px solid rgba(200,160,50,0.2); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
  .fr-pending-label { font-size: 11px; color: rgba(200,160,50,0.8); letter-spacing: 1px; }
  .fr-pending-text { font-size: 13px; color: var(--text-2); line-height: 1.6; }
  .fr-pending-source { font-size: 11px; color: var(--text-3); }
  .fr-pending-btns { display: flex; gap: 8px; }
  .fr-pending-confirm { padding: 5px 14px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 12px; cursor: pointer; }
  .fr-pending-discard { padding: 5px 14px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--text-3); font-size: 12px; cursor: pointer; }

  .fr-memories { display: flex; flex-direction: column; gap: 6px; }
  .fr-memory-item { background: var(--bg); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: var(--text-2); line-height: 1.6; display: flex; gap: 8px; align-items: flex-start; }
  .fr-memory-del { background: none; border: none; color: var(--text-3); font-size: 14px; cursor: pointer; flex-shrink: 0; padding: 0; }
  .fr-empty { text-align: center; color: var(--text-3); font-size: 14px; padding: 3rem 0; }

  .fr-add-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: flex-end; justify-content: center; }
  .fr-add-modal-overlay.show { display: flex; }
  .fr-add-modal { background: var(--surface); border-radius: 20px 20px 0 0; padding: 24px 20px 36px; width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 14px; }
  .fr-add-title { font-size: 16px; font-weight: 500; }
  .fr-add-btns { display: flex; gap: 10px; }
  .fr-add-cancel { padding: 11px 20px; background: var(--surface2); border: none; border-radius: 12px; color: var(--text-2); font-size: 14px; cursor: pointer; }
  .fr-add-confirm { flex: 1; padding: 11px; background: var(--accent); border: none; border-radius: 12px; color: #fff; font-size: 14px; cursor: pointer; }
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
      <div class="fr-main">
        <div class="fr-header">
          <div class="fr-title">朋友關係網</div>
          <button class="fr-add-btn" id="frAddBtn">＋ 新增朋友</button>
        </div>
        <div id="frList"></div>
      </div>

      <div class="fr-add-modal-overlay" id="frAddOverlay">
        <div class="fr-add-modal">
          <div class="fr-add-title">新增朋友</div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;">名字（你對外稱呼她的方式）</div>
            <input class="fr-input" id="frNewName" placeholder="星兒">
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;">關鍵字（說這些詞時晏會想起她，逗號分隔）</div>
            <input class="fr-input" id="frNewKeywords" placeholder="星兒、寒星">
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;">初始記憶（你對她的了解）</div>
            <textarea class="fr-textarea" id="frNewMemory" rows="3" placeholder="她是我最好的朋友，喜歡寫作，也有自己的 AI 伴侶叫宸…"></textarea>
          </div>
          <div class="fr-add-btns">
            <button class="fr-add-cancel" id="frAddCancel">取消</button>
            <button class="fr-add-confirm" id="frAddConfirm">新增</button>
          </div>
        </div>
      </div>
    `;

    async function loadFriends() {
      const list = document.getElementById('frList');
      try {
        const res = await fetch('/friends');
        const data = await res.json();
        list.innerHTML = '';
        if (!data.friends || data.friends.length === 0) {
          list.innerHTML = '<div class="fr-empty">還沒有朋友記錄</div>';
          return;
        }
        data.friends.forEach(f => renderFriend(f, list));
      } catch (e) {
        list.innerHTML = '<div class="fr-empty">載入失敗</div>';
      }
    }

    function renderFriend(f, list) {
      const card = document.createElement('div');
      card.className = 'fr-friend-card';
      const initial = f.name?.charAt(0) || '友';
      const pendingCount = (f.memories || []).filter(m => m.status === 'pending').length;

      card.innerHTML = `
        <div class="fr-card-header" id="frHeader-${f.name}">
          <div class="fr-avatar">${initial}</div>
          <div class="fr-info">
            <div class="fr-name">${f.name}${pendingCount > 0 ? ` <span style="font-size:11px;background:rgba(200,160,50,0.2);color:rgba(200,160,50,0.9);padding:2px 8px;border-radius:10px;">${pendingCount} 待確認</span>` : ''}</div>
            <div class="fr-keywords">${f.keywords || '未設關鍵字'}</div>
          </div>
          <div class="fr-chevron" id="frChevron-${f.name}">›</div>
        </div>
        <div class="fr-detail" id="frDetail-${f.name}">
          <div class="fr-section-label">關鍵字</div>
          <input class="fr-input" id="frKw-${f.name}" value="${f.keywords || ''}">

          <div class="fr-section-label">記憶</div>
          <div class="fr-memories" id="frMems-${f.name}">
            ${(f.memories || []).filter(m => m.status === 'confirmed').map(m => `
              <div class="fr-memory-item">
                <div style="flex:1;">${m.content}</div>
                <button class="fr-memory-del" data-mid="${m.id}">✕</button>
              </div>
            `).join('')}
          </div>

          <textarea class="fr-textarea" id="frNewMem-${f.name}" rows="2" placeholder="新增記憶…"></textarea>

          ${(f.memories || []).filter(m => m.status === 'pending').map(m => `
            <div class="fr-pending">
              <div class="fr-pending-label">⏳ 待確認更新</div>
              <div class="fr-pending-text">${m.content}</div>
              <div class="fr-pending-source">來源：${m.source || '對話偵測'}</div>
              <div class="fr-pending-btns">
                <button class="fr-pending-confirm" data-mid="${m.id}">✓ 確認加入</button>
                <button class="fr-pending-discard" data-mid="${m.id}">✕ 不需要</button>
              </div>
            </div>
          `).join('')}

          <div class="fr-btns">
            <button class="fr-save-btn" data-name="${f.name}">儲存</button>
            <button class="fr-del-btn" data-delname="${f.name}">刪除朋友</button>
          </div>
        </div>
      `;

      // 展開/收合
      card.querySelector(`#frHeader-${f.name}`).onclick = () => {
        const detail = card.querySelector(`#frDetail-${f.name}`);
        const chevron = card.querySelector(`#frChevron-${f.name}`);
        detail.classList.toggle('show');
        chevron.classList.toggle('open');
      };

      // 刪除單筆記憶
      card.querySelectorAll('.fr-memory-del').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`/friends/memories/${btn.dataset.mid}`, { method: 'DELETE' });
          loadFriends();
        };
      });

      // 確認待確認記憶
      card.querySelectorAll('.fr-pending-confirm').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`/friends/memories/${btn.dataset.mid}/confirm`, { method: 'POST' });
          loadFriends();
        };
      });

      // 丟棄待確認記憶
      card.querySelectorAll('.fr-pending-discard').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`/friends/memories/${btn.dataset.mid}`, { method: 'DELETE' });
          loadFriends();
        };
      });

      // 儲存
      card.querySelector(`[data-name="${f.name}"]`).onclick = async () => {
        const keywords = card.querySelector(`#frKw-${f.name}`).value.trim();
        const newMem = card.querySelector(`#frNewMem-${f.name}`).value.trim();
        await fetch(`/friends/${encodeURIComponent(f.name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords })
        });
        if (newMem) {
          await fetch('/friends/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_name: f.name, content: newMem, status: 'confirmed', source: '手動新增' })
          });
        }
        loadFriends();
      };

      // 刪除朋友
      card.querySelector(`[data-delname="${f.name}"]`).onclick = async () => {
        if (!confirm(`確定要刪除 ${f.name} 的所有記憶？`)) return;
        await fetch(`/friends/${encodeURIComponent(f.name)}`, { method: 'DELETE' });
        loadFriends();
      };

      list.appendChild(card);
    }

    // 新增朋友
    document.getElementById('frAddBtn').onclick = () => {
      document.getElementById('frAddOverlay').classList.add('show');
      document.getElementById('frNewName').focus();
    };
    document.getElementById('frAddCancel').onclick = () => {
      document.getElementById('frAddOverlay').classList.remove('show');
    };
    document.getElementById('frAddConfirm').onclick = async () => {
      const name = document.getElementById('frNewName').value.trim();
      const keywords = document.getElementById('frNewKeywords').value.trim();
      const memory = document.getElementById('frNewMemory').value.trim();
      if (!name) { document.getElementById('frNewName').focus(); return; }
      if (memory) {
        await fetch('/friends/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_name: name, content: memory, keywords, status: 'confirmed', source: '手動新增' })
        });
      } else {
        await fetch('/friends/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_name: name, content: `${name}是然然的朋友。`, keywords, status: 'confirmed', source: '初始建立' })
        });
      }
      // 儲存關鍵字到獨立欄位
      await fetch(`/friends/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });
      document.getElementById('frAddOverlay').classList.remove('show');
      document.getElementById('frNewName').value = '';
      document.getElementById('frNewKeywords').value = '';
      document.getElementById('frNewMemory').value = '';
      loadFriends();
    };

    await loadFriends();
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.friends = { mount };
})();
