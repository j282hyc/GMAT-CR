import { LETTERS, VERDICTS, type Letter, type Sheet, type Verdict } from '../sheet';
import Chips from './Chips';
import Field from './Field';

interface Props {
  sheet: Sheet;
  onMine: (v: '' | Letter) => void;
  onCorrect: (v: '' | Letter) => void;
  onText: (l: Letter, v: string) => void;
  onNote: (l: Letter, v: string) => void;
  onVerdict: (l: Letter, v: Verdict) => void;
  onFix: (l: Letter, v: Verdict) => void;
  onReview: (l: Letter, v: string) => void;
}

const LETTER_OPTS = LETTERS.map((l) => ({ v: l, label: l }));

export default function ChoiceList({ sheet, onMine, onCorrect, onText, onNote, onVerdict, onFix, onReview }: Props) {
  const { mine, correct } = sheet;
  return (
    <div className="choices">
      <div className="pick-row">
        <span className="pick-label">我選</span>
        <Chips segmented label="我選" options={LETTER_OPTS} value={mine} onChange={onMine} allowClear />
      </div>
      <div className="pick-row">
        <span className="pick-label">正解</span>
        <Chips segmented label="正解" options={LETTER_OPTS} value={correct} onChange={onCorrect} allowClear />
      </div>
      {LETTERS.map((l) => {
        const c = sheet.choices[l];
        const isCorrect = correct === l;
        const isWrongPick = mine === l && correct !== '' && mine !== correct;
        const verdictWrong = !!c.v && !!c.fix && c.v !== c.fix;
        return (
          <div className="choice" key={l}>
            <div
              className={`letter${isCorrect ? ' is-correct' : ''}${isWrongPick ? ' is-wrong' : ''}`}
              aria-label={`選項 ${l}${isCorrect ? '（正解）' : ''}${isWrongPick ? '（我選錯）' : ''}`}
            >
              {l}
            </div>
            <div className="choice-body">
              <Field
                className="choice-text"
                value={c.text}
                onChange={(v) => onText(l, v)}
                placeholder={`(${l}) 選項內容`}
                rows={1}
              />
              <Field value={c.note} onChange={(v) => onNote(l, v)} placeholder="筆記（我的想法）" rows={1} />
              <div className="verdict-row">
                <span className="verdict-label">我的判定</span>
                <Chips size="small" label={`${l} 我的判定`} options={VERDICTS} value={c.v} onChange={(v) => onVerdict(l, v)} allowClear />
              </div>
              <div className={`review-box${verdictWrong ? ' is-wrong' : ''}`}>
                <div className="verdict-row">
                  <span className="verdict-label">正確判定</span>
                  <Chips size="small" label={`${l} 正確判定`} options={VERDICTS} value={c.fix} onChange={(v) => onFix(l, v)} allowClear />
                </div>
                <Field
                  className="review-field"
                  value={c.review}
                  onChange={(v) => onReview(l, v)}
                  placeholder="檢討（為什麼錯、正確的想法）"
                  rows={1}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
