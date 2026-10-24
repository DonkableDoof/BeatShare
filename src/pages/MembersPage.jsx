import React, { useMemo, useState } from "react";
import { useTheme } from "../theme";
import { ui } from "../ui";
import { useData } from "../data.jsx";
import { reviewScore, scoreColor, points, nameOf, prettyDate } from "../music";
import { Avatar, oneLine } from "../album/bits.jsx";

/* member stats used here and on profiles */
export function memberStats(d, userId) {
  const scored = [];
  d.reviews.forEach((r) => {
    if (r.user_id !== userId) return;
    const a = d.albumById[r.album_id];
    const v = a ? reviewScore(a, r) : 0;
    if (v > 0) scored.push({ a, r, v });
  });
  const avg = scored.length ? scored.reduce((n, x) => n + x.v, 0) / scored.length : 0;
  const added = d.albums.filter((a) => a.created_by === userId);
  const genreCount = {};
  scored.forEach(({ a }) => (a.genres || []).forEach((g) => d.genreById[g] && (genreCount[g] = (genreCount[g] || 0) + 1)));
  const topGenre = Object.keys(genreCount).sort((x, y) => genreCount[y] - genreCount[x])[0];
  return { scored, avg, added, topGenre: topGenre ? d.genreById[topGenre] : null };
}

export default function MembersPage({ onOpenProfile }) {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const [query, setQuery] = useState("");

  const members = useMemo(
    () =>
      d.profiles
        .map((p) => ({ p, st: memberStats(d, p.id) }))
        .sort((x, y) => y.st.scored.length - x.st.scored.length || nameOf(x.p).localeCompare(nameOf(y.p))),
    [d.profiles, d.reviews, d.albums, d.genreById]
  );

  const q = query.trim().toLowerCase();
  const shown = members.filter(({ p }) => !q || nameOf(p).toLowerCase().includes(q) || p.username.includes(q));

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h1 style={s.h1}>Members</h1>
          <div style={{ color: t.textMuted, fontSize: 13 }}>
            {d.profiles.length} member{d.profiles.length === 1 ? "" : "s"} in the group — everyone can see everyone's reviews.
          </div>
        </div>
        <input
          style={{ ...s.input, width: 240, marginLeft: "auto" }}
          placeholder="Find a member…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
        {shown.map(({ p, st }) => (
          <button
            key={p.id}
            onClick={() => onOpenProfile(p.id)}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            style={{
              ...s.card,
              textAlign: "left",
              cursor: "pointer",
              color: t.text,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "transform 0.2s cubic-bezier(0.22, 0.85, 0.3, 1)",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar t={t} profile={p} size={52} ring={p.id === d.userId ? t.accent : null} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, ...oneLine }}>
                  {nameOf(p)}
                  {p.id === d.userId ? " (you)" : ""}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted }}>@{p.username}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: p.bio ? t.textMuted : t.textDim, lineHeight: 1.5, minHeight: 37, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.bio || `Joined ${prettyDate(p.created_at)}`}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: t.textMuted }}>
              <span>
                <strong style={{ color: t.text }}>{st.scored.length}</strong> rated
              </span>
              <span>
                <strong style={{ color: st.avg ? scoreColor(st.avg) : t.text }}>{st.avg ? points(st.avg) : "—"}</strong> avg
              </span>
              <span>
                <strong style={{ color: t.text }}>{st.added.length}</strong> added
              </span>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
