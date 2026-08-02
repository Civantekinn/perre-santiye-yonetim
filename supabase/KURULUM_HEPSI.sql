-- Perre Şantiye Yönetim — TEK SEFERDE KURULUM
-- Bu dosya scripts/rebuild-kurulum.js ile üretilir. Elle düzenlemeyin.
-- Üretim: 2026-07-30T13:31:30.954Z
-- Migration sayısı: 19

-- SECTION: supabase/migrations/001_schema.sql
-- ------------------------------------------------------------
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

-- SECTION: supabase/migrations/002_audit_triggers.sql
-- ------------------------------------------------------------
-- Audit log trigger fonksiyonu
-- Her insert/update/delete işleminde audit_log'a otomatik kayıt

create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kayit_id uuid;
  v_eski jsonb;
  v_yeni jsonb;
  v_islem text;
begin
  if tg_op = 'INSERT' then
    v_islem := 'insert';
    v_eski := null;
    v_yeni := to_jsonb(new);
    v_kayit_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_islem := 'update';
    v_eski := to_jsonb(old);
    v_yeni := to_jsonb(new);
    v_kayit_id := new.id;
  elsif tg_op = 'DELETE' then
    v_islem := 'delete';
    v_eski := to_jsonb(old);
    v_yeni := null;
    v_kayit_id := old.id;
  end if;

  insert into public.audit_log (tablo_adi, kayit_id, islem, eski_veri, yeni_veri, yapan_kullanici_id)
  values (tg_table_name, v_kayit_id, v_islem, v_eski, v_yeni, auth.uid());

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Trigger'ları bağla
drop trigger if exists trg_audit_santiyeler on public.santiyeler;
create trigger trg_audit_santiyeler
  after insert or update or delete on public.santiyeler
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_profiller on public.profiller;
create trigger trg_audit_profiller
  after insert or update or delete on public.profiller
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_personeller on public.personeller;
create trigger trg_audit_personeller
  after insert or update or delete on public.personeller
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_puantaj on public.puantaj;
create trigger trg_audit_puantaj
  after insert or update or delete on public.puantaj
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_malzemeler on public.malzemeler;
create trigger trg_audit_malzemeler
  after insert or update or delete on public.malzemeler
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_malzeme_hareket on public.malzeme_hareket;
create trigger trg_audit_malzeme_hareket
  after insert or update or delete on public.malzeme_hareket
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_isci_maas on public.isci_maas_odemeleri;
create trigger trg_audit_isci_maas
  after insert or update or delete on public.isci_maas_odemeleri
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_odemeler on public.odemeler;
create trigger trg_audit_odemeler
  after insert or update or delete on public.odemeler
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_gelir_gider on public.gelir_gider;
create trigger trg_audit_gelir_gider
  after insert or update or delete on public.gelir_gider
  for each row execute function public.audit_log_trigger();

-- updated_at otomatik güncelleme
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_upd_puantaj on public.puantaj;
create trigger trg_upd_puantaj before update on public.puantaj
  for each row execute function public.set_updated_at();

drop trigger if exists trg_upd_malzeme_hareket on public.malzeme_hareket;
create trigger trg_upd_malzeme_hareket before update on public.malzeme_hareket
  for each row execute function public.set_updated_at();

drop trigger if exists trg_upd_isci_maas on public.isci_maas_odemeleri;
create trigger trg_upd_isci_maas before update on public.isci_maas_odemeleri
  for each row execute function public.set_updated_at();

drop trigger if exists trg_upd_odemeler on public.odemeler;
create trigger trg_upd_odemeler before update on public.odemeler
  for each row execute function public.set_updated_at();

drop trigger if exists trg_upd_gelir_gider on public.gelir_gider;
create trigger trg_upd_gelir_gider before update on public.gelir_gider
  for each row execute function public.set_updated_at();

-- SECTION: supabase/migrations/003_rls.sql
-- ------------------------------------------------------------
-- Row Level Security politikaları

alter table public.santiyeler enable row level security;
alter table public.profiller enable row level security;
alter table public.kullanici_santiye enable row level security;
alter table public.personeller enable row level security;
alter table public.puantaj enable row level security;
alter table public.malzemeler enable row level security;
alter table public.malzeme_hareket enable row level security;
alter table public.isci_maas_odemeleri enable row level security;
alter table public.odemeler enable row level security;
alter table public.gelir_gider enable row level security;
alter table public.audit_log enable row level security;
alter table public.yedekleme_durumu enable row level security;

-- ========== PROFİLLER ==========
drop policy if exists "profiller_select" on public.profiller;
create policy "profiller_select" on public.profiller for select
  using (id = auth.uid() or public.kullanici_rolu() = 'admin');

drop policy if exists "profiller_update_self" on public.profiller;
create policy "profiller_update_self" on public.profiller for update
  using (id = auth.uid() or public.kullanici_rolu() = 'admin');

drop policy if exists "profiller_admin_insert" on public.profiller;
create policy "profiller_admin_insert" on public.profiller for insert
  with check (public.kullanici_rolu() = 'admin' or id = auth.uid());

drop policy if exists "profiller_admin_delete" on public.profiller;
create policy "profiller_admin_delete" on public.profiller for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== ŞANTİYELER ==========
drop policy if exists "santiyeler_select" on public.santiyeler;
create policy "santiyeler_select" on public.santiyeler for select
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or id in (select public.kullanici_santiye_idler())
  );

drop policy if exists "santiyeler_admin_all" on public.santiyeler;
create policy "santiyeler_admin_insert" on public.santiyeler for insert
  with check (public.kullanici_rolu() = 'admin');

drop policy if exists "santiyeler_admin_update" on public.santiyeler;
create policy "santiyeler_admin_update" on public.santiyeler for update
  using (public.kullanici_rolu() = 'admin');

drop policy if exists "santiyeler_admin_delete" on public.santiyeler;
create policy "santiyeler_admin_delete" on public.santiyeler for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== KULLANICI_SANTIYE ==========
drop policy if exists "ks_select" on public.kullanici_santiye;
create policy "ks_select" on public.kullanici_santiye for select
  using (
    kullanici_id = auth.uid()
    or public.kullanici_rolu() = 'admin'
  );

drop policy if exists "ks_admin" on public.kullanici_santiye;
create policy "ks_admin" on public.kullanici_santiye for all
  using (public.kullanici_rolu() = 'admin')
  with check (public.kullanici_rolu() = 'admin');

-- ========== PERSONELLER ==========
-- muhasebe erişemez; santiye_sefi/saha atandığı şantiyede; admin her yerde
drop policy if exists "personel_select" on public.personeller;
create policy "personel_select" on public.personeller for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "personel_insert" on public.personeller;
create policy "personel_insert" on public.personeller for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "personel_update" on public.personeller;
create policy "personel_update" on public.personeller for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "personel_delete" on public.personeller;
create policy "personel_delete" on public.personeller for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== PUANTAJ ==========
drop policy if exists "puantaj_select" on public.puantaj;
create policy "puantaj_select" on public.puantaj for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and personel_id in (
        select id from public.personeller
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "puantaj_insert" on public.puantaj;
create policy "puantaj_insert" on public.puantaj for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and personel_id in (
        select id from public.personeller
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "puantaj_update" on public.puantaj;
create policy "puantaj_update" on public.puantaj for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and personel_id in (
        select id from public.personeller
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "puantaj_delete" on public.puantaj;
create policy "puantaj_delete" on public.puantaj for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== MALZEMELER ==========
drop policy if exists "malzeme_select" on public.malzemeler;
create policy "malzeme_select" on public.malzemeler for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "malzeme_write" on public.malzemeler;
create policy "malzeme_write" on public.malzemeler for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "malzeme_update" on public.malzemeler;
create policy "malzeme_update" on public.malzemeler for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "malzeme_delete" on public.malzemeler;
create policy "malzeme_delete" on public.malzemeler for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== MALZEME_HAREKET ==========
drop policy if exists "mh_select" on public.malzeme_hareket;
create policy "mh_select" on public.malzeme_hareket for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu', 'saha_gorevlisi')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

-- santiye_sefi / depo: tüm tipler; saha_gorevlisi: sadece giris
drop policy if exists "mh_insert" on public.malzeme_hareket;
create policy "mh_insert" on public.malzeme_hareket for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and tip = 'giris'
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "mh_update" on public.malzeme_hareket;
create policy "mh_update" on public.malzeme_hareket for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and kaydeden_kullanici_id = auth.uid()
    )
  );

drop policy if exists "mh_delete" on public.malzeme_hareket;
create policy "mh_delete" on public.malzeme_hareket for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== İŞÇİ MAAŞ ==========
-- muhasebe: tüm şantiyeler görüntüleme + ödendi işaretleme
-- saha_gorevlisi: atandığı şantiye ekleme/güncelleme
drop policy if exists "isci_select" on public.isci_maas_odemeleri;
create policy "isci_select" on public.isci_maas_odemeleri for select
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "isci_insert" on public.isci_maas_odemeleri;
create policy "isci_insert" on public.isci_maas_odemeleri for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "isci_update" on public.isci_maas_odemeleri;
create policy "isci_update" on public.isci_maas_odemeleri for update
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and kaydeden_kullanici_id = auth.uid()
    )
  );

drop policy if exists "isci_delete" on public.isci_maas_odemeleri;
create policy "isci_delete" on public.isci_maas_odemeleri for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== ÖDEMELER (şef ödemeleri) ==========
drop policy if exists "odemeler_select" on public.odemeler;
create policy "odemeler_select" on public.odemeler for select
  using (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "odemeler_insert" on public.odemeler;
create policy "odemeler_insert" on public.odemeler for insert
  with check (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "odemeler_update" on public.odemeler;
create policy "odemeler_update" on public.odemeler for update
  using (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "odemeler_delete" on public.odemeler;
create policy "odemeler_delete" on public.odemeler for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== GELİR-GİDER ==========
drop policy if exists "gg_select" on public.gelir_gider;
create policy "gg_select" on public.gelir_gider for select
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "gg_insert" on public.gelir_gider;
create policy "gg_insert" on public.gelir_gider for insert
  with check (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "gg_update" on public.gelir_gider;
create policy "gg_update" on public.gelir_gider for update
  using (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "gg_delete" on public.gelir_gider;
create policy "gg_delete" on public.gelir_gider for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== AUDIT LOG ==========
drop policy if exists "audit_admin" on public.audit_log;
create policy "audit_admin" on public.audit_log for select
  using (public.kullanici_rolu() = 'admin');

drop policy if exists "audit_insert" on public.audit_log;
create policy "audit_insert" on public.audit_log for insert
  with check (true);

-- ========== YEDEKLEME DURUMU ==========
drop policy if exists "yedek_select" on public.yedekleme_durumu;
create policy "yedek_select" on public.yedekleme_durumu for select
  using (public.kullanici_rolu() = 'admin');

drop policy if exists "yedek_write" on public.yedekleme_durumu;
create policy "yedek_write" on public.yedekleme_durumu for all
  using (public.kullanici_rolu() = 'admin')
  with check (true);

-- Storage politikaları
drop policy if exists "belge_upload" on storage.objects;
create policy "belge_upload" on storage.objects for insert
  with check (
    bucket_id = 'malzeme-belgeleri'
    and auth.role() = 'authenticated'
  );

drop policy if exists "belge_select" on storage.objects;
create policy "belge_select" on storage.objects for select
  using (
    bucket_id = 'malzeme-belgeleri'
    and auth.role() = 'authenticated'
  );

drop policy if exists "belge_delete" on storage.objects;
create policy "belge_delete" on storage.objects for delete
  using (
    bucket_id = 'malzeme-belgeleri'
    and public.kullanici_rolu() = 'admin'
  );

-- SECTION: supabase/migrations/004_perf_santiye.sql
-- ------------------------------------------------------------
-- Performans indeksleri + şantiye bazlı maliyet görünümü + malzeme zorunlu şantiye

delete from public.malzemeler
where santiye_id is null;

alter table public.malzemeler
  alter column santiye_id set not null;

create index if not exists idx_malzemeler_santiye on public.malzemeler(santiye_id);
create index if not exists idx_malzeme_hareket_malzeme on public.malzeme_hareket(malzeme_id);
create index if not exists idx_malzeme_hareket_silindi on public.malzeme_hareket(silindi);
create index if not exists idx_malzeme_hareket_eksik
  on public.malzeme_hareket(tip, durum, silindi)
  where tip = 'eksik';
create index if not exists idx_gelir_gider_santiye on public.gelir_gider(santiye_id);
create index if not exists idx_gelir_gider_santiye_tip on public.gelir_gider(santiye_id, tip);
create index if not exists idx_isci_maas_santiye on public.isci_maas_odemeleri(santiye_id);
create index if not exists idx_kullanici_santiye_kullanici on public.kullanici_santiye(kullanici_id);

create or replace view public.toplam_maliyet_raporu as
select
  s.id as santiye_id,
  s.ad as santiye_adi,
  coalesce(i.iscilik, 0) as iscilik_maliyeti,
  coalesce(m.malzeme, 0) as malzeme_maliyeti,
  coalesce(g.gider, 0) as genel_gider,
  coalesce(g.gelir, 0) as genel_gelir
from public.santiyeler s
left join (
  select santiye_id, sum(tutar) as iscilik
  from public.isci_maas_odemeleri
  where coalesce(silindi, false) = false
  group by santiye_id
) i on i.santiye_id = s.id
left join (
  select ml.santiye_id, sum(mh.tutar) as malzeme
  from public.malzeme_hareket mh
  join public.malzemeler ml on mh.malzeme_id = ml.id
  where coalesce(mh.silindi, false) = false
    and mh.tip in ('giris', 'fazla')
  group by ml.santiye_id
) m on m.santiye_id = s.id
left join (
  select
    santiye_id,
    sum(case when tip = 'gider' then tutar else 0 end) as gider,
    sum(case when tip = 'gelir' then tutar else 0 end) as gelir
  from public.gelir_gider
  where coalesce(silindi, false) = false
  group by santiye_id
) g on g.santiye_id = s.id;

-- SECTION: supabase/migrations/004_webhook_notlari.sql
-- ------------------------------------------------------------
-- Supabase Dashboard > Database > Webhooks ile UI üzerinden kurulması önerilir.
-- Alternatif: pg_net ile HTTP çağrısı (örnek — URL'yi kendi domain'inizle değiştirin)

-- Not: Üretimde webhook secret kullanın.
-- Bu dosya referans içindir; çoğu kurulumda Dashboard Webhooks yeterlidir.

/*
Hedef URL: https://SIZIN_DOMAIN/api/webhook/firebase-yedek
Olaylar: INSERT, UPDATE
Tablolar:
  - public.puantaj
  - public.malzeme_hareket
  - public.isci_maas_odemeleri
  - public.odemeler
  - public.gelir_gider
*/

-- SECTION: supabase/migrations/005_katmanlar.sql
-- ------------------------------------------------------------
-- Katmanlı ayrım: admin / ofis / santiye / depo
-- Roller, tablolar, RLS, oturum_log, audit + yedek grupları

-- ========== PROFİL: katman + yeni roller ==========
alter table public.profiller
  add column if not exists katman text,
  add column if not exists aktif boolean default true,
  add column if not exists email text;

update public.profiller set rol = 'ofis_admin' where rol = 'muhasebe';

update public.profiller set katman = case
  when rol = 'admin' then 'admin'
  when rol in ('ofis_admin', 'ofis_personeli') then 'ofis'
  when rol = 'depo_sorumlusu' then 'depo'
  else 'santiye'
end
where katman is null;

alter table public.profiller drop constraint if exists profiller_rol_check;
alter table public.profiller
  add constraint profiller_rol_check check (
    rol in (
      'admin',
      'ofis_admin',
      'ofis_personeli',
      'santiye_sefi',
      'depo_sorumlusu',
      'saha_gorevlisi'
    )
  );

alter table public.profiller drop constraint if exists profiller_katman_check;
alter table public.profiller
  add constraint profiller_katman_check check (
    katman in ('admin', 'ofis', 'santiye', 'depo')
  );

alter table public.profiller alter column katman set not null;

-- ========== HELPERS ==========
create or replace function public.kullanici_rolu()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiller where id = auth.uid();
$$;

create or replace function public.kullanici_katmani()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select katman from public.profiller where id = auth.uid();
$$;

create or replace function public.kullanici_santiye_idler()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select santiye_id from public.kullanici_santiye where kullanici_id = auth.uid();
$$;

-- ========== OTURUM LOG ==========
create table if not exists public.oturum_log (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references public.profiller(id) on delete set null,
  portal text not null check (portal in ('admin', 'ofis', 'santiye')),
  islem text not null check (islem in ('giris', 'cikis')),
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_oturum_log_created on public.oturum_log(created_at desc);
create index if not exists idx_oturum_log_kullanici on public.oturum_log(kullanici_id);

-- ========== OFİS ==========
create table if not exists public.ofis_personeller (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  pozisyon text,
  telefon text,
  email text,
  maas numeric,
  aktif boolean default true,
  notlar text,
  created_at timestamptz default now()
);

create table if not exists public.ofis_masraflar (
  id uuid primary key default gen_random_uuid(),
  tip text not null check (tip in ('gelir', 'gider')),
  kategori text,
  tutar numeric not null,
  tarih date not null,
  aciklama text,
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ofis_odemeler (
  id uuid primary key default gen_random_uuid(),
  ofis_personel_id uuid references public.ofis_personeller(id) on delete set null,
  tutar numeric not null,
  donem_baslangic date,
  donem_bitis date,
  odendi_mi boolean default false,
  odeme_tarihi date,
  aciklama text,
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  created_at timestamptz default now()
);

-- ========== DEPO ==========
create table if not exists public.depo_malzemeler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  birim text,
  min_stok numeric default 0,
  aciklama text,
  aktif boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.depo_hareket (
  id uuid primary key default gen_random_uuid(),
  depo_malzeme_id uuid not null references public.depo_malzemeler(id) on delete cascade,
  tip text not null check (tip in ('giris', 'cikis', 'sayim', 'fire')),
  miktar numeric not null,
  birim_fiyat numeric,
  tutar numeric generated always as (miktar * coalesce(birim_fiyat, 0)) stored,
  tarih date not null,
  aciklama text,
  santiye_id uuid references public.santiyeler(id) on delete set null,
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_depo_hareket_malzeme on public.depo_hareket(depo_malzeme_id);
create index if not exists idx_ofis_masraflar_tarih on public.ofis_masraflar(tarih);

-- ========== YEDEKLEME: veri grubu ==========
alter table public.yedekleme_durumu
  add column if not exists veri_grubu text;

alter table public.yedekleme_durumu drop constraint if exists yedekleme_durumu_veri_grubu_check;
alter table public.yedekleme_durumu
  add constraint yedekleme_durumu_veri_grubu_check check (
    veri_grubu is null or veri_grubu in ('sistem', 'ofis', 'santiye', 'depo')
  );

-- Eski satırları grupla
update public.yedekleme_durumu set veri_grubu = 'sistem'
where veri_grubu is null and tablo_adi in ('profiller', 'audit_log', 'oturum_log', 'yedekleme_durumu');

update public.yedekleme_durumu set veri_grubu = 'santiye'
where veri_grubu is null;

insert into public.yedekleme_durumu (katman, tablo_adi, kayit_sayisi, durum, mesaj, veri_grubu)
select v.katman, v.tablo, 0, 'bekliyor', 'Gruplu yedek — henüz senkron yok', v.grup
from (values
  ('firebase', 'profiller', 'sistem'),
  ('firebase', 'oturum_log', 'sistem'),
  ('firebase', 'audit_log', 'sistem'),
  ('firebase', 'ofis_personeller', 'ofis'),
  ('firebase', 'ofis_masraflar', 'ofis'),
  ('firebase', 'ofis_odemeler', 'ofis'),
  ('firebase', 'santiyeler', 'santiye'),
  ('firebase', 'malzemeler', 'santiye'),
  ('firebase', 'depo_malzemeler', 'depo'),
  ('firebase', 'depo_hareket', 'depo'),
  ('yerel', 'profiller', 'sistem'),
  ('yerel', 'oturum_log', 'sistem'),
  ('yerel', 'audit_log', 'sistem'),
  ('yerel', 'ofis_personeller', 'ofis'),
  ('yerel', 'ofis_masraflar', 'ofis'),
  ('yerel', 'ofis_odemeler', 'ofis'),
  ('yerel', 'santiyeler', 'santiye'),
  ('yerel', 'malzemeler', 'santiye'),
  ('yerel', 'depo_malzemeler', 'depo'),
  ('yerel', 'depo_hareket', 'depo')
) as v(katman, tablo, grup)
where not exists (
  select 1 from public.yedekleme_durumu y
  where y.katman = v.katman and y.tablo_adi = v.tablo
);

-- ========== AUDIT TRIGGERS (yeni tablolar) ==========
drop trigger if exists trg_audit_ofis_personeller on public.ofis_personeller;
create trigger trg_audit_ofis_personeller
  after insert or update or delete on public.ofis_personeller
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_ofis_masraflar on public.ofis_masraflar;
create trigger trg_audit_ofis_masraflar
  after insert or update or delete on public.ofis_masraflar
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_ofis_odemeler on public.ofis_odemeler;
create trigger trg_audit_ofis_odemeler
  after insert or update or delete on public.ofis_odemeler
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_depo_malzemeler on public.depo_malzemeler;
create trigger trg_audit_depo_malzemeler
  after insert or update or delete on public.depo_malzemeler
  for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_depo_hareket on public.depo_hareket;
create trigger trg_audit_depo_hareket
  after insert or update or delete on public.depo_hareket
  for each row execute function public.audit_log_trigger();

-- ========== RLS ==========
alter table public.ofis_personeller enable row level security;
alter table public.ofis_masraflar enable row level security;
alter table public.ofis_odemeler enable row level security;
alter table public.depo_malzemeler enable row level security;
alter table public.depo_hareket enable row level security;
alter table public.oturum_log enable row level security;

-- Ofis: sadece admin + ofis
drop policy if exists "ofis_personel_all" on public.ofis_personeller;
create policy "ofis_personel_select" on public.ofis_personeller for select
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));
create policy "ofis_personel_write" on public.ofis_personeller for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin'));

drop policy if exists "ofis_masraf_select" on public.ofis_masraflar;
create policy "ofis_masraf_select" on public.ofis_masraflar for select
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));
create policy "ofis_masraf_write" on public.ofis_masraflar for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin'));

drop policy if exists "ofis_odeme_select" on public.ofis_odemeler;
create policy "ofis_odeme_select" on public.ofis_odemeler for select
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));
create policy "ofis_odeme_write" on public.ofis_odemeler for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin'));

-- Depo: admin + depo (şantiye eksik okuyabilir depo paneli üzerinden ayrı)
drop policy if exists "depo_malzeme_select" on public.depo_malzemeler;
create policy "depo_malzeme_select" on public.depo_malzemeler for select
  using (public.kullanici_rolu() in ('admin', 'depo_sorumlusu'));
create policy "depo_malzeme_write" on public.depo_malzemeler for all
  using (public.kullanici_rolu() in ('admin', 'depo_sorumlusu'))
  with check (public.kullanici_rolu() in ('admin', 'depo_sorumlusu'));

drop policy if exists "depo_hareket_select" on public.depo_hareket;
create policy "depo_hareket_select" on public.depo_hareket for select
  using (public.kullanici_rolu() in ('admin', 'depo_sorumlusu'));
create policy "depo_hareket_write" on public.depo_hareket for all
  using (public.kullanici_rolu() in ('admin', 'depo_sorumlusu'))
  with check (public.kullanici_rolu() in ('admin', 'depo_sorumlusu'));

-- Oturum log: kendi kaydını ekleyebilir; admin okur
drop policy if exists "oturum_insert" on public.oturum_log;
create policy "oturum_insert" on public.oturum_log for insert
  with check (kullanici_id = auth.uid() or public.kullanici_rolu() = 'admin');
create policy "oturum_select" on public.oturum_log for select
  using (public.kullanici_rolu() = 'admin' or kullanici_id = auth.uid());

-- Şantiye tabloları: muhasebe/ofis erişimini kaldır
drop policy if exists "santiyeler_select" on public.santiyeler;
create policy "santiyeler_select" on public.santiyeler for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi', 'depo_sorumlusu')
      and (
        public.kullanici_rolu() = 'depo_sorumlusu'
        or id in (select public.kullanici_santiye_idler())
      )
    )
  );

-- Depo şantiye listesini (eksik için) görebilir
drop policy if exists "gelir_gider_select" on public.gelir_gider;
create policy "gelir_gider_select" on public.gelir_gider for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "gelir_gider_write" on public.gelir_gider;
drop policy if exists "gelir_gider_insert" on public.gelir_gider;
drop policy if exists "gelir_gider_update" on public.gelir_gider;
drop policy if exists "gelir_gider_delete" on public.gelir_gider;
create policy "gelir_gider_insert" on public.gelir_gider for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );
create policy "gelir_gider_update" on public.gelir_gider for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );
create policy "gelir_gider_delete" on public.gelir_gider for delete
  using (public.kullanici_rolu() = 'admin');

-- Ödemeler (eski genel): sadece admin (ofis ödemeleri ayrı tabloda)
drop policy if exists "odemeler_select" on public.odemeler;
create policy "odemeler_select" on public.odemeler for select
  using (public.kullanici_rolu() = 'admin');
drop policy if exists "odemeler_write" on public.odemeler;
drop policy if exists "odemeler_all" on public.odemeler;
create policy "odemeler_admin" on public.odemeler for all
  using (public.kullanici_rolu() = 'admin')
  with check (public.kullanici_rolu() = 'admin');

-- Malzeme hareket: depo eksikleri görebilir
drop policy if exists "mh_select" on public.malzeme_hareket;
create policy "mh_select" on public.malzeme_hareket for select
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or malzeme_id in (
      select id from public.malzemeler
      where santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "mh_update" on public.malzeme_hareket;
create policy "mh_update" on public.malzeme_hareket for update
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

-- Perf indeksler (004 ile aynı, güvenli tekrar)
create index if not exists idx_malzemeler_santiye on public.malzemeler(santiye_id);
create index if not exists idx_malzeme_hareket_malzeme on public.malzeme_hareket(malzeme_id);

-- SECTION: supabase/migrations/006_fix_handle_new_user.sql
-- ------------------------------------------------------------
-- handle_new_user: katman zorunlu olduğu için güncelle
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text := coalesce(new.raw_user_meta_data->>'rol', 'saha_gorevlisi');
  v_ad text := coalesce(new.raw_user_meta_data->>'ad_soyad', split_part(new.email, '@', 1));
  v_katman text;
begin
  if v_rol = 'muhasebe' then
    v_rol := 'ofis_admin';
  end if;
  if v_rol not in ('admin','ofis_admin','ofis_personeli','santiye_sefi','depo_sorumlusu','saha_gorevlisi') then
    v_rol := 'saha_gorevlisi';
  end if;
  v_katman := case
    when v_rol = 'admin' then 'admin'
    when v_rol in ('ofis_admin','ofis_personeli') then 'ofis'
    when v_rol = 'depo_sorumlusu' then 'depo'
    else 'santiye'
  end;

  insert into public.profiller (id, ad_soyad, rol, katman, aktif, email)
  values (new.id, v_ad, v_rol, v_katman, true, new.email)
  on conflict (id) do update set
    ad_soyad = excluded.ad_soyad,
    email = coalesce(excluded.email, public.profiller.email),
    rol = excluded.rol,
    katman = excluded.katman;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECTION: supabase/migrations/007_santiye_yazma.sql
-- ------------------------------------------------------------
-- Şantiye kullanıcıları: personel, gelir-gider, malzeme yazabilsin
-- Eski gg_* politikalarını temizle (005 yenilerini eklemişti ama eski adlar kalmış olabilir)

-- PERSONEL
drop policy if exists "personel_select" on public.personeller;
drop policy if exists "personel_insert" on public.personeller;
drop policy if exists "personel_update" on public.personeller;
drop policy if exists "personel_delete" on public.personeller;

create policy "personel_select" on public.personeller for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "personel_insert" on public.personeller for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "personel_update" on public.personeller for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "personel_delete" on public.personeller for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

-- MALZEME TANIM
drop policy if exists "malzeme_select" on public.malzemeler;
drop policy if exists "malzeme_write" on public.malzemeler;
drop policy if exists "malzeme_update" on public.malzemeler;
drop policy if exists "malzeme_delete" on public.malzemeler;

create policy "malzeme_select" on public.malzemeler for select
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "malzeme_write" on public.malzemeler for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "malzeme_update" on public.malzemeler for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "malzeme_delete" on public.malzemeler for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

-- MALZEME HAREKET
drop policy if exists "mh_select" on public.malzeme_hareket;
drop policy if exists "mh_insert" on public.malzeme_hareket;
drop policy if exists "mh_update" on public.malzeme_hareket;
drop policy if exists "mh_delete" on public.malzeme_hareket;

create policy "mh_select" on public.malzeme_hareket for select
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or malzeme_id in (
      select id from public.malzemeler
      where santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "mh_insert" on public.malzeme_hareket for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

create policy "mh_update" on public.malzeme_hareket for update
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

create policy "mh_delete" on public.malzeme_hareket for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

-- GELİR GİDER (eski gg_* + yeni adlar)
drop policy if exists "gg_select" on public.gelir_gider;
drop policy if exists "gg_insert" on public.gelir_gider;
drop policy if exists "gg_update" on public.gelir_gider;
drop policy if exists "gg_delete" on public.gelir_gider;
drop policy if exists "gelir_gider_select" on public.gelir_gider;
drop policy if exists "gelir_gider_insert" on public.gelir_gider;
drop policy if exists "gelir_gider_update" on public.gelir_gider;
drop policy if exists "gelir_gider_delete" on public.gelir_gider;
drop policy if exists "gelir_gider_write" on public.gelir_gider;

create policy "gelir_gider_select" on public.gelir_gider for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "gelir_gider_insert" on public.gelir_gider for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "gelir_gider_update" on public.gelir_gider for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "gelir_gider_delete" on public.gelir_gider for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

-- İŞÇİ MAAŞ
drop policy if exists "isci_select" on public.isci_maas_odemeleri;
drop policy if exists "isci_insert" on public.isci_maas_odemeleri;
drop policy if exists "isci_update" on public.isci_maas_odemeleri;
drop policy if exists "isci_delete" on public.isci_maas_odemeleri;

create policy "isci_select" on public.isci_maas_odemeleri for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "isci_insert" on public.isci_maas_odemeleri for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "isci_update" on public.isci_maas_odemeleri for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "isci_delete" on public.isci_maas_odemeleri for delete
  using (public.kullanici_rolu() = 'admin');

-- SECTION: supabase/migrations/008_santiye_olustur.sql
-- ------------------------------------------------------------
-- Şantiye şefi / saha görevlisi: yönetici olmadan şantiye ekleyip kendine atayabilsin

create or replace function public.santiye_olustur(
  p_ad text,
  p_adres text default null,
  p_kendine_ata boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_id uuid;
begin
  v_rol := public.kullanici_rolu();
  if v_rol is null then
    raise exception 'Oturum gerekli';
  end if;
  if v_rol not in ('admin', 'santiye_sefi', 'saha_gorevlisi') then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  if p_ad is null or length(trim(p_ad)) = 0 then
    raise exception 'Şantiye adı gerekli';
  end if;

  insert into public.santiyeler (ad, adres, aktif)
  values (trim(p_ad), nullif(trim(p_adres), ''), true)
  returning id into v_id;

  if p_kendine_ata and auth.uid() is not null then
    insert into public.kullanici_santiye (kullanici_id, santiye_id)
    values (auth.uid(), v_id)
    on conflict (kullanici_id, santiye_id) do nothing;
  end if;

  return v_id;
end;
$$;

grant execute on function public.santiye_olustur(text, text, boolean) to authenticated;

-- Şantiye kullanıcıları kendi atamalarını görebilir (zaten vardı);
-- kendine şantiye atama için doğrudan insert (RPC dışı kullanım)
drop policy if exists "ks_self_insert" on public.kullanici_santiye;
create policy "ks_self_insert" on public.kullanici_santiye for insert
  with check (
    kullanici_id = auth.uid()
    and public.kullanici_rolu() in ('admin', 'santiye_sefi', 'saha_gorevlisi')
  );

-- Şantiye oluşturma (RPC tercih; doğrudan insert de açılsın)
drop policy if exists "santiyeler_admin_insert" on public.santiyeler;
drop policy if exists "santiyeler_insert" on public.santiyeler;
create policy "santiyeler_insert" on public.santiyeler for insert
  with check (
    public.kullanici_rolu() in ('admin', 'santiye_sefi', 'saha_gorevlisi')
  );

drop policy if exists "santiyeler_admin_update" on public.santiyeler;
drop policy if exists "santiyeler_update" on public.santiyeler;
create policy "santiyeler_update" on public.santiyeler for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and id in (select public.kullanici_santiye_idler())
    )
  );

-- SECTION: supabase/migrations/009_temiz_baslangic.sql
-- ------------------------------------------------------------
-- CANLI KULLANIM ÖNCESİ TEMİZ BAŞLANGIÇ
-- Tüm operasyonel veri silinir; admin hesapları korunur.

begin;

-- Çocuk tablolar önce
truncate table public.puantaj restart identity cascade;
truncate table public.malzeme_hareket restart identity cascade;
truncate table public.isci_maas_odemeleri restart identity cascade;
truncate table public.gelir_gider restart identity cascade;
truncate table public.odemeler restart identity cascade;
truncate table public.malzemeler restart identity cascade;
truncate table public.personeller restart identity cascade;
truncate table public.kullanici_santiye restart identity cascade;
truncate table public.santiyeler restart identity cascade;

truncate table public.ofis_odemeler restart identity cascade;
truncate table public.ofis_masraflar restart identity cascade;
truncate table public.ofis_personeller restart identity cascade;

truncate table public.depo_hareket restart identity cascade;
truncate table public.depo_malzemeler restart identity cascade;

truncate table public.oturum_log restart identity cascade;
truncate table public.audit_log restart identity cascade;

-- Admin dışındaki profilleri ve auth kullanıcılarını sil
delete from public.profiller
where coalesce(rol, '') <> 'admin';

delete from auth.users
where id not in (select id from public.profiller where rol = 'admin');

-- Yedekleme / veri grubu sayaçlarını sıfırla ve açık tut
truncate table public.yedekleme_durumu restart identity cascade;

insert into public.yedekleme_durumu (katman, tablo_adi, kayit_sayisi, durum, mesaj, veri_grubu)
values
  ('firebase', 'santiyeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'personeller', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'puantaj', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'malzemeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'malzeme_hareket', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'gelir_gider', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'isci_maas_odemeleri', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'ofis_personeller', 0, 'aktif', 'Hazır', 'ofis'),
  ('firebase', 'ofis_masraflar', 0, 'aktif', 'Hazır', 'ofis'),
  ('firebase', 'ofis_odemeler', 0, 'aktif', 'Hazır', 'ofis'),
  ('firebase', 'depo_malzemeler', 0, 'aktif', 'Hazır', 'depo'),
  ('firebase', 'depo_hareket', 0, 'aktif', 'Hazır', 'depo'),
  ('firebase', 'profiller', 0, 'aktif', 'Hazır', 'sistem'),
  ('firebase', 'audit_log', 0, 'aktif', 'Hazır', 'sistem'),
  ('firebase', 'oturum_log', 0, 'aktif', 'Hazır', 'sistem'),
  ('yerel', 'santiyeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'personeller', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'puantaj', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'malzemeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'malzeme_hareket', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'gelir_gider', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'isci_maas_odemeleri', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'ofis_personeller', 0, 'aktif', 'Hazır', 'ofis'),
  ('yerel', 'ofis_masraflar', 0, 'aktif', 'Hazır', 'ofis'),
  ('yerel', 'ofis_odemeler', 0, 'aktif', 'Hazır', 'ofis'),
  ('yerel', 'depo_malzemeler', 0, 'aktif', 'Hazır', 'depo'),
  ('yerel', 'depo_hareket', 0, 'aktif', 'Hazır', 'depo'),
  ('yerel', 'profiller', 0, 'aktif', 'Hazır', 'sistem'),
  ('yerel', 'audit_log', 0, 'aktif', 'Hazır', 'sistem'),
  ('yerel', 'oturum_log', 0, 'aktif', 'Hazır', 'sistem');

-- Admin profil kayit_sayisi güncelle
update public.yedekleme_durumu
set kayit_sayisi = (select count(*) from public.profiller),
    son_senkron = now(),
    mesaj = 'Temiz başlangıç'
where tablo_adi = 'profiller';

commit;

-- Doğrulama
select 'santiyeler' as tablo, count(*)::int as n from public.santiyeler
union all select 'personeller', count(*)::int from public.personeller
union all select 'malzemeler', count(*)::int from public.malzemeler
union all select 'gelir_gider', count(*)::int from public.gelir_gider
union all select 'ofis_personeller', count(*)::int from public.ofis_personeller
union all select 'depo_malzemeler', count(*)::int from public.depo_malzemeler
union all select 'profiller', count(*)::int from public.profiller
union all select 'auth_users', count(*)::int from auth.users
union all select 'yedekleme_aktif', count(*)::int from public.yedekleme_durumu where durum = 'aktif';

-- SECTION: supabase/migrations/010_santiye_audit.sql
-- ------------------------------------------------------------
-- Şantiye bazlı ayrıntılı işlem geçmişi

alter table public.audit_log
  add column if not exists santiye_id uuid references public.santiyeler(id) on delete set null;

create index if not exists idx_audit_log_santiye_created
  on public.audit_log(santiye_id, created_at desc);

-- Eski kayıtları mümkün olduğu kadar şantiyeye bağla.
update public.audit_log a
set santiye_id = case
  when a.tablo_adi = 'santiyeler' then a.kayit_id
  when a.tablo_adi in ('personeller', 'malzemeler', 'gelir_gider', 'isci_maas_odemeleri')
    then nullif(coalesce(a.yeni_veri, a.eski_veri)->>'santiye_id', '')::uuid
  else a.santiye_id
end
where a.santiye_id is null;

update public.audit_log a
set santiye_id = p.santiye_id
from public.personeller p
where a.santiye_id is null
  and a.tablo_adi = 'puantaj'
  and p.id = nullif(coalesce(a.yeni_veri, a.eski_veri)->>'personel_id', '')::uuid;

update public.audit_log a
set santiye_id = m.santiye_id
from public.malzemeler m
where a.santiye_id is null
  and a.tablo_adi = 'malzeme_hareket'
  and m.id = nullif(coalesce(a.yeni_veri, a.eski_veri)->>'malzeme_id', '')::uuid;

-- Her INSERT / UPDATE / DELETE işleminde şantiye ilişkisini de anlık kaydet.
create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kayit_id uuid;
  v_eski jsonb;
  v_yeni jsonb;
  v_veri jsonb;
  v_islem text;
  v_santiye_id uuid;
begin
  if tg_op = 'INSERT' then
    v_islem := 'insert';
    v_eski := null;
    v_yeni := to_jsonb(new);
    v_kayit_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_islem := 'update';
    v_eski := to_jsonb(old);
    v_yeni := to_jsonb(new);
    v_kayit_id := new.id;
  else
    v_islem := 'delete';
    v_eski := to_jsonb(old);
    v_yeni := null;
    v_kayit_id := old.id;
  end if;

  v_veri := coalesce(v_yeni, v_eski);

  if tg_table_name = 'santiyeler' then
    v_santiye_id := v_kayit_id;
  elsif tg_table_name in ('personeller', 'malzemeler', 'gelir_gider', 'isci_maas_odemeleri') then
    v_santiye_id := nullif(v_veri->>'santiye_id', '')::uuid;
  elsif tg_table_name = 'puantaj' then
    select p.santiye_id into v_santiye_id
    from public.personeller p
    where p.id = nullif(v_veri->>'personel_id', '')::uuid;
  elsif tg_table_name = 'malzeme_hareket' then
    select m.santiye_id into v_santiye_id
    from public.malzemeler m
    where m.id = nullif(v_veri->>'malzeme_id', '')::uuid;
  elsif tg_table_name = 'depo_hareket' then
    v_santiye_id := nullif(v_veri->>'santiye_id', '')::uuid;
  else
    v_santiye_id := null;
  end if;

  insert into public.audit_log (
    tablo_adi,
    kayit_id,
    islem,
    eski_veri,
    yeni_veri,
    yapan_kullanici_id,
    santiye_id
  )
  values (
    tg_table_name,
    v_kayit_id,
    v_islem,
    v_eski,
    v_yeni,
    auth.uid(),
    v_santiye_id
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Depo hareketi de şantiye klasörüne düşsün.
drop trigger if exists trg_audit_depo_hareket on public.depo_hareket;
create trigger trg_audit_depo_hareket
  after insert or update or delete on public.depo_hareket
  for each row execute function public.audit_log_trigger();

-- Yerel yedek servisi anlık dinleyebilsin.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'audit_log'
  ) then
    alter publication supabase_realtime add table public.audit_log;
  end if;
end
$$;

-- SECTION: supabase/migrations/011_malzeme_tur_belge.sql
-- ------------------------------------------------------------
-- Malzeme: tür + fatura/resim alanları

alter table public.malzemeler
  add column if not exists tur text;

alter table public.malzeme_hareket
  add column if not exists fatura_url text,
  add column if not exists resim_url text;

-- Eski belge_url varsa faturaya taşı
update public.malzeme_hareket
set fatura_url = belge_url
where fatura_url is null
  and belge_url is not null;

-- SECTION: supabase/migrations/012_sirket_finans_ozeti.sql
-- ------------------------------------------------------------
-- Şirket geneli finans özet görünümü

create or replace view public.sirket_finans_ozeti as
select
  coalesce((select sum(genel_gelir) from public.toplam_maliyet_raporu), 0)
    + coalesce((select sum(tutar) from public.ofis_masraflar where tip = 'gelir' and coalesce(silindi, false) = false), 0)
    as toplam_gelir,
  coalesce((select sum(iscilik_maliyeti + malzeme_maliyeti + genel_gider) from public.toplam_maliyet_raporu), 0)
    + coalesce((select sum(tutar) from public.ofis_masraflar where tip = 'gider' and coalesce(silindi, false) = false), 0)
    + coalesce((select sum(tutar) from public.depo_hareket where tip in ('giris', 'fire') and coalesce(silindi, false) = false), 0)
    as toplam_gider,
  coalesce((select sum(genel_gelir) from public.toplam_maliyet_raporu), 0)
    + coalesce((select sum(tutar) from public.ofis_masraflar where tip = 'gelir' and coalesce(silindi, false) = false), 0)
    - (
      coalesce((select sum(iscilik_maliyeti + malzeme_maliyeti + genel_gider) from public.toplam_maliyet_raporu), 0)
      + coalesce((select sum(tutar) from public.ofis_masraflar where tip = 'gider' and coalesce(silindi, false) = false), 0)
      + coalesce((select sum(tutar) from public.depo_hareket where tip in ('giris', 'fire') and coalesce(silindi, false) = false), 0)
    )
    as net;

-- SECTION: supabase/migrations/013_gezinme_performans.sql
-- ------------------------------------------------------------
-- Gezinme performansı: sık liste ve sayaç sorguları için ek indeksler

create index if not exists idx_malzeme_hareket_malzeme_tarih
  on public.malzeme_hareket(malzeme_id, silindi, tarih desc);

create index if not exists idx_gelir_gider_santiye_tarih
  on public.gelir_gider(santiye_id, silindi, tarih desc);

create index if not exists idx_isci_maas_santiye_created
  on public.isci_maas_odemeleri(santiye_id, silindi, created_at desc);

create index if not exists idx_puantaj_personel_tarih
  on public.puantaj(personel_id, tarih, silindi);

create index if not exists idx_depo_hareket_tarih
  on public.depo_hareket(silindi, tarih desc);

create index if not exists idx_ofis_masraflar_tarih
  on public.ofis_masraflar(silindi, tarih desc);

create index if not exists idx_audit_log_created
  on public.audit_log(created_at desc);

-- SECTION: supabase/migrations/014_ofis_puantaj.sql
-- ------------------------------------------------------------
-- Ofis personel puantajı

create table if not exists public.ofis_puantaj (
  id uuid primary key default gen_random_uuid(),
  ofis_personel_id uuid not null references public.ofis_personeller(id) on delete cascade,
  tarih date not null,
  geldi_mi boolean default false,
  yemek_yedi_mi boolean default false,
  aciklama text,
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (ofis_personel_id, tarih)
);

create index if not exists idx_ofis_puantaj_personel_tarih
  on public.ofis_puantaj(ofis_personel_id, tarih, silindi);

create index if not exists idx_ofis_puantaj_tarih
  on public.ofis_puantaj(tarih, silindi);

alter table public.ofis_puantaj enable row level security;

drop policy if exists "ofis_puantaj_select" on public.ofis_puantaj;
create policy "ofis_puantaj_select" on public.ofis_puantaj for select
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));

drop policy if exists "ofis_puantaj_write" on public.ofis_puantaj;
create policy "ofis_puantaj_write" on public.ofis_puantaj for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin'));

drop trigger if exists trg_audit_ofis_puantaj on public.ofis_puantaj;
create trigger trg_audit_ofis_puantaj
  after insert or update or delete on public.ofis_puantaj
  for each row execute function public.audit_log_trigger();

insert into public.yedekleme_durumu (katman, tablo_adi, kayit_sayisi, durum, mesaj, veri_grubu)
select v.katman, v.tablo_adi, 0, 'bekliyor', 'Ofis puantaj yedek bekliyor', 'ofis'
from (values
  ('firebase', 'ofis_puantaj'),
  ('yerel', 'ofis_puantaj')
) as v(katman, tablo_adi)
where not exists (
  select 1
  from public.yedekleme_durumu y
  where y.katman = v.katman
    and y.tablo_adi = v.tablo_adi
);

update public.yedekleme_durumu
set veri_grubu = 'ofis',
    mesaj = 'Ofis puantaj yedek bekliyor'
where tablo_adi = 'ofis_puantaj';

-- SECTION: supabase/migrations/015_ofis_yazma_izinleri.sql
-- ------------------------------------------------------------
-- Ofis personeli için personel/puantaj/ödeme yazma izinleri

drop policy if exists "ofis_personel_write" on public.ofis_personeller;
create policy "ofis_personel_write" on public.ofis_personeller for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));

drop policy if exists "ofis_odeme_write" on public.ofis_odemeler;
create policy "ofis_odeme_write" on public.ofis_odemeler for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));

drop policy if exists "ofis_puantaj_write" on public.ofis_puantaj;
create policy "ofis_puantaj_write" on public.ofis_puantaj for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));

-- SECTION: supabase/migrations/016_santiye_is_gorselleri.sql
-- ------------------------------------------------------------
-- Şantiye yapılan iş görselleri

insert into storage.buckets (id, name, public)
values ('santiye-is-gorselleri', 'santiye-is-gorselleri', false)
on conflict (id) do nothing;

create table if not exists public.santiye_is_gorselleri (
  id uuid primary key default gen_random_uuid(),
  santiye_id uuid not null references public.santiyeler(id) on delete cascade,
  baslik text not null,
  aciklama text,
  resim_path text not null,
  tarih date not null default current_date,
  kaydeden_kullanici_id uuid references public.profiller(id),
  silindi boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_santiye_is_gorselleri_santiye_tarih
  on public.santiye_is_gorselleri(santiye_id, silindi, tarih desc);

alter table public.santiye_is_gorselleri enable row level security;

drop policy if exists "santiye_is_gorsel_select" on public.santiye_is_gorselleri;
create policy "santiye_is_gorsel_select" on public.santiye_is_gorselleri for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "santiye_is_gorsel_insert" on public.santiye_is_gorselleri;
create policy "santiye_is_gorsel_insert" on public.santiye_is_gorselleri for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "santiye_is_gorsel_update" on public.santiye_is_gorselleri;
create policy "santiye_is_gorsel_update" on public.santiye_is_gorselleri for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop trigger if exists trg_audit_santiye_is_gorselleri on public.santiye_is_gorselleri;
create trigger trg_audit_santiye_is_gorselleri
  after insert or update or delete on public.santiye_is_gorselleri
  for each row execute function public.audit_log_trigger();

drop policy if exists "santiye_is_gorsel_upload" on storage.objects;
create policy "santiye_is_gorsel_upload" on storage.objects for insert
  with check (
    bucket_id = 'santiye-is-gorselleri'
    and auth.role() = 'authenticated'
  );

drop policy if exists "santiye_is_gorsel_select_storage" on storage.objects;
create policy "santiye_is_gorsel_select_storage" on storage.objects for select
  using (
    bucket_id = 'santiye-is-gorselleri'
    and auth.role() = 'authenticated'
  );

insert into public.yedekleme_durumu (katman, tablo_adi, kayit_sayisi, durum, mesaj, veri_grubu)
select v.katman, v.tablo_adi, 0, 'bekliyor', 'Şantiye iş görselleri yedek bekliyor', 'santiye'
from (values
  ('firebase', 'santiye_is_gorselleri'),
  ('yerel', 'santiye_is_gorselleri')
) as v(katman, tablo_adi)
where not exists (
  select 1
  from public.yedekleme_durumu y
  where y.katman = v.katman
    and y.tablo_adi = v.tablo_adi
);

-- SECTION: supabase/migrations/017_santiye_personel_iletisim.sql
-- ------------------------------------------------------------
-- Şantiye personel iletişim alanları (ofis personeliyle aynı yapı)

alter table public.personeller
  add column if not exists telefon text,
  add column if not exists email text,
  add column if not exists notlar text;

-- SECTION: supabase/migrations/018_sirket_risk_duzeltmeleri.sql
-- ------------------------------------------------------------
-- Şirket geneli risk düzeltmeleri:
-- 1) Depo-şantiye stok bağları
-- 2) Finans konsolidasyonu (+ ofis ödemeleri, tarihli özet)
-- 3) Yönetici onay alanları
-- 4) Tarihli şantiye maliyet fonksiyonu

-- ========== STOK BAĞLARI ==========
alter table public.malzemeler
  add column if not exists depo_malzeme_id uuid references public.depo_malzemeler(id) on delete set null;

alter table public.depo_hareket
  add column if not exists kaynak_eksik_id uuid references public.malzeme_hareket(id) on delete set null,
  add column if not exists onay_durumu text,
  add column if not exists onaylayan_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists onay_tarihi date,
  add column if not exists onay_notu text;

alter table public.malzeme_hareket
  add column if not exists kaynak_depo_hareket_id uuid references public.depo_hareket(id) on delete set null;

-- ========== ONAY ALANLARI ==========
alter table public.isci_maas_odemeleri
  add column if not exists onay_durumu text,
  add column if not exists onaylayan_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists onay_tarihi date,
  add column if not exists onay_notu text;

alter table public.ofis_odemeler
  add column if not exists onay_durumu text,
  add column if not exists onaylayan_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists onay_tarihi date,
  add column if not exists onay_notu text;

alter table public.ofis_masraflar
  add column if not exists onay_durumu text,
  add column if not exists onaylayan_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists onay_tarihi date,
  add column if not exists onay_notu text;

alter table public.gelir_gider
  add column if not exists onay_durumu text,
  add column if not exists onaylayan_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists onay_tarihi date,
  add column if not exists onay_notu text,
  add column if not exists kaydeden_kullanici_id uuid references public.profiller(id) on delete set null;

-- Mevcut kayıtlar onaylı kabul edilir (geriye dönük uyumluluk)
update public.isci_maas_odemeleri set onay_durumu = 'onaylandi' where onay_durumu is null;
update public.ofis_odemeler set onay_durumu = 'onaylandi' where onay_durumu is null;
update public.ofis_masraflar set onay_durumu = 'onaylandi' where onay_durumu is null;
update public.gelir_gider set onay_durumu = 'onaylandi' where onay_durumu is null;
update public.depo_hareket set onay_durumu = 'onaylandi' where onay_durumu is null;

alter table public.isci_maas_odemeleri alter column onay_durumu set default 'bekliyor';
alter table public.ofis_odemeler alter column onay_durumu set default 'bekliyor';
alter table public.ofis_masraflar alter column onay_durumu set default 'bekliyor';
alter table public.gelir_gider alter column onay_durumu set default 'bekliyor';
alter table public.depo_hareket alter column onay_durumu set default 'bekliyor';

do $$ begin
  alter table public.isci_maas_odemeleri
    drop constraint if exists isci_maas_onay_durumu_check;
  alter table public.isci_maas_odemeleri
    add constraint isci_maas_onay_durumu_check
    check (onay_durumu in ('bekliyor', 'onaylandi', 'reddedildi'));
exception when others then null;
end $$;

do $$ begin
  alter table public.ofis_odemeler
    drop constraint if exists ofis_odeme_onay_durumu_check;
  alter table public.ofis_odemeler
    add constraint ofis_odeme_onay_durumu_check
    check (onay_durumu in ('bekliyor', 'onaylandi', 'reddedildi'));
exception when others then null;
end $$;

do $$ begin
  alter table public.ofis_masraflar
    drop constraint if exists ofis_masraf_onay_durumu_check;
  alter table public.ofis_masraflar
    add constraint ofis_masraf_onay_durumu_check
    check (onay_durumu in ('bekliyor', 'onaylandi', 'reddedildi'));
exception when others then null;
end $$;

do $$ begin
  alter table public.gelir_gider
    drop constraint if exists gelir_gider_onay_durumu_check;
  alter table public.gelir_gider
    add constraint gelir_gider_onay_durumu_check
    check (onay_durumu in ('bekliyor', 'onaylandi', 'reddedildi'));
exception when others then null;
end $$;

do $$ begin
  alter table public.depo_hareket
    drop constraint if exists depo_hareket_onay_durumu_check;
  alter table public.depo_hareket
    add constraint depo_hareket_onay_durumu_check
    check (onay_durumu in ('bekliyor', 'onaylandi', 'reddedildi'));
exception when others then null;
end $$;

-- Eksik durumuna reddedildi + onaylandi ekle
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.malzeme_hareket'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%durum%';
  if cname is not null then
    execute format('alter table public.malzeme_hareket drop constraint %I', cname);
  end if;
end $$;
alter table public.malzeme_hareket
  add constraint malzeme_hareket_durum_check
  check (durum in ('bekliyor', 'onaylandi', 'karsilandi', 'iptal', 'reddedildi'));

create index if not exists idx_isci_maas_onay on public.isci_maas_odemeleri(onay_durumu) where coalesce(silindi,false)=false;
create index if not exists idx_ofis_odeme_onay on public.ofis_odemeler(onay_durumu) where coalesce(silindi,false)=false;
create index if not exists idx_ofis_masraf_onay on public.ofis_masraflar(onay_durumu) where coalesce(silindi,false)=false;
create index if not exists idx_gelir_gider_onay on public.gelir_gider(onay_durumu) where coalesce(silindi,false)=false;
create index if not exists idx_depo_hareket_onay on public.depo_hareket(onay_durumu) where coalesce(silindi,false)=false;
create index if not exists idx_depo_hareket_kaynak_eksik on public.depo_hareket(kaynak_eksik_id);
create index if not exists idx_malzeme_kaynak_depo on public.malzeme_hareket(kaynak_depo_hareket_id);

-- ========== FİNANS: onaylı kayıtlarla şirket özeti ==========
create or replace view public.sirket_finans_ozeti as
select
  coalesce((
    select sum(tutar) from public.gelir_gider
    where tip = 'gelir' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0)
  + coalesce((
    select sum(tutar) from public.ofis_masraflar
    where tip = 'gelir' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0) as toplam_gelir,
  coalesce((
    select sum(tutar) from public.isci_maas_odemeleri
    where coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0)
  + coalesce((
    select sum(mh.tutar) from public.malzeme_hareket mh
    where coalesce(mh.silindi,false)=false and mh.tip in ('giris','fazla')
  ), 0)
  + coalesce((
    select sum(tutar) from public.gelir_gider
    where tip = 'gider' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0)
  + coalesce((
    select sum(tutar) from public.ofis_masraflar
    where tip = 'gider' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0)
  + coalesce((
    select sum(tutar) from public.ofis_odemeler
    where coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0)
  + coalesce((
    select sum(tutar) from public.depo_hareket
    where tip in ('giris','fire') and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
  ), 0) as toplam_gider,
  (
    coalesce((
      select sum(tutar) from public.gelir_gider
      where tip = 'gelir' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
    + coalesce((
      select sum(tutar) from public.ofis_masraflar
      where tip = 'gelir' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
  ) - (
    coalesce((
      select sum(tutar) from public.isci_maas_odemeleri
      where coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
    + coalesce((
      select sum(mh.tutar) from public.malzeme_hareket mh
      where coalesce(mh.silindi,false)=false and mh.tip in ('giris','fazla')
    ), 0)
    + coalesce((
      select sum(tutar) from public.gelir_gider
      where tip = 'gider' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
    + coalesce((
      select sum(tutar) from public.ofis_masraflar
      where tip = 'gider' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
    + coalesce((
      select sum(tutar) from public.ofis_odemeler
      where coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
    + coalesce((
      select sum(tutar) from public.depo_hareket
      where tip in ('giris','fire') and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
    ), 0)
  ) as net;

-- Tarihli şirket finans özeti
create or replace function public.sirket_finans_tarihli(p_baslangic date default null, p_bitis date default null)
returns table (
  toplam_gelir numeric,
  toplam_gider numeric,
  net numeric,
  santiye_gelir numeric,
  ofis_gelir numeric,
  santiye_iscilik numeric,
  santiye_malzeme numeric,
  santiye_gider numeric,
  ofis_masraf_gider numeric,
  ofis_odeme_gider numeric,
  depo_gider numeric
)
language sql
stable
security invoker
as $$
  with bounds as (
    select p_baslangic as b, p_bitis as e
  )
  select
    coalesce(sg.v,0) + coalesce(og.v,0) as toplam_gelir,
    coalesce(si.v,0) + coalesce(sm.v,0) + coalesce(sz.v,0) + coalesce(om.v,0) + coalesce(oo.v,0) + coalesce(dg.v,0) as toplam_gider,
    (coalesce(sg.v,0) + coalesce(og.v,0))
      - (coalesce(si.v,0) + coalesce(sm.v,0) + coalesce(sz.v,0) + coalesce(om.v,0) + coalesce(oo.v,0) + coalesce(dg.v,0)) as net,
    coalesce(sg.v,0), coalesce(og.v,0),
    coalesce(si.v,0), coalesce(sm.v,0), coalesce(sz.v,0),
    coalesce(om.v,0), coalesce(oo.v,0), coalesce(dg.v,0)
  from bounds b
  left join lateral (
    select sum(tutar) v from public.gelir_gider
    where tip='gelir' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or tarih >= b.b) and (b.e is null or tarih <= b.e)
  ) sg on true
  left join lateral (
    select sum(tutar) v from public.ofis_masraflar
    where tip='gelir' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or tarih >= b.b) and (b.e is null or tarih <= b.e)
  ) og on true
  left join lateral (
    select sum(tutar) v from public.isci_maas_odemeleri
    where coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or coalesce(odeme_tarihi, donem_bitis) >= b.b)
      and (b.e is null or coalesce(odeme_tarihi, donem_bitis) <= b.e)
  ) si on true
  left join lateral (
    select sum(mh.tutar) v from public.malzeme_hareket mh
    where coalesce(mh.silindi,false)=false and mh.tip in ('giris','fazla')
      and (b.b is null or mh.tarih >= b.b) and (b.e is null or mh.tarih <= b.e)
  ) sm on true
  left join lateral (
    select sum(tutar) v from public.gelir_gider
    where tip='gider' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or tarih >= b.b) and (b.e is null or tarih <= b.e)
  ) sz on true
  left join lateral (
    select sum(tutar) v from public.ofis_masraflar
    where tip='gider' and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or tarih >= b.b) and (b.e is null or tarih <= b.e)
  ) om on true
  left join lateral (
    select sum(tutar) v from public.ofis_odemeler
    where coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or coalesce(odeme_tarihi, donem_bitis, created_at::date) >= b.b)
      and (b.e is null or coalesce(odeme_tarihi, donem_bitis, created_at::date) <= b.e)
  ) oo on true
  left join lateral (
    select sum(tutar) v from public.depo_hareket
    where tip in ('giris','fire') and coalesce(silindi,false)=false and coalesce(onay_durumu,'onaylandi')='onaylandi'
      and (b.b is null or tarih >= b.b) and (b.e is null or tarih <= b.e)
  ) dg on true;
$$;

-- Tarihli şantiye maliyet raporu (rapor filtreleri)
create or replace function public.santiye_maliyet_tarihli(
  p_santiye_ids uuid[] default null,
  p_baslangic date default null,
  p_bitis date default null
)
returns table (
  santiye_id uuid,
  santiye_adi text,
  iscilik_maliyeti numeric,
  malzeme_maliyeti numeric,
  genel_gider numeric,
  genel_gelir numeric
)
language sql
stable
security invoker
as $$
  select
    s.id,
    s.ad,
    coalesce((
      select sum(tutar) from public.isci_maas_odemeleri i
      where i.santiye_id = s.id and coalesce(i.silindi,false)=false
        and coalesce(i.onay_durumu,'onaylandi')='onaylandi'
        and (p_baslangic is null or coalesce(i.odeme_tarihi, i.donem_bitis) >= p_baslangic)
        and (p_bitis is null or coalesce(i.odeme_tarihi, i.donem_bitis) <= p_bitis)
    ), 0),
    coalesce((
      select sum(mh.tutar) from public.malzeme_hareket mh
      join public.malzemeler m on m.id = mh.malzeme_id
      where m.santiye_id = s.id and coalesce(mh.silindi,false)=false
        and mh.tip in ('giris','fazla')
        and (p_baslangic is null or mh.tarih >= p_baslangic)
        and (p_bitis is null or mh.tarih <= p_bitis)
    ), 0),
    coalesce((
      select sum(tutar) from public.gelir_gider g
      where g.santiye_id = s.id and g.tip='gider' and coalesce(g.silindi,false)=false
        and coalesce(g.onay_durumu,'onaylandi')='onaylandi'
        and (p_baslangic is null or g.tarih >= p_baslangic)
        and (p_bitis is null or g.tarih <= p_bitis)
    ), 0),
    coalesce((
      select sum(tutar) from public.gelir_gider g
      where g.santiye_id = s.id and g.tip='gelir' and coalesce(g.silindi,false)=false
        and coalesce(g.onay_durumu,'onaylandi')='onaylandi'
        and (p_baslangic is null or g.tarih >= p_baslangic)
        and (p_bitis is null or g.tarih <= p_bitis)
    ), 0)
  from public.santiyeler s
  where s.aktif = true
    and (p_santiye_ids is null or s.id = any(p_santiye_ids));
$$;

-- Depo stok (yalnız onaylı hareketler)
create or replace function public.depo_malzeme_stok(p_depo_malzeme_id uuid)
returns numeric
language sql
stable
security invoker
as $$
  select coalesce(sum(
    case
      when tip in ('giris','sayim') then miktar
      when tip in ('cikis','fire') then -miktar
      else 0
    end
  ), 0)
  from public.depo_hareket
  where depo_malzeme_id = p_depo_malzeme_id
    and coalesce(silindi,false)=false
    and coalesce(onay_durumu,'onaylandi')='onaylandi';
$$;

-- Atomik eksik karşılama: depo çıkış + şantiye giriş + bağlar
create or replace function public.eksik_malzeme_karsila(
  p_eksik_id uuid,
  p_kullanici_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eksik public.malzeme_hareket%rowtype;
  v_malzeme public.malzemeler%rowtype;
  v_depo_id uuid;
  v_stok numeric;
  v_depo_hareket_id uuid;
  v_giris_id uuid;
  v_bugun date := current_date;
  v_aciklama text;
begin
  select * into v_eksik from public.malzeme_hareket
  where id = p_eksik_id and tip = 'eksik' and coalesce(silindi,false)=false
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Eksik kaydı bulunamadı');
  end if;

  if v_eksik.durum = 'karsilandi' then
    return jsonb_build_object('ok', true, 'alreadyDone', true);
  end if;

  if v_eksik.durum = 'reddedildi' or v_eksik.durum = 'iptal' then
    return jsonb_build_object('ok', false, 'error', 'Bu eksik reddedilmiş veya iptal edilmiş');
  end if;

  if v_eksik.durum not in ('bekliyor', 'onaylandi') then
    return jsonb_build_object('ok', false, 'error', 'Eksik karşılanabilir durumda değil');
  end if;

  -- Yönetici onayı zorunlu: bekliyor iken karşılanamaz
  if v_eksik.durum = 'bekliyor' then
    return jsonb_build_object('ok', false, 'error', 'Önce yönetici onayı gerekli');
  end if;

  select * into v_malzeme from public.malzemeler where id = v_eksik.malzeme_id;
  if not found or v_malzeme.santiye_id is null then
    return jsonb_build_object('ok', false, 'error', 'Malzemenin şantiye bilgisi bulunamadı');
  end if;

  v_depo_id := v_malzeme.depo_malzeme_id;

  if v_depo_id is null then
    select id into v_depo_id
    from public.depo_malzemeler
    where lower(ad) = lower(v_malzeme.ad)
      and coalesce(birim,'') = coalesce(v_malzeme.birim,'')
      and aktif = true
    limit 1;
  end if;

  if v_depo_id is null then
    select id into v_depo_id
    from public.depo_malzemeler
    where lower(ad) = lower(v_malzeme.ad) and aktif = true
    limit 1;
  end if;

  if v_depo_id is null then
    return jsonb_build_object('ok', false, 'error', 'Depoda eşleşen malzeme yok. Önce depo kaydı oluşturun.');
  end if;

  -- Bağı kalıcı yap
  update public.malzemeler set depo_malzeme_id = v_depo_id where id = v_malzeme.id and depo_malzeme_id is null;

  v_stok := public.depo_malzeme_stok(v_depo_id);
  if v_stok < v_eksik.miktar then
    return jsonb_build_object(
      'ok', false,
      'error', format('Yetersiz depo stoku (mevcut: %s, istenen: %s)', v_stok, v_eksik.miktar)
    );
  end if;

  v_aciklama := 'Eksik karşılama: ' || v_malzeme.ad
    || case when v_eksik.aciklama is not null then ' · ' || v_eksik.aciklama else '' end;

  insert into public.depo_hareket (
    depo_malzeme_id, tip, miktar, tarih, aciklama, santiye_id,
    kaydeden_kullanici_id, kaynak_eksik_id, onay_durumu, onaylayan_kullanici_id, onay_tarihi
  ) values (
    v_depo_id, 'cikis', v_eksik.miktar, v_bugun, v_aciklama, v_malzeme.santiye_id,
    p_kullanici_id, v_eksik.id, 'onaylandi', p_kullanici_id, v_bugun
  ) returning id into v_depo_hareket_id;

  insert into public.malzeme_hareket (
    malzeme_id, tip, miktar, birim_fiyat, tarih, aciklama, durum,
    kaydeden_kullanici_id, kaynak_depo_hareket_id
  ) values (
    v_malzeme.id, 'giris', v_eksik.miktar, null, v_bugun, v_aciklama, 'karsilandi',
    p_kullanici_id, v_depo_hareket_id
  ) returning id into v_giris_id;

  update public.malzeme_hareket
  set durum = 'karsilandi',
      karsilanma_tarihi = v_bugun,
      karsilayan_kullanici_id = p_kullanici_id,
      kaynak_depo_hareket_id = v_depo_hareket_id
  where id = v_eksik.id;

  return jsonb_build_object(
    'ok', true,
    'depo_hareket_id', v_depo_hareket_id,
    'santiye_giris_id', v_giris_id
  );
end;
$$;

revoke all on function public.eksik_malzeme_karsila(uuid, uuid) from public;
grant execute on function public.eksik_malzeme_karsila(uuid, uuid) to authenticated;
grant execute on function public.eksik_malzeme_karsila(uuid, uuid) to service_role;
grant execute on function public.sirket_finans_tarihli(date, date) to authenticated;
grant execute on function public.santiye_maliyet_tarihli(uuid[], date, date) to authenticated;
grant execute on function public.depo_malzeme_stok(uuid) to authenticated;
