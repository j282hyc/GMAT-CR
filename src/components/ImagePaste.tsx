import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import type { Shot } from '../sheet';
import { makeShot } from '../images';

interface Props {
  shots: Shot[];
  onAdd: (shots: Shot[]) => void;
  onRemove: (id: string) => void;
}

export default function ImagePaste({ shots, onAdd, onRemove }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [working, setWorking] = useState(false);
  const [zoomed, setZoomed] = useState<Shot | null>(null);

  const ingest = async (blobs: Blob[]) => {
    if (!blobs.length) return;
    setWorking(true);
    setMsg('');
    const out: Shot[] = [];
    let failed = 0;
    for (const b of blobs) {
      try {
        out.push(await makeShot(b));
      } catch {
        failed++;
      }
    }
    setWorking(false);
    if (out.length) onAdd(out);
    if (failed) setMsg(`有 ${failed} 張圖片無法讀取`);
  };

  const clearZone = () => {
    if (zoneRef.current) zoneRef.current.innerHTML = '';
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const dt = e.clipboardData;
    const blobs: Blob[] = [];
    for (const f of Array.from(dt.files)) if (f.type.startsWith('image/')) blobs.push(f);
    if (!blobs.length) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) blobs.push(f);
        }
      }
    }
    if (blobs.length) {
      e.preventDefault();
      void ingest(blobs);
      return;
    }
    // Nothing usable as a file: let the browser insert, then look for <img> in onInput.
  };

  // Fallback: some browsers insert the pasted image as an <img> element instead of exposing a file.
  const onInput = async (e: FormEvent<HTMLDivElement>) => {
    const zone = zoneRef.current;
    if (!zone) return;
    const srcs = Array.from(zone.querySelectorAll('img')).map((img) => img.src);
    clearZone();
    if (!srcs.length) {
      if ((e.nativeEvent as InputEvent).inputType?.startsWith('insertFromPaste')) setMsg('剪貼簿裡沒有圖片');
      return;
    }
    const blobs: Blob[] = [];
    for (const src of srcs) {
      try {
        blobs.push(await (await fetch(src)).blob());
      } catch {
        /* unreadable source (e.g. webkit-fake-url) */
      }
    }
    if (blobs.length) void ingest(blobs);
    else setMsg('無法讀取貼上的圖片，請改用「從相簿選擇」');
  };

  return (
    <div className="image-paste">
      {shots.length > 0 && (
        <div className="shots">
          {shots.map((s, i) => (
            <figure className="shot" key={s.id} style={{ margin: 0 }}>
              <button type="button" className="shot-img" onClick={() => setZoomed(s)} aria-label={`放大截圖 ${i + 1}`}>
                <img src={s.url} width={s.width} height={s.height} alt={`題目截圖 ${i + 1}`} />
              </button>
              <button type="button" className="shot-remove" onClick={() => onRemove(s.id)}>
                移除
              </button>
            </figure>
          ))}
        </div>
      )}
      <div
        ref={zoneRef}
        className="paste-zone"
        contentEditable
        suppressContentEditableWarning
        inputMode="none"
        role="textbox"
        aria-label="長按這裡 → 貼上題目截圖"
        data-placeholder={working ? '處理圖片中…' : '長按這裡 → 貼上題目截圖'}
        onPaste={onPaste}
        onInput={onInput}
        onBeforeInput={(e) => {
          // Block typing; only paste is allowed here.
          const t = (e.nativeEvent as InputEvent).inputType;
          if (t && !t.startsWith('insertFromPaste')) e.preventDefault();
        }}
        onKeyDown={(e) => {
          if (!(e.metaKey || e.ctrlKey) && e.key.length === 1) e.preventDefault();
        }}
      />
      <div className="paste-actions">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={working}>
          從相簿選擇
        </button>
        {msg && <span className="note" role="alert">{msg}</span>}
      </div>
      <input
        ref={fileRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          void ingest(files);
        }}
      />
      {zoomed && <Lightbox shot={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}

function Lightbox({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  const [big, setBig] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="截圖放大">
      <div className="lightbox-bar">
        <button type="button" onClick={() => setBig((b) => !b)}>{big ? '符合螢幕' : '放大'}</button>
        <button type="button" onClick={onClose} aria-label="關閉">✕</button>
      </div>
      <img
        src={shot.url}
        alt="題目截圖"
        style={big ? { width: Math.max(shot.width, window.innerWidth * 2) } : { width: '100%', maxWidth: shot.width }}
        onDoubleClick={() => setBig((b) => !b)}
      />
    </div>
  );
}
