Kompaniyaning CI serverida dasturchilar Docker bilan ishlashi kerak edi. Har safar `sudo` so'ramaslik uchun ma'mur ularni `docker` guruhiga qo'shdi — "ular faqat konteyner ishga tushiradi-ku". Bir yil o'tib, xavfsizlik auditida auditor stajyor hisobidan bitta buyruq ishga tushiradi va bir necha soniyada xostning `/etc/shadow` faylini o'qiydi. Hech qanday zaiflik ishlatilmadi. Faqat Docker'ning **hujjatlashtirilgan** xatti-harakati: `docker` guruhi a'zosi xostning istalgan papkasini root huquqi bilan konteynerga ulay oladi.

Docker hujjatlarining o'zi ochiq yozadi: `docker` guruhi root bilan teng huquq beradi. Ko'pchilik buni o'qimaydi.

Oldingi darsda konteyner — xavfsizlik chegarasi emas, qadoqlash vositasi ekanini aytdik. Bu darsda konteyner izolyatsiyasi qanday mustahkamlanishini, qaysi sozlamalar uni butunlay yo'q qilishini va konteynerlarni ishlab turganida qanday kuzatishni o'rganamiz. a4 bosqichidagi xavfsiz Dockerfile va Trivy — bu yerda boshlang'ich nuqta.

## Tahdid modeli: konteyner hayot sikli

a3 bosqichidagi tahdid modellashtirishni konteynerlarga qo'llaymiz:

| Bosqich | Nima noto'g'ri ketishi mumkin | Himoya |
|---|---|---|
| **Image** | Zaif kutubxonalar, zararli asos image, ichida sirlar | Minimal asos, skanerlash, digest, SBOM (a4) |
| **Registry** | Image almashtirilishi, ommaviy repozitoriy | Xususiy registry, o'zgarmas teglar, **imzolash** |
| **Daemon va xost** | Daemon'ga kirish = xost root'i | `docker` guruhi nazorati, socket himoyasi, rootless |
| **Runtime** | Ortiqcha imtiyozlar, xavfli mount'lar, konteynerdan chiqish | Capabilities, seccomp, read-only, privileged taqiqi |
| **Kuzatuv** | Buzilgan konteyner ko'rinmaydi | Runtime detection (Falco), jurnallar |

Image qatlami a4 darsida batafsil ko'rildi. Bu dars qolgan to'rt qatlamga e'tibor beradi.

## Image imzolash

Skanerlangan image registry'ga yuklandi. Server uni yuklab olayotganda — bu **o'sha** image ekanini qanday bilamiz? Registry buzilgan bo'lsa yoki kimdir teg ostiga boshqa image qo'ygan bo'lsa-chi?

Javob — kriptografik imzo (s5 bosqichidagi raqamli imzolar). **Sigstore cosign** — ochiq manbali vosita:

```bash
# CI'da: image'ni imzolash (kalitsiz rejim — CI'ning OIDC identifikatsiyasi bilan)
cosign sign <registry>/qaydnoma@sha256:<digest>

# Joylashdan oldin: imzoni tekshirish — kim imzolagan va qaysi konveyerdan
cosign verify <registry>/qaydnoma@sha256:<digest> \
  --certificate-identity-regexp 'https://github.com/<org>/qaydnoma/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Imzolash o'zi himoya qilmaydi — **tekshirish majburiy** bo'lgandagina. Kubernetes'da buni admission controller bajaradi (Kubernetes xavfsizligi darsi): imzosiz yoki notanish konveyerdan kelgan image ishga tushmaydi.

## Docker daemon — xostning kaliti

Docker arxitekturasi: siz `docker` CLI bilan buyruq berasiz, uni **daemon** (`dockerd`) bajaradi. Daemon sukut bo'yicha **root** sifatida ishlaydi va CLI bilan Unix socket orqali gaplashadi: `/var/run/docker.sock`.

```
 docker CLI ──▶ /var/run/docker.sock ──▶ dockerd (root) ──▶ konteynerlar
   (siz)          socket'ga yoza oladigan        xostda hamma narsaga qodir
                  har kim = daemon'ni boshqaradi
```

Bundan uchta muhim xulosa:

| Holat | Nega xavfli | Himoya |
|---|---|---|
| Foydalanuvchi `docker` guruhida | Istalgan konteynerni istalgan mount bilan ishga tushira oladi — amalda root | Guruhni faqat ma'murlarga; CI uchun — alohida, izolyatsiya qilingan runner'lar |
| Konteynerga `docker.sock` ulangan (`-v /var/run/docker.sock:/var/run/docker.sock`) | Konteyner ichidagi jarayon daemon'ni boshqaradi → xostni boshqaradi | Iloji boricha qilmang; kerak bo'lsa — faqat ishonchli, minimal vosita, yoki socket proksi bilan cheklangan API |
| Daemon TCP portda (2375) TLS'siz ochiq | Internetdan istalgan kishi xostingizda root sifatida konteyner ko'taradi | Hech qachon; masofaviy boshqaruv kerak bo'lsa — SSH orqali yoki o'zaro TLS |

Uchinchi qator — nazariya emas: internetda ochiq Docker API'larni avtomatik skanerlab, ularga kriptomayner konteynerlari joylaydigan botnetlar yillardan beri ishlaydi. c1 bosqichidagi "server birinchi daqiqadan hujum ostida" — shu yerda ham.

**Rootless rejim.** Docker (va Podman) daemon'ni oddiy foydalanuvchi sifatida ishga tushirish rejimini qo'llab-quvvatlaydi. Shunda konteynerdan chiqib ketish muvaffaqiyatli bo'lsa ham, hujumchi xostda root emas, oddiy foydalanuvchi bo'ladi. Ba'zi imkoniyatlar cheklanadi, lekin ko'p holatlar uchun yetarli.

## Runtime: konteynerni toraytirish

Linux'da root huquqi yaxlit emas — u ~40 ta **capability** (alohida imtiyoz)ga bo'lingan: tarmoqni sozlash (`NET_ADMIN`), yadro modulini yuklash (`SYS_MODULE`), keng tizim boshqaruvi (`SYS_ADMIN`) va hokazo. Docker konteynerga sukut bo'yicha ularning **kichik qismini** beradi (masalan, `CHOWN`, `NET_BIND_SERVICE`, `SETUID`), xavflilarini esa olib tashlaydi. Bundan tashqari, sukut **seccomp** profili yuzlab tizim chaqiruvlaridan xavfli bir necha o'nlabini bloklaydi va AppArmor (yoki SELinux) qo'shimcha cheklov qo'yadi.

Sukut — yaxshi boshlanish. Uni yanada toraytirish mumkin:

| Sozlama | Nima qiladi |
|---|---|
| `--user 10001:10001` (yoki Dockerfile'da `USER`) | Konteyner ichida root emas |
| `--cap-drop ALL --cap-add NET_BIND_SERVICE` | Barcha capability'larni olib, faqat keraklisini qaytarish |
| `--security-opt no-new-privileges` | Jarayon setuid fayllar orqali imtiyoz oshira olmaydi (c1 bosqichidagi systemd `NoNewPrivileges` kabi) |
| `--read-only` (+ `--tmpfs /tmp`) | Konteyner fayl tizimi faqat o'qish uchun — hujumchi vosita yozib qoldira olmaydi |
| `--memory 512m --cpus 1 --pids-limit 200` | Resurs cheklovlari — kriptomayning va "fork bomb"ga qarshi |
| Sukut seccomp va AppArmor | O'chirmang (`unconfined` qilmang) |
| User namespace remapping | Konteyner ichidagi root xostda imtiyozsiz UID'ga moslanadi |

Qaydnoma uchun hammasi birga:

```bash
docker run -d --name qaydnoma \
  --user 10001:10001 \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --memory 512m --cpus 1 --pids-limit 200 \
  -p 127.0.0.1:8000:8000 \
  <registry>/qaydnoma@sha256:<digest>
```

Gunicorn 8000 portda tinglaydi (1024 dan katta) — shuning uchun `NET_BIND_SERVICE` ham kerak emas.

## Privileged konteyner — izolyatsiyasiz konteyner

`--privileged` flagi Docker'dagi eng xavfli sozlama. U nima qiladi:

| Oddiy konteyner | `--privileged` |
|---|---|
| Cheklangan capability'lar | **Barcha** capability'lar |
| Xost qurilmalari ko'rinmaydi | Xostning **barcha qurilmalari** (`/dev` — disklar ham) |
| Seccomp va AppArmor faol | O'chirilgan |
| `/proc`, `/sys` ning xavfli qismlari faqat o'qish uchun | Yozish mumkin |

Amalda bu — xost yadrosiga deyarli to'liq kirish. Privileged konteyner ichida root bo'lgan jarayon xostda ham root bo'lishi uchun ko'p narsa kerak emas: bu "konteynerdan chiqish" emas, chunki chiqadigan devor deyarli yo'q.

**Xavfni o'z lab'ingizda namoyish qilish** — chiqib ketmasdan, faqat farqni ko'rsatib:

```bash
# Oddiy konteyner
docker run --rm alpine sh -c 'grep Cap /proc/self/status; ls /dev | wc -l; grep Seccomp: /proc/self/status'

# Privileged konteyner
docker run --rm --privileged alpine sh -c 'grep Cap /proc/self/status; ls /dev | wc -l; grep Seccomp: /proc/self/status'
```

Natijani solishtiring:

| Ko'rsatkich | Oddiy | Privileged |
|---|---|---|
| `CapEff` (samarali capability'lar maskasi) | Kichik qiymat — bir necha bit | Barcha bitlar yoqilgan |
| `/dev` dagi qurilmalar soni | Bir necha o'nta | Ancha ko'p — xost disklari ham |
| `Seccomp` | `2` (filtr faol) | `0` (o'chirilgan) |

(`capsh --decode=<qiymat>` buyrug'i `CapEff` maskasini capability nomlari ro'yxatiga aylantiradi.) Bu jadval — auditda privileged konteyner nima uchun "kritik" ekanini tushuntirish uchun yetarli dalil.

Privileged ba'zan haqiqatan kerak bo'ladi (masalan, past darajadagi tizim agentlari). Lekin ilova konteyneri uchun — **hech qachon**. Ko'pincha kerakli bitta capability yoki bitta qurilma bilan almashtirish mumkin.

Topish:

```bash
# Ishlab turgan privileged konteynerlar
docker ps -q | xargs docker inspect --format '{{.Name}} privileged={{.HostConfig.Privileged}}'

# Xavfli mount'lar
docker ps -q | xargs docker inspect --format '{{.Name}} {{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}'
```

## Xavfli mount va namespace'lar

| Sozlama | Nega xavfli |
|---|---|
| `-v /var/run/docker.sock:...` | Daemon ustidan to'liq nazorat |
| `-v /:/host` | Butun xost fayl tizimi |
| `-v /etc:...`, `-v /root:...` | Parollar, SSH kalitlari, tizim sozlamalari |
| `--pid=host` | Xostning barcha jarayonlari ko'rinadi va (imtiyoz bilan) ularga ta'sir qilish mumkin |
| `--network=host` | Tarmoq izolyatsiyasi yo'q; xostning lokal xizmatlariga (`127.0.0.1`) yetadi |
| `--ipc=host` | Xostning umumiy xotira segmentlari |

c1 bosqichidagi qoida bu yerda ham amal qiladi: `127.0.0.1` da tinglayotgan baza tashqaridan yopiq — lekin `--network=host` bilan ishga tushirilgan **har qanday** konteyner unga yeta oladi.

## Konteynerdan chiqish va xost

Konteyner yadroni xost bilan bo'lishadi. Demak, **yadro zaifligi** — barcha konteynerlar uchun umumiy xavf: konteyner ichidan ishlatilgan yadro xatosi izolyatsiyani buzishi mumkin. Tarixda runtime (runc) va yadroda bunday zaifliklar bir necha marta topilgan.

Himoya:

- **Xost yadrosi va runtime'ni yangilash** — c1 bosqichidagi qoida, endi barcha konteynerlar uchun.
- **Minimal xost OS** — faqat konteyner ishlatish uchun yaratilgan tizimlar (masalan, Bottlerocket, Flatcar): kam paket, faqat o'qiladigan tizim qismi.
- **Kuchliroq izolyatsiya** kerak bo'lganda — har bir konteyner uchun alohida yengil virtual mashina yoki foydalanuvchi maydonidagi yadro (gVisor, Kata Containers, Firecracker). AWS Fargate va Lambda shunday mikro-VM'larda ishlaydi — bir mijozning konteyneri boshqasinikidan yadro darajasida ajratilgan.
- **Ishonch darajasi har xil** ish yuklarini bitta xostda aralashtirmaslik.

## Tekshiruv: CIS Docker Benchmark

c1 va c2 bosqichlaridagi kabi — tayyor ro'yxat bor. **CIS Docker Benchmark** xost, daemon sozlamalari, fayl ruxsatlari, image'lar va runtime'ni qamraydi. Avtomatik tekshiruv — **Docker Bench for Security** skripti:

```bash
# Rasmiy repozitoriydan, xostda (o'z lab serveringizda)
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security && sudo sh docker-bench-security.sh
```

Natija `[PASS]`, `[WARN]`, `[INFO]` qatorlari bilan. `[WARN]` lar — c2 bosqichidagi CSPM kabi saralanadi: kontekst, risk, ildiz sabab.

## Runtime detection: ishlab turgan konteynerni kuzatish

Skanerlash — joylashdan oldin. Lekin konteyner ishlab turganida buzilsa-chi? Konteyner odatda juda **bashorat qilinadigan** xatti-harakatga ega: bitta jarayon, ma'lum fayllar, ma'lum tarmoq ulanishlari. Undan chetga chiqish — kuchli signal.

**Falco** — ochiq manbali runtime xavfsizlik vositasi: yadro hodisalarini (tizim chaqiruvlari) kuzatib, qoidalar bilan solishtiradi:

```
Warning A shell was spawned in a container with an attached terminal
  (user=root container_name=qaydnoma image=<registry>/qaydnoma
   shell=sh parent=gunicorn cmdline=sh -i)
```

| Qoida g'oyasi | Nega shubhali |
|---|---|
| Konteyner ichida shell ishga tushdi | Web ilova konteynerida odatda shell kerak emas — ehtimol kod bajarish zaifligi |
| `/etc/shadow` yoki sir fayllari o'qildi | Ma'lumot yig'ish |
| Paket menejeri (`apt`, `apk`) ishga tushdi | O'zgarmas bo'lishi kerak bo'lgan konteynerga vosita o'rnatish |
| Kutilmagan tashqi ulanish | C2 yoki kriptomayning havzasi |
| Read-only konteynerda yozish urinishi | Sozlama ishlayapti — va kimdir uni sinamoqda |

Bu b1 bosqichidagi Sysmon va EDR g'oyasining konteyner ko'rinishi. Falco hodisalari SIEM'ga yuboriladi (b2).

## Konteyner xavfsizligi nimani qilmaydi

- Ilovadagi zaiflikni yopmaydi — u faqat zaiflik ishlatilganda zararni cheklaydi (read-only, root emas, capability'siz konteynerda hujumchi juda kam narsa qila oladi).
- Sukut sozlamalar yaxshi, lekin bitta `--privileged` yoki `docker.sock` mount ularning hammasini bekor qiladi.
- Imzolash tekshirilmasa — hech narsa bermaydi.
- Konteyner izolyatsiyasi VM izolyatsiyasiga teng emas; turli ishonch darajasidagi mijozlarni bitta yadroda ishlatish uchun qo'shimcha izolyatsiya qatlami kerak.

:::try
O'z lab muhitingizda (Linux VM yoki Docker Desktop):

1. Yuqoridagi oddiy va privileged konteyner taqqoslash buyruqlarini ishga tushiring va natija jadvalini to'ldiring.
2. Qaydnoma (yoki istalgan oddiy web ilova) konteynerini avval hech qanday flagsiz, keyin hardening flaglari bilan ishga tushiring. Ilova ishlayveradimi? Ishlamasa — qaysi flag sabab?
3. Read-only konteyner ichida `touch /app/test` bajarib ko'ring. Natija?
4. Docker Bench for Security'ni lab xostingizda ishga tushiring va eng muhim 3 ta `[WARN]` ni tanlang.
5. Savol: monitoring vositasi "barcha konteynerlarni ko'rishi uchun" `docker.sock` ulangan holda ishga tushirilgan. Vositaning web interfeysida autentifikatsiya zaif. Qanday risk bor?

**Javoblar:**
1. Oddiyda `CapEff` kichik (masalan, `00000000a80425fb` kabi), privileged'da barcha bitlar yoqilgan; `/dev` qurilmalari bir necha baravar ko'p; `Seccomp: 2` va `Seccomp: 0`.
2. Ko'p uchraydigan muammo: `--read-only` bilan ilova vaqtinchalik fayl yozolmaydi — `--tmpfs /tmp` yoki aniq volume qo'shiladi. Python ilovalari ba'zan `__pycache__` yozishga urinadi — `PYTHONDONTWRITEBYTECODE=1`.
3. `Read-only file system` xatosi. Hujumchi ham fayl qoldira olmaydi.
4. Lab xostida odatda: alohida audit qoidalari yo'q, `userns-remap` yoqilmagan, konteynerlarda xotira cheklovi yo'q, `no-new-privileges` daemon darajasida o'rnatilmagan.
5. Vositaning web interfeysi buzilsa, hujumchi socket orqali daemon'ga buyruq beradi — xostda istalgan konteynerni istalgan mount bilan ko'taradi, ya'ni xostni to'liq egallaydi. Zaif web panel amalda xostning root paroliga aylanadi.
:::

## Xulosa

- Konteyner tahdid modeli: image → registry → daemon/xost → runtime → kuzatuv. Har bir qatlamning o'z himoyasi bor.
- Image imzolash (cosign) — faqat tekshirish majburiy bo'lsa foydali.
- `docker` guruhi va `docker.sock` — xost root'iga teng; TLS'siz TCP API — internetdan root. Rootless rejim zararni kamaytiradi.
- Runtime hardening: root emas, `--cap-drop ALL`, `no-new-privileges`, `--read-only`, resurs cheklovlari, sukut seccomp va AppArmor.
- `--privileged` — barcha capability'lar, xost qurilmalari, seccomp'siz: izolyatsiya deyarli yo'q. Ilova konteyneri uchun hech qachon.
- Xavfli mount'lar (`/`, `docker.sock`, `/etc`) va xost namespace'lari (`--pid`, `--network=host`) izolyatsiyani buzadi.
- Yadro umumiy: xostni yangilash, minimal xost OS, kerak bo'lsa mikro-VM izolyatsiyasi.
- CIS Docker Benchmark va Docker Bench — tekshiruv; Falco — ishlab turgan konteynerdagi g'ayrioddiy xatti-harakatni aniqlash.

:::quiz
? Foydalanuvchini `docker` guruhiga qo'shish nimani anglatadi?
- Faqat konteynerlarni ko'rish huquqini
+ Amalda xostda root bilan teng huquqni — u istalgan xost papkasini konteynerga ulay oladi
- Hech qanday maxsus huquqni
- Faqat image yuklab olish huquqini
! Docker hujjatlarining o'zi buni ogohlantiradi; guruh faqat ma'murlarga beriladi.

? Konteynerga `/var/run/docker.sock` ulanishi nega xavfli?
- Konteyner sekinlashadi
+ Konteyner ichidagi jarayon Docker daemon'ini, demak butun xostni boshqara oladi
- Socket faqat o'qish uchun
- Bu tarmoqni o'chiradi
! Daemon root sifatida ishlaydi; socket'ga yoza oladigan har kim uni boshqaradi.

? `--privileged` flagi nima qiladi?
- Konteynerni tezlashtiradi
+ Barcha capability'larni beradi, xost qurilmalarini ochadi va seccomp/AppArmor cheklovlarini o'chiradi
- Konteynerni faqat o'qish rejimiga o'tkazadi
- Konteynerga internetni o'chiradi
! Privileged konteyner xost yadrosiga deyarli to'liq kirishga ega.

? `--cap-drop ALL --cap-add NET_BIND_SERVICE` nima qiladi?
+ Barcha Linux capability'larini olib tashlab, faqat 1024 dan kichik portni ochish imkonini qaytaradi
- Barcha capability'larni beradi
- Tarmoqni o'chiradi
- Konteynerni root qiladi
! Eng kam imtiyoz capability darajasida.

? `--read-only` bilan ishga tushirilgan konteynerning xavfsizlik foydasi nima?
- Konteyner internetga chiqa olmaydi
+ Hujumchi konteyner fayl tizimiga vosita yoki o'zgartirish yozib qoldira olmaydi
- Image skanerlanadi
- Parollar shifrlanadi
! Vaqtinchalik yozish kerak bo'lgan joylar uchun tmpfs yoki aniq volume qo'shiladi.

? Docker daemon'ni 2375 portda TLS'siz ochish natijasi qanday?
- Faqat lokal tarmoq foydalanuvchilari ko'radi
+ Internetdan istalgan kishi xostingizda root huquqi bilan konteyner ko'tara oladi
- Daemon ishlamaydi
- Faqat o'qish uchun ochiladi
! Bunday ochiq API'lar avtomatik skanerlanib, kriptomayner joylash uchun ishlatiladi.

? Image imzolash (cosign) qachon haqiqiy himoya beradi?
- Imzo yaratilgan zahoti
+ Joylash paytida imzo va imzolovchi identifikatsiyasi majburiy tekshirilganda
- Faqat image ommaviy bo'lsa
- Hech qachon
! Tekshirilmaydigan imzo — bezak; Kubernetes'da admission controller tekshiradi.

? Nega konteyner xostining yadrosini yangilash barcha konteynerlar uchun muhim?
- Yadro konteynerlarni tezlashtiradi
+ Barcha konteynerlar bitta yadroni bo'lishadi; yadro zaifligi izolyatsiyani buzishi mumkin
- Yangilanmagan yadroda Docker ishlamaydi
- Bu faqat Windows uchun muhim
! Umumiy yadro — umumiy xavf.

? Falco qanday vosita?
- Image zaifliklarini skanerlaydi
- Terraform kodini tekshiradi
+ Ishlab turgan konteynerlardagi tizim chaqiruvlarini kuzatib, g'ayrioddiy xatti-harakat haqida ogohlantiradi
- Parollarni almashtiradi
! Falco — runtime detection: shell ishga tushishi, sir fayllarni o'qish, kutilmagan ulanishlar.

? `--network=host` bilan ishga tushirilgan konteyner haqida qaysi gap to'g'ri?
- U internetga chiqa olmaydi
+ U xostning tarmog'ini to'g'ridan-to'g'ri ishlatadi va xostda 127.0.0.1 da tinglayotgan xizmatlarga yeta oladi
- U faqat boshqa konteynerlarni ko'radi
- U xavfsizroq
! Tarmoq izolyatsiyasi yo'q; lokal-only xizmatlar himoyasi yo'qoladi.
:::

:::cards
docker guruhi :: Amalda xost root'iga teng huquq
docker.sock :: Docker daemon'ini boshqarish socket'i; ulangan konteyner xostni boshqaradi
Rootless Docker :: Daemon oddiy foydalanuvchi sifatida — konteynerdan chiqilsa ham root emas
Capability :: Root huquqining alohida bo'lagi (NET_ADMIN, SYS_ADMIN...)
--cap-drop ALL :: Barcha capability'larni olib tashlash; keraklisi alohida qaytariladi
no-new-privileges :: Jarayon setuid orqali imtiyoz oshira olmaydi
--read-only :: Konteyner fayl tizimi faqat o'qish uchun
--privileged :: Barcha capability'lar, xost qurilmalari, seccomp'siz — izolyatsiya deyarli yo'q
Seccomp :: Xavfli tizim chaqiruvlarini bloklaydigan yadro filtri
cosign :: Sigstore'ning image imzolash va tekshirish vositasi
Docker Bench for Security :: CIS Docker Benchmark bo'yicha avtomatik tekshiruv skripti
Falco :: Konteynerlar uchun runtime xavfsizlik va aniqlash vositasi
:::
