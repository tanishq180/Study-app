import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { app } = require('electron');

const DEFAULT_STATE = {
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
    title: 'Biology & Research Notes',
    content: `<h2>Session Focus: Chapter 4 - Cellular Respiration</h2><p>Use this split-pane editor to document key concepts while watching lectures.</p><blockquote><p>Tip: Click the <strong>Insert Timestamp</strong> button to bookmark the current moment in the video. Clicking any timestamp link will jump the YouTube player right to that second!</p></blockquote><ul><li>Glycolysis occurs in the cytoplasm (anaerobic).</li><li>Krebs cycle and Electron Transport Chain occur in mitochondria.</li><li>ATP synthase acts like a molecular rotary motor.</li></ul>`,
    lastSaved: new Date().toISOString()
  },
  todos: [
    {
      id: 'todo-1',
      text: 'Watch and summarize Biology Chapter 4 lecture',
      completed: false,
      priority: 'high',
      category: 'Study',
      dueDate: 'Today'
    },
    {
      id: 'todo-2',
      text: 'Download lecture audio for commute review',
      completed: false,
      priority: 'medium',
      category: 'Downloader',
      dueDate: 'Tomorrow'
    },
    {
      id: 'todo-3',
      text: 'Complete practice quiz flashcards',
      completed: true,
      priority: 'low',
      category: 'Review',
      dueDate: 'Completed'
    }
  ],
  settings: {
    downloadFolder: '',
    splitRatio: 52,
    activeTab: 'split' // 'split' | 'downloader' | 'todos'
  },
  downloads: []
};

function getStateFilePath() {
  let baseDir = '';
  try {
    if (app && typeof app.getPath === 'function') {
      baseDir = app.getPath('userData');
    }
  } catch (_) {}

  if (!baseDir) {
    const fallbackDir = process.env.APPDATA || os.homedir();
    baseDir = path.join(fallbackDir, 'study-hub');
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  return path.join(baseDir, 'study-app-state.json');
}

export function loadAppState() {
  try {
    const filePath = getStateFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Merge defaults to ensure any missing fields are present
      return {
        ...DEFAULT_STATE,
        ...parsed,
        video: { ...DEFAULT_STATE.video, ...(parsed.video || {}) },
        notes: { ...DEFAULT_STATE.notes, ...(parsed.notes || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
        todos: Array.isArray(parsed.todos) ? parsed.todos : DEFAULT_STATE.todos,
        downloads: Array.isArray(parsed.downloads) ? parsed.downloads : []
      };
    }
  } catch (err) {
    console.error('[Store] Failed to read app state, using defaults:', err);
  }
  return { ...DEFAULT_STATE };
}

export function saveAppState(state) {
  try {
    const filePath = getStateFilePath();
    const tempPath = `${filePath}.tmp`;
    const serialized = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, filePath);
    return { success: true };
  } catch (err) {
    console.error('[Store] Failed to save app state:', err);
    return { success: false, error: err.message };
  }
}
