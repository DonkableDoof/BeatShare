/* Images are scaled down to fit 256×256 and re-encoded as JPEG before
   upload, so a full-size scan doesn't cost everyone a slow download.
   Anything already that small is uploaded as it is. */

export const MAX_IMAGE = 256;

export const readFile = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

/* square-crops when `square` is set — avatars are always shown as circles */
export async function shrinkImage(src, max = MAX_IMAGE, square = false) {
  try {
    const img = await loadImage(src);
    const fits = img.width <= max && img.height <= max && (!square || img.width === img.height);
    if (fits) return src;
    const side = Math.min(img.width, img.height);
    const sw = square ? side : img.width;
    const sh = square ? side : img.height;
    const sx = square ? (img.width - side) / 2 : 0;
    const sy = square ? (img.height - side) / 2 : 0;
    const scale = Math.min(1, max / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    /* a remote image taints the canvas — keep the link instead */
    return src;
  }
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

export const isDataUrl = (s) => typeof s === "string" && s.startsWith("data:");
