/*
 * The Python Web Worker: Pyodide lives here, so a slow program never freezes the page, and the page can stop any
 * program — even one stuck inside a single C call — by terminating this worker and starting a new one.
 * Protocol (all plain data): see WorkerIn / WorkerOut in python.ts.
 */

import type { PyodideInterface } from 'pyodide';
import { evalIn, runIn, setup } from './pyCore';
import type { WorkerIn, WorkerOut } from './python';

const post = (msg: WorkerOut) => (self as unknown as Worker).postMessage(msg);
let py: PyodideInterface | null = null;

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    try {
      const { loadPyodide } = await import('pyodide');
      py = await loadPyodide({ indexURL: msg.indexURL });
      post({ type: 'ready', version: setup(py) });
    } catch (err) {
      post({ type: 'failed', message: String((err as Error)?.message ?? err) });
    }
    return;
  }
  if (!py) return;
  if (msg.type === 'run') {
    const done = runIn(py, msg.req, (stream, text) => post({ type: 'line', id: msg.id, stream, text }));
    post({ type: 'done', id: msg.id, done });
  } else if (msg.type === 'eval') {
    let done;
    try {
      done = evalIn(py, msg.req);
    } catch (err) {
      done = { value: null, out: '', err: String((err as Error)?.message ?? err) };
    }
    post({ type: 'evaled', id: msg.id, done });
  }
};
