import React, { useMemo, useState } from "react";
import { useTheme, hexToRgba } from "../theme";
import { ui } from "../ui";
import { useData } from "../data.jsx";
import { useAlbums } from "../album/AlbumHost.jsx";
import { reviewScore, scoreColor, points, nameOf, timeAgo, typeLabel } from "../music";
import { usePersistentStorage } from "../storage";
import { suggestFor } from "../suggest";
import { Art, Avatar, GenreChip, oneLine } from "../album/bits.jsx";

/* Releases other members have recommended to you and the ones you've sent,
   with releases picked for your taste in a column beside them. */
export default function InboxPage({ onOpenProfile }) {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const host = useAlbums();
  const [tab, setTab] = useState("received");

  const list = tab === "received" ? d.inbox : d.sent;

  const open = (r) => {
    if (tab === "received") d.markRead([r.id]);
    host.openAlbum(r.album_id, tab === "received" ? "mine" : "everyone");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={s.h1}>Inbox</h1>
        <div style={{ color: t.textMuted, fontSize: 13 }}>
          Releases members think you should hear. Right-click any release to recommend it to someone.
        </div>
      </div>

      {/* the window is never narrower than 900px, so the two columns always fit side by side */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <section style={{ flex: "1 1 0", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <button style={s.segment(tab === "received")} onClick={() => setTab("received")}>
              Received{d.unread ? ` · ${d.unread} new` : ""}
            </button>
            <button style={s.segment(tab === "sent")} onClick={() => setTab("sent")}>
              Sent
            </button>
            {tab === "received" && d.unread > 0 && (
              <button style={{ ...s.btnGhost, marginLeft: "auto" }} onClick={() => d.markRead(d.inbox.map((r) => r.id))}>
                Mark All Read
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <div style={{ ...s.card, textAlign: "center", padding: "46px 20px" }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>{tab === "received" ? "📭" : "📨"}</div>
              <h2 style={{ ...s.h2, marginBottom: 6 }}>{tab === "received" ? "Nothing recommended yet" : "You haven't recommended anything"}</h2>
              <p style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
                {tab === "received"
                  ? "When someone recommends a release to you, it shows up here."
                  : "Right-click a release in the Library, or use ➤ Recommend on its page, to send it to someone."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map((r) => (
                <RecItem
                  key={r.id}
                  t={t}
                  s={s}
                  r={r}
                  received={tab === "received"}
                  album={d.albumById[r.album_id]}
                  person={d.profileById[tab === "received" ? r.from_user : r.to_user]}
                  score={reviewScore(
                    d.albumById[r.album_id],
                    tab === "received"
                      ? d.myReviews[r.album_id]
                      : (d.reviewsByAlbum[r.album_id] || []).find((x) => x.user_id === r.to_user)
                  )}
                  onOpen={() => open(r)}
                  onProfile={(id) => onOpenProfile(id)}
                  onRemove={() => d.removeRecommendation(r.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside style={{ flex: "0 0 auto", width: "clamp(270px, 35%, 360px)" }}>
          <ForYou t={t} s={s} />
        </aside>
      </div>
    </div>
  );
}

/* releases you haven't heard, picked from the genres you listen to most and rate highest */
function ForYou({ t, s }) {
  const d = useData();
  const host = useAlbums();
  const [hidden, setHidden] = usePersistentStorage(`bs-for-you-hidden-${d.userId}`, []);
  const { taste, list } = useMemo(
    () => suggestFor(d, d.userId, { hidden }),
    [d.albums, d.reviews, d.genreById, d.reviewsByAlbum, d.albumById, d.userId, hidden]
  );
  const liked = Object.values(taste.genres)
    .filter((g) => g.weight > 0)
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 4);

  return (
    <section style={{ ...s.card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={s.h2}>✦ For You</h2>
        {hidden.length > 0 && (
          <button style={{ ...s.linkBtn, color: t.textMuted, marginLeft: "auto" }} onClick={() => setHidden([])}>
            Show {hidden.length} hidden
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, marginTop: 3 }}>
        Releases you haven't heard, picked from what you listen to most and rate highest.
      </div>
      {liked.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {liked.map((g) => (
            <GenreChip key={g.genre.id} t={t} genre={g.genre} small />
          ))}
        </div>
      )}

      {!list.length ? (
        <div style={{ textAlign: "center", padding: "26px 8px 10px" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>{taste.ready ? "🎉" : "🎧"}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{taste.ready ? "You're all caught up" : "Not enough to go on yet"}</div>
          <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.55 }}>
            {taste.ready
              ? "Nothing left in the library matches the genres you like. New releases that do will show up here."
              : `Score a few releases that have genres (${taste.scoredCount} of 3 so far) and suggestions show up here.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 12 }}>
          {list.map((x) => (
            <SuggestItem
              key={x.album.id}
              t={t}
              s={s}
              x={x}
              onOpen={() => host.openAlbum(x.album.id, "mine")}
              onRecommend={() => host.recommend(x.album.id)}
              onHide={() => setHidden((h) => [...h, x.album.id])}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SuggestItem({ t, s, x, onOpen, onRecommend, onHide }) {
  const { album, because, group } = x;
  const lead = because[0];
  const small = { ...s.iconBtn, width: 24, height: 24, fontSize: 11 };
  return (
    <div
      onClick={onOpen}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.bgHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{ display: "flex", gap: 11, alignItems: "center", padding: 8, margin: "0 -8px", borderRadius: 9, cursor: "pointer", transition: "background 0.15s ease" }}>
      <div style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.border}` }}>
        <Art t={t} album={album} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, ...oneLine }}>{album.title}</div>
        <div style={{ fontSize: 12, color: t.textMuted, ...oneLine }}>
          {album.artist || "Unknown artist"} · {typeLabel(album.type)}
        </div>
        <div
          title={lead ? `You score ${lead.genre.name} ${points(lead.avg)} on average over ${lead.count} release${lead.count === 1 ? "" : "s"}` : ""}
          style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: t.textDim, overflow: "hidden", whiteSpace: "nowrap" }}>
          {because.slice(0, 2).map((g) => (
            <GenreChip key={g.genre.id} t={t} genre={g.genre} small />
          ))}
          {group.count > 0 && <span style={{ marginLeft: 2, fontWeight: 700, color: scoreColor(group.avg) }}>★ {points(group.avg)}</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button
          title="Recommend it to someone"
          style={small}
          onClick={(e) => {
            e.stopPropagation();
            onRecommend();
          }}>
          ➤
        </button>
        <button
          title="Not interested — stop suggesting this"
          style={small}
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}>
          ✕
        </button>
      </div>
    </div>
  );
}

function RecItem({ t, s, r, received, album, person, score, onOpen, onProfile, onRemove }) {
  const unread = received && !r.read_at;
  return (
    <div
      onClick={onOpen}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
      style={{
        ...s.card,
        padding: 14,
        display: "flex",
        gap: 14,
        alignItems: "center",
        cursor: "pointer",
        transition: "transform 0.18s ease",
        borderColor: unread ? hexToRgba(t.accent, 0.55) : t.border,
        background: unread ? `linear-gradient(90deg, ${hexToRgba(t.accent, 0.08)}, ${t.bgCard} 60%)` : t.bgCard,
      }}>
      <div style={{ width: 64, height: 64, borderRadius: 9, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.border}` }}>
        <Art t={t} album={album} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: t.textMuted, flexWrap: "wrap" }}>
          {!received && <span>To</span>}
          {person && <Avatar t={t} profile={person} size={18} />}
          <button
            style={{ ...s.linkBtn, fontSize: 12.5, color: t.text }}
            onClick={(e) => {
              e.stopPropagation();
              person && onProfile(person.id);
            }}>
            {person ? nameOf(person) : "A former member"}
          </button>
          {received && <span>recommended</span>}
          <span style={{ color: t.textDim }}>· {timeAgo(r.created_at)}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3, ...oneLine }}>{album.title}</div>
        <div style={{ fontSize: 12.5, color: t.textMuted, ...oneLine }}>
          {album.artist || "Unknown artist"} · {typeLabel(album.type)}
        </div>
        {r.note && (
          <div
            className="lo-selectable"
            style={{ marginTop: 7, padding: "6px 10px", borderLeft: `3px solid ${t.accent}`, borderRadius: 4, background: t.bgCard2, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {r.note}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        {received ? (
          unread ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: t.accentBg, color: t.accent }}>New</span>
          ) : null
        ) : (
          <span style={{ fontSize: 11.5, color: r.read_at ? t.green : t.textDim, fontWeight: 600 }}>{r.read_at ? "✓ Seen" : "Not opened yet"}</span>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: score > 0 ? scoreColor(score) : t.textDim }}>
          {score > 0 ? `${received ? "You" : "They"} ★ ${points(score)}` : received ? "Not rated yet" : "Not rated"}
        </span>
        <button
          title={received ? "Remove from your inbox" : "Take back this recommendation"}
          style={s.iconBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}>
          ✕
        </button>
      </div>
    </div>
  );
}
