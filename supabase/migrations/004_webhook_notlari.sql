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
