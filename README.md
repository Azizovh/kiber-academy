# KiberAkademiya

Kiberxavfsizlikni noldan ishga kirish darajasigacha o'rgatuvchi o'quv dasturi: yo'l xaritasi, o'zbek tilidagi
darslar, testlar, brauzer ichidagi Linux terminali, CTF topshiriqlari, takrorlash kartochkalari.

- Talablar va qarorlar: [docs/TZ.md](docs/TZ.md)
- Tuzilishi: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Ishga tushirish

```bash
npm install
npm run dev        # brauzerda: http://localhost:5183
```

| Buyruq | Nima qiladi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm test` | Dvijok va kontent yaxlitligi testlari |
| `npm run build` | Tekshiruv + `dist/` ga yig'ish |
| `npm run app` | Yig'ib, desktop oynada ochadi |
| `npm run desktop` | Qayta yig'masdan desktop oynada ochadi |
| `npm run dist` | `release/` ichida portable `.exe` (imzolanmagan — pastga qarang) |
| `node scripts/check-links.mjs` | Barcha tashqi havolalarni tekshiradi |

Agar `npm install` dan keyin Electron ishga tushmasa (npm o'rnatish skriptini o'tkazib yuborgan bo'lsa):

```bash
node node_modules/electron/install.js
```

## Desktop dastur sifatida

Ish stolidagi **KiberAkademiya** yorlig'ini ikki marta bosing — dastur o'z oynasida ochiladi (brauzer va terminal kerak emas).
Yorliq asl Electron muhitini shu papka bilan ishga tushiradi, shuning uchun papkani ko'chirsangiz yorliqni qayta yarating.
Kod yoki darslarni o'zgartirgach, oynada ko'rinishi uchun `npm run build` ni ishga tushiring.

`npm run dist` yig'adigan mustaqil `.exe` imzolanmagan: Smart App Control yoqilgan Windows uni bloklaydi.
Boshqa kompyuterlarga tarqatish uchun kod imzolash sertifikati kerak bo'ladi.

## Yangi dars qo'shish

1. Mavzu `src/content/curriculum/` dagi xaritada bo'lishi kerak (`id` — fayl nomi bo'ladi).
2. `src/content/lessons/<bosqich-id>/<mavzu-id>.md` faylini yarating. Format — `docs/ARCHITECTURE.md`, 4.2-bo'lim.
3. `npm test` — dars tuzilishi, test savollari va lug'at havolalari avtomatik tekshiriladi.

Kod o'zgartirish shart emas: fayl paydo bo'lishi bilan mavzuda "Dars" va "Test" yorliqlari chiqadi.

## Ma'lumotlar

Progress faqat shu kompyuterda saqlanadi (brauzerda — localStorage, `.exe` da — `%APPDATA%\KiberAkademiya`).
Zaxira nusxa: **Sozlamalar → Ma'lumotlar**.
