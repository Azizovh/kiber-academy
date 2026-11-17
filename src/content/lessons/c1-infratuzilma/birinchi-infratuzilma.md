Qaydnoma bitta EC2 serverda ishlaydi: nginx, ilova va baza — hammasi bir joyda. Bir kuni kechasi AWS o'sha server turgan fizik mashinada texnik ish olib boradi va serveringiz qayta ishga tushadi. Yoki diskda joy tugaydi. Yoki yangilanishdan keyin nginx ishga tushmaydi. Natija bir xil: **sayt yo'q**, foydalanuvchilar qaydlariga kira olmaydi, va siz uyqudan uyg'onib, nima bo'lganini qidirasiz.

Bundan tashqari, baza bilan ilova bitta serverda bo'lgani uchun ilovadagi bitta zaiflik — bazaning to'liq nusxasi hujumchida degani.

Bu darsda c1 bosqichida o'rganganlarni birlashtirib, haqiqiy ishlab chiqarish arxitekturasini quramiz: **uch qatlamli ilova** — balanslovchi, ilova serverlari va baza, har biri o'z subnetida, o'z firewall'i bilan, ikkita ma'lumot markazida. Keyin uning sxemasini chizamiz va — eng muhimi — ishni tugatgach hammasini to'g'ri o'chirib, hisobni nolga tushiramiz.

## Uch qatlam

```
                         Internet
                            │ 443
 ┌──────────────────────────┼──────────────────────────────┐
 │ VPC 10.10.0.0/16         │                              │
 │                 ┌────────┴────────┐                     │
 │  PUBLIC         │  ALB (balans-   │   NAT gateway       │
 │  10.10.1.0/24   │  lovchi, TLS)   │   (chiqish uchun)   │
 │  10.10.2.0/24   └───┬─────────┬───┘                     │
 │                     │ 8000    │ 8000                    │
 │  APP           ┌────┴───┐ ┌───┴────┐                    │
 │  10.10.11.0/24 │ EC2 a  │ │ EC2 b  │  Auto Scaling Group│
 │  10.10.12.0/24 └────┬───┘ └───┬────┘                    │
 │                     │ 5432    │ 5432                    │
 │  DB            ┌────┴─────────┴────┐                    │
 │  10.10.21.0/24 │ RDS PostgreSQL    │  Multi-AZ:         │
 │  10.10.22.0/24 │ asosiy ⇄ zaxira   │  a va b zonalarda  │
 │                └───────────────────┘                    │
 └─────────────────────────────────────────────────────────┘
        AZ a: .1, .11, .21 subnetlar   AZ b: .2, .12, .22 subnetlar
```

| Qatlam | Nima | Subnet | Internetdan ko'rinadimi |
|---|---|---|---|
| Taqdimot (presentation) | Application Load Balancer — TLS'ni tugatadi, so'rovlarni taqsimlaydi | Public | Ha, faqat 443 va 80 |
| Ilova (application) | EC2 serverlar, Qaydnoma | Private (app) | Yo'q |
| Ma'lumot (data) | RDS PostgreSQL | Private (db) | Yo'q |

Nima yutdik:

- **Ishonchlilik:** bitta server yoki hatto butun bitta AZ ishdan chiqsa, sayt ishlaydi. Auto Scaling Group buzilgan serverni avtomatik almashtiradi.
- **Xavfsizlik:** ilova serverlari va baza internetdan **umuman** ko'rinmaydi. Har bir qatlam faqat qo'shnisidan, faqat bitta portda so'rov qabul qiladi.
- **Kengayish:** yuk oshsa — ko'proq server; baza alohida kengayadi.

## Tarmoq rejasi

Oldingi darsdagi segmentatsiya tamoyillari: har bir qatlam — alohida subnet, har bir AZ'da bittadan.

| Subnet | CIDR | AZ | Route table |
|---|---|---|---|
| public-a | 10.10.1.0/24 | a | `0.0.0.0/0 → IGW` |
| public-b | 10.10.2.0/24 | b | `0.0.0.0/0 → IGW` |
| app-a | 10.10.11.0/24 | a | `0.0.0.0/0 → NAT` |
| app-b | 10.10.12.0/24 | b | `0.0.0.0/0 → NAT` |
| db-a | 10.10.21.0/24 | a | faqat `local` |
| db-b | 10.10.22.0/24 | b | faqat `local` |

DB subnetlarning internetga umuman yo'li yo'q — hatto chiqish uchun ham. Bazaga internet kerak emas.

App subnetlar NAT orqali tashqariga chiqa oladi (yangilanishlar uchun). S3 uchun esa NAT o'rniga **VPC gateway endpoint** qo'shamiz: S3 trafigi AWS tarmog'idan chiqmaydi, NAT xarajati kamayadi va bucket siyosatida "faqat shu VPC'dan" degan shart qo'yish mumkin bo'ladi.

## Security group zanjiri

Eng chiroyli g'oya: security group qoidasida manba sifatida **IP manzil emas, boshqa security group** ko'rsatiladi.

| Security group | Kiruvchi qoida | Manba |
|---|---|---|
| `sg-alb` | 443, 80 | `0.0.0.0/0` |
| `sg-app` | 8000 | `sg-alb` |
| `sg-db` | 5432 | `sg-app` |

```
 Internet ──443──▶ [sg-alb] ──8000──▶ [sg-app] ──5432──▶ [sg-db]
          hamma          faqat ALB'dan       faqat ilovadan
```

Bu nimani beradi? Auto Scaling yangi server qo'shsa, uning IP manzili oldindan noma'lum — lekin u `sg-app` ga kirgani uchun bazaga avtomatik ulana oladi. Va aksincha: VPC ichidagi boshqa har qanday server (masalan, kimdir test uchun ko'targan) `sg-app` da bo'lmasa, bazaga yeta olmaydi. Qoidalar **rol bo'yicha**, manzil bo'yicha emas.

## Qatlamlarni sozlash

**ALB:**

- HTTPS listener (443) — sertifikat **ACM** (AWS Certificate Manager) dan, bepul, avtomatik yangilanadi.
- HTTP listener (80) — faqat 443 ga yo'naltirish (redirect).
- Zamonaviy TLS siyosati (eski TLS versiyalarisiz).
- Target group: app serverlar, `/health` yo'li bo'yicha sog'liq tekshiruvi.
- Kirish jurnallari (access logs) S3'ga yoqilgan — kim, qachon, qanday so'rov (b1 bosqichidagi web loglar).

**Ilova serverlari (launch template + Auto Scaling Group):**

- Private app subnetlarda, ommaviy IP **yo'q**.
- IAM role: faqat kerakli S3 bucket va kerakli sir uchun ruxsat.
- IMDSv2 majburiy.
- SSH kaliti yo'q, 22-port yopiq — kirish faqat Session Manager orqali.
- User data skripti: paketlarni o'rnatish, ilovani yuklab olish, xizmatni yoqish. **Sirlarsiz**: baza paroli ishga tushishda Secrets Manager'dan olinadi.
- Minimum 2, maksimum 4 server, ikkala AZ bo'ylab.

**Baza (RDS):**

- DB subnet group: db-a va db-b.
- Multi-AZ: asosiy nusxa bitta AZ'da, sinxron zaxira nusxa boshqasida; asosiy ishdan chiqsa, avtomatik o'tish.
- Publicly accessible: **No**.
- Shifrlash (KMS) yoqilgan, avtomatik zaxira saqlash muddati, masalan, 7 kun.
- Deletion protection: yoqilgan — bitta xato bosish bilan baza o'chmasin.
- Master parol — RDS'ning Secrets Manager integratsiyasi orqali, avtomatik almashtirish bilan.

**Jurnallar:**

| Manba | Nima beradi |
|---|---|
| CloudTrail | Kim infratuzilmani o'zgartirdi |
| ALB access logs | Kim saytga qanday so'rov yubordi |
| VPC Flow Logs | Qaysi IP qaysi IP'ga qaysi portda ulandi (yoki rad etildi) |
| Ilova jurnali (CloudWatch Logs) | Qaydnoma'ning o'z xabarlari, xatolari |

## Qurish tartibi

Hamma narsani bir vaqtda qilmang. Har bir qadamdan keyin tekshiring:

1. VPC, 6 subnet, IGW, route table'lar. Tekshiruv: route table'lar to'g'ri subnetlarga biriktirilgan.
2. Security group'lar zanjiri.
3. RDS (eng uzoq yaratiladi — 10–20 daqiqa, shuning uchun erta boshlang).
4. Secrets Manager'dagi sir, IAM role.
5. Launch template, bitta serverni qo'lda sinash (Session Manager orqali kirib, ilova bazaga ulanishini tekshirish).
6. Target group, ALB, listener'lar.
7. Auto Scaling Group.
8. DNS: domen ALB'ga yo'naltiriladi.

## Arxitekturani sinash

Qurdingiz — endi uni **buzishga** harakat qiling (o'z hisobingizda, o'z resurslaringizga):

| Sinov | Kutilgan natija |
|---|---|
| `curl -I https://qaydnoma.example.com` | `200` yoki `302`, haqiqiy sertifikat |
| `curl -I http://qaydnoma.example.com` | `301` → https |
| App serverning private IP'siga internetdan ulanish | Imkonsiz — ommaviy IP yo'q |
| RDS endpoint'iga o'z kompyuteringizdan `nc -zv ... 5432` | Ulanmaydi |
| Bitta app serverni qo'lda to'xtatish | Sayt ishlayveradi; bir necha daqiqada ASG yangi server ko'taradi |
| RDS'da "Reboot with failover" | Bir necha soniyalik uzilish, keyin ishlaydi |

Bu — "yozib qo'yilgan" arxitektura bilan "haqiqatan ishlaydigan" arxitektura orasidagi farq. Ko'p jamoalarda failover hech qachon sinalmagan — va u birinchi marta kerak bo'lgan kuni ishlamaydi.

## Sxemani chizish

Arxitektura sxemasi — hujjat, portfolio elementi va xavfsizlik vositasi. a3 bosqichidagi tahdid modellashtirishda [[dfd|DFD]] chizgansiz; bu uning infratuzilma ko'rinishi.

Sxemada bo'lishi kerak:

- VPC, subnetlar (CIDR bilan), AZ'lar.
- Har bir komponent va uning security group'i.
- Oqimlar: strelka, port, protokol (`443/HTTPS`, `5432/TCP`).
- **Ishonch chegaralari**: internet → public, public → private.
- Ma'lumot qayerda saqlanadi va shifrlanganmi.
- Jurnallar qayerga ketadi.

Vosita: diagrams.net (bepul, AWS ikonkalari bor), yoki kod bilan — Mermaid, Python `diagrams` kutubxonasi. Kod bilan chizilgan sxema Git'da saqlanadi va infratuzilma bilan birga yangilanadi.

:::tip
Sxemani chizib bo'lgach, unga hujumchi ko'zi bilan qarang: "Agar ALB ortidagi bitta server buzilsa, undan qayerga yeta olaman?" Javob: faqat bazaning 5432 portiga (va server rolida ruxsat berilgan S3 va sirga). Bu savolga javob qanchalik qisqa bo'lsa, arxitektura shunchalik yaxshi.
:::

## Xarajatni nazorat qilish

O'quv loyihasida xarajat — haqiqiy xavf. Bu arxitekturada nima pul oladi:

| Resurs | Qanday to'lanadi | Eslatma |
|---|---|---|
| ALB | Soatbay + trafik | Ishlatilmasa ham |
| NAT gateway | Soatbay + har GB | Ko'pincha eng qimmat qator |
| EC2 | Soatbay (2 ta server) | |
| RDS Multi-AZ | Soatbay, ikki nusxa — taxminan ikki baravar | O'quvda Single-AZ yetarli |
| Ishlatilmayotgan Elastic IP | Soatbay | Klassik unutilgan narsa |
| EBS disklar va snapshotlar | GB/oy | Server o'chgandan keyin ham qolishi mumkin |
| CloudWatch Logs | GB | Kichik |

**Teglar** — xarajat va tartib uchun. Har bir resursga: `Project=qaydnoma`, `Env=lab`, `Owner=aziz`. Keyin:

- **Tag Editor / Resource Groups** — `Project=qaydnoma` tegli barcha resurslarni barcha regionlarda topish.
- **Cost Explorer** — xarajatni teg bo'yicha ko'rish.

Teglar xavfsizlik uchun ham foydali: insident paytida "bu server kimniki va nima uchun?" degan savolga javob beradi.

**O'chirish tartibi** (bog'liqliklar tufayli tartib muhim):

1. Auto Scaling Group (u serverlarni o'zi o'chiradi; avval serverlarni o'chirsangiz, ASG yangilarini ko'taradi).
2. ALB va target group.
3. RDS — deletion protection'ni o'chirib, so'ng o'chirish; "final snapshot" kerakmi — qaror qiling (snapshot ham pul oladi).
4. NAT gateway, keyin uning Elastic IP'sini **bo'shatish** (release).
5. VPC endpoint'lar, VPC (subnetlar va route table'lar u bilan birga o'chadi).
6. Secrets Manager siri (o'chirish 7–30 kun kutish bilan rejalashtiriladi).
7. Ertasi kuni: Billing'da va Tag Editor'da hech narsa qolmaganini tekshirish.

Bu qo'lda o'chirish og'riqli ekanini sezasiz — c3 bosqichida Terraform bilan hammasi bitta `terraform destroy` bo'ladi.

## Well-Architected Framework

AWS'ning yaxshi arxitektura tamoyillari to'plami — oltita "ustun" (pillar):

| Ustun | Savol |
|---|---|
| Operational excellence | Tizimni qanday boshqaramiz va yaxshilaymiz? |
| **Security** | Ma'lumot, tizim va identifikatsiyani qanday himoyalaymiz? |
| Reliability | Nosozlikdan qanday tiklanamiz? |
| Performance efficiency | Resurslardan samarali foydalanamizmi? |
| Cost optimization | Ortiqcha to'lamayapmizmi? |
| Sustainability | Atrof-muhitga ta'sirni kamaytiramizmi? |

Xavfsizlik muhandisi sifatida Security ustunining hujjatini (roadmap'dagi havola) o'qib chiqing — c4 bosqichidagi portfolio loyihasi unga tayanadi.

## Bu arxitektura nimani qilmaydi

- Qaydnoma'dagi ilova zaifliklarini yopmaydi. Bitta app server buzilsa, hujumchi bazaga **ilovaning o'z huquqlari bilan** ulanadi — shuning uchun bazadagi ilova foydalanuvchisi ham eng kam imtiyozli bo'lishi kerak.
- ALB o'zi hujumlarni filtrlamaydi; buning uchun WAF qo'shiladi (c2 bosqichi).
- Konsolda qo'lda qurilgan infratuzilma qayta qurib bo'lmaydigan "qor parchasi": nima qayerda qanday sozlanganini hech kim aniq eslamaydi. Kod sifatida infratuzilma (c3) shuning uchun kerak.

:::try
1. Yuqoridagi arxitekturani o'quv hisobingizda quring (RDS Single-AZ, eng kichik server turlari, byudjet ogohlantirishi yoqilgan). Faqat bir necha soatga.
2. "Arxitekturani sinash" jadvalidagi har bir sinovni bajaring va natijani yozing.
3. Sxemani diagrams.net yoki Mermaid bilan chizing: subnetlar, security group'lar, portlar, ishonch chegaralari.
4. Savol: kimdir sinov uchun public subnetda yangi EC2 server ko'tardi va unga `sg-default` biriktirdi. U bazaga ulana oladimi?
5. Hammasini o'chiring va ertasi kuni Tag Editor'da `Project=qaydnoma` bo'yicha qidiring.

**Javoblar:**
1–2. Odatiy muammolar: target'lar "unhealthy" — `sg-app` ALB'dan 8000 portga ruxsat bermagan yoki `/health` yo'li yo'q; server bazaga ulanmaydi — `sg-db` manbasi `sg-app` emas, yoki DB subnet group noto'g'ri.
3. Sxemada ikkita ishonch chegarasi aniq ko'rinishi kerak: internet → ALB va ALB → private subnetlar.
4. Yo'q. `sg-db` faqat `sg-app` dan kelgan ulanishlarga ruxsat beradi; yangi server `sg-app` da emas. Security group zanjirining afzalligi aynan shu.
5. Agar biror narsa topilsa — ko'pincha boshqa regionda yoki tegsiz yaratilgan resurs (masalan, NAT'ning Elastic IP'si, avtomatik yaratilgan snapshot).
:::

## Xulosa

- Uch qatlam: ALB (public) → ilova serverlari (private) → baza (private, internetsiz). Har bir qatlam faqat qo'shnisidan, faqat bitta portda.
- Ikkita AZ, Auto Scaling Group va RDS Multi-AZ — bitta server yoki ma'lumot markazi ishdan chiqsa ham sayt ishlaydi.
- Security group zanjiri: manba sifatida IP emas, boshqa security group — qoidalar rol bo'yicha.
- Serverlarda ommaviy IP, SSH kaliti va sirlar yo'q; IAM role, IMDSv2, Session Manager.
- Arxitekturani sinab ko'ring: to'g'ridan-to'g'ri ulanishlar rad etilishi, failover ishlashi kerak.
- Sxema — hujjat, portfolio va xavfsizlik vositasi: oqimlar, portlar, ishonch chegaralari.
- Teglar, Cost Explorer va to'g'ri tartibdagi o'chirish — xarajat nazorati. Qo'lda qurish og'riqli — keyingi qadam IaC.

:::quiz
? Uch qatlamli arxitekturada qaysi komponent internetdan to'g'ridan-to'g'ri ko'rinadi?
+ Faqat Application Load Balancer
- Ilova serverlari
- RDS bazasi
- Hammasi
! Ilova serverlari va baza private subnetlarda, ommaviy IP'siz; tashqariga faqat ALB chiqadi.

? `sg-db` qoidasida manba sifatida `sg-app` ko'rsatildi. Bu nimani bildiradi?
- Faqat bitta aniq IP manzildan ulanish mumkin
+ `sg-app` biriktirilgan har qanday resurs (masalan, ASG qo'shgan yangi server) bazaga ulana oladi, boshqalar — yo'q
- Butun VPC bazaga ulana oladi
- Baza internetga ochiladi
! Security group'ga havola qilish qoidani IP emas, rol bo'yicha qiladi.

? Nega DB subnetlarning route table'ida `0.0.0.0/0` marshruti yo'q?
- Bu xato, baza internetsiz ishlamaydi
+ Bazaga internetga chiqish ham, internetdan kirish ham kerak emas
- RDS faqat IPv6 da ishlaydi
- NAT gateway bazani sekinlashtiradi
! Kerak bo'lmagan yo'l — ochilmaydi. Boshqariladigan baza yangilanishini AWS o'zi bajaradi.

? Auto Scaling Group'ning xavfsizlik va ishonchlilik uchun foydasi nima?
- U ilova kodidagi zaifliklarni tuzatadi
+ Buzilgan yoki ishdan chiqqan serverni avtomatik almashtiradi va yukka qarab server sonini o'zgartiradi
- U bazani shifrlaydi
- U SSH kalitlarini boshqaradi
! ASG belgilangan sondagi sog'lom serverlarni ushlab turadi.

? Nega ilova serverlarining user data skriptiga baza parolini yozmaslik kerak?
- User data ishlamaydi
+ User data metadata orqali server ichidan o'qiladi va konsolda ko'rinadi; sir Secrets Manager'dan olinishi kerak
- Parol juda uzun bo'ladi
- RDS parolni qabul qilmaydi
! User data sir saqlash joyi emas; IMDS orqali o'qish mumkin.

? RDS Multi-AZ nima beradi?
- Bazani ikki regionga nusxalaydi
+ Boshqa AZ'da sinxron zaxira nusxa saqlab, asosiy ishdan chiqsa avtomatik o'tadi
- Bazani internetga ochadi
- Bazani bepul qiladi
! Multi-AZ — ishonchlilik uchun; narxi taxminan ikki baravar.

? Resurslarni o'chirishda nega avval Auto Scaling Group o'chiriladi?
- Bu muhim emas
+ Agar avval serverlarni o'chirsangiz, ASG ularning o'rniga yangilarini ko'taradi
- ALB'siz ASG o'chmaydi
- RDS'ni o'chirish uchun ASG kerak
! ASG belgilangan server sonini saqlashga harakat qiladi — uni birinchi o'chirish kerak.

? Arxitektura sxemasida xavfsizlik uchun nima albatta ko'rsatilishi kerak?
- Faqat server nomlari
- Faqat xarajat
+ Oqimlar (port va protokol bilan) va ishonch chegaralari
- Faqat logotiplar
! Sxema hujumchi qayerdan qayerga yeta olishini ko'rsatishi kerak.

? S3 uchun VPC gateway endpoint nima beradi?
- S3 bucket'ni ommaviy qiladi
+ S3 trafigi AWS tarmog'idan chiqmaydi, NAT xarajati kamayadi va bucket siyosatida VPC sharti qo'yish mumkin
- S3'ni shifrlashni o'chiradi
- EC2'ga ommaviy IP beradi
! Gateway endpoint — xususiy yo'l; xavfsizlik va xarajat uchun foydali.

? Kimdir public subnetda `sg-default` bilan test serveri ko'tardi. U bazaga ulana oladimi?
- Ha, chunki u VPC ichida
+ Yo'q, `sg-db` faqat `sg-app` dan ulanishga ruxsat beradi
- Ha, agar u 5432 portni bilsa
- Faqat Session Manager orqali
! VPC ichida bo'lish yetarli emas; security group zanjiri rol bo'yicha ruxsat beradi.
:::

:::cards
Uch qatlamli arxitektura :: Taqdimot (ALB), ilova (serverlar), ma'lumot (baza) — har biri alohida subnetda
ALB :: Application Load Balancer — TLS'ni tugatadi va so'rovlarni serverlar orasida taqsimlaydi
Auto Scaling Group :: Belgilangan sondagi sog'lom serverlarni avtomatik ushlab turadi
RDS Multi-AZ :: Boshqa AZ'dagi sinxron zaxira nusxa va avtomatik o'tish
Security group zanjiri :: Manba sifatida boshqa SG — qoidalar IP emas, rol bo'yicha
ACM :: AWS Certificate Manager — bepul, avtomatik yangilanadigan TLS sertifikatlar
VPC gateway endpoint :: S3 trafigini internet va NAT'siz, AWS ichida o'tkazadi
VPC Flow Logs :: Qaysi IP qaysi IP'ga qaysi portda ulangani yoki rad etilgani
Deletion protection :: Resursni bitta xato bosish bilan o'chirishdan himoya
Teglar :: Project, Env, Owner — xarajat, qidiruv va insidentda egasini topish uchun
Well-Architected :: AWS'ning oltita ustunli arxitektura tamoyillari, jumladan Security
:::
