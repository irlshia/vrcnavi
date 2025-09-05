// 共通機能とユーティリティ関数

// メモリキャッシュシステム
const memoryCache = {
  moreItems: new Map(), // カテゴリ別の「もっと見る」アイテムキャッシュ
  cacheTime: new Map(), // キャッシュの作成時間
  CACHE_DURATION: 5 * 60 * 1000, // 5分間のキャッシュ有効期限
  
  // キャッシュを取得
  get(categoryName) {
    const cacheKey = categoryName;
    const cached = this.moreItems.get(cacheKey);
    const cacheTime = this.cacheTime.get(cacheKey);
    
    if (cached && cacheTime && (Date.now() - cacheTime) < this.CACHE_DURATION) {
      console.log(`メモリキャッシュから取得: ${categoryName}`);
      return cached;
    }
    
    // 期限切れの場合は削除
    if (cached) {
      this.moreItems.delete(cacheKey);
      this.cacheTime.delete(cacheKey);
    }
    
    return null;
  },
  
  // キャッシュを保存
  set(categoryName, items) {
    const cacheKey = categoryName;
    this.moreItems.set(cacheKey, items);
    this.cacheTime.set(cacheKey, Date.now());
    console.log(`メモリキャッシュに保存: ${categoryName} (${items.length}件)`);
  },
  
  // キャッシュをクリア
  clear() {
    this.moreItems.clear();
    this.cacheTime.clear();
    console.log('メモリキャッシュをクリアしました');
  },
  
  // 特定のカテゴリのキャッシュをクリア
  clearCategory(categoryName) {
    const cacheKey = categoryName;
    this.moreItems.delete(cacheKey);
    this.cacheTime.delete(cacheKey);
    console.log(`カテゴリキャッシュをクリア: ${categoryName}`);
  }
};

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

// ローディング完了処理
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

// 画像モーダル関連
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

// ウェルカムモーダル
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

// 初期設定モーダル
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
  
  // メモリキャッシュをチェック
  const cachedItems = memoryCache.get(categoryName);
  if (cachedItems) {
    console.log('メモリキャッシュから表示:', cachedItems.length, '件');
    renderMoreItems(cachedItems, container);
    return;
  }
  
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
      
      // メモリキャッシュに保存
      memoryCache.set(categoryName, filteredItems);
      
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

// 設定保存時はlocalStorageキャッシュとメモリキャッシュをクリア
window.addEventListener('DOMContentLoaded', () => {
  const origSaveJson = window.electronAPI.saveJson;
  window.electronAPI.saveJson = async (filename, data) => {
    if (filename === "channels") {
      clearBoothItemsCache();
      memoryCache.clear(); // メモリキャッシュもクリア
    }
    return await origSaveJson(filename, data);
  };
});

// 画像ダウンロード・管理システム
const imageManager = {
  // 画像をダウンロードしてローカルに保存
  async downloadImage(imageUrl, itemUrl) {
    try {
      // ファイル名を生成（URLからハッシュ化）
      const urlHash = await this.hashString(itemUrl);
      const extension = this.getImageExtension(imageUrl);
      const filename = `${urlHash}${extension}`;
      
      // 画像をダウンロード
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);
      
      // ローカルに保存
      const result = await window.electronAPI.saveImage(filename, base64);
      if (result) {
        return `local://${filename}`;
      }
      return imageUrl; // 保存失敗時は元のURLを返す
    } catch (error) {
      console.error('画像ダウンロードエラー:', error);
      return imageUrl; // エラー時は元のURLを返す
    }
  },

  // 文字列をハッシュ化
  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  },

  // 画像の拡張子を取得
  getImageExtension(url) {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return match ? `.${match[1].toLowerCase()}` : '.jpg';
  },

  // ArrayBufferをBase64に変換
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  // ローカル画像のURLを生成
  async getLocalImageUrl(filename) {
    try {
      const url = await window.electronAPI.getLocalImageUrl(filename);
      return url || `local://${filename}`;
    } catch (error) {
      console.error('ローカル画像URL取得エラー:', error);
      return `local://${filename}`;
    }
  },

  // 画像ファイルを削除
  async deleteImage(filename) {
    try {
      await window.electronAPI.deleteImage(filename);
    } catch (error) {
      console.error('画像削除エラー:', error);
    }
  }
};

// imageManagerをwindowに公開
window.imageManager = imageManager;

window.addEventListener('beforeunload', () => {
  clearBoothItemsCache();
  memoryCache.clear(); // メモリキャッシュもクリア
});
