import React, { useRef, useState } from "react";
import { useTheme, hexToRgba, COLOR_SCHEMES } from "../theme";
import { ui } from "../ui";
import { useData } from "../data.jsx";
import { api, isDemo } from "../api";
import { parseLifeOSBackup, planImport, runImport } from "../lifeosImport";
import { Switch } from "../album/bits.jsx";

export default function SettingsPage({ settings, setSettings, user, notify }) {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const set = (patch) => setSettings((p) => ({ ...p, ...patch }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
      <div>
        <h1 style={s.h1}>Settings</h1>
        <div style={{ color: t.textMuted, fontSize: 13 }}>Appearance is saved on this computer; everything else is shared with the group.</div>
      </div>

      <section style={s.card}>
        <h2 style={{ ...s.h2, marginBottom: 14 }}>Appearance</h2>
        <div style={s.label}>Colour Scheme</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {Object.entries(COLOR_SCHEMES).map(([id, cs]) => {
            const on = settings.colorScheme === id;
            return (
              <button
                key={id}
                onClick={() => set({ colorScheme: id })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: on ? t.text : t.textMuted,
                  background: on ? t.accentBg : "transparent",
                  border: `1px solid ${on ? t.accent : t.border}`,
                }}>
                <span style={{ display: "flex" }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: cs.green }} />
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: cs.orange, marginLeft: -4 }} />
                </span>
                {cs.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Switch t={t} label="Light Mode" value={!!settings.lightMode} onChange={() => set({ lightMode: !settings.lightMode })} />
          <Switch t={t} label="Animations" value={settings.animations !== false} onChange={() => set({ animations: settings.animations === false })} />
        </div>
      </section>

      <LifeOSImport t={t} s={s} notify={notify} />

      <section style={s.card}>
        <h2 style={{ ...s.h2, marginBottom: 6 }}>Account</h2>
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 14 }}>
          Signed in as <strong style={{ color: t.text }}>{user.email}</strong>
          {isDemo ? " (demo account on this computer)" : ""}.
        </div>
        <button style={{ ...s.btnGhost, color: "#ef4444", borderColor: hexToRgba("#ef4444", 0.5) }} onClick={async () => {
            await d.flushReviews();
            api.signOut();
          }}>
          Sign Out
        </button>
      </section>

      <section style={s.card}>
        <h2 style={{ ...s.h2, marginBottom: 6 }}>Server</h2>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
          {isDemo ? (
            <>
              <strong style={{ color: t.orange }}>Demo mode</strong> — no Supabase keys are set, so everything is stored on this
              computer and nobody else can see it. Follow the README to connect BeatShare to a Supabase project, then share the app
              with your friends.
            </>
          ) : (
            <>
              Connected to <strong style={{ color: t.text }}>{new URL(import.meta.env.VITE_SUPABASE_URL).host}</strong>. Everyone
              signed in to this server sees the same library and each other's reviews.
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function LifeOSImport({ t, s, notify }) {
  const d = useData();
  const fileRef = useRef(null);
  const [state, setState] = useState(null);

  const pick = async (file) => {
    if (!file) return;
    try {
      const backup = parseLifeOSBackup(await file.text());
      setState({ backup, plan: planImport(backup, d) });
    } catch (e) {
      setState({ error: e.message });
    }
  };

  const go = async () => {
    const { backup, plan } = state;
    setState({ ...state, running: true, progress: [0, plan.add + plan.review] });
    const res = await runImport(plan, backup, d, (n, total) => setState((st) => ({ ...st, progress: [n, total] })));
    setState({ result: res });
    notify(res.errors.length ? `Imported with ${res.errors.length} problem${res.errors.length === 1 ? "" : "s"}.` : "LifeOS reviews imported.");
  };

  return (
    <section style={s.card}>
      <h2 style={{ ...s.h2, marginBottom: 6 }}>Import From LifeOS</h2>
      <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
        Bring your Music Reviews across. In LifeOS, go to <strong>Settings → Your Data → Export Backup</strong>, then choose that
        file here. Releases already on BeatShare get your ratings attached; new ones are added to the shared library. Releases you've
        already reviewed here are left alone.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          pick(e.target.files && e.target.files[0]);
          e.target.value = "";
        }}
      />

      {!state || state.error || state.result ? (
        <>
          <button style={s.btnGhost} onClick={() => fileRef.current.click()}>
            Choose LifeOS Backup…
          </button>
          {state && state.error && <div style={{ fontSize: 12.5, color: "#ef4444", marginTop: 10 }}>{state.error}</div>}
          {state && state.result && (
            <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 10, lineHeight: 1.6 }}>
              Done — {state.result.done - state.result.errors.length} release{state.result.done - state.result.errors.length === 1 ? "" : "s"} imported.
              {state.result.errors.length > 0 && (
                <ul style={{ color: "#ef4444", marginTop: 6, paddingLeft: 18 }}>
                  {state.result.errors.slice(0, 8).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              [state.plan.add, "new to BeatShare — will be added", t.accent],
              [state.plan.review, "already here — your review will be attached", t.green],
              [state.plan.skip, "skipped (already reviewed, or nothing to import)", t.textDim],
            ].map(([n, label, c]) => (
              <div key={label} style={{ padding: "8px 12px", borderRadius: 9, border: `1px solid ${t.border}`, fontSize: 12.5, color: t.textMuted }}>
                <strong style={{ color: c, fontSize: 15, marginRight: 6 }}>{n}</strong>
                {label}
              </div>
            ))}
          </div>
          {state.running ? (
            <div>
              <div style={{ height: 8, borderRadius: 4, background: t.border, overflow: "hidden" }}>
                <div style={{ width: `${(state.progress[0] / Math.max(1, state.progress[1])) * 100}%`, height: "100%", background: t.accent, transition: "width 0.2s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                Importing {state.progress[0]} of {state.progress[1]}… keep BeatShare open.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btnGhost} onClick={() => setState(null)}>
                Cancel
              </button>
              <button style={{ ...s.btnPrimary, opacity: state.plan.add + state.plan.review ? 1 : 0.5 }} disabled={!(state.plan.add + state.plan.review)} onClick={go}>
                Import {state.plan.add + state.plan.review} Release{state.plan.add + state.plan.review === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
