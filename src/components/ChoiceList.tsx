import { LETTERS, VERDICTS, type Letter, type Sheet, type Verdict } from '../sheet';
import Chips from './Chips';
import Field from './Field';

interface Props {
  sheet: Sheet;
  onMine: (v: '' | Letter) => void;
  onCorrect: (v: '' | Letter) => void;
  onNote: (l: Letter, v: string) => void;
  onVerdict: (l: Letter, v: Verdict) => void;
}

const LETTER_OPTS = LETTERS.map((l) => ({ v: l, label: l }));

export default function ChoiceList({ sheet, onMine, onCorrect, onNote, onVerdict }: Props) {
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
        const isCorrect = correct === l;
        const isWrongPick = mine === l && correct !== '' && mine !== correct;
        return (
          <div className="choice" key={l}>
            <div
              className={`letter${isCorrect ? ' is-correct' : ''}${isWrongPick ? ' is-wrong' : ''}`}
              aria-label={`選項 ${l}${isCorrect ? '（正解）' : ''}${isWrongPick ? '（我選錯）' : ''}`}
            >
              {l}
            </div>
            <div className="choice-body">
              <Field value={sheet.choices[l].note} onChange={(v) => onNote(l, v)} placeholder={`(${l}) 筆記`} rows={1} />
              <Chips
                size="small"
                label={`${l} 判定`}
                options={VERDICTS}
                value={sheet.choices[l].v}
                onChange={(v) => onVerdict(l, v)}
                allowClear
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
