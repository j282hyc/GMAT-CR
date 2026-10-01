import { useEffect, useState } from 'react';
import { LETTERS, type Letter } from '../sheet';
import { parseQuestion } from '../question';
import Field from './Field';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Replace the whole question text and fill the parsed choices. */
  onPasted: (question: string, choices: Partial<Record<Letter, string>>) => void;
  /** Fill only the parsed choices (stem is inserted at the caret by the field). */
  onChoices: (choices: Partial<Record<Letter, string>>) => void;
}

// navigator.clipboard is missing on insecure origins (e.g. testing over LAN http).
const canReadClipboard = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';

/** Paste-in box for the question text. Answer choices (A)–(E) are split out automatically. */
export default function QuestionInput({ value, onChange, onPasted, onChoices }: Props) {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const report = (choices: Partial<Record<Letter, string>>) => {
    const n = LETTERS.filter((l) => choices[l] !== undefined).length;
    setMsg(n ? '已把選項 A–E 填到下方「選項」' : '');
  };

  // Long-press → 貼上 inside the field: keep the stem here, move choices to the choice list.
  const onPasteText = (text: string) => {
    const parsed = parseQuestion(text);
    if (!Object.keys(parsed.choices).length) return null; // ordinary paste
    onChoices(parsed.choices);
    report(parsed.choices);
    return parsed.stem;
  };

  const pasteFromClipboard = async () => {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setMsg('無法讀取剪貼簿，請長按文字框 → 貼上');
      return;
    }
    if (!text.trim()) {
      setMsg('剪貼簿裡沒有文字');
      return;
    }
    const parsed = parseQuestion(text);
    const stem = value.trim() ? `${value.trimEnd()}\n\n${parsed.stem}` : parsed.stem;
    onPasted(stem, parsed.choices);
    report(parsed.choices);
  };

  return (
    <div className="question-input">
      <Field
        value={value}
        onChange={onChange}
        onPasteText={onPasteText}
        placeholder="複製題目文字（題幹＋選項）後，長按這裡 → 貼上"
        label="題目文字"
        rows={4}
      />
      <div className="paste-actions">
        {canReadClipboard && (
          <button type="button" className="btn" onClick={pasteFromClipboard}>
            從剪貼簿貼上
          </button>
        )}
        {msg && (
          <span className="note" role="status">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
