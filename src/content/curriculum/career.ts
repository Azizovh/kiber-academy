import type { Stage } from '../types';
import { mod, r, topic } from './helpers';

export const CAREER: Stage[] = [
  {
    id: 'k1-karyera',
    track: 'career',
    title: 'Karyera: ishga kirish',
    summary: "Bilim — yarim ish. Uni ko'rsata olish, hujjatlashtirish va suhbatda isbotlash kerak.",
    outcome: "Portfolio, rezyume va tayyorgarlik rejangiz bor; vakansiyalarga ishonch bilan hujjat topshirasiz.",
    modules: [
      mod('k1-bozor', 'Bozor', [
        topic('ish-bozori', 'Ish bozori va lavozimlar', 3, "Junior lavozimlar, talablar, maosh oraliqlari, masofaviy ish.", [
          "O'z yo'nalishim bo'yicha 10 ta vakansiyani tahlil qildim",
          "Eng ko'p so'raladigan ko'nikmalar ro'yxatini tuzdim",
        ], [r.article('roadmap.sh — Cyber Security', 'https://roadmap.sh/cyber-security'), r.tool('CyberSeek — kasblar yo\'li', 'https://www.cyberseek.org/pathway.html')]),
        topic('sertifikatlar-xaritasi', 'Sertifikatlar yo\'l xaritasi', 3, "Qaysi sertifikat qachon kerak va qaysi biri pulga arziydi.", [
          "Yo'nalishim uchun 1–2 ta birinchi sertifikatni tanladim",
          "Narxi, formati va tayyorgarlik muddatini bilaman",
        ], [r.article('Paul Jerimy — Security Certification Roadmap', 'https://pauljerimy.com/security-certification-roadmap/'), r.docs('CompTIA Security+', 'https://www.comptia.org/certifications/security')]),
      ]),
      mod('k1-tayyorgarlik', 'O\'zingizni ko\'rsatish', [
        topic('portfolio-va-github', 'Portfolio va GitHub', 10, "Loyihalar, writeup'lar, blog: ish beruvchi ko'ra oladigan dalillar.", [
          "GitHub profilimda kamida 3 ta hujjatlashtirilgan loyiha bor",
          "Kamida 5 ta writeup yozdim",
        ], [r.docs('GitHub — profil README', 'https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme'), r.lab('CTFtime — musobaqalar taqvimi', 'https://ctftime.org/')]),
        topic('rezyume', 'Rezyume', 5, "Bir sahifa, natijalar bilan, vakansiyaga moslab.", [
          "Bir sahifali rezyume tayyorladim",
          "Uni kamida bir kishiga ko'rsatib, fikr oldim",
        ], [r.article('Google — rezyume bo\'yicha tavsiyalar', 'https://www.google.com/about/careers/applications/how-we-hire/'), r.tool('Overleaf — rezyume shablonlari', 'https://www.overleaf.com/latex/templates/tagged/cv')]),
        topic('linkedin-va-hamjamiyat', 'LinkedIn va hamjamiyat', 4, "Profil, tarmoq, konferensiyalar, mahalliy hamjamiyatlar.", [
          "LinkedIn profilimni to'ldirdim",
          "Kamida bitta hamjamiyat yoki tadbirga qo'shildim",
        ], [r.article('LinkedIn', 'https://www.linkedin.com/'), r.lab('CTFtime', 'https://ctftime.org/')]),
      ]),
      mod('k1-ishga-kirish', 'Ishga kirish', [
        topic('ish-qidirish', 'Ish qidirish strategiyasi', 4, "Qayerdan qidirish, qanday murojaat qilish, amaliyot (internship) va birinchi tajriba.", [
          "Haftalik murojaat rejam bor",
          "Murojaatlarimni jadvalda kuzatib boraman",
        ], [r.article('LinkedIn Jobs', 'https://www.linkedin.com/jobs/'), r.lab('HackerOne — tajriba uchun', 'https://hackerone.com/')]),
        topic('intervyu-tayyorgarlik', 'Intervyuga tayyorgarlik', 8, "Texnik savollar, amaliy topshiriq, xulq-atvor savollari.", [
          "Intervyu bazasidagi savollarning ko'piga javob bera olaman",
          "O'zim haqimda 2 daqiqalik hikoyam tayyor",
          "Kamida bitta sinov intervyusidan o'tdim",
        ], [r.article('Daniel Miessler — InfoSec interview questions', 'https://danielmiessler.com/p/infosec-interview-questions'), r.thm('SOC yoki Pentest yo\'llaridagi yakuniy xonalar')]),
        topic('birinchi-90-kun', 'Birinchi 90 kun va doimiy o\'sish', 3, "Yangi ishda o'zini tutish, o'rganishni davom ettirish, charchab qolmaslik.", [
          "Keyingi 12 oyga o'sish rejam bor",
        ], [r.article('SANS — Reading Room', 'https://www.sans.org/white-papers/'), r.video('John Hammond', 'https://www.youtube.com/@_JohnHammond')]),
      ]),
    ],
  },
];
