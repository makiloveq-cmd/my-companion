// ═══ View: 朋友關係網 ═══
(function () {
  const STYLE_ID = 'view-friends-style';
  const CSS = `
  .fr-main { flex: 1; overflow-y: auto; padding: max(48px, env(safe-area-inset-top)) 0 40px; display: flex; flex-direction: column; gap: 0; }
  .fr-header { padding: 0 20px 16px; display: flex; align-items: center; justify-content: space-between; }
  .fr-title { font-size: 20px; font-weight: 500; }
  .fr-add-btn { padding: 7px 16px; background: var(--accent); border: none; border-radius: 20px; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }

  .fr-section-title { padding: 12px 20px 6px; font-size: 11px; color: var(--text-3); letter-spacing: 2px; }
  .fr-belong-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
  .fr-badge-user { background: rgba(80,140,200,0.15); color: rgba(80,140,200,0.9); }
  .fr-badge-partner { background: rgba(160,100,200,0.15); color: rgba(160,100,200,0.9); }
  .fr-badge-shared { background: rgba(80,180,130,0.15); color: rgba(80,180,130,0.9); }

  .fr-friend-card { background: var(--surface); border-bottom: 1px solid var(--border); }
  .fr-card-header { padding: 14px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .fr-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; }
  .fr-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .fr-name { font-size: 16px; color: var(--text); }
  .fr-sub { font-size: 12px; color: var(--text-3); }
  .fr-chevron { font-size: 18px; color: var(--text-3); transition: transform 0.2s; }
  .fr-chevron.open { transform: rotate(90deg); }

  .fr-detail { display: none; padding: 0 20px 16px; }
  .fr-detail.show { display: flex; flex-direction: column; gap: 12px; }
  .fr-label { font-size: 11px; color: var(--text-3); letter-spacing: 1.5px; margin-top: 4px; }
  .fr-textarea { width: 100%; padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; outline: none; resize: none; font-family: inherit; line-height: 1.6; box-sizing: border-box; }
  .fr-input { width: 100%; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; outline: none; font-family: inherit; box-sizing: border-box; }
  .fr-select { width: 100%; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; outline: none; font-family: inherit; }
  .fr-row { display: flex; gap: 10px; }
  .fr-row .fr-input, .fr-row .fr-select { flex: 1; }
  .fr-btns { display: flex; gap: 8px; }
  .fr-save-btn { flex: 1; padding: 9px; background: var(--accent); border: none; border-radius: 10px; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }
  .fr-del-btn { padding: 9px 16px; background: transparent; border: 1px solid rgba(200,60,60,0.3); border-radius: 10px; color: #e06060; font-size: 14px; cursor: pointer; font-family: inherit; }

  .fr-memories { display: flex; flex-direction: column; gap: 6px; }
  .fr-memory-item { background: var(--bg); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: var(--text-2); line-height: 1.6; display: flex; gap: 8px; align-items: flex-start; }
  .fr-memory-del { background: none; border: none; color: var(--text-3); font-size: 14px; cursor: pointer; flex-shrink: 0; padding: 0; }

  .fr-pending { background: rgba(200,160,50,0.08); border: 1px solid rgba(200,160,50,0.2); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
  .fr-pending-label { font-size: 11px; color: rgba(200,160,50,0.8); letter-spacing: 1px; }
  .fr-pending-text { font-size: 13px; color: var(--text-2); line-height: 1.6; }
  .fr-pending-btns { display: flex; gap: 8px; }
  .fr-pending-confirm { padding: 5px 14px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 12px; cursor: pointer; }
  .fr-pending-discard { padding: 5px 14px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--text-3); font-size: 12px; cursor: pointer; }

  .fr-empty { text-align: center; color: var(--text-3); font-size: 14px; padding: 3rem 0; }

  .fr-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: flex-end; justify-content: center; }
  .fr-modal-overlay.show { display: flex; }
  .fr-modal { background: var(--surface); border-radius: 20px 20px 0 0; padding: 24px 20px 36px; width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 14px; max-height: 85vh; overflow-y: auto; }
  .fr-modal-title { font-size: 16px; font-weight: 500; }
  .fr-modal-btns { display: flex; gap: 10px; }
  .fr-modal-cancel { padding: 11px 20px; background: var(--surface2); border: none; border-radius: 12px; color: var(--text-2); font-size: 14px; cursor: pointer; }
  .fr-modal-confirm { flex: 1; padding: 11px; background: var(--accent); border: none; border-radius: 12px; color: #fff; font-size: 14px; cursor: pointer; }
  `;

  const BELONG_LABELS = { user: '然然的', partner: '晏的', shared: '共同的' };
  const BELONG_BADGE = { user: 'fr-badge-user', partner: 'fr-badge-partner', shared: 'fr-badge-shared' };

  function formatVisitDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()}`;
  }

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
          <button class="fr-add-btn" id="frAddBtn">＋ 新增</button>
        </div>
        <div id="frList"></div>
      </div>

      <div class="fr-modal-overlay" id="frAddOverlay">
        <div class="fr-modal">
          <div class="fr-modal-title">新增朋友</div>
          <div>
            <div class="fr-label" style="margin-bottom:6px;">名字</div>
            <input class="fr-input" id="frNewName" placeholder="星兒">
          </div>
          <div class="fr-row">
            <div style="flex:1;">
              <div class="fr-label" style="margin-bottom:6px;">屬於誰</div>
              <select class="fr-select" id="frNewBelong">
                <option value="user">然然的朋友</option>
                <option value="partner">晏的朋友</option>
                <option value="shared">共同朋友</option>
              </select>
            </div>
            <div style="flex:1;">
              <div class="fr-label" style="margin-bottom:6px;">關係類型</div>
              <input class="fr-input" id="frNewRelation" placeholder="閨蜜、同事…">
            </div>
          </div>
          <div>
            <div class="fr-label" style="margin-bottom:6px;">個性描述</div>
            <input class="fr-input" id="frNewPersonality" placeholder="活潑、話多、喜歡寫作…">
          </div>
          <div class="fr-row">
            <div style="flex:1;">
              <div class="fr-label" style="margin-bottom:6px;">生日（選填）</div>
              <input class="fr-input" id="frNewBirthday" placeholder="03/15">
            </div>
          </div>
          <div>
            <div class="fr-label" style="margin-bottom:6px;">初始記憶</div>
            <textarea class="fr-textarea" id="frNewMemory" rows="3" placeholder="她是我最好的朋友，也有自己的 AI 伴侶叫宸…"></textarea>
          </div>
          <div class="fr-modal-btns">
            <button class="fr-modal-cancel" id="frAddCancel">取消</button>
            <button class="fr-modal-confirm" id="frAddConfirm">新增</button>
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

        // 按 belong_to 分組
        const groups = { partner: [], user: [], shared: [] };
        data.friends.forEach(f => {
          const g = f.belong_to || 'shared';
          if (!groups[g]) groups[g] = [];
          groups[g].push(f);
        });

        const groupOrder = ['partner', 'user', 'shared'];
        const groupLabels = { partner: '晏的朋友', user: '然然的朋友', shared: '共同朋友' };

        groupOrder.forEach(group => {
          if (!groups[group] || groups[group].length === 0) return;
          const section = document.createElement('div');
          section.innerHTML = `<div class="fr-section-title">${groupLabels[group]}</div>`;
          list.appendChild(section);
          groups[group].forEach(f => renderFriend(f, list));
        });
      } catch (e) {
        list.innerHTML = '<div class="fr-empty">載入失敗</div>';
      }
    }

    function renderFriend(f, list) {
      const card = document.createElement('div');
      card.className = 'fr-friend-card';
      const initial = f.name?.charAt(0) || '友';
      const pendingCount = (f.memories || []).filter(m => m.status === 'pending').length;
      const belong = f.belong_to || 'shared';
      const badgeClass = BELONG_BADGE[belong] || 'fr-badge-shared';
      const badgeLabel = BELONG_LABELS[belong] || '';
      const subParts = [f.relation_type, f.personality].filter(Boolean);
      const sub = subParts.join('・') || '未設描述';
      const visitInfo = f.visit_count > 0
        ? `來訪 ${f.visit_count} 次 · 最近 ${formatVisitDate(f.last_visit)}`
        : '';
      const safeId = f.id || f.name;

      card.innerHTML = `
        <div class="fr-card-header" id="frHeader-${safeId}">
          <div class="fr-avatar">${initial}</div>
          <div class="fr-info">
            <div class="fr-name">${f.name}
              <span class="fr-belong-badge ${badgeClass}">${badgeLabel}</span>
              ${pendingCount > 0 ? `<span style="font-size:11px;background:rgba(200,160,50,0.2);color:rgba(200,160,50,0.9);padding:2px 8px;border-radius:10px;">${pendingCount} 待確認</span>` : ''}
            </div>
            <div class="fr-sub">${sub}</div>
            ${visitInfo ? `<div style="font-size:11px;color:var(--text-3);">${visitInfo}</div>` : ''}
          </div>
          <div class="fr-chevron" id="frChevron-${safeId}">›</div>
        </div>
        <div class="fr-detail" id="frDetail-${safeId}">
          <div class="fr-row">
            <div style="flex:1;">
              <div class="fr-label">屬於誰</div>
              <select class="fr-select" id="frBelong-${safeId}">
                <option value="user" ${belong==='user'?'selected':''}>然然的朋友</option>
                <option value="partner" ${belong==='partner'?'selected':''}>晏的朋友</option>
                <option value="shared" ${belong==='shared'?'selected':''}>共同朋友</option>
              </select>
            </div>
            <div style="flex:1;">
              <div class="fr-label">關係類型</div>
              <input class="fr-input" id="frRelation-${safeId}" value="${f.relation_type || ''}">
            </div>
          </div>
          <div>
            <div class="fr-label">個性描述</div>
            <input class="fr-input" id="frPersonality-${safeId}" value="${f.personality || ''}">
          </div>
          <div class="fr-row">
            <div style="flex:1;">
              <div class="fr-label">生日</div>
              <input class="fr-input" id="frBirthday-${safeId}" value="${f.birthday || ''}" placeholder="03/15">
            </div>
          </div>
          ${belong === 'partner' ? `
          <div>
            <div class="fr-label">晏的印象</div>
            <textarea class="fr-textarea" id="frNote-${safeId}" rows="2" placeholder="晏怎麼看這個人…">${f.partner_note || ''}</textarea>
          </div>
          <div>
            <div class="fr-label">對然然的了解程度</div>
            <select class="fr-input" id="frKnowsYou-${safeId}" style="cursor:pointer;">
              <option value="不知道我" ${(f.knows_you||'不知道我')==='不知道我'?'selected':''}>不知道我</option>
              <option value="知道我存在" ${f.knows_you==='知道我存在'?'selected':''}>知道我存在（只知道晏有女友）</option>
              <option value="認識我" ${f.knows_you==='認識我'?'selected':''}>認識我（晏有介紹過）</option>
              <option value="聽說過我" ${f.knows_you==='聽說過我'?'selected':''}>聽說過我（從別人那邊聽說）</option>
            </select>
          </div>
          <div>
            <div class="fr-label">心思／感情設定</div>
            <textarea class="fr-textarea" id="frAttitude-${safeId}" rows="2" placeholder="例如：暗戀晏很久了，會用開玩笑掩飾／對然然有好感但知道分寸">${f.attitude_to_you || ''}</textarea>
          </div>` : ''}

          <div class="fr-label">記憶碎片</div>
          <div class="fr-memories" id="frMems-${safeId}">
            ${(f.memories || []).filter(m => m.status !== 'pending').map(m => `
              <div class="fr-memory-item">
                <div style="flex:1;">${m.content}</div>
                <button class="fr-memory-del" data-mid="${m.id}">✕</button>
              </div>
            `).join('')}
          </div>
          <textarea class="fr-textarea" id="frNewMem-${safeId}" rows="2" placeholder="新增記憶…"></textarea>

          ${(f.memories || []).filter(m => m.status === 'pending').map(m => `
            <div class="fr-pending">
              <div class="fr-pending-label">⏳ 待確認更新</div>
              <div class="fr-pending-text">${m.content}</div>
              <div class="fr-pending-btns">
                <button class="fr-pending-confirm" data-mid="${m.id}">✓ 確認加入</button>
                <button class="fr-pending-discard" data-mid="${m.id}">✕ 不需要</button>
              </div>
            </div>
          `).join('')}

          <div class="fr-btns">
            <button class="fr-save-btn" data-fid="${f.id}" data-fname="${f.name}">儲存</button>
            ${belong === 'partner' ? `<button class="fr-autofill-btn" data-afid="${f.id || ''}" style="padding:9px 14px;background:transparent;border:1px solid var(--border);border-radius:10px;color:var(--text-3);font-size:13px;cursor:pointer;font-family:inherit;">✦ 讓晏填</button>` : ''}
            <button class="fr-del-btn" data-delid="${f.id}" data-delname="${f.name}">刪除</button>
          </div>
        </div>
      `;

      card.querySelector(`#frHeader-${safeId}`).onclick = () => {
        card.querySelector(`#frDetail-${safeId}`).classList.toggle('show');
        card.querySelector(`#frChevron-${safeId}`).classList.toggle('open');
      };

      card.querySelectorAll('.fr-memory-del').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`/friends/memories/${btn.dataset.mid}`, { method: 'DELETE' });
          loadFriends();
        };
      });

      card.querySelectorAll('.fr-pending-confirm').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`/friends/memories/${btn.dataset.mid}/confirm`, { method: 'POST' });
          loadFriends();
        };
      });

      card.querySelectorAll('.fr-pending-discard').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`/friends/memories/${btn.dataset.mid}`, { method: 'DELETE' });
          loadFriends();
        };
      });

      card.querySelector(`[data-fid="${f.id}"]`).onclick = async () => {
        const updateData = {
          name: f.name,
          belong_to: card.querySelector(`#frBelong-${safeId}`)?.value,
          relation_type: card.querySelector(`#frRelation-${safeId}`)?.value.trim(),
          personality: card.querySelector(`#frPersonality-${safeId}`)?.value.trim(),
          birthday: card.querySelector(`#frBirthday-${safeId}`)?.value.trim(),
          partner_note: card.querySelector(`#frNote-${safeId}`)?.value.trim() || '',
          knows_you: card.querySelector(`#frKnowsYou-${safeId}`)?.value || '不知道我',
          attitude_to_you: card.querySelector(`#frAttitude-${safeId}`)?.value.trim() || '',
        };
        if (f.id) {
          // 已有 friends 表記錄，直接更新
          await fetch(`/friends/${f.id}`, {
            method: 'PUT', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(updateData)
          });
        } else {
          // 舊資料沒有 friends 表記錄，先建立，並把新 id 存回 f.id 避免重複建立
          const res = await fetch('/friends', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(updateData)
          });
          const data = await res.json();
          if (data.id) f.id = data.id;
        }
        const newMem = card.querySelector(`#frNewMem-${safeId}`)?.value.trim();
        if (newMem) {
          await fetch('/friends/memories', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ guest_name: f.name, content: newMem, status: 'confirmed', source: '手動新增' })
          });
          card.querySelector(`#frNewMem-${safeId}`).value = '';
        }
        loadFriends();
      };

      card.querySelector(`[data-delid="${f.id}"]`).onclick = async () => {
        if (!confirm(`確定要刪除 ${f.name}？`)) return;
        if (f.id) {
          await fetch(`/friends/${f.id}`, { method: 'DELETE' });
        } else {
          await fetch('/friends/memories/by-name', {
            method: 'DELETE', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ guest_name: f.name })
          });
        }
        loadFriends();
      };

      const afBtn = card.querySelector('.fr-autofill-btn');
      if (afBtn) {
        afBtn.onclick = async () => {
          let fid = f.id;
          if (!fid) {
            // 先儲存建立記錄
            const res = await fetch('/friends', {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ name: f.name, belong_to: card.querySelector(`#frBelong-${safeId}`)?.value || 'shared' })
            });
            const d = await res.json();
            fid = d.id;
            f.id = fid;
          }
          if (!fid) { afBtn.textContent = '儲存失敗'; return; }
          afBtn.textContent = '分析中…';
          afBtn.disabled = true;
          try {
            const res = await fetch(`/friends/${fid}/autofill`, { method: 'POST' });
            const data = await res.json();
            if (data.error === 'no_memories') {
              afBtn.textContent = '沒有記憶可分析';
              setTimeout(() => { afBtn.textContent = '✦ 讓晏填'; afBtn.disabled = false; }, 2000);
              return;
            }
            if (data.filled) {
              const relationInput = card.querySelector(`#frRelation-${safeId}`);
              const personalityInput = card.querySelector(`#frPersonality-${safeId}`);
              const noteArea = card.querySelector(`#frNote-${safeId}`);
              if (relationInput && !relationInput.value && data.filled.relation_type)
                relationInput.value = data.filled.relation_type;
              if (personalityInput && !personalityInput.value && data.filled.personality)
                personalityInput.value = data.filled.personality;
              if (noteArea && !noteArea.value && data.filled.partner_note)
                noteArea.value = data.filled.partner_note;
              afBtn.textContent = '填好了 ✓';
              setTimeout(() => { afBtn.textContent = '✦ 讓晏填'; afBtn.disabled = false; }, 2000);
            }
          } catch(e) {
            afBtn.textContent = '✦ 讓晏填';
            afBtn.disabled = false;
          }
        };
      }

      list.appendChild(card);
    }

    document.getElementById('frAddBtn').onclick = () => {
      document.getElementById('frAddOverlay').classList.add('show');
      document.getElementById('frNewName').focus();
    };
    document.getElementById('frAddCancel').onclick = () => {
      document.getElementById('frAddOverlay').classList.remove('show');
    };
    document.getElementById('frAddConfirm').onclick = async () => {
      const name = document.getElementById('frNewName').value.trim();
      if (!name) { document.getElementById('frNewName').focus(); return; }
      const belong = document.getElementById('frNewBelong').value;
      const relation = document.getElementById('frNewRelation').value.trim();
      const personality = document.getElementById('frNewPersonality').value.trim();
      const birthday = document.getElementById('frNewBirthday').value.trim();
      const memory = document.getElementById('frNewMemory').value.trim();

      await fetch('/friends', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, belong_to: belong, relation_type: relation, personality, birthday })
      });
      if (memory) {
        await fetch('/friends/memories', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ guest_name: name, content: memory, status: 'confirmed', source: '初始建立' })
        });
      }
      document.getElementById('frAddOverlay').classList.remove('show');
      ['frNewName','frNewRelation','frNewPersonality','frNewBirthday','frNewMemory'].forEach(id => {
        document.getElementById(id).value = '';
      });
      loadFriends();
    };

    await loadFriends();
    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.friends = { mount };
})();