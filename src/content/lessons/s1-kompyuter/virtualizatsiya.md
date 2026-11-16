Kirish bosqichida virtual mashina o'rnatdingiz (yoki o'rnatishni rejalashtirdingiz). Endi u qanday ishlashini tushunib olamiz — chunki virtualizatsiya faqat sizning laboratoriyangiz emas. Butun zamonaviy internet uning ustiga qurilgan: bulut xizmatlari, serverlar, konteynerlar. Uni tushunmasdan bulut xavfsizligini ham, zararli dastur tahlilini ham tushunib bo'lmaydi.

## G'oya: bitta kompyuter — ko'p kompyuter

Bir vaqtlar har bir server — alohida temir quti edi: bittasi pochta uchun, bittasi sayt uchun, bittasi baza uchun. Har biri o'z quvvatining o'ndan birini ishlatardi, qolgani bekor turardi.

**Virtualizatsiya** bu muammoni hal qildi: bitta kuchli kompyuterning resurslari dasturiy yo'l bilan bir nechta mustaqil "kompyuter"ga bo'linadi. Har biri o'zini yagona va haqiqiy deb biladi.

Asosiy atamalarni takrorlaymiz:

- **Host** — haqiqiy kompyuter va uning tizimi.
- **Guest** — uning ichidagi virtual tizim ([[host-guest|host va guest]]).
- [[virtual-machine|Virtual mashina]] (VM) — guest tizim ishlaydigan "virtual temir": virtual protsessor, virtual xotira, virtual disk.
- [[hypervisor|Gipervizor]] — resurslarni taqsimlaydigan va VM'larni bir-biridan ajratib turadigan dastur.

VM'ning "diski" aslida host'dagi oddiy katta fayl (`.vdi`, `.vmdk`). Shuning uchun butun kompyuterni fleshkaga ko'chirish, nusxalash yoki boshqa odamga yuborish mumkin.

## Gipervizorning ikki turi

```
     1-TUR (bare metal)                2-TUR (hosted)

  ┌──────┐ ┌──────┐ ┌──────┐        ┌──────┐ ┌──────┐
  │ VM 1 │ │ VM 2 │ │ VM 3 │        │ VM 1 │ │ VM 2 │
  └──────┘ └──────┘ └──────┘        └──────┘ └──────┘
  ┌────────────────────────┐        ┌────────────────┐
  │       Gipervizor       │        │   Gipervizor   │
  └────────────────────────┘        ├────────────────┤
  ┌────────────────────────┐        │ Host OT        │
  │        Hardware        │        ├────────────────┤
  └────────────────────────┘        │ Hardware       │
                                    └────────────────┘
```

| | 1-tur | 2-tur |
|---|---|---|
| Qayerda ishlaydi | To'g'ridan-to'g'ri temir ustida | Oddiy operatsion tizim ichida, dastur sifatida |
| Misollar | VMware ESXi, Microsoft Hyper-V, KVM, Xen | VirtualBox, VMware Workstation |
| Qayerda ishlatiladi | Ma'lumot markazlari, bulut | Shaxsiy kompyuter, laboratoriya |
| Tezlik | Yuqori | Biroz pastroq |

Sizning VirtualBox'ingiz — 2-tur. Amazon, Google va Microsoft bulutlari — 1-tur gipervizorlar ustida ishlaydi.

## Nega bu xavfsizlik uchun bebaho

1. **Izolyatsiya.** VM ichidagi zararli dastur host'ga chiqa olmaydi (istisnosi haqida quyida). Shubhali faylni xavfsiz ochib ko'rish mumkin.
2. **Snapshot.** Istalgan paytdagi holatni saqlab, bir necha soniyada unga qaytish.
3. **Takrorlanuvchanlik.** Bir xil toza muhitni qayta-qayta yaratish.
4. **Bir vaqtda bir nechta tizim.** Hujumchi mashinasi, nishon mashinasi va ular orasidagi tarmoq — bitta noutbukda.

### Snapshot zaxira nusxa emas

[[snapshot|Snapshot]] — VM'ning ayni paytdagi holati: disk, xotira, sozlamalar. Lekin u **asosiy diskka bog'liq**: faqat "shu paytdan keyin nima o'zgardi"ni saqlaydi.

- Snapshot — tez "orqaga qaytarish" tugmasi. Asosiy disk fayli buzilsa, snapshot ham yaroqsiz.
- [[backup|Zaxira nusxa]] — butun mashinaning **alohida joyda** saqlangan mustaqil nusxasi.

Laboratoriya uchun snapshot yetarli. Ishdagi serverlar uchun — hech qachon.

## Tarmoq rejimlari

Bu — darsning eng amaliy qismi. VM tarmoqqa qanday ulanishi sizning xavfsizligingizni bevosita belgilaydi.

VirtualBox'da: **Settings → Network → Attached to**.

| Rejim | VM internetga chiqadimi? | Host VM'ni ko'radimi? | Uy tarmog'idagi boshqalar VM'ni ko'radimi? |
|---|---|---|---|
| **NAT** | Ha | Yo'q | Yo'q |
| **Bridged** | Ha | Ha | **Ha** |
| **Host-only** | Yo'q | Ha | Yo'q |
| **Internal Network** | Yo'q | Yo'q | Yo'q |
| **NAT Network** | Ha | Yo'q | Yo'q — lekin shu tarmoqdagi VM'lar bir-birini ko'radi |

Har birini qachon ishlatish kerak:

**NAT** — standart rejim. VM host "ortiga yashirinib" internetga chiqadi ([[nat|NAT]] haqida tarmoq bosqichida batafsil). Yangilash, vosita o'rnatish, TryHackMe'ga ulanish uchun.

**Bridged** — VM uy tarmog'ingizda alohida to'laqonli qurilma bo'lib ko'rinadi, routerdan o'z [[ip-address|IP manzilini]] oladi. Faqat VM'ga tarmoqdagi boshqa qurilmalardan kirish kerak bo'lganda.

**Host-only** — faqat host va VM'lar orasidagi yopiq tarmoq. Internet yo'q.

**Internal Network** — faqat VM'lar o'zaro. Host ham ko'rmaydi. Eng yopiq rejim.

:::warn
**Atayin zaif qilingan mashinalarni (Metasploitable, DVWA, VulnHub mashinalari) hech qachon Bridged rejimga qo'ymang.** Ular bir daqiqada buziladigan qilib yaratilgan. Bridged rejimda ular uy tarmog'ingizning to'laqonli a'zosi bo'lib qoladi — tarmoqdagi istalgan qurilma, ba'zan esa internet ham ularga yetib boradi. Zaif mashinalar uchun — **Host-only** yoki **Internal Network**.
:::

Tipik laboratoriya sxemasi:

```
   Internet
      │
     NAT  ←── Kali: 1-adapter (yangilanish, vositalar)
      
   ┌─────────── Host-only / Internal tarmoq ───────────┐
   │                                                   │
 Kali: 2-adapter                              Zaif nishon mashina
 (hujumchi)                                   (internetsiz, yopiq)
```

Kali'da ikkita tarmoq adapteri: biri internet uchun, ikkinchisi nishon bilan yopiq tarmoq uchun. Nishon esa tashqi dunyodan butunlay uzilgan.

## Konteynerlar

Virtual mashinaning kamchiligi bor: har biri o'zida **to'liq operatsion tizim** olib yuradi. Bu gigabaytlab joy va bir necha daqiqalik yuklanish.

[[container|Konteyner]] boshqacha yondashadi: u o'z yadrosini olib yurmaydi — **host yadrosidan** foydalanadi. Konteyner ichida faqat dastur va unga kerakli kutubxonalar bor.

```
      VIRTUAL MASHINALAR                 KONTEYNERLAR

  ┌─────────┐  ┌─────────┐         ┌───────┐ ┌───────┐ ┌───────┐
  │ Dastur  │  │ Dastur  │         │Dastur │ │Dastur │ │Dastur │
  ├─────────┤  ├─────────┤         └───────┘ └───────┘ └───────┘
  │Guest OT │  │Guest OT │         ┌───────────────────────────┐
  │ (yadro) │  │ (yadro) │         │   Konteyner dvijogi       │
  └─────────┘  └─────────┘         ├───────────────────────────┤
  ┌──────────────────────┐         │   Host OT (bitta yadro)   │
  │      Gipervizor      │         ├───────────────────────────┤
  ├──────────────────────┤         │   Hardware                │
  │       Hardware       │         └───────────────────────────┘
  └──────────────────────┘
```

| | Virtual mashina | Konteyner |
|---|---|---|
| O'z yadrosi | Bor | Yo'q — host yadrosini ishlatadi |
| Hajmi | Gigabaytlar | Megabaytlar |
| Ishga tushishi | Daqiqalar | Soniyalar |
| Izolyatsiya | Kuchli | Kuchsizroq |
| Eng mashhur vosita | VirtualBox, VMware | **Docker** |

Izolyatsiya qatoriga e'tibor bering. Umumiy yadro — konteynerning ham kuchi, ham zaif tomoni: yadrodagi zaiflik yoki noto'g'ri sozlama orqali konteynerdan host'ga "chiqib ketish" VM'dan chiqishga qaraganda ancha osonroq.

:::key
**Zararli dasturni tahlil qilish uchun — faqat VM**, konteyner emas. Konteyner dasturlarni qulay joylash vositasi; kuchli xavfsizlik chegarasi sifatida unga ishonib bo'lmaydi.
:::

## Bulut — bu virtualizatsiya

"Bulutda server ijaraga oldim" degani aslida shunday: kimningdir ma'lumot markazidagi ulkan kompyuterda sizga bitta virtual mashina ajratildi. Yoningizdagi VM'lar — boshqa mijozlarniki.

Bulutning butun xavfsizlik modeli bitta taxminga tayanadi: **gipervizor mijozlarni bir-biridan ishonchli ajratadi.** Cloud yo'nalishini tanlasangiz, bu mavzuga chuqur kirasiz.

## Izolyatsiya mutlaq emas

Halol bo'lish kerak: VM chegarasi juda mustahkam, lekin buzilmas emas.

- **VM escape** — gipervizordagi zaiflik orqali guest'dan host'ga chiqish. Juda kam uchraydi va juda qimmat baholanadi, lekin mavjud.
- **Umumiy papka va clipboard** — siz o'zingiz ochgan eshiklar. Host bilan umumiy papka ulagan bo'lsangiz, VM ichidagi zararli dastur u yerga yoza oladi.
- **Tarmoq** — Bridged rejimdagi VM tarmog'ingizdagi boshqa qurilmalarga hujum qila oladi.

Shuning uchun haqiqiy zararli dastur bilan ishlaganda: umumiy papka va clipboard **o'chiriladi**, tarmoq **uziladi** yoki Internal qilinadi, gipervizor **yangilab turiladi**.

:::try
VirtualBox'ni oching (o'rnatgan bo'lsangiz) va Kali mashinasining sozlamalarini ko'rib chiqing:

1. **Settings → System** — qancha RAM va nechta protsessor berilgan?
2. **Settings → Network** — 1-adapter qaysi rejimda? (Standart holatda NAT bo'lishi kerak.)
3. **Settings → General → Advanced** — *Shared Clipboard* va *Drag'n'Drop* qaysi holatda?
4. **File → Tools → Network Manager** — *Host-only Networks* ro'yxatini toping.

Hali o'rnatmagan bo'lsangiz, shu to'rt joyni eslab qoling — o'rnatganingizda birinchi tekshiradigan narsalaringiz shular.
:::

## Xulosa

- **Virtualizatsiya** bitta kompyuter resurslarini bir nechta mustaqil VM'ga bo'ladi.
- **1-tur** gipervizor temir ustida (ESXi, Hyper-V, KVM); **2-tur** — operatsion tizim ichida (VirtualBox).
- **Snapshot** — tez qaytarish; **zaxira nusxa** — alohida mustaqil nusxa. Biri ikkinchisining o'rnini bosmaydi.
- Tarmoq rejimlari: **NAT** (internet), **Bridged** (tarmoqning to'liq a'zosi), **Host-only** va **Internal** (yopiq).
- Zaif mashinalar — faqat yopiq tarmoqda.
- **Konteyner** yengil va tez, lekin host yadrosini bo'lishadi — izolyatsiyasi kuchsizroq.
- Bulut — katta miqyosdagi virtualizatsiya.
- VM chegarasi mustahkam, lekin mutlaq emas.

:::quiz
? VirtualBox qaysi turdagi gipervizor?
- 1-tur (bare metal)
+ 2-tur (hosted) — oddiy operatsion tizim ichida dastur sifatida ishlaydi
- U gipervizor emas, konteyner dvijogi
- 3-tur
! VirtualBox Windows, Linux yoki macOS ichida oddiy dastur sifatida ishlaydi — bu 2-tur. 1-tur (ESXi, KVM) to'g'ridan-to'g'ri temir ustida ishlaydi.

? Atayin zaif qilingan mashq mashinasini qaysi tarmoq rejimida ishlatish kerak?
- Bridged — tezroq ishlaydi
- NAT — internet kerak
+ Host-only yoki Internal Network — tashqi tarmoqdan ajratilgan
- Farqi yo'q
! Zaif mashina oson buziladi. Bridged rejimda u uy tarmog'ingizning to'liq a'zosiga aylanadi va boshqa qurilmalar unga yetib boradi.

? Konteyner va virtual mashinaning asosiy farqi nimada?
- Konteyner sekinroq ishlaydi
- Virtual mashina faqat Linux'da ishlaydi
+ Konteyner o'z yadrosiga ega emas — host yadrosidan foydalanadi
- Konteyner ko'proq joy egallaydi
! VM to'liq guest operatsion tizimni yadrosi bilan olib yuradi. Konteyner host yadrosini bo'lishadi — shuning uchun yengil, lekin izolyatsiyasi kuchsizroq.

? Snapshot haqida qaysi gap to'g'ri?
- U to'liq zaxira nusxaning o'rnini bosadi
+ U asosiy disk fayliga bog'liq — asosiy disk buzilsa, snapshot ham yaroqsiz
- U faqat ekran rasmini saqlaydi
- Uni faqat bir marta olish mumkin
! Snapshot faqat o'zgarishlarni saqlaydi va asosiy diskka tayanadi. Haqiqiy zaxira nusxa alohida joyda, mustaqil saqlanadi.

? Shubhali faylni tahlil qilish uchun qaysi muhit to'g'ri?
- Asosiy kompyuter, antivirus yoqilgan holda
- Docker konteyneri
+ Tarmoqdan uzilgan, umumiy papkasiz virtual mashina, oldindan snapshot olingan
- Do'stingizning kompyuteri
! VM kuchli izolyatsiya beradi; tarmoqni uzish va umumiy papkani o'chirish qolgan “eshiklarni” yopadi; snapshot toza holatga qaytaradi.

? NAT rejimidagi virtual mashina haqida qaysi gaplar to'g'ri?
+ U internetga chiqa oladi
+ Uy tarmog'idagi boshqa qurilmalar unga to'g'ridan-to'g'ri ulana olmaydi
- U routerdan alohida IP manzil oladi
- U internetga umuman chiqa olmaydi
! NAT rejimida VM host “ortida” turadi: tashqariga chiqadi, lekin tashqaridan ko'rinmaydi. Routerdan alohida manzil olish — Bridged rejimning xususiyati.

? “VM escape” nima?
- Virtual mashinani o'chirish
+ Gipervizordagi zaiflik orqali guest tizimdan host tizimga chiqib ketish
- Virtual mashinadan internetga chiqish
- Snapshot'ga qaytish
! Bu izolyatsiya chegarasini buzish. Juda kam uchraydi, lekin mavjud — shuning uchun gipervizorni yangilab turish kerak.

? Bulutda “server ijaraga olish” aslida nimani anglatadi?
- Sizga alohida jismoniy kompyuter yuboriladi
+ Provayderning katta serverida sizga virtual mashina ajratiladi
- Sizning kompyuteringiz serverga aylanadi
- Internet tezligingiz oshiriladi
! Bulut — katta miqyosdagi virtualizatsiya: bitta jismoniy serverda ko'p mijozning VM'lari gipervizor bilan ajratilgan holda ishlaydi.
:::

:::cards
Gipervizorning ikki turi? :: 1-tur (bare metal) — to'g'ridan-to'g'ri temir ustida: ESXi, Hyper-V, KVM. 2-tur (hosted) — operatsion tizim ichida: VirtualBox, VMware Workstation.
Snapshot va zaxira nusxa farqi? :: Snapshot — asosiy diskka bog'liq tez “orqaga qaytarish”. Zaxira nusxa — alohida joyda saqlangan mustaqil to'liq nusxa.
NAT rejimi nima beradi? :: VM internetga chiqadi, lekin tashqi tarmoqdan ko'rinmaydi. Standart va eng xavfsiz internetli rejim.
Bridged rejimi nima qiladi? :: VM tarmoqning alohida to'laqonli qurilmasiga aylanadi va routerdan o'z IP manzilini oladi.
Host-only va Internal Network farqi? :: Host-only — host va VM'lar orasidagi yopiq tarmoq. Internal — faqat VM'lar o'zaro, host ham ko'rmaydi.
Zaif mashinalar qaysi rejimda ishlatiladi? :: Host-only yoki Internal Network — hech qachon Bridged emas.
Konteyner VM'dan nimasi bilan farq qiladi? :: O'z yadrosi yo'q, host yadrosidan foydalanadi: yengil va tez, lekin izolyatsiyasi kuchsizroq.
VM escape nima? :: Gipervizor zaifligi orqali guest tizimdan host tizimga chiqib ketish.
Zararli dastur tahlili uchun VM qanday sozlanadi? :: Snapshot olinadi, tarmoq uziladi yoki Internal qilinadi, umumiy papka va clipboard o'chiriladi.
:::
