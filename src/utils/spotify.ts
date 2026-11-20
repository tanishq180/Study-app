export interface SpotifyParsedResult {
  type: 'playlist' | 'track' | 'album' | 'artist' | 'episode' | 'show';
  id: string;
  uri: string;
  spotifyUri: string;
  embedUrl: string;
  canonicalUrl: string;
}

export interface SpotifyPresetItem {
  id: string;
  title: string;
  description: string;
  category: string;
  uri: string;
  type: 'playlist' | 'track' | 'album';
  gradient: string;
  emoji: string;
}

export const SPOTIFY_STUDY_PRESETS: SpotifyPresetItem[] = [
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    description: 'Calm and ambient electronic study soundscape',
    category: 'Focus',
    uri: 'playlist/37i9dQZF1DWZeKCadgRdKQ',
    type: 'playlist',
    gradient: 'from-blue-600 to-indigo-950',
    emoji: '🧠'
  },
  {
    id: 'lofi-beats',
    title: 'Lofi Beats',
    description: 'Beats to relax, study, and focus to',
    category: 'Chill',
    uri: 'playlist/37i9dQZF1DXdLEN7aqioXM',
    type: 'playlist',
    gradient: 'from-purple-600 to-pink-950',
    emoji: '☕'
  },
  {
    id: 'peaceful-piano',
    title: 'Peaceful Piano',
    description: 'Peaceful acoustic piano for concentration',
    category: 'Piano',
    uri: 'playlist/37i9dQZF1DX4sWSpwq3LiO',
    type: 'playlist',
    gradient: 'from-amber-600 to-stone-950',
    emoji: '🎹'
  },
  {
    id: 'chill-lofi-study',
    title: 'Chill Lofi Study',
    description: 'Mellow instrumental study beats',
    category: 'Lofi',
    uri: 'playlist/37i9dQZF1DX8Uebhn9wzrS',
    type: 'playlist',
    gradient: 'from-rose-600 to-purple-950',
    emoji: '🎧'
  },
  {
    id: 'intense-studying',
    title: 'Intense Studying',
    description: 'Epic soundtracks, classical, and cinematic focus',
    category: 'Cinematic',
    uri: 'playlist/37i9dQZF1DX9sIqqvKsjG8',
    type: 'playlist',
    gradient: 'from-cyan-600 to-blue-950',
    emoji: '⚡'
  },
  {
    id: 'ambient-chill',
    title: 'Ambient Chill',
    description: 'Soothing electronic ambient textures',
    category: 'Ambient',
    uri: 'playlist/37i9dQZF1DX3Ogo9pFvBkY',
    type: 'playlist',
    gradient: 'from-emerald-600 to-teal-950',
    emoji: '🌌'
  },
  {
    id: 'white-noise-rain',
    title: 'White Noise & Rain',
    description: 'Natural masking rain sounds for blocking distractions',
    category: 'Nature',
    uri: 'playlist/37i9dQZF1DX8ymr6UES72F',
    type: 'playlist',
    gradient: 'from-teal-600 to-slate-950',
    emoji: '🌧️'
  },
  {
    id: 'brain-food',
    title: 'Brain Food',
    description: 'Hypnotic electronic focus for study and coding',
    category: 'Electronic',
    uri: 'playlist/37i9dQZF1DWXLeA8Omikj7',
    type: 'playlist',
    gradient: 'from-violet-600 to-indigo-950',
    emoji: '🔋'
  }
];

/**
 * Parses any Spotify URL, URI, or ID format into embeddable components.
 */
export function parseSpotifyUriOrUrl(input: string): SpotifyParsedResult | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Full URL match: open.spotify.com/(intl-xx/)?(playlist|track|album|artist|episode|show)/ID
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?open\.spotify\.com\/(?:intl-[a-zA-Z-]+\/)?(playlist|track|album|artist|episode|show)\/([a-zA-Z0-9]+)/i
  );
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    const type = urlMatch[1].toLowerCase() as SpotifyParsedResult['type'];
    const id = urlMatch[2];
    return {
      type,
      id,
      uri: `${type}/${id}`,
      spotifyUri: `spotify:${type}:${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      canonicalUrl: `https://open.spotify.com/${type}/${id}`
    };
  }

  // 2. Spotify URI match: spotify:(playlist|track|album|artist|episode|show):ID
  const uriMatch = trimmed.match(
    /^spotify:(playlist|track|album|artist|episode|show):([a-zA-Z0-9]+)$/i
  );
  if (uriMatch && uriMatch[1] && uriMatch[2]) {
    const type = uriMatch[1].toLowerCase() as SpotifyParsedResult['type'];
    const id = uriMatch[2];
    return {
      type,
      id,
      uri: `${type}/${id}`,
      spotifyUri: `spotify:${type}:${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      canonicalUrl: `https://open.spotify.com/${type}/${id}`
    };
  }

  // 3. Short format: playlist/ID, track/ID, etc.
  const shortMatch = trimmed.match(
    /^(playlist|track|album|artist|episode|show)\/([a-zA-Z0-9]+)$/i
  );
  if (shortMatch && shortMatch[1] && shortMatch[2]) {
    const type = shortMatch[1].toLowerCase() as SpotifyParsedResult['type'];
    const id = shortMatch[2];
    return {
      type,
      id,
      uri: `${type}/${id}`,
      spotifyUri: `spotify:${type}:${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      canonicalUrl: `https://open.spotify.com/${type}/${id}`
    };
  }

  return null;
}

