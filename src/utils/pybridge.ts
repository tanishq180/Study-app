import type { ElectronAPI, DownloadProgressPayload } from '../types/app';

const progressListeners = new Set<(payload: DownloadProgressPayload) => void>();
const completeListeners = new Set<(payload: any) => void>();
const errorListeners = new Set<(payload: any) => void>();

// Global event handlers called from Python backend via window.evaluate_js
(window as any).__onPythonDownloadProgress = (data: any) => {
  progressListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error('[PyBridge] Error in progress listener:', e);
    }
  });
};

(window as any).__onPythonDownloadComplete = (data: any) => {
  completeListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error('[PyBridge] Error in complete listener:', e);
    }
  });
};

(window as any).__onPythonDownloadError = (data: any) => {
  errorListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error('[PyBridge] Error in error listener:', e);
    }
  });
};

async function getPyApi(): Promise<any> {
  if ((window as any).pywebview?.api) {
    return (window as any).pywebview.api;
  }

  return new Promise((resolve) => {
    const onReady = () => {
      resolve((window as any).pywebview?.api);
    };

    window.addEventListener('pywebviewready', onReady, { once: true });

    // Fallback timeout
    setTimeout(() => {
      resolve((window as any).pywebview?.api);
    }, 2000);
  });
}

export function initPythonBridge() {
  const bridge: ElectronAPI = {
    loadState: async () => {
      const py = await getPyApi();
      if (py && py.load_state) return py.load_state();
      if (py && py.loadState) return py.loadState();
      const local = localStorage.getItem('study_hub_state');
      return local ? JSON.parse(local) : null;
    },

    saveState: async (state) => {
      const py = await getPyApi();
      if (py && py.save_state) return py.save_state(state);
      if (py && py.saveState) return py.saveState(state);
      localStorage.setItem('study_hub_state', JSON.stringify(state));
      return { success: true };
    },

    getVideoInfo: async (url) => {
      const py = await getPyApi();
      if (py && py.get_video_info) return py.get_video_info(url);
      if (py && py.getVideoInfo) return py.getVideoInfo(url);
      return { success: false, error: 'Python backend API not available' };
    },

    startDownload: async (options) => {
      const py = await getPyApi();
      if (py && py.start_download) return py.start_download(options);
      if (py && py.startDownload) return py.startDownload(options);
      return { success: false, error: 'Python backend API not available' };
    },

    cancelDownload: async (id) => {
      const py = await getPyApi();
      if (py && py.cancel_download) return py.cancel_download(id);
      if (py && py.cancelDownload) return py.cancelDownload(id);
      return { success: false };
    },

    checkDownloaderReady: async () => {
      const py = await getPyApi();
      if (py && py.check_downloader_ready) return py.check_downloader_ready();
      if (py && py.checkDownloaderReady) return py.checkDownloaderReady();
      return { ready: true };
    },

    installYtDlp: async () => {
      return { success: true };
    },

    onDownloadProgress: (callback) => {
      progressListeners.add(callback);
      return () => {
        progressListeners.delete(callback);
      };
    },

    onDownloadComplete: (callback) => {
      completeListeners.add(callback);
      return () => {
        completeListeners.delete(callback);
      };
    },

    onDownloadError: (callback) => {
      errorListeners.add(callback);
      return () => {
        errorListeners.delete(callback);
      };
    },

    selectDownloadFolder: async () => {
      const py = await getPyApi();
      if (py && py.select_download_folder) return py.select_download_folder();
      if (py && py.selectDownloadFolder) return py.selectDownloadFolder();
      return null;
    },

    selectLocalVideo: async () => {
      const py = await getPyApi();
      if (py && py.select_local_video) return py.select_local_video();
      if (py && py.selectLocalVideo) return py.selectLocalVideo();
      return null;
    },

    getDefaultDownloadPath: async () => {
      const py = await getPyApi();
      if (py && py.get_default_download_path) return py.get_default_download_path();
      if (py && py.getDefaultDownloadPath) return py.getDefaultDownloadPath();
      return '';
    },

    showInFolder: async (filePath) => {
      const py = await getPyApi();
      if (py && py.show_in_folder) return py.show_in_folder(filePath);
      if (py && py.showInFolder) return py.showInFolder(filePath);
      return { success: false };
    },

    openFile: async (filePath) => {
      const py = await getPyApi();
      if (py && py.open_file) return py.open_file(filePath);
      if (py && py.openFile) return py.openFile(filePath);
      return { success: false };
    },

    getLocalMediaUrl: async (filePath) => {
      const py = await getPyApi();
      if (py && py.get_local_media_url) return py.get_local_media_url(filePath);
      if (py && py.getLocalMediaUrl) return py.getLocalMediaUrl(filePath);
      return filePath;
    },

    exportNotes: async (options) => {
      const py = await getPyApi();
      if (py && py.export_notes) return py.export_notes(options);
      if (py && py.exportNotes) return py.exportNotes(options);
      return { success: false, error: 'Export API not ready' };
    },

    minimizeWindow: () => {
      getPyApi().then((py) => {
        if (py && py.minimize_window) py.minimize_window();
        else if (py && py.minimizeWindow) py.minimizeWindow();
      });
    },

    maximizeWindow: () => {
      getPyApi().then((py) => {
        if (py && py.maximize_window) py.maximize_window();
        else if (py && py.maximizeWindow) py.maximizeWindow();
      });
    },

    closeWindow: () => {
      getPyApi().then((py) => {
        if (py && py.close_window) py.close_window();
        else if (py && py.closeWindow) py.closeWindow();
      });
    }
  };

  // Assign to window.api
  window.api = bridge;
}

