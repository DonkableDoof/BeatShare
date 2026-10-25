import React from "react";
import { linkService, openLink } from "../links";

/* white on dark brand colours, black on light ones (so a pale logo tile stays readable) */
const glyphOn = (hex) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#000" : "#fff";
};

/* A release's link, shown as the service's logo in its brand colour. Sites
   without a known logo get a plain "open link" icon; hovering names the site. */
export default function LinkButton({ t, url, size = 34 }) {
  const { name, icon } = linkService(url);
  const glyph = icon ? glyphOn(icon.hex) : t.textMuted;
  return (
    <button
      title={`Open on ${name}`}
      aria-label={`Open on ${name}`}
      onClick={() => openLink(url)}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px) scale(1.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        padding: 0,
        borderRadius: Math.round(size * 0.28),
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: icon ? `#${icon.hex}` : t.bgCard,
        border: `1px solid ${icon ? "rgba(255,255,255,0.14)" : t.border}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "transform 0.16s ease",
      }}>
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} fill={icon ? glyph : "none"} aria-hidden="true">
        {icon ? (
          <path d={icon.path} />
        ) : (
          <g stroke={glyph} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6" />
            <path d="M20 4l-9 9" />
            <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
          </g>
        )}
      </svg>
    </button>
  );
}
