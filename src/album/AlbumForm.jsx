import React, { useEffect, useRef, useState } from "react";
import { hexToRgba } from "../theme";
import { RELEASE_TYPES, typeLabel, stripTrackNo, splitTracks, similarReleases, sameRelease, nameOf } from "../music";
import { readFile, shrinkImage } from "../images";
import { GenrePicker } from "./Genres.jsx";
import { Art, oneLine, useEscape } from "./bits.jsx";

const MAX_COVER = 640;

export const blankAlbum = () => ({
  id: crypto.randomUUID(),
  title: "",
  artist: "",
  type: "album",
  genres: [],
  year: "",
  cover_url: "",
  tracks: [],
});

export default function AlbumForm({ t, s, mode, initial, albums, profileById, genres, onCreateGenre, onCancel, onSave, onOpenExisting }) {
  const [title, setTitle] = useState(initial.title || "");
  const [artist, setArtist] = useState(initial.artist || "");
  const [type, setType] = useState(initial.type || "album");
  const [picked, setPicked] = useState(initial.genres || []);
  const [year, setYear] = useState(initial.year || "");
  const [cover, setCover] = useState(initial.cover_url || "");
  const [tracks, setTracks] = useState(initial.tracks || []);
  const [newTrack, setNewTrack] = useState("");
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const addRef = useRef(null);

  useEscape(onCancel, saving);

  const takeFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      setCover(await shrinkImage(await readFile(file), MAX_COVER));
    } finally {
      setBusy(false);
    }
  };

  /* paste an image anywhere in the form and it becomes the cover */
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData ? [...e.clipboardData.items] : [];
      const item = items.find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      takeFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const addTracks = (titles) => {
    if (!titles.length) return;
    setTracks((p) => [...p, ...titles.map((tt) => ({ id: crypto.randomUUID(), title: tt, interlude: false }))]);
  };

  const commitNew = () => {
    const name = stripTrackNo(newTrack, false);
    if (!name) return;
    addTracks([name]);
    setNewTrack("");
  };

  const move = (i, to) => {
    if (to < 0 || to >= tracks.length) return;
    const next = [...tracks];
    const [m] = next.splice(i, 1);
    next.splice(to, 0, m);
    setTracks(next);
  };

  const similar = similarReleases(albums, title, artist, initial.id);
  const exact = similar.find((a) => sameRelease(a, { title, artist }));
  const canSave = title.trim().length > 0 && !exact && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...initial,
        title: title.trim(),
        artist: artist.trim(),
        type,
        genres: picked,
        year: String(year).trim(),
        cover_url: cover,
        tracks: tracks.map((tr) => ({ ...tr, title: tr.title.trim() })).filter((tr) => tr.title),
      });
    } catch (e) {
      setError(e.message || String(e));
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onPointerDown={(e) => e.target === e.currentTarget && !saving && onCancel()}>
      <div style={{ ...s.modal, width: "min(700px, 94vw)" }}>
        <h2 style={{ ...s.h2, marginBottom: 4 }}>{mode === "edit" ? "Edit Release" : "Add a Release"}</h2>
        <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 16 }}>
          {mode === "edit"
            ? "Changes here show up for everyone in the group."
            : "Drop or paste the cover art, then list the tracks — a whole tracklist can be pasted at once."}
        </p>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 168 }}>
            <div
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDropping(true);
              }}
              onDragLeave={() => setDropping(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDropping(false);
                takeFile(e.dataTransfer.files && e.dataTransfer.files[0]);
              }}
              style={{
                width: 168,
                height: 168,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                border: `1.5px dashed ${dropping ? t.accent : t.border}`,
                background: dropping ? t.accentBg : t.bgCard2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}>
              {cover ? (
                <img src={cover} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ padding: 12, color: t.textDim, fontSize: 12, lineHeight: 1.5 }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>🖼</div>
                  {busy ? "Loading…" : "Click, drop or paste cover art"}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                takeFile(e.target.files && e.target.files[0]);
                e.target.value = "";
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                style={{ ...s.btnGhost, flex: 1, justifyContent: "center", padding: "6px 8px", fontSize: 12 }}
                onClick={() => fileRef.current && fileRef.current.click()}>
                Choose
              </button>
              {cover && (
                <button style={{ ...s.btnGhost, padding: "6px 10px", fontSize: 12 }} title="Remove cover" onClick={() => setCover("")}>
                  ✕
                </button>
              )}
            </div>
            <input
              style={{ ...s.input, marginTop: 8, fontSize: 12, padding: "7px 10px" }}
              placeholder="…or paste an image URL"
              value={cover.startsWith("data:") ? "" : cover}
              onChange={(e) => setCover(e.target.value.trim())}
            />
          </div>

          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={s.label}>{typeLabel(type)} Title</div>
                <input
                  autoFocus
                  style={s.input}
                  placeholder="In Rainbows"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <div style={{ width: 130 }}>
                <div style={s.label}>Type</div>
                <select style={{ ...s.input, cursor: "pointer" }} value={type} onChange={(e) => setType(e.target.value)}>
                  {RELEASE_TYPES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={s.label}>Artist</div>
                <input
                  style={s.input}
                  placeholder="Radiohead"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <div style={{ width: 88 }}>
                <div style={s.label}>Year</div>
                <input
                  style={s.input}
                  placeholder="2007"
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            </div>

            {similar.length > 0 && (
              <SimilarBox t={t} s={s} similar={similar} exact={exact} profileById={profileById} onOpen={onOpenExisting} />
            )}

            <GenrePicker
              t={t}
              s={s}
              genres={genres}
              selected={picked}
              onToggle={(id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
              onAdd={(ids) => setPicked((p) => [...p, ...ids.filter((id) => !p.includes(id))])}
              onCreate={onCreateGenre}
            />

            <div style={{ ...s.label, display: "flex", alignItems: "center" }}>
              <span>Tracklist</span>
              <span style={{ marginLeft: "auto", fontWeight: 600, color: t.textDim }}>
                {tracks.length} track{tracks.length === 1 ? "" : "s"}
              </span>
            </div>

            <div style={{ maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, paddingRight: 2 }}>
              {tracks.map((tr, i) => (
                <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 18,
                      textAlign: "right",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: t.textDim,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                    {i + 1}
                  </span>
                  <input
                    style={{ ...s.input, padding: "6px 10px", fontSize: 13, color: tr.interlude ? t.textMuted : t.text }}
                    value={tr.title}
                    placeholder="Track name"
                    onChange={(e) => setTracks((p) => p.map((x) => (x.id === tr.id ? { ...x, title: e.target.value } : x)))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (addRef.current) addRef.current.focus();
                    }}
                  />
                  <button
                    title={tr.interlude ? "Interlude — won't need a rating" : "Mark as an interlude"}
                    onClick={() => setTracks((p) => p.map((x) => (x.id === tr.id ? { ...x, interlude: !x.interlude } : x)))}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      border: `1px solid ${tr.interlude ? t.accent : t.border}`,
                      background: tr.interlude ? t.accentBg : "transparent",
                      color: tr.interlude ? t.accent : t.textDim,
                    }}>
                    ♪{tr.interlude ? " Interlude" : ""}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button style={{ ...s.iconBtn, width: 18, height: 13, fontSize: 8, border: "none" }} onClick={() => move(i, i - 1)}>
                      ▲
                    </button>
                    <button style={{ ...s.iconBtn, width: 18, height: 13, fontSize: 8, border: "none" }} onClick={() => move(i, i + 1)}>
                      ▼
                    </button>
                  </div>
                  <button
                    style={{ ...s.iconBtn, width: 24, height: 24, border: "none", color: t.textDim }}
                    title="Remove track"
                    onClick={() => setTracks((p) => p.filter((x) => x.id !== tr.id))}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                ref={addRef}
                style={{ ...s.input, padding: "7px 10px", fontSize: 13 }}
                placeholder={tracks.length ? "Add another track…" : "Add the first track…"}
                value={newTrack}
                onChange={(e) => setNewTrack(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  commitNew();
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text") || "";
                  if (!text.includes("\n")) return;
                  e.preventDefault();
                  addTracks(splitTracks(text));
                  setNewTrack("");
                }}
              />
              <button style={s.btnGhost} onClick={commitNew}>
                Add
              </button>
            </div>
            <div style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>
              Enter adds a track. Paste a multi-line list to add them all at once.
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: "9px 12px",
              borderRadius: 9,
              fontSize: 12.5,
              color: "#ef4444",
              background: hexToRgba("#ef4444", 0.1),
              border: `1px solid ${hexToRgba("#ef4444", 0.35)}`,
            }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button style={s.btnGhost} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            style={{ ...s.btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
            disabled={!canSave}
            onClick={submit}>
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : `Add ${typeLabel(type)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Releases already on BeatShare that look like the one being typed — an
   exact match blocks saving, anything close is just a heads-up. */
function SimilarBox({ t, s, similar, exact, profileById, onOpen }) {
  const color = exact ? "#f97316" : t.accent;
  return (
    <div
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 10,
        border: `1px solid ${hexToRgba(color, 0.45)}`,
        background: hexToRgba(color, 0.08),
      }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 7 }}>
        {exact ? "This one's already on BeatShare — rate it there instead." : "Already on BeatShare?"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {similar.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0, fontSize: 12 }}>
              <Art t={t} album={a} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, ...oneLine }}>{a.title}</div>
              <div style={{ fontSize: 11, color: t.textMuted, ...oneLine }}>
                {a.artist || "Unknown artist"} · added by {nameOf(profileById[a.created_by])}
              </div>
            </div>
            <button style={{ ...s.btnGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => onOpen(a.id)}>
              Open
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
