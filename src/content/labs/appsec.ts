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

const LOGIN_PAGE =
  '<!doctype html>\n<html><head><title>Kirish</title></head>\n<body>\n<h1>Kirish</h1>\n' +
  `<form method="post" action="http://${HOST}/login">\n` +
  '  <input name="username">\n  <input name="password" type="password">\n  <button>Kirish</button>\n</form>\n</body></html>';

function route(method: string, path: string, user: string | null, origin: string | null): Response {
  const res = routeInner(method, path, user);
  // The API reflects any Origin and allows credentials — a CORS misconfiguration the audit should catch.
  if (origin && path.startsWith('/api/')) res.headers.push(`Access-Control-Allow-Origin: ${origin}`, 'Access-Control-Allow-Credentials: true');
  return res;
}

function routeInner(method: string, path: string, user: string | null): Response {
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
  if (path === '/account') {
    return { status: 'HTTP/1.1 302 FOUND', headers: [...BASE_HEADERS, 'Location: /login', 'Content-Type: text/html'], body: '<a href="/login">/login</a>' };
  }
  if (path === '/login') {
    return { status: 'HTTP/1.1 200 OK', headers: [...BASE_HEADERS, 'Content-Type: text/html; charset=utf-8'], body: LOGIN_PAGE };
  }
  if (path === '/robots.txt') {
    return { status: 'HTTP/1.1 200 OK', headers: [...BASE_HEADERS, 'Content-Type: text/plain'], body: 'User-agent: *\nDisallow: /api/v1/debug/' };
  }
  if (path === '/.git/HEAD') {
    return { status: 'HTTP/1.1 200 OK', headers: [...BASE_HEADERS, 'Content-Type: application/octet-stream'], body: 'ref: refs/heads/main' };
  }
  if (path === '/api/v1/status') {
    return json('HTTP/1.1 200 OK', { status: 'ok', app: 'qaydnoma', version: '2.3.1', env: 'staging' });
  }
  const note = /^\/api\/v1\/notes\/(\d+)$/.exec(path);
  if (note) {
    if (method === 'OPTIONS') return { status: 'HTTP/1.1 204 NO CONTENT', headers: [...BASE_HEADERS, 'Allow: GET, HEAD, OPTIONS'], body: '' };
    if (!user) return json('HTTP/1.1 401 UNAUTHORIZED', { error: 'authentication required' });
    if (method !== 'GET' && method !== 'HEAD') return json('HTTP/1.1 405 METHOD NOT ALLOWED', { error: 'method not allowed' });
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

/** curl for the lab: -i, -I, -s, -L, -X, -H "Name: value" and -H @file (headers read from a file, as real curl allows). */
const curl: CustomCommand = (args, ctx) => {
  let include = false;
  let head = false;
  let follow = false;
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
      if (a.includes('L')) follow = true;
    } else if (!a.startsWith('-')) url = a;
  }
  if (!url) return fail('Ishlatilishi: curl [-i] [-I] [-L] [-X METOD] [-H "Sarlavha: qiymat" | -H @fayl] URL');
  const m = /^(?:https?:\/\/)?([^/]+)(\/[^?#]*)?/.exec(url);
  if (!m || m[1] !== HOST) return fail(`curl: (6) Could not resolve host: ${m?.[1] ?? url}\n(Bu labda faqat ${HOST} mavjud)`);
  const header = (name: string) => headers.find((h) => h.toLowerCase().startsWith(`${name}:`))?.slice(name.length + 1).trim() ?? null;
  const token = /bearer\s+(\S+)/i.exec(header('authorization') ?? '')?.[1];
  const user = token === TESTER1_TOKEN ? 'tester1' : null;
  let res: Response;
  if (token && !user) res = json('HTTP/1.1 401 UNAUTHORIZED', { error: 'invalid token' });
  else {
    let path = m[2] ?? '/';
    res = route(head ? 'HEAD' : method, path, user, header('origin'));
    for (let hops = 0; follow && hops < 5 && /^HTTP\/1\.1 30[12]/.test(res.status); hops++) {
      const loc = res.headers.find((h) => h.startsWith('Location: '))?.slice(10);
      if (!loc) break;
      path = loc;
      res = route(head ? 'HEAD' : 'GET', path, user, header('origin'));
    }
  }
  const headText = [res.status, ...res.headers].join('\n');
  if (head) return ok(headText);
  return ok(include ? `${headText}\n\n${res.body}` : res.body);
};

export const httpAudit: Lab = {
  id: 'http-tekshiruvi',
  title: "HTTP javoblarini tekshirish: Qaydnoma auditi",
  summary: "curl bilan sarlavhalar, cookie bayroqlari, yo'naltirishlar, CORS, HTTP metodlari, ochiq qolgan fayllar, JWT mazmuni va obyekt darajasidagi ruxsatni tekshirish.",
  minutes: 50,
  level: 2,
  intro:
    "Qaydnoma'ning test muhiti `qaydnoma.lab` — a2 bosqichidagi tuzatishlardan **oldingi** holatda. Siz o'z ilovangizning xavfsizlik tekshiruvini o'tkazyapsiz: test akkaunti `tester1`, uning tokeni `tester1.token` faylida, so'rovga qo'shiladigan tayyor sarlavha esa `tester1.header` da.\n\n" +
    "`curl` asosiy flaglari: `-i` — javob sarlavhalari bilan, `-I` — faqat sarlavhalar, `-s` — jim rejim, `-L` — yo'naltirishga ergashish, `-X` — HTTP metodi, `-H` — so'rovga sarlavha qo'shish (`-H @fayl` — sarlavhalarni fayldan o'qiydi). Har bir topilmani keyin p4 dagi hisobot qolipiga yozing.",
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
      teach: ['curl', 'curl -i'],
      text: 'Bosh sahifani javob sarlavhalari bilan birga oling.',
      hint: `\`curl -i http://${HOST}/\` — avval status qatori, keyin sarlavhalar, bo'sh qator va HTML.`,
      solution: [`curl -i http://${HOST}/`],
      check: ({ output }) => output.startsWith('HTTP/1.1 200 OK') && output.includes('<h1>Qaydnoma</h1>'),
    },
    {
      id: 'head',
      teach: ['curl -I'],
      text: 'Endi sahifa mazmunisiz, faqat sarlavhalarni oling.',
      hint: `\`curl -I http://${HOST}/\` — HEAD so'rovi: tez va ixcham.`,
      solution: [`curl -I http://${HOST}/`],
      check: ({ output }) => output.startsWith('HTTP/1.1 200 OK') && !output.includes('<h1>'),
    },
    {
      id: 'tech',
      teach: ['curl -s', 'grep -i', 'grep -E'],
      text: 'Qaysi sarlavhalar server dasturi va freymvorkni oshkor qiladi? Kerakli qatorlarni ajrating.',
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
      teach: ['grep -c'],
      text: 'Javobda HSTS, CSP yoki X-Frame-Options sarlavhalaridan birortasi bormi? Topilgan qatorlarni sanang.',
      hint: `\`curl -sI http://${HOST}/ | grep -ciE "strict-transport|content-security|x-frame"\` — 0: uchalasi ham yo'q.`,
      solution: [`curl -sI http://${HOST}/ | grep -ciE "strict-transport|content-security|x-frame"`],
      check: ({ line, output }) => /strict-transport/i.test(line) && output.trim() === '0',
    },
    {
      id: 'redirect',
      text: '`/account` sahifasi tizimga kirmaganlarni qayerga yuboradi? Faqat sarlavhalarni ko\'ring.',
      hint: `\`curl -sI http://${HOST}/account\` — 302 va Location sarlavhasi.`,
      solution: [`curl -sI http://${HOST}/account`],
      check: ({ output }) => output.includes('302') && output.includes('Location: /login'),
    },
    {
      id: 'follow',
      teach: ['curl -L'],
      text: 'Yo\'naltirishga ergashib, oxirgi sahifani oling.',
      hint: `\`curl -sL http://${HOST}/account\` — -L bo'lmasa, curl faqat 302 javobini ko'rsatadi.`,
      solution: [`curl -sL http://${HOST}/account`],
      check: ({ output }) => output.includes('<h1>Kirish</h1>'),
    },
    {
      id: 'form',
      text: 'Login formasi parolni qayerga yuboradi? Shifrlanmagan HTTP ishlatilmayaptimi?',
      hint: `\`curl -s http://${HOST}/login | grep -i "<form"\` — action="http://...": parol tarmoqda ochiq matn bo'lib ketadi. Faqat HTTPS bo'lishi kerak.`,
      solution: [`curl -s http://${HOST}/login | grep -i "<form"`],
      check: ({ output }) => output.includes(`action="http://${HOST}/login"`),
    },
    {
      id: 'status-api',
      teach: ['jq .maydon', 'jq -r'],
      text: 'API holat sahifasi (`/api/v1/status`) ochiq. U ilova versiyasini oshkor qiladimi? Faqat versiyani chiqaring.',
      hint: `\`curl -s http://${HOST}/api/v1/status | jq -r .version\``,
      solution: [`curl -s http://${HOST}/api/v1/status | jq -r .version`],
      check: ({ output }) => output.trim() === '2.3.1',
    },
    {
      id: 'cors',
      teach: ['curl -H SARLAVHA'],
      text: 'CORS sozlamasini tekshiring: begona sayt nomidan (`Origin: https://boshqa.example`) so\'rov yuborsangiz, API unga ruxsat beradimi?',
      hint: `\`curl -sI -H "Origin: https://boshqa.example" http://${HOST}/api/v1/status\` — har qanday Origin qaytarilsa va Allow-Credentials: true bo'lsa, bu xato sozlama: faqat ishonchli domenlar ro'yxati bo'lishi kerak.`,
      solution: [`curl -sI -H "Origin: https://boshqa.example" http://${HOST}/api/v1/status`],
      check: ({ output }) => output.includes('Access-Control-Allow-Origin: https://boshqa.example') && output.includes('Allow-Credentials: true'),
    },
    {
      id: 'options',
      teach: ['curl -X METOD'],
      text: 'Qaydlar API si qaysi HTTP metodlarini qabul qiladi? OPTIONS so\'rovi yuboring.',
      hint: `\`curl -i -X OPTIONS http://${HOST}/api/v1/notes/1042\` — Allow sarlavhasi.`,
      solution: [`curl -i -X OPTIONS http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('Allow: GET, HEAD, OPTIONS'),
    },
    {
      id: 'git',
      text: 'Veb razvedka darsidagi tekshiruv: `.git` katalogi ochiq qolganmi?',
      hint: `\`curl http://${HOST}/.git/HEAD\` — javobda "ref:" bo'lsa, manba kodi tarixi yuklab olinishi mumkin. Tuzatish: veb-serverda .git ga kirishni taqiqlash.`,
      solution: [`curl http://${HOST}/.git/HEAD`],
      check: ({ output }) => output.includes('ref: refs/heads/main'),
    },
    {
      id: 'robots',
      text: '`robots.txt` ni o\'qing. U qaysi yo\'lni "yashirmoqchi"?',
      hint: `\`curl http://${HOST}/robots.txt\` — robots.txt hech narsani yashirmaydi, aksincha ko'rsatib qo'yadi.`,
      solution: [`curl http://${HOST}/robots.txt`],
      check: ({ output }) => output.includes('/api/v1/debug/'),
    },
    {
      id: 'jwt-header',
      teach: ['cut -d BELGI', 'cut -f N', 'base64 -d'],
      text: 'JWT uch qismdan iborat: header.payload.signature. Birinchi qismni (header) oching: qaysi imzo algoritmi ishlatilgan?',
      hint: '`cut -d. -f1 tester1.token | base64 -d` — HS256: umumiy maxfiy kalit bilan imzo.',
      solution: ['cut -d. -f1 tester1.token | base64 -d'],
      check: ({ output }) => output.includes('"alg":"HS256"'),
    },
    {
      id: 'jwt',
      text: 'Ikkinchi qism (payload) — shifrlangan emas, faqat Base64. Uni oching: siz kim sifatida tanilasiz va rolingiz qanday?',
      hint: '`cut -d. -f2 tester1.token | base64 -d` — demak, tokenga maxfiy ma\'lumot yozib bo\'lmaydi.',
      solution: ['cut -d. -f2 tester1.token | base64 -d'],
      check: ({ output }) => output.includes('"role":"user"') && output.includes('"sub":"tester1"'),
    },
    {
      id: 'exp',
      text: 'Token qancha vaqt amal qiladi? `exp` (tugash) dan `iat` (berilgan vaqt) ni ayiring — natija soniyalarda.',
      hint: "`cut -d. -f2 tester1.token | base64 -d | jq '.exp - .iat'` — 43200 soniya = 12 soat. Qisqaroq muddat va yangilash tokeni xavfsizroq.",
      solution: ["cut -d. -f2 tester1.token | base64 -d | jq '.exp - .iat'"],
      check: ({ output }) => output.trim() === '43200',
    },
    {
      id: 'noauth',
      text: 'Tokensiz o\'z qaydingizni (1042) so\'rab ko\'ring.',
      hint: `\`curl -i http://${HOST}/api/v1/notes/1042\` — 401: autentifikatsiya ishlayapti.`,
      solution: [`curl -i http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('401'),
    },
    {
      id: 'badtoken',
      text: 'Imzo tekshirilyaptimi? Soxta token bilan so\'rov yuboring.',
      hint: `\`curl -i -H "Authorization: Bearer soxta.token.123" http://${HOST}/api/v1/notes/1042\` — 401 invalid token: server imzoni tekshiradi.`,
      solution: [`curl -i -H "Authorization: Bearer soxta.token.123" http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('401') && output.includes('invalid token'),
    },
    {
      id: 'own',
      text: 'Endi haqiqiy token bilan o\'z qaydingizni oling. Sarlavhani fayldan o\'qing.',
      hint: `\`curl -H @tester1.header http://${HOST}/api/v1/notes/1042\``,
      solution: [`curl -H @tester1.header http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('"owner": "tester1"'),
    },
    {
      id: 'method',
      text: 'O\'z qaydingizni DELETE metodi bilan o\'chirishga urinib ko\'ring. Server nima deydi?',
      hint: `\`curl -i -X DELETE -H @tester1.header http://${HOST}/api/v1/notes/1042\` — 405: metod ruxsat etilmagan, bu to'g'ri.`,
      solution: [`curl -i -X DELETE -H @tester1.header http://${HOST}/api/v1/notes/1042`],
      check: ({ output }) => output.includes('405'),
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
      text: '`robots.txt` dagi yo\'lni oddiy foydalanuvchi tokeni bilan oching: `/api/v1/debug/config`.',
      hint: `\`curl -H @tester1.header http://${HOST}/api/v1/debug/config\` — DEBUG yoqilgan va maxfiy sozlamalar ko'rinmoqda: production'da bunday yo'l bo'lmasligi kerak.`,
      solution: [`curl -H @tester1.header http://${HOST}/api/v1/debug/config`],
      check: ({ output }) => output.includes('"DEBUG": true'),
    },
    {
      id: 'report',
      teach: ['tee'],
      text: 'Hisobotga ilova uchun bosh sahifa sarlavhalarini ekranda ko\'ring va ayni paytda `~/sarlavhalar.txt` ga saqlang.',
      hint: `\`curl -sI http://${HOST}/ | tee ~/sarlavhalar.txt\``,
      solution: [`curl -sI http://${HOST}/ | tee ~/sarlavhalar.txt`],
      check: ({ state }) => (fileAt(state, '/home/talaba/sarlavhalar.txt') ?? '').includes('X-Powered-By: Flask'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: debug sahifasi qaysi muhitda (ENV) ishlayotganini aniqlang. Natija faqat qiymatning o'zi bo'lsin, qo'shtirnoqsiz.",
      hint: 'Token bilan so\'rov yuboring va javobdan bitta maydonni jq bilan oling.',
      solution: [`curl -s -H @tester1.header http://${HOST}/api/v1/debug/config | jq -r .ENV`],
      check: ({ output }) => output.trim() === 'staging',
    },
  ],
};
