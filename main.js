const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require("electron");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const { autoUpdater } = require("electron-updater");
const puppeteer = require('puppeteer');

console.log("[main] app start");

const userDataPath = app.getPath("userData");
const CHANNELS_FILE = path.join(userDataPath, "config.json");
const BOOTH_CACHE_FILE = path.join(userDataPath, "booth_cache.json");
const FAVORITES_FILE = path.join(userDataPath, "favorites.json");
const IMAGES_DIR = path.join(userDataPath, "images");

const CHROME_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

let tray = null;
let backgroundMode = false;
let win = null;

// 多重起動防止
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[main] 他プロセスが起動中のため終了します');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[main] second-instanceイベント発火');
    if (win) {
      if (win.isDestroyed()) {
        console.log('[main] winがdestroyedのため再生成');
        createWindow();
      } else {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    } else {
      console.log('[main] winがnullのため再生成');
      createWindow();
    }
  });

  app.whenReady().then(() => {
    console.log("[main] app.whenReady");
    createWindow();
  });
}

async function loadJsonFile(filepath) {
  try {
    console.log(`[File] 読み込み開始: ${filepath}`);
    const text = await fs.readFile(filepath, "utf-8");
    console.log(`[File] 読み込み成功: ${filepath}`);
    
    // 空ファイルの場合はデフォルト値を返す
    if (!text.trim()) {
      console.log(`[File] ${filepath} は空ファイルです。デフォルト値を返します。`);
      return [];
    }
    
    return JSON.parse(text);
  } catch (e) {
    console.log(`[File] ${filepath} 読み込み失敗かファイル無し。デフォルト値を返す。`, e);
    // favorites.jsonの場合は空配列を返す
    if (filepath === FAVORITES_FILE) {
      return [];
    }
    return {};
  }
}

async function saveJsonFile(filepath, data) {
  try {
    console.log(`[File] 保存開始: ${filepath}`);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[File] 保存成功: ${filepath}`);
    return true;
  } catch (e) {
    console.error(`[File] 保存エラー: ${filepath}`, e);
    return false;
  }
}

const CATEGORY_URLS = {
  "服": "https://booth.pm/ja/search/VRChat%20%E6%9C%8D?&sort=new",
  "VRChat 3D装飾品": "https://booth.pm/ja/browse/3D%E3%83%A2%E3%83%87%E3%83%AB?new_arrival=true",
  "3D装飾品": "https://booth.pm/ja/browse/3D%E8%A3%85%E9%A3%BE%E5%93%81?sort=new",
  "総合": "https://booth.pm/ja/search/VRChat?sort=new",
  "3Dモーション・アニメーション": "https://booth.pm/ja/browse/3D%E3%83%A2%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%83%BB%E3%82%A2%E3%83%8B%E3%83%A1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3?sort=new",
  "ギミック": "https://booth.pm/ja/search/VRChat%20%E3%82%AE%E3%83%9F%E3%83%83%E3%82%AF?sort=new&tags%5B%5D=%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B5%E3%83%AA%E3%83%BC"
};

async function scrapeBooth(url, label, maxItems = 6) {
  try {
    console.log(`[Booth] 取得開始: ${label} URL=${url}`);
    let text = "";
    let usePuppeteer = false;
    // ショップページのみpuppeteer
    if (!url.includes('/ja/search/') && !url.includes('/ja/browse/')) {
      usePuppeteer = true;
    }
    if (usePuppeteer) {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: CHROME_PATH
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      text = await page.content();
      await browser.close();
      console.log('[Booth][puppeteer] 取得HTML冒頭:', text.slice(0, 2000));
    } else {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      text = await res.text();
      console.log('[Booth] 取得HTML冒頭:', text.slice(0, 2000));
    }
    const $ = cheerio.load(text);

    let results = [];

    if (usePuppeteer) {
      // ショップページ用
      // ページ全体からアイコンURLを取得
      let authorIconUrl = "";
      const avatarStyle = $(".avatar-image").first().attr("style") || "";
      const match = avatarStyle.match(/url\(['\"]?(.*?)['\"]?\)/);
      if (match) authorIconUrl = match[1];
      const shopName = label.replace('ショップ', '');
      const items = $("li.js-mount-point-shop-item-card");
      items.slice(0, maxItems).each((idx, item) => {
        const el = $(item);
        const title = el.find("h2.item-name a").text().trim() || "無題";
        const itemUrl = el.find("h2.item-name a").attr("href") || "";
        const imgUrl = el.find(".thumb img").attr("src") || "";
        const price = el.find(".price").text().trim() || "価格不明";
        results.push({
          title,
          url: itemUrl,
          img_url: imgUrl,
          author: shopName,
          author_icon_url: authorIconUrl,
          price,
          category: shopName
        });
      });
    } else {
      // 検索ページ用（puppeteerは使わない）
      let items = $("li.item-card.l-card");
      if (items.length === 0) {
        // 新しい構造の場合: a[href*='/items/'] で取得
        items = $("a[href*='/items/']");
        items.slice(0, maxItems).each((idx, item) => {
          const el = $(item);
          const itemUrl = el.attr("href") || "";
          const title = el.attr("title") || el.text().trim() || "無題";
          // 画像や価格は親要素や兄弟要素から取得する必要あり（ここは要調整）
          results.push({
            title,
            url: itemUrl,
            img_url: "",
            author: label,
            author_icon_url: "",
            price: "",
            category: label
          });
        });
      } else {
        items.slice(0, maxItems).each((idx, item) => {
          const el = $(item);
          const title = el.find("a.item-card__title-anchor--multiline").first().text().trim()
            || el.attr("data-product-name") || "無題";
          let itemUrl = el.find("a.item-card__thumbnail-image").attr("href")
            || el.find("a.item-card__title-anchor--multiline").attr("href") || "";
          if (itemUrl.startsWith("/")) itemUrl = "https://booth.pm" + itemUrl;
          const imgUrl = el.find("a.js-thumbnail-image.item-card__thumbnail-image").attr("data-original") || "";
          const author = el.find(".item-card__shop-name").first().text().trim() || "作者不明";
          const authorIconUrl = el.find("img.user-avatar.at-item-footer").attr("src") || "";
          const price = el.find(".price.text-primary400.text-left.u-tpg-caption2").first().text().trim() || "価格不明";
          results.push({ title, url: itemUrl, img_url: imgUrl, author, author_icon_url: authorIconUrl, price, category: label });
        });
      }
    }

    console.log(`[Booth] 取得完了: ${label} アイテム数=${results.length}`);
    return results;
  } catch (e) {
    console.error(`[Booth] 取得失敗 (${label}):`, e);
    return [];
  }
}

async function getBoothItemsCombined(categoryList = [], keywordList = [], shopList = [], maxItems = 6) {
  console.log("[Booth] getBoothItemsCombined 開始", { categoryList, keywordList, shopList });
  const allItems = new Map();

  for (const category of categoryList) {
    const url = CATEGORY_URLS[category];
    if (!url) {
      console.warn(`[Booth] URL未定義のカテゴリ: ${category}`);
      continue;
    }
    const items = await scrapeBooth(url, category, maxItems);
    for (const item of items) {
      allItems.set(item.url, item);
    }
  }

  for (const kwObj of keywordList) {
    let keyword, options;
    if (typeof kwObj === "object" && kwObj !== null) {
      keyword = kwObj.keyword;
      options = kwObj.options || {};
    } else {
      keyword = kwObj;
      options = {};
    }
    // 複数単語の場合は+で結合（Boothの検索仕様に合わせる）
    const searchKeyword = keyword.replace(/\s+/g, '+');
    let searchUrl = `https://booth.pm/ja/search/${searchKeyword}`;
    if (options.latestOnly) {
      searchUrl += "?sort=new";
    }
    // new_arrival=trueは削除（通常のBooth検索と同じ結果にするため）
    console.log(`[Booth] キーワード検索: "${keyword}" -> URL: ${searchUrl}`);
    const items = await scrapeBooth(searchUrl, keyword, maxItems);
    for (const item of items) {
      allItems.set(item.url, item);
    }
  }

  for (const shopId of shopList || []) {
    if (!shopId) continue;
    const shopUrl = `https://${shopId}.booth.pm/`;
    const items = await scrapeBooth(shopUrl, shopId + 'ショップ', maxItems);
    for (const item of items) {
      allItems.set(item.url, item);
    }
  }

  const result = Array.from(allItems.values());
  console.log("[Booth] getBoothItemsCombined 完了, アイテム合計数=", result.length);
  return result;
}

async function loadBackgroundMode() {
  try {
    const data = await loadJsonFile(CHANNELS_FILE);
    backgroundMode = !!data.backgroundMode;
  } catch (e) {
    backgroundMode = false;
  }
}

async function loadBoothCache() {
  const defaultCache = { no_auto_scan: false, items: [] };
  try {
    // ファイルがなければ作成
    try {
      await fs.access(BOOTH_CACHE_FILE);
    } catch (e) {
      await fs.mkdir(path.dirname(BOOTH_CACHE_FILE), { recursive: true });
      await fs.writeFile(BOOTH_CACHE_FILE, JSON.stringify(defaultCache, null, 2), "utf-8");
      return defaultCache;
    }
    const text = await fs.readFile(BOOTH_CACHE_FILE, "utf-8");
    return JSON.parse(text);
  } catch (e) {
    // エラー時も必ずデフォルト値を返す
    return defaultCache;
  }
}

async function saveBoothCache(data) {
  try {
    await fs.mkdir(path.dirname(BOOTH_CACHE_FILE), { recursive: true });
    await fs.writeFile(BOOTH_CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    return false;
  }
}

async function clearBoothCache() {
  try {
    await fs.mkdir(path.dirname(BOOTH_CACHE_FILE), { recursive: true });
    await fs.writeFile(BOOTH_CACHE_FILE, JSON.stringify({ no_auto_scan: false, items: [] }, null, 2), "utf-8");
    return true;
  } catch (e) {
    return false;
  }
}

// 画像を保存
async function saveImage(filename, base64Data) {
  try {
    // imagesディレクトリを作成
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    
    const imagePath = path.join(IMAGES_DIR, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(imagePath, buffer);
    
    console.log(`[Image] 保存成功: ${filename}`);
    return true;
  } catch (e) {
    console.error(`[Image] 保存エラー: ${filename}`, e);
    return false;
  }
}

// 画像を削除
async function deleteImage(filename) {
  try {
    const imagePath = path.join(IMAGES_DIR, filename);
    await fs.unlink(imagePath);
    console.log(`[Image] 削除成功: ${filename}`);
    return true;
  } catch (e) {
    console.error(`[Image] 削除エラー: ${filename}`, e);
    return false;
  }
}

// 画像ファイルを取得
async function getImage(filename) {
  try {
    const imagePath = path.join(IMAGES_DIR, filename);
    const buffer = await fs.readFile(imagePath);
    return buffer.toString('base64');
  } catch (e) {
    console.error(`[Image] 読み込みエラー: ${filename}`, e);
    return null;
  }
}

// グローバルで一度だけIPCハンドラを登録
ipcMain.handle("getBoothItemsCombined", async (event, categories, keywords, shops, maxItems) => {
  return await getBoothItemsCombined(categories, keywords, shops, maxItems);
});
ipcMain.handle('window-minimize', () => {
  if (win) win.minimize();
});
ipcMain.handle('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});
ipcMain.handle('window-close', () => {
  if (win) win.close();
});
ipcMain.handle("open-external", (_event, url) => {
  return shell.openExternal(url);
});
ipcMain.handle("check-for-updates", async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle("quit-and-install", () => {
  autoUpdater.quitAndInstall();
});
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});
ipcMain.handle("load-json", async (event, filename) => {
  const safeFiles = { 
    channels: CHANNELS_FILE,
    favorites: FAVORITES_FILE
  };
  if (!(filename in safeFiles)) return {};
  
  const filepath = safeFiles[filename];
  const result = await loadJsonFile(filepath);
  
  // favorites.jsonが空配列の場合、初期ファイルを作成
  if (filename === "favorites" && Array.isArray(result) && result.length === 0) {
    try {
      await fs.access(filepath);
      // ファイルが存在するが空の場合、正しい空配列で初期化
      await saveJsonFile(filepath, []);
    } catch (e) {
      // ファイルが存在しない場合、空配列で作成
      await saveJsonFile(filepath, []);
    }
  }
  
  return result;
});
ipcMain.handle("save-json", async (event, filename, data) => {
  const safeFiles = { 
    channels: CHANNELS_FILE,
    favorites: FAVORITES_FILE
  };
  if (!(filename in safeFiles)) return false;
  const result = await saveJsonFile(safeFiles[filename], data);
  if (filename === "channels") await loadBackgroundMode();
  return result;
});
ipcMain.handle("get-booth-cache", async () => {
  return await loadBoothCache();
});
ipcMain.handle("save-booth-cache", async (_event, data) => {
  return await saveBoothCache(data);
});
ipcMain.handle("clear-booth-cache", async () => {
  return await clearBoothCache();
});
ipcMain.handle("save-image", async (event, filename, base64Data) => {
  return await saveImage(filename, base64Data);
});
ipcMain.handle("delete-image", async (event, filename) => {
  return await deleteImage(filename);
});
ipcMain.handle("get-image", async (event, filename) => {
  return await getImage(filename);
});

function createWindow() {
  console.log("[main] createWindow 開始");
  win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    icon: path.join(__dirname, "assets", "icon.png"),
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: false
    },
  });
  console.log("[main] BrowserWindow生成完了");

  win.on('ready-to-show', () => {
    console.log('[main] BrowserWindow ready-to-show');
  });
  win.on('show', () => {
    console.log('[main] BrowserWindow show');
  });
  win.on('closed', () => {
    console.log('[main] BrowserWindow closed');
  });
  win.on('unresponsive', () => {
    console.log('[main] BrowserWindow unresponsive');
  });
  win.on('crashed', () => {
    console.log('[main] BrowserWindow crashed');
  });

  console.log("[main] win.loadFile直前");
  win.loadFile("renderer/index.html").then(() => {
    console.log("[main] index.html loaded");
  }).catch(e => {
    console.error("[main] index.html load failed", e);
  });
  console.log("[main] win.loadFile直後");

  // タスクトレイ作成（重複防止）
  if (tray) {
    tray.destroy();
    tray = null;
  }
  const trayIconPath = path.join(__dirname, "renderer/assets", "icon16.png");
  console.log("[main] Tray icon path:", trayIconPath);
  tray = new Tray(trayIconPath);
  console.log("[main] Tray created");
  const showWindow = () => {
    if (win && !win.isDestroyed()) {
      win.setSkipTaskbar(false);
      win.show();
      win.focus();
    } else {
      console.log("[main] BrowserWindow is destroyed. Recreating window.");
      createWindow();
      if (win) {
        win.setSkipTaskbar(false);
        win.show();
        win.focus();
      }
    }
  };
  const contextMenu = Menu.buildFromTemplate([
    { label: '表示', click: showWindow },
    { label: '終了', click: async () => {
      app.isQuiting = true;
      // booth_cache.jsonを空にする
      try {
        await fs.writeFile(BOOTH_CACHE_FILE, JSON.stringify({ no_auto_scan: false, items: [] }, null, 2), "utf-8");
        console.log("[main] booth_cache.json を空にしました");
      } catch (e) {
        console.error("[main] booth_cache.json の空化に失敗", e);
      }
      app.quit();
    }}
  ]);
  tray.setToolTip('VRCNAVI');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', showWindow);

  // 設定値を初期化
  loadBackgroundMode();

  // ウィンドウclose時の挙動切り替え
  win.on('close', async (event) => {
    const data = await loadJsonFile(CHANNELS_FILE);
    const latestBackgroundMode = !!data.backgroundMode;
    if (latestBackgroundMode && !app.isQuiting) {
      event.preventDefault();
      win.hide();
      win.setSkipTaskbar(true);
    }
  });
}

app.on("window-all-closed", async () => {
  console.log("[main] window-all-closed");
  try {
    const data = await loadJsonFile(CHANNELS_FILE);
    const latestBackgroundMode = !!data.backgroundMode;
    if (process.platform !== "darwin" && !latestBackgroundMode) {
      // booth_cache.jsonを空にする
      try {
        await fs.writeFile(BOOTH_CACHE_FILE, JSON.stringify({ no_auto_scan: false, items: [] }, null, 2), "utf-8");
        console.log("[main] booth_cache.json を空にしました");
      } catch (e) {
        console.error("[main] booth_cache.json の空化に失敗", e);
      }
      app.quit();
    }
    // バックグラウンド常駐時は何もしない（アプリは残る）
  } catch (e) {
    console.error("[main] window-all-closed error", e);
    app.quit(); // 念のため
  }
});
