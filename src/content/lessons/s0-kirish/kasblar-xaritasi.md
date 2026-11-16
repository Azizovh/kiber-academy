"Kiberxavfsizlik mutaxassisi" degan kasb aslida yo'q — xuddi "shifokor" degan bitta kasb bo'lmagani kabi. Jarroh, tish shifokori va terapevt bir sohada ishlaydi, lekin kundalik ishi butunlay boshqacha. Bu yerda ham shunday.

Bu darsning maqsadi — sizga butun manzarani ko'rsatish. Hozir tanlash shart emas: avval poydevorni o'rganasiz, tanlov o'sha paytda ancha oson bo'ladi.

## Ikki tomon: hujum va himoya

Sohani tushunishning eng oson yo'li — uni ikki jamoaga bo'lish.

**[[red-team|Red Team]] — hujumchilar.** Ular tashkilot ruxsati bilan uning tizimlariga haqiqiy hujumchi kabi hujum qiladi. Maqsad — zaifliklarni jinoyatchilardan oldin topish.

**[[blue-team|Blue Team]] — himoyachilar.** Ular tizimlarni kuzatadi, hujumlarni aniqlaydi, to'xtatadi va oqibatlarini bartaraf etadi.

Ba'zan uchinchi rang ham tilga olinadi: **Purple Team** — bu alohida jamoa emas, balki qizil va ko'k jamoalarning birga ishlash usuli. Hujumchi usulni ko'rsatadi, himoyachi uni aniqlashni o'rganadi.

:::info
Ish o'rinlarining ko'pchiligi — himoya tomonida. Har bir tashkilotga doimiy himoya kerak, hujum sinovi esa yiliga bir-ikki marta buyurtma qilinadi. Shuning uchun sohaga kirishning eng keng eshigi — SOC analitigi lavozimi.
:::

## Asosiy kasblar

| Kasb | Nima qiladi | Jamoa |
|---|---|---|
| **Penetration Tester** | Ruxsat bilan tizimlarni buzib ko'radi va hisobot yozadi | Red |
| **SOC Analyst** | Ogohlantirishlarni kuzatadi, hujumni aniqlaydi | Blue |
| **Incident Responder** | Hujum sodir bo'lganda uni to'xtatadi va tergov qiladi | Blue |
| **Threat Hunter** | Ogohlantirishni kutmasdan, yashiringan hujumchini izlaydi | Blue |
| **Digital Forensics Analyst** | Disk va xotiradan dalil topadi | Blue |
| **Malware Analyst** | Zararli dasturni "ichini ochib" o'rganadi | Blue |
| **AppSec Engineer** | Dasturlar xavfsiz yozilishini ta'minlaydi | Qurish |
| **Cloud Security Engineer** | Bulut infratuzilmasini himoyalaydi | Qurish |
| **Security Engineer** | Himoya tizimlarini quradi va sozlaydi | Qurish |
| **GRC mutaxassisi** | Siyosat, xavfni baholash, standartlarga muvofiqlik | Boshqaruv |

Oxirgi ustunga qarang: hamma ham "buzish" yoki "ushlash" bilan shug'ullanmaydi. Katta guruh — **quruvchilar**: ular tizimni boshidanoq xavfsiz qilib yaratadi. Yana bir guruh — **boshqaruv** (GRC: Governance, Risk, Compliance): bu texnik bo'lmagan, lekin juda zarur ish.

## Bu dasturdagi to'rt yo'nalish

Poydevordan keyin siz quyidagi to'rttadan birini tanlaysiz. Har biri sizni aniq lavozimga olib boradi.

### Pentest / Red Team

**Kundalik ish:** mijoz tizimini o'rganish, zaiflik qidirish, uni isbotlash va — eng ko'p vaqt oladigani — hisobot yozish.

**Kimga mos:** jumboq yechishni yaxshi ko'radiganlarga. "Bu qanday ishlaydi va uni qanday aldash mumkin?" degan savol sizni tinch qo'ymasa.

**Halol ogohlantirish:** junior pentester o'rinlari kam va raqobat kuchli. Ko'pchilik boshqa lavozimdan (SOC, tizim ma'muri, dasturchi) o'tadi.

### SOC / Blue Team

**Kundalik ish:** monitoring tizimidagi ogohlantirishlarni tekshirish, [[log|loglarni]] o'qish, "bu hujummi yoki yo'qmi?" degan savolga javob topish.

**Kimga mos:** diqqatli, sabrli, detektivlik ishini yoqtiradiganlarga.

**Halol ogohlantirish:** SOC ko'pincha smenali ishlaydi, tungi navbatchilik bo'lishi mumkin. Lekin sohaga kirish uchun eng real yo'l shu.

### AppSec

**Kundalik ish:** kodni ko'rib chiqish, dasturchilar bilan ishlash, xavfsizlik tekshiruvlarini avtomatlashtirish.

**Kimga mos:** dasturlashni yoqtiradiganlarga. Agar siz allaqachon dasturchi bo'lsangiz — bu eng qisqa yo'l.

**Halol ogohlantirish:** dasturlashni chinakam bilish kerak. Kod yoza olmaydigan AppSec muhandisi dasturchilar oldida obro' qozona olmaydi.

### Cloud va infratuzilma

**Kundalik ish:** serverlar, tarmoqlar va bulut xizmatlarini qurish, sozlash va himoyalash; hammasini kod bilan avtomatlashtirish.

**Kimga mos:** tizim qurish, tartibga solish va avtomatlashtirishni yoqtiradiganlarga.

**Halol ogohlantirish:** texnologiyalar ro'yxati uzun (Linux, tarmoq, AWS, Docker, Kubernetes, Terraform) va tez o'zgaradi.

## Karyera qanday o'sadi

Odatiy yo'l taxminan shunday ko'rinadi:

```
Junior (0–2 yil)  →  Middle (2–5 yil)  →  Senior (5+ yil)  →  Lead / Arxitektor / Menejer
```

Muhim jihat: bu yo'llar **qat'iy devor bilan ajratilmagan**. SOC'da ikki yil ishlab, pentestga o'tgan odam hujumni himoyachi ko'zi bilan ham ko'ra oladi — bu katta ustunlik. Shuning uchun birinchi tanlovingiz umrbod hukm emas.

:::tip
Tanlashda "qaysi biri eng zo'r" deb emas, "men qaysi ishni har kuni 8 soat qilishga tayyorman" deb o'ylang. Hisobot yozishni yomon ko'rsangiz — pentest sizga yoqmaydi, chunki u ishning yarmi.
:::

## Hamma uchun umumiy narsa

Qaysi yo'lni tanlamang, quyidagilar kerak bo'ladi — va aynan shular poydevor bosqichlarini tashkil etadi:

1. **Kompyuter qanday ishlashi** — himoya qilayotgan narsangizni tushunish uchun.
2. **Tarmoq** — hujumlarning deyarli hammasi tarmoq orqali o'tadi.
3. **Linux** — serverlar va xavfsizlik vositalarining asosiy muhiti.
4. **Dasturlash** — avtomatlashtirish va kodni o'qiy olish uchun.
5. **Xavfsizlik tushunchalari** — umumiy til.

Poydevorni chetlab o'tib, darhol "xakerlik"ka sakrash vasvasasi kuchli. Bunga berilmang: poydevori yo'q mutaxassis tayyor vositaning tugmasini bosa oladi, lekin u nima uchun ishlamaganini tushunmaydi.

## Xulosa

- Soha **hujum** (Red), **himoya** (Blue), **qurish** va **boshqaruv** yo'nalishlariga bo'linadi.
- Ish o'rinlarining ko'pi — himoya tomonida; eng keng kirish eshigi — SOC.
- Bu dasturda to'rt yo'l bor: Pentest, SOC, AppSec, Cloud.
- Yo'llar orasida o'tish mumkin va bu odatiy hol.
- Poydevor hamma uchun bir xil va uni o'tkazib yuborib bo'lmaydi.

:::quiz
? Red Team'ning asosiy vazifasi nima?
- Tarmoqni kecha-kunduz kuzatish
+ Ruxsat bilan hujum qilib, zaifliklarni topish
- Xavfsizlik siyosatlarini yozish
- Zararlangan kompyuterlarni tiklash
! Red Team — hujumchi rolini o'ynaydi: tashkilot ruxsati bilan uning himoyasini sinaydi.

? Sohaga kirish uchun qaysi lavozimda ish o'rinlari eng ko'p?
- Penetration Tester
- Malware Analyst
+ SOC Analyst
- Security Architect
! Har bir tashkilotga doimiy monitoring kerak, shuning uchun SOC analitigi — eng keng tarqalgan boshlang'ich lavozim.

? Purple Team nima?
- Qizil va ko'k jamoadan kuchliroq uchinchi jamoa
+ Hujumchi va himoyachilarning bilim almashib, birga ishlash usuli
- Faqat boshqaruv bilan shug'ullanuvchi jamoa
- Yangi boshlovchilar jamoasi
! Purple Team alohida jamoa emas — bu hamkorlik usuli: hujumchi texnikani ko'rsatadi, himoyachi uni aniqlashni o'rganadi.

? Dasturchi sifatida tajribasi bor odam uchun qaysi yo'nalish eng qisqa yo'l bo'ladi?
- SOC
+ AppSec
- Digital Forensics
- GRC
! AppSec dasturlash bilimiga tayanadi: kod ko'rib chiqish, xavfsiz arxitektura, dasturchilar bilan ishlash.

? GRC mutaxassisi asosan nima bilan shug'ullanadi?
- Zararli dasturlarni tahlil qiladi
- Tarmoqni skanerlaydi
+ Siyosat, xavfni baholash va standartlarga muvofiqlik bilan
- Bulut serverlarini sozlaydi
! GRC — Governance, Risk, Compliance: boshqaruv, xavf va muvofiqlik. Bu kam texnik, lekin har bir yirik tashkilotga zarur yo'nalish.

? Nega poydevor bosqichlarini o'tkazib yuborish tavsiya etilmaydi?
- Chunki ular eng oson
- Chunki sertifikat uchun kerak
+ Chunki ularsiz vositalar qanday va nega ishlashini tushunib bo'lmaydi
- Chunki bu qonun talabi
! Poydevorsiz mutaxassis tayyor vositadan foydalana oladi, lekin kutilmagan vaziyatda nima qilishni bilmaydi.
:::

:::cards
Red Team va Blue Team farqi? :: Red — ruxsat bilan hujum qilib zaiflik topadi; Blue — kuzatadi, aniqlaydi va himoya qiladi.
Purple Team nima? :: Hujumchi va himoyachilarning birga ishlab, bilim almashish usuli (alohida jamoa emas).
SOC Analyst nima qiladi? :: Monitoring tizimidagi ogohlantirishlarni tekshiradi va hujumni aniqlaydi.
Incident Responder nima qiladi? :: Hujum sodir bo'lganda uni to'xtatadi, oqibatini bartaraf etadi va tergov qiladi.
GRC qanday so'zlardan tuzilgan? :: Governance (boshqaruv), Risk (xavf), Compliance (muvofiqlik).
AppSec muhandisining asosiy ishi? :: Dasturlar boshidanoq xavfsiz yozilishini ta'minlash: kod tahlili, arxitektura, avtomatik tekshiruvlar.
Sohaga kirishning eng keng eshigi qaysi lavozim? :: SOC Analyst (L1).
:::
