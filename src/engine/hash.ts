/**
 * cyrb53 — a small, fast, well-distributed non-cryptographic hash.
 * Flags are stored hashed so the answers are not readable in the content
 * files. When the app goes multi-user the check moves to the server.
 */
export function cyrb53(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function normalizeFlag(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export function flagHash(flag: string): string {
  return cyrb53(normalizeFlag(flag));
}

export function checkFlag(input: string, hash: string): boolean {
  return flagHash(input) === hash;
}
