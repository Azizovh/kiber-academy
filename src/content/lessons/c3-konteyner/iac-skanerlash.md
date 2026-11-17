Juma kuni kechqurun dasturchi tezda pull request ochadi: "Test serveriga ulanib bo'lmayapti, SSH qoidasini qo'shdim." O'zgarish — Terraform kodida uch qator:

```hcl
cidr_blocks = ["0.0.0.0/0"]
from_port   = 22
to_port     = 22
```

Sharhlovchi charchagan, PR kichik, "test muhiti-ku" — tasdiqlaydi. Dushanba kuni c2 bosqichidagi CSPM vositasi topilma beradi: 22-port butun internetga ochiq. Uch kun davomida. Va ma'lum bo'ladiki, bu modul ishlab chiqarishda ham ishlatiladi.

Xato **kodda** edi — uni kodda ushlash mumkin edi, ishlab chiqarishga yetmasdan oldin. Bu "chapga siljitish" (shift left): tekshiruvni jarayonning boshiga, pull request bosqichiga ko'chirish. a4 bosqichida Trivy bilan IaC skanerlashni qisqacha ko'rdingiz. Bu dars — to'liq rasm: vositalar, natijalarni tahlil qilish, o'z qoidalaringizni yozish (policy as code) va hammasini CI konveyeriga ulash.

## Uch qatlamli tekshiruv

```
 Kod yozish          Pull request             Ishlab chiqarish
 ───────────         ────────────             ────────────────
 IDE plagini,        IaC skaner + plan        CSPM (Prowler, Security Hub),
 pre-commit          skaneri — PR'ni          drift aniqlash —
                     to'xtatadi               doimiy kuzatuv
   arzon ◀──────────────────────────────────────────▶ qimmat
```

Xato qancha erta topilsa, shuncha arzon: IDE'da — bir soniya, PR'da — bir daqiqa, ishlab chiqarishda — insident, tergov, ehtimol ma'lumot sizib chiqishi. Lekin keyingi qatlam oldingisini **almashtirmaydi**: konsoldagi qo'lda o'zgarishlarni (drift) faqat CSPM ko'radi.

## Vositalar

| Vosita | Nimani skanerlaydi | Xususiyati |
|---|---|---|
| **Checkov** | Terraform, CloudFormation, Kubernetes, Helm, Dockerfile, CI fayllari | Yuzlab tayyor qoida, Python yoki YAML'da o'z qoidalaringiz |
| **Trivy** (`trivy config`) | Terraform, Kubernetes, Dockerfile va boshqalar | Avvalgi **tfsec** shu yerga birlashtirilgan; image skaneri bilan bitta vosita |
| **KICS** | Ko'plab IaC formatlari | Ochiq manbali, ko'p qoida |
| **tflint** | Terraform | Xavfsizlikdan ko'ra sifat: xato tiplar, eskirgan sintaksis |
| **conftest** (OPA) | Istalgan JSON/YAML | Rego tilida o'z siyosatlaringiz |

Hammasining g'oyasi bir xil: kodni (yoki plan'ni) o'qib, ma'lum xavfli naqshlarni qidirish — c2 bosqichidagi CSPM qoidalari, faqat kod ustida.

## Checkov bilan ishlash

```bash
pip install checkov
checkov -d infra/                         # papkadagi barcha IaC fayllari
checkov -d infra/ --framework terraform   # faqat Terraform
checkov -d infra/ --compact --quiet       # faqat muvaffaqiyatsizlar, qisqa
```

Natija:

```
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	FAILED for resource: aws_security_group.test
	File: /network.tf:40-62

		45 |   ingress {
		46 |     from_port   = 22
		47 |     to_port     = 22
		48 |     protocol    = "tcp"
		49 |     cidr_blocks = ["0.0.0.0/0"]
		50 |   }

Check: CKV_AWS_79: "Ensure Instance Metadata Service Version 1 is not enabled"
	FAILED for resource: aws_instance.legacy
	File: /compute.tf:30-48
```

Har bir topilmada: qoida ID'si, tavsifi, resurs, fayl va qator. Bu — dars boshidagi PR'da sharhlovchidan oldin avtomatik ravishda qo'yilgan izoh bo'lardi.

Topilmalar c2 bosqichidagi tekshiruvlarga juda o'xshaydi — chunki ular **bir xil xatolar**, faqat boshqa bosqichda:

| Kodda (Checkov) | Ishlab chiqarishda (Prowler / Config) |
|---|---|
| SG 22-portni `0.0.0.0/0` ga ochadi | `restricted-ssh` NON_COMPLIANT |
| `aws_instance` da `http_tokens` `required` emas | IMDSv1 ruxsat etilgan serverlar |
| `aws_s3_bucket` uchun public access block yo'q | Ommaviy bucket |
| `root_block_device` shifrlanmagan | `encrypted-volumes` NON_COMPLIANT |
| CloudTrail'da log file validation yo'q | CIS Logging bo'limi |

## Kodmi yoki plan'mi

Kodni skanerlashning cheklovi bor: qiymatlar ko'pincha o'zgaruvchilardan yoki modullardan keladi.

```hcl
cidr_blocks = [var.ssh_cidr]    # xavflimi? var.ssh_cidr qiymatiga bog'liq
```

Kod skaneri buni bilmaydi. **Plan**'ni skanerlash esa barcha o'zgaruvchilar va modullar hal qilingan **yakuniy natijani** ko'radi:

```bash
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
checkov -f tfplan.json
```

Eng yaxshi amaliyot — ikkalasi: kod skaneri tez va IDE'da ishlaydi, plan skaneri aniqroq.

## Topilmalar bilan ishlash

Skaner hisobotiga c2 bosqichidagi CSPM saralash qoidalari qo'llanadi: kontekst, risk, ildiz sabab. Qo'shimcha IaC'ga xos amaliyotlar:

**Asoslangan istisno — kod ichida:**

```hcl
resource "aws_s3_bucket" "public_assets" {
  # checkov:skip=CKV_AWS_20:Faqat sayt logotiplari; maxfiy ma'lumot yo'q. Egasi: marketing. Qayta ko'rib chiqish: 2027-05
  bucket = "qaydnoma-public-assets"
}
```

Istisno kod bilan birga yashaydi, kod sharhidan o'tadi va Git tarixida kim qachon qo'shgani ko'rinadi. Sababsiz yoki "vaqtincha" istisnolar — c2 bosqichidagi "temp — Jasur uchun" qoidaning boshqa ko'rinishi.

**Eski kod uchun baseline.** Skanerni katta, eski loyihaga birinchi marta ulasangiz — 400 ta topilma va hech kim PR ocha olmaydi. Yechim — **baseline**: mavjud topilmalar ro'yxati saqlanadi, CI faqat **yangi** topilmalarda yiqiladi, eskilari esa reja bo'yicha tuzatiladi.

```bash
checkov -d infra/ --create-baseline        # .checkov.baseline fayli yaratiladi
checkov -d infra/ --baseline infra/.checkov.baseline
```

Shu tarzda "yomonlashmaslik" darhol ta'minlanadi, "yaxshilanish" esa bosqichma-bosqich.

## Policy as code: o'z qoidalaringiz

Tayyor qoidalar umumiy xatolarni ushlaydi. Lekin har bir tashkilotning o'z talablari bor: "har bir resursda `Owner` tegi bo'lsin", "faqat `eu-central-1` regioni", "RDS faqat Multi-AZ va deletion protection bilan", "server turlari ro'yxatdan". Bular — [[policy-as-code|policy as code]]: qoidalar kod sifatida yoziladi, versiyalanadi va avtomatik tekshiriladi.

Checkov'da YAML qoida:

```yaml
# policies/owner-tag.yaml
metadata:
  id: "CKV2_QAYDNOMA_1"
  name: "Har bir server va bucket'da Owner tegi bo'lsin"
  category: "GENERAL_SECURITY"
definition:
  cond_type: "attribute"
  resource_types:
    - "aws_instance"
    - "aws_s3_bucket"
  attribute: "tags.Owner"
  operator: "exists"
```

```bash
checkov -d infra/ --external-checks-dir policies/
```

(Provider darajasidagi `default_tags` bilan berilgan teglarni kod skaneri har doim ham ko'rmaydi — bunday qoidalarni plan ustida tekshirish aniqroq.)

OPA va **Rego** tili — kuchliroq va umumiyroq variant: bir xil siyosat tili Terraform plan'i, Kubernetes admission (Gatekeeper, Kubernetes xavfsizligi darsi) va boshqa JSON/YAML uchun ishlaydi:

```rego
package main

deny contains msg if {
  rc := input.resource_changes[_]
  rc.type == "aws_db_instance"
  not rc.change.after.deletion_protection
  msg := sprintf("%s: RDS deletion_protection yoqilishi shart", [rc.address])
}
```

```bash
conftest test tfplan.json
```

Policy as code'ning qiymati — qoidalar **hujjatda** emas, **avtomatik tekshiruvda** yashaydi. "Bizning standartimiz bo'yicha har bir baza..." degan 40 betlik PDF'ni hech kim o'qimaydi; PR'ni to'xtatgan qoidani hamma o'qiydi.

## CI'ga ulash

a4 bosqichidagi CI/CD xavfsizligi qoidalari bilan (eng kam huquqli token, qotirilgan action'lar, OIDC):

```yaml
# .github/workflows/infra.yml
name: infra
on:
  pull_request:
    paths: ["infra/**"]

permissions:
  contents: read
  id-token: write          # OIDC uchun
  pull-requests: write     # plan'ni izoh sifatida yozish uchun

jobs:
  check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@<40-belgili-commit-SHA>
      - uses: hashicorp/setup-terraform@<40-belgili-commit-SHA>

      - run: terraform fmt -check -recursive
      - run: terraform init -input=false
      - run: terraform validate

      - name: IaC skanerlash (kod)
        run: |
          pip install checkov
          checkov -d . --compact --quiet --baseline .checkov.baseline \
            --external-checks-dir ../policies

      - name: AWS'ga OIDC (faqat o'qish roli)
        uses: aws-actions/configure-aws-credentials@<40-belgili-commit-SHA>
        with:
          role-to-assume: arn:aws:iam::111122223333:role/qaydnoma-tf-plan
          aws-region: eu-central-1

      - name: Plan va plan skanerlash
        run: |
          terraform plan -input=false -out=tfplan
          terraform show -json tfplan > tfplan.json
          checkov -f tfplan.json --compact --quiet
```

Konveyerning har bir qadami bitta savolga javob beradi:

| Qadam | Savol |
|---|---|
| `fmt -check`, `validate` | Kod to'g'ri yozilganmi? |
| Checkov (kod) + o'z qoidalar | Ma'lum xavfli naqshlar va tashkilot qoidalari buzilmaganmi? |
| `plan` (o'qish roli bilan) | Aslida nima o'zgaradi? |
| Checkov (plan) | Yakuniy natija xavfsizmi? |
| Branch himoyasi (a4) | Bu tekshiruvlar o'tmasa, merge **imkonsiz** |

Apply — alohida workflow, faqat `main` dan, yozish huquqli rol bilan va environment tasdig'i bilan (oldingi dars).

:::key
Tekshiruv faqat **majburiy** bo'lgandagina ishlaydi. Skaner natijasi "ma'lumot uchun" ko'rsatilsa, juma kechqurun hech kim o'qimaydi. Branch himoyasida majburiy status check sifatida yoqilgan skaner esa dars boshidagi PR'ni sharhlovchi tasdiqlasa ham to'xtatadi.
:::

## Konveyerning o'zi — hujum nishoni

IaC konveyeri bulut hisobiga yozish huquqiga ega — demak, u qimmatli nishon. **OWASP Top 10 CI/CD Security Risks** (roadmap havolasi) bu xavflarni tizimlashtiradi; IaC uchun eng muhimlari:

| Xavf | IaC'da qanday ko'rinadi | Himoya |
|---|---|---|
| Yetarli bo'lmagan oqim nazorati | Kimdir sharhsiz to'g'ridan-to'g'ri `main` ga push qilib, apply'ni ishga tushiradi | Branch himoyasi, majburiy sharh, environment tasdig'i |
| Zaharlangan konveyer (poisoned pipeline execution) | PR'dagi o'zgartirilgan Terraform yoki skript yozish huquqli rol bilan ishlaydi | PR'lar faqat o'qish roli bilan; apply faqat `main` dan |
| Hisob ma'lumotlari gigiyenasining yo'qligi | CI sirlarida doimiy AWS kaliti | OIDC, qisqa muddatli rollar |
| Uchinchi tomon xizmatlari | Qotirilmagan action yoki modul | Commit SHA bilan qotirish, `.terraform.lock.hcl` |

Diqqat: `terraform plan` ham **kod bajarishi** mumkin (masalan, `external` data source yoki provider'lar orqali). Shuning uchun begona fork'lardan kelgan PR'lar uchun plan ham ehtiyotkorlik bilan, izolyatsiyalangan va minimal huquqli muhitda ishga tushiriladi.

## Kubernetes va Dockerfile ham

Xuddi shu vositalar konteyner darslaridagi fayllarni ham tekshiradi:

```bash
checkov -d k8s/ --framework kubernetes   # privileged, runAsNonRoot yo'q, resurs cheklovlari yo'q...
checkov -f Dockerfile                    # USER yo'q, latest tegi, HEALTHCHECK yo'q...
trivy config .                           # hammasi birga
```

Kubernetes xavfsizligi darsidagi `restricted` Pod Security talablari — manifest skanerida PR bosqichida, admission controller'da esa klasterda. Ikki qatlam: biri erta ogohlantiradi, ikkinchisi majburlaydi.

## IaC skanerlash nimani qilmaydi

- **Kontekstni bilmaydi**: `0.0.0.0/0` ALB uchun normal, baza uchun falokat — qoidalar buni har doim ham ajrata olmaydi. Soxta ijobiy natijalar bo'ladi.
- Konsolda qilingan o'zgarishlarni ko'rmaydi — CSPM va drift aniqlash kerak.
- Ma'lum naqshlarni qidiradi; qoidasi yo'q xatoni topmaydi.
- Niyatni tekshirmaydi: skanerdan o'tgan kod ham noto'g'ri arxitektura bo'lishi mumkin (masalan, bazani noto'g'ri subnetga qo'yish). Kod sharhi va tahdid modeli (a3) o'rnini bosmaydi.

:::try
1. Oldingi darsdagi Terraform kodiga ataylab uchta xato qo'shing: SSH `0.0.0.0/0`, `http_tokens = "optional"`, `encrypted = false`. Checkov bilan skanerlang — uchalasi topiladimi?
2. Xatolarni tuzatib, qayta skanerlang. Qolgan topilmalarni "tuzatish", "asoslangan istisno" va "bu loyiha uchun qo'llanmaydi" ga ajrating.
3. `Owner` tegi uchun YAML qoidasini yozing va teg yo'q resursda sinab ko'ring.
4. Plan'ni JSON'ga chiqarib, Checkov bilan skanerlang. Kod skaneri ko'rmagan biror narsa chiqdimi (masalan, o'zgaruvchi orqali kelgan qiymat)?
5. GitHub'da o'quv repozitoriyda yuqoridagi workflow'ni (OIDC qadamisiz) sozlang va branch himoyasida uni majburiy qiling. Xatoli PR ochib, merge tugmasi bloklanganini tekshiring.
6. Savol: jamoa aytadi: "Bizda PR'da Checkov bor, demak Prowler kerak emas." To'g'rimi?

**Javoblar:**
1. Ha: SSH uchun `CKV_AWS_24`, IMDSv1 uchun `CKV_AWS_79`, shifrlanmagan disk uchun EBS shifrlash qoidasi (`CKV_AWS_8`) chiqadi.
2. Lab kodida odatda: VPC Flow Logs yo'q, EC2 monitoring yoki EBS optimizatsiyasi, default security group cheklanmagan kabi topilmalar qoladi. Har biri uchun kontekst bo'yicha qaror; istisnolar `checkov:skip` bilan, sababi yozilgan holda.
3. Teg yo'q resurs uchun `CKV2_QAYDNOMA_1` FAILED. Agar teglar faqat `default_tags` da bo'lsa, kod skaneri ularni ko'rmasligi mumkin — plan skanerida esa ko'rinadi.
4. Masalan, `cidr_blocks = [var.ssh_cidr]` va `terraform.tfvars` da `0.0.0.0/0` bo'lsa — faqat plan skaneri topadi.
5. Status check majburiy bo'lsa, "Merge" tugmasi checklar o'tmaguncha faol bo'lmaydi.
6. Yo'q. Checkov faqat kod orqali kelgan o'zgarishlarni ko'radi. Konsoldagi qo'lda o'zgarishlar, IaC'dan tashqarida yaratilgan resurslar va vaqt o'tib paydo bo'lgan holatlarni faqat ishlab chiqarishdagi CSPM ko'radi. Ikki qatlam bir-birini to'ldiradi.
:::

## Xulosa

- Shift left: xatoni kodda va PR'da ushlash — arzon; ishlab chiqarishda — qimmat. Lekin CSPM baribir kerak (drift, qo'lda o'zgarishlar).
- Vositalar: Checkov, Trivy (tfsec shu yerda), KICS, tflint, conftest.
- Kod skaneri tez, plan skaneri aniqroq (o'zgaruvchilar va modullar hal qilingan) — ikkalasini ishlating.
- Istisnolar kod ichida, sababi va egasi bilan; eski loyihalarda baseline — yangi xatolar to'xtatiladi, eskilari reja bo'yicha.
- Policy as code: tashkilot qoidalari (teglar, regionlar, deletion protection) Checkov YAML yoki OPA/Rego'da yoziladi va avtomatik tekshiriladi.
- CI'da: fmt, validate, skanerlash, o'qish roli bilan plan, plan skanerlash; branch himoyasi bilan majburiy.
- IaC konveyeri — nishon: oqim nazorati, PR'lar uchun faqat o'qish roli, OIDC, qotirilgan action va provider'lar.
- Skaner kontekst va niyatni bilmaydi — kod sharhi va tahdid modeli o'rnini bosmaydi.

:::quiz
? "Shift left" nimani anglatadi?
- Tekshiruvni faqat ishlab chiqarishda o'tkazish
+ Xavfsizlik tekshiruvini jarayonning boshiga — kod yozish va pull request bosqichiga ko'chirish
- Kodni chapdan o'ngga o'qish
- CSPM'ni o'chirish
! Erta topilgan xato arzonroq tuzatiladi.

? Nega PR'da IaC skaneri bo'lsa ham ishlab chiqarishda CSPM kerak?
+ Skaner konsoldagi qo'lda o'zgarishlarni va IaC'dan tashqari yaratilgan resurslarni ko'rmaydi
- CSPM tezroq
- IaC skaneri faqat Azure'da ishlaydi
- Kerak emas
! Ikki qatlam bir-birini to'ldiradi: biri erta ogohlantiradi, ikkinchisi haqiqiy holatni kuzatadi.

? Terraform plan'ini (JSON) skanerlashning kod skanerlashdan afzalligi nima?
- Plan skanerlash tezroq
+ O'zgaruvchilar va modullar hal qilingan yakuniy qiymatlar tekshiriladi
- Plan'da sirlar bo'lmaydi
- Kod skaneri umuman ishlamaydi
! `var.ssh_cidr` qiymati faqat plan'da aniq bo'ladi.

? Checkov'da asoslangan istisno qanday yoziladi?
- Skanerni CI'dan olib tashlab
+ Resurs ichida `checkov:skip=<ID>:<sabab>` izohi bilan — sabab va egasi ko'rsatilgan holda
- Faqat og'zaki kelishuv bilan
- Barcha qoidalarni o'chirib
! Istisno kod bilan birga sharhdan o'tadi va tarixi saqlanadi.

? Eski, katta loyihaga skanerni birinchi marta ulaganda 400 ta topilma chiqdi. To'g'ri yondashuv?
- Barcha PR'larni 400 ta topilma tuzatilmaguncha bloklash
- Skanerni o'chirish
+ Baseline yaratib, CI'ni faqat yangi topilmalarda yiqitish va eskilarini reja bo'yicha tuzatish
- Hamma topilmalarni istisno qilish
! Yomonlashmaslik darhol, yaxshilanish bosqichma-bosqich.

? Policy as code'ning asosiy qiymati nima?
+ Tashkilot qoidalari hujjatda emas, avtomatik va majburiy tekshiruvda yashaydi
- Qoidalarni chiroyli PDF'ga aylantiradi
- Bulut xarajatini kamaytiradi
- Kod yozishni tezlashtiradi
! Masalan: Owner tegi, ruxsat etilgan regionlar, RDS deletion protection — PR'ni to'xtatadigan qoidalar.

? Skaner natijasi CI'da faqat "ma'lumot uchun" ko'rsatiladi, merge'ni to'xtatmaydi. Muammo nima?
- Muammo yo'q
+ Majburiy bo'lmagan tekshiruv e'tiborsiz qoladi; branch himoyasida majburiy status check qilish kerak
- Skaner sekin ishlaydi
- Natijalar shifrlanmaydi
! Dars boshidagi PR aynan shunday o'tib ketgan bo'lardi.

? Nega begona fork'dan kelgan PR uchun `terraform plan` ham ehtiyotkorlik talab qiladi?
- Plan har doim resurslarni o'chiradi
+ Plan ham ba'zi data source va provider'lar orqali kod bajarishi mumkin; u minimal huquqli, izolyatsiyalangan muhitda ishlashi kerak
- Fork'lar Terraform'ni qo'llab-quvvatlamaydi
- Plan state'ni o'chiradi
! Zaharlangan konveyer xavfi: PR'dagi kod konveyer huquqlari bilan ishlaydi.

? IaC konveyerida PR va apply uchun rollarni ajratish nima beradi?
- Hech narsa, bitta admin rol yetarli
+ PR'dagi tekshirilmagan kod faqat o'qish huquqli rol bilan ishlaydi; yozish huquqi faqat main'dan, tasdiqdan keyin
- Plan tezroq ishlaydi
- Xarajat kamayadi
! Eng kam imtiyoz konveyer bosqichlarida.

? IaC skanerining qaysi cheklovi to'g'ri?
- U hech qachon xato topmaydi
+ U kontekst va niyatni bilmaydi: `0.0.0.0/0` ALB uchun normal, baza uchun xavfli; noto'g'ri arxitekturani ham ko'rmasligi mumkin
- U faqat Python kodini skanerlaydi
- U Terraform'ni o'chiradi
! Skaner kod sharhi va tahdid modelini almashtirmaydi.
:::

:::cards
Shift left :: Tekshiruvni kod va PR bosqichiga ko'chirish — xato arzonroq tuzatiladi
Checkov :: Terraform, Kubernetes, Dockerfile va boshqa IaC uchun skaner
trivy config :: Trivy'ning IaC skaneri; tfsec shu yerga birlashgan
Plan skanerlash :: terraform show -json natijasini skanerlash — yakuniy qiymatlar bilan
checkov:skip :: Resurs ichidagi asoslangan istisno izohi
Baseline :: Mavjud topilmalar ro'yxati; CI faqat yangilarida yiqiladi
Policy as code :: Tashkilot qoidalarini kod sifatida yozib avtomatik tekshirish
OPA / Rego :: Umumiy siyosat dvigateli va tili; conftest va Gatekeeper ishlatadi
Majburiy status check :: Branch himoyasida o'tmaguncha merge'ni bloklaydigan tekshiruv
Poisoned pipeline execution :: PR'dagi o'zgartirilgan kod konveyer huquqlari bilan ishlashi
PR va apply rollari :: PR — faqat o'qish; apply — yozish, faqat main'dan va tasdiq bilan
:::
