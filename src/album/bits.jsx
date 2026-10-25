import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { hexToRgba } from "../theme";
import { scoreColor, points, nameOf, ratingWord } from "../music";

/* one line, cut with … — keeps every card in the grid the same height */
export const oneLine = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export function Art({ t, album }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [album.cover_url]);

  if (album.cover_url && !broken) {
    return (
      <img
        src={album.cover_url}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }
  const initial = (album.title || "").trim().slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(140deg, ${hexToRgba(t.accent, 0.3)}, ${hexToRgba(t.orange, 0.22)})`,
        color: t.text,
        fontSize: 32,
        fontWeight: 700,
        opacity: 0.9,
      }}>
      {initial || "♫"}
    </div>
  );
}

export function Avatar({ t, profile, size = 32, ring }) {
  const [broken, setBroken] = useState(false);
  const url = profile && profile.avatar_url;
  useEffect(() => setBroken(false), [url]);
  const initial = nameOf(profile).trim().slice(0, 1).toUpperCase();
  return (
    <span
      title={profile ? `${nameOf(profile)} (@${profile.username})` : ""}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(140deg, ${hexToRgba(t.accent, 0.55)}, ${hexToRgba(t.orange, 0.45)})`,
        color: "#fff",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        boxShadow: ring ? `0 0 0 2px ${t.bgCard}, 0 0 0 4px ${ring}` : "none",
      }}>
      {url && !broken ? (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        initial || "?"
      )}
    </span>
  );
}

export function Stars({ value = 0, size = 18, onChange, t, gap = 2 }) {
  const [hover, setHover] = useState(0);
  /* where the hovered star sits on screen — the label is drawn at the top
     of the page, so a popup's edges can't clip it */
  const [anchor, setAnchor] = useState(null);
  const interactive = !!onChange;
  const shown = hover || value;

  /* left half of a star is the .5 — a 4.5 is a real verdict */
  const at = (e, n) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? n - 0.5 : n;
  };

  return (
    <span style={{ display: "inline-flex", gap, alignItems: "center" }} onMouseLeave={() => interactive && setHover(0)}>
      {interactive && hover > 0 && anchor && createPortal(
        <span
          style={{
            position: "fixed",
            left: anchor.x,
            top: anchor.y - 6,
            transform: "translate(-50%, -100%)",
            zIndex: 900,
            pointerEvents: "none",
            fontFamily: anchor.font,
            whiteSpace: "nowrap",
            padding: "3px 9px",
            borderRadius: 7,
            fontSize: 11.5,
            fontWeight: 700,
            lineHeight: 1.4,
            color: "#fff",
            background: "rgba(12,12,18,0.92)",
            border: `1px solid ${scoreColor(hover)}`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            animation: "lo-fade 0.12s ease both",
          }}>
          {ratingWord(hover)} <span style={{ color: scoreColor(hover), marginLeft: 3 }}>{points(hover)}</span>
        </span>,
        document.body
      )}
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, shown - (n - 1)));
        const star = (
          <span
            style={{
              position: "relative",
              display: "inline-block",
              width: size,
              height: size,
              fontSize: size,
              lineHeight: `${size}px`,
            }}>
            <span style={{ color: t.borderLight || t.border }}>★</span>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${fill * 100}%`,
                overflow: "hidden",
                color: scoreColor(shown),
                transition: "width 0.12s ease, color 0.12s ease",
              }}>
              ★
            </span>
          </span>
        );
        if (!interactive) return <React.Fragment key={n}>{star}</React.Fragment>;
        return (
          <button
            key={n}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(at(e, n));
              setAnchor({ x: r.left + r.width / 2, y: r.top, font: getComputedStyle(e.currentTarget).fontFamily });
            }}
            onClick={(e) => {
              const v = at(e, n);
              onChange(v === value ? 0 : v);
            }}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              lineHeight: 0,
            }}>
            {star}
          </button>
        );
      })}
    </span>
  );
}

export function Stat({ t, label, value, color }) {
  return (
    <div
      style={{
        padding: "7px 12px",
        borderRadius: 9,
        background: color ? hexToRgba(color, 0.12) : t.bgCard,
        border: `1px solid ${color ? hexToRgba(color, 0.35) : t.border}`,
        minWidth: 72,
      }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted, letterSpacing: 0.2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || t.text, marginTop: 1 }}>{value}</div>
    </div>
  );
}

/* a score as a small dark pill, for laying over cover art */
export function ScorePill({ score, label, style }) {
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        color: "#fff",
        background: "rgba(0,0,0,0.62)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        whiteSpace: "nowrap",
        ...style,
      }}>
      {label ? <span style={{ opacity: 0.75, fontWeight: 600 }}>{label} </span> : null}
      <span style={{ color: scoreColor(score) }}>★</span> {points(score)}
    </span>
  );
}

export function GenreChip({ t, genre, on = true, small, onClick, onRemove }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: small ? "1px 7px" : "4px 10px",
        borderRadius: 999,
        fontSize: small ? 10.5 : 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        lineHeight: "16px",
        cursor: onClick ? "pointer" : "default",
        border: `1px solid ${on ? hexToRgba(genre.color, 0.5) : t.border}`,
        background: on ? hexToRgba(genre.color, 0.14) : "transparent",
        color: on ? genre.color : t.textMuted,
        transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
      }}>
      <span
        style={{
          width: small ? 5 : 6,
          height: small ? 5 : 6,
          borderRadius: "50%",
          background: genre.color,
          opacity: on ? 1 : 0.5,
          flexShrink: 0,
        }}
      />
      {genre.name}
      {onRemove && (
        <span
          role="button"
          title={`Remove ${genre.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{ marginLeft: 1, marginRight: -2, fontSize: small ? 10 : 11, opacity: 0.7, cursor: "pointer", lineHeight: 1 }}>
          ✕
        </span>
      )}
    </Tag>
  );
}

export function Check({ t, on, color }) {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1.5px solid ${on ? color : t.border}`,
        background: on ? color : "transparent",
        color: "#fff",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        transition: "background 0.12s ease, border-color 0.12s ease",
      }}>
      {on ? "✓" : ""}
    </span>
  );
}

export function Switch({ t, label, title, value, onChange }) {
  return (
    <button
      title={title}
      onClick={onChange}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        height: 33,
        padding: "0 4px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: value ? t.text : t.textMuted,
        fontSize: 12.5,
        fontWeight: 600,
      }}>
      {label}
      <span
        style={{
          position: "relative",
          width: 36,
          height: 20,
          borderRadius: 10,
          flexShrink: 0,
          background: value ? t.accent : t.bgCard2,
          border: `1px solid ${value ? t.accent : t.border}`,
          transition: "all 0.25s",
        }}>
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: "#fff",
            transition: "left 0.25s",
          }}
        />
      </span>
    </button>
  );
}

/* Escape closes the topmost dialog */
export function useEscape(fn, blocked = false) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !blocked && fn();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fn, blocked]);
}
