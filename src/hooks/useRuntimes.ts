import { useEffect, useState } from 'react';
import { loadRuntimes, runtimesReady, type Runtime } from '../engine/runtime';

/** Loads the WebAssembly runtimes a lab or CTF needs; `ready` turns true once all of them can run. */
export function useRuntimes(list: Runtime[] | undefined): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(() => runtimesReady(list));
  const [error, setError] = useState<string | null>(null);
  const key = (list ?? []).join(',');
  useEffect(() => {
    if (runtimesReady(list)) {
      setReady(true);
      return;
    }
    let alive = true;
    loadRuntimes(list)
      .then(() => alive && setReady(true))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { ready, error };
}
