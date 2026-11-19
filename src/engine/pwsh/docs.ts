/*
 * PowerShell reference: every cmdlet the simulator knows, its parameters explained in Uzbek with an example.
 * It feeds Get-Help, the "Buyruqlar" page (PowerShell section) and the lab teaching notes, exactly like the Linux docs.
 */
import type { CommandDoc } from '../terminal/docs';

export interface PsDoc extends CommandDoc {
  aliases?: string[];
  module?: string;
}

const p = (
  name: string,
  summary: string,
  usage: string,
  flags: [string, string, string?][],
  examples: [string, string][],
  extra: { aliases?: string[]; note?: string; module?: string } = {},
): PsDoc => ({ name, category: 'powershell', summary, usage, flags, examples, ...extra });

export const PS_DOCS: PsDoc[] = [
  // ── basics and the object pipeline
  p('Get-Help', "Buyruq haqida yordam: nima qiladi, parametrlari, misollar.", 'Get-Help NOM [-Examples]', [['-Examples', 'Faqat misollarni ko\'rsatadi.', 'Get-Help Get-Process -Examples']], [['Get-Help Get-ChildItem', "ls ning PowerShell'dagi asl nomi haqida"]], { aliases: ['help', 'man'] }),
  p('Get-Command', 'Mavjud buyruqlarni qidiradi.', 'Get-Command [NOM] [-Verb FE\'L] [-Noun OT]', [
    ['-Verb', "Fe'l bo'yicha: Get, Set, Stop, Remove...", 'Get-Command -Verb Stop'],
    ['-Noun', "Ot bo'yicha: Process, Service, Item...", 'Get-Command -Noun Service'],
  ], [['Get-Command *Firewall*', "Nomida Firewall bor buyruqlar"]], { aliases: ['gcm'], note: "PowerShell buyruqlari Fe'l-Ot ko'rinishida: Get-Process — jarayonlarni olish." }),
  p('Get-Member', "Obyektning xossalari va metodlari: quvurdan nima kelayotganini bilish uchun.", 'BUYRUQ | Get-Member [-MemberType Property]', [['-MemberType', 'Faqat Property yoki Method.', 'Get-Process | Get-Member -MemberType Property']], [['Get-Service | Get-Member', "ServiceController obyektida qanday maydonlar bor"]], { aliases: ['gm'] }),
  p('Where-Object', "Quvurdagi obyektlarni shart bo'yicha filtrlaydi (grep ning obyektli ko'rinishi).", "BUYRUQ | Where-Object { $_.Xossa -eq QIYMAT }", [
    ['{ $_.Xossa -eq QIYMAT }', "Skript blok: $_ — hozirgi obyekt. Operatorlar: -eq -ne -gt -lt -ge -le -like -match.", 'Get-Service | Where-Object { $_.Status -eq "Running" }'],
    ['Xossa -eq Qiymat', "Qisqa yozuv (blokisiz).", 'Get-Service | Where-Object Status -eq Running'],
    ['-like', "Yulduzcha bilan andoza: *svc*.", 'Get-Process | Where-Object { $_.Name -like "*svc*" }'],
    ['-match', 'Regex bilan moslik.', 'Get-Content log.txt | Where-Object { $_ -match "Failed" }'],
    ['-and / -or', "Shartlarni birlashtirish.", 'Get-Process | Where-Object { $_.CPU -gt 50 -and $_.Path -like "C:\\Users\\*" }'],
    ['-notlike / -notmatch', 'Inkor: mos kelmaganlari.', 'Get-Service | Where-Object { $_.Name -notlike "Win*" }'],
  ], [['Get-Process | ? CPU -gt 100', "? — Where-Object ning taxallusi"]], { aliases: ['?', 'where'], note: 'Taqqoslash katta-kichik harfni farqlamaydi (-ceq farqlaydi).' }),
  p('Select-Object', "Kerakli xossalarni tanlaydi, birinchi/oxirgi N tasini oladi.", 'BUYRUQ | Select-Object XOSSA,... [-First N] [-Last N] [-ExpandProperty X] [-Unique]', [
    ['-Property', "Faqat shu xossalar (vergul bilan).", 'Get-Process | Select-Object Name, Id, Path'],
    ['-First N', 'Birinchi N ta obyekt.', 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5'],
    ['-Last N', 'Oxirgi N ta obyekt.', 'Get-Content log.txt | Select-Object -Last 3'],
    ['-ExpandProperty', "Xossaning o'zini qiymat sifatida (jadvalsiz).", 'Get-Service | Select-Object -ExpandProperty Name'],
    ['-Unique', 'Takrorlarni olib tashlaydi.', 'Get-Content ip.txt | Select-Object -Unique'],
    ['@{Name=..; Expression={..}}', "Hisoblangan ustun.", "Get-Process | Select-Object Name, @{Name='MB'; Expression={ $_.WorkingSet64 / 1MB }}"],
  ], [['Get-LocalUser | Select-Object Name, Enabled, LastLogon', 'Uchta ustunli jadval']], { aliases: ['select'] }),
  p('Sort-Object', 'Obyektlarni xossa bo\'yicha tartiblaydi.', 'BUYRUQ | Sort-Object XOSSA [-Descending] [-Unique]', [
    ['-Property', "Qaysi xossa bo'yicha.", 'Get-Process | Sort-Object CPU'],
    ['-Descending', 'Kamayish tartibida.', 'Get-Process | Sort-Object WS -Descending'],
    ['-Unique', 'Takrorsiz.', 'Get-Content ip.txt | Sort-Object -Unique'],
  ], [['Get-ChildItem | Sort-Object LastWriteTime -Descending', "Eng yangi fayllar tepada"]], { aliases: ['sort'] }),
  p('Group-Object', "Bir xil qiymatlilarni guruhlab sanaydi (sort | uniq -c ga o'xshash).", 'BUYRUQ | Group-Object XOSSA [-NoElement]', [
    ['-Property', "Qaysi xossa bo'yicha guruhlash.", 'Get-Service | Group-Object Status'],
    ['-NoElement', "Faqat soni va nomi (Group ustunisiz).", 'Get-Process | Group-Object Name -NoElement'],
  ], [['Get-WinEvent -LogName Security | Group-Object Id -NoElement | Sort-Object Count -Descending', 'Qaysi hodisa ID qancha uchraydi']], { aliases: ['group'] }),
  p('Measure-Object', "Sanaydi; son xossalar uchun yig'indi, o'rtacha, eng katta/kichik.", 'BUYRUQ | Measure-Object [XOSSA] [-Sum] [-Average] [-Maximum] [-Minimum] [-Line]', [
    ['-Property', 'Qaysi son xossa.', 'Get-ChildItem | Measure-Object Length -Sum'],
    ['-Sum', "Yig'indi.", 'Get-Process | Measure-Object WorkingSet64 -Sum'],
    ['-Average', "O'rtacha.", 'Get-Process | Measure-Object CPU -Average'],
    ['-Maximum', 'Eng katta qiymat.', 'Get-ChildItem | Measure-Object Length -Maximum'],
    ['-Line', 'Matndagi qatorlar soni (wc -l).', 'Get-Content log.txt | Measure-Object -Line'],
  ], [['(Get-Process).Count', "Qisqa yo'l: obyektlar soni"]], { aliases: ['measure'] }),
  p('ForEach-Object', "Har bir obyekt uchun blokni bajaradi.", 'BUYRUQ | ForEach-Object { ... $_ ... }', [
    ['{ ... }', "Blok har obyekt uchun bajariladi, $_ — o'sha obyekt.", 'Get-Service | ForEach-Object { $_.Name.ToUpper() }'],
    ['XOSSA', "Qisqa yozuv: har obyektning shu xossasi.", 'Get-Process | ForEach-Object Name'],
  ], [['1..3 | % { $_ * 2 }', '% — taxallus (simulyatorda 1..3 yo\'q, ro\'yxatdan foydalaning)']], { aliases: ['%', 'foreach'] }),
  p('Format-Table', "Natijani jadval ko'rinishida chiqaradi.", 'BUYRUQ | Format-Table [XOSSA,...] [-AutoSize]', [
    ['-Property', 'Ustunlar.', 'Get-Service | Format-Table Name, Status, StartType'],
    ['-AutoSize', "Ustun kengligini mazmunga moslaydi.", 'Get-Process | Format-Table -AutoSize'],
  ], [['Get-ScheduledTask | Format-Table TaskName, State', 'Ixcham jadval']], { aliases: ['ft'], note: 'Format-* quvurning oxirida turadi: undan keyin obyekt emas, matn chiqadi.' }),
  p('Format-List', "Har obyektni \"Xossa : qiymat\" ro'yxati qilib chiqaradi — uzun maydonlar uchun qulay.", 'BUYRUQ | Format-List [XOSSA,... | *]', [
    ['-Property', 'Qaysi xossalar.', 'Get-Process -Id 4120 | Format-List Name, Path, StartTime'],
    ['*', 'Hamma xossalar.', 'Get-Service Spooler | Format-List *'],
  ], [['Get-WinEvent -LogName Security -MaxEvents 1 | Format-List', "Hodisaning to'liq matni"]], { aliases: ['fl'] }),
  p('Out-File', 'Natijani faylga yozadi (> ning to\'liq shakli).', 'BUYRUQ | Out-File YO\'L [-Append]', [
    ['-FilePath', "Fayl yo'li.", 'Get-Process | Out-File C:\\IR\\jarayonlar.txt'],
    ['-Append', "Faylning oxiriga qo'shadi (>> kabi).", 'Get-Date | Out-File log.txt -Append'],
  ], [['Get-Service > xizmatlar.txt', '> ham Out-File']]),
  p('Export-Csv', "Obyektlarni CSV faylga saqlaydi — Excel'da ochsa bo'ladi.", 'BUYRUQ | Export-Csv YO\'L [-NoTypeInformation]', [
    ['-Path', "Fayl yo'li.", 'Get-LocalUser | Export-Csv users.csv'],
    ['-NoTypeInformation', "Birinchi #TYPE qatorini yozmaydi (PowerShell 7 da shusiz ham).", 'Get-Service | Export-Csv s.csv -NoTypeInformation'],
  ], [['Import-Csv users.csv', "Qayta obyekt qilib o'qish"]]),
  p('Import-Csv', "CSV faylni obyektlarga aylantiradi.", "Import-Csv YO'L", [], [['Import-Csv baseline.csv | Where-Object Enabled -eq True', 'CSV ustida filtr']]),
  p('ConvertFrom-Json', "JSON matnni obyektlarga aylantiradi (jq o'rnida).", 'Get-Content -Raw F.json | ConvertFrom-Json', [], [["Get-Content events.json -Raw | ConvertFrom-Json | Where-Object EventID -eq 4625", 'SIEM eksporti ustida filtr']]),
  p('ConvertTo-Json', "Obyektlarni JSON ga aylantiradi.", 'BUYRUQ | ConvertTo-Json [-Depth N] [-Compress]', [['-Compress', 'Bir qatorda.', 'Get-Service Spooler | Select Name,Status | ConvertTo-Json -Compress']], [['Get-LocalUser | Select Name,Enabled | ConvertTo-Json', 'Hisobot uchun JSON']]),
  p('Compare-Object', "Ikki ro'yxatni solishtiradi: qaysi biri faqat birinchisida (<=), faqat ikkinchisida (=>).", 'Compare-Object ESKI YANGI [-Property X]', [
    ['-ReferenceObject', "Asos (eski holat).", 'Compare-Object (Get-Content eski.txt) (Get-Content yangi.txt)'],
    ['-DifferenceObject', 'Solishtiriladigan (yangi holat).', ''],
    ['-Property', "Obyektlarni shu xossa bo'yicha solishtirish.", "Compare-Object $eski $yangi -Property Name"],
  ], [['Compare-Object (Import-Csv baseline.csv) (Get-Service) -Property Name', "Asosiy holatdan keyin qo'shilgan xizmatlar"]], { aliases: ['diff', 'compare'] }),
  p('Tee-Object', "Natijani ham ekranga, ham faylga.", 'BUYRUQ | Tee-Object YO\'L', [['-FilePath', "Fayl yo'li.", 'Get-Process | Tee-Object jarayonlar.txt']], [['Get-NetTCPConnection -State Listen | Tee-Object portlar.txt', 'Ko\'rib, ayni paytda saqlash']], { aliases: ['tee'] }),
  p('Write-Output', 'Qiymatni quvurga chiqaradi (echo).', 'Write-Output QIYMAT', [], [['Write-Output "Salom, $env:USERNAME"', "O'zgaruvchi qo'shtirnoq ichida ochiladi"]], { aliases: ['echo', 'write'] }),
  p('Get-Date', 'Hozirgi sana va vaqt.', 'Get-Date [-Format SHABLON]', [['-Format', 'Masalan: yyyy-MM-dd HH:mm', "Get-Date -Format 'yyyy-MM-dd HH:mm'"]], [['(Get-Date).AddDays(-1)', 'Kecha shu vaqt']]),
  p('Get-History', 'Shu sessiyada kiritilgan buyruqlar.', 'Get-History', [], [['Get-History', 'Hisobotga qadamlarni ko\'chirish uchun']], { aliases: ['h', 'history'] }),
  p('Clear-Host', 'Ekranni tozalaydi.', 'Clear-Host', [], [['cls', 'Taxallus']], { aliases: ['cls', 'clear'] }),

  // ── files
  p('Get-ChildItem', "Katalog ichidagilar (ls / dir). Yashirin fayllar uchun -Force.", "Get-ChildItem [YO'L] [-Recurse] [-Force] [-Filter *.ext] [-File] [-Directory]", [
    ['-Path', "Qaysi katalog (yoki fayl andozasi).", 'Get-ChildItem C:\\Users\\talaba\\Desktop'],
    ['-Force', 'Yashirin (Hidden) fayl va papkalarni ham ko\'rsatadi.', 'Get-ChildItem -Force'],
    ['-Recurse', "Ichki papkalarni ham aylanib chiqadi.", 'Get-ChildItem C:\\Users -Recurse -Filter *.ps1'],
    ['-Filter', "Nom andozasi: *.txt, *.exe.", 'Get-ChildItem -Filter *.log'],
    ['-File', 'Faqat fayllar.', 'Get-ChildItem -File'],
    ['-Directory', 'Faqat papkalar.', 'Get-ChildItem -Directory'],
    ['-Hidden', 'Faqat yashirinlar.', 'Get-ChildItem -Hidden'],
    ['-Name', 'Faqat nomlar (jadvalsiz).', 'Get-ChildItem -Name'],
    ['-Depth', "Necha qavat chuqurlikkacha (-Recurse bilan).", 'Get-ChildItem C:\\Users -Recurse -Depth 1'],
  ], [['Get-ChildItem C:\\ProgramData -Recurse -Force -File | Sort-Object LastWriteTime -Descending | Select -First 5', "Yaqinda o'zgargan fayllar"], ['Get-ChildItem Env:', "Muhit o'zgaruvchilari"]], { aliases: ['ls', 'dir', 'gci'] }),
  p('Set-Location', "Joriy katalogni o'zgartiradi (cd).", "Set-Location YO'L", [], [['cd C:\\Users\\talaba\\Desktop', "To'liq yo'l"], ['cd ..', 'Bir pog\'ona yuqori']], { aliases: ['cd', 'sl'] }),
  p('Get-Location', 'Joriy katalog (pwd).', 'Get-Location', [], [['pwd', 'Taxallus']], { aliases: ['pwd', 'gl'] }),
  p('Get-Content', "Fayl mazmuni (cat). Qatorlar alohida obyekt bo'lib keladi.", "Get-Content YO'L [-TotalCount N] [-Tail N] [-Raw]", [
    ['-Path', 'Fayl.', 'Get-Content C:\\IR\\notes.txt'],
    ['-TotalCount N', 'Birinchi N qator (head).', 'Get-Content log.txt -TotalCount 5'],
    ['-Tail N', 'Oxirgi N qator (tail).', 'Get-Content log.txt -Tail 5'],
    ['-Raw', "Butun faylni bitta matn qilib (JSON uchun kerak).", 'Get-Content data.json -Raw | ConvertFrom-Json'],
  ], [['Get-Content hosts | Select-String -NotMatch "^#"', 'Izohsiz qatorlar']], { aliases: ['cat', 'gc', 'type'] }),
  p('Set-Content', 'Faylga yozadi (eskisini almashtiradi).', "Set-Content YO'L -Value MATN", [['-Value', 'Yoziladigan matn.', "Set-Content eslatma.txt -Value 'tekshirildi'"]], [["'a','b' | Set-Content r.txt", 'Quvurdan ham oladi']]),
  p('Add-Content', "Fayl oxiriga qo'shadi.", "Add-Content YO'L -Value MATN", [['-Value', "Qo'shiladigan matn.", "Add-Content log.txt -Value 'yangi qator'"]], [['Add-Content C:\\IR\\timeline.txt -Value "02:14 svc_backup RDP orqali kirdi"', "Vaqt chizig'iga yozish"]]),
  p('New-Item', 'Yangi fayl yoki papka (va registr kaliti).', "New-Item YO'L -ItemType File|Directory [-Value MATN]", [
    ['-ItemType', "File yoki Directory.", 'New-Item C:\\IR -ItemType Directory'],
    ['-Value', 'Fayl mazmuni.', "New-Item eslatma.txt -ItemType File -Value 'salom'"],
    ['-Force', "Bor bo'lsa ham / yo'q papkalari bilan yaratadi.", 'New-Item C:\\IR\\dalil\\x.txt -Force'],
  ], [['mkdir C:\\IR', 'Papka uchun qisqa yo\'l']], { aliases: ['ni', 'mkdir', 'md'] }),
  p('Copy-Item', 'Nusxalaydi.', "Copy-Item MANBA MANZIL [-Recurse]", [
    ['-Destination', 'Qayerga.', 'Copy-Item a.txt C:\\IR\\'],
    ['-Recurse', "Papkani ichidagilari bilan.", 'Copy-Item C:\\ProgramData\\x C:\\IR\\dalil -Recurse'],
  ], [['Copy-Item C:\\Users\\Public\\svcupd.exe C:\\IR\\', 'Tozalashdan oldin dalil saqlash']], { aliases: ['cp', 'copy'] }),
  p('Move-Item', "Ko'chiradi yoki qayta nomlaydi.", 'Move-Item MANBA MANZIL', [], [['Move-Item a.txt C:\\IR\\', 'Faylni ko\'chirish']], { aliases: ['mv', 'move'] }),
  p('Rename-Item', 'Nomini o\'zgartiradi.', "Rename-Item YO'L YANGI_NOM", [], [['Rename-Item eski.txt yangi.txt', '']], { aliases: ['ren'] }),
  p('Remove-Item', "O'chiradi (rm / del).", "Remove-Item YO'L [-Recurse] [-Force]", [
    ['-Recurse', "Papkani ichidagilari bilan.", 'Remove-Item C:\\Temp\\x -Recurse'],
    ['-Force', "Yashirin va faqat o'qiladigan fayllarni ham.", 'Remove-Item C:\\ProgramData\\.cache -Force'],
  ], [['Remove-Item HKCU:\\Software\\Shubhali -Recurse', "Registr kalitini o'chirish"]], { aliases: ['rm', 'del', 'rd'] }),
  p('Test-Path', "Yo'l mavjudmi? True yoki False.", "Test-Path YO'L [-PathType Leaf|Container]", [['-PathType', "Leaf — fayl, Container — papka.", 'Test-Path C:\\IR -PathType Container']], [['Test-Path HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'Registrda ham ishlaydi']]),
  p('Get-Item', "Bitta fayl/papka/registr kaliti haqida ma'lumot.", "Get-Item YO'L", [], [['Get-Item C:\\Users\\Public\\svcupd.exe | Format-List *', "Faylning barcha xossalari"]], { aliases: ['gi'] }),
  p('Get-ItemProperty', "Registr kalitining qiymatlari (yoki fayl xossalari).", "Get-ItemProperty YO'L [-Name QIYMAT]", [
    ['-Path', 'Registr yo\'li: HKLM:\\... yoki HKCU:\\...', 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'],
    ['-Name', 'Faqat shu qiymat.', 'Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -Name Updater'],
  ], [['Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', "Foydalanuvchi kirganda ishga tushadigan dasturlar (autorun)"]], { aliases: ['gp'] }),
  p('Set-ItemProperty', "Registr qiymatini o'rnatadi yoki o'zgartiradi.", "Set-ItemProperty YO'L -Name NOM -Value QIYMAT", [['-Name', 'Qiymat nomi.', ''], ['-Value', 'Yangi qiymat.', "Set-ItemProperty HKLM:\\System\\CurrentControlSet\\Control\\Lsa -Name RunAsPPL -Value 1"]], [['Set-ItemProperty HKLM:\\...\\Policies\\System -Name EnableLUA -Value 1', 'UAC ni qayta yoqish']]),
  p('Remove-ItemProperty', "Registr qiymatini o'chiradi (kalitni emas).", "Remove-ItemProperty YO'L -Name NOM", [['-Name', "O'chiriladigan qiymat nomi.", 'Remove-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -Name Updater']], [['Remove-ItemProperty HKLM:\\...\\Run -Name WinUpd', "Autorun yozuvini olib tashlash"]]),
  p('Select-String', "Matndan andoza qidiradi (grep).", "Select-String ANDOZA [-Path YO'L] [-SimpleMatch] [-NotMatch] [-CaseSensitive]", [
    ['-Pattern', 'Regex andoza.', 'Select-String "Failed" -Path C:\\Logs\\*.log'],
    ['-Path', 'Qaysi fayllar (andoza bilan ham).', 'Select-String password -Path C:\\Users\\*\\Desktop\\*.txt'],
    ['-SimpleMatch', "Regex emas, oddiy matn (nuqta — nuqta).", 'Select-String "1.2.3.4" -Path log.txt -SimpleMatch'],
    ['-NotMatch', 'Mos kelmagan qatorlar (grep -v).', 'Get-Content hosts | Select-String -NotMatch "^#"'],
    ['-CaseSensitive', 'Katta-kichik harfni farqlaydi.', 'Select-String Error -Path app.log -CaseSensitive'],
  ], [['Get-Content log.txt | Select-String "4625"', 'Quvurdan kelgan qatorlarda qidirish']], { aliases: ['sls'] }),
  p('Get-FileHash', "Faylning SHA256 xeshi — VirusTotal'da tekshirish va dalil yaxlitligi uchun.", "Get-FileHash YO'L [-Algorithm SHA256]", [['-Algorithm', 'Simulyatorda faqat SHA256.', 'Get-FileHash C:\\Users\\Public\\svcupd.exe -Algorithm SHA256']], [['Get-ChildItem C:\\IR -File | Get-FileHash', 'Papkadagi hamma fayllar xeshi']]),
  p('Split-Path', "Yo'ldan fayl nomi (-Leaf) yoki papkani (-Parent) ajratadi.", "Split-Path YO'L [-Leaf]", [['-Leaf', 'Fayl nomi.', 'Split-Path C:\\Users\\Public\\svcupd.exe -Leaf']], [['Split-Path C:\\IR\\a.txt', 'C:\\IR']]),
  p('Join-Path', "Ikki yo'lni to'g'ri birlashtiradi.", 'Join-Path PAPKA FAYL', [], [['Join-Path C:\\IR timeline.txt', 'C:\\IR\\timeline.txt']]),

  // ── processes, services, tasks
  p('Get-Process', 'Ishlayotgan jarayonlar (ps / tasklist).', 'Get-Process [NOM] [-Id N] [-IncludeUserName]', [
    ['-Name', "Nom bo'yicha (andoza bilan ham).", 'Get-Process -Name svchost'],
    ['-Id', "PID bo'yicha.", 'Get-Process -Id 4120'],
    ['-IncludeUserName', "Kim nomidan ishlayotganini ham ko'rsatadi (administrator kerak).", 'Get-Process -IncludeUserName'],
  ], [['Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', "Eng ko'p CPU ishlatayotganlar"], ['Get-Process | Select Name, Id, Path', "Qaysi fayldan ishga tushgani"]], { aliases: ['ps', 'gps'] }),
  p('Stop-Process', 'Jarayonni to\'xtatadi (kill).', 'Stop-Process -Id PID [-Force]  |  Stop-Process -Name NOM', [
    ['-Id', 'PID.', 'Stop-Process -Id 4120 -Force'],
    ['-Name', "Nom bo'yicha (hamma nusxalari).", 'Stop-Process -Name notepad'],
    ['-Force', "So'ramasdan, majburan.", 'Stop-Process -Id 4120 -Force'],
  ], [['Get-Process svcupd | Stop-Process -Force', 'Quvur orqali']], { aliases: ['kill', 'spps'] }),
  p('Get-Service', 'Xizmatlar va ularning holati.', 'Get-Service [NOM] [-DisplayName ANDOZA]', [
    ['-Name', "Xizmat nomi (andoza bilan ham).", 'Get-Service -Name WinRM'],
    ['-DisplayName', "Ko'rinadigan nom bo'yicha.", "Get-Service -DisplayName '*Update*'"],
  ], [['Get-Service | Where-Object Status -eq Running', 'Faqat ishlayotganlar'], ['Get-Service | Select Name, StartType, BinaryPathName', 'Xizmat qaysi faylni ishga tushiradi']], { aliases: ['gsv'] }),
  p('Stop-Service', "Xizmatni to'xtatadi (administrator).", 'Stop-Service NOM [-Force]', [['-Force', "Bog'liq xizmatlar bo'lsa ham.", 'Stop-Service WinUpdateSvc -Force']], [['Stop-Service Spooler', '']]),
  p('Start-Service', 'Xizmatni ishga tushiradi (administrator).', 'Start-Service NOM', [], [['Start-Service WinDefend', '']]),
  p('Restart-Service', 'Xizmatni qayta ishga tushiradi.', 'Restart-Service NOM', [], [['Restart-Service W32Time', '']]),
  p('Set-Service', "Xizmat sozlamasi: avtomatik ishga tushish turi (administrator).", 'Set-Service NOM -StartupType Automatic|Manual|Disabled', [
    ['-StartupType', "Automatic — yuklanganda, Manual — qo'lda, Disabled — umuman ishga tushmaydi.", 'Set-Service WinUpdateSvc -StartupType Disabled'],
    ['-Status', "Stopped yoki Running.", 'Set-Service Spooler -Status Stopped'],
  ], [['Set-Service RemoteRegistry -StartupType Disabled', 'Keraksiz xizmatni o\'chirib qo\'yish']]),
  p('Remove-Service', "Xizmatni butunlay o'chiradi (administrator).", 'Remove-Service NOM', [], [['Remove-Service WinUpdateSvc', "Hujumchi o'rnatgan xizmatni olib tashlash"]]),
  p('Get-CimInstance', "WMI/CIM orqali tizim ma'lumoti: jarayonlarning buyruq qatori va ota jarayoni, xizmat fayllari, autorun.", 'Get-CimInstance KLASS [-Filter "Name=\'x\'"]', [
    ['Win32_Process', "Jarayonlar: ProcessId, ParentProcessId, CommandLine.", 'Get-CimInstance Win32_Process | Select ProcessId, ParentProcessId, Name, CommandLine'],
    ['Win32_Service', 'Xizmatlar: PathName, StartMode, StartName (qaysi akkaunt).', 'Get-CimInstance Win32_Service | Select Name, StartMode, PathName'],
    ['Win32_StartupCommand', "Autorun yozuvlari (Run kalitlari).", 'Get-CimInstance Win32_StartupCommand'],
    ['Win32_OperatingSystem', "OT versiyasi, oxirgi yuklanish vaqti.", 'Get-CimInstance Win32_OperatingSystem | Select Caption, LastBootUpTime'],
    ['-Filter', "WQL sharti: Name='x', ProcessId=123, Name like '%x%'.", "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\""],
  ], [['Get-CimInstance Win32_Process -Filter "ProcessId=4120" | Format-List *', "Jarayon haqida hammasi"]], { aliases: ['gcim'] }),
  p('Get-ScheduledTask', "Rejalashtirilgan vazifalar (Windows'dagi cron).", 'Get-ScheduledTask [-TaskName NOM] [-TaskPath YO\'L]', [
    ['-TaskName', "Vazifa nomi (andoza bilan ham).", "Get-ScheduledTask -TaskName '*Update*'"],
    ['-TaskPath', "Papka: \\ — ildiz, Microsoft vazifalari \\Microsoft\\Windows\\ ostida.", "Get-ScheduledTask -TaskPath '\\'"],
  ], [['(Get-ScheduledTask -TaskName X).Actions', "Vazifa qaysi dasturni ishga tushiradi"], ["Get-ScheduledTask | Where-Object TaskPath -eq '\\'", "Ildizdagi (odatda qo'lda yaratilgan) vazifalar"]]),
  p('Disable-ScheduledTask', "Vazifani o'chirib qo'yadi (saqlanadi, lekin ishlamaydi).", 'Disable-ScheduledTask -TaskName NOM', [['-TaskName', 'Vazifa nomi.', 'Disable-ScheduledTask -TaskName OneDriveSync']], [['Disable-ScheduledTask -TaskName OneDriveSync', 'Dalil sifatida saqlab, zararsizlantirish']]),
  p('Enable-ScheduledTask', 'Vazifani qayta yoqadi.', 'Enable-ScheduledTask -TaskName NOM', [], [['Enable-ScheduledTask -TaskName Backup', '']]),
  p('Unregister-ScheduledTask', "Vazifani butunlay o'chiradi.", 'Unregister-ScheduledTask -TaskName NOM -Confirm:$false', [['-Confirm:$false', "Tasdiq so'ramaydi.", 'Unregister-ScheduledTask -TaskName OneDriveSync -Confirm:$false']], [['Unregister-ScheduledTask -TaskName X -Confirm:$false', '']]),

  // ── users and groups
  p('Get-LocalUser', "Lokal foydalanuvchilar: yoqilganmi, oxirgi kirish, parol qachon o'zgargan.", 'Get-LocalUser [NOM]', [['-Name', 'Foydalanuvchi nomi.', 'Get-LocalUser -Name helpdesk2']], [['Get-LocalUser | Select Name, Enabled, LastLogon, PasswordLastSet', "Audit uchun"]]),
  p('Disable-LocalUser', "Akkauntni bloklaydi (o'chirmaydi) — tergov uchun xavfsiz yo'l.", 'Disable-LocalUser NOM', [], [['Disable-LocalUser -Name helpdesk2', '']]),
  p('Enable-LocalUser', 'Akkauntni qayta yoqadi.', 'Enable-LocalUser NOM', [], [['Enable-LocalUser -Name ali', '']]),
  p('Remove-LocalUser', "Akkauntni butunlay o'chiradi.", 'Remove-LocalUser NOM', [], [['Remove-LocalUser -Name test', '']]),
  p('Get-LocalGroup', 'Lokal guruhlar.', 'Get-LocalGroup [NOM]', [], [['Get-LocalGroup', '']]),
  p('Get-LocalGroupMember', 'Guruh a\'zolari — ayniqsa Administrators.', 'Get-LocalGroupMember GURUH', [['-Group', 'Guruh nomi.', 'Get-LocalGroupMember -Group Administrators']], [["Get-LocalGroupMember 'Remote Desktop Users'", 'RDP orqali kira oladiganlar']]),
  p('Add-LocalGroupMember', "Guruhga qo'shadi.", 'Add-LocalGroupMember -Group GURUH -Member NOM', [['-Member', 'Kim.', "Add-LocalGroupMember -Group 'Remote Desktop Users' -Member ali"]], [['Add-LocalGroupMember -Group Users -Member ali', '']]),
  p('Remove-LocalGroupMember', 'Guruhdan chiqaradi.', 'Remove-LocalGroupMember -Group GURUH -Member NOM', [['-Member', 'Kim.', 'Remove-LocalGroupMember -Group Administrators -Member helpdesk2']], [['Remove-LocalGroupMember -Group Administrators -Member helpdesk2', 'Ortiqcha admin huquqini olish']]),
  p('whoami.exe', 'Siz kimsiz: foydalanuvchi, guruhlar, imtiyozlar.', 'whoami [/groups | /priv | /user]', [
    ['/groups', "Guruhlar; High Mandatory Level — administrator sifatida ochilgan.", 'whoami /groups'],
    ['/priv', 'Imtiyozlar (SeDebugPrivilege va boshqalar).', 'whoami /priv'],
    ['/user', 'Foydalanuvchi va SID.', 'whoami /user'],
  ], [['whoami', 'kompyuter\\foydalanuvchi']]),

  // ── network
  p('Get-NetTCPConnection', "TCP ulanishlar va tinglayotgan portlar (netstat), qaysi jarayon ochgani bilan.", 'Get-NetTCPConnection [-State Listen|Established] [-LocalPort N] [-RemoteAddress IP]', [
    ['-State', 'Listen — tinglayapti, Established — ulangan.', 'Get-NetTCPConnection -State Listen'],
    ['-LocalPort', "Port bo'yicha.", 'Get-NetTCPConnection -LocalPort 3389'],
    ['-RemoteAddress', "Tashqi manzil bo'yicha.", 'Get-NetTCPConnection -RemoteAddress 198.51.100.40'],
    ['-OwningProcess', "PID bo'yicha.", 'Get-NetTCPConnection -OwningProcess 4120'],
  ], [['Get-NetTCPConnection -State Established | Select RemoteAddress, RemotePort, OwningProcess', 'Kim bilan gaplashyapmiz'], ['Get-Process -Id (Get-NetTCPConnection -LocalPort 4444).OwningProcess', 'Portni ochgan jarayon']]),
  p('Get-NetIPAddress', 'Kompyuterning IP manzillari.', 'Get-NetIPAddress [-AddressFamily IPv4]', [['-AddressFamily', 'IPv4 yoki IPv6.', 'Get-NetIPAddress -AddressFamily IPv4']], [['Get-NetIPAddress -AddressFamily IPv4 | Select IPAddress, InterfaceAlias', '']]),
  p('ipconfig', 'Tarmoq sozlamalari (klassik buyruq).', 'ipconfig [/all | /displaydns | /flushdns]', [
    ['/all', "To'liq: MAC, DNS serverlar.", 'ipconfig /all'],
    ['/displaydns', "DNS keshi: yaqinda qaysi domenlarga murojaat qilingan.", 'ipconfig /displaydns'],
    ['/flushdns', 'DNS keshini tozalaydi.', 'ipconfig /flushdns'],
  ], [['ipconfig', 'IP, niqob, shlyuz']]),
  p('netstat', 'Ulanishlar (klassik buyruq).', 'netstat -ano', [['-ano', "Hammasi, raqamlar bilan, PID ustuni bilan.", 'netstat -ano']], [['netstat -ano | Select-String LISTENING', 'Tinglayotgan portlar']]),
  p('Resolve-DnsName', 'Domen nomini IP ga aylantiradi (nslookup).', 'Resolve-DnsName NOM', [], [['Resolve-DnsName update-cdn.example', "Shubhali domen qayerga ishora qiladi"]]),
  p('Test-NetConnection', 'Manzilga ulanish bormi, port ochiqmi.', 'Test-NetConnection MANZIL [-Port N]', [['-Port', 'TCP port tekshiruvi.', 'Test-NetConnection 198.51.100.40 -Port 443']], [['Test-NetConnection 10.10.20.1', 'Ping tekshiruvi']]),
  p('Get-DnsClientCache', 'DNS keshi (obyekt shaklida).', 'Get-DnsClientCache [-Entry ANDOZA]', [['-Entry', 'Domen andozasi.', "Get-DnsClientCache -Entry '*example*'"]], [['Get-DnsClientCache | Select Entry, Data', 'Qaysi domenlar qaysi IP ga']]),
  p('Clear-DnsClientCache', 'DNS keshini tozalaydi.', 'Clear-DnsClientCache', [], [['Clear-DnsClientCache', '']]),
  p('Get-NetFirewallRule', "Windows Firewall qoidalari.", 'Get-NetFirewallRule [-DisplayName ANDOZA] [-Direction Inbound] [-Action Block] [-Enabled True]', [
    ['-DisplayName', "Qoida nomi (andoza bilan).", "Get-NetFirewallRule -DisplayName '*RDP*'"],
    ['-Direction', 'Inbound (kiruvchi) yoki Outbound (chiquvchi).', 'Get-NetFirewallRule -Direction Inbound'],
    ['-Action', 'Allow yoki Block.', 'Get-NetFirewallRule -Action Block'],
    ['-Enabled', 'True yoki False.', 'Get-NetFirewallRule -Enabled True'],
  ], [['Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow | Select DisplayName', 'Nimaga ruxsat berilgan']]),
  p('New-NetFirewallRule', "Yangi firewall qoidasi (administrator).", 'New-NetFirewallRule -DisplayName NOM -Direction Inbound|Outbound -Action Block|Allow [-RemoteAddress IP] [-LocalPort N] [-Protocol TCP]', [
    ['-DisplayName', 'Qoida nomi.', ''],
    ['-Direction', "Inbound — kiruvchi, Outbound — chiquvchi.", ''],
    ['-Action', 'Block — taqiqlash, Allow — ruxsat.', ''],
    ['-RemoteAddress', 'Qaysi tashqi manzil.', "New-NetFirewallRule -DisplayName 'Block C2' -Direction Outbound -Action Block -RemoteAddress 198.51.100.40"],
    ['-LocalPort', 'Qaysi port (-Protocol bilan).', "New-NetFirewallRule -DisplayName 'Block 4444' -Direction Inbound -Action Block -Protocol TCP -LocalPort 4444"],
  ], [["New-NetFirewallRule -DisplayName 'Block attacker' -Direction Inbound -Action Block -RemoteAddress 198.51.100.40", 'Hujumchi IP sini bloklash']]),
  p('Remove-NetFirewallRule', "Qoidani o'chiradi.", 'Remove-NetFirewallRule -DisplayName NOM', [['-DisplayName', 'Qoida nomi.', "Remove-NetFirewallRule -DisplayName 'Allow 4444'"]], [["Remove-NetFirewallRule -DisplayName 'Allow 4444'", "Hujumchi qo'shgan ruxsatni olib tashlash"]]),
  p('Disable-NetFirewallRule', "Qoidani o'chirib qo'yadi (saqlanadi).", 'Disable-NetFirewallRule -DisplayName NOM', [], [["Disable-NetFirewallRule -DisplayName 'Remote Desktop*'", '']]),
  p('Enable-NetFirewallRule', 'Qoidani yoqadi.', 'Enable-NetFirewallRule -DisplayName NOM', [], [["Enable-NetFirewallRule -DisplayName 'Block C2'", '']]),

  // ── security
  p('Get-WinEvent', "Windows hodisalar jurnali (Event Viewer'ning buyruq shakli). Administrator kerak.", "Get-WinEvent -LogName JURNAL [-MaxEvents N]  |  Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625}", [
    ['-LogName', "Security, System, Application, Microsoft-Windows-PowerShell/Operational...", 'Get-WinEvent -LogName Security -MaxEvents 10'],
    ['-MaxEvents N', "Eng yangi N ta hodisa.", 'Get-WinEvent -LogName System -MaxEvents 5'],
    ['-FilterHashtable', "Jurnal, ID va vaqt bo'yicha tez filtr: @{LogName=..; Id=..; StartTime=..}.", "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625}"],
    ['-Oldest', 'Eskidan yangiga tartibda.', 'Get-WinEvent -LogName Security -Oldest -MaxEvents 3'],
    ['-ListLog', "Mavjud jurnallar ro'yxati.", 'Get-WinEvent -ListLog *'],
  ], [["Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} | Measure-Object", 'Muvaffaqiyatsiz kirishlar soni'], ["Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} | Format-List TimeCreated, Message", "Yangi o'rnatilgan xizmatlar"]], { note: 'Hodisa matni Message xossasida; ichidan qidirish: Where-Object { $_.Message -match "svc_backup" }.' }),
  p('Get-MpComputerStatus', "Microsoft Defender holati: real vaqt himoyasi yoqilganmi, bazalar yangimi.", 'Get-MpComputerStatus', [], [['Get-MpComputerStatus | Select RealTimeProtectionEnabled, AntivirusSignatureLastUpdated', '']]),
  p('Get-MpPreference', "Defender sozlamalari — ayniqsa istisnolar (ExclusionPath): hujumchilar o'z papkasini shu yerga qo'shadi.", 'Get-MpPreference', [], [['Get-MpPreference | Select DisableRealtimeMonitoring, ExclusionPath', 'Istisnolar va real vaqt himoyasi']]),
  p('Set-MpPreference', "Defender sozlamasini o'zgartiradi (administrator).", 'Set-MpPreference -DisableRealtimeMonitoring $false', [['-DisableRealtimeMonitoring', "$false — real vaqt himoyasini qayta YOQADI.", 'Set-MpPreference -DisableRealtimeMonitoring $false']], [['Set-MpPreference -DisableRealtimeMonitoring $false', 'Himoyani tiklash']]),
  p('Add-MpPreference', "Defender'ga istisno qo'shadi (ehtiyot bo'ling).", "Add-MpPreference -ExclusionPath YO'L", [['-ExclusionPath', 'Tekshirilmaydigan papka.', '']], [["Add-MpPreference -ExclusionPath 'D:\\Build'", "Faqat asosli holatda"]]),
  p('Remove-MpPreference', "Defender istisnosini olib tashlaydi.", "Remove-MpPreference -ExclusionPath YO'L", [['-ExclusionPath', 'Olib tashlanadigan istisno.', "Remove-MpPreference -ExclusionPath 'C:\\ProgramData\\WinUpd'"]], [["Remove-MpPreference -ExclusionPath 'C:\\Users\\Public'", "Hujumchi qo'shgan istisnoni olib tashlash"]]),
  p('Start-MpScan', 'Defender tekshiruvini boshlaydi.', "Start-MpScan [-ScanType QuickScan|FullScan] [-ScanPath YO'L]", [
    ['-ScanType', 'QuickScan — tez, FullScan — hammasi.', 'Start-MpScan -ScanType FullScan'],
    ['-ScanPath', 'Faqat shu papka.', 'Start-MpScan -ScanPath C:\\Users\\Public'],
  ], [['Start-MpScan -ScanType QuickScan; Get-MpThreat', "Tekshirib, topilganlarni ko'rish"]]),
  p('Get-MpThreat', 'Defender topgan tahdidlar (nomi va fayli).', 'Get-MpThreat', [], [['Get-MpThreat | Select ThreatName, Resources', '']]),
  p('Get-MpThreatDetection', 'Aniqlash tarixi: qachon, qaysi fayl.', 'Get-MpThreatDetection', [], [['Get-MpThreatDetection | Select InitialDetectionTime, Resources', '']]),
  p('Get-HotFix', "O'rnatilgan Windows yangilanishlari.", 'Get-HotFix [-Id KB...]', [['-Id', "KB raqami bo'yicha.", 'Get-HotFix -Id KB5031364']], [['Get-HotFix | Sort-Object InstalledOn -Descending | Select -First 3', "Oxirgi yangilanishlar"]]),
  p('systeminfo', "Tizim haqida qisqa ma'lumot: OT, yuklanish vaqti, yangilanishlar.", 'systeminfo', [], [['systeminfo', '']]),
  p('hostname.exe', 'Kompyuter nomi.', 'hostname', [], [['hostname', '']]),
  p('tasklist', "Jarayonlar ro'yxati (klassik buyruq).", 'tasklist', [], [['tasklist', '']]),
  p('ping.exe', "Manzil javob beradimi (klassik buyruq).", 'ping MANZIL', [], [['ping 10.10.20.1', '']]),
];

const index = new Map(PS_DOCS.map((d) => [d.name.toLowerCase(), d]));

export function getPsDoc(name: string): PsDoc | null {
  return index.get(name.toLowerCase()) ?? null;
}

export function psManText(doc: PsDoc, examplesOnly = false): string {
  const lines = ['NAME', `    ${doc.name}`, '', 'SYNOPSIS', `    ${doc.summary}`];
  if (!examplesOnly) {
    lines.push('', 'SYNTAX', `    ${doc.usage}`);
    if (doc.flags.length) {
      lines.push('', 'PARAMETERS');
      for (const [f, t, e] of doc.flags) lines.push(`    ${f}`, `        ${t}${e ? `\n        masalan: ${e}` : ''}`);
    }
  }
  if (doc.examples.length) {
    lines.push('', 'EXAMPLES');
    for (const [c, n] of doc.examples) lines.push(`    PS> ${c}${n ? `\n        ${n}` : ''}`);
  }
  if (doc.aliases?.length && !examplesOnly) lines.push('', 'ALIASES', `    ${doc.aliases.join(', ')}`);
  if (doc.note && !examplesOnly) lines.push('', 'REMARKS', `    ${doc.note}`);
  return lines.join('\n');
}
