import React from "react";
import { hexToRgba } from "../theme";
import { useUpdates, installUpdate, dismissUpdate } from "../updates";

/* Floating card shown when a newer BeatShare is published on GitHub. */
export default function UpdateBanner({ t }) {
  const u = useUpdates();
  const busy = u.status === "downloading" || u.status === "restarting";
  const failed = u.status === "error" && u.update;
  if (!u.update || (!busy && !failed && u.status !== "available") || (u.dismissed === u.update.version && !busy)) return null;

  const notes = (u.update.body || "").trim();
  const btn = {
    padding: "7px 13px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 650,
        width: 330,
        padding: 16,
        borderRadius: 12,
        background: t.bgCard,
        border: `1px solid ${hexToRgba(t.accent, 0.5)}`,
        boxShadow: "0 14px 40px rgba(0,0,0,0.4)",
        animation: "lo-toast-up 0.25s ease both",
        color: t.text,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>⬆</span>
        <div style={{ fontSize: 14, fontWeight: 700 }}>BeatShare {u.update.version} is out</div>
      </div>
      <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>
        You have {u.update.currentVersion}.{" "}
        {busy
          ? u.status === "restarting"
            ? "Installing — BeatShare will restart in a moment."
            : "Downloading the update…"
          : "Install it now and BeatShare restarts on the new version."}
      </div>
      {notes && !busy && (
        <div
          className="lo-selectable"
          style={{ marginTop: 8, maxHeight: 110, overflowY: "auto", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", color: t.textMuted, padding: "7px 9px", borderRadius: 8, background: t.bgCard2 }}>
          {notes}
        </div>
      )}
      {busy && (
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: t.border, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(u.progress * 100)}%`, height: "100%", background: t.accent, transition: "width 0.2s ease" }} />
        </div>
      )}
      {failed && <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>Couldn't install: {u.error}</div>}
      {!busy && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button style={{ ...btn, background: "transparent", color: t.textMuted, border: `1px solid ${t.border}` }} onClick={dismissUpdate}>
            Later
          </button>
          <button style={{ ...btn, background: t.accent, color: "#fff", border: "none" }} onClick={installUpdate}>
            {failed ? "Try Again" : "Install & Restart"}
          </button>
        </div>
      )}
    </div>
  );
}
