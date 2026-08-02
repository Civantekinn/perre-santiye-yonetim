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
