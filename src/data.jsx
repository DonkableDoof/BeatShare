import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { GENRE_COLORS, norm } from "./music";
import { dataUrlToBlob, isDataUrl } from "./images";

/* Everything the friend group has shared, held in memory and kept current
   by realtime. Edits apply locally first so stars and notes never wait on
   the network; review saves are batched per release. */

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

const keyOf = {
  profiles: (r) => r.id,
  genres: (r) => r.id,
  albums: (r) => r.id,
  reviews: (r) => `${r.album_id}|${r.user_id}`,
};

const REVIEW_DELAY = 500;

const friendly = (e) => {
  const msg = (e && e.message) || String(e);
  if (msg.includes("albums_release_key")) return "That release is already on BeatShare.";
  if (msg.includes("genres_name_key")) return "A genre with that name already exists.";
  if (msg.includes("profiles_username_key")) return "That username is taken.";
  if (/failed to fetch|network/i.test(msg)) return "Couldn't reach BeatShare's server — check your connection.";
  return msg;
};

export function DataProvider({ user, onError, children }) {
  const [db, setDb] = useState({ profiles: [], genres: [], albums: [], reviews: [] });
  const [status, setStatus] = useState("loading");
  const dbRef = useRef(db);
  dbRef.current = db;
  const pending = useRef({});

  const fail = useCallback((e) => onError && onError(friendly(e)), [onError]);

  const load = useCallback(async () => {
    try {
      const all = await api.loadAll();
      /* reviews still waiting to save win over what the server last had */
      const queued = Object.values(pending.current).map((j) => j.review);
      if (queued.length) {
        const k = (r) => keyOf.reviews(r);
        const skip = new Set(queued.map(k));
        all.reviews = [...all.reviews.filter((r) => !skip.has(k(r))), ...queued];
      }
      setDb(all);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      fail(e);
    }
  }, [fail]);

  const apply = useCallback((table, row, removed = false) => {
    const k = keyOf[table](row);
    setDb((d) => {
      const rest = d[table].filter((x) => keyOf[table](x) !== k);
      const next = { ...d, [table]: removed ? rest : [...rest, row] };
      /* a removed release takes its reviews with it */
      if (table === "albums" && removed) next.reviews = d.reviews.filter((r) => r.album_id !== row.id);
      return next;
    });
  }, []);

  useEffect(() => {
    load();
    const unsub = api.subscribe((table, event, row, old) => {
      if (event === "RELOAD") return load();
      /* my own review is decided locally while a save is still queued */
      if (table === "reviews" && (row || old) && (row || old).user_id === user.id && pending.current[(row || old).album_id]) return;
      if (event === "DELETE") apply(table, old, true);
      else apply(table, row);
    });
    /* catch up on anything realtime missed while the window slept */
    let last = Date.now();
    const onFocus = () => {
      if (Date.now() - last < 60000) return;
      last = Date.now();
      load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
    };
  }, [user.id]);

  /* flush queued review saves before the window goes away */
  useEffect(() => {
    const flushAll = () => Object.keys(pending.current).forEach((id) => flushReview(id));
    window.addEventListener("beforeunload", flushAll);
    return () => {
      window.removeEventListener("beforeunload", flushAll);
      /* signed out — nothing left to save as */
      Object.values(pending.current).forEach((j) => clearTimeout(j.timer));
      pending.current = {};
    };
  }, []);

  const lookups = useMemo(() => {
    const profileById = Object.fromEntries(db.profiles.map((p) => [p.id, p]));
    const genreById = Object.fromEntries(db.genres.map((g) => [g.id, g]));
    const albumById = Object.fromEntries(db.albums.map((a) => [a.id, a]));
    const reviewsByAlbum = {};
    db.reviews.forEach((r) => (reviewsByAlbum[r.album_id] = reviewsByAlbum[r.album_id] || []).push(r));
    const myReviews = Object.fromEntries(db.reviews.filter((r) => r.user_id === user.id).map((r) => [r.album_id, r]));
    return { profileById, genreById, albumById, reviewsByAlbum, myReviews };
  }, [db, user.id]);

  /* ── images ── */
  const upload = async (bucket, src) => (isDataUrl(src) ? api.uploadImage(bucket, user.id, await dataUrlToBlob(src)) : src);

  /* ── releases ── */
  const saveAlbum = async (album, isNew) => {
    const row = {
      title: album.title.trim(),
      artist: album.artist.trim(),
      type: album.type,
      year: String(album.year || "").trim(),
      cover_url: await upload("covers", album.cover_url || ""),
      genres: album.genres || [],
      tracks: (album.tracks || []).map(({ id, title, interlude }) => ({ id, title: title.trim(), interlude: !!interlude })),
    };
    const saved = isNew
      ? await api.insertAlbum({ ...row, id: album.id, created_by: user.id })
      : await api.updateAlbum(album.id, row);
    apply("albums", saved);
    return saved;
  };

  /* small edits (an interlude toggle) — shown at once, rolled back on failure */
  const patchAlbum = async (id, patch) => {
    const before = lookups.albumById[id];
    if (!before) return;
    apply("albums", { ...before, ...patch });
    try {
      apply("albums", await api.updateAlbum(id, patch));
    } catch (e) {
      apply("albums", before);
      fail(e);
    }
  };

  const deleteAlbum = async (id) => {
    await api.deleteAlbum(id);
    apply("albums", { id }, true);
  };

  /* ── genres ── */
  /* returns the new id straight away so a picker can tick it; reads the
     ref rather than this render's copy so "Rock, Jazz" makes two */
  const createGenre = (name) => {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!clean) return null;
    const current = dbRef.current.genres;
    const found = current.find((g) => norm(g.name) === norm(clean));
    if (found) return found.id;
    const used = new Set(current.map((g) => g.color));
    const color = GENRE_COLORS.find((c) => !used.has(c)) || GENRE_COLORS[current.length % GENRE_COLORS.length];
    const g = { id: crypto.randomUUID(), name: clean, color, created_by: user.id, created_at: new Date().toISOString() };
    dbRef.current = { ...dbRef.current, genres: [...current, g] };
    apply("genres", g);
    api.insertGenre({ id: g.id, name: g.name, color: g.color, created_by: user.id }).catch((e) => {
      fail(e);
      load();
    });
    return g.id;
  };

  const updateGenre = async (id, patch) => {
    const before = lookups.genreById[id];
    apply("genres", { ...before, ...patch });
    try {
      await api.updateGenre(id, patch);
    } catch (e) {
      apply("genres", before);
      fail(e);
    }
  };

  const deleteGenre = async (id) => {
    const before = lookups.genreById[id];
    apply("genres", before, true);
    try {
      await api.deleteGenre(id);
    } catch (e) {
      apply("genres", before);
      fail(e);
    }
  };

  /* ── my reviews ── */
  const flushReview = async (albumId) => {
    const job = pending.current[albumId];
    if (!job) return;
    clearTimeout(job.timer);
    delete pending.current[albumId];
    const r = job.review;
    try {
      await api.upsertReview({
        album_id: r.album_id,
        user_id: r.user_id,
        rating: r.rating || 0,
        track_ratings: r.track_ratings || {},
        notes: r.notes || "",
      });
    } catch (e) {
      fail(e);
      load();
    }
  };

  const patchMyReview = (albumId, fn) => {
    const base = (pending.current[albumId] && pending.current[albumId].review) ||
      lookups.myReviews[albumId] || {
        album_id: albumId,
        user_id: user.id,
        rating: 0,
        track_ratings: {},
        notes: "",
        created_at: new Date().toISOString(),
      };
    const next = { ...fn(base), updated_at: new Date().toISOString() };
    apply("reviews", next);
    const job = pending.current[albumId];
    if (job) clearTimeout(job.timer);
    pending.current[albumId] = { review: next, timer: setTimeout(() => flushReview(albumId), REVIEW_DELAY) };
  };

  const clearMyReview = async (albumId) => {
    const job = pending.current[albumId];
    if (job) clearTimeout(job.timer);
    delete pending.current[albumId];
    const before = lookups.myReviews[albumId];
    if (!before) return;
    apply("reviews", before, true);
    try {
      await api.deleteReview(albumId, user.id);
    } catch (e) {
      apply("reviews", before);
      fail(e);
    }
  };

  /* bulk writes (the LifeOS import) skip the debounce */
  const saveReviewNow = async (review) => {
    const saved = await api.upsertReview(review);
    apply("reviews", saved);
    return saved;
  };

  /* ── profile ── */
  const updateProfile = async (patch) => {
    const next = { ...patch };
    if (next.avatar_url !== undefined) next.avatar_url = await upload("avatars", next.avatar_url);
    const saved = await api.updateProfile(user.id, next);
    apply("profiles", saved);
    return saved;
  };

  const value = {
    status,
    reload: load,
    me: lookups.profileById[user.id] || null,
    userId: user.id,
    ...db,
    ...lookups,
    saveAlbum,
    patchAlbum,
    deleteAlbum,
    createGenre,
    updateGenre,
    deleteGenre,
    patchMyReview,
    clearMyReview,
    saveReviewNow,
    flushReviews: () => Promise.all(Object.keys(pending.current).map(flushReview)),
    updateProfile,
    friendly,
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
