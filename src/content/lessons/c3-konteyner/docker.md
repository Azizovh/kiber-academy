Dasturchi aytadi: "Mening kompyuterimda ishlayapti." Server ma'muri javob beradi: "Serverda ishlamayapti." Sabab — dasturchida Python 3.12, serverda 3.10; dasturchida kutubxonaning bitta versiyasi, serverda boshqasi; dasturchi bir yil oldin o'rnatgan va unutgan tizim paketi serverda yo'q.

c1 bosqichida Qaydnoma'ni serverga qo'lda joyladingiz: Python, virtual muhit, gunicorn, systemd fayli, nginx. Endi tasavvur qiling: o'nta serverda, uchta muhitda (dev, test, prod), har hafta yangi versiya bilan. Har bir qo'lda qadam — farq va xato manbai.

**Konteyner** bu muammoni hal qiladi: ilova o'zi kerak bo'lgan hamma narsa (runtime, kutubxonalar, sozlamalar) bilan bitta paketga joylanadi va bu paket istalgan joyda bir xil ishlaydi. AppSec tarmog'idagi konteyner darsida (a4) Qaydnoma uchun xavfsiz Dockerfile yozdingiz va Trivy bilan skanerladingiz. Bu dars — infratuzilma muhandisi uchun [[docker|Docker]]'ning to'liq rasmi: image, konteyner, tarmoq, volume va ko'p xizmatli muhit. Keyingi darsda — ularning xavfsizligi.

## Konteyner va virtual mashina

```
     VIRTUAL MASHINALAR                         KONTEYNERLAR
 ┌────────┐ ┌────────┐ ┌────────┐        ┌────────┐ ┌────────┐ ┌────────┐
 │ Ilova A│ │ Ilova B│ │ Ilova C│        │ Ilova A│ │ Ilova B│ │ Ilova C│
 │ libs   │ │ libs   │ │ libs   │        │ libs   │ │ libs   │ │ libs   │
 │ Mehmon │ │ Mehmon │ │ Mehmon │        └────────┘ └────────┘ └────────┘
 │  OS    │ │  OS    │ │  OS    │        ┌──────────────────────────────┐
 └────────┘ └────────┘ └────────┘        │ Konteyner runtime (Docker)   │
 ┌──────────────────────────────┐        ├──────────────────────────────┤
 │ Gipervizor                   │        │ Xost OS — BITTA umumiy yadro │
 ├──────────────────────────────┤        ├──────────────────────────────┤
 │ Uskuna                       │        │ Uskuna                       │
 └──────────────────────────────┘        └──────────────────────────────┘
```

| | Virtual mashina | [[container|Konteyner]] |
|---|---|---|
| Nimani ajratadi | Butun kompyuterni (o'z yadrosi bilan) | Jarayonlarni — umumiy yadro ustida |
| Hajmi | Gigabaytlar | O'nlab–yuzlab megabayt |
| Ishga tushish | Daqiqalar | Soniyalar |
| Izolyatsiya | Kuchli — gipervizor chegarasi | Kuchsizroq — **yadro umumiy** |

Oxirgi qator xavfsizlik uchun eng muhimi: konteyner — alohida kompyuter emas, xostdagi **cheklangan jarayon**. Linux bosqichidan (s3) jarayonlar haqida bilganingiz shu yerda ishlaydi: konteyner ichidagi `python` — xostning `ps` ro'yxatida ko'rinadigan oddiy jarayon, faqat unga boshqacha "ko'rinish" berilgan. Bu ko'rinish Linux yadrosining ikki mexanizmi bilan yaratiladi:

| Mexanizm | Nima qiladi |
|---|---|
| **Namespaces** | Jarayonga o'zining "dunyosi"ni ko'rsatadi: o'z jarayonlar ro'yxati (PID), tarmoq interfeyslari (NET), fayl tizimi (MNT), host nomi (UTS), foydalanuvchilar (USER) |
| **cgroups** | Resurslarni cheklaydi: CPU, xotira, jarayonlar soni |

Keyingi darsda bu chegaralar qanday mustahkamlanishi va qanday zaiflashtirilishi mumkinligini ko'ramiz.

## Image va konteyner

| Tushuncha | Analogiya | Ma'nosi |
|---|---|---|
| **Image** | Dastur o'rnatuvchisi, shablon | Faqat o'qiladigan qatlamlar to'plami: OS fayllari, runtime, kod |
| **Konteyner** | Ishlab turgan dastur | Image'dan yaratilgan jarayon + ustiga yoziladigan qatlam |
| **Registry** | Ilovalar do'koni | Image'lar saqlanadigan joy: Docker Hub, AWS ECR, GitHub Container Registry |
| **Tag** | Versiya nomi | `python:3.12-slim` — o'zgarishi mumkin |
| **Digest** | Barmoq izi | `sha256:...` — image mazmunining xeshi, o'zgarmaydi |

Tag va digest farqi a4 darsidan tanish: `python:3.12-slim` tegi ertaga boshqa image'ga ishora qilishi mumkin; digest esa aniq bitta image. Ishlab chiqarishda digest bilan qotirish — takrorlanuvchanlik va ta'minot zanjiri xavfsizligi.

**Qatlamlar.** Dockerfile'dagi har bir buyruq yangi qatlam yaratadi:

```
 ┌──────────────────────────────┐  ← konteyner qatlami (yoziladigan, vaqtinchalik)
 ├──────────────────────────────┤
 │ COPY . /app                  │  ← sizning kodingiz
 ├──────────────────────────────┤
 │ RUN pip install -r req.txt   │  ← kutubxonalar
 ├──────────────────────────────┤
 │ python:3.12-slim qatlamlari  │  ← asos image
 └──────────────────────────────┘
```

Qatlamlar keshlanadi va image'lar orasida bo'linadi — shuning uchun tez. Lekin a4'dan eslang: biror qatlamda qo'shilgan fayl keyingi qatlamda o'chirilsa ham, u **image ichida qoladi**. Sir bir marta qatlamga tushsa — u yerda abadiy.

## Asosiy buyruqlar

```bash
docker pull python:3.12-slim              # image yuklab olish
docker images                             # lokal image'lar

docker run --rm -it python:3.12-slim bash # vaqtinchalik konteyner, ichida shell
docker run -d --name web -p 127.0.0.1:8080:80 nginx:1.27   # fonda, port bilan

docker ps                                 # ishlayotgan konteynerlar
docker logs -f web                        # jurnal (stdout/stderr)
docker exec -it web sh                    # ishlab turgan konteyner ichiga kirish
docker inspect web                        # to'liq konfiguratsiya (JSON)
docker stop web && docker rm web          # to'xtatish va o'chirish

docker build -t qaydnoma:1.4.0 .          # Dockerfile'dan image yasash
```

Konteyner **vaqtinchalik** bo'lishi kerak: uni istalgan payt o'chirib, image'dan yangisini ko'tarish mumkin. Saqlanishi kerak bo'lgan ma'lumot (baza fayllari, yuklangan fayllar) konteyner ichida emas — volume'da.

## Qaydnoma uchun Dockerfile

a4 darsidagi xavfsiz Dockerfile — qisqacha eslatma:

```dockerfile
FROM python:3.12-slim@sha256:<digest> AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim@sha256:<digest>
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /install /usr/local
COPY --chown=app:app . .
USER app
EXPOSE 8000
CMD ["gunicorn", "-w", "3", "-b", "0.0.0.0:8000", "app:app"]
```

Ikki bosqichli (multi-stage) build: birinchi bosqichda kutubxonalar o'rnatiladi, yakuniy image'ga faqat natija ko'chiriladi. `USER app` — root emas. `.dockerignore` fayli `.git`, `.env`, `secrets/` kabilarni build kontekstidan chiqarib tashlaydi.

E'tibor bering: konteyner ichida gunicorn `0.0.0.0:8000` da tinglaydi — bu konteynerning **o'z** tarmoq interfeysi. Tashqaridan ochilishi `-p` bilan belgilanadi.

## Tarmoq

| Tarmoq turi | Ma'nosi |
|---|---|
| `bridge` (sukut) | Konteynerlar xostdagi virtual switch'ga ulanadi, o'zaro IP orqali gaplashadi |
| Foydalanuvchi yaratgan bridge | Xuddi shunday, lekin konteynerlar bir-birini **nom** bilan topadi (ichki DNS) va boshqa tarmoqlardan ajratilgan |
| `host` | Konteyner xostning tarmog'ini to'g'ridan-to'g'ri ishlatadi — izolyatsiya yo'q |
| `none` | Tarmoq yo'q |

Port nashr qilish:

```bash
docker run -p 8080:80 nginx        # xostning BARCHA interfeyslarida 8080 → konteyner 80
docker run -p 127.0.0.1:8080:80 nginx   # faqat lokal
```

:::warn
**Docker va ufw — klassik tuzoq.** Docker port nashr qilish uchun yadro filtr qoidalarini to'g'ridan-to'g'ri yozadi va bu qoidalar ufw qoidalaridan **oldin** tekshiriladi. Natija: `ufw deny 8080` qilgan bo'lsangiz ham, `-p 8080:80` bilan ishga tushirilgan konteyner internetga ochiq bo'ladi. c1 bosqichidagi firewall sizni himoya qilmaydi. Yechim: faqat kerakli portlarni nashr qiling, ichki xizmatlarni `127.0.0.1:` bilan bog'lang yoki umuman nashr qilmang (konteynerlar ichki tarmoq orqali gaplashadi) va bulut security group'iga tayaning.
:::

## Volume — saqlanadigan ma'lumot

| Tur | Misol | Qachon |
|---|---|---|
| **Named volume** | `-v dbdata:/var/lib/postgresql/data` | Baza fayllari — Docker boshqaradi |
| **Bind mount** | `-v /srv/qaydnoma/uploads:/app/uploads` | Xostdagi aniq papka |
| **tmpfs** | `--tmpfs /tmp` | Xotirada, vaqtinchalik |

Bind mount ehtiyotkorlik talab qiladi: konteynerga xostning qaysi papkasi ochilsa, konteyner ichidagi jarayon o'sha papkaga (ruxsatlar doirasida) yeta oladi. `-v /:/host` — butun xost fayl tizimi konteynerga. Bu haqda keyingi darsda.

## Docker Compose — ko'p xizmatli muhit

Qaydnoma uchta xizmatdan iborat: nginx, ilova, baza. Har birini `docker run` bilan qo'lda ko'tarish o'rniga — bitta fayl:

```yaml
# compose.yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: qaydnoma
      POSTGRES_USER: qaydnoma_app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes: [dbdata:/var/lib/postgresql/data]
    networks: [backend]

  app:
    build: .
    environment:
      DB_HOST: db
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    depends_on: [db]
    networks: [backend, frontend]

  nginx:
    image: nginx:1.27
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
    depends_on: [app]
    networks: [frontend]

networks:
  frontend:
  backend:
    internal: true        # bu tarmoqdan internetga chiqish yo'q

volumes:
  dbdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt   # .gitignore'da!
```

```bash
docker compose up -d       # hammasini ko'tarish
docker compose ps
docker compose logs -f app
docker compose down        # to'xtatish (volume'lar qoladi)
```

Bu faylda c1 bosqichining arxitekturasi kichik ko'rinishda takrorlanadi:

```
 internet ──80/443──▶ [nginx] ──frontend──▶ [app] ──backend (internal)──▶ [db]
                       faqat shu port                                      nashr qilinmagan
```

- Baza porti umuman nashr qilinmagan — faqat `backend` tarmog'idagi `app` unga yetadi.
- `backend` — `internal: true`: baza internetga chiqa olmaydi.
- Parol muhit o'zgaruvchisida emas, `secrets` orqali fayl sifatida (`/run/secrets/...`) beriladi — `docker inspect` va jarayon muhitida ko'rinmaydi. (Compose secrets — oddiy fayl ulash; haqiqiy sir ombori emas, lekin muhit o'zgaruvchisidan yaxshiroq.)
- `nginx.conf` faqat o'qish uchun (`:ro`).

## Registry va image hayot sikli

```
 Dockerfile ──build──▶ image ──scan (Trivy)──▶ push ──▶ registry (ECR) ──pull──▶ server / ECS / k8s
     Git                 CI                     CI         skanerlash,           faqat imzolangan
                                                           o'zgarmas teglar      va skanerlangan
```

AWS **ECR** (Elastic Container Registry) xususiyatlari:

- Xususiy repozitoriylar, IAM bilan kirish nazorati.
- Push paytida yoki doimiy zaiflik skanerlash.
- **Tag immutability** — bir marta yuklangan tegni (masalan, `1.4.0`) qayta yozib bo'lmaydi; kimdir `1.4.0` ostida boshqa image yuklay olmaydi.
- Lifecycle siyosatlari — eski image'larni avtomatik tozalash.

Konteynerni bulutda ishga tushirish variantlari: EC2 ustida o'zingiz Docker, **ECS** (AWS'ning konteyner orkestratori, Fargate bilan serversiz), **EKS** (Kubernetes — keyingi darslar).

## Docker nimani qilmaydi

- Konteyner — xavfsizlik chegarasi emas, **qadoqlash** vositasi. Izolyatsiya bor, lekin u virtual mashinadan kuchsizroq va noto'g'ri sozlash bilan oson zaiflashadi (keyingi dars).
- Image ichidagi eski kutubxonalarni o'zi yangilamaydi — image qayta yig'ilishi kerak. Konteyner "o'rnatilgan va unutilgan" serverning yangi ko'rinishiga aylanishi mumkin.
- `docker compose` — bitta xost uchun. Ko'p server, avtomatik tiklanish va kengayish uchun orkestrator kerak (Kubernetes, ECS).

:::try
O'z kompyuteringizda (Docker Desktop yoki Linux VM'da Docker):

1. `docker run --rm -it alpine sh` ichida `ps aux` va `hostname` ni ishga tushiring. Boshqa terminalda xostda `ps aux | grep sh` — konteyner jarayoni xostdan ko'rinadimi?
2. `docker run -d -p 8080:80 nginx` va `docker run -d -p 127.0.0.1:8081:80 nginx`. Boshqa qurilmadan (o'z tarmog'ingizda) ikkala portga ulaning. Farq?
3. Yuqoridagi `compose.yaml` ni kichik Flask ilovasi bilan ishga tushiring. `docker compose exec app sh` ichidan `db` nomiga ulanish ishlaydimi? `nginx` konteyneri ichidan-chi?
4. `docker inspect <app-konteyner>` natijasida parol ko'rinadimi? Agar `POSTGRES_PASSWORD` muhit o'zgaruvchisi bilan bersangiz-chi?
5. `docker history <image>` bilan image qatlamlarini ko'ring. Qaysi qatlam eng katta?

**Javoblar:**
1. Ha. Konteyner ichida `ps` faqat bir-ikki jarayonni ko'rsatadi (PID namespace), xostda esa o'sha `sh` boshqa PID bilan oddiy jarayon sifatida ko'rinadi. Konteyner — cheklangan jarayon.
2. 8080 — tarmoqdan ochiladi (va ufw buni to'xtatmagan bo'lishi mumkin); 8081 — faqat xostning o'zidan.
3. `app` ichidan `db` nomi ichki DNS orqali topiladi. `nginx` faqat `frontend` tarmog'ida — u `db` ni ko'rmaydi. Bu Compose darajasidagi segmentatsiya.
4. `secrets` bilan — yo'q, faqat fayl yo'li. Muhit o'zgaruvchisi bilan — `Config.Env` ichida ochiq turadi; konteynerni inspect qila oladigan har kim ko'radi.
5. Odatda asos image va `pip install` qatlami. Kod qatlami kichik — shuning uchun u oxirida turadi va kesh tez ishlaydi.
:::

## Xulosa

- Konteyner ilovani uning muhiti bilan qadoqlaydi va hamma joyda bir xil ishlatadi.
- Konteyner — VM emas: xost yadrosi umumiy; izolyatsiya namespaces (ko'rinish) va cgroups (resurslar) bilan.
- Image — faqat o'qiladigan qatlamlar; konteyner — undan yaratilgan jarayon. Tag o'zgaradi, digest — yo'q. Qatlamga tushgan sir abadiy qoladi.
- Ichki xizmatlar portlarini nashr qilmang yoki `127.0.0.1:` ga bog'lang — Docker ufw'ni aylanib o'tadi.
- Saqlanadigan ma'lumot — volume'da; bind mount xost papkasini konteynerga ochadi.
- Compose: tarmoqlar bilan segmentatsiya (`internal: true`), sirlar fayl sifatida, faqat kerakli port nashr qilingan.
- Registry (ECR): xususiy, skanerlangan, o'zgarmas teglar bilan.
- Docker — qadoqlash vositasi, xavfsizlik chegarasi emas.

:::quiz
? Konteyner va virtual mashinaning xavfsizlik nuqtai nazaridan asosiy farqi nima?
+ Konteynerlar xost yadrosini bo'lishadi; VM esa o'z yadrosiga ega va gipervizor bilan ajratilgan
- Konteynerlar har doim xavfsizroq
- VM'lar internetga chiqa olmaydi
- Konteynerlarda tarmoq yo'q
! Umumiy yadro — konteyner izolyatsiyasining eng muhim xususiyati va cheklovi.

? Linux'ning qaysi mexanizmi konteynerga o'z jarayonlar ro'yxati va tarmoq interfeyslarini ko'rsatadi?
- cgroups
+ Namespaces
- systemd
- cron
! Namespaces ko'rinishni ajratadi; cgroups resurslarni cheklaydi.

? Image tegi va digest farqi nima?
- Farqi yo'q
+ Teg (masalan, `3.12-slim`) boshqa image'ga ko'chishi mumkin; digest image mazmunining o'zgarmas xeshi
- Digest faqat Windows uchun
- Teg xavfsizroq
! Digest bilan qotirish aniq bitta image ishlatilishini kafolatlaydi.

? Dockerfile'ning bir qatlamida qo'shilgan sir fayli keyingi qatlamda o'chirildi. Image xavfsizmi?
- Ha, fayl o'chirildi
+ Yo'q, fayl oldingi qatlamda qoladi va image'dan chiqarib olinishi mumkin
- Faqat image push qilinmasa
- Ha, agar multi-stage bo'lmasa
! Qatlamlar faqat qo'shiladi; o'chirish yangi qatlamda "yashiradi", xolos.

? Serverda `ufw deny 8080` bor, lekin konteyner `-p 8080:80` bilan ishga tushirildi. Port tashqaridan ochiqmi?
- Yo'q, ufw bloklaydi
+ Ko'pincha ha — Docker o'z filtr qoidalarini ufw qoidalaridan oldin yozadi
- Faqat IPv6'da
- Docker portlarni hech qachon ochmaydi
! Ichki xizmatlarni 127.0.0.1 ga bog'lang yoki umuman nashr qilmang.

? Compose'da `backend` tarmog'iga `internal: true` qo'yildi. Natija?
- Tarmoq butunlay ishlamaydi
+ Bu tarmoqdagi konteynerlar o'zaro gaplashadi, lekin internetga chiqa olmaydi
- Barcha portlar nashr qilinadi
- Baza parolsiz ishlaydi
! Internal tarmoq — bazani internetdan ham, internetga chiqishdan ham ajratadi.

? Nega baza parolini `environment` o'rniga `secrets` orqali bergan ma'qul?
- Secrets shifrlash algoritmi kuchliroq
+ Muhit o'zgaruvchisi `docker inspect` va jarayon muhitida ochiq ko'rinadi; secret esa fayl sifatida ulanadi
- Environment ishlamaydi
- Secrets avtomatik almashtiriladi
! Compose secrets haqiqiy sir ombori emas, lekin muhit o'zgaruvchisidan kamroq oshkor qiladi.

? ECR'dagi tag immutability nima beradi?
- Image'larni shifrlaydi
+ Bir marta yuklangan tegni qayta yozib, uning ostiga boshqa image qo'yib bo'lmaydi
- Image'larni avtomatik o'chiradi
- Image'larni ommaviy qiladi
! Kimdir `1.4.0` ostida o'zgartirilgan image yuklashining oldi olinadi.

? Docker Compose qachon yetarli emas?
- Bitta kompyuterda dasturchi muhiti uchun
+ Ko'p serverda avtomatik tiklanish va kengayish kerak bo'lganda — orkestrator (Kubernetes, ECS) kerak
- Ikkita konteyner bo'lganda
- Tarmoq kerak bo'lganda
! Compose bitta xost uchun mo'ljallangan.

? Konteyner ichidagi jarayon xost tomonidan ko'rinadimi?
+ Ha, u xostdagi oddiy (cheklangan) jarayon sifatida `ps` da ko'rinadi
- Yo'q, konteyner butunlay alohida kompyuter
- Faqat Windows'da
- Faqat root bo'lmasa
! Konteyner — namespace va cgroups bilan cheklangan jarayon.
:::

:::cards
Konteyner :: Xost yadrosini bo'lishadigan, namespaces va cgroups bilan cheklangan jarayon
Image :: Faqat o'qiladigan qatlamlardan iborat konteyner shabloni
Digest :: Image mazmunining sha256 xeshi — o'zgarmas identifikator
Namespaces :: Jarayonga o'z PID, tarmoq, fayl tizimi ko'rinishini beradigan yadro mexanizmi
cgroups :: CPU, xotira, jarayonlar sonini cheklaydigan yadro mexanizmi
Multi-stage build :: Yig'ish va yakuniy image'ni ajratib, kichik va toza image olish
-p 127.0.0.1:8080:80 :: Portni faqat xostning o'zidan ochiq qilib nashr qilish
Docker va ufw :: Docker filtr qoidalari ufw'dan oldin ishlaydi — nashr qilingan port ochiq qolishi mumkin
Named volume :: Docker boshqaradigan, konteyner o'chsa ham qoladigan saqlash
internal: true :: Compose tarmog'idan internetga chiqishni yopadi
ECR :: AWS'ning xususiy konteyner registry'si: IAM, skanerlash, o'zgarmas teglar
:::
