import { useEffect, useState } from "react";

/* App updates, published as GitHub releases (see scripts/release.mjs). The
   desktop app checks on start-up and every few hours; an update is downloaded,
   checked against the app's signing key, installed, and the app restarts. */

export const inApp = () => typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

const CHECK_EVERY = 6 * 60 * 60 * 1000;

/* status: idle | checking | current | available | downloading | restarting | error */
let state = { status: "idle", update: null, progress: 0, error: "", dismissed: "", version: "" };
const subs = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn(state));
};

export function useUpdates() {
  const [s, setS] = useState(state);
  useEffect(() => {
    subs.add(setS);
    return () => subs.delete(setS);
  }, []);
  return s;
}

export async function checkForUpdates() {
  if (!inApp() || state.status === "checking" || state.status === "downloading" || state.status === "restarting") return;
  set({ status: "checking", error: "" });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    set({ status: update ? "available" : "current", update: update || null });
  } catch (e) {
    const msg = String((e && e.message) || e);
    /* the latest GitHub release has no latest.json yet (it was published before updates existed) */
    set({ status: "error", error: /valid release json|404/i.test(msg) ? "the latest GitHub release has no update info (latest.json)." : msg });
  }
}

export async function installUpdate() {
  const update = state.update;
  if (!update) return;
  set({ status: "downloading", progress: 0, error: "" });
  try {
    let total = 0;
    let got = 0;
    await update.downloadAndInstall((ev) => {
      if (ev.event === "Started") total = ev.data.contentLength || 0;
      if (ev.event === "Progress") {
        got += ev.data.chunkLength;
        set({ progress: total ? Math.min(1, got / total) : 0 });
      }
    });
    /* on Windows the installer closes the app itself; elsewhere, restart into the new version */
    set({ status: "restarting", progress: 1 });
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (e) {
    set({ status: "error", error: String((e && e.message) || e) });
  }
}

export const dismissUpdate = () => set({ dismissed: state.update ? state.update.version : "" });

/* start checking in the background; returns a stop function */
export function startUpdateChecks() {
  if (!inApp()) return () => {};
  import("@tauri-apps/api/app").then(({ getVersion }) => getVersion().then((v) => set({ version: v })));
  const first = setTimeout(checkForUpdates, 4000);
  const every = setInterval(checkForUpdates, CHECK_EVERY);
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
