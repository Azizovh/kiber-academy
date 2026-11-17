Uchinchi kun. Mijozning sakkizta tashqi manzili va ikkita web ilovasi uchun zaiflik skanerini ishga tushirasiz. Bir soatdan keyin hisobot: **3 kritik, 14 yuqori, 41 o'rta, 120 past**. Yangi boshlovchi uni PDF qilib mijozga yuborishga tayyor.

Tajribali pentester esa kritiklarni ochadi. Birinchisi: "OpenSSH'dagi zaiflik — versiya 8.9p1". Lekin server Ubuntu, va Ubuntu xavfsizlik yamog'ini **versiya raqamini o'zgartirmasdan** qo'shgan — zaiflik allaqachon tuzatilgan. Ikkinchisi: "Apache Struts zaifligi" — serverda Struts umuman yo'q, skaner bitta xato javobga qarab taxmin qilgan. Uchinchisi haqiqiy: TLS sertifikati muddati o'tgan staging serveri.

Uchtadan bitta. Skaner — kuchli vosita, lekin u **gipoteza** beradi, isbot emas. Pentesterning qiymati — gipotezalarni tekshirib, haqiqiy topilmalarni shovqindan ajratish. AppSec tarmog'idagi zaiflik boshqaruvi darsida (a4) bu skanerlarning natijalarini himoyachi sifatida saralagansiz; endi ularni ishga tushiruvchi va tasdiqlovchi sifatida ko'ramiz.

## Skanerlar qanday ishlaydi

```
 1. Topish      — ochiq portlar va xizmatlar (Nmap kabi)
 2. Aniqlash    — har bir xizmat, versiya, OS, o'rnatilgan dasturlar
 3. Solishtirish — topilgan versiyalarni ma'lum zaifliklar bazasi (CVE) bilan
 4. Tekshirish  — ba'zi zaifliklar uchun maxsus so'rov yuborib, javobga qarash
 5. Hisobot     — har bir topilma, CVSS bahosi, tavsiya
```

Asosiy ma'lumot manbasi — [[cve|CVE]] bazasi va har bir zaiflik uchun [[cvss|CVSS]] bahosi (a4). Skaner aslida savol beradi: "Bu dastur versiyasi bazadagi zaif versiyalar ro'yxatidami?"

## Vositalar

| Vosita | Turi | Xususiyati |
|---|---|---|
| **Nessus** | Tijorat (bepul "Essentials" — cheklangan) | Eng keng tarqalganlardan, katta plaginlar bazasi |
| **OpenVAS / Greenbone** | Ochiq manbali | Nessus'ning bepul muqobili |
| **Qualys, Rapid7 InsightVM** | Tijorat, bulut | Korporativ zaiflik boshqaruvi |
| **Nuclei** | Ochiq manbali | Shablon (YAML) asosida tez web va xizmat tekshiruvlari |
| **Nikto** | Ochiq manbali | Web serverlar uchun eski, lekin oddiy skaner |
| Trivy, Grype | Ochiq manbali | Konteyner image va bog'liqliklar (a4, c3) |

## Autentifikatsiyali va autentifikatsiyasiz skan

| | Autentifikatsiyasiz (tashqaridan) | Autentifikatsiyali (credentialed) |
|---|---|---|
| Qanday | Faqat tarmoq orqali — bannerlar va javoblar | Skaner serverga hisob bilan kiradi (SSH, Windows) va o'rnatilgan paketlarni ko'radi |
| Aniqlik | Past — versiyani bannerdan taxmin qiladi | Yuqori — haqiqiy paket versiyalari va yamoqlar |
| Soxta ijobiy | Ko'p (backport muammosi) | Kam |
| Qamrov | Faqat tashqaridan ko'rinadigan xizmatlar | Lokal dasturlar, yadro, sozlamalar ham |
| Qachon | Tashqi pentest, hujumchi ko'rinishi | Ichki zaiflik boshqaruvi, white/grey box |

Dars boshidagi OpenSSH holati — autentifikatsiyasiz skanning tipik xatosi. Autentifikatsiyali skan Ubuntu paket versiyasini ko'rib, yamoq o'rnatilganini bilardi.

## Natijani o'qish

Skaner hisobotidagi bitta topilma:

```
Plugin: SSL Certificate Expiry
Severity: Medium        CVSS v3: 5.3
Host: 203.0.113.23 (staging.qaydnoma.example.com)   Port: 443/tcp
Output:
  The SSL certificate has already expired:
  Subject   : CN=staging.qaydnoma.example.com
  Not After : Oct 02 11:59:59 2026 GMT
Solution: Purchase or generate a new SSL certificate.
```

Har bir topilmada tekshiriladigan narsalar:

| Maydon | Savol |
|---|---|
| Plugin / tekshiruv | Skaner buni qanday aniqlagan — versiya taqqoslash yoki haqiqiy tekshiruv? |
| Output (dalil) | Skaner nimani ko'rgan? Bu dalil topilmani isbotlaydimi? |
| Severity va CVSS | Umumiy baho — kontekstda risk boshqacha bo'lishi mumkin (c2 CSPM: severity ≠ risk) |
| Host va port | Qamrovdami? Qanday muhit (prod, staging)? |
| Solution | Tavsiya mijozga mosmi? |

## Soxta ijobiy va soxta salbiy

| | Ma'nosi | Misol | Oqibati |
|---|---|---|---|
| **[[false-positive|False positive]]** | Skaner zaiflik bor deydi, aslida yo'q | Backport qilingan yamoq; dastur yo'q, lekin javob o'xshash | Mijoz vaqti behuda, hisobotga ishonch yo'qoladi |
| **False negative** | Zaiflik bor, skaner ko'rmadi | Biznes mantiq xatosi, IDOR, nostandart port, autentifikatsiya ortidagi sahifa | Yolg'on xavfsizlik hissi |

Ikkinchisi xavfliroq va uni skaner hech qachon o'zi ko'rsatmaydi. Qaydnoma'dagi IDOR (a2) — skaner uchun ko'rinmas: so'rov to'g'ri, javob 200, faqat **kimning** qaydi qaytgani noto'g'ri. Shuning uchun pentest — skanerdan ko'proq.

:::key
Skaner natijasini tekshirmasdan mijozga yuborish — pentest emas, skanerlash xizmati, va yomon sifatli. Hisobotdagi har bir topilma **tasdiqlangan** bo'lishi kerak: siz o'zingiz ko'rgan dalil bilan. Tasdiqlab bo'lmaganlar — alohida "tasdiqlanmagan kuzatuvlar" bo'limiga, buni ochiq yozib.
:::

## Qo'lda tasdiqlash

Har bir muhim topilma uchun:

1. **Dalilni qayta ko'ring.** Skaner aynan nimani ko'rdi? Banner'dagi versiyami yoki haqiqiy javob?
2. **Mustaqil manba bilan tekshiring.** Banner'ni o'zingiz oling (`curl -sI`, `nc`), sertifikatni `openssl s_client` bilan ko'ring.
3. **Backport'ni tekshiring.** Distributivning xavfsizlik trekeri (Ubuntu, Debian, Red Hat CVE sahifalari) — shu CVE shu paket versiyasida tuzatilganmi? Grey box'da — `dpkg -l` yoki mijozdan paket versiyasini so'rash.
4. **Zararsiz tekshiruv.** Zaiflik haqiqatan mavjudligini ko'rsatadigan, lekin tizimga ta'sir qilmaydigan usul (masalan, xato javobning o'ziga xos belgisi).
5. **Hujjatlashtiring:** tasdiqlandi / soxta ijobiy (sababi bilan) / tasdiqlanmadi.

```bash
# Sertifikatni mustaqil tekshirish
echo | openssl s_client -connect staging.qaydnoma.example.com:443 \
  -servername staging.qaydnoma.example.com 2>/dev/null | openssl x509 -noout -dates
# notAfter=Oct  2 11:59:59 2026 GMT     ← tasdiqlandi
```

## Xavfsiz va xavfli tekshiruvlar

Ko'p skanerlarda "safe checks" sozlamasi bor: faqat ta'sirsiz tekshiruvlar. Ba'zi plaginlar esa xizmatni yiqitishi mumkin (DoS bilan bog'liq zaifliklarni "tekshirish"), hisoblarni bloklashi mumkin (parol tekshiruvlari) yoki ma'lumot yozishi mumkin (forma to'ldirish).

| Sozlama | Mijoz tizimida |
|---|---|
| Safe checks | Yoqilgan — sukut |
| DoS plaginlari | O'chirilgan (RoE: DoS taqiqlangan) |
| Brute force plaginlari | O'chirilgan yoki RoE cheklovlari bilan |
| Tezlik | Cheklangan, kelishilgan vaqtda |
| Web formalarni avtomatik to'ldirish | Ehtiyotkorlik bilan — test muhiti yoki test hisoblari |

Web skanerlar formalarni to'ldirib yuboradi — ishlab chiqarishda bu yuzlab soxta qaydlar, xatlar yoki buyurtmalar degani. Qamrov darsidagi qoida: har bir agressiv harakatdan oldin "bu mijozga nima qiladi?".

## Nuclei: shablonlar

Nuclei — har bir tekshiruv alohida YAML shablon bo'lgan skaner. Minglab jamoat shablonlari bor, va o'zingiz ham yozishingiz mumkin. Masalan, saytda ochiq qolgan `.git` papkasini aniqlash (manba kod sizib chiqishi):

```yaml
id: qaydnoma-exposed-git
info:
  name: Ochiq .git papkasi
  severity: high
http:
  - method: GET
    path:
      - "{{BaseURL}}/.git/HEAD"
    matchers-condition: and
    matchers:
      - type: word
        words:
          - "ref: refs/heads/"
      - type: status
        status:
          - 200
```

```bash
nuclei -u https://qaydnoma.example.com -t qaydnoma-exposed-git.yaml
```

Shablon faqat bitta zararsiz GET so'rov yuboradi va javobda Git'ning o'ziga xos qatorini qidiradi. Jamoat shablonlaridan foydalanayotganda ham qoida: ishga tushirishdan oldin shablon nima yuborishini o'qing.

## Himoyachi uchun

a4 bosqichidagi zaiflik boshqaruvi jarayonining tashqi ko'rinishi:

- Mijoz o'zi **muntazam, autentifikatsiyali** skan qilishi kerak — pentester topgan "eskirgan versiya" topilmalari ichki skanerda allaqachon bo'lishi kerak edi.
- Saralash: CVSS + kontekst + **ekspluatatsiya ehtimoli** (CISA KEV katalogi — haqiqatan ishlatilayotgan zaifliklar, EPSS — ehtimollik bahosi).
- Skanerlar ham hujum yuzasining bir qismi: skaner hisoblari kuchli huquqlarga ega — ularni himoyalash kerak.
- SOC uchun: skaner trafigi — taniladigan va kelishilgan; xuddi shunday trafik notanish manbadan — signal.

## Skaner nimani qilmaydi

- Biznes mantiq, avtorizatsiya (IDOR), murakkab zanjirlarni topmaydi.
- Autentifikatsiya ortidagi sahifalarni (sozlanmagan bo'lsa) va nostandart xizmatlarni ko'rmasligi mumkin.
- Kontekstni bilmaydi: bir xil CVSS staging va to'lov tizimida bir xil risk emas.
- Natijani tasdiqlamaydi — bu sizning ishingiz.

:::try
O'z laboratoriyangizda (Metasploitable 2 yoki boshqa ataylab zaif VM):

1. OpenVAS/Greenbone (yoki Nessus Essentials) o'rnating va laboratoriya hostini autentifikatsiyasiz skanerlang.
2. Xuddi shu hostni SSH hisobi bilan autentifikatsiyali skanerlang. Topilmalar soni va aniqligi qanday farq qildi?
3. Uchta yuqori yoki kritik topilmani tanlab, qo'lda tasdiqlang: tasdiqlandi, soxta ijobiy yoki tasdiqlanmadi — sababi bilan.
4. Nuclei o'rnating va yuqoridagi `.git` shablonini o'z laboratoriyangizdagi web serverda sinang (avval u yerga ataylab `.git` papkasini qo'ying, keyin olib tashlab, qayta skanerlang).
5. TryHackMe'dagi "Nessus" xonasini o'ting.
6. Savol: skaner Qaydnoma'da hech qanday yuqori topilma bermadi. Mijoz: "Demak web ilovamiz xavfsiz." Nima deysiz?

**Javoblar:**
1–2. Odatda autentifikatsiyali skan ancha ko'p topilma beradi (lokal paketlar, yadro), lekin soxta ijobiylar kamroq — chunki versiyalar haqiqiy paket bazasidan olinadi.
3. Har bir xulosa dalil bilan: banner, distributiv xavfsizlik trekeri sahifasi, mustaqil vosita natijasi.
4. `.git/HEAD` mavjud bo'lsa shablon topilma beradi; olib tashlagach — yo'q. Bu shablon yozish va tekshirish siklining eng oddiy ko'rinishi.
5. Xona skanerni sozlash va natijani o'qish bo'yicha amaliyot beradi.
6. Skaner biznes mantiq va avtorizatsiya xatolarini (masalan, IDOR — boshqa foydalanuvchi qaydini o'qish) ko'rmaydi. Bu topilmalar qo'lda, ikki test hisobi bilan tekshiriladi (p2 bosqichi). "Skaner topmadi" — "zaiflik yo'q" degani emas.
:::

## Xulosa

- Skaner: topish → aniqlash → CVE bazasi bilan solishtirish → ba'zi tekshiruvlar → hisobot. Natija — gipoteza.
- Nessus, OpenVAS, Qualys — infratuzilma; Nuclei — shablonli tez tekshiruvlar; Trivy — image va bog'liqliklar.
- Autentifikatsiyali skan aniqroq; autentifikatsiyasiz — hujumchi ko'rinishi, lekin ko'p soxta ijobiy (backport).
- False positive — vaqt va ishonch yo'qotish; false negative — yolg'on xavfsizlik hissi va undan ham xavfli.
- Har bir muhim topilma qo'lda tasdiqlanadi: dalil, mustaqil manba, distributiv trekeri, zararsiz tekshiruv, hujjat.
- Mijoz tizimida: safe checks, DoS va brute force o'chiq, cheklangan tezlik.
- Skaner biznes mantiq va avtorizatsiyani ko'rmaydi — pentest skanerdan ko'proq.

:::quiz
? Zaiflik skanerining natijasi pentestda qanday qabul qilinadi?
- Yakuniy isbot sifatida
+ Tekshirilishi kerak bo'lgan gipotezalar sifatida
- E'tiborsiz qoldiriladigan shovqin sifatida
- Faqat rahbariyat uchun
! Har bir topilma qo'lda tasdiqlanadi yoki soxta ijobiy deb belgilanadi.

? Nega autentifikatsiyasiz skan Linux serverlarda ko'p soxta ijobiy beradi?
+ Distributivlar yamoqni versiya raqamini o'zgartirmasdan qo'shadi (backport), skaner esa banner'dagi versiyaga qaraydi
- Linux skanerlarni bloklaydi
- Autentifikatsiyasiz skan noqonuniy
- CVE bazasi Linux'ni qamramaydi
! Autentifikatsiyali skan haqiqiy paket versiyalarini ko'rib, bu xatoni kamaytiradi.

? False negative nima va nega u xavfli?
- Skaner zaiflik bor deydi, aslida yo'q — vaqt behuda
+ Zaiflik bor, lekin skaner ko'rmadi — yolg'on xavfsizlik hissi
- Skaner ishlamay qoldi
- Skaner juda sekin
! Masalan, IDOR va biznes mantiq xatolari skanerlar uchun ko'rinmas.

? Skaner OpenSSH zaifligini xabar qildi. Uni qanday tasdiqlash to'g'ri?
- Exploitni darhol ishga tushirish
+ Banner'ni mustaqil olish, distributiv xavfsizlik trekerida shu CVE shu paket versiyasida tuzatilganini tekshirish, grey box'da paket versiyasini ko'rish
- Topilmani hisobotga tekshirmasdan qo'shish
- Serverni qayta yuklash
! Tasdiqlash zararsiz usullar bilan va dalil bilan.

? Mijoz tizimida skanerlashda qaysi sozlama to'g'ri?
- DoS plaginlari yoqilgan — to'liq qamrov uchun
+ Safe checks yoqilgan, DoS va brute force plaginlari o'chirilgan, tezlik cheklangan
- Maksimal tezlik
- Barcha formalarni avtomatik to'ldirish
! RoE odatda DoS'ni taqiqlaydi; agressiv tekshiruvlar xizmatni buzishi mumkin.

? Nuclei shablonidagi `matchers` qismi nima qiladi?
- So'rovni shifrlaydi
+ Javobda nimani qidirish kerakligini belgilaydi (masalan, so'z va status kodi) — topilma shartlari
- Serverni o'chiradi
- Skanerni tezlashtiradi
! Ikkala shart bajarilganda (and) topilma qayd etiladi.

? Skaner topilmasini tasdiqlab bo'lmadi. Hisobotda nima qilinadi?
+ Alohida "tasdiqlanmagan kuzatuvlar" bo'limiga, buni ochiq yozib
- Tasdiqlangan topilma sifatida yoziladi
- O'chirib tashlanadi va hech kim bilmaydi
- Kritik deb belgilanadi
! Halollik hisobotga ishonchni saqlaydi.

? CISA KEV katalogi nimaga yordam beradi?
- Yangi CVE yaratishga
+ Haqiqatan ishlatilayotgan zaifliklarni aniqlab, tuzatishni ustuvorlashtirishga
- Skanerni o'rnatishga
- Parollarni tekshirishga
! CVSS + kontekst + ekspluatatsiya ehtimoli — to'g'ri ustuvorlik.

? Web skanerni ishlab chiqarishda ehtiyotsiz ishlatishning xavfi qaysi?
- Hech qanday xavf yo'q
+ U formalarni to'ldirib, yuzlab soxta yozuvlar, xatlar yoki buyurtmalar yaratishi mumkin
- U faqat sahifalarni o'qiydi
- U SSL sertifikatni yangilaydi
! Test hisoblari, test muhiti va kelishilgan sozlamalar kerak.

? Skaner Qaydnoma'da yuqori topilma bermadi. To'g'ri xulosa?
- Ilova xavfsiz
+ Skaner ko'rmaydigan avtorizatsiya va biznes mantiq zaifliklari qo'lda tekshirilishi kerak
- Pentest kerak emas
- Skanerni o'chirish kerak
! Pentestning qiymati aynan skaner ko'rmaydigan joylarda.
:::

:::cards
Zaiflik skaneri :: Xizmat va versiyalarni ma'lum zaifliklar bazasi bilan solishtiruvchi vosita
Autentifikatsiyali skan :: Serverga hisob bilan kirib, haqiqiy paketlarni ko'radigan aniq skan
Backport :: Versiya raqamini o'zgartirmasdan xavfsizlik yamog'ini qo'shish — soxta ijobiyning sababi
False positive :: Skaner bor degan, aslida yo'q zaiflik
False negative :: Mavjud, lekin skaner ko'rmagan zaiflik
Qo'lda tasdiqlash :: Dalil, mustaqil manba, distributiv trekeri, zararsiz tekshiruv
Safe checks :: Faqat tizimga ta'sir qilmaydigan tekshiruvlar rejimi
Nuclei :: YAML shablon asosidagi tez skaner
CISA KEV :: Haqiqatan ishlatilayotgan zaifliklar katalogi
EPSS :: Zaiflikning yaqin vaqtda ishlatilish ehtimoli bahosi
Tasdiqlanmagan kuzatuvlar :: Hisobotda tasdiqlab bo'lmagan topilmalar uchun alohida bo'lim
:::
