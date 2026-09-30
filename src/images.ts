import type { Shot } from './sheet';

const MAX_SIDE = 2000;
const MAX_BYTES = 3 * 1024 * 1024;
const PASSTHROUGH = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

let seq = 0;
const newId = () => `shot-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('無法讀取這張圖片'));
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('圖片轉換失敗'))), type, quality),
  );
}

/**
 * Turn a picked/pasted image into a Shot kept only in memory.
 * HEIC/unknown formats, very large files, or images with a side > 2000px are re-encoded as JPEG.
 */
export async function makeShot(blob: Blob): Promise<Shot> {
  let url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const needsConvert = !PASSTHROUGH.has(blob.type) || blob.size > MAX_BYTES || Math.max(w, h) > MAX_SIDE;
    if (!needsConvert) return { id: newId(), blob, url, width: w, height: h };

    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; // JPEG has no alpha
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    const jpeg = await toBlob(canvas, 'image/jpeg', 0.9);
    canvas.width = canvas.height = 0; // release canvas memory (iOS)
    URL.revokeObjectURL(url);
    url = URL.createObjectURL(jpeg);
    return { id: newId(), blob: jpeg, url, width: cw, height: ch };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export function releaseShots(shots: Shot[]) {
  for (const s of shots) URL.revokeObjectURL(s.url);
}

/** Render text as a white-background PNG "screenshot" (dev sample only). */
export async function textToPng(text: string, width = 1000): Promise<Blob> {
  const pad = 40;
  const font = '28px -apple-system, "Segoe UI", Arial, sans-serif';
  const lineH = 42;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (measure.measureText(next).width > width - pad * 2 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = pad * 2 + lines.length * lineH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = font;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + i * lineH + 6));
  const blob = await toBlob(canvas, 'image/png');
  canvas.width = canvas.height = 0;
  return blob;
}
