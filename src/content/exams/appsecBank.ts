/* AppSec exam: scenario questions, grouped by exam topic. Format: see parseBank in engine/exam.ts.
 * Written with § for the backtick; wrong options are plausible and about as long as the right one. */

export const APPSEC_BANK = String.raw`
## web
? Brauzer §https://qaydnoma.example.com§ sahifasidan §https://api.qaydnoma.example.com§ ga fetch yubordi. Same-Origin Policy nuqtai nazaridan bu nima?
- Bir xil origin, chunki domen bir xil
+ Boshqa origin: host farq qiladi, CORS kerak
- Bir xil origin, chunki protokol va port bir xil
- Boshqa origin, lekin brauzer buni tekshirmaydi
! Origin = sxema + host + port. api. subdomeni boshqa host, demak javobni o'qish uchun server CORS sarlavhalarini qaytarishi kerak.

? Sessiya cookie'si uchun qaysi uchta atribut XSS va CSRF xavfini kamaytiradi?
- Path, Domain, Expires
+ HttpOnly, Secure, SameSite
- Max-Age, Priority, Partitioned
- Domain, Secure, Max-Age
! HttpOnly — JavaScript o'qiy olmaydi, Secure — faqat HTTPS, SameSite — boshqa saytdan kelgan so'rovlarga cookie qo'shilmaydi.

? Server javobida §Access-Control-Allow-Origin: *§ va §Access-Control-Allow-Credentials: true§ birga qaytdi. Nima bo'ladi?
- Har qanday sayt foydalanuvchi cookie'si bilan javobni o'qiydi
+ Brauzer bu birikmani rad etadi, javob o'qilmaydi
- Faqat bir xil domendagi saytlar javobni o'qiy oladi
- CORS o'chadi va so'rov umuman yuborilmaydi
! Spetsifikatsiya * ni credentials bilan taqiqlaydi. Xavfli holat — server Origin sarlavhasini tekshirmasdan aks ettirishi (reflect) va credentials: true qaytarishi.

? JWT tokenining tanasi (payload) haqida qaysi gap to'g'ri?
- U shifrlangan, kalitsiz o'qib bo'lmaydi
+ U Base64URL kodlangan, har kim o'qiy oladi
- U xeshlangan, asl qiymatni tiklab bo'lmaydi
- U faqat server xotirasida saqlanadi
! Imzo o'zgartirishdan himoya qiladi, maxfiylikdan emas. JWT ichiga parol yoki maxfiy ma'lumot qo'yilmaydi.

? Server JWT imzosini tekshirishda §alg§ maydoniga ishonsa, qaysi xavf paydo bo'ladi?
- Token muddati hech qachon tugamaydi
+ alg: none bilan imzosiz token qabul qilinadi
- Token uzunligi oshib, server sekinlashadi
- Foydalanuvchi parolini o'zgartira olmaydi
! Server kutilgan algoritmni o'zi belgilashi kerak (masalan faqat HS256 yoki RS256). Tokenning o'zi aytgan algoritmga ishonish — klassik xato.

? Parolni tiklash havolasidagi tokenga qanday talablar qo'yiladi?
- Foydalanuvchi ID'sidan hosil qilingan, cheksiz muddatli
+ Tasodifiy, qisqa muddatli va bir martalik
- Foydalanuvchi emailining MD5 xeshi, bir oylik
- Joriy vaqtning sekundlari, takrorlanadigan
! Taxmin qilinadigan yoki qayta ishlatiladigan token — hisobni egallash yo'li. Kriptografik tasodifiy (secrets moduli), 15–60 daqiqa, ishlatilgach bekor.

? HTTP §PUT /api/notes/1043§ so'rovi bir xil tanasi bilan uch marta yuborildi. Idempotentlik nimani anglatadi?
- Uchta yangi qayd yaratiladi
+ Natija bir marta yuborilgandagi bilan bir xil
- Server ikkinchi so'rovdan boshlab xato qaytaradi
- Har so'rov qaydning versiyasini oshiradi
! PUT va DELETE idempotent, POST odatda emas. Bu qayta urinishlar va biznes mantiq hujumlarini tahlil qilishda muhim.

? Qaysi sarlavha brauzerga saytni faqat HTTPS orqali ochishni buyuradi?
- Content-Security-Policy
+ Strict-Transport-Security
- X-Content-Type-Options
- Referrer-Policy
! HSTS (max-age bilan) brauzerni keyingi safar http:// ni avtomatik https:// ga almashtirishga majbur qiladi.

? Flask ilovasida foydalanuvchi parolini saqlashning to'g'ri usuli?
- hashlib.sha256(parol).hexdigest() ni saqlash
+ werkzeug generate_password_hash (tuzli, sekin)
- Parolni AES bilan shifrlab, kalitni kodda saqlash
- Parolni Base64 qilib, alohida jadvalda saqlash
! Tez xesh GPU'da tez tanlanadi, shifrlangan parol kalit bilan qaytariladi. Tuzli, sekin funksiyalar (scrypt, bcrypt, Argon2) kerak.

? Qaysi holat sessiya fiksatsiyasidan himoya qiladi?
- Sessiya ID'sini URL ichida uzatish
+ Kirishdan keyin yangi sessiya ID'si berish
- Sessiya muddatini bir yilga uzaytirish
- Sessiya ID'sini localStorage'da saqlash
! Hujumchi oldindan bergan ID kirishdan keyin ham ishlasa, u hisobga kiradi. Login paytida sessiya qayta yaratiladi.

? MFA bilan himoyalangan ilovada qaysi joy ko'pincha unutiladi va aylanib o'tish yo'li bo'ladi?
- Asosiy login formasi
+ Parolni tiklash va API token oqimlari
- Bosh sahifadagi rasmlar
- Statik CSS fayllar
! MFA faqat login formasida bo'lsa, parol tiklash yoki eski API tokenlari orqali ikkinchi faktorsiz kirish mumkin bo'lib qoladi.

? Brauzer §Content-Type: text/plain§ javobini HTML deb "taxmin qilib" ishga tushirmasligi uchun qaysi sarlavha kerak?
- X-Frame-Options: DENY
+ X-Content-Type-Options: nosniff
- Cache-Control: no-store
- Referrer-Policy: no-referrer
! nosniff MIME sniffing'ni o'chiradi: yuklangan "rasm" yoki matn fayli skript sifatida bajarilmaydi.

## injection
? Kodda: §cur.execute("SELECT * FROM notes WHERE id = %s" % note_id)§. Bu xavfsizmi?
- Ha, chunki %s parametrli so'rov belgisi
+ Yo'q: % Python satr formatlash, injection mumkin
- Ha, chunki note_id doim raqam bo'ladi
- Yo'q, lekin faqat MySQL'da xavfli
! Parametrli so'rovda qiymat alohida uzatiladi: execute("... WHERE id = %s", (note_id,)). % operatori matnni so'rovga yopishtiradi.

? Stored XSS va reflected XSS farqi nima?
- Stored faqat admin panelda, reflected faqat qidiruvda bo'ladi
+ Stored bazada saqlanib ko'pchilikka, reflected so'rovdan qaytadi
- Stored JavaScript'da, reflected faqat HTML'da yoziladi
- Stored — server xatosi, reflected — brauzer xatosi
! Stored XSS saqlangan joyni ochgan har kimga ta'sir qiladi; reflected esa maxsus havolani bosgan qurbonga.

? Jinja2 shablonida §{{ izoh|safe }}§ yozilgan, izoh foydalanuvchidan keladi. Muammo nima?
- |safe matnni ikki marta escape qiladi
+ Avtomatik escape o'chadi, XSS mumkin
- |safe faqat raqamlar uchun ishlaydi
- Shablon sekinlashadi, xavf yo'q
! Jinja2 standart holatda escape qiladi; |safe "bu matn ishonchli" degani. Foydalanuvchi matniga hech qachon qo'yilmaydi.

? CSP sarlavhasi §script-src 'self'§ nimani beradi?
- Barcha tashqi rasm va shriftlarni bloklaydi
+ Faqat o'z domenidan skript; inline skript bloklanadi
- Saytni boshqa saytlarda iframe qilishni taqiqlaydi
- Foydalanuvchi kiritgan matnni avtomatik tozalaydi
! CSP XSS oqibatini kamaytiradi: in'ektsiya qilingan inline skript ishlamaydi. U kiritishni tozalamaydi — escape baribir kerak.

? CSRF hujumi qaysi shart bajarilganda ishlaydi?
- Saytda XSS zaifligi bo'lsa
+ Brauzer cookie'ni boshqa saytdan kelgan so'rovga qo'shsa
- Foydalanuvchi parolini bilgan hujumchi bo'lsa
- Server HTTPS o'rniga HTTP ishlatsa
! Qurbon hujumchi sahifasini ochadi, brauzer esa sessiya cookie'sini avtomatik qo'shadi. Himoya: CSRF token, SameSite cookie, Origin tekshiruvi.

? Ilova foydalanuvchi bergan URL'dan rasm yuklab oladi. SSRF'dan qanday himoyalanish to'g'ri?
- URL'da "localhost" so'zi bo'lsa rad etish
+ Ruxsat etilgan hostlar ro'yxati va ichki IP'larni bloklash
- Faqat https:// bilan boshlanadigan URL'larni qabul qilish
- Yuklangan rasm hajmini 1 MB bilan cheklash
! Qora ro'yxat (localhost) 127.1, 0x7f000001, DNS orqali osongina aylanib o'tiladi. Allowlist va DNS hal qilingandan keyin IP tekshiruvi kerak; bulutda 169.254.169.254 alohida xavf.

? Python'da qaysi funksiya ishonchsiz ma'lumotni deserializatsiya qilganda kod bajarishga olib kelishi mumkin?
- json.loads
+ pickle.loads
- int()
- str.split
! pickle obyekt yaratishda ixtiyoriy chaqiruvlarni bajaradi. Tashqi ma'lumot uchun JSON kabi faqat ma'lumot formatlari ishlatiladi.

? Ilova §os.system("ping -c 1 " + host)§ chaqiradi, host foydalanuvchidan keladi. To'g'ri tuzatish?
- host ichidagi ; belgisini o'chirib tashlash
+ subprocess.run(["ping", "-c", "1", host]) va host'ni tekshirish
- Buyruqni root o'rniga oddiy foydalanuvchidan ishlatish
- os.system o'rniga os.popen ishlatish
! Ro'yxat ko'rinishidagi argumentlar shell'siz uzatiladi — ;, |, $() ishlamaydi. Qora ro'yxat bilan tozalash doim chala qoladi.

? ORM (SQLAlchemy) ishlatilsa, SQL injection butunlay yo'qoladimi?
- Ha, ORM har qanday so'rovni xavfsiz qiladi
+ Yo'q: text() yoki f-string bilan xom SQL yozilsa qoladi
- Ha, agar baza PostgreSQL bo'lsa
- Yo'q, ORM injection'ni yanada kuchaytiradi
! ORM parametrlarni o'zi bog'laydi, lekin dasturchi xom SQL'ni satr birlashtirish bilan yozsa, himoya yo'qoladi.

? Qaysi kontekstda HTML-escape yetarli emas va boshqa kodlash kerak?
- <p> teglari orasidagi oddiy matnda
+ <script> ichida yoki href="javascript:..." atributida
- <h1> sarlavha ichidagi matnda
- <li> ro'yxat elementi ichida
! Har kontekstning o'z kodlashi bor: HTML tana, atribut, JavaScript, URL. Shuning uchun foydalanuvchi ma'lumotini skript ichiga qo'ymaslik eng yaxshisi.

? Login formasida noto'g'ri parol uchun "parol noto'g'ri", mavjud bo'lmagan hisob uchun "foydalanuvchi topilmadi" chiqadi. Bu qanday muammo?
- Bu yaxshi amaliyot: foydalanuvchiga aniq yordam beradi
+ Hisoblarni sanash (enumeration) imkonini beradi
- Bu SQL injection belgisi, so'rov xato qaytarmoqda
- Bu muammo emas, faqat interfeys dizayni masalasi
! Bir xil xabar ("login yoki parol noto'g'ri") va bir xil javob vaqti mavjud hisoblarni bilib olishning oldini oladi.

## access
? Qaydnoma API'sida §GET /api/notes/1044§ boshqa foydalanuvchining qaydini qaytardi. Bu qaysi zaiflik va qayerda tuzatiladi?
- XSS; javobni HTML-escape qilish bilan
+ IDOR; serverda obyekt egasini tekshirish bilan
- CSRF; formaga token qo'shish bilan
- SQLi; so'rovni parametrli qilish bilan
! Har so'rovda server obyekt kimga tegishli va so'rovchi unga qanday huquqqa ega ekanini tekshirishi kerak (a2 dagi load_note(id, Action)).

? Admin tugmasi interfeysda yashirilgan, lekin §POST /api/admin/users§ oddiy foydalanuvchi tokeni bilan ham ishlaydi. Xulosa?
- Muammo yo'q: tugma ko'rinmasa, hech kim bilmaydi
+ Funksiya darajasidagi ruxsat serverda tekshirilmayapti
- Bu faqat interfeys xatosi, frontend'da tuzatiladi
- Token muddati uzun, uni qisqartirish yetarli
! Yashirish — himoya emas. Har bir endpoint serverda rolni tekshiradi (BFLA — Broken Function Level Authorization).

? Profilni yangilash API'si §{"name": "Ali", "role": "admin"}§ tanasini qabul qilib, rolni ham o'zgartirdi. Bu nima?
- Rate limiting yo'qligi
+ Mass assignment
- Open redirect
- Clickjacking
! Server kelgan hamma maydonni modelga yozmoqda. Yechim: ruxsat etilgan maydonlar ro'yxati (allowlist) yoki alohida kirish sxemasi.

? Kupon kodi bir buyurtmaga ikki marta parallel so'rov bilan qo'llandi va chegirma ikki barobar bo'ldi. Bu qaysi zaiflik turi?
- Kriptografik xato
+ Poyga holati (race condition) — biznes mantiq xatosi
- Server konfiguratsiyasi xatosi
- Kirish ma'lumotlarini noto'g'ri saqlash
! Tekshirish va yozish orasida oraliq bor. Tuzatish: tranzaksiya, qatorni bloklash yoki unikal cheklov (bir kupon — bir buyurtma).

? API javobida foydalanuvchi obyekti §password_hash§ va §reset_token§ maydonlari bilan to'liq qaytmoqda. Bu nima?
- Bu normal: frontend kerakli maydonni o'zi tanlaydi
+ Ortiqcha ma'lumot oshkor qilinmoqda (excessive data exposure)
- Bu faqat ishlash tezligiga ta'sir qiladigan masala
- Bu XSS zaifligi, javobni escape qilish kerak
! Javob sxemasi aniq bo'lishi kerak: faqat kerakli maydonlar. "Frontend yashiradi" — himoya emas, javobni har kim ko'radi.

? Qaysi biri kriptografik xato hisoblanadi?
- Parol xeshi uchun Argon2 ishlatish
+ Maxfiy ma'lumotni ECB rejimida AES bilan shifrlash
- TLS 1.3 bilan HTTPS ulanish
- Tokenlarni secrets.token_urlsafe bilan yaratish
! ECB bir xil bloklarni bir xil shifrlaydi — naqshlar ko'rinadi. To'g'ri tanlov: AES-GCM kabi autentifikatsiyali rejimlar.

? Ishlab chiqarish serverida Flask §debug=True§ bilan ishlayapti. Asosiy xavf?
- Sahifalar biroz sekinroq ochiladi
+ Xato sahifasi kod va interaktiv konsolni ochib beradi
- Loglar diskda ko'proq joy egallaydi
- Foydalanuvchilar dizayn o'zgarishlarini ko'radi
! Werkzeug debugger xato sahifasida kod bajarish imkonini beradi. Ishlab chiqarishda debug har doim o'chiq.

? API'da login endpointi soniyasiga minglab so'rovni qabul qilmoqda. Qaysi nazorat yetishmayapti?
- Kiritilgan ma'lumotni validatsiya qilish
+ Rate limiting va urinishlarni cheklash
- Javoblarni gzip bilan siqish
- So'rovlarni JSON formatda qabul qilish
! Cheklovsiz login — parol tanlash va credential stuffing uchun ochiq eshik. IP va hisob bo'yicha limit, kerak bo'lsa CAPTCHA va MFA.

? "Secure by default" tamoyiliga qaysi biri mos?
- Yangi foydalanuvchi standart holatda admin bo'ladi
+ Yangi qayd standart holatda shaxsiy (private) yaratiladi
- Debug rejimi standart yoqilgan, kerak bo'lsa o'chiriladi
- Barcha API endpointlar standart holatda ochiq bo'ladi
! Standart sozlama eng xavfsiz holat bo'lishi kerak; ochish — ongli qaror.

? Fayl yuklash funksiyasida qaysi nazorat eng muhim?
- Fayl nomini o'zgartirmasdan saqlash
+ Turini mazmunidan tekshirish, bajarilmaydigan joyda saqlash
- Faqat fayl kengaytmasi .jpg ekanini tekshirish
- Faylni veb-ildiz papkasiga to'g'ridan-to'g'ri yozish
! Kengaytma va Content-Type'ni hujumchi o'zi belgilaydi. Tasodifiy nom, hajm chegarasi, mazmun tekshiruvi va skript bajarilmaydigan saqlash joyi kerak.

? GraphQL API'da bitta so'rovda chuqur ichma-ich so'rovlar serverni to'xtatib qo'ydi. Qaysi himoya yetishmayapti?
- Javoblarni keshlash
+ So'rov chuqurligi va murakkabligiga chegara
- Maydon nomlarini qisqartirish
- So'rovlarni XML formatga o'tkazish
! GraphQL'da depth/complexity limit, timeout va kerak bo'lsa introspection'ni ishlab chiqarishda o'chirish tavsiya etiladi.

? Xato xabarida §psycopg2.errors.SyntaxError ... near "'"§ va to'liq stack trace ko'rindi. Bu qaysi muammolarni ko'rsatadi? (Ikkita javob)
+ Xato tafsilotlari foydalanuvchiga oshkor qilinmoqda
- Server xotirasi tugab qolgan
+ So'rovda injection ehtimoli bor
- Brauzer keshi eskirgan
! Qo'shtirnoqdan keyingi sintaksis xatosi — kiritish SQL'ga tushayotganining belgisi; stack trace esa ichki tuzilmani ochadi.

## ssdlc
? Threat modeling'da STRIDE nimani anglatadi?
- Oltita zaiflikni tuzatish bosqichlari
+ Tahdid turlari: aldash, o'zgartirish, inkor, oshkor qilish, DoS, imtiyoz
- Oltita xavfsizlik vositasining nomlari
- Kodni ko'rib chiqishning oltita qoidasi
! Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege — har ma'lumot oqimi shular bo'yicha so'raladi.

? SAST va DAST farqi nima?
- SAST ishlab turgan ilovani, DAST manba kodni tekshiradi
+ SAST manba kodni, DAST ishlab turgan ilovani tekshiradi
- SAST faqat Java uchun, DAST faqat Python uchun
- SAST pullik, DAST esa faqat bepul vositalar
! SAST (semgrep) kodni ishga tushirmasdan tahlil qiladi; DAST (ZAP) ishlab turgan ilovaga so'rov yuboradi. Ikkalasi bir-birini to'ldiradi.

? SCA vositasi nima qiladi?
- Kodni uslub qoidalari bo'yicha formatlaydi
+ Bog'liqliklarni ma'lum zaifliklar bazasi bilan solishtiradi
- Ilovani ishga tushirib, hujum so'rovlarini yuboradi
- Serverdagi ochiq portlarni skanerlaydi
! npm audit, pip-audit, Trivy — lock fayldagi aniq versiyalarni CVE/GHSA bazasi bilan solishtiradi.

? SAST hisobotida 120 ta topilma chiqdi. Birinchi navbatda nima qilinadi?
- Hammasini bir kunda tuzatishga urinish
+ Yolg'on topilmalarni ajratib, og'irlik bo'yicha saralash
- Vositani o'chirib, qo'lda tekshirishga o'tish
- Faqat eng oxirgi 10 tasini ko'rib chiqish
! Triage: haqiqiy va yolg'on topilmalar, ta'sir va ochiqlik bo'yicha ustuvorlik. Yolg'on topilmalar qoidalarni sozlash bilan kamaytiriladi.

? Dasturchi API kalitni kodga yozib commit qilmoqchi edi, pre-commit hook to'xtatdi. Bu qaysi amaliyot?
- DAST skanerlash
+ Shift-left: sirni repozitoriyga tushmasdan ushlash
- Penetratsion test
- Kod qoplamasini o'lchash
! Gitleaks yoki detect-secrets pre-commit'da — eng arzon nuqta. Tarixga tushgan sirni tozalashdan ko'ra oldini olish oson.

? Maxfiy kalitlarni saqlashning eng yaxshi usuli qaysi?
- Repozitoriydagi config.py faylida
+ Secrets manager (Vault, AWS Secrets Manager) orqali
- Docker image ichidagi .env faylida
- Jamoa chatidagi qadalgan xabarda
! Secrets manager kirishni boshqaradi, audit yuritadi va kalitni almashtirishni (rotation) osonlashtiradi.

? "Xavfsizlik talablari" bosqichida qaysi biri yaxshi yozilgan talab?
- "Ilova xavfsiz bo'lishi kerak"
+ "Parol kamida 12 belgi, 10 xatodan keyin 15 daqiqa blok"
- "Hakerlar kira olmasligi kerak"
- "Eng yaxshi shifrlash ishlatilsin"
! Talab tekshiriladigan bo'lishi kerak: test yozish va qabul qilish mumkin. ASVS shunday talablar ro'yxatini beradi.

? Secure code review paytida qaysi joylarga birinchi navbatda qaraladi?
- CSS fayllar va rasmlar
+ Kiritish nuqtalari, autentifikatsiya va ruxsat tekshiruvlari
- Izohlar va o'zgaruvchi nomlarining uslubi
- README va litsenziya fayllari
! Ma'lumot qayerdan kiradi va qayerga boradi (source → sink), kim nimaga ruxsat oladi — xatolarning aksariyati shu yerda.

? Typosquatting hujumi nima?
- Kodda imlo xatolari qoldirish
+ Mashhur paketga o'xshash nomli zararli paket chiqarish
- Domen nomini muddatidan oldin uzaytirish
- Parolda ataylab xato harf ishlatish
! reqeusts yoki 1odash kabi nomlar — o'rnatishda xato yozgan dasturchini ushlaydi. Lock fayl va paket nomini tekshirish yordam beradi.

? SBOM nima uchun kerak?
- Ilovaning foydalanuvchi qo'llanmasi sifatida
+ Ilovadagi barcha komponentlar ro'yxati, yangi CVE'da tez tekshirish uchun
- Serverlar ro'yxatini avtomatik yuritish uchun
- Kod sifatini baholash uchun ball sifatida
! Yangi zaiflik e'lon qilinganda (masalan Log4Shell) SBOM "bizda bu kutubxona bormi, qayerda?" degan savolga daqiqalarda javob beradi.

? DAST skaneri autentifikatsiyasiz ishga tushirildi. Natija haqida qaysi gap to'g'ri?
- Ilovaning hamma qismi to'liq tekshirildi
+ Login ortidagi sahifalar deyarli tekshirilmagan
- Skaner manba koddagi xatolarni ham topdi
- Natija SAST natijasi bilan bir xil bo'ladi
! DAST faqat yetib borgan sahifalarni tekshiradi. Test foydalanuvchisi bilan autentifikatsiyali skan sozlanadi.

? Tuzatilgan zaiflik keyingi relizda qaytib kelmasligi uchun nima qilinadi?
- Zaiflik haqidagi tiketni o'chirib tashlash
+ Uni takrorlaydigan xavfsizlik testi yozib, CI'ga qo'shish
- Dasturchiga ogohlantirish xati yuborish
- Faqat keyingi pentestni kutish
! a2 dagi pytest xavfsizlik testlari kabi: regressiya testi har commitda ishlaydi va xato qaytsa build yiqiladi.

## devsecops
? GitHub Actions'da §pull_request_target§ va PR kodini checkout qilish birga ishlatilsa, qanday xavf bor?
- Workflow sekinroq ishlaydi
+ Begona PR kodi repozitoriy sirlari bilan bajariladi
- PR avtomatik birlashtirilmay qoladi
- Workflow loglari saqlanmaydi
! pull_request_target asosiy repozitoriy kontekstida, sirlar bilan ishlaydi. Unda ishonchsiz kodni bajarish — CI orqali sir o'g'irlash yo'li.

? CI pipeline'da uchinchi tomon action'ini qanday ulash xavfsizroq?
- uses: vendor/action@main
+ uses: vendor/action@<to'liq commit SHA>
- uses: vendor/action@latest
- uses: vendor/action (versiyasiz)
! Teg va tarmoq o'zgarishi mumkin; commit SHA o'zgarmaydi. Shunday qilib, action buzilganda ham kutilmagan kod kirmaydi.

? Dockerfile'da qaysi qator xavfsizlikni yaxshilaydi?
- FROM python:latest
+ USER appuser
- RUN chmod -R 777 /app
- ENV DB_PASSWORD=parol123
! Konteyner root bo'lmagan foydalanuvchida ishlashi kerak. latest — takrorlanmaydi, 777 — hamma yozadi, ENV dagi parol image tarixida qoladi.

? Konteyner image'ida build vaqtidagi sir (masalan, token) qayerda qolib ketishi mumkin?
- Faqat ishlab turgan konteyner xotirasida
+ Image qatlamlarida, keyin o'chirilgan bo'lsa ham
- Faqat Docker hub'dagi izohlarda
- Hech qayerda, Docker sirlarni avtomatik o'chiradi
! Har RUN/COPY yangi qatlam; keyingi qatlamda o'chirish oldingisidan olib tashlamaydi. docker history va qatlamlarni ochish sirni ko'rsatadi. BuildKit secret mount kerak.

? Zaiflikni boshqarishda CVSS 9.8 lekin ichki, internetga yopiq serverdagi zaiflik va CVSS 7.5 lekin internetdagi va KEV ro'yxatidagi zaiflik bor. Qaysi biri birinchi?
- CVSS 9.8, chunki bali yuqori
+ CVSS 7.5, chunki ochiq va faol ekspluatatsiya qilinmoqda
- Ikkalasi bir vaqtda, navbat muhim emas
- Hech biri, avval keyingi skan kutiladi
! Ustuvorlik — og'irlik, ochiqlik va ekspluatatsiya faktini birga hisoblaydi. KEV — haqiqatda ishlatilayotgan zaifliklar ro'yxati.

? Mobil ilova ichida API kaliti satr sifatida saqlangan. Bu haqida qaysi gap to'g'ri?
- Obfuskatsiya qilingani uchun uni topib bo'lmaydi
+ Ilovani ochib (decompile) kalitni olish mumkin
- App Store tekshiruvi kalitni himoyalaydi
- Faqat root qilingan telefonda kalit ishlaydi
! Foydalanuvchi qurilmasiga yuborilgan hamma narsa — ommaviy. Maxfiy amallar server orqali, foydalanuvchi tokeni bilan qilinadi.

? Mobil ilovada certificate pinning nima beradi?
- Ilovani tezroq yuklanishiga yordam beradi
+ Faqat kutilgan sertifikat bilan ulanib, MITM'ni qiyinlashtiradi
- Foydalanuvchi parolini telefonda shifrlaydi
- Ilovani boshqa qurilmaga ko'chirishni taqiqlaydi
! Pinning qo'shimcha qatlam: qurilmaga o'rnatilgan begona CA sertifikati bilan trafikni ushlash qiyinlashadi.

? DevSecOps'da "security gate" qayerda va qanday ishlaydi?
- Faqat relizdan keyin, qo'lda tekshiruv sifatida
+ CI'da: kritik topilma bo'lsa build to'xtaydi
- Faqat dasturchining kompyuterida, ixtiyoriy
- Ishlab chiqarishda, hujum aniqlanganda
! Masalan, Trivy yoki npm audit --audit-level=critical nol bo'lmagan kod qaytarsa, pipeline yiqiladi. Chegara jamoa bilan kelishiladi.

? Kubernetes deployment'ida qaysi sozlama konteynerga ortiqcha huquq beradi?
- readOnlyRootFilesystem: true
+ privileged: true
- runAsNonRoot: true
- allowPrivilegeEscalation: false
! privileged konteyner host qurilmalariga deyarli to'liq kira oladi. Qolgan uchtasi — tavsiya etilgan cheklovlar.

? AppSec portfolio loyihasi uchun nima eng ishonarli?
- Topilgan zaifliklar ro'yxati, tuzatishsiz
+ Topilma, tuzatish, test va CI tekshiruvi bilan to'liq hikoya
- Mashhur vositalar logotiplari bilan slayd
- Boshqa birovning loyihasidan nusxa
! Ish beruvchi zaiflikni topish, tushuntirish, tuzatish va qaytmasligini ta'minlash qobiliyatini ko'rmoqchi.

? Image skaneri bazaviy image'da 40 ta zaiflik ko'rsatdi. Eng samarali birinchi qadam?
- Har bir zaiflikni qo'lda patch qilish
+ Kichikroq, yangilangan bazaviy image'ga o'tish
- Skanerni o'chirib, ogohlantirishlarni yashirish
- Zaifliklarni ilova kodida tuzatishga urinish
! Slim yoki distroless image'lar paketlar sonini va zaiflik yuzasini keskin kamaytiradi; keyin qolganlari ko'riladi.

? Pipeline loglarida §DB_PASSWORD=S3cr3t...§ ochiq chiqib qoldi. To'g'ri harakatlar? (Ikkita javob)
+ Parolni darhol almashtirish
- Log faylini o'chirib, hech kimga aytmaslik
+ Sirni CI secret sifatida maskalash
- Pipeline'ni bir haftaga to'xtatish
! Logni ko'rgan har kim parolni bilishi mumkin — almashtirish shart. CI secret'lari loglarda avtomatik yashiriladi.
`.replace(/§/g, '`');
