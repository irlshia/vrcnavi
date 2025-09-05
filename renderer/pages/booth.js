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
      <div class=\"export-dropdown\" style=\"position: relative; display: inline-block;\">
        <button id=\"exportBtn\" style=\"
          padding: 6px 12px;
          font-size: 14px;
          cursor: pointer;
          border-radius: 6px;
          border: none;
          background-color:rgb(243, 33, 33);
          color: white;
          display: flex;
          align-items: center;
          gap: 6px;
          user-select: none;
          transition: background-color 0.3s ease;
        \">
          <i class=\"fas fa-download\"></i> リスト化出力
        </button>
        <div id=\"exportMenu\" style=\"
          position: absolute;
          top: 100%;
          right: 0;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 1000;
          min-width: 180px;
          display: none;
          margin-top: 4px;
        \">
          <button class=\"export-option\" data-format=\"html\" style=\"
            width: 100%;
            padding: 10px 16px;
            border: none;
            background: transparent;
            color: #ccc;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: background-color 0.2s;
          \">
            <i class=\"fas fa-file-code\"></i> HTMLファイル
          </button>
          <button class=\"export-option\" data-format=\"excel\" style=\"
            width: 100%;
            padding: 10px 16px;
            border: none;
            background: transparent;
            color: #ccc;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: background-color 0.2s;
          \">
            <i class=\"fas fa-file-excel\"></i> Excelファイル
          </button>
        </div>
      </div>
    </div>
    <div id=\"booth-items\" style=\"color:#ccc; font-size:14px;\">
      <div class=\"loading-container\" style=\"
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      \">
        <div class=\"loading-spinner\" style=\"
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top: 4px solid #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        \"></div>
        <div class=\"loading-text\" style=\"
          color: #888;
          font-size: 16px;
          font-weight: 500;
        \">読み込み中...</div>
      </div>
    </div>

  `;

  const toggleBtn = page.querySelector("#layoutToggleBtn");
  const reloadBtn = page.querySelector("#reloadBtn");
  const exportBtn = page.querySelector("#exportBtn");
  const exportMenu = page.querySelector("#exportMenu");
  const container = page.querySelector("#booth-items");

  let isGrid = false;

  // お気に入りに追加/削除（簡素化版）
  async function toggleFavorite(itemUrl, itemData) {
    try {
      const savedFavorites = await window.electronAPI.loadJson("favorites") || [];
      const existingIndex = savedFavorites.findIndex(item => item.url === itemUrl);
      
      if (existingIndex !== -1) {
        // 削除
        const item = savedFavorites[existingIndex];
        
        // ローカル画像の場合は削除
        if (item.image && item.image.startsWith('local://')) {
          const filename = item.image.replace('local://', '');
          if (typeof imageManager !== 'undefined') {
            await imageManager.deleteImage(filename);
          }
        }
        
        savedFavorites.splice(existingIndex, 1);
        await window.electronAPI.saveJson("favorites", savedFavorites);
        showReloadNotification("お気に入りから削除しました", 'success');
      } else {
        // 追加
        savedFavorites.push(itemData);
        await window.electronAPI.saveJson("favorites", savedFavorites);
        showReloadNotification("お気に入りに追加しました", 'success');
      }
      
      // ボタンの状態を更新
      updateFavoriteButtons();
    } catch (error) {
      console.error("お気に入り操作エラー:", error);
      showReloadNotification("お気に入りの操作に失敗しました", 'error');
    }
  }

  // グローバル関数として定義（booth-functions.jsから呼び出し用）
  window.toggleFavorite = toggleFavorite;

  // お気に入りボタンの状態を更新
  async function updateFavoriteButtons() {
    try {
      const savedFavorites = await window.electronAPI.loadJson("favorites") || [];
      const favoriteUrls = new Set(savedFavorites.map(item => item.url));
      
      const favoriteButtons = document.querySelectorAll('.favorite-btn');
      favoriteButtons.forEach(btn => {
        const itemUrl = btn.dataset.url;
        const icon = btn.querySelector('i');
        if (favoriteUrls.has(itemUrl)) {
          icon.className = 'fas fa-heart';
          btn.style.color = '#e91e63';
          btn.title = 'お気に入りから削除';
        } else {
          icon.className = 'far fa-heart';
          btn.style.color = '#666';
          btn.title = 'お気に入りに追加';
        }
      });
    } catch (error) {
      console.error("お気に入りボタン更新エラー:", error);
    }
  }

  // 初回表示時：キャッシュがあれば絶対にBoothスキャンしない
  (async () => {
    const cache = await getBoothCache();
    if (cache && Array.isArray(cache.items) && cache.items.length > 0) {
      renderBoothItems(container, cache.items, isGrid);
      updateFavoriteButtons();
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
      updateFavoriteButtons();
    } else {
      await loadBoothItemsFromConfig(container, isGrid, true);
      updateFavoriteButtons();
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
      updateFavoriteButtons();
    } else {
      // キャッシュがなければ何もしない
      // container.textContent = "キャッシュがありません。再読み込みしてください。";
    }
  });

  // 再読み込み制限用の変数
  let lastReloadTime = 0;
  const RELOAD_COOLDOWN = 15000; // 15秒（ミリ秒）

  // 通知表示関数
  function showReloadNotification(message, type = 'error') {
    // 既存の通知を削除
    const existingNotification = document.getElementById('reload-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 通知要素を作成
    const notification = document.createElement('div');
    notification.id = 'reload-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : '#4caf50'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideInFromRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <i class="fas ${type === 'error' ? 'fa-clock' : 'fa-check'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // 3秒後に自動削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutToRight 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  reloadBtn.addEventListener("click", async () => {
    const currentTime = Date.now();
    const timeSinceLastReload = currentTime - lastReloadTime;
    
    // 15秒以内の場合は通知を表示
    if (timeSinceLastReload < RELOAD_COOLDOWN) {
      const remainingTime = Math.ceil((RELOAD_COOLDOWN - timeSinceLastReload) / 1000);
      showReloadNotification(`あと${remainingTime}秒で利用可能になります`, 'error');
      return;
    }
    
    // 時間制限をクリアした場合のみ再読み込み実行
    lastReloadTime = currentTime;
    
    // ボタンを一時的に無効化
    reloadBtn.disabled = true;
    reloadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 読み込み中...`;
    reloadBtn.style.backgroundColor = "#666";
    
    try {
      // メモリキャッシュをクリア
      if (typeof memoryCache !== 'undefined') {
        memoryCache.clear();
      }
      
      // 強制再取得：このときだけBoothスキャンを許可
      await loadBoothItemsFromConfig(container, isGrid, true);
      updateFavoriteButtons();
      
      // 成功通知を表示
      showReloadNotification("再読み込みが完了しました", 'success');
    } catch (error) {
      console.error("再読み込みエラー:", error);
      showReloadNotification("再読み込みに失敗しました", 'error');
    } finally {
      // ボタンを元に戻す
      reloadBtn.disabled = false;
      reloadBtn.innerHTML = `<i class="fas fa-sync"></i> 再読み込み`;
      reloadBtn.style.backgroundColor = "#4caf50";
    }
  });

  // エクスポートボタンのイベントハンドラー
  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportMenu.style.display = exportMenu.style.display === "none" ? "block" : "none";
  });

  // メニュー外クリックで閉じる
  document.addEventListener("click", (e) => {
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
      exportMenu.style.display = "none";
    }
  });

  // エクスポートオプションのイベントハンドラー
  exportMenu.addEventListener("click", async (e) => {
    const option = e.target.closest('.export-option');
    if (!option) return;

    const format = option.dataset.format;
    exportMenu.style.display = "none";

    try {
      await exportBoothItems(format);
    } catch (error) {
      console.error("エクスポートエラー:", error);
      showReloadNotification("エクスポートに失敗しました", 'error');
    }
  });

  // エクスポート機能
  async function exportBoothItems(format) {
    // 現在表示されているアイテムを取得
    const categoryBlocks = container.querySelectorAll('.category-block');
    if (categoryBlocks.length === 0) {
      showReloadNotification("エクスポートするアイテムがありません", 'error');
      return;
    }

    let allItems = [];
    const seenUrls = new Set(); // 重複チェック用
    
    // 各カテゴリからアイテムを抽出
    categoryBlocks.forEach(block => {
      const categoryName = block.querySelector('h4').textContent.replace(' (最新順)', '');
      const itemEntries = block.querySelectorAll('.item-entry');
      
      itemEntries.forEach(entry => {
        const link = entry.querySelector('a');
        const priceAuthor = entry.querySelector('span');
        const authorIcon = entry.querySelector('img[alt="作者アイコン"]');
        
        if (link && priceAuthor) {
          const priceAuthorText = priceAuthor.textContent;
          const [price, author] = priceAuthorText.split(' / ');
          
          // 重複チェック（URLベース）
          if (!seenUrls.has(link.href)) {
            seenUrls.add(link.href);
            allItems.push({
              category: categoryName,
              title: link.textContent.trim(),
              url: link.href,
              price: price?.trim() || '',
              author: author?.trim() || '',
              authorIcon: authorIcon?.src || '',
              image: entry.querySelector('img[alt]')?.src || ''
            });
          }
        }
      });
    });

    // メモリキャッシュから「もっと見る」で表示されたアイテムも取得
    if (typeof memoryCache !== 'undefined') {
      const cachedCategories = memoryCache.moreItems.keys();
      for (const categoryName of cachedCategories) {
        const cachedItems = memoryCache.get(categoryName);
        if (cachedItems && Array.isArray(cachedItems)) {
          cachedItems.forEach(item => {
            // 重複チェック（URLベース）
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allItems.push({
                category: item.category || categoryName,
                title: item.title || '',
                url: item.url || '',
                price: item.price || '',
                author: item.author || '',
                authorIcon: item.author_icon_url || '',
                image: item.img_url || ''
              });
            }
          });
        }
      }
    }

    if (allItems.length === 0) {
      showReloadNotification("エクスポートするアイテムがありません", 'error');
      return;
    }

    if (format === 'html') {
      await exportToHTML(allItems);
    } else if (format === 'excel') {
      await exportToExcel(allItems);
    }
  }

  // HTMLエクスポート
  async function exportToHTML(items) {
    const htmlContent = generateHTML(items);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `VRCNAVI_Booth_Items_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showReloadNotification(`HTMLファイルをエクスポートしました (${items.length}件)`, 'success');
  }

  // Excelエクスポート
  async function exportToExcel(items) {
    const csvContent = generateCSV(items);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `VRCNAVI_Booth_Items_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showReloadNotification(`CSVファイルをエクスポートしました (${items.length}件)`, 'success');
  }

  // HTML生成
  function generateHTML(items) {
    const categories = [...new Set(items.map(item => item.category))];
    const currentDate = new Date().toLocaleDateString('ja-JP');
    
    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VRCNAVI Booth Items - ${currentDate}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2196f3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .category { margin: 20px; }
        .category h2 { color: #333; border-bottom: 2px solid #2196f3; padding-bottom: 10px; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 15px; }
        .item-card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: transform 0.2s; }
        .item-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .item-image { width: 100%; height: 200px; object-fit: cover; }
        .item-content { padding: 15px; }
        .item-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
        .item-title a { color: #2196f3; text-decoration: none; }
        .item-title a:hover { text-decoration: underline; }
        .item-price { color: #666; font-size: 14px; margin-bottom: 5px; }
        .item-author { color: #888; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #666; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>VRCNAVI Booth Items</h1>
            <p>エクスポート日時: ${currentDate} | 総アイテム数: ${items.length}件</p>
        </div>`;

    categories.forEach(category => {
      const categoryItems = items.filter(item => item.category === category);
      html += `
        <div class="category">
            <h2>${category} (${categoryItems.length}件)</h2>
            <div class="items-grid">`;
      
      categoryItems.forEach(item => {
        html += `
                <div class="item-card">
                    <img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.style.display='none'">
                    <div class="item-content">
                        <div class="item-title">
                            <a href="${item.url}" target="_blank">${item.title}</a>
                        </div>
                        <div class="item-price">${item.price}</div>
                        <div class="item-author">${item.author}</div>
                    </div>
                </div>`;
      });
      
      html += `
            </div>
        </div>`;
    });

    html += `
        <div class="footer">
            <p>このファイルは VRCNAVI で生成されました</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  // CSV生成
  function generateCSV(items) {
    const headers = ['カテゴリ', 'タイトル', '価格', '作者', 'URL'];
    const csvRows = [headers.join(',')];
    
    items.forEach(item => {
      const row = [
        `"${item.category}"`,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.price}"`,
        `"${item.author}"`,
        `"${item.url}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

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

  // 通知アニメーション用のCSSを追加
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInFromRight {
        0% {
          transform: translateX(100%);
          opacity: 0;
        }
        100% {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutToRight {
        0% {
          transform: translateX(0);
          opacity: 1;
        }
        100% {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      
      .loading-container {
        animation: fadeIn 0.3s ease-in;
      }
      
      @keyframes fadeIn {
        0% {
          opacity: 0;
          transform: translateY(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .export-option:hover {
        background-color: #444 !important;
      }
    `;
    document.head.appendChild(style);
  }

  return page;
}
