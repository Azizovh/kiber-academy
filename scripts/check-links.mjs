// Checks that every external link in the content answers: curriculum resources, pages and lesson Markdown.
// Lab and CTF data are skipped (their addresses are simulated), and so are the documentation ranges and
// fictional names lessons use in examples (example.com, *.example, *.lab, mybank.uz, 203.0.113.x, ...).
// Run with:  node scripts/check-links.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOTS = ['src/content', 'src/pages'];
const URL_RE = /https?:\/\/[^\s'"`)<>\\\]|*]+/g;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return path.split(sep).includes('labs') ? [] : files(path);
    if (name.endsWith('.test.ts') || /^ctf.+\.ts$/.test(name)) return [];
    return /\.(ts|tsx|md)$/.test(name) ? [path] : [];
  });
}

/** Example and simulated addresses: not links anybody is meant to open. */
function isExample(url) {
  let host;
  try {
    host = new URL(url.replace(/[.,;:]+$/, '')).hostname;
  } catch {
    return true;
  }
  return (
    /(^|\.)example(\.(com|org|net|uz))?$/.test(host) ||
    /(^|[.-])example[.-]/.test(host) ||
    /\.(lab|test|local|localhost|internal|corp)$/.test(host) ||
    /^(localhost|\d+\.\d+\.\d+\.(\d+|x))$/.test(host) ||
    /(^|\.)(mybank\.uz|rnybank\.uz|mybamk\.uz|qaydnoma\.\w+)$/.test(host) ||
    /(^|\.)qaydnoma-/.test(host) ||
    !host.includes('.') ||
    // Lesson code samples: API endpoints, URL templates, an OIDC issuer and placeholder repositories.
    url.includes('{') ||
    host.startsWith('api.') ||
    /\/api\/v\d/.test(url) ||
    host === 'token.actions.githubusercontent.com' ||
    url.startsWith('https://github.com/foydalanuvchi/')
  );
}

const found = new Map();
for (const root of ROOTS) {
  for (const file of files(root)) {
    for (const raw of readFileSync(file, 'utf8').match(URL_RE) ?? []) {
      const url = raw.replace(/[.,;:]+$/, '');
      if (url.includes('${') || isExample(url)) continue;
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
console.log('403 — odatda bot himoyasi: sahifani brauzerda oching, u odamga ochilsa, havola joyida.');
