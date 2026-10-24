import React, { useMemo, useState } from "react";
import { hexToRgba } from "../theme";
import { SCORE_COLORS, scoreColor, points, typeLabel } from "../music";
import { GenreChip, oneLine } from "./bits.jsx";

/* A spider-web genre map. Every genre is an anchor round the edge; each
   release sits at the average of its genres' anchors, so a single-genre
   release hugs its genre and a genre-blender sits between the ones it
   mixes. Genres that share releases are placed side by side. */
const MAP_W = 760;
const MAP_H = 640;
const MAP_R = 228;
const DOT = 14;
const MAX_AXES = 14;

function layoutGenreMap(albums, genreById) {
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  const items = albums.map((a) => ({ a, gs: (a.genres || []).filter((id) => genreById[id]) }));
  const tagged = items.filter((m) => m.gs.length);

  const count = {};
  const co = {};
  tagged.forEach(({ gs }) => {
    gs.forEach((g) => (count[g] = (count[g] || 0) + 1));
    gs.forEach((x) => gs.forEach((y) => x !== y && (co[`${x}|${y}`] = (co[`${x}|${y}`] || 0) + 1)));
  });
  const kept = Object.keys(count)
    .sort((x, y) => count[y] - count[x] || genreById[x].name.localeCompare(genreById[y].name))
    .slice(0, MAX_AXES);

  /* Slot each genre in between the neighbours it shares the most releases
     with, without splitting a pair that already belongs together — so
     blended releases land near the edge, not stranded in the middle. */
  const pair = (x, y) => co[`${x}|${y}`] || 0;
  const order = [];
  kept.forEach((g) => {
    if (order.length < 2) return order.push(g);
    let at = 1;
    let best = -Infinity;
    for (let i = 0; i < order.length; i++) {
      const a = order[i];
      const b = order[(i + 1) % order.length];
      const v = pair(a, g) + pair(g, b) - pair(a, b) * 0.5;
      if (v > best) {
        best = v;
        at = i + 1;
      }
    }
    order.splice(at, 0, g);
  });

  const n = order.length;
  const anchor = {};
  order.forEach((g, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, n);
    anchor[g] = { x: Math.cos(ang), y: Math.sin(ang) };
  });

  const pts = [];
  const offMap = items.filter((m) => !m.gs.length).map((m) => m.a);
  tagged.forEach(({ a, gs }) => {
    const use = gs.filter((g) => anchor[g]);
    if (!use.length) return offMap.push(a);
    let x = 0;
    let y = 0;
    use.forEach((g) => {
      x += anchor[g].x;
      y += anchor[g].y;
    });
    pts.push({ a, gs: use, x: cx + (x / use.length) * MAP_R * 0.82, y: cy + (y / use.length) * MAP_R * 0.82 });
  });

  /* nudge overlapping covers apart; identical genre sets fan out evenly */
  const min = DOT * 2 + 5;
  for (let it = 0; it < 80; it++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const p = pts[i];
        const q = pts[j];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.01) {
          const ang = (j * 2.399963) % (2 * Math.PI);
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        const push = (min - d) / 2;
        p.x -= (dx / d) * push;
        p.y -= (dy / d) * push;
        q.x += (dx / d) * push;
        q.y += (dy / d) * push;
        moved = true;
      }
    }
    pts.forEach((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      const lim = MAP_R - DOT - 4;
      if (d > lim) {
        p.x = cx + (dx / d) * lim;
        p.y = cy + (dy / d) * lim;
      }
    });
    if (!moved) break;
  }

  return { cx, cy, order, anchor, count, pts, offMap, n, hidden: Object.keys(count).length - n };
}

export default function GenreMap({ t, s, albums, genreById, scoreOf, onOpen, onManage }) {
  const [hover, setHover] = useState(null);
  const [focus, setFocus] = useState(null);
  const L = useMemo(() => layoutGenreMap(albums, genreById), [albums, genreById]);
  const { cx, cy, order, anchor, count, pts, offMap, n } = L;
  const hovered = pts.find((p) => p.a.id === hover) || null;
  const lit = (p) => (hovered ? p === hovered : focus ? p.gs.includes(focus) : true);

  if (!n) {
    return (
      <section style={{ ...s.card, textAlign: "center", padding: "46px 20px" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>✦</div>
        <h2 style={{ ...s.h2, marginBottom: 6 }}>Nothing to map yet</h2>
        <p style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 16px" }}>
          Tag your releases with genres and they'll spread out across the map — closer to the genres they belong to.
        </p>
        <button style={s.btnGhost} onClick={onManage}>
          Manage Genres
        </button>
      </section>
    );
  }

  const ring = (k) =>
    n >= 3 ? (
      <polygon
        key={k}
        points={order.map((g) => `${cx + anchor[g].x * MAP_R * k},${cy + anchor[g].y * MAP_R * k}`).join(" ")}
        fill={k === 1 ? hexToRgba(t.text, 0.02) : "none"}
        stroke={t.border}
        strokeWidth={1}
      />
    ) : (
      <circle key={k} cx={cx} cy={cy} r={MAP_R * k} fill="none" stroke={t.border} strokeWidth={1} />
    );

  const legend = [
    ["0–2", SCORE_COLORS.low],
    ["3", SCORE_COLORS.weak],
    ["4–8", SCORE_COLORS.mid],
    ["9–10", SCORE_COLORS.high],
    ["Not scored", t.textDim],
  ];

  return (
    <section style={{ ...s.card, paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 style={{ ...s.h2, marginBottom: 0 }}>Genre Map</h2>
        <span style={{ fontSize: 12.5, color: t.textMuted }}>
          {pts.length} release{pts.length === 1 ? "" : "s"} across {n} genre{n === 1 ? "" : "s"}
          {L.hidden > 0 ? ` (plus ${L.hidden} smaller genre${L.hidden === 1 ? "" : "s"} left off)` : ""}
        </span>
        {focus && (
          <button style={{ ...s.linkBtn, marginLeft: "auto" }} onClick={() => setFocus(null)}>
            Show all genres
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: t.textDim, marginBottom: 6 }}>
        Releases sit closer to the genres they're tagged with. Hover one to see its genres, click a genre to pick out its
        releases.
      </div>

      <div style={{ position: "relative", maxWidth: MAP_W, margin: "0 auto" }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <clipPath id="bs-map-dot" clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
            </clipPath>
          </defs>

          {[1 / 3, 2 / 3, 1].map(ring)}
          {order.map((g) => (
            <line
              key={g}
              x1={cx}
              y1={cy}
              x2={cx + anchor[g].x * MAP_R}
              y2={cy + anchor[g].y * MAP_R}
              stroke={focus === g ? genreById[g].color : t.border}
              strokeWidth={focus === g ? 2 : 1}
            />
          ))}

          {hovered &&
            hovered.gs.map((g) => (
              <line
                key={g}
                x1={hovered.x}
                y1={hovered.y}
                x2={cx + anchor[g].x * MAP_R}
                y2={cy + anchor[g].y * MAP_R}
                stroke={genreById[g].color}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}

          {order.map((g) => {
            const a = anchor[g];
            const lx = cx + a.x * (MAP_R + 22);
            const ly = cy + a.y * (MAP_R + 22);
            const side = Math.abs(a.x) < 0.2 ? "middle" : a.x > 0 ? "start" : "end";
            const on = (hovered && hovered.gs.includes(g)) || focus === g;
            const dim = (hovered && !on) || (focus && focus !== g);
            const genre = genreById[g];
            return (
              <g
                key={g}
                style={{ cursor: "pointer" }}
                opacity={dim ? 0.4 : 1}
                onClick={() => setFocus((f) => (f === g ? null : g))}>
                <circle cx={cx + a.x * MAP_R} cy={cy + a.y * MAP_R} r={on ? 6 : 4.5} fill={genre.color} stroke={t.bgCard} strokeWidth={2} />
                <text
                  x={lx}
                  y={ly + (a.y > 0.85 ? 8 : a.y < -0.85 ? -4 : 4)}
                  textAnchor={side}
                  fontSize={12.5}
                  fontWeight={on ? 700 : 600}
                  fill={on ? t.text : t.textMuted}>
                  {genre.name}
                  <tspan fill={t.textDim} fontWeight={600}>
                    {" "}
                    {count[g]}
                  </tspan>
                </text>
              </g>
            );
          })}

          {pts.map((p) => {
            const score = scoreOf(p.a);
            const ringColor = score > 0 ? scoreColor(score) : t.textDim;
            const on = lit(p);
            const big = hover === p.a.id;
            const r = big ? DOT + 3 : DOT;
            return (
              <g
                key={p.a.id}
                style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
                opacity={on ? 1 : 0.22}
                onMouseEnter={() => setHover(p.a.id)}
                onClick={() => onOpen(p.a)}>
                <circle cx={p.x} cy={p.y} r={r + 4} fill={t.bgCard} />
                <circle cx={p.x} cy={p.y} r={r} fill={t.bgCard2} />
                {p.a.cover_url ? (
                  <image
                    href={p.a.cover_url}
                    x={p.x - r + 1.5}
                    y={p.y - r + 1.5}
                    width={(r - 1.5) * 2}
                    height={(r - 1.5) * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath="url(#bs-map-dot)"
                  />
                ) : (
                  <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.text}>
                    {(p.a.title || "♫").trim().slice(0, 1).toUpperCase()}
                  </text>
                )}
                <circle cx={p.x} cy={p.y} r={r} fill="none" stroke={ringColor} strokeWidth={3} />
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div
            style={{
              position: "absolute",
              left: `${(hovered.x / MAP_W) * 100}%`,
              top: `${(hovered.y / MAP_H) * 100}%`,
              transform: `translate(${hovered.x > MAP_W / 2 ? "calc(-100% - 22px)" : "22px"}, -50%)`,
              pointerEvents: "none",
              zIndex: 5,
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "9px 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              maxWidth: 240,
            }}>
            <div style={{ fontSize: 13, fontWeight: 700, ...oneLine }}>{hovered.a.title}</div>
            <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 1, ...oneLine }}>
              {hovered.a.artist || "Unknown artist"} · {typeLabel(hovered.a.type)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: t.text, fontWeight: 600 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: scoreOf(hovered.a) > 0 ? scoreColor(scoreOf(hovered.a)) : t.textDim,
                }}
              />
              {scoreOf(hovered.a) > 0 ? `${points(scoreOf(hovered.a))} / 10` : "Not scored yet"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
              {hovered.gs.map((g) => (
                <GenreChip key={g} t={t} genre={genreById[g]} small />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
          fontSize: 11.5,
          color: t.textMuted,
          marginTop: 6,
        }}>
        <span style={{ fontWeight: 700 }}>Ring = score</span>
        {legend.map(([label, c]) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", border: `3px solid ${c}` }} />
            {label}
          </span>
        ))}
      </div>

      {offMap.length > 0 && (
        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 12, paddingTop: 10, fontSize: 12, color: t.textMuted }}>
          <span style={{ fontWeight: 700 }}>Not on the map</span> — no genres yet:{" "}
          {offMap.map((a, i) => (
            <span key={a.id}>
              <button style={{ ...s.linkBtn, fontSize: 12 }} onClick={() => onOpen(a)}>
                {a.title}
              </button>
              {i < offMap.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
