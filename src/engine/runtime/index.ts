/* WebAssembly runtimes a lab may need before its shell is created. Each is downloaded once, on first use. */

import { getSql, loadSql } from './sql';

export type Runtime = 'sql';

const LOADERS: Record<Runtime, { ready: () => boolean; load: () => Promise<unknown> }> = {
  sql: { ready: () => !!getSql(), load: loadSql },
};

export function runtimesReady(list: Runtime[] = []): boolean {
  return list.every((r) => LOADERS[r].ready());
}

export async function loadRuntimes(list: Runtime[] = []): Promise<void> {
  await Promise.all(list.map((r) => LOADERS[r].load()));
}

export const RUNTIME_NAMES: Record<Runtime, string> = { sql: 'SQLite' };
