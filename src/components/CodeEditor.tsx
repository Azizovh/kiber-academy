import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FilePlus, FileCode2, FileText, Save } from 'lucide-react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { sql, SQLite } from '@codemirror/lang-sql';
import { tags as t } from '@lezer/highlight';
import { basename, dirname, getNode, walk } from '../engine/terminal/fs';
import type { ShellState } from '../engine/terminal/shell';

interface Props {
  /** The lab's shared machine: files are read from and written to its file system. */
  getState: () => ShellState;
  /** Directory whose files the editor lists (absolute). */
  root: string;
  /** File opened first (relative to root). */
  open?: string;
  /** True while the editor tab is shown: the file list and the open file are re-read then (the terminal may have changed them). */
  active: boolean;
  /** Called after every save (absolute path, new text): the lab page journals it so a reload restores the file. */
  onWrite?: (path: string, text: string) => void;
}

/** Text files only: databases, executables and captures are not edited here. */
function isText(content: string): boolean {
  return !content.startsWith('SQLite format 3') && !content.startsWith('MZ') && !content.includes('\u0000');
}

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '0.86rem', backgroundColor: 'var(--term-bg)', color: 'var(--term-text)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.55' },
  '.cm-content': { caretColor: 'var(--accent)' },
  '.cm-gutters': { backgroundColor: '#0b1118', color: '#5d6b80', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.035)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.05)', color: '#a6b3c5' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(53,214,164,0.25)' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(53,214,164,0.18)', outline: '1px solid rgba(53,214,164,0.4)' },
  '.cm-tooltip': { backgroundColor: '#121923', color: '#d3e0ee', border: '1px solid #32405a' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'rgba(53,214,164,0.2)', color: '#e8eef6' },
}, { dark: true });

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: '#c792ea' },
  { tag: [t.string, t.special(t.string)], color: '#a5d6a7' },
  { tag: [t.number, t.bool, t.null], color: '#f3b648' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6b7a90', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#82aaff' },
  { tag: [t.definition(t.variableName), t.definition(t.function(t.variableName))], color: '#82aaff' },
  { tag: [t.className, t.typeName], color: '#ffcb6b' },
  { tag: [t.propertyName, t.attributeName], color: '#89ddff' },
  { tag: [t.operator, t.punctuation], color: '#9fb0c6' },
  { tag: t.self, color: '#ff6f6f' },
]);

function language(name: string): Extension[] {
  if (name.endsWith('.py')) return [python(), indentUnit.of('    ')];
  if (name.endsWith('.sql')) return [sql({ dialect: SQLite, upperCaseKeywords: true }), indentUnit.of('  ')];
  return [indentUnit.of('    ')];
}

/** A small code editor over the lab's file system: file list, CodeMirror, autosave. */
export function CodeEditor({ getState, root, open, active, onWrite }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(open ?? null);
  const [saved, setSaved] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  const list = () => {
    const st = getState();
    const out = walk(st.root, root)
      .filter((e) => e.node.type === 'file' && isText(e.node.content))
      .map((e) => e.path.slice(root.length + 1));
    setFiles(out);
    return out;
  };

  const readFile = (rel: string): string | null => {
    const node = getNode(getState().root, `${root}/${rel}`);
    return node && node.type === 'file' ? node.content : null;
  };

  const writeFile = (rel: string, text: string) => {
    const st = getState();
    const abs = `${root}/${rel}`;
    const parent = getNode(st.root, dirname(abs));
    if (!parent || parent.type !== 'dir') return;
    const node = parent.children[basename(abs)];
    if (node && node.type === 'file') {
      node.content = text;
      node.mtime = Date.now();
    } else parent.children[basename(abs)] = { type: 'file', content: text, mode: 0o644, owner: st.user, mtime: Date.now() };
    setSaved(true);
    onWrite?.(abs, text);
  };

  const flush = () => {
    if (timer.current !== null && view.current && currentRef.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
      writeFile(currentRef.current, view.current.state.doc.toString());
    }
  };

  const load = (rel: string | null) => {
    view.current?.destroy();
    view.current = null;
    if (!rel || !host.current) return;
    const text = readFile(rel) ?? '';
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: text,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab, { key: 'Mod-s', preventDefault: true, run: () => (flush(), true) }]),
          theme,
          syntaxHighlighting(highlight),
          ...language(rel),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            setSaved(false);
            if (timer.current !== null) window.clearTimeout(timer.current);
            const doc = u.state.doc;
            timer.current = window.setTimeout(() => {
              timer.current = null;
              writeFile(rel, doc.toString());
            }, 250);
          }),
        ],
      }),
    });
  };

  // Mount: list files and open the first one.
  useEffect(() => {
    const all = list();
    const first = open && all.includes(open) ? open : all[0] ?? null;
    setCurrent(first);
    return () => {
      flush();
      view.current?.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Coming back to the tab: pick up changes the terminal made (sed -i, echo >>, a new file).
  useEffect(() => {
    if (active) {
      list();
      const v = view.current;
      if (v && current) {
        const text = readFile(current);
        if (text !== null && text !== v.state.doc.toString() && timer.current === null) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
        v.focus();
      }
    } else flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const create = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!/^[\w.-]+(\/[\w.-]+)*$/.test(name) || !/\.\w+$/.test(name)) {
      setError("Nom faqat harf, raqam, nuqta va chiziqchadan iborat bo'lsin va kengaytmasi bilan: masalan `tahlil.py`");
      return;
    }
    if (files.includes(name)) {
      setCurrent(name);
    } else {
      const parent = getNode(getState().root, dirname(`${root}/${name}`));
      if (!parent || parent.type !== 'dir') {
        setError('Bunday katalog yo\'q.');
        return;
      }
      writeFile(name, '');
      list();
      setCurrent(name);
    }
    setCreating(false);
    setNewName('');
    setError(null);
  };

  const shownRoot = useMemo(() => {
    const home = getState().home;
    return root === home ? '~' : root.startsWith(home + '/') ? '~' + root.slice(home.length) : root;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  return (
    <div className="code-win">
      <aside className="code-files" aria-label="Fayllar">
        <div className="code-files-head">
          <span className="mono">{shownRoot}</span>
          <button onClick={() => setCreating((c) => !c)} title="Yangi fayl" aria-label="Yangi fayl">
            <FilePlus aria-hidden />
          </button>
        </div>
        {creating && (
          <form onSubmit={create} className="code-new">
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="nom.py" spellCheck={false} aria-label="Yangi fayl nomi" />
          </form>
        )}
        {error && <p className="code-error small">{error}</p>}
        <ul>
          {files.map((f) => (
            <li key={f}>
              <button className={f === current ? 'on' : ''} onClick={() => (flush(), setCurrent(f))}>
                {/\.(py|sql|sh)$/.test(f) ? <FileCode2 aria-hidden /> : <FileText aria-hidden />}
                <span className="mono">{f}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="code-main" aria-label="Muharrir">
        <div className="code-bar">
          <span className="mono">{current ?? 'Fayl tanlanmagan'}</span>
          <span className={`code-saved small ${saved ? '' : 'pending'}`}>
            <Save aria-hidden /> {saved ? 'saqlangan' : 'saqlanmoqda…'}
          </span>
        </div>
        <div className="code-host" ref={host} />
        <p className="code-help small faint">Avtomatik saqlanadi · Ctrl+S · Tab — chekinish · terminalda ishga tushiring</p>
      </section>
    </div>
  );
}

export default CodeEditor;
