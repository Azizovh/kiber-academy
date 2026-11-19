/*
 * The command reference: one entry per command, with every flag the simulator supports, each explained in Uzbek
 * with an example. It feeds `help` and `man` in the terminal, the "Buyruqlar" page, and the "new command" cards a
 * lab shows before a task that needs a command for the first time.
 */

import { PS_DOCS } from '../pwsh/docs';

export type DocCategory = 'fayl' | 'matn' | 'ruxsat' | 'jarayon' | 'foydalanuvchi' | 'tarmoq' | 'tizim' | 'xavfsizlik' | 'skript' | 'trafik' | 'konteyner' | 'kod' | 'powershell';

export interface CommandDoc {
  name: string;
  category: DocCategory;
  /** One sentence: what it is for. */
  summary: string;
  usage: string;
  /** [flag, what it does, example] */
  flags: [string, string, string?][];
  /** [command line, what it shows] */
  examples: [string, string][];
  /** Where the simulator does less than the real tool. */
  note?: string;
  /** Other names the shell accepts (PowerShell: ls, ps, ?...). */
  aliases?: string[];
}

export const DOC_CATEGORIES: Record<DocCategory, string> = {
  fayl: 'Fayl va kataloglar',
  matn: 'Matn bilan ishlash',
  ruxsat: 'Ruxsatlar',
  jarayon: 'Jarayonlar va xizmatlar',
  foydalanuvchi: 'Foydalanuvchilar',
  tarmoq: 'Tarmoq',
  tizim: 'Tizim haqida',
  xavfsizlik: 'Kodlash va yaxlitlik',
  skript: 'Skript va muhit',
  trafik: 'Trafik tahlili',
  konteyner: 'Konteynerlar va Kubernetes',
  kod: 'Git va kod xavfsizligi',
  powershell: 'PowerShell (Windows)',
};

const d = (
  name: string,
  category: DocCategory,
  summary: string,
  usage: string,
  flags: [string, string, string?][],
  examples: [string, string][],
  note?: string,
): CommandDoc => ({ name, category, summary, usage, flags, examples, note });

export const DOCS: CommandDoc[] = [
  // ── files and directories
  d('pwd', 'fayl', "Hozir qaysi katalogda turganingizni ko'rsatadi (print working directory).", 'pwd', [], [['pwd', '/home/talaba']]),
  d('ls', 'fayl', "Katalog ichidagi fayl va kataloglar ro'yxati.", "ls [FLAGLAR] [YO'L...]", [
    ['-l', "Batafsil ro'yxat: ruxsatlar, egasi, hajmi, o'zgartirilgan vaqti.", 'ls -l'],
    ['-a', "Yashirin (nuqta bilan boshlanuvchi) fayllarni ham, . va .. ni ham ko'rsatadi.", 'ls -a'],
    ['-A', "Yashirinlarni ko'rsatadi, lekin . va .. siz.", 'ls -A'],
    ['-h', "-l bilan birga hajmni o'qishga oson ko'rsatadi (4.9K, 12M).", 'ls -lh'],
    ['-t', "O'zgartirilgan vaqt bo'yicha saralaydi: eng yangisi birinchi.", 'ls -lt'],
    ['-S', "Hajm bo'yicha saralaydi: eng kattasi birinchi.", 'ls -lS'],
    ['-r', 'Tartibni teskari qiladi (masalan, eng eskisi birinchi).', 'ls -ltr'],
    ['-R', "Ichki kataloglarni ham ochib ko'rsatadi (rekursiv).", 'ls -R loyiha'],
    ['-1', 'Har bir nomni alohida qatorda chiqaradi.', 'ls -1'],
    ['-d', "Katalog ichini emas, katalogning o'zini ko'rsatadi.", 'ls -ld /etc'],
    ['-F', "Turini belgi bilan ko'rsatadi: / katalog, * bajariladigan, @ havola.", 'ls -F'],
  ], [
    ['ls -la', "Hamma narsa, yashirinlari bilan, batafsil — eng ko'p ishlatiladigan shakl"],
    ['ls -lhS /var/log', 'Loglar katalogida eng katta fayllar tepada'],
    ['ls -ltr', "Oxirgi o'zgargan fayl ro'yxat oxirida"],
  ]),
  d('cd', 'fayl', 'Boshqa katalogga o\'tadi (change directory).', "cd [KATALOG]", [
    ['..', 'Bir pog\'ona yuqoriga.', 'cd ..'],
    ['~', 'Uy katalogingizga (shunchaki cd ham shunday qiladi).', 'cd ~'],
    ['-', 'Oldingi turgan joyingizga qaytadi.', 'cd -'],
    ['/', "Mutlaq yo'l: ildizdan boshlab.", 'cd /var/log'],
  ], [['cd /etc && pwd', "/etc ga o'tib, tekshiradi"], ['cd ../..', 'Ikki pog\'ona yuqoriga']]),
  d('tree', 'fayl', "Katalog tuzilmasini daraxt ko'rinishida chiqaradi.", "tree [-a] [-d] [-L N] [YO'L]", [
    ['-a', "Yashirin fayllarni ham ko'rsatadi.", 'tree -a'],
    ['-d', "Faqat kataloglarni ko'rsatadi.", 'tree -d /etc'],
    ['-L N', 'Faqat N pog\'ona chuqurlikkacha.', 'tree -L 1'],
  ], [['tree loyiha', "Loyiha tuzilmasi bir qarashda"]]),
  d('mkdir', 'fayl', 'Yangi katalog yaratadi.', 'mkdir [-p] [-v] [-m REJIM] KATALOG...', [
    ['-p', "Oraliq kataloglarni ham yaratadi; katalog bor bo'lsa xato bermaydi.", 'mkdir -p a/b/c'],
    ['-v', 'Har yaratilgan katalog haqida xabar beradi.', 'mkdir -v zaxira'],
    ['-m REJIM', "Yaratishda ruxsatini darhol belgilaydi.", 'mkdir -m 700 maxfiy'],
  ], [['mkdir -p loyiha/{src,docs}', "Simulyatorda {a,b} ochilmaydi: mkdir -p loyiha/src loyiha/docs deb yozing"]]),
  d('touch', 'fayl', "Bo'sh fayl yaratadi yoki mavjud faylning o'zgartirilgan vaqtini yangilaydi.", 'touch [-c] [-d SANA] [-r FAYL] FAYL...', [
    ['-d SANA', "Vaqtni ko'rsatilgan sanaga qo'yadi.", 'touch -d "2026-11-01 14:30" eski.txt'],
    ['-r FAYL', "Boshqa faylning vaqtini ko'chiradi.", 'touch -r a.txt b.txt'],
    ['-c', "Fayl yo'q bo'lsa yaratmaydi.", 'touch -c yoq.txt'],
  ], [['touch hisobot.txt', "Bo'sh fayl"], ['touch -d yesterday log.txt', 'Kecha o\'zgargandek']],
  "Hujumchilar ba'zan touch -d bilan fayl vaqtini soxtalashtiradi (timestomping) — forensics'da shuni yodda tuting."),
  d('cp', 'fayl', 'Fayl yoki katalogdan nusxa oladi.', 'cp [-r] [-p] [-v] [-n] MANBA... MANZIL', [
    ['-r', 'Katalogni ichidagilari bilan nusxalaydi.', 'cp -r loyiha zaxira/'],
    ['-p', "Egasi, ruxsat va vaqtni saqlab qoladi (dalil nusxasi uchun muhim).", 'cp -p dalil.log /tmp/'],
    ['-a', "Arxiv rejimi: -r va -p birga.", 'cp -a /etc /tmp/etc-nusxa'],
    ['-v', 'Har bir nusxa haqida xabar beradi.', 'cp -v a.txt b.txt'],
    ['-n', "Mavjud faylning ustiga yozmaydi.", 'cp -n a.txt b.txt'],
    ['-i', "Ustiga yozishdan oldin so'raydi.", 'cp -i a.txt b.txt'],
  ], [['cp /etc/passwd ~/', 'Faylni uy katalogiga nusxalash']], '-i haqiqiy tizimda tasdiq so\'raydi; simulyator faqat eslatadi.'),
  d('mv', 'fayl', "Faylni ko'chiradi yoki nomini o'zgartiradi.", 'mv [-v] [-n] MANBA... MANZIL', [
    ['-v', 'Har bir ko\'chirish haqida xabar beradi.', 'mv -v eski.txt yangi.txt'],
    ['-n', "Mavjud faylning ustiga yozmaydi.", 'mv -n a.txt arxiv/'],
    ['-i', "Ustiga yozishdan oldin so'raydi.", 'mv -i a.txt b.txt'],
  ], [['mv hisobot.txt hisobotlar/', "Katalogga ko'chirish"], ['mv a.txt b.txt', 'Nomini o\'zgartirish']]),
  d('rm', 'fayl', "Fayl yoki katalogni o'chiradi. Savat yo'q — qaytarib bo'lmaydi!", 'rm [-r] [-f] [-v] [-i] FAYL...', [
    ['-r', "Katalogni ichidagilari bilan o'chiradi.", 'rm -r eski-loyiha'],
    ['-f', "Fayl yo'q bo'lsa ham xato bermaydi, so'ramaydi.", 'rm -f vaqtincha.tmp'],
    ['-v', "Har o'chirilgan narsa haqida xabar beradi.", 'rm -v *.tmp'],
    ['-i', "Har fayl uchun tasdiq so'raydi.", 'rm -i muhim.txt'],
    ['-d', "Bo'sh katalogni o'chiradi.", 'rm -d bosh-katalog'],
  ], [['rm -rf build', "Ehtiyot bo'ling: hech narsa so'ramasdan o'chiradi"]]),
  d('rmdir', 'fayl', "Faqat bo'sh katalogni o'chiradi.", 'rmdir KATALOG', [], [['rmdir bosh', "Ichida fayl bo'lsa: Directory not empty"]]),
  d('ln', 'fayl', 'Havola (link) yaratadi.', 'ln [-s] [-f] [-v] MANBA HAVOLA', [
    ['-s', "Simvolik havola: boshqa yo'lga \"yorliq\".", 'ln -s /var/log/syslog jurnal'],
    ['-f', "Shu nomdagi narsa bo'lsa, almashtiradi.", 'ln -sf yangi.conf joriy.conf'],
    ['-v', 'Yaratilgan havolani ko\'rsatadi.', 'ln -sv a.txt b'],
  ], [['ls -l jurnal', "Havola ls -l da: jurnal -> /var/log/syslog"]]),
  d('readlink', 'fayl', "Simvolik havola qayerga ko'rsatishini chiqaradi.", 'readlink [-f] HAVOLA', [['-f', "Barcha havolalarni oxirigacha kuzatib, haqiqiy yo'lni beradi.", 'readlink -f jurnal']], [['readlink jurnal', '/var/log/syslog']]),
  d('find', 'fayl', "Fayllarni nom, tur, hajm, vaqt, ruxsat va egasi bo'yicha qidiradi.", "find [YO'L] [SHARTLAR] [-exec BUYRUQ {} \\;]", [
    ['-name NAMUNA', "Nom bo'yicha (* va ? bilan). Qo'shtirnoqqa oling.", 'find / -name "*.conf"'],
    ['-iname NAMUNA', "Nom bo'yicha, katta-kichik harfga qaramasdan.", 'find . -iname "readme*"'],
    ['-type f|d|l', 'Fayl, katalog yoki simvolik havola.', 'find /etc -type d'],
    ['-size +N|-N', "Hajm: +10k kattaroq, -1k kichikroq (c bayt, k, M, G).", 'find /var -size +1M'],
    ['-mtime -N|+N', "O'zgartirilgan vaqt kunlarda: -1 oxirgi sutkada, +7 bir haftadan eski.", 'find /etc -mtime -1'],
    ['-mmin -N', "Xuddi shunday, daqiqalarda.", 'find /tmp -mmin -30'],
    ['-newer FAYL', 'Shu fayldan keyin o\'zgarganlar.', 'find / -newer /tmp/belgi'],
    ['-perm -4000', 'Ruxsat bo\'yicha: -4000 SUID, -0002 hamma yoza oladi.', 'find / -perm -4000 -type f'],
    ['-user NOM', 'Egasi bo\'yicha.', 'find /home -user root'],
    ['-empty', "Bo'sh fayl va kataloglar.", 'find . -empty'],
    ['-maxdepth N', 'Faqat N pog\'ona chuqurlikkacha.', 'find . -maxdepth 1 -type f'],
    ['-exec CMD {} \\;', 'Har topilgan fayl uchun buyruqni bajaradi ({} — fayl nomi).', 'find . -name "*.log" -exec wc -l {} \\;'],
    ['-delete', "Topilganlarni o'chiradi (ehtiyot bo'ling).", 'find /tmp -name "*.tmp" -delete'],
  ], [
    ['find / -perm -4000 -type f 2>/dev/null', 'SUID fayllar — server auditining klassik tekshiruvi'],
    ['find /var/www -mtime -2', 'Veb-saytda oxirgi ikki kunda nima o\'zgardi? (insident tergovi)'],
  ], 'Simulyatorda 2>/dev/null yo\'q: ruxsat xatolari natija bilan birga chiqadi.'),
  d('stat', 'fayl', "Fayl haqida to'liq ma'lumot: hajm, ruxsat raqam va harflarda, egasi, o'zgartirilgan vaqti.", 'stat FAYL...', [], [['stat /etc/shadow', 'Access: (0640/-rw-r-----) — ruxsat raqamda va harflarda']]),
  d('du', 'fayl', "Katalog va fayllar diskda qancha joy egallashini ko'rsatadi.", "du [-s] [-h] [-a] [-c] [-d N] [YO'L...]", [
    ['-s', 'Har bir argument uchun faqat jami.', 'du -s /var/log'],
    ['-h', "O'qishga oson birliklar (K, M).", 'du -sh *'],
    ['-a', "Kataloglar bilan birga fayllarni ham.", 'du -ah loyiha'],
    ['-c', "Oxirida umumiy jami.", 'du -ch *.log'],
    ['-d N', 'Faqat N pog\'ona chuqurlikkacha.', 'du -h -d 1 /var'],
  ], [['du -sh /var/log/*', 'Qaysi log eng ko\'p joy egallagan?']], 'Simulyatorda hajm fayl mazmunining baytlari bo\'yicha hisoblanadi.'),
  d('df', 'fayl', "Disklar (fayl tizimlari) qancha to'lganini ko'rsatadi.", 'df [-h]', [['-h', "O'qishga oson birliklar.", 'df -h']], [['df -h', 'Use% 90% dan oshsa — muammo yaqin']]),

  // ── text
  d('cat', 'matn', 'Fayl mazmunini chiqaradi; bir nechta faylni birlashtiradi.', 'cat [-n] [-b] [-s] [-E] FAYL...', [
    ['-n', 'Har qatorni raqamlaydi.', 'cat -n skript.sh'],
    ['-b', "Faqat bo'sh bo'lmagan qatorlarni raqamlaydi.", 'cat -b fayl.txt'],
    ['-s', "Ketma-ket bo'sh qatorlarni bittaga qisqartiradi.", 'cat -s fayl.txt'],
    ['-E', "Har qator oxiriga $ qo'yadi (ko'rinmas bo'sh joylarni topish uchun).", 'cat -E config.txt'],
  ], [['cat a.txt b.txt > ikkalasi.txt', 'Ikki faylni bittaga birlashtirish']]),
  d('less', 'matn', "Uzun faylni sahifalab o'qish. Simulyatorda cat kabi butun faylni chiqaradi.", 'less FAYL', [], [['less /var/log/syslog', "Haqiqiy tizimda: bo'sh joy — keyingi sahifa, q — chiqish, /so'z — qidirish"]]),
  d('nl', 'matn', 'Qatorlarni raqamlab chiqaradi (bo\'sh qatorlarni o\'tkazib).', 'nl FAYL', [], [['nl skript.sh', 'Kod qatorlari raqamlari bilan']]),
  d('head', 'matn', 'Faylning boshidagi qatorlar (odatda 10 ta).', 'head [-n N] [-c N] [FAYL]', [
    ['-n N', 'Boshidagi N ta qator.', 'head -n 5 /etc/passwd'],
    ['-N', 'Xuddi shu, qisqa yozuv.', 'head -3 fayl.txt'],
    ['-c N', 'Boshidagi N ta bayt.', 'head -c 16 fayl.bin'],
  ], [['ls -lt | head -n 5', "Eng yangi 5 ta fayl (pipe bilan)"]]),
  d('tail', 'matn', 'Faylning oxiridagi qatorlar (odatda 10 ta).', 'tail [-n N] [-n +N] [-c N] [FAYL]', [
    ['-n N', 'Oxirgi N ta qator.', 'tail -n 20 /var/log/auth.log'],
    ['-n +N', 'N-qatordan boshlab oxirigacha (masalan, sarlavhani tashlab).', 'tail -n +2 data.csv'],
    ['-c N', 'Oxirgi N ta bayt.', 'tail -c 100 fayl'],
    ['-f', "Faylga yangi qator qo'shilishini kuzatadi (jonli log).", 'tail -f /var/log/syslog'],
  ], [['tail -n 1 /var/log/auth.log', 'Oxirgi hodisa']], "-f simulyatorda yo'q — fayllar o'zgarmaydi."),
  d('wc', 'matn', "Qatorlar, so'zlar va baytlarni sanaydi.", 'wc [-l] [-w] [-c] [-m] [-L] [FAYL...]', [
    ['-l', 'Qatorlar soni.', 'wc -l /etc/passwd'],
    ['-w', "So'zlar soni.", 'wc -w matn.txt'],
    ['-c', 'Baytlar soni.', 'wc -c fayl'],
    ['-m', 'Belgilar soni (UTF-8 harflari bitta hisoblanadi).', 'wc -m matn.txt'],
    ['-L', 'Eng uzun qator uzunligi.', 'wc -L fayl'],
  ], [['grep Failed auth.log | wc -l', 'Nechta muvaffaqiyatsiz urinish?'], ['wc -l *.log', 'Bir nechta fayl — har biri va jami']]),
  d('grep', 'matn', 'Namuna (matn yoki regex) uchragan qatorlarni topadi.', 'grep [FLAGLAR] NAMUNA [FAYL...]', [
    ['-i', 'Katta-kichik harfga qaramaydi.', 'grep -i error syslog'],
    ['-v', "Teskarisi: namuna YO'Q qatorlar.", 'grep -v "^#" config'],
    ['-n', 'Qator raqamini ko\'rsatadi.', 'grep -n root /etc/passwd'],
    ['-c', 'Mos qatorlar soni.', 'grep -c Failed auth.log'],
    ['-r', 'Kataloglar ichida ham qidiradi.', 'grep -r password /etc'],
    ['-l', 'Faqat mos kelgan fayl nomlari.', 'grep -rl TODO loyiha'],
    ['-L', 'Mos kelMAgan fayl nomlari.', 'grep -L "set -e" *.sh'],
    ['-o', 'Qatorning faqat mos kelgan qismini chiqaradi.', 'grep -o "[0-9.]*" ips.txt'],
    ['-w', "Faqat butun so'z sifatida.", 'grep -w root /etc/passwd'],
    ['-x', 'Butun qator aynan mos kelishi kerak.', 'grep -x admin users.txt'],
    ['-E', "Kengaytirilgan regex: | + ? () qulayroq.", 'grep -E "Failed|Invalid" auth.log'],
    ['-F', "Namunani regex emas, oddiy matn deb biladi (nuqta — nuqta).", 'grep -F "1.2.3.4" log'],
    ['-A N', 'Mos qatordan keyingi N ta qatorni ham.', 'grep -A 2 error log'],
    ['-B N', 'Mos qatordan oldingi N ta qatorni ham.', 'grep -B 2 error log'],
    ['-C N', 'Oldin va keyin N tadan qator.', 'grep -C 1 error log'],
    ['-m N', 'Birinchi N ta moslikdan keyin to\'xtaydi.', 'grep -m 1 Accepted auth.log'],
    ['-q', 'Hech narsa chiqarmaydi, faqat topildi/topilmadi kodi (skriptlar uchun).', 'grep -q root /etc/passwd && echo bor'],
    ['-H / -h', 'Fayl nomini har qatorda ko\'rsatish / ko\'rsatmaslik.', 'grep -H root /etc/passwd'],
  ], [
    ['grep "Failed password" /var/log/auth.log', 'SSH orqali parol urinishlari'],
    ['grep -E -o "[0-9]{1,3}(\\.[0-9]{1,3}){3}" log | sort | uniq -c', 'Logdagi barcha IP manzillar va soni'],
  ]),
  d('sort', 'matn', 'Qatorlarni saralaydi.', 'sort [-r] [-n] [-u] [-f] [-k N] [-t AJRATGICH] [FAYL]', [
    ['-n', "Son bo'yicha (aks holda 10 2 dan oldin keladi).", 'sort -n sonlar.txt'],
    ['-r', 'Teskari tartib.', 'sort -rn'],
    ['-u', 'Takrorlarni olib tashlaydi.', 'sort -u ips.txt'],
    ['-f', 'Katta-kichik harfga qaramaydi.', 'sort -f ismlar.txt'],
    ['-k N', "N-ustun bo'yicha.", 'ps aux | sort -k3 -rn'],
    ['-t BELGI', "Ustunlarni shu belgi bo'yicha ajratadi.", 'sort -t: -k3 -n /etc/passwd'],
  ], [['sort | uniq -c | sort -rn', "Eng ko'p uchraydiganlar tepada — log tahlilining asosiy zanjiri"]]),
  d('uniq', 'matn', "Ketma-ket takrorlangan qatorlarni bittaga qisqartiradi. Odatda sort dan keyin.", 'uniq [-c] [-d] [-u] [-i] [FAYL]', [
    ['-c', 'Har qator necha marta uchraganini sanaydi.', 'sort ips.txt | uniq -c'],
    ['-d', 'Faqat takrorlangan qatorlar.', 'sort a.txt | uniq -d'],
    ['-u', 'Faqat bir marta uchragan qatorlar.', 'sort a.txt | uniq -u'],
    ['-i', 'Katta-kichik harfga qaramaydi.', 'sort -f a.txt | uniq -i'],
  ], [['cut -d" " -f1 access.log | sort | uniq -c | sort -rn | head', "Eng faol 10 ta IP"]]),
  d('cut', 'matn', 'Har qatordan kerakli ustun yoki belgilarni kesib oladi.', "cut -d AJRATGICH -f USTUNLAR [FAYL]  |  cut -c BELGILAR", [
    ['-d BELGI', 'Ustunlar ajratgichi (odatda Tab).', "cut -d: -f1 /etc/passwd"],
    ['-f N', 'Ustun(lar): 1 · 1,3 · 2-4 · 3- (oxirigacha) · -2 (boshidan).', "cut -d, -f2-4 data.csv"],
    ['-c N', 'Belgi(lar) pozitsiyasi bo\'yicha.', 'cut -c1-8 hash.txt'],
  ], [["cut -d: -f1,7 /etc/passwd", 'Foydalanuvchi nomi va qobig\'i']]),
  d('tr', 'matn', "Belgilarni almashtiradi yoki o'chiradi.", "tr TO'PLAM1 TO'PLAM2   |   tr -d TO'PLAM", [
    ['a-z A-Z', 'Kichik harflarni kattaga.', "echo salom | tr 'a-z' 'A-Z'"],
    ['-d', "Belgilarni o'chiradi.", "echo 'a-b-c' | tr -d '-'"],
  ], [["echo 'uryyb' | tr 'a-z' 'n-za-m'", 'ROT13 ni ochish']]),
  d('rev', 'matn', 'Har qatorni teskari yozadi.', 'rev [FAYL]', [], [['echo salom | rev', 'molas'], ["rev | cut -d. -f1,2 | rev", "Domenning oxirgi ikki qismini olish usuli"]]),
  d('awk', 'matn', 'Ustunlar bilan ishlash: tanlash, shart bo\'yicha filtrlash.', "awk [-F AJRATGICH] '[SHART] {print $1, $3}' [FAYL]", [
    ['{print $N}', 'N-ustunni chiqaradi ($0 — butun qator, $NF — oxirgisi).', "awk '{print $1}' access.log"],
    ['-F BELGI', 'Ustun ajratgichi.', "awk -F: '{print $1}' /etc/passwd"],
    ['SHART', 'Faqat shartga mos qatorlar: $9 == 404, $3 > 100, $7 ~ /admin/, NR > 1.', "awk '$9 == 404' access.log"],
    ['&&', 'Bir nechta shart birga.', "awk '$1 == \"10.0.0.5\" && $9 == 200' access.log"],
  ], [["awk -F: '$3 == 0 {print $1}' /etc/passwd", 'UID 0 — ya\'ni root huquqli akkauntlar']], "Simulyatorda faqat shart va { print ... } bor; o'zgaruvchilar, BEGIN/END yo'q."),
  d('sed', 'matn', "Matnni almashtiradi yoki qatorlarni o'chiradi; -i bilan faylning o'zini o'zgartiradi.", "sed [-i] [-n] 's/ESKI/YANGI/g' [FAYL]", [
    ['s/a/b/', 'Har qatordagi birinchi a ni b ga almashtiradi.', "sed 's/http/https/' urls.txt"],
    ['s/a/b/g', 'Barcha uchrashlarni almashtiradi.', "sed 's/ /_/g' fayl"],
    ['-i', "Faylning o'zini o'zgartiradi (natija ekranga chiqmaydi).", "sudo sed -i 's/yes/no/' /etc/ssh/sshd_config"],
    ['/namuna/d', "Mos qatorlarni o'chiradi.", "sed '/^#/d' config"],
    ['-n /namuna/p', 'Faqat mos qatorlarni chiqaradi.', "sed -n '/error/p' log"],
  ], [["sed 's/^PermitRootLogin yes/PermitRootLogin no/' sshd_config", 'Konfiguratsiyani tuzatishning xavfsiz ko\'rinishi (avval -i siz tekshiring)']]),
  d('diff', 'matn', 'Ikki faylni qatorma-qator solishtiradi.', 'diff [-u] [-q] [-i] ESKI YANGI', [
    ['-u', "Birlashgan format: - olib tashlangan, + qo'shilgan qatorlar.", 'diff -u eski.conf yangi.conf'],
    ['-q', "Faqat farq bor-yo'qligini aytadi.", 'diff -q a b'],
    ['-i', 'Katta-kichik harfga qaramaydi.', 'diff -i a b'],
  ], [['diff /etc/passwd /tmp/passwd.bak', "Kecha va bugun o'rtasida qaysi akkaunt qo'shilgan?"]]),
  d('tee', 'matn', "Kirgan ma'lumotni ham ekranga, ham faylga yozadi.", 'tee [-a] FAYL...', [['-a', "Faylning oxiriga qo'shadi.", 'echo qator | tee -a log.txt']], [['grep Failed auth.log | tee natija.txt | wc -l', 'Natijani saqlab, ayni paytda sanash']]),
  d('xargs', 'matn', "Kirgan ro'yxatni boshqa buyruqqa argument qilib beradi.", 'xargs [-n N] [-I {}] BUYRUQ', [
    ['-n N', 'Har safar N tadan argument.', 'echo a b c | xargs -n 1 echo'],
    ['-I {}', "Har element uchun alohida, {} o'rniga qo'yib.", 'ls | xargs -I {} echo fayl: {}'],
  ], [['find . -name "*.log" | xargs wc -l', 'Topilgan har bir logdagi qatorlar soni']]),
  d('jq', 'matn', "JSON bilan ishlaydi: maydon olish, filtrlash, jadval qilish.", "jq [-r] [-c] [-s] 'FILTR' [FAYL]", [
    ['.', 'Butun JSON ni chiroyli chiqaradi.', 'jq . data.json'],
    ['.maydon', 'Maydon qiymati (.a.b — ichma-ich).', "jq '.userIdentity.userName' event.json"],
    ['.[]', "Massiv elementlari bittadan.", "jq '.Records[]' trail.json"],
    ['select(SHART)', 'Shartga mos obyektlar.', "jq 'select(.status == 404)' log.json"],
    ['[.a, .b] | @tsv', 'Bir nechta maydonni jadval qatori qilib.', "jq -r '[.time, .ip] | @tsv' log.json"],
    ['-r', "Matnni qo'shtirnoqsiz chiqaradi.", "jq -r '.ip' log.json"],
    ['-c', 'Har obyekt bir qatorda.', "jq -c 'select(.EventID == 4625)' events.json"],
    ['-s', "Hamma qatorlarni bitta massivga yig'adi.", "jq -s 'length' events.json"],
    ['keys', 'Obyekt maydon nomlari (alifbo tartibida).', "jq -c 'keys' event.json"],
    ['length', 'Massiv uzunligi yoki obyektdagi maydonlar soni.', "jq -s 'length' events.json"],
    ['and / or', "Shartlarni birlashtirish: ikkalasi ham (and) yoki bittasi (or).", "jq 'select(.EventID == 4625 and .LogonType == 10)' ev.json"],
    ['test(REGEX)', 'Matn regexga mos keladimi (true/false).', "jq 'select(.path | test(\"admin\"))' log.json"],
    ['map(F)', "Massivning har bir elementiga F ni qo'llaydi.", "jq -s 'map(.ip)' log.json"],
    ['unique', 'Massivni tartiblab, takrorlarni olib tashlaydi.', "jq -s -c 'map(.user) | unique' log.json"],
  ], [["jq -r '.sourceIPAddress' cloudtrail.json | sort | uniq -c", 'CloudTrail: qaysi IP lardan chaqiruvlar bo\'lgan']]),

  // ── permissions
  d('chmod', 'ruxsat', "Fayl ruxsatlarini o'zgartiradi.", 'chmod REJIM FAYL...', [
    ['644', "Raqamli: egasi o'qiydi-yozadi, qolganlar faqat o'qiydi (r=4, w=2, x=1).", 'chmod 644 index.html'],
    ['600', "Faqat egasi o'qiydi va yozadi — maxfiy kalitlar uchun.", 'chmod 600 id_rsa'],
    ['755', "Egasi hamma narsa, qolganlar o'qish va bajarish — skript va kataloglar.", 'chmod 755 skript.sh'],
    ['u+x', "Belgili: egasiga (u) bajarishni (x) qo'shish. g — guruh, o — boshqalar, a — hamma.", 'chmod u+x skript.sh'],
    ['o-w', 'Boshqalardan yozish huquqini olish.', 'chmod o-w fayl'],
    ['u-s', "SUID bitini olib tashlash.", 'sudo chmod u-s /usr/local/bin/dastur'],
  ], [['chmod -R 750 /srv/app', "Butun katalogga (simulyatorda -R e'tiborsiz qoldiriladi)"]]),
  d('chown', 'ruxsat', "Fayl egasini o'zgartiradi (faqat root).", 'sudo chown EGA[:GURUH] FAYL', [], [['sudo chown www-data /var/www/index.html', 'Veb-server foydalanuvchisiga berish']]),
  d('sudo', 'ruxsat', 'Buyruqni root (administrator) nomidan bajaradi.', 'sudo BUYRUQ', [['-l', 'Sizga sudo orqali nima ruxsat etilganini ko\'rsatadi.', 'sudo -l']], [['sudo cat /etc/shadow', "Oddiy foydalanuvchi o'qiy olmaydigan fayl"]], "Simulyatorda parol so'ralmaydi va root sessiyasiga (sudo su) o'tilmaydi."),

  // ── processes and services
  d('ps', 'jarayon', 'Ishlayotgan jarayonlar ro\'yxati.', 'ps [aux | -ef]', [
    ['aux', "Hamma foydalanuvchilarning jarayonlari, CPU va xotira bilan.", 'ps aux'],
    ['-ef', "Ota jarayon (PPID) bilan to'liq ro'yxat.", 'ps -ef'],
  ], [['ps aux | sort -k3 -rn | head -n 5', "Eng ko'p CPU ishlatayotgan 5 ta jarayon"], ['ps aux | grep nginx', 'Muayyan dastur ishlayaptimi']]),
  d('pgrep', 'jarayon', "Nomi bo'yicha jarayon PID'ini topadi.", 'pgrep [-l] [-a] [-f] NAMUNA', [
    ['-l', 'PID bilan birga nomini.', 'pgrep -l ssh'],
    ['-a', "PID bilan to'liq buyruq qatorini.", 'pgrep -a python'],
    ['-f', 'Butun buyruq qatoridan qidiradi.', 'pgrep -f config.json'],
  ], [['pgrep -l nginx', '812 nginx']]),
  d('kill', 'jarayon', "Jarayonga signal yuboradi — odatda to'xtatish uchun.", 'kill [-9] PID...', [
    ['(signalsiz)', "SIGTERM (15): jarayondan to'xtashni so'raydi.", 'kill 2231'],
    ['-9', "SIGKILL: darhol majburan to'xtatadi.", 'kill -9 2231'],
    ['-l', "Signallar ro'yxati.", 'kill -l'],
  ], [['sudo kill -9 2231', "Boshqa foydalanuvchining jarayoni uchun sudo kerak"]], 'Insidentda avval dalillarni saqlang, keyin to\'xtating.'),
  d('systemctl', 'jarayon', 'systemd xizmatlarini boshqaradi.', 'systemctl BUYRUQ XIZMAT', [
    ['status', "Holati, asosiy PID, oxirgi jurnal qatorlari.", 'systemctl status nginx'],
    ['start / stop / restart', 'Ishga tushirish, to\'xtatish, qayta ishga tushirish (sudo).', 'sudo systemctl restart nginx'],
    ['enable / disable', 'Yuklanishda avtomatik ishga tushishni yoqish/o\'chirish.', 'sudo systemctl disable telnet'],
    ['--now', 'enable/disable bilan birga darhol start/stop ham.', 'sudo systemctl disable --now xizmat'],
    ['is-active / is-enabled', "Qisqa javob: active/inactive, enabled/disabled.", 'systemctl is-active ssh'],
    ['cat', "Xizmatning unit faylini ko'rsatadi (qaysi dasturni ishga tushiradi).", 'systemctl cat ssh'],
    ['list-units --type=service', "Xizmatlar ro'yxati; --state=running yoki --state=failed bilan filtr.", 'systemctl list-units --state=failed'],
    ['list-unit-files', "Barcha xizmatlar va yuklanishdagi holati.", 'systemctl list-unit-files'],
  ], [['systemctl list-units --type=service --state=running', 'Hozir nima ishlayapti — begona xizmat bormi?']]),
  d('journalctl', 'jarayon', 'systemd jurnali: xizmat nima uchun ishlamayotgani shu yerda.', 'journalctl -u XIZMAT [-n N]', [
    ['-u XIZMAT', 'Faqat shu xizmat yozuvlari.', 'journalctl -u nginx'],
    ['-n N', 'Oxirgi N ta yozuv.', 'journalctl -u ssh -n 20'],
    ['-xeu', "Oxirgi xatolar izohlari bilan (status xabarida tavsiya qilinadi).", 'journalctl -xeu nginx'],
  ], [['journalctl -u nginx -n 5', 'Oxirgi besh yozuv — odatda xato sababi shunda']]),
  d('ss', 'jarayon', 'Tinglayotgan portlar va ularni ochgan jarayonlar.', 'ss -tulpn', [
    ['-t', 'TCP.', 'ss -t'],
    ['-u', 'UDP.', 'ss -u'],
    ['-l', 'Faqat tinglayotganlar.', 'ss -l'],
    ['-p', 'Jarayon nomi va PID (boshqalarniki uchun sudo).', 'sudo ss -tlp'],
    ['-n', 'Port va manzillarni raqam ko\'rinishida.', 'ss -tln'],
  ], [['sudo ss -tulpn', "Serverdagi barcha ochiq portlar — auditning birinchi qadami. 0.0.0.0 — hamma interfeysda, 127.0.0.1 — faqat shu kompyuterdan"]]),
  d('crontab', 'jarayon', "Rejalashtirilgan vazifalar (cron): ma'lum vaqtda avtomatik bajariladigan buyruqlar.", 'crontab -l | crontab FAYL | crontab -r', [
    ['-l', "Joriy foydalanuvchining vazifalari.", 'crontab -l'],
    ['FAYL', "Fayldagi vazifalarni o'rnatadi.", 'crontab mycron'],
    ['-r', "Barcha vazifalarni o'chiradi.", 'crontab -r'],
    ['-u NOM', 'Boshqa foydalanuvchiniki (root).', 'sudo crontab -u www-data -l'],
  ], [["echo '0 3 * * * /home/talaba/zaxira.sh' > mycron", "Format: daqiqa soat kun oy hafta_kuni buyruq — bu yerda har kuni 03:00 da"]], "crontab -e (muharrir) simulyatorda yo'q. Tizim vazifalari /etc/crontab va /etc/cron.d/ da."),

  // ── users
  d('whoami', 'foydalanuvchi', 'Joriy foydalanuvchi nomi.', 'whoami', [], [['sudo whoami', 'root']]),
  d('id', 'foydalanuvchi', 'Foydalanuvchi va guruh identifikatorlari (UID, GID, guruhlar).', 'id [-u] [-G] [FOYDALANUVCHI]', [
    ['-u', 'Faqat UID.', 'id -u'],
    ['-G', "Faqat guruh raqamlari.", 'id -G'],
  ], [['id talaba', 'uid=1000(talaba) ... groups=...,27(sudo) — sudo guruhida']]),
  d('groups', 'foydalanuvchi', 'Foydalanuvchi qaysi guruhlarda.', 'groups [FOYDALANUVCHI]', [], [['groups ali', 'ali : ali developers']]),
  d('useradd', 'foydalanuvchi', "Yangi foydalanuvchi yaratadi (root). /etc/passwd va /etc/group o'zgaradi.", 'sudo useradd [-m] [-s QOBIQ] [-G GURUHLAR] NOM', [
    ['-m', 'Uy katalogini (/home/NOM) yaratadi.', 'sudo useradd -m ali'],
    ['-s QOBIQ', 'Kirish qobig\'i (odatda /bin/bash).', 'sudo useradd -m -s /bin/bash ali'],
    ['-G G1,G2', "Qo'shimcha guruhlar.", 'sudo useradd -m -G developers ali'],
  ], [['grep ali /etc/passwd', "Natijani tekshirish"]]),
  d('usermod', 'foydalanuvchi', "Mavjud foydalanuvchini o'zgartiradi (root).", 'sudo usermod -aG GURUH FOYDALANUVCHI', [['-aG', "Guruhga qo'shadi (-a siz boshqa guruhlardan chiqarib yuboradi!).", 'sudo usermod -aG sudo ali']], [['groups ali', 'Tekshirish']]),
  d('userdel', 'foydalanuvchi', "Foydalanuvchini o'chiradi (root).", 'sudo userdel [-r] FOYDALANUVCHI', [['-r', "Uy katalogini ham o'chiradi.", 'sudo userdel -r eski']], [['sudo userdel -r test', "Test akkauntini butunlay olib tashlash"]]),
  d('passwd', 'foydalanuvchi', "Parolni o'zgartiradi.", 'passwd [-S] [-l] [FOYDALANUVCHI]', [
    ['-S', 'Parol holati.', 'sudo passwd -S ali'],
    ['-l', 'Akkauntni parol bo\'yicha bloklaydi.', 'sudo passwd -l eski'],
  ], [['passwd', "O'z parolingizni almashtirish"]], "Simulyatorda parol so'ralmaydi."),
  d('su', 'foydalanuvchi', 'Boshqa foydalanuvchiga o\'tish.', 'su [-] FOYDALANUVCHI', [], [['su - ali', "Haqiqiy tizimda ali ning paroli so'raladi"]], "Simulyatorda boshqa foydalanuvchiga o'tilmaydi — sudo ishlating."),
  d('who', 'foydalanuvchi', 'Hozir tizimda kim bor.', 'who', [], [['who', "Kim, qaysi terminalda, qayerdan ulangan"]]),
  d('w', 'foydalanuvchi', 'Kim tizimda va nima qilyapti, yuklama bilan.', 'w', [], [['w', 'Notanish IP dan ulangan sessiya — tekshirish kerak']]),
  d('last', 'foydalanuvchi', 'Oxirgi kirishlar tarixi.', 'last [-n N] [FOYDALANUVCHI]', [['-n N', 'Oxirgi N ta yozuv.', 'last -n 5']], [['last root', 'root qachon kirgan']]),

  // ── network
  d('ip', 'tarmoq', 'Tarmoq interfeyslari, manzillar va marshrutlar.', 'ip a | ip r | ip link | ip neigh', [
    ['a', "Interfeyslar va IP manzillar (inet qatori).", 'ip a'],
    ['r', "Marshrutlar: default via — shlyuz.", 'ip r'],
    ['link', 'Interfeyslar va MAC manzillar.', 'ip link'],
    ['neigh', 'ARP jadvali: tarmoqdagi qo\'shnilar.', 'ip neigh'],
  ], [['ip a', 'Mening manzilim: inet 10.10.10.2/24']], 'Eski ifconfig va netstat o\'rniga ip va ss ishlatiladi.'),
  d('ping', 'tarmoq', 'Host javob beradimi va qanchalik tez (ICMP).', 'ping [-c N] HOST', [['-c N', "N ta so'rovdan keyin to'xtaydi.", 'ping -c 3 srv.lab']], [['ping -c 1 db.lab', "Javob yo'q — host o'chiq yoki ICMP firewall'da yopilgan"]]),
  d('traceroute', 'tarmoq', "Paket manzilga qaysi routerlar orqali borishini ko'rsatadi.", 'traceroute HOST', [], [['traceroute example.com', 'Har qator — bitta "sakrash" (hop)']]),
  d('dig', 'tarmoq', "DNS so'rovi: nom qaysi manzilga va boshqa yozuvlar.", 'dig [+short] NOM [A|MX|TXT|NS]  |  dig -x IP', [
    ['+short', 'Faqat javobning o\'zi.', 'dig +short srv.lab'],
    ['MX / TXT / NS', "Yozuv turi: pochta serveri, matn (SPF), nom serverlari.", 'dig example.com MX'],
    ['-x IP', "Teskari so'rov: IP qaysi nomga tegishli.", 'dig -x 10.10.10.20'],
  ], [['dig +short example.com TXT', 'SPF yozuvi — pochta xavfsizligi (s5 phishing darsi)']]),
  d('nslookup', 'tarmoq', "DNS so'rovi (oddiyroq chiqish).", 'nslookup NOM|IP', [], [['nslookup example.com', 'Name va Address']]),
  d('host', 'tarmoq', "Eng qisqa DNS so'rovi.", 'host NOM|IP', [], [['host example.com', 'has address ... mail is handled by ...']]),
  d('nc', 'tarmoq', 'netcat: portga ulanish yoki port ochiqligini tekshirish.', 'nc -zv HOST PORT[-PORT]  |  nc HOST PORT', [
    ['-z', "Ma'lumot yubormasdan faqat ochiqligini tekshiradi.", 'nc -z srv.lab 22'],
    ['-v', 'Batafsil: har port natijasi.', 'nc -zv srv.lab 20-25'],
  ], [['nc srv.lab 22', "Xizmat o'zi haqida aytgan qator (banner): SSH versiyasi"]], 'Faqat o\'z laboratoriyangiz yoki ruxsat berilgan tizimlarda.'),
  d('nmap', 'tarmoq', 'Tarmoqdagi hostlar va ochiq portlarni aniqlaydi (faqat ruxsat berilgan tarmoqda!).', 'nmap [-sn] [-sV] [-p PORTLAR] NISHON', [
    ['-sn', "Faqat qaysi hostlar tirikligini (portlarsiz).", 'nmap -sn 10.10.10.0/24'],
    ['-sV', "Ochiq portlardagi dastur va versiyani aniqlaydi.", 'nmap -sV srv.lab'],
    ['-p PORTLAR', "Faqat shu portlar: 22,80 yoki 1-1000.", 'nmap -p 22,80 srv.lab'],
    ['-A', "Kengaytirilgan: versiyalar va qo'shimcha ma'lumot.", 'nmap -A srv.lab'],
  ], [['nmap -sV -p 3306 portal.lab', "Ma'lumotlar bazasi porti va versiyasi"]], "Bu buyruq faqat Tarmoq razvedkasi labida bor (o'quv simulyatsiyasi). Haqiqiy hayotda faqat o'z tarmog'ingiz yoki yozma ruxsat bilan."),
  // ── git and code security
  d('git', 'kod', "Versiyalar tarixi: holat, tarix, o'zgarishlar, kim yozgan, tarmoqlar va tarixni tozalash.", 'git BUYRUQ [FLAGLAR]', [
    ['status', "Ishchi papka holati: o'zgargan, indeksga qo'shilgan, kuzatilmayotgan fayllar. -s — qisqa.", 'git status'],
    ['log', 'Commitlar tarixi (eng yangisi tepada).', 'git log'],
    ['log --oneline', "Har commit bitta qatorda: qisqa ID va sarlavha.", 'git log --oneline'],
    ['log -n N', 'Faqat oxirgi N ta commit (-3 ham bo\'ladi).', 'git log -n 3'],
    ['log --all', "Barcha tarmoqlar (branch), teglar va stash.", 'git log --oneline --all'],
    ['log --author', "Muallif bo'yicha.", 'git log --author=ali'],
    ['log --grep', "Commit xabarida qidirish (-i — katta-kichik harfsiz).", 'git log --grep=parol -i'],
    ['log -S', "Shu matn qo'shilgan yoki o'chirilgan commitlar (pickaxe) — sirlarni ovlashda eng foydali.", 'git log -S AKIA --oneline'],
    ['log -p', "Har commitning o'zgarishlari (diff) bilan.", 'git log -p -n 1'],
    ['log --stat', "Qaysi fayllar qancha o'zgargan.", 'git log --stat -n 2'],
    ['log --format', "O'z formatingiz: %h %an %ad %s (--date=short bilan).", "git log --format='%h %an %ad %s' --date=short"],
    ['log --diff-filter', "Faqat qo'shilgan (A), o'zgargan (M) yoki o'chirilgan (D) fayllar bor commitlar.", 'git log --diff-filter=D --name-only --oneline'],
    ['log -- YO\'L', "Faqat shu faylga tegishli commitlar.", 'git log --oneline -- config/.env'],
    ['show', "Bitta commit: muallif, xabar va o'zgarishlar. --stat, --name-only.", 'git show a1b2c3d'],
    ['show REV:YO\'L', "Fayl o'sha commitdagi ko'rinishda (o'chirilgan fayl ham).", 'git show a1b2c3d:config/.env'],
    ['diff', "O'zgarishlar: diff — ishchi papka va indeks, --cached — indeks va oxirgi commit, A B — ikki commit orasida.", 'git diff main feature/export'],
    ['blame', "Har qatorni kim va qaysi commitda yozgan. -L 10,20 — qator oralig'i.", 'git blame src/db.js'],
    ['grep', "Kuzatilayotgan fayllarda qidirish (-n qator raqami, -i). REV bersangiz — o'sha commitda.", 'git grep -n password'],
    ['branch', "Tarmoqlar; -a — masofadagilari bilan, -v — oxirgi commit bilan.", 'git branch -a'],
    ['checkout / switch', "Boshqa tarmoqqa o'tish (-b yangi tarmoq). checkout REV -- YO'L — faylni tiklash.", 'git switch feature/export'],
    ['add', "Faylni keyingi commitga qo'shish (indeksga).", 'git add .gitignore'],
    ['rm --cached', "Faylni gitdan chiqarish, lekin diskda qoldirish (masalan .env).", 'git rm --cached config/.env'],
    ['commit -m', 'Indeksdagini yangi commit qilib saqlash.', 'git commit -m "Remove .env from repo"'],
    ['restore', "Ishchi papkadagi faylni qaytarish; --staged — indeksdan chiqarish.", 'git restore --staged config/.env'],
    ['reflog', "HEAD qayerlarda bo'lgani: reset qilingan, \"yo'qolgan\" commitlar ham shu yerda.", 'git reflog'],
    ['stash list / show -p', "Vaqtincha saqlangan o'zgarishlar va ularning mazmuni.", 'git stash show -p stash@{0}'],
    ['check-ignore -v', "Fayl .gitignore'dagi qaysi qoida bilan e'tiborsiz qolayotganini ko'rsatadi.", 'git check-ignore -v config/.env'],
    ['tag / remote -v', 'Teglar va masofadagi repozitoriylar.', 'git remote -v'],
    ['filter-repo', "Tarixni qayta yozish: --path FAYL --invert-paths — faylni barcha commitlardan olib tashlash; --replace-text — matnni almashtirish. --force kerak.", 'git filter-repo --path config/.env --invert-paths --force'],
  ], [['git log -S "sk_live_" --all --oneline', "Stripe kaliti qaysi commitda paydo bo'lgan"], ['git show HEAD~3:config/.env', "3 commit oldingi .env mazmuni"]], "Simulyatorda tarmoq yo'q (clone, push, pull, fetch); muharrir ochilmaydi — commit xabari -m bilan. Tarixni qayta yozgandan keyin sirni baribir almashtirish kerak: u allaqachon ko'chirilgan bo'lishi mumkin."),
  d('gitleaks', 'kod', "Git tarixi va fayllardagi sirlarni (kalit, token, parol, shaxsiy kalit) topadi.", 'gitleaks git [-v] [--redact] [PAPKA]  |  gitleaks dir [-v] [PAPKA]', [
    ['git', 'Butun git tarixini tekshiradi (barcha tarmoqlar).', 'gitleaks git -v'],
    ['dir', "Faqat hozirgi fayllarni (gitsiz).", 'gitleaks dir -v .'],
    ['-v', "Har bir topilmani batafsil ko'rsatadi: fayl, qator, commit, muallif.", 'gitleaks git -v'],
    ['--redact', "Hisobotda sir qiymatini yashiradi (REDACTED).", 'gitleaks git -v --redact'],
    ['--report-path', 'Topilmalarni JSON faylga yozadi.', 'gitleaks git --redact --report-path leaks.json'],
  ], [['gitleaks git -v --redact', "Natija: RuleID (aws-access-token, github-pat, private-key...), Commit, File, Line"]], ".gitleaksignore faylidagi Fingerprint'lar e'tiborsiz qoldiriladi. Eski usul: gitleaks detect [--no-git] ham ishlaydi."),
  d('npm', 'kod', "Node.js bog'liqliklari: npm audit — package-lock.json dagi versiyalarni ma'lum zaifliklar bilan solishtiradi.", 'npm audit [--omit=dev] [--audit-level=DARAJA]  |  npm audit fix  |  npm ls PAKET', [
    ['audit', "Zaif paketlar: nomi, zaif versiyalar oralig'i, darajasi, advisory havolasi.", 'npm audit'],
    ['audit --omit=dev', "Faqat production bog'liqliklari (devDependencies'siz).", 'npm audit --omit=dev'],
    ['audit --audit-level', "Shu darajadan pastlari uchun xato kodi qaytarmaydi (CI uchun): low, moderate, high, critical.", 'npm audit --audit-level=high'],
    ['audit fix', "Tuzatilgan versiyalarga yangilaydi (package-lock.json o'zgaradi).", 'npm audit fix'],
    ['ls PAKET', "Bu paket qaysi bog'liqlik orqali kelganini ko'rsatadi.", 'npm ls minimist'],
  ], [['npm audit --omit=dev --audit-level=high', 'CI quvurida: high va critical bo\'lsa to\'xtatish']], "Simulyatorda internet yo'q: advisory'lar ro'yxati lab ichida berilgan, npm install ishlamaydi."),
  d('semgrep', 'kod', "Kodni qoidalar bo'yicha statik tahlil qiladi (SAST): xavfli andozalarni topadi.", 'semgrep [scan] --config QOIDALAR.yml [--severity ERROR] [PAPKA]', [
    ['--config', "Qoidalar fayli (rules: id, pattern-regex, message, severity, languages).", 'semgrep --config qoidalar.yml src/'],
    ['--severity', 'Faqat shu darajadagi qoidalar: ERROR, WARNING, INFO.', 'semgrep --config qoidalar.yml --severity ERROR .'],
  ], [['semgrep --config qoidalar.yml src/', "Har topilma: fayl, qoida, xabar va qator"]], "Simulyatorda faqat lokal qoidalar fayli va pattern-regex qoidalari ishlaydi (registry'dagi qoidalar internet talab qiladi)."),
  // ── containers and Kubernetes
  d('docker', 'konteyner', "Konteynerlar va image'lar bilan ishlaydi: ro'yxat, sozlama, loglar, ichida buyruq, tarix, xavfsiz ishga tushirish.", 'docker BUYRUQ [FLAGLAR] [NOM]', [
    ['ps', "Ishlayotgan konteynerlar. -a — to'xtaganlari ham, -q — faqat ID.", 'docker ps -a'],
    ['ps --format', "Kerakli ustunlar (Go shablon): {{.Names}}, {{.Image}}, {{.Status}}, {{.Ports}}.", "docker ps --format '{{.Names}}\\t{{.Ports}}'"],
    ['ps --filter', "Filtr: status=exited, name=web, ancestor=nginx.", 'docker ps -a --filter status=exited'],
    ['images', "Lokal image'lar: nomi, tegi, hajmi.", 'docker images'],
    ['inspect', "Konteyner yoki image'ning to'liq sozlamasi (JSON).", 'docker inspect web'],
    ['inspect -f', "JSON'dan bitta maydon (Go shablon): {{.Config.User}}, {{.HostConfig.Privileged}}, {{json .Mounts}}.", "docker inspect -f '{{.HostConfig.Privileged}}' web"],
    ['logs', "Konteyner loglari. --tail N — oxirgi N qator.", 'docker logs --tail 20 web'],
    ['exec', "Ishlayotgan konteyner ichida buyruq bajaradi. -u — boshqa foydalanuvchi sifatida.", 'docker exec web cat /etc/passwd'],
    ['top', 'Konteyner ichidagi jarayonlar.', 'docker top web'],
    ['stats --no-stream', 'CPU va xotira sarfi (bir martalik).', 'docker stats --no-stream'],
    ['port', "Qaysi portlar xostga ochilgan.", 'docker port web'],
    ['diff', "Image'ga nisbatan konteynerda o'zgargan fayllar: A — qo'shilgan, C — o'zgargan, D — o'chirilgan.", 'docker diff web'],
    ['history', "Image qatlamlari — har biri Dockerfile qatori. --no-trunc — to'liq.", 'docker history --no-trunc app:1.4'],
    ['run', "Image'dan yangi konteyner. -d — fonda, --name — nom, -p XOST:KONTEYNER — port.", 'docker run -d --name web -p 127.0.0.1:8080:80 nginx:1.27'],
    ['run --user', 'Konteyner ichida root emas, oddiy foydalanuvchi.', 'docker run -d --user 1000:1000 app:1.4'],
    ['run --read-only', "Konteyner fayl tizimini faqat o'qiladigan qiladi.", 'docker run -d --read-only app:1.4'],
    ['run --cap-drop', "Linux imkoniyatlarini (capabilities) olib tashlaydi: ALL — hammasi.", 'docker run -d --cap-drop ALL app:1.4'],
    ['run --memory', "Xotira chegarasi (256m, 1g). --pids-limit — jarayonlar soni.", 'docker run -d --memory 256m --pids-limit 100 app:1.4'],
    ['run --security-opt', 'no-new-privileges — jarayon huquqini oshira olmaydi.', 'docker run -d --security-opt no-new-privileges app:1.4'],
    ['stop / start / restart', "To'xtatish, ishga tushirish, qayta ishga tushirish.", 'docker stop web'],
    ['rm', "Konteynerni o'chirish (ishlayotgan bo'lsa -f).", 'docker rm -f web'],
    ['rmi', "Image'ni o'chirish.", 'docker rmi app:old'],
    ['network ls / volume ls', 'Tarmoqlar va volume\'lar.', 'docker network ls'],
  ], [["docker ps --format '{{.Names}} {{.Image}}'", "Qaysi konteyner qaysi image'dan"], ["docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}} {{end}}' web", 'Xostdan nimalar ulangan']], "Simulyatorda internetdan image yuklab olinmaydi va interaktiv qobiq (docker exec -it ... sh) yo'q: buyruqni to'g'ridan-to'g'ri bering."),
  d('trivy', 'konteyner', "Image'dagi ma'lum zaifliklarni (CVE) va qatlamlarga tushib qolgan sirlarni topadi.", 'trivy image [--severity DARAJA] [--scanners vuln,secret] [--ignore-unfixed] IMAGE', [
    ['image', "Image'ni tekshiradi.", 'trivy image nginx:1.21'],
    ['--severity', "Faqat shu darajalar: CRITICAL, HIGH, MEDIUM, LOW (vergul bilan).", 'trivy image --severity HIGH,CRITICAL app:1.4'],
    ['--scanners', "vuln — zaifliklar, secret — sirlar (kalit, parol).", 'trivy image --scanners secret app:1.4'],
    ['--ignore-unfixed', "Tuzatishi hali chiqmaganlarni ko'rsatmaydi.", 'trivy image --ignore-unfixed app:1.4'],
  ], [['trivy image --severity CRITICAL app:1.4 | grep Total', 'Nechta kritik zaiflik']], "Simulyatorda zaifliklar ro'yxati lab ichida berilgan (internet bazasiga ulanmaydi)."),
  d('hadolint', 'konteyner', "Dockerfile'ni eng yaxshi amaliyotlar bo'yicha tekshiradi (DL qoidalari).", 'hadolint Dockerfile', [], [['hadolint Dockerfile', "DL3007 — :latest teg, DL3002 — oxirgi USER root, DL3020 — ADD o'rniga COPY"]]),
  d('kubectl', 'konteyner', "Kubernetes klasterini boshqaradi: resurslarni ko'rish, tavsif, loglar, pod ichida buyruq, huquqlar, o'zgartirish.", 'kubectl BUYRUQ [TUR] [NOM] [-n NAMESPACE] [-o FORMAT]', [
    ['get', "Resurslar ro'yxati: pods, deploy, svc, secrets, sa, ns, nodes, rolebindings...", 'kubectl get pods'],
    ['-n NAMESPACE', "Qaysi namespace (standart: default).", 'kubectl get pods -n prod'],
    ['-A', 'Barcha namespace\'lar.', 'kubectl get pods -A'],
    ['-o wide', "Qo'shimcha ustunlar (IP, NODE).", 'kubectl get pods -o wide'],
    ['-o yaml', "To'liq obyekt YAML ko'rinishida (-o json ham bor).", 'kubectl get pod web-0 -o yaml'],
    ['-o jsonpath', "Obyektdan maydon(lar)ni ajratish: {.items[*].metadata.name}, {range}...{end}.", "kubectl get pods -o jsonpath='{.items[*].spec.containers[*].image}'"],
    ['-l', "Label bo'yicha filtr: app=web.", 'kubectl get pods -l app=web'],
    ['--show-labels', "Label'larni ustun qilib ko'rsatadi.", 'kubectl get pods --show-labels'],
    ['describe', "Batafsil tavsif va oxirgi hodisalar (Events).", 'kubectl describe pod web-0'],
    ['logs', "Pod loglari. --tail N, -c KONTEYNER.", 'kubectl logs web-0 --tail 20'],
    ['exec', "Pod ichida buyruq: -- dan keyin.", 'kubectl exec web-0 -- env'],
    ['top', 'CPU va xotira sarfi: top pods, top nodes. --sort-by=cpu.', 'kubectl top pods -A --sort-by=cpu'],
    ['auth can-i', "Ruxsat bormi? --as bilan boshqa nomidan; --list — hammasi.", 'kubectl auth can-i create pods --as=system:serviceaccount:prod:ci-bot'],
    ['get events', "Klasterdagi hodisalar: kim qachon nima yaratdi, xatolar.", 'kubectl get events -n prod'],
    ['delete', "O'chirish: delete TUR NOM.", 'kubectl delete pod miner-5d8f -n prod'],
    ['scale', "Replikalar soni: --replicas=0 — vaqtincha to'xtatish.", 'kubectl scale deployment/web --replicas=0'],
    ['apply -f', "YAML fayldagi obyektni yaratadi yoki yangilaydi.", 'kubectl apply -f deny-all.yaml'],
    ['cordon', "Node'ga yangi pod joylashtirishni to'xtatadi (uncordon — qaytaradi).", 'kubectl cordon worker-2'],
    ['config current-context', 'Hozir qaysi klaster bilan ishlayapsiz.', 'kubectl config current-context'],
  ], [["kubectl get secret db-cred -o jsonpath='{.data.password}' | base64 -d", "Secret qiymati — faqat Base64, shifrlanmagan"], ['kubectl get clusterrolebindings -o wide', 'Kimga klaster bo\'yicha qanday rol berilgan']], "Simulyatorda tarmoq yo'q (port-forward, proxy), interaktiv qobiq yo'q; apply qo'llab-quvvatlaydigan turlar: NetworkPolicy, Role, RoleBinding, ServiceAccount, Secret, Pod, Deployment, Namespace."),
  // ── traffic analysis
  d('capinfos', 'trafik', "Yozib olingan trafik fayli haqida qisqa ma'lumot: nechta paket, qancha vaqt, qachondan qachongacha.", 'capinfos FAYL.pcap', [], [['capinfos ofis.pcap', 'Tahlilni shundan boshlang: fayl qanchalik katta va qaysi vaqtni qamraydi']]),
  d('tcpdump', 'trafik', "Paketlarni bir qatordan ko'rsatadi va BPF filtri bilan saralaydi. Bu yerda tayyor faylni o'qiydi (-r).", "tcpdump -r FAYL [-n|-nn] [-c N] [-A] [-X] [-e] [-t] [-w YANGI.pcap] [FILTR]", [
    ['-r FAYL', "Tayyor .pcap faylni o'qiydi (jonli tarmoq o'rniga).", 'tcpdump -r ofis.pcap'],
    ['-n', "IP manzillarni nomga aylantirmaydi (port nomlari qoladi: http, domain).", 'tcpdump -n -r ofis.pcap'],
    ['-nn', 'Na manzil, na port nomga aylantiriladi — hammasi raqam.', 'tcpdump -nn -r ofis.pcap'],
    ['-c N', 'Faqat birinchi N ta paket.', 'tcpdump -nn -c 5 -r ofis.pcap'],
    ['-A', "Paket mazmunini matn (ASCII) sifatida ham chiqaradi — HTTP, FTP ko'rinadi.", 'tcpdump -nn -A -r ofis.pcap port 80'],
    ['-X', "Mazmunni hex va ASCII ko'rinishida.", 'tcpdump -nn -X -r ofis.pcap port 21'],
    ['-e', "MAC manzillarni ham ko'rsatadi (Ethernet sarlavhasi).", 'tcpdump -e -nn -r ofis.pcap arp'],
    ['-t', "Vaqt ustunisiz.", 'tcpdump -t -nn -r ofis.pcap icmp'],
    ['-w FAYL', "Filtrga mos paketlarni yangi faylga yozadi.", 'tcpdump -r ofis.pcap -w dns.pcap port 53'],
    ['host IP', "Shu manzildan yoki shu manzilga.", 'tcpdump -nn -r ofis.pcap host 10.10.20.31'],
    ['src host / dst host', "Faqat manba yoki faqat manzil bo'yicha (src IP / dst IP qisqasi).", 'tcpdump -nn -r ofis.pcap src host 10.10.20.31'],
    ['port N', "Shu port (manba yoki manzil).", 'tcpdump -nn -r ofis.pcap port 53'],
    ['src port / dst port', "Faqat manba yoki faqat manzil porti.", 'tcpdump -nn -r ofis.pcap dst port 443'],
    ['net TARMOQ/N', "Butun tarmoq: 10.10.20.0/24.", 'tcpdump -nn -r ofis.pcap net 10.10.20.0/24'],
    ['tcp / udp / icmp / arp', 'Protokol bo\'yicha.', 'tcpdump -nn -r ofis.pcap icmp'],
    ['and / or / not', "Shartlarni birlashtirish; qavs uchun butun filtrni qo'shtirnoqqa oling.", "tcpdump -nn -r ofis.pcap 'tcp and not port 443'"],
    ["tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn", "Faqat ulanish boshlovchi SYN paketlar (SYN bor, ACK yo'q) — skanerni topishda.", "tcpdump -nn -r hujum.pcap 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'"],
    ['greater N', "Uzunligi N baytdan katta paketlar (less N — kichik).", 'tcpdump -nn -r ofis.pcap greater 1000'],
  ], [['tcpdump -nn -r ofis.pcap port 53 | wc -l', "DNS paketlari soni (birinchi qator — \"reading from file\" xabari)"]], "Simulyatorda jonli yozib olish yo'q (-i): faqat tayyor fayl o'qiladi. Ilova ma'lumoti matn ko'rinishida saqlangan."),
  d('tshark', 'trafik', "Wireshark'ning terminal ko'rinishi: har paketning protokoli va mazmuni, display filtrlari, maydonlarni ajratish va statistika.", "tshark -r FAYL [-Y 'FILTR'] [-T fields -e MAYDON ...] [-c N] [-q -z STATISTIKA]", [
    ['-r FAYL', "Faylni o'qiydi.", 'tshark -r ofis.pcap'],
    ['-Y FILTR', "Display filtri (Wireshark'dagi filtr qatori bilan bir xil). Qo'shtirnoqqa oling.", "tshark -r ofis.pcap -Y 'dns'"],
    ['-T fields', "Jadval o'rniga faqat tanlangan maydonlar (-e bilan).", "tshark -r ofis.pcap -Y 'http.request' -T fields -e http.host"],
    ['-e MAYDON', "Chiqariladigan maydon; bir nechta -e bo'lishi mumkin (Tab bilan ajraladi).", "tshark -r ofis.pcap -T fields -e ip.src -e ip.dst"],
    ['-E separator=,', "Maydonlar ajratgichi (masalan vergul — CSV uchun). header=y — sarlavha qatori.", "tshark -r ofis.pcap -T fields -E separator=, -e ip.src -e ip.dst"],
    ['-c N', 'Birinchi N ta (filtrdan keyin).', "tshark -r ofis.pcap -c 10"],
    ['-q', "Paketlar ro'yxatini chiqarmaydi (faqat -z statistikasi).", 'tshark -r ofis.pcap -q -z io,phs'],
    ['-z conv,ip', "Kim kim bilan qancha gaplashgan (IP juftliklari, baytlar). conv,tcp — portlar bilan.", 'tshark -r ofis.pcap -q -z conv,ip'],
    ['-z endpoints,ip', "Har bir manzil qancha yuborgan va qabul qilgan.", 'tshark -r ofis.pcap -q -z endpoints,ip'],
    ['-z io,phs', "Protokollar ierarxiyasi: qaysi protokol qancha.", 'tshark -r ofis.pcap -q -z io,phs'],
    ['-z io,stat,N', "Har N soniyada nechta paket — davriy (beacon) trafikni ko'rishda.", "tshark -r hujum.pcap -q -z io,stat,60"],
    ['-z follow,tcp,ascii,N', "N-oqim (tcp.stream) suhbatini to'liq matn qilib tiklaydi.", 'tshark -r ofis.pcap -q -z follow,tcp,ascii,3'],
    ['ip.addr == IP', "Manba yoki manzil shu IP (ip.addr == 10.10.20.0/24 — tarmoq).", "tshark -r ofis.pcap -Y 'ip.addr == 10.10.20.31'"],
    ['ip.src / ip.dst', 'Faqat manba yoki faqat manzil.', "tshark -r ofis.pcap -Y 'ip.src == 10.10.20.31'"],
    ['tcp.port == N', "TCP port (tcp.srcport, tcp.dstport; UDP uchun udp.port).", "tshark -r ofis.pcap -Y 'tcp.port == 21'"],
    ['tcp.flags.syn == 1', "TCP bayroqlari: syn, ack, fin, reset, push (0 yoki 1).", "tshark -r hujum.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0'"],
    ['tcp.stream', "Har TCP ulanishning raqami (follow uchun).", "tshark -r ofis.pcap -Y 'http.request' -T fields -e tcp.stream -e http.request.uri"],
    ['dns.qry.name', "DNS so'rovidagi domen. dns.flags.response == 0 — faqat so'rovlar, dns.a — javobdagi IP, dns.flags.rcode == 3 — mavjud emas.", "tshark -r ofis.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name"],
    ['http.request', "HTTP so'rovlari. Maydonlar: http.request.method, http.request.uri, http.host, http.user_agent, http.authorization.", "tshark -r ofis.pcap -Y 'http.request.method == \"POST\"'"],
    ['http.response.code', "HTTP javob kodi (200, 404...). http.content_type, http.file_data — javob mazmuni.", "tshark -r ofis.pcap -Y 'http.response.code == 404'"],
    ['ftp.request.command', "FTP buyrug'i (USER, PASS, RETR); ftp.request.arg — uning qiymati.", "tshark -r ofis.pcap -Y 'ftp.request.command == \"PASS\"' -T fields -e ftp.request.arg"],
    ['tls.handshake.extensions_server_name', "HTTPS'da ham ochiq ko'rinadigan sayt nomi (SNI).", "tshark -r ofis.pcap -Y 'tls.handshake.type == 1' -T fields -e tls.handshake.extensions_server_name"],
    ['contains', "Matn ichida bor: http contains \"parol\", frame contains \"admin\".", "tshark -r ofis.pcap -Y 'http contains \"password\"'"],
    ['frame.time_delta_displayed', "Ko'rsatilgan oldingi paketdan beri o'tgan soniyalar (-T fields uchun).", "tshark -r hujum.pcap -Y 'http.request' -T fields -e frame.time_delta_displayed"],
    ['and / or / not', "Shartlar: && || ! ham bo'ladi.", "tshark -r ofis.pcap -Y 'tcp && !tls'"],
  ], [["tshark -r ofis.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | sort | uniq -c | sort -rn", "Eng ko'p so'ralgan domenlar"]], "Display filtri (-Y) va tcpdump'ning BPF filtri — ikki xil til: ip.addr == X va host X."),
  d('curl', 'tarmoq', "URL bo'yicha so'rov yuboradi va javobni chiqaradi.", 'curl [-i] [-I] [-s] [-L] [-X METOD] [-H SARLAVHA] [-o FAYL] URL', [
    ['-i', 'Javob sarlavhalari bilan birga.', 'curl -i http://srv.lab/'],
    ['-I', 'Faqat sarlavhalar (HEAD).', 'curl -I http://srv.lab/'],
    ['-s', 'Jim rejim: progress chiqmaydi.', 'curl -s http://srv.lab/api/status'],
    ['-L', 'Yo\'naltirishlarga (301/302) ergashadi.', 'curl -L http://srv.lab/old'],
    ['-o FAYL', "Javobni faylga saqlaydi.", 'curl -o sahifa.html http://srv.lab/'],
    ['-X METOD', 'HTTP metodi: GET, POST, DELETE, OPTIONS...', 'curl -i -X OPTIONS http://srv.lab/'],
    ['-H SARLAVHA', "So'rovga sarlavha qo'shadi (bir nechta -H mumkin).", 'curl -H "Accept: application/json" http://srv.lab/api/status'],
  ], [['curl -s http://srv.lab/api/status | jq .', "API javobini chiroyli ko'rish"]]),
  d('wget', 'tarmoq', 'Faylni yuklab oladi.', 'wget [-q] [-O FAYL] URL', [
    ['-O FAYL', 'Shu nom bilan saqlaydi (-O - ekranga).', 'wget -O r.txt http://srv.lab/robots.txt'],
    ['-q', 'Jim rejim.', 'wget -q http://srv.lab/robots.txt'],
  ], [['wget http://srv.lab/robots.txt', "robots.txt ni yuklab olish"]]),

  // ── system
  d('hostname', 'tizim', 'Kompyuter nomi.', 'hostname', [], [['hostname', 'srv01']]),
  d('uname', 'tizim', "Operatsion tizim va yadro haqida ma'lumot.", 'uname [-a] [-r] [-n] [-m]', [
    ['-a', "Hammasi.", 'uname -a'],
    ['-r', 'Yadro versiyasi (zaifliklarni tekshirishda muhim).', 'uname -r'],
    ['-n', 'Kompyuter nomi.', 'uname -n'],
    ['-m', 'Arxitektura.', 'uname -m'],
  ], [['uname -r', '6.8.11-amd64']]),
  d('uptime', 'tizim', "Tizim qancha vaqtdan beri ishlayapti va yuklama.", 'uptime [-p]', [['-p', "Oddiy so'zlar bilan.", 'uptime -p']], [['uptime', 'load average — oxirgi 1, 5, 15 daqiqadagi o\'rtacha yuklama']]),
  d('free', 'tizim', 'Operativ xotira va swap holati.', 'free [-h]', [['-h', "O'qishga oson birliklar.", 'free -h']], [['free -h', 'available — haqiqatan bo\'sh xotira']]),
  d('date', 'tizim', 'Joriy sana va vaqt (simulyator soati).', 'date [+FORMAT]', [
    ['+%F', 'YYYY-MM-DD.', 'date +%F'],
    ['+%T', 'HH:MM:SS.', 'date +%T'],
    ['+%s', 'Unix vaqti (1970 dan beri soniyalar).', 'date +%s'],
  ], [['cp log.txt log-$(date +%F).txt', "Haqiqiy tizimda fayl nomiga sana qo'shish (simulyatorda $(...) yo'q)"]]),
  d('apt', 'tizim', "Debian/Ubuntu/Kali paket menejeri: dastur o'rnatish va yangilash.", 'apt update | upgrade | install | remove | list | search | show', [
    ['update', "Paketlar ro'yxatini yangilaydi (sudo).", 'sudo apt update'],
    ['upgrade', 'O\'rnatilganlarni yangilaydi — xavfsizlik yamoqlari (sudo).', 'sudo apt upgrade'],
    ['install PAKET', "O'rnatadi (sudo).", 'sudo apt install tree'],
    ['remove PAKET', "O'chiradi (sudo).", 'sudo apt remove telnet'],
    ['list --installed', "O'rnatilgan paketlar.", 'apt list --installed'],
    ['list --upgradable', 'Yangilanishi kerak bo\'lganlar.', 'apt list --upgradable'],
    ['search SO\'Z', 'Paket qidirish.', 'apt search firewall'],
    ['show PAKET', "Paket haqida.", 'apt show fail2ban'],
  ], [['sudo apt update && sudo apt upgrade', 'Muntazam yangilash — eng oddiy va eng muhim himoya']], "Simulyatorda internetdan hech narsa yuklanmaydi; o'rnatilganlar ro'yxati o'zgaradi xolos."),
  d('history', 'tizim', 'Kiritilgan buyruqlar tarixi.', 'history', [], [['history | grep ssh', 'Avval qaysi ssh buyruqlari yozilgan']]),
  d('which', 'tizim', 'Buyruq dasturi qayerda joylashganini ko\'rsatadi.', 'which BUYRUQ', [], [['which python3', '/usr/bin/python3']]),
  d('man', 'tizim', 'Buyruq qo\'llanmasi: barcha flaglar va misollar.', 'man BUYRUQ', [], [['man grep', 'grep ning barcha flaglari']]),
  d('help', 'tizim', "Barcha buyruqlar ro'yxati.", 'help', [], [['help', "Ro'yxat"]]),
  d('clear', 'tizim', 'Ekranni tozalaydi (Ctrl+L ham).', 'clear', [], [['clear', '']]),

  // ── encoding and integrity
  d('base64', 'xavfsizlik', "Base64 ga kodlaydi yoki qayta ochadi. Bu shifrlash emas!", 'base64 [-d] [FAYL]', [['-d', 'Dekodlash (ochish).', 'echo c2Fsb20= | base64 -d']], [['echo salom | base64', 'c2Fsb20K']]),
  d('xxd', 'xavfsizlik', "Faylni hex ko'rinishida ko'rsatadi; hex'dan qayta tiklaydi.", 'xxd [-p] [-r -p] [FAYL]', [
    ['-p', 'Faqat hex, manzil va matn ustunisiz.', 'echo hi | xxd -p'],
    ['-r -p', "Hex'dan asl ma'lumotga.", 'echo 6869 | xxd -r -p'],
  ], [['xxd fayl.bin | head', 'Fayl boshidagi "sehrli baytlar" — haqiqiy turini aniqlash']]),
  d('sha256sum', 'xavfsizlik', 'Faylning SHA-256 xeshi; ro\'yxat bilan solishtirib, o\'zgarganini topadi.', 'sha256sum FAYL...  |  sha256sum -c RO\'YXAT', [['-c', "Ro'yxatdagi xeshlarni tekshiradi: OK yoki FAILED.", 'sha256sum -c baseline.sha256']], [['sha256sum /usr/bin/ls', 'Ishonchli manbadagi xesh bilan solishtiring']]),
  d('file', 'xavfsizlik', "Fayl turini mazmuniga qarab aniqlaydi (kengaytmaga emas).", 'file FAYL...', [], [['file hisobot.pdf', 'PNG image data — kengaytma aldagan']]),

  // ── scripts and environment
  d('echo', 'skript', 'Matnni chiqaradi; > bilan faylga yozadi, >> bilan oxiriga qo\'shadi.', 'echo [-n] [-e] MATN', [
    ['-e', '\\n (yangi qator) va \\t (tab) ni tushunadi.', 'echo -e "a\\nb"'],
    ['-n', 'Oxirida yangi qator qo\'ymaydi.', 'echo -n salom'],
  ], [['echo "salom" > fayl.txt', 'Faylga yozish (eski mazmun o\'chadi)'], ['echo "yana" >> fayl.txt', "Oxiriga qo'shish"]]),
  d('bash', 'skript', 'Skriptni bajaradi.', 'bash SKRIPT [ARGUMENTLAR]   yoki   ./SKRIPT', [], [['bash skript.sh', "Bajarish ruxsati shart emas"], ['./skript.sh', 'chmod +x kerak']], "Simulyatorda skript qatorma-qator bajariladi: o'zgaruvchilar, $1..$9, $@, $# bor; if, for, while, $(...) yo'q."),
  d('export', 'skript', "O'zgaruvchini muhitga qo'shadi.", 'export NOM=QIYMAT', [], [['export LOYIHA=qaydnoma && echo $LOYIHA', 'qaydnoma']]),
  d('unset', 'skript', "O'zgaruvchini o'chiradi.", 'unset NOM', [], [['unset LOYIHA', '']]),
  d('env', 'skript', "Muhit o'zgaruvchilari ro'yxati.", 'env', [], [['env | grep PATH', 'Dasturlar qidiriladigan kataloglar']]),
  d('basename', 'skript', "Yo'ldan faqat fayl nomini oladi.", 'basename YO\'L [SUFFIKS]', [], [['basename /var/log/auth.log .log', 'auth']]),
  d('dirname', 'skript', "Yo'ldan katalog qismini oladi.", "dirname YO'L", [], [['dirname /var/log/auth.log', '/var/log']]),
  d('realpath', 'skript', "To'liq, havolalarsiz yo'lni beradi.", "realpath YO'L", [], [['realpath ../a.txt', '/home/a.txt']]),
];

/** Linux and PowerShell together, for the reference page. */
export const ALL_DOCS: CommandDoc[] = [...DOCS, ...PS_DOCS];

const index = new Map(ALL_DOCS.map((c) => [c.name, c]));

export function getDoc(name: string): CommandDoc | null {
  return index.get(name) ?? null;
}

/** Plain-text manual page for the terminal's `man`. */
export function manText(doc: CommandDoc): string {
  const lines = [doc.name.toUpperCase(), '', `  ${doc.summary}`, '', `  Ishlatilishi: ${doc.usage}`];
  if (doc.flags.length) {
    lines.push('', '  Flaglar:');
    const w = Math.min(22, Math.max(...doc.flags.map(([f]) => f.length)));
    for (const [f, t, e] of doc.flags) lines.push(`    ${f.padEnd(w)}  ${t}${e ? `\n    ${''.padEnd(w)}  masalan: ${e}` : ''}`);
  }
  if (doc.examples.length) {
    lines.push('', '  Misollar:');
    for (const [c, n] of doc.examples) lines.push(`    $ ${c}${n ? `\n      ${n}` : ''}`);
  }
  if (doc.note) lines.push('', `  Eslatma: ${doc.note}`);
  return lines.join('\n');
}
