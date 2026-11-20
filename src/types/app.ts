export interface RecentVideo {
  videoId: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface VideoState {
  url: string;
  videoId: string;
  title: string;
  currentTime: number;
  recentVideos: RecentVideo[];
  sourceType?: 'youtube' | 'local' | 'spotify';
  localFilePath?: string;
  spotifyUri?: string;
}

export interface NoteDocument {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface NotesState {
  title: string;
  content: string;
  lastSaved: string | null;
  activeNoteId?: string;
  documents?: NoteDocument[];
}

export type Priority = 'low' | 'medium' | 'high';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  category: string;
  dueDate?: string;
  createdAt?: string;
  videoId?: string;
  videoTitle?: string;
}

export type ActiveTab = 'split' | 'downloader' | 'spotify' | 'todos';

export interface SpotifyRecentItem {
  title: string;
  uri: string;
  type: string;
  category?: string;
}

export interface SpotifyState {
  currentUri: string;
  embedUrl: string;
  title: string;
  recentItems: SpotifyRecentItem[];
}

export interface SettingsState {
  downloadFolder: string;
  splitRatio: number; // percentage width for left pane (video)
  activeTab: ActiveTab;
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  formatType: 'video' | 'audio';
  quality: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed?: string;
  eta?: string;
  size?: string;
  filePath?: string;
  error?: string;
  timestamp: number;
}

export interface AppState {
  video: VideoState;
  notes: NotesState;
  todos: TodoItem[];
  settings: SettingsState;
  downloads: DownloadItem[];
  spotify: SpotifyState;
}

export interface VideoFormatOption {
  label: string;
  value: string;
  ext: string;
}

export interface VideoInfoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  durationFormatted: string;
  viewCount: number;
  videoFormats: VideoFormatOption[];
  audioFormats: VideoFormatOption[];
}

export interface DownloadProgressPayload {
  id: string;
  percent: number;
  speed: string;
  eta: string;
  size: string;
  status: string;
}

export interface ElectronAPI {
  loadState: () => Promise<AppState>;
  saveState: (state: AppState) => Promise<{ success: boolean; error?: string }>;
  getVideoInfo: (url: string) => Promise<{ success: boolean; data?: VideoInfoResult; error?: string }>;
  startDownload: (options: {
    id: string;
    url: string;
    formatType: 'video' | 'audio';
    quality: string;
    outputDir?: string;
  }) => Promise<{ success: boolean; data?: { id: string; filePath: string; destDir: string }; error?: string }>;
  cancelDownload: (id: string) => Promise<{ success: boolean }>;
  checkDownloaderReady: () => Promise<{ ready: boolean; path?: string; error?: string }>;
  installYtDlp: () => Promise<{ success: boolean; path?: string; error?: string }>;
  onDownloadProgress: (callback: (payload: DownloadProgressPayload) => void) => () => void;
  onDownloadComplete?: (callback: (payload: { id: string; filePath: string }) => void) => () => void;
  onDownloadError?: (callback: (payload: { id: string; error: string }) => void) => () => void;
  selectDownloadFolder: () => Promise<string | null>;
  selectLocalVideo: () => Promise<string | null>;
  getDefaultDownloadPath: () => Promise<string>;
  showInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  getLocalMediaUrl: (filePath: string) => Promise<string | null>;
  exportNotes: (options: { title: string; content: string; format: 'markdown' | 'txt' | 'html' }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

