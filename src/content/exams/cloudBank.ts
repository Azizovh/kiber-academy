/* Cloud exam: scenario questions, grouped by exam topic. Format: see parseBank in engine/exam.ts.
 * Written with § for the backtick; wrong options are plausible and about as long as the right one. */

export const CLOUD_BANK = String.raw`
## infra
? Shared responsibility modelida EC2 serveridagi operatsion tizim yangilanishlari uchun kim javobgar?
- AWS, chunki server uning ma'lumot markazida
+ Mijoz: OS va undan yuqori qatlam uniki
- Hech kim, bulutda OS avtomatik yangilanadi
- Faqat AWS Support shartnomasi bo'lsa AWS
! IaaS'da provayder apparatura va virtualizatsiyani, mijoz OS, ilova, ma'lumot va sozlamalarni boshqaradi. Boshqariladigan xizmatlarda chegara siljiydi.

? IaaS, PaaS va SaaS'ning qaysi biri mijozga eng ko'p nazorat (va mas'uliyat) beradi?
- SaaS
- PaaS
+ IaaS
- FaaS
! IaaS'da mijoz OS'dan boshlab boshqaradi; PaaS'da faqat ilova va ma'lumot; SaaS'da asosan foydalanuvchilar va sozlamalar.

? VPC 10.10.0.0/16 ichida public subnet nimasi bilan private subnet'dan farq qiladi?
- Public subnet'da IP manzillar shifrlanadi
+ Marshrut jadvalida Internet Gateway'ga yo'l bor
- Public subnet'dagi serverlarda firewall bo'lmaydi
- Public subnet faqat boshqa regionda joylashadi
! "Public" — marshrut jadvalidagi 0.0.0.0/0 → igw yozuvi. Private subnet internetga NAT Gateway orqali chiqadi, lekin tashqaridan kirib bo'lmaydi.

? Security Group va Network ACL farqi?
- SG subnet darajasida, NACL instance darajasida ishlaydi
+ SG holatni eslaydi, NACL esa eslamaydi (stateless)
- SG faqat IPv6, NACL faqat IPv4 uchun ishlaydi
- SG pullik, NACL esa bepul xizmat sifatida beriladi
! SG — instance'ga, faqat ruxsat qoidalari, javob trafik avtomatik o'tadi. NACL — subnet'ga, ruxsat va taqiq, ikki yo'nalish alohida yoziladi.

? Serverga SSH (22) qaysi manbadan ochilishi kerak?
- 0.0.0.0/0, chunki kalit bilan himoyalangan
+ Faqat admin IP'lari yoki bastion/SSM orqali
- Faqat IPv6 manzillardan, chunki ular xavfsizroq
- Hech qayerdan, SSH bulutda ishlamaydi
! Butun internetga ochiq 22 doimiy skan va parol tanlashga duch keladi. SSM Session Manager portni umuman ochmaslik imkonini beradi.

? Instance metadata xizmati (169.254.169.254) uchun IMDSv2 nimani o'zgartiradi?
- Metadata'ni butunlay o'chirib qo'yadi
+ Avval PUT bilan token olishni talab qiladi
- Metadata'ni faqat root foydalanuvchiga beradi
- Metadata'ni boshqa IP manzilga ko'chiradi
! Sessiya tokeni oddiy GET'li SSRF orqali vaqtinchalik IAM kalitlarini o'g'irlashni ancha qiyinlashtiradi.

? Linux serverda faqat kerakli xizmatlar ishlashi kerak. Tinglayotgan portlarni qaysi buyruq ko'rsatadi?
- df -h
+ ss -tlnp
- free -m
- uname -a
! ss -tlnp: TCP, listening, raqamli, jarayon bilan. Keraksiz ochiq xizmat — hujum yuzasi.

? Region va Availability Zone farqi?
- Region — bitta ma'lumot markazi, AZ — mamlakat
+ Region — hudud, AZ — undagi alohida markazlar
- Region va AZ bir xil narsaning ikki nomi
- AZ — faqat zaxira nusxalar saqlanadigan joy
! Yuqori mavjudlik uchun resurslar bir regiondagi bir nechta AZ'ga tarqatiladi. Ma'lumot joylashuvi talablari regionni tanlashga ta'sir qiladi.

? Azure'da AWS IAM rollariga eng yaqin tushuncha qaysi?
- Resource Group va tag'lar
+ Managed Identity va RBAC
- Virtual Network va subnetlar
- Storage Account kalitlari
! Managed Identity — xizmatga kalitsiz identifikatsiya, RBAC — unga beriladigan ruxsatlar. GCP'da — service account va IAM rollari.

? "Immutable infrastructure" yondashuvida serverni yangilash qanday bo'ladi?
- Ishlab turgan serverga SSH bilan kirib paket yangilanadi
+ Yangi image'dan yangi server yaratilib, eskisi o'chadi
- Server qayta yuklanib, avtomatik yangilanishlar yoqiladi
- Eski server saqlanadi, yangisi zaxira sifatida qo'yiladi
! Qo'lda o'zgarish (drift) bo'lmaydi; har versiya kod va image sifatida qayd etiladi, buzilgan server tez almashtiriladi.

? Bulut serverida hamma o'qiy oladigan §/etc/app/.env§ (mode 644) faylida baza paroli bor. To'g'ri tuzatish?
- Faylni /tmp papkasiga ko'chirib, nomini yashirish
+ Ruxsatni 600 qilish (faqat egasi o'qiydi)
- Fayl nomini .env.bak deb o'zgartirish
- Parolni Base64 qilib, faylda qoldirish
! Sir faqat uni ishlatadigan jarayonga ko'rinishi kerak; yanada yaxshisi — Secrets Manager yoki Parameter Store.

? Redis serveri §0.0.0.0:6379§ da autentifikatsiyasiz tinglayapti, ilova esa shu serverning o'zida. Asosiy tuzatish?
- Redis portini 6380 ga o'zgartirish
+ bind 127.0.0.1 va parol (requirepass) qo'yish
- Redis'ni root foydalanuvchi bilan ishga tushirish
- Redis ma'lumotlarini har kuni o'chirib turish
! Faqat lokal ishlatiladigan xizmat tashqi interfeysda tinglamasligi kerak; port almashtirish himoya emas.

## iam
? IAM siyosatida §"Effect": "Allow", "Action": "*", "Resource": "*"§ bo'lsa, bu nima degani?
- Faqat o'qish huquqi beriladi
+ Hamma xizmatda hamma amalga ruxsat
- Hech qanday amalga ruxsat berilmaydi
- Faqat S3 xizmatiga to'liq ruxsat beriladi
! Bu AdministratorAccess bilan teng. Eng kam imtiyoz tamoyili bo'yicha aniq amallar va resurslar yoziladi.

? IAM siyosatlarini baholashda aniq Deny va Allow to'qnashsa nima bo'ladi?
- Allow ustun keladi
+ Aniq Deny har doim ustun keladi
- Oxirgi yozilgani ustun keladi
- Ikkalasi bekor bo'lib, ruxsat beriladi
! Tartib: standart taqiq → aniq Allow ruxsat beradi → aniq Deny hammasini bekor qiladi. SCP va permission boundary ham chegaralaydi.

? CI tizimi AWS'ga deploy qiladi. Qaysi usul xavfsizroq?
- IAM foydalanuvchining doimiy kalitini CI sirlariga qo'yish
+ OIDC orqali rolni vaqtinchalik kalit bilan olish
- Root hisob kalitini CI'da ishlatish
- Kalitni repozitoriyga shifrlab qo'yish
! OIDC federatsiyasi doimiy kalitni umuman yo'q qiladi: CI har ishga tushishda qisqa muddatli rol oladi.

? AWS root hisobi uchun to'g'ri amaliyot qaysi?
- Kundalik ish uchun root hisobidan foydalanish
+ MFA qo'yib, kundalik ishda ishlatmaslik
- Root kirish kalitini yaratib, jamoaga berish
- Root parolini hamma adminlar bilan bo'lishish
! Root cheklab bo'lmaydigan huquqqa ega. MFA, kirish kalitlarisiz va faqat zarur hollarda ishlatiladi.

? IAM Access Analyzer yoki credential report'da 400 kundan beri almashtirilmagan kalit topildi. Nima qilinadi?
- Kalit ishlab tursa, tegmaslik kerak
+ Yangi kalit berib, eskisini o'chirish
- Kalit egasining parolini o'zgartirish yetarli
- Kalitni boshqa foydalanuvchiga o'tkazish
! Uzoq yashaydigan kalitlar — sizib chiqish xavfi. Avval yangisi beriladi, ilova unga o'tkaziladi, keyin eskisi o'chiriladi.

? AssumeRole bilan olinadigan vaqtinchalik kalitlarning afzalligi nima?
- Ularni hech qachon almashtirish kerak emas
+ Muddati o'zi tugaydi, zarar cheklanadi
- Ular har qanday ruxsatni avtomatik beradi
- Ular CloudTrail'da umuman yozilmaydi
! STS kalitlari soatlar ichida eskiradi. Ular ham CloudTrail'da yoziladi — kim qaysi rolni olgani ko'rinadi.

? Rolning "trust policy" nimani belgilaydi?
- Rol qaysi amallarni bajara olishini
+ Rolni kim ola olishini (principal)
- Rol qaysi regionda ishlashini
- Rol uchun parol murakkabligini
! Permission policy — rol nima qila oladi; trust policy — kim uni assume qila oladi. Trust'dagi "Principal": "*" — xavfli xato.

? Lambda funksiyasiga S3 dan bitta bucket'ni o'qish kerak. Eng to'g'ri siyosat?
- AmazonS3FullAccess boshqariladigan siyosati
+ s3:GetObject faqat shu bucket ARN'i uchun
- s3:* hamma bucket uchun, keyin cheklanadi
- AdministratorAccess, keyin kerak bo'lmasa olinadi
! Eng kam imtiyoz: aniq amal + aniq resurs. Keng huquq kod buzilganda butun hisobni xavf ostiga qo'yadi.

? Ilova kodida AWS kirish kaliti topildi va u GitHub'ga push qilingan. Birinchi qadam?
- Kodni o'chirib, yangi commit qilish
+ Kalitni darhol faolsizlantirish
- Repozitoriyni private qilib qo'yish
- Kalit egasidan tushuntirish xati so'rash
! Ochiq repozitoriylar daqiqalarda skanerlanadi. Avval kalit bekor qilinadi, keyin CloudTrail'da u bilan nima qilinganini tekshirish, keyin tarixni tozalash.

? Konsol foydalanuvchilarida MFA yoqilganini qaysi manbadan tez tekshirish mumkin?
- VPC Flow Logs
+ IAM credential report
- S3 server access logs
- CloudWatch Metrics
! Credential report har foydalanuvchi uchun parol, MFA va kalitlar holatini CSV ko'rinishida beradi.

? Secrets Manager'da sirni avtomatik almashtirish (rotation) nima beradi?
- Sirni boshqa regionga nusxalaydi
+ Sizgan sir tez orada yaroqsiz bo'ladi
- Sirni ilova kodiga avtomatik yozib qo'yadi
- Sirni hamma IAM foydalanuvchilariga ko'rsatadi
! Rotation sizib chiqqan sirning "yashash muddati"ni qisqartiradi. Ilova sirni har safar Secrets Manager'dan o'qishi kerak.

? Kubernetes podiga bulut ruxsatini berishning xavfsiz usuli qaysi?
- Node IAM roliga hamma ruxsatlarni berish
+ Pod'ga alohida rol (IRSA va h.k.)
- Kalitni ConfigMap'ga yozib qo'yish
- Kalitni image ichiga ENV bilan qo'shish
! Pod darajasidagi identifikatsiya har ilovaga o'zining minimal rolini beradi; node roli hamma podlarga umumiy bo'lib qoladi.

## himoya
? S3 bucket'ni tasodifan ochiq qilib qo'yishning oldini olish uchun hisob darajasida nima yoqiladi?
- S3 Versioning
+ S3 Block Public Access
- S3 Transfer Acceleration
- S3 Intelligent-Tiering
! Block Public Access ochiq ACL va siyosatlarni hisob yoki bucket darajasida bloklaydi. Versioning esa o'chirishdan himoya qiladi.

? Ma'lumotni "at rest" shifrlashda KMS kalitining afzalligi nima?
- Shifrlash umuman kerak bo'lmay qoladi
+ Foydalanish IAM bilan cheklanadi va loglanadi
- Ma'lumot avtomatik ravishda boshqa regionga ko'chadi
- Shifrlangan ma'lumotni hamma ko'ra oladi
! KMS kalit siyosati kim deshifrlay olishini belgilaydi, har foydalanish CloudTrail'da ko'rinadi, kalitni almashtirish mumkin.

? CloudTrail nimani yozadi?
- Serverlarning CPU va xotira grafiklarini
+ API chaqiruvlarini: kim, qachon, qayerdan, nima
- VPC ichidagi barcha paketlarning to'liq nusxasini
- Ilova loglarini va foydalanuvchi xatolarini
! CloudTrail — boshqaruv amallari jurnali. Tarmoq oqimlari — VPC Flow Logs, metrikalar — CloudWatch.

? VPC Flow Logs'da nima ko'rinadi?
- HTTP so'rovlarining to'liq tanasi
+ Manba/manzil IP, port, protokol va baytlar
- Foydalanuvchi parollari va tokenlari
- API chaqiruvlarining kim tomonidan qilingani
! Flow Logs — ulanishlar xulosasi (5-tuple, baytlar, ACCEPT/REJECT), paket mazmuni emas.

? GuardDuty kabi xizmat nima qiladi?
- Serverlarga avtomatik patch o'rnatadi
+ Loglarda tahdid belgilarini topadi
- IAM siyosatlarini avtomatik yozib beradi
- S3 bucket'larni avtomatik shifrlaydi
! U loglarni tahlil qilib, masalan kriptomayner domenlari yoki g'ayrioddiy API chaqiruvlari haqida topilma beradi.

? CSPM vositasi (masalan, CIS benchmark tekshiruvi) nima qiladi?
- Ilova kodidagi zaifliklarni topadi
+ Sozlamalarni standartlar bilan solishtiradi
- Serverlarga hujumlarni real vaqtda to'sadi
- Foydalanuvchilar parollarini tekshirib chiqadi
! CSPM ochiq bucket, MFA'siz root, 0.0.0.0/0 ga ochiq portlar kabi noto'g'ri sozlamalarni doimiy kuzatadi.

? Bulutdagi buzilishlarning eng ko'p uchraydigan sababi qaysi?
- Provayder ma'lumot markazining jismoniy buzilishi
+ Noto'g'ri sozlamalar va sizgan kalitlar
- Gipervizordagi nol-kunlik zaifliklar
- Provayder xodimlarining ichki hujumlari
! Ochiq bucket'lar, keng IAM huquqlari va kodga yozilgan kalitlar — eng tez-tez uchraydigan sabablar.

? Ma'lumotni "in transit" himoyalash uchun nima kerak?
- Disk shifrlash (EBS encryption)
+ TLS bilan shifrlangan ulanish
- S3 Versioning
- Kunlik zaxira nusxalar
! In transit — tarmoqda harakatlanayotgan ma'lumot (TLS); at rest — saqlanayotgan ma'lumot (KMS, disk shifrlash).

? Zaxira nusxalarni ransomware'dan himoyalashning eng yaxshi usuli?
- Nusxalarni shu hisobdagi boshqa bucket'da saqlash
+ Alohida hisob va Object Lock (WORM) saqlash
- Nusxalarni faqat shu serverning diskida saqlash
- Nusxalar sonini kamaytirib, joyni tejash
! Hujumchi asosiy hisobni egallasa, shu hisobdagi nusxalarni ham o'chiradi. Alohida hisob va WORM saqlash buni to'xtatadi.

? WAF qaysi turdagi hujumlarga qarshi qatlam beradi?
- Serverdagi zaif SSH konfiguratsiyasiga
+ HTTP so'rovlaridagi SQLi va XSS'ga
- IAM kalitlarining sizib chiqishiga
- Disk shifrlanmaganligiga
! WAF HTTP darajasida filtrlaydi va vaqt yutadi, lekin koddagi zaiflikni tuzatishning o'rnini bosmaydi.

? CloudTrail loglarini hujumchi o'chira olmasligi uchun nima qilinadi?
- Loglarni faqat shu hisobdagi bucket'da saqlash
+ Alohida log hisobi va yaxlitlik tekshiruvi
- CloudTrail'ni kerak bo'lganda yoqib, keyin o'chirish
- Loglarni har hafta qo'lda yuklab olish
! Markazlashgan log hisobi (organization trail), Object Lock va log file validation — o'zgartirish va o'chirishga qarshi.

? DLP (data loss prevention) yoki Macie kabi xizmat bulutda nimani topadi?
- Ochiq SSH portlarini
+ Bucket'dagi maxfiy ma'lumotni
- Eskirgan IAM siyosatlarini
- Server diskidagi bo'sh joy miqdorini
! Ular pasport raqami, karta raqami, kalitlar kabi ma'lumotlarni qidiradi — qayerda nima saqlanishini bilish himoyaning boshi.

## konteyner
? Docker image va konteyner farqi nima?
- Image — ishlab turgan jarayon, konteyner — diskdagi fayl
+ Image — o'zgarmas shablon, konteyner — uning nusxasi
- Image faqat Linux'da, konteyner faqat Windows'da
- Image — tarmoq sozlamasi, konteyner — disk
! Bitta image'dan ko'p konteyner ishga tushiriladi; konteyner o'z yoziladigan qatlamiga ega.

? §docker run -v /:/host§ bilan ishga tushirilgan konteyner haqida qaysi gap to'g'ri?
- Konteyner faqat o'qish rejimida ishlaydi
+ Konteyner butun host diskini ko'radi
- Konteyner tarmoqqa chiqa olmaydi
- Bu konteyner xotirasini cheklaydi
! Host ildizini ulash — izolyatsiyani deyarli yo'q qiladi: /host/etc/shadow, /host/root ham ko'rinadi.

? Docker socket'ini (§/var/run/docker.sock§) konteynerga ulash nega xavfli?
- Konteyner tezroq ishlab, resurs ko'p sarflaydi
+ Konteyner Docker orqali hostni egallay oladi
- Socket konteyner loglarini o'chirib yuboradi
- Docker socket faqat Windows'da ishlaydi
! docker.sock'ga kira olgan har kim yangi privileged konteyner yaratib, host ustidan to'liq nazorat oladi.

? Kubernetes Secret obyekti standart holatda qanday saqlanadi?
- Kuchli shifrlangan, kalitsiz o'qib bo'lmaydi
+ Base64 kodlangan; etcd shifrlanmasa, ochiq
- Xeshlangan, asl qiymatni tiklab bo'lmaydi
- Faqat pod xotirasida, diskka yozilmaydi
! Base64 — shifrlash emas. etcd encryption at rest, RBAC bilan cheklash yoki tashqi secrets manager kerak.

? RBAC'da §kubectl auth can-i list secrets --as=system:serviceaccount:web:default§ "yes" qaytardi. Xulosa?
- Bu normal, hamma service account sirlarni o'qishi kerak
+ web podlari buzilsa, hujumchi sirlarni o'qiy oladi
- Bu faqat cluster admin'ga tegishli holat
- Bu buyruq faqat test muhitida ishlaydi
! Default service account'ga ortiqcha huquq — klassik xato. Har ilovaga minimal huquqli alohida service account kerak.

? NetworkPolicy bo'lmagan Kubernetes klasterida podlar orasidagi trafik qanday?
- Hamma trafik standart holatda bloklangan
+ Hamma pod hamma pod bilan gaplashadi
- Faqat bir xil namespace ichida ruxsat
- Faqat HTTPS trafikka ruxsat beriladi
! Standart — hammasi ochiq. "Default deny" NetworkPolicy va kerakli yo'llarga aniq ruxsat — lateral harakatni cheklaydi.

? Pod Security Standards'ning "restricted" profili nimani talab qiladi?
- Konteynerlar root sifatida ishlashini
+ Root'siz ishlash va imtiyoz oshirmaslik
- Har podda kamida bitta privileged konteyner
- Barcha podlar host tarmog'idan foydalanishini
! restricted: runAsNonRoot, allowPrivilegeEscalation: false, capabilities drop ALL, seccomp RuntimeDefault.

? Terraform state fayli nega maxfiy hisoblanadi?
- U faqat resurslar nomlarini saqlaydi, maxfiy emas
+ Unda resurs atributlari, ba'zan parollar bor
- U shifrlangan, lekin juda katta hajmli bo'ladi
- U faqat lokal kompyuterda ishlagani uchun
! State'da baza parollari va kalitlar ochiq matnda bo'lishi mumkin. Remote backend, shifrlash va qat'iy kirish nazorati kerak.

? IaC skaneri (Checkov, tfsec, Trivy config) qachon ishlatilgani eng foydali?
- Resurslar yaratilib, hujum bo'lgandan keyin
+ Pull request'da, resurs yaratilishidan oldin
- Faqat yiliga bir marta audit oldidan
- Faqat ishlab chiqarish muhitida, qo'lda
! Kodda topilgan xato (ochiq bucket, 0.0.0.0/0) hech qachon bulutga chiqmaydi — eng arzon tuzatish.

? §terraform plan§ natijasida "1 to destroy" ko'rinsa, nima qilish kerak?
- Darhol apply qilish, plan har doim to'g'ri
+ O'chirish sababini tekshirib, keyin qaror qilish
- State faylini qo'lda tahrirlab, satrni o'chirish
- Terraform versiyasini yangilab, qayta urinish
! Plan — apply'dan oldingi tekshiruv nuqtasi. Kutilmagan o'chirish (masalan, baza) katta yo'qotish bo'lishi mumkin.

? Trivy image skanerida bir xil CVE uchun "fixed version" yo'q. Bu nimani anglatadi?
- Zaiflik yolg'on, e'tiborsiz qoldirish mumkin
+ Tuzatish hali yo'q: boshqa chora yoki image kerak
- Image avtomatik ravishda yangilanadi
- Skaner ishlamay qolgan, qayta ishga tushirish kerak
! Tuzatish yo'q bo'lsa: paket haqiqatda ishlatiladimi, ta'sirni kamaytirish mumkinmi, slim/distroless image'ga o'tish mumkinmi — ko'riladi.

? Konteynerda §readOnlyRootFilesystem: true§ nima beradi?
- Konteyner tarmoqqa chiqa olmaydi
+ Fayl tizimiga dastur yozib bo'lmaydi
- Konteyner loglari saqlanmaydi
- Konteyner faqat bir marta ishga tushadi
! Yoziladigan joylar (masalan /tmp) alohida volume sifatida beriladi; qolgani o'zgarmaydi — zararli faylni yozish qiyinlashadi.

## professional
? Bulutdagi insidentda sizgan kirish kaliti bilan nima qilinganini aniqlash uchun birinchi manba qaysi?
- S3 bucket'dagi fayllar ro'yxati
+ CloudTrail'dagi shu kalit amallari
- EC2 serverlarining CPU grafiklari
- Billing hisobotidagi umumiy summa
! CloudTrail'da accessKeyId bo'yicha filtr: qaysi IP'dan, qaysi amallar (CreateUser, CreateAccessKey, GetObject) qilingan.

? Buzilgan EC2 serveri bo'yicha dalillarni saqlash uchun to'g'ri qadam?
- Serverni darhol terminate qilish
+ EBS snapshot olib, izolyatsiya SG'siga o'tkazish
- Serverga kirib, shubhali fayllarni darhol o'chirib tashlash
- Serverni qayta yuklab, loglarni tozalash
! Terminate disk va xotirani yo'q qiladi. Snapshot dalilni saqlaydi, bo'sh SG esa tarmoqni kesadi.

? Zero trust tamoyilining mohiyati nima?
- Ichki tarmoqdagi hamma narsaga ishonish
+ Har so'rovni har safar tekshirish
- Faqat firewall bilan perimetrni himoyalash
- VPN'ga ulanganlarga to'liq ruxsat berish
! "Hech qachon ishonma, doim tekshir": identifikatsiya, qurilma holati va kontekst har so'rovda baholanadi.

? Zero trust arxitekturasida qaysi biri asosiy tarkibiy qism?
- Tarmoq ichidagi barcha portlarni ochiq qoldirish
+ Kuchli identifikatsiya (MFA) va eng kam imtiyoz
- Barcha xodimlarga bitta umumiy hisob berish
- Faqat ofisdan ishlashga ruxsat berish
! Identifikatsiya yangi perimetr: MFA, qurilma tekshiruvi, mikrosegmentatsiya va minimal huquqlar.

? GDPR, PCI DSS yoki ISO 27001 kabi talablarga muvofiqlik (compliance) haqida qaysi gap to'g'ri?
- Muvofiqlik bo'lsa, kompaniya buzilmaydi
+ Muvofiqlik — minimal talab, xavfsizlikning o'zi emas
- Muvofiqlik faqat katta kompaniyalarga tegishli
- Muvofiqlik faqat texnik vositalar bilan ta'minlanadi
! Audit ma'lum vaqtdagi holatni tekshiradi. Xavfsizlik doimiy jarayon; jarayonlar, odamlar va texnika birga ishlaydi.

? PCI DSS qaysi ma'lumotlarni himoyalashga qaratilgan?
- Xodimlarning tibbiy ma'lumotlari
+ To'lov kartalari ma'lumotlari
- Davlat sirlari
- Foydalanuvchilar rasmlari
! PCI DSS karta egasi ma'lumotlarini qayta ishlaydigan, saqlaydigan yoki uzatadigan har qanday tizimga tegishli.

? Bulutdagi IR rejasida oldindan nima tayyorlab qo'yiladi?
- Insident bo'lganda keyin o'ylab topiladigan rejalar
+ Izolyatsiya SG'si, forensik rol va loglar
- Barcha xodimlarning shaxsiy telefon raqamlari ro'yxati
- Zaxira nusxalarni o'chirish bo'yicha yo'riqnoma
! Tayyorgarlik bosqichida "break glass" rollar, izolyatsiya uchun SG, markaziy loglar va playbook'lar tayyor bo'ladi.

? CloudTrail'da §DeleteTrail§ va §StopLogging§ hodisalari chiqdi. Bu nima belgisi?
- Rejali xarajatlarni kamaytirish
+ Hujumchi izini yashirmoqda
- AWS tomonidan avtomatik texnik xizmat
- Yangi region qo'shilganini bildiradi
! Loglashni o'chirish — klassik iz yashirish (ATT&CK: Impair Defenses). Bunday hodisalar uchun alohida ogohlantirish bo'lishi kerak.

? Cloud xavfsizlik portfolio loyihasi uchun nima eng kuchli?
- Faqat sertifikatlar ro'yxati
+ IaC bilan qurilgan, skanerlangan muhit
- Bulut provayderining marketing materiallari
- Boshqa loyihadan ko'chirilgan skrinshotlar
! Terraform kodi, CI'dagi IaC skan, CSPM topilmalari va tuzatishlar — amaliy ko'nikmaning isboti.

? Multi-account strategiyasining xavfsizlik afzalligi nima?
- Barcha resurslar bitta joyda bo'lib, boshqarish oson
+ Muhitlar ajraladi, buzilish zarari cheklanadi
- Xarajatlar avtomatik ravishda nolga tushadi
- IAM foydalanuvchilarga ehtiyoj qolmaydi
! Prod, dev, log va xavfsizlik hisoblari alohida bo'lsa, "portlash radiusi" kichrayadi va SCP bilan markaziy cheklovlar qo'yiladi.

? Sertifikat tayyorgarligida (masalan, AWS Security Specialty) eng samarali yondashuv?
- Faqat savol-javob to'plamlarini yodlash
+ Amaliy laboratoriya va rasmiy hujjatlar
- Imtihonni tayyorgarliksiz topshirib ko'rish
- Faqat video kurslarni tez ko'rib chiqish
! Sertifikat savollari vaziyatli: xizmatlar qanday birga ishlashini bilish kerak, bu esa amaliyot bilan keladi.

? "Shift left" bulut xavfsizligida nimani anglatadi?
- Xavfsizlikni faqat ishlab chiqarishda tekshirish
+ Tekshiruvlarni IaC va CI bosqichiga ko'chirish
- Barcha resurslarni chap regionlarga ko'chirish
- Xavfsizlik jamoasini dasturchilardan ajratish
! Xato qancha erta topilsa, shuncha arzon tuzatiladi: PR'dagi IaC skan, policy-as-code, avtomatik testlar.
`.replace(/§/g, '`');
