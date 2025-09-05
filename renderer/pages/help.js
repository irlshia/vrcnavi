// ヘルプページ（HelpPage）
let helpCache = null;

function loadHelpFromGitHub() {
  const helpEl = document.getElementById("help-content");
  if (!helpEl) return;

  (async () => {
    try {
      const md = await window.electronAPI.fetchHelpMd();
      if (md && typeof marked !== 'undefined') {
        helpEl.innerHTML = marked.parse(md);
      } else if (md) {
        helpEl.textContent = md;
      } else {
        helpEl.textContent = "ヘルプの読み込みに失敗しました。ファイルが見つかりません。";
      }
    } catch (e) {
      helpEl.textContent = "ヘルプの読み込みに失敗しました。";
      console.error(e);
    }
  })();
}

function HelpPage(title) {
  const page = document.createElement("div");
  page.id = "help-page";
  page.className = "page";
  page.style.display = "none";
  page.style.padding = "32px 40px";
  page.style.color = "#ddd";
  page.style.background = "rgba(40, 48, 60, 0.55)";
  page.style.borderRadius = "18px";
  page.style.boxShadow = "0 8px 32px 0 rgba(31, 38, 135, 0.18)";
  page.style.maxWidth = "800px";
  page.style.margin = "32px auto";

  page.innerHTML = `
    <h2 style="margin-top:0;color:#fff;font-size:32px;letter-spacing:1px;">${title || "ヘルプ"}</h2>
    <div id="help-content" style="margin-top:24px; font-size:16px; line-height:1.8; color:#eee; background:rgba(0,0,0,0.10); border-radius:10px; padding:24px;"></div>
  `;

  // preload.js経由でHELP.mdを取得し表示
  (async () => {
    const helpEl = page.querySelector('#help-content');
    try {
      const md = await window.electronAPI.fetchHelpMd();
      if (md && typeof marked !== 'undefined') {
        helpEl.innerHTML = marked.parse(md);
      } else if (md) {
        helpEl.textContent = md;
      } else {
        helpEl.textContent = "ヘルプの読み込みに失敗しました。";
      }
    } catch (e) {
      helpEl.textContent = "ヘルプの読み込みに失敗しました。";
      console.error(e);
    }
  })();

  return page;
}
