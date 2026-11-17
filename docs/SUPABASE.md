# Akkaunt va bulut sinxronini yoqish

Bu yo'riqnoma bir marta bajariladi (taxminan 20–30 daqiqa). Kalitlar qo'shilmaguncha sayt va ish stoli ilovasi
avvalgidek, akkauntsiz ishlayveradi.

**Nima kerak:** Supabase akkaunti (bepul), Google akkaunti (Google orqali kirish uchun), Vercel'dagi loyihangiz.

**Render yoki boshqa server kerak emas.** Sayt Vercel'da statik ishlaydi, akkauntlar va ma'lumotlar bazasi esa
Supabase'da. Ikkalasi yetarli.

---

## 1. Supabase loyihasini ochish

1. <https://supabase.com> → **Start your project** → GitHub yoki email bilan kiring.
2. **New project**: nomi `kiberakademiya`, kuchli **Database Password** yarating (saqlab qo'ying), region —
   sizga yaqini (masalan, Frankfurt — `eu-central-1`).
3. Loyiha tayyor bo'lishini 1–2 daqiqa kuting.

## 2. Jadvallarni yaratish

1. Chap menyu → **SQL Editor** → **New query**.
2. Loyihadagi `supabase/schema.sql` faylining **butun** matnini nusxalab, shu yerga qo'ying → **Run**.
3. "Success. No rows returned" chiqishi kerak. Chap menyu → **Table Editor** da `profiles` va `user_state` jadvallari
   paydo bo'ladi.

## 3. Kalitlarni olish

**Project Settings** (tishli g'ildirak) → **API** (yoki **Data API** / **API Keys**):

| Nima | Qayerga |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `VITE_SUPABASE_URL` |
| **anon public** kalit (`eyJ...` yoki `sb_publishable_...`) | `VITE_SUPABASE_ANON_KEY` |

> `service_role` / `secret` kalitni **hech qachon** saytga yoki GitHub'ga qo'ymang. Faqat **anon/publishable** kalit
> kerak — u brauzerda ko'rinishi normal, ma'lumotlarni jadvallardagi qoidalar (RLS) himoya qiladi.

## 4. Manzillarni ruxsat etish

**Authentication → URL Configuration**:

- **Site URL:** `https://cbersecurity-learning-platform.vercel.app/`
- **Redirect URLs** ga qo'shing:
  - `https://cbersecurity-learning-platform.vercel.app/**`
  - `http://localhost:5183/**` (kompyuterda `npm run dev` uchun)

## 5. Email bilan kirish

**Authentication → Sign In / Providers → Email** — yoqilgan bo'lsin (odatda standart holatda yoqiq).
**Confirm email** yoqiq qolsin: ro'yxatdan o'tgan odam emailini tasdiqlaydi.

> Bepul rejada Supabase soatiga bir necha xatgina yuboradi. Ko'p foydalanuvchi bo'lsa, keyinroq
> **Authentication → Emails → SMTP Settings** da o'z pochta xizmatingizni ulang.

## 6. Google orqali kirish

**a) Google Cloud'da kalit yaratish**

1. <https://console.cloud.google.com> → yuqorida loyiha tanlash → **New project** → nomi `KiberAkademiya`.
2. **APIs & Services → OAuth consent screen** (yoki **Google Auth Platform → Branding**):
   - User type: **External**; App name: `KiberAkademiya`; support email — o'zingizniki.
   - **Audience** bo'limida ilovani **Publish** qiling (aks holda faqat test foydalanuvchilar kira oladi).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins:** `https://cbersecurity-learning-platform.vercel.app`
   - **Authorized redirect URIs:** Supabase ko'rsatadigan manzil — `https://xxxx.supabase.co/auth/v1/callback`
     (keyingi qadamda Supabase'da shu manzil yozilgan bo'ladi; `xxxx` — sizning loyihangiz).
4. **Create** → **Client ID** va **Client secret** ni nusxalang.

**b) Supabase'ga ulash**

**Authentication → Sign In / Providers → Google** → yoqing → Client ID va Client Secret ni qo'ying → **Save**.
Shu sahifadagi **Callback URL** ni yuqoridagi 3-qadamga qo'yganingizni tekshiring.

## 7. Vercel'ga kalitlarni qo'shish

Vercel → loyihangiz → **Settings → Environment Variables** → uchtasini qo'shing (Production, Preview, Development):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | 3-qadamdagi Project URL |
| `VITE_SUPABASE_ANON_KEY` | 3-qadamdagi anon kalit |
| `VITE_SITE_URL` | `https://cbersecurity-learning-platform.vercel.app/` |

Keyin **Deployments → oxirgi deploy → ⋯ → Redeploy**. (Vite kalitlarni yig'ish paytida o'qiydi, shuning uchun
qayta deploy shart.)

Saytni oching → chap menyuda **Kirish** paydo bo'ladi.

## 8. Ish stoli ilovasi uchun

Loyiha papkasida `.env.example` dan nusxa olib, `.env` nomli fayl yarating va o'sha uchta qiymatni yozing. Keyin:

```bash
npm run build
```

`.env` GitHub'ga yuklanmaydi (`.gitignore` da). Ish stolida faqat email va parol bilan kirish bor — Google bilan ochilgan
akkaunt uchun saytda "Parolni unutdingizmi?" orqali parol o'rnating.

## 9. O'zingizni admin qilish

1. Saytda bir marta ro'yxatdan o'ting (yoki Google bilan kiring).
2. Supabase → **SQL Editor** → yangi so'rov:

   ```sql
   update public.profiles set is_admin = true where email = 'sizning@email.com';
   ```

3. Saytda **Akkaunt** sahifasini yangilang — **Admin panel** tugmasi chiqadi.

Admin huquqini faqat shu SQL orqali berish mumkin: ilovaning o'zidan hech kim o'zini admin qila olmaydi.

---

## Qanday ishlaydi (qisqacha)

- Akkaunt **ixtiyoriy**. Kirmagan foydalanuvchi uchun hammasi avvalgidek, faqat shu qurilmada.
- Kirganda shu qurilmadagi progress akkauntga **qo'shiladi**; bulutdagi bilan birlashtiriladi (hech narsa yo'qolmaydi).
- Har bir o'zgarish 2–3 soniyadan keyin bulutga saqlanadi; boshqa qurilmadagi o'zgarishlar sahifaga qaytganda olinadi.
- "Chiqish" bosilganda progress bulutda qoladi, qurilmadan esa o'chiriladi.
- Sozlamalardagi "Barcha progressni tozalash" kirgan holatda bulutdagi nusxani ham tozalaydi.

## Muammolar

| Belgi | Sabab va yechim |
|---|---|
| Menyuda "Kirish" yo'q | Vercel'da kalitlar qo'shilmagan yoki qayta deploy qilinmagan |
| Google bosilganda `redirect_uri_mismatch` | Google Cloud'dagi redirect URI Supabase'dagi Callback URL bilan bir xil emas |
| Google'dan keyin bosh sahifaga qaytdi, lekin kirmadi | Supabase → URL Configuration → Redirect URLs da sayt manzili yo'q |
| "Email hali tasdiqlanmagan" | Pochtadagi (Spam ham) tasdiqlash havolasini bosing |
| Akkaunt sahifasida "relation ... does not exist" | 2-qadamdagi `schema.sql` ishga tushirilmagan |
| Admin panelda faqat o'zingiz ko'rinasiz | `is_admin` hali `true` emas — 9-qadam |
