Qaydnoma endi konteynerda. Uchta serverda `docker compose` bilan ishlaydi. Kechasi soat 3 da serverlardan biri ishdan chiqadi. Undagi konteynerlarni kim boshqa serverga ko'chiradi? Yuk oshganda kim yangi nusxalar qo'shadi? Yangi versiyani qanday qilib saytni to'xtatmasdan, server-server almashtirasiz? Va yangi versiyada xato chiqsa, qanday qilib bir buyruq bilan qaytarasiz?

Bularning hammasini skriptlar bilan qilish mumkin — va ko'p kompaniyalar shunday boshlagan. Keyin ular **orkestrator**ga keladi: konteynerlarni ko'plab serverlarda joylashtiradigan, kuzatadigan va tiklaydigan tizimga. Bugungi kunda eng keng tarqalgani — [[kubernetes|Kubernetes]] (qisqacha **k8s**).

Kubernetes — katta va murakkab tizim. Bu dars uni to'liq o'rgatmaydi; maqsad — asosiy tuzilma va obyektlarni tushunish, lokal klasterda Qaydnoma'ni joylash va YAML'ni o'qiy olish. Chunki keyingi darsda bu tizimni himoyalaymiz — himoya qilinadigan narsani tushunmasdan esa himoya bo'lmaydi.

## Klaster tuzilishi

```
 ┌─────────────────────── CONTROL PLANE ───────────────────────┐
 │                                                             │
 │   kubectl ──▶ ┌──────────────┐ ◀──▶ ┌──────┐                │
 │   (siz)       │ kube-apiserver│      │ etcd │ barcha holat   │
 │               └──────┬───────┘      └──────┘ (Secret'lar ham)│
 │        ┌─────────────┼──────────────┐                       │
 │   ┌────┴─────┐  ┌────┴──────────────┐                       │
 │   │ scheduler│  │ controller-manager│                       │
 │   └──────────┘  └───────────────────┘                       │
 └─────────────────────────┬───────────────────────────────────┘
                           │ (faqat API server orqali)
        ┌──────────────────┼──────────────────┐
 ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
 │  NODE 1     │    │  NODE 2     │    │  NODE 3     │
 │ kubelet     │    │ kubelet     │    │ kubelet     │
 │ kube-proxy  │    │ kube-proxy  │    │ kube-proxy  │
 │ runtime     │    │ runtime     │    │ runtime     │
 │ [pod][pod]  │    │ [pod]       │    │ [pod][pod]  │
 └─────────────┘    └─────────────┘    └─────────────┘
```

| Komponent | Vazifasi | Xavfsizlik nuqtasi |
|---|---|---|
| **kube-apiserver** | Klasterning yagona "eshigi" — hamma narsa REST API orqali | Kim nimaga ruxsatli — shu yerda tekshiriladi (RBAC) |
| **etcd** | Klaster holati saqlanadigan kalit-qiymat bazasi | Barcha Secret'lar shu yerda; etcd'ga kirish = klasterga to'liq kirish |
| **scheduler** | Yangi pod qaysi node'da ishlashini tanlaydi | — |
| **controller-manager** | "Kerakli holat" va "haqiqiy holat"ni doimiy solishtirib tuzatadi | — |
| **kubelet** | Har bir node'dagi agent: pod'larni ishga tushiradi | O'z API'si bor — himoyalanmasa, node'ni boshqarish imkoni |
| **kube-proxy** | Service'lar uchun tarmoq qoidalari | — |
| **Container runtime** | Konteynerlarni ishlatadi (containerd) | Oldingi darsdagi hamma narsa |

Eng muhim g'oya: **hamma narsa API server orqali o'tadi**. `kubectl` ham, node'lardagi `kubelet` ham, klaster ichidagi dasturlar ham. Shuning uchun Kubernetes xavfsizligining yarmi — API serverga kim, qanday huquq bilan murojaat qilishi.

## Deklarativ model

Docker'da siz **buyruq** berasiz: "shu konteynerni ishga tushir". Kubernetes'da siz **kerakli holatni** tasvirlaysiz: "Qaydnoma'ning 3 ta nusxasi doim ishlab tursin". Kontrollerlar esa uni doimiy ta'minlaydi:

```
  Siz: "replicas: 3"  ──▶  etcd'ga yoziladi
                                │
  controller: "haqiqatda 2 ta ishlayapti (bitta node o'ldi)"
                                │
                    ──▶ yangi pod yaratadi ──▶ scheduler sog'lom node'ga joylaydi
```

Dars boshidagi "kechasi soat 3" muammosi shu tarzda hal bo'ladi — odam aralashuvisiz.

## Asosiy obyektlar

| Obyekt | Nima | Analogiya |
|---|---|---|
| [[pod|Pod]] | Eng kichik birlik: bitta (ba'zan bir nechta) konteyner, umumiy IP va disk | Bitta "kvartira" |
| **ReplicaSet** | N ta bir xil pod doim ishlashini ta'minlaydi | — (odatda to'g'ridan-to'g'ri ishlatilmaydi) |
| **Deployment** | ReplicaSet'larni boshqaradi: yangi versiyaga bosqichma-bosqich o'tish, orqaga qaytish | Ilovaning o'zi |
| **Service** | Pod'lar guruhi uchun barqaror nom va IP (pod'lar o'ladi va qayta tug'iladi, IP o'zgaradi) | Ichki "telefon raqami" |
| **Ingress** | Tashqi HTTP(S) so'rovlarni domen va yo'l bo'yicha Service'larga yo'naltiradi | Reverse proxy (c1 dagi nginx) |
| **Namespace** | Klaster ichidagi mantiqiy bo'linma | Bino ichidagi qavat |
| **ConfigMap** | Sir bo'lmagan sozlamalar | Konfiguratsiya fayli |
| **Secret** | Sirlar — sukut bo'yicha faqat Base64! | c2 sirlar darsidagi ogohlantirish |
| **ServiceAccount** | Pod'ning API serverga murojaat qilish identifikatsiyasi | AWS'dagi IAM role |
| **PersistentVolumeClaim** | Saqlanadigan disk so'rovi | Docker volume |

**Service** turlari:

| Tur | Qayerdan ochiq |
|---|---|
| `ClusterIP` (sukut) | Faqat klaster ichidan |
| `NodePort` | Har bir node'ning ma'lum portida (30000–32767) |
| `LoadBalancer` | Bulut provayderi tashqi balanslovchi yaratadi — internetdan |

Xavfsizlik nuqtai nazaridan: ko'pchilik Service'lar `ClusterIP` bo'lishi kerak. Tashqariga faqat Ingress (yoki bitta LoadBalancer) chiqadi — c1 bosqichidagi uch qatlamli arxitektura mantiqi.

**Labels va selectors** — Kubernetes obyektlarni nomi bilan emas, **yorliqlari** bilan bog'laydi. Deployment `app: qaydnoma` yorlig'li pod'lar yaratadi, Service esa `app: qaydnoma` yorlig'li pod'larga trafik yuboradi. Keyingi darsdagi network policy ham yorliqlar bilan ishlaydi.

## Lokal klaster

Bulutda klaster pullik. O'rganish uchun — o'z kompyuteringizda:

| Vosita | Qanday ishlaydi |
|---|---|
| **kind** (Kubernetes in Docker) | Har bir "node" — Docker konteyneri. Tez, yengil, CI uchun ham |
| **minikube** | Bitta node'li klaster VM yoki konteynerda; ko'p qo'shimchalar |
| **k3d / k3s** | Yengil Kubernetes distributivi |

```bash
kind create cluster --name lab
kubectl cluster-info --context kind-lab
kubectl get nodes
```

## Qaydnoma'ni joylash

Namespace va konfiguratsiya:

```yaml
# 00-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: qaydnoma
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: qaydnoma-config
  namespace: qaydnoma
data:
  DB_HOST: "postgres.qaydnoma.svc.cluster.local"
  LOG_LEVEL: "info"
```

Deployment:

```yaml
# 10-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qaydnoma
  namespace: qaydnoma
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qaydnoma
  template:
    metadata:
      labels:
        app: qaydnoma
    spec:
      containers:
        - name: app
          image: <registry>/qaydnoma@sha256:<digest>
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: qaydnoma-config
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: qaydnoma-db
                  key: password
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          readinessProbe:
            httpGet: { path: /health, port: 8000 }
          livenessProbe:
            httpGet: { path: /health, port: 8000 }
```

| Maydon | Ma'nosi |
|---|---|
| `replicas: 3` | Uchta nusxa doim ishlaydi |
| `selector` / `labels` | Deployment qaysi pod'lar uniki ekanini yorliq orqali biladi |
| `image` digest bilan | Docker darsidagi qoida |
| `resources.requests` | Scheduler uchun: pod kamida shuncha resurs oladi |
| `resources.limits` | Yuqori chegara — oshsa, CPU sekinlashtiriladi, xotira oshsa pod o'ldiriladi |
| `readinessProbe` | Pod tayyor bo'lmaguncha unga trafik yuborilmaydi |
| `livenessProbe` | Pod "osilib qolsa", kubelet uni qayta ishga tushiradi |

Service va Ingress:

```yaml
# 20-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: qaydnoma
  namespace: qaydnoma
spec:
  type: ClusterIP
  selector:
    app: qaydnoma
  ports:
    - port: 80
      targetPort: 8000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: qaydnoma
  namespace: qaydnoma
spec:
  tls:
    - hosts: [qaydnoma.example.com]
      secretName: qaydnoma-tls
  rules:
    - host: qaydnoma.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: qaydnoma
                port:
                  number: 80
```

(Ingress ishlashi uchun klasterda Ingress controller — masalan, ingress-nginx — o'rnatilgan bo'lishi kerak.)

Secret — sinov uchun buyruq bilan (YAML faylga yozib Git'ga qo'ymaslik uchun):

```bash
kubectl create secret generic qaydnoma-db -n qaydnoma \
  --from-file=password=./secrets/db_password.txt
```

## kubectl bilan ishlash

```bash
kubectl apply -f k8s/                         # papkadagi barcha YAML'larni qo'llash
kubectl get pods -n qaydnoma -o wide          # pod'lar va qaysi node'da
kubectl describe pod <pod-nomi> -n qaydnoma   # batafsil holat va hodisalar (xatolarni shu yerda qidiring)
kubectl logs -f deploy/qaydnoma -n qaydnoma   # jurnal
kubectl exec -it <pod-nomi> -n qaydnoma -- sh # pod ichiga
kubectl port-forward svc/qaydnoma 8080:80 -n qaydnoma   # lokal sinov uchun

# O'z-o'zini tiklash
kubectl delete pod <pod-nomi> -n qaydnoma     # bitta pod'ni o'ldiring...
kubectl get pods -n qaydnoma -w               # ...va yangisi paydo bo'lishini kuzating

# Kengaytirish va yangi versiya
kubectl scale deploy/qaydnoma --replicas=5 -n qaydnoma
kubectl set image deploy/qaydnoma app=<registry>/qaydnoma@sha256:<yangi-digest> -n qaydnoma
kubectl rollout status deploy/qaydnoma -n qaydnoma
kubectl rollout undo deploy/qaydnoma -n qaydnoma     # xato chiqsa — orqaga
```

Dars boshidagi to'rt savolning hammasiga javob: o'z-o'zini tiklash, kengaytirish, to'xtovsiz yangilash (rolling update), bir buyruq bilan qaytarish.

:::tip
`kubectl describe` va `kubectl get events -n <namespace>` — Kubernetes'da muammoni qidirishning birinchi qadami. Pod `Pending` holatida qolsa (resurs yetmaydi), `ImagePullBackOff` (image topilmadi yoki registry'ga ruxsat yo'q), `CrashLoopBackOff` (ilova ishga tushib, darhol yiqilyapti) — sabab hodisalarda yozilgan.
:::

## Boshqariladigan Kubernetes

Bulutda control plane'ni o'zingiz ko'tarishingiz shart emas:

| Provayder | Xizmat |
|---|---|
| AWS | EKS |
| Azure | AKS |
| Google Cloud | GKE |

Umumiy javobgarlik modeli (c1) bu yerda ham: provayder **control plane**ni (API server, etcd) boshqaradi, yangilaydi va himoyalaydi. Siz esa — node'lar (agar o'zingiz boshqarsangiz), klaster sozlamalari, RBAC, network policy, pod xavfsizligi, image'lar va ilovalar uchun javobgarsiz. Ya'ni keyingi darsning deyarli hammasi — **sizning** tomoningizda.

EKS'da yana bir qatlam: Kubernetes identifikatsiyalari AWS IAM bilan bog'lanadi — pod'ga AWS rolini berish mumkin (EKS Pod Identity yoki IRSA). Bu c2 bosqichidagi "kalit o'rniga rol" g'oyasi, endi pod darajasida — har bir ilova faqat o'z AWS ruxsatlariga ega, butun node roliga emas.

## Kubernetes nimani qilmaydi

- Sukut bo'yicha **xavfsiz emas**: pod'lar bir-biri bilan erkin gaplashadi, konteynerlar root sifatida ishlashi mumkin, Secret'lar Base64. Buni keyingi darsda tuzatamiz.
- Ilova zaifliklarini yopmaydi va image'larni yangilamaydi.
- Murakkablikning o'zi xavf: ko'p sozlama — ko'p xato imkoniyati. Kichik loyiha uchun Kubernetes ortiqcha bo'lishi mumkin; ECS, Cloud Run yoki oddiy serverlar yetarli. "Hamma ishlatadi" — sabab emas.

:::try
1. `kind` bilan lokal klaster yarating va `kubectl get nodes`, `kubectl get pods -A` ni ishga tushiring. `kube-system` namespace'ida qanday pod'lar bor?
2. Oddiy `nginx` image bilan 3 nusxali Deployment va ClusterIP Service yarating. `port-forward` orqali brauzerda oching.
3. Bitta pod'ni o'chiring va yangi pod qancha vaqtda paydo bo'lishini kuzating.
4. Deployment'da image nomini ataylab noto'g'ri yozing (`nginx:yoq-versiya`). `kubectl get pods` va `kubectl describe pod` nima ko'rsatadi? So'ng `rollout undo` qiling.
5. Savol: Service turi `LoadBalancer` qilib o'zgartirildi (bulut klasterida). Nima o'zgaradi?

**Javoblar:**
1. Odatda: `coredns` (ichki DNS), `etcd-lab-control-plane`, `kube-apiserver-...`, `kube-controller-manager-...`, `kube-scheduler-...`, `kube-proxy-...`, `kindnet-...` (tarmoq). Control plane komponentlarining o'zi ham pod sifatida ishlaydi.
2. `kubectl create deployment web --image=nginx --replicas=3` va `kubectl expose deployment web --port=80`. Brauzerda `localhost:8080` (port-forward'dan keyin).
3. Bir necha soniya — ReplicaSet kontrolleri yangi pod yaratadi.
4. Yangi pod `ErrImagePull` / `ImagePullBackOff` holatida; `describe` hodisalarida "not found" xabari. Rolling update tufayli eski pod'lar ishlab turibdi — sayt to'xtamadi. `rollout undo` eski versiyaga qaytaradi.
5. Bulut provayderi ommaviy IP'li tashqi balanslovchi yaratadi — Service internetdan ochiladi. Bu xavfsizlik qarori: tasodifiy `LoadBalancer` — c2 bosqichidagi ochiq port bilan bir xil.
:::

## Xulosa

- Kubernetes — konteynerlarni ko'plab serverlarda joylaydigan, kuzatadigan, tiklaydigan va yangilaydigan orkestrator.
- Control plane: API server (yagona eshik), etcd (barcha holat, Secret'lar ham), scheduler, controller-manager. Node'lar: kubelet, kube-proxy, runtime.
- Deklarativ model: kerakli holatni yozasiz, kontrollerlar uni ta'minlaydi.
- Obyektlar: Pod, Deployment, Service (ClusterIP / NodePort / LoadBalancer), Ingress, Namespace, ConfigMap, Secret, ServiceAccount. Bog'lanish — yorliqlar orqali.
- Lokal o'rganish: kind, minikube. Asosiy buyruqlar: apply, get, describe, logs, exec, rollout.
- Boshqariladigan klasterda control plane — provayderda; RBAC, tarmoq, pod xavfsizligi va ilovalar — sizda.
- Kubernetes sukut bo'yicha xavfsiz emas va murakkabligi o'zi xavf.

:::quiz
? Kubernetes'da barcha boshqaruv so'rovlari qaysi komponent orqali o'tadi?
- etcd
- kubelet
+ kube-apiserver
- kube-proxy
! API server — klasterning yagona eshigi; autentifikatsiya va RBAC shu yerda tekshiriladi.

? Nega etcd'ni himoyalash juda muhim?
- U faqat jurnallarni saqlaydi
+ U butun klaster holatini, jumladan barcha Secret'larni saqlaydi
- U node'larni yoqadi
- U internetga ochiq bo'lishi kerak
! etcd'ga kirish — klaster ustidan to'liq nazorat.

? "Deklarativ model" nimani anglatadi?
- Har bir konteynerni qo'lda ishga tushirish
+ Kerakli holatni tasvirlaysiz, kontrollerlar haqiqiy holatni unga moslab turadi
- Faqat bitta node'da ishlash
- YAML'siz ishlash
! Masalan, `replicas: 3` yozilsa, bitta pod o'lsa ham uchtasi tiklanadi.

? Pod nima?
+ Kubernetes'dagi eng kichik ishga tushirish birligi: bir yoki bir nechta konteyner, umumiy IP va disk
- Butun klaster
- Bulut provayderi
- Faqat baza
! Pod'lar vaqtinchalik — ular o'ladi va o'rniga yangisi yaratiladi.

? Qaysi Service turi faqat klaster ichidan ochiq?
+ ClusterIP
- NodePort
- LoadBalancer
- Ingress
! Ko'pchilik ichki xizmatlar ClusterIP bo'lishi kerak; tashqariga faqat Ingress yoki bitta LoadBalancer.

? Service qaysi pod'larga trafik yuborishini qanday biladi?
- Pod nomlari orqali
- IP manzillar ro'yxati orqali, qo'lda yoziladi
+ Selector'dagi yorliqlar (labels) orqali
- Tasodifiy
! Pod'lar o'ladi va IP o'zgaradi; yorliqlar barqaror bog'lanish beradi.

? `readinessProbe` nima uchun kerak?
- Pod'ni o'chirish uchun
+ Pod tayyor bo'lmaguncha unga trafik yuborilmasligi uchun
- Image'ni skanerlash uchun
- Secret yaratish uchun
! Ilova ishga tushayotganda foydalanuvchi xato ko'rmaydi; livenessProbe esa osilgan pod'ni qayta ishga tushiradi.

? Pod `ImagePullBackOff` holatida. Ehtimoliy sabab qaysi?
- Xotira yetmayapti
+ Image nomi yoki tegi noto'g'ri, yoki registry'ga kirish ruxsati yo'q
- Ilova kodida sintaksis xatosi
- Ingress o'rnatilmagan
! `kubectl describe pod` hodisalarida aniq sabab yoziladi.

? Boshqariladigan Kubernetes'da (EKS, AKS, GKE) control plane'ni kim boshqaradi?
+ Bulut provayderi; RBAC, network policy, pod xavfsizligi va ilovalar esa mijozda
- Har doim mijoz
- Hech kim
- Faqat Kubernetes jamoasi
! Umumiy javobgarlik modeli Kubernetes'da ham ishlaydi.

? Kubernetes sukut bo'yicha qaysi xususiyatga ega?
- Barcha pod'lar bir-biridan to'liq ajratilgan
- Secret'lar kuchli shifrlangan
+ Pod'lar bir-biri bilan erkin gaplashadi va Secret'lar faqat Base64 bilan kodlangan
- Konteynerlar root sifatida ishlay olmaydi
! Sukut sozlamalar qulaylik uchun; xavfsizlik — alohida sozlash (keyingi dars).
:::

:::cards
Kubernetes (k8s) :: Konteynerlarni ko'p serverda joylaydigan, tiklaydigan va kengaytiradigan orkestrator
kube-apiserver :: Klasterning yagona boshqaruv eshigi; autentifikatsiya va RBAC shu yerda
etcd :: Klaster holati, jumladan Secret'lar saqlanadigan baza
kubelet :: Har bir node'da pod'larni ishga tushiradigan agent
Pod :: Eng kichik birlik — bir yoki bir nechta konteyner, umumiy IP va disk
Deployment :: Pod nusxalarini boshqaradi; rolling update va rollback
Service :: Pod'lar guruhi uchun barqaror nom va IP; ClusterIP, NodePort, LoadBalancer
Ingress :: Tashqi HTTP(S) so'rovlarni domen va yo'l bo'yicha Service'larga yo'naltiradi
Namespace :: Klaster ichidagi mantiqiy bo'linma
ServiceAccount :: Pod'ning API serverga murojaat qilish identifikatsiyasi
Labels va selectors :: Obyektlarni nom emas, yorliqlar orqali bog'lash
kind :: Docker konteynerlarida lokal Kubernetes klaster ko'taradigan vosita
:::
