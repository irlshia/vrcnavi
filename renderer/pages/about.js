// についてページ（buildAbout）
function buildAbout() {
  const page = document.createElement("div");

page.innerHTML = `
  <h2>VRCNAVI について</h2>
  <p style="white-space:pre-wrap;color:#ddd;font-size:14px;">
VRCNAVI は BOOTHの新着アイテムをお知らせするソフトウェアです。
このプロトタイプは Discord版 から移植されています。

本アプリは、Electron（デスクトップアプリ開発フレームワーク）、cheerio（HTMLスクレイピング）、node-fetch（HTTP通信）、electron-updater（自動アップデート）などの技術を利用して開発されています。
</p>
  <div class="card" style="margin-top:24px; display: flex; gap: 16px; align-items: center;">
    <div class="avatar" id="avatar" style="width: 64px; height: 64px; border-radius: 50%; background: #444; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">Loading...</div>
    <div>
      <p style="margin:0 0 4px 0;font-weight:600;">開発者: Irlshia</p>
      <p style="margin:0 0 8px 0;color:#ccc;">バージョン: v<span id="app-version">読み込み中...</span></p>
      <p style="margin:0;font-size:14px;">
        <a href="https://github.com/irlshia/vrcnavi" id="about-github-link" style="color:#6cf;">GitHub</a> •
        <a href="https://x.com/irucha_111" id="about-twitter-link" style="color:#6cf;">Twitter</a>
      </p>
    </div>
  </div>

  <div id="update-section" style="margin-top: 32px; padding: 16px; background: #2a2a2a; border-radius: 8px; max-width: 360px;">
    <p id="update-status" style="color: #ccc; font-size: 14px; margin-bottom: 12px;">アップデート状況: 最新の状態を確認してください。</p>
    <button id="check-update-btn" style="
      background-color: #4caf50;
      border: none;
      padding: 10px 18px;
      color: white;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    ">更新をチェック</button>
  </div>

  <div id="update-history-section" style="margin-top: 32px; padding: 16px; background: #2a2a2a; border-radius: 8px; max-width: 800px;">
    <h3 style="color: #fff; font-size: 18px; margin-bottom: 16px;">更新履歴</h3>
    <div id="update-content" style="color: #ccc; font-size: 14px; line-height: 1.6;">
      読み込み中...
    </div>
  </div>
`;

  // 画像読み込み
  window.fetch("assets/avatar.png")
    .then(r => r.ok && r.blob())
    .then(blob => {
      if (blob) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(blob);
        img.style.width = "64px";
        img.style.height = "64px";
        img.style.borderRadius = "50%";
        img.alt = "avatar";

        const avatarEl = page.querySelector("#avatar");
        avatarEl.innerHTML = "";
        avatarEl.appendChild(img);
      }
    })
    .catch(() => {
      console.warn("アバター画像の読み込みに失敗しました");
    });

  // バージョン取得
  (async () => {
    const version = await window.electronAPI.getAppVersion();
    const versionEl = page.querySelector("#app-version");
    if(versionEl) versionEl.textContent = version;
  })();

  // 更新履歴の読み込み
  (async () => {
    const updateEl = page.querySelector('#update-content');
    try {
      const md = await window.electronAPI.fetchUpdateMd();
      if (md && typeof marked !== 'undefined') {
        updateEl.innerHTML = marked.parse(md);
      } else if (md) {
        updateEl.textContent = md;
      } else {
        updateEl.textContent = "更新履歴の読み込みに失敗しました。";
      }
    } catch (e) {
      updateEl.textContent = "更新履歴の読み込みに失敗しました。";
      console.error(e);
    }
  })();
  const updateStatus = page.querySelector("#update-status");
  const checkUpdateBtn = page.querySelector("#check-update-btn");

  checkUpdateBtn.addEventListener("click", () => {
    updateStatus.textContent = "アップデートを確認中…";

    window.electronAPI.checkForUpdates()
      .then(() => {
        updateStatus.textContent = "アップデートチェック完了。しばらくお待ち下さい。";
      })
      .catch(() => {
        updateStatus.textContent = "アップデートチェックに失敗しました。";
      });
  });

  // GitHub・Twitterリンクをブラウザで開く
  const githubLink = page.querySelector('#about-github-link');
  const twitterLink = page.querySelector('#about-twitter-link');
  if (githubLink) {
    githubLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.electronAPI.openExternal(githubLink.href);
    });
  }
  if (twitterLink) {
    twitterLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.electronAPI.openExternal(twitterLink.href);
    });
  }

  // electronAPI 側で ipcMain.handle("check-for-updates", ...) を設定しておく必要があります。
  // もしくは electron-updater の autoUpdater.checkForUpdatesAndNotify() を適宜呼び出せるようにしてください。

  // 自動更新イベントも受け取り反映する例
  window.electronAPI.onUpdateAvailable(() => {
    updateStatus.textContent = "アップデートが利用可能です。ダウンロード中…";
  });

  window.electronAPI.onUpdateDownloaded(() => {
    updateStatus.textContent = "アップデートのダウンロードが完了しました。再起動して適用してください。";
    // ここでボタンを「再起動して更新」に変えるのもアリです
    checkUpdateBtn.textContent = "今すぐ再起動";
    checkUpdateBtn.style.backgroundColor = "#2196f3";

    checkUpdateBtn.onclick = () => {
      window.electronAPI.quitAndInstall();
    };
  });
  return page;
}
