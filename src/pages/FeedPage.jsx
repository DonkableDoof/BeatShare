import React, { useMemo, useState } from "react";
import { useTheme } from "../theme";
import { ui } from "../ui";
import { usePersistentStorage } from "../storage";
import { useData } from "../data.jsx";
import { useAlbums } from "../album/AlbumHost.jsx";
import { hasVerdict, reviewScore, groupScore, scoreColor, points, nameOf, timeAgo, typeLabel } from "../music";
import { Art, Avatar, Stars, oneLine } from "../album/bits.jsx";

const PAGE = 40;

const WHO = [
  { id: "all", label: "Everyone" },
  { id: "friends", label: "Friends" },
  { id: "me", label: "Just Me" },
];

export default function FeedPage({ onOpenProfile }) {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const host = useAlbums();
  const [who, setWho] = usePersistentStorage("bs-feed-who", "all");
  const [limit, setLimit] = useState(PAGE);

  /* every review with something in it, plus every release being added */
  const events = useMemo(() => {
    const list = [];
    d.reviews.forEach((r) => {
      const a = d.albumById[r.album_id];
      if (a && hasVerdict(a, r)) list.push({ kind: "review", key: `r-${r.album_id}-${r.user_id}`, at: r.updated_at, user: r.user_id, album: a, review: r });
    });
    d.albums.forEach((a) => {
      if (a.created_by) list.push({ kind: "added", key: `a-${a.id}`, at: a.created_at, user: a.created_by, album: a });
    });
    return list.sort((x, y) => String(y.at).localeCompare(String(x.at)));
  }, [d.reviews, d.albums, d.albumById]);

  const shown = events.filter((e) => (who === "me" ? e.user === d.userId : who === "friends" ? e.user !== d.userId : true));

  const side = useMemo(() => {
    const all = d.albums.map((a) => ({ a, g: groupScore(a, d.reviewsByAlbum[a.id] || []) }));
    const top = all
      .filter((x) => x.g.count > 0)
      .sort((x, y) => Math.min(y.g.count, 2) - Math.min(x.g.count, 2) || y.g.avg - x.g.avg)
      .slice(0, 5);
    /* what friends have been rating that you haven't, then anything brand new */
    const waiting = all
      .filter((x) => !d.myReviews[x.a.id])
      .sort((x, y) => y.g.count - x.g.count || y.g.avg - x.g.avg || String(y.a.created_at).localeCompare(String(x.a.created_at)))
      .slice(0, 5);
    const counts = {};
    d.reviews.forEach((r) => {
      const a = d.albumById[r.album_id];
      if (a && reviewScore(a, r) > 0) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
    });
    const members = [...d.profiles].sort((x, y) => (counts[y.id] || 0) - (counts[x.id] || 0)).slice(0, 8);
    return { top, waiting, counts, members };
  }, [d.albums, d.reviews, d.reviewsByAlbum, d.myReviews, d.profiles, d.albumById]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h1 style={s.h1}>Feed</h1>
          <div style={{ color: t.textMuted, fontSize: 13 }}>What everyone's been listening to and how they rated it.</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {WHO.map((o) => (
            <button key={o.id} style={s.segment(who === o.id)} onClick={() => setWho(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <button className="lo-add" style={s.btnPrimary} onClick={host.newAlbum}>
          <span className="lo-plus">+</span> Add Release
        </button>
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <section style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.length === 0 ? (
            <div style={{ ...s.card, textAlign: "center", padding: "46px 20px" }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🎧</div>
              <h2 style={{ ...s.h2, marginBottom: 6 }}>Nothing here yet</h2>
              <p style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 18px" }}>
                {who === "friends"
                  ? "When your friends rate or add releases, they'll show up here."
                  : "Add a release or rate one from the Library and it'll show up here for everyone."}
              </p>
            </div>
          ) : (
            shown.slice(0, limit).map((e) => (
              <FeedItem
                key={e.key}
                t={t}
                s={s}
                e={e}
                profile={d.profileById[e.user]}
                isMe={e.user === d.userId}
                rated={!!d.myReviews[e.album.id]}
                onOpen={(tab) => host.openAlbum(e.album.id, tab)}
                onProfile={() => onOpenProfile(e.user)}
              />
            ))
          )}
          {shown.length > limit && (
            <button style={{ ...s.btnGhost, alignSelf: "center" }} onClick={() => setLimit((n) => n + PAGE)}>
              Show More
            </button>
          )}
        </section>

        <aside style={{ flex: "0 1 300px", minWidth: 260, display: "flex", flexDirection: "column", gap: 14 }}>
          {side.waiting.length > 0 && (
            <SideList t={t} s={s} title="Waiting For Your Rating">
              {side.waiting.map(({ a, g }) => (
                <MiniRelease
                  key={a.id}
                  t={t}
                  album={a}
                  score={g.avg}
                  sub={g.count ? `${g.count} rating${g.count === 1 ? "" : "s"}` : "no ratings yet"}
                  onClick={() => host.openAlbum(a.id, "mine")}
                />
              ))}
            </SideList>
          )}
          <SideList t={t} s={s} title="Group Favourites">
            {side.top.length ? (
              side.top.map(({ a, g }, i) => (
                <MiniRelease
                  key={a.id}
                  t={t}
                  rank={i + 1}
                  album={a}
                  score={g.avg}
                  sub={`${g.count} rating${g.count === 1 ? "" : "s"}`}
                  onClick={() => host.openAlbum(a.id, "everyone")}
                />
              ))
            ) : (
              <div style={{ ...s.empty, padding: "6px 2px" }}>Score a few releases to see the group's favourites.</div>
            )}
          </SideList>
          <SideList t={t} s={s} title="Members">
            {side.members.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenProfile(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 4px", border: "none", background: "transparent", cursor: "pointer", color: t.text, textAlign: "left", borderRadius: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.bgHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Avatar t={t} profile={p} size={26} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, ...oneLine }}>
                  {nameOf(p)}
                  {p.id === d.userId ? " (you)" : ""}
                </span>
                <span style={{ fontSize: 11.5, color: t.textDim, fontWeight: 600 }}>{side.counts[p.id] || 0} rated</span>
              </button>
            ))}
          </SideList>
        </aside>
      </div>
    </div>
  );
}

function SideList({ t, s, title, children }) {
  return (
    <div style={{ ...s.card, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: t.textDim, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function MiniRelease({ t, album, score, sub, rank, onClick }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.bgHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 4px", border: "none", background: "transparent", cursor: "pointer", color: t.text, textAlign: "left", borderRadius: 8 }}>
      {rank && <span style={{ width: 14, fontSize: 12, fontWeight: 700, color: t.textDim, textAlign: "right" }}>{rank}</span>}
      <span style={{ width: 38, height: 38, borderRadius: 7, overflow: "hidden", flexShrink: 0, fontSize: 14 }}>
        <Art t={t} album={album} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, ...oneLine }}>{album.title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: t.textMuted, ...oneLine }}>
          {album.artist || "Unknown artist"} · {sub}
        </span>
      </span>
      {score > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score) }}>{points(score)}</span>}
    </button>
  );
}

function FeedItem({ t, s, e, profile, isMe, rated, onOpen, onProfile }) {
  const a = e.album;
  const score = e.kind === "review" ? reviewScore(a, e.review) : 0;
  const notes = e.kind === "review" ? (e.review.notes || "").trim() : "";
  const name = isMe ? "You" : nameOf(profile);
  return (
    <div style={{ ...s.card, padding: 14, display: "flex", gap: 14 }}>
      <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", alignSelf: "flex-start" }} onClick={onProfile}>
        <Avatar t={t} profile={profile} size={38} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
          <button style={{ ...s.linkBtn, fontSize: 13.5, color: t.text }} onClick={onProfile}>
            {name}
          </button>{" "}
          <span style={{ color: t.textMuted }}>
            {e.kind === "review" ? (score > 0 ? "rated" : "reviewed") : `added ${a.type === "compilation" ? "a" : "an"} ${typeLabel(a.type) === "EP" ? "EP" : typeLabel(a.type).toLowerCase()}`}
          </span>{" "}
          <button style={{ ...s.linkBtn, fontSize: 13.5, color: t.text }} onClick={() => onOpen(e.kind === "review" ? "everyone" : "mine")}>
            {a.title}
          </button>
          <span style={{ color: t.textMuted }}> by {a.artist || "Unknown artist"}</span>
        </div>
        <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 1 }}>{timeAgo(e.at)}</div>

        {score > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Stars t={t} value={score} size={16} />
            <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(score) }}>{points(score)} / 10</span>
            {!(e.review.rating > 0) && <span style={{ fontSize: 11.5, color: t.textDim }}>from track ratings</span>}
          </div>
        )}
        {notes && (
          <p
            className="lo-selectable"
            style={{
              fontSize: 13.5,
              lineHeight: 1.6,
              marginTop: 8,
              whiteSpace: "pre-wrap",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
            {notes}
          </p>
        )}
        {e.kind === "added" && !isMe && !rated && (
          <button style={{ ...s.btnGhost, marginTop: 10, padding: "5px 12px", fontSize: 12 }} onClick={() => onOpen("mine")}>
            ★ Rate It
          </button>
        )}
      </div>
      <button
        onClick={() => onOpen(e.kind === "review" ? "everyone" : "mine")}
        title="Open release"
        style={{ width: 84, height: 84, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.border}`, padding: 0, cursor: "pointer", background: t.bgCard2, fontSize: 22 }}>
        <Art t={t} album={a} />
      </button>
    </div>
  );
}
