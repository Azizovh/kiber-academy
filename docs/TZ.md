# KiberAkademiya — Texnik topshiriq (TZ)

Versiya: 1.0 · Sana: 2026-11-16

## 1. Maqsad

KiberAkademiya — kiberxavfsizlikni **noldan ishga kirish darajasigacha** olib chiquvchi o'quv dasturi.
Kiberxavfsizlik nima ekanini bilmaydigan odam dasturni ochib, undagi reja bo'yicha har kuni o'qib,
oxirida Junior Pentester / SOC Analyst / AppSec / Cloud Security lavozimlaridan biriga
hujjat topshira oladigan bo'lishi kerak.

Dastur uch savolga doim javob beradi:

1. **Hozir nima o'rganishim kerak?** — keyingi mavzu har doim aniq.
2. **Buni qayerdan va qanday o'rganaman?** — dars, test, amaliyot va eng yaxshi tashqi manbalar bir joyda.
3. **Qayerdaman va qachon tugataman?** — progress, kunlik maqsad va taxminiy tugash sanasi.

## 2. Foydalanuvchi va ishlatish sharoiti

| | Hozir (v1) | Keyin (v2+) |
|---|---|---|
| Foydalanuvchilar | 1 kishi | ko'p foydalanuvchi |
| Ishga tushish | Windows `.exe` (yoki brauzerda lokal) | sayt + `.exe` |
| Ma'lumot saqlash | kompyuterning o'zida (localStorage) | Supabase bilan sinxronlash |
| Internet | shart emas (tashqi manbalardan tashqari) | kerak |
| AI-ustoz | yo'q, arxitekturada joyi bor | ulanadi |

Boshlang'ich daraja: **to'liq noldan** — o'quvchi kompyuterdan oddiy foydalanuvchi sifatida foydalana oladi, xolos.

## 3. Savol-javobda qabul qilingan qarorlar

| Savol | Qaror |
|---|---|
| Joylashuv | Alohida loyiha: `Desktop\kiberakademiya` (kerakli kod KiberTyping'dan olinadi) |
| Yo'nalish | Umumiy poydevor → o'quvchi tarmoq tanlaydi |
| Tarmoqlar | Pentest/Red Team, SOC/Blue Team, AppSec, Cloud — to'rttalasi |
| O'qitish formati | Yo'l xaritasi + tashqi manbalar, o'z darslari, testlar, amaliy mashqlar |
| Amaliyot | Brauzer terminali, CTF, o'z laboratoriyasini qurish, tashqi platformalar |
| Kontent tili | O'zbekcha, texnik atamalar inglizcha va izohlangan |
| O'tish qoidasi | Tavsiya etilgan tartib, lekin hamma mavzu ochiq; bilgan mavzuni test bilan yopish mumkin |
| Motivatsiya | Kunlik streak va kunlik maqsad (XP, reyting, sertifikat — yo'q) |
| Kunlik vaqt | Dasturda tanlanadi (30 daq / 1 / 2 / 3 / 4 soat), muddatlar avtomatik hisoblanadi |
| Stack | React + Vite + TypeScript, veb-yadro + Electron `.exe` |
| Akkaunt | v1'da yo'q — bitta lokal profil |
| AI-ustoz | Keyingi bosqich |
| Kontent tartibi | v1: to'liq xarita + poydevor darslari; tarmoq darslari bosqichma-bosqich |
| Dizayn | Zamonaviy qorong'i (yorug' rejim ham), vizual yo'l xaritasi; UI/UX'ga alohida e'tibor |
| Qo'shimchalar | Karyera moduli, atamalar lug'ati, takrorlash kartochkalari, shaxsiy qaydlar |

## 4. O'quv dasturi tuzilmasi

Ierarxiya: **Yo'nalish → Bosqich → Modul → Mavzu**. Har bir mavzu — bitta o'quv birligi.

### 4.1 Poydevor (hamma uchun majburiy) — ~300 soat

| # | Bosqich | Natija | Soat |
|---|---|---|---|
| 0 | Kirish | Soha, kasblar, etika va qonunni biladi; laboratoriyasi tayyor | 15 |
| 1 | Kompyuter asoslari | Kompyuter, OT, sanoq tizimlari, kodlash, Windows, virtualizatsiya | 35 |
| 2 | Tarmoq asoslari | TCP/IP, subnetting, DNS, HTTP, protokollar, Wireshark | 60 |
| 3 | Linux | Terminalda erkin ishlaydi, ruxsatlar, jarayonlar, Bash skript | 60 |
| 4 | Dasturlash | Python, Git, web asoslari (HTML/JS), SQL | 80 |
| 5 | Xavfsizlik asoslari | CIA, hujum turlari, kriptografiya, autentifikatsiya, CVE, ATT&CK, OWASP | 50 |

### 4.2 Mutaxassislik tarmoqlari (bittasi tanlanadi) — har biri ~400 soat

- **Pentest / Red Team** — metodologiya va razvedka → web pentest → tizim va tarmoq (privilege escalation) → Active Directory → hisobot, bug bounty, sertifikat.
- **SOC / Blue Team** — SOC va loglar → SIEM va aniqlash → incident response → forensics va malware tahlili → threat hunting.
- **AppSec** — xavfsiz arxitektura → OWASP zaifliklari va himoyasi → kod tahlili (SAST/DAST) → DevSecOps → API va mobil.
- **Cloud va infratuzilma** — bulut asoslari → IAM va tarmoq → konteynerlar va Kubernetes → IaC va avtomatlashtirish → bulutda aniqlash va javob.

### 4.3 Karyera — ~40 soat

Kasblar va maoshlar, sertifikatlar yo'l xaritasi, portfolio, rezyume, LinkedIn, intervyu savollari bazasi, birinchi ishni qidirish strategiyasi.

**Ishga tayyor daraja = Poydevor + 1 tarmoq + Karyera ≈ 740 soat**
(kuniga 2 soat → ~12 oy; 3–4 soat → ~7–8 oy; 1 soat → ~24 oy).

## 5. Funksional talablar

### F1. Birinchi ishga tushirish
- Xush kelibsiz ekrani, ism, kunlik vaqt va haftadagi o'quv kunlari tanlanadi.
- Tanlovga qarab taxminiy tugash muddati darhol ko'rsatiladi.

### F2. Bosh sahifa ("Bugun")
- "Davom etish" — keyingi tavsiya etilgan mavzu.
- Kunlik maqsad halqasi (bugun o'qilgan daqiqa / maqsad), streak, oxirgi haftalar faollik taqvimi.
- Bugun takrorlanadigan kartochkalar soni.
- Umumiy progress va taxminiy tugash sanasi.

### F3. Yo'l xaritasi
- Barcha bosqichlar vizual xarita ko'rinishida: poydevor yo'li → 4 tarmoqqa ayrilish → karyera.
- Har bosqichda: progress, soat hajmi, taxminiy tugash sanasi.
- Bosqich sahifasi: modullar va mavzular ro'yxati, holat belgisi bilan.
- Hamma mavzu ochiq; tavsiya etilgan keyingi mavzu ajratib ko'rsatiladi.

### F4. Mavzu sahifasi
- **Dars** — dastur ichidagi tushuntirish matni: sxemalar, misollar, ogohlantirish va maslahat bloklari, atamalarga izoh.
- **Test** — bir yoki bir nechta to'g'ri javobli savollar, har javobga izoh; o'tish chegarasi 80%.
- **Amaliyot** — terminal lablari, CTF topshiriqlari, tashqi platforma topshiriqlari.
- **Manbalar** — tanlangan bepul tashqi manbalar (video, kurs, hujjat, lab).
- **Maqsadlar** — "nima qila olishim kerak" ro'yxati; darsi hali yozilmagan mavzular shu ro'yxat bilan yopiladi.
- **Qayd** — mavzu yonida shaxsiy konspekt.
- Mavzu tugagach keyingisiga o'tish tugmasi.

### F5. Terminal simulyatori
- Brauzer ichidagi virtual Linux: fayl tizimi, 40 ga yaqin buyruq, pipe (`|`), yo'naltirish (`>`, `>>`), `&&`.
- Lab = boshlang'ich muhit + ketma-ket topshiriqlar; har biri avtomatik tekshiriladi, maslahat (hint) bor.
- Buyruqlar tarixi (↑/↓), `Tab` bilan to'ldirish, `help` va `man`.

### F6. CTF topshiriqlari
- Toifalar: kodlash, kriptografiya, Linux, tarmoq, web, forensics, loglar.
- Javob `flag{...}` ko'rinishida kiritiladi; bosqichma-bosqich maslahatlar.
- Ba'zi topshiriqlar ichida o'z terminali bor.

### F7. Takrorlash kartochkalari
- Dars tugatilganda uning kartochkalari takrorlash navbatiga qo'shiladi.
- Oraliqli takrorlash (1, 2, 4, 8, 16, 32, 64 kun); "bilmadim / qiyin / bildim" baholari.

### F8. Atamalar lug'ati
- Inglizcha atama, o'zbekcha izoh, toifa; qidiruv.
- Dars matnidagi atama ustiga bosilsa izoh oynasi chiqadi.

### F9. Shaxsiy qaydlar
- Har mavzuda qayd yozish; barcha qaydlar bitta sahifada, qidiruv bilan.

### F10. Karyera moduli
- Karyera bosqichi darslari + intervyu savollari bazasi (yo'nalish va daraja bo'yicha, namunaviy javob bilan).

### F11. Kunlik maqsad va streak
- O'qish vaqti dars, lab, CTF va takrorlash sahifalarida faol bo'lgan vaqt bo'yicha avtomatik hisoblanadi.
- Streak — ketma-ket o'qilgan kunlar (kamida bitta o'quv harakati bajarilgan kun).

### F12. Sozlamalar va ma'lumot xavfsizligi
- Ism, kunlik vaqt, o'quv kunlari, mavzu (qorong'i/yorug'/tizim), tanlangan tarmoq.
- Butun progressni JSON faylga eksport/import qilish, progressni tozalash.

## 6. Nofunksional talablar

- **UI/UX**: toza va tinch interfeys, uzoq o'qishga qulay tipografiya, klaviatura bilan boshqarish, 1280px dan 380px gacha moslashuvchan.
- **Oflayn**: barcha dars, test va lablar internetsiz ishlaydi; shriftlar dastur ichida.
- **Tezlik**: sahifalar orasida o'tish bir lahzada; og'ir kutubxonalarsiz.
- **Ishonchlilik**: progress har o'zgarishda saqlanadi; dvijoklar unit-testlar bilan qoplanadi; kontent yaxlitligi avtomatik tekshiriladi.
- **Kengayuvchanlik**: yangi dars = bitta `.md` fayl; yangi mavzu = xaritaga bitta yozuv. Kod o'zgartirish shart emas.
- **Ko'chuvchanlik**: yadro oddiy statik veb-ilova — istalgan hostingga o'zgarishsiz joylanadi.

## 7. Versiyalar rejasi

| Versiya | Tarkib |
|---|---|
| **v1.0** ✓ | Platforma to'liq (F1–F12), barcha bosqichlar xaritasi, 0–1-bosqich to'liq darslari, 6 terminal lab, CTF to'plami, lug'at, desktop oyna |
| **v1.1** ✓ | 2-bosqich (Tarmoq) va 3-bosqich (Linux) darslari va testlari (ularning lablari v1.0 da qurilgan) |
| **v1.2** | 4-bosqich (Dasturlash) va 5-bosqich (Xavfsizlik asoslari) darslari — poydevor to'liq |
| **v1.3–1.6** | Tarmoqlar darslari birma-bir: Pentest → SOC → AppSec → Cloud |
| **v2.0** | Sayt sifatida chiqarish: akkaunt, Supabase sinxronlash, AI-ustoz, rus/ingliz interfeysi |

v1 doirasidan tashqarida: akkauntlar, server, AI-ustoz, XP/reyting/sertifikat, interfeysning boshqa tillari, matn ichida rang bilan belgilash.

## 8. Qabul mezonlari (v1.0)

1. Dastur Ish stolidagi yorliq orqali o'z oynasida, internetsiz ochiladi va progress qayta ochilganda saqlanib qoladi.
   (Mustaqil `.exe` fayl ham yig'iladi, lekin imzolanmagani uchun Smart App Control yoqilgan Windows'da ishlamaydi —
   `docs/ARCHITECTURE.md`, 7-bo'lim.)
2. Yo'l xaritasida poydevor, 4 tarmoq va karyeraning barcha mavzulari maqsad va manbalari bilan ko'rinadi.
3. 0–1-bosqichning har bir mavzusida to'liq dars, test va kartochkalar bor.
4. Terminal lablari topshiriqlarni avtomatik tekshiradi.
5. Kunlik vaqt o'zgartirilganda barcha taxminiy sanalar qayta hisoblanadi.
6. `npm test` va `npm run build` xatosiz o'tadi.
