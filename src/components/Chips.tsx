interface Option<T extends string> {
  v: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T | '';
  onChange: (v: T | '') => void;
  /** Tapping the active chip clears it. */
  allowClear?: boolean;
  /** Render as a joined segmented control instead of separate chips. */
  segmented?: boolean;
  label: string;
  size?: 'normal' | 'small';
}

export default function Chips<T extends string>({
  options, value, onChange, allowClear, segmented, label, size = 'normal',
}: Props<T>) {
  return (
    <div className={`${segmented ? 'segmented' : 'chips'} ${size === 'small' ? 'is-small' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            className={`chip${on ? ' is-on' : ''}`}
            data-v={o.v}
            onClick={() => onChange(on && allowClear ? '' : o.v)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
