Qaydnoma'da endi hamma vosita ishlaydi: SAST, DAST, SCA, sir skaneri, konteyner skaneri, IaC skaneri. Birinchi oyning oxirida natija: **1 340 ta topilma**. Dasturchilar jadvalni ochib, yopib qo'yishdi. Ikki oydan keyin — 2 100 ta. Hech biri tuzatilmagan.

Bu — AppSec'dagi eng keng tarqalgan muvaffaqiyatsizlik. Muammo topishda emas — **topilganlarni boshqarishda**. Qaysi topilma haqiqiy? Qaysi biri muhim? Kim tuzatadi? Qachongacha? Qanday qilib dasturchini yangi qo'shimcha ish emas, balki hamkorlikdek his qildirish mumkin?

b2 bosqichidagi "alert fatigue" ni eslang — SOC'da sozlanmagan qoidalar analitiklarni shovqinga ko'madi. AppSec'da xuddi shu narsa **dasturchilar** bilan sodir bo'ladi. Bu darsda zaifliklarni boshqarish jarayonini va eng muhimi — dasturchilar bilan ishlashni o'rganasiz.

## Zaiflikning hayot sikli

```
 1. Topish        — SAST, DAST, SCA, kod ko'rib chiqish, pentest, bug bounty, foydalanuvchi xabari
       ▼
 2. Saralash      — haqiqiymi? takrormi? (false positive va dublikatlarni olib tashlash)
       ▼
 3. Baholash      — xavf darajasi: texnik jiddiylik + KONTEKST
       ▼
 4. Tayinlash     — kim tuzatadi? (jamoa, mas'ul)
       ▼
 5. Tuzatish      — muddat (SLA) ichida; yoki ongli qabul qilish
       ▼
 6. Tekshirish    — tuzatish haqiqatan ishlaydimi? (test, qayta skan)
       ▼
 7. Yopish        — va saboq: xuddi shu sinf boshqa joyda bormi? qoida qo'shish mumkinmi?
```

b3 bosqichidagi IR jarayoniga o'xshaydi — va bu tasodif emas: ikkalasi ham "muammo → hal qilish → saboq" sikli.

## 2. Saralash — shovqinni kamaytirish

Avtomatik vositalarning xom natijalari to'g'ridan-to'g'ri dasturchilarga yuborilmaydi. Avval AppSec muhandisi (yoki avtomatik qoidalar) saralaydi:

| Qadam | Nima |
|---|---|
| **Dublikatlarni birlashtirish** | Bitta zaif kutubxona 40 ta konteyner image'ida — bitta muammo, 40 ta emas |
| **False positive'larni olib tashlash** | a3 bosqichidagi SAST va DAST saralash qoidalari |
| **Kontekstni qo'shish** | Bu kod ishlab chiqarishda ishlatiladimi? Internetga ochiqmi? |
| **Guruhlash** | 30 ta "sarlavha yo'q" topilmasi — bitta vazifa: "xavfsizlik sarlavhalarini qo'shish" |

Maqsad: dasturchi ko'radigan har bir vazifa — **haqiqiy, tushunarli va harakatga arziydigan**. Dars boshidagi 1 340 ta topilma saralashdan keyin ko'pincha bir necha o'nlab haqiqiy vazifaga aylanadi.

## 3. Baholash — texnik jiddiylik va kontekst

**CVSS** (xavfsizlik bosqichidagi CVE/CVSS darsi) — **texnik** jiddiylikni o'lchaydi. Lekin bitta CVSS bahosi turli joyda turli xavfni anglatadi:

| Topilma | CVSS (taxminiy) | Kontekst | Haqiqiy ustuvorlik |
|---|---|---|---|
| SQL injection | Yuqori | Ichki, faqat administratorlar ishlatadigan hisobot sahifasida | O'rta–yuqori |
| SQL injection | Yuqori | Ommaviy qidiruv sahifasida, autentifikatsiyasiz | **Kritik** |
| Kutubxonadagi kritik CVE | Kritik | Zaif funksiya ishlatilmaydi (a3 bosqichidagi reachability) | Past–o'rta |
| Kutubxonadagi CVE | Yuqori | **CISA KEV** ro'yxatida, internetga ochiq xizmatda | **Kritik** |
| IDOR | O'rta | Barcha foydalanuvchilarning shaxsiy qaydlari ochiladi | Yuqori |

Ustuvorlikni belgilaydigan savollar (a3 bosqichidagi SCA darsidagi ro'yxatning kengaytmasi):

| Savol | Ta'siri |
|---|---|
| Internetga ochiqmi, autentifikatsiya kerakmi? | Kim yeta oladi |
| Qanday ma'lumot xavf ostida? | Shaxsiy, moliyaviy, maxfiy — yuqori |
| Ekspluatatsiya qilish qanchalik oson? Faol ekspluatatsiya qilinyaptimi (EPSS, KEV)? | Ehtimollik |
| Boshqa himoya qatlamlari bormi? | WAF, CSP — ehtimollikni kamaytiradi, lekin tuzatishni bekor qilmaydi |
| Tahdid modelida bu qism qanchalik muhim? (a3) | Biznes ta'siri |

Natija — xavfsizlik bosqichidagi formula: **xavf = ehtimollik × ta'sir**.

## 5. SLA va qabul qilish

Har bir daraja uchun **tuzatish muddati** — SLA (b1 bosqichidagi SOC SLA tushunchasi bilan bir xil g'oya). Namuna (har bir tashkilot o'zinikini belgilaydi):

| Daraja | Tuzatish muddati (namuna) |
|---|---|
| Kritik | 7 kun (faol ekspluatatsiya bo'lsa — darhol) |
| Yuqori | 30 kun |
| O'rta | 90 kun |
| Past | Rejalashtirilgan ish bilan birga yoki qabul qilish |

SLA'siz "keyinroq tuzatamiz" — hech qachon degani.

### Xavfni qabul qilish

Ba'zan tuzatish imkonsiz yoki juda qimmat (eski tizim, uchinchi tomon komponenti). Bunda — **ongli qabul qilish** (a3 bosqichidagi threat modeling darsi):

```markdown
## Xavfni qabul qilish: QAYD-SEC-041

**Topilma:** Eski hisobot moduli eskirgan kutubxonadan foydalanadi (o'rta daraja CVE).
**Nega tuzatilmaydi:** Modul 2027-yil 1-chorakda butunlay almashtiriladi; yangilash
kutubxonaning API o'zgargani uchun moduldagi ko'p kodni qayta yozishni talab qiladi.
**Kompensatsiya choralari:** Modul faqat ichki tarmoqdan, administratorlar uchun ochiq;
zaif funksiya (XML import) o'chirilgan; WAF qoidasi qo'shilgan.
**Qaror qabul qilgan:** [mas'ul rahbar], [sana]
**Amal qilish muddati:** 2027-03-31 — keyin qayta ko'rib chiqiladi.
```

Muhim: qabul qilish **muddatli** (abadiy emas), **kim** qaror qilgani yozilgan (AppSec muhandisi emas — biznes egasi xavfni qabul qiladi; AppSec maslahat beradi), va **kompensatsiya choralari** ko'rsatilgan.

## Topilmani dasturchiga yozish

a2 bosqichidagi tuzatish hisoboti va a3 bosqichidagi kod ko'rib chiqish izohlari — bu yerda jamlanadi. Yaxshi topilma vazifasi:

```markdown
## [YUQORI] Qidiruvda SQL injection — /search?q=

**Qayerda:** qaydnoma/notes.py:112, search() funksiyasi
**Muammo:** q parametri f-string orqali SQL so'roviga qo'shilmoqda.
**Ta'sir:** Har qanday kirgan foydalanuvchi boshqa foydalanuvchilarning qaydlarini va
users jadvalini (parol xeshlarini) o'qishi mumkin.
**Qanday tekshirish (test muhitida):** qidiruvga ' belgisini kiriting — 500 xatosi chiqadi.

**Tuzatish:**
    db.execute("SELECT id, title FROM notes WHERE owner_id = ? AND title LIKE ?",
               (uid, f"%{q}%"))

**Test:** tests/test_security.py::test_search_with_quote_is_safe ni qo'shing.
**Ma'lumot uchun:** OWASP SQL Injection Prevention Cheat Sheet
**SLA:** 30 kun (yuqori)
```

| Yaxshi topilma | Yomon topilma |
|---|---|
| Aniq joy (fayl, qator, URL) | "Ilovada SQL injection bor" |
| Dasturchi tilida ta'sir | Faqat CVSS raqami |
| **Tuzatish kodi** yoki aniq yo'l | "Kiritishni tekshiring" |
| Qanday tekshirish | — |
| Bitta vazifa — bitta muammo (yoki bir xil sinf) | 200 ta topilmali PDF |

Topilmalar dasturchilar **allaqachon ishlatadigan** tizimda bo'lishi kerak — ularning tiket tizimida (Jira, GitHub Issues), alohida xavfsizlik portalida emas. Xavfsizlik vazifasi boshqa vazifalar bilan bir xil oqimda yursin.

## Dasturchilar bilan ishlash

AppSec muhandisining samaradorligi texnik bilimdan ko'ra ko'proq **munosabatlarga** bog'liq. Bitta AppSec muhandisiga ko'pincha o'nlab yoki yuzlab dasturchi to'g'ri keladi — u hamma kodni o'zi ko'rib chiqa olmaydi. U **dasturchilarning o'zini** xavfsizroq kod yozishga yordam berishi kerak.

| Yondashuv | Natija |
|---|---|
| "Xavfsizlik politsiyasi" — "yo'q" deydi, bloklaydi, ayblaydi | Dasturchilar xavfsizlik jamoasini chetlab o'tadi, muammolarni yashiradi |
| **Hamkor** — yechim bilan keladi, tushuntiradi, osonlashtiradi | Dasturchilar o'zi kelib maslahat so'raydi |

Amaliy usullar:

| Usul | Nima |
|---|---|
| **Xavfsiz standartlar** ("paved road") | To'g'ri yo'l — eng oson yo'l bo'lsin: tayyor `load_note()`, tayyor xavfsiz konfiguratsiya shabloni, tayyor CI workflow — dasturchi o'ylamasdan to'g'ri qiladi |
| **Tez fikr** | Muammo IDE yoki PR'da, kod yozilgan kunida — ikki oydan keyin emas (CI/CD darsi) |
| **O'qitish** | Har bir topilma — dars; qisqa ichki seminarlar ("bizning ilovamizda topilgan 5 ta xato") |
| **Security champions** | Har bir jamoada xavfsizlikka qiziqqan dasturchi (pastda) |
| **Tan olish** | Yaxshi xavfsizlik amaliyotini ko'rsatgan dasturchini ommaviy maqtash |

### Security champions

[[security-champion|Security champion]] — dasturchilar jamoasidagi, xavfsizlikka qiziqqan va AppSec jamoasi bilan bog'lovchi bo'lgan dasturchi. U AppSec muhandisi emas — u o'z jamoasining dasturchisi bo'lib qoladi, lekin:

- jamoada birinchi xavfsizlik maslahatchisi;
- tahdid modellashtirish sessiyalarida qatnashadi (a3);
- muhim PR'larni xavfsizlik nuqtai nazaridan ko'rib chiqadi;
- AppSec jamoasidan qo'shimcha o'qitish oladi;
- jamoaning muammolarini AppSec'ga yetkazadi.

Bu dastur bitta AppSec muhandisining ta'sirini o'nlab jamoaga kengaytiradi. Ko'p AppSec muhandislari aynan security champion sifatida boshlagan — dasturchilikdan AppSec'ga eng tabiiy yo'llardan biri (karyera bo'limidagi ish bozori darsi).

## Metrikalar

Jarayon ishlayaptimi? Raqamlar bilan (b3 bosqichidagi MTTD/MTTR kabi):

| Metrika | Nima ko'rsatadi |
|---|---|
| **MTTR** (o'rtacha tuzatish vaqti) darajalar bo'yicha | Qanchalik tez tuzatiladi |
| **SLA'ga rioya** (%) | Muddatlar bajariladimi |
| **Ochiq topilmalar soni va tendensiyasi** | Qarz o'syaptimi yoki kamayyaptimi |
| **Takrorlanish** | Bir xil sinf qayta-qayta paydo bo'lyaptimi? — o'qitish yoki qoida kerak |
| **Qayerda topilgan** (PR'da / ishlab chiqarishda / pentestda) | "Chapga siljish": qancha ko'p muammo erta (PR'da) topilsa — shuncha yaxshi va arzon |
| **False positive ulushi** | Vositalarga ishonch |

Oxirgi ikkitasi ayniqsa muhim: maqsad — topilmalar sonini emas, **kech topilgan** topilmalar sonini kamaytirish.

## OWASP SAMM — dasturning yetukligi

Alohida topilmalardan yuqoriroq savol: **tashkilotning dasturiy ta'minot xavfsizligi dasturi qanchalik yetuk?** Buning uchun **OWASP SAMM** (Software Assurance Maturity Model) bor. U beshta biznes funksiyasini ajratadi:

| Funksiya | Amaliyotlar (misollar) | Bu tarmoqdagi darslar |
|---|---|---|
| **Governance** (boshqaruv) | Strategiya, siyosatlar, o'qitish | Shu dars, security champions |
| **Design** (loyihalash) | Tahdidlarni baholash, xavfsizlik talablari, arxitektura | a3 — threat modeling, ASVS |
| **Implementation** (amalga oshirish) | Xavfsiz build, joylash, nuqsonlarni boshqarish | a4 — CI/CD, konteynerlar, shu dars |
| **Verification** (tekshirish) | Arxitektura tahlili, talablarga asoslangan va avtomatik testlash | a2–a3 — testlar, SAST, DAST, kod ko'rib chiqish |
| **Operations** (ekspluatatsiya) | Insidentlarni boshqarish, muhit boshqaruvi | b1–b3 — SOC va IR tarmog'i |

Har bir amaliyot uchun yetuklik darajalari (1 dan 3 gacha) bor. SAMM baholash tashkilotga "biz qayerdamiz va keyingi qadam nima" degan savolga javob beradi — b2 bosqichidagi ATT&CK qamrov xaritasi va b4 bosqichidagi ov yetuklik modeliga o'xshash g'oya.

## Tashqi xabarlar: security.txt va VDP

Ba'zan zaiflikni tashqaridan kimdir topadi — tadqiqotchi yoki foydalanuvchi. U kimga xabar berishini bilishi kerak:

```
# https://qaydnoma.example/.well-known/security.txt
Contact: mailto:security@qaydnoma.example
Expires: 2027-12-31T23:59:59Z
Policy: https://qaydnoma.example/security-policy
Preferred-Languages: uz, ru, en
```

`security.txt` (standart: RFC 9116) — `Contact` va `Expires` maydonlari majburiy. **Zaifliklarni oshkor qilish siyosati** (VDP — Vulnerability Disclosure Policy) esa nimani sinash mumkin, qanday xabar berish va tadqiqotchiga nima kafolat berilishini aytadi. Keyingi bosqich — **bug bounty** (pullik mukofot dasturi), lekin u faqat ichki jarayon (saralash, tuzatish, SLA) yetuk bo'lganda ma'noli: aks holda xabarlar oqimi jamoani ko'madi.

:::key
**Zaifliklarni boshqarishning maqsadi — topilmalar ro'yxati emas, xavfning kamayishi.** Bunga uchta narsa olib boradi: **saralash** (dasturchiga faqat haqiqiy, kontekstli, guruhlangan vazifalar), **aniq javobgarlik** (kim, qachongacha — SLA; tuzatib bo'lmasa — muddatli, mas'ul imzolagan qabul qilish), va **hamkorlik** (topilma — tuzatish kodi bilan, dasturchi ishlatadigan tizimda; xavfsiz standartlar; security champions). Dars boshidagi 2 100 ta tuzatilmagan topilma — vositalar muvaffaqiyatsizligi emas, jarayon muvaffaqiyatsizligi.
:::

## Bu dars nimani bermaydi

- **Zaifliklarni boshqarish platformalarini** (DefectDojo kabi) batafsil — ular topilmalarni yig'ish, dublikatlarni birlashtirish va kuzatishni avtomatlashtiradi.
- **OWASP SAMM'ning to'liq baholash metodologiyasini** — rasmiy SAMM sahifasi.
- **Bug bounty dasturini boshqarishni batafsil** — alohida mavzu.

:::try
**1. Saralash.** Qaydnoma'ning `vulnerable` branch'ida (a2) barcha vositalarni (Semgrep, pip-audit, ZAP, Trivy) ishga tushiring. Barcha natijalarni bitta jadvalga yig'ing, keyin: dublikatlarni birlashtiring, false positive'larni belgilang, guruhlang. Nechta xom natija nechta haqiqiy vazifaga aylandi?

**2. Kontekstli baholash.** Haqiqiy vazifalarning har biriga yuqoridagi savollar bo'yicha ustuvorlik bering (kritik/yuqori/o'rta/past) va SLA belgilang.

**3. Topilma yozing.** Eng muhim uchta topilma uchun dasturchiga mo'ljallangan vazifani yuqoridagi namuna bo'yicha yozing — GitHub Issues'da.

**4. Qabul qilish.** Bitta tuzatib bo'lmaydigan (yoki hozircha tuzatilmaydigan) topilma uchun xavfni qabul qilish hujjatini yozing — kompensatsiya choralari va muddat bilan.

**5. security.txt.** Qaydnoma uchun `/.well-known/security.txt` faylini yarating va Flask'da uni berish uchun marshrut qo'shing.

**6. SAMM.** OWASP SAMM sahifasida beshta biznes funksiyasini o'qing va Qaydnoma loyihangizni har biri bo'yicha (o'zingiz bajargan ishlar asosida) 0–3 shkalada taxminiy baholang.
:::

## Xulosa

- Topish — yarim ish; **boshqarish** — qolgan yarmi. Sozlanmagan vositalar dasturchilarni "alert fatigue"ga ko'madi.
- Hayot sikli: **topish → saralash → baholash → tayinlash → tuzatish → tekshirish → yopish va saboq**.
- **Saralash**: dublikatlar, false positive'lar, kontekst, guruhlash — dasturchiga faqat haqiqiy vazifalar.
- **Baholash**: CVSS + kontekst (ochiqlik, ma'lumot, EPSS/KEV, himoya qatlamlari, tahdid modeli).
- **SLA** daraja bo'yicha; tuzatib bo'lmasa — **muddatli, biznes egasi imzolagan, kompensatsiya choralari bilan qabul qilish**.
- Yaxshi topilma: **joy, ta'sir, tuzatish kodi, tekshirish, test** — dasturchi ishlatadigan tizimda.
- Dasturchilar bilan — **hamkor**, politsiya emas: xavfsiz standartlar ("paved road"), tez fikr, o'qitish, **security champions**.
- Metrikalar: MTTR, SLA'ga rioya, tendensiya, takrorlanish, **qayerda topilgan** ("chapga siljish").
- **OWASP SAMM** — dastur yetukligi (Governance, Design, Implementation, Verification, Operations); **security.txt** va VDP — tashqi xabarlar uchun.

:::quiz
? Dars boshidagi 2 100 ta tuzatilmagan topilmaning asosiy sababi nima?
+ Saralash, ustuvorlik va javobgarlikni tashkil qilmasdan, xom natijalarni dasturchilarga yuborish — jarayon muvaffaqiyatsizligi
- Vositalar juda kam
- Dasturchilar dangasa
- Topilmalar haqiqiy emas
! Muammo topishda emas, boshqarishda.

? Saralash bosqichida nima qilinadi?
+ Dublikatlarni birlashtirish, false positive'larni olib tashlash, kontekst qo'shish va guruhlash
- Barcha topilmalarni darhol dasturchilarga yuborish
- Faqat kritik topilmalarni saqlab, qolganini o'chirish
- Vositalarni o'chirish
! Dasturchi ko'radigan har bir vazifa haqiqiy va harakatga arziydigan bo'lishi kerak.

? Nega bir xil CVSS bahosidagi ikki topilma turli ustuvorlikka ega bo'lishi mumkin?
+ Kontekst farq qiladi: internetga ochiqlik, ma'lumot turi, ekspluatatsiya ehtimoli (EPSS, KEV), boshqa himoya qatlamlari
- CVSS har doim noto'g'ri
- Ustuvorlik tasodifiy tanlanadi
- Faqat yangi topilmalar muhim
! CVSS texnik jiddiylikni, kontekst — haqiqiy xavfni ko'rsatadi.

? Xavfni qabul qilish to'g'ri qilinishi uchun nima bo'lishi kerak?
+ Muddat (qayta ko'rib chiqish sanasi), qaror qabul qilgan biznes egasi va kompensatsiya choralari yozilgan bo'lishi
- AppSec muhandisi yolg'iz abadiy qabul qilishi
- Hech narsa yozmaslik
- Topilmani o'chirib yuborish
! Qabul qilish — muddatli va hujjatlashtirilgan qaror.

? Qaysi topilma tavsifi dasturchi uchun eng foydali?
+ Aniq fayl va qator, dasturchi tilida ta'sir, tuzatish kodi, qanday tekshirish va test
- “Ilovada SQL injection bor”
- Faqat CVSS raqami
- 200 ta topilmali PDF hisobot
! Dasturchi nima qilishni darhol tushunishi kerak.

? Nega topilmalar dasturchilar ishlatadigan tiket tizimida bo'lishi kerak?
+ Xavfsizlik vazifalari boshqa ishlar bilan bir xil oqimda yurishi va unutilmasligi uchun
- Alohida portal xavfsizroq
- Dasturchilar alohida portalni yaxshi ko'radi
- Bu faqat rahbariyat uchun
! Alohida joydagi vazifalar ko'pincha ko'rilmaydi.

? “Paved road” (xavfsiz standartlar) yondashuvi nima?
+ To'g'ri, xavfsiz yo'lni eng oson yo'lga aylantirish — tayyor xavfsiz komponentlar, shablonlar va workflow'lar
- Dasturchilarni har qadamda bloklash
- Barcha kodni AppSec jamoasi yozishi
- Xavfsizlikni ixtiyoriy qilish
! Dasturchi o'ylamasdan to'g'ri qiladi.

? Security champion kim?
+ Dasturchilar jamoasidagi, xavfsizlikka qiziqqan va AppSec jamoasi bilan bog'lovchi bo'lgan dasturchi
- Bosh xavfsizlik direktori
- Tashqi pentester
- Faqat test muhandisi
! Dastur bitta AppSec muhandisining ta'sirini ko'p jamoaga kengaytiradi.

? “Chapga siljish” (shift left) metrikasi nimani o'lchaydi?
+ Muammolar qanchalik erta (PR'da) topilishini — kech (ishlab chiqarishda, pentestda) topilganlar kamayishi kerak
- Kodning chap tomonidagi bo'sh joylarni
- Dasturchilar sonini
- Serverlar joylashuvini
! Erta topilgan muammo arzonroq tuzatiladi.

? security.txt fayli nima uchun kerak?
+ Tashqi tadqiqotchilarga zaiflik haqida kimga va qanday xabar berishni ko'rsatish (RFC 9116, Contact va Expires majburiy)
- Parollarni saqlash uchun
- Saytni tezlashtirish uchun
- Qidiruv tizimlari uchun
! VDP bilan birga tashqi xabarlar jarayonining asosi.
:::

:::cards
Zaiflik hayot sikli? :: Topish → saralash → baholash → tayinlash → tuzatish → tekshirish → yopish va saboq.
Saralash qadamlari? :: Dublikatlarni birlashtirish, false positive'larni olib tashlash, kontekst qo'shish, guruhlash.
Ustuvorlik savollari? :: Internetga ochiqmi? Qanday ma'lumot? Ekspluatatsiya oson/faolmi (EPSS, KEV)? Boshqa himoyalar? Tahdid modelida muhimligi?
SLA namunasi? :: Kritik — 7 kun (faol ekspluatatsiyada darhol), yuqori — 30, o'rta — 90, past — rejalashtirilgan.
Xavfni qabul qilish elementlari? :: Topilma, nega tuzatilmaydi, kompensatsiya choralari, qaror qabul qilgan biznes egasi, amal qilish muddati.
Yaxshi topilma vazifasi? :: Daraja, joy, muammo, ta'sir, qanday tekshirish, tuzatish kodi, test, ma'lumotnoma, SLA.
Dasturchilar bilan ishlash usullari? :: Paved road, tez fikr (IDE/PR), o'qitish, security champions, yaxshi amaliyotni tan olish.
Security champion? :: Jamoadagi xavfsizlikka qiziqqan dasturchi — maslahatchi, threat modeling ishtirokchisi, AppSec bilan bog'lovchi.
Zaiflik boshqaruvi metrikalari? :: MTTR, SLA'ga rioya, ochiq topilmalar tendensiyasi, takrorlanish, qayerda topilgan, false positive ulushi.
OWASP SAMM funksiyalari? :: Governance, Design, Implementation, Verification, Operations — har biri yetuklik darajalari bilan.
security.txt? :: /.well-known/security.txt — Contact va Expires majburiy (RFC 9116); VDP bilan birga.
Zaiflik boshqaruvining maqsadi? :: Topilmalar ro'yxati emas, xavfning kamayishi.
:::
