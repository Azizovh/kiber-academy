/* python3 (real CPython via Pyodide), plus the messages a learner meets when typing `python` or `pip`. */

import { pythonReady, pythonVersion, runPython } from '../runtime/python';
import { fail, ok, type AsyncCommand, type Command, type CmdResult } from './shell';
import { nodeAt } from './toolio';

const result = (r: { out: string; err: string; code: number }): CmdResult => ({ out: r.out, ...(r.err ? { err: r.err } : {}), code: r.code });

export const python3: AsyncCommand = (args, ctx) => {
  if (!pythonReady()) return fail('python3: Python hali yuklanmagan — bu lab Python bilan ishlamaydi yoki sahifani qayta ochish kerak.');
  if (args[0] === '--version' || args[0] === '-V') return ok(`Python ${pythonVersion()}`);
  if (args[0] === '-m' && (args[1] === 'pip' || args[1] === 'venv')) return pip(args.slice(2), ctx);
  if (!args.length) {
    return fail("python3: bu simulyatorda interaktiv >>> rejim yo'q. Kodni faylga yozing (Kod oynasida) va ishga tushiring:\n  python3 skript.py\nyoki bir qatorli kod:  python3 -c \"print(2 + 2)\"");
  }
  // A program runs in a Web Worker, so the caller has to be able to wait for it.
  if (!ctx.allowAsync) return fail("python3: sudo, find -exec, xargs va docker exec orqali ishga tushmaydi — buyruqni terminalga to'g'ridan-to'g'ri yozing.");
  if (args[0] === '-c') {
    if (args[1] === undefined) return fail('Argument expected for the -c option\nusage: python3 [option] ... [-c cmd | -m mod | file | -] [arg] ...');
    return runPython(ctx.state, 'code', args[1], ['-c', ...args.slice(2)]).then(result);
  }
  if (args[0]!.startsWith('-')) return fail(`Unknown option: ${args[0]}\nusage: python3 [option] ... [-c cmd | -m mod | file | -] [arg] ...`);
  const { abs, node } = nodeAt(ctx, args[0]!);
  if (!node) return fail(`python3: can't open file '${abs}': [Errno 2] No such file or directory`);
  if (node.type === 'dir') return fail(`python3: can't find '__main__' module in '${abs}'`);
  return runPython(ctx.state, 'file', abs, [args[0]!, ...args.slice(1)]).then(result);
};

const pip: Command = (args) => {
  if (!args.length || args[0] === 'list' || args[0] === 'freeze') {
    return ok("Bu muhitda faqat Python'ning standart kutubxonasi bor: re, json, csv, hashlib, base64, collections,\ndatetime, sqlite3, ipaddress, pathlib, argparse, statistics ... — lablar uchun shular yetarli.");
  }
  return fail("ERROR: Could not find a version that satisfies the requirement (no internet in this lab)\nBu o'quv muhitida internet yo'q, pip paket o'rnata olmaydi. Standart kutubxona tayyor: re, json, csv, hashlib, sqlite3 ...");
};

export const pip3 = pip;

export const pythonMissing: Command = () => fail("Command 'python' not found, did you mean:\n  command 'python3' from deb python3\nBuyruq nomi: python3");
