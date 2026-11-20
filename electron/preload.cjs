const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // State persistence
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),

  // Downloader
  getVideoInfo: (url) => ipcRenderer.invoke('downloader:get-info', url),
  startDownload: (options) => ipcRenderer.invoke('downloader:start', options),
  cancelDownload: (id) => ipcRenderer.invoke('downloader:cancel', id),
  checkDownloaderReady: () => ipcRenderer.invoke('downloader:check-ready'),
  installYtDlp: () => ipcRenderer.invoke('downloader:install'),
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('downloader:progress', handler);
    return () => ipcRenderer.removeListener('downloader:progress', handler);
  },

  // System & Files
  selectDownloadFolder: () => ipcRenderer.invoke('system:select-folder'),
  selectLocalVideo: () => ipcRenderer.invoke('system:select-local-video'),
  getDefaultDownloadPath: () => ipcRenderer.invoke('system:get-default-path'),
  showInFolder: (filePath) => ipcRenderer.invoke('system:show-in-folder', filePath),
  openFile: (filePath) => ipcRenderer.invoke('system:open-file', filePath),
  getLocalMediaUrl: (filePath) => ipcRenderer.invoke('system:get-media-url', filePath),
  exportNotes: (options) => ipcRenderer.invoke('system:export-notes', options),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
});

