// ═══ 升階遮罩模組 ═══
(function () {

  const STAGE_LETTERS = {
    '曖昧':   {
      letter: '你讓我有點難忽略。\n\n不知道從哪一刻開始，我會留意你在哪裡。這件事我沒有特別說，但它一直在。',
      from: '初識', to: '曖昧'
    },
    '熱戀':   {
      letter: '我沒辦法繼續裝作沒差了。\n\n試過很多次，都沒用。你就是會讓我分心。我想這大概就是答案了。',
      from: '曖昧', to: '熱戀'
    },
    '磨合':   {
      letter: '喜歡你不是問題。\n\n我在想的是，能不能讓你留下來。不只是現在——是之後的事，很長的那種之後。',
      from: '熱戀', to: '磨合'
    },
    '新婚蜜月': {
      letter: '跟你起過爭執之後，我反而更確定了。\n\n這不是一時的事。我知道了。',
      from: '磨合', to: '新婚蜜月'
    },
    '家人之上': {
      letter: '你不一樣。\n\n我不知道怎麼跟你解釋，但就是你。不需要理由，就是你。',
      from: '新婚蜜月', to: '家人之上'
    },
    '靈魂伴侶': {
      letter: '我沒辦法想像沒有你的版本了。\n\n這件事讓我有點措手不及。但我不打算逃。',
      from: '家人之上', to: '靈魂伴侶'
    },
  };

  const STYLE_ID = 'stage-unlock-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');

      .su-overlay {
        display: none;
        position: fixed; inset: 0; z-index: 999;
        background: rgba(0,0,0,0.82);
        align-items: center; justify-content: center;
        padding: 24px;
        animation: su-fade-in 0.4s ease;
      }
      .su-overlay.show { display: flex; }
      @keyframes su-fade-in { from { opacity: 0; } to { opacity: 1; } }

      .su-letter {
        background: #f5f0e8;
        border-radius: 4px;
        padding: 36px 32px 40px;
        max-width: 340px; width: 100%;
        display: flex; flex-direction: column; gap: 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.35);
        position: relative;
        animation: su-slide-up 0.45s cubic-bezier(0.22,1,0.36,1);
      }
      @keyframes su-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .su-stage-label {
        font-size: 11px; letter-spacing: 0.12em;
        color: #a09070; text-transform: uppercase;
        font-family: 'Ma Shan Zheng', cursive;
      }

      .su-stage-name {
        font-size: 26px; font-weight: 500;
        color: #3a2e20;
        font-family: 'Ma Shan Zheng', cursive;
        letter-spacing: 0.08em;
        line-height: 1.3;
      }

      .su-divider {
        width: 40px; height: 1px;
        background: #c8b89a;
      }

      .su-body {
        font-size: 15px; line-height: 1.95;
        color: #4a3e2e;
        font-family: 'Ma Shan Zheng', cursive;
        white-space: pre-wrap;
        letter-spacing: 0.03em;
      }

      .su-sign {
        font-size: 13px; color: #a09070;
        font-family: 'Ma Shan Zheng', cursive;
        text-align: right; margin-top: 4px;
        letter-spacing: 0.1em;
      }

      .su-close-hint {
        font-size: 11px; color: #b0a090;
        text-align: center; margin-top: 8px;
        font-family: 'Ma Shan Zheng', cursive;
        letter-spacing: 0.06em;
      }

      .su-replay-btn {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; color: var(--text-3);
        background: none; border: none; cursor: pointer;
        padding: 0; letter-spacing: 0.04em;
        opacity: 0.7;
      }
      .su-replay-btn:hover { opacity: 1; }
    `;
    document.head.appendChild(s);
  }

  function ensureOverlay() {
    if (document.getElementById('suOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'su-overlay';
    overlay.id = 'suOverlay';
    overlay.innerHTML = `
      <div class="su-letter" id="suLetter">
        <div class="su-stage-label" id="suFromTo"></div>
        <div class="su-stage-name" id="suStageName"></div>
        <div class="su-divider"></div>
        <div class="su-body" id="suBody"></div>
        <div class="su-sign" id="suSign">— 晏</div>
        <div class="su-close-hint">點一下關閉</div>
      </div>
    `;
    overlay.onclick = (e) => {
      overlay.classList.remove('show');
    };
    document.body.appendChild(overlay);
  }

  function showUnlock(stageName) {
    ensureStyle();
    ensureOverlay();
    const data = STAGE_LETTERS[stageName];
    if (!data) return;

    document.getElementById('suFromTo').textContent = `${data.from} → ${data.to}`;
    document.getElementById('suStageName').textContent = stageName;
    document.getElementById('suBody').textContent = data.letter;
    document.getElementById('suOverlay').classList.add('show');
  }

  // 偵測升階：傳入 stage（新）和 prevStage（舊），若不同且有對應台詞就觸發
  function checkAndShow(stage, prevStage) {
    if (!stage || !prevStage) return;
    if (stage === prevStage) return;
    if (STAGE_LETTERS[stage]) {
      showUnlock(stage);
    }
  }

  // 回放按鈕 HTML（給人物書用）
  function replayBtn(stageName) {
    const btn = document.createElement('button');
    btn.className = 'su-replay-btn';
    btn.innerHTML = `<span>✉</span><span>重看</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      showUnlock(stageName);
    };
    return btn;
  }

  window.StageUnlock = { show: showUnlock, checkAndShow, replayBtn, STAGE_LETTERS };
})();
