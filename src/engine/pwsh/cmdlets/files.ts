import { basename, dirname, getNode, mtimeOf, type FsDir, type FsNode } from '../../terminal/fs';
import type { ShellState } from '../../terminal/shell';
import { sha256Hex } from '../../terminal/text';
import { normRegPath, regKeyName, type RegKey, type WinState } from '../state';
import { hasWild, PsError, wild, type Cmdlet, type CmdletCtx } from '../types';
import { date, flat, getProp, isObj, obj, toStr, type PsObj, type PsVal } from '../values';
import { formatOutput } from '../format';

/* ── paths: C:\ maps to the simulator's root; names match case-insensitively, as on NTFS ── */

export function winPath(posix: string): string {
  return 'C:' + (posix === '/' ? '\\' : posix.replace(/\//g, '\\'));
}

export const isRegPath = (p: string) => /^(HKLM|HKCU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|Registry::)/i.test(p.trim());
export const isEnvPath = (p: string) => /^env:/i.test(p.trim());

/** Resolve what the user typed to an absolute simulator path with the real names' case. */
export function resolveWin(state: ShellState, input: string): string {
  let s = input.trim().replace(/^FileSystem::/i, '').replace(/\//g, '\\');
  if (s === '~' || s.startsWith('~\\')) s = winPath(state.home) + s.slice(1);
  const drive = /^([A-Za-z]):/.exec(s);
  if (drive) {
    if (drive[1]!.toUpperCase() !== 'C') throw new PsError(`Cannot find drive. A drive with the name '${drive[1]}' does not exist.`);
    s = s.slice(2);
    if (!s.startsWith('\\')) s = '\\' + s;
  }
  const parts: string[] = s.startsWith('\\') ? [] : state.cwd.split('/').filter(Boolean);
  for (const seg of s.split('\\')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  let node: FsNode | null = state.root;
  const real: string[] = [];
  for (const seg of parts) {
    if (node && node.type === 'dir') {
      const name: string | undefined = Object.keys(node.children).find((k) => k.toLowerCase() === seg.toLowerCase());
      if (name) {
        real.push(name);
        node = node.children[name]!;
        continue;
      }
    }
    real.push(seg);
    node = null;
  }
  return '/' + real.join('/');
}

export const isHidden = (win: WinState, posix: string) => win.hidden.has(winPath(posix).toLowerCase());

function mode(win: WinState, posix: string, node: FsNode): string {
  const h = isHidden(win, posix) ? 'h' : '-';
  return node.type === 'dir' ? `d--${h}-` : `-a-${h}-`;
}

export function itemObj(win: WinState, posix: string, node: FsNode): PsObj {
  const name = posix === '/' ? 'C:\\' : basename(posix);
  const parent = winPath(dirname(posix));
  const full = winPath(posix);
  const ext = node.type === 'file' && name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const hidden = isHidden(win, posix);
  const props: Record<string, PsVal> = {
    Mode: mode(win, posix, node),
    LastWriteTime: date(mtimeOf(node)),
    Length: node.type === 'file' ? new TextEncoder().encode(node.content).length : null,
    Name: name,
    FullName: full,
    Extension: ext,
    BaseName: ext ? name.slice(0, -ext.length) : name,
    DirectoryName: node.type === 'file' ? parent : null,
    Attributes: node.type === 'dir' ? (hidden ? 'Hidden, Directory' : 'Directory') : hidden ? 'Hidden, Archive' : 'Archive',
    CreationTime: date(mtimeOf(node)),
    PSIsContainer: node.type === 'dir',
  };
  if (node.type === 'dir') delete props.Length;
  return obj(node.type === 'dir' ? 'System.IO.DirectoryInfo' : 'System.IO.FileInfo', props, {
    str: full,
    group: 'fs:' + parent,
    header: `    Directory: ${parent}`,
    view: ['Mode', 'LastWriteTime', 'Length', 'Name'],
  });
}

/** The literal paths a wildcard path stands for (wildcards only in the last segment). */
export function expandPath(c: CmdletCtx, input: string): string[] {
  const posix = resolveWin(c.s.state, input);
  const last = basename(posix);
  if (!hasWild(last)) return [posix];
  const parent = dirname(posix);
  const dirNode = getNode(c.s.state.root, parent);
  if (!dirNode || dirNode.type !== 'dir') return [];
  const re = wild(last);
  return Object.keys(dirNode.children)
    .filter((n) => re.test(n))
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map((n) => (parent === '/' ? '' : parent) + '/' + n);
}

const notFound = (p: string) => `Cannot find path '${p}' because it does not exist.`;

/** Paths from -Path, -LiteralPath, or FileInfo objects on the pipeline. */
function inputPaths(c: CmdletCtx, param = 'Path'): string[] {
  const given = c.p.strs(param) ?? c.p.strs('LiteralPath');
  if (given) return given;
  return c.input.map((v) => toStr(getProp(v, 'FullName') ?? getProp(v, 'Path') ?? v));
}

export function readText(c: CmdletCtx, input: string): string {
  const posix = resolveWin(c.s.state, input);
  const node = getNode(c.s.state.root, posix);
  if (!node) throw new PsError(notFound(winPath(posix)));
  if (node.type === 'dir') throw new PsError(`Unable to get content because it is a directory: '${winPath(posix)}'. Please use 'Get-ChildItem' instead.`);
  return node.content;
}

export function writeText(state: ShellState, input: string, text: string, append: boolean): void {
  const posix = resolveWin(state, input);
  const parent = getNode(state.root, dirname(posix));
  if (!parent || parent.type !== 'dir') throw new PsError(`Could not find a part of the path '${winPath(posix)}'.`);
  const name = basename(posix);
  const existing = parent.children[name];
  if (existing?.type === 'dir') throw new PsError(`Access to the path '${winPath(posix)}' is denied.`);
  const body = text === '' ? '' : text.endsWith('\n') ? text : text + '\n';
  const mtime = Date.UTC(2026, 10, 17, 9, 30, 0) + state.history.length * 1000;
  if (existing && append) {
    existing.content += body;
    existing.mtime = mtime;
  } else parent.children[name] = { type: 'file', content: body, mode: 0o644, owner: state.user, mtime };
}

const lines = (text: string) => {
  const ls = text.split('\n');
  if (ls[ls.length - 1] === '') ls.pop();
  return ls;
};

/* ── registry ── */

function regChildren(win: WinState, path: string): RegKey[] {
  const prefix = regKeyName(path) + '\\';
  const names = new Map<string, RegKey>();
  for (const [k, v] of win.registry) {
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    const child = rest.split('\\')[0]!;
    const childKey = prefix + child;
    if (!names.has(childKey)) names.set(childKey, win.registry.get(childKey) ?? { path: v.path.slice(0, prefix.length + child.length), values: {} });
  }
  return [...names.values()];
}

function regExists(win: WinState, path: string): boolean {
  const k = regKeyName(path);
  if (win.registry.has(k)) return true;
  if (/^hk(lm|cu):\\?$/.test(k)) return true;
  return [...win.registry.keys()].some((x) => x.startsWith(k + '\\'));
}

function regKeyObj(key: RegKey): PsObj {
  const name = key.path.split('\\').pop()!;
  const parent = key.path.slice(0, key.path.length - name.length - 1);
  const property = Object.entries(key.values).map(([n, v]) => `${n} : ${v}`);
  return obj('Microsoft.Win32.RegistryKey', { Name: name, Property: property, PSPath: key.path }, {
    group: 'reg:' + parent,
    header: `    Hive: ${parent.replace(/^HKLM:/, 'HKEY_LOCAL_MACHINE').replace(/^HKCU:/, 'HKEY_CURRENT_USER')}`,
    view: ['Name', 'Property'],
    str: key.path,
  });
}

function regValuesObj(key: RegKey, only?: string[]): PsObj {
  const props: Record<string, PsVal> = {};
  for (const [n, v] of Object.entries(key.values)) if (!only || only.some((o) => wild(o).test(n))) props[n] = v;
  const full = key.path.replace(/^HKLM:/, 'HKEY_LOCAL_MACHINE').replace(/^HKCU:/, 'HKEY_CURRENT_USER');
  const name = key.path.split('\\').pop()!;
  props.PSPath = `Microsoft.PowerShell.Core\\Registry::${full}`;
  props.PSParentPath = `Microsoft.PowerShell.Core\\Registry::${full.slice(0, full.length - name.length - 1)}`;
  props.PSChildName = name;
  props.PSDrive = key.path.slice(0, 4);
  props.PSProvider = 'Microsoft.PowerShell.Core\\Registry';
  return obj('System.Management.Automation.PSCustomObject', props, { list: true });
}

function getKey(win: WinState, path: string): RegKey {
  const key = win.registry.get(regKeyName(path));
  if (key) return key;
  if (regExists(win, path)) return { path: normRegPath(path), values: {} };
  throw new PsError(notFound(normRegPath(path)));
}

/* ── cmdlets ── */

const getChildItem: Cmdlet = {
  name: 'Get-ChildItem',
  params: [
    { name: 'Path', pos: 0 },
    { name: 'Filter', pos: 1 },
    { name: 'Recurse', switch: true, aliases: ['s'] },
    { name: 'Force', switch: true },
    { name: 'File', switch: true },
    { name: 'Directory', switch: true, aliases: ['ad'] },
    { name: 'Hidden', switch: true, aliases: ['h'] },
    { name: 'Name', switch: true },
    { name: 'Include' },
    { name: 'Exclude' },
    { name: 'Depth' },
    { name: 'LiteralPath' },
  ],
  run: (c) => {
    const win = c.s.win;
    const paths = c.p.strs('Path') ?? c.p.strs('LiteralPath') ?? ['.'];
    const out: PsVal[] = [];
    for (const p of paths) {
      if (isEnvPath(p)) {
        const filter = p.replace(/^env:\\?/i, '');
        const re = filter ? wild(filter) : null;
        for (const [k, v] of Object.entries(win.env).sort(([a], [b]) => a.localeCompare(b))) {
          if (!re || re.test(k)) out.push(obj('System.Collections.DictionaryEntry', { Name: k, Value: v }, { view: ['Name', 'Value'] }));
        }
        continue;
      }
      if (isRegPath(p)) {
        if (!regExists(win, p)) {
          c.error(notFound(normRegPath(p)));
          continue;
        }
        const visit = (path: string) => {
          for (const k of regChildren(win, path)) {
            out.push(regKeyObj(k));
            if (c.p.sw('Recurse')) visit(k.path);
          }
        };
        visit(p);
        continue;
      }
      const targets = expandPath(c, p);
      if (!targets.length || targets.every((t) => !getNode(c.s.state.root, t))) {
        c.error(notFound(winPath(resolveWin(c.s.state, p))));
        continue;
      }
      const filter = c.p.str('Filter');
      const include = c.p.strs('Include')?.map(wild);
      const exclude = c.p.strs('Exclude')?.map(wild);
      const maxDepth = c.p.has('Depth') ? c.p.num('Depth')! : c.p.sw('Recurse') ? Infinity : 0;
      const show = (posix: string, node: FsNode) => {
        const name = basename(posix);
        const hidden = isHidden(win, posix);
        if (c.p.sw('Hidden') ? !hidden : hidden && !c.p.sw('Force')) return false;
        if (c.p.sw('File') && node.type !== 'file') return false;
        if (c.p.sw('Directory') && node.type !== 'dir') return false;
        if (filter && !wild(filter).test(name)) return false;
        if (include && !include.some((r) => r.test(name))) return false;
        if (exclude && exclude.some((r) => r.test(name))) return false;
        return true;
      };
      let listRoot = '/';
      const rel = (posix: string) => (posix.startsWith(listRoot === '/' ? '/' : listRoot + '/') ? posix.slice(listRoot === '/' ? 1 : listRoot.length + 1) : basename(posix));
      const emit = (posix: string, node: FsNode) => out.push(c.p.sw('Name') ? rel(posix).replace(/\//g, '\\') : itemObj(win, posix, node));
      const list = (dirPath: string, dir: FsDir, depth: number) => {
        const names = Object.keys(dir.children).sort((a, b) => {
          const da = dir.children[a]!.type === 'dir' ? 0 : 1;
          const db = dir.children[b]!.type === 'dir' ? 0 : 1;
          return da - db || a.localeCompare(b, 'en', { sensitivity: 'base' });
        });
        const sub: [string, FsDir][] = [];
        for (const n of names) {
          const child = dir.children[n]!;
          const childPath = (dirPath === '/' ? '' : dirPath) + '/' + n;
          if (show(childPath, child)) emit(childPath, child);
          if (child.type === 'dir' && depth < maxDepth && (!isHidden(win, childPath) || c.p.sw('Force') || c.p.sw('Hidden'))) sub.push([childPath, child]);
        }
        for (const [sp, sd] of sub) list(sp, sd, depth + 1);
      };
      for (const t of targets) {
        const node = getNode(c.s.state.root, t);
        if (!node) continue;
        listRoot = node.type === 'dir' ? t : dirname(t);
        if (node.type === 'dir' && (targets.length === 1 || !hasWild(basename(resolveWin(c.s.state, p))))) list(t, node, 0);
        else if (show(t, node) || targets.length === 1) emit(t, node);
      }
    }
    return out;
  },
};

const getItem: Cmdlet = {
  name: 'Get-Item',
  params: [{ name: 'Path', pos: 0 }, { name: 'Force', switch: true }, { name: 'LiteralPath' }],
  run: (c) => {
    const out: PsVal[] = [];
    for (const p of inputPaths(c)) {
      if (isRegPath(p)) {
        try {
          out.push(regKeyObj(getKey(c.s.win, p)));
        } catch (e) {
          c.error((e as Error).message);
        }
        continue;
      }
      const targets = expandPath(c, p).filter((t) => getNode(c.s.state.root, t));
      if (!targets.length) c.error(notFound(winPath(resolveWin(c.s.state, p))));
      for (const t of targets) out.push(itemObj(c.s.win, t, getNode(c.s.state.root, t)!));
    }
    return out;
  },
};

const getItemProperty: Cmdlet = {
  name: 'Get-ItemProperty',
  params: [{ name: 'Path', pos: 0 }, { name: 'Name', pos: 1 }, { name: 'LiteralPath' }],
  run: (c) => {
    const out: PsVal[] = [];
    for (const p of inputPaths(c)) {
      if (isRegPath(p)) {
        const key = getKey(c.s.win, p);
        const only = c.p.strs('Name');
        if (only && !Object.keys(key.values).some((n) => only.some((o) => wild(o).test(n)))) {
          c.error(`Property ${only.join(', ')} does not exist at path ${key.path.replace(/^HKLM:/, 'HKEY_LOCAL_MACHINE')}.`);
          continue;
        }
        out.push(regValuesObj(key, only));
        continue;
      }
      for (const t of expandPath(c, p)) {
        const node = getNode(c.s.state.root, t);
        if (!node) c.error(notFound(winPath(t)));
        else out.push(itemObj(c.s.win, t, node));
      }
    }
    return out;
  },
};

const setItemProperty: Cmdlet = {
  name: 'Set-ItemProperty',
  admin: true,
  params: [{ name: 'Path', pos: 0 }, { name: 'Name', pos: 1 }, { name: 'Value', pos: 2 }, { name: 'Type', aliases: ['PropertyType'] }, { name: 'Force', switch: true }],
  run: (c) => {
    const path = c.p.str('Path')!;
    if (!isRegPath(path)) throw new PsError('Bu simulyatorda Set-ItemProperty faqat registr uchun.');
    const name = c.p.str('Name');
    if (!name) throw new PsError("Missing an argument for parameter 'Name'.");
    const k = regKeyName(path);
    if (!regExists(c.s.win, path)) throw new PsError(notFound(normRegPath(path)));
    const key = c.s.win.registry.get(k) ?? { path: normRegPath(path), values: {} };
    const v = c.p.get('Value');
    key.values[name] = typeof v === 'number' ? v : toStr(v ?? '');
    c.s.win.registry.set(k, key);
    return [];
  },
};

const newItemProperty: Cmdlet = { ...setItemProperty, name: 'New-ItemProperty' };

const removeItemProperty: Cmdlet = {
  name: 'Remove-ItemProperty',
  admin: true,
  params: [{ name: 'Path', pos: 0 }, { name: 'Name', pos: 1 }, { name: 'Force', switch: true }],
  run: (c) => {
    const path = c.p.str('Path')!;
    if (!isRegPath(path)) throw new PsError('Bu simulyatorda Remove-ItemProperty faqat registr uchun.');
    const key = getKey(c.s.win, path);
    for (const name of c.p.strs('Name') ?? []) {
      const real = Object.keys(key.values).find((n) => n.toLowerCase() === name.toLowerCase());
      if (!real) c.error(`Property ${name} does not exist at path ${key.path.replace(/^HKLM:/, 'HKEY_LOCAL_MACHINE')}.`);
      else delete key.values[real];
    }
    return [];
  },
};

const newItem: Cmdlet = {
  name: 'New-Item',
  params: [{ name: 'Path', pos: 0 }, { name: 'Name' }, { name: 'ItemType', aliases: ['Type'] }, { name: 'Value' }, { name: 'Force', switch: true }],
  run: (c) => {
    let path = c.p.str('Path') ?? '.';
    if (c.p.has('Name')) path = path.replace(/[\\/]+$/, '') + '\\' + c.p.str('Name');
    if (isRegPath(path)) {
      const k = regKeyName(path);
      if (!c.s.win.registry.has(k)) c.s.win.registry.set(k, { path: normRegPath(path), values: {} });
      return regKeyObj(c.s.win.registry.get(k)!);
    }
    const type = (c.p.str('ItemType') ?? 'File').toLowerCase();
    const posix = resolveWin(c.s.state, path);
    const parentPath = dirname(posix);
    let parent = getNode(c.s.state.root, parentPath);
    if (!parent && c.p.sw('Force')) {
      mkdirs(c.s.state, parentPath);
      parent = getNode(c.s.state.root, parentPath);
    }
    if (!parent || parent.type !== 'dir') throw new PsError(`Could not find a part of the path '${winPath(posix)}'.`);
    const name = basename(posix);
    if (parent.children[name] && !c.p.sw('Force')) throw new PsError(`An item with the specified name ${winPath(posix)} already exists.`);
    const mtime = Date.UTC(2026, 10, 17, 9, 30, 0) + c.s.state.history.length * 1000;
    if (type.startsWith('dir')) parent.children[name] = { type: 'dir', children: {}, mode: 0o755, owner: c.s.state.user, mtime };
    else {
      const value = c.p.has('Value') ? toStr(c.p.get('Value')!) : '';
      parent.children[name] = { type: 'file', content: value ? value + '\n' : '', mode: 0o644, owner: c.s.state.user, mtime };
    }
    return itemObj(c.s.win, posix, parent.children[name]!);
  },
};

function mkdirs(state: ShellState, posix: string) {
  let node: FsDir = state.root;
  for (const seg of posix.split('/').filter(Boolean)) {
    const name = Object.keys(node.children).find((k) => k.toLowerCase() === seg.toLowerCase()) ?? seg;
    if (!node.children[name]) node.children[name] = { type: 'dir', children: {}, mode: 0o755, owner: state.user };
    const next = node.children[name]!;
    if (next.type !== 'dir') throw new PsError(`An item with the specified name already exists.`);
    node = next;
  }
}

const mkdir: Cmdlet = {
  name: 'mkdir',
  params: [{ name: 'Path', pos: 0 }, { name: 'Force', switch: true }],
  run: (c) => {
    const out: PsVal[] = [];
    for (const p of c.p.strs('Path') ?? []) {
      const posix = resolveWin(c.s.state, p);
      if (getNode(c.s.state.root, posix) && !c.p.sw('Force')) {
        c.error(`An item with the specified name ${winPath(posix)} already exists.`);
        continue;
      }
      mkdirs(c.s.state, posix);
      out.push(itemObj(c.s.win, posix, getNode(c.s.state.root, posix)!));
    }
    return out;
  },
};

const removeItem: Cmdlet = {
  name: 'Remove-Item',
  params: [{ name: 'Path', pos: 0 }, { name: 'Recurse', switch: true, aliases: ['r'] }, { name: 'Force', switch: true }, { name: 'LiteralPath' }],
  run: (c) => {
    for (const p of inputPaths(c)) {
      if (isRegPath(p)) {
        const k = regKeyName(p);
        if (!regExists(c.s.win, p)) {
          c.error(notFound(normRegPath(p)));
          continue;
        }
        if (!c.s.win.elevated && k.startsWith('hklm')) throw new PsError(`Requested registry access is not allowed.`);
        for (const key of [...c.s.win.registry.keys()]) if (key === k || key.startsWith(k + '\\')) c.s.win.registry.delete(key);
        continue;
      }
      const targets = expandPath(c, p).filter((t) => getNode(c.s.state.root, t));
      if (!targets.length) {
        c.error(notFound(winPath(resolveWin(c.s.state, p))));
        continue;
      }
      for (const t of targets) {
        const node = getNode(c.s.state.root, t)!;
        if (systemPath(t) && !c.s.win.elevated) {
          c.error(`Access to the path '${winPath(t)}' is denied.`);
          continue;
        }
        if (node.type === 'dir' && Object.keys(node.children).length && !c.p.sw('Recurse')) {
          c.error(`The item at ${winPath(t)} has children and the Recurse parameter was not specified. Qo'shing: -Recurse`);
          continue;
        }
        const parent = getNode(c.s.state.root, dirname(t)) as FsDir;
        delete parent.children[basename(t)];
        c.s.win.hidden.delete(winPath(t).toLowerCase());
      }
    }
    return [];
  },
};

const systemPath = (posix: string) => /^\/(windows|program files|programdata)(\/|$)/i.test(posix);

function copyNode(node: FsNode): FsNode {
  if (node.type === 'file') return { ...node };
  const children: Record<string, FsNode> = {};
  for (const [k, v] of Object.entries(node.children)) children[k] = copyNode(v);
  return { ...node, children };
}

function transfer(c: CmdletCtx, move: boolean) {
  const src = c.p.str('Path')!;
  const destIn = c.p.str('Destination');
  if (!destIn) throw new PsError("Missing an argument for parameter 'Destination'.");
  for (const t of expandPath(c, src)) {
    const node = getNode(c.s.state.root, t);
    if (!node) {
      c.error(notFound(winPath(t)));
      continue;
    }
    if (node.type === 'dir' && !move && !c.p.sw('Recurse')) {
      // Real Copy-Item copies just the empty folder without -Recurse.
    }
    let dest = resolveWin(c.s.state, destIn);
    const destNode = getNode(c.s.state.root, dest);
    if (destNode?.type === 'dir') dest = (dest === '/' ? '' : dest) + '/' + basename(t);
    const parent = getNode(c.s.state.root, dirname(dest));
    if (!parent || parent.type !== 'dir') {
      c.error(`Could not find a part of the path '${winPath(dest)}'.`);
      continue;
    }
    const copy = copyNode(node);
    if (copy.type === 'dir' && !move && !c.p.sw('Recurse')) copy.children = {};
    parent.children[basename(dest)] = copy;
    if (move) {
      delete (getNode(c.s.state.root, dirname(t)) as FsDir).children[basename(t)];
    }
  }
  return [];
}

const copyItem: Cmdlet = {
  name: 'Copy-Item',
  params: [{ name: 'Path', pos: 0 }, { name: 'Destination', pos: 1 }, { name: 'Recurse', switch: true }, { name: 'Force', switch: true }],
  run: (c) => transfer(c, false),
};

const moveItem: Cmdlet = {
  name: 'Move-Item',
  params: [{ name: 'Path', pos: 0 }, { name: 'Destination', pos: 1 }, { name: 'Force', switch: true }],
  run: (c) => transfer(c, true),
};

const renameItem: Cmdlet = {
  name: 'Rename-Item',
  params: [{ name: 'Path', pos: 0 }, { name: 'NewName', pos: 1 }, { name: 'Force', switch: true }],
  run: (c) => {
    const t = resolveWin(c.s.state, c.p.str('Path')!);
    const node = getNode(c.s.state.root, t);
    if (!node) throw new PsError(notFound(winPath(t)));
    const parent = getNode(c.s.state.root, dirname(t)) as FsDir;
    const newName = c.p.str('NewName')!;
    if (parent.children[newName]) throw new PsError('Cannot create a file when that file already exists.');
    delete parent.children[basename(t)];
    parent.children[newName] = node;
    return [];
  },
};

const testPath: Cmdlet = {
  name: 'Test-Path',
  params: [{ name: 'Path', pos: 0 }, { name: 'PathType' }, { name: 'LiteralPath' }],
  run: (c) =>
    inputPaths(c).map((p) => {
      if (isRegPath(p)) return regExists(c.s.win, p);
      if (isEnvPath(p)) return Object.keys(c.s.win.env).some((k) => k.toLowerCase() === p.slice(4).replace(/^\\/, '').toLowerCase());
      const targets = expandPath(c, p).map((t) => getNode(c.s.state.root, t)).filter(Boolean) as FsNode[];
      const type = c.p.str('PathType')?.toLowerCase();
      if (type === 'leaf') return targets.some((n) => n.type === 'file');
      if (type === 'container') return targets.some((n) => n.type === 'dir');
      return targets.length > 0;
    }),
};

const getContent: Cmdlet = {
  name: 'Get-Content',
  params: [
    { name: 'Path', pos: 0 },
    { name: 'TotalCount', aliases: ['Head', 'First'] },
    { name: 'Tail', aliases: ['Last'] },
    { name: 'Raw', switch: true },
    { name: 'Encoding' },
    { name: 'LiteralPath' },
  ],
  run: (c) => {
    const out: PsVal[] = [];
    for (const p of inputPaths(c)) {
      if (isEnvPath(p)) {
        const key = Object.keys(c.s.win.env).find((k) => k.toLowerCase() === p.replace(/^env:\\?/i, '').toLowerCase());
        if (key) out.push(c.s.win.env[key]!);
        else c.error(notFound(p));
        continue;
      }
      const targets = expandPath(c, p);
      if (!targets.length) c.error(notFound(winPath(resolveWin(c.s.state, p))));
      for (const t of targets) {
        let text: string;
        try {
          text = readText(c, winPath(t));
        } catch (e) {
          c.error((e as Error).message);
          continue;
        }
        if (c.p.sw('Raw')) {
          out.push(text);
          continue;
        }
        let ls = lines(text);
        if (c.p.has('TotalCount')) ls = ls.slice(0, c.p.num('TotalCount'));
        if (c.p.has('Tail')) ls = ls.slice(Math.max(0, ls.length - c.p.num('Tail')!));
        out.push(...ls);
      }
    }
    return out;
  },
};

function contentWriter(name: string, append: boolean): Cmdlet {
  return {
    name,
    params: [{ name: 'Path', pos: 0 }, { name: 'Value', pos: 1 }, { name: 'Encoding' }, { name: 'Force', switch: true }, { name: 'NoNewline', switch: true }],
    run: (c) => {
      const value = c.p.has('Value') ? flat([c.p.get('Value')!]) : c.input;
      const text = value.map(toStr).join('\n');
      for (const p of c.p.strs('Path') ?? []) writeText(c.s.state, p, text, append);
      return [];
    },
  };
}

const outFile: Cmdlet = {
  name: 'Out-File',
  params: [{ name: 'FilePath', pos: 0, aliases: ['Path'] }, { name: 'Append', switch: true }, { name: 'Encoding' }, { name: 'InputObject' }, { name: 'InputText' }, { name: 'Width' }, { name: 'NoClobber', switch: true }],
  run: (c) => {
    const path = c.p.str('FilePath');
    if (!path) throw new PsError("Missing an argument for parameter 'FilePath'.");
    const text = c.p.has('InputText') ? c.p.str('InputText')! : formatOutput(c.p.has('InputObject') ? [c.p.get('InputObject')!] : c.input);
    writeText(c.s.state, path, text, c.p.sw('Append'));
    return [];
  },
};

const clearContent: Cmdlet = {
  name: 'Clear-Content',
  params: [{ name: 'Path', pos: 0 }],
  run: (c) => {
    for (const p of c.p.strs('Path') ?? []) writeText(c.s.state, p, '', false);
    return [];
  },
};

const selectString: Cmdlet = {
  name: 'Select-String',
  params: [
    { name: 'Pattern', pos: 0 },
    { name: 'Path', pos: 1 },
    { name: 'SimpleMatch', switch: true },
    { name: 'CaseSensitive', switch: true },
    { name: 'NotMatch', switch: true },
    { name: 'List', switch: true },
    { name: 'Context' },
    { name: 'InputObject' },
  ],
  run: (c) => {
    const patterns = c.p.strs('Pattern');
    if (!patterns) throw new PsError("Missing an argument for parameter 'Pattern'.");
    const flags = c.p.sw('CaseSensitive') ? '' : 'i';
    const res = patterns.map((p) => new RegExp(c.p.sw('SimpleMatch') ? p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : p, flags));
    const test = (l: string) => res.some((r) => r.test(l)) !== c.p.sw('NotMatch');
    const cwd = winPath(c.s.state.cwd);
    const out: PsVal[] = [];
    const match = (line: string, n: number, path: string | null) => {
      const shown = path ? (path.toLowerCase().startsWith(cwd.toLowerCase() + '\\') ? path.slice(cwd.length + 1) : path) : null;
      out.push(
        obj('Microsoft.PowerShell.Commands.MatchInfo', {
          Path: path ?? 'InputStream',
          Filename: path ? path.split('\\').pop()! : 'InputStream',
          LineNumber: n,
          Line: line,
          Pattern: patterns[0]!,
        }, { str: shown ? `${shown}:${n}:${line}` : line, plain: true }),
      );
    };
    const paths = c.p.strs('Path');
    if (paths) {
      for (const p of paths) {
        const targets = expandPath(c, p).filter((t) => getNode(c.s.state.root, t)?.type === 'file');
        if (!targets.length) c.error(notFound(winPath(resolveWin(c.s.state, p))));
        for (const t of targets) {
          const ls = lines((getNode(c.s.state.root, t) as { content: string }).content);
          for (let i = 0; i < ls.length; i++) {
            if (test(ls[i]!)) {
              match(ls[i]!, i + 1, winPath(t));
              if (c.p.sw('List')) break;
            }
          }
        }
      }
      return out;
    }
    const input = c.p.has('InputObject') ? flat([c.p.get('InputObject')!]) : c.input;
    input.forEach((v, i) => {
      if (isObj(v) && v.type === 'System.IO.FileInfo') {
        const full = toStr(v.props.FullName);
        const ls = lines(readText(c, full));
        ls.forEach((l, j) => test(l) && match(l, j + 1, full));
        return;
      }
      const line = toStr(v);
      if (test(line)) match(line, i + 1, null);
    });
    return out;
  },
};

const getFileHash: Cmdlet = {
  name: 'Get-FileHash',
  params: [{ name: 'Path', pos: 0 }, { name: 'Algorithm' }, { name: 'LiteralPath' }],
  run: (c) => {
    const alg = (c.p.str('Algorithm') ?? 'SHA256').toUpperCase();
    if (alg !== 'SHA256') throw new PsError(`Bu simulyatorda faqat SHA256 bor (${alg} yo'q). SHA256 — tavsiya etilgan algoritm.`);
    const out: PsVal[] = [];
    for (const p of inputPaths(c)) {
      const targets = expandPath(c, p).filter((t) => getNode(c.s.state.root, t)?.type === 'file');
      if (!targets.length) c.error(notFound(winPath(resolveWin(c.s.state, p))));
      for (const t of targets) {
        const content = (getNode(c.s.state.root, t) as { content: string }).content;
        out.push(obj('Microsoft.PowerShell.Commands.FileHashInfo', { Algorithm: 'SHA256', Hash: sha256Hex(content).toUpperCase(), Path: winPath(t) }, { view: ['Algorithm', 'Hash', 'Path'] }));
      }
    }
    return out;
  },
};

const getLocation: Cmdlet = {
  name: 'Get-Location',
  params: [],
  run: (c) => obj('System.Management.Automation.PathInfo', { Path: winPath(c.s.state.cwd) }, { str: winPath(c.s.state.cwd), view: ['Path'] }),
};

const setLocation: Cmdlet = {
  name: 'Set-Location',
  params: [{ name: 'Path', pos: 0 }, { name: 'LiteralPath' }],
  run: (c) => {
    const p = c.p.str('Path') ?? c.p.str('LiteralPath') ?? '~';
    if (isRegPath(p)) throw new PsError('Bu simulyatorda registrga cd qilinmaydi: Get-ChildItem / Get-ItemProperty ga yo\'lni to\'liq bering.');
    const posix = p === '-' ? c.s.state.prevCwd : resolveWin(c.s.state, p);
    const node = getNode(c.s.state.root, posix);
    if (!node) throw new PsError(notFound(winPath(posix)));
    if (node.type !== 'dir') throw new PsError(`Cannot find path '${winPath(posix)}' because it is a file.`);
    c.s.state.prevCwd = c.s.state.cwd;
    c.s.state.cwd = posix;
    return [];
  },
};

const splitPath: Cmdlet = {
  name: 'Split-Path',
  params: [{ name: 'Path', pos: 0 }, { name: 'Leaf', switch: true }, { name: 'Parent', switch: true }, { name: 'Extension', switch: true }],
  run: (c) =>
    (c.p.strs('Path') ?? c.input.map(toStr)).map((p) => {
      const clean = p.replace(/[\\/]+$/, '');
      const i = Math.max(clean.lastIndexOf('\\'), clean.lastIndexOf('/'));
      const leaf = clean.slice(i + 1);
      if (c.p.sw('Leaf')) return leaf;
      if (c.p.sw('Extension')) return leaf.includes('.') ? leaf.slice(leaf.lastIndexOf('.')) : '';
      return i <= 2 && /^[A-Za-z]:/.test(clean) ? clean.slice(0, 3) : clean.slice(0, i);
    }),
};

const joinPath: Cmdlet = {
  name: 'Join-Path',
  params: [{ name: 'Path', pos: 0 }, { name: 'ChildPath', pos: 1 }],
  run: (c) => `${c.p.str('Path')!.replace(/[\\/]+$/, '')}\\${c.p.str('ChildPath')!.replace(/^[\\/]+/, '')}`,
};

export const FILES: Cmdlet[] = [
  getChildItem,
  getItem,
  getItemProperty,
  setItemProperty,
  newItemProperty,
  removeItemProperty,
  newItem,
  mkdir,
  removeItem,
  copyItem,
  moveItem,
  renameItem,
  testPath,
  getContent,
  contentWriter('Set-Content', false),
  contentWriter('Add-Content', true),
  outFile,
  clearContent,
  selectString,
  getFileHash,
  getLocation,
  setLocation,
  splitPath,
  joinPath,
];
