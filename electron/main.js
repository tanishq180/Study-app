import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Register privileged custom media protocol for local video streaming
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
]);
import { loadAppState, saveAppState } from './store.js';
import {
  getYtDlpCommand,
  fetchVideoInfo,
  startMediaDownload,
  cancelMediaDownload,
  ensureYtDlpInstalled
} from './downloader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#090a0f',
    title: 'StudyHub Desktop',
    icon: path.join(__dirname, '../StudyHub.ico'),
    frame: true, // Native titlebar with smooth controls
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false // Facilitate loading embedded YouTube iframes with arbitrary referrers
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // If dev server hasn't started yet, retry after 1s
      setTimeout(() => mainWindow.loadURL(devServerUrl), 1000);
    });
  } else {
    const distPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Stream local video/audio files with range request support
    protocol.handle('media', (request) => {
      try {
        const url = new URL(request.url);
        const filePath = url.searchParams.get('file');
        if (filePath && fs.existsSync(filePath)) {
          return net.fetch(pathToFileURL(filePath).toString());
        }
      } catch (e) {
        console.error('[Protocol media Error]', e);
      }
      return new Response('Media file not found', { status: 404 });
    });

    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // State Persistence Handlers
  ipcMain.handle('state:load', async () => {
    return loadAppState();
  });

  ipcMain.handle('state:save', async (_event, state) => {
    return saveAppState(state);
  });

  // Downloader Handlers
  ipcMain.handle('downloader:check-ready', async () => {
    try {
      const { cmd } = getYtDlpCommand();
      return { ready: Boolean(cmd), path: cmd };
    } catch (e) {
      return { ready: false, error: e.message };
    }
  });

  ipcMain.handle('downloader:install', async () => {
    try {
      const installedPath = await ensureYtDlpInstalled();
      return { success: true, path: installedPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('downloader:get-info', async (_event, url) => {
    try {
      const info = await fetchVideoInfo(url);
      return { success: true, data: info };
    } catch (e) {
      console.error('[Downloader Error]', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('downloader:start', async (_event, options) => {
    try {
      const result = await startMediaDownload(options, (progressData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('downloader:progress', progressData);
        }
      });
      return { success: true, data: result };
    } catch (e) {
      console.error('[Download Failed]', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('downloader:cancel', async (_event, id) => {
    const success = cancelMediaDownload(id);
    return { success };
  });

  // File System & Native Dialogs
  ipcMain.handle('system:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Download Folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('system:select-local-video', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Media File to View',
      properties: ['openFile'],
      filters: [
        { name: 'Media Files', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'mp3', 'm4a', 'wav'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('system:get-default-path', async () => {
    return app.getPath('downloads');
  });

  ipcMain.handle('system:show-in-folder', async (_event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return { success: true };
      }
      return { success: false, error: 'File does not exist' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('system:open-file', async (_event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        await shell.openPath(filePath);
        return { success: true };
      }
      return { success: false, error: 'File does not exist' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('system:get-media-url', async (_event, filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        return `media://stream?file=${encodeURIComponent(filePath)}`;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('system:export-notes', async (_event, { title, content, format }) => {
    try {
      const extensions = {
        markdown: ['md', 'markdown'],
        txt: ['txt'],
        html: ['html', 'htm']
      };

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Study Notes',
        defaultPath: path.join(app.getPath('documents'), `${title || 'Notes'}.${extensions[format] ? extensions[format][0] : 'txt'}`),
        filters: [
          { name: format.toUpperCase(), extensions: extensions[format] || ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, content, 'utf-8');
        return { success: true, filePath: result.filePath };
      }
      return { success: false, canceled: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Window Actions
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });
}
