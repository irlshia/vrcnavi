// 概要ページ（HomeSummary）
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
