/*
 * SIEM query reference: SPL commands and Kusto operators in the same CommandDoc shape as terminal commands, so
 * the "Buyruqlar" page, lab teaching notes and the lab side reference show them. Names carry a language prefix
 * (spl:stats, kql:summarize) because SPL's sort/head/tail would clash with the Linux commands; `title` is what
 * the page shows.
 */

import type { CommandDoc } from '../terminal/docs';

const spl = (name: string, summary: string, usage: string, flags: [string, string, string?][], examples: [string, string][], note?: string): CommandDoc => ({
  name: `spl:${name}`,
  title: name === 'search' ? 'search (SPL)' : `| ${name}`,
  category: 'siem',
  summary,
  usage,
  flags,
  examples,
  note,
});

const kql = (name: string, summary: string, usage: string, flags: [string, string, string?][], examples: [string, string][], note?: string): CommandDoc => ({
  name: `kql:${name}`,
  title: `| ${name} (KQL)`,
  category: 'siem',
  summary,
  usage,
  flags,
  examples,
  note,
});

export const SIEM_DOCS: CommandDoc[] = [
  // ── SPL
  spl('search', "So'rovning birinchi qismi: qaysi indeksdan, qaysi hodisalarni olish. Har bir so'z AND bilan bog'lanadi.", 'index=NOM [maydon=qiymat] [so\'z] [NOT ...] [OR ...]', [
    ['index=', "Qaysi indeksdan qidirish. Doim birinchi yozing — tezroq va aniqroq.", 'index=web'],
    ['maydon=qiymat', "Maydon qiymati bo'yicha filtr. Qiymat katta-kichik harfga sezgir emas, maydon nomi esa sezgir.", 'index=web status=404'],
    ['*', "Yulduzcha — istalgan belgilar. maydon=* — maydoni bor hodisalar.", 'index=web uri_path=/admin*'],
    ['so\'z', "Maydonsiz so'z xom matndan (_raw) butun so'z sifatida qidiriladi: power — powershell'ni topmaydi, power* topadi.", 'index=linux "Failed password"'],
    ['OR', "Yoki. SPL'da OR, AND'dan oldin bajariladi: a b OR c = a AND (b OR c).", 'index=web status=401 OR status=403'],
    ['NOT', "Inkor. NOT user=root maydoni umuman yo'q hodisalarni ham qoldiradi.", 'index=linux NOT user=root'],
    ['!=', "Teng emas. user!=root maydoni yo'q hodisalarni chiqarib tashlaydi — NOT bilan farqi shu.", 'index=linux user!=root'],
    ['< >', "Son bilan solishtirish.", 'index=web bytes>1000000'],
    ['IN', "Bir nechta qiymatdan biri.", 'index=web status IN (401, 403, 404)'],
    ['earliest=', "Vaqt oralig'ining boshi: -24h, -7d@d yoki aniq vaqt OO/KK/YYYY:SS:DD:SS.", 'index=web earliest=-1h'],
    ['latest=', "Vaqt oralig'ining oxiri (shu vaqtning o'zi kirmaydi).", 'index=web earliest="11/16/2026:04:00:00" latest="11/16/2026:05:00:00"'],
  ], [
    ['index=web status=404', "Barcha 404 javoblari, eng yangisi birinchi"],
    ['index=linux sshd "Failed password" NOT user=root', 'root dan boshqa hisoblarga muvaffaqiyatsiz SSH urinishlari'],
  ], "Natija sukut bo'yicha eng yangi hodisadan boshlab chiqadi. Simulyatorda subsearch ([ ... ]) yo'q."),
  spl('stats', "Hodisalarni guruhlab hisoblaydi: nechta, nechta turli, yig'indi, o'rtacha. SOC'ning eng ko'p ishlatiladigan buyrug'i.", 'stats FUNKSIYA[(maydon)] [as NOM] [, ...] [by maydon[, maydon]]', [
    ['count', 'Nechta hodisa.', 'stats count'],
    ['by', "Guruhlash: har bir qiymat uchun alohida qator. Maydoni yo'q hodisalar tushib qoladi.", 'stats count by clientip'],
    ['as', 'Natija ustuniga nom berish.', 'stats count as urinishlar by src_ip'],
    ['dc', 'Nechta turli qiymat (distinct count).', 'stats dc(user) by src_ip'],
    ['values', "Barcha turli qiymatlar ro'yxati (alifbo tartibida).", 'stats values(uri_path) by clientip'],
    ['sum', "Yig'indi.", 'stats sum(bytes) by clientip'],
    ['avg', "O'rtacha.", 'stats avg(bytes)'],
    ['min', 'Eng kichik qiymat.', 'stats min(_time) as boshlanish'],
    ['max', 'Eng katta qiymat.', 'stats max(bytes)'],
    ['earliest', 'Eng birinchi (vaqt bo\'yicha) hodisadagi qiymat.', 'stats earliest(uri_path) by clientip'],
    ['latest', 'Eng oxirgi hodisadagi qiymat.', 'stats latest(status) by clientip'],
    ['list', "Barcha qiymatlar, takrorlari bilan, hodisalar tartibida.", 'stats list(status) by clientip'],
  ], [
    ['index=web | stats count by status', 'Status kodlari taqsimoti'],
    ['index=linux action=failure | stats count, dc(user) as hisoblar by src_ip', 'Har bir IP nechta urinish qilgan va nechta hisobni sinagan'],
  ]),
  spl('where', "Ifoda bo'yicha filtr: hisoblangan qiymatlar, ikki maydonni solishtirish, funksiyalar.", 'where IFODA', [
    ['=', "Teng. Satrlar katta-kichik harfga SEZGIR: where method=\"post\" — POST ni topmaydi.", 'where status=404'],
    ['"..."', "Satr qo'shtirnoqda. Qo'shtirnoqsiz so'z — maydon nomi: where user=admin admin degan maydonni qidiradi!", 'where user="admin"'],
    ['AND', 'Va (OR, NOT ham bor).', 'where count>10 AND dc_user>3'],
    ['like', "Andoza: % — istalgan belgilar, _ — bitta belgi.", 'where like(uri_path, "/admin%")'],
    ['match', 'Regex bilan tekshirish.', 'where match(CommandLine, "(?i)-enc")'],
    ['isnull', "Maydon yo'qmi (isnotnull — bormi).", 'where isnull(user)'],
    ['cidrmatch', 'IP tarmoq ichidami.', 'where NOT cidrmatch("10.0.0.0/8", src_ip)'],
  ], [
    ['index=web | stats count by clientip | where count > 100', "100 dan ortiq so'rov yuborgan IP'lar"],
    ['index=web | where bytes > 1000000', 'Javobi 1 MB dan katta so\'rovlar'],
  ]),
  spl('eval', "Yangi maydon hisoblaydi yoki mavjudini o'zgartiradi.", 'eval NOM=IFODA [, NOM=IFODA]', [
    ['if', "Shart: if(shart, rost bo'lsa, yolg'on bo'lsa).", 'eval natija=if(status>=400, "xato", "ok")'],
    ['case', 'Bir nechta shart: birinchi rost bo\'lgani.', 'eval daraja=case(count>100, "yuqori", count>10, "o\'rta", true(), "past")'],
    ['.', 'Satrlarni ulash.', 'eval kim=user."@".host'],
    ['round', 'Yaxlitlash.', 'eval mb=round(bytes/1024/1024, 2)'],
    ['strftime', 'Vaqtni matnga: %Y-%m-%d %H:%M:%S.', 'eval soat=strftime(_time, "%H")'],
    ['lower', 'Kichik harfga (upper — kattaga).', 'eval user=lower(user)'],
    ['len', 'Satr uzunligi.', 'eval uzunlik=len(query)'],
    ['substr', "Satr bo'lagi (1 dan sanaladi).", 'eval prefix=substr(Image, 1, 10)'],
    ['split', "Satrni bo'lib multivalue qiladi (mvcount bilan sanash).", 'eval qismlar=mvcount(split(query, "."))'],
    ['replace', 'Regex bilan almashtirish.', 'eval toza=replace(uri, "\\?.*", "")'],
    ['tonumber', 'Matnni songa.', 'eval n=tonumber(code)'],
  ], [
    ['index=web | eval mb=round(bytes/1048576, 1) | where mb > 1', "Hajmni MB da hisoblab, kattalarini ajratish"],
  ], "eval maydonga true/false qiymat bera olmaydi — buning uchun if() ishlating."),
  spl('table', "Faqat ko'rsatilgan maydonlarni shu tartibda jadval qilib chiqaradi.", 'table maydon [maydon ...]', [
    ['*', "Yulduzcha bilan bir nechta maydon: src_*.", 'table _time src_* user'],
  ], [['index=linux sshd | table _time user src_ip action', 'SSH hodisalari jadvali']]),
  spl('fields', "Maydonlarni qoldiradi (+) yoki olib tashlaydi (-). Natija jadvalga aylanmaydi.", 'fields [+|-] maydon [...]', [
    ['-', "Ko'rsatilgan maydonlarni olib tashlaydi.", 'fields - _raw'],
  ], [['index=web | fields clientip status', 'Faqat ikki maydon qoladi']]),
  spl('rename', "Maydon nomini o'zgartiradi — hisobot uchun tushunarli nomlar.", 'rename eski AS yangi [, ...]', [
    ['AS', 'Yangi nom; bo\'sh joyli nom qo\'shtirnoqda.', 'rename clientip AS "Manba IP"'],
  ], [['index=web | stats count by clientip | rename clientip AS ip, count AS soni', 'Ustun nomlarini o\'zbekcha qilish']]),
  spl('sort', "Saralaydi. Minus — kamayish tartibida.", 'sort [N] [-|+]maydon [, ...]', [
    ['-', "Kamayish tartibi (eng kattasi birinchi). sort - count ham, sort -count ham bo'ladi.", 'sort - count'],
    ['+', "O'sish tartibi (sukut).", 'sort _time'],
    ['N', "Faqat N ta natija (sukut bo'yicha 10 000 ta). 0 — cheklovsiz.", 'sort 0 _time'],
  ], [['index=web | stats count by clientip | sort - count | head 5', "Eng faol 5 ta IP"]]),
  spl('head', 'Birinchi N ta natija (sukut: 10).', 'head [N]', [['N', 'Nechta.', 'head 5']], [['index=web | head 3', 'Eng yangi 3 ta hodisa']]),
  spl('tail', "Oxirgi N ta natija, teskari tartibda (sukut: 10).", 'tail [N]', [['N', 'Nechta.', 'tail 1']], [['index=web | tail 1', 'Eng eski hodisa']]),
  spl('reverse', 'Natijalar tartibini teskari qiladi.', 'reverse', [], [['index=web | reverse', 'Eng eski hodisa birinchi']]),
  spl('dedup', "Takrorlarni olib tashlaydi: har bir qiymat (kombinatsiya) uchun birinchi hodisa qoladi.", 'dedup [N] maydon [maydon ...]', [
    ['N', 'Har qiymat uchun N ta hodisa qoldirish.', 'dedup 2 user'],
  ], [['index=linux action=success | dedup user | table _time user src_ip', 'Har bir foydalanuvchining eng oxirgi kirishi']]),
  spl('top', "Eng ko'p uchraydigan qiymatlar: soni va foizi bilan.", 'top [limit=N] maydon [by maydon]', [
    ['limit=', 'Nechta qiymat (sukut: 10).', 'top limit=3 clientip'],
    ['by', 'Har guruh ichida alohida.', 'top limit=1 uri_path by clientip'],
    ['showperc=', 'Foiz ustunini yashirish: showperc=false.', 'top showperc=false user'],
  ], [['index=web | top limit=5 useragent', "Eng ko'p User-Agent'lar"]]),
  spl('rare', "Eng KAM uchraydigan qiymatlar — ovlashda g'ayrioddiy narsalarni topish uchun.", 'rare [limit=N] maydon [by maydon]', [
    ['limit=', 'Nechta qiymat.', 'rare limit=5 process'],
  ], [['index=sysmon EventCode=1 | rare limit=5 ParentImage', "Kam uchraydigan ota-jarayonlar"]]),
  spl('timechart', "Vaqt bo'yicha grafik: har bir vaqt oralig'ida hisoblaydi. Bo'sh oraliqlar 0 bilan to'ldiriladi.", 'timechart [span=VAQT] FUNKSIYA [by maydon]', [
    ['span=', "Oraliq uzunligi: 1m, 5m, 1h, 1d.", 'timechart span=5m count'],
    ['by', 'Har qiymat uchun alohida chiziq (eng ko\'p 10 tasi, qolgani OTHER).', 'timechart span=1h count by status'],
    ['limit=', "by bilan nechta chiziq.", 'timechart limit=3 count by clientip'],
  ], [['index=web status=401 | timechart span=1m count', "Daqiqasiga nechta noto'g'ri parol — brute force cho'qqisi ko'rinadi"]]),
  spl('chart', "Ikki maydon bo'yicha jadval: qatorlar — over, ustunlar — by.", 'chart FUNKSIYA over maydon by maydon', [
    ['over', 'Qatorlar maydoni.', 'chart count over clientip by status'],
  ], [['index=web | chart count over clientip by method', 'Har IP qaysi metodlarni ishlatgan']]),
  spl('bin', "Qiymatlarni oraliqlarga ajratadi (vaqtni yaxlitlaydi). bucket — xuddi shu.", 'bin [span=X] maydon [as yangi]', [
    ['span=', "_time uchun 1h, 10m; sonlar uchun 100, 1000.", 'bin _time span=1h'],
  ], [['index=web | bin _time span=1h | stats count by _time, clientip', "Soatbay har IP nechta so'rov"]]),
  spl('rex', "Regex bilan matndan yangi maydon ajratadi: (?<nom>...) guruhlar.", 'rex [field=maydon] [max_match=N] "REGEX"', [
    ['field=', "Qaysi maydondan (sukut: _raw).", 'rex field=uri_path "^/(?<bolim>[^/]+)"'],
    ['max_match=', "Bir nechta moslik (0 — hammasi) — multivalue.", 'rex max_match=0 "(?<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)"'],
  ], [['index=linux sshd | rex "for (?<user>\\S+) from (?<ip>\\S+)"', 'SSH qatoridan foydalanuvchi va IP ni ajratish']]),
  spl('lookup', "Hodisani tashqi jadval (CSV) bilan boyitadi: masalan IP'ni tahdid ro'yxati bilan.", 'lookup JADVAL ustun [AS maydon] [OUTPUT ustun [AS nom] ...]', [
    ['AS', 'Jadval ustuni hodisada boshqa nomda bo\'lsa.', 'lookup threat_intel ip AS dest_ip'],
    ['OUTPUT', "Qaysi ustunlarni qo'shish.", 'lookup threat_intel ip AS dest_ip OUTPUT threat, source'],
  ], [['index=proxy | lookup threat_intel ip AS dest_ip OUTPUT threat | where isnotnull(threat)', "Tahdid ro'yxatidagi manzillarga murojaatlar"]]),
  spl('inputlookup', "Lookup jadvalning o'zini ko'rsatadi. So'rov boshida, | bilan yoziladi.", '| inputlookup JADVAL', [], [['| inputlookup threat_intel', "Tahdid ro'yxatida nima bor"]]),
  spl('eventstats', "stats kabi hisoblaydi, lekin hodisalarni yo'qotmaydi — natijani har biriga qo'shadi.", 'eventstats FUNKSIYA [as NOM] [by maydon]', [
    ['by', 'Guruh bo\'yicha.', 'eventstats count as n by src_ip'],
  ], [['index=linux action=failure | eventstats count as n by src_ip | where n > 5', "5 tadan ortiq urinish qilgan IP'larning hodisalari"]]),
  spl('fillnull', "Bo'sh maydonlarni to'ldiradi (sukut: 0).", 'fillnull [value=X] [maydon ...]', [['value=', 'Nima bilan.', 'fillnull value="-" user']], [['index=web | timechart count by status | fillnull', "Bo'sh kataklar 0"]]),
  spl('makeresults', "Bitta sun'iy natija yaratadi — eval funksiyalarini sinash uchun.", '| makeresults', [], [['| makeresults | eval t=strftime(now(), "%F %T")', 'Hozirgi vaqtni ko\'rish']]),
  spl('mvexpand', "Multivalue maydonni alohida qatorlarga yoyadi.", 'mvexpand maydon', [], [['index=web | stats values(status) as s by clientip | mvexpand s', 'Har IP-status juftligi alohida qator']]),

  // ── Kusto
  kql('where', "Qatorlarni shart bo'yicha filtrlaydi. Har so'rov jadval nomi bilan boshlanadi.", 'Jadval | where SHART', [
    ['==', "Teng — katta-kichik harfga SEZGIR.", 'where EventID == 4625'],
    ['=~', 'Teng — harfga sezgir EMAS.', 'where Account =~ "corp\\\\d.karimova"'],
    ['!=', 'Teng emas.', 'where ResultType != "0"'],
    ['has', "Butun so'z (term) bor: tez va aniq. \"Exch\" — \"Exchange\"ni topmaydi.", 'where CommandLine has "-enc"'],
    ['contains', "Istalgan qism-satr (sekinroq).", 'where Url contains "update"'],
    ['startswith', 'Shu bilan boshlanadi (endswith — tugaydi).', 'where FileName endswith ".exe"'],
    ['in', "Ro'yxatdagi qiymatlardan biri (in~ — harfga sezgir emas).", 'where EventID in (4624, 4625)'],
    ['between', "Oraliq: between (a .. b).", 'where TimeGenerated between (datetime(2026-11-16 04:00) .. datetime(2026-11-16 06:00))'],
    ['ago', 'Hozirdan oldingi vaqt: 1h, 30m, 7d.', 'where TimeGenerated > ago(1h)'],
    ['and', 'Va (or — yoki, not(...) — inkor).', 'where EventID == 4625 and IpAddress != "-"'],
  ], [['SecurityEvent | where EventID == 4625 | take 10', "10 ta muvaffaqiyatsiz kirish"]], "Noma'lum ustun xato beradi (SPL'da esa shunchaki bo'sh natija)."),
  kql('take', 'Istalgan N ta qator (limit — xuddi shu). Jadvalni tanishish uchun.', 'take N', [], [['SigninLogs | take 5', "Jadval qanday ko'rinishini bilish"]]),
  kql('project', "Faqat kerakli ustunlar; yangi ustun ham hisoblash mumkin.", 'project ustun, nom = IFODA, ...', [
    ['=', 'Yangi nom yoki hisoblangan ustun.', 'project TimeGenerated, Kim = Account, Kompyuter = Computer'],
  ], [['SecurityEvent | where EventID == 4688 | project TimeGenerated, Computer, NewProcessName, CommandLine', 'Jarayonlar jadvali']]),
  kql('project-away', "Ko'rsatilgan ustunlarni olib tashlaydi.", 'project-away ustun, ...', [], [['SigninLogs | project-away TenantId', 'Keraksiz ustunsiz']]),
  kql('extend', "Mavjud ustunlarga yangi hisoblangan ustun qo'shadi.", 'extend nom = IFODA', [
    ['iff', "Shart: iff(shart, rost, yolg'on).", 'extend Tur = iff(ResultType == "0", "ok", "xato")'],
    ['strcat', 'Satrlarni ulash.', 'extend Kim = strcat(Account, "@", Computer)'],
    ['hourofday', 'Soat (0–23).', 'extend Soat = hourofday(TimeGenerated)'],
    ['extract', 'Regex bilan qism ajratish.', 'extend Domen = extract("@(.+)$", 1, UserPrincipalName)'],
  ], [['SigninLogs | extend Soat = hourofday(TimeGenerated) | where Soat < 6', 'Tungi kirishlar']]),
  kql('summarize', "Guruhlab hisoblaydi — SPL'dagi stats. Ustun nomlari: count_, dcount_X, sum_X.", 'summarize [nom =] FUNKSIYA(...) [, ...] [by ustun, ...]', [
    ['count', 'Nechta qator: count().', 'summarize count() by IpAddress'],
    ['dcount', 'Nechta turli qiymat.', 'summarize dcount(Account) by IpAddress'],
    ['countif', 'Shartga mos qatorlar soni.', 'summarize Xato = countif(ResultType != "0") by UserPrincipalName'],
    ['make_set', "Turli qiymatlar ro'yxati (SPL values).", 'summarize make_set(Computer) by Account'],
    ['arg_max', "Eng katta qiymatli qatorning o'zi: arg_max(TimeGenerated, *) — har guruhning oxirgi qatori.", 'summarize arg_max(TimeGenerated, *) by Computer'],
    ['bin', "Vaqtni oraliqlarga: bin(TimeGenerated, 1h).", 'summarize count() by bin(TimeGenerated, 5m)'],
    ['min', 'Eng kichik (max — eng katta, sum, avg).', 'summarize Boshi = min(TimeGenerated) by IpAddress'],
  ], [['SecurityEvent | where EventID == 4625 | summarize Urinish = count(), Hisoblar = dcount(Account) by IpAddress', "Har IP nechta urinish va nechta hisob"]]),
  kql('sort', "Saralaydi. DIQQAT: sukut bo'yicha KAMAYISH tartibida (desc). order by — xuddi shu.", 'sort by ustun [asc|desc], ...', [
    ['asc', "O'sish tartibi (eng eskisi/kichigi birinchi).", 'sort by TimeGenerated asc'],
    ['desc', 'Kamayish tartibi (sukut).', 'sort by count_ desc'],
  ], [['SigninLogs | summarize count() by IPAddress | sort by count_', "Eng faol IP birinchi"]]),
  kql('top', 'Saralab, birinchi N tasini oladi.', 'top N by ustun [asc|desc]', [], [['DeviceNetworkEvents | summarize count() by RemoteIP | top 5 by count_', "Eng ko'p ulanilgan 5 manzil"]]),
  kql('count', "Qatorlar soni — bitta Count ustuni.", 'count', [], [['SecurityEvent | where EventID == 4625 | count', "Muvaffaqiyatsiz kirishlar soni"]]),
  kql('distinct', "Takrorsiz qiymatlar (bir yoki bir nechta ustun).", 'distinct ustun, ...', [], [['DeviceProcessEvents | distinct DeviceName', 'Qaysi qurilmalar bor']]),
  kql('join', "Ikki jadvalni umumiy ustun bo'yicha bog'laydi. Qavs ichida ikkinchi so'rov.", 'join kind=TUR (so\'rov) on ustun', [
    ['kind=', "inner — ikkalasida ham borlar; leftouter — chapdagilar hammasi; leftanti — o'ngda yo'qlari.", 'join kind=inner (DeviceInfo) on DeviceName'],
    ['$left.', "Ustun nomlari farq qilsa: on $left.A == $right.B.", 'join kind=inner (T2) on $left.IpAddress == $right.RemoteIP'],
  ], [['DeviceNetworkEvents | where RemoteIP == "203.0.113.45" | distinct DeviceName | join kind=inner (DeviceInfo) on DeviceName', 'C2 ga ulangan qurilmalar haqida ma\'lumot']], "Sukut turi innerunique: chap jadvaldagi takror kalitlar olib tashlanadi."),
  kql('render', "Natijani grafik qiladi: timechart, columnchart, barchart.", 'render TUR', [], [['SigninLogs | summarize count() by bin(TimeGenerated, 1h) | render timechart', 'Soatbay kirishlar grafigi']]),
  kql('getschema', "Jadval ustunlari va ularning turlari.", 'Jadval | getschema', [], [['SecurityEvent | getschema', 'Qanday ustunlar bor']]),
];
