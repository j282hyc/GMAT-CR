// Sheet model + reducer. Everything lives in React state only — nothing is persisted.

export interface Row { r: string; e: string } // reason → result

export interface Shot { id: string; blob: Blob; url: string; width: number; height: number }

export const QTYPES = [
  'Weaken', 'Strengthen', 'Assumption', 'Evaluate', 'Inference', 'Boldface', 'Paradox', 'Flaw', '其他',
] as const;
export type QType = (typeof QTYPES)[number];

export type Result = '' | 'right' | 'wrong' | 'guess';
export const RESULTS: { v: Exclude<Result, ''>; label: string }[] = [
  { v: 'right', label: '✓ 做對' },
  { v: 'wrong', label: '✗ 做錯' },
  { v: 'guess', label: '? 猜的' },
];

export const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export type Letter = (typeof LETTERS)[number];

export type Verdict = '' | 'weaken' | 'support' | 'unrelated';
export const VERDICTS: { v: Exclude<Verdict, ''>; label: string }[] = [
  { v: 'weaken', label: 'Weaken' },
  { v: 'support', label: 'Support' },
  { v: 'unrelated', label: '無關' },
];

export type Mode = '因果' | '判斷';

export type TableKey = 'causal' | 'other' | 'revResult' | 'revReason';

export interface Choice { note: string; v: Verdict }

export interface Sheet {
  title: string;
  source: string;
  qtype: QType;
  result: Result;
  shots: Shot[];
  premise: string;
  argument: string;
  mode: Mode;
  causal: Row[];
  other: Row[];
  otherNote: string;
  revResult: Row[]; // 原結果是原因
  revReason: Row[]; // 原原因是結果
  judge: string;
  analogy: string; // 類比差異
  sample: string; // 母個體差異
  choices: Record<Letter, Choice>;
  mine: '' | Letter;
  correct: '' | Letter;
  reflection: string;
}

/** Fields that hold plain text and can be set with a generic `set` action. */
export type TextField =
  | 'title' | 'source' | 'premise' | 'argument' | 'otherNote' | 'judge' | 'analogy' | 'sample' | 'reflection';

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const emptyRow = (): Row => ({ r: '', e: '' });

export function initialSheet(): Sheet {
  const choices = {} as Record<Letter, Choice>;
  for (const l of LETTERS) choices[l] = { note: '', v: '' };
  return {
    title: `CR ${today()}`,
    source: '',
    qtype: 'Weaken',
    result: '',
    shots: [],
    premise: '',
    argument: '',
    mode: '因果',
    causal: [emptyRow()],
    other: [emptyRow()],
    otherNote: '',
    revResult: [emptyRow()],
    revReason: [emptyRow()],
    judge: '',
    analogy: '',
    sample: '',
    choices,
    mine: '',
    correct: '',
    reflection: '',
  };
}

export type Action =
  | { type: 'set'; field: TextField; value: string }
  | { type: 'qtype'; value: QType }
  | { type: 'result'; value: Result }
  | { type: 'mode'; value: Mode }
  | { type: 'rowSet'; table: TableKey; index: number; key: keyof Row; value: string }
  | { type: 'rowAdd'; table: TableKey }
  | { type: 'rowRemove'; table: TableKey; index: number }
  | { type: 'choiceNote'; letter: Letter; value: string }
  | { type: 'choiceVerdict'; letter: Letter; value: Verdict }
  | { type: 'mine'; value: '' | Letter }
  | { type: 'correct'; value: '' | Letter }
  | { type: 'addShots'; shots: Shot[] }
  | { type: 'removeShot'; id: string }
  | { type: 'reset'; sheet?: Sheet };

export function reducer(s: Sheet, a: Action): Sheet {
  switch (a.type) {
    case 'set':
      return { ...s, [a.field]: a.value };
    case 'qtype':
      return { ...s, qtype: a.value };
    case 'result':
      return { ...s, result: a.value };
    case 'mode':
      return { ...s, mode: a.value };
    case 'rowSet':
      return {
        ...s,
        [a.table]: s[a.table].map((row, i) => (i === a.index ? { ...row, [a.key]: a.value } : row)),
      };
    case 'rowAdd':
      return { ...s, [a.table]: [...s[a.table], emptyRow()] };
    case 'rowRemove': {
      const rows = s[a.table].filter((_, i) => i !== a.index);
      return { ...s, [a.table]: rows.length ? rows : [emptyRow()] };
    }
    case 'choiceNote':
      return { ...s, choices: { ...s.choices, [a.letter]: { ...s.choices[a.letter], note: a.value } } };
    case 'choiceVerdict':
      return { ...s, choices: { ...s.choices, [a.letter]: { ...s.choices[a.letter], v: a.value } } };
    case 'mine':
      return { ...s, mine: a.value };
    case 'correct':
      return { ...s, correct: a.value };
    case 'addShots':
      return { ...s, shots: [...s.shots, ...a.shots] };
    case 'removeShot':
      return { ...s, shots: s.shots.filter((sh) => sh.id !== a.id) };
    case 'reset':
      return a.sheet ?? initialSheet();
  }
}

const blank = (v: string) => v.trim() === '';
export const rowFilled = (r: Row) => !blank(r.r) || !blank(r.e);
export const filledRows = (rows: Row[]) => rows.filter(rowFilled);

/** True when the user has entered anything beyond the defaults (used for the "新題目" guard). */
export function hasContent(s: Sheet): boolean {
  const init = initialSheet();
  if (s.shots.length) return true;
  if (s.title !== init.title && !blank(s.title)) return true;
  if (s.result || s.mine || s.correct) return true;
  const texts = [s.source, s.premise, s.argument, s.otherNote, s.judge, s.analogy, s.sample, s.reflection];
  if (texts.some((t) => !blank(t))) return true;
  if ([s.causal, s.other, s.revResult, s.revReason].some((rows) => filledRows(rows).length)) return true;
  return LETTERS.some((l) => !blank(s.choices[l].note) || s.choices[l].v);
}
