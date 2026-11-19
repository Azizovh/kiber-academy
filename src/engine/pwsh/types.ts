import type { ShellState } from '../terminal/shell';
import type { WinState } from './state';
import { toNum, toStr, truthy, type PsBlock, type PsVal } from './values';

export class PsError extends Error {}

export interface ParamSpec {
  name: string;
  switch?: boolean;
  /** Positional index. */
  pos?: number;
  aliases?: string[];
}

export interface Bound {
  has(name: string): boolean;
  get(name: string): PsVal | undefined;
  str(name: string): string | undefined;
  strs(name: string): string[] | undefined;
  num(name: string): number | undefined;
  sw(name: string): boolean;
  /** Raw words for native commands (ipconfig /all). */
  rest: string[];
}

export interface Session {
  state: ShellState;
  win: WinState;
  errors: string[];
}

export interface CmdletCtx {
  s: Session;
  /** Pipeline input (already flattened). */
  input: PsVal[];
  piped: boolean;
  p: Bound;
  /** The name as typed (aliases included), used in error messages. */
  name: string;
  runBlock: (block: PsBlock, item?: PsVal) => PsVal[];
  /** A non-terminating error: reported, and the cmdlet carries on. */
  error: (msg: string) => void;
}

export interface Cmdlet {
  name: string;
  params: ParamSpec[];
  /** Native command: keep every argument as a raw word in `rest`. */
  native?: boolean;
  /** Needs an elevated session. */
  admin?: boolean;
  run: (c: CmdletCtx) => PsVal[] | PsVal;
}

export const ACCESS_DENIED = 'Access is denied. (Bu amal uchun PowerShell administrator sifatida ochilgan bo\'lishi kerak.)';

/** PowerShell wildcard (* ? [abc]) as a case-insensitive, anchored RegExp. */
export function wild(pattern: string): RegExp {
  let re = '';
  for (const ch of pattern) {
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else if (ch === '[' || ch === ']') re += ch;
    else re += ch.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'is');
}

export const hasWild = (s: string) => /[*?[]/.test(s);

/** Values given to a name filter: -Name a,b or -Name a*. */
export function nameFilter(p: Bound, param = 'Name'): ((name: string) => boolean) | null {
  const names = p.strs(param);
  if (!names) return null;
  const res = names.map(wild);
  return (n) => res.some((r) => r.test(n));
}

export function makeBound(values: Record<string, PsVal>, rest: string[]): Bound {
  const find = (name: string) => {
    const lower = name.toLowerCase();
    return Object.keys(values).find((k) => k.toLowerCase() === lower);
  };
  const get = (name: string) => {
    const k = find(name);
    return k === undefined ? undefined : values[k];
  };
  return {
    has: (n) => find(n) !== undefined,
    get,
    str: (n) => {
      const v = get(n);
      return v === undefined ? undefined : Array.isArray(v) ? v.map(toStr).join(',') : toStr(v);
    },
    strs: (n) => {
      const v = get(n);
      if (v === undefined) return undefined;
      return (Array.isArray(v) ? v : [v]).map(toStr);
    },
    num: (n) => {
      const v = get(n);
      return v === undefined ? undefined : toNum(v);
    },
    sw: (n) => {
      const v = get(n);
      return v !== undefined && truthy(v);
    },
    rest,
  };
}
