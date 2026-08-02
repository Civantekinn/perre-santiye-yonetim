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
