import type { PDFDocument, PDFFont, PDFImage, PDFPage, RGB } from 'pdf-lib';
import { subsetFont } from './subset';
import { LETTERS, QTYPES, RESULTS, VERDICTS, filledRows, today, type Row, type Sheet, type Shot } from '../sheet';

// Text-based PDF: real, selectable/searchable text set in an embedded (subsetted) Noto Sans TC.
// Layout is done here by hand: content is a list of blocks; a block is never split across pages
// unless it is taller than a whole page (then it is split between lines).

// ---------- Geometry (pt) ----------
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MX = 34; // ≈ 12mm side margins
const TOP = 34;
const BOTTOM = 46; // room for the footer
const W = PAGE_W - MX * 2;
const FULL_H = PAGE_H - TOP - BOTTOM;

const FONT_URL = `${import.meta.env.BASE_URL}fonts/NotoSansTC-Regular.ttf`;

// ---------- Text style ----------
const BODY = 10.5;
const LH = 1.55;

type Color = RGB;
interface Ctx {
  font: PDFFont;
  rgb: (r: number, g: number, b: number) => Color;
  glyphs: Set<number>;
  embedImage: (shot: Shot) => Promise<PDFImage>;
}
let C: Record<'text' | 'muted' | 'accent' | 'line' | 'head' | 'ok' | 'okBg' | 'bad' | 'badBg' | 'guess' | 'boxBg' | 'white', Color>;

const hex = (rgb: Ctx['rgb'], h: string) =>
  rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

// ---------- Text helpers ----------
const SUBST: Record<string, string> = { '✗': '×', '✕': '×', '✘': '×', '✔': '✓', '\t': '  ' };
const DROP = /[︎️‍​]/g;

/** Map characters the font can't draw (emoji, etc.) to something it can. */
function clean(ctx: Ctx, s: string): string {
  let out = '';
  for (const ch of s.replace(DROP, '')) {
    const sub = SUBST[ch] ?? ch;
    out += ctx.glyphs.has(sub.codePointAt(0)!) || sub === ' ' ? sub : '□';
  }
  return out;
}

const CJK = '⺀-鿿豈-﫿＀-￯　-〿←-⇿⬀-⯿➠-➿';
const TOKEN = new RegExp(`[${CJK}]|[^\\s${CJK}]+|\\s+`, 'g');
const NO_LINE_START = /^[，。、；：？！）」』〉》,.;:?!)\]}]$/;

/** Greedy line wrap: CJK breaks anywhere, Latin breaks between words. */
function wrap(ctx: Ctx, text: string, size: number, maxW: number): string[] {
  const { font } = ctx;
  const w = (s: string) => font.widthOfTextAtSize(s, size);
  const lines: string[] = [];
  for (const para of clean(ctx, text).split('\n')) {
    let line = '';
    let lineW = 0;
    for (const tok of para.match(TOKEN) ?? []) {
      const isSpace = /^\s+$/.test(tok);
      if (isSpace && !line) continue;
      const tw = w(tok);
      if (lineW + tw <= maxW || (NO_LINE_START.test(tok) && line)) {
        line += tok;
        lineW += tw;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      if (isSpace) {
        line = '';
        lineW = 0;
        continue;
      }
      if (tw <= maxW) {
        line = tok;
        lineW = tw;
        continue;
      }
      // A single word wider than the line (e.g. a URL): break it by characters.
      line = '';
      lineW = 0;
      for (const ch of tok) {
        const cw = w(ch);
        if (lineW + cw > maxW && line) {
          lines.push(line);
          line = '';
          lineW = 0;
        }
        line += ch;
        lineW += cw;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** y is measured downward from the page top; convert for pdf-lib. */
const Y = (y: number) => PAGE_H - y;

function drawLine(ctx: Ctx, page: PDFPage, s: string, x: number, top: number, size: number, color: Color, lh = size * LH) {
  if (!s) return;
  // Vertically centre the glyph box (≈ -0.12em … 0.88em around the baseline) in the line box.
  page.drawText(s, { x, y: Y(top + lh / 2 + size * 0.38), size, font: ctx.font, color });
}

function roundRect(page: PDFPage, x: number, top: number, w: number, h: number, r: number, opts: { fill?: Color; border?: Color; bw?: number }) {
  const p = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(p, { x, y: Y(top), color: opts.fill, borderColor: opts.border, borderWidth: opts.border ? opts.bw ?? 1 : 0 });
}

// ---------- Blocks & pagination ----------
interface Block {
  h: number;
  draw: (page: PDFPage, top: number) => void;
  /** Split so the first part is at most maxH tall; null if impossible. */
  split?: (maxH: number) => [Block, Block] | null;
  /** Keep on the same page as the next block (headings). */
  keepNext?: boolean;
}

class Layout {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = TOP;
  repeat: Block | null = null; // table header repeated after a page break

  constructor(private pdf: PDFDocument) {
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.y = TOP;
    if (this.repeat) this.put(this.repeat);
  }

  private put(b: Block) {
    b.draw(this.page, this.y);
    this.y += b.h;
  }

  get avail() {
    return PAGE_H - BOTTOM - this.y;
  }

  get pageEmpty() {
    return this.y <= TOP + (this.repeat ? this.repeat.h : 0) + 0.5;
  }

  place(b: Block): void {
    if (b.h <= this.avail + 0.01) return this.put(b);
    if (!this.pageEmpty && b.h <= FULL_H - (this.repeat?.h ?? 0)) {
      this.newPage();
      return this.put(b);
    }
    // Taller than a page: split between lines.
    const parts = b.split?.(this.avail);
    if (parts) {
      this.put(parts[0]);
      this.newPage();
      return this.place(parts[1]);
    }
    if (!this.pageEmpty) this.newPage();
    this.put(b);
  }

  /** Start a new page unless `h` still fits on this one. */
  ensure(h: number) {
    if (h > this.avail && !this.pageEmpty) this.newPage();
  }

  placeAll(blocks: Block[]) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const next = blocks[i + 1];
      if (b.keepNext && next && b.h + Math.min(next.h, 60) > this.avail && !this.pageEmpty) this.newPage();
      this.place(b);
    }
  }
}

const gap = (h: number): Block => ({ h, draw: () => {} });

// ---------- Block builders ----------
interface Styled {
  text: string;
  color: Color;
  size: number;
  /** First line of a paragraph: preferred place to split a box across pages. */
  start?: boolean;
}

/** Wrapped text lines with a style; splittable between lines. */
function textBlock(ctx: Ctx, lines: Styled[], x = MX, pad = 0): Block {
  const lh = (s: Styled) => s.size * LH;
  const h = lines.reduce((a, l) => a + lh(l), 0) + pad * 2;
  return {
    h,
    draw: (page, top) => {
      let y = top + pad;
      for (const l of lines) {
        drawLine(ctx, page, l.text, x, y, l.size, l.color);
        y += lh(l);
      }
    },
    split: (maxH) => {
      let acc = pad;
      let n = 0;
      while (n < lines.length && acc + lh(lines[n]) <= maxH - pad) acc += lh(lines[n++]);
      if (n === 0 || n === lines.length) return null;
      return [textBlock(ctx, lines.slice(0, n), x, pad), textBlock(ctx, lines.slice(n), x, pad)];
    },
  };
}

const styled = (ctx: Ctx, text: string, color: Color, size = BODY, maxW = W): Styled[] =>
  wrap(ctx, text, size, maxW).map((t) => ({ text: t, color, size }));

function heading(ctx: Ctx, title: string, hint?: string): Block {
  const size = 10;
  const h = 14 + size * LH;
  return {
    h,
    keepNext: true,
    draw: (page, top) => {
      const t = clean(ctx, title);
      drawLine(ctx, page, t, MX, top + 14, size, C.accent);
      if (hint) {
        const x = MX + ctx.font.widthOfTextAtSize(t, size) + 8;
        drawLine(ctx, page, clean(ctx, hint), x, top + 14, 8.5, C.muted, size * LH);
      }
    },
  };
}

/** One paragraph per line break; each paragraph is an unsplittable unit (unless taller than a page). */
function paragraphs(ctx: Ctx, text: string): Block[] {
  return text
    .replace(/\s+$/, '')
    .split('\n')
    .map((p) => textBlock(ctx, styled(ctx, p || ' ', C.text)));
}

function textSection(ctx: Ctx, title: string, text: string): Block[] {
  if (!text.trim()) return [];
  return [heading(ctx, title), ...paragraphs(ctx, text)];
}

// ----- Tables -----
interface Col {
  w: number; // fraction of W
  align?: 'left' | 'center';
}
type Cell = Styled[];

const PAD_X = 6;
const PAD_Y = 4;

function rowBlock(ctx: Ctx, cols: Col[], cells: Cell[], opts: { fill?: Color; header?: boolean } = {}): Block {
  const widths = cols.map((c) => c.w * W);
  const cellH = (cell: Cell) => cell.reduce((a, l) => a + l.size * LH, 0);
  const h = Math.max(...cells.map(cellH), BODY * LH) + PAD_Y * 2;
  return {
    h,
    draw: (page, top) => {
      let x = MX;
      if (opts.fill) page.drawRectangle({ x: MX, y: Y(top + h), width: W, height: h, color: opts.fill });
      cells.forEach((cell, i) => {
        let y = top + PAD_Y;
        for (const l of cell) {
          const lw = ctx.font.widthOfTextAtSize(l.text, l.size);
          const lx = cols[i].align === 'center' ? x + (widths[i] - lw) / 2 : x + PAD_X;
          drawLine(ctx, page, l.text, lx, y, l.size, l.color);
          y += l.size * LH;
        }
        x += widths[i];
      });
      // grid
      const border = { color: C.line, thickness: 0.6 };
      page.drawLine({ start: { x: MX, y: Y(top) }, end: { x: MX + W, y: Y(top) }, ...border });
      page.drawLine({ start: { x: MX, y: Y(top + h) }, end: { x: MX + W, y: Y(top + h) }, ...border });
      let gx = MX;
      for (let i = 0; i <= widths.length; i++) {
        page.drawLine({ start: { x: gx, y: Y(top) }, end: { x: gx, y: Y(top + h) }, ...border });
        gx += widths[i] ?? 0;
      }
    },
    split: (maxH) => {
      // Split each cell at the same height (only for rows taller than a page).
      const room = maxH - PAD_Y * 2;
      const firsts: Cell[] = [];
      const rests: Cell[] = [];
      for (const cell of cells) {
        let acc = 0;
        let n = 0;
        while (n < cell.length && acc + cell[n].size * LH <= room) acc += cell[n++].size * LH;
        firsts.push(cell.slice(0, n));
        rests.push(cell.slice(n));
      }
      if (firsts.every((c) => !c.length) || rests.every((c) => !c.length)) return null;
      return [rowBlock(ctx, cols, firsts, opts), rowBlock(ctx, cols, rests, opts)];
    },
  };
}

/** Header row + body rows; the header is repeated on continuation pages. */
function table(layout: Layout, header: Block, rows: Block[]) {
  // Keep the header with the first row.
  if (header.h + (rows[0]?.h ?? 0) > layout.avail && !layout.pageEmpty) layout.newPage();
  layout.place(header);
  layout.repeat = header;
  for (const r of rows) layout.place(r);
  layout.repeat = null;
}

// ---------- Document ----------
async function loadFontBytes(): Promise<ArrayBuffer> {
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`字型載入失敗 (${res.status})`);
  return res.arrayBuffer();
}
let fontBytes: Promise<ArrayBuffer> | null = null; // app asset, not user data

async function toEmbeddable(blob: Blob): Promise<{ bytes: ArrayBuffer; kind: 'png' | 'jpg' }> {
  if (blob.type === 'image/png') return { bytes: await blob.arrayBuffer(), kind: 'png' };
  if (blob.type === 'image/jpeg') return { bytes: await blob.arrayBuffer(), kind: 'jpg' };
  // webp / gif etc.: re-encode as JPEG
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = fail;
      i.src = url;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    const jpeg = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('toBlob'))), 'image/jpeg', 0.9));
    c.width = c.height = 0;
    return { bytes: await jpeg.arrayBuffer(), kind: 'jpg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Every literal this file draws, plus printable ASCII; the font subset is built from these + the sheet.
const STATIC_TEXT = [
  '題目 Premise Argument 原本因果 他因 他因是 weaken 因果倒反 — 原結果是原因 原原因是結果',
  'Original result is the reason Original reason is the result 判斷依據 類比差異 母個體差異',
  '選項 / 筆記 判定 我選 正解 錯因 / 心得 備註： 筆記： 來源： 第 / 頁 reason result → □ × ✓　',
  ...QTYPES,
  ...RESULTS.map((r) => r.label),
  ...VERDICTS.map((v) => v.label),
  Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join(''),
].join('');

function usedCodepoints(sheet: Sheet): Set<number> {
  const cps = new Set<number>();
  const add = (s: string) => {
    for (const ch of s.replace(DROP, '')) cps.add((SUBST[ch] ?? ch).codePointAt(0)!);
  };
  const walk = (v: unknown) => {
    if (typeof v === 'string') add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object' && !(v instanceof Blob)) Object.values(v).forEach(walk);
  };
  walk({ ...sheet, shots: [] });
  add(STATIC_TEXT);
  add(today());
  return cps;
}

export function pdfFileName(title: string): string {
  const safe = title.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-') || 'CR';
  return `GMAT-CR_${safe}_${today()}.pdf`;
}

export async function buildPdf(sheet: Sheet): Promise<File> {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit')]);
  fontBytes ??= loadFontBytes().catch((e) => {
    fontBytes = null;
    throw e;
  });

  const subset = await subsetFont(new Uint8Array(await fontBytes), usedCodepoints(sheet));
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(subset, { subset: false });
  pdf.setTitle(sheet.title || 'CR');
  pdf.setCreator('CR 筆記');
  pdf.setProducer('CR 筆記');
  pdf.setLanguage('zh-Hant');

  const ctx: Ctx = {
    font,
    rgb,
    glyphs: new Set(font.getCharacterSet()),
    embedImage: async (shot) => {
      const { bytes, kind } = await toEmbeddable(shot.blob);
      return kind === 'png' ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
    },
  };
  const h = (x: string) => hex(rgb, x);
  C = {
    text: h('#111111'), muted: h('#666666'), accent: h('#1f4e79'), line: h('#c3c9d0'), head: h('#f1f3f5'),
    ok: h('#1e7b34'), okBg: h('#e3f4e7'), bad: h('#c62828'), badBg: h('#fce6e6'), guess: h('#8a6d00'),
    boxBg: h('#f4f8fc'), white: h('#ffffff'),
  };

  const L = new Layout(pdf);
  const s = sheet;
  const has = (t: string) => t.trim() !== '';

  // ----- Header -----
  {
    const title = styled(ctx, has(s.title) ? s.title : 'CR', C.text, 16);
    const meta = [has(s.source) ? `來源：${s.source}` : '', today()].filter(Boolean).join('　　');
    L.place(textBlock(ctx, title));
    L.place(textBlock(ctx, styled(ctx, meta, C.muted, 9)));
    const pills: { label: string; fill: Color; outline?: boolean }[] = [{ label: s.qtype, fill: C.accent }];
    const res = RESULTS.find((r) => r.v === s.result);
    if (res) pills.push({ label: res.label, fill: s.result === 'right' ? C.ok : s.result === 'wrong' ? C.bad : C.guess });
    if (s.mine) pills.push({ label: `我選 ${s.mine}`, fill: C.accent, outline: true });
    if (s.correct) pills.push({ label: `正解 ${s.correct}`, fill: C.accent, outline: true });
    const ph = 17;
    L.place({
      h: ph + 12,
      draw: (page, top) => {
        let x = MX;
        const y = top + 5;
        for (const p of pills) {
          const t = clean(ctx, p.label);
          const pw = font.widthOfTextAtSize(t, 9) + 16;
          roundRect(page, x, y, pw, ph, ph / 2, p.outline ? { fill: C.white, border: p.fill, bw: 0.8 } : { fill: p.fill });
          drawLine(ctx, page, t, x + 8, y, 9, p.outline ? p.fill : C.white, ph);
          x += pw + 6;
        }
        page.drawLine({ start: { x: MX, y: Y(top + ph + 11) }, end: { x: MX + W, y: Y(top + ph + 11) }, thickness: 1.5, color: C.accent });
      },
    });
  }

  // ----- Question text, then backup screenshots -----
  L.placeAll(textSection(ctx, '題目', s.question));
  for (const shot of s.shots) {
    const img = await ctx.embedImage(shot);
    let w = W;
    let ih = (img.height / img.width) * w;
    const maxH = FULL_H - 12;
    if (ih > maxH) {
      w *= maxH / ih;
      ih = maxH;
    }
    L.place(gap(10));
    L.place({
      h: ih,
      draw: (page, top) => {
        page.drawImage(img, { x: MX, y: Y(top + ih), width: w, height: ih });
        page.drawRectangle({ x: MX, y: Y(top + ih), width: w, height: ih, borderColor: C.line, borderWidth: 0.6 });
      },
    });
  }

  L.placeAll(textSection(ctx, 'Premise', s.premise));
  L.placeAll(textSection(ctx, 'Argument', s.argument));

  // ----- Causal tables -----
  const chainCols: Col[] = [{ w: 0.465 }, { w: 0.07, align: 'center' }, { w: 0.465 }];
  const cellW = (c: Col) => c.w * W - PAD_X * 2;
  const chain = (title: string, rows: Row[], hint?: string, note?: string) => {
    const filled = filledRows(rows);
    const hasNote = !!note && has(note);
    if (!filled.length && !hasNote) return;
    const hd = heading(ctx, title, hint);
    if (filled.length) {
      const head = rowBlock(
        ctx,
        chainCols,
        [[{ text: 'reason', color: C.muted, size: 8.5 }], [], [{ text: 'result', color: C.muted, size: 8.5 }]],
        { fill: C.head },
      );
      const body = filled.map((r) =>
          rowBlock(ctx, chainCols, [
            styled(ctx, r.r, C.text, BODY, cellW(chainCols[0])),
            [{ text: '→', color: C.accent, size: BODY }],
            styled(ctx, r.e, C.text, BODY, cellW(chainCols[2])),
          ]),
      );
      L.ensure(hd.h + head.h + Math.min(body[0].h, FULL_H / 3));
      L.place(hd);
      table(L, head, body);
    } else {
      L.placeAll([hd]);
    }
    if (hasNote) {
      L.place(gap(4));
      L.place(textBlock(ctx, styled(ctx, `備註：${note}`, C.text)));
    }
  };

  if (s.mode === '因果') {
    chain('原本因果', s.causal);
    chain('他因', s.other, '他因是 weaken', s.otherNote);
    chain('因果倒反 — 原結果是原因', s.revResult, 'Original result is the reason');
    chain('因果倒反 — 原原因是結果', s.revReason, 'Original reason is the result');
  } else {
    L.placeAll(textSection(ctx, '判斷依據', s.judge));
  }

  L.placeAll(textSection(ctx, '類比差異', s.analogy));
  L.placeAll(textSection(ctx, '母個體差異', s.sample));

  // ----- Choices -----
  const rows = LETTERS.filter(
    (l) => has(s.choices[l].text) || has(s.choices[l].note) || s.choices[l].v || s.mine === l || s.correct === l,
  );
  if (rows.length) {
    const hd = heading(ctx, '選項');
    const cols: Col[] = [{ w: 0.08, align: 'center' }, { w: 0.77 }, { w: 0.15 }];
    const head = rowBlock(
      ctx,
      cols,
      [[], [{ text: '選項 / 筆記', color: C.muted, size: 8.5 }], [{ text: '判定', color: C.muted, size: 8.5 }]],
      { fill: C.head },
    );
    const verdict = (v: string) => VERDICTS.find((x) => x.v === v)?.label ?? '';
    const body = rows.map((l) => {
        const ch = s.choices[l];
        const correct = s.correct === l;
        const wrong = s.mine === l && s.correct !== '' && s.mine !== s.correct;
        const letter: Cell = [{ text: l, color: correct ? C.ok : wrong ? C.bad : C.text, size: 11 }];
        if (s.mine === l) letter.push({ text: '我選', color: C.muted, size: 7.5 });
        if (correct) letter.push({ text: '正解', color: C.ok, size: 7.5 });
        const body: Cell = [
          ...(has(ch.text) ? styled(ctx, ch.text, C.text, BODY, cellW(cols[1])) : []),
          ...(has(ch.note) ? styled(ctx, `筆記：${ch.note}`, C.accent, BODY, cellW(cols[1])) : []),
        ];
        return rowBlock(ctx, cols, [letter, body, styled(ctx, verdict(ch.v), C.text, BODY, cellW(cols[2]))], {
          fill: correct ? C.okBg : wrong ? C.badBg : undefined,
        });
      });
    L.ensure(hd.h + head.h + Math.min(body[0].h, FULL_H / 3));
    L.place(hd);
    table(L, head, body);
  }

  // ----- Reflection (boxed) -----
  if (has(s.reflection)) {
    const inner = W - 24;
    const lines: Styled[] = [
      { text: '錯因 / 心得', color: C.accent, size: 10 },
      ...s.reflection
        .replace(/\s+$/, '')
        .split('\n')
        .flatMap((p) => styled(ctx, p || ' ', C.text, BODY, inner).map((l, i) => ({ ...l, start: i === 0 }))),
    ];
    const boxed = (ls: Styled[]): Block => {
      const tb = textBlock(ctx, ls, MX + 12, 8);
      return {
        h: tb.h,
        draw: (page, top) => {
          roundRect(page, MX, top, W, tb.h, 6, { fill: C.boxBg, border: C.accent, bw: 1.4 });
          tb.draw(page, top);
        },
        split: (maxH) => {
          let acc = 16; // top + bottom padding
          let n = 0;
          while (n < ls.length && acc + ls[n].size * LH <= maxH) acc += ls[n++].size * LH;
          if (n === 0 || n === ls.length) return null;
          // Prefer ending the first part at a paragraph boundary.
          for (let k = n; k > 1; k--) {
            if (ls[k].start) {
              n = k;
              break;
            }
          }
          return [boxed(ls.slice(0, n)), boxed(ls.slice(n))];
        },
      };
    };
    L.place(gap(14));
    L.place(boxed(lines));
  }

  // ----- Footer -----
  const total = L.pages.length;
  L.pages.forEach((page, i) => {
    const t = `第 ${i + 1} / ${total} 頁`;
    const tw = font.widthOfTextAtSize(t, 8);
    page.drawText(t, { x: (PAGE_W - tw) / 2, y: 22, size: 8, font, color: C.muted });
  });

  const bytes = await pdf.save();
  return new File([bytes as BlobPart], pdfFileName(sheet.title), { type: 'application/pdf' });
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
