import React, { useEffect, useRef, useState } from "react";

export default function Popup({ show, children }) {
  const [render, setRender] = useState(show);
  const [leaving, setLeaving] = useState(false);
  const cache = useRef(children);

  if (show && children) cache.current = children;

  useEffect(() => {
    if (show) {
      setRender(true);
      setLeaving(false);
      return;
    }
    if (!render) return;
    setLeaving(true);
    const id = setTimeout(() => {
      setRender(false);
      setLeaving(false);
    }, 240);
    return () => clearTimeout(id);
  }, [show]);

  if (!render) return null;
  return (
    <div className={`lo-portal-host${leaving ? " lo-leaving" : ""}`}>{show ? children : cache.current}</div>
  );
}
