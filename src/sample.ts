// Dev-only sample question (loaded via dynamic import behind import.meta.env.DEV).
// A real worked question, including first attempts and their corrections (評語 / 檢討).
// The question text goes through the same parser as a real copy-paste.
import { initialSheet, type Sheet } from './sheet';
import { parseQuestion } from './question';

export const SAMPLE_QUESTION = `In the last decade there has been a significant decrease in coffee consumption. During this same time, there has been increasing publicity about the adverse long-term effects on health of the caffeine in coffee. Therefore, the decrease in coffee consumption must have been caused by consumers' awareness of the harmful effects of caffeine.

Which of the following, if true, most seriously calls into question the explanation above?

(A) On average, people consume 30 percent less coffee today than they did 10 years ago.
(B) Heavy coffee drinkers may have mild withdrawal symptoms, such as headaches, for a day or so after significantly decreasing their coffee consumption.
(C) Sales of specialty types of coffee have held steady as sales of regular brands have declined.
(D) The consumption of fruit juices and caffeine-free herbal teas has increased over the past decade.
(E) Coffee prices increased steadily in the past decade because of unusually severe frosts in coffee-growing nations.`;

export async function sampleSheet(): Promise<Sheet> {
  const s = initialSheet();
  const { stem, choices } = parseQuestion(SAMPLE_QUESTION);
  for (const l of Object.keys(choices) as (keyof typeof choices)[]) {
    s.choices[l] = { ...s.choices[l], text: choices[l] ?? '' };
  }
  const ch = s.choices;
  return {
    ...s,
    source: 'OG',
    qtype: 'Weaken',
    result: 'right',
    question: stem,
    premise:
      'In the last decade there has been a significant decrease in coffee consumption. During this same time, there has been increasing publicity about the adverse long-term effects on health of the caffeine in coffee.',
    argument:
      "Therefore, the decrease in coffee consumption must have been caused by consumers' awareness of the harmful effects of caffeine.",
    mode: '因果',
    causal: [{ r: "consumers' awareness of the harmful effects of caffeine ⬆️", e: 'coffee consumption ⬇️', n: '' }],
    other: [{ r: 'Cost of coffee beans ⬆️', e: 'coffee consumption ⬇️', n: '' }],
    otherNote: '他因是 weaken',
    revResult: [
      {
        r: 'coffee consumption ⬇️',
        e: 'coffee supply ⬇️',
        n: 'bad example：off the chain，多加了一個新變數',
      },
      {
        r: 'coffee consumption ⬇️',
        e: 'awareness / publicity ⬆️',
        n: '正確：消費 ⬇️ → 媒體注意到並做研究 → awareness / publicity ⬆️',
      },
    ],
    revReason: [
      {
        r: 'People die due to coffee ⬆️',
        e: "consumers' awareness of the harmful effects of caffeine ⬆️",
        n: 'bad example：沒有把 argument 的方向倒過來',
      },
    ],
    analogy: [
      'UK and USA have the most coffee drinkers, and the consumption of coffee has increased.',
      '⬆️ bad example：和 premise 矛盾（GMAT 要接受 premise 為真），而且沒有抓到 reason 和 result 這兩個關鍵變數。',
      'Better：In Country X, there was no such publicity, yet coffee consumption fell just as much.（cause absent, effect present）',
      'Better：In the UK, the same anti-caffeine publicity ran, yet coffee consumption rose.（cause present, effect absent）',
    ].join('\n'),
    sample: [
      'A research in a small town shows caffeine makes people average 30% higher.',
      '⬆️ bad example',
      'Better：Nearly all of the decrease came from offices and restaurants cutting bulk purchases, while household consumption stayed flat.',
    ].join('\n'),
    choices: {
      A: { ...ch.A, note: 'just talking about the result', v: 'unrelated', fix: 'unrelated', review: '' },
      B: {
        ...ch.B,
        note: 'it supports the reason, it provides additional data',
        v: 'support',
        fix: 'unrelated',
        review: '思考方法：does this make the stated cause more or less likely to be the real cause?',
      },
      C: {
        ...ch.C,
        note: 'still declines; half support, half unrelated, talking about the result',
        v: 'unrelated',
        fix: 'weaken',
        review: 'slightly weaken, not irrelevant',
      },
      D: { ...ch.D, note: 'additional proof of people raising awareness', v: 'support', fix: 'support', review: '' },
      E: { ...ch.E, note: '他因', v: 'weaken', fix: 'weaken', review: '' },
    },
    mine: 'E',
    correct: 'E',
    reflection: [
      'Weaken 因果論證的方法：',
      'another cause（E）',
      'reverse causation',
      'coincidence',
      "the two trends don't actually line up",
      '',
      'In GMAT, you have to accept the premises as true.',
    ].join('\n'),
  };
}
