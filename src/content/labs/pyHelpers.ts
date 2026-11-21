/*
 * Hidden tests for Python lab tasks: import the learner's file (its `if __name__ == "__main__":` block does not run),
 * call one function with several inputs, and compare with expected values. Use as `...pyCases(...)` in a task: it
 * supplies `check` (all cases pass, after a python3 run) and `feedback` (the first failing case).
 */

import type { LabCheckCtx } from '../types';
import { evalPython, TIME_LIMIT } from '../../engine/runtime/python';

interface CaseResult {
  ok: boolean;
  call: string;
  got?: string;
  exp?: string;
  msg?: string;
}

const cache = new WeakMap<LabCheckCtx, CaseResult[]>();

/** A Python string literal for any JS string (JSON strings are valid Python literals for our inputs). */
export const pyStr = (s: string) => JSON.stringify(s);

function harness(file: string, func: string, cases: [string, string][]): string {
  return `
import importlib.util, json, sys, time
from __main__ import _ka_deadline, _ka_trace
def _ka_tests():
    path = ${pyStr(file)}
    try:
        spec = importlib.util.spec_from_file_location('talaba_kodi', path)
        m = importlib.util.module_from_spec(spec)
        _ka_deadline[0] = time.monotonic() + ${TIME_LIMIT}
        sys.settrace(_ka_trace)
        try:
            spec.loader.exec_module(m)
        finally:
            sys.settrace(None)
    except FileNotFoundError:
        return [{'ok': False, 'call': '', 'msg': path.split('/')[-1] + " fayli topilmadi"}]
    except BaseException as e:
        return [{'ok': False, 'call': '', 'msg': "Faylni yuklab bo'lmadi: " + type(e).__name__ + ': ' + str(e)}]
    f = getattr(m, ${pyStr(func)}, None)
    if not callable(f):
        return [{'ok': False, 'call': '', 'msg': ${pyStr(func)} + " funksiyasi topilmadi (nomini tekshiring)"}]
    out = []
    for a, e in ${JSON.stringify(cases)}:
        call = ${pyStr(func)} + '(' + a + ')'
        try:
            _ka_deadline[0] = time.monotonic() + ${TIME_LIMIT}
            sys.settrace(_ka_trace)
            try:
                got = eval('f(' + a + ')', {'f': f})
            finally:
                sys.settrace(None)
            if e.startswith('raises '):
                out.append({'ok': False, 'call': call, 'got': repr(got), 'exp': e[7:] + ' xatosi'})
                continue
            exp = eval(e)
            out.append({'ok': got == exp, 'call': call, 'got': repr(got), 'exp': repr(exp)})
        except BaseException as ex:
            if e.startswith('raises '):
                out.append({'ok': type(ex).__name__ == e[7:], 'call': call, 'got': type(ex).__name__ + ': ' + str(ex), 'exp': e[7:] + ' xatosi'})
            else:
                out.append({'ok': False, 'call': call, 'got': type(ex).__name__ + ': ' + str(ex), 'exp': e})
    return out
json.dumps(_ka_tests())
`;
}

function results(c: LabCheckCtx, file: string, func: string, cases: [string, string][]): CaseResult[] {
  const hit = cache.get(c);
  if (hit) return hit;
  const { value } = evalPython(c.state, harness(file, func, cases));
  let res: CaseResult[];
  try {
    res = JSON.parse(String(value)) as CaseResult[];
  } catch {
    res = [{ ok: false, call: '', msg: 'Testlarni ishga tushirib bo\'lmadi' }];
  }
  cache.set(c, res);
  return res;
}

const ranPython = (c: LabCheckCtx) => /^\s*python3\b/.test(c.line);

/**
 * `cases`: [Python arguments, expected value as Python] — e.g. [`"Failed password for root from 1.2.3.4"`, `"1.2.3.4"`].
 * The check passes after a `python3` command when every case returns the expected value.
 */
export function pyCases(file: string, func: string, cases: [string, string][]) {
  return {
    check: (c: LabCheckCtx) => ranPython(c) && results(c, file, func, cases).every((r) => r.ok),
    feedback: (c: LabCheckCtx) => {
      if (!ranPython(c)) return null;
      const res = results(c, file, func, cases);
      const bad = res.find((r) => !r.ok);
      if (!bad) return null;
      if (bad.msg) return `✗ Yashirin test: ${bad.msg}`;
      const passed = res.filter((r) => r.ok).length;
      return `✗ Yashirin testlar: ${passed}/${res.length} o'tdi. Birinchi xato: ${bad.call}\n  kutilgan: ${bad.exp}\n  sizniki:  ${bad.got}`;
    },
  };
}
