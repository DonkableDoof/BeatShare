import React, { useState } from "react";
import { hexToRgba } from "../theme";
import {
  typeLabel,
  reviewable,
  ratedTracks,
  trackAvg,
  trackRating,
  reviewScore,
  hasVerdict,
  groupScore,
  groupTrackAvg,
  scoreColor,
  points,
  nameOf,
  prettyDate,
  timeAgo,
} from "../music";
import { Art, Avatar, Stars, Stat, GenreChip, useEscape } from "./bits.jsx";
import LinkButton from "../components/LinkButton.jsx";

export default function AlbumDetail({
  t,
  s,
  album,
  genres,
  reviews,
  myReview,
  userId,
  profileById,
  initialTab = "mine",
  blocked,
  onClose,
  onRateAlbum,
  onRateTrack,
  onInterlude,
  onNotes,
  canEdit,
  onEdit,
  onDelete,
  onRecommend,
  onClearReview,
  onOpenProfile,
}) {
  const [tab, setTab] = useState(initialTab);
  const tracks = album.tracks || [];
  const avg = trackAvg(album, myReview);
  const rated = ratedTracks(album, myReview).length;
  const group = groupScore(album, reviews);
  const others = reviews.filter((r) => r.user_id !== userId && hasVerdict(album, r));
  const everyone = [...reviews.filter((r) => hasVerdict(album, r))].sort((a, b) =>
    String(b.updated_at).localeCompare(String(a.updated_at))
  );
  const owner = profileById[album.created_by];

  useEscape(onClose, blocked);

  const best = tracks.reduce(
    (top, tr) => (trackRating(myReview, tr.id) > (top ? trackRating(myReview, top.id) : 0) ? tr : top),
    null
  );

  return (
    <div style={s.overlay} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, width: "min(920px, 94vw)", padding: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            gap: 20,
            padding: 22,
            borderBottom: `1px solid ${t.border}`,
            background: t.bgCard2,
            flexWrap: "wrap",
          }}>
          <div
            style={{
              width: 168,
              height: 168,
              flexShrink: 0,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${t.border}`,
              boxShadow: "0 8px 22px rgba(0,0,0,0.3)",
            }}>
            <Art t={t} album={album} />
          </div>

          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: t.textDim,
                marginBottom: 3,
              }}>
              {typeLabel(album.type)}
            </div>
            <h2 className="lo-selectable" style={{ fontSize: 23, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.25 }}>
              {album.title}
            </h2>
            <div className="lo-selectable" style={{ fontSize: 14, color: t.textMuted, marginTop: 3 }}>
              {album.artist || "Unknown artist"}
              {album.year ? ` · ${album.year}` : ""}
            </div>
            {album.link && (
              <div style={{ marginTop: 10 }}>
                <LinkButton t={t} url={album.link} />
              </div>
            )}
            {genres.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {genres.map((g) => (
                  <GenreChip key={g.id} t={t} genre={g} />
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ ...s.label, marginBottom: 6 }}>Your Score</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <Stars t={t} value={(myReview && Number(myReview.rating)) || 0} size={26} gap={3} onChange={onRateAlbum} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: myReview && myReview.rating > 0 ? scoreColor(myReview.rating) : t.textDim,
                    }}>
                    {myReview && myReview.rating > 0 ? `${points(myReview.rating)} / 10` : "Not scored"}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ ...s.label, marginBottom: 6 }}>Group Score</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, lineHeight: "28px", color: group.count ? scoreColor(group.avg) : t.textDim }}>
                    {group.count ? points(group.avg) : "—"}
                  </span>
                  <span style={{ fontSize: 12, color: t.textMuted }}>
                    {group.count ? `from ${group.count} member${group.count === 1 ? "" : "s"}` : "no scores yet"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Stat t={t} label="Tracklist" value={`${tracks.length}`} />
              <Stat t={t} label="You Rated" value={`${rated}/${reviewable(album).length}`} />
              <Stat t={t} label="Your Track Avg" value={avg ? points(avg) : "—"} color={avg ? scoreColor(avg) : null} />
            </div>
          </div>

          <button style={{ ...s.iconBtn, alignSelf: "flex-start", marginLeft: "auto" }} title="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "12px 22px 0" }}>
          <button style={s.segment(tab === "mine")} onClick={() => setTab("mine")}>
            Your Review
          </button>
          <button
            style={{ ...s.segment(tab === "everyone"), display: "inline-flex", alignItems: "center", gap: 7 }}
            onClick={() => setTab("everyone")}>
            Everyone's Reviews
            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{everyone.length}</span>
          </button>
        </div>

        <div style={{ padding: "14px 22px 22px", maxHeight: "50vh", overflowY: "auto" }}>
          {tab === "mine" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <h3 style={{ ...s.h2, marginBottom: 0 }}>Tracklist</h3>
                {best && trackRating(myReview, best.id) > 0 && (
                  <span style={{ fontSize: 12, color: t.textMuted }}>
                    Your favourite: <strong style={{ color: t.text }}>{best.title}</strong>
                  </span>
                )}
                {others.length > 0 && (
                  <span style={{ fontSize: 11.5, color: t.textDim, marginLeft: "auto" }}>Group column = everyone's average</span>
                )}
              </div>

              {tracks.length === 0 ? (
                <div style={s.empty}>
                  {canEdit ? (
                    <>
                      No tracks yet — use <strong>Edit Release</strong> to add the tracklist.
                    </>
                  ) : (
                    "No tracks yet — whoever added this release can add the tracklist."
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {tracks.map((tr, i) => (
                    <TrackRow
                      key={tr.id}
                      t={t}
                      i={i}
                      tr={tr}
                      rating={trackRating(myReview, tr.id)}
                      group={others.length ? groupTrackAvg(reviews, tr.id) : null}
                      onRate={(v) => onRateTrack(tr.id, v)}
                      onInterlude={canEdit ? () => onInterlude(tr.id, !tr.interlude) : null}
                    />
                  ))}
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <div style={s.label}>Your Review Notes</div>
                <textarea
                  style={{ ...s.input, minHeight: 82, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="What this release does, where it lands, who it's for… your friends will see this."
                  value={(myReview && myReview.notes) || ""}
                  onChange={(e) => onNotes(e.target.value)}
                />
              </div>
            </>
          ) : (
            <Everyone
              t={t}
              s={s}
              album={album}
              reviews={everyone}
              allReviews={reviews}
              userId={userId}
              profileById={profileById}
              onOpenProfile={onOpenProfile}
              onRateMine={() => setTab("mine")}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 22px",
            borderTop: `1px solid ${t.border}`,
            background: t.bgCard2,
            flexWrap: "wrap",
          }}>
          <span style={{ fontSize: 11, color: t.textDim, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {owner && <Avatar t={t} profile={owner} size={18} />}
            Added by{" "}
            {owner ? (
              <button style={{ ...s.linkBtn, fontSize: 11 }} onClick={() => onOpenProfile(owner.id)}>
                {nameOf(owner)}
              </button>
            ) : (
              "a former member"
            )}{" "}
            · {prettyDate(album.created_at)}
          </span>
          <div style={{ flex: 1 }} />
          {canEdit && (
            <button style={{ ...s.btnGhost, color: "#ef4444", borderColor: hexToRgba("#ef4444", 0.5) }} onClick={onDelete}>
              Delete
            </button>
          )}
          {myReview && (
            <button style={s.btnGhost} title="Remove your score, track ratings and notes" onClick={onClearReview}>
              Clear My Review
            </button>
          )}
          {canEdit && (
            <button style={s.btnGhost} onClick={onEdit}>
              Edit Release
            </button>
          )}
          <button style={s.btnGhost} title="Send this to someone's inbox" onClick={onRecommend}>
            ➤ Recommend
          </button>
          <button style={s.btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackRow({ t, i, tr, rating, group, onRate, onInterlude }) {
  const tint = rating > 0 ? hexToRgba(scoreColor(rating), 0.06) : "transparent";
  return (
    <div
      onMouseEnter={(e) => (e.currentTarget.style.background = t.bgHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = tint)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 11px",
        borderRadius: 9,
        background: tint,
        transition: "background 0.15s ease",
      }}>
      <span style={{ width: 20, textAlign: "right", fontSize: 12, fontWeight: 700, color: t.textDim, fontVariantNumeric: "tabular-nums" }}>
        {i + 1}
      </span>
      <span
        className="lo-selectable"
        style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: tr.interlude ? t.textMuted : t.text }}>
        {tr.title}
      </span>
      {/* only whoever can edit the release marks interludes; everyone else just sees them */}
      {(onInterlude || tr.interlude) && (
        <button
          title={
            !onInterlude
              ? "Marked as an interlude — no rating needed"
              : tr.interlude
                ? "Rate this track after all (changes it for everyone)"
                : "Mark as an interlude for everyone — no rating needed"
          }
          onClick={onInterlude || undefined}
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 700,
            cursor: onInterlude ? "pointer" : "default",
            whiteSpace: "nowrap",
            border: `1px solid ${tr.interlude ? t.border : "transparent"}`,
            background: tr.interlude ? t.bgCard2 : "transparent",
            color: t.textDim,
            opacity: tr.interlude ? 1 : 0.55,
          }}>
          {tr.interlude ? "♪ Interlude" : "♪"}
        </button>
      )}
      {tr.interlude ? (
        <span style={{ width: (group !== null ? 56 : 0) + 26 + 12 + 17 * 5 + 8, fontSize: 11.5, color: t.textDim, textAlign: "right" }}>
          no rating needed
        </span>
      ) : (
        <>
          {group !== null && (
            <span
              title="Group average for this track"
              style={{
                width: 44,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 0",
                borderRadius: 999,
                color: group ? scoreColor(group) : t.textDim,
                background: group ? hexToRgba(scoreColor(group), 0.1) : "transparent",
                fontVariantNumeric: "tabular-nums",
              }}>
              {group ? points(group) : "–"}
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              width: 26,
              textAlign: "right",
              color: rating ? scoreColor(rating) : t.textDim,
              fontVariantNumeric: "tabular-nums",
            }}>
            {rating ? points(rating) : "–"}
          </span>
          <Stars t={t} value={rating} size={17} onChange={onRate} />
        </>
      )}
    </div>
  );
}

function Everyone({ t, s, album, reviews, allReviews, userId, profileById, onOpenProfile, onRateMine }) {
  const [breakdown, setBreakdown] = useState(false);
  const tracks = reviewable(album);
  const raters = allReviews.filter((r) => Object.values(r.track_ratings || {}).some((v) => v > 0));

  if (!reviews.length) {
    return (
      <div style={{ textAlign: "center", padding: "30px 10px" }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>🎧</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Nobody has reviewed this yet</div>
        <div style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 14 }}>Be the first — your friends will see it in their feed.</div>
        <button style={s.btnPrimary} onClick={onRateMine}>
          Rate It
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tracks.length > 0 && raters.length > 1 && (
        <div style={{ ...s.card, padding: 12, background: t.bgCard2, boxShadow: "none" }}>
          <button
            style={{ ...s.linkBtn, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setBreakdown((v) => !v)}>
            <span style={{ fontSize: 8, transform: breakdown ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }}>▼</span>
            Track breakdown — how everyone rated each track
          </button>
          {breakdown && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
              {tracks.map((tr) => {
                const g = groupTrackAvg(allReviews, tr.id);
                return (
                  <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: "0 0 34%", minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tr.title}
                    </span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: t.border, overflow: "hidden" }}>
                      <div style={{ width: `${(g / 5) * 100}%`, height: "100%", background: g ? scoreColor(g) : "transparent" }} />
                    </div>
                    <span style={{ width: 28, textAlign: "right", fontSize: 12, fontWeight: 700, color: g ? scoreColor(g) : t.textDim }}>
                      {g ? points(g) : "–"}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", width: 200 }}>
                      {raters.map((r) => {
                        const v = trackRating(r, tr.id);
                        if (!v) return null;
                        return (
                          <span
                            key={r.user_id}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: scoreColor(v) }}>
                            <Avatar t={t} profile={profileById[r.user_id]} size={16} />
                            {points(v)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {reviews.map((r) => (
        <ReviewCard
          key={r.user_id}
          t={t}
          s={s}
          album={album}
          review={r}
          isMe={r.user_id === userId}
          profile={profileById[r.user_id]}
          onOpenProfile={() => onOpenProfile(r.user_id)}
        />
      ))}
    </div>
  );
}

export function ReviewCard({ t, s, album, review, isMe, profile, onOpenProfile }) {
  const [open, setOpen] = useState(false);
  const score = reviewScore(album, review);
  const tracks = reviewable(album);
  const rated = tracks.filter((tr) => trackRating(review, tr.id) > 0);
  const fav = rated.reduce((top, tr) => (!top || trackRating(review, tr.id) > trackRating(review, top.id) ? tr : top), null);
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${isMe ? hexToRgba(t.accent, 0.45) : t.border}`,
        background: isMe ? t.accentBg : t.bgCard,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }} onClick={onOpenProfile}>
          <Avatar t={t} profile={profile} size={34} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button style={{ ...s.linkBtn, fontSize: 13.5, color: t.text }} onClick={onOpenProfile}>
            {nameOf(profile)}
            {isMe ? " (you)" : ""}
          </button>
          <div style={{ fontSize: 11.5, color: t.textDim }}>
            {review.rating > 0 ? "Album score" : score > 0 ? "Track average" : "Notes only"} · {timeAgo(review.updated_at)}
          </div>
        </div>
        {score > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(score), lineHeight: 1.1 }}>{points(score)}</div>
            <Stars t={t} value={score} size={12} gap={1} />
          </div>
        )}
      </div>
      {(review.notes || "").trim() && (
        <p className="lo-selectable" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap", color: t.text }}>
          {review.notes.trim()}
        </p>
      )}
      {rated.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button style={{ ...s.linkBtn, display: "flex", alignItems: "center", gap: 6, color: t.textMuted }} onClick={() => setOpen((v) => !v)}>
            <span style={{ fontSize: 8, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }}>▼</span>
            {rated.length}/{tracks.length} tracks rated
            {fav ? ` · favourite: ${fav.title}` : ""}
          </button>
          {open && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
              {(album.tracks || []).map((tr, i) => {
                const v = trackRating(review, tr.id);
                return (
                  <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 4px", fontSize: 12.5 }}>
                    <span style={{ width: 18, textAlign: "right", color: t.textDim, fontWeight: 700, fontSize: 11 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, color: tr.interlude ? t.textDim : t.text }}>{tr.title}</span>
                    {tr.interlude ? (
                      <span style={{ fontSize: 11, color: t.textDim }}>interlude</span>
                    ) : (
                      <>
                        <span style={{ width: 24, textAlign: "right", fontWeight: 700, color: v ? scoreColor(v) : t.textDim }}>
                          {v ? points(v) : "–"}
                        </span>
                        <Stars t={t} value={v} size={12} gap={1} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
