/* Reference entries for sqlite3 and the SQL the labs teach (names sql:select ..., shown by their title). */

import type { CommandDoc } from './docs';

const s = (name: string, title: string, summary: string, usage: string, flags: [string, string, string?][], examples: [string, string][], note?: string): CommandDoc => ({
  name: `sql:${name}`,
  title,
  category: 'sql',
  summary,
  usage,
  flags,
  examples,
  note,
});

export const SQL_DOCS: CommandDoc[] = [
  {
    name: 'python3',
    category: 'sql',
    summary: "Python dasturini ishga tushiradi. Bu yerda haqiqiy Python 3 (standart kutubxona bilan): skript lab fayllarini o'qiy oladi va yozgan fayllari terminalda ko'rinadi.",
    usage: 'python3 FAYL.py [ARGUMENTLAR]   yoki   python3 -c "KOD"',
    flags: [
      ['FAYL', 'Fayldagi dasturni bajaradi.', 'python3 tahlil.py'],
      ['ARGUMENT', "Fayldan keyingi so'zlar dasturga sys.argv ro'yxati bo'lib boradi: sys.argv[1] — birinchisi.", 'python3 salomlash.py Aziz'],
      ['-c', "Bir qatorli kodni bajaradi — tez hisoblash va sinash uchun.", 'python3 -c "print(2 ** 10)"'],
      ['--version', 'Python versiyasi.', 'python3 --version'],
    ],
    examples: [
      ['python3 tahlil.py auth.log', "Skriptga log faylini argument qilib berish"],
      ['python3 -c "import hashlib; print(hashlib.sha256(b\'abc\').hexdigest())"', 'Bir qatorda xesh hisoblash'],
    ],
    note: "Interaktiv >>> rejim va pip (internetdan paket o'rnatish) yo'q; standart kutubxona (re, json, csv, hashlib, sqlite3, collections ...) tayyor. Dastur 5 soniyadan uzoq ishlasa, to'xtatiladi.",
  },
  {
    name: 'sqlite3',
    category: 'sql',
    summary: "SQLite bazasi bilan ishlaydigan buyruq qatori dasturi: so'rovni bajaradi, jadvallarni ko'rsatadi, natijani turli ko'rinishda chiqaradi.",
    usage: 'sqlite3 [FLAGLAR] BAZA.db "SQL;"   yoki   sqlite3 BAZA.db ".buyruq"',
    flags: [
      ['.tables', "Bazadagi jadvallar ro'yxati.", 'sqlite3 qaydnoma.db ".tables"'],
      ['.schema', "Jadval qanday yaratilgan (ustunlar va turlari).", 'sqlite3 qaydnoma.db ".schema foydalanuvchilar"'],
      ['.indexes', "Jadvalning indekslari ro'yxati.", 'sqlite3 soc.db ".indexes net_events"'],
      ['.read',"Fayldagi so'rov(lar)ni bajaradi — muharrirda yozib, shu bilan ishga tushirasiz.", 'sqlite3 qaydnoma.db ".read sorov.sql"'],
      ['-header', 'Natija tepasida ustun nomlari.', 'sqlite3 -header qaydnoma.db "SELECT * FROM qaydlar LIMIT 3;"'],
      ['-column', "Ustunlarni tekislab, jadval ko'rinishida chiqaradi (sarlavha bilan).", 'sqlite3 -column qaydnoma.db "SELECT id, ism FROM foydalanuvchilar;"'],
      ['-box', "Chiziqli jadval — o'qish uchun eng qulayi.", 'sqlite3 -box qaydnoma.db "SELECT rol, COUNT(*) FROM foydalanuvchilar GROUP BY rol;"'],
      ['-csv', 'CSV — Excel yoki boshqa dastur uchun; > bilan faylga yoziladi.', 'sqlite3 -header -csv qaydnoma.db "SELECT * FROM foydalanuvchilar;" > users.csv'],
      ['-json', "JSON ko'rinishi — jq yoki Python bilan ishlash uchun.", 'sqlite3 -json qaydnoma.db "SELECT id, ism FROM foydalanuvchilar LIMIT 2;"'],
      ['-line', "Har ustun alohida qatorda: uzun yozuvni ko'rish uchun.", 'sqlite3 -line qaydnoma.db "SELECT * FROM qaydlar WHERE id = 7;"'],
    ],
    examples: [
      ['sqlite3 qaydnoma.db ".tables"', 'Qanday jadvallar bor'],
      ['sqlite3 -box qaydnoma.db ".read sorov.sql"', "Muharrirdagi so'rovni chiroyli jadval bilan bajarish"],
    ],
    note: "Simulyatorda interaktiv sqlite> rejimi yo'q: so'rov qo'shtirnoq ichida beriladi yoki faylga yozilib .read bilan bajariladi. Baza — haqiqiy SQLite.",
  },
  s('select', 'SELECT', "Jadvaldan ma'lumot o'qiydi. Bazani o'zgartirmaydi.", 'SELECT ustun1, ustun2 FROM jadval;', [
    ['*', 'Barcha ustunlar.', 'SELECT * FROM foydalanuvchilar;'],
    ['AS', 'Ustunga boshqa nom (taxallus).', 'SELECT ism AS foydalanuvchi FROM foydalanuvchilar;'],
    ['DISTINCT', 'Takrorlanmaydigan qiymatlar.', 'SELECT DISTINCT rol FROM foydalanuvchilar;'],
    ['LIMIT', 'Faqat birinchi N qator.', 'SELECT * FROM qaydlar LIMIT 5;'],
  ], [['SELECT id, ism, email FROM foydalanuvchilar LIMIT 3;', "Uchta foydalanuvchi, uch ustun"]]),
  s('where', 'WHERE', "Qatorlarni shart bo'yicha filtrlaydi.", 'SELECT ... FROM jadval WHERE shart;', [
    ['=', "Teng. Matn bitta qo'shtirnoqda: 'admin'.", "WHERE rol = 'admin'"],
    ['AND', 'Ikkala shart ham.', "WHERE rol = 'admin' AND yaratilgan > '2026-01-01'"],
    ['OR', 'Shartlardan biri.', "WHERE natija = 'xato' OR natija = 'bloklangan'"],
    ['IN', "Ro'yxatdagi qiymatlardan biri.", "WHERE rol IN ('admin', 'moderator')"],
    ['BETWEEN', "Oraliq (chegaralar kiradi).", "WHERE vaqt BETWEEN '2026-11-17 00:00' AND '2026-11-17 23:59'"],
    ['IS NULL', "Qiymat yo'q (= NULL ishlamaydi!).", 'WHERE oxirgi_kirish IS NULL'],
  ], [["SELECT ism FROM foydalanuvchilar WHERE rol = 'admin';", 'Administratorlar']]),
  s('like', 'LIKE', "Matnni andoza bilan solishtiradi: % — istalgan belgilar, _ — bitta belgi. SQLite'da harf kattaligiga qaramaydi (lotin harflar).", "WHERE ustun LIKE 'andoza'", [
    ['%', 'Istalgan uzunlikdagi belgilar.', "WHERE email LIKE '%@qaydnoma.example.com'"],
    ['_', 'Aynan bitta belgi.', "WHERE ism LIKE 'a_iz'"],
    ['NOT LIKE', 'Andozaga mos KELMAYDIGANlar.', "WHERE email NOT LIKE '%@qaydnoma.example.com'"],
  ], [["SELECT ism, email FROM foydalanuvchilar WHERE email NOT LIKE '%@qaydnoma.example.com';", 'Tashqi pochtali foydalanuvchilar']]),
  s('order', 'ORDER BY', 'Natijani saralaydi.', 'SELECT ... ORDER BY ustun [ASC|DESC];', [
    ['ASC', "O'sish tartibi (sukut).", 'ORDER BY yaratilgan'],
    ['DESC', 'Kamayish tartibi — eng katta/yangisi birinchi.', 'ORDER BY urinishlar DESC'],
  ], [['SELECT ism, yaratilgan FROM foydalanuvchilar ORDER BY yaratilgan DESC LIMIT 3;', "Eng yangi 3 foydalanuvchi"]]),
  s('group', 'GROUP BY', "Qatorlarni guruhlab, har guruh uchun hisoblaydi (agregat funksiyalar bilan).", 'SELECT ustun, COUNT(*) FROM jadval GROUP BY ustun;', [
    ['COUNT', 'Nechta qator: COUNT(*); COUNT(DISTINCT x) — nechta turli qiymat.', 'SELECT rol, COUNT(*) FROM foydalanuvchilar GROUP BY rol;'],
    ['SUM', "Yig'indi (AVG — o'rtacha, MIN, MAX).", 'SELECT SUM(hajm) FROM qaydlar;'],
    ['HAVING', "Guruhlardan keyingi filtr (WHERE — guruhlashdan oldin).", 'GROUP BY ip HAVING COUNT(*) >= 5'],
  ], [["SELECT ip, COUNT(*) AS urinishlar FROM kirish_jurnali WHERE natija = 'xato' GROUP BY ip ORDER BY urinishlar DESC;", "IP bo'yicha muvaffaqiyatsiz kirishlar"]]),
  s('join', 'JOIN', "Ikki jadvalni umumiy ustun bo'yicha bog'laydi.", 'SELECT ... FROM a JOIN b ON a.x = b.y;', [
    ['ON', "Qaysi ustunlar bo'yicha bog'lanadi.", 'JOIN foydalanuvchilar AS f ON q.egasi_id = f.id'],
    ['LEFT JOIN', "Chap jadvalning HAMMA qatorlari; o'ngda mosi yo'q bo'lsa — NULL.", 'FROM foydalanuvchilar f LEFT JOIN qaydlar q ON q.egasi_id = f.id'],
  ], [['SELECT f.ism, COUNT(q.id) FROM foydalanuvchilar f LEFT JOIN qaydlar q ON q.egasi_id = f.id GROUP BY f.id;', "Har foydalanuvchining qaydlari soni (0 ham)"]]),
  s('subquery', "Ichki so'rov", "So'rov ichidagi so'rov: natijasi IN, = yoki FROM da ishlatiladi.", 'WHERE ustun IN (SELECT ...)', [
    ['IN', "Ichki so'rov qaytargan qiymatlardan biri.", "WHERE ip IN (SELECT ip FROM kirish_jurnali WHERE natija = 'xato')"],
    ['WITH', "Nomlangan ichki so'rov (CTE) — uzun so'rovni o'qishli qiladi.", 'WITH xatolar AS (SELECT ...) SELECT * FROM xatolar;'],
    ['UNION ALL', "Bir xil ustunli bir nechta so'rov natijasini ketma-ket qo'shadi — turli jadvallardan yagona vaqt chizig'i.", "SELECT ts, 'auth' FROM auth_log UNION ALL SELECT ts, 'proc' FROM proc_events ORDER BY ts;"],
  ], [["SELECT DISTINCT foydalanuvchi FROM kirish_jurnali WHERE natija = 'ok' AND ip IN (SELECT ip FROM kirish_jurnali WHERE natija = 'xato');", "Shubhali manzildan muvaffaqiyatli kirganlar"]]),
  s('date', 'Sana funksiyalari', "SQLite sanani matn sifatida saqlaydi ('2026-11-17 09:12:03'); funksiyalar uni bo'laklaydi va hisoblaydi.", "date(vaqt), strftime('%H', vaqt)", [
    ['date', "Faqat sana qismi.", 'SELECT date(vaqt), COUNT(*) FROM kirish_jurnali GROUP BY date(vaqt);'],
    ['strftime', "Istalgan qism: %H soat, %Y yil, %w hafta kuni.", "SELECT strftime('%H', vaqt) AS soat, COUNT(*) FROM kirish_jurnali GROUP BY soat;"],
    ['julianday', "Ikki vaqt farqini hisoblash uchun (kunlarda; ×86400 — soniya).", "SELECT (julianday(b) - julianday(a)) * 86400"],
  ], [["SELECT date(vaqt) AS kun, COUNT(*) FROM kirish_jurnali WHERE natija = 'xato' GROUP BY kun;", 'Kunlik xatolar']]),
  s('window', 'Oyna funksiyalari', "Har qatorga qo'shni qatorlardan hisob qo'shadi — guruhlamasdan.", 'funksiya() OVER (PARTITION BY ... ORDER BY ...)', [
    ['LAG', "Oldingi qatordagi qiymat: ketma-ket hodisalar orasidagi vaqt.", 'LAG(ts) OVER (PARTITION BY host ORDER BY ts)'],
    ['ROW_NUMBER', 'Guruh ichida tartib raqami.', 'ROW_NUMBER() OVER (PARTITION BY user ORDER BY ts)'],
  ], [["SELECT ts, (julianday(ts) - julianday(LAG(ts) OVER (ORDER BY ts))) * 86400 AS oraliq FROM net_events;", "Ulanishlar orasidagi soniyalar"]]),
  s('case', 'CASE', "Shartga qarab qiymat tanlaydi — SQL'dagi if.", 'CASE WHEN shart THEN qiymat ... ELSE qiymat END', [
    ['WHEN', 'Shart va natija.', "CASE WHEN criticality = 'high' THEN 1 ELSE 2 END"],
    ['COALESCE', "Birinchi NULL bo'lmagan qiymat.", "COALESCE(owner, 'noma''lum')"],
  ], [["SELECT host, CASE WHEN bytes_out > 1000000 THEN 'katta' ELSE 'kichik' END FROM net_events;", 'Hajm toifasi']]),
  s('update', 'UPDATE', "Mavjud qatorlarni o'zgartiradi. WHERE ni unutish — hamma qator o'zgaradi!", 'UPDATE jadval SET ustun = qiymat WHERE shart;', [
    ['SET', 'Yangi qiymat(lar).', "SET rol = 'bloklangan'"],
    ['WHERE', "Faqat shu qatorlar. Avval xuddi shu WHERE bilan SELECT qiling.", "WHERE ism = 'nodira'"],
  ], [["UPDATE foydalanuvchilar SET rol = 'bloklangan' WHERE ism = 'nodira';", 'Bitta hisobni bloklash']]),
  s('insert', 'INSERT', "Jadvalga yangi qator qo'shadi.", 'INSERT INTO jadval (ustunlar) VALUES (qiymatlar);', [
    ['VALUES', "Qiymatlar ustunlar tartibida.", "INSERT INTO insidentlar (sarlavha) VALUES ('Credential stuffing');"],
  ], [["INSERT INTO insidentlar (vaqt, sarlavha, holat) VALUES ('2026-11-18 03:00', 'nodira hisobi buzilgan', 'ochiq');", 'Insident yozuvi']]),
  s('index', 'INDEX', "Ustun bo'yicha qidiruvni tezlashtiradi (kitob oxiridagi ko'rsatkich kabi).", 'CREATE INDEX nom ON jadval(ustun);', [
    ['CREATE INDEX', "Indeks yaratish.", 'CREATE INDEX idx_jurnal_ip ON kirish_jurnali(ip);'],
  ], [['CREATE INDEX idx_jurnal_ip ON kirish_jurnali(ip);', "IP bo'yicha so'rovlar tezlashadi"]]),
];
