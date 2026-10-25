import React from "react";
import { releaseType, unratedTracks, scoreColor, points } from "../music";
import { Art, GenreChip, ScorePill, oneLine } from "./bits.jsx";

/* A release in the gallery. The corner pill is the group's score; the
   bottom strip carries yours. `label` swaps the group score for someone
   else's (on a profile, it's that member's score). */
export default function Cover({ t, album, genres, group, myReview, myScore, label, onOpen, onContextMenu }) {
  const tracks = (album.tracks || []).length;
  const toRate = myReview ? unratedTracks(album, myReview).length : 0;
  return (
    <button
      onClick={onOpen}
      onContextMenu={onContextMenu}
      title={`${album.title}${album.artist ? ` — ${album.artist}` : ""}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.filter = "brightness(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.filter = "none";
      }}
      style={{
        display: "block",
        textAlign: "left",
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: t.text,
        transition: "transform 0.2s cubic-bezier(0.22, 0.85, 0.3, 1), filter 0.2s ease",
      }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${t.border}`,
          boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
          background: t.bgCard2,
        }}>
        <Art t={t} album={album} />
        {!myReview ? (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "3px 8px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              background: "rgba(0,0,0,0.62)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}>
            ✦ Not rated
          </span>
        ) : (
          toRate > 0 && (
            <span
              title={`${toRate} track${toRate === 1 ? "" : "s"} you haven't rated yet`}
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                background: "rgba(0,0,0,0.62)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}>
              ◔ {toRate} to rate
            </span>
          )
        )}
        {group && group.avg > 0 && (
          <ScorePill
            score={group.avg}
            label={label}
            style={{ position: "absolute", top: 8, right: 8 }}
          />
        )}
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            padding: "22px 10px 8px",
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.86)",
            background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
          }}>
          <span style={{ flex: 1 }}>
            {releaseType(album.type).short} – {tracks} track{tracks === 1 ? "" : "s"}
          </span>
          {myScore > 0 && (
            <span style={{ fontWeight: 700, color: "#fff" }}>
              You <span style={{ color: scoreColor(myScore) }}>★</span> {points(myScore)}
            </span>
          )}
        </span>
      </div>
      <div style={{ marginTop: 9 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, ...oneLine }}>{album.title}</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2, ...oneLine }}>
          {album.artist || "Unknown artist"}
          {album.year ? ` · ${album.year}` : ""}
        </div>
        {genres.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, maxHeight: 20, overflow: "hidden" }}>
            {genres.map((g) => (
              <GenreChip key={g.id} t={t} genre={g} small />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
