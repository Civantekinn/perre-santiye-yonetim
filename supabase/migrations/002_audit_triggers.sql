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
