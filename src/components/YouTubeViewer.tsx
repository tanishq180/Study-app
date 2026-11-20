import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  RotateCw,
  Clock,
  History,
  ExternalLink,
  Search,
  BookmarkPlus,
  FolderOpen,
  Film,
  HardDrive,
  Tv,
  Music,
  Headphones
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { extractYouTubeId, formatTime } from '../utils/youtube';
import { SPOTIFY_STUDY_PRESETS, parseSpotifyUriOrUrl } from '../utils/spotify';
import { SpotifyIcon } from './SpotifySection';

export const YouTubeViewer: React.FC = () => {
  const {
    state,
    setVideoUrl,
    playLocalVideo,
    updateVideoTime,
    seekTargetTime,
    clearSeekTarget,
    updateNotes,
    setMediaSourceType,
    setSpotifyUri
  } = useApp();

  const [inputUrl, setInputUrl] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloadedMenu, setShowDownloadedMenu] = useState(false);
  const [estimatedSeconds, setEstimatedSeconds] = useState(state.video.currentTime || 0);
  const [localMediaUrl, setLocalMediaUrl] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSpotify = state.video.sourceType === 'spotify';
  const isLocal = state.video.sourceType === 'local' && Boolean(state.video.localFilePath);
  const isYouTube = !isSpotify && !isLocal;

  // Completed downloaded media items
  const completedDownloads = state.downloads.filter(
    (d) => d.status === 'completed' && Boolean(d.filePath)
  );

  // Sync inputUrl when state.video.url changes
  useEffect(() => {
    if (state.video.url && isYouTube) {
      setInputUrl(state.video.url);
    }
  }, [state.video.url, isYouTube]);

  // Resolve custom protocol media stream URL when local file changes
  useEffect(() => {
    async function resolveMedia() {
      if (isLocal && state.video.localFilePath) {
        if (window.api && typeof window.api.getLocalMediaUrl === 'function') {
          const streamUrl = await window.api.getLocalMediaUrl(state.video.localFilePath);
          setLocalMediaUrl(streamUrl || '');
        } else {
          setLocalMediaUrl(state.video.localFilePath);
        }
      }
    }
    resolveMedia();
  }, [isLocal, state.video.localFilePath]);

  // Handle external seek requests from notes timestamps
  useEffect(() => {
    if (seekTargetTime !== null) {
      if (isLocal && videoElementRef.current) {
        videoElementRef.current.currentTime = seekTargetTime;
      } else if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [seekTargetTime, true]
          }),
          '*'
        );
      }
      setEstimatedSeconds(seekTargetTime);
      updateVideoTime(seekTargetTime);
      clearSeekTarget();
    }
  }, [seekTargetTime, isLocal, clearSeekTarget, updateVideoTime]);

  // Timer simulation for YouTube iframe tracking
  useEffect(() => {
    if (isPlaying && !isLocal && !isSpotify) {
      timerIntervalRef.current = setInterval(() => {
        setEstimatedSeconds((prev) => {
          const next = prev + playbackSpeed;
          updateVideoTime(Math.floor(next));
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPlaying, isLocal, isSpotify, playbackSpeed, updateVideoTime]);

  // Listen to messages from YouTube iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          if (data.info === 1) setIsPlaying(true);
          else if (data.info === 2 || data.info === 0) setIsPlaying(false);
        }
      } catch {
        // Not a JSON message from iframe
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLoadVideo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = extractYouTubeId(inputUrl);
    if (id) {
      setVideoUrl(inputUrl);
      setEstimatedSeconds(0);
      setIsPlaying(true);
    }
  };

  const handleLoadSpotify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!spotifyInput.trim()) return;
    const parsed = parseSpotifyUriOrUrl(spotifyInput);
    if (parsed) {
      setSpotifyUri(spotifyInput, `Spotify ${parsed.type.toUpperCase()}`);
      setSpotifyInput('');
    }
  };

  const handleOpenLocalFileDialog = async () => {
    if (window.api && typeof window.api.selectLocalVideo === 'function') {
      const selected = await window.api.selectLocalVideo();
      if (selected) {
        const title = selected.split(/[\/\\]/).pop() || 'Local Video';
        playLocalVideo(selected, title);
        setShowDownloadedMenu(false);
      }
    }
  };

  const handleControlCommand = (func: string, args: unknown[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args
        }),
        '*'
      );
    }
  };

  const togglePlay = () => {
    if (isLocal && videoElementRef.current) {
      if (videoElementRef.current.paused) {
        videoElementRef.current.play();
        setIsPlaying(true);
      } else {
        videoElementRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      if (isPlaying) {
        handleControlCommand('pauseVideo');
        setIsPlaying(false);
      } else {
        handleControlCommand('playVideo');
        setIsPlaying(true);
      }
    }
  };

  const seekRelative = (offsetSec: number) => {
    if (isLocal && videoElementRef.current) {
      const target = Math.max(0, videoElementRef.current.currentTime + offsetSec);
      videoElementRef.current.currentTime = target;
      setEstimatedSeconds(target);
      updateVideoTime(Math.floor(target));
    } else {
      const target = Math.max(0, Math.floor(estimatedSeconds + offsetSec));
      handleControlCommand('seekTo', [target, true]);
      setEstimatedSeconds(target);
      updateVideoTime(target);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isLocal && videoElementRef.current) {
      videoElementRef.current.playbackRate = speed;
    } else {
      handleControlCommand('setPlaybackRate', [speed]);
    }
  };

  const insertTimestampToNotes = () => {
    const timeFormatted = formatTime(Math.floor(estimatedSeconds));
    const timestampTag = ` <span class="timestamp-tag" data-time="${Math.floor(
      estimatedSeconds
    )}" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: bold; cursor: pointer; border: 1px solid rgba(99, 102, 241, 0.4);">⏱️ ${timeFormatted}</span> `;

    const newContent = `${state.notes.content}<p><strong>${timestampTag}</strong>: </p>`;
    updateNotes(newContent);
  };

  const insertSpotifyToNotes = () => {
    const title = state.spotify.title || 'Study Playlist';
    const link = `https://open.spotify.com/${state.spotify.currentUri}`;
    const newContent = `${state.notes.content}<p>🎧 <strong>Listening to: </strong><a href="${link}" target="_blank" rel="noreferrer" style="color: #1DB954; font-weight: bold; text-decoration: underline;">${title}</a></p>`;
    updateNotes(newContent);
  };

  const currentId = state.video.videoId || 'jfKfPfyJRdk';
  const spotifyEmbedSrc =
    state.spotify.embedUrl ||
    'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0';

  return (
    <div className="h-full flex flex-col bg-gray-950 border-r border-gray-800/80 overflow-hidden">
      {/* Top Source Switcher Tabs & Input Bar */}
      <div className="p-2.5 border-b border-gray-800/80 bg-gray-900/60 flex flex-col gap-2">
        {/* Source Switcher Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800/80">
            <button
              onClick={() => setMediaSourceType('youtube')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                isYouTube
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </button>

            <button
              onClick={() => setMediaSourceType('spotify')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                isSpotify
                  ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <SpotifyIcon className="w-3.5 h-3.5" />
              <span>Spotify</span>
            </button>

            <button
              onClick={() => setMediaSourceType('local')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                isLocal
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Offline Video</span>
            </button>
          </div>

          {/* Right Action based on mode */}
          {isYouTube && (
            <div className="flex items-center gap-1.5">
              {/* Downloaded Offline Media Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDownloadedMenu(!showDownloadedMenu)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                    showDownloadedMenu
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-gray-850 border-gray-800 text-gray-300 hover:bg-gray-800'
                  }`}
                  title="View Downloaded Offline Videos"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Downloads</span>
                  {completedDownloads.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Downloaded Videos Menu Dropdown */}
                {showDownloadedMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Downloaded Files ({completedDownloads.length})</span>
                      <button
                        onClick={handleOpenLocalFileDialog}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 capitalize font-normal"
                      >
                        <FolderOpen className="w-3 h-3" />
                        Browse PC...
                      </button>
                    </div>

                    {completedDownloads.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-500">
                        No downloaded media found yet.<br />
                        <button
                          onClick={handleOpenLocalFileDialog}
                          className="mt-2 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                        >
                          Browse file on your PC
                        </button>
                      </div>
                    ) : (
                      completedDownloads.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.filePath) {
                              playLocalVideo(item.filePath, item.title);
                              setShowDownloadedMenu(false);
                            }
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg text-left hover:bg-gray-800 transition group"
                        >
                          <div className="w-10 h-7 rounded bg-black flex-shrink-0 overflow-hidden border border-gray-850">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <Film className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-gray-200 truncate group-hover:text-emerald-300">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase font-mono">
                              {item.formatType} &bull; {item.quality}
                            </span>
                          </div>
                          <Play className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* History Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                title="Recent Video History"
                className={`p-1.5 rounded-lg border text-xs transition ${
                  showHistory
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-gray-850 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          )}

          {isSpotify && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="text-[11px] bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                Spotify Connected
              </span>
            </div>
          )}

          {isLocal && (
            <button
              onClick={handleOpenLocalFileDialog}
              className="px-2.5 py-1 bg-gray-850 hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-750 transition flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Browse PC...</span>
            </button>
          )}
        </div>

        {/* Input Bar Specific to Active Mode */}
        {isYouTube && (
          <form onSubmit={handleLoadVideo} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste YouTube Video URL or ID (e.g. https://www.youtube.com/watch?v=...)"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load
            </button>
          </form>
        )}

        {isSpotify && (
          <div className="flex flex-col gap-2">
            <form onSubmit={handleLoadSpotify} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={spotifyInput}
                  onChange={(e) => setSpotifyInput(e.target.value)}
                  placeholder="Paste Spotify Link or URI (e.g. playlist/37i9dQZF1DWZeKCadgRdKQ)"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition"
                />
              </div>

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Load
              </button>
            </form>

            {/* Spotify Quick Study Presets Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              <span className="text-[10px] uppercase font-bold text-gray-500 whitespace-nowrap mr-0.5 flex items-center gap-1">
                <Headphones className="w-3 h-3 text-[#1DB954]" /> Focus:
              </span>
              {SPOTIFY_STUDY_PRESETS.slice(0, 5).map((preset) => {
                const isActive = state.spotify.currentUri === preset.uri;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSpotifyUri(preset.uri, preset.title)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#1DB954] text-black font-semibold'
                        : 'bg-gray-950 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-800'
                    }`}
                  >
                    <span>{preset.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLocal && (
          <div className="flex items-center justify-between gap-2 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Film className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-gray-200 truncate" title={state.video.title}>
                  {state.video.title || 'Offline Video Player'}
                </span>
                <span className="text-[10px] text-gray-500 truncate" title={state.video.localFilePath}>
                  {state.video.localFilePath || 'No file selected. Click Browse PC to open an MP4 or MKV.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* History Dropdown / Drawer for YouTube */}
        {showHistory && isYouTube && state.video.recentVideos.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 flex flex-col gap-1 max-h-40 overflow-y-auto shadow-xl z-20">
            <div className="text-[10px] uppercase font-semibold text-gray-400 px-2 py-0.5">
              Recently Studied Videos
            </div>
            {state.video.recentVideos.map((rec) => (
              <button
                key={rec.videoId}
                onClick={() => {
                  setVideoUrl(rec.url);
                  setInputUrl(rec.url);
                  setShowHistory(false);
                }}
                className={`text-left text-xs px-2.5 py-1.5 rounded flex items-center justify-between transition ${
                  rec.videoId === currentId
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                }`}
              >
                <span className="truncate flex-1 pr-2">{rec.title || rec.url}</span>
                <span className="text-[10px] text-gray-500 font-mono">{rec.videoId}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Viewport */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        {isSpotify ? (
          /* Spotify Player Embed */
          <div className="w-full h-full relative bg-gray-950 flex flex-col">
            <iframe
              src={spotifyEmbedSrc}
              title="Spotify Embed Music Player"
              className="w-full h-full border-0 absolute inset-0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        ) : isLocal ? (
          /* Local Video HTML5 Player */
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            {localMediaUrl ? (
              <video
                ref={videoElementRef}
                src={localMediaUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={() => {
                  if (videoElementRef.current) {
                    const sec = videoElementRef.current.currentTime;
                    setEstimatedSeconds(sec);
                    updateVideoTime(Math.floor(sec));
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <HardDrive className="w-12 h-12 text-gray-700 mb-3" />
                <p className="text-sm text-gray-300 font-medium">No offline video selected</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Select a downloaded lesson or browse a video file from your computer to study offline.
                </p>
                <button
                  onClick={handleOpenLocalFileDialog}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse Video File
                </button>
              </div>
            )}
          </div>
        ) : (
          /* YouTube Video Player Iframe */
          <div className="w-full h-full relative">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${currentId}?enablejsapi=1&origin=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
              )}&rel=0`}
              title="YouTube Video Player"
              className="w-full h-full border-0 absolute inset-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Bottom Controls & Notes Bookmark Toolbar */}
      <div className="p-2.5 border-t border-gray-800/80 bg-gray-900/70 flex flex-wrap items-center justify-between gap-2 select-none">
        {isSpotify ? (
          /* Spotify Toolbar */
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-gray-300 truncate flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#1DB954]" />
                {state.spotify.title || 'Study Music'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={insertSpotifyToNotes}
                className="px-3 py-1.5 rounded-md bg-[#1DB954]/15 hover:bg-[#1DB954]/25 border border-[#1DB954]/40 text-[#1DB954] text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                title="Pin this music playlist link into your study notes"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Pin to Notes
              </button>

              <a
                href={`https://open.spotify.com/${state.spotify.currentUri}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-[#1DB954] transition"
                title="Open on Spotify Web"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          /* YouTube & Local Video Toolbar */
          <>
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => seekRelative(-5)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs transition"
                title="Rewind 5 seconds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono">5s</span>
              </button>

              <button
                onClick={togglePlay}
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5"
              >
                <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-current' : ''}`} />
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={() => seekRelative(5)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs transition"
                title="Fast forward 5 seconds"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono">5s</span>
              </button>

              {/* Time Counter */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-950 border border-gray-800 text-xs font-mono text-gray-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formatTime(Math.floor(estimatedSeconds))}</span>
              </div>
            </div>

            {/* Speed Controls */}
            <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 p-0.5 rounded-md">
              {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => changeSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    playbackSpeed === spd
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Timestamp Sync Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={insertTimestampToNotes}
                className="px-3 py-1.5 rounded-md bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                title="Insert timestamp link into notes at current moment"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                Insert Timestamp ({formatTime(Math.floor(estimatedSeconds))})
              </button>

              {isYouTube && (
                <a
                  href={state.video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
