/*
 * Real CPython (Pyodide, WebAssembly). Loading is asynchronous; running code afterwards is synchronous, so the
 * terminal's `python3` stays an ordinary command. Before every run the lab's simulated file system is mirrored into
 * Pyodide's in-memory file system, and files the program creates or changes are copied back afterwards — so a
 * script reads the lab's logs and writes reports the terminal can `cat`.
 *
 * Safety nets for the main thread: a trace function stops a program after TIME_LIMIT seconds (an endless loop would
 * otherwise freeze the page), and output is capped.
 */

import type { PyodideInterface } from 'pyodide';
import { getNode, walk, type FsDir } from '../terminal/fs';
import type { ShellState } from '../terminal/shell';

let PY: PyodideInterface | null = null;
let loading: Promise<PyodideInterface> | null = null;

export const TIME_LIMIT = 5;
const MAX_LINES = 3000;

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

export function getPython(): PyodideInterface | null {
  return PY;
}

export function loadPython(): Promise<PyodideInterface> {
  if (PY) return Promise.resolve(PY);
  loading ??= (async () => {
    const { loadPyodide } = await import('pyodide');
    // In the browser the runtime files are served from public/pyodide (copied by scripts/copy-runtimes.mjs).
    const py = typeof window === 'undefined' ? await loadPyodide() : await loadPyodide({ indexURL: new URL('pyodide/', document.baseURI).href });
    py.runPython(BOOTSTRAP);
    py.setStdin({ stdin: () => null });
    PY = py;
    return py;
  })();
  return loading;
}

/* ── file-system bridge ──────────────────────────────────────────── */

/** Top-level folders of Pyodide's own file system that the lab must not replace. */
const SYSTEM = new Set(['dev', 'proc', 'lib', 'sys', 'usr', 'bin']);
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

function roots(state: ShellState): string[] {
  const out: string[] = [];
  for (const name of Object.keys(state.root.children)) {
    if (SYSTEM.has(name)) continue;
    if (name === 'home') {
      const home = state.root.children.home as FsDir;
      for (const u of Object.keys(home.children)) out.push(`/home/${u}`);
    } else out.push(`/${name}`);
  }
  return out;
}

function mirrorIn(py: PyodideInterface, state: ShellState): string[] {
  const fs = py.FS;
  for (const p of mirrored) rmTree(fs, p);
  mirrored.clear();
  const rs = roots(state);
  for (const r of rs) {
    rmTree(fs, r);
    for (const { path, node } of walk(state.root, r)) {
      if (node.type === 'dir') fs.mkdirTree(path);
      else fs.writeFile(path, encode(node.content));
    }
    mirrored.add(r);
  }
  return rs;
}

function mirrorOut(py: PyodideInterface, state: ShellState, rs: string[]) {
  const fs = py.FS;
  const seen = new Set<string>();
  const visit = (path: string) => {
    let st;
    try {
      st = fs.stat(path);
    } catch {
      return;
    }
    if (fs.isDir(st.mode)) {
      ensureDir(state, path);
      for (const n of fs.readdir(path)) if (n !== '.' && n !== '..') visit(`${path}/${n}`);
      return;
    }
    seen.add(path);
    const text = decode(fs.readFile(path) as Uint8Array);
    const node = getNode(state.root, path);
    if (node && node.type === 'file') {
      if (node.content !== text) {
        node.content = text;
        node.mtime = Date.now();
      }
    } else {
      const parent = ensureDir(state, path.slice(0, path.lastIndexOf('/')) || '/');
      parent.children[path.slice(path.lastIndexOf('/') + 1)] = { type: 'file', content: text, mode: 0o644, owner: state.user, mtime: Date.now() };
    }
  };
  for (const r of rs) visit(r);
  // Files the program deleted (os.remove) disappear from the lab too.
  for (const r of rs) {
    for (const { path, node } of walk(state.root, r)) {
      if (node.type === 'file' && !seen.has(path)) {
        const parent = getNode(state.root, path.slice(0, path.lastIndexOf('/')) || '/');
        if (parent?.type === 'dir') delete parent.children[path.slice(path.lastIndexOf('/') + 1)];
      }
    }
  }
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

/* ── running ─────────────────────────────────────────────────────── */

export interface PyRun {
  out: string;
  err: string;
  code: number;
}

function capture(py: PyodideInterface, run: () => number): PyRun {
  const out: string[] = [];
  const err: string[] = [];
  let dropped = 0;
  const push = (arr: string[]) => (s: string) => {
    if (out.length + err.length < MAX_LINES) arr.push(s);
    else dropped++;
  };
  py.setStdout({ batched: push(out) });
  py.setStderr({ batched: push(err) });
  let code: number;
  try {
    code = run();
  } catch (e) {
    err.push(String((e as Error).message ?? e));
    code = 1;
  } finally {
    py.setStdout();
    py.setStderr();
  }
  if (dropped) err.push(`... chiqish juda uzun: yana ${dropped} qator ko'rsatilmadi`);
  return { out: out.join('\n'), err: err.join('\n'), code };
}

/** Runs a Python file or a code string as `python3` would, in the lab's file system. */
export function runPython(state: ShellState, kind: 'file' | 'code', target: string, argv: string[]): PyRun {
  const py = PY;
  if (!py) return { out: '', err: 'python3: Python hali yuklanmagan — sahifani qayta oching.', code: 1 };
  const rs = mirrorIn(py, state);
  const runner = py.globals.get('_ka_run') as (kind: string, target: string, argv: string[], cwd: string) => number;
  const res = capture(py, () => runner(kind, target, py.toPy(argv) as unknown as string[], state.cwd));
  mirrorOut(py, state, rs);
  return res;
}

/**
 * Evaluates Python for a lab check (hidden tests): the lab's files are visible, nothing is written back, and the
 * value of the last expression is returned as JSON-able data.
 */
export function evalPython(state: ShellState, code: string): { value: unknown; out: string; err: string } {
  const py = PY;
  if (!py) return { value: null, out: '', err: 'no python' };
  mirrorIn(py, state);
  let value: unknown = null;
  const res = capture(py, () => {
    const prev = state.cwd;
    py.runPython(`import os\ntry:\n    os.chdir(${JSON.stringify(prev)})\nexcept OSError:\n    pass`);
    const r = py.runPython(code, { globals: py.toPy({ __name__: 'tekshiruv' }) as never });
    value = r && typeof r === 'object' && 'toJs' in r ? (r as { toJs: (o: object) => unknown }).toJs({ dict_converter: Object.fromEntries }) : r;
    return 0;
  });
  return { value, out: res.out, err: res.err };
}
