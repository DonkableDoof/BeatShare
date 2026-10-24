import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../theme";
import { usePersistentStorage } from "../storage";
import { ui } from "../ui";
import { useData } from "../data.jsx";
import { useAlbums } from "../album/AlbumHost.jsx";
import { genresOf, groupScore, reviewScore, hasVerdict, points } from "../music";
import Cover from "../album/Cover.jsx";
import GenreMap from "../album/GenreMap.jsx";
import { GenreFilter } from "../album/Genres.jsx";
import { Switch } from "../album/bits.jsx";

const SORTS = [
  { id: "active", label: "Recently Active" },
  { id: "added", label: "Date Added" },
  { id: "group", label: "Group Score" },
  { id: "mine", label: "My Score" },
  { id: "reviews", label: "Most Reviewed" },
  { id: "title", label: "Title" },
  { id: "artist", label: "Artist" },
];

const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

export default function LibraryPage() {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const host = useAlbums();
  const [sort, setSort] = usePersistentStorage("bs-library-sort", "active");
  const [view, setView] = usePersistentStorage("bs-library-view", "gallery");
  const [showGenres, setShowGenres] = usePersistentStorage("bs-show-genres", true);
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState([]);
  const [genreMatch, setGenreMatch] = useState("any");
  const [onlyNew, setOnlyNew] = useState(false);

  const activeGenres = genreFilter.filter((id) => d.genreById[id]);
  const filtering = !!query.trim() || activeGenres.length > 0 || onlyNew;

  /* "N" adds a release, as it does in LifeOS */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || host.busy) return;
      e.preventDefault();
      host.newAlbum();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [host]);

  const info = useMemo(() => {
    const m = {};
    d.albums.forEach((a) => {
      const reviews = (d.reviewsByAlbum[a.id] || []).filter((r) => hasVerdict(a, r));
      const mine = d.myReviews[a.id];
      const lastReview = reviews.reduce((x, r) => (String(r.updated_at) > x ? String(r.updated_at) : x), "");
      m[a.id] = {
        group: groupScore(a, reviews),
        mine,
        myScore: reviewScore(a, mine),
        reviewers: reviews.sort((x, y) => String(y.updated_at).localeCompare(String(x.updated_at))).map((r) => r.user_id),
        active: lastReview > String(a.updated_at) ? lastReview : String(a.updated_at),
      };
    });
    return m;
  }, [d.albums, d.reviewsByAlbum, d.myReviews]);

  const genreCounts = useMemo(() => {
    const c = {};
    d.albums.forEach((a) => (a.genres || []).forEach((id) => (c[id] = (c[id] || 0) + 1)));
    return c;
  }, [d.albums]);

  const newCount = d.albums.filter((a) => !d.myReviews[a.id]).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = d.albums.filter((a) => {
      if (onlyNew && d.myReviews[a.id]) return false;
      if (activeGenres.length) {
        const has = (id) => (a.genres || []).includes(id);
        if (genreMatch === "all" ? !activeGenres.every(has) : !activeGenres.some(has)) return false;
      }
      if (!q) return true;
      return (
        (a.title || "").toLowerCase().includes(q) ||
        (a.artist || "").toLowerCase().includes(q) ||
        genresOf(a, d.genreById).some((g) => g.name.toLowerCase().includes(q)) ||
        (a.tracks || []).some((tr) => tr.title.toLowerCase().includes(q))
      );
    });
    const by = {
      active: (a, b) => info[b.id].active.localeCompare(info[a.id].active),
      added: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
      group: (a, b) => info[b.id].group.avg - info[a.id].group.avg || info[b.id].group.count - info[a.id].group.count,
      mine: (a, b) => info[b.id].myScore - info[a.id].myScore,
      reviews: (a, b) => info[b.id].reviewers.length - info[a.id].reviewers.length || info[b.id].group.avg - info[a.id].group.avg,
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => (a.artist || "~").localeCompare(b.artist || "~") || a.title.localeCompare(b.title),
    };
    return [...list].sort(by[sort] || by.active);
  }, [d.albums, d.myReviews, d.genreById, query, sort, activeGenres.join(), genreMatch, onlyNew, info]);

  const myScored = d.albums.filter((a) => info[a.id] && info[a.id].myScore > 0);
  const myAvg = myScored.length ? myScored.reduce((n, a) => n + info[a.id].myScore, 0) / myScored.length : 0;

  const clearFilters = () => {
    setQuery("");
    setGenreFilter([]);
    setOnlyNew(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h1 style={s.h1}>Library</h1>
          <div style={{ color: t.textMuted, fontSize: 13 }}>
            {d.albums.length} release{d.albums.length === 1 ? "" : "s"} shared · you've scored {myScored.length}
            {myAvg > 0 ? ` · your average ${points(myAvg)}/10` : ""}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[
            ["gallery", "▦ Gallery"],
            ["map", "✦ Genre Map"],
          ].map(([id, label]) => (
            <button key={id} style={{ ...s.segment(view === id), padding: "7px 12px" }} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        {view !== "map" && (
          <Switch
            t={t}
            label="Show Genres"
            title="Show genre tags under each cover"
            value={showGenres !== false}
            onChange={() => setShowGenres((v) => v === false)}
          />
        )}
        <button className="lo-add" style={s.btnPrimary} onClick={host.newAlbum}>
          <span className="lo-plus">+</span> Add Release
        </button>
      </div>

      <section style={{ ...s.card, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            style={{ ...s.input, width: "auto", flex: 1, minWidth: 180 }}
            placeholder="Search releases, artists, genres or tracks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <GenreFilter
            t={t}
            s={s}
            genres={d.genres}
            counts={genreCounts}
            selected={activeGenres}
            match={genreMatch}
            onChange={setGenreFilter}
            onMatch={setGenreMatch}
            onManage={host.manageGenres}
          />
          <button
            title="Releases you haven't reviewed yet"
            style={{ ...s.segment(onlyNew), display: "inline-flex", alignItems: "center", gap: 6, opacity: newCount || onlyNew ? 1 : 0.5 }}
            disabled={!newCount && !onlyNew}
            onClick={() => setOnlyNew((v) => !v)}>
            ✦ Not Rated By Me
            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{newCount}</span>
          </button>
          {view !== "map" && (
            <select
              style={{ ...s.input, width: "auto", cursor: "pointer", padding: "7px 10px", fontSize: 13, fontWeight: 600 }}
              value={sort}
              title="Sort by"
              onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((o) => (
                <option key={o.id} value={o.id}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {shown.length === 0 ? (
        <section style={{ ...s.card, textAlign: "center", padding: "46px 20px" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>💿</div>
          <h2 style={{ ...s.h2, marginBottom: 6 }}>{d.albums.length ? "Nothing matches that" : "No releases shared yet"}</h2>
          <p style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 18px" }}>
            {d.albums.length
              ? "Try a different search, or loosen the filters."
              : "Add an album, compilation or EP — drop in its cover, list the tracks, then score it. Everyone in the group can rate it too."}
          </p>
          {d.albums.length > 0 && filtering && (
            <button style={s.btnGhost} onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          {!d.albums.length && (
            <button className="lo-add" style={s.btnPrimary} onClick={host.newAlbum}>
              <span className="lo-plus">+</span> Add Release
            </button>
          )}
        </section>
      ) : view === "map" ? (
        <GenreMap
          t={t}
          s={s}
          albums={shown}
          genreById={d.genreById}
          scoreOf={(a) => (info[a.id] ? info[a.id].group.avg : 0)}
          onOpen={(a) => host.openAlbum(a.id)}
          onManage={host.manageGenres}
        />
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 18, paddingBottom: 8 }}>
          {shown.map((a) => (
            <Cover
              key={a.id}
              t={t}
              album={a}
              genres={showGenres !== false ? genresOf(a, d.genreById) : []}
              group={info[a.id].group}
              myReview={info[a.id].mine}
              myScore={info[a.id].myScore}
              reviewers={info[a.id].reviewers}
              profileById={d.profileById}
              onOpen={() => host.openAlbum(a.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
