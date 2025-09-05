// ----------------- 定義 -----------------
const pages = [
  { label: "概要", icon: "fas fa-home", builder: HomeSummary },
  { label: "Booth", icon: "fas fa-store", builder: StartSummary },
  { label: "設定", icon: "fas fa-cog", builder: Settingsmenu },
  { label: "ヘルプ", icon: "fas fa-question-circle", builder: HelpPage },
  { label: "VRCNAVIについて", icon: "fas fa-info-circle", builder: buildAbout },
];

// ----------------- 初期化 -----------------
const nav = document.getElementById("nav");
const pagesContainer = document.getElementById("pages");

pages.forEach((p, idx) => {
  const btn = document.createElement("button");
  btn.className = "nav-btn";
  btn.innerHTML = `<i class="${p.icon}"></i><span>${p.label}</span>`;
  btn.onclick = () => switchPage(idx);
  nav.appendChild(btn);

  const pageEl = p.builder(p.label);
  pageEl.classList.add("page");
  pagesContainer.appendChild(pageEl);
});

switchPage(0); // デフォルト

// ----------------- 関数 -----------------
function switchPage(idx) {
  [...nav.children].forEach((b, i) => b.classList.toggle("active", i === idx));
  [...pagesContainer.children].forEach((p, i) => (p.style.display = i === idx ? "block" : "none"));
}

window.addEventListener('DOMContentLoaded', async () => {
  const minBtn = document.getElementById('min-btn');
  const maxBtn = document.getElementById('max-btn');
  const closeBtn = document.getElementById('close-btn');

  minBtn.addEventListener('click', () => {
    window.windowControls.minimize();
  });

  maxBtn.addEventListener('click', () => {
    // 最大化か元に戻すかは判定できないので最大化コマンドだけ送る
    window.windowControls.maximize();
  });

  closeBtn.addEventListener('click', () => {
    window.windowControls.close();
  });

  window.windowControls.onMaximize(() => {
    maxBtn.title = '元に戻す';
  });

  window.windowControls.onUnmaximize(() => {
    maxBtn.title = '最大化';
  });
  try {
    const version = await window.electronAPI.getAppVersion();
    const versionEl = document.getElementById("app-version");
    if (versionEl) {
      versionEl.textContent = `v${version}`;
    }
  } catch (err) {
    console.error("バージョン取得失敗", err);
  }

  // アップデート確認処理
  const updateStatus = document.getElementById("update-status");
  const checkUpdateBtn = document.getElementById("check-update-btn");

  if (checkUpdateBtn && updateStatus) {
    checkUpdateBtn.addEventListener("click", () => {
      updateStatus.textContent = "アップデートを確認中…";

      window.electronAPI.checkForUpdates()
        .then(() => {
          updateStatus.textContent = "アップデートチェック完了。結果を待ってください。";
        })
        .catch(() => {
          updateStatus.textContent = "アップデートチェックに失敗しました。";
        });
    });
  }

  // ここでモーダルを必ず生成
  ensureImgModal();

  // Welcome画面の初回表示判定
  const savedSettings = await window.electronAPI.loadJson("channels") || {};
  if (!savedSettings.welcomeShown) {
    showWelcomeModal();
  }
});

// Mac風アニメーション
const style = document.createElement('style');
style.textContent = `
@keyframes fadeInWelcome {
  0% { opacity: 0; transform: scale(0.95) translateY(40px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* オプション設定モーダル */
.options-modal {
  position: fixed;
  z-index: 99999;
  inset: 0;
  background: rgba(30,34,40,0.55);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.options-modal .card {
  background: rgba(255,255,255,0.97);
  border-radius: 22px;
  box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18);
  padding: 40px 32px 28px 32px;
  max-width: 500px;
  width: 95vw;
  text-align: center;
  position: relative;
  border: 1.5px solid rgba(180,180,200,0.13);
  animation: fadeInWelcome 0.7s cubic-bezier(.4,2,.6,1) 1;
}

.options-modal h3 {
  font-size: 1.5rem;
  color: #222;
  margin: 0 0 18px 0;
  font-weight: 700;
  letter-spacing: 1px;
}

.options-modal .option-group {
  text-align: left;
  margin-bottom: 18px;
}

.options-modal .option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #222;
  cursor: pointer;
}

.options-modal .option-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.options-modal .option-group input[type="number"] {
  width: 80px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-left: 8px;
}

.options-modal .buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.options-modal button {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.options-modal .btn-primary {
  background: linear-gradient(90deg,#4caf50,#2196f3);
  color: #fff;
}

.options-modal .btn-secondary {
  background: #f5f5f5;
  color: #333;
}
`;
document.head.appendChild(style);
