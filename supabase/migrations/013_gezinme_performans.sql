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
