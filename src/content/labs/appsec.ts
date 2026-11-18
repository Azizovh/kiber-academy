import { resolvePath } from '../../engine/terminal/fs';
import { fail, ok, type CustomCommand } from '../../engine/terminal/shell';
import type { Lab } from '../types';
import { fileAt } from './helpers';

/* ── Qaydnoma staging, as the a2 lessons left it before the fixes ─────── */

const HOST = 'qaydnoma.lab';

// header.payload.signature; the payload is chosen so its Base64 has no URL-safe characters and decodes with base64 -d.
const JWT_HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const JWT_PAYLOAD =
  'eyJzdWIiOiJ0ZXN0ZXIxIiwidWlkIjoxNywicm9sZSI6InVzZXIiLCJpYXQiOjE3OTUwMDMyMDAsImV4cCI6MTc5NTA0NjQwMCwianRpIjoiYTF4eSJ9';
export const TESTER1_TOKEN = `${JWT_HEADER}.${JWT_PAYLOAD}.q8Zr3VbL2nT0wXy9KpE4sHjD1mFuA7cGiN5oRtWzY6k`;

interface Response {
  status: string;
  headers: string[];
  body: string;
}

const BASE_HEADERS = ['Server: nginx/1.18.0 (Ubuntu)', 'Date: Wed, 18 Nov 2026 10:20:00 GMT', 'Connection: keep-alive'];

const json = (status: string, body: unknown): Response => ({
  status,
  headers: [...BASE_HEADERS, 'Content-Type: application/json'],
  body: JSON.stringify(body, null, 2),
});

const NOTES: Record<string, { owner: string; title: string; text: string }> = {
  '1042': { owner: 'tester1', title: 'Mening qaydim', text: 'Ertaga 10:00 da uchrashuv.' },
  '1043': { owner: 'tester2', title: 'Shaxsiy', text: "tester2 ning shaxsiy qaydi — buni boshqalar ko'rmasligi kerak." },
};

function route(method: string, path: string, user: string | null): Response {
  if (path === '/' || path === '/index.html') {
    return {
      status: 'HTTP/1.1 200 OK',
      headers: [
        ...BASE_HEADERS,
        'Content-Type: text/html; charset=utf-8',
        'X-Powered-By: Flask',
        'Set-Cookie: session=eyJ1aWQiOm51bGx9.Z0yQ8A.7hM2kVqLrXc; Path=/',
      ],
      body: '<!doctype html>\n<html><head><title>Qaydnoma</title></head>\n<body><h1>Qaydnoma</h1><a href="/login">Kirish</a></body></html>',
    };
  }
  if (path === '/robots.txt') {
    return { status: 'HTTP/1.1 200 OK', headers: [...BASE_HEADERS, 'Content-Type: text/plain'], body: 'User-agent: *\nDisallow: /api/v1/debug/' };
  }
  if (path === '/.git/HEAD') {
    return { status: 'HTTP/1.1 200 OK', headers: [...BASE_HEADERS, 'Content-Type: application/octet-stream'], body: 'ref: refs/heads/main' };
  }
  const note = /^\/api\/v1\/notes\/(\d+)$/.exec(path);
  if (note) {
    if (!user) return json('HTTP/1.1 401 UNAUTHORIZED', { error: 'authentication required' });
    if (method !== 'GET') return json('HTTP/1.1 405 METHOD NOT ALLOWED', { error: 'method not allowed' });
    const n = NOTES[note[1]!];
    if (!n) return json('HTTP/1.1 404 NOT FOUND', { error: 'not found' });
    // The a2 vulnerability: the note is returned without checking that it belongs to the caller.
    return json('HTTP/1.1 200 OK', { id: Number(note[1]), ...n });
  }
  if (path === '/api/v1/debug/config') {
    if (!user) return json('HTTP/1.1 401 UNAUTHORIZED', { error: 'authentication required' });
    return json('HTTP/1.1 200 OK', {
      DEBUG: true,
      ENV: 'staging',
      SECRET_KEY: 'dev-6f1c...(qisqartirildi)',
      DATABASE_URL: 'postgresql://qaydnoma:****@127.0.0.1:5432/qaydnoma',
    });
  }
  return { status: 'HTTP/1.1 404 NOT FOUND', headers: [...BASE_HEADERS, 'Content-Type: text/html'], body: '<h1>Not Found</h1>' };
}

/** curl for the lab: -i, -I, -s, -X, -H "Name: value" and -H @file (headers read from a file, as real curl allows). */
const curl: CustomCommand = (args, ctx) => {
  let include = false;
  let head = false;
  let method = 'GET';
  const headers: string[] = [];
  let url: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-H' || a === '--header') {
      const v = args[++i] ?? '';
      if (v.startsWith('@')) {
        const content = fileAt(ctx.state, resolvePath(ctx.state.cwd, v.slice(1), ctx.state.home));
        if (content === null) return fail(`curl: (26) Failed to open ${v.slice(1)}`);
        headers.push(...content.split('\n').filter(Boolean));
      } else headers.push(v);
    } else if (a === '-X' || a === '--request') method = (args[++i] ?? 'GET').toUpperCase();
    else if (/^-[sSiIL]+$/.test(a)) {
      if (a.includes('i')) include = true;
      if (a.includes('I')) head = true;
    } else if (!a.startsWith('-')) url = a;
  }
  if (!url) return fail('Ishlatilishi: curl [-i] [-I] [-H "Sarlavha: qiymat" | -H @fayl] URL');
  const m = /^(?:https?:\/\/)?([^/]+)(\/[^?#]*)?/.exec(url);
  if (!m || m[1] !== HOST) return fail(`curl: (6) Could not resolve host: ${m?.[1] ?? url}\n(Bu labda faqat ${HOST} mavjud)`);
  const auth = headers.find((h) => /^authorization:/i.test(h));
  const token = auth ? /bearer\s+(\S+)/i.exec(auth)?.[1] : undefined;
  const user = token === TESTER1_TOKEN ? 'tester1' : null;
  if (token && !user) return ok(JSON.stringify({ error: 'invalid token' }, null, 2));
  const res = route(head ? 'HEAD' : method, m[2] ?? '/', user);
  const headText = [res.status, ...res.headers].join('\n');
  if (head) return ok(headText);
  return ok(include ? `${headText}\n\n${res.body}` : res.body);
};

export const httpAudit: Lab = {
  id: 'http-tekshiruvi',
  title: "HTTP javoblarini tekshirish: Qaydnoma auditi",
  summary: "curl bilan sarlavhalar, cookie bayroqlari, ochiq qolgan fayllar, JWT mazmuni va obyekt darajasidagi ruxsatni tekshirish.",
  minutes: 30,
  level: 2,
  intro:
    "Qaydnoma'ning test muhiti `qaydnoma.lab` — a2 bosqichidagi tuzatishlardan **oldingi** holatda. Siz o'z ilovangizning xavfsizlik tekshiruvini o'tkazyapsiz: test akkaunti `tester1`, uning tokeni `tester1.token` faylida, so'rovga qo'shiladigan tayyor sarlavha esa `tester1.header` da.\n\n" +
    "`curl` asosiy flaglari: `-i` — javob sarlavhalari bilan, `-I` — faqat sarlavhalar, `-s` — jim rejim, `-H` — so'rovga sarlavha qo'shish (`-H @fayl` — sarlavhalarni fayldan o'qiydi). Har bir topilmani keyin p4 dagi hisobot qolipiga yozing.",
  shell: () => ({
    fs: {
      home: {
        talaba: {
          'tester1.token': TESTER1_TOKEN + '\n',
          'tester1.header': `Authorization: Bearer ${TESTER1_TOKEN}\n`,
        },
      },
      tmp: {},
    },
  }),
  commands: { curl },
  tasks: [
    {
      id: 'headers',
      text: 'Bosh sahifani javob sarlavhalari bilan birga oling.',
      hint: `\`curl -i http://${HOST}/\``,
      solution: [`curl -i http://${HOST}/`],
      check: ({ output }) => output.startsWith('HTTP/1.1 200 OK') && output.includes('<h1>Qaydnoma</h1>'),
    },
    {
      id: 'tech',
      text: 'Qaysi sarlavhalar server dasturi va freymvorkni oshkor qiladi? Faqat sarlavhalarni olib, kerakli qatorlarni ajrating.',
      hint: `\`curl -sI http://${HOST}/ | grep -iE "server|powered"\` — versiya raqami hujumchiga ma'lum zaifliklarni qidirishni osonlashtiradi.`,
      solution: [`curl -sI http://${HOST}/ | grep -iE "server|powered"`],
      check: ({ output }) => output.includes('X-Powered-By: Flask') && output.includes('nginx/1.18.0'),
    },
    {
      id: 'cookie',
      text: 'Sessiya cookie\'sini ko\'ring. Unda qaysi xavfsizlik bayroqlari yo\'q?',
      hint: `\`curl -sI http://${HOST}/ | grep -i set-cookie\` — HttpOnly (JS o'qiy olmasin), Secure (faqat HTTPS), SameSite (CSRF'ga qarshi) yo'q.`,
      solution: [`curl -sI http://${HOST}/ | grep -i set-cookie`],
      check: ({ output }) => output.includes('session=') && !/httponly/i.test(output),
    },
    {
      id: 'hsts',
      text: 'Javobda HSTS (`Strict-Transport-Security`) sarlavhasi bormi? Uni nechta qatorda uchrashini sanang.',
      hint: `\`curl -sI http://${HOST}/ | grep -ci strict-transport\` — 0 chiqsa, sarlavha yo'q (CSP va X-Content-Type-Options ham yo'q).`,
      solution: [`curl -sI http://${HOST}/ | grep -ci strict-transport`],
      check: ({ line, output }) => /strict-transport/i.test(line) && output.trim() === '0',
    },
    {
      id: 'git',
      text: 'web razvedka darsidagi tekshiruv: `.git` katalogi ochiq qolganmi?',
      hint: `\`curl http://${HOST}/.git/HEAD\` — javobda "ref:" bo'lsa, manba kodi tarixi yuklab olinishi mumkin.`,
      solution: [`curl http://${HOST}/.git/HEAD`],
      check: ({ output }) => output.includes('ref: refs/heads/main'),
    },
    {
      id: 'jwt',
      text: 'Tokenning o\'rta qismi (payload) — shifrlangan emas, faqat Base64 bilan kodlangan. Uni oching: siz kim sifatida tanilasiz va rolingiz qanday?',
      hint: '`cut -d. -f2 tester1.token | base64 -d` — JWT uch qismdan iborat: header.payload.signature.',
      solution: ['cut -d. -f2 tester1.token | base64 -d'],
      check: ({ output }) => output.includes('"role":"user"') && output.includes('"sub":"tester1"'),
    },
    {
      id: 'noauth',
      text: 'Tokensiz o\'z qaydingizni (1042) so\'rab ko\'ring.',
      hint: `\`curl -i http://${HOST}/api/v1/notes/1042\` — 401: autentifikatsiya ishlayapti.`,
      solution: [`curl -i http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('401'),
    },
    {
      id: 'own',
      text: 'Endi token bilan o\'z qaydingizni oling.',
      hint: `\`curl -H @tester1.header http://${HOST}/api/v1/notes/1042\``,
      solution: [`curl -H @tester1.header http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('"owner": "tester1"'),
    },
    {
      id: 'idor',
      text: 'Xuddi shu token bilan keyingi raqamli qaydni (1043) so\'rang. Natija nimani anglatadi?',
      hint: `\`curl -H @tester1.header http://${HOST}/api/v1/notes/1043\` — boshqa foydalanuvchining qaydi qaytsa: IDOR, a2 dagi markaziy avtorizatsiya tuzatishi kerak.`,
      solution: [`curl -H @tester1.header http://${HOST}/api/v1/notes/1043`],
      check: ({ output }) => output.includes('"owner": "tester2"'),
    },
    {
      id: 'debug',
      text: '`robots.txt` "yashirgan" yo\'lni toping va oddiy foydalanuvchi tokeni bilan oching.',
      hint: `\`curl http://${HOST}/robots.txt\`, keyin \`curl -H @tester1.header http://${HOST}/api/v1/debug/config\` — robots.txt hech narsani yashirmaydi, aksincha ko'rsatib qo'yadi.`,
      solution: [`curl http://${HOST}/robots.txt`, `curl -H @tester1.header http://${HOST}/api/v1/debug/config`],
      check: ({ output }) => output.includes('"DEBUG": true'),
    },
  ],
};
