import React, { useEffect } from "react";
import { useTheme } from "../theme";
import { ui } from "../ui";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  const t = useTheme();
  const s = ui(t);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  return (
    <div style={{ ...s.overlay, zIndex: 400 }} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...s.modal, width: 360 }}>
        <h2 style={{ ...s.h2, marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button style={s.btnGhost} onClick={onCancel}>Cancel</button>
          <button
            autoFocus
            style={{ ...s.btnPrimary, background: danger ? "#ef4444" : t.accent }}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
