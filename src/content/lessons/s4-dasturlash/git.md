Siz endi kod yozyapsiz. Skript ishlayapti, uni yaxshilamoqchisiz — va buzib qo'yasiz. Kechagi ishlaydigan versiya qani? `skript_yangi.py`, `skript_yangi2.py`, `skript_OXIRGI_haqiqiy.py`… Tanishmi?

Git bu muammoni butunlay hal qiladi. U har bir o'zgarishni eslab qoladi va istalgan vaqtga qaytish imkonini beradi. Lekin xavfsizlikchi uchun Git — bundan ham ko'proq: bu **ish beruvchiga ko'rsatadigan portfolio**, vositalar yashaydigan joy va — afsuski — sirlar eng ko'p sizib chiqadigan manba.

## Git nima

[[git|Git]] — **versiyalarni boshqarish tizimi**: fayllardagi har bir o'zgarishni — kim, qachon, nimani va nima uchun o'zgartirganini — saqlaydi.

Ikki narsani adashtirmang:

| | Git | GitHub |
|---|---|---|
| Nima | Kompyuteringizdagi dastur | Internetdagi xizmat |
| Vazifasi | O'zgarishlar tarixini yuritadi | Git loyihalarini saqlaydi va ulashadi |
| Internet kerakmi | Yo'q | Ha |
| Muqobillari | — | GitLab, Bitbucket, Codeberg |

Git — bu vosita; GitHub — uning ustiga qurilgan "ijtimoiy tarmoq va ombor".

Git yordamida:

- istalgan oldingi versiyaga qaytasiz;
- "nima o'zgardi?" degan savolga aniq javob olasiz;
- tajribani asosiy kodga zarar yetkazmasdan o'tkazasiz;
- boshqalar bilan bir loyihada ishlaysiz.

## O'rnatish va sozlash

Kali'da Git bor. Windows'da: `git-scm.com`. Tekshirish:

```bash
git --version
```

Birinchi marta — o'zingizni tanishtirasiz (bu har bir o'zgarishga yoziladi):

```bash
git config --global user.name "Ismingiz"
git config --global user.email "manzil@example.com"
```

:::info
Bu ism va pochta har bir commit'da **ochiq** saqlanadi va loyihani ko'rgan har kim ularni ko'radi. Shaxsiy pochtangizni e'lon qilishni istamasangiz, GitHub sozlamalarida beriladigan maxsus `...@users.noreply.github.com` manzilidan foydalaning.
:::

## Asosiy tushunchalar

[[repository|Repozitoriy]] (repo) — Git kuzatayotgan loyiha papkasi. Tarix uning ichidagi yashirin `.git` katalogida saqlanadi.

[[commit|Commit]] — loyihaning ma'lum paytdagi "surati": o'zgarishlar + muallif + vaqt + izoh. Har bir commit'ning noyob identifikatori bor — xesh (`a3f9c2e…`). Xesh darsidan tanish: mazmun o'zgarsa, xesh ham o'zgaradi — shuning uchun tarixni sezdirmasdan o'zgartirib bo'lmaydi.

Fayl uch bosqichdan o'tadi:

```
  Ish katalogi          Staging (sahna)         Repozitoriy
  ─────────────         ───────────────         ───────────
  fayllarni        →    keyingi commit'ga   →   saqlangan
  tahrirlaysiz          nima kirishini          tarix
                        tanlaysiz

              git add                 git commit
```

Nega oraliq bosqich kerak? Besh faylni o'zgartirdingiz, lekin ular ikki xil ishga tegishli. `git add` bilan avval birinchi ishning fayllarini tanlab commit qilasiz, keyin ikkinchisini — tarix toza va tushunarli bo'ladi.

## Birinchi repozitoriy

```bash
mkdir vositalarim && cd vositalarim
git init                        # repozitoriy yaratish

# ... kirish_tahlili.py faylini yozdingiz ...

git status                      # nima o'zgardi?
git add kirish_tahlili.py       # sahnaga qo'yish
git commit -m "Kirish jurnali tahlilchisini qo'shish"
```

Kundalik sikl shu uch buyruqdan iborat:

```bash
git status                      # holatni ko'rish
git add fayl.py                 # (yoki git add . — hammasini)
git commit -m "Nima qilingani"
```

`git status` ni tez-tez yozing — u doim hozir nima bo'layotganini va keyingi qadamni aytib turadi.

### Tarixni ko'rish

```bash
git log                         # to'liq tarix
git log --oneline               # har commit bir qatorda
git log --oneline --graph       # tarmoqlar chizmasi bilan
git log -p fayl.py              # shu fayl qanday o'zgarib kelgan
git show a3f9c2e                # aniq commit'da nima o'zgargan

git diff                        # hali sahnaga qo'yilmagan o'zgarishlar
git diff --staged               # sahnadagi o'zgarishlar
```

`git diff` chiqishida `-` bilan boshlangan qatorlar — o'chirilgan, `+` bilan boshlanganlar — qo'shilgan.

### Yaxshi commit izohi

Izoh — kelajakdagi o'zingizga xat. Uch oydan keyin "nega buni o'zgartirganman?" degan savolga u javob beradi.

| Yomon | Yaxshi |
|---|---|
| `o'zgarishlar` | `Jurnal o'qishda kodlash xatosini tuzatish` |
| `fix` | `Bo'sh qatorlarda dastur qulashini tuzatish` |
| `asdf` | `IP manzilni regex bilan ajratishga o'tish` |

Qoida: **nima qilingani**, qisqa, bitta commit — bitta mantiqiy o'zgarish.

## Orqaga qaytish

```bash
git restore fayl.py             # saqlanmagan o'zgarishlarni bekor qilish
git restore --staged fayl.py    # sahnadan olib tashlash (fayl o'zgarishsiz qoladi)
git revert a3f9c2e              # eski commit'ni bekor qiluvchi YANGI commit yaratish
```

`git restore fayl.py` — saqlanmagan ishni qaytarib bo'lmaydigan qilib o'chiradi. Ehtiyot bo'ling.

`git revert` — xavfsiz usul: u tarixni o'zgartirmaydi, "teskari" commit qo'shadi. Tarixni qayta yozadigan buyruqlar (`reset --hard`, `push --force`) ham bor — ular bilan ishni yo'qotish oson; hozircha ulardan uzoqroq turing.

## Tarmoqlar (branch)

[[branch|Branch]] — asosiy koddan ajralgan mustaqil ish chizig'i. Tajriba muvaffaqiyatli bo'lsa — birlashtirasiz; bo'lmasa — o'chirib tashlaysiz, asosiy kod toza qoladi.

```
main      ●───●───●───────────●   ← barqaror kod
                   \         /
yangi-funksiya      ●───●───●     ← tajriba
```

```bash
git branch                      # tarmoqlar ro'yxati
git switch -c json-hisobot      # yangi tarmoq yaratib, unga o'tish
# ... ishlaysiz, commit qilasiz ...
git switch main                 # asosiy tarmoqqa qaytish
git merge json-hisobot          # tajribani birlashtirish
git branch -d json-hisobot      # keraksiz tarmoqni o'chirish
```

Asosiy tarmoq odatda `main` (eski loyihalarda `master`) deb ataladi.

Ikki tarmoqda **bir xil qator** har xil o'zgartirilgan bo'lsa, Git o'zi tanlay olmaydi — bu **conflict** (ziddiyat). U faylda ikkala variantni belgilab qo'yadi; siz to'g'risini qoldirib, belgilarni o'chirasiz va commit qilasiz. Qo'rqinchli ko'rinadi, lekin bu oddiy ish holati.

## GitHub bilan ishlash

Lokal repozitoriy — faqat sizning kompyuteringizda. Uni GitHub'ga joylash:

```bash
# GitHub saytida bo'sh repozitoriy yaratasiz, keyin:
git remote add origin https://github.com/foydalanuvchi/vositalarim.git
git push -u origin main
```

Keyingi safarlar — shunchaki:

```bash
git push                        # o'zgarishlarimni yuborish
git pull                        # boshqalarning o'zgarishlarini olish
```

Mavjud loyihani olish:

```bash
git clone https://github.com/foydalanuvchi/loyiha.git
```

`git clone` — xavfsizlik vositalarini o'rnatishning eng keng tarqalgan usuli: ularning aksariyati GitHub'da yashaydi.

:::warn
`git clone` qilib, ichidagi skriptni ishga tushirish — **notanish odam yozgan kodni kompyuteringizda bajarish**. Linux va Python darslaridagi qoida o'zgarmaydi: avval kodni ko'rib chiqing (endi buni qila olasiz), muallif va loyiha tarixiga qarang, va notanish narsani virtual mashinada ishga tushiring. "Exploit" yoki "xakerlik vositasi" nomi ostida tarqatiladigan zararli repozitoriylar — aynan o'rganuvchilarni nishonga oladi.
:::

## .gitignore

Hamma narsa repozitoriyga kirishi kerak emas. `.gitignore` fayli Git'ga nimalarni **e'tiborsiz qoldirishni** aytadi:

```
# Sirlar
.env
*.key
*.pem
kalitlar.json

# Vaqtinchalik va hosil qilinadigan fayllar
__pycache__/
.venv/
*.log
hisobot.json
```

Bu faylni loyihaning **birinchi kunida** yarating — sirlar repozitoriyga tushishidan oldin.

## Git va xavfsizlik: sirlar

Endi eng muhim qism. Git'ning asosiy xususiyati — **u hech narsani unutmaydi**. Xavfsizlikda bu ikki tomonlama.

### Muammo

Dasturchi API kalitini kodga yozib, commit qildi. Keyin xatosini tushunib, kalitni fayldan o'chirdi va yana commit qildi. Fayl endi toza. Lekin:

```bash
git log -p          # tarixda kalit hali ham turibdi
```

Kalit **birinchi commit'da abadiy saqlangan**. Faylni tahrirlash uni tarixdan olib tashlamaydi. Repozitoriy ochiq bo'lsa — kalitni har kim o'qiy oladi; avtomatik skanerlar GitHub'ga tushgan kalitlarni daqiqalar ichida topadi.

:::key
Repozitoriyga tushgan sir — **oshkor bo'lgan sir**. Yagona to'g'ri javob: uni **darhol bekor qilish va yangisini yaratish** (rotate). Tarixni tozalash — ikkinchi darajali ish: kimdir allaqachon nusxa olgan bo'lishi mumkin.
:::

### Oldini olish

1. **Sirlarni kodga yozmang** — muhit o'zgaruvchilari yoki `.env` fayl (Python darsi).
2. **`.gitignore`** ga `.env` va kalit fayllarini birinchi kundan qo'shing.
3. **Commit'dan oldin `git diff --staged`** ni ko'zdan kechiring — aynan nima ketayotganini ko'ring.
4. **`git add .` dan ehtiyot bo'ling** — u hamma narsani oladi. Aniq fayl nomlarini yozish xavfsizroq.
5. **Skanerlar:** `gitleaks`, `trufflehog` — repozitoriy tarixidan sirlarni qidiradi. GitHub'ning o'zida ham "secret scanning" bor.

### Tekshiruvchi nuqtai nazaridan

Xuddi shu xususiyat tufayli Git — audit va razvedkaning boy manbai. O'z tashkilotingiz repozitoriylarini tekshirganda:

```bash
git log --oneline | grep -iE "parol|password|secret|key|token"
git log -p | grep -iE "password\s*=|api_key|secret"
gitleaks detect
```

"Parolni olib tashlash" degan commit izohi — o'sha parol oldingi commit'da turganining aniq belgisi.

Yana bir keng tarqalgan xato: veb-serverga loyiha `.git` katalogi bilan birga joylanadi. `https://sayt.uz/.git/` ochiq bo'lsa, butun manba kodi va tarixini tiklash mumkin. O'z saytingizda buni tekshiring.

## Git — sizning portfolio

Bu dasturning oxirida ish qidirasiz. Ish beruvchi "men Python bilaman" degan gapga emas, **GitHub profilingizga** qaraydi.

Hozirdan boshlab:

- Yozgan har bir vositangizni repozitoriyga joylang.
- Har biriga `README.md` yozing: nima qiladi, qanday ishlatiladi, misol.
- Yechgan CTF va mashinalaringiz uchun writeup yozing.
- Muntazam commit qiling — faollik tarixi sizning mehnatingizni ko'rsatadi.

Ikki yil davomida to'ldirilgan profil — har qanday sertifikatdan kuchliroq dalil.

:::try
1. Git'ni o'rnating va `user.name`, `user.email` ni sozlang.
2. `vositalarim` papkasini yarating, `git init` qiling va oldingi darslarda yozgan skriptlaringizni qo'shing. Har birini alohida, tushunarli izoh bilan commit qiling.
3. `.gitignore` yarating: `.venv/`, `__pycache__/`, `*.json`, `.env`.
4. Tajriba: `sinov` degan tarmoq oching, biror skriptni o'zgartiring, commit qiling, `main` ga qayting va fayl eski holatida ekanini ko'ring. Keyin `merge` qiling.
5. Ataylab xato qiling (faqat mashq uchun, soxta qiymat bilan): faylga `PAROL = "soxta-parol-123"` yozib commit qiling, keyin o'chirib yana commit qiling. `git log -p` bilan "o'chirilgan" parol tarixda turganini o'z ko'zingiz bilan ko'ring.
6. GitHub'da akkaunt oching, bo'sh repozitoriy yarating va `git push` qiling. `learngitbranching.js.org` dagi interaktiv mashqlarni boshlang.
:::

## Xulosa

- **Git** — versiyalarni boshqarish vositasi; **GitHub** — repozitoriylarni saqlash xizmati.
- Sikl: `git status` → `git add` → `git commit -m "..."`.
- `git log`, `git diff`, `git show` — tarix va o'zgarishlar.
- **Branch** — xavfsiz tajriba; `git switch -c`, `git merge`.
- `git push` / `git pull` / `git clone` — masofadagi repozitoriy bilan ishlash.
- **`.gitignore`** — sirlar va vaqtinchalik fayllar repoga kirmasin.
- Git **hech narsani unutmaydi**: commit qilingan sir — oshkor bo'lgan sir; uni almashtirish kerak.
- Clone qilingan notanish kodni avval o'qing.
- GitHub profilingiz — portfoliongiz.

:::quiz
? Git va GitHub orasidagi farq nima?
- Ular bir xil narsa
+ Git — versiyalarni boshqarish dasturi; GitHub — Git repozitoriylarini internetda saqlash xizmati
- GitHub — Git'ning yangi versiyasi
- Git faqat GitHub bilan ishlaydi
! Git lokal ishlaydi va internetga muhtoj emas. GitHub (GitLab, Bitbucket kabi) — repozitoriylarni saqlash va ulashish xizmati.

? O'zgarishlarni tarixga saqlashning to'g'ri ketma-ketligi qaysi?
- git commit → git add
+ git add → git commit
- git push → git add
- git init → git push
! Avval fayllar sahnaga (staging) qo'yiladi — git add, keyin ular commit qilinadi.

? `git status` nima ko'rsatadi?
- Loyihaning to'liq tarixini
+ Hozirgi holatni: qaysi fayllar o'zgargan, qaysilari sahnada
- GitHub'dagi yulduzchalar sonini
- Internet tezligini
! git status — eng ko'p ishlatiladigan buyruq: nima o'zgargani va keyingi qadam nima ekanini aytadi.

? Dasturchi API kalitini commit qildi, keyin fayldan o'chirib, yana commit qildi. Kalit xavfsizmi?
- Ha, u o'chirilgan
+ Yo'q — kalit oldingi commit'da, tarixda saqlanib qolgan; uni bekor qilib, yangisini yaratish kerak
- Ha, agar repozitoriy nomi o'zgartirilsa
- Yo'q, lekin bir haftadan keyin o'zi o'chadi
! Git tarixi o'zgarishlarni saqlab qoladi. Oshkor bo'lgan sirni darhol almashtirish — yagona ishonchli chora.

? `.gitignore` fayli nima uchun kerak?
- Commit izohlarini saqlash uchun
+ Git kuzatmasligi kerak bo'lgan fayllarni (sirlar, vaqtinchalik fayllar) ko'rsatish uchun
- Repozitoriyni shifrlash uchun
- Tarmoqlarni birlashtirish uchun
! .gitignore dagi namunalarga mos fayllar git add bilan qo'shilmaydi — sirlar tasodifan repoga tushmaydi.

? Branch (tarmoq) nima uchun ishlatiladi?
- Kodni tezlashtirish uchun
+ Asosiy kodga tegmasdan yangi narsa ustida ishlash va tajriba qilish uchun
- Fayllarni o'chirish uchun
- Parol saqlash uchun
! Tarmoq — mustaqil ish chizig'i. Natija yaxshi bo'lsa birlashtiriladi, bo'lmasa — o'chiriladi.

? GitHub'dan notanish vositani `git clone` qildingiz. Ishga tushirishdan oldin nima qilish to'g'ri?
- Darhol sudo bilan ishga tushirish
+ Kodni ko'rib chiqish, muallif va loyiha tarixiga qarash, virtual mashinada sinash
- Antivirusni o'chirish
- Hech narsa — GitHub'dagi hamma kod xavfsiz
! Clone qilingan kodni bajarish — begona kodni ishga tushirish. GitHub kodni tekshirmaydi.

? Commit'dan oldin aynan nima ketayotganini qaysi buyruq ko'rsatadi?
- git log
+ git diff --staged
- git clone
- git branch
! git diff --staged sahnadagi o'zgarishlarni ko'rsatadi — sir yoki keraksiz fayl ketayotganini shu yerda payqaysiz.

? Commit izohi sifatida qaysi biri eng yaxshi?
- fix
- o'zgarishlar
+ Bo'sh qatorlarda dastur qulashini tuzatish
- asdf123
! Yaxshi izoh nima qilinganini aniq aytadi — keyinchalik tarixni o'qish va xatoni topishni osonlashtiradi.

? Veb-serverda `/.git/` katalogi ochiq qolgan. Bu nega muammo?
- Sayt sekinlashadi
+ Undan loyihaning butun manba kodi va tarixini tiklash mumkin
- Git ishlamay qoladi
- Hech qanday muammo emas
! .git katalogida butun tarix saqlanadi — jumladan qachondir commit qilingan sirlar ham.

? Nega xavfsizlik mutaxassisiga GitHub profili muhim?
+ U amaliy ko'nikmalarning ko'rinadigan dalili — portfolio
- Usiz kompyuter ishlamaydi
- U sertifikat o'rnini qonuniy bosadi
- GitHub maosh to'laydi
! Ish beruvchi yozilgan vositalar, writeup'lar va muntazam faollikni ko'radi — bu “bilaman” degan gapdan kuchliroq.
:::

:::cards
Git va GitHub farqi? :: Git — versiyalarni boshqarish dasturi (lokal). GitHub — repozitoriylarni internetda saqlash xizmati.
Kundalik Git sikli? :: git status → git add fayl → git commit -m "izoh"
Commit nima? :: Loyihaning ma'lum paytdagi surati: o'zgarishlar, muallif, vaqt va izoh; noyob xesh bilan.
Tarix va o'zgarishlarni ko'rish? :: git log --oneline; git diff (saqlanmagan), git diff --staged (sahnadagi), git show <xesh>.
Yangi tarmoq yaratish va birlashtirish? :: git switch -c nom … git switch main; git merge nom
Masofadagi repozitoriy bilan ishlash? :: git clone URL (olish), git push (yuborish), git pull (yangilash).
.gitignore nima uchun? :: Git kuzatmaydigan fayllar ro'yxati: sirlar (.env, kalitlar), vaqtinchalik fayllar.
Sir commit qilinib qolsa nima qilinadi? :: Darhol bekor qilib, yangisini yaratish (rotate). Fayldan o'chirish yetarli emas — u tarixda qoladi.
Repozitoriydan sirlarni qidiruvchi vositalar? :: gitleaks, trufflehog; GitHub secret scanning.
Yaxshi commit izohi qanday? :: Nima qilingani qisqa va aniq; bitta commit — bitta mantiqiy o'zgarish.
:::
