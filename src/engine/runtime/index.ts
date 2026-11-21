/* WebAssembly runtimes a lab may need before its shell is created. Each is downloaded once, on first use. */

import { getPython, loadPython } from './python';
import { getSql, loadSql } from './sql';

export type Runtime = 'sql' | 'python';

const LOADERS: Record<Runtime, { ready: () => boolean; load: () => Promise<unknown> }> = {
  sql: { ready: () => !!getSql(), load: loadSql },
  python: { ready: () => !!getPython(), load: loadPython },
};

export function runtimesReady(list: Runtime[] = []): boolean {
  return list.every((r) => LOADERS[r].ready());
}

export async function loadRuntimes(list: Runtime[] = []): Promise<void> {
  await Promise.all(list.map((r) => LOADERS[r].load()));
}

export const RUNTIME_NAMES: Record<Runtime, string> = { sql: 'SQLite', python: 'Python (~13 MB)' };
