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
