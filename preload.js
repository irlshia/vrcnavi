const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("vrcnavi", {
  getBoothItems: (category) => ipcRenderer.invoke("get-booth-items", category),
  getBoothItemsCombined: (categories, keywords, shops, maxItems) => ipcRenderer.invoke("getBoothItemsCombined", categories, keywords, shops, maxItems),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (settings) => ipcRenderer.invoke("set-settings", settings),
  getEventLog: () => ipcRenderer.invoke("get-event-log")
});

contextBridge.exposeInMainWorld("electronAPI", {
  saveJson: (filename, data) => ipcRenderer.invoke("save-json", filename, data),
  loadJson: (filename) => ipcRenderer.invoke("load-json", filename),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  onUpdateAvailable: (callback) => ipcRenderer.on("update-available", callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on("update-downloaded", callback),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
  fetchHelpMd: async () => {
    try {
      const url = "https://raw.githubusercontent.com/irlshia/vrcnavi/refs/heads/main/HELP.md";
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.text();
    } catch (e) {
      return null;
    }
  },
  fetchUpdateMd: async () => {
    try {
      const url = "https://raw.githubusercontent.com/irlshia/vrcnavi/refs/heads/main/update.md";
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.text();
    } catch (e) {
      return null;
    }
  },
  // Boothキャッシュ関連API
  getBoothCache: () => ipcRenderer.invoke("get-booth-cache"),
  saveBoothCache: (data) => ipcRenderer.invoke("save-booth-cache", data),
  clearBoothCache: () => ipcRenderer.invoke("clear-booth-cache"),
  // 画像管理API
  saveImage: (filename, base64Data) => ipcRenderer.invoke("save-image", filename, base64Data),
  deleteImage: (filename) => ipcRenderer.invoke("delete-image", filename),
  getImage: (filename) => ipcRenderer.invoke("get-image", filename)
});

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  onMaximize: (callback) => ipcRenderer.on('window-maximized', callback),
  onUnmaximize: (callback) => ipcRenderer.on('window-unmaximized', callback),
});
