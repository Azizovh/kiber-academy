/*
 * Values that are usually ready at once and only sometimes a Promise. Almost every command is synchronous; python3
 * waits for a Web Worker. The shell's pipeline code is written with these helpers so that a line without python3
 * still runs synchronously (tests, docker exec, lab checks) and only a line with it becomes asynchronous.
 */

export type Maybe<T> = T | Promise<T>;

export const isPromise = <T>(x: Maybe<T>): x is Promise<T> =>
  typeof x === 'object' && x !== null && typeof (x as { then?: unknown }).then === 'function';

// Not called `then`: a module exporting `then` looks like a Promise to dynamic import() and is never loaded.
export function andThen<T, U>(x: Maybe<T>, f: (v: T) => Maybe<U>): Maybe<U> {
  return isPromise(x) ? x.then(f) : f(x);
}

/** Runs step(from), step(from + 1)... in order until one returns true; synchronous for as long as every step is. */
export function each(count: number, step: (i: number) => Maybe<boolean | void>, from = 0): Maybe<void> {
  for (let i = from; i < count; i++) {
    const r = step(i);
    if (isPromise(r)) return r.then((stop) => (stop ? undefined : each(count, step, i + 1)));
    if (r) return;
  }
}
