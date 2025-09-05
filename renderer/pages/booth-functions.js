// Boothページで使用される関数群

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
