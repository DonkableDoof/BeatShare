import { useCallback, useEffect, useState } from "react";

/* One shared store behind every usePersistentStorage call. Two components
   reading the same key stay in sync, and undo/redo can rewrite a key
   directly without knowing which component owns it. */

const cache = new Map();
const listeners = new Map();

function subscribe(key, cb) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(cb);
  return () => listeners.get(key).delete(cb);
}

export function readStore(key, fallback) {
  if (cache.has(key)) return cache.get(key);
  try {
    const raw = localStorage.getItem(key);
    const value = raw !== null ? JSON.parse(raw) : fallback;
    cache.set(key, value);
    return value;
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  cache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  const set = listeners.get(key);
  if (set) set.forEach((cb) => cb());
}

export function usePersistentStorage(key, initial) {
  const [value, setValue] = useState(() => readStore(key, initial));

  useEffect(() => {
    setValue(readStore(key, initial));
    return subscribe(key, () => setValue(readStore(key, initial)));
  }, [key]);

  const set = useCallback(
    (updater) => {
      const current = readStore(key, initial);
      const next = typeof updater === "function" ? updater(current) : updater;
      writeStore(key, next);
    },
    [key]
  );

  return [value, set];
}
