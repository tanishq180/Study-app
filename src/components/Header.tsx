import React from 'react';
import {
  BookOpen,
  Play,
  Sparkles,
  Download,
  CheckSquare,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Minus,
  Square,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PomodoroTimer } from './PomodoroTimer';
import { SpotifyIcon } from './SpotifySection';

export const Header: React.FC = () => {
  const { state, saveStatus, setActiveTab } = useApp();

  const activeDownloadsCount = state.downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
  ).length;

  const pendingTodosCount = state.todos.filter((t) => !t.completed).length;

  const handleMinimize = () => {
    if (window.api) window.api.minimizeWindow();
  };

  const handleMaximize = () => {
    if (window.api) window.api.maximizeWindow();
  };

  const handleClose = () => {
    if (window.api) window.api.closeWindow();
  };

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-50">
      {/* Brand & Vibrant Logo */}
      <div className="flex items-center gap-3">
        <div className="relative group cursor-pointer">
          {/* Pulsing neon aura glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 via-indigo-500 to-cyan-400 rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>

          {/* Vibrant outer gradient border */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-purple-500/30 flex items-center justify-center">
            {/* Inner dark container with subtle glass shine */}
            <div className="w-full h-full bg-gray-950/75 backdrop-blur-md rounded-[10px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/40 pointer-events-none"></div>

              {/* Central glowing icon */}
              <BookOpen className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-10" />

              {/* Video Play Badge Accent */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-pink-500 flex items-center justify-center shadow-md border-[1.5px] border-gray-950 z-20">
                <Play className="w-1.5 h-1.5 text-white fill-current translate-x-[0.5px]" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-pink-200 bg-clip-text text-transparent flex items-center gap-2">
            StudyHub
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/25 to-pink-500/25 text-indigo-300 border border-indigo-400/40 shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-pink-400 animate-pulse" />
              DESKTOP
            </span>
          </h1>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center p-1 rounded-xl bg-gray-900 border border-gray-800">
        <button
          onClick={() => setActiveTab('split')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            state.settings.activeTab === 'split'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Study Split View</span>
        </button>

        <button
          onClick={() => setActiveTab('downloader')}
          className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            state.settings.activeTab === 'downloader'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Downloader</span>
          {activeDownloadsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            state.settings.activeTab === 'spotify'
              ? 'bg-[#1DB954] text-black font-semibold shadow-sm shadow-[#1DB954]/25'
              : 'text-gray-400 hover:text-[#1DB954] hover:bg-gray-800/60'
          }`}
        >
          <SpotifyIcon className="w-3.5 h-3.5" />
          <span>Spotify</span>
        </button>

        <button
          onClick={() => setActiveTab('todos')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            state.settings.activeTab === 'todos'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks</span>
          {pendingTodosCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 font-mono">
              {pendingTodosCount}
            </span>
          )}
        </button>
      </nav>

      {/* Status & Window Controls */}
      <div className="flex items-center gap-3">
        {/* Built-in Study Pomodoro Timer */}
        <PomodoroTimer />

        {/* Persistence Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-900/60 px-2.5 py-1 rounded-full border border-gray-800/80">
          {saveStatus === 'saving' && (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-gray-300 text-[11px]">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-gray-400 text-[11px]">Auto-saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-300 text-[11px]">Save error</span>
            </>
          )}
        </div>

        {/* Window controls */}
        {window.api && (
          <div className="flex items-center border-l border-gray-800 pl-2 gap-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

