// Copies the Pyodide runtime (Python compiled to WebAssembly, ~13 MB) into public/pyodide so the app serves it
// itself and Python labs work offline (desktop shortcut). Runs before `npm run dev` and `npm run build`.
// public/pyodide is not committed: node_modules/pyodide is the source of truth.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FILES = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const from = join('node_modules', 'pyodide');
const to = join('public', 'pyodide');

mkdirSync(to, { recursive: true });
let copied = 0;
for (const f of FILES) {
  const src = join(from, f);
  const dst = join(to, f);
  if (!existsSync(src)) throw new Error(`${src} is missing: run npm install`);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue;
  copyFileSync(src, dst);
  copied++;
}
console.log(copied ? `pyodide: ${copied} file(s) copied to public/pyodide` : 'pyodide: up to date');
