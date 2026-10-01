// Dev-only sample question (loaded via dynamic import behind import.meta.env.DEV).
// The question goes through the same parser as a real copy-paste.
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
  return {
    ...s,
    source: 'OG',
    qtype: 'Weaken',
    question: stem,
    premise:
      'In the last decade there has been a significant decrease in coffee consumption. During this same time, there has been increasing publicity about the adverse long-term effects on health of the caffeine in coffee.',
    argument:
      "Therefore, the decrease in coffee consumption must have been caused by consumers' awareness of the harmful effects of caffeine.",
    mode: '因果',
    causal: [{ r: "consumers' awareness of the harmful effects of caffeine ⬆️", e: 'the decrease in coffee consumption ⬇️' }],
    other: [{ r: 'Coffee cost ⬆️', e: 'the decrease in coffee consumption ⬇️' }],
    otherNote: '他因是 weaken，下面例子是 support or unrelated',
    revResult: [{ r: 'the decrease in coffee consumption ⬇️', e: 'No one would like to produce coffee beans, coffee beans ⬇️' }],
    revReason: [{ r: '', e: '' }],
  };
}
