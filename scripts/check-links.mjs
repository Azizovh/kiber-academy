// Checks that every external link in the content answers.
// Run with:  node scripts/check-links.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/content', 'src/pages'];
const URL_RE = /https?:\/\/[^\s'"`)<>\\]+/g;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

const found = new Map();
for (const root of ROOTS) {
  for (const file of files(root)) {
    for (const url of readFileSync(file, 'utf8').match(URL_RE) ?? []) {
      // Example addresses inside lab texts are not real links.
      if (/10\.10\.10\.|example\.com|nmap\.org \)|\$\{/.test(url) || url.includes('${')) continue;
      if (!found.has(url)) found.set(url, file);
    }
  }
}

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (res.ok) return { status: res.status, final: res.url };
      if (method === 'GET') return { status: res.status, final: res.url };
    } catch (err) {
      if (method === 'GET') return { status: 0, error: err.cause?.code ?? err.name };
    }
  }
}

const urls = [...found.keys()].sort();
console.log(`${urls.length} ta havola tekshirilmoqda...\n`);

const results = [];
const queue = [...urls];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      results.push({ url, ...(await check(url)) });
    }
  }),
);

const bad = results.filter((r) => !(r.status >= 200 && r.status < 400)).sort((a, b) => a.status - b.status);
for (const r of bad) console.log(`${String(r.status).padStart(3)}  ${r.url}  ${r.error ?? ''}   [${found.get(r.url)}]`);
console.log(`\nYaxshi: ${results.length - bad.length}   Muammoli: ${bad.length}`);
