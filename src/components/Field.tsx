import { useLayoutEffect, useRef, useState, type ClipboardEvent } from 'react';
import ArrowAccessory from './ArrowAccessory';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Single-line input instead of an auto-growing textarea. */
  single?: boolean;
  rows?: number;
  label?: string;
  className?: string;
  /**
   * Intercept pasted plain text. Return the text to insert at the caret instead,
   * or null to let the browser paste normally.
   */
  onPasteText?: (text: string) => string | null;
}

type El = HTMLTextAreaElement | HTMLInputElement;

/** Text field that auto-grows (textarea) and shows the arrow accessory while focused. */
export default function Field({ value, onChange, placeholder, single, rows = 2, label, className, onPasteText }: Props) {
  const ref = useRef<El | null>(null);
  const caret = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);

  const grow = () => {
    const el = ref.current;
    if (!el || single) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  useLayoutEffect(() => {
    grow();
    const el = ref.current;
    if (el && caret.current !== null && document.activeElement === el) {
      el.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  });

  useLayoutEffect(() => {
    if (single) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth;
        grow();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [single]);

  const insert = (text: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    caret.current = start + text.length;
    onChange(value.slice(0, start) + text + value.slice(end));
  };

  const common = {
    value,
    placeholder,
    'aria-label': label ?? placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    onPaste: (e: ClipboardEvent<El>) => {
      if (!onPasteText) return;
      const replacement = onPasteText(e.clipboardData.getData('text/plain'));
      if (replacement === null) return;
      e.preventDefault();
      insert(replacement);
    },
  };

  return (
    <div className={`field${focused ? ' is-focused' : ''}${className ? ` ${className}` : ''}`}>
      {single ? (
        <input ref={(el) => void (ref.current = el)} type="text" {...common} />
      ) : (
        <textarea ref={(el) => void (ref.current = el)} rows={rows} {...common} />
      )}
      {focused && <ArrowAccessory onInsert={insert} />}
    </div>
  );
}
