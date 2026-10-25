/* Links to a release's page somewhere else (streaming service, store, video). */
import {
  siSpotify,
  siApplemusic,
  siBandcamp,
  siYoutubemusic,
  siYoutube,
  siSoundcloud,
  siTidal,
  siDiscogs,
  siLastdotfm,
  siAudiomack,
} from "simple-icons";

/* host → service name and logo (simple-icons, CC0); services without a logo there get a plain link icon */
const SERVICES = [
  [/(^|\.)spotify\.com$/, "Spotify", siSpotify],
  [/(^|\.)music\.apple\.com$/, "Apple Music", siApplemusic],
  [/(^|\.)bandcamp\.com$/, "Bandcamp", siBandcamp],
  [/(^|\.)music\.youtube\.com$/, "YouTube Music", siYoutubemusic],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube", siYoutube],
  [/(^|\.)soundcloud\.com$/, "SoundCloud", siSoundcloud],
  [/(^|\.)tidal\.com$/, "Tidal", siTidal],
  [/(^|\.)discogs\.com$/, "Discogs", siDiscogs],
  [/(^|\.)last\.fm$/, "Last.fm", siLastdotfm],
  [/(^|\.)audiomack\.com$/, "Audiomack", siAudiomack],
  [/(^|\.)deezer\.com$/, "Deezer", null],
  [/(^|\.)music\.amazon\.[a-z.]+$/, "Amazon Music", null],
  [/(^|\.)rateyourmusic\.com$/, "RYM", null],
];

/* "open.spotify.com/album/…" → "https://open.spotify.com/album/…"; "" when it isn't a web link */
export function cleanLink(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if ((u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname.includes(".")) return "";
    return u.href.slice(0, 500);
  } catch {
    return "";
  }
}

export function linkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* { name: "Spotify", icon } — or the site's address and no icon for anything else */
export function linkService(url) {
  const host = linkHost(url);
  const hit = SERVICES.find(([re]) => re.test(host));
  return hit ? { name: hit[1], icon: hit[2] } : { name: host, icon: null };
}

/* in the desktop app, open in the system browser rather than inside BeatShare's window */
export async function openLink(url) {
  if (window.__TAURI_INTERNALS__) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    return openUrl(url);
  }
  window.open(url, "_blank", "noopener");
}
