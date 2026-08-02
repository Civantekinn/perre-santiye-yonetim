# Perre Şantiye Yönetim Sistemi

Çok-şantiyeli personel, malzeme ve maliyet takip uygulaması.

**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Tailwind · Recharts · Firebase (yedek) · Yerel Excel yedek

Arayüz %100 Türkçe.

---

## Hızlı kurulum

### 1. Bağımlılıklar

```bash
cd "C:\Users\Civan Tekin\Projects\perre-santiye-yonetim"
npm install
```

### 2. Supabase

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluşturun.
2. SQL Editor’de önerilen tek paket olarak `supabase/KURULUM_HEPSI.sql` dosyasını çalıştırın. Ayrı migration çalıştıracaksanız sıra:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_audit_triggers.sql`
   - `supabase/migrations/003_rls.sql`
   - `supabase/migrations/004_perf_santiye.sql`
   - `supabase/migrations/004_webhook_notlari.sql`
   - `supabase/migrations/005_katmanlar.sql`
   - `supabase/migrations/006_fix_handle_new_user.sql`
   - `supabase/migrations/007_santiye_yazma.sql`
   - `supabase/migrations/008_santiye_olustur.sql`
   - `supabase/migrations/009_temiz_baslangic.sql`
   - `supabase/migrations/010_santiye_audit.sql`
   - `supabase/migrations/011_malzeme_tur_belge.sql`
   - `supabase/migrations/012_sirket_finans_ozeti.sql`
   - `supabase/migrations/013_gezinme_performans.sql`
   - `supabase/migrations/014_ofis_puantaj.sql`
   - `supabase/migrations/015_ofis_yazma_izinleri.sql`
   - `supabase/migrations/016_santiye_is_gorselleri.sql`
   - `supabase/migrations/017_santiye_personel_iletisim.sql`
   - `supabase/migrations/018_sirket_risk_duzeltmeleri.sql`
   - `supabase/seed.sql` (auth trigger)
   - `supabase/seed-data.sql` (örnek şantiye/personel/puantaj)
3. Authentication → Users → Add user ile ilk kullanıcıyı oluşturun.
4. SQL Editor’de admin profili atayın:

```sql
insert into public.profiller (id, ad_soyad, rol)
select id, coalesce(raw_user_meta_data->>'ad_soyad', email), 'admin'
from auth.users
order by created_at
limit 1
on conflict (id) do update set rol = 'admin';
```

### 3. Ortam değişkenleri

`.env.local.example` dosyasını `.env.local` olarak kopyalayın ve doldurun:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### 4. Uygulamayı çalıştırın

```bash
npm run dev
```

Tarayıcı: http://localhost:3000 → `/giris`

---

## Roller

| Rol | Yetki |
|-----|--------|
| `admin` | Tam erişim, silme |
| `muhasebe` | Ödeme + gelir-gider (tüm şantiyeler) |
| `santiye_sefi` | Atandığı şantiyede puantaj + malzeme (tüm tipler) |
| `depo_sorumlusu` | Malzeme hareketi + eksik karşılama |
| `saha_gorevlisi` | İşçi maaşı + gelen malzeme (fotoğraf) |

---

## Sayfalar

- `/` — Dashboard (rol bazlı)
- `/santiyeler` — Şantiye kartları
- `/santiyeler/[id]` — Sekmeli panel (Genel / Puantaj / Malzeme / Ödemeler / Gelir-Gider)
- `/eksik-malzemeler` — Bekleyen eksikler (admin, depo)
- `/odemeler` — Şef/personel ödemeleri
- `/saha` — Saha görevlisi paneli
- `/raporlar` — Maliyet raporu + grafik
- `/audit` — Denetim kaydı
- `/yedekleme` — 3 katmanlı yedek durumu

---

## Yedekleme (3 katman)

### Katman 1 — Supabase
Ana veritabanı + soft-delete + audit_log.

### Katman 2 — Firebase
1. Firebase Console’da proje açın, servis hesabı JSON alın.
2. `.env.local` içine `FIREBASE_*` değerlerini yazın.
3. Supabase → Database → Webhooks: şu tablolarda INSERT/UPDATE için  
   `https://SIZIN_DOMAIN/api/webhook/firebase-yedek`  
   hedefleyin: `puantaj`, `malzeme_hareket`, `isci_maas_odemeleri`, `odemeler`, `gelir_gider`.

### Katman 3 — Yerel Excel

```bash
cd yedek-servisi
npm install
copy .env.example .env   # doldurun
npm start
```

İlk açılışta yedek klasörü seçilir. Windows başlangıcına eklemek için:

```bash
npm run kurulum-baslangic
```

---

## Realtime

Puantaj ekranında Supabase Realtime aboneliği açıktır. Supabase Dashboard → Database → Replication’da ilgili tabloları yayınlayın.
