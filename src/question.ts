import { LETTERS, type Letter } from './sheet';

export interface ParsedQuestion {
  stem: string;
  choices: Partial<Record<Letter, string>>;
}

/** Candidate start/end offsets of an answer-choice marker for one letter. */
function markers(text: string, l: Letter, lineStart: boolean): { start: number; end: number }[] {
  const re = lineStart
    ? new RegExp(String.raw`(^|\n)[ \t]*(?:[(（]${l}[)）]|${l}[.)．）、:：])[ \t]*`, 'g')
    : new RegExp(String.raw`(^|\s)[(（]${l}[)）]\s*`, 'g');
  const out: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ start: m.index + m[1].length, end: m.index + m[0].length });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

function locate(text: string, lineStart: boolean) {
  // Walk backwards from E so letters that happen to appear in the stem are skipped.
  const found: { start: number; end: number }[] = [];
  let limit = text.length;
  for (let i = LETTERS.length - 1; i >= 0; i--) {
    const cands = markers(text, LETTERS[i], lineStart).filter((c) => c.end <= limit);
    if (!cands.length) return null;
    const c = cands[cands.length - 1];
    found[i] = c;
    limit = c.start;
  }
  return found;
}

const tidy = (s: string) => s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();

/**
 * Split pasted question text into stem + answer choices A–E.
 * Recognises "(A) …", "A. …", "A) …" (one per line), or inline "(A) … (B) …".
 * Returns no choices when the five markers are not all found in order.
 */
export function parseQuestion(raw: string): ParsedQuestion {
  const text = raw.replace(/\r\n?/g, '\n').replace(/ /g, ' ');
  const pos = locate(text, true) ?? locate(text, false);
  if (!pos) return { stem: tidy(text), choices: {} };
  const choices: Partial<Record<Letter, string>> = {};
  LETTERS.forEach((l, i) => {
    const end = i + 1 < LETTERS.length ? pos[i + 1].start : text.length;
    choices[l] = oneLine(text.slice(pos[i].end, end));
  });
  return { stem: tidy(text.slice(0, pos[0].start)), choices };
}
