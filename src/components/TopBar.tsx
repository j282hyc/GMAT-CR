import { useEffect, useRef, useState } from 'react';
import { APP_VERSION, BUILD_TIME } from '../version';

interface Props {
  exported: boolean;
  busy: boolean;
  /** Whether "新題目" needs a second tap (unexported content present). */
  needsConfirm: boolean;
  onNew: () => void;
  onExport: () => void;
  onPrint: () => void;
  onSample?: () => void;
}

export default function TopBar({ exported, busy, needsConfirm, onNew, onExport, onPrint, onSample }: Props) {
  const [armed, setArmed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Disarm the "新題目" confirmation after a few seconds.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const handleNew = () => {
    if (needsConfirm && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onNew();
  };

  const pick = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="app-name">
          CR 筆記
          <span className="app-version" title={`建置時間 ${BUILD_TIME}`}>
            {APP_VERSION}
          </span>
        </span>
        <span className={`status${exported ? ' is-done' : ''}`} role="status">
          {exported ? '已匯出 ✓' : '未匯出'}
        </span>
        <span className="topbar-spacer" />
        <button type="button" className={`btn${armed ? ' is-armed' : ''}`} onClick={handleNew}>
          {armed ? '再按一次清空' : '新題目'}
        </button>
        <div className="export-group" ref={menuRef}>
          <button type="button" className="btn btn-primary" onClick={onExport} disabled={busy}>
            {busy ? '產生中…' : '匯出 PDF'}
          </button>
          <button
            type="button"
            className="btn btn-primary menu-toggle"
            aria-label="更多匯出選項"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            disabled={busy}
          >
            ▾
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" onClick={pick(onPrint)}>
                用系統列印
              </button>
              {onSample && (
                <button type="button" role="menuitem" onClick={pick(onSample)}>
                  載入範例（開發用）
                </button>
              )}
              <div className="menu-info">
                {APP_VERSION} · 建置 {BUILD_TIME}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
