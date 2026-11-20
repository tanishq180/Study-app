import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  BookOpen,
  Music,
  Clock,
  Play,
  Flame,
  Radio,
  Clipboard
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  SPOTIFY_STUDY_PRESETS,
  parseSpotifyUriOrUrl,
  type SpotifyPresetItem
} from '../utils/spotify';

export const SpotifyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.497 17.307c-.216.353-.674.464-1.027.248-2.812-1.718-6.352-2.107-10.523-1.154-.403.092-.806-.157-.898-.56-.092-.403.157-.806.56-.898 4.568-1.044 8.487-.6 11.64 1.337.353.216.464.674.248 1.027zm1.468-3.26c-.272.441-.849.58-1.29.308-3.219-1.979-8.125-2.551-11.933-1.394-.497.151-1.03-.131-1.181-.628-.151-.497.131-1.03.628-1.181 4.354-1.321 9.761-.682 13.468 1.597.441.272.58.849.308 1.297zm.126-3.393c-3.86-2.292-10.228-2.503-13.896-1.39-.59.179-1.218-.16-1.397-.75-.179-.59.16-1.218.75-1.397 4.218-1.281 11.246-1.034 15.688 1.602.531.315.704 1.004.389 1.535-.315.531-1.004.704-1.534.4z" />
  </svg>
);

export const SpotifySection: React.FC = () => {
  const { state, setSpotifyUri, setActiveTab, setMediaSourceType } = useApp();
  const [inputUrl, setInputUrl] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const currentSpotify = state.spotify || {
    currentUri: 'playlist/37i9dQZF1DWZeKCadgRdKQ',
    embedUrl:
      'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0',
    title: 'Deep Focus',
    recentItems: []
  };

  const handleLoadUri = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    const parsed = parseSpotifyUriOrUrl(inputUrl);
    if (!parsed) {
      setInputError('Please enter a valid Spotify URL, URI, or ID (e.g. open.spotify.com/playlist/...)');
      return;
    }

    setInputError(null);
    setSpotifyUri(parsed.uri, `Spotify ${parsed.type}`);
    setInputUrl('');
  };

  const handleSelectPreset = (preset: SpotifyPresetItem) => {
    setSpotifyUri(preset.uri, preset.title);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        const parsed = parseSpotifyUriOrUrl(text);
        if (parsed) {
          setSpotifyUri(parsed.uri, `Spotify ${parsed.type}`);
          setInputUrl('');
          setInputError(null);
        }
      }
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
    }
  };

  const handleStudyWithThisInSplitView = () => {
    setMediaSourceType('spotify');
    setActiveTab('split');
  };

  const canonicalUrl = `https://open.spotify.com/${currentSpotify.currentUri}`;

  return (
    <div className="flex-1 flex flex-col bg-[#08090d] overflow-y-auto p-6 max-w-6xl mx-auto w-full select-text">
      {/* Header Banner */}
      <div className="mb-6 relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-r from-[#0d1f14] via-gray-900 to-[#111c16] p-6 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#1DB954]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1DB954] flex items-center justify-center text-black shadow-lg shadow-[#1DB954]/25 flex-shrink-0">
              <SpotifyIcon className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Spotify Study Hub
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 px-2 py-0.5 rounded-full">
                  Music & Focus
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Stream curated study soundtracks, lofi beats, ambient concentration music, and your personal Spotify playlists while studying.
              </p>
            </div>
          </div>

          {/* Quick Study in Split View Action */}
          <button
            onClick={handleStudyWithThisInSplitView}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-[#1DB954] hover:from-emerald-500 hover:to-[#22c55e] text-black font-semibold text-xs rounded-xl shadow-lg shadow-[#1DB954]/20 transition flex items-center gap-2 whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-black" />
            <span>Study with this in Split View</span>
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleLoadUri} className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Paste any Spotify playlist, album, track, or artist link (e.g. https://open.spotify.com/playlist/...)"
              className="w-full bg-gray-950/90 border border-gray-800 rounded-xl pl-10 pr-24 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-[11px] font-medium transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Clipboard className="w-3 h-3 text-[#1DB954]" />
                Paste
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!inputUrl.trim()}
            className="px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-[#1DB954]/20 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Load Music</span>
          </button>
        </form>

        {inputError && (
          <p className="text-xs text-rose-400 mt-2 px-1 flex items-center gap-1.5">
            <span>⚠️</span> {inputError}
          </p>
        )}
      </div>

      {/* Main Player Embed Card */}
      <div className="mb-8 bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#1DB954] animate-pulse" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Currently Loaded: <span className="text-white normal-case font-semibold">{currentSpotify.title || 'Spotify Player'}</span>
            </h3>
          </div>

          <a
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-[#1DB954] flex items-center gap-1.5 transition font-medium"
            title="Open in Spotify Web or Desktop App"
          >
            <span>Open in Spotify</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Responsive Spotify Iframe Player */}
        <div className="w-full rounded-xl overflow-hidden bg-black shadow-inner border border-gray-800/60">
          <iframe
            title="Spotify Web Player"
            src={currentSpotify.embedUrl}
            width="100%"
            height="380"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full"
          />
        </div>
      </div>

      {/* Curated Study Presets Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Curated Study & Focus Playlists
            </h3>
          </div>
          <span className="text-xs text-gray-400">Click any card to play instantly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SPOTIFY_STUDY_PRESETS.map((preset) => {
            const isPlayingThis = currentSpotify.currentUri === preset.uri;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`relative group rounded-xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                  isPlayingThis
                    ? 'border-[#1DB954] bg-emerald-950/30 shadow-lg shadow-[#1DB954]/10 ring-1 ring-[#1DB954]/50'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-850/80 hover:-translate-y-0.5 shadow-md'
                }`}
              >
                <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl ${preset.gradient} opacity-20 group-hover:opacity-40 rounded-bl-full transition-opacity duration-300 pointer-events-none`}></div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{preset.emoji}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isPlayingThis
                        ? 'bg-[#1DB954] text-black font-extrabold'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {isPlayingThis ? 'Now Playing' : preset.category}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-[#1DB954] transition line-clamp-1">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-400 font-mono">Spotify Playlist</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                    isPlayingThis
                      ? 'bg-[#1DB954] text-black shadow-md'
                      : 'bg-gray-800 text-gray-300 group-hover:bg-[#1DB954] group-hover:text-black'
                  }`}>
                    <Play className="w-3 h-3 fill-current translate-x-[0.5px]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Spotify History */}
      {currentSpotify.recentItems && currentSpotify.recentItems.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800/70 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Recent Spotify Playlists & Tracks
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {currentSpotify.recentItems.map((item, index) => (
              <button
                key={`${item.uri}-${index}`}
                onClick={() => setSpotifyUri(item.uri, item.title)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-2 ${
                  currentSpotify.currentUri === item.uri
                    ? 'bg-[#1DB954]/20 border-[#1DB954]/50 text-[#1DB954]'
                    : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
                }`}
              >
                <Music className="w-3 h-3 text-[#1DB954]" />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

