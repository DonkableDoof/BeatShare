import React, { useEffect, useRef, useState } from "react";

/* A themed single-choice dropdown — native <select> menus ignore the theme
   and open as a grey system list. `variant` matches the control next to it:
   "input" inside forms, "segment" in toolbars. */
export default function Select({ t, s, value, options, onChange, variant = "input", prefix = "", title, style, menuWidth }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const ref = useRef(null);
  const current = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    if (!open) return;
    setHover(options.findIndex((o) => o.id === value));
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (o) => {
    setOpen(false);
    if (o.id !== value) onChange(o.id);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHover((h) => (h + step + options.length) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open && options[hover]) {
      e.preventDefault();
      pick(options[hover]);
    }
  };

  const trigger =
    variant === "segment"
      ? { ...s.segment(open), padding: "7px 12px" }
      : { ...s.input, textAlign: "left", fontWeight: 400, cursor: "pointer", borderColor: open ? t.accent : t.border };

  return (
    <div ref={ref} style={{ position: "relative", ...style }} onKeyDown={onKeyDown}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen((o) => !o)}
        style={{ ...trigger, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prefix}
          {current && current.label}
        </span>
        <span style={{ fontSize: 8, opacity: 0.75, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }}>▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: variant === "segment" ? 0 : "auto",
            left: variant === "segment" ? "auto" : 0,
            zIndex: 60,
            minWidth: menuWidth || "100%",
            padding: 5,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            transformOrigin: variant === "segment" ? "top right" : "top left",
            animation: "lo-pop-tl 0.14s ease-out both",
          }}>
          {options.map((o, i) => {
            const on = o.id === value;
            return (
              <div
                key={o.id}
                role="option"
                aria-selected={on}
                onClick={() => pick(o)}
                onMouseEnter={() => setHover(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: on ? 700 : 500,
                  whiteSpace: "nowrap",
                  color: on ? t.accent : t.text,
                  background: i === hover ? t.bgHover : "transparent",
                }}>
                <span style={{ width: 12, fontSize: 11 }}>{on ? "✓" : ""}</span>
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
