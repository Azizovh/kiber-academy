Xavfsizlikni o'rganish uchun buzadigan narsa kerak. Asosiy kompyuteringizda tajriba qilish — yomon g'oya: bitta xato buyruq fayllaringizni yo'q qilishi mumkin. Begona tizimlarda esa — jinoyat. Yechim: kompyuteringiz ichida alohida, xavfsiz "qum qutisi" yaratish.

Bu dars oxirida sizda ishlaydigan [[kali-linux|Kali Linux]] bo'ladi.

:::info
**Kompyuteringiz kuchsizmi yoki hozir o'rnatishga vaqt yo'qmi?** Xavotir olmang: dastlabki bosqichlar uchun shu dastur ichidagi terminal simulyatori va brauzerda ishlaydigan TryHackMe yetarli. Laboratoriyani 3-bosqich (Linux) boshlanguncha qursangiz bo'ladi. Lekin darsni hozir o'qib chiqing — tushunchalar kerak bo'ladi.
:::

## Virtual mashina nima

[[virtual-machine|Virtual mashina]] (VM) — kompyuteringiz ichida oddiy dastur sifatida ishlaydigan alohida "kompyuter". Uning o'z operatsion tizimi, o'z diski, o'z xotirasi bor — lekin bularning hammasi aslida asosiy kompyuteringizdagi fayllar va resurslarning bir qismi.

Uch atamani eslab qoling:

- **Host** — asosiy, haqiqiy kompyuteringiz va uning tizimi (masalan, Windows 11).
- **Guest** — uning ichida ishlayotgan virtual tizim (masalan, Kali Linux).
- [[hypervisor|Gipervizor]] — ularni boshqaradigan dastur. Biz **VirtualBox** dan foydalanamiz: u bepul va hamma tizimda ishlaydi.

Nima uchun bu xavfsizlik uchun ideal:

- **Izolyatsiya.** VM ichida nima sodir bo'lsa, o'sha yerda qoladi.
- **Qaytarish.** Buzib qo'ydingizmi? Bir tugma bilan oldingi holatga qaytasiz.
- **Erkinlik.** Bir vaqtda bir nechta tizim: hujumchi mashinasi va nishon mashinasi.

## Sizga nima kerak

| | Minimal | Qulay |
|---|---|---|
| Tezkor xotira (RAM) | 8 GB | 16 GB |
| Bo'sh disk joyi | 40 GB | 80 GB+ (SSD) |
| Protsessor | 4 yadro, 64-bit | 6+ yadro |

Kompyuteringiz xususiyatlarini ko'rish: `Win + Pause` yoki **Sozlamalar → Tizim → Tizim haqida**.

RAM 8 GB dan kam bo'lsa, VM juda sekin ishlaydi. Bunday holda hozircha faqat TryHackMe'ning brauzerdagi mashinalaridan foydalaning.

## 1-qadam. Virtualizatsiyani tekshirish

Protsessorda virtualizatsiya funksiyasi yoqilgan bo'lishi kerak.

**Task Manager** ni oching (`Ctrl + Shift + Esc`) → **Performance** → **CPU**. Pastda **Virtualization: Enabled** yozuvi bo'lishi kerak.

**Disabled** bo'lsa: kompyuterni qayta yoqib, BIOS/UEFI ga kiring (yuklanish paytida `F2`, `Del` yoki `F10` — ishlab chiqaruvchiga bog'liq) va **Intel VT-x**, **Intel Virtualization Technology** yoki **AMD-V / SVM Mode** degan sozlamani yoqing.

## 2-qadam. VirtualBox o'rnatish

1. Rasmiy saytga kiring: `virtualbox.org` → **Downloads**.
2. **Windows hosts** havolasini bosib, o'rnatuvchini yuklab oling.
3. Ishga tushiring va barcha qadamlarda standart sozlamalarni qoldiring. O'rnatish paytida tarmoq bir necha soniyaga uzilishi mumkin — bu normal.

:::warn
Dasturlarni **faqat rasmiy saytlardan** yuklang. "Tekin Kali", "crack qilingan VMware" deb tarqatilgan fayllar — zararli dastur yuqtirishning eng mashhur usullaridan biri. Xavfsizlikni o'rganayotgan odam uchun bu juda kulgili xato bo'lardi.
:::

## 3-qadam. Kali Linux'ni yuklab olish

Kali'ni noldan o'rnatish ham mumkin, lekin eng oson yo'l — tayyor virtual mashina.

1. `kali.org` → **Get Kali** → **Virtual Machines**.
2. **VirtualBox** uchun mo'ljallangan 64-bit variantni yuklab oling. Fayl hajmi 3 GB atrofida, kengaytmasi `.7z`.
3. Arxivni oching. Windows 11 buni o'zi qila oladi; eski tizimda bepul **7-Zip** dasturini (`7-zip.org`) o'rnating.
4. Ochilgan papkani doimiy joyga ko'chiring, masalan `C:\VM\kali`. Ichida `.vbox` va `.vdi` fayllar bo'ladi.

## 4-qadam. Mashinani qo'shish va sozlash

1. `.vbox` faylni ikki marta bosing — VirtualBox ochiladi va mashina ro'yxatda paydo bo'ladi.
2. Mashinani tanlab, **Settings** ni bosing:
   - **System → Motherboard → Base Memory:** 8 GB RAM'li kompyuterda — 2048–3072 MB; 16 GB'li kompyuterda — 4096 MB. Hech qachon host xotirasining yarmidan ko'pini bermang.
   - **System → Processor:** 2 ta yadro.
   - **Display → Video Memory:** maksimal (128 MB).
3. **OK** → **Start**.

Bir daqiqadan so'ng kirish oynasi chiqadi:

```
Foydalanuvchi: kali
Parol:         kali
```

Tabriklaymiz — siz Kali Linux ichidasiz.

## 5-qadam. Birinchi buyruqlar

Yuqori paneldagi qora ikonka — [[terminal|terminal]]. Uni oching va tizimni yangilang:

```bash
sudo apt update
sudo apt full-upgrade -y
```

`sudo` parol so'raydi — `kali` deb yozing. Yozayotganingizda ekranda hech narsa ko'rinmaydi: na yulduzcha, na nuqta. Bu nosozlik emas, Linux parolni shunday yashiradi. Yozib, `Enter` bosing.

Yangilanish 10–30 daqiqa davom etishi mumkin. Tugagach, parolni o'zgartiring — standart parol bilan yurish xavfsizlik mutaxassisiga yarashmaydi:

```bash
passwd
```

## 6-qadam. Snapshot — eng muhim odat

[[snapshot|Snapshot]] — virtual mashinaning ayni paytdagi holatining "surati". Keyin nima bo'lishidan qat'i nazar, shu holatga qaytishingiz mumkin.

Hozir, tizim toza va yangilangan paytda, birinchisini oling:

VirtualBox oynasida: **Machine → Take Snapshot** → nom bering: `Toza, yangilangan`.

:::key
Odat qiling: **har qanday xavfli tajribadan oldin — snapshot.** Yangi vosita o'rnatmoqchimisiz, tizim sozlamasini o'zgartirmoqchimisiz, shubhali fayl ochmoqchimisiz — avval snapshot. Bu sizni soatlab qayta o'rnatishdan qutqaradi.
:::

Qaytarish: mashinani o'chiring → VirtualBox'da mashina yonidagi menyu → **Snapshots** → keraklisini tanlab **Restore**.

## Muammo chiqsa

| Belgi | Ehtimoliy sabab va yechim |
|---|---|
| "VT-x is disabled in the BIOS" | Virtualizatsiya o'chiq — 1-qadamga qayting |
| "VT-x is not available" yoki juda sekin ishlaydi | Windows'ning Hyper-V funksiyasi xalaqit beryapti. **Turn Windows features on or off** oynasida *Hyper-V* va *Windows Hypervisor Platform* ni o'chirib, qayta yoqing |
| Qora ekran | **Display** sozlamalarida video xotirani oshiring, 3D tezlatishni o'chiring |
| Ekran kichkina | VirtualBox menyusi: **View → Auto-resize Guest Display**; oynani kattalashtiring |
| Sichqoncha VM ichida "qamalib qoldi" | O'ng `Ctrl` tugmasini bosing |

## Xavfsizlik qoidalari

1. **Kali — ish quroli, kundalik tizim emas.** Unda pochta ochmang, bank ilovasiga kirmang, shaxsiy fayllarni saqlamang.
2. **Kali'dagi vositalarni faqat o'z laboratoriyangiz va ruxsat berilgan nishonlarga** qarating. Uy tarmog'ingizdagi boshqa odamlarning qurilmalari ham "begona" hisoblanadi.
3. **Atayin zaif qilingan mashinalarni internetga ochiq qo'ymang** — ular haqiqiy hujumchilar uchun ham oson o'lja. Tarmoq rejimlari haqida "Virtualizatsiya" darsida batafsil gaplashamiz.

## 7-qadam. TryHackMe akkaunti

Laboratoriyangizning ikkinchi yarmi — onlayn.

1. `tryhackme.com` da bepul ro'yxatdan o'ting.
2. **Tutorial** xonasini toping va bajaring — u platformaning o'zi qanday ishlashini o'rgatadi.
3. E'tibor bering: TryHackMe'da brauzer ichida ochiladigan **AttackBox** bor. Kuchsiz kompyuterda Kali o'rniga shundan foydalansa bo'ladi.

## Hozircha — shu yerda mashq qiling

VM tayyor bo'lguncha ham kutib o'tirish shart emas. Mana birinchi terminal labi: u shu dasturning ichida ishlaydi va hech narsa o'rnatishni talab qilmaydi.

:::lab terminal-birinchi-qadam

## Xulosa

- **VM** — kompyuter ichidagi alohida kompyuter; **host** — asosiy tizim, **guest** — virtual tizim, **gipervizor** — ularni boshqaruvchi dastur.
- Laboratoriya: VirtualBox + tayyor Kali Linux mashinasi.
- VM'ga host xotirasining yarmidan ko'pini bermang.
- **Snapshot** — har qanday tajribadan oldin.
- Kali — faqat ish uchun; vositalar — faqat ruxsat berilgan nishonlarga.

:::quiz
? Virtual mashina kontekstida “host” nima?
- Virtual mashina ichidagi operatsion tizim
+ Virtual mashinalar ishlab turgan asosiy, haqiqiy kompyuter va uning tizimi
- Virtual mashinalarni boshqaradigan dastur
- Internetdagi server
! Host — asosiy tizim, guest — uning ichidagi virtual tizim, gipervizor (masalan VirtualBox) — ularni boshqaruvchi dastur.

? Snapshot nima uchun kerak?
- Virtual mashinani tezlashtirish uchun
- Ekran rasmini olish uchun
+ Mashinaning joriy holatini saqlab, keyin unga qaytish uchun
- Internetga ulanish uchun
! Snapshot — mashina holatining “surati”. Tajriba muvaffaqiyatsiz chiqsa, bir necha soniyada toza holatga qaytasiz.

? 8 GB RAM'li kompyuterda Kali virtual mashinasiga qancha xotira berish to'g'ri?
- 8 GB — hammasini
- 6 GB
+ 2–3 GB
- 256 MB
! Host xotirasining yarmidan ko'pini bermang, aks holda asosiy tizimning o'zi tiqilib qoladi. 8 GB'da 2–3 GB — oqilona tanlov.

? Terminalda `sudo` parolini yozayotganingizda ekranda hech narsa ko'rinmayapti. Bu nima?
- Klaviatura ishlamayapti
- Tizim osilib qoldi
+ Normal holat — Linux kiritilayotgan parolni ko'rsatmaydi
- Parol noto'g'ri
! Linux terminali parolni umuman aks ettirmaydi — hatto yulduzcha ham chiqmaydi. Yozib, Enter bosing.

? Kali Linux virtual mashinasidan foydalanishda qaysi biri NOTO'G'RI?
- Har tajribadan oldin snapshot olish
- Standart parolni o'zgartirish
+ Undan kundalik ishlar uchun foydalanish: pochta, bank, shaxsiy fayllar
- Tizimni muntazam yangilab turish
! Kali — xavfsizlik sinovlari uchun ish quroli. Unda shaxsiy ma'lumot saqlash va kundalik ishlarni qilish tavsiya etilmaydi.

? VirtualBox “VT-x is disabled in the BIOS” xatosini berdi. Nima qilish kerak?
- VirtualBox'ni qayta o'rnatish
- Ko'proq RAM sotib olish
+ BIOS/UEFI sozlamalarida virtualizatsiyani yoqish
- Boshqa Kali faylini yuklab olish
! Protsessorning virtualizatsiya funksiyasi (Intel VT-x yoki AMD-V) BIOS/UEFI da o'chirilgan. Uni yoqish kerak.
:::

:::cards
Virtual mashina (VM) nima? :: Kompyuter ichida dastur sifatida ishlaydigan, o'z operatsion tizimiga ega alohida “kompyuter”.
Host va guest farqi? :: Host — asosiy haqiqiy tizim; guest — uning ichida ishlayotgan virtual tizim.
Gipervizor nima? Misol keltiring. :: Virtual mashinalarni yaratib, boshqaradigan dastur. Masalan: VirtualBox, VMware, Hyper-V.
Snapshot nima va qachon olinadi? :: VM holatining saqlangan “surati”. Har qanday xavfli tajriba yoki o'zgarishdan oldin olinadi.
Kali Linux nima? :: Xavfsizlik sinovlari uchun yuzlab vosita oldindan o'rnatilgan Linux distributivi.
Kali tizimini yangilash buyruqlari? :: sudo apt update, keyin sudo apt full-upgrade -y
Virtualizatsiya yoqilganini Windows'da qayerdan ko'rish mumkin? :: Task Manager → Performance → CPU → “Virtualization: Enabled”.
:::
