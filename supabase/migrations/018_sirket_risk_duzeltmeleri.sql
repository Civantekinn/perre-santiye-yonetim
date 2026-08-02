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
