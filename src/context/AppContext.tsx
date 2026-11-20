import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type {
  AppState,
  TodoItem,
  DownloadItem,
  DownloadProgressPayload,
  NoteDocument
} from '../types/app';
import { extractYouTubeId, formatTime } from '../utils/youtube';
import { parseSpotifyUriOrUrl } from '../utils/spotify';

interface AppContextType {
  state: AppState;
  saveStatus: 'saved' | 'saving' | 'error';
  // Video actions
  setVideoUrl: (url: string) => void;
  playLocalVideo: (filePath: string, title?: string) => void;
  updateVideoTime: (time: number) => void;
  seekTargetTime: number | null;
  seekTo: (seconds: number) => void;
  clearSeekTarget: () => void;
  setMediaSourceType: (type: 'youtube' | 'local' | 'spotify') => void;
  // Spotify actions
  setSpotifyUri: (uriOrUrl: string, title?: string) => void;
  // Notes actions
  updateNotes: (content: string, title?: string) => void;
  createNewNote: (title?: string) => void;
  switchNote: (noteId: string) => void;
  deleteNote: (noteId: string) => void;
  insertTimestampToNotes: () => void;
  // Todo actions
  addTodo: (text: string, priority?: TodoItem['priority'], category?: string, dueDate?: string) => void;
  toggleTodo: (id: string) => void;
  editTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  clearCompletedTodos: () => void;
  // Settings & Navigation
  setActiveTab: (tab: AppState['settings']['activeTab']) => void;
  setSplitRatio: (ratio: number) => void;
  setDownloadFolder: (folder: string) => void;
  // Downloads
  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearFinishedDownloads: () => void;
}

const INITIAL_DOC_ID = 'note-1';
const INITIAL_CONTENT = `<h2>Session Focus: Key Principles & Core Ideas</h2><p>Welcome to your dual-pane study environment. Document your notes here while streaming lectures or tutorials.</p><blockquote><p>💡 <strong>Pro Tip:</strong> Click the <strong>Insert Timestamp</strong> button (or press <kbd>Ctrl+Shift+T</kbd>) to bookmark specific moments in the video. Clicking any timestamp pill inside the notes will immediately seek the video to that exact second!</p></blockquote><ul><li>Point 1: Active recall outperforms passive review.</li><li>Point 2: Spaced repetition locks concepts in long-term memory.</li><li>Point 3: Take timestamped notes during dense conceptual segments.</li></ul>`;

const DEFAULT_INITIAL_STATE: AppState = {
  video: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study to',
    currentTime: 0,
    recentVideos: [
      {
        videoId: 'jfKfPfyJRdk',
        url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        title: 'lofi hip hop radio 📚 - beats to relax/study to',
        timestamp: Date.now()
      }
    ]
  },
  notes: {
    title: 'Study Session Notes',
    content: INITIAL_CONTENT,
    lastSaved: new Date().toISOString(),
    activeNoteId: INITIAL_DOC_ID,
    documents: [
      {
        id: INITIAL_DOC_ID,
        title: 'Study Session Notes',
        content: INITIAL_CONTENT,
        updatedAt: new Date().toISOString()
      }
    ]
  },
  todos: [
    {
      id: 'todo-1',
      text: 'Watch Chapter 4 biology lecture & record notes',
      completed: false,
      priority: 'high',
      category: 'Study',
      dueDate: 'Today',
      createdAt: new Date().toISOString()
    },
    {
      id: 'todo-2',
      text: 'Download tutorial video for offline review',
      completed: false,
      priority: 'medium',
      category: 'Downloader',
      dueDate: 'Tomorrow',
      createdAt: new Date().toISOString()
    },
    {
      id: 'todo-3',
      text: 'Review flashcards and summary questions',
      completed: true,
      priority: 'low',
      category: 'Review',
      dueDate: 'Done',
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    downloadFolder: '',
    splitRatio: 52,
    activeTab: 'split'
  },
  spotify: {
    currentUri: 'playlist/37i9dQZF1DWZeKCadgRdKQ',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0',
    title: 'Deep Focus',
    recentItems: [
      {
        title: 'Deep Focus',
        uri: 'playlist/37i9dQZF1DWZeKCadgRdKQ',
        type: 'playlist',
        category: 'Focus'
      },
      {
        title: 'Lofi Beats',
        uri: 'playlist/37i9dQZF1DXdLEN7aqioXM',
        type: 'playlist',
        category: 'Chill'
      },
      {
        title: 'Peaceful Piano',
        uri: 'playlist/37i9dQZF1DX4sWSpwq3LiO',
        type: 'playlist',
        category: 'Instrumental'
      }
    ]
  },
  downloads: []
};

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'study_hub_state';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(DEFAULT_INITIAL_STATE);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isLoaded, setIsLoaded] = useState(false);
  const [seekTargetTime, setSeekTargetTime] = useState<number | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;

  // 1. Initial State Restoration
  useEffect(() => {
    async function init() {
      try {
        let loaded: AppState | null = null;
        if (window.api && typeof window.api.loadState === 'function') {
          loaded = await window.api.loadState();
        } else {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) {
            loaded = JSON.parse(local);
          }
        }

        if (loaded && loaded.video) {
          // Normalize multi-document notes if coming from older state format
          let docs = loaded.notes?.documents;
          let activeId = loaded.notes?.activeNoteId || INITIAL_DOC_ID;

          if (!Array.isArray(docs) || docs.length === 0) {
            docs = [
              {
                id: activeId,
                title: loaded.notes?.title || 'Study Session Notes',
                content: loaded.notes?.content || INITIAL_CONTENT,
                updatedAt: new Date().toISOString()
              }
            ];
          }

          const currentDoc = docs.find((d) => d.id === activeId) || docs[0];

          setState({
            ...loaded,
            downloads: [],
            spotify: loaded.spotify && loaded.spotify.currentUri ? loaded.spotify : DEFAULT_INITIAL_STATE.spotify,
            notes: {
              ...loaded.notes,
              activeNoteId: currentDoc.id,
              title: currentDoc.title,
              content: currentDoc.content,
              documents: docs
            }
          });
        }
      } catch (err) {
        console.error('Failed to restore previous session state:', err);
      } finally {
        setIsLoaded(true);
      }
    }
    init();
  }, []);

  // 2. Setup download event listeners from backend
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (window.api && typeof window.api.onDownloadProgress === 'function') {
      const unsub = window.api.onDownloadProgress((payload: DownloadProgressPayload) => {
        setState((prev) => ({
          ...prev,
          downloads: prev.downloads.map((item) => {
            if (item.id === payload.id) {
              const isFinished = payload.percent >= 100;
              return {
                ...item,
                progress: payload.percent,
                speed: payload.speed,
                eta: payload.eta,
                size: payload.size,
                status: isFinished && item.filePath ? 'completed' : 'downloading'
              };
            }
            return item;
          })
        }));
      });
      unsubs.push(unsub);
    }

    if (window.api && typeof window.api.onDownloadComplete === 'function') {
      const unsub = window.api.onDownloadComplete((payload: { id: string; filePath: string }) => {
        setState((prev) => ({
          ...prev,
          downloads: prev.downloads.map((item) => {
            if (item.id === payload.id) {
              return {
                ...item,
                progress: 100,
                status: 'completed',
                filePath: payload.filePath,
                speed: 'Finished',
                eta: 'Complete'
              };
            }
            return item;
          })
        }));
      });
      unsubs.push(unsub);
    }

    if (window.api && typeof window.api.onDownloadError === 'function') {
      const unsub = window.api.onDownloadError((payload: { id: string; error: string }) => {
        setState((prev) => ({
          ...prev,
          downloads: prev.downloads.map((item) => {
            if (item.id === payload.id) {
              return {
                ...item,
                status: 'failed',
                error: payload.error || 'Download encountered an error'
              };
            }
            return item;
          })
        }));
      });
      unsubs.push(unsub);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // 3. Auto-Save with Debounce & Auto-Resume Persistence
  const triggerSave = useCallback((currentState: AppState) => {
    if (!isLoaded) return;
    setSaveStatus('saving');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        const payloadToSave: AppState = {
          ...currentState,
          downloads: []
        };
        if (window.api && typeof window.api.saveState === 'function') {
          const res = await window.api.saveState(payloadToSave);
          if (res.success) {
            setSaveStatus('saved');
          } else {
            setSaveStatus('error');
          }
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadToSave));
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('error');
      }
    }, 700);
  }, [isLoaded]);

  // Synchronous flush on window unload
  useEffect(() => {
    const handleUnload = () => {
      const payloadToSave: AppState = {
        ...stateRef.current,
        downloads: []
      };
      if (window.api && typeof window.api.saveState === 'function') {
        window.api.saveState(payloadToSave);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadToSave));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Auto-save whenever state changes after initial load
  useEffect(() => {
    if (isLoaded) {
      triggerSave(state);
    }
  }, [state, isLoaded, triggerSave]);

  // Actions
  const setVideoUrl = useCallback((url: string) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return;

    setState((prev) => {
      const exists = prev.video.recentVideos.some((v) => v.videoId === videoId);
      const newRecent = exists
        ? prev.video.recentVideos
        : [
            {
              videoId,
              url,
              title: `Video (${videoId})`,
              timestamp: Date.now()
            },
            ...prev.video.recentVideos.slice(0, 9)
          ];

      return {
        ...prev,
        video: {
          ...prev.video,
          url,
          videoId,
          sourceType: 'youtube',
          currentTime: 0,
          recentVideos: newRecent
        }
      };
    });
  }, []);

  const playLocalVideo = useCallback((filePath: string, title?: string) => {
    const fileTitle = title || filePath.split(/[\\\/]/).pop() || 'Downloaded Media';
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeTab: 'split'
      },
      video: {
        ...prev.video,
        sourceType: 'local',
        localFilePath: filePath,
        title: fileTitle,
        currentTime: 0
      }
    }));
  }, []);

  const setMediaSourceType = useCallback((type: 'youtube' | 'local' | 'spotify') => {
    setState((prev) => ({
      ...prev,
      video: {
        ...prev.video,
        sourceType: type
      }
    }));
  }, []);

  const setSpotifyUri = useCallback((uriOrUrl: string, title?: string) => {
    const parsed = parseSpotifyUriOrUrl(uriOrUrl);
    if (!parsed) return;

    setState((prev) => {
      const itemTitle = title || prev.spotify.title || 'Spotify Player';
      const exists = prev.spotify.recentItems.some((r) => r.uri === parsed.uri);
      const updatedRecents = exists
        ? prev.spotify.recentItems
        : [
            {
              title: itemTitle,
              uri: parsed.uri,
              type: parsed.type
            },
            ...prev.spotify.recentItems.slice(0, 9)
          ];

      return {
        ...prev,
        spotify: {
          ...prev.spotify,
          currentUri: parsed.uri,
          embedUrl: parsed.embedUrl,
          title: itemTitle,
          recentItems: updatedRecents
        },
        video: {
          ...prev.video,
          spotifyUri: parsed.uri
        }
      };
    });
  }, []);

  const updateVideoTime = useCallback((time: number) => {
    setState((prev) => ({
      ...prev,
      video: {
        ...prev.video,
        currentTime: time
      }
    }));
  }, []);

  const seekTo = useCallback((seconds: number) => {
    setSeekTargetTime(seconds);
  }, []);

  const clearSeekTarget = useCallback(() => {
    setSeekTargetTime(null);
  }, []);

  const updateNotes = useCallback((content: string, title?: string) => {
    setState((prev) => {
      const activeId = prev.notes.activeNoteId || INITIAL_DOC_ID;
      const effectiveTitle = title !== undefined ? title : prev.notes.title;
      const now = new Date().toISOString();

      const existingDocs = prev.notes.documents || [];
      const updatedDocs = existingDocs.map((doc) =>
        doc.id === activeId
          ? { ...doc, title: effectiveTitle, content, updatedAt: now }
          : doc
      );

      return {
        ...prev,
        notes: {
          ...prev.notes,
          content,
          title: effectiveTitle,
          lastSaved: now,
          documents: updatedDocs
        }
      };
    });
  }, []);

  const createNewNote = useCallback((title: string = 'Untitled Note') => {
    const newDoc: NoteDocument = {
      id: `doc-${Date.now()}`,
      title,
      content: '<p></p>',
      updatedAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        activeNoteId: newDoc.id,
        title: newDoc.title,
        content: newDoc.content,
        lastSaved: newDoc.updatedAt,
        documents: [newDoc, ...(prev.notes.documents || [])]
      }
    }));
  }, []);

  const switchNote = useCallback((noteId: string) => {
    setState((prev) => {
      const docs = prev.notes.documents || [];
      const target = docs.find((d) => d.id === noteId);
      if (!target) return prev;

      return {
        ...prev,
        notes: {
          ...prev.notes,
          activeNoteId: target.id,
          title: target.title,
          content: target.content,
          lastSaved: target.updatedAt
        }
      };
    });
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setState((prev) => {
      const docs = prev.notes.documents || [];
      if (docs.length <= 1) return prev; // Keep at least one document

      const filtered = docs.filter((d) => d.id !== noteId);
      const nextActive = filtered[0];

      return {
        ...prev,
        notes: {
          ...prev.notes,
          activeNoteId: nextActive.id,
          title: nextActive.title,
          content: nextActive.content,
          lastSaved: nextActive.updatedAt,
          documents: filtered
        }
      };
    });
  }, []);

  const insertTimestampToNotes = useCallback(() => {
    const sec = Math.floor(stateRef.current.video.currentTime || 0);
    const timeFormatted = formatTime(sec);
    const timestampTag = ` <span class="timestamp-tag" data-time="${sec}" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: bold; cursor: pointer; border: 1px solid rgba(99, 102, 241, 0.4);">⏱️ ${timeFormatted}</span> `;

    const newContent = `${stateRef.current.notes.content}<p><strong>${timestampTag}</strong>: </p>`;
    updateNotes(newContent);
  }, [updateNotes]);

  const addTodo = useCallback(
    (text: string, priority: TodoItem['priority'] = 'medium', category: string = 'General', dueDate?: string) => {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text: text.trim(),
        completed: false,
        priority,
        category,
        dueDate,
        createdAt: new Date().toISOString()
      };
      setState((prev) => ({
        ...prev,
        todos: [newTodo, ...prev.todos]
      }));
    },
    []
  );

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }));
  }, []);

  const editTodo = useCallback((id: string, updates: Partial<TodoItem>) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    }));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.filter((todo) => todo.id !== id)
    }));
  }, []);

  const clearCompletedTodos = useCallback(() => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.filter((todo) => !todo.completed)
    }));
  }, []);

  const setActiveTab = useCallback((tab: AppState['settings']['activeTab']) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeTab: tab
      }
    }));
  }, []);

  const setSplitRatio = useCallback((ratio: number) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        splitRatio: Math.max(25, Math.min(75, ratio))
      }
    }));
  }, []);

  const setDownloadFolder = useCallback((folder: string) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        downloadFolder: folder
      }
    }));
  }, []);

  const addDownload = useCallback((item: DownloadItem) => {
    setState((prev) => ({
      ...prev,
      downloads: [item, ...prev.downloads.filter((d) => d.id !== item.id)]
    }));
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<DownloadItem>) => {
    setState((prev) => ({
      ...prev,
      downloads: prev.downloads.map((d) => (d.id === id ? { ...d, ...updates } : d))
    }));
  }, []);

  const removeDownload = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      downloads: prev.downloads.filter((d) => d.id !== id)
    }));
  }, []);

  const clearFinishedDownloads = useCallback(() => {
    setState((prev) => ({
      ...prev,
      downloads: prev.downloads.filter(
        (d) => d.status === 'downloading' || d.status === 'queued'
      )
    }));
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + 1: Split View, Ctrl + 2: Downloader, Ctrl + 3: Tasks
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('split');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('downloader');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('todos');
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          triggerSave(stateRef.current);
        }
      }

      // Ctrl + Shift + T: Insert timestamp
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        insertTimestampToNotes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, triggerSave, insertTimestampToNotes]);

  return (
    <AppContext.Provider
      value={{
        state,
        saveStatus,
        setVideoUrl,
        playLocalVideo,
        updateVideoTime,
        seekTargetTime,
        seekTo,
        clearSeekTarget,
        setMediaSourceType,
        setSpotifyUri,
        updateNotes,
        createNewNote,
        switchNote,
        deleteNote,
        insertTimestampToNotes,
        addTodo,
        toggleTodo,
        editTodo,
        deleteTodo,
        clearCompletedTodos,
        setActiveTab,
        setSplitRatio,
        setDownloadFolder,
        addDownload,
        updateDownload,
        removeDownload,
        clearFinishedDownloads
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
