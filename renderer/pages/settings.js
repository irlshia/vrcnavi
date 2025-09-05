// 設定ページ（Settingsmenu）
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
