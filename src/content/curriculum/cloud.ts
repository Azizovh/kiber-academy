import type { Stage } from '../types';
import { mod, r, topic } from './helpers';

const awsDocs = r.docs('AWS hujjatlari', 'https://docs.aws.amazon.com/');
const skillbuilder = r.course('AWS Skill Builder — bepul kurslar', 'https://skillbuilder.aws/');
const cis = r.docs('CIS Benchmarks', 'https://www.cisecurity.org/cis-benchmarks');
const k8sDocs = r.docs('Kubernetes hujjatlari', 'https://kubernetes.io/docs/home/');

export const CLOUD: Stage[] = [
  {
    id: 'c1-infratuzilma',
    track: 'cloud',
    title: 'Infratuzilma va bulut asoslari',
    summary: "Server, tarmoq va bulut: himoya qilinadigan narsaning o'zini qura olish.",
    outcome: "Linux serverni boshqarasiz va AWS'da tarmoq, server va saqlash xizmatlaridan iborat infratuzilma qurasiz.",
    modules: [
      mod('c1-server', 'Server va tarmoq', [
        topic('server-mamurligi', 'Linux server ma\'murligi', 20, "Foydalanuvchilar, xizmatlar, disk, zaxira, SSH mustahkamlash, web server.", [
          "Serverni noldan sozlab, web sayt joylay olaman",
          "SSH'ni mustahkamlay olaman (kalit, fail2ban, root taqiqi)",
          "Firewall (ufw/nftables) sozlay olaman",
        ], [r.article('DigitalOcean — Community Tutorials', 'https://www.digitalocean.com/community/tutorials'), cis]),
        topic('tarmoq-chuqur', 'Tarmoq chuqur: VLAN, marshrutlash, VPN', 16, "Segmentatsiya, statik va dinamik marshrut, WireGuard/IPsec.", [
          "Tarmoqni segmentlarga bo'lish rejasini tuza olaman",
          "WireGuard VPN o'rnata olaman",
        ], [r.video('Practical Networking', 'https://www.youtube.com/@PracticalNetworking'), r.docs('WireGuard — Quick Start', 'https://www.wireguard.com/quickstart/')]),
      ]),
      mod('c1-bulut', 'Bulut', [
        topic('bulut-tushunchalari', 'Bulut tushunchalari', 8, "IaaS, PaaS, SaaS, region, umumiy javobgarlik modeli.", [
          "Xizmat modellari farqini bilaman",
          "Shared responsibility modelini tushuntira olaman",
        ], [skillbuilder, r.article('Cloudflare — What is the cloud?', 'https://www.cloudflare.com/learning/cloud/what-is-the-cloud/')]),
        topic('aws-asoslari', 'AWS asoslari', 30, "IAM, EC2, S3, VPC, RDS, Lambda — bepul daraja doirasida.", [
          "AWS akkaunt ochib, root'ni MFA bilan himoyaladim va byudjet ogohlantirishi qo'ydim",
          "VPC ichida EC2 server ko'tara olaman",
          "S3 bucket yaratib, kirish siyosatini sozlay olaman",
        ], [skillbuilder, awsDocs]),
        topic('azure-gcp-nazar', 'Azure va GCP ga nazar', 10, "Asosiy xizmatlarning mos kelishi; Entra ID.", [
          "AWS xizmatlarining Azure/GCP dagi muqobillarini bilaman",
          "Entra ID (Azure AD) nima ekanini tushunaman",
        ], [r.course('Microsoft Learn', 'https://learn.microsoft.com/en-us/training/'), r.course('Google Cloud Skills Boost', 'https://www.cloudskillsboost.google/')]),
        topic('birinchi-infratuzilma', 'Amaliyot: uch qatlamli ilova', 16, "Balanslovchi + server + baza: bulutda to'liq ilova joylash.", [
          "Uch qatlamli arxitekturani qurib, sxemasini chizdim",
          "Ishni tugatgach resurslarni o'chirib, xarajatni nazorat qila olaman",
        ], [r.docs('AWS Well-Architected Framework', 'https://aws.amazon.com/architecture/well-architected/'), awsDocs]),
      ]),
    ],
  },

  {
    id: 'c2-bulut-xavfsizligi',
    track: 'cloud',
    title: 'Bulut xavfsizligi yadrosi',
    summary: "Bulutdagi buzilishlarning aksariyati — noto'g'ri sozlash. IAM, tarmoq, ma'lumot va monitoring.",
    outcome: "Bulut akkauntini tekshirib, xavfli sozlamalarni topasiz va tuzatasiz.",
    modules: [
      mod('c2-yadro', 'Asosiy nazoratlar', [
        topic('iam-chuqur', 'IAM chuqur', 24, "Siyosatlar, rollar, vaqtinchalik kalitlar, eng kam imtiyoz, imtiyoz oshirish yo'llari.", [
          "IAM siyosatini o'qib, nimaga ruxsat berishini ayta olaman",
          "Eng kam imtiyozli siyosat yoza olaman",
          "IAM orqali imtiyoz oshirish usullarini bilaman",
        ], [r.docs('AWS IAM — User Guide', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/'), r.article('Rhino Security Labs — AWS privilege escalation', 'https://rhinosecuritylabs.com/aws/aws-privilege-escalation-methods-mitigation/')]),
        topic('bulut-tarmoq-xavfsizligi', 'Bulut tarmoq xavfsizligi', 16, "Security group, NACL, xususiy subnet, WAF, endpointlar.", [
          "Ommaviy va xususiy subnetli VPC loyihalay olaman",
          "Security group va NACL farqini bilaman",
        ], [awsDocs, r.docs('AWS WAF', 'https://docs.aws.amazon.com/waf/latest/developerguide/')]),
        topic('bulut-malumot-himoyasi', 'Ma\'lumot himoyasi', 14, "Shifrlash, KMS, S3 siyosatlari, ommaviy kirishni bloklash.", [
          "S3 bucket ochiq qolganini tekshira olaman",
          "KMS kalit siyosatini tushunaman",
        ], [r.docs('AWS KMS', 'https://docs.aws.amazon.com/kms/latest/developerguide/'), awsDocs]),
        topic('bulut-monitoring', 'Jurnal va monitoring', 16, "CloudTrail, CloudWatch, GuardDuty, Config, Security Hub.", [
          "CloudTrail'ni yoqib, shubhali amalni topa olaman",
          "GuardDuty topilmasini tahlil qila olaman",
        ], [r.docs('AWS CloudTrail', 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/'), skillbuilder]),
      ]),
      mod('c2-hujum', 'Hujum va tekshiruv', [
        topic('bulut-misconfig', 'Keng tarqalgan xatolar va hujumlar', 24, "Ochiq bucket, metadata xizmati (SSRF → kalit), sizib chiqqan kalitlar.", [
          "flaws.cloud ning barcha darajalarini yechdim",
          "IMDS orqali kalit o'g'irlash qanday ishlashini va himoyasini bilaman",
        ], [r.lab('flaws.cloud', 'http://flaws.cloud/'), r.lab('CloudGoat', 'https://github.com/RhinoSecurityLabs/cloudgoat')]),
        topic('cspm-benchmarks', 'CIS Benchmarks va holatni tekshirish', 14, "Prowler, ScoutSuite: akkauntni avtomatik audit qilish.", [
          "Prowler ishga tushirib, natijani ustuvorlik bo'yicha saralay olaman",
          "Topilmalarni tuzatish rejasini tuza olaman",
        ], [r.tool('Prowler', 'https://github.com/prowler-cloud/prowler'), cis]),
        topic('bulut-sirlari', 'Sirlarni boshqarish', 10, "Secrets Manager, Parameter Store, kalitlarni almashtirish.", [
          "Ilova sirlarini kodda emas, sir omborida saqlay olaman",
        ], [r.docs('AWS Secrets Manager', 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/'), r.docs('OWASP — Secrets Management Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html')]),
      ]),
    ],
  },

  {
    id: 'c3-konteyner',
    track: 'cloud',
    title: 'Konteynerlar va avtomatlashtirish',
    summary: "Zamonaviy infratuzilma kod bilan quriladi va konteynerda ishlaydi.",
    outcome: "Docker va Kubernetes muhitini himoyalaysiz, infratuzilmani Terraform bilan yozib, xavfsizligini avtomatik tekshirasiz.",
    modules: [
      mod('c3-konteyner', 'Konteynerlar', [
        topic('docker', 'Docker', 16, "Image, konteyner, Dockerfile, tarmoq, volume, compose.", [
          "Ilovamni konteynerga joylay olaman",
          "Docker Compose bilan ko'p xizmatli muhit ko'tara olaman",
        ], [r.docs('Docker — Get Started', 'https://docs.docker.com/get-started/'), r.thm('Intro to Docker')]),
        topic('docker-xavfsizligi', 'Docker xavfsizligi', 14, "Root'siz ishlatish, minimal image, skanerlash, konteynerdan chiqib ketish.", [
          "Dockerfile'ni xavfsizlik tamoyillari bilan yoza olaman",
          "Trivy bilan image skanerlay olaman",
          "Privileged konteyner xavfini namoyish qila olaman",
        ], [r.docs('Docker — Security', 'https://docs.docker.com/engine/security/'), r.docs('OWASP — Docker Security Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html')]),
        topic('kubernetes-asoslari', 'Kubernetes asoslari', 24, "Pod, deployment, service, ingress, namespace, kubectl.", [
          "Lokal klasterda (kind/minikube) ilova joylay olaman",
          "Asosiy obyektlarni YAML bilan yoza olaman",
        ], [r.docs('Kubernetes — Tutorials', 'https://kubernetes.io/docs/tutorials/'), k8sDocs]),
        topic('kubernetes-xavfsizligi', 'Kubernetes xavfsizligi', 22, "RBAC, network policy, Pod Security, sirlar, admission control.", [
          "RBAC rolini eng kam imtiyoz bilan yoza olaman",
          "Network policy bilan podlarni ajrata olaman",
          "kube-bench natijasini tahlil qila olaman",
        ], [r.docs('Kubernetes — Security', 'https://kubernetes.io/docs/concepts/security/'), r.docs('OWASP Kubernetes Top Ten', 'https://owasp.org/www-project-kubernetes-top-ten/')]),
      ]),
      mod('c3-iac', 'Kod sifatida infratuzilma', [
        topic('terraform', 'Terraform', 18, "Provider, resurs, state, modul.", [
          "VPC + server infratuzilmasini Terraform bilan yozdim",
          "State faylida sirlar bo'lishi mumkinligini va uni himoyalashni bilaman",
        ], [r.docs('Terraform — Tutorials', 'https://developer.hashicorp.com/terraform/tutorials'), awsDocs]),
        topic('iac-skanerlash', 'IaC va konveyer xavfsizligi', 16, "Checkov/tfsec, policy as code, CI/CD'da tekshiruvlar.", [
          "Terraform kodini skanerlab, topilmalarni tuzata olaman",
          "Tekshiruvni CI'ga ulay olaman",
        ], [r.tool('Checkov', 'https://www.checkov.io/'), r.docs('OWASP Top 10 CI/CD Security Risks', 'https://owasp.org/www-project-top-10-ci-cd-security-risks/')]),
      ]),
    ],
  },

  {
    id: 'c4-professional',
    track: 'cloud',
    title: 'Professional daraja',
    summary: "Bulutda insidentga javob, zero trust, standartlar, sertifikat va portfolio.",
    outcome: "Bulut xavfsizligi muhandisi lavozimiga tayyorsiz: loyihangiz, sertifikatingiz va amaliy tajribangiz bor.",
    modules: [
      mod('c4-chuqur', 'Chuqurlashish', [
        topic('bulut-ir', 'Bulutda insidentga javob', 14, "Sizib chiqqan kalit, buzilgan instans: cheklash va tergov.", [
          "Sizib chiqqan kalit uchun javob rejasini bajara olaman",
          "CloudTrail asosida vaqt chizig'ini tuza olaman",
        ], [r.docs('AWS Security Incident Response Guide', 'https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/'), r.lab('flaws2.cloud', 'http://flaws2.cloud/')]),
        topic('zero-trust', 'Zero trust va identifikatsiya', 10, "Hech kimga sukut bo'yicha ishonmaslik; SSO, shartli kirish.", [
          "Zero trust tamoyillarini tushuntira olaman",
        ], [r.docs('NIST SP 800-207 — Zero Trust Architecture', 'https://csrc.nist.gov/pubs/sp/800/207/final'), r.article('Cloudflare — Zero Trust', 'https://www.cloudflare.com/learning/security/glossary/what-is-zero-trust/')]),
        topic('compliance', 'Standartlar va muvofiqlik', 10, "ISO 27001, SOC 2, PCI DSS, NIST CSF — muhandis nimani bilishi kerak.", [
          "Asosiy standartlar nimani talab qilishini umumiy bilaman",
          "Nazorat (control) va dalil (evidence) nima ekanini tushunaman",
        ], [r.docs('NIST Cybersecurity Framework', 'https://www.nist.gov/cyberframework'), r.docs('CIS Controls', 'https://www.cisecurity.org/controls')]),
      ]),
      mod('c4-kasb', 'Kasbga tayyorgarlik', [
        topic('cloud-portfolio', 'Portfolio loyihasi', 24, "Terraform bilan qurilgan, himoyalangan, monitoring qilingan va hujjatlashtirilgan infratuzilma.", [
          "Loyiham GitHub'da sxema va tushuntirish bilan turibdi",
          "Prowler/Checkov hisobotida jiddiy topilma qolmagan",
        ], [r.docs('AWS Well-Architected — Security Pillar', 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html'), cis]),
        topic('cloud-sertifikat', 'Sertifikatga tayyorgarlik', 12, "AWS Cloud Practitioner → Solutions Architect Associate → Security Specialty yoki AZ-500.", [
          "Sertifikat rejamni tuzdim",
          "Sinov testlaridan barqaror 85%+ olaman",
        ], [r.docs('AWS Certification', 'https://aws.amazon.com/certification/'), skillbuilder]),
      ]),
    ],
  },
];
