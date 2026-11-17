PT-2026-07 ning ichki tarmoq qismi. Mijoz bilan kelishilgan holda, test noutbukidagi tanish audit skriptini ishga tushirasiz. Bir necha soniyadan keyin terminal yopiladi, fayl yo'qoladi. Yarim soatdan keyin Qaydnoma SOC'idan qo'ng'iroq: "198.51.100.50 manzilidan ulangan noutbukda zararli dastur aniqlandi va izolyatsiya qilindi. Bu sizmisiz?"

Ha, siz edingiz. Va bu — **yaxshi yangilik**. Mijozning himoyasi ishladi: [[edr|EDR]] skriptni tanidi, to'xtatdi, SOC'ga xabar berdi va SOC 30 daqiqada javob qildi. Bu hisobotingizdagi eng muhim ijobiy topilmalardan biri bo'ladi.

Pentester himoya vositalari qanday ishlashini bilishi shart — ularni "yengish" uchun emas, quyidagilar uchun:

- harakatlaringiz qanday iz qoldirishini oldindan tushunish va SOC bilan kelishib ishlash;
- "aniqlandi / aniqlanmadi / bloklandi" natijasini hisobotda to'g'ri yozish;
- mijozga aniqlash bo'shliqlarini ko'rsatish va ularni qanday yopishni tavsiya qilish.

:::warn
**Bu dars aniqlashni chetlab o'tish usullarini o'rgatmaydi va kursda bunday dars yo'q.** Himoyani chetlab o'tish haqiqiy red team loyihalarida tajribali jamoalar tomonidan, alohida shartnoma va oq hujayra nazorati ostida bajariladi (oldingi dars). Oddiy pentestda vosita bloklansa — to'g'ri harakat: to'xtash, SOC yoki mijoz bilan bog'lanish, natijani hisobotga yozish va kerak bo'lsa kelishilgan istisno (masalan, test mashinasini ruxsat ro'yxatiga qo'shish) so'rash.
:::

## Antivirus qanday ishlaydi

Klassik [[antivirus|antivirus]] bir necha qatlamda ishlaydi:

| Usul | Qanday ishlaydi | Kuchli tomoni | Zaif tomoni |
|---|---|---|---|
| **Xesh bo'yicha** | Faylning xeshi ma'lum zararli xeshlar bazasida bormi? | Tez, false positive deyarli yo'q | Bitta bayt o'zgarsa — boshqa xesh (pyramid of pain, b2) |
| **Signatura** | Fayl ichida ma'lum bayt ketma-ketliklari yoki qoidalar (YARA kabi, b3) | Butun oilani tanishi mumkin | Yangi yoki qayta yozilgan namunani o'tkazib yuboradi |
| **Evristika** | Shubhali belgilar: g'alati tuzilma, packer, xavfli funksiyalar to'plami | Noma'lum namunani ham taniydi | Ko'proq false positive |
| **Emulyatsiya / sandbox** | Faylni virtual muhitda qisqa vaqt ishga tushirib, nima qilishini ko'radi | Xatti-harakatni ko'radi | Vaqt va resurs cheklangan |
| **Bulut reputatsiyasi** | Faylni million kompyuterda ko'rganmi? Yangi, kam uchraydigan fayl — shubhali | Global ma'lumot | Internet aloqasi kerak |

Birinchi ikkitasi — [[signature-detection|signaturaga asoslangan aniqlash]]. Bu "ma'lum yomon narsalar ro'yxati" yondashuvi: u ma'lum tahdidlarga qarshi juda samarali, lekin ro'yxatda yo'q narsani ko'rmaydi.

## EDR qanday ishlaydi

EDR (Endpoint Detection and Response) faylga emas, **xatti-harakatga** qaraydi — [[behavioral-detection|xatti-harakatga asoslangan aniqlash]]. SOC tarmog'idagi WS-BUX-014 insidentini eslang: Word jarayoni PowerShell'ni ishga tushirdi. Na Word, na PowerShell zararli fayl emas — lekin ularning **bog'lanishi** shubhali.

```
 Kompyuterdagi sensor (agent)
   │  jarayonlar: kim kimni ishga tushirdi, qanday buyruq qatori bilan
   │  tarmoq: qaysi jarayon qayerga ulandi
   │  fayllar va registry: nima yaratildi, o'zgartirildi
   │  xotira: bir jarayon boshqasining xotirasiga kirdimi
   ▼
 Telemetriya ──► Markaziy platforma (bulut yoki server)
                   │  xatti-harakat qoidalari: "Office → skript interpretatori"
                   │  ATT&CK texnikalariga moslashtirish
                   │  boshqa kompyuterlar bilan korrelyatsiya
                   ▼
                 Ogohlantirish ──► SOC analitigi ──► Javob:
                                                      jarayonni to'xtatish,
                                                      kompyuterni izolyatsiya qilish,
                                                      faylni karantinga olish
```

| | Antivirus | EDR |
|---|---|---|
| Asosiy savol | "Bu fayl zararlimi?" | "Bu kompyuterda nima bo'lyapti?" |
| Ma'lumot | Fayllar | Doimiy [[telemetry|telemetriya]]: jarayonlar, tarmoq, fayllar, registry |
| Vaqt | Fayl ochilgan yoki yozilgan paytda | Uzluksiz, tarix saqlanadi (keyinchalik tergov uchun) |
| Javob | Faylni o'chirish yoki karantin | Izolyatsiya, jarayonni to'xtatish, masofadan tergov |
| Kim ishlatadi | Avtomatik | SOC analitigi bilan birga |

**XDR** esa EDR telemetriyasini pochta, tarmoq, bulut va identifikatsiya ma'lumotlari bilan birlashtiradi (b2 bosqichi).

## Windows'dagi himoya qatlamlari

Pentester Windows tarmog'ida, ayniqsa, quyidagi qatlamlarni uchratadi:

| Qatlam | Nima qiladi |
|---|---|
| **Microsoft Defender** | Windows'ning o'rnatilgan antivirusi; korporativ versiyasi (Defender for Endpoint) — to'liq EDR |
| **AMSI** | Skriptlarni (PowerShell, VBScript, JScript, Office makrolari) **bajarilishdan oldin** antivirusga tekshirtiradi — hatto fayl diskda bo'lmasa ham |
| **PowerShell jurnallari** | Script Block Logging (Event ID 4104) — bajarilgan skript matnini yozadi |
| **Sysmon** | Batafsil telemetriya: jarayon yaratilishi (1), tarmoq ulanishi (3), jarayon xotirasiga kirish (10) va boshqalar (b1) |
| **Attack Surface Reduction qoidalari** | Masalan, Office ilovalariga bola jarayon yaratishni taqiqlash |
| **Ilovalarni nazorat qilish** | Faqat ruxsat etilgan dasturlar ishga tushadi (AppLocker, WDAC) |
| **Credential Guard, LSA himoyasi** | Parol va tokenlar saqlanadigan jarayonni boshqa jarayonlardan ajratadi |

[[amsi|AMSI]] nima uchun muhim? Fayl skaneri faqat diskdagi fayllarni ko'radi, skript esa diskka yozilmasdan, to'g'ridan-to'g'ri xotirada bajarilishi mumkin. AMSI shu bo'shliqni yopish uchun yaratilgan: antivirus skript matnini u bajarilishidan oldin ko'radi. Script Block Logging esa o'sha matnni jurnalga yozadi — SOC keyinchalik nima bajarilganini o'qiy oladi.

:::info
**Ilovalarni nazorat qilish** (AppLocker, WDAC) — eng kuchli, lekin eng kam joriy qilinadigan qatlamlardan biri: faqat ruxsat etilgan, ko'pincha raqamli imzolangan dasturlar ishga tushadi. Uni joriy qilish qiyin (har bir kerakli dasturni ro'yxatga kiritish kerak), shuning uchun pentest hisobotlarida "ilovalarni nazorat qilish yo'q" tez-tez uchraydigan strategik tavsiya.
:::

## Har bir harakat iz qoldiradi

Pentest jarayonidagi oddiy harakatlar ham himoya vositalarida ko'rinadi. Bu jadval — SOC tarmog'ining aniqlash bilimlarining tester tomondan ko'rinishi:

| Pentester harakati (kelishilgan) | Qoldiradigan iz | Qayerda ko'rinadi |
|---|---|---|
| Port skanerlash (p1 Nmap) | Bir manbadan ko'p portlarga qisqa ulanishlar | Firewall, IDS/IPS (b2), NetFlow |
| Web razvedka, fuzzing (p2) | Ko'p 404 javoblar, bir xil User-Agent, yuqori tezlik | WAF, veb-server jurnallari |
| Parol tekshiruvi (p1, kelishilgan) | Ko'p muvaffaqiyatsiz kirishlar | Event ID 4625, akkaunt bloklanishi (4740) |
| Skript ishga tushirish | Skript matni, jarayon zanjiri | 4104, Sysmon 1, AMSI, EDR |
| Yangi xizmat yaratish | Xizmat o'rnatildi | Event ID 7045 |
| Domen ma'lumotlarini so'rash (BloodHound kabi) | Qisqa vaqtda ko'p LDAP so'rovlari | DC jurnallari, identifikatsiya himoyasi |
| Kerberos xizmat chiptalarini so'rash | Odatdan ko'p TGS so'rovlari | Event ID 4769 |
| Masofadan kirish | Tarmoq orqali kirish | Event ID 4624 (logon type 3 yoki 10) |

Bu jadvaldan ikki amaliy xulosa:

1. **SOC bilan oldindan kelishing.** Qamrov darsida (p1) RoE'ga tester IP manzili va vaqt oralig'i yozilgan edi — aynan shu ma'lumot SOC'ga sizning faolligingizni haqiqiy hujumdan ajratishga yordam beradi.
2. **Faoliyat jurnalingizni yuriting.** Har bir harakatning vaqti va manbasi — keyinchalik "4769 hodisalari soat 14:02 da ko'paydi — bu siz edingizmi?" degan savolga aniq javob.

## Aniqlash natijasini hisobotda yozish

Ko'p mijozlar pentestdan faqat zaifliklar emas, **himoyasi qanday ishlagani** haqida ham ma'lumot kutadi. Buni oddiy jadval bilan berish mumkin:

| Kelishilgan harakat | Vaqt (UTC) | Natija | SOC javobi |
|---|---|---|---|
| Ichki tarmoq port skani | 11-11 09:20 | Aniqlanmadi | — |
| Audit skriptini ishga tushirish | 11-11 10:05 | **Bloklandi** (EDR) | 30 daqiqada qo'ng'iroq, mashina izolyatsiya qilindi |
| Ko'p LDAP so'rovlari | 11-11 13:40 | Ogohlantirish (past) | Ko'rib chiqilmadi |
| Kelishilgan parol tekshiruvi (3 ta akkaunt) | 11-11 15:10 | Aniqlanmadi | — |

Bu jadval hisobotda strategik tavsiyalarga aylanadi: "Ichki skanerlash va parol tekshiruvi uchun aniqlash qoidalari yo'q (b2 bosqichidagi kabi qoidalar tavsiya etiladi)", "Past darajali ogohlantirishlar ko'rib chiqilmayapti — triaj jarayonini qayta ko'rish kerak". Bloklangan harakat — **ijobiy topilma** sifatida yoziladi, muvaffaqiyatsizlik sifatida emas.

:::key
**Pentester uchun himoya vositalarining qiymati:** ular nimani ko'rishini bilish sizga SOC bilan to'g'ri kelishishga, faoliyatingizni hujjatlashtirishga va mijozga nafaqat zaifliklar, balki **aniqlash bo'shliqlari** haqida ham hisobot berishga imkon beradi. Bloklangan harakat — himoyaning ishlagani, uni hisobotda ijobiy natija sifatida yozing.
:::

## Himoya tomoniga ko'prik

Bu mavzuni chuqurroq o'rganishning eng yaxshi yo'li — himoyachi bo'lib ko'rish:

- **b4 uy SOC laboratoriyasi:** o'z laboratoriyangizda Sysmon va SIEM o'rnating, keyin p1 dagi Nmap skani yoki kelishilgan parol tekshiruvini o'z mashinangizga qarshi bajaring va jurnallarda nima paydo bo'lishini kuzating.
- **MITRE D3FEND:** ATT&CK'ning himoya tomondagi juftligi — har bir hujum texnikasiga qarshi qaysi himoya usullari borligini ko'rsatadi.
- **Atomic Red Team** (Red Canary): har bir ATT&CK texnikasi uchun kichik, xavfsiz test — himoyachilar o'z aniqlash qoidalarini tekshirish uchun ishlatadi. Faqat o'z laboratoriyangizda.

## Amaliyot

:::try
**1. Antivirus yoki EDR?** Qaysi vosita qaysi holatni aniqlashi ehtimoli ko'proq: (a) ma'lum zararli dasturning aynan o'sha nusxasi; (b) Excel jarayonidan ishga tushgan PowerShell, keyin noma'lum domenga ulanish; (c) xotirada bajarilgan PowerShell skripti.

*Javob:* (a) antivirus (xesh yoki signatura); (b) EDR (xatti-harakat va jarayon zanjiri); (c) AMSI va Script Block Logging (4104), EDR telemetriyasi bilan.

**2. O'z laboratoriyangizda iz qidiring.** b4 laboratoriyangizdagi Windows mashinada Sysmon yoqilgan bo'lsin. Kali mashinadan unga qarshi oddiy port skanini bajaring (`nmap -sT <lab-IP>`), keyin Windows'da ataylab noto'g'ri parol bilan uch marta kiring. SIEM'da qaysi hodisalarni ko'rasiz?

*Kutilgan natija:* firewall yoki Sysmon tarmoq hodisalari (agar yoqilgan bo'lsa), uchta 4625 hodisasi. Skan Windows jurnalida ko'rinmasa — bu ham natija: tarmoq darajasidagi aniqlash (IDS) kerakligini ko'rsatadi.

**3. Aniqlash jadvalini to'ldiring.** p1 qamrov darsidagi PT-2026-07 ssenariysi uchun to'rtta kelishilgan harakatni tanlang va har biri uchun yozing: qanday iz qoldiradi, qaysi Event ID yoki jurnal manbasida ko'rinadi, SOC buni qanday ajrata oladi (tester IP manzili, vaqt oralig'i).

**4. TryHackMe.** Roadmap'dagi "Introduction to Antivirus" xonasini tugating va undagi aniqlash usullarini ushbu darsdagi birinchi jadval bilan solishtiring.
:::

## Xulosa

- Pentester himoya vositalarini ularni yengish uchun emas, SOC bilan kelishish, faoliyatni hujjatlashtirish va aniqlash bo'shliqlarini hisobotda ko'rsatish uchun o'rganadi.
- Antivirus: xesh, signatura, evristika, sandbox, bulut reputatsiyasi; ma'lum tahdidlarga qarshi kuchli, yangilariga zaifroq.
- EDR: doimiy telemetriya va xatti-harakat qoidalari; jarayon zanjirlarini ko'radi va javob choralarini ko'radi.
- Windows qatlamlari: Defender, AMSI, PowerShell jurnallari (4104), Sysmon, ASR qoidalari, ilovalarni nazorat qilish, Credential Guard.
- Har bir harakat iz qoldiradi: skanerlar, 4625, 7045, 4769, 4624 va boshqalar.
- Oddiy pentestda vosita bloklasa — to'xtang, SOC bilan bog'laning, natijani yozing.
- Aniqlash natijalari jadvali hisobotda strategik tavsiyalarga aylanadi; bloklangan harakat — ijobiy topilma.

:::quiz
? Pentester nima uchun himoya vositalari qanday ishlashini bilishi kerak?
- Ularni har doim chetlab o'tish uchun
+ SOC bilan kelishish, faoliyatni hujjatlashtirish va aniqlash bo'shliqlarini hisobotda ko'rsatish uchun
- Mijozning antivirusini o'chirish uchun
! Maqsad — himoyaning qanday ishlashini baholash va yaxshilashga yordam berish.

? Oddiy pentest paytida EDR vositangizni bloklasa, to'g'ri harakat qaysi?
- Vositani o'zgartirib, qayta urinish
+ To'xtash, SOC yoki mijoz bilan bog'lanish va natijani hisobotga yozish
- Hech kimga aytmasdan keyingi mashinaga o'tish
! Bloklash — himoya ishlagani; kelishilgan tartibda davom etiladi.

? Xesh bo'yicha aniqlashning zaif tomoni?
+ Faylning bitta bayti o'zgarsa, xesh ham o'zgaradi
- False positive juda ko'p
- Juda sekin ishlaydi
! Pyramid of pain'ning eng pastki qatlami: xeshni almashtirish oson.

? Xatti-harakatga asoslangan aniqlashga misol?
- Fayl xeshini bazadan qidirish
+ Word jarayoni PowerShell'ni ishga tushirganini shubhali deb belgilash
- Fayl nomini tekshirish
! Har ikki dastur ham qonuniy, lekin ularning bog'lanishi shubhali.

? AMSI nima qiladi?
- Tarmoq trafigini shifrlaydi
+ Skriptlarni bajarilishidan oldin antivirusga tekshirtiradi, hatto ular diskda bo'lmasa ham
- Parollarni saqlaydi
! AMSI xotirada bajariladigan skriptlar bo'shlig'ini yopish uchun yaratilgan.

? Antivirus va EDR'ning asosiy farqi?
- EDR faqat fayllarni tekshiradi
+ Antivirus "bu fayl zararlimi?" deb so'raydi, EDR esa doimiy telemetriya orqali "nima bo'lyapti?" deb kuzatadi
- Antivirus SOC analitigi bilan ishlaydi, EDR avtomatik
! EDR jarayonlar, tarmoq, fayllar va registry telemetriyasini yig'adi va javob choralarini beradi.

? Ko'p muvaffaqiyatsiz kirishlar qaysi Windows hodisasida ko'rinadi?
- 4104
+ 4625
- 7045
! 4625 — muvaffaqiyatsiz kirish; 4104 — PowerShell skript bloki; 7045 — yangi xizmat.

? Odatdan ko'p Kerberos xizmat chiptasi so'rovlari qaysi hodisada ko'rinadi?
+ 4769
- 4740
- 4624
! 4769 — TGS so'rovi; 4740 — akkaunt bloklanishi; 4624 — muvaffaqiyatli kirish.

? Bloklangan harakat hisobotda qanday yoziladi?
- Pentesterning muvaffaqiyatsizligi sifatida
+ Himoya ishlagani haqidagi ijobiy topilma sifatida
- Umuman yozilmaydi
! Mijoz himoyasi qanday ishlaganini bilishi kerak — bu qimmatli natija.

? SOC tester faolligini haqiqiy hujumdan qanday ajratadi?
- Ajratib bo'lmaydi
+ RoE'dagi tester IP manzili, vaqt oralig'i va testerning faoliyat jurnali orqali
- Faqat antivirus ogohlantirishiga qarab
! Oldindan kelishilgan ma'lumotlar va faoliyat jurnali deconfliction'ni ta'minlaydi.
:::

:::cards
Pentester nega himoya vositalarini o'rganadi? :: SOC bilan kelishish, izlarni tushunish va aniqlash bo'shliqlarini hisobotda ko'rsatish uchun.
Vosita bloklansa? :: To'xtash, SOC yoki mijoz bilan bog'lanish, natijani yozish, kerak bo'lsa kelishilgan istisno so'rash.
Antivirus usullari? :: Xesh, signatura, evristika, emulyatsiya va sandbox, bulut reputatsiyasi.
Signaturaga asoslangan aniqlash? :: Ma'lum yomon namunalar ro'yxati; ma'lumlarga kuchli, yangilarini o'tkazib yuborishi mumkin.
EDR nimani yig'adi? :: Jarayonlar, tarmoq ulanishlari, fayllar, registry va xotiraga kirish telemetriyasi.
Xatti-harakatga asoslangan aniqlash? :: Fayl ko'rinishiga emas, nima qilayotganiga qarash: masalan, Office'dan skript interpretatori.
AMSI? :: Skriptlarni bajarilishdan oldin antivirusga tekshirtiruvchi Windows interfeysi.
4625, 4769, 7045, 4104? :: Muvaffaqiyatsiz kirish; Kerberos xizmat chiptasi; yangi xizmat; PowerShell skript bloki.
Antivirus va EDR farqi? :: Antivirus — fayl zararlimi; EDR — doimiy telemetriya, tarix va javob choralari.
Aniqlash natijalari jadvali? :: Harakat, vaqt, natija (aniqlandi, aniqlanmadi, bloklandi), SOC javobi.
Bloklangan harakat hisobotda? :: Ijobiy topilma — himoya ishlagani.
:::
