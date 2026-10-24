import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme, hexToRgba } from "../theme";
import { ui } from "../ui";
import { useData } from "../data.jsx";
import { useAlbums } from "../album/AlbumHost.jsx";
import { genresOf, reviewScore, scoreColor, points, nameOf, prettyDate } from "../music";
import { readFile, shrinkImage } from "../images";
import { api } from "../api";
import Cover from "../album/Cover.jsx";
import Popup from "../components/Popup.jsx";
import { Avatar, Stat, GenreChip, useEscape } from "../album/bits.jsx";
import { memberStats } from "./MembersPage.jsx";

const SORTS = [
  { id: "recent", label: "Recent" },
  { id: "high", label: "Highest" },
  { id: "low", label: "Lowest" },
];

export default function ProfilePage({ userId, onBack, notify }) {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const host = useAlbums();
  const [tab, setTab] = useState("rated");
  const [sort, setSort] = useState("recent");
  const [editing, setEditing] = useState(false);

  const p = d.profileById[userId];
  const isMe = userId === d.userId;
  const st = useMemo(() => memberStats(d, userId), [d.reviews, d.albums, d.genreById, userId]);

  /* how closely this member's scores line up with yours, on releases you've both scored */
  const match = useMemo(() => {
    if (isMe) return null;
    const diffs = [];
    st.scored.forEach(({ a, v }) => {
      const mine = reviewScore(a, d.myReviews[a.id]);
      if (mine > 0) diffs.push(Math.abs(mine - v));
    });
    if (!diffs.length) return null;
    const mean = diffs.reduce((n, x) => n + x, 0) / diffs.length;
    return { pct: Math.round(Math.max(0, 1 - mean / 4) * 100), shared: diffs.length };
  }, [st, d.myReviews, isMe]);

  if (!p) {
    return (
      <div style={{ ...s.card, textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 14 }}>This member couldn't be found.</div>
        <button style={s.btnGhost} onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  const rated = [...st.scored].sort((x, y) =>
    sort === "high" ? y.v - x.v : sort === "low" ? x.v - y.v : String(y.r.updated_at).localeCompare(String(x.r.updated_at))
  );
  const added = [...st.added].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  const firstName = isMe ? "You" : nameOf(p).split(" ")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {!isMe && (
        <button style={{ ...s.linkBtn, fontSize: 12.5, alignSelf: "flex-start", marginBottom: 12, color: t.textMuted }} onClick={onBack}>
          ← Back
        </button>
      )}

      <section style={{ ...s.card, padding: 22, marginBottom: 18, display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
        <Avatar t={t} profile={p} size={104} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ ...s.h1, lineHeight: 1.2 }}>{nameOf(p)}</h1>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>
            @{p.username} · joined {prettyDate(p.created_at)}
          </div>
          {p.bio ? (
            <p className="lo-selectable" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap", maxWidth: 560 }}>
              {p.bio}
            </p>
          ) : (
            isMe && <p style={{ fontSize: 13, color: t.textDim, marginTop: 10 }}>Add a bio so your friends know what you're into.</p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Stat t={t} label="Rated" value={st.scored.length} />
            <Stat t={t} label="Average" value={st.avg ? points(st.avg) : "—"} color={st.avg ? scoreColor(st.avg) : null} />
            <Stat t={t} label="Added" value={st.added.length} />
            {match && <Stat t={t} label={`Taste Match · ${match.shared} shared`} value={`${match.pct}%`} color={t.accent} />}
            {st.topGenre && (
              <span style={{ marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
                Most rated genre <GenreChip t={t} genre={st.topGenre} small />
              </span>
            )}
          </div>
        </div>
        {isMe && (
          <button style={{ ...s.btnGhost, alignSelf: "flex-start" }} onClick={() => setEditing(true)}>
            ✎ Edit Profile
          </button>
        )}
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button style={s.segment(tab === "rated")} onClick={() => setTab("rated")}>
          Rated · {st.scored.length}
        </button>
        <button style={s.segment(tab === "added")} onClick={() => setTab("added")}>
          Added · {st.added.length}
        </button>
        {tab === "rated" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {SORTS.map((o) => (
              <button key={o.id} style={s.segment(sort === o.id)} onClick={() => setSort(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(tab === "rated" ? rated.length : added.length) === 0 ? (
        <section style={{ ...s.card, textAlign: "center", padding: "40px 20px", color: t.textMuted, fontSize: 13.5 }}>
          {tab === "rated"
            ? isMe
              ? "You haven't scored anything yet — open the Library and rate something."
              : `${firstName} hasn't scored anything yet.`
            : isMe
              ? "You haven't added any releases yet."
              : `${firstName} hasn't added any releases yet.`}
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 18, paddingBottom: 8 }}>
          {(tab === "rated" ? rated.map((x) => x.a) : added).map((a) => {
            const theirs = reviewScore(a, (d.reviewsByAlbum[a.id] || []).find((r) => r.user_id === userId));
            const mine = d.myReviews[a.id];
            return (
              <Cover
                key={a.id}
                t={t}
                album={a}
                genres={genresOf(a, d.genreById)}
                group={{ avg: theirs }}
                label={firstName}
                myReview={mine}
                myScore={isMe ? 0 : reviewScore(a, mine)}
                onOpen={() => host.openAlbum(a.id, isMe ? "mine" : "everyone")}
              />
            );
          })}
        </section>
      )}

      <Popup show={editing}>
        {editing && (
          <ProfileEditor
            t={t}
            s={s}
            profile={p}
            onCancel={() => setEditing(false)}
            onSave={async (patch) => {
              await d.updateProfile(patch);
              setEditing(false);
              notify("Profile saved.");
            }}
          />
        )}
      </Popup>
    </div>
  );
}

const USERNAME = /^[a-z0-9_]{3,20}$/;

function ProfileEditor({ t, s, profile, onCancel, onSave }) {
  const [avatar, setAvatar] = useState(profile.avatar_url || "");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dropping, setDropping] = useState(false);
  const fileRef = useRef(null);

  useEscape(onCancel, saving);

  const takeFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatar(await shrinkImage(await readFile(file), 400, true));
  };

  useEffect(() => {
    const onPaste = (e) => {
      const item = [...((e.clipboardData && e.clipboardData.items) || [])].find((i) => i.type.startsWith("image/"));
      const file = item && item.getAsFile();
      if (!file) return;
      e.preventDefault();
      takeFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const uname = username.trim().toLowerCase();
  const validName = USERNAME.test(uname);

  const submit = async () => {
    if (!validName || saving) return;
    setSaving(true);
    setError("");
    try {
      if (uname !== profile.username && !(await api.usernameAvailable(uname))) throw new Error("That username is taken.");
      const patch = { display_name: displayName.trim().slice(0, 40), username: uname, bio: bio.trim().slice(0, 300) };
      if (avatar !== profile.avatar_url) patch.avatar_url = avatar;
      await onSave(patch);
    } catch (e) {
      setError(e.message || String(e));
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onPointerDown={(e) => e.target === e.currentTarget && !saving && onCancel()}>
      <div style={{ ...s.modal, width: "min(520px, 94vw)" }}>
        <h2 style={{ ...s.h2, marginBottom: 4 }}>Edit Profile</h2>
        <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 16 }}>Everyone in the group sees this.</p>

        <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 16 }}>
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
            title="Click, drop or paste a picture"
            style={{ cursor: "pointer", borderRadius: "50%", outline: dropping ? `2px dashed ${t.accent}` : "none", outlineOffset: 4 }}>
            <Avatar t={t} profile={{ ...profile, avatar_url: avatar, display_name: displayName || profile.display_name }} size={96} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={s.btnGhost} onClick={() => fileRef.current && fileRef.current.click()}>
              Choose Picture
            </button>
            {avatar && (
              <button style={{ ...s.linkBtn, color: t.textMuted, alignSelf: "flex-start" }} onClick={() => setAvatar("")}>
                Remove picture
              </button>
            )}
            <span style={{ fontSize: 11, color: t.textDim }}>You can also drop or paste an image.</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={s.label}>Display Name</div>
            <input style={s.input} maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.label}>Username</div>
            <input
              style={{ ...s.input, borderColor: uname && !validName ? "#ef4444" : t.border }}
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
            />
          </div>
        </div>
        {uname && !validName && (
          <div style={{ fontSize: 11.5, color: "#ef4444", marginTop: -4, marginBottom: 10 }}>
            3–20 characters: lowercase letters, numbers and underscores.
          </div>
        )}
        <div style={s.label}>Bio</div>
        <textarea
          style={{ ...s.input, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
          maxLength={300}
          placeholder="What you listen to, what you're looking for…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <div style={{ fontSize: 11, color: t.textDim, textAlign: "right", marginTop: 4 }}>{bio.length}/300</div>

        {error && (
          <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 9, fontSize: 12.5, color: "#ef4444", background: hexToRgba("#ef4444", 0.1), border: `1px solid ${hexToRgba("#ef4444", 0.35)}` }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
          <button style={s.btnGhost} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button style={{ ...s.btnPrimary, opacity: validName && !saving ? 1 : 0.5 }} disabled={!validName || saving} onClick={submit}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
