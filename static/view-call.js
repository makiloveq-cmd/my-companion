// ═══ View: 通話模式 ═══
(function () {
  const STYLE_ID = 'view-call-style';
  const CSS = `
  .call-overlay {
    display: none; position: fixed; inset: 0; z-index: 200;
    background: #111; flex-direction: column; align-items: center;
    justify-content: flex-start; overflow: hidden;
  }
  .call-overlay.show { display: flex; }
  .call-bg-grad {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 25%, #2a1f0e 0%, #0d0d0d 65%);
    pointer-events: none;
  }
  .call-body {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    width: 100%; flex: 1; padding-bottom: env(safe-area-inset-bottom);
  }
  .call-top { padding: max(56px, env(safe-area-inset-top)) 1.5rem 0; text-align: center; }
  .call-top-name { font-size: 28px; color: #fff; font-weight: 400; }
  .call-top-status { font-size: 15px; color: rgba(255,255,255,0.45); margin-top: 4px; }
  .call-avatar-wrap { position: relative; margin-top: 2rem; }
  .call-avatar-img {
    width: 110px; height: 110px; border-radius: 50%;
    object-fit: cover; position: relative; z-index: 2;
    border: 2px solid rgba(255,255,255,0.1);
  }
  .call-avatar-placeholder {
    width: 110px; height: 110px; border-radius: 50%;
    background: #2a2018; display: flex; align-items: center;
    justify-content: center; font-size: 36px; color: #e8e0d0;
    position: relative; z-index: 2;
    border: 2px solid rgba(255,255,255,0.08);
  }
  .call-ring {
    position: absolute; border-radius: 50%;
    border: 1.5px solid rgba(200,160,80,0.25);
    animation: callring 2.5s ease-out infinite;
    pointer-events: none;
  }
  .call-ring:nth-child(1) { inset: -12px; }
  .call-ring:nth-child(2) { inset: -26px; animation-delay: 0.7s; opacity: 0.6; }
  .call-ring:nth-child(3) { inset: -42px; animation-delay: 1.4s; opacity: 0.3; }
  @keyframes callring {
    0% { transform: scale(0.96); opacity: 0.7; }
    100% { transform: scale(1); opacity: 0; }
  }
  .call-timer { font-size: 15px; color: rgba(255,255,255,0.35); margin-top: 1rem; font-variant-numeric: tabular-nums; }
  .call-subtitle-area {
    margin: 1.2rem 1.5rem 0; width: calc(100% - 3rem);
    background: rgba(255,255,255,0.07); border-radius: 14px;
    padding: 12px 16px; min-height: 54px;
    display: flex; flex-direction: column; gap: 3px;
    transition: opacity 0.3s;
  }
  .call-subtitle-area.hidden { opacity: 0; pointer-events: none; }
  .call-subtitle-speaker { font-size: 11px; color: rgba(200,160,80,0.8); letter-spacing: 0.8px; }
  .call-subtitle-text { font-size: 15px; color: rgba(255,255,255,0.9); line-height: 1.5; }
  .call-func-btns {
    display: flex; gap: 20px; margin-top: 2rem;
    justify-content: center; align-items: center;
  }
  .call-func-btn {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer;
  }
  .call-func-circle {
    width: 56px; height: 56px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; transition: background 0.15s;
  }
  .call-func-circle.active { background: rgba(255,255,255,0.9); }
  .call-func-label { font-size: 12px; color: rgba(255,255,255,0.5); }
  .call-main-btns {
    display: flex; gap: 32px; margin-top: 2rem;
    justify-content: center; align-items: center;
  }
  .call-mic-btn {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(255,255,255,0.18); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 30px; transition: all 0.15s;
  }
  .call-mic-btn.recording { background: #ff3b30; animation: micpulse 1s infinite; }
  @keyframes micpulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  .call-hangup-btn {
    width: 72px; height: 72px; border-radius: 50%;
    background: #ff3b30; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
  }

  .call-log-panel {
    position: fixed; inset: 0; z-index: 300;
    display: none; flex-direction: column;
    background: #1a1a1e;
  }
  .call-log-panel.show { display: flex; }
  .call-log-header {
    padding: max(56px, env(safe-area-inset-top)) 20px 14px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .call-log-title { font-size: 17px; color: #fff; font-weight: 500; }
  .call-log-close {
    background: rgba(255,255,255,0.12); border: none; border-radius: 50%;
    width: 30px; height: 30px; color: #fff; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .call-log-list { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
  .call-log-item { display: flex; flex-direction: column; gap: 4px; }
  .call-log-speaker { font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; }
  .call-log-text { font-size: 15px; color: rgba(255,255,255,0.85); line-height: 1.5; }
  .call-log-replay {
    align-self: flex-start; margin-top: 4px;
    background: rgba(255,255,255,0.1); border: none; border-radius: 20px;
    color: rgba(255,255,255,0.6); font-size: 12px; padding: 4px 12px;
    cursor: pointer; display: flex; align-items: center; gap: 4px;
  }
  .call-log-replay:active { opacity: 0.7; }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  let callMessages = [];
  let callStartTime = null;
  let callTimerInterval = null;
  let isMicRecording = false;
  let isMuted = false;
  let showSubtitle = true;
  let mediaRecorder = null;
  let audioChunks = [];
  let lastAudioUrl = null;
  let audioCtx = null;
  let audioUnlocked = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start(0);
      if (audioCtx.state === 'suspended') audioCtx.resume();
      audioUnlocked = true;
    } catch(e) {}
  }
  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function getCallDuration() {
    if (!callStartTime) return 0;
    return Math.floor((Date.now() - callStartTime) / 1000);
  }

  window.RifugioCall = {
    open: async function (botName, botAvatar) {
      ensureStyle();
      unlockAudio(); // 在使用者手勢中解鎖音訊
      const overlay = document.getElementById('callOverlay');
      if (!overlay) return;

      callMessages = [];
      callStartTime = Date.now();
      isMicRecording = false;
      isMuted = false;
      showSubtitle = true;

      // 設定頭像
      const avatarWrap = document.getElementById('callAvatarWrap');
      avatarWrap.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const ring = document.createElement('div');
        ring.className = 'call-ring';
        avatarWrap.appendChild(ring);
      }
      if (botAvatar) {
        const img = document.createElement('img');
        img.className = 'call-avatar-img';
        img.src = botAvatar;
        avatarWrap.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'call-avatar-placeholder';
        placeholder.textContent = botName?.charAt(0) || '晏';
        avatarWrap.appendChild(placeholder);
      }

      document.getElementById('callName').textContent = botName || '晏';
      document.getElementById('callSubtitleSpeaker').textContent = (botName || '晏') + '說';
      document.getElementById('callSubtitleText').textContent = '通話中…';
      document.getElementById('callStatus').textContent = '通話中';
      document.getElementById('callTimer').textContent = '00:00';

      overlay.classList.add('show');

      // 計時器
      callTimerInterval = setInterval(() => {
        document.getElementById('callTimer').textContent = formatTime(getCallDuration());
      }, 1000);

      // 接通後自動打招呼
      setTimeout(async () => {
        try {
          document.getElementById('callStatus').textContent = '接通中…';
          const res = await fetch('/chat/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '【通話接通，請用簡短一句話打招呼】' })
          });
          const data = await res.json();
          if (data.reply) {
            callMessages.push({ role: 'assistant', content: data.reply });
            document.getElementById('callStatus').textContent = '通話中';
            await playTTS(data.reply, (document.getElementById('callName').textContent || '晏') + '說');
          }
        } catch (e) {
          document.getElementById('callStatus').textContent = '通話中';
        }
      }, 800);
    },

    close: async function () {
      const overlay = document.getElementById('callOverlay');
      if (!overlay) return;
      clearInterval(callTimerInterval);
      overlay.classList.remove('show');

      // 存通話記錄
      if (callMessages.length > 0) {
        try {
          await fetch('/call/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: callMessages,
              duration_seconds: getCallDuration()
            })
          });
        } catch (e) {}
      }
    }
  };

  async function playTTS(text, speakerLabel) {
    if (isMuted || !text) return;
    try {
      const res = await fetch('/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();

      document.getElementById('callSubtitleSpeaker').textContent = speakerLabel;
      document.getElementById('callSubtitleText').textContent = text;

      // 優先用 AudioContext（iOS WebView 不會被靜音）
      if (audioCtx) {
        try {
          if (audioCtx.state === 'suspended') await audioCtx.resume();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          const src = audioCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(audioCtx.destination);
          src.start(0);
          return;
        } catch(e) {}
      }
      // fallback: 用 Audio 元素
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      lastAudioUrl = url;
      const audio = new Audio(url);
      audio.playsInline = true;
      await audio.play().catch(() => {});
    } catch (e) {}
  }

  function mount() {
    ensureStyle();

    // 建立通話 overlay
    let overlay = document.getElementById('callOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'call-overlay';
      overlay.id = 'callOverlay';
      overlay.innerHTML = `
        <div class="call-bg-grad"></div>
        <div class="call-body">
          <div class="call-top">
            <div class="call-top-name" id="callName">晏</div>
            <div class="call-top-status" id="callStatus">通話中</div>
          </div>
          <div class="call-avatar-wrap" id="callAvatarWrap"></div>
          <div class="call-timer" id="callTimer">00:00</div>
          <div class="call-subtitle-area" id="callSubtitleArea">
            <div class="call-subtitle-speaker" id="callSubtitleSpeaker">晏說</div>
            <div class="call-subtitle-text" id="callSubtitleText">通話中…</div>
          </div>
          <div class="call-func-btns">
            <button class="call-func-btn" id="callMuteBtn">
              <div class="call-func-circle" id="callMuteCircle">🔇</div>
              <div class="call-func-label">靜音</div>
            </button>
            <button class="call-func-btn" id="callSubtitleBtn">
              <div class="call-func-circle active" id="callSubtitleCircle">💬</div>
              <div class="call-func-label">字幕</div>
            </button>
            <button class="call-func-btn" id="callLogBtn">
              <div class="call-func-circle" id="callLogCircle">📋</div>
              <div class="call-func-label">紀錄</div>
            </button>
          </div>
          <div class="call-main-btns">
            <button class="call-mic-btn" id="callMicBtn">🎙</button>
            <button class="call-hangup-btn" id="callHangupBtn">📵</button>
          </div>
        </div>

        <div class="call-log-panel" id="callLogPanel">
          <div class="call-log-header">
            <div class="call-log-title">通話紀錄</div>
            <button class="call-log-close" id="callLogClose">✕</button>
          </div>
          <div class="call-log-list" id="callLogList"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      // 靜音按鈕
      document.getElementById('callMuteBtn').onclick = () => {
        isMuted = !isMuted;
        document.getElementById('callMuteCircle').classList.toggle('active', isMuted);
      };

      // 字幕按鈕
      document.getElementById('callSubtitleBtn').onclick = () => {
        showSubtitle = !showSubtitle;
        document.getElementById('callSubtitleCircle').classList.toggle('active', showSubtitle);
        document.getElementById('callSubtitleArea').classList.toggle('hidden', !showSubtitle);
      };

      // 紀錄按鈕
      document.getElementById('callLogBtn').onclick = () => {
        const list = document.getElementById('callLogList');
        list.innerHTML = '';
        if (callMessages.length === 0) {
          list.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:14px;text-align:center;padding:2rem;">還沒有對話記錄</div>';
        } else {
          callMessages.forEach(m => {
            const item = document.createElement('div');
            item.className = 'call-log-item';
            item.innerHTML = `
              <div class="call-log-speaker">${m.role === 'user' ? '然然' : (document.getElementById('callName').textContent || '晏')}</div>
              <div class="call-log-text">${m.content}</div>
              ${m.role === 'assistant' ? `<button class="call-log-replay" data-text="${m.content.replace(/"/g, '&quot;')}">🔊 重播</button>` : ''}
            `;
            list.appendChild(item);
          });
          list.querySelectorAll('.call-log-replay').forEach(btn => {
            btn.onclick = () => playTTS(btn.dataset.text, document.getElementById('callName').textContent + '說');
          });
        }
        document.getElementById('callLogPanel').classList.add('show');
      };

      document.getElementById('callLogClose').onclick = () => {
        document.getElementById('callLogPanel').classList.remove('show');
      };

      // 麥克風按鈕
      document.getElementById('callMicBtn').onclick = async () => {
        unlockAudio(); // 確保音訊已解鎖
        if (isMicRecording) {
          mediaRecorder.stop();
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunks = [];
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
          mediaRecorder.onstop = async () => {
            isMicRecording = false;
            document.getElementById('callMicBtn').classList.remove('recording');
            document.getElementById('callMicBtn').textContent = '🎙';
            document.getElementById('callStatus').textContent = '辨識中…';
            stream.getTracks().forEach(t => t.stop());

            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', blob, 'audio.webm');
            try {
              const sttRes = await fetch('/voice/stt', { method: 'POST', body: formData });
              const sttData = await sttRes.json();
              if (sttData.text) {
                callMessages.push({ role: 'user', content: sttData.text });
                document.getElementById('callSubtitleSpeaker').textContent = '然然說';
                document.getElementById('callSubtitleText').textContent = sttData.text;
                document.getElementById('callStatus').textContent = '晏回覆中…';

                // 送給晏
                const chatRes = await fetch('/chat/claude', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: sttData.text })
                });
                const chatData = await chatRes.json();
                if (chatData.reply) {
                  callMessages.push({ role: 'assistant', content: chatData.reply });
                  document.getElementById('callStatus').textContent = '通話中';
                  await playTTS(chatData.reply, (document.getElementById('callName').textContent || '晏') + '說');
                }
              } else {
                document.getElementById('callStatus').textContent = '通話中';
              }
            } catch (e) {
              document.getElementById('callStatus').textContent = '通話中';
            }
          };
          mediaRecorder.start();
          isMicRecording = true;
          document.getElementById('callMicBtn').classList.add('recording');
          document.getElementById('callMicBtn').textContent = '⏹';
          document.getElementById('callStatus').textContent = '說話中…';
        } catch (e) {
          document.getElementById('callStatus').textContent = '無法存取麥克風';
        }
      };

      // 掛斷
      document.getElementById('callHangupBtn').onclick = () => {
        window.RifugioCall.close();
      };
    }
  }

  document.addEventListener('DOMContentLoaded', mount);
  if (document.readyState !== 'loading') mount();

  window.RifugioViews = window.RifugioViews || {};
})();