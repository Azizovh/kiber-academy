/* Reference entries for the detection tools: sigma, suricata, zeek, zeek-cut, yara. */

import type { CommandDoc } from './docs';

const d = (name: string, summary: string, usage: string, flags: [string, string, string?][], examples: [string, string][], note?: string): CommandDoc => ({
  name,
  category: 'aniqlash',
  summary,
  usage,
  flags,
  examples,
  note,
});

export const DETECT_DOCS: CommandDoc[] = [
  {
    name: 'strings',
    category: 'xavfsizlik',
    summary: "Fayl ichidagi o'qiladigan matn bo'laklarini chiqaradi — noma'lum dasturni ochmasdan nima ichida borligini ko'rish.",
    usage: 'strings [-n MIN] [-e s|l] [-t x|d] FAYL...',
    flags: [
      ['-n', "Eng kamida nechta belgili bo'laklar (sukut: 4).", 'strings -n 8 sample.exe'],
      ['-e', "Kodlash: s — oddiy (1 bayt), l — UTF-16LE (Windows \"wide\" satrlari, har belgidan keyin 00).", 'strings -e l sample.exe'],
      ['-t', "Har bo'lak oldida joyi: x — hex, d — o'nlik.", 'strings -t x sample.exe'],
    ],
    examples: [
      ['strings -n 6 svchost.exe | grep -i http', 'Dastur ichidagi manzillar'],
      ['strings -e l svchost.exe', "Wide satrlar — oddiy strings ularni ko'rmaydi"],
    ],
  },
  d('sigma', "Sigma qoidalarini tekshiradi va SIEM so'roviga o'giradi (sigma-cli). Bitta qoida — ko'p SIEM.", 'sigma check|convert|list [FLAGLAR] QOIDA|KATALOG', [
    ['check', "Qoidalarni tekshiradi: YAML, modifikatorlar, condition'dagi nomlar (xato), id, description, level, date (ogohlantirish).", 'sigma check rules/'],
    ['convert', "Qoidani so'rovga o'giradi.", 'sigma convert -t splunk -p sysmon rules/word.yml'],
    ['-t', "Maqsad (target): splunk (SPL) yoki kusto (Defender KQL).", 'sigma convert -t kusto -p microsoft_xdr rule.yml'],
    ['-p', "Qayta ishlash konveyeri (pipeline): sysmon — logsource bo'yicha EventID qo'shadi; microsoft_xdr — Sysmon maydonlarini Defender jadvallariga o'giradi.", 'sigma convert -t splunk -p sysmon rule.yml'],
    ['--without-pipeline', "Konveyersiz o'girish (maydon va EventID moslanmaydi).", 'sigma convert -t splunk --without-pipeline rule.yml'],
    ['-o', "Natijani faylga yozish.", 'sigma convert -t splunk -p sysmon rules/ -o queries.spl'],
    ['list', "Mavjud maqsadlar yoki konveyerlar ro'yxati: list targets, list pipelines.", 'sigma list pipelines'],
  ], [
    ['sigma check rules/', "Hamma qoidalarni tekshirish — xatolar va ogohlantirishlar soni"],
    ['sigma convert -t splunk -p sysmon rules/word_ps.yml', 'SPL so\'rovi — SIEM oynasiga nusxalab ishlatiladi'],
  ], "Simulyator modifikatorlardan contains, startswith, endswith, all ni biladi; re, cidr, base64offset va agregatsiyalar yo'q. Haqiqiy sigma-cli: pip install sigma-cli va backend plaginlari."),
  d('suricata', "Suricata IDS: tarmoq trafigini qoidalar bilan tekshiradi va ogohlantirishlarni fast.log va eve.json ga yozadi.", 'suricata -r FAYL.pcap -S QOIDALAR -l LOG_KATALOG', [
    ['-r', "Yozib olingan trafik fayli (offline rejim).", 'suricata -r traffic.pcap -S local.rules -l out'],
    ['-S', "Faqat shu qoidalar fayli ishlatiladi.", 'suricata -r t.pcap -S rules/local.rules -l out'],
    ['-l', "Loglar katalogi (mavjud bo'lishi kerak): fast.log — qisqa ogohlantirishlar, eve.json — JSON.", 'suricata -r t.pcap -S local.rules -l /tmp/out'],
    ['-T', "Faqat qoidalarni tekshirish (trafiksiz): sintaksis xatolarini ko'rish uchun.", 'suricata -T -S local.rules'],
    ['-k', "Checksum tekshiruvini o'chirish (-k none) — simulyatorda ta'sirsiz.", 'suricata -k none -r t.pcap -S local.rules -l out'],
  ], [
    ['suricata -r qaydnoma.pcap -S rules/local.rules -l out', 'Qoidalarni ishga tushirish'],
    ['cat out/fast.log', "Ogohlantirishlar: vaqt, [1:SID:REV], xabar, sinf, manba -> manzil"],
    ["jq -r '.alert.signature' out/eve.json | sort | uniq -c", 'Qaysi qoida necha marta ishlagan'],
  ], "Qoida: alert http any any -> $HOME_NET any (msg:\"...\"; http.user_agent; content:\"Nikto\"; nocase; sid:1000001; rev:1;). $HOME_NET /etc/suricata/suricata.yaml da. Simulyator paketma-paket tekshiradi (oqimni yig'maydi)."),
  d('zeek', "Zeek: trafikdan tuzilgan loglar yaratadi — har bir ulanish, DNS so'rov, HTTP so'rov, TLS sessiya alohida qator.", 'zeek -r FAYL.pcap', [
    ['-r', "Trafik faylini o'qish. Loglar joriy katalogga yoziladi: conn.log, dns.log, http.log, ssl.log.", 'zeek -r traffic.pcap'],
    ['-C', "Checksum xatolarini e'tiborsiz qoldirish — simulyatorda ta'sirsiz.", 'zeek -C -r traffic.pcap'],
  ], [
    ['zeek -r qaydnoma.pcap && ls *.log', 'Qaysi loglar paydo bo\'ldi'],
    ['cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p conn_state', 'Ulanishlar jadvali'],
  ], "conn_state: SF — normal yakunlangan, S0 — javobsiz SYN, REJ — rad etilgan (yopiq port), RSTO — mijoz uzgan (skaner belgisi), S1 — ochiq qolgan. history: katta harf — mijoz, kichik — server (S h A D F R)."),
  d('zeek-cut', "Zeek logidan kerakli ustunlarni ajratadi (stdin'dan o'qiydi).", 'cat LOG | zeek-cut [FLAGLAR] USTUN...', [
    ['USTUN', "Ustun nomlari: ts, uid, id.orig_h, id.resp_p, query, host, uri, user_agent, server_name...", 'cat dns.log | zeek-cut query answers'],
    ['-d', "ts vaqtini o'qiladigan ko'rinishga (ISO 8601) o'giradi.", 'cat conn.log | zeek-cut -d ts id.orig_h'],
    ['-n', "Ko'rsatilganlardan TASHQARI hamma ustunlar.", 'cat http.log | zeek-cut -n uid'],
    ['-c', "Sarlavha (#fields) qatorlarini ham chiqaradi.", 'cat conn.log | zeek-cut -c id.orig_h'],
  ], [
    ['cat http.log | zeek-cut user_agent | sort | uniq -c | sort -rn', "Eng ko'p User-Agent'lar"],
    ['cat conn.log | zeek-cut id.orig_h conn_state | grep REJ | sort | uniq -c', 'Kim yopiq portlarga urilgan (skaner)'],
  ]),
  d('yara', "YARA: fayllarni matn, bayt va regex naqshlari bo'yicha qoidalar bilan qidiradi — zararli dasturlarni ovlash uchun.", 'yara [FLAGLAR] QOIDALAR.yar FAYL|KATALOG', [
    ['-r', "Katalogni ichki kataloglari bilan skanerlash.", 'yara -r rules.yar /srv/share'],
    ['-s', "Topilgan satrlarni joyi (offset) bilan ko'rsatadi.", 'yara -s rules.yar sample.exe'],
    ['-m', "Qoidaning meta ma'lumotlarini ko'rsatadi.", 'yara -m rules.yar sample.exe'],
    ['-c', "Faqat mosliklar sonini chiqaradi.", 'yara -c -r rules.yar /srv/share'],
    ['-n', "Mos KELMAGAN qoidalarni ko'rsatadi.", 'yara -n rules.yar file.txt'],
    ['-t', "Faqat shu tegli qoidalar.", 'yara -t implant rules.yar dir'],
    ['-i', "Faqat shu nomli qoida.", 'yara -i Updater_Implant rules.yar dir'],
  ], [
    ['yara -r -s hunt.yar /srv/share', "Fayl serverini qoida bilan tekshirish, topilgan satrlar bilan"],
  ], "Qoida: rule Nom { meta: ... strings: $a = \"matn\" nocase wide; $h = { 4D 5A }; $r = /re/ condition: $h at 0 and any of ($a, $r) }. Ishlatilmagan satr — xato (unreferenced string). Simulyatorda modullar (import \"pe\") yo'q."),
];
