export function ui(t) {
  return {
    h1: { fontSize: 26, fontWeight: 700, letterSpacing: -0.5 },
    h2: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 },
    card: {
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      boxShadow: t.shadow,
      padding: 18,
    },
    btnPrimary: {
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 600, background: t.accent, color: "#fff",
    },
    btnGhost: {
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: 8, cursor: "pointer",
      fontSize: 13, fontWeight: 600, background: "transparent",
      color: t.textMuted, border: `1px solid ${t.border}`,
    },
    iconBtn: {
      width: 28, height: 28, borderRadius: 7, border: `1px solid ${t.border}`,
      background: "transparent", color: t.textMuted, cursor: "pointer", fontSize: 13,
      display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
    },
    linkBtn: {
      background: "none", border: "none", color: t.accent,
      fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
    },
    input: {
      width: "100%", background: t.bgCard2, color: t.text,
      border: `1px solid ${t.border}`, borderRadius: 8,
      padding: "9px 12px", fontSize: 14, outline: "none",
      colorScheme: t.isLight ? "light" : "dark",
    },
    label: { display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 },
    row: { marginTop: 12 },
    overlay: {
      position: "fixed", top: 0, right: 0, bottom: 0, left: "var(--lo-sidebar, 0px)",
      background: "rgba(0,0,0,0.42)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "32px 16px", overflowY: "auto", zIndex: 100,
      animation: "lo-fade 0.26s ease both",
    },
    modal: {
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14,
      padding: 24, margin: "auto",
      boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
      animation: "lo-pop 0.3s cubic-bezier(0.34, 1.25, 0.64, 1) both",
    },
    segment: (active) => ({
      padding: "7px 16px", borderRadius: 8, cursor: "pointer",
      fontSize: 13, fontWeight: 600,
      background: active ? t.accentBg : "transparent",
      color: active ? t.accent : t.textMuted,
      border: `1px solid ${active ? t.accent : t.border}`,
    }),
    empty: { fontSize: 13, color: t.textDim, padding: "18px 2px" },
  };
}
