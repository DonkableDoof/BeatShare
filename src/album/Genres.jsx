import React, { useEffect, useRef, useState } from "react";
import { hexToRgba } from "../theme";
import { GENRE_COLORS, byName } from "../music";
import { GenreChip, Check } from "./bits.jsx";

function GenreOption({ t, genre, on, active, count, onClick, onHover }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        setHover(true);
        if (onHover) onHover();
      }}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        textAlign: "left",
        padding: "7px 9px",
        borderRadius: 7,
        border: "none",
        background: on ? hexToRgba(genre.color, active || hover ? 0.2 : 0.12) : active || hover ? t.bgHover : "transparent",
        color: t.text,
        fontSize: 13,
        fontWeight: on ? 600 : 500,
        cursor: "pointer",
      }}>
      <Check t={t} on={on} color={genre.color} />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {genre.name}
      </span>
      {count != null && (
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textDim, fontVariantNumeric: "tabular-nums" }}>{count}</span>
      )}
    </button>
  );
}

export function GenreFilter({ t, s, genres, counts, selected, match, onChange, onMatch, onManage }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sorted = [...genres].sort(byName);
  const needle = q.trim().toLowerCase();
  const list = needle ? sorted.filter((g) => g.name.toLowerCase().includes(needle)) : sorted;
  const picked = sorted.filter((g) => selected.includes(g.id));
  const label = !picked.length
    ? "All Genres"
    : picked.length <= 2
      ? picked.map((g) => g.name).join(", ")
      : `${picked.length} Genres`;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const footBtn = {
    background: "none",
    border: "none",
    padding: "4px 6px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        title="Filter by genre"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...s.segment(picked.length > 0 || open),
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          maxWidth: 230,
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span
          style={{
            fontSize: 8,
            opacity: 0.75,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.18s ease",
          }}>
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 60,
            width: 260,
            padding: 6,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            transformOrigin: "top left",
            animation: "lo-pop-tl 0.14s ease-out both",
          }}>
          {genres.length > 6 && (
            <input
              autoFocus
              style={{ ...s.input, padding: "6px 10px", fontSize: 12.5, marginBottom: 4 }}
              placeholder="Find a genre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          )}

          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {list.map((g) => {
              return (
                <GenreOption
                  key={g.id}
                  t={t}
                  genre={g}
                  on={selected.includes(g.id)}
                  count={counts[g.id] || 0}
                  onClick={() => toggle(g.id)}
                />
              );
            })}
            {!genres.length && (
              <div style={{ fontSize: 12.5, color: t.textDim, padding: "10px 9px", lineHeight: 1.5 }}>
                No genres yet. Add them while adding or editing a release, or under Manage Genres.
              </div>
            )}
            {genres.length > 0 && !list.length && (
              <div style={{ fontSize: 12.5, color: t.textDim, padding: "10px 9px" }}>No genre matches "{q.trim()}".</div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              borderTop: `1px solid ${t.border}`,
              marginTop: 6,
              paddingTop: 6,
            }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginLeft: 4, marginRight: 2 }}>Match</span>
            {[
              { id: "any", label: "Any", hint: "Show entries with at least one selected genre" },
              { id: "all", label: "All", hint: "Show only entries with every selected genre" },
            ].map((m) => (
              <button
                key={m.id}
                title={m.hint}
                onClick={() => onMatch(m.id)}
                style={{
                  ...footBtn,
                  padding: "3px 9px",
                  background: match === m.id ? t.accentBg : "transparent",
                  color: match === m.id ? t.accent : t.textMuted,
                  border: `1px solid ${match === m.id ? t.accent : t.border}`,
                }}>
                {m.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {selected.length > 0 && (
              <button style={{ ...footBtn, color: t.textMuted }} onClick={() => onChange([])}>
                Clear
              </button>
            )}
            <button
              style={{ ...footBtn, color: t.accent }}
              onClick={() => {
                setOpen(false);
                onManage();
              }}>
              Manage…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Multi-select dropdown for tagging an entry. Its search box doubles as
   a creator: type a genre that doesn't exist yet ("Rock, Shoegaze" for
   several) and Enter makes it and ticks it. */
export function GenrePicker({ t, s, genres, selected, onToggle, onAdd, onCreate }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const listRef = useRef(null);

  const sorted = [...genres].sort(byName);
  const picked = sorted.filter((g) => selected.includes(g.id));
  const needle = q.trim().toLowerCase();
  const list = needle ? sorted.filter((g) => g.name.toLowerCase().includes(needle)) : sorted;
  const names = q.split(",").map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean);
  const fresh = names.filter((n) => !genres.some((g) => g.name.toLowerCase() === n.toLowerCase()));
  const rows = list.length + (fresh.length ? 1 : 0);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    /* capture phase, so Escape closes just this menu and not the form */
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => setActive(0), [q, open]);

  useEffect(() => {
    const el = listRef.current && listRef.current.children[active];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [active]);

  const create = () => {
    const ids = names.map((n) => onCreate(n)).filter(Boolean);
    if (ids.length) onAdd(ids);
    setQ("");
  };

  const pick = (id) => {
    onToggle(id);
    setQ("");
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows) return;
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : rows - 1)) % rows);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < list.length) pick(list[active].id);
      else if (fresh.length) create();
    } else if (e.key === "Backspace" && !q && picked.length) {
      onToggle(picked[picked.length - 1].id);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 12 }}>
      <div style={{ ...s.label, display: "flex", alignItems: "center" }}>
        <span>Genres</span>
        {picked.length > 0 && (
          <span style={{ marginLeft: "auto", fontWeight: 600, color: t.textDim }}>{picked.length} selected</span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{
          ...s.input,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 5,
          minHeight: 38,
          padding: "6px 10px",
          cursor: "pointer",
          borderColor: open ? t.accent : t.border,
        }}>
        {picked.length ? (
          picked.map((g) => <GenreChip key={g.id} t={t} genre={g} small onRemove={() => onToggle(g.id)} />)
        ) : (
          <span style={{ color: t.textDim, fontSize: 13.5 }}>Select genres…</span>
        )}
        <span
          style={{
            marginLeft: "auto",
            paddingLeft: 6,
            fontSize: 8,
            color: t.textMuted,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.18s ease",
          }}>
          ▼
        </span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 60,
            padding: 6,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            transformOrigin: "top left",
            animation: "lo-pop-tl 0.14s ease-out both",
          }}>
          <input
            autoFocus
            style={{ ...s.input, padding: "6px 10px", fontSize: 12.5, marginBottom: 4 }}
            placeholder={genres.length ? "Search or create a genre…" : "Type a genre to create it, e.g. Indie Rock"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />

          <div ref={listRef} style={{ maxHeight: 210, overflowY: "auto" }}>
            {list.map((g, i) => (
              <GenreOption
                key={g.id}
                t={t}
                genre={g}
                on={selected.includes(g.id)}
                active={i === active}
                onHover={() => setActive(i)}
                onClick={() => pick(g.id)}
              />
            ))}
            {fresh.length > 0 && (
              <button
                onClick={create}
                onMouseEnter={() => setActive(list.length)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 9px",
                  borderRadius: 7,
                  border: "none",
                  background: active === list.length ? t.accentBg : "transparent",
                  color: t.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                <span style={{ width: 16, textAlign: "center", fontSize: 15, lineHeight: 1 }}>+</span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Create {fresh.map((n) => `"${n}"`).join(", ")}
                </span>
              </button>
            )}
          </div>

          {!rows && (
            <div style={{ fontSize: 12.5, color: t.textDim, padding: "8px 9px", lineHeight: 1.5 }}>
              {genres.length ? `No genre matches "${q.trim()}".` : "No genres yet — type one above to create it."}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              borderTop: `1px solid ${t.border}`,
              marginTop: 6,
              paddingTop: 6,
              fontSize: 11.5,
              color: t.textDim,
            }}>
            <span style={{ marginLeft: 4 }}>↑↓ to move · Enter to toggle</span>
            <div style={{ flex: 1 }} />
            {picked.length > 0 && (
              <button
                style={{ ...s.linkBtn, color: t.textMuted, padding: "4px 6px" }}
                onClick={() => picked.forEach((g) => onToggle(g.id))}>
                Clear
              </button>
            )}
            <button style={{ ...s.linkBtn, padding: "4px 6px" }} onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GenreManager({ t, s, genres, counts, blocked, onCreate, onUpdate, onDelete, onClose }) {
  const [name, setName] = useState("");
  const sorted = [...genres].sort(byName);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !blocked && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, blocked]);

  const add = () => {
    name.split(",").forEach((n) => onCreate(n));
    setName("");
  };

  const nextColor = (g) => GENRE_COLORS[(GENRE_COLORS.indexOf(g.color) + 1) % GENRE_COLORS.length];

  return (
    <div style={s.overlay} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, width: "min(420px, 94vw)" }}>
        <h2 style={{ ...s.h2, marginBottom: 4 }}>Manage Genres</h2>
        <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 14 }}>
          Genres are shared by the whole group — renaming one updates every release tagged with it. Click a dot to change its colour.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "48vh", overflowY: "auto" }}>
          {sorted.map((g) => (
            <GenreRow
              key={g.id}
              t={t}
              s={s}
              genre={g}
              count={counts[g.id] || 0}
              taken={(n) => genres.some((x) => x.id !== g.id && x.name.toLowerCase() === n.toLowerCase())}
              onRename={(n) => onUpdate(g.id, { name: n })}
              onRecolor={() => onUpdate(g.id, { color: nextColor(g) })}
              onDelete={() => onDelete(g)}
            />
          ))}
          {!sorted.length && <div style={s.empty}>No genres yet — add your first below.</div>}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <input
            autoFocus
            style={s.input}
            placeholder="New genre (commas add several)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              add();
            }}
          />
          <button style={s.btnGhost} onClick={add}>
            Add
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button style={s.btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function GenreRow({ t, s, genre, count, taken, onRename, onRecolor, onDelete }) {
  const [name, setName] = useState(genre.name);
  useEffect(() => setName(genre.name), [genre.name]);

  /* an empty or duplicate name quietly snaps back rather than erroring */
  const commit = () => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean || taken(clean)) return setName(genre.name);
    if (clean !== genre.name) onRename(clean);
    else setName(clean);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 8px",
        borderRadius: 9,
        background: t.bgCard2,
        border: `1px solid ${t.border}`,
      }}>
      <button
        title="Change colour"
        onClick={onRecolor}
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "none",
          padding: 0,
          cursor: "pointer",
          flexShrink: 0,
          background: genre.color,
          boxShadow: `0 0 0 3px ${hexToRgba(genre.color, 0.2)}`,
        }}
      />
      <input
        style={{ ...s.input, padding: "5px 9px", fontSize: 13, background: "transparent", border: "1px solid transparent" }}
        value={name}
        onFocus={(e) => (e.currentTarget.style.borderColor = t.border)}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "transparent";
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.stopPropagation();
            setName(genre.name);
          }
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 600, color: t.textDim, whiteSpace: "nowrap" }}>
        {count} entr{count === 1 ? "y" : "ies"}
      </span>
      <button
        title="Delete genre"
        style={{ ...s.iconBtn, width: 24, height: 24, border: "none", color: t.textDim }}
        onClick={onDelete}>
        ✕
      </button>
    </div>
  );
}
