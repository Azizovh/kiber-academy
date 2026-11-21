import type { Stage } from '../types';
import { mod, r, topic } from './helpers';

const cheat = r.docs('OWASP Cheat Sheet Series', 'https://cheatsheetseries.owasp.org/');
const asvs = r.docs('OWASP ASVS', 'https://owasp.org/www-project-application-security-verification-standard/');

export const APPSEC: Stage[] = [
  {
    id: 'a1-web-chuqur',
    track: 'appsec',
    title: 'Web ilova ichidan',
    summary: "Himoya qilish uchun avval qura olish kerak: ilova arxitekturasi, brauzer modeli, autentifikatsiya.",
    outcome: "Kichik web ilovani o'zingiz yozasiz va uning har bir qatlami qanday ishlashini tushunasiz.",
    modules: [
      mod('a1-arxitektura', 'Arxitektura', [
        topic('web-ilova-arxitekturasi', 'Web ilova arxitekturasi', 10, "Frontend, backend, baza, kesh, navbat, API — ma'lumot oqimi.", [
          "Zamonaviy web ilova sxemasini chizib bera olaman",
          "Ishonch chegarasi (trust boundary) nima ekanini bilaman",
        ], [r.docs('MDN — Server-side web development', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side'), r.course('CS50W — Web dasturlash', 'https://cs50.harvard.edu/web/')]),
        topic('backend-amaliyot', 'Backend amaliyot: o\'z ilovangiz', 30, "Flask/Express'da ro'yxatdan o'tish, login, CRUD va baza bilan ilova yozish.", [
          "Login va ma'lumotlar bazasi bor ilova yozdim",
          "ORM va tayyorlangan so'rov (prepared statement) ishlataman",
          "Ilovamni GitHub'ga joyladim",
        ], [r.docs('Flask — tutorial', 'https://flask.palletsprojects.com/en/stable/tutorial/'), r.course('CS50W', 'https://cs50.harvard.edu/web/')]),
        topic('http-chuqur', 'HTTP chuqur: cookie, CORS, keshlash', 12, "Sarlavhalar, cookie atributlari, CORS, kesh.", [
          "Cookie'ning Secure, HttpOnly, SameSite atributlarini tushuntira olaman",
          "CORS qanday ishlashini va noto'g'ri sozlash xavfini bilaman",
        ], [r.docs('MDN — HTTP', 'https://developer.mozilla.org/en-US/docs/Web/HTTP'), r.ps('CORS', 'cors')], { labs: ['http-tekshiruvi'], ctf: ['web-headers'] }),
        topic('brauzer-xavfsizlik-modeli', 'Brauzer xavfsizlik modeli', 10, "Same-Origin Policy, CSP, sandbox, xavfsizlik sarlavhalari.", [
          "Same-Origin Policy ni misol bilan tushuntira olaman",
          "CSP siyosati yozib, sinay olaman",
        ], [r.docs('MDN — Web security', 'https://developer.mozilla.org/en-US/docs/Web/Security'), r.tool('Security Headers tekshiruvi', 'https://securityheaders.com/')]),
        topic('auth-mexanizmlari', 'Autentifikatsiya mexanizmlari', 16, "Sessiya, JWT, OAuth 2.0, OpenID Connect, SSO.", [
          "Sessiya va token asosidagi auth farqini bilaman",
          "OAuth authorization code oqimini chizib bera olaman",
          "Parolni to'g'ri saqlashni (argon2/bcrypt) bilaman",
        ], [cheat, r.ps('OAuth', 'oauth')], { ctf: ['web-jwt'] }),
      ]),
    ],
  },

  {
    id: 'a2-zaifliklar',
    track: 'appsec',
    title: 'Zaifliklar va ularning himoyasi',
    summary: "Har bir zaiflik: qanday paydo bo'ladi, qanday topiladi va kodda qanday tuzatiladi.",
    outcome: "OWASP Top 10 zaifliklarini kodda topasiz, tuzatasiz va dasturchiga tushuntirib bera olasiz.",
    modules: [
      mod('a2-top10', 'OWASP Top 10', [
        topic('as-injection', 'Injection va uning himoyasi', 14, "SQL, NoSQL, OS command, LDAP; parametrlangan so'rovlar.", [
          "Zaif kodni ko'rib, injection nuqtasini topa olaman",
          "Uni parametrlangan so'rov bilan tuzata olaman",
        ], [r.ps('SQL injection', 'sql-injection'), cheat], { labs: ['kod-xavfsizligi', 'python-sql-injection'], ctf: ['web-code-review', 'git-blame', 'py-code-review'] }),
        topic('as-xss-csp', 'XSS, output encoding va CSP', 14, "Kontekstga mos kodlash, sanitizatsiya, CSP.", [
          "Har bir kontekst (HTML, atribut, JS, URL) uchun to'g'ri kodlashni bilaman",
          "Freymvorklarning avtomatik himoyasi qayerda ishlamasligini bilaman",
        ], [r.ps('Cross-site scripting', 'cross-site-scripting'), cheat]),
        topic('as-csrf', 'CSRF va himoyasi', 8, "Token, SameSite, qayta autentifikatsiya.", [
          "CSRF himoyasini ilovamga qo'sha olaman",
        ], [r.ps('CSRF', 'csrf'), cheat]),
        topic('as-access-control', 'Kirish nazorati dizayni', 14, "RBAC, ABAC, server tomonda tekshirish, IDOR'ning oldini olish.", [
          "Markazlashgan avtorizatsiya qatlamini loyihalay olaman",
          "Har bir endpointda ruxsat tekshirilishini test bilan isbotlayman",
        ], [r.ps('Access control', 'access-control'), cheat], { labs: ['http-tekshiruvi'], ctf: ['web-authz', 'sql-foreign-notes'] }),
        topic('as-kripto-xatolar', 'Kriptografik xatolar', 10, "Zaif algoritm, qattiq kodlangan kalit, noto'g'ri tasodifiylik.", [
          "Kodda kriptografik xatolarni taniy olaman",
          "Kalit va sirlarni qayerda saqlashni bilaman",
        ], [r.docs('OWASP — Cryptographic Failures', 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/'), r.lab('CryptoHack', 'https://cryptohack.org/')]),
        topic('as-ssrf-deser', 'SSRF, deserialization, XXE', 14, "Server tomondagi murakkab zaifliklar va ularning himoyasi.", [
          "SSRF uchun allowlist himoyasini qura olaman",
          "Ishonchsiz ma'lumotni deserializatsiya qilish xavfini bilaman",
        ], [r.ps('SSRF', 'ssrf'), r.ps('Insecure deserialization', 'deserialization')]),
        topic('as-misconfig', 'Xavfsizlik konfiguratsiyasi xatolari', 8, "Standart parollar, ochiq debug, keraksiz xizmatlar, xato xabarlari.", [
          "Ilova va serverni mustahkamlash (hardening) ro'yxatim bor",
        ], [r.docs('OWASP — Security Misconfiguration', 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/'), cheat], { labs: ['http-tekshiruvi'] }),
        topic('as-biznes-mantiq', 'Biznes mantiq zaifliklari', 10, "Skaner topa olmaydigan xatolar: narx, miqdor, ketma-ketlik, poyga holati.", [
          "Ilova oqimida mantiqiy xatolarni izlay olaman",
          "Race condition nima ekanini bilaman",
        ], [r.ps('Business logic vulnerabilities', 'logic-flaws'), r.ps('Race conditions', 'race-conditions')]),
        topic('as-api-xavfsizligi', 'API xavfsizligi', 14, "OWASP API Top 10, rate limiting, sxema tekshiruvi.", [
          "BOLA va mass assignment'ni topib, tuzata olaman",
          "API uchun xavfsizlik talablarini yoza olaman",
        ], [r.docs('OWASP API Security Top 10', 'https://owasp.org/www-project-api-security/'), r.ps('API testing', 'api-testing')]),
        topic('as-secure-coding', 'Xavfsiz kod yozish amaliyoti', 24, "O'z ilovangizdagi zaifliklarni topib tuzatish va himoyalangan versiyasini yozish.", [
          "Zaif ilovani (masalan, DVWA yoki o'zimnikini) to'liq tuzatib chiqdim",
          "Har bir tuzatish uchun test yozdim",
        ], [r.lab('OWASP Juice Shop', 'https://owasp.org/www-project-juice-shop/'), r.course('OWASP Secure Coding Dojo', 'https://owasp.org/www-project-secure-coding-dojo/')]),
      ]),
    ],
  },

  {
    id: 'a3-ssdlc',
    track: 'appsec',
    title: 'Xavfsiz ishlab chiqish (SSDLC)',
    summary: "Xavfsizlikni ishlab chiqishning har bosqichiga kiritish: loyihalashdan kod tahlilgacha.",
    outcome: "Tahdid modelini tuzasiz, kodni ko'rib chiqasiz va avtomatik tahlil vositalarini sozlaysiz.",
    modules: [
      mod('a3-dizayn', 'Loyihalash', [
        topic('threat-modeling', 'Threat modeling', 16, "STRIDE, ma'lumot oqimi diagrammasi, hujum daraxti.", [
          "Ilova uchun DFD chiza olaman",
          "STRIDE bo'yicha tahdidlarni sanab, baholay olaman",
          "O'z ilovam uchun tahdid modelini tuzdim",
        ], [r.docs('OWASP — Threat Modeling', 'https://owasp.org/www-community/Threat_Modeling'), r.tool('OWASP Threat Dragon', 'https://owasp.org/www-project-threat-dragon/')]),
        topic('xavfsizlik-talablari', 'Xavfsizlik talablari va ASVS', 10, "Tekshirib bo'ladigan talablar yozish.", [
          "ASVS darajalarini bilaman",
          "Loyiha uchun xavfsizlik talablari ro'yxatini tuza olaman",
        ], [asvs, cheat]),
      ]),
      mod('a3-tahlil', 'Kod tahlili', [
        topic('secure-code-review', 'Xavfsiz kod ko\'rib chiqish', 24, "Manbadan sink'gacha kuzatish; pull request'da nimaga qarash kerak.", [
          "Notanish kodda xavfli funksiyalarni tez topa olaman",
          "Ochiq kodli loyihada kamida 3 ta zaiflikni topdim (yoki ma'lum CVE'larni tahlil qildim)",
        ], [r.docs('OWASP Code Review Guide', 'https://owasp.org/www-project-code-review-guide/'), r.lab('PentesterLab — kod tahlili mashqlari', 'https://pentesterlab.com/', "Bir qismi bepul.")], { ctf: ['web-code-review'] }),
        topic('sast', 'SAST: Semgrep va CodeQL', 18, "Statik tahlil, o'z qoidalaringizni yozish.", [
          "Semgrep'ni loyihada ishga tushirib, natijani saralay olaman",
          "O'z Semgrep qoidamni yozdim",
        ], [r.docs('Semgrep hujjatlari', 'https://semgrep.dev/docs/'), r.docs('CodeQL hujjatlari', 'https://codeql.github.com/docs/')], { labs: ['kod-xavfsizligi'] }),
        topic('dast', 'DAST: OWASP ZAP', 12, "Ishlab turgan ilovani avtomatik skanerlash.", [
          "ZAP bilan autentifikatsiyali skan o'tkaza olaman",
          "ZAP'ni CI'ga ulay olaman",
        ], [r.docs('ZAP hujjatlari', 'https://www.zaproxy.org/docs/'), r.thm('OWASP ZAP')]),
        topic('sca-supply-chain', 'SCA va ta\'minot zanjiri', 12, "Kutubxonalardagi zaifliklar, SBOM, dependency confusion.", [
          "Loyiha bog'liqliklarini skanerlab, yangilash rejasini tuza olaman",
          "SBOM nima ekanini bilaman",
        ], [r.tool('OWASP Dependency-Check', 'https://owasp.org/www-project-dependency-check/'), r.docs('OpenSSF Scorecard', 'https://securityscorecards.dev/')], { labs: ['kod-xavfsizligi'], ctf: ['npm-prod'] }),
        topic('secrets-management', 'Sirlarni boshqarish', 8, "Koddagi parollar, .env, vault, gitleaks.", [
          "Repozitoriydan sizib chiqqan sirlarni topa olaman",
          "Sirlarni xavfsiz saqlash usulini joriy qila olaman",
        ], [r.tool('Gitleaks', 'https://github.com/gitleaks/gitleaks'), cheat], { labs: ['git-sirlar'], ctf: ['git-deleted', 'git-stash', 'git-reflog'] }),
      ]),
    ],
  },

  {
    id: 'a4-devsecops',
    track: 'appsec',
    title: 'DevSecOps va professional daraja',
    summary: "Xavfsizlikni konveyerga o'rnatish, jamoa bilan ishlash, portfolio va sertifikat.",
    outcome: "CI/CD'ga xavfsizlik tekshiruvlarini o'rnatasiz, zaifliklarni boshqarasiz va AppSec muhandisi lavozimiga tayyorsiz.",
    modules: [
      mod('a4-pipeline', 'Konveyer', [
        topic('cicd-xavfsizligi', 'CI/CD xavfsizligi', 16, "GitHub Actions'da SAST, SCA, sir skaneri; konveyerning o'zini himoyalash.", [
          "Pull request'da avtomatik xavfsizlik tekshiruvlarini sozladim",
          "CI/CD'ga hujum usullarini bilaman",
        ], [r.docs('OWASP Top 10 CI/CD Security Risks', 'https://owasp.org/www-project-top-10-ci-cd-security-risks/'), r.docs('GitHub Actions — xavfsizlik', 'https://docs.github.com/en/actions/security-for-github-actions')]),
        topic('konteyner-xavfsizligi-appsec', 'Konteyner va IaC skanerlash', 14, "Docker image, Trivy, Checkov.", [
          "Dockerfile'ni xavfsiz yoza olaman",
          "Image va IaC fayllarni skanerlay olaman",
        ], [r.tool('Trivy', 'https://trivy.dev/'), r.docs('Docker — Security', 'https://docs.docker.com/engine/security/')], { labs: ['konteyner-auditi'], ctf: ['dockerfile-arg'] }),
        topic('mobil-xavfsizlik', 'Mobil ilova xavfsizligi asoslari', 14, "OWASP MASVS, statik va dinamik tahlilga kirish.", [
          "MASVS toifalarini bilaman",
          "APK'ni ochib, kodini ko'ra olaman",
        ], [r.docs('OWASP MAS', 'https://mas.owasp.org/'), r.tool('MobSF', 'https://github.com/MobSF/Mobile-Security-Framework-MobSF')]),
      ]),
      mod('a4-kasb', 'Kasbga tayyorgarlik', [
        topic('zaiflik-boshqaruvi', 'Zaifliklarni boshqarish va jamoa bilan ishlash', 10, "Ustuvorlik, SLA, dasturchilar bilan muloqot, security champions.", [
          "Topilmani dasturchiga tushunarli va tuzatish yo'li bilan yoza olaman",
          "Ustuvorlikni xavf asosida belgilay olaman",
        ], [r.docs('OWASP SAMM', 'https://owaspsamm.org/'), cheat]),
        topic('appsec-portfolio', 'Portfolio loyihasi', 20, "O'z ilovangiz: tahdid modeli + xavfsiz kod + CI tekshiruvlari + hisobot.", [
          "Loyiham GitHub'da to'liq hujjatlashtirilgan",
          "Ochiq kodli loyihaga xavfsizlik bo'yicha hissa qo'shdim yoki zaiflik haqida xabar berdim",
        ], [asvs, r.lab('HackerOne', 'https://hackerone.com/')]),
        topic('appsec-sertifikat', 'Sertifikat va keyingi qadamlar', 6, "Security+, keyin BSCP yoki CSSLP.", [
          "Sertifikat rejamni tuzdim",
        ], [r.docs('PortSwigger — BSCP sertifikati', 'https://portswigger.net/web-security/certification'), r.docs('CompTIA Security+', 'https://www.comptia.org/certifications/security')]),
      ]),
    ],
  },
];
