Siz `google.com` deb yozasiz. Kompyuter esa faqat `142.250.74.14` kabi raqamlarni tushunadi. Ular orasidagi tarjimon — DNS. Usiz internet ishlamaydi: saytlar ochilmaydi, pochta ketmaydi, dasturlar yangilanmaydi.

Aynan shuning uchun DNS — hujumchilarning ham, himoyachilarning ham sevimli joyi. Kim DNS ni nazorat qilsa, u foydalanuvchini istagan joyiga yubora oladi.

## DNS nima

[[dns|DNS]] (Domain Name System) — [[domain|domen nomini]] IP manzilga aylantiruvchi tizim. Uni ko'pincha "internetning telefon kitobi" deyishadi.

Lekin bu bitta ulkan kitob emas. Bu — butun dunyoga tarqalgan, ierarxik tuzilgan millionlab serverlar tizimi. Hech bir server hamma narsani bilmaydi, lekin har biri **kimdan so'rash kerakligini** biladi.

## Domen nomi tuzilishi

Domen nomi **o'ngdan chapga** o'qiladi:

```
        mail.example.com.
          │     │     │  └── ildiz (root) — odatda yozilmaydi
          │     │     └───── TLD: yuqori darajali domen
          │     └─────────── ikkinchi darajali domen (kompaniya nomi)
          └───────────────── subdomen
```

| Qism | Misol | Kim boshqaradi |
|---|---|---|
| Ildiz | `.` | 13 ta ildiz server guruhi |
| TLD | `.com`, `.org`, `.uz` | Reyestrlar |
| Domen | `example.com` | Domen egasi |
| Subdomen | `mail`, `api`, `dev` | Domen egasi — xohlagancha yaratadi |

Subdomenlar razvedkada juda muhim: `dev.example.com`, `test.example.com`, `old-admin.example.com` — unutilgan, yangilanmagan va zaif tizimlar ko'pincha shu yerda yashiringan.

## So'rov qanday ishlaydi

Brauzerga `www.example.com` deb yozdingiz. Nima sodir bo'ladi?

```
Siz ─► Brauzer keshi ─► OT keshi ─► hosts fayli
                                        │ topilmadi
                                        ▼
                               RESOLVER (provayder
                               yoki 8.8.8.8, 1.1.1.1)
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
   1. ROOT server               2. TLD server (.com)        3. AUTHORITATIVE server
   ".com ni kim biladi?"        "example.com ni kim         "www.example.com
                                 biladi?"                    = 93.184.216.34"
```

Qadamma-qadam:

1. **Kesh.** Avval brauzer, keyin operatsion tizim o'z xotirasiga qaraydi. Yaqinda so'ralgan bo'lsa — javob shu yerda.
2. **Resolver.** Topilmasa, so'rov *rekursiv resolver*ga boradi — bu sizning nomingizdan qidiradigan server (odatda provayderniki).
3. **Root.** Resolver ildiz serverdan so'raydi. U manzilni bilmaydi, lekin `.com` uchun mas'ul serverlarni ko'rsatadi.
4. **TLD.** `.com` serveri `example.com` uchun mas'ul serverlarni ko'rsatadi.
5. **Authoritative.** Domen egasining serveri aniq javobni beradi.
6. Resolver javobni sizga qaytaradi va **keshlab qo'yadi**.

Bularning hammasi odatda 100 millisekunddan kam vaqt oladi.

Javob qancha vaqt keshda turishini [[ttl|TTL]] (Time To Live) belgilaydi — soniyalarda. TTL = 3600 bo'lsa, bir soat davomida qayta so'ralmaydi.

## DNS yozuvlari

DNS faqat IP manzil saqlamaydi. Har xil ma'lumot uchun har xil **yozuv turi** bor:

| Tur | Nima saqlaydi | Misol |
|---|---|---|
| **A** | Nom → IPv4 manzil | `example.com → 93.184.216.34` |
| **AAAA** | Nom → IPv6 manzil | `example.com → 2606:2800:220:1::` |
| **CNAME** | Nom → boshqa nom (taxallus) | `www → example.com` |
| **MX** | Domen pochtasini qabul qiluvchi server | `example.com → mail.example.com` |
| **NS** | Domen uchun mas'ul DNS serverlar | `example.com → ns1.example.com` |
| **TXT** | Ixtiyoriy matn | SPF, domenni tasdiqlash kodlari |
| **PTR** | IP → nom (teskari so'rov) | `34.216.184.93 → example.com` |
| **SOA** | Zona haqida asosiy ma'lumot | Mas'ul shaxs, seriya raqami |

Razvedkada har biri o'z ma'lumotini beradi:

- **MX** — kompaniya qaysi pochta xizmatidan foydalanadi (Google? Microsoft? o'z serveri?).
- **TXT** — qaysi tashqi xizmatlar ulangan (ularni tasdiqlash kodlari shu yerda qoladi).
- **NS** — DNS ni kim boshqaradi.
- **CNAME** — sayt qaysi bulut xizmatida joylashgan.

## So'rov yuborish vositalari

```bash
nslookup example.com              # Windows va Linux'da bor
nslookup -type=MX example.com     # aniq yozuv turi

dig example.com                   # Linux — batafsilroq
dig example.com MX +short         # faqat javob
dig @8.8.8.8 example.com          # aniq serverdan so'rash
dig -x 93.184.216.34              # teskari so'rov (IP → nom)
```

`dig` natijasidagi eng muhim qism — **ANSWER SECTION**:

```
;; ANSWER SECTION:
example.com.     3600    IN    A    93.184.216.34
   └─ nom         └─ TTL       └─ tur  └─ qiymat
```

## hosts fayli

DNS dan **oldin** tekshiriladigan kichik lokal fayl bor:

```
Windows:  C:\Windows\System32\drivers\etc\hosts
Linux:    /etc/hosts
```

Uning mazmuni oddiy: `IP manzil  nom`.

```
127.0.0.1      localhost
10.10.10.5     target.lab
```

Ikki narsani eslab qoling:

- **O'zingiz uchun:** laboratoriyada va TryHackMe/HTB mashinalarida nishon nomini IP ga bog'lash uchun bu faylni doim tahrirlaysiz.
- **Hujumchi uchun:** zararli dastur shu faylga `mybank.uz → hujumchi IP si` deb yozib qo'ysa, foydalanuvchi to'g'ri manzilni terib ham soxta saytga tushadi. Tergovda bu fayl albatta tekshiriladi.

## DNS va xavfsizlik

DNS 1980-yillarda yaratilgan va boshidan **shifrlanmagan, tekshirilmaydigan** protokol. Standart port — **UDP 53**.

### Hujumlar

| Hujum | Mohiyati |
|---|---|
| **DNS spoofing / cache poisoning** | Resolver keshiga soxta javob joylash — foydalanuvchilar soxta saytga boradi |
| **DNS hijacking** | Router yoki domen sozlamalarini o'zgartirib, so'rovlarni hujumchi serveriga yo'naltirish |
| **Typosquatting** | O'xshash nomli domen ro'yxatdan o'tkazish: `mybank.uz` o'rniga `rnybank.uz` (m → rn), `mybamk.uz` |
| **DNS tunneling** | Ma'lumotni DNS so'rovlari ichiga yashirib olib chiqish |
| **Subdomain takeover** | Unutilgan CNAME yozuvi ko'rsatgan tashlab ketilgan xizmatni egallab olish |

**DNS tunneling**ni alohida tushuntiramiz, chunki u juda ayyor. Ko'p tarmoqlarda firewall deyarli hamma narsani to'sadi, lekin DNS ni o'tkazadi — usiz hech narsa ishlamaydi. Hujumchi o'g'irlangan ma'lumotni subdomen nomiga kodlaydi:

```
cGFyb2w6IGFkbWluMTIz.hujumchi-domeni.example
```

Bu so'rov qonuniy DNS serverlar orqali hujumchining serveriga yetib boradi. Base64'ni tanidingizmi? Kodlash darsi shu yerda ish berdi.

### Himoyachi DNS dan nima oladi

DNS jurnallari — SOC uchun eng qimmatli manbalardan biri. Zararlangan kompyuter boshqaruv serveriga ulanishdan oldin deyarli doim uning nomini DNS dan so'raydi. Shubhali belgilar:

- juda uzun va tasodifiy ko'rinadigan subdomenlar (tunneling);
- yaqinda ro'yxatdan o'tgan domenlarga so'rovlar;
- bitta kompyuterdan g'ayrioddiy ko'p so'rov;
- mavjud bo'lmagan domenlarga ketma-ket urinishlar.

### Himoya choralari

- **DNSSEC** — javoblarni raqamli imzo bilan tasdiqlaydi (soxtalashtirishga qarshi).
- **DoH / DoT** (DNS over HTTPS / TLS) — so'rovlarni shifrlaydi, yo'ldagi kuzatuvchi ko'rmaydi.
- **DNS filtrlash** — ma'lum zararli domenlarga so'rovlarni bloklash.

:::key
DNS — ishonch zanjirining birinchi halqasi. Agar foydalanuvchi noto'g'ri IP manzil olsa, undan keyingi hamma narsa — ulanish, sahifa, kiritilgan parol — hujumchi tomonda sodir bo'ladi. Bu holatda foydalanuvchini qutqaradigan oxirgi to'siq — HTTPS sertifikati ogohlantirishi.
:::

:::try
CMD yoki terminalda bajaring:

```
nslookup google.com
nslookup -type=MX gmail.com
nslookup -type=TXT google.com
```

1. Birinchi natijada nechta IP manzil chiqdi? Nega bittadan ko'p bo'lishi mumkin?
2. MX yozuvlaridagi raqamlar (5, 10, 20…) nimani bildiradi deb o'ylaysiz?

Windows'da DNS keshini ko'rish: `ipconfig /displaydns`. Yaqinda kirgan saytlaringiz shu yerda turibdi.

*Javoblar: 1) yuklamani taqsimlash va ishonchlilik uchun bir nomga bir nechta server biriktiriladi. 2) ustuvorlik — kichik raqamli server birinchi sinab ko'riladi.*
:::

## Xulosa

- **DNS** domen nomini IP manzilga aylantiradi; ierarxik va taqsimlangan.
- Nom o'ngdan chapga o'qiladi: ildiz → TLD → domen → subdomen.
- So'rov yo'li: kesh → resolver → root → TLD → authoritative.
- Yozuvlar: **A**, **AAAA**, **CNAME**, **MX**, **NS**, **TXT**, **PTR**.
- **hosts** fayli DNS dan oldin tekshiriladi.
- DNS shifrlanmagan va **UDP 53** da ishlaydi.
- Hujumlar: spoofing, hijacking, typosquatting, tunneling.
- DNS jurnallari — hujumni aniqlashning asosiy manbalaridan biri.

:::quiz
? Domenning pochta serverini qaysi DNS yozuvi ko'rsatadi?
- A
- CNAME
+ MX
- TXT
! MX (Mail Exchange) — domen uchun pochta qabul qiluvchi serverlarni ko'rsatadi.

? DNS so'rovida resolver authoritative serverga yetguncha qaysi tartibda so'raydi?
- TLD → Root → Authoritative
+ Root → TLD → Authoritative
- Authoritative → TLD → Root
- Root → Authoritative → TLD
! Avval ildiz server TLD serverini ko'rsatadi, TLD server domen uchun mas'ul serverni, u esa aniq javobni beradi.

? Kompyuter domen nomini aniqlashda DNS serverdan OLDIN nimani tekshiradi?
- Routerning MAC manzilini
+ Lokal kesh va hosts faylini
- Root serverlarni
- Sayt sertifikatini
! Avval brauzer va OT keshi, keyin hosts fayli tekshiriladi. Shuning uchun hosts faylidagi yozuv DNS dan ustun turadi.

? Tergov paytida hosts faylida `185.10.20.30  mybank.uz` qatorini topdingiz. Bu nimani anglatishi mumkin?
- Bank o'z serverini ko'chirgan
- Bu Windows'ning standart yozuvi
+ Zararli dastur foydalanuvchini soxta bank saytiga yo'naltirayotgan bo'lishi mumkin
- DNS keshi to'lib qolgan
! hosts fayli DNS dan oldin ishlaydi. Unga begona IP yozilsa, foydalanuvchi to'g'ri manzil tersa ham soxta serverga tushadi.

? DNS tunneling nima?
- DNS serverni tezlashtirish usuli
+ Ma'lumotni DNS so'rovlari ichiga yashirib uzatish
- DNS javoblarini shifrlash
- Domenni boshqa provayderga ko'chirish
! Ko'p tarmoqlar DNS ni to'smaydi. Hujumchi ma'lumotni subdomen nomlariga kodlab, o'z DNS serveriga olib chiqadi.

? `mybank.uz` bankining mijozlariga `rnybank.uz` domenidan xat keldi. Bu qaysi hujum turiga misol?
- DNS cache poisoning
- DNS tunneling
+ Typosquatting
- Subdomain takeover
! Mashhur nomga o'xshash domen ro'yxatdan o'tkazish — typosquatting. Foydalanuvchi farqni sezmay qoladi.

? DNS standart holatda qaysi port va protokolda ishlaydi?
- TCP 80
+ UDP 53
- TCP 443
- UDP 67
! DNS asosan UDP 53 da ishlaydi (katta javoblar va zona uzatish uchun TCP 53 ham ishlatiladi).

? Razvedka paytida subdomenlar nega muhim?
+ Ularda unutilgan test va eski tizimlar bo'lishi mumkin
+ Ular kompaniya infratuzilmasi tuzilishini ochib beradi
- Subdomenlar doim asosiy saytdan yaxshiroq himoyalangan
- Subdomenlarni faqat domen egasi ko'ra oladi
! dev, test, old kabi subdomenlar ko'pincha yangilanmay qoladi. Ular ochiq manbalardan topiladi va hujum yuzasini kengaytiradi.
:::

:::cards
DNS nima qiladi? :: Domen nomini IP manzilga aylantiradi (va boshqa yozuvlarni saqlaydi).
A, AAAA va CNAME yozuvlari? :: A — nom → IPv4; AAAA — nom → IPv6; CNAME — nom → boshqa nom (taxallus).
MX, NS va TXT yozuvlari? :: MX — pochta serveri; NS — domen uchun mas'ul DNS serverlar; TXT — ixtiyoriy matn (SPF, tasdiqlash kodlari).
DNS so'rovi qanday yo'ldan o'tadi? :: Kesh → hosts → resolver → root → TLD → authoritative server.
hosts fayli qayerda va nima uchun muhim? :: Windows: C:\Windows\System32\drivers\etc\hosts; Linux: /etc/hosts. DNS dan oldin tekshiriladi.
DNS qaysi portda ishlaydi? :: UDP 53 (ba'zan TCP 53).
DNS tunneling nima? :: Ma'lumotni DNS so'rovlari (subdomen nomlari) ichiga kodlab, tarmoqdan yashirin olib chiqish.
Typosquatting nima? :: Mashhur domenga o'xshash nomni ro'yxatdan o'tkazib, foydalanuvchini aldash.
TTL DNS da nimani bildiradi? :: Javob keshda necha soniya saqlanishini.
DNS so'rovi yuborish buyruqlari? :: nslookup example.com; dig example.com MX +short
:::
