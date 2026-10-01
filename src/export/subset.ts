import wasmUrl from 'harfbuzzjs/dist/harfbuzz-subset.wasm?url';

// Font subsetting with HarfBuzz (hb-subset, WebAssembly).
// pdf-lib's own fontkit subsetter drops glyphs from Noto Sans TC, so we subset here and embed
// the (already small) result with `subset: false`.

interface HbExports {
  memory: WebAssembly.Memory;
  malloc(n: number): number;
  free(p: number): void;
  hb_blob_create(data: number, len: number, mode: number, user: number, destroy: number): number;
  hb_blob_destroy(b: number): void;
  hb_blob_get_data(b: number, lenPtr: number): number;
  hb_blob_get_length(b: number): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(f: number): void;
  hb_face_reference_blob(f: number): number;
  hb_set_add(set: number, v: number): void;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(i: number): void;
  hb_subset_input_unicode_set(i: number): number;
  hb_subset_input_set(i: number, type: number): number;
  hb_subset_or_fail(face: number, input: number): number;
}

const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SUBSET_SETS_DROP_TABLE_TAG = 3;
const tag = (t: string) =>
  ((t.charCodeAt(0) << 24) | (t.charCodeAt(1) << 16) | (t.charCodeAt(2) << 8) | t.charCodeAt(3)) >>> 0;

async function instantiate(): Promise<HbExports> {
  const res = await fetch(wasmUrl);
  if (!res.ok) throw new Error(`hb-subset 載入失敗 (${res.status})`);
  const { instance } = await WebAssembly.instantiate(await res.arrayBuffer());
  return instance.exports as unknown as HbExports;
}

/**
 * Return a TrueType font containing only the glyphs for `codepoints`.
 * Layout tables (GSUB/GPOS/GDEF) are dropped so every character maps to exactly one glyph:
 * no ligatures or substitutions, which keeps copy/paste from the PDF exact.
 */
export async function subsetFont(font: Uint8Array, codepoints: Iterable<number>): Promise<Uint8Array> {
  // A fresh instance each time: its memory (font copy included) is released with it.
  const hb = await instantiate();
  const ptr = hb.malloc(font.byteLength);
  new Uint8Array(hb.memory.buffer).set(font, ptr);
  const blob = hb.hb_blob_create(ptr, font.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
  const face = hb.hb_face_create(blob, 0);
  hb.hb_blob_destroy(blob);

  const input = hb.hb_subset_input_create_or_fail();
  if (!input) throw new Error('hb_subset_input_create_or_fail');
  const unicodes = hb.hb_subset_input_unicode_set(input);
  for (const cp of codepoints) hb.hb_set_add(unicodes, cp);
  const drop = hb.hb_subset_input_set(input, HB_SUBSET_SETS_DROP_TABLE_TAG);
  for (const t of ['GSUB', 'GPOS', 'GDEF']) hb.hb_set_add(drop, tag(t));

  const sub = hb.hb_subset_or_fail(face, input);
  hb.hb_subset_input_destroy(input);
  if (!sub) {
    hb.hb_face_destroy(face);
    throw new Error('字型子集化失敗');
  }
  const out = hb.hb_face_reference_blob(sub);
  const data = hb.hb_blob_get_data(out, 0);
  const len = hb.hb_blob_get_length(out);
  const result = new Uint8Array(hb.memory.buffer).slice(data, data + len);
  hb.hb_blob_destroy(out);
  hb.hb_face_destroy(sub);
  hb.hb_face_destroy(face);
  hb.free(ptr);
  return result;
}
