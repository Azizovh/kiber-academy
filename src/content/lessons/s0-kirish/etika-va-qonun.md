Bu dasturda siz tizimlarga qanday kirilishini, parollar qanday buziladi va himoya qanday aylanib o'tilishini o'rganasiz. Bu bilimlarning o'zi na yaxshi, na yomon — xuddi jarrohning pichog'i kabi. Farqni bitta narsa belgilaydi.

## Oltin qoida

:::key
**Ruxsatsiz — tegmang.** Sizga tegishli bo'lmagan va egasi yozma ruxsat bermagan tizimda xavfsizlik sinovini o'tkazish — jinoyat. Niyatingiz qanchalik yaxshi bo'lmasin.
:::

Butun kasb shu bitta so'z ustiga qurilgan: [[authorization|ruxsat]]. Pentester va jinoyatchi bir xil vositalarni ishlatadi, bir xil usullarni qo'llaydi. Ularni ajratib turadigan yagona narsa — birining qo'lida tizim egasi imzolagan hujjat bor.

"Men faqat ko'rdim, hech narsaga tegmadim", "zaiflikni topib, xabar bermoqchi edim", "sayt o'zi ochiq ekan" — bularning hech biri sudda himoya bo'lmaydi.

## Qonun nima deydi

O'zbekiston Respublikasi Jinoyat kodeksida **axborot texnologiyalari sohasidagi jinoyatlar**ga alohida bob ajratilgan (278¹-modda va undan keyingi moddalar). Umumiy ma'noda quyidagilar jinoyat hisoblanadi:

- kompyuter axborotidan **ruxsatsiz foydalanish** — ya'ni begona tizimga kirish;
- kompyuter axborotini ruxsatsiz **o'zgartirish**;
- kompyuter tizimi ishini **buzish yoki to'xtatib qo'yish** (sabotaj);
- **zararli dasturlarni** yaratish, ishlatish yoki tarqatish;
- ruxsatsiz kirish uchun mo'ljallangan **maxsus vositalarni** sotish maqsadida tayyorlash va tarqatish.

Jazolar jarimadan ozodlikdan mahrum qilishgacha boradi. Boshqa davlatlarda ham shunday qonunlar bor va internet chegara bilmaydi: O'zbekistonda o'tirib chet eldagi serverga hujum qilgan odam ikki davlat qonunini buzadi.

:::warn
Bu yuridik maslahat emas va qonunlar o'zgarib turadi. Kodeksning amaldagi matnini rasmiy manbadan — lex.uz saytidan o'qing. Shubhangiz bo'lsa — qilmang.
:::

## Uch rangli qalpoq

Sohada odamlar niyati va usuliga ko'ra shartli ravishda uchga bo'linadi:

| | Ruxsati bormi? | Niyati | Qonuniymi? |
|---|---|---|---|
| [[white-hat|White hat]] | Ha | Himoya qilish | Ha |
| [[grey-hat|Grey hat]] | Yo'q | Yaxshi yoki neytral | **Yo'q** |
| [[black-hat|Black hat]] | Yo'q | Foyda yoki zarar | Yo'q |

O'rtadagi qatorga alohida e'tibor bering. Grey hat — ruxsatsiz kirib, zaiflik topib, keyin egasiga xabar beradigan odam. U o'zini qahramon deb biladi, lekin qonun oldida u ham ruxsatsiz kirgan. Bunday "yordam" uchun minnatdorchilik o'rniga jinoiy ish ochilgan holatlar ko'p.

**Siz faqat white hat bo'lasiz.** Bu axloqiy tanlovgina emas — bu kasbiy zarurat: xavfsizlik sohasida ishga olishdan oldin o'tmishingiz tekshiriladi, va bitta ahmoqona "tajriba" butun karyerani tugatishi mumkin.

## Qonuniy mashq qilish joylari

Yaxshi xabar: mashq qilish uchun begona tizimlarga umuman ehtiyoj yo'q. Qonuniy imkoniyatlar yetarli:

1. **O'z laboratoriyangiz.** Kompyuteringizdagi virtual mashinalar — bu sizning mulkingiz. Ularni xohlagancha buzing. Keyingi darslardan birida uni qurasiz.
2. **O'quv platformalari.** TryHackMe, Hack The Box, PortSwigger Academy — bular atayin buzish uchun yaratilgan tizimlar va ular sizga ochiq ruxsat beradi.
3. **[[ctf|CTF]] musobaqalari.** Tashkilotchilar maxsus zaif tizimlar tayyorlaydi; qoidalarga rioya qilsangiz — hammasi qonuniy.
4. **[[bug-bounty|Bug bounty]] dasturlari.** Kompaniyalar o'z tizimlarini tekshirishga ochiq ruxsat beradi — lekin **qat'iy qoidalar doirasida**.
5. **Shartnoma asosidagi pentest.** Bu allaqachon ish: mijoz bilan yozma kelishuv.

## Ruxsatning chegarasi: scope

Ruxsat hech qachon cheksiz bo'lmaydi. U doim aniq chegaraga ega — bu [[scope|qamrov]] (scope) deyiladi. Odatda u quyidagilarni belgilaydi:

- **Nimani** tekshirish mumkin: aniq domenlar, IP manzillar, ilovalar.
- **Nimani** mumkin emas: masalan, to'lov tizimi yoki uchinchi tomon xizmatlari.
- **Qanday usullar** taqiqlangan: xizmatni ishdan chiqarish (DoS), xodimlarni aldash, jismoniy kirish.
- **Qachon:** sanalar va soatlar.
- **Topilgan ma'lumot** bilan nima qilish kerak.

Misol: bug bounty dasturi `shop.example.com` ni tekshirishga ruxsat bergan. Siz razvedka paytida `admin.example.com` ni topdingiz va u zaif ko'rinadi. Unga tegish mumkinmi?

**Yo'q.** U qamrovda emas. Qamrovdan bir qadam chiqdingiz — ruxsat tugadi va siz yana oddiy ruxsatsiz kiruvchiga aylandingiz.

## Zaiflik topib oldingiz. Nima qilasiz?

Tasodifan ham bo'ladi: saytdan foydalanayotib, begona odamning ma'lumoti ko'rinib qolganini payqadingiz. To'g'ri yo'l — **mas'uliyatli oshkor qilish** (responsible disclosure):

1. **To'xtang.** Zaiflik borligini tasdiqlash uchun zarur bo'lgandan ortiq hech narsa qilmang. Ma'lumotlarni yuklab olmang, "qanchalik chuqur kirsa bo'ladi" deb sinab ko'rmang.
2. **Tashkilotga xabar bering** — iloji bo'lsa rasmiy kanal orqali (`security@...` manzili yoki saytdagi `/.well-known/security.txt` fayli).
3. **Aniq yozing:** nima, qayerda, qanday takrorlash mumkin.
4. **Vaqt bering.** Tuzatilmaguncha ommaga e'lon qilmang.
5. **Hech narsa talab qilmang.** "Pul bering, bo'lmasa e'lon qilaman" — bu tovlamachilik, alohida jinoyat.

## Mutaxassisning besh qoidasi

1. **Avval ruxsat, keyin harakat.** Og'zaki emas — yozma.
2. **Qamrovdan chiqmayman.**
3. **Zarar yetkazmayman.** Isbot uchun zarur bo'lgandan ortig'ini qilmayman.
4. **Ko'rgan ma'lumotimni sir saqlayman.** Ish paytida begona yozishmalar, parollar, shaxsiy ma'lumotlar ko'rinadi — ular sizniki emas.
5. **Halol hisobot beraman.** Topganimni yashirmayman, topmaganimni o'ylab chiqarmayman.

:::tip
Oddiy tekshiruv: "Buni tizim egasi yonimda turib ko'rsa, xotirjam bo'larmidim?" Javob "yo'q" bo'lsa — to'xtang.
:::

## Xulosa

- Jinoyatchi va mutaxassisni ajratuvchi yagona narsa — **yozma ruxsat**.
- Ruxsatsiz kirish, ma'lumotni o'zgartirish, tizimni buzish va zararli dastur tarqatish — jinoyat.
- Yaxshi niyat (grey hat) qonun oldida himoya emas.
- Mashq uchun: o'z laboratoriyangiz, o'quv platformalari, CTF, bug bounty.
- Ruxsat doim **qamrov** bilan chegaralangan.
- Tasodifiy topilma — mas'uliyatli oshkor qilish orqali.

:::quiz
? Do'stingiz: “Saytimni buzib ko'r-chi, qiziq”, — dedi. Sayt aslida u ishlaydigan kompaniyaga tegishli. Tekshirish mumkinmi?
- Ha, do'stim ruxsat berdi
- Ha, agar zarar yetkazmasam
+ Yo'q — ruxsatni faqat tizim egasi bera oladi, do'stim esa ega emas
- Ha, agar kechasi qilsam
! Ruxsat tizim egasidan yoki u vakolat bergan shaxsdan bo'lishi kerak — va yozma. Xodimning og'zaki gapi kompaniya nomidan ruxsat emas.

? Grey hat haqida qaysi gap to'g'ri?
- Uning harakati qonuniy, chunki niyati yaxshi
+ Niyati yaxshi bo'lishi mumkin, lekin ruxsatsiz kirgani uchun qonunni buzadi
- U doim pul uchun ishlaydi
- U faqat o'z tizimlarini tekshiradi
! Qonun niyatga emas, ruxsat bor-yo'qligiga qaraydi. Grey hat ruxsatsiz harakat qiladi — demak, qonunbuzar.

? Bug bounty dasturi faqat `app.example.com` ni tekshirishga ruxsat bergan. Siz zaif ko'rinadigan `dev.example.com` ni topdingiz. To'g'ri harakat qaysi?
- Uni ham tekshiraman — bitta kompaniyaniki-ku
- Tez tekshirib, natijani hisobotga qo'shaman
+ Unga tegmayman — u qamrovda emas
- Zaiflikni ijtimoiy tarmoqda e'lon qilaman
! Ruxsat faqat qamrov ichida amal qiladi. Qamrovdan tashqaridagi har qanday tizim — ruxsatsiz hudud.

? Saytdan foydalanayotib tasodifan boshqa mijozlarning ma'lumoti ko'rinib qolganini payqadingiz. Birinchi qadam?
- Isbot uchun barcha ma'lumotni yuklab olaman
- Qanchalik chuqur kirish mumkinligini sinab ko'raman
+ To'xtayman va tashkilotga rasmiy kanal orqali xabar beraman
- Kompaniyadan mukofot talab qilaman
! Mas'uliyatli oshkor qilish: zarur bo'lgandan ortiq hech narsa qilmaslik, egasiga xabar berish, tuzatishga vaqt berish.

? Qaysi biri qonuniy mashq maydoni EMAS?
- O'z kompyuteringizdagi virtual mashina
- TryHackMe xonasi
- CTF musobaqasi topshirig'i
+ Qo'shningizning Wi-Fi routeri
! Qo'shnining routeri — begona mulk. Ruxsatsiz unga kirishga urinish — qonunbuzarlik. Qolgan uchtasi aynan mashq uchun mo'ljallangan.

? “Zaiflik topdim. Pul to'lamasangiz, uni e'lon qilaman” degan xat nima hisoblanadi?
- Bug bounty hisoboti
- Mas'uliyatli oshkor qilish
+ Tovlamachilik
- Pentest taklifi
! Tahdid ostida pul talab qilish — tovlamachilik, alohida jinoyat. Halol tadqiqotchi xabar beradi va hech narsa talab qilmaydi.
:::

:::cards
Pentester va jinoyatchini nima ajratadi? :: Tizim egasining yozma ruxsati (authorization).
Scope (qamrov) nima? :: Tekshirishga ruxsat berilgan tizimlar, usullar va vaqtning aniq chegarasi.
White, grey va black hat farqi? :: White — ruxsat bilan, himoya uchun. Grey — ruxsatsiz, lekin zarar niyatisiz (baribir noqonuniy). Black — ruxsatsiz, g'arazli.
Responsible disclosure nima? :: Topilgan zaiflik haqida egasiga yashirin xabar berib, tuzatishga vaqt berish va shundan keyingina oshkor qilish.
Qonuniy mashq qilish joylarini sanang. :: O'z laboratoriyangiz, o'quv platformalari (TryHackMe, HTB), CTF, bug bounty (qamrov ichida), shartnomali pentest.
Bug bounty nima? :: Kompaniya o'z tizimidan zaiflik topganlarga belgilangan qoidalar doirasida mukofot to'laydigan dastur.
:::
