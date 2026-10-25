import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { oneLine } from "../album/bits.jsx";

/* The app's own right-click menu, opened at the pointer and kept on screen. */
export default function ContextMenu({ t, x, y, title, items, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onClose, { passive: true });
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        zIndex: 700,
        minWidth: 200,
        maxWidth: 280,
        padding: 5,
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        boxShadow: "0 12px 34px rgba(0,0,0,0.4)",
        transformOrigin: "top left",
        animation: "lo-pop-tl 0.12s ease-out both",
      }}>
      {title && (
        <div style={{ padding: "6px 10px 7px", fontSize: 11.5, fontWeight: 700, color: t.textDim, borderBottom: `1px solid ${t.border}`, marginBottom: 4, ...oneLine }}>
          {title}
        </div>
      )}
      {items.map((it) => (
        <button
          key={it.label}
          role="menuitem"
          onClick={() => {
            onClose();
            it.onClick();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = it.danger ? "rgba(239,68,68,0.12)" : t.bgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 7,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            fontSize: 13,
            fontWeight: 600,
            color: it.danger ? "#ef4444" : t.text,
          }}>
          <span style={{ width: 16, textAlign: "center", opacity: 0.85 }}>{it.icon}</span>
          {it.label}
        </button>
      ))}
    </div>
  );
}
