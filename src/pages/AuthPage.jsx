import React, { useEffect, useState } from "react";
import { useTheme, hexToRgba } from "../theme";
import { ui } from "../ui";
import { api, isDemo } from "../api";

const USERNAME = /^[a-z0-9_]{3,20}$/;

const friendlyAuth = (msg) => {
  if (/invalid login/i.test(msg)) return "That email and password don't match an account.";
  if (/already registered/i.test(msg)) return "There's already an account with that email — sign in instead.";
  if (/email not confirmed/i.test(msg)) return "Confirm your email first — check your inbox for the link.";
  if (/invalid invite code/i.test(msg)) return "That invite code isn't valid, or it's already been used.";
  if (/database error saving new user/i.test(msg)) return "That invite code or username was just used by someone else — check both and try again.";
  if (/failed to fetch/i.test(msg)) return "Couldn't reach BeatShare's server — check your connection.";
  return msg;
};

export default function AuthPage() {
  const t = useTheme();
  const s = ui(t);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nameFree, setNameFree] = useState(null);
  const [invite, setInvite] = useState("");
  const [inviteOk, setInviteOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const uname = username.trim().toLowerCase();
  const validName = USERNAME.test(uname);

  /* check the username as it's typed, once typing pauses */
  useEffect(() => {
    setNameFree(null);
    if (mode !== "signup" || !validName) return;
    const id = setTimeout(() => {
      api.usernameAvailable(uname).then(setNameFree, () => setNameFree(null));
    }, 350);
    return () => clearTimeout(id);
  }, [uname, mode, validName]);

  /* …and the invite code */
  const code = invite.trim().toUpperCase();
  useEffect(() => {
    setInviteOk(null);
    if (mode !== "signup" || code.length < 6) return;
    const id = setTimeout(() => {
      api.inviteAvailable(code).then(setInviteOk, () => setInviteOk(null));
    }, 350);
    return () => clearTimeout(id);
  }, [code, mode]);

  const canSubmit =
    !busy &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    password.length >= 6 &&
    (mode === "signin" || (validName && nameFree !== false && (code.length >= 6 || isDemo) && inviteOk !== false));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "signin") {
        await api.signIn({ email: email.trim(), password });
      } else {
        if (!(await api.inviteAvailable(code))) throw new Error("invalid invite code");
        if (!(await api.usernameAvailable(uname))) throw new Error("That username is taken.");
        const user = await api.signUp({
          email: email.trim(),
          password,
          username: uname,
          displayName: displayName.trim() || uname,
          inviteCode: code,
        });
        if (!user) {
          setInfo("Account created — check your email for a confirmation link, then sign in here.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(friendlyAuth(err.message || String(err)));
    }
    setBusy(false);
  };

  const field = (label, input, hint) => (
    <div style={{ marginBottom: 12 }}>
      <div style={s.label}>{label}</div>
      {input}
      {hint}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: `radial-gradient(1200px 600px at 20% 0%, ${hexToRgba(t.accent, 0.16)}, transparent 60%), radial-gradient(900px 500px at 100% 100%, ${hexToRgba(t.orange, 0.12)}, transparent 60%), ${t.bg}`,
      }}>
      <div style={{ width: "min(420px, 100%)", animation: "lo-pop 0.4s cubic-bezier(0.34, 1.25, 0.64, 1) both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 22 }}>
          <img src="./app-icon.svg" alt="" width={46} height={46} style={{ borderRadius: 11 }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>BeatShare</div>
            <div style={{ fontSize: 12.5, color: t.textMuted }}>Rate records with your friends</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ ...s.card, padding: 24 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {[
              ["signin", "Sign In"],
              ["signup", "Create Account"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                style={{ ...s.segment(mode === id), flex: 1 }}
                onClick={() => {
                  setMode(id);
                  setError("");
                }}>
                {label}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <>
              {field(
                "Invite Code",
                <input
                  style={{ ...s.input, fontFamily: "ui-monospace, Consolas, monospace", letterSpacing: 1, borderColor: inviteOk === false ? "#ef4444" : t.border }}
                  maxLength={32}
                  placeholder="XXXXX-XXXXX"
                  autoFocus
                  value={invite}
                  onChange={(e) => setInvite(e.target.value.toUpperCase().replace(/\s/g, ""))}
                />,
                <div style={{ fontSize: 11.5, marginTop: 5, color: inviteOk === false ? "#ef4444" : inviteOk ? t.green : t.textDim }}>
                  {inviteOk === false
                    ? "That code isn't valid, or it's already been used."
                    : inviteOk
                      ? "✓ Code accepted"
                      : code.length >= 6
                        ? "Checking…"
                        : isDemo
                          ? "Demo mode: the first account on this computer doesn't need one."
                          : "BeatShare is invite-only. Ask the group's admin for a code."}
                </div>
              )}
              {field(
                "Display Name",
                <input style={s.input} maxLength={40} placeholder="Alex" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              )}
              {field(
                "Username",
                <input
                  style={{ ...s.input, borderColor: uname && (!validName || nameFree === false) ? "#ef4444" : t.border }}
                  maxLength={20}
                  placeholder="alex_listens"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                />,
                uname && (
                  <div style={{ fontSize: 11.5, marginTop: 5, color: !validName || nameFree === false ? "#ef4444" : nameFree ? t.green : t.textDim }}>
                    {!validName
                      ? "3–20 characters: lowercase letters, numbers and underscores."
                      : nameFree === false
                        ? "That username is taken."
                        : nameFree
                          ? "✓ Available"
                          : "Checking…"}
                  </div>
                )
              )}
            </>
          )}
          {field(
            "Email",
            <input style={s.input} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          {field(
            "Password",
            <input
              style={s.input}
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "At least 6 characters" : ""}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {error && (
            <div style={{ padding: "9px 12px", borderRadius: 9, fontSize: 12.5, color: "#ef4444", background: hexToRgba("#ef4444", 0.1), border: `1px solid ${hexToRgba("#ef4444", 0.35)}`, marginBottom: 12 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ padding: "9px 12px", borderRadius: 9, fontSize: 12.5, color: t.accent, background: t.accentBg, border: `1px solid ${hexToRgba(t.accent, 0.35)}`, marginBottom: 12 }}>
              {info}
            </div>
          )}

          <button type="submit" style={{ ...s.btnPrimary, width: "100%", justifyContent: "center", padding: "10px 16px", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }} disabled={!canSubmit}>
            {busy ? "One moment…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {isDemo && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, fontSize: 12, lineHeight: 1.55, color: t.textMuted, border: `1px dashed ${t.border}`, textAlign: "center" }}>
            <strong style={{ color: t.orange }}>Demo mode.</strong> No Supabase keys are set, so accounts and reviews are stored on this
            computer only. See the README to connect BeatShare to Supabase and share with friends.
          </div>
        )}
      </div>
    </div>
  );
}
