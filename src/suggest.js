import { reviewScore, groupScore } from "./music";

/* "For You": releases you haven't reviewed, ranked by how well their genres
   match what you listen to most and rate highest.

   Each genre gets a taste weight from your scored releases:
     - how much you listen to it: log2(1 + releases scored), so a genre you've
       rated 10 times counts more than one you've rated once, without swamping it;
     - how you rate it: your average for the genre, pulled towards your overall
       average when there are only a few (one lucky 10 shouldn't make a favourite).
   Genres you average below 5/10 count against a release. A release scores the
   sum of its genres' weights (evened out so a release tagged with six genres
   doesn't win by count alone), nudged up a little when the group rates it well. */

const PRIOR = 2; // ratings' worth of pull towards your overall average
const MIN_SCORED = 3; // scored releases with genres needed before suggesting anything

export function tasteProfile(d, userId) {
  const scored = [];
  d.reviews.forEach((r) => {
    if (r.user_id !== userId) return;
    const a = d.albumById[r.album_id];
    const v = a ? reviewScore(a, r) : 0;
    if (v > 0 && (a.genres || []).some((g) => d.genreById[g])) scored.push({ a, v });
  });
  const overall = scored.length ? scored.reduce((n, x) => n + x.v, 0) / scored.length : 0;

  const sums = {};
  scored.forEach(({ a, v }) =>
    (a.genres || []).forEach((g) => {
      if (!d.genreById[g]) return;
      const s = (sums[g] = sums[g] || { total: 0, count: 0 });
      s.total += v;
      s.count += 1;
    })
  );

  const genres = {};
  Object.entries(sums).forEach(([id, { total, count }]) => {
    const avg = total / count;
    const leaning = (total + PRIOR * overall) / (count + PRIOR);
    const listened = Math.log2(1 + count);
    /* your actual average decides whether you dislike a genre; the pulled one how much you like it */
    const weight = avg >= 2.5 ? listened * (leaning / 5) ** 2 : -listened * ((2.5 - avg) / 2.5);
    genres[id] = { genre: d.genreById[id], avg, count, weight };
  });
  return { genres, overall, scoredCount: scored.length, ready: scored.length >= MIN_SCORED };
}

export function suggestFor(d, userId, { hidden = [], limit = 12 } = {}) {
  const taste = tasteProfile(d, userId);
  if (!taste.ready) return { taste, list: [] };
  const skip = new Set(hidden);

  const list = [];
  d.albums.forEach((a) => {
    /* already heard it (any review counts), added it yourself, or said no */
    if (skip.has(a.id) || a.created_by === userId) return;
    if ((d.reviewsByAlbum[a.id] || []).some((r) => r.user_id === userId)) return;

    const ids = (a.genres || []).filter((g) => taste.genres[g]);
    if (!ids.length) return;
    const raw = ids.reduce((n, g) => n + taste.genres[g].weight, 0) / Math.sqrt((a.genres || []).length);
    if (raw <= 0) return;

    const group = groupScore(a, d.reviewsByAlbum[a.id] || []);
    const score = raw * (group.count ? 0.8 + 0.4 * (group.avg / 5) : 1);
    const because = ids
      .map((g) => taste.genres[g])
      .filter((x) => x.weight > 0)
      .sort((x, y) => y.weight - x.weight);
    list.push({ album: a, score, because, group });
  });

  list.sort((x, y) => y.score - x.score);
  return { taste, list: list.slice(0, limit) };
}
