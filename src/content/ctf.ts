import { dir } from '../engine/terminal/fs';
import { AUTH_LOG } from './labs/analysis';
import { CTF_MORE } from './ctfMore';
import { CTF_WINDOWS } from './ctfWindows';
import { CTF_TRAFFIC } from './ctfTraffic';
import { CTF_CONTAINERS } from './ctfContainers';
import { CTF_CODE } from './ctfCode';
import { CTF_SIEM } from './ctfSiem';
import { CTF_DETECT } from './ctfDetect';
import { CTF_SQL } from './ctfSql';
import { CTF_PYTHON } from './ctfPython';
import type { CtfCategory, CtfChallenge } from './types';

export const CTF_CATEGORIES: Record<CtfCategory, string> = {
  kodlash: 'Kodlash',
  kripto: 'Kriptografiya',
  linux: 'Linux',
  windows: 'Windows',
  tarmoq: 'Tarmoq',
  web: 'Web',
  forensics: 'Forensics',
  loglar: 'Loglar',
  cloud: 'Cloud',
};

/**
 * Flags are stored as cyrb53 hashes (see engine/hash.ts); the plain answers
 * live only in the solutions used by content.test.ts.
 */
const FIRST_SET: CtfChallenge[] = [
  {
    id: 'enc-base64',
    title: 'Oxirida tenglik belgisi',
    category: 'kodlash',
    level: 1,
    description:
      "Tarmoq trafigidan quyidagi satr ushlab olindi. Harflar, raqamlar va oxirida `=` — bu sizga nimanidir eslatishi kerak. Uni ochib, flagni toping.",
    data: 'ZmxhZ3tiYXNlNjRfc2hpZnJfZW1hc30=',
    hints: [
      "Faqat A–Z, a–z, 0–9, `+`, `/` belgilari va oxiridagi `=` — Base64 ning belgisi.",
      "CyberChef'da “From Base64” yoki terminalda `echo 'SATR' | base64 -d`.",
    ],
    flagHash: '00a134fd8f59d2',
  },
  {
    id: 'enc-hex',
    title: "O'n oltilik izlar",
    category: 'kodlash',
    level: 1,
    description: "Xotira dampidan baytlar ketma-ketligi topildi. Har bir juftlik — bitta belgi.",
    data: '66 6c 61 67 7b 68 65 78 5f 6f 73 6f 6e 5f 65 6b 61 6e 7d',
    hints: [
      "0–9 va a–f dan iborat juftliklar — hex (o'n oltilik) yozuv. `66` = 102 = ASCII `f`.",
      "CyberChef'da “From Hex”, yoki terminalda `echo '666c...' | xxd -r -p`.",
    ],
    flagHash: '072bd9877466c4',
  },
  {
    id: 'enc-binary',
    title: 'Nol va bir',
    category: 'kodlash',
    level: 1,
    description: "Kompyuterning ona tilida yozilgan xabar. Har 8 bit — bitta bayt, har bayt — bitta ASCII belgi.",
    data: '01100110 01101100 01100001 01100111 01111011 00110000 01011111 01110110 01100001 01011111 00110001 01111101',
    hints: [
      "Birinchi baytni qo'lda hisoblang: 01100110 = 64 + 32 + 4 + 2 = 102 → `f`.",
      "Qolganini CyberChef'ning “From Binary” amali bilan oching.",
    ],
    flagHash: '026009c75b29a9',
  },
  {
    id: 'enc-layers',
    title: 'Uch qavat piyoz',
    category: 'kodlash',
    level: 2,
    description:
      "Zararli skript o'z buyrug'ini bir necha qavat kodlash ortiga yashirgan. Har qavatni ochganingizda natija yana qandaydir kodlashga o'xshaydi — tanib, davom eting.",
    data: 'NWE2ZDc4Njg1YTMzNzQzMTU5MzI2ODY2NjM1NzQ2MzI1OTU4NTI2NjYzNDc2YzM1NjIzMzcwMzk=',
    hints: [
      "Birinchi qavat — Base64. Natijada faqat 0–9 va a–f chiqadi.",
      "Ikkinchi qavat — hex. Undan keyin yana Base64.",
      "CyberChef'da ketma-ket: From Base64 → From Hex → From Base64.",
    ],
    flagHash: '13b672285773d4',
  },
  {
    id: 'cry-caesar',
    title: 'Sezarning maktubi',
    category: 'kripto',
    level: 1,
    description:
      "Eng qadimgi shifrlardan biri: har bir harf alifboda bir xil qadamga surilgan. Flag formati `flag{...}` ekanini bilasiz — shuning o'zi kalitni topishga yetadi.",
    data: 'mshn{zlghy_flaap_xhkht}',
    hints: [
      "`m` aslida `f` bo'lishi kerak. f → m necha qadam?",
      "Surilish — 7. CyberChef'da “ROT13” amalining Amount qiymatini 19 (26 − 7) qiling.",
    ],
    flagHash: '12f96a35609dc2',
  },
  {
    id: 'cry-xor',
    title: 'Bitta baytli kalit',
    category: 'kripto',
    level: 3,
    description:
      "Zararli dasturlar satrlarni yashirish uchun ko'pincha XOR ishlatadi: har bir bayt bitta kalit bayt bilan XOR qilinadi. Kalit noma'lum, lekin u atigi bir bayt — ya'ni 256 ta variant. Natija hex ko'rinishida berilgan.",
    data: '4c464b4d515245587548435e5e4b75414b46435e57',
    hints: [
      "XOR ning xossasi: A ⊕ K = C bo'lsa, C ⊕ A = K. Ochiq matn `f` bilan boshlanishini bilasiz.",
      "0x4c ⊕ 0x66 (`f`) = 0x2a. Kalit — 0x2a.",
      "CyberChef: From Hex → XOR (Key: 2a, HEX). Yoki “XOR Brute Force” amali.",
    ],
    flagHash: '0cb1718923c17e',
  },
  {
    id: 'lin-hidden',
    title: 'Yashiringan fayl',
    category: 'linux',
    level: 1,
    description:
      "Sobiq xodim serverda nimanidir yashirib ketgan. Quyidagi terminaldan foydalanib, uni toping. Oddiy `ls` yetarli bo'lmaydi.",
    hints: [
      "Nuqta bilan boshlanadigan fayl va kataloglar yashirin. Ularni `ls -a` ko'rsatadi.",
      "Butun tizimdan qidirish: `find / -name \"*flag*\"`.",
    ],
    flagHash: '04cf27b3b760c8',
    shell: () => ({
      fs: {
        home: {
          talaba: {
            'readme.txt': "Bu serverda hech qanday qiziq narsa yo'q. Rostdan.\n",
            hujjatlar: { 'hisobot.txt': 'Q3 hisoboti\n' },
            '.kesh': { '.eski': { '.flag.txt': 'flag{yashirin_fayl_topildi}\n' } },
          },
        },
        opt: { vosita: { 'run.sh': '#!/bin/bash\necho ok\n' } },
        etc: { hostname: 'srv01\n' },
        tmp: {},
      },
    }),
  },
  {
    id: 'log-bruteforce',
    title: 'Tungi mehmon',
    category: 'loglar',
    level: 2,
    description:
      "Server SSH orqali buzilgan. `/var/log/auth.log` ni tahlil qiling: hujumchining IP manzili qanday va u qaysi foydalanuvchi nomi bilan kirishga muvaffaq bo'ldi?\n\nFlag formati: `flag{IP_foydalanuvchi}` — masalan `flag{1.2.3.4_root}`.",
    hints: [
      "Muvaffaqiyatsiz urinishlar: `grep \"Failed password\" /var/log/auth.log`.",
      "Eng ko'p uringan IP: `... | cut -d \" \" -f 11 | sort | uniq -c | sort -rn`.",
      "Shu IP uchun `Accepted` qatorini qidiring — unda foydalanuvchi nomi bor.",
    ],
    flagHash: '178b4cb51327f2',
    shell: () => ({
      fs: {
        home: { talaba: {} },
        var: { log: dir({ 'auth.log': AUTH_LOG, syslog: 'Nov 16 03:00:01 srv CRON[1999]: (root) CMD (run-parts /etc/cron.hourly)\n' }) },
        tmp: {},
      },
    }),
  },
  {
    id: 'web-source',
    title: 'Manba kodida nima bor?',
    category: 'web',
    level: 1,
    description:
      "Login sahifasining manba kodi (brauzerda Ctrl+U bilan ko'rinadigan narsa) quyida. Dasturchi parolni tekshirishni brauzer tomonida qoldirgan. Parolni toping — flag: `flag{parol}`.",
    data: `<!DOCTYPE html>
<html>
<head><title>Admin kirish</title></head>
<body>
  <form onsubmit="return tekshir()">
    <input id="parol" type="password" placeholder="Parol">
    <button>Kirish</button>
  </form>
  <!-- eslatma: tekshiruvni keyin serverga ko'chiraman -->
  <script>
    function tekshir() {
      var p = document.getElementById('parol').value;
      if (btoa(p) === 'ZGV2dG9vbHNfZG9zdA==') {
        location.href = '/panel';
      } else {
        alert('Xato parol');
      }
      return false;
    }
  </script>
</body>
</html>`,
    hints: [
      "Brauzerga yuborilgan hamma narsani foydalanuvchi o'qiy oladi — JavaScript ham.",
      "`btoa()` — matnni Base64 ga kodlaydi. Demak solishtirilayotgan satr — parolning Base64 ko'rinishi.",
    ],
    flagHash: '04ce6285749425',
  },
  {
    id: 'net-subnet',
    title: 'Qaysi tarmoqdaman?',
    category: 'tarmoq',
    level: 2,
    description:
      "Server manzili `192.168.10.77/26`. Bu server joylashgan tarmoqning **tarmoq manzili** va **broadcast manzili**ni hisoblang.\n\nFlag formati: `flag{tarmoq_broadcast}` — masalan `flag{10.0.0.0_10.0.0.255}`.",
    hints: [
      "/26 — maskada 26 ta bir: 255.255.255.192. Oxirgi oktetda tarmoqlar 64 tadan bo'linadi: 0, 64, 128, 192.",
      "77 qaysi blokka tushadi? 64 dan 127 gacha. Blokning birinchi manzili — tarmoq, oxirgisi — broadcast.",
    ],
    flagHash: '06f2b7ccfdddd7',
  },
  {
    id: 'for-magic',
    title: 'Kengaytma aldaydi',
    category: 'forensics',
    level: 1,
    description:
      "Gumonlanuvchining kompyuteridan `hisobot.pdf` nomli fayl topildi, lekin PDF dasturi uni ocholmayapti. Faylning birinchi baytlari quyida. Bu aslida qanday fayl?\n\nFlag formati: `flag{kengaytma}` — masalan `flag{zip}`.",
    data: `00000000: 8950 4e47 0d0a 1a0a 0000 000d 4948 4452  .PNG........IHDR
00000010: 0000 0320 0000 0258 0806 0000 009a 7682  ... ...X......v.`,
    hints: [
      "Fayl turi nomidagi kengaytma bilan emas, boshidagi “sehrli baytlar” (magic bytes) bilan aniqlanadi.",
      "PDF `25 50 44 46` (%PDF) bilan boshlanadi. Bu yerda esa `89 50 4E 47`.",
    ],
    flagHash: '03393b6f62c1a5',
  },
];

/** All challenges: the first set above, then Linux administration, logs, AppSec and cloud (ctfMore.ts). */
export const CTF: CtfChallenge[] = [...FIRST_SET, ...CTF_MORE, ...CTF_WINDOWS, ...CTF_TRAFFIC, ...CTF_CONTAINERS, ...CTF_CODE, ...CTF_SIEM, ...CTF_DETECT, ...CTF_SQL, ...CTF_PYTHON];

const index = new Map(CTF.map((c) => [c.id, c]));

export function getCtf(id: string): CtfChallenge | null {
  return index.get(id) ?? null;
}
