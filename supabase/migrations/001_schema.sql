-- Perre Şantiye Yönetim Sistemi — Ana şema
-- Tüm tablolar + toplam_maliyet_raporu görünümü

-- Şantiyeler
create table if not exists public.santiyeler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  adres text,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- Kullanıcılar (Supabase auth.users ile ilişkili)
create table if not exists public.profiller (
  id uuid primary key references auth.users(id) on delete cascade,
  ad_soyad text not null,
  rol text not null check (rol in ('admin','muhasebe','santiye_sefi','depo_sorumlusu','saha_gorevlisi')),
  created_at timestamptz default now()
);

-- Kullanıcı - Şantiye ataması (many-to-many)
create table if not exists public.kullanici_santiye (
  kullanici_id uuid references public.profiller(id) on delete cascade,
  santiye_id uuid references public.santiyeler(id) on delete cascade,
  primary key (kullanici_id, santiye_id)
);

-- Personel (işçiler)
create table if not exists public.personeller (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  pozisyon text,
  gunluk_ucret numeric,
  santiye_id uuid references public.santiyeler(id) on delete set null,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- Puantaj (günlük devam/yemek kaydı)
create table if not exists public.puantaj (
  id uuid primary key default gen_random_uuid(),
  personel_id uuid references public.personeller(id) on delete cascade,
  tarih date not null,
  geldi_mi boolean not null,
  yemek_yedi_mi boolean,
  notlar text,
  giren_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (personel_id, tarih)
);

-- Malzemeler (tanım tablosu)
create table if not exists public.malzemeler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  birim text,
  santiye_id uuid references public.santiyeler(id) on delete cascade
);

-- Malzeme hareketleri
create table if not exists public.malzeme_hareket (
  id uuid primary key default gen_random_uuid(),
  malzeme_id uuid references public.malzemeler(id) on delete cascade,
  tip text check (tip in ('giris','cikis','fazla','eksik')) not null,
  miktar numeric not null,
  birim_fiyat numeric,
  tutar numeric generated always as (miktar * coalesce(birim_fiyat, 0)) stored,
  tarih date not null,
  aciklama text,
  belge_url text,
  durum text check (durum in ('bekliyor','karsilandi','iptal')) default 'bekliyor',
  karsilanma_tarihi date,
  karsilayan_kullanici_id uuid references public.profiller(id),
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- İşçiye yapılan maaş ödemesi (saha_gorevlisi)
create table if not exists public.isci_maas_odemeleri (
  id uuid primary key default gen_random_uuid(),
  personel_id uuid references public.personeller(id) not null,
  santiye_id uuid references public.santiyeler(id) not null,
  donem_baslangic date not null,
  donem_bitis date not null,
  gun_sayisi int,
  tutar numeric not null,
  odeme_tarihi date,
  odendi_mi boolean default false,
  aciklama text,
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Ödemeler (kayıt tutan personele/şefe yapılan ödeme)
create table if not exists public.odemeler (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references public.profiller(id),
  tutar numeric not null,
  donem_baslangic date,
  donem_bitis date,
  odendi_mi boolean default false,
  odeme_tarihi date,
  aciklama text,
  silindi boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Genel gelir-gider
create table if not exists public.gelir_gider (
  id uuid primary key default gen_random_uuid(),
  santiye_id uuid references public.santiyeler(id),
  tip text check (tip in ('gelir','gider')) not null,
  kategori text,
  tutar numeric not null,
  tarih date not null,
  aciklama text,
  silindi boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Audit log
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tablo_adi text not null,
  kayit_id uuid not null,
  islem text check (islem in ('insert','update','delete')) not null,
  eski_veri jsonb,
  yeni_veri jsonb,
  yapan_kullanici_id uuid references public.profiller(id),
  created_at timestamptz default now()
);

-- Yedekleme durumu (yerel servis + Firebase senkron bilgisi)
create table if not exists public.yedekleme_durumu (
  id uuid primary key default gen_random_uuid(),
  katman text not null check (katman in ('firebase','yerel')),
  tablo_adi text,
  kayit_sayisi bigint default 0,
  son_senkron timestamptz,
  durum text default 'aktif',
  mesaj text,
  updated_at timestamptz default now()
);

-- TOPLAM MALİYET GÖRÜNÜMÜ
create or replace view public.toplam_maliyet_raporu as
select
  s.id as santiye_id,
  s.ad as santiye_adi,
  coalesce((
    select sum(tutar) from public.isci_maas_odemeleri
    where santiye_id = s.id and coalesce(silindi, false) = false
  ), 0) as iscilik_maliyeti,
  coalesce((
    select sum(mh.tutar) from public.malzeme_hareket mh
    join public.malzemeler m on mh.malzeme_id = m.id
    where m.santiye_id = s.id and coalesce(mh.silindi, false) = false
      and mh.tip in ('giris', 'fazla')
  ), 0) as malzeme_maliyeti,
  coalesce((
    select sum(tutar) from public.gelir_gider
    where santiye_id = s.id and tip = 'gider' and coalesce(silindi, false) = false
  ), 0) as genel_gider,
  coalesce((
    select sum(tutar) from public.gelir_gider
    where santiye_id = s.id and tip = 'gelir' and coalesce(silindi, false) = false
  ), 0) as genel_gelir
from public.santiyeler s;

-- Yardımcı: kullanıcının rolünü getir
create or replace function public.kullanici_rolu()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiller where id = auth.uid();
$$;

-- Yardımcı: kullanıcının atandığı şantiyeler
create or replace function public.kullanici_santiye_idler()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select santiye_id from public.kullanici_santiye where kullanici_id = auth.uid();
$$;

-- İndeksler
create index if not exists idx_puantaj_tarih on public.puantaj(tarih);
create index if not exists idx_puantaj_personel on public.puantaj(personel_id);
create index if not exists idx_malzeme_hareket_tip on public.malzeme_hareket(tip);
create index if not exists idx_malzeme_hareket_durum on public.malzeme_hareket(durum);
create index if not exists idx_personeller_santiye on public.personeller(santiye_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

-- Storage bucket: malzeme-belgeleri
insert into storage.buckets (id, name, public)
values ('malzeme-belgeleri', 'malzeme-belgeleri', false)
on conflict (id) do nothing;
