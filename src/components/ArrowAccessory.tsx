import type { PointerEvent } from 'react';

export const ARROWS = ['⬆️', '⬇️', '➡️', '⬅️'] as const;

interface Props {
  onInsert: (text: string) => void;
}

/**
 * Floating row of arrow buttons shown above the focused field.
 * Uses pointerdown + preventDefault so the field keeps focus and the iOS keyboard stays up.
 */
export default function ArrowAccessory({ onInsert }: Props) {
  const press = (e: PointerEvent<HTMLButtonElement>, a: string) => {
    e.preventDefault();
    onInsert(a);
  };
  return (
    <div className="arrow-acc" role="toolbar" aria-label="插入箭頭">
      {ARROWS.map((a) => (
        <button
          key={a}
          type="button"
          tabIndex={-1}
          className="arrow-btn"
          onPointerDown={(e) => press(e, a)}
          // Keyboard/AT fallback: click fires without pointerdown for assistive tech.
          onClick={(e) => {
            if (e.detail === 0) onInsert(a);
          }}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={`插入 ${a}`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
