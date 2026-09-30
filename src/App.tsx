import { useReducer, useState, type ReactNode } from 'react';
import {
  QTYPES, RESULTS, initialSheet, reducer,
  type Action, type Mode, type Row, type Sheet, type TableKey, type TextField,
} from './sheet';
import Chips from './components/Chips';
import Field from './components/Field';
import ChainTable from './components/ChainTable';
import ChoiceList from './components/ChoiceList';
import TopBar from './components/TopBar';
import ImagePaste from './components/ImagePaste';
import { releaseShots } from './images';

const QTYPE_OPTS = QTYPES.map((q) => ({ v: q, label: q }));
const MODE_OPTS: { v: Mode; label: string }[] = [
  { v: '因果', label: '因果' },
  { v: '判斷', label: '判斷' },
];

function Card({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [sheet, dispatch] = useReducer(reducer, undefined, initialSheet);
  const [exported, setExported] = useState(false);

  const act = (a: Action) => {
    dispatch(a);
    setExported(false);
  };

  return (
    <div className="app">
      <TopBar
        exported={exported}
        busy={false}
        needsConfirm={!exported}
        onNew={() => {
          releaseShots(sheet.shots);
          dispatch({ type: 'reset' });
          setExported(false);
        }}
        onExport={() => {}}
        onPrint={() => window.print()}
      />
      <main className="page">
        <Form sheet={sheet} act={act} />
      </main>
    </div>
  );
}

function Form({ sheet, act }: { sheet: Sheet; act: (a: Action) => void }) {
  const text = (field: TextField) => ({
    value: sheet[field],
    onChange: (value: string) => act({ type: 'set', field, value }),
  });
  const table = (key: TableKey) => ({
    rows: sheet[key],
    onSet: (index: number, k: keyof Row, value: string) => act({ type: 'rowSet', table: key, index, key: k, value }),
    onAdd: () => act({ type: 'rowAdd', table: key }),
    onRemove: (index: number) => act({ type: 'rowRemove', table: key, index }),
  });

  return (
    <>
      <Card title="題目">
        <div className="row2">
          <label>
            <span className="lbl">標題</span>
            <Field single {...text('title')} placeholder="標題" />
          </label>
          <label>
            <span className="lbl">來源</span>
            <Field single {...text('source')} placeholder="OG / Prep / 模考…" />
          </label>
        </div>
        <div className="sub">
          <h3>題型</h3>
          <Chips label="題型" options={QTYPE_OPTS} value={sheet.qtype} onChange={(v) => v && act({ type: 'qtype', value: v })} />
        </div>
        <div className="sub">
          <h3>結果</h3>
          <Chips label="結果" options={RESULTS} value={sheet.result} onChange={(v) => act({ type: 'result', value: v })} allowClear />
        </div>
      </Card>

      <Card title="截圖">
        <ImagePaste
          shots={sheet.shots}
          onAdd={(shots) => act({ type: 'addShots', shots })}
          onRemove={(id) => {
            const shot = sheet.shots.find((s) => s.id === id);
            if (shot) URL.revokeObjectURL(shot.url);
            act({ type: 'removeShot', id });
          }}
        />
      </Card>

      <Card title="Premise（前提 / 事實）">
        <Field {...text('premise')} placeholder="前提 / 事實" rows={3} />
      </Card>

      <Card title="Argument（結論）">
        <Field {...text('argument')} placeholder="結論" rows={2} />
        <div className="mode-row">
          <Chips segmented label="因果或判斷" options={MODE_OPTS} value={sheet.mode} onChange={(v) => v && act({ type: 'mode', value: v })} />
        </div>
        {sheet.mode === '因果' ? (
          <>
            <ChainTable title="原本因果" {...table('causal')} />
            <ChainTable title="他因" hint="他因是 weaken" {...table('other')}>
              <div className="note-field">
                <Field {...text('otherNote')} placeholder="他因備註" rows={1} />
              </div>
            </ChainTable>
            <ChainTable title="因果倒反 — 原結果是原因" hint="Original result is the reason" {...table('revResult')} />
            <ChainTable title="因果倒反 — 原原因是結果" hint="Original reason is the result" {...table('revReason')} />
          </>
        ) : (
          <div className="sub">
            <h3>判斷依據</h3>
            <Field {...text('judge')} placeholder="判斷依據" rows={3} />
          </div>
        )}
        <div className="sub">
          <h3>類比差異</h3>
          <Field {...text('analogy')} placeholder="類比差異" />
        </div>
        <div className="sub">
          <h3>母個體差異</h3>
          <Field {...text('sample')} placeholder="母個體差異" />
        </div>
      </Card>

      <Card title="選項 A–E">
        <ChoiceList
          sheet={sheet}
          onMine={(v) => act({ type: 'mine', value: v })}
          onCorrect={(v) => act({ type: 'correct', value: v })}
          onNote={(letter, value) => act({ type: 'choiceNote', letter, value })}
          onVerdict={(letter, value) => act({ type: 'choiceVerdict', letter, value })}
        />
      </Card>

      <Card title="錯因 / 心得">
        <Field {...text('reflection')} placeholder="錯因 / 心得" rows={3} />
      </Card>
    </>
  );
}
