import { createContext, useContext } from "react";

export const COLOR_SCHEMES = {
  nature: {
    label: "Nature", green: "#4aba6a", orange: "#e8913a",
    dark: { bg: "#0f1210", bgCard: "#1a1f1c", bgCard2: "#222923", bgHover: "#2a332c", border: "#2d3830", borderLight: "#374038", textMuted: "#8a9b8e", textDim: "#5a6b5e" },
    light: { bg: "#f4f7f5", bgCard: "#ffffff", bgCard2: "#f8faf8", bgHover: "#eef3ef", border: "#d8e2da", borderLight: "#e5ece6", textMuted: "#5a7360", textDim: "#8aa090" },
    greenBg: "#1a3325", orangeBg: "#332a1a", greenDim: "#2d5a3a", orangeDim: "#5a3a1a", accentBg: "rgba(74,186,106,0.1)",
    lightAccent: { greenBg: "#e8f5ec", orangeBg: "#fdf3e8", greenDim: "#c5e5d0", orangeDim: "#f5dfc5", accentBg: "rgba(45,138,78,0.08)", green: "#2d8a4e", orange: "#d4782a" },
  },
  ocean: {
    label: "Ocean", green: "#38bdf8", orange: "#f472b6",
    dark: { bg: "#0f1114", bgCard: "#171c22", bgCard2: "#1f262e", bgHover: "#28313b", border: "#2d3842", borderLight: "#374450", textMuted: "#8a97a8", textDim: "#5a6878" },
    light: { bg: "#f4f6f8", bgCard: "#ffffff", bgCard2: "#f6f9fb", bgHover: "#eaf1f6", border: "#d5e0e8", borderLight: "#e2eaf0", textMuted: "#5a7088", textDim: "#8a9cb0" },
    greenBg: "#1a2a33", orangeBg: "#331a2a", greenDim: "#2a4a5a", orangeDim: "#5a2a4a", accentBg: "rgba(56,189,248,0.1)",
    lightAccent: { greenBg: "#e2f3fd", orangeBg: "#fde8f2", greenDim: "#bfe4f8", orangeDim: "#f8c8de", accentBg: "rgba(56,189,248,0.08)", green: "#0284c7", orange: "#db2777" },
  },
  purple: {
    label: "Amethyst", green: "#a78bfa", orange: "#fb923c",
    dark: { bg: "#110f18", bgCard: "#1a1724", bgCard2: "#231f30", bgHover: "#2d2840", border: "#332d48", borderLight: "#3d3658", textMuted: "#9088a8", textDim: "#5e5578" },
    light: { bg: "#f6f4fb", bgCard: "#ffffff", bgCard2: "#f8f6fd", bgHover: "#efe8fa", border: "#d8d0e8", borderLight: "#e4ddf0", textMuted: "#6a5a88", textDim: "#a098b8" },
    greenBg: "#221a33", orangeBg: "#332a1a", greenDim: "#3a2d5a", orangeDim: "#5a3a1a", accentBg: "rgba(167,139,250,0.1)",
    lightAccent: { greenBg: "#ede8fd", orangeBg: "#fef0e2", greenDim: "#d4c8f5", orangeDim: "#f5dfc5", accentBg: "rgba(167,139,250,0.08)", green: "#7c5ce8", orange: "#ea7c1e" },
  },
  ember: {
    label: "Ember", green: "#f97316", orange: "#ef4444",
    dark: { bg: "#141010", bgCard: "#1f1818", bgCard2: "#2a2020", bgHover: "#352828", border: "#3d2d2d", borderLight: "#4a3535", textMuted: "#a88a8a", textDim: "#785a5a" },
    light: { bg: "#fdf6f4", bgCard: "#ffffff", bgCard2: "#fdf8f6", bgHover: "#faeee8", border: "#e8d8d0", borderLight: "#f0e0d8", textMuted: "#885a4a", textDim: "#b8a098" },
    greenBg: "#331f1a", orangeBg: "#331a1a", greenDim: "#5a3a2d", orangeDim: "#5a2d2d", accentBg: "rgba(249,115,22,0.1)",
    lightAccent: { greenBg: "#fef0e2", orangeBg: "#fde8e8", greenDim: "#f5d4b8", orangeDim: "#f5c5c5", accentBg: "rgba(249,115,22,0.08)", green: "#ea6a0a", orange: "#dc2626" },
  },
};

export const CUSTOM_DEFAULT = { green: "#4aba6a", orange: "#e8913a" };

function mix(hexA, hexB, amount) {
  const a = hexA.replace("#", "");
  const b = hexB.replace("#", "");
  const ch = (h, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - amount) + ch(b, i) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/* The custom scheme borrows Nature's neutrals and swaps in two colours
   the user picks, deriving every tint from them. */
function customScheme(custom) {
  const c = { ...CUSTOM_DEFAULT, ...(custom || {}) };
  const base = COLOR_SCHEMES.nature;
  /* pull every surface a little toward the accent so the whole app
     shifts, not just the buttons */
  const tint = (palette, amounts) =>
    Object.fromEntries(
      Object.entries(palette).map(([k, v]) => [k, amounts[k] ? mix(v, c.green, amounts[k]) : v])
    );
  const darkAmt = { bg: 0.07, bgCard: 0.06, bgCard2: 0.06, bgHover: 0.09, border: 0.12, borderLight: 0.12, textMuted: 0.1, textDim: 0.1 };
  const lightAmt = { bg: 0.07, bgCard: 0.03, bgCard2: 0.06, bgHover: 0.11, border: 0.16, borderLight: 0.12, textMuted: 0.12, textDim: 0.12 };
  return {
    label: "Custom",
    green: c.green,
    orange: c.orange,
    dark: tint(base.dark, darkAmt),
    light: tint(base.light, lightAmt),
    greenBg: hexToRgba(c.green, 0.16),
    orangeBg: hexToRgba(c.orange, 0.16),
    greenDim: hexToRgba(c.green, 0.32),
    orangeDim: hexToRgba(c.orange, 0.32),
    accentBg: hexToRgba(c.green, 0.1),
    lightAccent: {
      green: c.green,
      orange: c.orange,
      greenBg: hexToRgba(c.green, 0.13),
      orangeBg: hexToRgba(c.orange, 0.13),
      greenDim: hexToRgba(c.green, 0.28),
      orangeDim: hexToRgba(c.orange, 0.28),
      accentBg: hexToRgba(c.green, 0.09),
    },
  };
}

export function buildTheme(schemeKey = "nature", isLight = false, custom = null) {
  const cs = schemeKey === "custom" ? customScheme(custom) : COLOR_SCHEMES[schemeKey] || COLOR_SCHEMES.nature;
  const n = isLight ? cs.light : cs.dark;
  const a = isLight ? cs.lightAccent : cs;
  return {
    ...n,
    text: isLight ? "#1a2e1e" : "#e8ede9",
    green: a.green || cs.green,
    orange: a.orange || cs.orange,
    accent: a.green || cs.green,
    greenBg: a.greenBg, orangeBg: a.orangeBg,
    greenDim: a.greenDim, orangeDim: a.orangeDim,
    accentBg: a.accentBg,
    shadow: isLight ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.3)",
    isLight,
  };
}

export const ThemeCtx = createContext(buildTheme());
export const useTheme = () => useContext(ThemeCtx);

export function hexToRgba(hex, alpha) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
