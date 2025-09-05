// Boothページで使用される関数群

async function loadBoothItemsFromConfig(container, isGrid = false, forceReload = false) {
  // アニメーション付きローディング表示
  container.innerHTML = `
    <div class="loading-container" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    ">
      <div class="loading-spinner" style="
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255,255,255,0.1);
        border-top: 4px solid #4caf50;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      "></div>
      <div class="loading-text" style="
        color: #888;
        font-size: 16px;
        font-weight: 500;
      ">読み込み中...</div>
    </div>
  `;

  try {
    const savedSettings = await window.electronAPI.loadJson("channels");
    const guildId = "default";
    const config = savedSettings?.[guildId];

    if (!config) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #f44336;
        ">
          <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 16px;"></i>
          <div style="font-size: 16px; font-weight: 500;">設定が見つかりません</div>
        </div>
      `;
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
    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: #f44336;
      ">
        <i class="fas fa-times-circle" style="font-size: 32px; margin-bottom: 16px;"></i>
        <div style="font-size: 16px; font-weight: 500;">読み込みに失敗しました</div>
      </div>
    `;
    console.error(e);
  }
}

function renderBoothItems(container, allItems, isGrid, latestOnlyKeywords = []) {
  if (!allItems || !allItems.length) {
    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: #888;
      ">
        <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 16px;"></i>
        <div style="font-size: 16px; font-weight: 500;">新着アイテムがありません</div>
      </div>
    `;
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
        <div style=\"display: flex; flex-direction: column; align-items: center; gap: 8px;\">
          <img src=\"${item.author_icon_url}\" alt=\"作者アイコン\" style=\"width:32px; height:32px; border-radius:50%;\">
          <button class=\"favorite-btn\" data-url=\"${item.url}\" style=\"
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
          \" title=\"お気に入りに追加\">
            <i class=\"far fa-heart\"></i>
          </button>
        </div>
      `;
      const link = itemEl.querySelector("a");
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.electronAPI.openExternal(link.href);
      });
      const img = itemEl.querySelector('img[alt]');
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
      
      // お気に入りボタンのイベントハンドラー
      const favoriteBtn = itemEl.querySelector('.favorite-btn');
      favoriteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // グローバル関数を呼び出し
        if (typeof window.toggleFavorite === 'function') {
          // お気に入りに追加する場合、画像をダウンロード
          const isAdding = favoriteBtn.querySelector('i').classList.contains('far');
          if (isAdding && typeof imageManager !== 'undefined') {
            try {
              const localImageUrl = await imageManager.downloadImage(item.img_url, item.url);
              // ローカル画像URLでアイテムデータを更新
              const itemWithLocalImage = { ...item, image: localImageUrl };
              window.toggleFavorite(item.url, itemWithLocalImage);
            } catch (error) {
              console.error('画像ダウンロードエラー:', error);
              // エラー時は元のURLでお気に入りに追加
              window.toggleFavorite(item.url, item);
            }
          } else {
            window.toggleFavorite(item.url, item);
          }
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
