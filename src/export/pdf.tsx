import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { today, type Sheet } from '../sheet';
import PrintSheet from './PrintSheet';

// A4 geometry
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const TOP_MM = 12;
const BOTTOM_MM = 16; // room for the page-number footer
const SHEET_W_PX = 794; // A4 width at 96dpi
const PX_PER_MM = SHEET_W_PX / PAGE_W_MM;
const CONTENT_H_PX = Math.floor((PAGE_H_MM - TOP_MM - BOTTOM_MM) * PX_PER_MM);
// iOS Safari refuses canvases above ~16.7M pixels; stay below it.
const MAX_CANVAS_PIXELS = 16_000_000;

export function pdfFileName(title: string): string {
  const safe = title.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-') || 'CR';
  return `GMAT-CR_${safe}_${today()}.pdf`;
}

/** Page slices in CSS px: cut at the last `data-break` edge that still fits on the page. */
export function paginate(total: number, breaks: number[], pageH: number): [number, number][] {
  const pages: [number, number][] = [];
  let start = 0;
  while (start < total - 1) {
    const limit = start + pageH;
    let end: number;
    if (limit >= total) end = total;
    else {
      const fits = breaks.filter((b) => b > start + 1 && b <= limit);
      // No legal cut (a single block taller than a page, e.g. a very long screenshot): cut hard.
      end = fits.length ? Math.max(...fits) : limit;
    }
    pages.push([start, end]);
    start = end;
  }
  return pages.length ? pages : [[0, Math.max(total, 1)]];
}

async function waitForImages(el: HTMLElement) {
  await Promise.all(
    Array.from(el.querySelectorAll('img')).map((img) =>
      img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  );
  if (document.fonts?.ready) await document.fonts.ready;
}

/** Render "第 x / y 頁" to an image: jsPDF's built-in fonts cannot draw CJK text. */
function footerImage(page: number, total: number): string {
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 60;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#777';
  ctx.font = '30px -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`第 ${page} / ${total} 頁`, c.width / 2, c.height / 2);
  const url = c.toDataURL('image/jpeg', 0.9);
  c.width = c.height = 0;
  return url;
}

export async function buildPdf(sheet: Sheet): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${SHEET_W_PX}px;background:#fff;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  let canvas: HTMLCanvasElement | null = null;

  try {
    flushSync(() => root.render(<PrintSheet sheet={sheet} />));
    const el = host.firstElementChild as HTMLElement;
    await waitForImages(el);

    const top = el.getBoundingClientRect().top;
    const total = Math.ceil(el.scrollHeight);
    const breaks = Array.from(el.querySelectorAll<HTMLElement>('[data-break]'))
      .map((b) => Math.round(b.getBoundingClientRect().top - top))
      .concat(total);
    const pages = paginate(total, breaks, CONTENT_H_PX);

    const scale = Math.min(2, Math.sqrt(MAX_CANVAS_PIXELS / (SHEET_W_PX * total)));
    canvas = await html2canvas(el, {
      scale,
      backgroundColor: '#fff',
      logging: false,
      useCORS: false,
      width: SHEET_W_PX,
      height: total,
      windowWidth: SHEET_W_PX,
      scrollX: 0,
      scrollY: 0,
    });
    const k = canvas.width / SHEET_W_PX; // actual canvas px per CSS px

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.setProperties({ title: sheet.title, creator: 'CR 筆記' });
    const slice = document.createElement('canvas');
    const sctx = slice.getContext('2d')!;

    pages.forEach(([y0, y1], i) => {
      if (i > 0) pdf.addPage();
      const sy = Math.round(y0 * k);
      const sh = Math.max(1, Math.min(canvas!.height, Math.round(y1 * k)) - sy);
      slice.width = canvas!.width;
      slice.height = sh;
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, slice.width, sh);
      sctx.drawImage(canvas!, 0, sy, canvas!.width, sh, 0, 0, canvas!.width, sh);
      const hMm = sh / k / PX_PER_MM;
      pdf.addImage(slice.toDataURL('image/jpeg', 0.85), 'JPEG', 0, TOP_MM, PAGE_W_MM, hMm, undefined, 'FAST');
      pdf.addImage(footerImage(i + 1, pages.length), 'JPEG', (PAGE_W_MM - 40) / 2, PAGE_H_MM - 11, 40, 4);
    });
    slice.width = slice.height = 0;

    const blob = pdf.output('blob');
    return new File([blob], pdfFileName(sheet.title), { type: 'application/pdf' });
  } finally {
    if (canvas) canvas.width = canvas.height = 0;
    root.unmount();
    host.remove();
  }
}

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled' | 'needs-gesture';

/**
 * Hand the PDF to the user: the share sheet on touch devices (iOS → "儲存到檔案", LINE…),
 * otherwise a regular download. Nothing is kept afterwards.
 */
export async function deliverPdf(file: File, title: string): Promise<DeliverResult> {
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'AbortError') return 'cancelled';
      // Safari drops the user gesture if generating took too long: ask for one more tap.
      if (name === 'NotAllowedError') return 'needs-gesture';
      // Anything else: fall back to download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
