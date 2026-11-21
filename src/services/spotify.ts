import { Capacitor, registerPlugin } from "@capacitor/core";

interface SpotifyNativePlugin {
  connect(): Promise<{ connected: boolean }>;
  play(options: { uri: string }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  status(): Promise<{ connected: boolean }>;
  openApp(): Promise<void>;
  openPlaylist(options: { uri: string }): Promise<void>;
  authorizeLibrary(): Promise<{ authorized: boolean }>;
  library(): Promise<{ items: SpotifyContentItem[] }>;
  browse(
    options?: Partial<SpotifyContentItem>,
  ): Promise<{ items: SpotifyContentItem[] }>;
}

export interface SpotifyContentItem {
  id: string;
  uri: string;
  imageUri: string;
  title: string;
  subtitle: string;
  playable: boolean;
  hasChildren: boolean;
}

const Spotify = registerPlugin<SpotifyNativePlugin>("Spotify");

export const spotifyNativeAvailable = () => Capacitor.isNativePlatform();

export function spotifyPlaylistUri(input: string) {
  const value = input.trim();
  if (/^spotify:playlist:[A-Za-z0-9]+$/.test(value)) return value;
  const match = value.match(
    /^https?:\/\/open\.spotify\.com\/playlist\/([A-Za-z0-9]+)/,
  );
  if (match) return `spotify:playlist:${match[1]}`;
  throw new Error("Paste a Spotify playlist link, not a song or profile link.");
}

const requireNative = () => {
  if (!spotifyNativeAvailable())
    throw new Error(
      "Spotify control is available in the installed Android app. The web preview keeps silent mode active.",
    );
};
export async function connectSpotify() {
  requireNative();
  return Spotify.connect();
}
export async function playSpotifyPlaylist(link: string) {
  requireNative();
  await Spotify.openPlaylist({ uri: spotifyPlaylistUri(link) });
}
export async function pauseSpotify() {
  requireNative();
  await Spotify.pause();
}
export async function resumeSpotify() {
  requireNative();
  await Spotify.resume();
}
export async function spotifyStatus() {
  if (!spotifyNativeAvailable()) return { connected: false };
  return Spotify.status();
}
export async function browseSpotify(item?: SpotifyContentItem) {
  requireNative();
  if (item?.hasChildren) return Spotify.browse(item);
  try {
    return await Spotify.library();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("SPOTIFY_AUTH_REQUIRED")) throw error;
    await Spotify.authorizeLibrary();
    return Spotify.library();
  }
}
export async function openSpotifyApp() {
  requireNative();
  return Spotify.openApp();
}
