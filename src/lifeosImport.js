import { norm, sameRelease, RELEASE_TYPES } from "./music";

/* Brings the Music Reviews out of a LifeOS backup (Settings → Your Data →
   Export Backup). Releases already on BeatShare are matched by artist and
   title, and your ratings are attached to their tracks by track name;
   anything new is added to the shared library. */

export function parseLifeOSBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const data = parsed && parsed.data;
  if (!data || parsed.app !== "LifeOS") throw new Error("That doesn't look like a LifeOS backup file.");
  const read = (k) => {
    const raw = data[k];
    if (raw == null) return [];
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  };
  const albums = read("music-albums").filter((a) => a && (a.title || "").trim());
  if (!albums.length) throw new Error("This backup has no music reviews in it.");
  return { albums, genres: read("music-genres"), exported: parsed.exported };
}

const hasVerdictLife = (a) =>
  a.rating > 0 || (a.notes || "").trim() || (a.tracks || []).some((tr) => !tr.interlude && tr.rating > 0);

/* what would happen, before anything is written */
export function planImport(backup, d) {
  const rows = backup.albums.map((la) => {
    const existing = d.albums.find((a) => sameRelease(a, la));
    const reviewed = existing && d.myReviews[existing.id];
    const action = !existing ? "add" : reviewed ? "skip" : hasVerdictLife(la) ? "review" : "skip";
    return { la, existing, action };
  });
  return {
    rows,
    add: rows.filter((r) => r.action === "add").length,
    review: rows.filter((r) => r.action === "review").length,
    skip: rows.filter((r) => r.action === "skip").length,
  };
}

function reviewFor(la, tracks, userId, albumId) {
  /* LifeOS track → BeatShare track, matched on title */
  const byTitle = {};
  tracks.forEach((tr) => (byTitle[norm(tr.title)] = byTitle[norm(tr.title)] || tr.id));
  const trackRatings = {};
  (la.tracks || []).forEach((lt) => {
    const id = byTitle[norm(lt.title)];
    if (id && !lt.interlude && lt.rating > 0) trackRatings[id] = lt.rating;
  });
  return {
    album_id: albumId,
    user_id: userId,
    rating: la.rating > 0 ? la.rating : 0,
    track_ratings: trackRatings,
    notes: (la.notes || "").slice(0, 5000),
  };
}

export async function runImport(plan, backup, d, onProgress) {
  const lifeGenre = Object.fromEntries((backup.genres || []).map((g) => [g.id, g]));
  const todo = plan.rows.filter((r) => r.action !== "skip");
  const errors = [];
  let done = 0;

  for (const { la, existing, action } of todo) {
    try {
      let album = existing;
      if (action === "add") {
        const genres = (la.genres || [])
          .map((id) => lifeGenre[id])
          .filter(Boolean)
          .map((g) => d.createGenre(g.name))
          .filter(Boolean);
        album = await d.saveAlbum(
          {
            id: crypto.randomUUID(),
            title: la.title.trim(),
            artist: (la.artist || "").trim(),
            type: RELEASE_TYPES.some((r) => r.id === la.type) ? la.type : "album",
            year: String(la.year || "").replace(/\D/g, "").slice(0, 4),
            cover_url: la.cover || "",
            genres,
            tracks: (la.tracks || [])
              .filter((tr) => (tr.title || "").trim())
              .map((tr) => ({ id: crypto.randomUUID(), title: tr.title.trim(), interlude: !!tr.interlude })),
          },
          true
        );
      }
      if (hasVerdictLife(la)) await d.saveReviewNow(reviewFor(la, album.tracks || [], d.userId, album.id));
    } catch (e) {
      errors.push(`${la.title}: ${d.friendly(e)}`);
    }
    done += 1;
    onProgress(done, todo.length);
  }
  return { done, errors };
}
