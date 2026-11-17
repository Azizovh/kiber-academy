Qaydnoma endi konteynerda ishlaydi. Dasturchi birinchi Dockerfile'ni internetdagi namunadan nusxaladi:

```dockerfile
FROM python:latest
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
ENV QAYDNOMA_SECRET_KEY=dev-secret-123
CMD ["flask", "--app", "qaydnoma", "run", "--host", "0.0.0.0", "--debug"]
```

Olti qator — va kamida yettita muammo. Image ichida: `.git` papkasi va `.env` fayli (`COPY .` hammasini ko'chirdi), kodga yozilgan sir, debug rejimi, root foydalanuvchi, va bir gigabaytga yaqin keraksiz dasturlar — har biri potentsial zaiflik bilan. `latest` esa — ertaga boshqa narsa bo'ladi.

Konteynerlar ilovani joylashni osonlashtirdi. Lekin ular bilan birga yangi qatlam keldi: **image'ning o'zi** ham kod, va u ham ko'rib chiqilishi va skanerlanishi kerak. Bu darsda — xavfsiz Dockerfile, image skanerlash va IaC (infratuzilma kodi) skanerlash. Cloud tarmog'ida konteyner xavfsizligi chuqurroq o'rganiladi; bu yerda — AppSec muhandisi va dasturchi bilishi shart bo'lgan qism.

## Konteyner qisqacha

[[docker|Docker]] **image** — ilova va uning barcha bog'liqliklari (operatsion tizim kutubxonalari, Python, paketlar) bitta paketda. **Konteyner** — image'dan ishga tushirilgan jarayon, operatsion tizim yadrosi bilan izolyatsiyalangan ([[container|konteyner]] — kompyuter bosqichidagi virtualizatsiya darsi).

Muhim: konteyner — **virtual mashina emas**. U xost bilan bitta yadroni baham ko'radi. Izolyatsiya kuchli, lekin mutlaq emas — shuning uchun konteyner ichida ham eng kam huquq tamoyili muhim.

## Xavfsiz Dockerfile

Qaydnoma uchun to'g'ri yozilgan Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

# ---- 1-bosqich: bog'liqliklarni yig'ish ----
FROM python:3.12-slim@sha256:<digest> AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --require-hashes --prefix=/install -r requirements.txt

# ---- 2-bosqich: ishlab chiqarish image'i ----
FROM python:3.12-slim@sha256:<digest>
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /install /usr/local
COPY qaydnoma/ ./qaydnoma/
USER app
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "qaydnoma:create_app()"]
```

Va `.dockerignore` — `COPY` ga nima tushmasligi kerakligi:

```
.git
.env
.venv
__pycache__
*.db
tests/
.github/
```

Har bir qaror:

| Qaror | Nimadan himoya qiladi |
|---|---|
| **Aniq versiya va digest** (`3.12-slim@sha256:...`), `latest` emas | Har safar bir xil image; base image almashtirilsa — sezilmasligi (a3 bosqichidagi qotirish va xeshlar) |
| **`slim`** (yoki distroless) base image | Kamroq dasturlar — kamroq zaiflik va kamroq hujumchi vositalari |
| **Ko'p bosqichli** (multi-stage) build | Kompilyatorlar va build vositalari yakuniy image'ga tushmaydi |
| **`--require-hashes`** | Bog'liqliklar yaxlitligi (a3) |
| **`.dockerignore`** + aniq `COPY` | `.git`, `.env`, testlar, lokal baza image'ga tushmaydi (a2 bosqichidagi konfiguratsiya darsidagi `.git` muammosi) |
| **`USER app`** — root emas | Ilova buzilsa ham, hujumchi konteyner ichida root bo'lmaydi |
| **Sir yo'q** — `ENV` da ham, `COPY` da ham | Image qatlamlari saqlanadi va har kim `docker history` / image'ni ochib ko'ra oladi |
| **Gunicorn**, debug yo'q | a2 bosqichidagi konfiguratsiya darsi |

### Sirlar va image qatlamlari

Image qatlamlardan iborat, va har bir qatlam **abadiy saqlanadi**. Keyingi qatorda faylni o'chirish — uni oldingi qatlamdan olib tashlamaydi:

```dockerfile
# ❌ .netrc keyingi qatorda o'chirilsa ham, birinchi qatlamda qoladi
COPY .netrc /root/.netrc
RUN pip install -r requirements.txt && rm /root/.netrc
```

Build paytida sir kerak bo'lsa (masalan, xususiy paketlar registry'si) — BuildKit'ning **secret mount**'i: sir faqat shu `RUN` vaqtida mavjud, qatlamga yozilmaydi:

```dockerfile
RUN --mount=type=secret,id=netrc,target=/root/.netrc \
    pip install --no-cache-dir -r requirements.txt
```

```bash
docker build --secret id=netrc,src=$HOME/.netrc -t qaydnoma .
```

Ish vaqtidagi sirlar (`QAYDNOMA_SECRET_KEY`) esa image'da emas — **ishga tushirishda** muhit yoki platforma sirlari orqali beriladi (a3 bosqichidagi sirlarni boshqarish).

### Xavfsiz ishga tushirish

Dockerfile — yarim ish. Konteynerni qanday ishga tushirish ham muhim:

```bash
docker run -d --name qaydnoma \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -p 127.0.0.1:8000:8000 \
  --env-file /etc/qaydnoma/prod.env \
  qaydnoma@sha256:<digest>
```

| Parametr | Nima qiladi |
|---|---|
| `--read-only` (+ `--tmpfs /tmp`) | Konteyner fayl tizimiga yozib bo'lmaydi — hujumchi fayl joylay olmaydi (vaqtinchalik fayllar uchun faqat `/tmp`) |
| `--cap-drop ALL` | Linux imtiyozlari (capabilities) olib tashlanadi — ilovaga ular kerak emas |
| `no-new-privileges` | Jarayon ishlash paytida qo'shimcha huquq ololmaydi (Linux bosqichidagi SUID'ni eslang) |
| `-p 127.0.0.1:8000:8000` | Port faqat lokal — tashqaridan reverse proxy orqali (a2 bosqichi) |
| `--env-file` | Sirlar image'dan tashqarida |
| `@sha256:<digest>` | Aynan tekshirilgan image ishga tushadi (CI/CD darsidagi artefakt yaxlitligi) |

Va hech qachon:
- **`--privileged`** — konteynerga xostning deyarli barcha imkoniyatlarini beradi; izolyatsiya amalda yo'qoladi.
- **`/var/run/docker.sock` ni konteynerga ulash** — bu konteynerga xostdagi Docker'ni boshqarish huquqi, ya'ni amalda xostda root huquqi.

## Image skanerlash: Trivy

Image'da sizning kodingiz emas, base image'dagi va bog'liqliklardagi yuzlab paketlar bor. Ularning har birida ma'lum zaiflik bo'lishi mumkin — bu a3 bosqichidagi SCA'ning konteyner versiyasi.

**Trivy** — keng tarqalgan bepul skaner: image'lar, fayl tizimi, Git omborlari, IaC fayllari, SBOM.

```bash
# Image'ni skanerlash — OS paketlari va til paketlari zaifliklari
trivy image qaydnoma:latest

# Faqat yuqori va kritik, tuzatishi mavjudlarini
trivy image --severity HIGH,CRITICAL --ignore-unfixed qaydnoma:latest

# CI uchun: topilma bo'lsa — nol bo'lmagan chiqish kodi
trivy image --severity CRITICAL --exit-code 1 qaydnoma:latest

# Dockerfile va boshqa konfiguratsiyalarni noto'g'ri sozlamalarga tekshirish
trivy config .

# SBOM yaratish (a3)
trivy image --format cyclonedx -o sbom.json qaydnoma:latest
```

Image skanerlash natijalarini saralash — a3 bosqichidagi SCA ustuvorlik qoidalari bilan: tuzatish mavjudmi? zaif paket ilovada ishlatiladimi? Eng samarali birinchi qadam ko'pincha oddiy: **kichikroq va yangiroq base image**. `python:latest` dan `python:3.12-slim` ga o'tish zaifliklar sonini bir necha baravar kamaytirishi mumkin — ko'pchiligi umuman kerak bo'lmagan paketlarda edi.

**Dockerfile linter** — `hadolint` — Dockerfile'dagi xatolarni (masalan, `latest`, `USER` yo'qligi) kod ko'rib chiqishdek ko'rsatadi:

```bash
docker run --rm -i hadolint/hadolint < Dockerfile
```

## IaC skanerlash

Zamonaviy infratuzilma ham **kod**: [[iac|IaC]] (Infrastructure as Code) — serverlar, tarmoqlar, bulut resurslari Terraform, Kubernetes manifestlari, CloudFormation kabi fayllarda tasvirlanadi. a2 bosqichidagi konfiguratsiya darsining asosiy xulosasi — "konfiguratsiya — kodning bir qismi" — aynan shu.

IaC'ning xavfsizlik afzalligi: konfiguratsiya xatolarini **joylashdan oldin**, kodda, PR'da topish mumkin. Masalan, Terraform'da:

```hcl
# ❌ Ommaviy o'qishga ochiq saqlash ombori
resource "aws_s3_bucket_acl" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  acl    = "public-read"
}

# ❌ Ma'lumotlar bazasi porti butun internetga ochiq
resource "aws_security_group_rule" "db" {
  type        = "ingress"
  from_port   = 5432
  to_port     = 5432
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = aws_security_group.db.id
}
```

Bu xatolar b4 bosqichidagi bulut loglari darsida "shubhali hodisalar" sifatida ko'rgan narsalarimiz — ochiq omborlar, butun internetga ochiq portlar. IaC skaneri ularni **hodisa sodir bo'lishidan oldin** ushlaydi.

| Vosita | Nimani skanerlaydi |
|---|---|
| **Checkov** | Terraform, CloudFormation, Kubernetes, Dockerfile, Helm va boshqalar |
| **Trivy config** | Xuddi shunday keng qamrov |
| **tfsec** (endi Trivy tarkibida), **KICS**, **Terrascan** | IaC uchun muqobillar |
| **kube-score**, **Kubesec** | Kubernetes manifestlari |

```bash
pip install checkov
checkov -d infra/                      # Terraform papkasi
checkov -f Dockerfile                  # Dockerfile
checkov -d infra/ --compact --quiet    # faqat muvaffaqiyatsiz tekshiruvlar, qisqa
```

Kubernetes manifestlarida qidiriladigan narsalar — `docker run` parametrlarining ekvivalentlari: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `capabilities: drop: ["ALL"]`, `privileged: false`, resurs chegaralari (limits).

## Konveyerga qo'shish

CI/CD darsidagi workflow'ga ikkita job qo'shiladi:

```yaml
  container:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<commit-SHA>
      - name: Dockerfile lint
        run: docker run --rm -i hadolint/hadolint < Dockerfile
      - name: Build
        run: docker build -t qaydnoma:${{ github.sha }} .
      - name: Image skanerlash
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:<versiya> \
            image --severity CRITICAL --ignore-unfixed --exit-code 1 qaydnoma:${{ github.sha }}

  iac:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<commit-SHA>
      - name: IaC skanerlash
        run: |
          pip install checkov
          checkov -d infra/ --compact
```

(Bu yerda Trivy konteyneri image'ni o'qish uchun CI runner'ining Docker soketiga ulanadi — bu bir martalik, vaqtinchalik CI muhitida qabul qilinadi; ishlab chiqarish konteynerlariga esa soket hech qachon ulanmaydi. Trivy'ning rasmiy GitHub action'i ham bor.)

:::key
**Konteyner image va infratuzilma fayllari — bu ham kod, va ular ham xuddi ilova kodi kabi ko'rib chiqiladi, skanerlanadi va qotiriladi.** Xavfsiz konteynerning formulasi qisqa: **kichik, qotirilgan base image; ko'p bosqichli build; `.dockerignore`; root emas; image'da sir yo'q; read-only, imtiyozlarsiz ishga tushirish; `--privileged` va Docker soketi — hech qachon.** Va IaC skaneri b4 bosqichida loglardan **keyin** topgan bulut xatolarini (ochiq omborlar, ochiq portlar) **joylashdan oldin**, PR'da ushlaydi.
:::

## Bu dars nimani bermaydi

- **Kubernetes xavfsizligini batafsil** — tarmoq siyosatlari, RBAC, pod xavfsizlik standartlari — Cloud tarmog'idagi konteyner bosqichida.
- **Ish vaqti konteyner xavfsizligini** (masalan, Falco bilan anomaliyalarni aniqlash) — Cloud tarmog'i.
- **Terraform'ni o'rganishni** — Cloud tarmog'i.

:::try
**1. Yomon Dockerfile tahlili.** Dars boshidagi 6 qatorli Dockerfile'dagi barcha muammolarni sanang va har birining tuzatishini yozing.

**2. Qaydnoma image'i.** Yuqoridagi xavfsiz Dockerfile va `.dockerignore` bilan Qaydnoma image'ini yarating. `docker run ... --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges` bilan ishga tushiring — ilova ishlayaptimi? Konteyner ichida `whoami` qanday natija beradi (`docker exec qaydnoma whoami`)?

**3. Trivy taqqoslash.** `python:latest` asosidagi va `python:3.12-slim` asosidagi ikki image'ni `trivy image` bilan skanerlang. Zaifliklar soni qanchalik farq qiladi?

**4. Image'dagi sir.** Ataylab `ENV TEST_SECRET=abc` qatorli image yarating va `docker history --no-trunc` hamda `docker inspect` bilan sirni toping. Keyin bu qatorni olib tashlang.

**5. Checkov.** Darsdagi ikkita zaif Terraform blokini `infra/main.tf` fayliga yozing (faqat skanerlash uchun — `terraform apply` qilmang!) va `checkov -d infra/` bilan skanerlang. Qaysi tekshiruvlar muvaffaqiyatsiz bo'ldi?

**6. CI.** `container` va `iac` job'larini Qaydnoma konveyeriga qo'shing.

*Yo'nalish (1): `latest` (qotirilmagan), to'liq (katta) image, `COPY .` (`.git`, `.env`, testlar), `.dockerignore` yo'q, kodga yozilgan sir `ENV` da, Flask debug serveri va `--debug`, root foydalanuvchi, `--require-hashes` yo'q. 2 — `whoami` `app` qaytarishi kerak, `root` emas.*
:::

## Xulosa

- Konteyner image — ilova + bog'liqliklar + OS kutubxonalari; konteyner — VM emas, yadro umumiy.
- Xavfsiz Dockerfile: **qotirilgan (digest) slim/distroless base**, **ko'p bosqichli build**, **`--require-hashes`**, **`.dockerignore`** va aniq `COPY`, **`USER`** (root emas), **image'da sir yo'q**, gunicorn.
- Image qatlamlari abadiy — build sirlari uchun **BuildKit secret mount**; ish vaqti sirlari — ishga tushirishda.
- Ishga tushirish: **`--read-only`**, **`--cap-drop ALL`**, **`no-new-privileges`**, lokal port, digest; **`--privileged` va Docker soketi — hech qachon**.
- **Trivy** — image, fayl tizimi, konfiguratsiya, SBOM; **hadolint** — Dockerfile linter; eng tez yutuq — kichikroq base image.
- **IaC skanerlash** (Checkov, Trivy config) — bulut konfiguratsiya xatolarini **joylashdan oldin** ushlaydi.
- Hammasi — CI konveyerida.

:::quiz
? Nega FROM python:latest yomon tanlov?
+ latest har safar boshqa image bo'lishi mumkin va u to'liq (katta) image — ko'p keraksiz paketlar va zaifliklar bilan
- latest image mavjud emas
- latest faqat Windows uchun
- latest eng xavfsiz tanlov
! Aniq versiya va digest bilan qotirilgan slim image ishlatiladi.

? .dockerignore fayli nima uchun kerak?
+ COPY buyrug'i bilan .git, .env, testlar va lokal baza kabi fayllar image'ga tushmasligi uchun
- Image'ni tezroq ishga tushirish uchun
- Docker'ni o'rnatish uchun
- Portlarni ochish uchun
! COPY . — hamma narsani, sirlarni ham, ko'chiradi.

? Dockerfile'da keyingi qatorda o'chirilgan sir fayli nega baribir xavfli?
+ Image qatlamlari abadiy saqlanadi — sir oldingi qatlamda qoladi va uni ochib ko'rish mumkin
- O'chirilgan fayl qayta tiklanadi
- Docker o'chirishni qo'llamaydi
- Xavfli emas
! Build sirlari uchun BuildKit secret mount ishlatiladi.

? Ko'p bosqichli (multi-stage) build qanday xavfsizlik foydasini beradi?
+ Kompilyatorlar va build vositalari yakuniy ishlab chiqarish image'iga tushmaydi — hujum yuzasi kichrayadi
- Image'ni shifrlaydi
- Konteynerni tezlashtiradi
- Sirlarni avtomatik saqlaydi
! Yakuniy image faqat ishlash uchun kerakli narsalarni o'z ichiga oladi.

? Nega konteyner ichida ilova root emas, oddiy foydalanuvchi nomidan ishlashi kerak?
+ Ilova buzilsa ham, hujumchi konteyner ichida root huquqiga ega bo'lmaydi — zarar cheklanadi
- Root foydalanuvchi mavjud emas
- Bu faqat tezlik uchun
- Docker root'ni taqiqlaydi
! Eng kam huquq tamoyili konteynerda ham amal qiladi.

? Qaysi konteyner ishga tushirish sozlamalari HECH QACHON ishlatilmasligi kerak?
+ --privileged
+ /var/run/docker.sock ni ishlab chiqarish konteyneriga ulash
- --read-only
- --cap-drop ALL
! Ikkalasi ham amalda xostga to'liq huquq beradi.

? trivy image --severity CRITICAL --exit-code 1 buyrug'i CI'da nima uchun foydali?
+ Kritik zaiflik topilsa, nol bo'lmagan kod bilan tugaydi va konveyer qizil bo'ladi
- Image'ni tuzatadi
- Image'ni o'chiradi
- Faqat ogohlantirish yozadi, konveyerni to'xtatmaydi
! Konveyer zaif image'ning joylanishini to'xtatadi.

? Image'dagi zaifliklarni kamaytirishning ko'pincha eng tez usuli qaysi?
+ Kichikroq va yangiroq base image'ga (masalan, slim yoki distroless) o'tish
- Barcha zaifliklarni qo'lda tuzatish
- Trivy'ni o'chirish
- Image'ni kattaroq qilish
! Ko'p zaifliklar umuman kerak bo'lmagan paketlarda bo'ladi.

? IaC skanerlashning asosiy afzalligi nima?
+ Bulut konfiguratsiya xatolarini (ochiq omborlar, ochiq portlar) joylashdan oldin, kodda topish
- Bulut xarajatlarini kamaytirish
- Terraform'ni tezlashtirish
- Loglarni o'chirish
! Hodisa sodir bo'lishidan oldin ushlash — loglarda keyin topishdan ancha arzon.

? Kubernetes manifestida qaysi sozlamalar xavfsizlikni oshiradi?
+ runAsNonRoot: true va readOnlyRootFilesystem: true
+ allowPrivilegeEscalation: false va capabilities drop ALL
- privileged: true
- hostNetwork: true
! Bular docker run'dagi xavfsiz parametrlarning ekvivalentlari.
:::

:::cards
Konteyner va VM farqi? :: Konteyner xost yadrosini baham ko'radi — izolyatsiya kuchli, lekin mutlaq emas.
Xavfsiz Dockerfile qoidalari? :: Qotirilgan slim base (digest), multi-stage, --require-hashes, .dockerignore, aniq COPY, USER (root emas), sir yo'q, gunicorn.
.dockerignore'da nima bo'ladi? :: .git, .env, .venv, __pycache__, *.db, tests/, .github/.
Image qatlamlari va sirlar? :: Qatlamlar abadiy — keyin o'chirish yordam bermaydi; build sirlari uchun RUN --mount=type=secret.
Xavfsiz docker run parametrlari? :: --read-only (+ --tmpfs /tmp), --cap-drop ALL, --security-opt no-new-privileges, lokal port, --env-file, digest.
Hech qachon? :: --privileged va /var/run/docker.sock ni ishlab chiqarish konteyneriga ulash.
Trivy? :: Image, fayl tizimi, konfiguratsiya (trivy config) skaneri va SBOM generatori.
hadolint? :: Dockerfile linter — latest, USER yo'qligi kabi xatolarni ko'rsatadi.
IaC? :: Infratuzilma kod sifatida (Terraform, Kubernetes, CloudFormation) — konfiguratsiya xatolarini PR'da topish imkoni.
IaC skanerlari? :: Checkov, Trivy config, KICS, Terrascan; Kubernetes uchun kube-score, Kubesec.
Kubernetes xavfsiz sozlamalari? :: runAsNonRoot, readOnlyRootFilesystem, allowPrivilegeEscalation: false, capabilities drop ALL, privileged: false, resurs limitlari.
Konteyner xavfsizligi formulasi? :: Kichik qotirilgan image, multi-stage, root emas, sirsiz, read-only va imtiyozsiz ishga tushirish, skanerlash CI'da.
:::
