// ═══ View: 日記（真正 SPA 化）═══
(function () {
  const STYLE_ID = 'view-diary-style';
  const CSS = `
  .dy-header {
    padding: max(20px, env(safe-area-inset-top)) 24px 12px;
    display: flex; align-items: center; position: relative; flex-shrink: 0;
    background: var(--bg);
  }
  .dy-header h1 {
    flex: 1; text-align: center;
    font-family: 'Playfair Display', serif;
    font-style: italic; font-size: 28px;
  }
  .dy-main {
    flex: 1; overflow-y: auto;
    padding: 12px 16px max(16px, env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 16px;
  }
  .dy-compose {
    background: var(--surface); border-radius: 16px; padding: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    display: flex; flex-direction: column; gap: 10px;
  }
  .dy-compose textarea {
    border: none; outline: none; resize: none;
    font-family: inherit; font-size: 14px; line-height: 1.6;
    color: var(--text); background: transparent; min-height: 60px; width: 100%;
  }
  .dy-compose-actions {
    display: flex; justify-content: space-between; align-items: center; gap: 8px;
  }
  .dy-btn {
    border: none; border-radius: 20px; padding: 8px 16px;
    font-size: 13px; cursor: pointer;
    background: var(--accent); color: #fff;
  }
  .dy-btn.secondary { background: var(--surface2); color: var(--text-2); }
  .dy-btn:disabled { opacity: 0.5; cursor: default; }
  .dy-entry-card {
    background: var(--surface); border-radius: 16px; padding: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    display: flex; flex-direction: column; gap: 10px;
  }
  .dy-entry-header { display: flex; align-items: center; gap: 10px; }
  .dy-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 500;
    background: var(--surface3); color: var(--text); flex-shrink: 0;
  }
  .dy-avatar.user-av { background: var(--accent); color: #fff; }
  .dy-entry-meta { display: flex; flex-direction: column; flex: 1; }
  .dy-entry-author { font-size: 13px; font-weight: 500; }
  .dy-entry-time { font-size: 11px; color: var(--text-3); }
  .dy-entry-actions { display: flex; gap: 8px; }
  .dy-action-btn {
    font-size: 11px; color: var(--text-3);
    background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 6px;
  }
  .dy-action-btn.del { color: var(--danger); }
  .dy-entry-content { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
  .dy-edit-area { display: none; flex-direction: column; gap: 8px; }
  .dy-edit-area textarea {
    border: 1px solid var(--border); border-radius: 10px; padding: 10px;
    font-family: inherit; font-size: 14px; line-height: 1.6;
    resize: none; outline: none; min-height: 80px;
    background: var(--bg); color: var(--text); width: 100%;
  }
  .dy-edit-btns { display: flex; gap: 8px; justify-content: flex-end; }
  .dy-comments {
    display: flex; flex-direction: column; gap: 8px;
    border-top: 1px solid var(--border); padding-top: 10px;
  }
  .dy-comment { display: flex; gap: 8px; align-items: flex-start; }
  .dy-comment .dy-avatar { width: 26px; height: 26px; font-size: 10px; }
  .dy-comment-right { flex: 1; }
  .dy-comment-bubble {
    background: var(--surface2); border-radius: 12px;
    padding: 8px 12px; font-size: 13px; line-height: 1.5;
  }
  .dy-comment-header { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  .dy-comment-author { font-size: 11px; color: var(--text-3); font-weight: 500; }
  .dy-comment-reply-tag { font-size: 11px; color: var(--accent); }
  .dy-comment-reply-preview {
    font-size: 11px; color: var(--text-3);
    background: var(--surface3); border-radius: 6px;
    padding: 4px 8px; margin-bottom: 4px;
    border-left: 2px solid var(--accent);
  }
  .dy-comment-actions { display: flex; gap: 8px; margin-top: 4px; }
  .dy-comment-action-btn {
    font-size: 11px; color: var(--text-3);
    background: none; border: none; cursor: pointer; padding: 2px 4px;
  }
  .dy-comment-action-btn.reply { color: var(--accent); }
  .dy-comment-action-btn.del { color: var(--danger); }
  .dy-comment-edit-area { display: none; gap: 6px; margin-top: 6px; flex-direction: row; }
  .dy-comment-edit-area input {
    flex: 1; border: 1px solid var(--border); border-radius: 10px;
    padding: 6px 10px; font-size: 13px; outline: none;
    background: var(--bg); color: var(--text);
  }
  .dy-reply-hint {
    display: none; font-size: 12px; color: var(--accent);
    background: var(--surface2); border-radius: 8px;
    padding: 6px 10px; border-left: 2px solid var(--accent); cursor: pointer;
  }
  .dy-comment-input { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  .dy-comment-input-row { display: flex; gap: 8px; }
  .dy-comment-input input {
    flex: 1; border: 1px solid var(--border); border-radius: 16px;
    padding: 6px 12px; font-size: 13px; outline: none;
    background: var(--bg); color: var(--text);
  }
  .dy-comment-input button {
    border: none; background: var(--surface2); color: var(--text-2);
    border-radius: 16px; padding: 6px 12px; font-size: 12px; cursor: pointer;
  }
  .dy-ai-comment-btns { display: flex; gap: 8px; }
  .dy-ai-comment-btn {
    font-size: 11px; color: var(--accent);
    background: none; border: none; cursor: pointer; padding: 0;
  }
  .dy-ai-comment-btn:disabled { opacity: 0.4; cursor: default; }
  .dy-empty { text-align: center; color: var(--text-3); font-size: 13px; padding: 40px 0; }
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
      <div class="dy-header"><h1>Diary</h1></div>
      <div class="dy-main" id="dyMain">
        <div class="dy-compose">
          <textarea id="dyNewEntry" placeholder="寫點什麼…"></textarea>
          <div class="dy-compose-actions">
            <button class="dy-btn secondary" id="dyAiEntryBtn">邀晏寫日記</button>
            <button class="dy-btn" id="dyPostBtn">發布</button>
          </div>
        </div>
        <div id="dyEntries"></div>
      </div>
    `;

    let replyState = {};
    let names = { user: '然然', bot: '晏' };

    // 載入人物名稱
    try {
      const res = await fetch('/personas');
      const data = await res.json();
      names.user = data.user?.name || names.user;
      names.bot = data.claude?.name || names.bot;
    } catch (e) {}

    function formatTime(ts) {
      if (!ts) return '';
      let s = ts;
      // Supabase 存的是 UTC；若字串沒帶時區資訊，補上 Z 再解析，避免被當成本地時間
      if (typeof s === 'string' && !/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
      const d = new Date(s);
      const now = new Date();
      const isToday = d.getFullYear() === now.getFullYear()
                   && d.getMonth() === now.getMonth()
                   && d.getDate() === now.getDate();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      if (isToday) return `${hh}:${mm}`;
      return `${d.getMonth()+1}/${d.getDate()} ${hh}:${mm}`;
    }

    function escHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function avatarInitial(author) {
      if (author === names.user) return names.user.charAt(0);
      if (author === names.bot) return names.bot.charAt(0);
      return author.charAt(0);
    }

    function isUserAuthor(author) {
      return author === names.user;
    }

    async function loadEntries() {
      try {
        const res = await fetch('/diary');
        const data = await res.json();
        const container = document.getElementById('dyEntries');
        if (!container) return;
        container.innerHTML = '';

        if (data.entries.length === 0) {
          container.innerHTML = '<div class="dy-empty">還沒有日記，寫下第一篇吧</div>';
          return;
        }

        data.entries.forEach(entry => {
          const card = document.createElement('div');
          card.className = 'dy-entry-card';

          const commentMap = {};
          entry.comments.forEach(c => commentMap[c.id] = c);

          const commentsEl = document.createElement('div');
          commentsEl.className = 'dy-comments';

          entry.comments.forEach(c => {
            const replyTo = c.reply_to ? commentMap[c.reply_to] : null;
            const commentEl = document.createElement('div');
            commentEl.className = 'dy-comment';
            commentEl.id = `dy-comment-${c.id}`;

            const avEl = document.createElement('div');
            avEl.className = `dy-avatar${isUserAuthor(c.author) ? ' user-av' : ''}`;
            avEl.textContent = avatarInitial(c.author);

            const rightEl = document.createElement('div');
            rightEl.className = 'dy-comment-right';

            let replyPreviewHtml = '';
            let replyTagHtml = '';
            if (replyTo) {
              replyPreviewHtml = `<div class="dy-comment-reply-preview">${escHtml(replyTo.author)}：${escHtml(replyTo.content.substring(0, 30))}${replyTo.content.length > 30 ? '…' : ''}</div>`;
              replyTagHtml = `<span class="dy-comment-reply-tag">回覆 ${escHtml(replyTo.author)}</span>`;
            }

            rightEl.innerHTML = `
              <div class="dy-comment-bubble">
                <div class="dy-comment-header">
                  <span class="dy-comment-author">${escHtml(c.author)}</span>
                  ${replyTagHtml}
                </div>
                ${replyPreviewHtml}
                <div id="dy-comment-text-${c.id}">${escHtml(c.content)}</div>
              </div>
              <div class="dy-comment-actions">
                <button class="dy-comment-action-btn reply">回覆</button>
                ${isUserAuthor(c.author) ? `
                  <button class="dy-comment-action-btn del">刪除</button>
                  <button class="dy-comment-action-btn edit-c">編輯</button>
                ` : ''}
              </div>
              <div class="dy-comment-edit-area" id="dy-edit-comment-${c.id}">
                <input type="text" value="${escHtml(c.content)}" id="dy-edit-comment-input-${c.id}">
                <button class="dy-btn secondary" style="padding:4px 10px;font-size:12px;">取消</button>
                <button class="dy-btn" style="padding:4px 10px;font-size:12px;">儲存</button>
              </div>
            `;

            // 綁定留言事件
            rightEl.querySelector('.dy-comment-action-btn.reply').onclick = () => startReply(entry.id, c.id, c.author);
            if (isUserAuthor(c.author)) {
              rightEl.querySelector('.dy-comment-action-btn.del').onclick = () => deleteComment(c.id);
              rightEl.querySelector('.dy-comment-action-btn.edit-c').onclick = () => {
                document.getElementById(`dy-edit-comment-${c.id}`).style.display = 'flex';
              };
              const editArea = rightEl.querySelector(`#dy-edit-comment-${c.id}`);
              const [cancelBtn, saveBtn] = editArea.querySelectorAll('button');
              cancelBtn.onclick = () => { editArea.style.display = 'none'; };
              saveBtn.onclick = () => saveEditComment(c.id);
            }

            commentEl.appendChild(avEl);
            commentEl.appendChild(rightEl);
            commentsEl.appendChild(commentEl);
          });

          const isUserEntry = isUserAuthor(entry.author);
          const actionsHtml = isUserEntry ? `
            <div class="dy-entry-actions">
              <button class="dy-action-btn edit-entry">編輯</button>
              <button class="dy-action-btn del">刪除</button>
            </div>` : '';

          card.innerHTML = `
            <div class="dy-entry-header">
              <div class="dy-avatar${isUserEntry ? ' user-av' : ''}">${avatarInitial(entry.author)}</div>
              <div class="dy-entry-meta">
                <div class="dy-entry-author">${escHtml(entry.author)}</div>
                <div class="dy-entry-time">${formatTime(entry.created_at)}</div>
              </div>
              ${actionsHtml}
            </div>
            <div class="dy-entry-content" id="dy-content-${entry.id}">${escHtml(entry.content)}</div>
            <div class="dy-edit-area" id="dy-edit-${entry.id}">
              <textarea id="dy-edit-text-${entry.id}">${escHtml(entry.content)}</textarea>
              <div class="dy-edit-btns">
                <button class="dy-btn secondary cancel-edit">取消</button>
                <button class="dy-btn save-edit">儲存</button>
              </div>
            </div>
          `;

          card.appendChild(commentsEl);

          // 回覆提示
          const replyHint = document.createElement('div');
          replyHint.className = 'dy-reply-hint';
          replyHint.id = `dy-reply-hint-${entry.id}`;
          replyHint.onclick = () => cancelReply(entry.id);
          card.appendChild(replyHint);

          // AI 留言按鈕
          const aiCommentBtns = document.createElement('div');
          aiCommentBtns.className = 'dy-ai-comment-btns';
          const aiBtn = document.createElement('button');
          aiBtn.className = 'dy-ai-comment-btn';
          aiBtn.id = `dy-ai-btn-${entry.id}`;
          aiBtn.textContent = `邀${names.bot}留言`;
          aiBtn.onclick = () => askAiComment(entry.id, aiBtn);
          aiCommentBtns.appendChild(aiBtn);
          card.appendChild(aiCommentBtns);

          // 留言輸入
          const commentInput = document.createElement('div');
          commentInput.className = 'dy-comment-input';
          commentInput.innerHTML = `
            <div class="dy-comment-input-row">
              <input type="text" id="dy-comment-input-${entry.id}" placeholder="留言…">
              <button>送出</button>
            </div>
          `;
          const commentInputEl = commentInput.querySelector('input');
          commentInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') postComment(entry.id);
          });
          commentInput.querySelector('button').onclick = () => postComment(entry.id);
          card.appendChild(commentInput);

          // 綁定日記編輯/刪除
          if (isUserEntry) {
            card.querySelector('.edit-entry').onclick = () => startEdit(entry.id);
            card.querySelector('.dy-action-btn.del').onclick = () => deleteEntry(entry.id);
            card.querySelector('.cancel-edit').onclick = () => cancelEdit(entry.id);
            card.querySelector('.save-edit').onclick = () => saveEdit(entry.id);
          }

          document.getElementById('dyEntries').appendChild(card);
        });
      } catch (e) {}
    }

    function startReply(entryId, commentId, author) {
      replyState[entryId] = { commentId, author };
      const hint = document.getElementById(`dy-reply-hint-${entryId}`);
      if (!hint) return;
      hint.style.display = 'block';
      hint.textContent = `回覆 ${author}　✕`;
      const input = document.getElementById(`dy-comment-input-${entryId}`);
      if (input) input.focus();
    }

    function cancelReply(entryId) {
      replyState[entryId] = null;
      const hint = document.getElementById(`dy-reply-hint-${entryId}`);
      if (hint) hint.style.display = 'none';
    }

    async function saveEditComment(id) {
      const content = document.getElementById(`dy-edit-comment-input-${id}`)?.value.trim();
      if (!content) return;
      await fetch(`/diary/comment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      loadEntries();
    }

    async function deleteComment(id) {
      if (!confirm('確定要刪除這則留言嗎？')) return;
      await fetch(`/diary/comment/${id}`, { method: 'DELETE' });
      loadEntries();
    }

    function startEdit(id) {
      const content = document.getElementById(`dy-content-${id}`);
      const edit = document.getElementById(`dy-edit-${id}`);
      if (content) content.style.display = 'none';
      if (edit) edit.style.display = 'flex';
      document.getElementById(`dy-edit-text-${id}`)?.focus();
    }

    function cancelEdit(id) {
      const content = document.getElementById(`dy-content-${id}`);
      const edit = document.getElementById(`dy-edit-${id}`);
      if (content) content.style.display = '';
      if (edit) edit.style.display = 'none';
    }

    async function saveEdit(id) {
      const content = document.getElementById(`dy-edit-text-${id}`)?.value.trim();
      if (!content) return;
      await fetch(`/diary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      loadEntries();
    }

    async function deleteEntry(id) {
      if (!confirm('確定要刪除這篇日記嗎？')) return;
      await fetch(`/diary/${id}`, { method: 'DELETE' });
      loadEntries();
    }

    async function postEntry() {
      const textarea = document.getElementById('dyNewEntry');
      const content = textarea?.value.trim();
      if (!content) return;
      await fetch('/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: names.user, content })
      });
      if (textarea) textarea.value = '';
      loadEntries();
    }

    async function askAiEntry() {
      const btn = document.getElementById('dyAiEntryBtn');
      if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
      try {
        await fetch('/diary/ai_entry/claude', { method: 'POST' });
        loadEntries();
      } catch (e) {}
      if (btn) { btn.disabled = false; btn.textContent = `邀${names.bot}寫日記`; }
    }

    async function postComment(entryId) {
      const input = document.getElementById(`dy-comment-input-${entryId}`);
      const content = input?.value.trim();
      if (!content) return;
      const reply = replyState[entryId];
      await fetch(`/diary/${entryId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: names.user,
          content,
          reply_to: reply ? reply.commentId : null
        })
      });
      if (input) input.value = '';
      cancelReply(entryId);
      loadEntries();
    }

    async function askAiComment(entryId, btn) {
      btn.disabled = true;
      try {
        await fetch(`/diary/${entryId}/ai_comment/claude`, { method: 'POST' });
        loadEntries();
      } catch (e) {}
      btn.disabled = false;
    }

    // 綁定頂層事件
    document.getElementById('dyPostBtn').onclick = postEntry;
    document.getElementById('dyAiEntryBtn').onclick = askAiEntry;

    await loadEntries();

    return function cleanup() {};
  }

  window.RifugioViews = window.RifugioViews || {};
  window.RifugioViews.diary = { mount };
})();