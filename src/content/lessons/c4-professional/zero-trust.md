SOC tarmog'idagi insidentni yana bir bor eslang, lekin boshqa burchakdan. d.karimova uydan ishlaydi. Uning noutbuki — WS-BUX-014 — kompaniya VPN'iga ulangan. Word fayli ochildi, PowerShell ishga tushdi, hujumchi noutbukni boshqara boshladi. Endi u **VPN ichida**. Kompaniya tarmog'i uchun u — "ichkaridagi" qurilma: fayl serveri, ichki web ilovalar, buxgalteriya bazasi uni xodim sifatida qabul qiladi. Chunki eski model shunday deydi: ichkarida bo'lsang — ishonchlisan.

Bu model — "qal'a va xandaq" (castle and moat): kuchli tashqi devor, ichida erkinlik. U ofisda o'tirgan xodimlar va ofisdagi serverlar dunyosi uchun yaratilgan edi. Bugun xodimlar uydan va telefondan ishlaydi, ilovalar SaaS'da, serverlar bulutda. Devor qayerda? Va devor ichidagi har bir buzilgan noutbuk — hujumchi uchun tayyor eshik.

**Zero trust** — boshqa javob: tarmoqdagi joylashuv hech qanday ishonch bermaydi. Har bir so'rov — kim, qaysi qurilmadan, qanday sharoitda — **har safar** tekshiriladi. c1 bosqichidagi VPN darsi oxirida bu g'oyani va'da qilgan edik. Bu dars — uning tamoyillari, arxitekturasi va amaliyoti.

## Eski model va zero trust

| | Qal'a va xandaq | Zero trust |
|---|---|---|
| Ishonch asosi | Tarmoqdagi joylashuv (ichkarida/tashqarida) | Identifikatsiya, qurilma holati, kontekst |
| Tekshiruv | Bir marta — devordan o'tishda (VPN'ga ulanishda) | Har bir so'rovda, doimiy |
| Ichkarida | Keng kirish | Faqat kerakli resursga, kerakli vaqtga |
| Buzilgan qurilma | Hamma narsaga yo'l | Faqat o'z ruxsatlari doirasida; holati yomonlashsa — kirish to'xtaydi |
| Asosiy vosita | Firewall, VPN | Identifikatsiya, siyosat dvigateli, segmentatsiya, monitoring |

Asosiy shior: **"Never trust, always verify"** — hech qachon sukut bo'yicha ishonma, doimo tekshir. Va unga juft bo'lgan taxmin: **"Assume breach"** — tizim allaqachon buzilgan deb hisobla va zararni cheklashni loyihala.

[[zero-trust|Zero trust]] — mahsulot emas, **yondashuv**. Uni bitta qurilma sotib olib "yoqib qo'yib" bo'lmaydi. Bu ko'plab nazoratlarning bitta mantiq atrofida yig'ilishi — va siz ularning ko'pchiligini oldingi bosqichlarda allaqachon o'rgangansiz.

## NIST SP 800-207: yetti tamoyil

AQSh standartlar instituti NIST zero trust arxitekturasini SP 800-207 hujjatida tavsiflaydi. Uning tamoyillari (qisqartirib):

| # | Tamoyil | Amalda | Biz qayerda ko'rdik |
|---|---|---|---|
| 1 | Barcha ma'lumot manbalari va xizmatlar — **resurs** | Printer ham, SaaS ham, Lambda ham himoya qilinadigan resurs | c1 inventar, teglar |
| 2 | Barcha aloqa tarmoqdagi joyidan qat'i nazar **himoyalangan** | Ichki tarmoqda ham TLS; "ichkarida — shifrlashsiz" yo'q | c2 `aws:SecureTransport`, ichki TLS |
| 3 | Kirish **har bir resursga alohida, har bir sessiya uchun** beriladi | Bitta kirish butun tarmoqni ochmaydi | c2 IAM, vaqtinchalik kalitlar |
| 4 | Kirish **dinamik siyosat** bilan belgilanadi — identifikatsiya, qurilma holati, xatti-harakat, muhit | "Kompaniya noutbuki, yangilangan, EDR ishlayapti, odatdagi joydan" | c1 Azure darsi — Conditional Access |
| 5 | Barcha qurilmalarning **xavfsizlik holati** doimiy kuzatiladi | Yamalmagan yoki EDR'siz qurilma — cheklangan kirish | b2 EDR, a4 zaiflik boshqaruvi |
| 6 | Autentifikatsiya va avtorizatsiya **dinamik** va kirishdan **oldin** qat'iy bajariladi | Sessiya davomida ham qayta baholash | MFA, sessiya bekor qilish (c4 IR) |
| 7 | Holat haqida iloji boricha ko'p ma'lumot yig'iladi va himoyani yaxshilash uchun ishlatiladi | Jurnallar, telemetriya, tahlil | b-tarmoq butunlay, c2 monitoring |

:::key
Jadvalning oxirgi ustuniga qarang: zero trust — yangi texnologiya emas, kurs davomida o'rgangan narsalaringizni **bitta mantiqqa** bog'lash. Intervyuda "zero trust nima?" deb so'rashsa, ta'rifdan keyin aynan shunday misollar keltiring: "IAM'da aniq ARN'li siyosatlar, vaqtinchalik kalitlar, Kubernetes'da default-deny network policy, qurilma holatiga bog'liq shartli kirish."
:::

## Arxitektura: kim qaror qiladi, kim bajaradi

NIST modelida uchta mantiqiy komponent bor:

```
                       ┌───────────────────────────────┐
  Signallar:           │  Policy Engine (PE)           │
  identifikatsiya ───▶ │  "ruxsat berilsinmi?"         │
  MFA turi        ───▶ │  siyosat + signallar → qaror  │
  qurilma holati  ───▶ └──────────────┬────────────────┘
  joylashuv, vaqt ───▶                │
  xavf bahosi     ───▶ ┌──────────────┴────────────────┐
  (SIEM, EDR, CTI)     │  Policy Administrator (PA)    │
                       │  qarorni bajarishga buyruq    │
                       └──────────────┬────────────────┘
                                      │
 Foydalanuvchi + ──▶ ┌────────────────┴───────────┐ ──▶  Resurs
 qurilma             │ Policy Enforcement Point   │      (ilova, ma'lumot,
                     │ (PEP): proksi, shlyuz      │       server)
                     └────────────────────────────┘
```

| Komponent | Misollar |
|---|---|
| Policy Engine | Entra ID Conditional Access dvigateli, identity-aware proksining qaror qismi |
| Policy Administrator | Sessiya tokenini beradi yoki bekor qiladi |
| PEP | Identity-aware proksi, ZTNA shlyuzi, API gateway, Kubernetes admission, IAM o'zi |
| Signallar manbasi | IdP (SSO), MDM, EDR, SIEM, threat intelligence |

Muhim g'oya: foydalanuvchi resursga **hech qachon to'g'ridan-to'g'ri** ulanmaydi — har doim PEP orqali, va PEP har bir so'rovni siyosatga solishtiradi.

## Amaliy qismlar

### 1. Kuchli identifikatsiya

Zero trust'ning poydevori — identifikatsiya. Agar hujumchi foydalanuvchi nomidan kira olsa, qolgan hamma narsa unga ishonadi.

- **Yagona kirish (SSO)** — barcha ilovalar bitta identifikatsiya provayderi orqali; xodim ketganda bitta hisob o'chiriladi.
- **MFA — lekin hamma MFA bir xil emas:**

| MFA turi | Fishingga chidamliligi | Zaif tomoni |
|---|---|---|
| SMS kod | Past | SIM almashtirish, kodni fishing sahifasiga kiritish |
| Ilova kodi (TOTP) | Past–o'rta | Kodni fishing sahifasiga kiritish mumkin |
| Push tasdiqlash | O'rta | "MFA charchatish" — ketma-ket so'rovlar bilan bezovta qilish (b1 bosqichida ko'rgansiz) |
| Raqamli moslashtirish bilan push | O'rta–yuqori | Hali ham real vaqt fishing proksilari |
| **FIDO2 / passkey** (apparat kalit, qurilmadagi kalit) | **Yuqori** | Kalit domenga bog'langan — soxta saytda ishlamaydi |

FIDO2/passkey'larning kuchi — s5 bosqichidagi ochiq kalitli kriptografiya: kalit faqat haqiqiy domen uchun imzo qo'yadi, soxta `mybank-login.example.com` uchun esa umuman ishlamaydi. Adminlar va bulut konsoli uchun — birinchi navbatda.

### 2. Qurilma ishonchi

"Kim" — yetarli emas; "qaysi qurilmadan" ham muhim. WS-BUX-014 holatida identifikatsiya to'g'ri edi — d.karimova haqiqatan o'zi — lekin qurilma buzilgan edi.

- **MDM** (qurilmalarni boshqarish) — kompaniya qurilmasimi, shifrlanganmi, yangilanganmi?
- **EDR holati** — EDR ishlayaptimi, yuqori xavfli ogohlantirish bormi?
- Siyosat: boshqarilmaydigan qurilmadan — faqat brauzer orqali, yuklab olishsiz; yuqori xavfli qurilmadan — kirish yo'q.

Agar WS-BUX-014 dagi EDR shubhali PowerShell'ni aniqlasa (b2), zero trust tizimida bu signal **darhol** qurilmaning kirishini to'xtatishi mumkin — hujumchi buxgalteriya bazasiga yetib ulgurmasdan.

### 3. Shartli kirish

Signallarni qarorga aylantirish — c1 bosqichidagi Azure darsida ko'rgan **Conditional Access** va shunga o'xshash tizimlar:

```
 AGAR  ilova = buxgalteriya
   VA  qurilma = boshqariladigan VA EDR holati = toza
   VA  MFA = fishingga chidamli
 UNDA  ruxsat (sessiya 8 soat)

 AGAR  ilova = buxgalteriya
   VA  (qurilma boshqarilmaydi YOKI EDR ogohlantirishi bor)
 UNDA  blok

 AGAR  foydalanuvchi xavfi = yuqori (sizib chiqqan parol, imkonsiz sayohat)
 UNDA  parolni almashtirish talab qilinsin + barcha sessiyalar bekor qilinsin
```

### 4. VPN o'rniga ZTNA

**ZTNA** (Zero Trust Network Access) yoki **identity-aware proksi** — VPN'ning zero trust muqobili:

| VPN | ZTNA |
|---|---|
| Ulanish — butun tarmoqqa (yoki katta qismiga) | Ulanish — faqat bitta ilovaga |
| Tekshiruv — ulanish paytida bir marta | Har bir so'rovda siyosat |
| Ichki ilovalar tarmoqda ko'rinadi | Ilovalar internetga ham, tarmoqqa ham ko'rinmaydi — faqat proksi orqali |
| Buzilgan noutbuk — tarmoqqa tunnel | Buzilgan noutbuk — faqat ruxsat etilgan ilovalarga, holati yomonlashsa — hech qayerga |

Misollar: Google'ning BeyondCorp yondashuvi va Identity-Aware Proxy, AWS Verified Access, Cloudflare Access va boshqa ko'plab tijorat yechimlar. c1 bosqichidagi "SSH faqat VPN orqali" o'rnida — "SSH faqat identity-aware proksi yoki Session Manager orqali, har bir seans identifikatsiya bilan va jurnalga yozilgan".

### 5. Mikrosegmentatsiya va eng kam imtiyoz

Tarmoq darajasida ham "hamma hammaga" yo'q:

- c1 — segmentatsiya rejasi va oqimlar jadvali;
- c1 va c2 — security group zanjiri;
- c3 — Kubernetes network policy `default-deny`.

Imtiyoz darajasida — c2 IAM darsidagi eng kam imtiyoz, va bunga qo'shimcha **just-in-time** (JIT) kirish: admin huquqi doimiy emas, so'rov bilan, vaqtincha, jurnal bilan (c1 Azure darsidagi PIM).

### 6. Xizmatlar orasida ham

Zero trust faqat odamlar uchun emas. Qaydnoma ilovasi bazaga ulanganda ham savol: "Bu haqiqatan Qaydnoma'mi?"

- **Doimiy kalitlar o'rniga workload identifikatsiyasi** — IAM role, EKS Pod Identity, OIDC (c2, c3, a4).
- **mTLS** (o'zaro TLS) — xizmatlar bir-birini sertifikat bilan taniydi; service mesh'lar buni avtomatlashtiradi.
- **Har bir chaqiruvda avtorizatsiya** — a2 bosqichidagi `load_note(note_id, Action)`: hatto ichki API ham "bu foydalanuvchi bu qaydni ko'ra oladimi?" deb so'raydi, "so'rov ichkaridan keldi, demak to'g'ri" demaydi.

## Yetuklik modeli va yo'l xaritasi

Zero trust bir kunda joriy qilinmaydi. AQSh CISA agentligining **Zero Trust Maturity Model** hujjati beshta ustunni va to'rt yetuklik bosqichini belgilaydi:

| Ustun | Savol |
|---|---|
| Identity | Kim? Qanchalik ishonchli tasdiqlangan? |
| Devices | Qaysi qurilma? Holati qanday? |
| Networks | Tarmoq qanday segmentlangan va shifrlangan? |
| Applications & Workloads | Ilovalarga kirish qanday nazorat qilinadi? |
| Data | Ma'lumot tasniflanganmi, qanday himoyalangan? |

Bosqichlar: **Traditional → Initial → Advanced → Optimal**. Barcha ustunlarni kesib o'tadigan qobiliyatlar: ko'rinuvchanlik va tahlil, avtomatlashtirish, boshqaruv.

Amaliy tartib (ko'p tashkilotlar shunday boradi):

1. **Inventar** — identifikatsiyalar, qurilmalar, ilovalar, ma'lumot. Bilmagan narsangizni himoyalay olmaysiz.
2. **Identifikatsiya** — SSO, hamma uchun MFA, adminlar uchun fishingga chidamli MFA. Eng katta foyda, eng birinchi qadam.
3. **Qurilmalar** — MDM va EDR, holatni kirish siyosatiga ulash.
4. **Ilovalar** — eng muhim ichki ilovalarni birma-bir VPN'dan ZTNA'ga ko'chirish.
5. **Segmentatsiya va eng kam imtiyoz** — tarmoq va IAM.
6. **Monitoring va avtomatik javob** — signallar siyosatga qaytadi (yuqori xavf → kirish to'xtaydi).

## Noto'g'ri tushunchalar

| Afsona | Haqiqat |
|---|---|
| "Zero trust — mahsulot, sotib olamiz" | Yondashuv; mahsulotlar uning qismlarini amalga oshiradi |
| "Zero trust — hech kimga hech narsaga ruxsat bermaslik" | Kerakli kirish — tez va qulay; ortiqcha kirish — yo'q |
| "VPN'ni ertaga o'chiramiz" | Bosqichma-bosqich; ba'zi eski tizimlar uzoq vaqt VPN orqali qoladi |
| "Bizda MFA bor — zero trust tayyor" | MFA — birinchi qadam; qurilma, siyosat, segmentatsiya, monitoring ham kerak |
| "Ichki tarmoqda shifrlash shart emas" | 2-tamoyil: aloqa joylashuvdan qat'i nazar himoyalanadi |

## Zero trust nimani qilmaydi

- Ilovadagi zaifliklarni yopmaydi. Ruxsatli foydalanuvchi ruxsatli qurilmadan IDOR'ni ishlatsa, zero trust uni to'xtatmaydi — buni ilova avtorizatsiyasi qiladi (a2).
- Ruxsatli foydalanuvchining suiiste'molini (ichki tahdid) to'liq to'xtatmaydi — lekin eng kam imtiyoz va monitoring zararni cheklaydi.
- Qurilma holatini baholash mukammal emas: EDR aniqlamagan hujum "toza" qurilmadan davom etadi.
- Murakkablik va noqulaylik xavfi: siyosatlar haddan tashqari qattiq bo'lsa, xodimlar aylanib o'tish yo'llarini topadi.

:::try
1. Dars boshidagi WS-BUX-014 insidentini zero trust tizimida qayta tasavvur qiling. Qaysi nuqtalarda va qaysi signal bilan hujumchi to'xtatilishi mumkin edi? Kamida uchta nuqta yozing.
2. O'zingiz ishlatadigan uchta xizmatda (pochta, GitHub, bulut hisobi) qaysi MFA turi yoqilgan? Ulardan qaysi birini passkey yoki apparat kalitga o'tkazish mumkin?
3. Qaydnoma jamoasi uchun (10 dasturchi, AWS, GitHub, Microsoft 365) zero trust yo'l xaritasini 6 qadamda yozing.
4. NIST'ning yetti tamoyilidan birini tanlang va kursning qaysi darslarida u amalga oshirilganini sanab chiqing.
5. Savol: rahbar aytadi: "ZTNA mahsulotini sotib oldik, endi zero trust'mizmi?" Javobingiz?

**Javoblar:**
1. Masalan: (a) EDR shubhali PowerShell'ni aniqlaydi → qurilma holati "xavfli" → buxgalteriya ilovasiga kirish darhol bloklanadi; (b) buxgalteriya bazasi VPN orqali emas, ZTNA orqali — hujumchi tarmoqni skanerlay olmaydi, faqat ruxsat etilgan ilovani ko'radi; (c) C2 serveriga chiqish — egress filtrlash va DNS himoyasi (c2) uni to'sadi; (d) mikrosegmentatsiya — noutbukdan fayl serveriga SMB oqimi yo'q; (e) g'ayrioddiy xatti-harakat (tunda katta hajmdagi yuklab olish) → foydalanuvchi xavfi oshadi → sessiyalar bekor qilinadi.
2. Ko'pchilik yirik xizmatlar (Google, Microsoft, GitHub, AWS) passkey yoki FIDO2 kalitlarini qo'llab-quvvatlaydi. Bulut hisobi va pochta — birinchi navbatda: ular boshqa hamma narsani tiklash kalitidir.
3. Misol: (1) inventar — hisoblar, noutbuklar, AWS hisoblari, SaaS ro'yxati; (2) Entra ID orqali SSO, GitHub va AWS Identity Center'ni ulash, hamma uchun MFA, adminlarga apparat kalitlar; (3) noutbuklar MDM va EDR bilan, Conditional Access'da qurilma holati sharti; (4) ichki admin panellar va SSH — identity-aware proksi yoki Session Manager orqali, VPN'siz; (5) AWS'da doimiy kalitlar yo'q (OIDC, rollar), JIT admin kirish; (6) Entra, CloudTrail, EDR jurnallari SIEM'da, yuqori xavf → avtomatik sessiya bekor qilish.
4. Masalan, 3-tamoyil (har bir resursga alohida, har bir sessiya uchun): c2 IAM — aniq ARN'li siyosatlar; c2 — vaqtinchalik STS kalitlari; c3 — Kubernetes RBAC `resourceNames` bilan; a2 — `load_note()` har bir qayd uchun alohida tekshiruv.
5. Yo'q — ZTNA bitta qism (ilovalarga kirish). Identifikatsiya (SSO, kuchli MFA), qurilma holati, siyosatlar, segmentatsiya, eng kam imtiyoz va monitoring ham kerak. Mahsulot vosita, zero trust esa yondashuv.
:::

## Xulosa

- Qal'a va xandaq modelida ichkaridagi har bir buzilgan qurilma — butun tarmoqqa eshik. Zero trust: joylashuv ishonch bermaydi, har bir so'rov tekshiriladi; "assume breach".
- NIST SP 800-207: resurslar, joylashuvdan qat'i nazar himoyalangan aloqa, har bir sessiya uchun alohida kirish, dinamik siyosat, qurilma holati monitoringi, kirishdan oldin qat'iy tekshiruv, doimiy ma'lumot yig'ish.
- Arxitektura: Policy Engine qaror qiladi, Policy Administrator bajartiradi, PEP har bir so'rovni nazorat qiladi.
- Amaliyot: SSO va fishingga chidamli MFA (FIDO2, passkey), qurilma ishonchi (MDM, EDR), shartli kirish, VPN o'rniga ZTNA, mikrosegmentatsiya, JIT, xizmatlar uchun workload identifikatsiyasi va mTLS.
- CISA modeli: Identity, Devices, Networks, Applications & Workloads, Data; bosqichma-bosqich, identifikatsiyadan boshlab.
- Zero trust — mahsulot emas, va ilova zaifliklari hamda ichki suiiste'molni to'liq to'xtatmaydi.

:::quiz
? Zero trust'ning asosiy g'oyasi qaysi?
- Ichki tarmoqdagi barcha qurilmalarga to'liq ishonish
+ Tarmoqdagi joylashuv ishonch bermaydi; har bir so'rov identifikatsiya, qurilma va kontekst bo'yicha har safar tekshiriladi
- Hamma narsani bloklash
- Faqat yaxshi firewall o'rnatish
! "Never trust, always verify" va "assume breach".

? Qal'a va xandaq modelida buzilgan, VPN'ga ulangan noutbuk nima uchun xavfli?
+ VPN ichidagi qurilma ichkaridagi deb hisoblanib, keng resurslarga kirish oladi
- VPN noutbukni sekinlashtiradi
- VPN trafikni shifrlamaydi
- Noutbuk internetga chiqa olmaydi
! Eski model ishonchni tarmoqdagi joylashuvga bog'laydi.

? NIST zero trust modelida Policy Enforcement Point (PEP) nima qiladi?
- Siyosatlarni yozadi
+ Foydalanuvchi va resurs o'rtasida turib, har bir so'rovni siyosat qaroriga ko'ra o'tkazadi yoki to'xtatadi
- Faqat jurnallarni saqlaydi
- Qurilmalarni yangilaydi
! Foydalanuvchi resursga hech qachon to'g'ridan-to'g'ri ulanmaydi — PEP orqali.

? Qaysi MFA turi fishingga eng chidamli?
- SMS kod
- Ilova kodi (TOTP)
- Oddiy push tasdiqlash
+ FIDO2 / passkey
! Kalit domenga bog'langan: soxta saytda imzo qo'ymaydi.

? WS-BUX-014'da identifikatsiya to'g'ri edi (haqiqatan d.karimova), lekin qurilma buzilgan edi. Zero trust'ning qaysi qismi bunga javob beradi?
- Faqat parol uzunligi
+ Qurilma ishonchi — EDR va MDM holati kirish siyosatiga signal sifatida ulanadi
- Faqat VPN
- Faqat firewall
! Qurilma holati yomonlashsa, kirish darhol cheklanadi.

? ZTNA va VPN'ning asosiy farqi nima?
+ VPN tarmoqqa (keng) kirish beradi; ZTNA faqat aniq ilovaga, har bir so'rovda siyosat bilan
- ZTNA trafikni shifrlamaydi
- VPN zamonaviyroq
- Farqi yo'q
! ZTNA'da ichki ilovalar tarmoqda ham ko'rinmaydi — faqat proksi orqali.

? Just-in-time (JIT) kirish nimani anglatadi?
- Admin huquqi hammaga doimiy beriladi
+ Yuqori huquq faqat kerak bo'lganda, so'rov bilan, vaqtincha va jurnal bilan beriladi
- Kirish faqat tunda
- Parolsiz kirish
! Doimiy admin huquqi yo'q — hujumchi o'g'irlaydigan narsa ham kam.

? Xizmatlar orasidagi zero trust'ga qaysi misol to'g'ri keladi?
- Ichki tarmoqdagi barcha API'lar autentifikatsiyasiz
+ Workload identifikatsiyasi (IAM role, OIDC), mTLS va har bir chaqiruvda avtorizatsiya
- Barcha xizmatlarga bitta umumiy parol
- Faqat tashqi API'lar uchun TLS
! "So'rov ichkaridan keldi" — avtorizatsiya sababi emas.

? CISA Zero Trust Maturity Model'ga ko'ra odatda qayerdan boshlash eng katta foyda beradi?
- Ma'lumotni tasniflashdan
+ Identifikatsiyadan — SSO va hamma uchun MFA, adminlarga fishingga chidamli MFA
- VPN'ni darhol o'chirishdan
- Barcha ilovalarni qayta yozishdan
! Identifikatsiya — poydevor; hujumchi foydalanuvchi nomidan kira olsa, qolgan hammasi unga ishonadi.

? Rahbar: "ZTNA mahsulotini sotib oldik, demak zero trust'mizmi?" To'g'ri javob?
- Ha, mahsulot hammasini hal qiladi
+ Yo'q — zero trust yondashuv; identifikatsiya, qurilma holati, siyosatlar, segmentatsiya, eng kam imtiyoz va monitoring ham kerak
- Faqat MFA bo'lsa ha
- Zero trust umuman mavjud emas
! Mahsulot — vosita; yondashuv — ko'plab nazoratlarning bitta mantiqqa bog'lanishi.
:::

:::cards
Zero trust :: Joylashuv ishonch bermaydi; har bir so'rov har safar tekshiriladi
Never trust, always verify :: Hech qachon sukut bo'yicha ishonma, doimo tekshir
Assume breach :: Tizim allaqachon buzilgan deb hisoblab, zararni cheklashni loyihalash
NIST SP 800-207 :: Zero trust arxitekturasi bo'yicha NIST hujjati — yetti tamoyil
Policy Engine :: Signallar va siyosat asosida kirish qarorini qabul qiladi
PEP :: Policy Enforcement Point — har bir so'rovni qarorga ko'ra o'tkazadi yoki to'xtatadi
FIDO2 / passkey :: Domenga bog'langan, fishingga chidamli MFA
Qurilma ishonchi :: MDM va EDR holati kirish siyosatiga signal sifatida
ZTNA :: VPN o'rniga — faqat aniq ilovaga, har bir so'rovda siyosat bilan kirish
Mikrosegmentatsiya :: Har bir ish yuki atrofida tor tarmoq chegaralari
JIT kirish :: Yuqori huquq faqat kerak bo'lganda va vaqtincha
CISA Maturity Model :: Identity, Devices, Networks, Applications, Data ustunlari va 4 bosqich
:::
