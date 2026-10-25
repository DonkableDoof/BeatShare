import React, { useState } from "react";
import { hexToRgba } from "../theme";
import { nameOf, typeLabel } from "../music";
import { Art, Avatar, oneLine, useEscape } from "./bits.jsx";

/* Pick members to point at a release, with an optional note. It lands in their inbox. */
export default function RecommendDialog({ t, s, album, members, sentTo, onCancel, onSend }) {
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEscape(onCancel, sending);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const send = async () => {
    if (!picked.length || sending) return;
    setSending(true);
    setError("");
    try {
      await onSend(picked, note);
    } catch (e) {
      setError(e.message || String(e));
      setSending(false);
    }
  };

  return (
    <div style={s.overlay} onPointerDown={(e) => e.target === e.currentTarget && !sending && onCancel()}>
      <div style={{ ...s.modal, width: "min(460px, 94vw)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.border}` }}>
            <Art t={t} album={album} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...s.h2, ...oneLine }}>Recommend {typeLabel(album.type)}</h2>
            <div style={{ fontSize: 12.5, color: t.textMuted, ...oneLine }}>
              {album.title}
              {album.artist ? ` — ${album.artist}` : ""}
            </div>
          </div>
        </div>

        <div style={s.label}>Send To</div>
        {members.length === 0 ? (
          <div style={{ ...s.empty, paddingTop: 4 }}>Nobody else is in the group yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
            {members.map((p) => {
              const done = sentTo.has(p.id);
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  disabled={done}
                  onClick={() => toggle(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 9,
                    cursor: done ? "default" : "pointer",
                    textAlign: "left",
                    color: t.text,
                    opacity: done ? 0.5 : 1,
                    background: on ? t.accentBg : "transparent",
                    border: `1px solid ${on ? t.accent : t.border}`,
                  }}>
                  <Avatar t={t} profile={p} size={28} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, ...oneLine }}>{nameOf(p)}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: t.textMuted }}>@{p.username}</span>
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: done ? t.textDim : t.accent }}>
                    {done ? "Already sent" : on ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={s.label}>Note (optional)</div>
        <textarea
          style={{ ...s.input, minHeight: 64, resize: "vertical", lineHeight: 1.5 }}
          maxLength={300}
          placeholder="Why they'll love it, which track to start with…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && (
          <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 9, fontSize: 12.5, color: "#ef4444", background: hexToRgba("#ef4444", 0.1), border: `1px solid ${hexToRgba("#ef4444", 0.35)}` }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
          <button style={s.btnGhost} onClick={onCancel} disabled={sending}>
            Cancel
          </button>
          <button style={{ ...s.btnPrimary, opacity: picked.length && !sending ? 1 : 0.5 }} disabled={!picked.length || sending} onClick={send}>
            {sending ? "Sending…" : picked.length > 1 ? `Recommend to ${picked.length} Members` : "Recommend"}
          </button>
        </div>
      </div>
    </div>
  );
}
