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
