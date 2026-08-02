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
