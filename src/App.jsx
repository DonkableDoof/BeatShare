import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeCtx, buildTheme, hexToRgba } from "./theme";
import { usePersistentStorage } from "./storage";
import { ui } from "./ui";
import { api, isDemo } from "./api";
import { DataProvider, useData } from "./data.jsx";
import { AlbumHost } from "./album/AlbumHost.jsx";
import { Avatar } from "./album/bits.jsx";
import { nameOf } from "./music";
import AuthPage from "./pages/AuthPage.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import InboxPage from "./pages/InboxPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import MembersPage from "./pages/MembersPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import { startUpdateChecks } from "./updates";

const NAV = [
  { id: "feed", label: "Feed", icon: "◉" },
  { id: "library", label: "Library", icon: "▦" },
  { id: "inbox", label: "Inbox", icon: "✉" },
  { id: "members", label: "Members", icon: "☺" },
];

const FONT = "'DM Sans', 'Nunito', system-ui, sans-serif";

export default function App() {
  const [settings, setSettings] = usePersistentStorage("bs-settings", {
    lightMode: false,
    colorScheme: "purple",
    animations: true,
  });
  const t = useMemo(() => buildTheme(settings.colorScheme, settings.lightMode), [settings.colorScheme, settings.lightMode]);
  const [user, setUser] = useState(undefined);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    api.getUser().then(setUser, () => setUser(null));
    return api.onAuthChange(setUser);
  }, []);

  useEffect(() => startUpdateChecks(), []);

  useEffect(() => {
    document.body.classList.toggle("no-anim", settings.animations === false);
  }, [settings.animations]);

  /* no browser right-click menu anywhere (releases bring their own);
     text fields keep theirs for copy and paste */
  useEffect(() => {
    const onMenu = (e) => {
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
    };
    window.addEventListener("contextmenu", onMenu);
    return () => window.removeEventListener("contextmenu", onMenu);
  }, []);

  useEffect(() => {
    document.body.style.background = t.bg;
  }, [t.bg]);

  const notify = useCallback((msg, kind = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, kind, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 6000 : 3200);
  }, []);
  const onError = useCallback((msg) => notify(msg, "error"), [notify]);

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{ height: "100vh", fontFamily: FONT, background: t.bg, color: t.text, transition: "background 0.3s ease, color 0.3s ease" }}>
        {user === undefined ? (
          <Splash t={t} />
        ) : !user ? (
          <AuthPage />
        ) : (
          <DataProvider key={user.id} user={user} onError={onError}>
            <Shell t={t} user={user} settings={settings} setSettings={setSettings} notify={notify} />
          </DataProvider>
        )}
        <UpdateBanner t={t} />
        {toast && <Toast key={toast.id} t={t} toast={toast} onClose={() => setToast(null)} />}
      </div>
    </ThemeCtx.Provider>
  );
}

function Shell({ t, user, settings, setSettings, notify }) {
  const d = useData();
  const [page, setPage] = useState({ id: "feed" });
  const [history, setHistory] = useState([]);

  const go = (next) => {
    setHistory((h) => [...h.slice(-20), page]);
    setPage(next);
  };
  const back = () => {
    setPage(history[history.length - 1] || { id: "feed" });
    setHistory((h) => h.slice(0, -1));
  };
  const openProfile = (userId) => go({ id: "profile", userId });

  useEffect(() => {
    document.documentElement.style.setProperty("--lo-sidebar", "220px");
  }, []);

  if (d.status === "loading") return <Splash t={t} label="Loading your group's library…" />;
  if (d.status === "error" && !d.profiles.length) return <Splash t={t} label="Couldn't load BeatShare." onRetry={d.reload} />;
  if (!d.me) return <Splash t={t} label="Setting up your profile…" onRetry={d.reload} onSignOut={() => api.signOut()} />;

  const isMine = page.id === "profile" && page.userId === d.userId;

  const s = {
    sidebar: {
      width: 220,
      minWidth: 220,
      background: t.bgCard,
      borderRight: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    logo: {
      padding: "18px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderBottom: `1px solid ${t.border}`,
      whiteSpace: "nowrap",
    },
    navItem: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 16px",
      margin: "2px 8px",
      borderRadius: 8,
      cursor: "pointer",
      position: "relative",
      transition: "background 0.18s ease, color 0.18s ease, transform 0.18s ease",
      background: active ? t.accentBg : "transparent",
      color: active ? t.accent : t.textMuted,
      fontWeight: active ? 600 : 400,
      fontSize: 14,
      whiteSpace: "nowrap",
    }),
    main: {
      flex: 1,
      overflow: "auto",
      padding: "28px 32px 48px",
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      minHeight: 0,
    },
  };

  const navItem = (n, active, onClick, extra) => (
    <div
      key={n.id}
      style={s.navItem(active)}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = t.bgHover;
        e.currentTarget.style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
        e.currentTarget.style.transform = "translateX(0)";
      }}>
      {n.icon}
      {n.label}
      {extra}
    </div>
  );

  const unrated = d.albums.filter((a) => !d.myReviews[a.id]).length;
  const badge = (n, title) => (
    <span title={title} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: t.accentBg, color: t.accent }}>
      {n}
    </span>
  );

  return (
    <AlbumHost onOpenProfile={openProfile} notify={notify}>
      <div style={{ display: "flex", height: "100%" }}>
        <aside style={s.sidebar}>
          <div style={s.logo}>
            <img src="./app-icon.svg" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>BeatShare</span>
          </div>
          <nav style={{ flex: 1, paddingTop: 10 }}>
            {NAV.map((n) =>
              navItem(
                { ...n, icon: <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span> },
                page.id === n.id || (n.id === "members" && page.id === "profile" && !isMine),
                () => go({ id: n.id }),
                n.id === "library" && unrated > 0
                  ? badge(unrated, `${unrated} release${unrated === 1 ? "" : "s"} you haven't rated`)
                  : n.id === "inbox" && d.unread > 0
                    ? badge(d.unread, `${d.unread} new recommendation${d.unread === 1 ? "" : "s"}`)
                    : null
              )
            )}
          </nav>
          {isDemo && (
            <div
              title="No Supabase keys set — data stays on this computer"
              style={{ margin: "0 12px 10px", padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, color: t.orange, background: hexToRgba(t.orange, 0.1), border: `1px solid ${hexToRgba(t.orange, 0.3)}` }}>
              Demo mode · local only
            </div>
          )}
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "8px 0 12px" }}>
            {navItem(
              {
                id: "me",
                label: <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{nameOf(d.me)}</span>,
                icon: <Avatar t={t} profile={d.me} size={22} />,
              },
              isMine,
              () => openProfile(d.userId)
            )}
            {navItem(
              { id: "settings", label: "Settings", icon: <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>⚙</span> },
              page.id === "settings",
              () => go({ id: "settings" })
            )}
          </div>
        </aside>

        <main style={s.main}>
          <div key={page.id + (page.userId || "")} className="lo-page-enter" style={{ animation: "lo-page 0.2s ease both" }}>
            {page.id === "feed" ? (
              <FeedPage onOpenProfile={openProfile} />
            ) : page.id === "library" ? (
              <LibraryPage />
            ) : page.id === "inbox" ? (
              <InboxPage onOpenProfile={openProfile} />
            ) : page.id === "members" ? (
              <MembersPage onOpenProfile={openProfile} />
            ) : page.id === "profile" ? (
              <ProfilePage userId={page.userId} onBack={back} notify={notify} />
            ) : (
              <SettingsPage settings={settings} setSettings={setSettings} user={user} notify={notify} />
            )}
          </div>
        </main>
      </div>
    </AlbumHost>
  );
}

function Splash({ t, label, onRetry, onSignOut }) {
  const s = ui(t);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <img src="./app-icon.svg" alt="" width={56} height={56} style={{ borderRadius: 14, animation: "lo-pulse 1.6s ease-in-out infinite" }} />
      {label && <div style={{ fontSize: 13.5, color: t.textMuted }}>{label}</div>}
      {(onRetry || onSignOut) && (
        <div style={{ display: "flex", gap: 8 }}>
          {onRetry && (
            <button style={s.btnGhost} onClick={onRetry}>
              Try Again
            </button>
          )}
          {onSignOut && (
            <button style={s.btnGhost} onClick={onSignOut}>
              Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Toast({ t, toast, onClose }) {
  const err = toast.kind === "error";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 600,
        maxWidth: 380,
        padding: "11px 16px",
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        color: err ? "#fff" : t.text,
        background: err ? "#dc2626" : t.bgCard,
        border: `1px solid ${err ? "#dc2626" : t.border}`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        animation: "lo-toast-up 0.25s ease both",
      }}>
      {toast.msg}
    </div>
  );
}
