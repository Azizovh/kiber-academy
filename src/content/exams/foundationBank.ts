/* Poydevor exam: scenario questions, grouped by exam topic. Format: see parseBank in engine/exam.ts.
 * Written with § for the backtick (the bank is a template literal); it becomes ` when loaded.
 * Wrong options are written as plausible misconceptions of about the same length as the right one: a content test
 * fails when the right answer can be spotted by being the longest. */

export const FOUNDATION_BANK = String.raw`
## kompyuter
? Hamkasbingiz "hisobot.pdf" degan faylni yubordi, lekin u ochilmayapti. Siz terminalda tekshirdingiz:
§§§
$ file hisobot.pdf
hisobot.pdf: PE32+ executable (GUI) x86-64, for MS Windows
§§§
Bu nimani bildiradi?
- PDF buzilgan; uni boshqa PDF dasturida ochib ko'rish kerak
+ Bu Windows dasturi, kengaytma aldamoqda — ochmay xabar berish kerak
- PDF ichiga dastur joylash odatiy hol, xavotirga o'rin yo'q
- file buyrug'i Windows fayllarini noto'g'ri aniqlaydi, natija ishonchsiz
! file mazmunga (magic bytes) qaraydi, kengaytmaga emas. PDF deb nomlangan PE fayl — klassik phishing usuli.

? Base64 bilan "yashirilgan" parol topildi: §YWRtaW46UWF5ZG5vbWEyMDI2§. Qaysi gap to'g'ri?
- Bu shifrlash: kalitni bilmasdan asl matnni olib bo'lmaydi
+ Bu kodlash: har kim kalitsiz ochadi, demak himoya emas
- Bu xesh: uni orqaga qaytarib bo'lmaydi, faqat tanlash mumkin
- Bu siqish: asl matnni olish uchun arxivchi dastur kerak
! Base64 ma'lumotni matn ko'rinishiga keltiradi xolos; base64 -d bilan darhol ochiladi.

? 0x1F (o'n oltilik) o'nlik sanoqda nechaga teng?
- 15
+ 31
- 17
- 255
! 1×16 + 15 = 31.

? Bir bayt nechta bitdan iborat va u nechta turli qiymatni ifodalaydi?
- 4 bit, 16 qiymat
+ 8 bit, 256 qiymat
- 8 bit, 255 qiymat
- 16 bit, 65536 qiymat
! 8 bit → 2⁸ = 256 qiymat (0 dan 255 gacha).

? Operatsion tizimning yadrosi (kernel) nima qiladi?
- Oynalar, menyular va sichqoncha bilan ishlashni chizadi
+ Xotira, jarayonlar va qurilmalarni boshqaradi
- Dasturlarni internetdan yuklab, o'rnatib beradi
- Fayllarni vaqti-vaqti bilan zaxira nusxaga ko'chiradi
! Kernel — dastur bilan apparatura orasidagi qatlam: xotira, jarayonlar, qurilmalar, ruxsatlar. Dasturlar unga tizim chaqiruvlari orqali murojaat qiladi.

? Nega xavfsizlik tahlilchisi shubhali faylni o'z kompyuterida emas, virtual mashinada ochadi?
- Virtual mashinada fayllar tezroq ochiladi va tahlil qisqaradi
+ VM izolyatsiya qiladi va snapshot'ga qaytarib bo'ladi
- Zararli dasturlar virtual mashinada umuman ishga tushmaydi
- Tahlil dasturlari litsenziyasi faqat VM ichida ishlaydi
! Snapshot va izolyatsiya — xavfsiz tajriba muhiti. Lekin "VM'da zararli kod ishlamaydi" degani noto'g'ri: ba'zilari VM'ni sezib, o'zini boshqacha tutadi.

? Windows'da lokal foydalanuvchi parollari xeshlari qayerda saqlanadi?
- C:\Windows\System32\passwords.txt faylida
+ SAM bazasida (domenda — domen kontrollerida)
- Har foydalanuvchining ish stolidagi yashirin faylda
- Brauzerning saqlangan parollar bo'limida
! Lokal hisoblar — SAM, domen hisoblari — Active Directory (NTDS.dit). Ikkalasi ham tizim tomonidan himoyalangan.

? UTF-8 haqida qaysi gap to'g'ri?
- Har bir belgi doim aniq 1 bayt egallaydi
+ Belgi 1–4 bayt oladi, ASCII matn o'zgarmaydi
- Faqat lotin alifbosidagi harflarni ifodalaydi
- Har bir belgi doim aniq 4 bayt egallaydi
! UTF-8 o'zgaruvchan uzunlikdagi kodlash: lotin harflari 1 bayt, boshqa yozuvlar 2–4 bayt.

? Faylning SHA-256 xeshi rasmiy saytdagi bilan bir xil chiqdi. Bu nimani isbotlaydi?
- Fayl zararli kod saqlamasligini
+ Fayl yo'lda o'zgarmaganini
- Faylni kim yaratib imzolaganini
- Fayl ichidagi ma'lumot shifrlanganini
! Xesh yaxlitlikni tekshiradi, muallif va xavfsizlikni emas. Xesh va fayl bir saytdan bo'lsa, ikkalasi birga almashtirilgan bo'lishi mumkin.

? Jarayon (process) va dastur (program) farqi nima?
- Farqi yo'q: ikkalasi ham diskdagi bajariladigan fayl
+ Dastur — diskdagi fayl, jarayon — uning ishlayotgan nusxasi
- Jarayon — Windows atamasi, Linux'da faqat dastur bor
- Dastur doim bir nechta jarayondan tashkil topadi
! Bitta dasturdan bir nechta jarayon bo'lishi mumkin; har birining PID'i, xotirasi va egasi bor.

? Kompyuter yoqilganda birinchi ishga tushadigan narsa qaysi?
- OS yadrosi, keyin firmware
+ Firmware (UEFI), keyin bootloader
- Bootloader, keyin firmware
- Antivirus, keyin OS yadrosi
! Yuklanish zanjiri: UEFI → bootloader → kernel → tizim xizmatlari. Secure Boot shu zanjirni imzolar bilan tekshiradi.

? Qaysilari ikkilik (binary) fayl turini mazmunidan aniqlashga yordam beradi? (Ikkita javob)
+ Faylning boshidagi "magic bytes"
- Fayl nomidagi kengaytma
+ file buyrug'i natijasi
- Fayl yaratilgan sana
! file buyrug'i aynan magic bytes'ga qaraydi. Nom va sana osongina o'zgartiriladi.

## tarmoq
? 203.0.113.16/29 tarmog'ida nechta manzil bor va qurilmalarga nechtasini berish mumkin?
- 16 ta, 14 tasi
+ 8 ta, 6 tasi
- 29 ta, 27 tasi
- 32 ta, 30 tasi
! /29 → 32−29 = 3 bit → 2³ = 8 manzil; tarmoq va broadcast manzilini olib tashlasak — 6 ta.

? Brauzerda https://qaydnoma.example.com ochilganda tartib qanday?
- TLS → DNS → TCP → HTTP
+ DNS → TCP → TLS → HTTP
- HTTP → DNS → TCP → TLS
- TCP → DNS → HTTP → TLS
! Avval nom IP ga aylanadi (DNS), keyin TCP ulanish (443), uning ustida TLS qo'l siqish, eng ustida HTTP so'rov.

? Firewall logida bitta tashqi IP'dan 60 soniyada 1000 ta turli portga SYN paketlari, javoblarning ko'pi RST. Bu nima?
- Foydalanuvchi bir nechta veb-saytni birdaniga ochmoqda
+ Port skanerlash: yopiq portlar RST bilan javob beradi
- DNS server ko'p so'rovga javob berolmay qolgan
- Zaxira nusxa dasturi fayllarni serverga ko'chirmoqda
! Ko'p portga SYN, ko'pincha RST — klassik SYN skan belgisi (nmap -sS).

? Qaysi manzil internetda marshrutlanmaydi (xususiy)?
- 8.8.8.8
- 203.0.113.20
+ 172.20.5.10
- 172.32.5.10
! RFC 1918: 10.0.0.0/8, 172.16.0.0/12 (172.16–172.31), 192.168.0.0/16. 172.20.x shu oraliqda, 172.32.x esa yo'q.

? DNS oddiy so'rovlari uchun qaysi transport protokoli va port ishlatiladi?
- TCP 80
+ UDP 53
- UDP 443
- TCP 25
! Oddiy so'rovlar UDP/53; TCP/53 katta javoblar va zona ko'chirish (AXFR) uchun.

? Wireshark'da FTP sessiyasini ochdingiz va §USER§ hamda §PASS§ buyruqlarini ochiq matnda ko'rdingiz. Asosiy xulosa?
- Wireshark parolni o'zi deshifrlab ko'rsatgan, bu normal
+ FTP parolni shifrlamaydi; SFTP yoki FTPS kerak
- Parol aslida xeshlangan, ko'ringani faqat qisqartma
- FTP ichki tarmoqda ishlagani uchun bu xavfsiz
! FTP, Telnet, HTTP Basic (TLS'siz) — ochiq matnli protokollar: tarmoqni eshitgan har kim parolni ko'radi.

? ARP nima uchun kerak?
- Domen nomini IP manzilga aylantirish uchun
+ Mahalliy tarmoqda IP'ga mos MAC'ni topish uchun
- Qurilmalarga avtomatik IP manzil berish uchun
- Paketlarni tarmoqlar orasida yo'naltirish uchun
! ARP faqat L2 segment ichida ishlaydi; ARP spoofing — shu jadvalni aldash hujumi. Nom → IP — DNS, IP berish — DHCP.

? TCP uch tomonlama qo'l siqish (handshake) to'g'ri tartibi?
- SYN → ACK → FIN
+ SYN → SYN-ACK → ACK
- ACK → SYN → SYN-ACK
- SYN → RST → ACK
! Mijoz SYN, server SYN-ACK, mijoz ACK — ulanish o'rnatildi.

? NAT ortidagi ofisdan 50 kishi internetga chiqadi. Tashqi saytning logida ular qanday ko'rinadi?
- Har biri o'zining ichki 10.x manzili bilan
+ Hammasi bitta (yoki bir nechta) tashqi IP bilan
- Har biri o'z kompyuterining MAC manzili bilan
- Logda IP umuman yozilmaydi, faqat brauzer nomi
! NAT ichki manzillarni tashqi manzilga almashtiradi. Tashqi logdan aniq xodimni topish uchun NAT (firewall) logi kerak.

? HTTP status kodlari: 401 va 403 farqi?
- 401 — sahifa topilmadi; 403 — serverda ichki xato
+ 401 — avval kirish kerak; 403 — kirgansiz, ruxsat yo'q
- 401 — ruxsat yo'q; 403 — boshqa manzilga yo'naltirildi
- 401 — so'rov juda katta; 403 — so'rovlar juda ko'p
! Logda ko'p 401 — parol tanlash; ko'p 403 — ruxsatsiz resurslarni sinash belgisi.

? Qaysi portlar odatda qaysi xizmatga tegishli? (Ikkita to'g'ri juftlik)
+ 22 — SSH
- 25 — DNS
+ 3389 — RDP
- 443 — FTP
! 25 — SMTP, 53 — DNS, 443 — HTTPS, 21 — FTP.

? Ping (ICMP) javob bermadi. Bu server o'chiq ekanini isbotlaydimi?
- Ha: ICMP'ga javob bermagan server ishlamayapti
+ Yo'q: firewall ICMP'ni to'sishi mumkin
- Ha, agar ping uch marta ketma-ket yiqilsa
- Yo'q, chunki ping faqat Windows'da ishlaydi
! Ko'p tarmoqlarda ICMP bloklanadi; "javob yo'q" ≠ "server yo'q". Xizmat portini (masalan nc yoki curl bilan) tekshiring.

## linux
? §ls -l§ natijasi: §-rwxrwxrwx 1 root root 812 deploy.sh§. Bu skript cron'da root nomidan ishlaydi. Xavf nima?
- Xavf yo'q: egasi root bo'lgani uchun faqat root o'zgartiradi
+ Har kim faylni o'zgartirib, kodini root nomidan ishlata oladi
- Fayl hech kim uchun bajariladigan emas, cron uni ishlatmaydi
- Faylni faqat root o'qiy oladi, boshqalar ko'ra olmaydi
! 777 — hamma yozadi. Root ishga tushiradigan faylga boshqalar yoza olmasligi kerak: chmod 755 (yoki 700).

? auth.log da eng ko'p muvaffaqiyatsiz kirish qilgan IP'larni topish uchun qaysi quvur to'g'ri?
- grep "Failed password" auth.log | awk '{print $(NF-3)}' | uniq -c | sort -rn | head
+ grep "Failed password" auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head
- grep "Failed password" auth.log | awk '{print $(NF-3)}' | sort -rn | uniq | head
- grep "Failed password" auth.log | awk '{print $1}' | sort | uniq -c | sort -rn | head
! uniq faqat ketma-ket takrorlarni birlashtiradi, shuning uchun avval sort; $1 esa oy nomi, IP emas.

? §chmod 640 config.ini§ dan keyin kim nima qila oladi?
- Egasi o'qiydi, guruh o'qiydi va yozadi, boshqalar o'qiydi
+ Egasi o'qiydi va yozadi, guruh o'qiydi, boshqalar hech narsa
- Egasi o'qiydi va bajaradi, guruh yozadi, boshqalar hech narsa
- Egasi hamma narsa, guruh o'qiydi va yozadi, boshqalar o'qiydi
! 6 = rw-, 4 = r--, 0 = ---.

? Server sekinlashdi. Qaysi buyruq jarayonlarni CPU sarfi bo'yicha ko'rsatadi?
- df -h
+ top
- free -h
- du -sh
! top jonli ro'yxat beradi (yoki ps aux --sort=-%cpu). df — disk joyi, free — xotira, du — papka hajmi.

? §/etc/shadow§ fayli nima uchun faqat root o'qiy oladigan bo'lishi kerak?
- Unda barcha foydalanuvchilar nomi va uy papkasi bor
+ Unda parol xeshlari bor; o'g'irlansa oflayn tanlanadi
- Unda tarmoq interfeyslari va DNS sozlamalari bor
- Unda sudo huquqi berilgan foydalanuvchilar ro'yxati bor
! /etc/passwd — foydalanuvchilar (hammaga ochiq), /etc/shadow — xeshlar (faqat root), sudo huquqi — /etc/sudoers.

? Hujumchi doimiylik (persistence) uchun ko'pincha qayerga yozuv qo'shadi? (Ikkita javob)
+ cron jadvallari (/etc/cron.d, crontab)
- /tmp papkasidagi matn fayllari
+ ~/.ssh/authorized_keys
- /var/log/syslog jurnali
! Cron va SSH kaliti — ikki eng keng tarqalgan Linux persistence usuli. Ularni tekshirish IR ning birinchi qadamlaridan.

? §sudo§ bilan buyruq bajarilganda u tizimda qayerda iz qoldiradi?
- Hech qayerda, sudo iz qoldirmaydi
+ /var/log/auth.log yoki journal'da
- Faqat foydalanuvchining ~/.bash_history faylida
- /etc/sudoers fayliga qo'shib yoziladi
! sudo har chaqiruvni auth jurnaliga yozadi: kim, qachon, qaysi buyruq. bash_history esa foydalanuvchi o'chira oladigan fayl.

? Qaysi buyruq tinglayotgan (listening) portlarni va ularni ochgan jarayonni ko'rsatadi?
- ip addr
+ ss -tlnp
- ping -c 1
- ps aux
! ss -tlnp: TCP, listening, raqamli, jarayon bilan. ps jarayonlarni ko'rsatadi, lekin portlarni emas.

? §find / -perm -4000 -type f 2>/dev/null§ nima topadi?
- Hamma uchun yoziladigan fayllarni
+ SUID bitli fayllarni
- Root'ga tegishli barcha fayllarni
- 4000 baytdan katta fayllarni
! SUID fayl egasining (ko'pincha root) huquqi bilan ishlaydi; auditda standart ro'yxat bilan solishtiriladi. Hamma yozadigan fayllar — -perm -0002.

? Log faylida faqat 18-noyabr 02:00–02:59 oralig'idagi qatorlarni ko'rish uchun eng oddiy usul?
- grep "2026-11-18 02:" access.log
+ grep "18/Nov/2026:02:" access.log
- tail -n 3600 access.log | head
- sort -k4 access.log | head -n 60
! Vaqt belgisi matn bo'lgani uchun uning bir qismi bo'yicha grep qilish mumkin. Apache logida sana "18/Nov/2026:02:..." ko'rinishida yoziladi; tail va sort vaqt oralig'ini kafolatlamaydi.

? Xizmat ishlamayapti. Uning holati va oxirgi loglarini qaysi buyruqlar ko'rsatadi?
- ps aux | grep nomi va kill -HUP
+ systemctl status va journalctl -u
- cat /etc/systemd/system/nomi.service
- ss -tlnp va netstat -an
! systemctl status — holat va bir necha qator log, journalctl -u — xizmatning to'liq jurnali.

? Bash'da §>§ va §>>§ farqi?
- > oxiriga qo'shadi, >> faylni qayta yozadi
+ > faylni qayta yozadi, >> oxiriga qo'shadi
- > faqat xatolarni, >> faqat natijani yozadi
- Farqi yo'q, ikkalasi ham oxiriga qo'shadi
! Loglarni yoki konfiguratsiyani > bilan "qo'shaman" deb o'chirib yuborish — keng tarqalgan xato. Xatolar oqimi — 2>.

## dasturlash
? Kod tekshiruvida shu qatorni ko'rdingiz: §cur.execute("SELECT * FROM users WHERE ism = '" + ism + "'")§. Muammo va tuzatish?
- Tezlik muammosi: so'rovga indeks qo'shish kerak
+ SQL injection: parametrli so'rov (?) ishlatish kerak
- Qo'shtirnoq muammosi: ' belgisini ikkilantirish yetarli
- Muammo yo'q: ism foydalanuvchi formasidan keladi
! Parametrli so'rovda (execute("... WHERE ism = ?", (ism,))) baza matnni hech qachon SQL deb o'qimaydi. Qo'lda "tozalash" — mo'rt yechim.

? Python: §sanash = {}§ va har IP uchun §sanash[ip] = sanash.get(ip, 0) + 1§. Bu nima qiladi?
- IP'larni alifbo tartibida saralaydi
+ Har IP necha marta uchraganini sanaydi
- Takrorlangan IP'larni ro'yxatdan o'chiradi
- Faqat birinchi uchragan IP'ni saqlaydi
! get(ip, 0) — kalit bo'lmasa 0 qaytaradi. collections.Counter xuddi shuni qisqaroq qiladi.

? SQL: muvaffaqiyatsiz kirishlar 5 tadan ko'p bo'lgan IP'larni chiqarish uchun qaysi so'rov to'g'ri?
- SELECT ip, COUNT(*) FROM log WHERE natija = 'xato' AND COUNT(*) > 5 GROUP BY ip;
+ SELECT ip, COUNT(*) FROM log WHERE natija = 'xato' GROUP BY ip HAVING COUNT(*) > 5;
- SELECT ip, COUNT(*) FROM log GROUP BY ip HAVING natija = 'xato' AND COUNT(*) > 5;
- SELECT ip, COUNT(*) FROM log WHERE natija = 'xato' HAVING COUNT(*) > 5 GROUP BY ip;
! WHERE qatorlarni guruhlashdan oldin, HAVING guruhlarni keyin filtrlaydi; agregat shartlari HAVING da, HAVING esa GROUP BY dan keyin keladi.

? Python skript fayl topilmasa yiqilib qolyapti. To'g'ri yondashuv?
- Hamma xatoni yashirish uchun except: pass yozish
+ except FileNotFoundError bilan tushunarli xabar chiqarish
- Skriptni root nomidan ishga tushirib ko'rish
- Fayl yo'q bo'lsa, bo'sh faylni avtomatik yaratish
! Faqat kutilgan xatoni ushlang; "except: pass" boshqa xatolarni ham yashirib, nosozlikni topishni qiyinlashtiradi.

? Git repozitoriysiga tasodifan API kaliti commit qilindi va push bo'ldi. Birinchi qadam?
- Faylni o'chirib, yangi commit qilish
+ Kalitni darhol bekor qilish (rotate)
- Repozitoriyni private qilib qo'yish
- Commit xabarini o'zgartirib qayta push qilish
! Tarixdagi sir yo'qolmaydi va nusxalar allaqachon olingan bo'lishi mumkin; avval kalit bekor qilinadi, keyin tarix tozalanadi.

? Qaysi SQL buyrug'i WHERE siz ishlatilsa eng xavfli?
- SELECT
+ DELETE
- INSERT
- EXPLAIN
! DELETE (va UPDATE) WHERE siz jadvaldagi hamma qatorga ta'sir qiladi. Odat: avval xuddi shu WHERE bilan SELECT qilib, qaysi qatorlar tanlanishini ko'ring.

? Brauzerda sahifa kodini (View Source) ochib, JavaScript ichida §const apiKey = "..."§ ko'rdingiz. Bu nimani anglatadi?
- Kod siqilgani (minify) uchun kalit himoyalangan
+ Kalit ochiq: brauzerga yuborilgan narsani har kim ko'radi
- Kalitni faqat sayt dasturchilari ko'ra oladi
- HTTPS ulanish kalitni begonalardan yashiradi
! Mijoz tomonidagi kod — ommaviy; maxfiy kalitlar faqat serverda saqlanadi. HTTPS faqat yo'lda himoyalaydi.

? Python'da §if __name__ == "__main__":§ bloki nima uchun?
- Kodni tezroq ishlashi uchun oldindan kompilyatsiya qiladi
+ Fayl import qilinganda emas, to'g'ridan-to'g'ri ishlaganda bajariladi
- Blok ichidagi xatolarni avtomatik ushlab, logga yozadi
- Dasturni faqat administrator huquqi bilan ishga tushiradi
! Shu tufayli funksiyalarni boshqa skriptlardan import qilish va test qilish mumkin.

? SQL'da LEFT JOIN oddiy (INNER) JOIN dan nimasi bilan farq qiladi?
- Faqat o'ng jadvalning hamma qatorlarini qaytaradi
+ Chap jadval qatorlarini mos bo'lmasa ham (NULL bilan) qaytaradi
- Ikki jadvaldan faqat mos kelmagan qatorlarni qaytaradi
- Natijadagi takroriy qatorlarni avtomatik o'chiradi
! "Hech qaydi yo'q foydalanuvchilar" kabi savollarga LEFT JOIN ... WHERE o'ng.id IS NULL bilan javob beriladi.

? Regex: §Failed password for root from 198.51.100.37 port 41000 ssh2§ qatoridan IP ajratish uchun qaysi Python ifoda mos?
- re.search(r'port (\d+)', qator).group(1)
+ re.search(r'from (\S+) port', qator).group(1)
- re.search(r'for (\S+) from', qator).group(1)
- re.search(r'(\d+) ssh2', qator).group(1)
! Guruh (\S+) "from" va "port" orasidagi so'zni oladi; boshqalari port raqami yoki foydalanuvchi nomini beradi.

? HTML forma qiymati serverga kelganda dasturchi nima qilishi shart?
- Brauzer allaqachon tekshirgani uchun unga ishonish
+ Serverda qayta tekshirish: tur, uzunlik va ruxsat
- Faqat JavaScript bilan tekshiruvni kuchaytirish
- Qiymatni logga yozib, keyin tahlil qilish yetarli
! Mijoz tomonidagi validatsiya — qulaylik; brauzerdagi tekshiruvni osongina chetlab o'tish mumkin. Xavfsizlik — server tomonida.

? Git'da kim qaysi qatorni oxirgi marta o'zgartirganini qaysi buyruq ko'rsatadi?
- git status
+ git blame
- git diff
- git stash
! git blame har qatorning oxirgi commiti va muallifini ko'rsatadi; git log -S esa matn qo'shilgan commitni topadi.

## xavfsizlik
? Buxgalterga "Soliq qo'mitasi"dan xat keldi: "24 soat ichida ilovadagi hujjatni oching, aks holda jarima". Ilova — .docm. Bu qaysi ijtimoiy muhandislik belgilarini o'z ichiga oladi? (Ikkita javob)
+ Shoshiltirish va qo'rqitish
- Xatda imlo xatosi yo'qligi
+ Makrosli hujjat (.docm) ilovasi
- Xat ish vaqtida kelgani
! Shoshiltirish, obro'li tashkilot nomi va makrosli ilova — phishingning klassik uchligi.

? CIA uchligida ransomware birinchi navbatda qaysi xususiyatga hujum qiladi?
- Maxfiylik (confidentiality)
- Yaxlitlik (integrity)
+ Mavjudlik (availability)
- Hisobdorlik (accountability)
! Shifrlash — mavjudlikni yo'qotish. Zamonaviy ransomware ma'lumotni o'g'irlab, maxfiylikka ham hujum qiladi (ikki tomonlama tovlamachilik).

? Parollarni bazada saqlashning to'g'ri usuli?
- SHA-256 xeshi, tuzsiz
- AES bilan shifrlab
+ bcrypt yoki Argon2
- Base64 kodlab
! Tez xeshlar (MD5, SHA-256) parol uchun yomon: GPU sekundiga milliardlab tekshiradi. Shifrlangan parolni kalit bilan qaytarib olish mumkin. Sekin, tuzli funksiyalar kerak.

? MFA (ko'p faktorli autentifikatsiya) qaysi hujumdan eng yaxshi himoya qiladi?
- Serverni so'rovlar bilan to'ldirish (DDoS)
+ O'g'irlangan parol bilan hisobga kirish
- Formaga SQL kod qo'shish (SQL injection)
- Noutbukni ofisdan o'g'irlab ketish
! Parol bilganining o'zi yetmaydi — ikkinchi faktor kerak. Lekin SMS va push-charchoq hujumlari tufayli FIDO2 kalitlari kuchliroq.

? Eng kam imtiyoz (least privilege) tamoyili nimani talab qiladi?
- Har kim parolini har oy majburan o'zgartirishi
+ Har kim faqat o'z ishi uchun kerakli huquqqa ega bo'lishi
- Tizimdagi barcha tashqi portlar yopiq turishi
- Har bir xodimning harakati kamerada yozilishi
! Buzilgan hisob qancha kam huquqli bo'lsa, zarar shuncha kichik.

? CVSS bali 9.8 bo'lgan zaiflik haqida qaysi gap to'g'ri?
- Bu tizim allaqachon buzilganini bildiradi
+ Og'irligi kritik, ustuvorlik muhitga ham bog'liq
- Bu ball faqat Windows zaifliklariga beriladi
- 9.8 — o'n balli shkalada past daraja
! CVSS — og'irlik, xavf emas: aktivning ochiqligi va KEV ro'yxati (ekspluatatsiya qilinyaptimi) bilan birga baholanadi.

? HTTPS ulanishida sertifikat xatosi chiqdi ("sertifikat boshqa domen uchun"). To'g'ri harakat?
- "Baribir davom etish" tugmasini bosish
+ To'xtab, MITM yoki xato sozlashni tekshirish
- Brauzer keshini tozalab, qayta urinish
- Manzilni http:// ga almashtirib kirish
! Sertifikat tekshiruvi — TLS ning kim bilan gaplashayotganingizni isbotlovchi qismi.

? Qaysi biri "chuqur himoya" (defense in depth) misoli?
- Bitta, eng qimmat firewall sotib olish
+ Firewall, MFA, EDR, zaxira va monitoring birga
- Barcha xodimlarga bitta juda kuchli parol
- Har kompyuterga ikkita antivirus o'rnatish
! Har qatlam boshqasining kamchiligini to'ldiradi: bittasi yiqilsa, keyingisi ushlaydi.

? Kill chain bo'yicha hujumchi phishing xatini yuborgan bosqich qaysi?
- Reconnaissance (razvedka)
+ Delivery (yetkazish)
- Installation (o'rnatish)
- Exploitation (ekspluatatsiya)
! Razvedka → qurollanish → yetkazish → ekspluatatsiya → o'rnatish → C2 → maqsad.

? Simmetrik va asimmetrik shifrlash farqi?
- Asimmetrik tezroq, shuning uchun katta fayllar uchun
+ Simmetrikda bitta umumiy kalit, asimmetrikda kalit juftligi
- Simmetrik faqat parollarni saqlash uchun ishlatiladi
- Asimmetrikda kalit yo'q, faqat matematik formula bor
! TLS ikkalasini birga ishlatadi: asimmetrik — kalit almashish va imzo uchun, ma'lumotning o'zi tez simmetrik shifr (AES) bilan.

? OWASP Top 10 dagi "Broken Access Control" ga misol?
- Login sahifasi parolni ochiq HTTP orqali yuboradi
+ /api/orders/1044 orqali birovning buyurtmasi ochiladi
- Qidiruv maydoniga yozilgan matn SQL so'rovga qo'shiladi
- Serverda eski, yangilanmagan kutubxona ishlab turibdi
! IDOR — server obyekt egasini tekshirmayapti. Qolganlari: kriptografik xato, injection, eskirgan komponent.

? Kompaniyada ishlayotganingizda ochiq qolgan admin panelini tasodifan topdingiz. Etik va qonuniy yo'l?
- Ichiga kirib, qanchalik xavfli ekanini aniqlash
+ Hech narsaga tegmasdan mas'ul jamoaga xabar berish
- Muammo isboti uchun skrinshot olib, saqlab qo'yish
- Panel parolini o'zgartirib, keyin xabar berish
! Ruxsatsiz kirish — hatto "yaxshi niyatda" ham — qonunbuzarlik. Topilmani mas'ul shaxsga bildirish to'g'ri.
`.replace(/§/g, '`');
