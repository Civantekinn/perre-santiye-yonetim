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
