/* Scoring rules carried over from LifeOS's Music Reviews. The difference
   in BeatShare is that a release is shared and every member keeps their
   own review of it: { rating, track_ratings: { [trackId]: stars }, notes }. */

export const RELEASE_TYPES = [
  { id: "album", label: "Album", short: "Album" },
  { id: "compilation", label: "Compilation", short: "Comp" },
  { id: "ep", label: "EP", short: "EP" },
];
export const releaseType = (id) => RELEASE_TYPES.find((r) => r.id === id) || RELEASE_TYPES[0];
export const typeLabel = (id) => releaseType(id).label;

/* Ratings are stored as stars (0–5 in halves) and shown out of 10, so a
   half star is one point. Up to 2 is a miss, 3 a weak one, 4–8 a solid listen, anything
   above 8 a keeper.
   Fixed hues rather than theme colours so a score reads the same in
   every colour scheme. */
export const SCORE_COLORS = { low: "#ef4444", weak: "#f97316", mid: "#4aba6a", high: "#f0b429" };
export const scoreColor = (v) => {
  const pts = v * 2;
  return pts < 3 ? SCORE_COLORS.low : pts < 4 ? SCORE_COLORS.weak : pts <= 8 ? SCORE_COLORS.mid : SCORE_COLORS.high;
};

/* stars → points out of 10; whole numbers stay whole, averages get a decimal */
export const points = (v) => {
  const x = Math.round(v * 20) / 10;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
};

export const GENRE_COLORS = ["#4aba6a", "#e8913a", "#38bdf8", "#a78bfa", "#f472b6", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#84cc16"];

/* interludes are part of the tracklist but never need a rating */
export const reviewable = (a) => (a.tracks || []).filter((tr) => !tr.interlude);

export const trackRating = (review, trackId) => (review && review.track_ratings && review.track_ratings[trackId]) || 0;
export const ratedTracks = (a, review) => reviewable(a).filter((tr) => trackRating(review, tr.id) > 0);
export const unratedTracks = (a, review) => reviewable(a).filter((tr) => !(trackRating(review, tr.id) > 0));

/* the tracklist's own average — kept apart from the score given to the
   album as a whole, which is allowed to disagree with its parts */
export function trackAvg(a, review) {
  const rated = ratedTracks(a, review);
  if (!rated.length) return 0;
  return rated.reduce((n, tr) => n + trackRating(review, tr.id), 0) / rated.length;
}

export const reviewScore = (a, review) => (!review ? 0 : review.rating > 0 ? Number(review.rating) : trackAvg(a, review));

/* a review counts once it carries any verdict at all */
export const hasVerdict = (a, review) => reviewScore(a, review) > 0 || !!(review && (review.notes || "").trim());

/* the group's score: the mean of every member's score for the release */
export function groupScore(a, reviews) {
  const scores = (reviews || []).map((r) => reviewScore(a, r)).filter((v) => v > 0);
  if (!scores.length) return { avg: 0, count: 0 };
  return { avg: scores.reduce((n, v) => n + v, 0) / scores.length, count: scores.length };
}

export function groupTrackAvg(reviews, trackId) {
  const vals = (reviews || []).map((r) => trackRating(r, trackId)).filter((v) => v > 0);
  return vals.length ? vals.reduce((n, v) => n + v, 0) / vals.length : 0;
}

/* Releases hold genre ids, resolved against the shared genre list when
   shown; an id whose genre was deleted simply drops out. */
export const genresOf = (a, byId) =>
  (a.genres || [])
    .map((id) => byId[id])
    .filter(Boolean)
    .sort((x, y) => x.name.localeCompare(y.name));

export const byName = (a, b) => a.name.localeCompare(b.name);

/* "03. Bohemian Rhapsody" and "3 - Bohemian Rhapsody" both paste clean.
   A bare leading number ("03 Bohemian Rhapsody") only counts as a track
   number in a pasted list — typed on its own it's probably the title,
   like Radiohead's "15 Step". */
export const stripTrackNo = (line, bare = true) =>
  line.replace(bare ? /^\s*\d{1,2}\s*[.)\-–:]?\s+/ : /^\s*\d{1,2}\s*[.)\-–:]\s+/, "").trim();

export const splitTracks = (text) =>
  text
    .split(/\r?\n/)
    .map(stripTrackNo)
    .filter(Boolean);

/* what makes two releases "the same one" — matches the database's unique index */
export const norm = (s) => String(s || "").trim().toLowerCase();
export const sameRelease = (a, b) => norm(a.artist) === norm(b.artist) && norm(a.title) === norm(b.title);

/* loose match for the "already on BeatShare?" hint while typing */
const loose = (s) => norm(s).replace(/[^a-z0-9]+/g, "");
export function similarReleases(albums, title, artist, exceptId) {
  const t = loose(title);
  if (t.length < 2) return [];
  const ar = loose(artist);
  return albums
    .filter((a) => a.id !== exceptId)
    .filter((a) => {
      const at = loose(a.title);
      const titleHit = at === t || (t.length >= 4 && (at.includes(t) || t.includes(at)));
      if (!titleHit) return false;
      return !ar || !loose(a.artist) || loose(a.artist).includes(ar) || ar.includes(loose(a.artist));
    })
    .slice(0, 4);
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const prettyDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
};

export function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return prettyDate(iso);
}

export const nameOf = (p) => (p ? p.display_name || p.username : "Someone");
