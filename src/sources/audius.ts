/**
 * Audius: open music API with full-length streams served with
 * `Access-Control-Allow-Origin: *`, so the audio can be analysed in-browser
 * (unlike Spotify/Apple Music, whose playback is DRM-protected).
 */
const APP_NAME = 'music-visualizer-portfolio';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  streamUrl: string;
}

interface AudiusTrack {
  id: string;
  title: string;
  user?: { name?: string };
  artwork?: Record<string, string>;
}

let hostPromise: Promise<string> | undefined;

function host(): Promise<string> {
  hostPromise ??= fetch('https://api.audius.co')
    .then((r) => r.json() as Promise<{ data: string[] }>)
    .then(({ data }) => data[Math.floor(Math.random() * data.length)]);
  return hostPromise;
}

export async function searchTracks(query: string): Promise<Track[]> {
  const h = await host();
  const res = await fetch(`${h}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP_NAME}`);
  if (!res.ok) throw new Error(`Audius search failed (${res.status})`);
  const { data } = (await res.json()) as { data: AudiusTrack[] };
  return data.slice(0, 10).map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.user?.name ?? 'Unknown artist',
    artworkUrl: t.artwork?.['480x480'],
    streamUrl: `${h}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
  }));
}
