Yillar davomida xavfsizlik tadqiqotchilari internetni skanerlab, bir xil manzarani topib kelishgan: parolsiz ochiq qoldirilgan Kubernetes boshqaruv panellari, autentifikatsiyasiz javob beradigan `kubelet` API'lari, hammaga ochiq API serverlar. Ulardan ba'zilari allaqachon "egallangan" bo'lib chiqqan: klasterda kimdir qo'shgan pod'lar kriptovalyuta qazib yotgan, ba'zilari esa bulut kalitlari saqlangan Secret'larni o'qigan. Hujumchilar murakkab zaiflik izlamagan — ular **eshik ochiqmi** deb tekshirgan.

Oldingi darsda aytdik: Kubernetes sukut bo'yicha xavfsiz emas. Pod'lar bir-biri bilan erkin gaplashadi, konteyner root bo'lishi mumkin, Secret — Base64. Bu dars — klasterni qatlamma-qatlam himoyalash: kim API'ga nima qila oladi (RBAC), pod nima qila oladi (Pod Security), kim kimga ulana oladi (network policy), sirlar qanday saqlanadi, qanday qoidalar majburiy (admission control) va hammasini qanday tekshiramiz (kube-bench).

## Hujum yuzasi

```
                     Internet
                        │
          ┌─────────────┼───────────────────┐
          ▼             ▼                   ▼
   Ingress → ilova   API server         Dashboard / kubelet API
   (zaif kod)        (ochiq bo'lsa)     (ochiq qolgan bo'lsa)
          │             │                   │
          ▼             ▼                   ▼
   Pod ichida kod   Ortiqcha RBAC      Node ustidan nazorat
   bajarildi        huquqlari
          │
          ├──▶ ServiceAccount tokeni → API server
          ├──▶ Boshqa pod'lar (network policy yo'q)
          ├──▶ Node'ning bulut metadata'si → node IAM roli
          └──▶ Privileged / hostPath → node → butun klaster
```

Ikki asosiy kirish yo'li bor: **tashqaridan** (ochiq komponentlar, o'g'irlangan kubeconfig) va **ichkaridan** (ilovadagi zaiflik orqali pod buzildi). Ikkinchisi ancha ko'p uchraydi — shuning uchun "pod buzilsa, hujumchi qayerga yeta oladi?" — bu darsning markaziy savoli.

**OWASP Kubernetes Top Ten** xavflar ro'yxati shu manzarani tizimlashtiradi:

| # | Xavf | Bu darsda |
|---|---|---|
| K01 | Xavfsiz bo'lmagan ish yuki sozlamalari | Pod Security |
| K02 | Ta'minot zanjiri zaifliklari | Admission control, imzolash |
| K03 | Ortiqcha RBAC huquqlari | RBAC |
| K04 | Markaziy siyosat nazoratining yo'qligi | Admission control |
| K05 | Yetarli bo'lmagan jurnal va monitoring | Audit log |
| K06 | Buzilgan autentifikatsiya | Autentifikatsiya |
| K07 | Tarmoq segmentatsiyasining yo'qligi | Network policy |
| K08 | Sirlarni boshqarishdagi xatolar | Secrets |
| K09 | Noto'g'ri sozlangan klaster komponentlari | kube-bench |
| K10 | Eskirgan va zaif komponentlar | Yangilash |

## Autentifikatsiya: kim murojaat qilmoqda

Kubernetes'da ikki xil identifikatsiya bor:

| Tur | Kim | Qanday |
|---|---|---|
| **Foydalanuvchilar** | Odamlar, tashqi tizimlar | Kubernetes'ning o'zida "user" obyekti yo'q — tashqi tizim orqali: sertifikat, OIDC (masalan, korporativ SSO), bulutda — IAM (EKS) |
| **ServiceAccount'lar** | Klaster ichidagi pod'lar | Kubernetes boshqaradigan token |

Amaliy qoidalar:

- **API server internetga ochiq bo'lmasin** — xususiy endpoint yoki ruxsat etilgan IP'lar ro'yxati. Boshqariladigan klasterlarda bu bitta sozlama.
- **kubeconfig fayli — kalit.** Unda klasterga kirish ma'lumotlari bor. Uni Git'ga, chatga, umumiy papkaga qo'ymang — xuddi AWS access key kabi. Odamlar uchun qisqa muddatli OIDC yoki IAM tokenlari afzal.
- **Anonim so'rovlar** — kerak bo'lmasa o'chiriladi; ruxsat etilgan bo'lsa, ularga RBAC orqali hech narsa berilmaganiga ishonch hosil qiling.
- **Pod'ga token kerak bo'lmasa — bermang.** Ko'pchilik ilovalar (Qaydnoma ham) Kubernetes API'ga umuman murojaat qilmaydi, lekin sukut bo'yicha har bir pod'ga ServiceAccount tokeni ulanadi:

```yaml
spec:
  automountServiceAccountToken: false
```

Pod buzilganda hujumchi birinchi bo'lib `/var/run/secrets/kubernetes.io/serviceaccount/token` faylini qidiradi. Fayl yo'q — API'ga yo'l yo'q.

## RBAC: kim nima qila oladi

c2 bosqichidagi IAM g'oyasi — Kubernetes ko'rinishida. To'rt obyekt:

| Obyekt | Doirasi | Nima |
|---|---|---|
| **Role** | Bitta namespace | Ruxsatlar to'plami |
| **ClusterRole** | Butun klaster | Ruxsatlar to'plami (yoki namespace'larda qayta ishlatiladigan shablon) |
| **RoleBinding** | Bitta namespace | Role yoki ClusterRole'ni kimgadir biriktiradi |
| **ClusterRoleBinding** | Butun klaster | ClusterRole'ni butun klaster bo'yicha biriktiradi |

Ruxsat = **resurs** (pods, deployments, secrets…) + **fe'l** (get, list, watch, create, update, patch, delete). Sukut bo'yicha — hech narsa; ruxsatlar faqat qo'shiladi (`Deny` yo'q).

Qaydnoma'ni yangilaydigan CI konveyeri uchun eng kam imtiyozli rol:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: qaydnoma-deployer
  namespace: qaydnoma
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["qaydnoma"]
    verbs: ["get", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: qaydnoma-deployer
  namespace: qaydnoma
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: qaydnoma
roleRef:
  kind: Role
  name: qaydnoma-deployer
  apiGroup: rbac.authorization.k8s.io
```

Konveyer faqat bitta Deployment'ni yangilay oladi va pod'lar holatini ko'radi. Secret'larni o'qiy olmaydi, boshqa namespace'larga yeta olmaydi, yangi pod yarata olmaydi.

**Xavfli ruxsatlar** — c2 bosqichidagi "admin bilan teng ruxsatlar" jadvalining Kubernetes ko'rinishi. Bularni audit paytida alohida belgilang:

| Ruxsat | Nega xavfli |
|---|---|
| `cluster-admin` ClusterRoleBinding orqali | Klasterda hamma narsa |
| `*` resurslar yoki `*` fe'llar | Kelajakdagi resurslar ham ichiga tushadi |
| `secrets` uchun `get` / `list` | Namespace'dagi barcha sirlar, jumladan boshqa ServiceAccount tokenlari |
| `pods` uchun `create` (yoki Deployment yaratish) | Istalgan sozlamali pod — privileged, hostPath bilan — Pod Security to'xtatmasa |
| `pods/exec` | Ishlab turgan istalgan pod ichida buyruq bajarish |
| `escalate`, `bind`, `impersonate` fe'llari | O'z huquqlarini oshirish yoki boshqa identifikatsiya nomidan ish ko'rish |
| `nodes/proxy` | kubelet API'ga kirish |

Tekshirish:

```bash
# Bu ServiceAccount nima qila oladi?
kubectl auth can-i --list -n qaydnoma \
  --as=system:serviceaccount:qaydnoma:ci-deployer

# Aniq savol
kubectl auth can-i get secrets -n qaydnoma \
  --as=system:serviceaccount:qaydnoma:default

# cluster-admin kimlarga berilgan?
kubectl get clusterrolebindings -o wide | grep cluster-admin
```

## Pod Security: pod nima qila oladi

Docker xavfsizligi darsidagi hamma narsa (root emas, capability'siz, read-only, privileged taqiqi) Kubernetes'da pod'ning **securityContext** maydonida yoziladi:

```yaml
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: <registry>/qaydnoma@sha256:<digest>
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        privileged: false
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
```

Pod spetsifikatsiyasidagi xavfli maydonlar:

| Maydon | Docker'dagi o'xshashi | Xavfi |
|---|---|---|
| `privileged: true` | `--privileged` | Izolyatsiya deyarli yo'q |
| `hostPath` volume | `-v /:/host` | Node fayl tizimi |
| `hostNetwork: true` | `--network=host` | Node tarmog'i, lokal xizmatlar |
| `hostPID: true` | `--pid=host` | Node jarayonlari |
| `capabilities.add: [SYS_ADMIN]` | `--cap-add SYS_ADMIN` | Keng tizim huquqlari |

Har bir dasturchi bularni to'g'ri yozishiga tayanib bo'lmaydi. Shuning uchun Kubernetes'da **Pod Security Standards** bor — uchta tayyor daraja:

| Daraja | Nima |
|---|---|
| **Privileged** | Hech qanday cheklov yo'q — faqat tizim komponentlari uchun |
| **Baseline** | Ma'lum xavfli sozlamalar taqiqlangan (privileged, host namespace'lari, hostPath, xavfli capability'lar) |
| **Restricted** | Eng qat'iy: yuqoridagilar + root emas, `allowPrivilegeEscalation: false`, capability'lar olib tashlangan, seccomp majburiy |

Ular **Pod Security Admission** orqali namespace yorlig'i bilan yoqiladi:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: qaydnoma
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

Endi `qaydnoma` namespace'ida privileged yoki root pod yaratishga urinish **rad etiladi** — kim urinmasin. Mavjud namespace'lar uchun avval `warn` va `audit` rejimida yoqib, ogohlantirishlarni ko'ring, keyin `enforce`.

## Network policy: kim kimga ulana oladi

Sukut bo'yicha Kubernetes'da har bir pod har bir pod'ga ulana oladi — c1 bosqichidagi **tekis tarmoq**. [[network-policy|Network policy]] — segmentatsiya:

```yaml
# 1. Namespace'da sukut bo'yicha hammasi taqiqlangan
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: qaydnoma
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
# 2. Ilovaga faqat ingress controller'dan, faqat 8000 portga
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: qaydnoma-from-ingress
  namespace: qaydnoma
spec:
  podSelector:
    matchLabels: { app: qaydnoma }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8000
---
# 3. Ilova faqat bazaga (5432) va DNS'ga chiqa oladi
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: qaydnoma-egress
  namespace: qaydnoma
spec:
  podSelector:
    matchLabels: { app: qaydnoma }
  policyTypes: ["Egress"]
  egress:
    - to:
        - podSelector:
            matchLabels: { app: postgres }
      ports:
        - port: 5432
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

(Bazaning o'zi uchun ham "faqat `app: qaydnoma` dan 5432 ga" degan ingress siyosati qo'shiladi.)

Natija — c1 bosqichidagi security group zanjirining Kubernetes ko'rinishi:

```
 ingress-nginx ──8000──▶ [qaydnoma] ──5432──▶ [postgres]
                              │
                              └──53──▶ DNS     boshqa hamma narsa — taqiq
```

Buzilgan Qaydnoma pod'i boshqa ilovalarga, node'ning metadata xizmatiga (`169.254.169.254`) va internetga chiqa olmaydi.

:::warn
Network policy'ni **tarmoq plagini (CNI)** bajaradi — Kubernetes'ning o'zi emas. Ba'zi CNI'lar uni qo'llab-quvvatlamaydi: bunday klasterda siyosat xatosiz qabul qilinadi, lekin **hech narsani to'xtatmaydi**. Klasteringiz CNI'si (masalan, Calico yoki Cilium) siyosatlarni bajarishini tekshiring — va siyosatni yozgandan keyin uni haqiqatan sinab ko'ring (`kubectl exec` bilan ruxsat etilmagan manzilga ulanishga urinish).
:::

## Bulut metadata'si va pod'lar

c2 bosqichidagi IMDS xavfi Kubernetes'da kuchayadi: EKS node'i — EC2 server, uning IAM roli bor. Agar pod node'ning IMDS'iga yeta olsa, u **node roli** kalitlarini oladi — va bu rol odatda ko'p narsaga ruxsatli (image yuklab olish, tarmoq interfeyslari…).

Himoya:

- Node'larda **IMDSv2, hop limit 1** — pod'dan kelgan so'rov qo'shimcha tarmoq "sakrash"i tufayli IMDS'ga yetmaydi.
- Network policy bilan `169.254.169.254` ga egress taqiqi.
- Pod'larga AWS ruxsatlari kerak bo'lsa — node roli emas, **pod darajasidagi rol** (EKS Pod Identity yoki IRSA): har bir ilova faqat o'z ruxsatlari bilan.

## Secret'lar

Oldingi darslardan: Kubernetes `Secret` — Base64, shifrlash emas. Himoya qatlamlari:

| Qatlam | Chora |
|---|---|
| etcd'da saqlash | **Encryption at rest** — EKS'da KMS bilan envelope encryption yoqiladi (c2 bosqichidagi KMS) |
| Kirish | RBAC: `secrets` ga `get`/`list` — faqat kerakli ServiceAccount'larga |
| Manba | Sirlar tashqi omborda (Secrets Manager), klasterga sinxronlanadi — External Secrets Operator yoki Secrets Store CSI driver |
| Git | Secret YAML'lari Git'ga ochiq qiymat bilan tushmaydi |
| Pod ichida | Muhit o'zgaruvchisi o'rniga fayl sifatida ulash — jurnallar va xato izlariga kamroq tushadi |

## Admission control: majburiy qoidalar

API server so'rovni qabul qilishdan oldin uni **admission controller**'lardan o'tkazadi. Pod Security Admission — ulardan biri. Lekin tashkilotning o'z qoidalari ko'proq bo'ladi: "image faqat bizning registry'dan", "`latest` tegi taqiqlangan", "har bir pod'da resurs cheklovi bo'lsin", "image imzolangan bo'lsin". Buning uchun **policy engine**lar ishlatiladi — Kyverno yoki OPA Gatekeeper. Bu [[policy-as-code|policy as code]] — IaC skanerlash darsida yana uchratadigan g'oya.

Kyverno qoidasi misoli:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  rules:
    - name: only-company-registry
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "Image faqat kompaniya registry'sidan bo'lishi kerak."
        pattern:
          spec:
            containers:
              - image: "111122223333.dkr.ecr.eu-central-1.amazonaws.com/*"
```

Docker xavfsizligi darsidagi image imzosini tekshirish ham shu yerda majburiy qilinadi: imzosiz image — pod yaratilmaydi.

## Klaster komponentlari va yangilash

- **API server** — xususiy yoki IP bilan cheklangan; audit log yoqilgan.
- **kubelet** — anonim kirish o'chiq, avtorizatsiya API server orqali (`Webhook`).
- **etcd** — faqat API serverdan, TLS bilan; zaxira nusxalari ham shifrlangan (ichida Secret'lar!).
- **Dashboard** va boshqa boshqaruv panellari — internetga ochilmaydi.
- **Versiyalar** — Kubernetes'ning har bir kichik versiyasi taxminan bir yil qo'llab-quvvatlanadi. Eskirgan klaster — yamalmagan zaifliklar (K10). Boshqariladigan klasterlarda ham yangilashni **siz** boshlaysiz va node'larni ham yangilaysiz.

## kube-bench: CIS Kubernetes Benchmark

c1 (server), c2 (bulut hisobi), Docker darsi (xost) — har birining CIS Benchmark'i bor edi. Kubernetes uchun ham bor, va uni tekshiradigan vosita — **kube-bench** (Aqua Security, ochiq manbali). U odatda klasterda Job sifatida ishga tushiriladi:

```bash
# Rasmiy repozitoriydagi job.yaml (boshqariladigan klasterlar uchun alohida variantlar bor, masalan job-eks.yaml)
kubectl apply -f job.yaml
kubectl logs job/kube-bench
```

Natija bo'limlarga bo'lingan (control plane, etcd, node'lar, siyosatlar):

```
[INFO] 4 Worker Node Security Configuration
[INFO] 4.2 Kubelet
[PASS] 4.2.1 Ensure that the --anonymous-auth argument is set to false
[FAIL] 4.2.6 Ensure that the --make-iptables-util-chains argument is set to true
[WARN] 5.1.5 Ensure that default service accounts are not actively used
...
== Summary node ==
17 checks PASS
2 checks FAIL
5 checks WARN
```

Tahlil — c2 bosqichidagi CSPM kabi:

- Boshqariladigan klasterda control plane tekshiruvlarining ko'pi **qo'llanmaydi** — u provayderda. Shuning uchun provayderga moslangan benchmark (masalan, CIS EKS Benchmark) ishlatiladi.
- `[WARN]` ko'pincha qo'lda tekshiruv talab qiladi (masalan, RBAC'ni ko'rib chiqish — vosita sizning niyatingizni bilmaydi).
- Har bir `[FAIL]` uchun: kontekst, risk, egasi, muddat.

Boshqa foydali vositalar: **kubescape** (NSA/CISA va boshqa freymvorklar bo'yicha), `trivy k8s` (klaster resurslari va image'larni skanerlash).

## Monitoring: audit log va runtime

Kubernetes **audit log** — API serverga har bir so'rovning yozuvi (c2 bosqichidagi CloudTrail'ning Kubernetes ko'rinishi). EKS'da u CloudWatch Logs'ga yoqiladi.

Signal bo'lishi kerak bo'lgan hodisalar:

| Hodisa | Nega |
|---|---|
| `pods/exec` — ishlab chiqarish pod'iga | Kimdir konteyner ichida buyruq bajarmoqda |
| Ko'p `secrets` o'qish | Sir yig'ish |
| RBAC o'zgarishlari, ayniqsa `cluster-admin` biriktirish | Imtiyoz oshirish |
| Privileged yoki hostPath pod yaratish urinishi | Pod Security rad etgan bo'lsa ham — kim va nega urindi? |
| Anonim yoki rad etilgan ko'p so'rovlar | Skanerlash yoki o'g'irlangan token sinovi |

Pod ichidagi xatti-harakat — Docker xavfsizligi darsidagi **Falco** (Kubernetes metama'lumotlari bilan: qaysi namespace, pod, deployment). GuardDuty'ning EKS himoya rejasi ham audit log va runtime'ni tahlil qiladi (c2 monitoring darsi).

## Kubernetes xavfsizligi nimani qilmaydi

- Ilovadagi zaiflikni yopmaydi. Lekin yaxshi sozlangan klasterda buzilgan pod: root emas, capability'siz, faqat o'qiladigan fayl tizimida, tokensiz, faqat bazaga va DNS'ga chiqa oladi. Hujumchining keyingi qadami juda qiyin.
- RBAC'da `Deny` yo'q — ruxsatlarni faqat qo'shish mumkin. Shuning uchun keng ClusterRole biriktirilsa, uni bitta qoida bilan "kesib" bo'lmaydi.
- Network policy faqat CNI qo'llab-quvvatlasa ishlaydi.
- Sozlamalar ko'p va ular vaqt o'tib suriladi — admission control va muntazam skanerlashsiz yaxshi holat uzoq turmaydi.

:::try
`kind` klasteringizda (network policy uchun Calico yoki Cilium o'rnating):

1. `qaydnoma` namespace'iga `pod-security.kubernetes.io/enforce: restricted` yorlig'ini qo'shing. Keyin oddiy `kubectl run test --image=nginx -n qaydnoma` ni ishga tushiring. Nima bo'ladi va nega?
2. Dars boshidagi securityContext bilan pod yarating. U restricted namespace'da ishga tushadimi?
3. `default` ServiceAccount nima qila olishini `kubectl auth can-i --list` bilan tekshiring.
4. Ikki pod yarating (`app: a` va `app: b`). Network policy'siz `a` dan `b` ga ulaning; keyin `default-deny` qo'shib, qayta urinib ko'ring.
5. kube-bench'ni ishga tushiring va eng muhim 3 ta `[FAIL]` yoki `[WARN]` ni tanlab, nimani anglatishini yozing.
6. Savol: CI ServiceAccount'iga `pods` uchun `create` ruxsati berilgan, namespace'da Pod Security yoqilmagan. Qanday xavf bor?

**Javoblar:**
1. Pod rad etiladi (yoki yaratilishda xato): oddiy `nginx` root sifatida ishlaydi va restricted talablarini (runAsNonRoot, allowPrivilegeEscalation, capabilities, seccomp) bajarmaydi. Xato xabarida qaysi maydonlar yetishmasligi yoziladi.
2. Ha — agar image haqiqatan root bo'lmagan foydalanuvchi bilan ishlasa. Oddiy `nginx` image'i root talab qiladi; buning uchun `nginxinc/nginx-unprivileged` kabi image kerak.
3. Odatda faqat o'zi haqidagi ma'lumotlarni so'rash kabi minimal huquqlar. Agar ko'proq bo'lsa — kimdir `default` ServiceAccount'ga rol biriktirgan; bu K03 topilmasi.
4. Siyosatsiz — ulanadi; `default-deny` dan keyin — ulanmaydi (timeout). Ulanayotgan bo'lsa — CNI siyosatni bajarmayapti.
5. Lab klasterida ko'pincha: kubelet sozlamalari, audit log yoqilmagan, `default` ServiceAccount'lar ishlatilmoqda.
6. Konveyer (yoki uning tokeni o'g'irlansa — hujumchi) istalgan pod yarata oladi: privileged, `hostPath: /` bilan — ya'ni node'ni va undan klasterni egallash. Pod yaratish huquqi + Pod Security yo'qligi = amalda klaster admini.
:::

## Xulosa

- Asosiy savol: pod buzilsa, hujumchi qayerga yeta oladi? Javob qisqa bo'lsin.
- Autentifikatsiya: API server internetga ochiq emas, kubeconfig — kalit, kerak bo'lmasa `automountServiceAccountToken: false`.
- RBAC: Role/ClusterRole + Binding; eng kam imtiyoz, `resourceNames` bilan. Xavfli: `cluster-admin`, `*`, secrets o'qish, pod yaratish, `pods/exec`, escalate/bind/impersonate.
- Pod Security: securityContext (root emas, capability'siz, read-only, seccomp) va namespace darajasida Pod Security Admission (`restricted`).
- Network policy: `default-deny` + aniq ruxsatlar; CNI qo'llab-quvvatlashini tekshiring va sinang.
- Node IMDS'ini pod'lardan yoping; pod'larga alohida AWS roli.
- Secret'lar: etcd shifrlash (KMS), RBAC, tashqi sir ombori.
- Admission control (Kyverno, Gatekeeper): registry, imzo, resurs cheklovlari — majburiy qoidalar.
- kube-bench (CIS), kubescape, audit log va Falco — tekshiruv va kuzatuv.

:::quiz
? Nega pod'ga sukut bo'yicha ulanadigan ServiceAccount tokeni xavf tug'dirishi mumkin?
- Token pod'ni sekinlashtiradi
+ Pod buzilsa, hujumchi token bilan API serverga murojaat qiladi; ilovaga kerak bo'lmasa token ulanmasligi kerak
- Token internetga ochiq
- Token faqat root uchun
! `automountServiceAccountToken: false` — API'ga murojaat qilmaydigan ilovalar uchun oddiy va kuchli chora.

? Kubernetes RBAC'da qaysi gap to'g'ri?
- Ruxsatlar va taqiqlar yoziladi, taqiq ustun
+ Sukut bo'yicha hech narsa ruxsat etilmagan va ruxsatlar faqat qo'shiladi — Deny qoidasi yo'q
- Barcha ServiceAccount'lar sukut bo'yicha admin
- RBAC faqat node'lar uchun
! Keng rol biriktirilsa, uni taqiq bilan kesib bo'lmaydi — faqat rolni toraytirish kerak.

? Qaysi ruxsat Pod Security yoqilmagan namespace'da amalda admin huquqiga olib kelishi mumkin?
- `pods` uchun `get`
- `configmaps` uchun `list`
+ `pods` uchun `create`
- `events` uchun `watch`
! Pod yaratuvchi privileged va hostPath'li pod yaratib, node'ni egallashi mumkin.

? Pod Security Standards'ning `restricted` darajasi nimani talab qiladi?
+ Root emas, imtiyoz oshirish taqiqi, capability'lar olib tashlangan, seccomp profili, privileged va host namespace'larsiz
- Hech qanday cheklov yo'q
- Faqat resurs cheklovlari
- Faqat image imzosi
! Restricted — eng qat'iy tayyor daraja; namespace yorlig'i bilan yoqiladi.

? Namespace'ga `default-deny` network policy qo'llandi. Natija?
- Faqat tashqi trafik bloklanadi
+ Ruxsat beruvchi siyosatlar qo'shilmaguncha shu namespace pod'lariga kiruvchi va ulardan chiquvchi barcha trafik taqiqlanadi
- Hech narsa o'zgarmaydi
- Barcha pod'lar o'chiriladi
! Keyin faqat kerakli oqimlar (ingress → ilova, ilova → baza, DNS) ochiladi.

? Network policy yozildi va xatosiz qabul qilindi, lekin trafik baribir o'tmoqda. Ehtimoliy sabab?
- YAML'da probel xatosi
+ Klasterning tarmoq plagini (CNI) network policy'ni bajarmaydi
- Pod'lar juda ko'p
- Siyosat faqat dam olish kunlari ishlaydi
! Siyosatni CNI bajaradi; qo'llab-quvvatlamaydigan CNI'da u ta'sirsiz.

? EKS'da pod'lardan node IMDS'iga kirishni cheklash nega muhim?
- IMDS pod'larni sekinlashtiradi
+ Pod node rolining AWS kalitlarini olishi mumkin; IMDSv2 hop limit 1, egress taqiqi va pod darajasidagi rollar buni to'xtatadi
- IMDS Kubernetes'da mavjud emas
- Bu faqat xarajat uchun
! c2 bosqichidagi IMDS xavfi Kubernetes'da node roli orqali kuchayadi.

? Kyverno yoki OPA Gatekeeper nima uchun ishlatiladi?
- Image'larni yig'ish uchun
+ API server so'rovlarini tashkilot qoidalari bo'yicha tekshirib, mos kelmaganlarini rad etish uchun (admission control)
- Node'larni yangilash uchun
- DNS uchun
! Masalan: faqat kompaniya registry'si, imzolangan image, resurs cheklovlari majburiy.

? Boshqariladigan klasterda kube-bench'ning ko'p control plane tekshiruvlari nega qo'llanmaydi?
+ Control plane provayder tomonidan boshqariladi va unga kirish yo'q; provayderga moslangan benchmark ishlatiladi
- kube-bench boshqariladigan klasterlarda ishlamaydi
- Control plane xavfsizligi muhim emas
- Bu tekshiruvlar har doim PASS
! Umumiy javobgarlik: node'lar, siyosatlar va RBAC tekshiruvlari sizga tegishli.

? Kubernetes audit log'ida qaysi hodisa yuqori ustuvor signal bo'lishi kerak?
- Pod'ning readiness tekshiruvi
+ Ishlab chiqarish pod'iga `pods/exec` va `cluster-admin` biriktirish
- ConfigMap o'qish
- Node'ning sog'liq hisoboti
! Exec — konteyner ichida buyruq; cluster-admin biriktirish — imtiyoz oshirish.
:::

:::cards
ServiceAccount tokeni :: Pod'ning API serverga kirish kaliti; kerak bo'lmasa automount o'chiriladi
Role va ClusterRole :: Namespace va klaster darajasidagi ruxsatlar to'plami
RoleBinding :: Rolni foydalanuvchi yoki ServiceAccount'ga biriktiradi
cluster-admin :: Klasterdagi hamma narsaga ruxsat beruvchi rol — kam va asosli
kubectl auth can-i :: Identifikatsiya nima qila olishini tekshirish
securityContext :: Pod va konteyner xavfsizlik sozlamalari: runAsNonRoot, capabilities, readOnlyRootFilesystem
Pod Security Standards :: Privileged, Baseline, Restricted — tayyor xavfsizlik darajalari
Pod Security Admission :: Namespace yorlig'i bilan PSS darajasini majburiy qiladi
NetworkPolicy default-deny :: Namespace'da barcha trafikni taqiqlab, keyin aniq oqimlarni ochish
CNI :: Tarmoq plagini — network policy'ni aynan u bajaradi
Admission controller :: So'rov saqlanishidan oldin uni tekshiradigan yoki o'zgartiradigan qatlam
kube-bench :: CIS Kubernetes Benchmark bo'yicha tekshiruv vositasi
:::
