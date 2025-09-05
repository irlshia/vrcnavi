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

async function finishLoading() {
  const loader = document.getElementById("loader");
  const root = document.getElementById("root");

  // フェードアウト開始
  loader.classList.add("fadeOut");

  // トランジション完了を待つ（0.5秒）
  await new Promise(resolve => setTimeout(resolve, 400));

  // 完全に非表示にして、中身表示
  loader.style.display = "none";
  root.style.display = "flex"; // または "block"
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

// localStorageキャッシュ関数
function saveBoothItemsCache(data, config) {
  try {
    localStorage.setItem('boothItemsCache', JSON.stringify(data));
    localStorage.setItem('boothItemsCacheConfig', config);
  } catch (e) { /* ignore */ }
}
function loadBoothItemsCache(config) {
  try {
    const cachedConfig = localStorage.getItem('boothItemsCacheConfig');
    if (cachedConfig === config) {
      const data = localStorage.getItem('boothItemsCache');
      if (data) return JSON.parse(data);
    }
  } catch (e) { /* ignore */ }
  return null;
}
function clearBoothItemsCache() {
  try {
    localStorage.removeItem('boothItemsCache');
    localStorage.removeItem('boothItemsCacheConfig');
  } catch (e) { /* ignore */ }
}

async function getBoothCache() {
  return await window.electronAPI.getBoothCache();
}
async function saveBoothCache(data) {
  return await window.electronAPI.saveBoothCache(data);
}
async function clearBoothCache() {
  return await window.electronAPI.clearBoothCache();
}

async function loadBoothItemsFromConfig(container, isGrid = false, forceReload = false) {
  container.textContent = "読み込み中...";

  try {
    const savedSettings = await window.electronAPI.loadJson("channels");
    const guildId = "default";
    const config = savedSettings?.[guildId];

    if (!config) {
      container.textContent = "設定が見つかりません。";
      return;
    }

    // カテゴリとキーワードを分離
    const categories = [];
    const keywords = [];
    for (const key of Object.keys(config)) {
      if (config[key].customKeyword) {
        keywords.push(config[key].customKeyword);
      } else {
        categories.push(key);
      }
    }
    
    // カスタムキーワードの処理（新しいオプション形式に対応）
    if (Array.isArray(savedSettings.customKeywords)) {
      savedSettings.customKeywords.forEach(kw => {
        if (typeof kw === 'object' && kw !== null) {
          keywords.push(kw); // オブジェクトごとpush
        } else {
          keywords.push({ keyword: kw, options: {} });
        }
      });
    }
    
    // カスタムショップの処理（新しいオプション形式に対応）
    const shops = Array.isArray(savedSettings.customShops) ? savedSettings.customShops : [];

    // 設定内容が前回と同じならlocalStorageキャッシュを使う
    const currentConfig = JSON.stringify({ categories, keywords, shops });
    if (!forceReload) {
      const cached = loadBoothItemsCache(currentConfig);
      if (cached) {
        renderBoothItems(container, cached, isGrid);
        return;
      }
    }

    // API再取得→キャッシュ保存→再描画
    let allItems = await window.vrcnavi.getBoothItemsCombined(categories, keywords, shops, 6);
    await saveBoothCache({ no_auto_scan: true, items: allItems });
    
    // 最新順キーワードの情報を取得
    const latestOnlyKeywords = [];
    if (Array.isArray(savedSettings.customKeywords)) {
      savedSettings.customKeywords.forEach(kw => {
        if (typeof kw === 'object' && kw !== null && kw.options && kw.options.latestOnly) {
          latestOnlyKeywords.push(kw.keyword);
        }
      });
    }
    
    renderBoothItems(container, allItems, isGrid, latestOnlyKeywords);
  } catch (e) {
    container.textContent = "読み込みに失敗しました。";
    console.error(e);
  }
}

function renderBoothItems(container, allItems, isGrid, latestOnlyKeywords = []) {
  if (!allItems || !allItems.length) {
    container.textContent = "新着アイテムがありません。";
    return;
  }
  // カテゴリごとにグループ化
  const itemsByCategory = {};
  allItems.forEach(item => {
    const cat = item.category || "その他";
    if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
    itemsByCategory[cat].push(item);
  });
  container.innerHTML = "";
  Object.entries(itemsByCategory).forEach(([cat, items]) => {
    const block = document.createElement("div");
    block.className = "category-block" + (isGrid ? " grid-active" : "");
    // カテゴリ名に最新順情報を追加
    let categoryDisplay = cat;
    if (latestOnlyKeywords.includes(cat)) {
      categoryDisplay += " (最新順)";
    }
    block.innerHTML = `<h4 style=\"color:#fff;margin-bottom:8px;\">${categoryDisplay}</h4>`;
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "items-container";
    // 最初の5個のアイテムのみ表示
    const initialItems = items.slice(0, 5);
    const hasMoreItems = items.length > 5;
    
    initialItems.forEach(item => {
      const itemEl = document.createElement("div");
      itemEl.className = "item-entry";
      itemEl.innerHTML = `
        <img src=\"${item.img_url}\" alt=\"${item.title}\" style=\"width:100px; height:100px; object-fit:cover; border-radius:6px;\">
        <div style=\"flex-grow:1;\">
          <a href=\"${item.url}\" target=\"_blank\" style=\"display:block; color:#6cf; font-weight:bold; text-decoration:none; margin-bottom:4px;\">
            ${item.title}
          </a>
          <span style=\"display:block; font-size:12px; color:#aaa;\">
            ${item.price} / ${item.author}
          </span>
        </div>
        <img src=\"${item.author_icon_url}\" alt=\"作者アイコン\" style=\"width:32px; height:32px; border-radius:50%;\">
      `;
      const link = itemEl.querySelector("a");
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.electronAPI.openExternal(link.href);
      });
      const img = itemEl.querySelector('img');
      img.style.cursor = 'pointer';
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        const modal = document.getElementById('img-modal');
        const modalImg = document.getElementById('img-modal-img');
        if (modal && modalImg) {
          modalImg.src = item.img_url;
          modal.style.display = 'flex';
        }
      });
      itemsContainer.appendChild(itemEl);
    });
    
    // もっと見るボタンを追加
    if (hasMoreItems) {
      const moreButton = document.createElement("button");
      moreButton.className = "more-button";
      moreButton.innerHTML = "もっと見る";
      
      // クリック時の処理
      moreButton.addEventListener('click', () => {
        // 独立したウィンドウを表示
        showMoreItemsWindow(cat, items);
      });
      
      itemsContainer.appendChild(moreButton);
    }
    block.appendChild(itemsContainer);
    container.appendChild(block);
  });
}

// ----------------- 関数 -----------------
function switchPage(idx) {
  [...nav.children].forEach((b, i) => b.classList.toggle("active", i === idx));
  [...pagesContainer.children].forEach((p, i) => (p.style.display = i === idx ? "block" : "none"));
}

function HomeSummary(label) {
  const page = document.createElement("div");
  page.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="margin:0;color:#fff;font-size:42px;font-weight:600;text-align:center;margin-bottom:8px;">VRCNAVI</h2>
      <p style="margin:0;color:#bbb;font-size:18px;text-align:center;margin-bottom:40px;">VRChat関連のBOOTH新着アイテムをお知らせするソフトウェアです。</p>
      
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:24px;margin-bottom:32px;border:1px solid rgba(255,255,255,0.1);">
        <h3 style="color:#fff;margin:0 0 16px 0;font-size:20px;font-weight:500;">概要説明</h3>
        <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0;">
          VRCNAVIでは、設定されたカテゴリおよびキーワードに応じた新着アイテムを通知します。<br>
          設定は「設定」タブから変更できます。
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">
        <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:20px;border:1px solid rgba(255,255,255,0.08);">
          <h3 style="color:#fff;margin:0 0 16px 0;font-size:18px;font-weight:500;display:flex;align-items:center;">
            <span style="background:#4caf50;width:8px;height:8px;border-radius:50%;margin-right:12px;"></span>
            設定中のサンプルカテゴリ
          </h3>
          <div id="category-panel" style="color:#ccc;font-size:14px;min-height:40px;">
            読み込み中…
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:20px;border:1px solid rgba(255,255,255,0.08);">
          <h3 style="color:#fff;margin:0 0 16px 0;font-size:18px;font-weight:500;display:flex;align-items:center;">
            <span style="background:#2196f3;width:8px;height:8px;border-radius:50%;margin-right:12px;"></span>
            設定中のカスタムキーワード
          </h3>
          <div id="keyword-panel" style="color:#ccc;font-size:14px;min-height:40px;">
            読み込み中…
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:20px;border:1px solid rgba(255,255,255,0.08);">
          <h3 style="color:#fff;margin:0 0 16px 0;font-size:18px;font-weight:500;display:flex;align-items:center;">
            <span style="background:#ff9800;width:8px;height:8px;border-radius:50%;margin-right:12px;"></span>
            設定中のカスタムショップ
          </h3>
          <div id="shop-panel" style="color:#ccc;font-size:14px;min-height:40px;">
            読み込み中…
          </div>
        </div>
      </div>
    </div>
  `;

  const categoryPanel = page.querySelector("#category-panel");
  const keywordPanel = page.querySelector("#keyword-panel");
  const shopPanel = page.querySelector("#shop-panel");

  (async () => {
    try {
      const savedSettings = await window.electronAPI.loadJson("channels") || {};
      const guildId = "default";

      // --- カテゴリの取得と表示 ---
      const categories = savedSettings[guildId] ? Object.keys(savedSettings[guildId]) : [];
      if (categories.length === 0) {
        categoryPanel.innerHTML = `
          <div style="color:#888;font-style:italic;text-align:center;padding:20px 0;">
            <div style="font-size:24px;margin-bottom:8px;">📋</div>
            カテゴリが設定されていません<br>
            <span style="font-size:12px;">設定タブから追加してください</span>
          </div>
        `;
      } else {
        categoryPanel.innerHTML = `
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${categories.map(cat => `
              <span style="
                background:linear-gradient(135deg,#4caf50,#45a049);
                color:#fff;
                padding:8px 16px;
                border-radius:20px;
                font-size:13px;
                font-weight:500;
                box-shadow:0 2px 8px rgba(76,175,80,0.3);
                border:1px solid rgba(255,255,255,0.1);
              ">${cat}</span>
            `).join("")}
          </div>
        `;
      }

      // --- カスタムキーワードの取得と表示 ---
      const keywords = savedSettings.customKeywords || [];
      if (keywords.length === 0) {
        keywordPanel.innerHTML = `
          <div style="color:#888;font-style:italic;text-align:center;padding:20px 0;">
            <div style="font-size:24px;margin-bottom:8px;">🔍</div>
            キーワードが設定されていません<br>
            <span style="font-size:12px;">設定タブから追加してください</span>
          </div>
        `;
      } else {
        keywordPanel.innerHTML = `
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${keywords.map(kw => {
              const isObject = typeof kw === 'object' && kw !== null;
              const keyword = isObject ? kw.keyword : kw;
              const options = isObject ? kw.options : {};
              let displayText = keyword;
              if (options.latestOnly) displayText += " (最新順)";
              return `
                <span style="
                  background:linear-gradient(135deg,#2196f3,#1976d2);
                  color:#fff;
                  padding:8px 16px;
                  border-radius:20px;
                  font-size:13px;
                  font-weight:500;
                  box-shadow:0 2px 8px rgba(33,150,243,0.3);
                  border:1px solid rgba(255,255,255,0.1);
                ">${displayText}</span>
              `;
            }).join("")}
          </div>
        `;
      }

      // --- カスタムショップの取得と表示 ---
      const shops = savedSettings.customShops || [];
      if (shops.length === 0) {
        shopPanel.innerHTML = `
          <div style="color:#888;font-style:italic;text-align:center;padding:20px 0;">
            <div style="font-size:24px;margin-bottom:8px;">🏪</div>
            カスタムショップが設定されていません<br>
            <span style="font-size:12px;">設定タブから追加してください</span>
          </div>
        `;
      } else {
        shopPanel.innerHTML = `
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${shops.map(shop => `
              <span style="
                background:linear-gradient(135deg,#ff9800,#f57c00);
                color:#fff;
                padding:8px 16px;
                border-radius:20px;
                font-size:13px;
                font-weight:500;
                box-shadow:0 2px 8px rgba(255,152,0,0.3);
                border:1px solid rgba(255,255,255,0.1);
              ">${shop}</span>
            `).join("")}
          </div>
        `;
      }

    } catch (e) {
      categoryPanel.textContent = "カテゴリ情報の読み込みに失敗しました。";
      keywordPanel.textContent = "キーワード情報の読み込みに失敗しました。";
      shopPanel.textContent = "ショップ情報の読み込みに失敗しました。";
      console.error(e);
    }
  })();
    finishLoading();  // 例外時にも呼ぶ
  return page;
}

/**
 * 通知カテゴリの ON/OFF トグル ＋
 * カスタム通知キーワード（自由入力）を設定できる画面
 */
function Settingsmenu() {
  /* ---------- ① スタイルを 1 度だけ注入 ---------- */
  if (!document.getElementById("settingsmenu-style")) {
    const style = document.createElement("style");
    style.id = "settingsmenu-style";
    style.textContent = `
      /* トグルスイッチ ------------------------------------ */
      .toggle-switch{
        display:inline-flex;align-items:center;margin-right:12px;cursor:pointer;
        user-select:none;font-size:14px;color:#ccc
      }
      .toggle-switch input{display:none}
      .toggle-switch .slider{
        position:relative;width:40px;height:20px;background:#555;border-radius:10px;
        margin-right:8px;transition:background-color .3s
      }
      .toggle-switch .slider::before{
        content:"";position:absolute;width:16px;height:16px;left:2px;top:2px;
        background:#eee;border-radius:50%;transition:transform .3s
      }
      .toggle-switch input:checked+.slider{background:#4caf50}
      .toggle-switch input:checked+.slider::before{transform:translateX(20px)}
      /* ----------------------------------------------- */
      #settings-container{margin-top:16px}
      /* 通知バー */
      #settings-notify-bar {
        position: fixed;
        left: 50%;
        bottom: 32px;
        transform: translateX(-50%);
        background: rgba(40,48,60,0.85);
        color: #fff;
        padding: 14px 32px;
        border-radius: 12px;
        box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18);
        font-size: 16px;
        z-index: 2000;
        display: flex;
        align-items: center;
        gap: 18px;
        border: 1.5px solid rgba(255,255,255,0.18);
        backdrop-filter: blur(16px);
        cursor: pointer;
        transition: opacity 0.3s;
        opacity: 0;
        pointer-events: none;
      }
      #settings-notify-bar.active {
        opacity: 1;
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
  }

  // 通知バー生成
  let notifyBar = document.getElementById("settings-notify-bar");
  if (!notifyBar) {
    notifyBar = document.createElement("div");
    notifyBar.id = "settings-notify-bar";
    notifyBar.innerHTML = `
      <span>設定を反映しますか？</span>
      <button id="apply-btn">反映</button>
      <button id="notify-close-btn" style="position:absolute; top:-8px; right:-8px; background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:16px; cursor:pointer; line-height:1; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center;">×</button>
    `;
    document.body.appendChild(notifyBar);
  }
  const showNotifyBar = () => {
    notifyBar.classList.add("active");
  };
  const hideNotifyBar = () => {
    notifyBar.classList.remove("active");
  };

  /* ---------- ② 画面のベース ---------- */
  const page = document.createElement("div");
  page.style.padding = "20px";
  page.style.color = "#ccc";
  page.innerHTML = `
    <h2 style="margin:0;color:#fff;font-size:36px;">設定</h2>
    <p style="margin-top:4px;color:#bbb;font-size:16px;">
      こちらからサンプルのカテゴリを選択することができます。
    </p>
    <div id="settings-container"></div>
  `;
  const container   = page.querySelector("#settings-container");

  /* ---------- ③ 固定カテゴリのトグル ---------- */
  const categories = ["服","VRChat 3D装飾品","3D装飾品","総合","3Dモーション・アニメーション","ギミック"];
  const guildId    = "default";

  /* ---------- ④ カスタムキーワード UI を先に用意 ---------- */
  const customWrap = document.createElement("div");
  customWrap.style.marginTop = "32px";
  customWrap.innerHTML = `
      <h3 style="color:#fff;font-size:20px;margin-bottom:8px;">カスタム通知キーワード</h3>
      <p style="font-size:14px;color:#bbb;">「指輪」「しっぽ」など、通知したいキーワードを追加できます。</p>
      <input id="customKeywordInput" type="text" placeholder="キーワードを追加" style="
        padding:6px 12px;font-size:14px;width:240px;border-radius:6px;border:none;margin-right:8px;">
      <button id="addKeywordBtn" style="
        padding:6px 12px;font-size:14px;border:none;border-radius:6px;
        background:#4caf50;color:#fff;cursor:pointer;">追加</button>
      <div id="customKeywordList" style="margin-top:12px;"></div>
  `;

  // バックグラウンド常駐トグル
  const bgWrap = document.createElement("div");
  bgWrap.style.marginBottom = "24px";
  bgWrap.innerHTML = `
    <label class="toggle-switch" style="font-size:16px;">
      <input type="checkbox" id="backgroundModeToggle">
      <span class="slider"></span>
      バックグラウンドで常駐（タスクトレイ格納）
    </label>
    <span style="font-size:13px;color:#aaa;margin-left:8px;">ONでウィンドウを閉じてもアプリが終了しません</span>
  `;

  (async () => {
    let saved = {};
    try {
      saved = await window.electronAPI.loadJson("channels") || {};
    } catch (e) { console.error("設定読み込み失敗", e); }

    // バッファ用
    let buffer = JSON.parse(JSON.stringify(saved));
    buffer[guildId] = buffer[guildId] || {};
    buffer.customKeywords = buffer.customKeywords || [];
    buffer.backgroundMode = !!saved.backgroundMode;
    
    // 元の設定を保存（設定を元に戻すため）
    const originalSettings = JSON.parse(JSON.stringify(saved));

    // バックグラウンドトグルの反映
    const bgToggle = bgWrap.querySelector("#backgroundModeToggle");
    bgToggle.checked = !!buffer.backgroundMode;
    bgToggle.addEventListener("change", () => {
      buffer.backgroundMode = bgToggle.checked;
      showNotifyBar();
    });

    container.innerHTML = "";
    container.appendChild(bgWrap);
    categories.forEach((cat,i)=>{
      const id  = `chk-cat-${i}`;
      const lbl = document.createElement("label");
      lbl.className = "toggle-switch";
      lbl.htmlFor   = id;

      const cb  = document.createElement("input");
      cb.type = "checkbox"; cb.id = id; cb.value = cat;
      cb.checked = Object.keys(buffer[guildId]).includes(cat);

      const slider = document.createElement("span");
      slider.className = "slider";

      lbl.append(cb, slider, document.createTextNode(cat));
      container.appendChild(lbl);

      cb.addEventListener("change", ()=>{
        if(cb.checked) {
          buffer[guildId][cat] = buffer[guildId][cat] || [];
        } else {
          delete buffer[guildId][cat];
        }
        showNotifyBar();
      });
    });

    /* 5‑2 カスタムキーワード ------------------- */
    container.appendChild(customWrap);
    const input = customWrap.querySelector("#customKeywordInput");
    const addBtn= customWrap.querySelector("#addKeywordBtn");
    const list  = customWrap.querySelector("#customKeywordList");

    let customKeywords = Array.isArray(buffer.customKeywords) ? buffer.customKeywords : [];

    const render = () => {
      list.innerHTML = "";
      customKeywords.forEach((kw,idx)=>{
        const chip = document.createElement("span");
        const isObject = typeof kw === 'object' && kw !== null;
        const keyword = isObject ? kw.keyword : kw;
        const options = isObject ? kw.options : {};
        
        let displayText = keyword;
        if (options.latestOnly) displayText += " (最新順)";
        
        chip.textContent = displayText;
        chip.style.cssText = `
          display:inline-flex;align-items:center;background:#333;color:#fff;padding:4px 8px;
          margin:4px;border-radius:12px;font-size:13px;gap:6px;
        `;
        
        // オプション変更ボタン
        const optBtn = document.createElement('button');
        optBtn.innerHTML = '⚙️';
        optBtn.title = 'オプション変更';
        optBtn.style.cssText = 'padding:2px 4px;font-size:12px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;transition:all 0.2s;width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
        optBtn.onmouseover = () => {
          optBtn.style.background = 'rgba(255,255,255,0.2)';
          optBtn.style.transform = 'scale(1.1)';
        };
        optBtn.onmouseout = () => {
          optBtn.style.background = 'rgba(255,255,255,0.1)';
          optBtn.style.transform = 'scale(1)';
        };
        optBtn.onclick = (e) => {
          e.stopPropagation();
          showKeywordOptionsModal(keyword, (newOptions) => {
            if (isObject) {
              kw.options = newOptions;
            } else {
              customKeywords[idx] = { keyword, options: newOptions };
            }
            buffer.customKeywords = customKeywords;
            render();
            showNotifyBar();
          }, options);
        };
        
        // 削除ボタン
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '✕';
        delBtn.title = '削除';
        delBtn.style.cssText = 'padding:2px 4px;font-size:12px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;transition:all 0.2s;width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
        delBtn.onmouseover = () => {
          delBtn.style.background = 'rgba(255,255,255,0.2)';
          delBtn.style.transform = 'scale(1.1)';
        };
        delBtn.onmouseout = () => {
          delBtn.style.background = 'rgba(255,255,255,0.1)';
          delBtn.style.transform = 'scale(1)';
        };
        delBtn.onclick = (e) => {
          e.stopPropagation();
          customKeywords.splice(idx,1);
          buffer.customKeywords = customKeywords;
          render();
          showNotifyBar();
        };
        
        // ボタンを順番に追加（設定ボタン → 削除ボタン）
        chip.appendChild(optBtn);
        chip.appendChild(delBtn);
        list.appendChild(chip);
      });
    };

    addBtn.onclick = ()=>{
      const val = input.value.trim();
      if(val && !customKeywords.some(kw => (typeof kw === 'object' ? kw.keyword : kw) === val)){
        // オプション設定のモーダルを表示
        showKeywordOptionsModal(val, (options) => {
          const keywordObj = { keyword: val, options };
          customKeywords.push(keywordObj);
          buffer.customKeywords = customKeywords;
          render();
          showNotifyBar();
        });
        input.value="";
      }
    };

    render(); // 初期表示

    /* 5‑3 カスタムショップID ------------------- */
    const shopWrap = document.createElement("div");
    shopWrap.style.marginTop = "32px";
    shopWrap.innerHTML = `
        <h3 style="color:#fff;font-size:20px;margin-bottom:8px;">カスタム通知ショップID [※Beta版のため、最適化が完了していません。]</h3>
        <p style="font-size:14px;color:#bbb;">「Lookvook」/「EXTENSION CLOTHING」など、通知したいショップID（https://extension.booth.pm/）を追加できます。</p>
        <input id="customShopInput" type="text" placeholder="ショップIDを追加 「extension」" style="
          padding:6px 12px;font-size:14px;width:240px;border-radius:6px;border:none;margin-right:8px;">
        <button id="addShopBtn" style="
          padding:6px 12px;font-size:14px;border:none;border-radius:6px;
          background:#4caf50;color:#fff;cursor:pointer;">追加</button>
        <div id="customShopList" style="margin-top:12px;"></div>
    `;
    container.appendChild(shopWrap);
    const shopInput = shopWrap.querySelector("#customShopInput");
    const addShopBtn = shopWrap.querySelector("#addShopBtn");
    const shopList = shopWrap.querySelector("#customShopList");

    buffer.customShops = Array.isArray(buffer.customShops) ? buffer.customShops : [];
    let customShops = buffer.customShops;

    const renderShops = () => {
      shopList.innerHTML = "";
      customShops.forEach((shop, idx) => {
        const chip = document.createElement("span");
        chip.textContent = shop + " ✕";
        chip.style.cssText = `
          display:inline-block;background:#333;color:#fff;padding:4px 8px;
          margin:4px;border-radius:12px;cursor:pointer;font-size:13px;
        `;
        chip.onclick = () => {
          customShops.splice(idx, 1);
          buffer.customShops = customShops;
          renderShops();
          showNotifyBar();
        };
        shopList.appendChild(chip);
      });
    };

    addShopBtn.onclick = () => {
      const val = shopInput.value.trim();
      if(val && !customShops.includes(val)){
        customShops.push(val); shopInput.value="";
        buffer.customShops = customShops;
        renderShops();
        showNotifyBar();
      }
    };

    renderShops();

    // 設定を元に戻す関数
    const resetToOriginalSettings = () => {
      // バッファを元の設定で上書き
      buffer = JSON.parse(JSON.stringify(originalSettings));
      buffer[guildId] = buffer[guildId] || {};
      buffer.customKeywords = buffer.customKeywords || [];
      buffer.backgroundMode = !!originalSettings.backgroundMode;
      
      // UIを元の設定に戻す
      bgToggle.checked = !!buffer.backgroundMode;
      
      // カテゴリのチェックボックスを元に戻す
      categories.forEach((cat, i) => {
        const cb = document.getElementById(`chk-cat-${i}`);
        if (cb) {
          cb.checked = Object.keys(buffer[guildId]).includes(cat);
        }
      });
      
      // カスタムキーワードを元に戻す
      customKeywords = Array.isArray(buffer.customKeywords) ? buffer.customKeywords : [];
      render();
      
      // カスタムショップを元に戻す
      customShops = Array.isArray(buffer.customShops) ? buffer.customShops : [];
      renderShops();
      
      hideNotifyBar();
    };

    // Xボタンで設定を元に戻す
    notifyBar.querySelector('#notify-close-btn').onclick = resetToOriginalSettings;

    // 反映ボタンで保存
    notifyBar.querySelector("#apply-btn").onclick = async () => {
      hideNotifyBar();
      await window.electronAPI.clearBoothCache();
      await window.electronAPI.saveJson("channels", buffer);
      location.reload();
    };
  })();

  return page;
}

function StartSummary() {
  const page = document.createElement("div");

  page.innerHTML = `
    <h2 style=\"margin:0;color:#fff;font-size:36px;\">VRCNAVI</h2>
    <p style=\"margin-top:4px;color:#bbb;font-size:16px;\">設定済みの新着アイテムを表示します。</p>
    <div style=\"margin-top:24px; display: flex; align-items: center; gap: 12px;\">
      <h3 style=\"color:#fff; margin:0;\">Booth 新着アイテム</h3>
      <button id=\"layoutToggleBtn\" style=\"
        padding: 6px 12px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 6px;
        border: none;
        background-color: #3a86ff;
        color: white;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        transition: background-color 0.3s ease;
      \">
        <i class=\"fas fa-th-large\"></i> 横並び
      </button>
      <button id=\"reloadBtn\" style=\"
        padding: 6px 12px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 6px;
        border: none;
        background-color: #4caf50;
        color: white;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        transition: background-color 0.3s ease;
      \">
        <i class=\"fas fa-sync\"></i> 再読み込み
      </button>
    </div>
    <div id=\"booth-items\" style=\"color:#ccc; font-size:14px;\">
      読み込み中...
    </div>
  `;

  const toggleBtn = page.querySelector("#layoutToggleBtn");
  const reloadBtn = page.querySelector("#reloadBtn");
  const container = page.querySelector("#booth-items");

  let isGrid = false;

  // 初回表示時：キャッシュがあれば絶対にBoothスキャンしない
  (async () => {
    const cache = await getBoothCache();
    if (cache && Array.isArray(cache.items) && cache.items.length > 0) {
      renderBoothItems(container, cache.items, isGrid);
      return;
    }
    // キャッシュがなければAPI取得
    const savedSettings = await window.electronAPI.loadJson("channels") || {};
    isGrid = (savedSettings.displayStyle === "grid");
    applyLayout(isGrid);
    const categories = [];
    const keywords = [];
    const config = savedSettings?.["default"];
    if (config) {
      for (const key of Object.keys(config)) {
        if (config[key].customKeyword) {
          keywords.push(config[key].customKeyword);
        } else {
          categories.push(key);
        }
      }
    }
    // カスタムキーワードの処理（新しいオプション形式に対応）
    if (Array.isArray(savedSettings.customKeywords)) {
      savedSettings.customKeywords.forEach(kw => {
        if (typeof kw === 'object' && kw !== null) {
          keywords.push(kw.keyword);
        } else {
          keywords.push(kw);
        }
      });
    }
    
    // カスタムショップの処理（新しいオプション形式に対応）
    const shops = [];
    if (Array.isArray(savedSettings.customShops)) {
      savedSettings.customShops.forEach(shop => {
        if (typeof shop === 'object' && shop !== null) {
          shops.push(shop.shopId);
        } else {
          shops.push(shop);
        }
      });
    }
    const currentConfig = JSON.stringify({ categories, keywords, shops });
    const cached = loadBoothItemsCache(currentConfig);
    // 最新順キーワードの情報を取得
    const latestOnlyKeywords = [];
    if (Array.isArray(savedSettings.customKeywords)) {
      savedSettings.customKeywords.forEach(kw => {
        if (typeof kw === 'object' && kw !== null && kw.options && kw.options.latestOnly) {
          latestOnlyKeywords.push(kw.keyword);
        }
      });
    }
    
    if (cached) {
      renderBoothItems(container, cached, isGrid, latestOnlyKeywords);
    } else {
      await loadBoothItemsFromConfig(container, isGrid, true);
    }
  })();

  toggleBtn.addEventListener("click", async () => {
    isGrid = !isGrid;
    applyLayout(isGrid);
    const savedSettings = await window.electronAPI.loadJson("channels") || {};
    savedSettings.displayStyle = isGrid ? "grid" : "vertical";
    const success = await window.electronAPI.saveJson("channels", savedSettings);
    if (!success) console.error("設定の保存に失敗しました");
    // レイアウト切り替え時はキャッシュがあればそれのみで切り替え、なければ何もしない
    const categories = [];
    const keywords = [];
    const config = savedSettings?.["default"];
    if (config) {
      for (const key of Object.keys(config)) {
        if (config[key].customKeyword) {
          keywords.push(config[key].customKeyword);
        } else {
          categories.push(key);
        }
      }
    }
    // カスタムキーワードの処理（新しいオプション形式に対応）
    if (Array.isArray(savedSettings.customKeywords)) {
      savedSettings.customKeywords.forEach(kw => {
        if (typeof kw === 'object' && kw !== null) {
          keywords.push(kw.keyword);
        } else {
          keywords.push(kw);
        }
      });
    }
    
    // カスタムショップの処理（新しいオプション形式に対応）
    const shops = [];
    if (Array.isArray(savedSettings.customShops)) {
      savedSettings.customShops.forEach(shop => {
        if (typeof shop === 'object' && shop !== null) {
          shops.push(shop.shopId);
        } else {
          shops.push(shop);
        }
      });
    }
    const currentConfig = JSON.stringify({ categories, keywords, shops });
    const cached = loadBoothItemsCache(currentConfig);
    // 最新順キーワードの情報を取得
    const latestOnlyKeywords = [];
    if (Array.isArray(savedSettings.customKeywords)) {
      savedSettings.customKeywords.forEach(kw => {
        if (typeof kw === 'object' && kw !== null && kw.options && kw.options.latestOnly) {
          latestOnlyKeywords.push(kw.keyword);
        }
      });
    }
    
    if (cached) {
      renderBoothItems(container, cached, isGrid, latestOnlyKeywords);
    } else {
      // キャッシュがなければ何もしない
      // container.textContent = "キャッシュがありません。再読み込みしてください。";
    }
  });

  reloadBtn.addEventListener("click", async () => {
    // 強制再取得：このときだけBoothスキャンを許可
    await loadBoothItemsFromConfig(container, isGrid, true);
  });

  function applyLayout(gridMode) {
    // .category-blockごとにクラスを切り替え
    const blocks = container.querySelectorAll('.category-block');
    blocks.forEach(block => {
      if (gridMode) {
        block.classList.add('grid-active');
      } else {
        block.classList.remove('grid-active');
      }
    });
    toggleBtn.textContent = gridMode ? "縦並び" : "横並び";
  }

  return page;
}

function buildPlaceholder(title) {
  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.justifyContent = "center";
  div.style.height = "100%";
  div.innerHTML = `<h2>${title} ページ (準備中)</h2>`;
  return div;
}

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
  const updateStatus = page.querySelector("#update-status");
  const checkUpdateBtn = page.querySelector("#check-update-btn");

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

// 1. モーダルHTMLをbodyに1回だけ追加
function ensureImgModal() {
  if (!document.getElementById('img-modal')) {
    const modal = document.createElement('div');
    modal.id = 'img-modal';
    modal.style.cssText = `
      display:none; position:fixed; z-index:3000; left:0; top:0; width:100vw; height:100vh;
      background:rgba(0,0,0,0.7); align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
      <div id="img-modal-content" style="position:relative; max-width:120vw; max-height:120vw;">
        <img id="img-modal-img" src="" style="max-width:100%; max-height:120vw; border-radius:12px; box-shadow:0 4px 32px #000;" />
        <button id="img-modal-close" style="position:absolute; top:8px; right:8px; font-size:24px; background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer;">×</button>
      </div>
    `;
    document.body.appendChild(modal);

    // 閉じる処理
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'img-modal-close') {
        modal.style.display = 'none';
      }
    });
  }
}

function showWelcomeModal() {
  // 背景の半透明オーバーレイ
  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.style = `
    position: fixed; z-index: 99999; inset: 0;
    background: rgba(30,34,40,0.55); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
  `;

  // Mac風カード
  const card = document.createElement('div');
  card.style = `
    background: rgba(255,255,255,0.95);
    border-radius: 22px;
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18);
    padding: 48px 40px 32px 40px;
    max-width: 400px;
    width: 90vw;
    text-align: center;
    position: relative;
    border: 1.5px solid rgba(180,180,200,0.13);
    animation: fadeInWelcome 0.7s cubic-bezier(.4,2,.6,1) 1;
  `;
  card.innerHTML = `
    <div id="welcome-icon" style="width:72px;height:72px;border-radius:18px;box-shadow:0 2px 12px #bbb3; margin:0 auto 18px auto;"></div>
    <h2 style="font-size:2rem;color:#222;margin:0 0 12px 0;font-weight:700;letter-spacing:1px;">VRCNAVIへようこそ</h2>
    <p style="color:#444;font-size:1.1rem;line-height:1.7;margin-bottom:28px;">
      VRChat関連のBOOTH新着アイテムを<br>かんたんにチェックできるアプリです。<br><br>
      左のメニューから各機能をお試しください。
    </p>
    <button id="welcome-start-btn" style="
      background: linear-gradient(90deg,#4caf50,#2196f3);
      color: #fff; font-size:1.1rem; font-weight:600;
      border: none; border-radius: 8px; padding: 12px 36px;
      box-shadow: 0 2px 8px #2196f355;
      cursor: pointer; transition: background 0.2s;
    ">はじめる</button>
    <div style="margin-top:18px;font-size:12px;color:#888;">ver. <span id="welcome-version">-</span></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // アイコン画像をfetchして表示
  window.fetch("assets/icon.png")
    .then(r => r.ok && r.blob())
    .then(blob => {
      if (blob) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(blob);
        img.style.width = "72px";
        img.style.height = "72px";
        img.style.borderRadius = "18px";
        img.style.boxShadow = "0 2px 12px #bbb3";
        img.style.marginBottom = "18px";
        img.alt = "icon";
        const iconEl = card.querySelector("#welcome-icon");
        if (iconEl) {
          iconEl.innerHTML = "";
          iconEl.appendChild(img);
        }
      }
    });

  // バージョン表示
  window.electronAPI.getAppVersion().then(v => {
    const vEl = document.getElementById('welcome-version');
    if(vEl) vEl.textContent = v;
  });

  // ボタンで閉じてフラグ保存
  card.querySelector('#welcome-start-btn').onclick = async () => {
    overlay.remove();
    // フラグ保存
    // 初期設定ウィザードを表示
    showInitialSetupModal();
  };
}

function showInitialSetupModal() {
  // オーバーレイ
  const overlay = document.createElement('div');
  overlay.id = 'setup-overlay';
  overlay.style = `
    position: fixed; z-index: 99999; inset: 0;
    background: rgba(30,34,40,0.55); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
  `;
  // カード
  const card = document.createElement('div');
  card.style = `
    background: rgba(255,255,255,0.97);
    border-radius: 22px;
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18);
    padding: 40px 32px 28px 32px;
    max-width: 650px;
    width: 95vw;
    text-align: center;
    position: relative;
    border: 1.5px solid rgba(180,180,200,0.13);
    animation: fadeInWelcome 0.7s cubic-bezier(.4,2,.6,1) 1;
  `;
  card.innerHTML = `
    <h2 style=\"font-size:1.5rem;color:#222;margin:0 0 18px 0;font-weight:700;letter-spacing:1px;\">初期設定</h2>
    <div style=\"margin-bottom:18px;color:#222;font-size:1rem;\">通知したいカテゴリ・キーワード・ショップIDを選択/入力してください。<br>これらは後で設定できます。</div>
    <div style=\"text-align:left;margin-bottom:18px;\">
      <div style=\"margin-bottom:8px;font-weight:600;color:#222;\">カテゴリ<br>※こちらからサンプルのカテゴリを選択することができます。</div>
      <div id=\"setup-categories\" style=\"display:flex;flex-wrap:wrap;gap:8px 12px;\"></div>
    </div>
    <div style=\"text-align:left;margin-bottom:18px;\">
      <div style=\"margin-bottom:8px;font-weight:600;color:#222;\">カスタムキーワード<br>※コロン（、）で区切ることで複数のキーワードを設定できます。</div>
      <input id=\"setup-keyword\" type=\"text\" placeholder=\"例: 指輪, しっぽ\" style=\"width:100%;padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:1rem;color:#222;background:#fff;\">
    </div>
    <div style=\"text-align:left;margin-bottom:18px;\">
      <div style=\"margin-bottom:8px;font-weight:600;color:#222;\">カスタムショップID<br>※ショップIDは、BOOTHのURLの「サブドメイン」になります。<br>詳しくはヘルプをご覧ください。</div>
      <input id=\"setup-shop\" type=\"text\" placeholder=\"例: lookvook\" style=\"width:100%;padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:1rem;color:#222;background:#fff;\">
    </div>
    <div style=\"text-align:left;margin-bottom:18px;\">
      <label class=\"toggle-switch\" style=\"font-size:16px;\">
        <input type=\"checkbox\" id=\"setup-background-toggle\">
        <span class=\"slider\"></span>
        バックグラウンドで常駐（タスクトレイ格納）
      </label>
      <span style=\"font-size:13px;color:#888;margin-left:8px;\">ONでウィンドウを閉じてもアプリが終了しません</span>
    </div>
    <button id=\"setup-done-btn\" style=\"
      background: linear-gradient(90deg,#4caf50,#2196f3);
      color: #fff; font-size:1.1rem; font-weight:600;
      border: none; border-radius: 8px; padding: 12px 36px;
      box-shadow: 0 2px 8px #2196f355;
      cursor: pointer; transition: background 0.2s;
      margin-top:8px;
    \">完了</button>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // カテゴリリスト生成
  const categories = ["服","VRChat 3D装飾品","3D装飾品","総合","3Dモーション・アニメーション","ギミック"];
  const catPanel = card.querySelector('#setup-categories');
  categories.forEach(cat => {
    const label = document.createElement('label');
    label.style = 'margin-right:10px;display:inline-flex;align-items:center;gap:4px;font-size:0.98rem;color:#222;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = cat;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(cat));
    catPanel.appendChild(label);
  });

  // 完了ボタン
  card.querySelector('#setup-done-btn').onclick = async () => {
    // 選択値取得
    const selectedCats = Array.from(catPanel.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
    const keywordRaw = card.querySelector('#setup-keyword').value.trim();
    const shopRaw = card.querySelector('#setup-shop').value.trim();
    const backgroundMode = card.querySelector('#setup-background-toggle').checked;
    // 区切りで分割
    const keywords = keywordRaw ? keywordRaw.split(/[、,]/).map(s => s.trim()).filter(Boolean) : [];
    const shops = shopRaw ? shopRaw.split(/[、,]/).map(s => s.trim()).filter(Boolean) : [];
    // 設定保存
    const saved = await window.electronAPI.loadJson("channels") || {};
    saved.welcomeShown = true;
    saved.backgroundMode = backgroundMode;
    await window.electronAPI.saveJson("channels", saved);
    saved["default"] = saved["default"] || {};
    selectedCats.forEach(cat => { saved["default"][cat] = {}; });
    if (keywords.length) {
      saved.customKeywords = saved.customKeywords || [];
      keywords.forEach(kw => {
        // 新しいオプション形式で保存
        const keywordObj = { keyword: kw, options: {} };
        if (!saved.customKeywords.some(existing => 
          typeof existing === 'object' ? existing.keyword === kw : existing === kw
        )) {
          saved.customKeywords.push(keywordObj);
        }
      });
    }
    if (shops.length) {
      saved.customShops = saved.customShops || [];
      shops.forEach(shop => {
        // 新しいオプション形式で保存
        const shopObj = { shopId: shop, options: {} };
        if (!saved.customShops.some(existing => 
          typeof existing === 'object' ? existing.shopId === shop : existing === shop
        )) {
          saved.customShops.push(shopObj);
        }
      });
    }
    await window.electronAPI.saveJson("channels", saved);
    location.reload();
  };
}

// キーワードオプション設定モーダル
function showKeywordOptionsModal(keyword, callback, currentOptions = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'options-modal';
  overlay.innerHTML = `
    <div class="card" style="max-width: 580px; min-width: 500px; min-height: 380px; padding: 40px 32px 32px 32px;">
      <h3 style="font-size:1.7rem; margin-bottom: 24px;">「${keyword}」の設定</h3>
      <div class="option-group" style="margin-bottom:32px;">
        <label style="font-size:1.1rem;">
          <input type="checkbox" id="latestOnly">
          最新順のみ表示
        </label>
        <p style="font-size: 14px; color: #666; margin: 8px 0 0 28px;">
          最新の商品のみを表示します（Boothの最新順ソート）
        </p>
      </div>
      <div class="buttons" style="margin-top:32px;">
        <button class="btn-secondary" id="cancelBtn" style="font-size:1rem;">キャンセル</button>
        <button class="btn-primary" id="saveBtn" style="font-size:1rem;">保存</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const latestOnly = overlay.querySelector('#latestOnly');
  const cancelBtn = overlay.querySelector('#cancelBtn');
  const saveBtn = overlay.querySelector('#saveBtn');
  // 既存値を反映
  latestOnly.checked = !!currentOptions.latestOnly;
  
  cancelBtn.onclick = () => {
    overlay.remove();
  };
  
  saveBtn.onclick = () => {
    const options = {
      latestOnly: latestOnly.checked
    };
    overlay.remove();
    callback(options);
  };
}

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

// 設定保存時はlocalStorageキャッシュをクリア
window.addEventListener('DOMContentLoaded', () => {
  const origSaveJson = window.electronAPI.saveJson;
  window.electronAPI.saveJson = async (filename, data) => {
    if (filename === "channels") {
      clearBoothItemsCache();
    }
    return await origSaveJson(filename, data);
  };
});

window.addEventListener('beforeunload', () => {
  clearBoothItemsCache();
});

// もっと見るウィンドウを表示する関数
function showMoreItemsWindow(categoryName, currentItems) {
  console.log('=== showMoreItemsWindow 開始 ===');
  console.log('パラメータ:', { categoryName, currentItemsLength: currentItems?.length });
  
  // オーバーレイ
  const overlay = document.createElement('div');
  overlay.id = 'more-items-overlay';
  overlay.style.cssText = `
    position: fixed;
    z-index: 99999;
    inset: 0;
    background: rgba(30,34,40,0.55);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // メインウィンドウ
  const window = document.createElement('div');
  window.style.cssText = `
    background: rgba(40, 48, 60, 0.95);
    border-radius: 18px;
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18);
    padding: 24px;
    max-width: 90vw;
    max-height: 90vh;
    width: 800px;
    position: relative;
    border: 1.5px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(16px);
    animation: fadeInWelcome 0.7s cubic-bezier(.4,2,.6,1) 1;
  `;

  window.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="color: #fff; margin: 0; font-size: 24px;">${categoryName} - 全アイテム</h2>
      <button id="close-more-window" style="
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      ">×</button>
    </div>

    <div id="more-items-container" style="
      max-height: 60vh;
      overflow-y: auto;
      color: #ccc;
      font-size: 14px;
    ">
      <div style="text-align: center; padding: 40px; color: #888;">
        <div style="font-size: 24px; margin-bottom: 8px;">🔄</div>
        読み込み中...
      </div>
    </div>
  `;

  overlay.appendChild(window);
  document.body.appendChild(overlay);
  console.log('ウィンドウ作成完了、DOMに追加');

  // 閉じるボタンの処理
  const closeBtn = window.querySelector('#close-more-window');
  console.log('閉じるボタン要素取得:', !!closeBtn);
  closeBtn.addEventListener('click', () => {
    console.log('閉じるボタンクリック');
    overlay.remove();
  });

  // オーバーレイクリックで閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      console.log('オーバーレイクリックで閉じる');
      overlay.remove();
    }
  });

  const itemsContainer = window.querySelector('#more-items-container');

  // 初期表示（そのカテゴリのアイテムを再取得して表示）
  console.log('loadMoreCategoryItems 呼び出し開始:', { categoryName, maxItems: 30 });
  console.log('itemsContainer要素:', !!itemsContainer);
  console.log('loadMoreCategoryItems関数:', typeof loadMoreCategoryItems);
  
  // 非同期処理を開始
  loadMoreCategoryItems(categoryName, itemsContainer, 30).then(() => {
    console.log('loadMoreCategoryItems 完了');
  }).catch((error) => {
    console.error('loadMoreCategoryItems エラー:', error);
  });
}

// もっと見るウィンドウ用のアイテム読み込み関数（カテゴリ、キーワード、ショップに対応）
async function loadMoreCategoryItems(categoryName, container, maxItems = 6) {
  console.log('loadMoreCategoryItems 関数開始:', { categoryName, maxItems });
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #888;">
      <div style="font-size: 24px; margin-bottom: 8px;">🔄</div>
      読み込み中...
    </div>
  `;
  
  try {
    // アイテムを再取得
    const savedSettings = await window.electronAPI.loadJson("channels");
    const guildId = "default";
    const config = savedSettings?.[guildId];
    
    console.log('設定ファイル全体:', savedSettings);
    console.log('guildId:', guildId);
    console.log('config:', config);
    console.log('customKeywords:', savedSettings.customKeywords);
    console.log('customShops:', savedSettings.customShops);
    
    let allItems = [];
    let categories = [];
    let keywords = [];
    let shops = [];
    
    // カテゴリ、キーワード、ショップの判定と設定
    console.log('判定処理開始:', { categoryName, config: !!config, customKeywords: !!savedSettings.customKeywords, customShops: !!savedSettings.customShops });
    
    console.log('=== 各判定の詳細 ===');
    
    if (config && config[categoryName]) {
      // カテゴリが設定されている場合
      console.log('カテゴリ判定: 一致');
      categories = [categoryName];
      console.log('カテゴリとして処理:', categoryName);
    } else {
      console.log('カテゴリ判定: 不一致');
      
      if (Array.isArray(savedSettings.customKeywords)) {
        // カスタムキーワードの場合
        console.log('キーワード判定: 配列あり');
        const keywordObj = savedSettings.customKeywords.find(kw => 
          (typeof kw === 'object' ? kw.keyword : kw) === categoryName
        );
        if (keywordObj) {
          keywords = [keywordObj];
          console.log('キーワードとして処理:', keywordObj);
        } else {
          console.log('キーワード判定: 一致なし');
        }
      } else {
        console.log('キーワード判定: 配列なし');
      }
      
      if (Array.isArray(savedSettings.customShops)) {
        console.log('ショップ判定: 配列あり');
        
        // カスタムショップの場合
        console.log('=== カスタムショップ検索開始 ===');
        console.log('検索対象:', { categoryName, customShops: savedSettings.customShops });
        
        let shopObj = null;
        
        // 1段階目: 「ショップ」が付いている場合を試す
        const searchWithShop = categoryName.replace('ショップ', '');
        console.log('1段階目 - 「ショップ」除去後の検索:', searchWithShop);
        
        shopObj = savedSettings.customShops.find(shop => {
          const shopId = typeof shop === 'object' ? shop.shopId : shop;
          const match = shopId === searchWithShop;
          console.log('1段階目検索:', { shop, shopId, searchWithShop, match });
          return match;
        });
        
        if (shopObj) {
          console.log('1段階目で見つかりました:', shopObj);
        } else {
          console.log('1段階目で見つかりませんでした');
          
          // 2段階目: そのままの名前でオブジェクト検索
          console.log('2段階目 - そのままの名前でオブジェクト検索:', categoryName);
          shopObj = savedSettings.customShops.find(shop => {
            const shopId = typeof shop === 'object' ? shop.shopId : shop;
            const match = shopId === categoryName;
            console.log('2段階目検索:', { shop, shopId, categoryName, match });
            return match;
          });
          
          if (shopObj) {
            console.log('2段階目で見つかりました:', shopObj);
          } else {
            console.log('2段階目で見つかりませんでした');
            
            // 3段階目: 文字列配列として検索
            console.log('3段階目 - 文字列配列として検索:', categoryName);
            shopObj = savedSettings.customShops.find(shop => {
              if (typeof shop === 'string') {
                const match = shop === categoryName;
                console.log('3段階目検索:', { shop, categoryName, match });
                return match;
              }
              return false;
            });
            
            if (shopObj) {
              console.log('3段階目で見つかりました:', shopObj);
            } else {
              console.log('3段階目で見つかりませんでした');
            }
          }
        }
        
        if (shopObj) {
          // shopIdを使用してショップを設定
          const shopId = typeof shopObj === 'object' ? shopObj.shopId : shopObj;
          shops = [shopId];
          console.log('ショップとして処理完了:', { shopObj, shopId, shops });
        } else {
          console.log('すべての段階でカスタムショップが見つかりませんでした:', categoryName);
        }
      } else {
        console.log('ショップ判定: 配列なし');
      }
    }
    
    console.log('判定結果:', { categories, keywords, shops });
    // カスタムキーワードとショップも含める（カテゴリの場合）
    if (categories.length > 0) {
      if (Array.isArray(savedSettings.customKeywords)) {
        savedSettings.customKeywords.forEach(kw => {
          if (typeof kw === 'object' && kw !== null) {
            keywords.push(kw);
          } else {
            keywords.push({ keyword: kw, options: {} });
          }
        });
      }
      
      if (Array.isArray(savedSettings.customShops)) {
        savedSettings.customShops.forEach(shop => {
          if (typeof shop === 'object' && shop !== null) {
            shops.push(shop);
          } else {
            shops.push(shop);
          }
        });
      }
    }
    
    if (categories.length > 0 || keywords.length > 0 || shops.length > 0) {
      console.log('API呼び出し開始:', { categories, keywords, shops, maxItems });
      
      // 指定された数のアイテムを取得
      allItems = await window.vrcnavi.getBoothItemsCombined(categories, keywords, shops, maxItems);
      console.log('API呼び出し完了、取得アイテム数:', allItems.length);
      
      // 該当するアイテムのみフィルタリング
      let filteredItems = [];
      if (categories.length > 0) {
        // カテゴリの場合
        console.log('カテゴリフィルタリング開始');
        filteredItems = allItems.filter(item => 
          (item.category || "その他") === categoryName
        );
        console.log('カテゴリフィルタリング結果:', filteredItems.length);
      } else if (keywords.length > 0) {
        // キーワードの場合
        console.log('キーワードフィルタリング開始');
        filteredItems = allItems.filter(item => 
          item.title.toLowerCase().includes(categoryName.toLowerCase()) ||
          (item.category && item.category.toLowerCase().includes(categoryName.toLowerCase()))
        );
        console.log('キーワードフィルタリング結果:', filteredItems.length);
      } else if (shops.length > 0) {
        // ショップの場合
        console.log('ショップフィルタリング開始');
        filteredItems = allItems.filter(item => 
          item.author === categoryName || 
          (item.category && item.category === categoryName)
        );
        console.log('ショップフィルタリング結果:', filteredItems.length);
      }
      
      console.log('フィルタリング完了、表示アイテム数:', filteredItems.length);
      
      // アイテムを表示
      renderMoreItems(filteredItems, container);
      console.log('renderMoreItems 完了');
    } else {
      // 設定が見つからない場合
      console.log('設定が見つからないため、エラーメッセージを表示');
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
          この項目の設定が見つかりません
        </div>
      `;
    }
  } catch (e) {
    console.error('カテゴリ読み込みエラー:', e);
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #888;">
        <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
        読み込みに失敗しました
      </div>
    `;
  }
}

// もっと見るウィンドウ用のアイテム表示関数
function renderMoreItems(items, container) {
  console.log('=== renderMoreItems 開始 ===');
  console.log('パラメータ:', { itemsLength: items?.length, container: !!container });
  
  if (!items || !items.length) {
    console.log('アイテムが空のため、空メッセージを表示');
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #888;">
        <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
        アイテムがありません
      </div>
    `;
    return;
  }

  console.log('アイテム表示開始、アイテム数:', items.length);
  container.innerHTML = '';
  
  items.forEach(item => {
    const itemEl = document.createElement("div");
    itemEl.className = "item-entry";
    itemEl.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      width: 100%;
      background: rgba(255,255,255,0.08);
      border-radius: 10px;
      box-shadow: 0 1px 4px 0 rgba(0,0,0,0.08);
      border: 1.5px solid rgba(255,255,255,0.12);
      transition: background 0.2s;
      backdrop-filter: blur(18px);
      padding: 12px;
    `;
    
    itemEl.innerHTML = `
      <img src="${item.img_url}" alt="${item.title}" style="width:100px; height:100px; object-fit:cover; border-radius:6px;">
      <div style="flex-grow:1;">
        <a href="${item.url}" target="_blank" style="display:block; color:#6cf; font-weight:bold; text-decoration:none; margin-bottom:4px;">
          ${item.title}
        </a>
        <span style="display:block; font-size:12px; color:#aaa;">
          ${item.price} / ${item.author}
        </span>
      </div>
      <img src="${item.author_icon_url}" alt="作者アイコン" style="width:32px; height:32px; border-radius:50%;">
    `;
    
    const link = itemEl.querySelector("a");
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.electronAPI.openExternal(link.href);
    });
    
    const img = itemEl.querySelector('img');
    img.style.cursor = 'pointer';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = document.getElementById('img-modal');
      const modalImg = document.getElementById('img-modal-img');
      if (modal && modalImg) {
        modalImg.src = item.img_url;
        modal.style.display = 'flex';
      }
    });
    
    container.appendChild(itemEl);
  });
}
