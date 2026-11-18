import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  complete,
  createShell,
  execLine,
  promptPath,
  type CustomCommand,
  type ShellInit,
  type ShellState,
} from '../engine/terminal/shell';
import type { LabCheckCtx } from '../content/types';

type Entry =
  | { kind: 'cmd'; user: string; host: string; path: string; text: string }
  | { kind: 'out'; text: string; err: boolean }
  | { kind: 'note'; text: string }
  | { kind: 'ok'; text: string };

interface Props {
  init: () => ShellInit;
  commands?: Record<string, CustomCommand>;
  /** Called after every command; a returned string is printed as a green success line. */
  onCommand?: (ctx: LabCheckCtx) => string | void;
  onReset?: () => void;
  banner?: string;
  height?: number;
  autoFocus?: boolean;
  /** Stretch to the parent's height (workspace layouts) instead of a fixed height. */
  fill?: boolean;
}

function Prompt({ user, host, path }: { user: string; host: string; path: string }) {
  return (
    <span className="term-prompt">
      <span className="u">
        {user}@{host}
      </span>
      :<span className="p">{path}</span>$
    </span>
  );
}

export function TerminalView({ init, commands, onCommand, onReset, banner, height, autoFocus = true, fill = false }: Props) {
  const shell = useRef<ShellState | null>(null);
  if (!shell.current) shell.current = createShell(init());
  const lines = useRef<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>(() => (banner ? [{ kind: 'note', text: banner }] : []));
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [entries]);

  const state = shell.current;

  const reset = () => {
    shell.current = createShell(init());
    lines.current = [];
    setEntries(banner ? [{ kind: 'note', text: banner }] : []);
    setValue('');
    setCursor(null);
    onReset?.();
    input.current?.focus();
  };

  const run = (line: string) => {
    const s = shell.current!;
    const echo: Entry = { kind: 'cmd', user: s.user, host: s.host, path: promptPath(s), text: line };
    if (!line.trim()) {
      setEntries((e) => [...e, echo]);
      return;
    }
    const result = execLine(s, line, commands);
    lines.current.push(line.trim());
    const added: Entry[] = [echo];
    if (result.output) added.push({ kind: 'out', text: result.output, err: result.code !== 0 });
    const message = onCommand?.({ state: s, line: line.trim(), output: result.output, lines: [...lines.current] });
    if (message) added.push({ kind: 'ok', text: message });
    setEntries((e) => (result.clear ? added.slice(1) : [...e, ...added]));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const history = shell.current!.history;
    if (e.key === 'Enter') {
      e.preventDefault();
      run(value);
      setValue('');
      setCursor(null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setValue(history[next]!);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cursor === null) return;
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setValue('');
      } else {
        setCursor(next);
        setValue(history[next]!);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const res = complete(shell.current!, value, commands);
      setValue(res.line);
      if (res.options.length) {
        const s = shell.current!;
        setEntries((en) => [
          ...en,
          { kind: 'cmd', user: s.user, host: s.host, path: promptPath(s), text: value },
          { kind: 'note', text: res.options.join('  ') },
        ]);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setEntries([]);
    } else if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault();
      const s = shell.current!;
      setEntries((en) => [...en, { kind: 'cmd', user: s.user, host: s.host, path: promptPath(s), text: value + '^C' }]);
      setValue('');
      setCursor(null);
    }
  };

  const focusInput = () => {
    // Keep text selection (for copying output) working.
    if (!window.getSelection()?.toString()) input.current?.focus();
  };

  return (
    <div className={`term-win ${fill ? 'fill' : ''}`}>
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span>
          {state.user}@{state.host}: {promptPath(state)}
        </span>
        <button onClick={reset} title="Terminalni boshlang'ich holatga qaytarish">
          <RotateCcw aria-hidden /> Qayta boshlash
        </button>
      </div>
      <div
        className="term-body"
        ref={body}
        onClick={focusInput}
        style={height && !fill ? ({ '--term-h': `${height}px` } as React.CSSProperties) : undefined}
      >
        {entries.map((entry, i) => {
          if (entry.kind === 'cmd') {
            return (
              <div key={i} className="term-line">
                <Prompt user={entry.user} host={entry.host} path={entry.path} />
                <pre>{entry.text}</pre>
              </div>
            );
          }
          if (entry.kind === 'out') {
            return (
              <pre key={i} className={`term-out ${entry.err ? 'err' : ''}`}>
                {entry.text}
              </pre>
            );
          }
          return (
            <pre key={i} className={entry.kind === 'ok' ? 'term-ok' : 'term-note'}>
              {entry.text}
            </pre>
          );
        })}
        <div className="term-line">
          <Prompt user={state.user} host={state.host} path={promptPath(state)} />
          <input
            ref={input}
            className="term-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setCursor(null);
            }}
            onKeyDown={onKey}
            autoFocus={autoFocus}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Terminal buyrug'i"
          />
        </div>
      </div>
    </div>
  );
}
