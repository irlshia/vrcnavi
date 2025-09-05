// お気に入りページ（FavoritesPage）
function FavoritesPage() {
  const page = document.createElement("div");
  page.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h2 style="color: #fff; margin: 0; font-size: 32px; display: flex; align-items: center; gap: 12px;">
          <i class="fas fa-heart" style="color: #e91e63;"></i>
          お気に入り
        </h2>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="export-dropdown" style="position: relative; display: inline-block;">
            <button id="exportFavoritesBtn" style="
              padding: 8px 16px;
              font-size: 14px;
              cursor: pointer;
              border-radius: 6px;
              border: 1px solid #2196f3;
              background: transparent;
              color: #2196f3;
              display: flex;
              align-items: center;
              gap: 6px;
              user-select: none;
              transition: all 0.3s ease;
            ">
              <i class="fas fa-download"></i> エクスポート
            </button>
            <div id="exportFavoritesMenu" style="
              position: absolute;
              top: 100%;
              right: 0;
              background: #2a2a2a;
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 8px;
              padding: 8px 0;
              min-width: 160px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              z-index: 1000;
              display: none;
            ">
              <button class="export-option" data-format="html" style="
                width: 100%;
                padding: 8px 16px;
                border: none;
                background: none;
                color: #fff;
                text-align: left;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background-color 0.2s;
              ">
                <i class="fas fa-file-code"></i> HTMLファイル
              </button>
              <button class="export-option" data-format="excel" style="
                width: 100%;
                padding: 8px 16px;
                border: none;
                background: none;
                color: #fff;
                text-align: left;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background-color 0.2s;
              ">
                <i class="fas fa-file-excel"></i> Excelファイル
              </button>
            </div>
          </div>
          <button id="refreshFavoritesBtn" style="
            padding: 8px 16px;
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
          ">
            <i class="fas fa-sync"></i> 更新
          </button>
          <button id="clearAllFavoritesBtn" style="
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            border-radius: 6px;
            border: 1px solid #f44336;
            background: transparent;
            color: #f44336;
            display: flex;
            align-items: center;
            gap: 6px;
            user-select: none;
            transition: all 0.3s ease;
          ">
            <i class="fas fa-trash"></i> 全削除
          </button>
        </div>
      </div>
      
      <div id="favorites-stats" style="
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
        border: 1px solid rgba(255,255,255,0.1);
      ">
        <div style="display: flex; gap: 24px; align-items: center;">
          <div style="text-align: center;">
            <div style="color: #e91e63; font-size: 24px; font-weight: bold;" id="total-favorites">0</div>
            <div style="color: #ccc; font-size: 14px;">総お気に入り数</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #4caf50; font-size: 24px; font-weight: bold;" id="category-count">0</div>
            <div style="color: #ccc; font-size: 14px;">カテゴリ数</div>
          </div>
        </div>
      </div>

      <div id="favorites-container" style="color:#ccc; font-size:14px;">
        <div style="text-align: center; padding: 60px 20px; color: #888;">
          <i class="fas fa-heart" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
          <div style="font-size: 18px; margin-bottom: 8px;">お気に入りアイテムがありません</div>
          <div style="font-size: 14px;">Boothページでアイテムのハートアイコンをクリックしてお気に入りに追加できます</div>
        </div>
      </div>
    </div>
  `;

  const refreshBtn = page.querySelector("#refreshFavoritesBtn");
  const clearAllBtn = page.querySelector("#clearAllFavoritesBtn");
  const exportBtn = page.querySelector("#exportFavoritesBtn");
  const exportMenu = page.querySelector("#exportFavoritesMenu");
  const container = page.querySelector("#favorites-container");
  const totalFavorites = page.querySelector("#total-favorites");
  const categoryCount = page.querySelector("#category-count");

  // お気に入りデータを管理
  let favoritesData = [];

  // 画像URLを取得（ローカル画像対応）
  async function getImageUrl(imageUrl) {
    if (imageUrl && imageUrl.startsWith('local://')) {
      // ローカル画像の場合、common.jsのgetLocalImageUrlを使用
      if (window.imageManager && window.imageManager.getLocalImageUrl) {
        const filename = imageUrl.replace('local://', '');
        return await window.imageManager.getLocalImageUrl(filename);
      }
      // フォールバック：直接ファイルパスに変換
      const filename = imageUrl.replace('local://', '');
      return `file://${filename}`;
    }
    return imageUrl;
  }

  // お気に入りデータを読み込み
  async function loadFavorites() {
    try {
      const savedFavorites = await window.electronAPI.loadJson("favorites") || [];
      favoritesData = savedFavorites;
      renderFavorites();
      updateStats();
    } catch (error) {
      console.error("お気に入り読み込みエラー:", error);
      showNotification("お気に入りの読み込みに失敗しました", 'error');
    }
  }

  // お気に入りデータを保存
  async function saveFavorites() {
    try {
      await window.electronAPI.saveJson("favorites", favoritesData);
    } catch (error) {
      console.error("お気に入り保存エラー:", error);
      showNotification("お気に入りの保存に失敗しました", 'error');
    }
  }

  // 統計情報を更新
  function updateStats() {
    const total = favoritesData.length;
    const categories = [...new Set(favoritesData.map(item => item.category))].length;
    
    totalFavorites.textContent = total;
    categoryCount.textContent = categories;
  }

  // お気に入り一覧を表示
  async function renderFavorites() {
    if (favoritesData.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #888;">
          <i class="fas fa-heart" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
          <div style="font-size: 18px; margin-bottom: 8px;">お気に入りアイテムがありません</div>
          <div style="font-size: 14px;">Boothページでアイテムのハートアイコンをクリックしてお気に入りに追加できます</div>
        </div>
      `;
      return;
    }

    // カテゴリ別にグループ化
    const categories = [...new Set(favoritesData.map(item => item.category))];
    let html = '';
    
    for (const category of categories) {
      const categoryItems = favoritesData.filter(item => item.category === category);
      html += `
        <div class="category-block" style="margin-bottom: 32px;">
          <h3 style="color: #fff; margin: 0 0 16px 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
            <span style="background: #e91e63; width: 4px; height: 20px; border-radius: 2px;"></span>
            ${category} (${categoryItems.length}件)
          </h3>
          <div class="items-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
      `;
      
      for (const item of categoryItems) {
        const imageUrl = await getImageUrl(item.image);
        html += `
          <div class="item-card" style="
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <img src="${imageUrl}" alt="${item.title}" style="
              width: 100%;
              height: 200px;
              object-fit: cover;
              cursor: pointer;
            " onclick="openImageModal('${imageUrl}')">
            <div style="padding: 16px;">
              <h4 style="margin: 0 0 8px 0; color: #fff; font-size: 16px; line-height: 1.4;">
                <a href="${item.url}" target="_blank" style="color: #6cf; text-decoration: none;" onclick="openExternal('${item.url}')">
                  ${item.title}
                </a>
              </h4>
              <div style="color: #aaa; font-size: 14px; margin-bottom: 12px;">
                ${item.price} / ${item.author}
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <img src="${item.authorIcon}" alt="作者" style="width: 24px; height: 24px; border-radius: 50%;">
                <button class="remove-favorite-btn" data-url="${item.url}" style="
                  background: none;
                  border: none;
                  color: #e91e63;
                  cursor: pointer;
                  font-size: 18px;
                  padding: 4px;
                  border-radius: 4px;
                  transition: all 0.2s;
                " title="お気に入りから削除">
                  <i class="fas fa-heart"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // イベントハンドラーを追加
    const removeButtons = container.querySelectorAll('.remove-favorite-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemUrl = btn.dataset.url;
        removeFavorite(itemUrl);
      });
    });
  }

  // お気に入りから削除
  async function removeFavorite(itemUrl) {
    const index = favoritesData.findIndex(item => item.url === itemUrl);
    if (index !== -1) {
      const item = favoritesData[index];
      
      // ローカル画像の場合は削除
      if (item.image && item.image.startsWith('local://')) {
        const filename = item.image.replace('local://', '');
        if (typeof imageManager !== 'undefined') {
          await imageManager.deleteImage(filename);
        }
      }
      
      favoritesData.splice(index, 1);
      saveFavorites();
      renderFavorites();
      updateStats();
      showNotification("お気に入りから削除しました", 'success');
    }
  }

  // 全削除
  clearAllBtn.addEventListener('click', async () => {
    if (favoritesData.length === 0) return;
    
    if (confirm('お気に入りをすべて削除しますか？この操作は元に戻せません。')) {
      // すべてのローカル画像を削除
      if (typeof imageManager !== 'undefined') {
        for (const item of favoritesData) {
          if (item.image && item.image.startsWith('local://')) {
            const filename = item.image.replace('local://', '');
            await imageManager.deleteImage(filename);
          }
        }
      }
      
      favoritesData = [];
      saveFavorites();
      renderFavorites();
      updateStats();
      showNotification("お気に入りをすべて削除しました", 'success');
    }
  });

  // エクスポート機能
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
  });

  // メニュー外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
      exportMenu.style.display = 'none';
    }
  });

  // エクスポートオプションのイベントハンドラー
  exportMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('export-option')) {
      const format = e.target.dataset.format;
      exportFavorites(format);
      exportMenu.style.display = 'none';
    }
  });

  // お気に入りをエクスポート
  async function exportFavorites(format) {
    if (favoritesData.length === 0) {
      showNotification("エクスポートするお気に入りがありません", 'error');
      return;
    }

    try {
      if (format === 'html') {
        const htmlContent = await generateFavoritesHTML(favoritesData);
        downloadFile(htmlContent, 'favorites.html', 'text/html');
        showNotification("HTMLファイルをエクスポートしました", 'success');
      } else if (format === 'excel') {
        const csvContent = generateFavoritesCSV(favoritesData);
        downloadFile(csvContent, 'favorites.csv', 'text/csv');
        showNotification("CSVファイルをエクスポートしました", 'success');
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      showNotification("エクスポートに失敗しました", 'error');
    }
  }

  // HTML生成
  async function generateFavoritesHTML(data) {
    const categories = [...new Set(data.map(item => item.category))];
    let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VRCNAVI お気に入り一覧</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: #fff; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .category { margin-bottom: 40px; }
        .category h3 { color: #e91e63; border-left: 4px solid #e91e63; padding-left: 12px; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .item-card { background: #2a2a2a; border-radius: 12px; overflow: hidden; transition: transform 0.2s; }
        .item-card:hover { transform: translateY(-2px); }
        .item-image { width: 100%; height: 200px; object-fit: cover; }
        .item-content { padding: 16px; }
        .item-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
        .item-title a { color: #6cf; text-decoration: none; }
        .item-price { color: #aaa; font-size: 14px; margin-bottom: 12px; }
        .item-footer { display: flex; align-items: center; justify-content: space-between; }
        .author-icon { width: 24px; height: 24px; border-radius: 50%; }
        .export-info { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>❤️ VRCNAVI お気に入り一覧</h1>
    </div>
    
    <div class="stats">
        <div style="display: flex; gap: 40px; justify-content: center;">
            <div style="text-align: center;">
                <div style="color: #e91e63; font-size: 24px; font-weight: bold;">${data.length}</div>
                <div style="color: #ccc;">総お気に入り数</div>
            </div>
            <div style="text-align: center;">
                <div style="color: #4caf50; font-size: 24px; font-weight: bold;">${categories.length}</div>
                <div style="color: #ccc;">カテゴリ数</div>
            </div>
        </div>
    </div>
`;

    for (const category of categories) {
      const categoryItems = data.filter(item => item.category === category);
      html += `
    <div class="category">
        <h3>${category} (${categoryItems.length}件)</h3>
        <div class="items-grid">
`;
      
      for (const item of categoryItems) {
        const imageUrl = await getImageUrl(item.image);
        html += `
            <div class="item-card">
                <img src="${imageUrl}" alt="${item.title}" class="item-image">
                <div class="item-content">
                    <div class="item-title">
                        <a href="${item.url}" target="_blank">${item.title}</a>
                    </div>
                    <div class="item-price">${item.price} / ${item.author}</div>
                    <div class="item-footer">
                        <img src="${item.authorIcon}" alt="作者" class="author-icon">
                    </div>
                </div>
            </div>
`;
      }
      
      html += `
        </div>
    </div>
`;
    }

    html += `
    <div class="export-info">
        エクスポート日時: ${new Date().toLocaleString('ja-JP')}<br>
        VRCNAVI お気に入り一覧
    </div>
</body>
</html>`;

    return html;
  }

  // CSV生成
  function generateFavoritesCSV(data) {
    const headers = ['カテゴリ', 'タイトル', '価格', '作者', 'URL', '画像URL'];
    const csvRows = [headers.join(',')];
    
    data.forEach(item => {
      const row = [
        `"${item.category || ''}"`,
        `"${item.title || ''}"`,
        `"${item.price || ''}"`,
        `"${item.author || ''}"`,
        `"${item.url || ''}"`,
        `"${item.image || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  // ファイルダウンロード
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 更新ボタン
  refreshBtn.addEventListener('click', () => {
    loadFavorites();
    showNotification("お気に入りを更新しました", 'success');
  });

  // 通知表示関数
  function showNotification(message, type = 'success') {
    // 既存の通知を削除
    const existingNotification = document.getElementById('favorites-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'favorites-notification';
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
      <i class="fas ${type === 'error' ? 'fa-times-circle' : 'fa-check'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
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

  // 外部リンクを開く
  window.openExternal = (url) => {
    window.electronAPI.openExternal(url);
  };

  // 画像モーダルを開く
  window.openImageModal = (imageUrl) => {
    const modal = document.getElementById('img-modal');
    const modalImg = document.getElementById('img-modal-img');
    if (modal && modalImg) {
      modalImg.src = imageUrl;
      modal.style.display = 'flex';
    }
  };

  // 初期化
  loadFavorites();

  return page;
}
