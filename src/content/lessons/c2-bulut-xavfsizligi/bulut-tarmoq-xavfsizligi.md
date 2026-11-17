Dushanba ertalab bulut hisobini tekshirasiz va security group'lardan birida shu qoidani ko'rasiz:

| Port | Manba | Tavsif |
|---|---|---|
| 5432 | `0.0.0.0/0` | `temp - Jasur uydan ulanishi uchun` |

Qoida sakkiz oy oldin qo'shilgan. Jasur allaqachon boshqa kompaniyada ishlaydi. Baza esa sakkiz oy davomida butun internetga ochiq turgan — va VPC Flow Logs'da u yerga har kuni yuzlab notanish IP'lar ulanishga uringani ko'rinadi.

Bunday "vaqtinchalik" qoidalar bulut auditlarida eng ko'p topiladigan narsalardan biri. Ular yomon niyat bilan emas, qulaylik uchun paydo bo'ladi — va unutiladi.

c1 bosqichida public va private subnetli VPC qurdingiz, security group zanjirini ko'rdingiz. Bu darsda bulut tarmog'ini **himoyachi ko'zi** bilan ko'ramiz: security group va NACL farqi, chiquvchi trafikni nazorat qilish, xususiy endpointlar, WAF, flow loglar — va ochiq qolgan eshiklarni qanday topish.

## Qatlamlar

Bulut tarmog'ida himoya bir nechta qatlamda turadi — [[defense-in-depth|chuqur himoya]]:

```
 Internet
    │
    ▼
 ┌─────────────────────────────┐
 │ Shield (DDoS) + WAF         │  ← L7: HTTP so'rovlar mazmuni
 │ (CloudFront / ALB oldida)   │
 └──────────────┬──────────────┘
                ▼
 ┌─────────────────────────────┐
 │ NACL (subnet chegarasi)     │  ← stateless, ruxsat va taqiq
 └──────────────┬──────────────┘
                ▼
 ┌─────────────────────────────┐
 │ Security group (instans)    │  ← stateful, faqat ruxsat
 └──────────────┬──────────────┘
                ▼
 ┌─────────────────────────────┐
 │ OS firewall (ufw/nftables)  │  ← c1 bosqichidan
 └──────────────┬──────────────┘
                ▼
              Ilova
```

Har bir qatlam boshqasining xatosini ushlay oladi. Lekin hammasi ham **ilovaning o'zidagi** zaiflikni to'xtatmaydi — buni dars oxirida yana eslaymiz.

## Security group va NACL

| | [[security-group|Security group]] | [[nacl|NACL]] |
|---|---|---|
| Qayerda | Tarmoq interfeysi (instans) darajasida | Subnet chegarasida |
| Holat | **Stateful** — javob paketlari avtomatik o'tadi | **Stateless** — javob uchun ham alohida qoida kerak |
| Qoidalar | Faqat **ruxsat** | Ruxsat **va taqiq** |
| Baholash | Hamma qoidalar birga ko'riladi | Tartib raqami bo'yicha, birinchi mos kelgani hal qiladi |
| Sukut | Kiruvchi — hammasi yopiq, chiquvchi — hammasi ochiq | Sukut NACL — hammasi ochiq; yangi yaratilgan — hammasi yopiq |
| Manba sifatida | IP, CIDR yoki **boshqa security group** | Faqat IP va CIDR |

**Stateless** nimani anglatadi — amaliy misol. Web server 443 portda so'rov qabul qiladi. Mijozning so'rovi `198.51.100.73:51544 → 10.10.1.25:443`. Javob — `10.10.1.25:443 → 198.51.100.73:51544`. Security group javobni o'zi taniydi. NACL esa tanimaydi: chiquvchi yo'nalishda mijozning vaqtinchalik (ephemeral) portlariga — odatda `1024-65535` — ruxsat bo'lmasa, javob tashlanadi va sayt "osilib" qoladi.

| NACL qoida | Yo'nalish | Port | Manba / manzil | Natija |
|---|---|---|---|---|
| 100 | Kiruvchi | 443 | `0.0.0.0/0` | ALLOW |
| 110 | Kiruvchi | 1024-65535 | `0.0.0.0/0` | ALLOW (chiquvchi ulanishlarga javoblar) |
| 200 | Kiruvchi | hammasi | `203.0.113.0/24` | DENY |
| `*` | Kiruvchi | hammasi | `0.0.0.0/0` | DENY |
| 100 | Chiquvchi | 1024-65535 | `0.0.0.0/0` | ALLOW (javoblar) |
| 110 | Chiquvchi | 443 | `0.0.0.0/0` | ALLOW |

E'tibor bering: 200-qoida (`203.0.113.0/24` ni taqiqlash) **ishlamaydi** — u 443 port uchun 100-qoidadan keyin turadi va 100-qoida allaqachon ruxsat bergan. Taqiq qoidalari kichikroq raqam bilan, ya'ni oldinroq turishi kerak. Bu — NACL'dagi klassik xato.

Qachon nima ishlatiladi:

- **Security group** — asosiy, kundalik vosita. Har bir komponent uchun alohida SG, zanjir bilan.
- **NACL** — qo'pol to'siqlar: butun subnet uchun "bu diapazon hech qachon kirmasin", ma'lum yomon IP'larni tez bloklash, DB subnetiga faqat app subnetlardan trafik. Ko'p jamoalar NACL'ni sukut holatida qoldirib, faqat SG bilan ishlaydi — bu ham normal.

## Chiquvchi trafik — unutilgan yo'nalish

Security group sukut bo'yicha **chiquvchi trafikni to'liq ochiq** qoldiradi. Ko'pchilik shunday qoldiradi ham. Lekin SOC tarmog'idagi insidentni eslang: WS-BUX-014 buzilgandan keyin PowerShell `203.0.113.45` ga — C2 serverga — ulangan. Agar o'sha kompyuter faqat ruxsat etilgan manzillarga chiqa olsa, hujumchi buyruq ololmasdi.

Serverlar uchun ham xuddi shunday: Qaydnoma serveri buzilsa, hujumchi undan:

- C2 serverga ulanadi;
- ma'lumotni o'z serveriga yuboradi ([[exfiltration|exfiltration]]);
- qo'shimcha vositalarni yuklab oladi.

Chiquvchi nazorat vositalari:

| Vosita | Nima qiladi | Cheklov |
|---|---|---|
| SG egress qoidalari | Faqat aniq port va manzillarga | Faqat IP/CIDR — domen bo'yicha emas |
| NAT gateway | Private subnetdan chiqishni bitta nuqtaga yig'adi | O'zi filtrlamaydi |
| AWS Network Firewall | Domen nomi (TLS SNI) va protokol bo'yicha filtr | Pullik, sozlash kerak |
| Route 53 Resolver DNS Firewall | Ruxsatsiz domenlarni DNS darajasida bloklaydi | To'g'ridan-to'g'ri IP'ga ulanishni to'xtatmaydi |
| VPC endpoints | AWS xizmatlariga internetsiz yo'l | Faqat AWS xizmatlari uchun |

Ideal holat: ilova serveri faqat bazaga, kerakli AWS xizmatlariga (endpoint orqali) va yangilanish manzillariga chiqa oladi. Qolgan hamma narsa — rad etiladi va jurnalga yoziladi. Rad etilgan chiquvchi ulanish — SOC uchun juda kuchli signal: sog'lom server notanish manzilga chiqishga urinmaydi.

## VPC endpoints — xususiy yo'l

Private subnetdagi server S3 yoki Secrets Manager'ga murojaat qiladi. Endpoint bo'lmasa, trafik NAT orqali internetga chiqib, AWS'ning ommaviy manziliga boradi. Endpoint bilan — AWS tarmog'i ichida qoladi.

| Tur | Xizmatlar | Narxi | Qanday |
|---|---|---|---|
| **Gateway endpoint** | S3, DynamoDB | Bepul | Route table'ga marshrut qo'shiladi |
| **Interface endpoint** (PrivateLink) | Ko'pchilik boshqa xizmatlar (Secrets Manager, STS, SSM…) | Soatbay + GB | Subnetda xususiy IP'li tarmoq interfeysi |

Xavfsizlik bonusi — ikki tomonlama siyosat:

- **Endpoint policy**: shu endpoint orqali qaysi resurslarga borish mumkin. Masalan, faqat o'z hisobingiz bucket'lariga — shunda buzilgan server ma'lumotni **hujumchining** S3 bucket'iga yuklay olmaydi.
- **Bucket policy** sharti `aws:SourceVpce`: bucket'ga faqat shu endpoint orqali kirish mumkin — kalit o'g'irlansa ham, internetdan ishlatib bo'lmaydi.

```json
{
  "Sid": "OnlyFromQaydnomaVpce",
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": [
    "arn:aws:s3:::qaydnoma-uploads-111122223333",
    "arn:aws:s3:::qaydnoma-uploads-111122223333/*"
  ],
  "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0example1234" } }
}
```

:::warn
Bunday `Deny` siyosatini qo'yishdan oldin o'zingizni ham hisobga oling: konsoldan bucket'ni ko'rish ham endi rad etiladi. Amalda ma'murlar uchun istisno sharti qo'shiladi (masalan, aniq admin roli uchun). Siyosatni avval test bucket'da sinang.
:::

## VPC'larni bog'lash

| Usul | Nima | Xavfsizlik nuqtasi |
|---|---|---|
| VPC peering | Ikki VPC orasida to'g'ridan-to'g'ri bog'lanish | Tranzitiv emas: A–B va B–C bog'langan bo'lsa ham, A C'ga o'tmaydi |
| Transit Gateway | Ko'p VPC va VPN uchun markaziy "router" | Markaziy marshrut jadvallari — segmentatsiyani shu yerda boshqarish |
| Site-to-Site VPN | Ofis tarmog'i bilan IPsec tunnel | c1 bosqichidagi VPN; ofis buzilsa — bulutga yo'l |
| Direct Connect | Ofis yoki ma'lumot markazidan AWS'ga ajratilgan liniya | Sukut bo'yicha shifrlanmaydi — kerak bo'lsa ustidan shifrlash |

Bog'lanishlar ko'paygan sari "tekis tarmoq" muammosi qaytadi: hamma VPC'lar bir-biriga erkin yeta oladigan Transit Gateway — bulutdagi tekis tarmoq. Oldingi bosqichdagi oqimlar jadvali bu yerda ham kerak.

## Chekka himoya: WAF va Shield

**AWS WAF** — ALB, CloudFront yoki API Gateway oldida HTTP so'rovlarni tekshiradi:

| Qoida turi | Misol |
|---|---|
| Managed rule groups | AWS va sotuvchilar tayyorlagan: keng tarqalgan hujum shakllari, ma'lum yomon IP'lar |
| Rate-based | Bitta IP'dan 5 daqiqada N dan ko'p so'rov — bloklash (brute force, skanerlar) |
| Geo | Ma'lum mamlakatlardan so'rovlarni bloklash yoki CAPTCHA |
| Custom | Masalan, `/admin` yo'liga faqat ofis IP'laridan |

AppSec tarmog'idan bilasiz: [[waf|WAF]] — vaqtinchalik qalqon va qo'shimcha qatlam. U kodni tuzatmaydi, aylanib o'tiladi va noto'g'ri sozlansa, oddiy foydalanuvchilarni bloklaydi. Yangi qoidalarni avval **Count** rejimida (faqat hisoblash, bloklamasdan) ishga tushirib, jurnalga qarab keyin **Block** ga o'tkazing.

**AWS Shield** — DDoS himoyasi. Shield Standard hamma hisoblarda bepul va avtomatik (tarmoq darajasidagi hujumlar). Shield Advanced — pullik, yirik hujumlar uchun javob jamoasi bilan.

## VPC Flow Logs

Flow log — tarmoq interfeysi orqali o'tgan har bir ulanish haqida qisqa yozuv. Paket mazmuni emas, faqat "kim, kimga, qaysi port, ruxsat yoki rad".

```
2 111122223333 eni-0a1b2c3d 198.51.100.73 10.10.21.15 51544 5432 6 3 180 1763290800 1763290860 REJECT OK
│ │            │            │             │           │     │    │ │ │   │          │          │      │
│ hisob        interfeys    manba IP      manzil IP   manba port │ │ bayt boshlanish tugash    harakat holat
versiya                                               manzil port│ paketlar
                                                          protokol (6 = TCP)
```

Bu qator: `198.51.100.73` bazaning 5432 portiga ulanmoqchi bo'ldi — **REJECT**. Dars boshidagi qoida bo'lganida, bu yerda `ACCEPT` turgan bo'lardi.

Flow loglardan nimani qidirish kerak (b1 bosqichidagi tarmoq loglari):

- Private subnetlarga tashqi IP'lardan `ACCEPT` — biror narsa ochiq qolgan.
- Serverlardan notanish tashqi IP'larga chiquvchi `ACCEPT` — ayniqsa muntazam, bir xil hajmli (beaconing).
- Bitta manbadan ko'p portlarga `REJECT` — skanerlash.
- Odatdagidan ancha katta chiquvchi baytlar — exfiltration ehtimoli.

Flow loglar c2 bosqichidagi monitoring darsida GuardDuty uchun ham manba bo'ladi.

## Ochiq eshiklarni topish

Eng ko'p uchraydigan tarmoq xatolari:

| Xato | Nega xavfli |
|---|---|
| 22 yoki 3389 `0.0.0.0/0` dan | Boshqaruv eshigi butun internetga |
| Baza portlari (3306, 5432, 1433, 6379, 27017, 9200) ommaga | Ma'lumot to'g'ridan-to'g'ri |
| IPv6 uchun `::/0` unutilgan | IPv4 yopiq, IPv6 orqali ochiq |
| `default` security group ishlatilmoqda | U ko'pincha keng va hamma uni biriktiradi |
| Private bo'lishi kerak bo'lgan subnetda "auto-assign public IP" yoqilgan | Server tasodifan internetdan ko'rinadi |
| Tavsifsiz yoki "temp" qoidalar | Kimniki va nima uchun ekani noma'lum |

CLI bilan tez tekshiruv:

```bash
# 0.0.0.0/0 ga ochiq qoidasi bor security group'lar
aws ec2 describe-security-groups \
  --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \
  --query "SecurityGroups[].{ID:GroupId,Name:GroupName}" --output table

# IPv6 uchun ham
aws ec2 describe-security-groups \
  --filters Name=ip-permission.ipv6-cidr,Values=::/0 \
  --query "SecurityGroups[].{ID:GroupId,Name:GroupName}" --output table
```

Natijadagi har bir guruh uchun savol: qaysi port va bu qasddanmi? ALB'ning 443 porti — normal. Bazaning 5432 porti — favqulodda holat. Bunday tekshiruvni har safar qo'lda qilmaslik uchun CSPM vositalari (shu bosqichdagi CIS Benchmarks darsi) va AWS Config qoidalari bor.

## Tarmoq nazorati nimani qilmaydi

- **Bulut boshqaruv API'si internetda.** Kalit o'g'irlansa, hujumchi security group'lardan umuman o'tmaydi — u to'g'ridan-to'g'ri AWS API orqali ishlaydi. Bulutda tarmoq — yordamchi chegara, asosiy chegara — IAM.
- WAF va SG ilovadagi IDOR yoki SQL injection'ni tuzatmaydi: 443 port ochiq bo'lishi kerak.
- Flow loglar paket mazmunini ko'rsatmaydi va real vaqtda bloklamaydi.
- Chiquvchi filtrlash qat'iy bo'lmasa (masalan, "443 hamma joyga"), hujumchi o'z serveriga 443 orqali chiqadi.

:::try
1. Quyidagi NACL'da xato bormi? Kiruvchi: `100 ALLOW 443 0.0.0.0/0`, `* DENY all`. Chiquvchi: `100 ALLOW 443 0.0.0.0/0`, `* DENY all`. Web sayt ishlaydimi?
2. O'quv hisobingizda yuqoridagi ikki `describe-security-groups` buyrug'ini ishga tushiring. Natijani "kerakli" va "yopish kerak" ga ajrating.
3. Qaydnoma app serverlari uchun chiquvchi qoidalar ro'yxatini yozing: qayerga, qaysi port, nega.
4. Bitta VPC'da flow logs'ni yoqing (CloudWatch Logs'ga), 10 daqiqa kuting va `REJECT` yozuvlarini toping. Kimlar ulanishga urinmoqda?

**Javoblar:**
1. Ishlamaydi. Mijozning so'roviga javob uning vaqtinchalik portiga (`1024-65535`) ketadi; chiquvchi yo'nalishda faqat 443 ochiq — javob tashlanadi. NACL stateless, shuning uchun chiquvchida `1024-65535` ga ruxsat kerak.
2. Odatda: ALB SG'sidagi 443/80 — kerakli. Har qanday 22, 3389 yoki baza portlari — yopish yoki aniq IP'ga toraytirish (yoki Session Manager'ga o'tish).
3. Misol: `sg-db` ga 5432 (baza); interface endpoint SG'lariga 443 (Secrets Manager, SSM); S3 — gateway endpoint (prefiks ro'yxati, 443); OS yangilanishlari uchun 443 — iloji bo'lsa Network Firewall orqali faqat repozitoriy domenlariga. Qolgani — yo'q.
4. Ommaviy IP'li instansda bir necha daqiqada 22, 23, 3389, 445 kabi portlarga turli IP'lardan `REJECT` lar ko'rinadi — c1 bosqichidagi avtomatik skanerlar.
:::

## Xulosa

- Bulut tarmog'ida himoya qatlamli: WAF/Shield → NACL → security group → OS firewall → ilova.
- Security group — stateful, faqat ruxsat, instans darajasida, boshqa SG'ga havola qila oladi. NACL — stateless, ruxsat va taqiq, subnet darajasida, tartib raqami bo'yicha.
- NACL'da javob portlarini (`1024-65535`) va qoidalar tartibini unutmang.
- Chiquvchi trafikni nazorat qilish C2 va exfiltration'ni qiyinlashtiradi; rad etilgan chiquvchi ulanish — kuchli signal.
- VPC endpoints trafikni xususiy saqlaydi; endpoint policy va `aws:SourceVpce` sharti kalit o'g'irlansa ham himoya beradi.
- WAF — qo'shimcha qatlam, kod tuzatish emas; avval Count, keyin Block.
- Flow logs: kim, kimga, qaysi port, ACCEPT yoki REJECT. Mazmun yo'q.
- Tarmoq — yordamchi chegara; bulut API'si internetda, asosiy chegara — IAM.

:::quiz
? Security group va NACL'ning asosiy farqi qaysi?
+ Security group stateful va faqat ruxsat qoidali; NACL stateless va ruxsat hamda taqiq qoidali
- Ikkalasi bir xil, faqat nomi boshqa
- NACL instans darajasida, SG subnet darajasida
- Security group faqat IPv6 uchun
! SG instans darajasida va javoblarni o'zi taniydi; NACL subnet chegarasida va har bir yo'nalish uchun alohida qoida talab qiladi.

? NACL'da kiruvchi 443 ochiq, chiquvchi faqat 443 ochiq. Sayt nega ishlamaydi?
- 443 port noto'g'ri
+ Javob mijozning vaqtinchalik portlariga (1024-65535) ketadi va chiquvchi qoida uni tashlaydi
- NACL faqat UDP'ni o'tkazadi
- Security group javobni bloklaydi
! NACL stateless — javob paketlari uchun ham ruxsat kerak.

? NACL'da `100 ALLOW 443 0.0.0.0/0` va `200 DENY all 203.0.113.0/24`. 203.0.113.5 dan 443 ga so'rov nima bo'ladi?
- Rad etiladi, chunki DENY bor
+ O'tadi, chunki birinchi mos kelgan 100-qoida ruxsat beradi
- Tasodifiy
- Ikkala qoida ham qo'llanmaydi
! NACL qoidalari tartib raqami bo'yicha tekshiriladi; taqiq oldinroq (kichikroq raqam bilan) turishi kerak.

? Nega serverlardan chiquvchi trafikni cheklash foydali?
- Bu internet tezligini oshiradi
+ Buzilgan server C2 ga ulanishi, ma'lumotni chiqarishi va vosita yuklab olishi qiyinlashadi
- Bu kiruvchi hujumlarni to'xtatadi
- Bu AWS xarajatini nolga tushiradi
! Egress filtrlash hujumchining keyingi qadamlarini to'sadi va rad etilgan urinishlar signal beradi.

? S3 bucket policy'dagi `aws:SourceVpce` sharti qanday himoya beradi?
- Bucket'ni shifrlaydi
+ Bucket'ga faqat belgilangan VPC endpoint orqali kirish mumkin bo'ladi — o'g'irlangan kalitni internetdan ishlatib bo'lmaydi
- Bucket'ni ommaviy qiladi
- Versioning'ni yoqadi
! Kirish tarmoq yo'liga bog'lanadi: kalitning o'zi yetarli bo'lmaydi.

? Gateway endpoint qaysi xizmatlar uchun mavjud?
+ S3 va DynamoDB
- Barcha AWS xizmatlari
- Faqat EC2
- Faqat IAM
! Gateway endpoint — bepul, S3 va DynamoDB uchun; boshqalari uchun interface endpoint (PrivateLink).

? Yangi WAF qoidasini ishlab chiqarishga qanday kiritish to'g'ri?
- Darhol Block rejimida
+ Avval Count rejimida, jurnalni tahlil qilib, keyin Block'ga
- Faqat dam olish kunlari
- WAF qoidalarini sinash mumkin emas
! Count rejimi soxta ijobiy natijalarni haqiqiy foydalanuvchilarni bloklashdan oldin ko'rsatadi.

? VPC Flow Log yozuvida nima YO'Q?
- Manba va manzil IP
- Port va protokol
- ACCEPT yoki REJECT
+ Paket mazmuni (masalan, HTTP so'rov tanasi)
! Flow log — ulanish metama'lumoti; mazmunni ko'rish uchun boshqa vositalar kerak.

? Security group'lar IPv4 uchun yopiq, lekin `::/0` dan 22-portga ruxsat qolgan. Xavf bormi?
+ Ha, server IPv6 manzilga ega bo'lsa, SSH IPv6 orqali butun internetga ochiq
- Yo'q, IPv6 hech kim ishlatmaydi
- Yo'q, AWS IPv6'ni avtomatik bloklaydi
- Faqat NACL bo'lmasa
! IPv6 qoidalari alohida tekshirilishi kerak — klassik unutilgan joy.

? Hujumchi o'g'irlangan access key bilan S3 bucket'ni ommaga ochdi. Qaysi tarmoq nazorati buni to'xtatardi?
- Security group
- NACL
- VPC Flow Logs
+ Hech biri — boshqaruv API'si internetda; buni IAM, SCP va monitoring to'xtatadi
! Bulutda tarmoq — yordamchi chegara. API amallari security group'dan o'tmaydi.
:::

:::cards
Security group :: Instans darajasidagi stateful firewall, faqat ruxsat qoidalari
NACL :: Subnet chegarasidagi stateless filtr; ruxsat va taqiq, tartib raqami bo'yicha
Ephemeral portlar :: Mijozning javob qabul qiladigan vaqtinchalik portlari, odatda 1024-65535
Egress filtrlash :: Chiquvchi trafikni faqat kerakli manzillarga cheklash
Gateway endpoint :: S3 va DynamoDB uchun bepul xususiy yo'l
Interface endpoint :: PrivateLink — subnetdagi xususiy IP orqali AWS xizmatiga yo'l
aws:SourceVpce :: Faqat belgilangan endpoint orqali kirishga ruxsat beruvchi shart
VPC peering :: Ikki VPC orasidagi to'g'ridan-to'g'ri, tranzitiv bo'lmagan bog'lanish
AWS WAF :: HTTP so'rovlarni qoidalar bilan tekshiruvchi L7 filtr; kodni tuzatmaydi
Shield Standard :: Barcha AWS hisoblarida bepul tarmoq darajasidagi DDoS himoyasi
VPC Flow Logs :: Ulanishlar metama'lumoti: kim, kimga, qaysi port, ACCEPT yoki REJECT
Bulutda asosiy chegara :: IAM — boshqaruv API'si internetda va tarmoqdan o'tmaydi
:::
