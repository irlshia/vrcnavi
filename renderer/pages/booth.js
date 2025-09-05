// Boothページ（StartSummary）
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
