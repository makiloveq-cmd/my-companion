// ═══ View: 通話模式（發光圓球版）═══
(function () {
  const STYLE_ID = 'view-call-style';
  const CSS = `
  .call-overlay {
    display: none; position: fixed; inset: 0; z-index: 200;
    background: #0a0a0d; flex-direction: column; align-items: center;
    justify-content: flex-start; overflow: hidden;
  }
  .call-overlay.show { display: flex; }
  .call-bg-grad {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 30%, #1a1610 0%, #08080a 70%);
    pointer-events: none;
  }
  .call-body {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    width: 100%; flex: 1; padding-bottom: max(20px, env(safe-area-inset-bottom));
  }
  .call-top { padding: max(52px, env(safe-area-inset-top)) 1.5rem 0; text-align: center; }
  .call-top-name { font-size: 24px; color: rgba(255,255,255,0.92); font-weight: 400; letter-spacing: 2px; }
  .call-top-status { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .call-timer { font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 2px; font-variant-numeric: tabular-nums; }

  /* ─── 發光圓球 ─── */
  .orb-stage {
    position: relative; margin-top: 7vh;
    width: 180px; height: 180px;
    display: flex; align-items: center; justify-content: center;
  }
  .orb-halo {
    position: absolute; inset: -40px; border-radius: 50%;
    background: radial-gradient(circle, rgba(200,160,80,0.22) 0%, rgba(200,160,80,0.06) 45%, transparent 70%);
    filter: blur(18px);
    animation: haloBreath 4s ease-in-out infinite;
  }
  .orb-core {
    position: relative; width: 140px; height: 140px; border-radius: 50%;
    background:
      radial-gradient(circle at 34% 30%, rgba(255,236,200,0.95) 0%, rgba(232,190,120,0.85) 22%, rgba(160,116,60,0.9) 58%, rgba(90,64,36,0.95) 100%);
    box-shadow:
      0 0 40px rgba(210,170,90,0.35),
      0 0 90px rgba(210,170,90,0.15),
      inset -12px -14px 34px rgba(40,26,10,0.55),
      inset 8px 10px 26px rgba(255,244,220,0.4);
    animation: orbBreath 4s ease-in-out infinite;
  }
  .orb-sheen {
    position: absolute; top: 14%; left: 18%;
    width: 34%; height: 22%; border-radius: 50%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, transparent 70%);
    filter: blur(4px);
    transform: rotate(-18deg);
  }
  @keyframes orbBreath {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.035); }
  }
  @keyframes haloBreath {
    0%,100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.06); }
  }

  /* 狀態：聆聽（錄音中）*/
  .orb-stage.listening .orb-core {
    animation: orbListen 1.1s ease-in-out infinite;
    box-shadow:
      0 0 50px rgba(220,120,90,0.45),
      0 0 110px rgba(220,120,90,0.18),
      inset -12px -14px 34px rgba(50,20,12,0.55),
      inset 8px 10px 26px rgba(255,230,214,0.4);
    background:
      radial-gradient(circle at 34% 30%, rgba(255,226,208,0.95) 0%, rgba(235,160,120,0.85) 22%, rgba(180,96,66,0.9) 58%, rgba(100,48,34,0.95) 100%);
  }
  .orb-stage.listening .orb-halo {
    background: radial-gradient(circle, rgba(230,130,95,0.28) 0%, rgba(230,130,95,0.08) 45%, transparent 70%);
    animation: haloBreath 1.1s ease-in-out infinite;
  }
  @keyframes orbListen {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.07); }
  }

  /* 狀態：思考中 */
  .orb-stage.thinking .orb-core { animation: orbThink 1.6s ease-in-out infinite; }
  .orb-stage.thinking .orb-halo { animation: haloThink 1.6s ease-in-out infinite; }
  @keyframes orbThink {
    0%,100% { transform: scale(0.97); filter: brightness(0.92); }
    50% { transform: scale(1.01); filter: brightness(1.08); }
  }
  @keyframes haloThink {
    0%,100% { opacity: 0.45; }
    50% { opacity: 0.9; }
  }

  /* 狀態：說話中 */
  .orb-stage.speaking .orb-core { animation: orbSpeak 0.62s ease-in-out infinite; }
  .orb-stage.speaking .orb-halo {
    animation: haloSpeak 0.62s ease-in-out infinite;
    background: radial-gradient(circle, rgba(220,180,100,0.32) 0%, rgba(220,180,100,0.1) 45%, transparent 70%);
  }
  @keyframes orbSpeak {
    0%,100% { transform: scale(1); }
    30% { transform: scale(1.055); }
    60% { transform: scale(1.02); }
  }
  @keyframes haloSpeak {
    0%,100% { opacity: 0.75; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  /* ─── 字幕 ─── */
  .call-subtitle-area {
    margin: 4vh 1.6rem 0; width: calc(100% - 3.2rem);
    min-height: 76px; max-height: 26vh; overflow-y: auto;
    display: flex; flex-direction: column; gap: 4px; align-items: center;
    transition: opacity 0.3s; text-align: center;
  }
  .call-subtitle-area.hidden { opacity: 0; pointer-events: none; }
  .call-subtitle-speaker { font-size: 11px; color: rgba(210,170,90,0.75); letter-spacing: 1.2px; }
  .call-subtitle-text { font-size: 16px; color: rgba(255,255,255,0.92); line-height: 1.65; }

  /* ─── 底部控制 ─── */
  .call-controls {
    margin-top: auto; width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 0 1.5rem;
  }
  .call-func-btns { display: flex; gap: 26px; justify-content: center; align-items: center; }
  .call-func-btn {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .call-func-circle {
    width: 46px; height: 46px; border-radius: 50%;
    background: rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; transition: background 0.15s;
  }
  .call-func-circle.active { background: rgba(255,255,255,0.85); }
  .call-func-label { font-size: 11px; color: rgba(255,255,255,0.45); }

  .call-main-row {
    display: flex; gap: 28px; justify-content: center; align-items: center;
    margin-bottom: 6px;
  }
  .call-mic-btn {
    width: 78px; height: 78px; border-radius: 50%;
    background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 30px; transition: all 0.12s;
    -webkit-tap-highlight-color: transparent;
    touch-action: none; user-select: none; -webkit-user-select: none;
  }
  .call-mic-btn.recording {
    background: #c85040; border-color: #e0705c;
    transform: scale(1.12);
    box-shadow: 0 0 24px rgba(220,100,80,0.5);
  }
  .call-mic-hint { font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; }
  .call-hangup-btn {
    width: 58px; height: 58px; border-radius: 50%;
    background: #c0392b; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    -webkit-tap-highlight-color: transparent;
  }
  .call-kb-btn {
    width: 58px; height: 58px; border-radius: 50%;
    background: rgba(255,255,255,0.1); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
    -webkit-tap-highlight-color: transparent;
  }

  /* 打字輸入列 */
  .call-text-row {
    display: none; width: 100%; gap: 8px; align-items: center;
    padding-bottom: 4px;
  }
  .call-text-row.show { display: flex; }
  .call-text-input {
    flex: 1; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 22px; padding: 11px 16px; color: #fff; font-size: 15px;
    outline: none;
  }
  .call-text-send {
    width: 42px; height: 42px; border-radius: 50%;
    background: rgba(210,170,90,0.8); border: none; cursor: pointer;
    font-size: 17px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ─── 紀錄面板 ─── */
  .call-log-panel {
    position: fixed; inset: 0; z-index: 300;
    display: none; flex-direction: column; background: #131316;
  }
  .call-log-panel.show { display: flex; }
  .call-log-header {
    padding: max(52px, env(safe-area-inset-top)) 20px 14px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .call-log-title { font-size: 16px; color: #fff; font-weight: 500; }
  .call-log-close {
    background: rgba(255,255,255,0.12); border: none; border-radius: 50%;
    width: 30px; height: 30px; color: #fff; font-size: 15px; cursor: pointer;
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

  let callMessages = [];        // { role, content, audioUrl? }
  let callStartTime = null;
  let callTimerInterval = null;
  let isMicRecording = false;
  let isMuted = false;
  let showSubtitle = true;
  let mediaRecorder = null;
  let audioChunks = [];
  let audioCtx = null;
  let audioUnlocked = false;
  let currentSource = null;     // AudioContext playing source
  let busy = false;             // 防止同時多個請求

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

  function setOrbState(state) {
    const stage = document.getElementById('orbStage');
    if (!stage) return;
    stage.classList.remove('listening', 'thinking', 'speaking');
    if (state) stage.classList.add(state);
  }
  function setStatus(text) {
    const el = document.getElementById('callStatus');
    if (el) el.textContent = text;
  }
  function setSubtitle(speaker, text) {
    document.getElementById('callSubtitleSpeaker').textContent = speaker;
    document.getElementById('callSubtitleText').textContent = text;
  }

  // 播放 TTS，回傳 blob url（快取用，重播不再扣點）
  async function playTTS(text, speakerLabel, cachedUrl) {
    if (!text) return null;
    setSubtitle(speakerLabel, text);
    if (isMuted) return cachedUrl || null;
    try {
      let arrayBuffer, blobUrl = cachedUrl || null;
      if (cachedUrl) {
        const r = await fetch(cachedUrl);
        arrayBuffer = await r.arrayBuffer();
      } else {
        const res = await fetch('/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        if (!res.ok) return null;
        arrayBuffer = await res.arrayBuffer();
        blobUrl = URL.createObjectURL(new Blob([arrayBuffer.slice(0)], { type: 'audio/mpeg' }));
      }

      setOrbState('speaking');
      // 優先 AudioContext（iOS WebView 穩定）
      if (audioCtx) {
        try {
          if (audioCtx.state === 'suspended') await audioCtx.resume();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          if (currentSource) { try { currentSource.stop(); } catch(e){} }
          const src = audioCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(audioCtx.destination);
          currentSource = src;
          await new Promise(resolve => {
            src.onended = resolve;
            src.start(0);
          });
          setOrbState(null);
          return blobUrl;
        } catch(e) {}
      }
      // fallback: Audio 元素
      const audio = new Audio(blobUrl);
      audio.playsInline = true;
      await new Promise(resolve => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
      setOrbState(null);
      return blobUrl;
    } catch (e) {
      setOrbState(null);
      return null;
    }
  }

  // 把使用者的話送給晏（通話模式），播回覆
  async function sendToBot(text) {
    if (busy) return;
    busy = true;
    callMessages.push({ role: 'user', content: text });
    setSubtitle('然然說', text);
    setStatus('晏回覆中…');
    setOrbState('thinking');
    try {
      const chatRes = await fetch('/chat/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'call' })
      });
      const chatData = await chatRes.json();
      if (chatData.reply) {
        const msg = { role: 'assistant', content: chatData.reply };
        callMessages.push(msg);
        setStatus('通話中');
        const url = await playTTS(chatData.reply, (document.getElementById('callName').textContent || '晏') + '說');
        if (url) msg.audioUrl = url;
      } else {
        setStatus('通話中');
        setOrbState(null);
      }
    } catch (e) {
      setStatus('通話中');
      setOrbState(null);
    }
    busy = false;
  }

  // ─── 錄音（按住說話）───
  async function startRecording() {
    if (isMicRecording || busy) return;
    unlockAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        document.getElementById('callMicBtn').classList.remove('recording');
        setOrbState('thinking');
        setStatus('辨識中…');

        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        if (blob.size < 2000) { // 太短，視為誤觸
          setOrbState(null); setStatus('通話中');
          return;
        }
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        try {
          const sttRes = await fetch('/voice/stt', { method: 'POST', body: formData });
          const sttData = await sttRes.json();
          if (sttData.text && sttData.text.trim()) {
            await sendToBot(sttData.text.trim());
          } else {
            setOrbState(null); setStatus('通話中');
          }
        } catch (e) {
          setOrbState(null); setStatus('通話中');
        }
      };
      mediaRecorder.start();
      isMicRecording = true;
      document.getElementById('callMicBtn').classList.add('recording');
      setOrbState('listening');
      setStatus('聽你說…');
    } catch (e) {
      setStatus('無法存取麥克風');
    }
  }

  function stopRecording() {
    if (!isMicRecording) return;
    isMicRecording = false;
    try { mediaRecorder.stop(); } catch(e) {}
  }

  window.RifugioCall = {
    open: async function (botName, botAvatar) {
      ensureStyle();
      unlockAudio();
      const overlay = document.getElementById('callOverlay');
      if (!overlay) return;

      callMessages = [];
      callStartTime = Date.now();
      isMicRecording = false;
      isMuted = false;
      showSubtitle = true;
      busy = false;

      document.getElementById('callName').textContent = botName || '晏';
      setSubtitle((botName || '晏') + '說', '……');
      setStatus('接通中…');
      document.getElementById('callTimer').textContent = '00:00';
      document.getElementById('callSubtitleArea').classList.remove('hidden');
      document.getElementById('callTextRow').classList.remove('show');
      setOrbState(null);

      overlay.classList.add('show');

      callTimerInterval = setInterval(() => {
        document.getElementById('callTimer').textContent = formatTime(getCallDuration());
      }, 1000);

      // 接通自動打招呼
      setTimeout(async () => {
        if (busy) return;
        busy = true;
        setOrbState('thinking');
        try {
          const res = await fetch('/chat/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '【通話接通，請用一兩句簡短的話自然打招呼】', mode: 'call' })
          });
          const data = await res.json();
          if (data.reply) {
            const msg = { role: 'assistant', content: data.reply };
            callMessages.push(msg);
            setStatus('通話中');
            const url = await playTTS(data.reply, (botName || '晏') + '說');
            if (url) msg.audioUrl = url;
          } else {
            setStatus('通話中'); setOrbState(null);
          }
        } catch (e) {
          setStatus('通話中'); setOrbState(null);
        }
        busy = false;
      }, 700);
    },

    close: async function () {
      const overlay = document.getElementById('callOverlay');
      if (!overlay) return;
      clearInterval(callTimerInterval);
      if (currentSource) { try { currentSource.stop(); } catch(e){} }
      if (isMicRecording) stopRecording();
      overlay.classList.remove('show');

      if (callMessages.length > 0) {
        try {
          await fetch('/call/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: callMessages.map(m => ({ role: m.role, content: m.content })),
              duration_seconds: getCallDuration()
            })
          });
        } catch (e) {}
      }
    }
  };

  function mount() {
    ensureStyle();

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
            <div class="call-timer" id="callTimer">00:00</div>
          </div>

          <div class="orb-stage" id="orbStage">
            <div class="orb-halo"></div>
            <div class="orb-core"><div class="orb-sheen"></div></div>
          </div>

          <div class="call-subtitle-area" id="callSubtitleArea">
            <div class="call-subtitle-speaker" id="callSubtitleSpeaker">晏說</div>
            <div class="call-subtitle-text" id="callSubtitleText">……</div>
          </div>

          <div class="call-controls">
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

            <div class="call-main-row">
              <button class="call-kb-btn" id="callKbBtn">⌨️</button>
              <button class="call-mic-btn" id="callMicBtn">🎙</button>
              <button class="call-hangup-btn" id="callHangupBtn">📵</button>
            </div>
            <div class="call-mic-hint" id="callMicHint">按住說話</div>

            <div class="call-text-row" id="callTextRow">
              <input class="call-text-input" id="callTextInput" placeholder="打字說…" />
              <button class="call-text-send" id="callTextSend">➤</button>
            </div>
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

      // 靜音
      document.getElementById('callMuteBtn').onclick = () => {
        isMuted = !isMuted;
        document.getElementById('callMuteCircle').classList.toggle('active', isMuted);
        if (isMuted && currentSource) { try { currentSource.stop(); } catch(e){} setOrbState(null); }
      };

      // 字幕
      document.getElementById('callSubtitleBtn').onclick = () => {
        showSubtitle = !showSubtitle;
        document.getElementById('callSubtitleCircle').classList.toggle('active', showSubtitle);
        document.getElementById('callSubtitleArea').classList.toggle('hidden', !showSubtitle);
      };

      // 紀錄 + 重播（優先播快取，不重複扣點）
      document.getElementById('callLogBtn').onclick = () => {
        const list = document.getElementById('callLogList');
        list.innerHTML = '';
        if (callMessages.length === 0) {
          list.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:14px;text-align:center;padding:2rem;">還沒有對話記錄</div>';
        } else {
          callMessages.forEach((m, idx) => {
            const item = document.createElement('div');
            item.className = 'call-log-item';
            const speaker = m.role === 'user' ? '然然' : (document.getElementById('callName').textContent || '晏');
            item.innerHTML = `
              <div class="call-log-speaker">${speaker}</div>
              <div class="call-log-text"></div>
              ${m.role === 'assistant' ? `<button class="call-log-replay" data-idx="${idx}">🔊 重播</button>` : ''}
            `;
            item.querySelector('.call-log-text').textContent = m.content;
            list.appendChild(item);
          });
          list.querySelectorAll('.call-log-replay').forEach(btn => {
            btn.onclick = async () => {
              const m = callMessages[parseInt(btn.dataset.idx)];
              if (!m) return;
              const url = await playTTS(m.content, (document.getElementById('callName').textContent || '晏') + '說', m.audioUrl);
              if (url && !m.audioUrl) m.audioUrl = url;
            };
          });
        }
        document.getElementById('callLogPanel').classList.add('show');
      };
      document.getElementById('callLogClose').onclick = () => {
        document.getElementById('callLogPanel').classList.remove('show');
      };

      // 麥克風：按住說話（touch + mouse）
      const micBtn = document.getElementById('callMicBtn');
      micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); }, { passive: false });
      micBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });
      micBtn.addEventListener('touchcancel', () => stopRecording());
      micBtn.addEventListener('mousedown', (e) => { e.preventDefault(); startRecording(); });
      micBtn.addEventListener('mouseup', () => stopRecording());
      micBtn.addEventListener('mouseleave', () => stopRecording());
      micBtn.addEventListener('contextmenu', (e) => e.preventDefault());

      // 打字切換
      document.getElementById('callKbBtn').onclick = () => {
        const row = document.getElementById('callTextRow');
        row.classList.toggle('show');
        if (row.classList.contains('show')) {
          document.getElementById('callTextInput').focus();
        }
      };
      const sendText = async () => {
        const input = document.getElementById('callTextInput');
        const text = input.value.trim();
        if (!text || busy) return;
        input.value = '';
        unlockAudio();
        await sendToBot(text);
      };
      document.getElementById('callTextSend').onclick = sendText;
      document.getElementById('callTextInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendText(); }
      });

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