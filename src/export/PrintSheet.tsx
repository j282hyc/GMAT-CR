import type { ReactNode } from 'react';
import { LETTERS, RESULTS, VERDICTS, choiceFilled, filledRows, today, type Row, type Sheet } from '../sheet';

// Print-only layout (fallback "用系統列印"; the PDF itself is built in pdf.ts). Always white background, fixed colors (never theme variables).
// Blocks marked `data-break` get `break-inside: avoid` in print CSS so rows and paragraphs stay whole.

const has = (s: string) => s.trim() !== '';

function Paras({ text, first = false }: { text: string; first?: boolean }) {
  const paras = text.replace(/\s+$/, '').split('\n');
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className="ps-p" data-break={i === 0 && first ? undefined : ''}>
          {p || ' '}
        </p>
      ))}
    </>
  );
}

function Section({ title, children, boxed }: { title: ReactNode; children: ReactNode; boxed?: boolean }) {
  return (
    <section className={`ps-sec${boxed ? ' is-boxed' : ''}`} data-break="">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function TextSection({ title, text, boxed }: { title: string; text: string; boxed?: boolean }) {
  if (!has(text)) return null;
  return (
    <Section title={title} boxed={boxed}>
      <Paras text={text} first />
    </Section>
  );
}

function ChainBlock({ title, hint, rows, note }: { title: string; hint?: string; rows: Row[]; note?: string }) {
  const filled = filledRows(rows);
  if (!filled.length && !(note && has(note))) return null;
  const withReview = filled.some((r) => has(r.n));
  return (
    <Section title={<>{title}{hint && <small>{hint}</small>}</>}>
      {filled.length > 0 && (
        <table className="ps-chain">
          <colgroup>
            <col style={{ width: withReview ? '33%' : '47%' }} />
            <col style={{ width: withReview ? '5%' : '6%' }} />
            <col style={{ width: withReview ? '33%' : '47%' }} />
            {withReview && <col style={{ width: '29%' }} />}
          </colgroup>
          <thead>
            <tr>
              <th>reason</th>
              <th />
              <th>result</th>
              {withReview && <th>評語 / 修正</th>}
            </tr>
          </thead>
          <tbody>
            {filled.map((r, i) => (
              <tr key={i} data-break={i === 0 ? undefined : ''}>
                <td>{r.r}</td>
                <td className="ps-arrow">{has(r.r) || has(r.e) ? '→' : ''}</td>
                <td>{r.e}</td>
                {withReview && <td className="ps-review">{r.n}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {note && has(note) && (
        <div className="ps-note" data-break={filled.length ? '' : undefined}>
          <span>備註：</span>
          {note}
        </div>
      )}
    </Section>
  );
}

export default function PrintSheet({ sheet: s }: { sheet: Sheet }) {
  const resultLabel = RESULTS.find((r) => r.v === s.result)?.label;
  const verdictLabel = (v: string) => VERDICTS.find((x) => x.v === v)?.label ?? '';
  const choiceRows = LETTERS.filter((l) => choiceFilled(s.choices[l]) || s.mine === l || s.correct === l);
  const withFix = choiceRows.some((l) => s.choices[l].fix || has(s.choices[l].review));

  return (
    <div className="ps">
      <header className="ps-head" data-break="">
        <h1>{has(s.title) ? s.title : 'CR'}</h1>
        <div className="ps-meta">
          {has(s.source) && <span>來源：{s.source}</span>}
          <span>{today()}</span>
        </div>
        <div className="ps-pills">
          <span className="ps-pill">{s.qtype}</span>
          {resultLabel && <span className={`ps-pill is-${s.result}`}>{resultLabel}</span>}
          {s.mine && <span className="ps-pill is-plain">我選 {s.mine}</span>}
          {s.correct && <span className="ps-pill is-plain">正解 {s.correct}</span>}
        </div>
      </header>

      <TextSection title="題目" text={s.question} />

      {s.shots.map((shot, i) => (
        <figure className="ps-shot" data-break="" key={shot.id}>
          <img src={shot.url} width={shot.width} height={shot.height} alt={`題目截圖 ${i + 1}`} />
        </figure>
      ))}

      <TextSection title="Premise" text={s.premise} />
      <TextSection title="Argument" text={s.argument} />

      {s.mode === '因果' ? (
        <>
          <ChainBlock title="原本因果" rows={s.causal} />
          <ChainBlock title="他因" hint="他因是 weaken" rows={s.other} note={s.otherNote} />
          <ChainBlock title="因果倒反 — 原結果是原因" hint="Original result is the reason" rows={s.revResult} />
          <ChainBlock title="因果倒反 — 原原因是結果" hint="Original reason is the result" rows={s.revReason} />
        </>
      ) : (
        <TextSection title="判斷依據" text={s.judge} />
      )}

      <TextSection title="類比差異" text={s.analogy} />
      <TextSection title="母個體差異" text={s.sample} />

      {choiceRows.length > 0 && (
        <Section title="選項">
          <table className="ps-choices">
            <colgroup>
              <col style={{ width: withFix ? '7%' : '9%' }} />
              <col style={{ width: withFix ? '63%' : '73%' }} />
              <col style={{ width: withFix ? '15%' : '18%' }} />
              {withFix && <col style={{ width: '15%' }} />}
            </colgroup>
            <thead>
              <tr>
                <th />
                <th>選項 / 筆記 / 檢討</th>
                <th>{withFix ? '我的判定' : '判定'}</th>
                {withFix && <th>正確判定</th>}
              </tr>
            </thead>
            <tbody>
              {choiceRows.map((l, i) => {
                const c = s.choices[l];
                const correct = s.correct === l;
                const wrong = s.mine === l && s.correct !== '' && s.mine !== s.correct;
                const verdictWrong = !!c.v && !!c.fix && c.v !== c.fix;
                return (
                  <tr key={l} className={correct ? 'is-correct' : wrong ? 'is-wrong' : ''} data-break={i === 0 ? undefined : ''}>
                    <td className="ps-letter">
                      {l}
                      {s.mine === l && <small>我選</small>}
                    </td>
                    <td className="ps-pre">
                      {c.text}
                      {has(c.note) && <div className="ps-choice-note">筆記：{c.note}</div>}
                      {has(c.review) && <div className="ps-review">檢討：{c.review}</div>}
                    </td>
                    <td className={verdictWrong ? 'ps-bad' : undefined}>
                      {verdictLabel(c.v)}
                      {verdictWrong && ' ×'}
                    </td>
                    {withFix && <td className="ps-good">{verdictLabel(c.fix)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      <TextSection title="錯因 / 心得" text={s.reflection} boxed />
      <div data-break="" />
    </div>
  );
}
