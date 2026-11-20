import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Search,
  Folder,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  FileAudio,
  Play,
  FolderOpen,
  XCircle,
  RefreshCw,
  Trash2,
  Clock,
  Eye,
  HardDrive,
  BookOpen,
  X,
  Clipboard,
  Tv
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { VideoInfoResult, DownloadItem } from '../types/app';
import { extractYouTubeId } from '../utils/youtube';

const DEFAULT_VIDEO_FORMATS = [
  { label: 'Best Quality (Auto)', value: 'best', ext: 'mp4' },
  { label: '1080p Full HD', value: '1080', ext: 'mp4' },
  { label: '720p HD', value: '720', ext: 'mp4' },
  { label: '480p SD', value: '480', ext: 'mp4' },
  { label: '360p Low', value: '360', ext: 'mp4' }
];

const DEFAULT_AUDIO_FORMATS = [
  { label: 'Audio Only - MP3 (High Quality)', value: 'mp3', ext: 'mp3' },
  { label: 'Audio Only - M4A', value: 'm4a', ext: 'm4a' },
  { label: 'Audio Only - Best Native', value: 'bestaudio', ext: 'm4a' }
];

export const Downloader: React.FC = () => {
  const {
    state,
    setDownloadFolder,
    addDownload,
    updateDownload,
    removeDownload,
    clearFinishedDownloads,
    playLocalVideo
  } = useApp();

  const [url, setUrl] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfoResult | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('best');

  const [isYtDlpReady, setIsYtDlpReady] = useState(true);
  const [isInstallingYtDlp, setIsInstallingYtDlp] = useState(false);

  // In-app video preview modal state
  const [previewModal, setPreviewModal] = useState<{
    filePath: string;
    title: string;
    streamUrl: string;
  } | null>(null);

  // Extract active YouTube video ID from current input
  const activeId = extractYouTubeId(url);

  // Instant display video object: shows formats & download button immediately upon pasting
  const displayVideo: VideoInfoResult | null = activeId
    ? {
        id: activeId,
        title:
          videoInfo && videoInfo.id === activeId
            ? videoInfo.title
            : isFetchingInfo
              ? 'Analyzing YouTube video...'
              : `YouTube Video (${activeId})`,
        channel:
          videoInfo && videoInfo.id === activeId
            ? videoInfo.channel
            : isFetchingInfo
              ? 'Connecting...'
              : 'YouTube',
        thumbnail:
          videoInfo && videoInfo.id === activeId
            ? videoInfo.thumbnail
            : `https://i.ytimg.com/vi/${activeId}/hqdefault.jpg`,
        duration: videoInfo && videoInfo.id === activeId ? videoInfo.duration : 0,
        durationFormatted:
          videoInfo && videoInfo.id === activeId
            ? videoInfo.durationFormatted
            : isFetchingInfo
              ? 'Loading...'
              : '',
        viewCount: videoInfo && videoInfo.id === activeId ? videoInfo.viewCount : 0,
        videoFormats:
          videoInfo && videoInfo.id === activeId && videoInfo.videoFormats?.length
            ? videoInfo.videoFormats
            : DEFAULT_VIDEO_FORMATS,
        audioFormats:
          videoInfo && videoInfo.id === activeId && videoInfo.audioFormats?.length
            ? videoInfo.audioFormats
            : DEFAULT_AUDIO_FORMATS
      }
    : null;

  // Initialize default download path
  useEffect(() => {
    async function checkPath() {
      if (window.api) {
        if (!state.settings.downloadFolder) {
          const defaultPath = await window.api.getDefaultDownloadPath();
          if (defaultPath) {
            setDownloadFolder(defaultPath);
          }
        }
        const readyCheck = await window.api.checkDownloaderReady();
        setIsYtDlpReady(readyCheck.ready);
      }
    }
    checkPath();
  }, [state.settings.downloadFolder, setDownloadFolder]);

  const handleSelectFolder = async () => {
    if (window.api) {
      const selected = await window.api.selectDownloadFolder();
      if (selected) {
        setDownloadFolder(selected);
      }
    }
  };

  const handleInstallYtDlp = async () => {
    if (!window.api) return;
    setIsInstallingYtDlp(true);
    setErrorNotice(null);
    try {
      const res = await window.api.installYtDlp();
      if (res.success) {
        setIsYtDlpReady(true);
      } else {
        setErrorNotice(res.error || 'Failed to auto-install yt-dlp');
      }
    } catch (e: any) {
      setErrorNotice(e.message);
    } finally {
      setIsInstallingYtDlp(false);
    }
  };

  const fetchVideoMetadata = useCallback(async (videoId: string) => {
    setErrorNotice(null);
    setIsFetchingInfo(true);

    if (window.api) {
      try {
        const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const res = await window.api.getVideoInfo(fullUrl);
        if (res.success && res.data) {
          setVideoInfo(res.data);
        } else if (res.error) {
          setErrorNotice(res.error);
        }
      } catch (err: any) {
        console.error('Error fetching video metadata:', err);
      } finally {
        setIsFetchingInfo(false);
      }
    }
  }, []);

  // Automatically fetch video metadata whenever a valid YouTube URL is entered
  useEffect(() => {
    if (!activeId) {
      setVideoInfo(null);
      setErrorNotice(null);
      return;
    }

    if (videoInfo && videoInfo.id === activeId) {
      return;
    }

    const timer = setTimeout(() => {
      fetchVideoMetadata(activeId);
    }, 250);

    return () => clearTimeout(timer);
  }, [activeId, videoInfo, fetchVideoMetadata]);

  const handleFetchInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeId) {
      fetchVideoMetadata(activeId);
    } else {
      setErrorNotice('Please enter a valid YouTube video URL or ID.');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleStartDownload = async () => {
    if (!displayVideo) return;

    const downloadId = `dl-${Date.now()}`;
    const fullUrl = `https://www.youtube.com/watch?v=${displayVideo.id}`;

    const newDownload: DownloadItem = {
      id: downloadId,
      url: fullUrl,
      title: displayVideo.title,
      channel: displayVideo.channel,
      thumbnail: displayVideo.thumbnail,
      formatType,
      quality: selectedQuality,
      status: 'downloading',
      progress: 0,
      speed: 'Initializing...',
      eta: 'Calculating...',
      size: 'Starting...',
      timestamp: Date.now()
    };

    addDownload(newDownload);

    if (window.api) {
      try {
        const res = await window.api.startDownload({
          id: downloadId,
          url: fullUrl,
          formatType,
          quality: selectedQuality,
          outputDir: state.settings.downloadFolder
        });

        if (res.success) {
          if (res.data?.filePath) {
            updateDownload(downloadId, {
              status: 'completed',
              progress: 100,
              filePath: res.data.filePath,
              speed: 'Finished',
              eta: 'Complete'
            });
          }
        } else {
          updateDownload(downloadId, {
            status: 'failed',
            error: res.error || 'Download encountered an error'
          });
        }
      } catch (err: any) {
        updateDownload(downloadId, {
          status: 'failed',
          error: err.message || 'Download process terminated'
        });
      }
    } else {
      // Mock progress simulation for browser view
      let prog = 0;
      const interval = setInterval(() => {
        prog += 20;
        if (prog >= 100) {
          clearInterval(interval);
          updateDownload(downloadId, {
            status: 'completed',
            progress: 100,
            filePath: `C:/Downloads/${displayVideo.title}.${formatType === 'audio' ? 'mp3' : 'mp4'}`
          });
        } else {
          updateDownload(downloadId, {
            progress: prog,
            speed: '3.8 MiB/s',
            eta: '00:12',
            size: '28.4 MiB'
          });
        }
      }, 700);
    }
  };

  const handleCancel = async (id: string) => {
    if (window.api) {
      await window.api.cancelDownload(id);
    }
    updateDownload(id, {
      status: 'cancelled',
      speed: 'Cancelled'
    });
  };

  const handleShowInFolder = (filePath?: string) => {
    if (filePath && window.api) {
      window.api.showInFolder(filePath);
    }
  };

  const handleOpenPreview = async (filePath: string, title: string) => {
    let stream = filePath;
    if (window.api && typeof window.api.getLocalMediaUrl === 'function') {
      const resolved = await window.api.getLocalMediaUrl(filePath);
      if (resolved) stream = resolved;
    }
    setPreviewModal({ filePath, title, streamUrl: stream });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-950 overflow-y-auto p-6 max-w-5xl mx-auto w-full select-text">
      {/* Downloader Header */}
      <div className="mb-6 bg-gradient-to-r from-indigo-950/70 via-gray-900 to-purple-950/40 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              YouTube Media Downloader
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Download lectures, music, and tutorials in Full HD MP4 or high-fidelity MP3/M4A directly to your machine.
            </p>
          </div>

          {/* Destination Folder Selector */}
          <div className="flex items-center gap-2 bg-gray-950/90 border border-gray-800 rounded-xl p-2.5">
            <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                Save Destination
              </span>
              <span className="text-xs text-gray-300 font-mono truncate max-w-[220px]" title={state.settings.downloadFolder}>
                {state.settings.downloadFolder || 'Default Downloads folder'}
              </span>
            </div>
            <button
              onClick={handleSelectFolder}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition whitespace-nowrap"
            >
              Browse
            </button>
          </div>
        </div>

        {/* yt-dlp Diagnostic check warning if missing */}
        {!isYtDlpReady && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>yt-dlp binary is required to process and download media.</span>
            </div>
            <button
              onClick={handleInstallYtDlp}
              disabled={isInstallingYtDlp}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center gap-1.5"
            >
              {isInstallingYtDlp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Installing...
                </>
              ) : (
                'Download yt-dlp binary'
              )}
            </button>
          </div>
        )}
      </div>

      {/* URL Input Form */}
      <div className="mb-6 space-y-2">
        <form
          onSubmit={handleFetchInfo}
          className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 sm:p-4 shadow-md flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted) {
                  setUrl(pasted.trim());
                }
              }}
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-20 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            {/* Quick Paste Button inside input */}
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-medium rounded-md transition flex items-center gap-1 shadow-sm"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3 h-3 text-indigo-400" />
                Paste
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isFetchingInfo || !url.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isFetchingInfo ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing Video...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Fetch Formats
              </>
            )}
          </button>
        </form>

        {/* Quick shortcut if study tab has a video */}
        {state.video?.url && state.video.url !== url && (
          <div className="flex items-center gap-2 px-1 text-xs text-gray-400">
            <span className="text-[11px] text-gray-500">Currently studying:</span>
            <button
              type="button"
              onClick={() => setUrl(state.video.url)}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition"
            >
              <Tv className="w-3 h-3" />
              Use {state.video.title || 'current video'}
            </button>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {errorNotice && (
        <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Video Preview & Format Selection Panel: Shown immediately whenever a valid link is entered */}
      {displayVideo && (
        <div className="mb-8 bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-6">
          {/* Thumbnail preview */}
          <div className="md:w-64 flex-shrink-0 flex flex-col gap-2">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative group shadow-md border border-gray-800">
              <img
                src={displayVideo.thumbnail}
                alt={displayVideo.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${displayVideo.id}/hqdefault.jpg`;
                }}
              />
              {displayVideo.durationFormatted && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-gray-200">
                  {displayVideo.durationFormatted}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                {displayVideo.durationFormatted || 'Video Ready'}
              </span>
              {displayVideo.viewCount > 0 && (
                <span className="flex items-center gap-1 font-mono">
                  <Eye className="w-3 h-3 text-gray-500" />
                  {displayVideo.viewCount.toLocaleString()} views
                </span>
              )}
            </div>
          </div>

          {/* Details & Format Options */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {displayVideo.title}
                </h3>
                {isFetchingInfo && (
                  <span className="flex-shrink-0 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Fetching info
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-400 font-medium mt-1">
                {displayVideo.channel}
              </p>

              {/* Format Type Selection Tabs */}
              <div className="mt-4 flex items-center gap-2 p-1 bg-gray-950 rounded-xl border border-gray-800 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setFormatType('video');
                    setSelectedQuality('best');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    formatType === 'video'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <FileVideo className="w-3.5 h-3.5" />
                  Video (MP4)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormatType('audio');
                    setSelectedQuality('mp3');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    formatType === 'audio'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <FileAudio className="w-3.5 h-3.5" />
                  Audio Only (MP3 / M4A)
                </button>
              </div>

              {/* Quality / Resolution Pills */}
              <div className="mt-3">
                <div className="text-[11px] text-gray-400 font-medium mb-1.5">
                  Select {formatType === 'video' ? 'Resolution' : 'Audio Quality'}:
                </div>
                <div className="flex flex-wrap gap-2">
                  {formatType === 'video'
                    ? displayVideo.videoFormats.map((fmt) => (
                        <button
                          key={fmt.value}
                          type="button"
                          onClick={() => setSelectedQuality(fmt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            selectedQuality === fmt.value
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                              : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))
                    : displayVideo.audioFormats.map((fmt) => (
                        <button
                          key={fmt.value}
                          type="button"
                          onClick={() => setSelectedQuality(fmt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            selectedQuality === fmt.value
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                              : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                </div>
              </div>
            </div>

            {/* Download Action Trigger */}
            <div className="mt-5 pt-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Format: <strong className="text-gray-200 uppercase">{formatType}</strong> ({selectedQuality})
              </span>
              <button
                type="button"
                onClick={handleStartDownload}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Start Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downloads Queue & History */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            Downloads & Local Media ({state.downloads.length})
          </h3>
          {state.downloads.length > 0 && (
            <button
              onClick={clearFinishedDownloads}
              className="text-xs text-gray-400 hover:text-rose-400 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Completed
            </button>
          )}
        </div>

        {state.downloads.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
            <Download className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No active or past downloads</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Paste a YouTube link above to download videos or audio tracks for offline study.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {state.downloads.map((item) => {
              const isDownloading = item.status === 'downloading';
              const isCompleted = item.status === 'completed';
              const isFailed = item.status === 'failed';
              const isCancelled = item.status === 'cancelled';

              return (
                <div
                  key={item.id}
                  className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex flex-col gap-2.5 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-8 rounded bg-black overflow-hidden flex-shrink-0 border border-gray-800">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <FileVideo className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-200 truncate" title={item.title}>
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                            {item.formatType} ({item.quality})
                          </span>
                          {item.channel && (
                            <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                              {item.channel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Status Pill */}
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <>
                          {item.filePath && (
                            <>
                              <button
                                onClick={() => playLocalVideo(item.filePath!, item.title)}
                                className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                title="Study & take notes on this video in Split View"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-white" />
                                Study in App
                              </button>
                              <button
                                onClick={() => handleOpenPreview(item.filePath!, item.title)}
                                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition flex items-center gap-1"
                                title="Watch in App Preview"
                              >
                                <Play className="w-3 h-3 text-emerald-400 fill-current" />
                                Watch
                              </button>
                              <button
                                onClick={() => handleShowInFolder(item.filePath)}
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition flex items-center gap-1"
                                title="Reveal in File Explorer"
                              >
                                <FolderOpen className="w-3 h-3 text-indigo-400" />
                                Show
                              </button>
                            </>
                          )}
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        </>
                      )}

                      {isDownloading && (
                        <>
                          <button
                            onClick={() => handleCancel(item.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Cancel Download"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {item.progress > 0 ? `${item.progress.toFixed(1)}%` : 'Downloading...'}
                          </span>
                        </>
                      )}

                      {isFailed && (
                        <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}

                      {isCancelled && (
                        <span className="text-[11px] font-semibold text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                          Cancelled
                        </span>
                      )}

                      <button
                        onClick={() => removeDownload(item.id)}
                        className="p-1 rounded text-gray-500 hover:text-gray-300 transition"
                        title="Delete from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar and metrics when downloading */}
                  {isDownloading && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${Math.max(3, item.progress)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                        <span>Speed: {item.speed || '...'}</span>
                        <span>Size: {item.size || '...'}</span>
                        <span>ETA: {item.eta || '...'}</span>
                      </div>
                    </div>
                  )}

                  {/* Error display if failed */}
                  {isFailed && item.error && (
                    <div className="text-[11px] text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-900/30 font-mono">
                      {item.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In-App Video Player Modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileVideo className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-white truncate" title={previewModal.title}>
                  {previewModal.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playLocalVideo(previewModal.filePath, previewModal.title);
                    setPreviewModal(null);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Study in Split View
                </button>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                  title="Close Player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="bg-black aspect-video w-full flex items-center justify-center relative">
              <video
                src={previewModal.streamUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-800/80 bg-gray-950/60 flex items-center justify-between text-xs text-gray-400">
              <span className="truncate max-w-[500px]" title={previewModal.filePath}>
                File: {previewModal.filePath}
              </span>
              <button
                onClick={() => handleShowInFolder(previewModal.filePath)}
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Show in File Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
