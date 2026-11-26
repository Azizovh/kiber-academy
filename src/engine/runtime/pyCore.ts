/*
 * What runs next to a Pyodide instance — inside the Web Worker in the browser, in-process in tests and as the fallback
 * where a worker cannot start. It knows nothing about the shell: it receives a snapshot of the lab's files, mirrors it
 * into Pyodide's in-memory file system, runs the program and reports which files the program created, changed or
 * deleted. Everything that crosses this boundary is plain data, so it can go through postMessage.
 */

import type { PyodideInterface } from 'pyodide';

/** Seconds; the trace function stops Python code after this. The worker's watchdog adds a margin for C code. */
export const TIME_LIMIT = 10;
const MAX_LINES = 3000;

export interface FsSnapshot {
  /** Top-level folders that are mirrored (and replaced) as a whole: /home/<user>, /srv, /tmp ... */
  roots: string[];
  dirs: string[];
  /** [absolute path, content]; binary content is one character per byte, as in the simulator. */
  files: [string, string][];
}

export interface FsChanges {
  dirs: string[];
  files: [string, string][];
  deleted: string[];
}

export interface RunRequest {
  snap: FsSnapshot;
  kind: 'file' | 'code';
  target: string;
  argv: string[];
  cwd: string;
}

export interface RunDone {
  code: number;
  dropped: number;
  changes: FsChanges;
}

export interface EvalRequest {
  snap: FsSnapshot;
  code: string;
  cwd: string;
}

export interface EvalDone {
  value: unknown;
  out: string;
  err: string;
}

export type Stream = 'out' | 'err';

const BOOTSTRAP = `
import sys, os, time, runpy, traceback, importlib

_ka_deadline = [0.0]

def _ka_trace(frame, event, arg):
    if time.monotonic() > _ka_deadline[0]:
        sys.settrace(None)
        raise TimeoutError("dastur ${TIME_LIMIT} soniyadan ko'p ishladi (cheksiz sikl bo'lishi mumkin) va to'xtatildi")
    return _ka_trace

def _ka_user_frames(tb):
    keep = []
    for f in traceback.extract_tb(tb):
        name = f.filename
        if name.startswith('<frozen') or name == '<exec>' or '/lib/python' in name or name.endswith('runpy.py'):
            continue
        keep.append(f)
    return keep

def _ka_print_exc(etype, value, tb):
    if issubclass(etype, SyntaxError):
        sys.stderr.write(''.join(traceback.format_exception_only(etype, value)))
        return
    frames = _ka_user_frames(tb)
    sys.stderr.write('Traceback (most recent call last):\\n')
    sys.stderr.write(''.join(traceback.format_list(frames)))
    sys.stderr.write(''.join(traceback.format_exception_only(etype, value)))

def _ka_forget_user_modules():
    # Every run is a fresh "python3": modules imported from the lab's folders are imported again.
    for name, mod in list(sys.modules.items()):
        f = getattr(mod, '__file__', None) or ''
        if f.startswith('/home/') or f.startswith('/srv/') or f.startswith('/opt/'):
            del sys.modules[name]
    importlib.invalidate_caches()

def _ka_run(kind, target, argv, cwd):
    _ka_forget_user_modules()
    sys.argv = list(argv)
    old_path = list(sys.path)
    try:
        os.chdir(cwd)
    except OSError:
        pass
    sys.path.insert(0, os.path.dirname(os.path.abspath(target)) if kind == 'file' else '')
    _ka_deadline[0] = time.monotonic() + ${TIME_LIMIT}
    sys.settrace(_ka_trace)
    try:
        if kind == 'file':
            runpy.run_path(target, run_name='__main__')
        else:
            exec(compile(target, '<string>', 'exec'), {'__name__': '__main__'})
        return 0
    except SystemExit as e:
        code = e.code
        if code is None:
            return 0
        if isinstance(code, int):
            return code
        sys.stderr.write(str(code) + '\\n')
        return 1
    except BaseException:
        _ka_print_exc(*sys.exc_info())
        return 1
    finally:
        sys.settrace(None)
        sys.path[:] = old_path
        sys.stdout.flush()
        sys.stderr.flush()
`;

/** Prepares a freshly loaded Pyodide; returns the Python version ("3.14.0"). */
export function setup(py: PyodideInterface): string {
  py.runPython(BOOTSTRAP);
  py.setStdin({ stdin: () => null });
  return String(py.runPython('import sys; sys.version.split()[0]'));
}

/* ── file-system bridge ──────────────────────────────────────────── */

const mirrored = new Set<string>();

const isBinary = (s: string) => s.includes('\u0000') || s.startsWith('SQLite format 3') || s.startsWith('MZ');

function encode(content: string): Uint8Array {
  if (isBinary(content) && ![...content].some((c) => c.charCodeAt(0) > 0xff)) {
    const b = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) b[i] = content.charCodeAt(i);
    return b;
  }
  return new TextEncoder().encode(content);
}

function decode(bytes: Uint8Array): string {
  if (!bytes.includes(0)) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      /* not UTF-8: keep the bytes */
    }
  }
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return s;
}

type FS = PyodideInterface['FS'];

function rmTree(fs: FS, path: string) {
  try {
    const st = fs.stat(path);
    if (fs.isDir(st.mode)) {
      for (const n of fs.readdir(path)) if (n !== '.' && n !== '..') rmTree(fs, `${path}/${n}`);
      fs.rmdir(path);
    } else fs.unlink(path);
  } catch {
    /* already gone */
  }
}

function mirrorIn(py: PyodideInterface, snap: FsSnapshot) {
  const fs = py.FS;
  for (const p of mirrored) rmTree(fs, p);
  mirrored.clear();
  for (const r of snap.roots) {
    rmTree(fs, r);
    fs.mkdirTree(r);
    mirrored.add(r);
  }
  for (const d of snap.dirs) fs.mkdirTree(d);
  for (const [path, content] of snap.files) fs.writeFile(path, encode(content));
}

/** Compares Pyodide's file system with the snapshot the run started from. */
function changesSince(py: PyodideInterface, snap: FsSnapshot): FsChanges {
  const fs = py.FS;
  const before = new Map(snap.files);
  const knownDirs = new Set(snap.dirs);
  const out: FsChanges = { dirs: [], files: [], deleted: [] };
  const seen = new Set<string>();
  const visit = (path: string) => {
    let st;
    try {
      st = fs.stat(path);
    } catch {
      return;
    }
    if (fs.isDir(st.mode)) {
      if (!knownDirs.has(path) && !snap.roots.includes(path)) out.dirs.push(path);
      for (const n of fs.readdir(path)) if (n !== '.' && n !== '..') visit(`${path}/${n}`);
      return;
    }
    seen.add(path);
    const text = decode(fs.readFile(path) as Uint8Array);
    if (before.get(path) !== text) out.files.push([path, text]);
  };
  for (const r of snap.roots) visit(r);
  for (const path of before.keys()) if (!seen.has(path)) out.deleted.push(path);
  return out;
}

/* ── running ─────────────────────────────────────────────────────── */

/** Calls `run` with stdout/stderr going to `emit`, line by line, up to MAX_LINES; returns how many lines were cut. */
function capture(py: PyodideInterface, emit: (stream: Stream, text: string) => void, run: () => number): { code: number; dropped: number } {
  let lines = 0;
  let dropped = 0;
  const push = (stream: Stream) => (s: string) => {
    if (lines < MAX_LINES) {
      lines++;
      emit(stream, s);
    } else dropped++;
  };
  py.setStdout({ batched: push('out') });
  py.setStderr({ batched: push('err') });
  let code: number;
  try {
    code = run();
  } catch (e) {
    emit('err', String((e as Error).message ?? e));
    code = 1;
  } finally {
    py.setStdout();
    py.setStderr();
  }
  return { code, dropped };
}

/** Runs a Python file or a code string as `python3` would, in a copy of the lab's file system. */
export function runIn(py: PyodideInterface, req: RunRequest, emit: (stream: Stream, text: string) => void): RunDone {
  mirrorIn(py, req.snap);
  const runner = py.globals.get('_ka_run') as (kind: string, target: string, argv: string[], cwd: string) => number;
  const { code, dropped } = capture(py, emit, () => runner(req.kind, req.target, py.toPy(req.argv) as unknown as string[], req.cwd));
  return { code, dropped, changes: changesSince(py, req.snap) };
}

/** Evaluates code for a lab check; returns the value of the last expression as plain data. Nothing is written back. */
export function evalIn(py: PyodideInterface, req: EvalRequest): EvalDone {
  mirrorIn(py, req.snap);
  const out: string[] = [];
  const err: string[] = [];
  let value: unknown = null;
  capture(
    py,
    (stream, text) => (stream === 'out' ? out : err).push(text),
    () => {
      py.runPython(`import os\ntry:\n    os.chdir(${JSON.stringify(req.cwd)})\nexcept OSError:\n    pass`);
      const r = py.runPython(req.code, { globals: py.toPy({ __name__: 'tekshiruv' }) as never });
      value = r && typeof r === 'object' && 'toJs' in r ? (r as { toJs: (o: object) => unknown }).toJs({ dict_converter: Object.fromEntries }) : r;
      return 0;
    },
  );
  return { value, out: out.join('\n'), err: err.join('\n') };
}
