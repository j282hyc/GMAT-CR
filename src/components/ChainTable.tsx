import type { ReactNode } from 'react';
import type { Row } from '../sheet';
import Field from './Field';

interface Props {
  title: string;
  hint?: ReactNode;
  rows: Row[];
  onSet: (index: number, key: keyof Row, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  children?: ReactNode;
}

/** reason → result table with add/remove rows. */
export default function ChainTable({ title, hint, rows, onSet, onAdd, onRemove, children }: Props) {
  return (
    <div className="chain">
      <div className="chain-head">
        <h3>{title}</h3>
        {hint && <span className="hint">{hint}</span>}
      </div>
      <div className="chain-cols" aria-hidden="true">
        <span>reason</span>
        <span />
        <span>result</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div className="chain-row" key={i}>
          <Field value={row.r} onChange={(v) => onSet(i, 'r', v)} placeholder="reason" rows={1} />
          <span className="chain-arrow" aria-hidden="true">→</span>
          <Field value={row.e} onChange={(v) => onSet(i, 'e', v)} placeholder="result" rows={1} />
          <button type="button" className="icon-btn" onClick={() => onRemove(i)} aria-label={`刪除第 ${i + 1} 列`}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="add-row" onClick={onAdd}>
        ＋ 加一列
      </button>
      {children}
    </div>
  );
}
