# KiberAkademiya — Arxitektura

## 1. Umumiy sxema

```
┌──────────────────────────── Electron qobig'i (.exe) ───────────────────────────┐
│  electron/main.cjs  →  dist/index.html ni ochadi, tashqi havolalarni brauzerga  │
│                                                                                 │
│  ┌───────────────────────── Veb-yadro (React SPA) ──────────────────────────┐   │
│  │  pages/        Bugun · Xarita · Bosqich · Mavzu · Amaliyot · Takrorlash   │   │
│  │                Lug'at · Qaydlar · Intervyu · Sozlamalar · Onboarding      │   │
│  │  components/   Layout, Markdown, Quiz, Terminal, ProgressRing, ...        │   │
│  │  ───────────────────────────────────────────────────────────────────────  │   │
│  │  store/        settings · progress · activity · cards · notes  (zustand)  │   │
│  │  engine/       progress · srs · dates · hash · terminal/ (sof funksiyalar)│   │
│  │  content/      curriculum/ · lessons/*.md · labs/ · ctf · glossary · ...  │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                       localStorage  ←→  JSON eksport/import                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Asosiy tamoyil: **kontent — ma'lumot, dvijok — sof funksiya, holat — bitta joyda.**
Uch qatlam bir-biridan mustaqil: kontent qo'shish kodga tegmaydi, dvijoklar React'siz test qilinadi,
saqlash usuli (localStorage → Supabase) almashtirilganda sahifalar o'zgarmaydi.

## 2. Texnologiyalar

| Qatlam | Tanlov | Sabab |
|---|---|---|
| UI | React 19 + TypeScript | KiberTyping bilan bir xil, tanish |
| Yig'ish | Vite 8 (`base: './'`) | Statik natija: sayt, papka va Electron'da bir xil ishlaydi |
| Marshrut | react-router `HashRouter` | `file://` da ham, istalgan hostingda ham sozlamasiz ishlaydi |
| Holat | zustand + `persist` | Sodda, localStorage'ga avtomatik saqlaydi |
| Dars matni | Markdown (`react-markdown` + `remark-gfm`) | Dars yozish oson, kodga bog'liq emas |
| Belgilar | `lucide-react` | Yengil, bir xil uslub |
| Shriftlar | Inter, Space Grotesk, JetBrains Mono (`@fontsource`) | Oflayn ishlaydi |
| Test | vitest | Dvijoklar va kontent yaxlitligi |
| Desktop | Electron + electron-builder | Rust kerak emas, faqat npm; NSIS o'rnatuvchi va portable `.exe` |

## 3. Papka tuzilmasi

```
kiberakademiya/
├─ docs/                  TZ.md, ARCHITECTURE.md
├─ electron/main.cjs      Desktop qobig'i
├─ src/
│  ├─ main.tsx, App.tsx   Kirish nuqtasi va marshrutlar
│  ├─ styles/             tokens.css (ranglar, o'lchamlar), app.css, lesson.css
│  ├─ content/
│  │  ├─ types.ts         Stage, Module, Topic, Resource, Lab, CtfChallenge ...
│  │  ├─ curriculum/      foundation.ts, pentest.ts, soc.ts, appsec.ts, cloud.ts, career.ts, index.ts
│  │  ├─ lessons/<bosqich>/<mavzu-id>.md
│  │  ├─ lessonParser.ts  .md → segmentlar, test savollari, kartochkalar
│  │  ├─ lessons.ts       barcha darslarni yuklaydi va indekslaydi
│  │  ├─ labs/            terminal lablari
│  │  ├─ ctf.ts           CTF topshiriqlari
│  │  ├─ glossary.ts      atamalar lug'ati
│  │  └─ interview.ts     intervyu savollari bazasi
│  ├─ engine/
│  │  ├─ progress.ts      mavzu holati, bosqich foizi, keyingi mavzu, muddat hisobi
│  │  ├─ srs.ts           oraliqli takrorlash
│  │  ├─ dates.ts         kun kalitlari, streak
│  │  ├─ hash.ts          flag xeshi
│  │  └─ terminal/        fs.ts (virtual fayl tizimi), shell.ts (parser), commands.ts
│  ├─ store/              settings, progress, activity, cards, notes, backup
│  ├─ hooks/              useStudyTimer
│  ├─ components/
│  └─ pages/
└─ package.json, vite.config.ts, tsconfig.json
```

## 4. Kontent modeli

### 4.1 Xarita (`content/curriculum`)

```ts
Stage  { id, track, title, summary, outcome, modules[] }
Module { id, title, topics[] }
Topic  { id, title, summary, minutes, goals[], resources[], labs?[], ctf?[] }
```

- `minutes` — mavzuning **to'liq** o'quv vaqti (dars + tashqi amaliyot). Barcha muddat hisoblari shundan chiqadi.
- `goals` — "nima qila olaman" jumlalari. Ular ham o'quv maqsadi, ham o'z-o'zini tekshirish ro'yxati.
- Mavzuning darsi bor-yo'qligi alohida belgilanmaydi: `lessons/` ichida shu `id` li fayl bo'lsa — dars bor.

### 4.2 Dars fayli (`lessons/<bosqich>/<mavzu-id>.md`)

Oddiy Markdown + `:::` bloklari:

```
Oddiy matn, **qalin**, jadval, kod bloklari. Atama: [[firewall]] yoki [[ip-address|IP manzil]].

:::tip        maslahat          :::info   qo'shimcha ma'lumot
:::warn       ogohlantirish     :::key    asosiy g'oya
:::try        o'zingiz sinab ko'ring
:::lab terminal-first-steps     ← terminal labiga havola kartasi

:::quiz
? Savol matni
- noto'g'ri variant
+ to'g'ri variant            (bir nechta + bo'lsa — ko'p tanlovli savol)
! To'g'ri javob izohi
:::

:::cards
Savol :: Javob
:::
```

`lessonParser.ts` faylni segmentlarga ajratadi; test savollari "Test" bo'limiga,
kartochkalar takrorlash tizimiga yig'iladi. Kartochka identifikatori: `<mavzu-id>#<tartib>`.

### 4.3 Kontent yaxlitligi

`content.test.ts` har yig'ishdan oldin tekshiradi: identifikatorlar takrorlanmasligi, har dars
fayli xaritadagi mavzuga mos kelishi, har testda to'g'ri javob borligi, `[[atama]]` lug'atda mavjudligi,
`labs`/`ctf` havolalari haqiqiy ekani, har lab topshirig'i namunaviy yechim bilan o'tishi.

## 5. Holat va saqlash

| Store | localStorage kaliti | Tarkib |
|---|---|---|
| `settings` | `kiberakademiya:settings` | ism, kunlik daqiqa, haftalik kunlar, mavzu, tanlangan tarmoq, onboarding |
| `progress` | `kiberakademiya:progress` | mavzular (dars o'qildi, eng yaxshi test natijasi, belgilangan maqsadlar), lablar, CTF |
| `activity` | `kiberakademiya:activity` | kunlar bo'yicha o'qilgan soniyalar va harakatlar soni |
| `cards` | `kiberakademiya:cards` | kartochka qutisi va keyingi takrorlash sanasi |
| `notes` | `kiberakademiya:notes` | mavzular bo'yicha qaydlar |

- Har store'da `version` bor — tuzilma o'zgarsa migratsiya yoziladi.
- `store/backup.ts` barcha store'larni bitta JSON'ga eksport/import qiladi.
- Hosil qilinadigan qiymatlar (foiz, holat, sana, streak) **saqlanmaydi** — har safar `engine/` funksiyalari bilan hisoblanadi.

## 6. Asosiy algoritmlar

**Mavzu holati.** Darsi bor mavzu: `dars o'qildi` va (test yo'q yoki eng yaxshi natija ≥ 80%) → *tugallangan*.
Darsi yo'q mavzu: barcha maqsadlar belgilangan → *tugallangan*. Biror narsa boshlangan bo'lsa → *jarayonda*.

**Keyingi mavzu.** Poydevor bosqichlari tartib bilan, keyin tanlangan tarmoq, keyin karyera;
shu ketma-ketlikdagi birinchi tugallanmagan mavzu.

**Muddat.** `qolgan daqiqalar ÷ (kunlik daqiqa × haftalik kunlar ÷ 7)` = kalendar kunlari.
Har bosqichning tugash sanasi ketma-ket qo'shib chiqiladi. Kunlik vaqt o'zgarsa hammasi qayta hisoblanadi.

**O'qish vaqti.** `useStudyTimer` o'quv sahifalarida har 15 soniyada vaqt qo'shadi;
oyna ko'rinmasa yoki 2 daqiqa harakat bo'lmasa to'xtaydi.

**Streak.** Bugundan (yoki bugun hali o'qilmagan bo'lsa kechadan) orqaga qarab, faollik bor ketma-ket kunlar soni.

**Takrorlash.** Leitner qutilari, oraliqlar `[1, 2, 4, 8, 16, 32, 64]` kun.
*Bildim* → keyingi quti; *Qiyin* → shu quti; *Bilmadim* → birinchi quti, ertaga.

**Terminal.** `shell.ts` qatorni tokenlarga ajratadi (qo'shtirnoq, `|`, `>`, `>>`, `&&`, `;`),
`commands.ts` dagi sof funksiyalarni virtual fayl tizimi (`fs.ts`) ustida bajaradi.
Lab o'ziga xos buyruqlar (masalan `nmap`, `ping`) uchun tayyor natijalarni qo'shishi mumkin.
Har buyruqdan keyin joriy topshiriqning `check(ctx)` funksiyasi chaqiriladi.

## 7. Electron qobig'i

- `electron/main.cjs` bitta oyna ochadi va `dist/index.html` ni yuklaydi (`contextIsolation`, `sandbox` yoqilgan, Node integratsiyasi yo'q).
- Tashqi havolalar tizim brauzerida ochiladi (`shell.openExternal`), dastur ichida emas.
- `npm run app` — yig'ib, desktop oynada ochadi; `npm run desktop` — qayta yig'masdan ochadi.
- **Yorliq orqali ishga tushirish (hozirgi usul).** `KiberAkademiya.lnk` yorlig'i asl, o'zgartirilmagan Electron muhitini
  (`node_modules\electron\dist\electron.exe`) loyiha papkasi bilan ishga tushiradi. Dastur yangilansa — `npm run build`.
- `npm run dist` — `release/` ichida bitta faylli portable `.exe`. **Cheklov:** fayl imzolanmagan. Smart App Control /
  Application Control yoqilgan Windows'da (ishlab chiqish kompyuterida shunday) u bloklanadi va o'rnatuvchi (NSIS) ham
  yig'ilmaydi. Boshqalarga tarqatish uchun kod imzolash sertifikati kerak — yoki dastur sayt sifatida chiqariladi (v2).
- Ikonkalar `public/favicon.svg` dan yasaladi: `npx electron scripts/make-icon.cjs`.
- Ma'lumot Electron profilining localStorage'ida turadi (`%APPDATA%\kiberakademiya`). Brauzerda (`npm run dev`) ochilgan
  nusxa alohida xotiraga ega — ikkalasi orasida progress **Sozlamalar → Ma'lumotlar** orqali ko'chiriladi.

## 8. Kelajak uchun qoldirilgan joylar

| Imkoniyat | Qanday ulanadi |
|---|---|
| **Akkaunt va sinxronlash** | Store'lar allaqachon JSON holatida; `services/sync.ts` qo'shilib, har store Supabase jadvaliga `user_id` bilan yoziladi (KiberTyping'dagi `sync.ts` namunasi). Sahifalar o'zgarmaydi. |
| **AI-ustoz** | Mavzu sahifasida o'ng panel (hozir "Qayd") yoniga "Ustoz" yorlig'i. Kontekst: dars matni + o'quvchi savoli. API kaliti brauzerga chiqmasligi uchun so'rov server funksiyasi orqali o'tadi. |
| **CTF flaglarini serverda tekshirish** | Hozir xesh brauzerda solishtiriladi; ko'p foydalanuvchida `checkFlag()` server funksiyasiga ko'chiriladi. |
| **Boshqa tillar** | Interfeys matnlari komponentlarda; `i18n` lug'atiga chiqarish mexanik ish. Darslar uchun `lessons/<til>/...` tuzilmasi. |
| **Reyting, sertifikat** | `progress` va `activity` ma'lumotlari yetarli; alohida sahifa qo'shiladi. |

## 9. Sifat nazorati

- `npm test` — dvijoklar (terminal, progress, srs, sanalar) va kontent yaxlitligi.
- `npm run typecheck` — qat'iy TypeScript.
- `npm run build` — typecheck + ishlab chiqarish yig'ilishi.
