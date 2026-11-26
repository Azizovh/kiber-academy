/*
 * Real CPython (Pyodide, WebAssembly) for the terminal's python3 and the hidden tests of Python labs.
 *
 * In the browser Pyodide runs in a Web Worker (python.worker.ts): the page stays responsive while a program runs,
 * and stop (Ctrl+C, the stop button) or the watchdog terminate the worker — the only way to stop code stuck inside
 * one C call, such as a catastrophic regular expression — and a fresh worker loads in the background. Where a worker
 * cannot start, and in tests (Node), the same code runs in-process: then only the trace deadline stops loops.
 *
 * Each run gets a snapshot of the lab's files and returns what the program created, changed or deleted; only those
 * changes are applied, so a file the code editor saves while the program runs is not overwritten.
 */

import type { PyodideInterface } from 'pyodide';
import { getNode, walk, type FsDir } from '../terminal/fs';
import type { ShellState } from '../terminal/shell';
import { evalIn, runIn, setup, TIME_LIMIT, type EvalDone, type EvalRequest, type FsChanges, type FsSnapshot, type RunDone, type RunRequest, type Stream } from './pyCore';

export { TIME_LIMIT };

/** Seconds past TIME_LIMIT before the watchdog terminates a worker whose program ignores the trace deadline. */
const WATCHDOG_MARGIN = 3;

export type WorkerIn =
  | { type: 'init'; indexURL: string }
  | { type: 'run'; id: number; req: RunRequest }
  | { type: 'eval'; id: number; req: EvalRequest };

export type WorkerOut =
  | { type: 'ready'; version: string }
  | { type: 'failed'; message: string }
  | { type: 'line'; id: number; stream: Stream; text: string }
  | { type: 'done'; id: number; done: RunDone }
  | { type: 'evaled'; id: number; done: EvalDone };

export interface PyRun {
  out: string;
  err: string;
  code: number;
}

/* ── backends ────────────────────────────────────────────────────── */

let mode: 'worker' | 'inline' | null = null;
let version: string | null = null;
let loading: Promise<void> | null = null;

// Worker mode
let worker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let seq = 0;
interface Job {
  id: number;
  line: (stream: Stream, text: string) => void;
  done: (msg: WorkerOut) => void;
  kill: (why: 'stop' | 'timeout') => void;
}
let current: Job | null = null;

// Inline mode
let inlinePy: PyodideInterface | null = null;

const canUseWorker = () => typeof window !== 'undefined' && typeof Worker !== 'undefined';
const indexURL = () => new URL('pyodide/', document.baseURI).href;

function spawnWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    let w: Worker;
    try {
      w = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err);
      return;
    }
    worker = w;
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        version = msg.version;
        resolve();
      } else if (msg.type === 'failed') reject(new Error(msg.message));
      else if (current && msg.id === current.id) {
        if (msg.type === 'line') current.line(msg.stream, msg.text);
        else current.done(msg);
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      reject(new Error(e.message || 'Python worker could not start'));
    };
    w.postMessage({ type: 'init', indexURL: indexURL() } satisfies WorkerIn);
  });
}

async function loadInline(): Promise<void> {
  const { loadPyodide } = await import('pyodide');
  const py = typeof window === 'undefined' ? await loadPyodide() : await loadPyodide({ indexURL: indexURL() });
  version = setup(py);
  inlinePy = py;
  mode = 'inline';
}

/** Downloads and starts Python once; later calls return the same promise. */
export function loadPython(): Promise<void> {
  if (mode) return Promise.resolve();
  loading ??= (async () => {
    if (canUseWorker()) {
      try {
        workerReady = spawnWorker();
        await workerReady;
        mode = 'worker';
        return;
      } catch (err) {
        // file:// pages in some browsers, strict policies: run in the page as before.
        console.warn('[python] worker unavailable, running in the page:', err);
        worker?.terminate();
        worker = null;
      }
    }
    await loadInline();
  })();
  return loading;
}

/** True once Python has loaded (a stopped worker reloading in the background still counts: runs wait for it). */
export const pythonReady = () => mode !== null;
export const pythonVersion = () => version;

/** Throws the running program away (worker mode). Returns false when nothing was running. */
export function stopPython(): boolean {
  return kill('stop');
}

export const pythonRunning = () => current !== null;

function kill(why: 'stop' | 'timeout'): boolean {
  if (mode !== 'worker' || !current) return false;
  const job = current;
  current = null;
  worker?.terminate();
  worker = null;
  workerReady = spawnWorker().catch(async (err) => {
    console.warn('[python] worker restart failed, running in the page:', err);
    await loadInline();
  });
  job.kill(why);
  return true;
}

/** One program at a time: the terminal waits for a run, and hidden tests run after it. */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

function workerJob<T>(build: (id: number) => WorkerIn, onDone: (msg: WorkerOut) => T, onLine: Job['line'], onKill: (why: 'stop' | 'timeout') => T): Promise<T> {
  return new Promise<T>((resolve) => {
    const id = ++seq;
    const timer = setTimeout(() => kill('timeout'), (TIME_LIMIT + WATCHDOG_MARGIN) * 1000);
    current = {
      id,
      line: onLine,
      done: (msg) => {
        clearTimeout(timer);
        current = null;
        resolve(onDone(msg));
      },
      kill: (why) => {
        clearTimeout(timer);
        resolve(onKill(why));
      },
    };
    worker!.postMessage(build(id));
  });
}

/* ── file-system bridge ──────────────────────────────────────────── */

/** Top-level folders of Pyodide's own file system that the lab must not replace. */
const SYSTEM = new Set(['dev', 'proc', 'lib', 'sys', 'usr', 'bin']);

export function snapshot(state: ShellState): FsSnapshot {
  const snap: FsSnapshot = { roots: [], dirs: [], files: [] };
  for (const name of Object.keys(state.root.children)) {
    if (SYSTEM.has(name)) continue;
    if (name === 'home') {
      const home = state.root.children.home as FsDir;
      for (const u of Object.keys(home.children)) snap.roots.push(`/home/${u}`);
    } else snap.roots.push(`/${name}`);
  }
  for (const r of snap.roots) {
    for (const { path, node } of walk(state.root, r)) {
      if (node.type === 'dir') snap.dirs.push(path);
      else snap.files.push([path, node.content]);
    }
  }
  return snap;
}

function ensureDir(state: ShellState, path: string): FsDir {
  let cur = state.root;
  for (const part of path.split('/').filter(Boolean)) {
    let next = cur.children[part];
    if (!next || next.type !== 'dir') {
      next = { type: 'dir', children: {}, mode: 0o755, owner: state.user };
      cur.children[part] = next;
    }
    cur = next;
  }
  return cur;
}

export function applyChanges(state: ShellState, changes: FsChanges): void {
  for (const d of changes.dirs) ensureDir(state, d);
  for (const [path, text] of changes.files) {
    const node = getNode(state.root, path);
    if (node && node.type === 'file') {
      node.content = text;
      node.mtime = Date.now();
    } else {
      const parent = ensureDir(state, path.slice(0, path.lastIndexOf('/')) || '/');
      parent.children[path.slice(path.lastIndexOf('/') + 1)] = { type: 'file', content: text, mode: 0o644, owner: state.user, mtime: Date.now() };
    }
  }
  // Files the program deleted (os.remove) disappear from the lab too.
  for (const path of changes.deleted) {
    const parent = getNode(state.root, path.slice(0, path.lastIndexOf('/')) || '/');
    if (parent?.type === 'dir' && parent.children[path.slice(path.lastIndexOf('/') + 1)]?.type === 'file') {
      delete parent.children[path.slice(path.lastIndexOf('/') + 1)];
    }
  }
}

/* ── running ─────────────────────────────────────────────────────── */

const NOT_LOADED: PyRun = { out: '', err: 'python3: Python hali yuklanmagan — sahifani qayta oching.', code: 1 };

function assemble(out: string[], err: string[], dropped: number, code: number): PyRun {
  if (dropped) err.push(`... chiqish juda uzun: yana ${dropped} qator ko'rsatilmadi`);
  return { out: out.join('\n'), err: err.join('\n'), code };
}

const KILLED: Record<'stop' | 'timeout', string> = {
  stop: 'KeyboardInterrupt',
  timeout: `TimeoutError: dastur ${TIME_LIMIT + WATCHDOG_MARGIN} soniyadan ko'p ishladi (bitta og'ir amal ichida qolib ketdi) va to'xtatildi`,
};

/** Runs a Python file or a code string as `python3` would, in the lab's file system. */
export function runPython(state: ShellState, kind: 'file' | 'code', target: string, argv: string[]): Promise<PyRun> {
  if (!mode) return Promise.resolve(NOT_LOADED);
  return enqueue(async () => {
    if (mode === 'worker') await workerReady;
    const req: RunRequest = { snap: snapshot(state), kind, target, argv, cwd: state.cwd };
    const out: string[] = [];
    const err: string[] = [];
    const line = (stream: Stream, text: string) => (stream === 'out' ? out : err).push(text);
    if (mode === 'inline') {
      const done = runIn(inlinePy!, req, line);
      applyChanges(state, done.changes);
      return assemble(out, err, done.dropped, done.code);
    }
    return workerJob(
      (id) => ({ type: 'run', id, req }),
      (msg) => {
        const done = (msg as Extract<WorkerOut, { type: 'done' }>).done;
        applyChanges(state, done.changes);
        return assemble(out, err, done.dropped, done.code);
      },
      line,
      // A stopped program's file changes are lost with its worker; what it printed so far is kept.
      (why) => assemble(out, [...err, KILLED[why]], 0, why === 'stop' ? 130 : 1),
    );
  });
}

/**
 * Evaluates Python for a lab check (hidden tests): the lab's files are visible, nothing is written back, and the
 * value of the last expression is returned as plain data.
 */
export function evalPython(state: ShellState, code: string): Promise<EvalDone> {
  if (!mode) return Promise.resolve({ value: null, out: '', err: 'no python' });
  return enqueue(async () => {
    if (mode === 'worker') await workerReady;
    const req: EvalRequest = { snap: snapshot(state), code, cwd: state.cwd };
    if (mode === 'inline') return evalIn(inlinePy!, req);
    return workerJob(
      (id) => ({ type: 'eval', id, req }),
      (msg) => (msg as Extract<WorkerOut, { type: 'evaled' }>).done,
      () => undefined,
      (why) => ({ value: null, out: '', err: KILLED[why] }),
    );
  });
}
